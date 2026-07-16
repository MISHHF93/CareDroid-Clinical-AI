/**
 * Single CareDroid LLM egress boundary.
 *
 * All external (and local) generation should pass through `completeViaEgress`:
 * 1. Kill switch
 * 2. Patient-context hard gate (strip ids/chart when AI_PATIENT_CONTEXT_ENABLED is off)
 * 3. PHI / secret minimize
 * 4. Provider adapter selection + optional fallback
 * 5. Structured metadata + monitor events
 */
import {
  AIError,
  DEFAULT_AI_MAX_TOKENS,
  UNIFIED_AI_MODEL,
  type AIRequest,
  type AIRequestConfig,
  type AIResponse,
  type Message,
} from '../llmTransport';
import type { AIRequestType } from '../types';
import {
  describeDeploymentFlags,
  readAiDeploymentFlags,
  shouldServeCandidate,
  type AiDeploymentFlags,
} from '../deploymentFlags';
import { recordAiMonitorEvent } from '../productionMonitoring';
import { applyPatientContextGate, isPatientContextEnabled } from './patientContextGate';
import { minimizePhiRequest } from './phiMinimize';
import {
  getAdapter,
  listAdapterHealth,
  resolveFallbackProvider,
  resolvePrimaryProvider,
} from './registry';
import type { LlmAdapterRuntime, LlmProviderId } from './types';
import {
  getProviderCircuit,
  listProviderCircuitSnapshots,
  readAiRequestTimeoutMs,
} from './transportSafety';

export type MetadataLogger = (metadata: {
  requestType: AIRequestType;
  model: string;
  stream: boolean;
  maxTokens: number;
  usage: AIResponse['usage'];
  toolCallCount: number;
  provider?: LlmProviderId;
  phiMinimized?: boolean;
  redactionCount?: number;
  fallbackUsed?: boolean;
  deployMode?: string;
}) => void;

export interface EgressRuntime extends LlmAdapterRuntime {
  /** Force a provider for this call */
  provider?: LlmProviderId | string;
  /** Disable fallback for this call */
  disableFallback?: boolean;
  /** Stable user/session id for canary bucket */
  stableId?: string;
  /** Skip canary/shadow candidate routing */
  disableDeployRouting?: boolean;
  /** Skip circuit-breaker check for this call (tests / admin recovery) */
  disableCircuitBreaker?: boolean;
}

export interface EgressResult extends AIResponse {
  data: AIResponse['data'] & {
    provider?: LlmProviderId;
    model?: string;
    phiMinimized?: boolean;
    redactionCount?: number;
    fallbackUsed?: boolean;
    killSwitchChecked?: boolean;
  };
}

function isKillSwitchEngaged(): { blocked: boolean; reason?: string } {
  if (typeof process === 'undefined') return { blocked: false };
  const env = process.env;
  if (env.AI_KILL_SWITCH === '1' || env.AI_KILL_SWITCH === 'true') {
    return { blocked: true, reason: 'AI_KILL_SWITCH engaged' };
  }
  if (env.AI_EXTERNAL_LLM_DISABLED === '1' || env.AI_EXTERNAL_LLM_DISABLED === 'true') {
    return { blocked: true, reason: 'AI_EXTERNAL_LLM_DISABLED engaged' };
  }
  // Strict mode: require AI_ENABLED=true for any egress (including local)
  if (env.AI_EGRESS_REQUIRE_AI_ENABLED === '1' || env.AI_EGRESS_REQUIRE_AI_ENABLED === 'true') {
    const enabled = env.AI_ENABLED === '1' || env.AI_ENABLED === 'true';
    if (!enabled) {
      return { blocked: true, reason: 'AI_EGRESS_REQUIRE_AI_ENABLED and AI_ENABLED is not true' };
    }
  }
  return { blocked: false };
}

function normalizeMessages(messages: Array<{ role: string; content: string }>): Message[] {
  return messages
    .filter((message) => message?.content && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: (message.role === 'assistant' ? 'assistant' : 'user') as Message['role'],
      content: String(message.content),
    }));
}

export function normalizeEgressRequest(request: AIRequest): AIRequest {
  const messages = normalizeMessages(request.messages || []);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  return {
    ...request,
    messages: messages.length
      ? messages
      : [{ role: 'user', content: request.message || 'Continue.' }],
    message: request.message || latestUserMessage?.content || '',
    maxTokens: request.maxTokens || DEFAULT_AI_MAX_TOKENS,
  };
}

export async function completeViaEgress(
  request: AIRequest | AIRequestConfig,
  runtime?: EgressRuntime,
): Promise<EgressResult> {
  const kill = isKillSwitchEngaged();
  if (kill.blocked) {
    recordAiMonitorEvent('kill_switch', { reason: kill.reason });
    throw new AIError({
      message: `LLM egress blocked: ${kill.reason}`,
      code: 'AI_KILL_SWITCH',
      requestType: request.requestType,
    });
  }

  const normalized = normalizeEgressRequest(request);
  const patientGate = applyPatientContextGate(normalized);
  if (patientGate.stripped) {
    recordAiMonitorEvent('phi_redaction', {
      reason: 'patient_context_gate',
      fields: patientGate.strippedFields,
    });
  }

  const { request: minimizedRequest, redactionCount, phiMinimized } = minimizePhiRequest(
    patientGate.request,
  );

  const deployFlags = readAiDeploymentFlags();
  const primary = normalizeProvider(
    runtime?.provider || resolvePrimaryProvider(),
  );
  const fallback =
    runtime?.disableFallback || primary === 'local'
      ? null
      : resolveFallbackProvider();

  // Canary: route a % of traffic to candidate provider/model (user-visible).
  // Shadow: keep primary response; candidate invoke is log-only (best-effort).
  let effectiveProvider = primary;
  let effectiveModel = runtime?.model;
  let canaryServed = false;
  if (!runtime?.disableDeployRouting && !runtime?.provider) {
    const useCandidate = shouldServeCandidate(
      deployFlags,
      runtime?.stableId || request.patientId || 'anonymous',
    );
    if (useCandidate && deployFlags.candidateProvider && deployFlags.mode === 'canary') {
      effectiveProvider = normalizeProvider(deployFlags.candidateProvider);
      effectiveModel = deployFlags.candidateModel || effectiveModel;
      canaryServed = true;
    }
  }

  const adapterRuntime: LlmAdapterRuntime = {
    apiKey: runtime?.apiKey,
    azureEndpoint: runtime?.azureEndpoint,
    azureApiVersion: runtime?.azureApiVersion,
    azureDeployment: runtime?.azureDeployment,
    model: effectiveModel,
    timeoutMs: runtime?.timeoutMs ?? readAiRequestTimeoutMs(),
    signal: runtime?.signal,
    metadataLogger: (meta) => {
      runtime?.metadataLogger?.({
        ...meta,
        phiMinimized,
        redactionCount,
        deployMode: deployFlags.mode,
      });
      if (!runtime?.metadataLogger && typeof console !== 'undefined') {
        console.info('[AI_EGRESS]', {
          ...meta,
          phiMinimized,
          redactionCount,
          deployMode: deployFlags.mode,
          canaryServed,
          flags: describeDeploymentFlags(deployFlags),
        });
      }
    },
  };

  const primaryCircuit = runtime?.disableCircuitBreaker
    ? null
    : getProviderCircuit(effectiveProvider);
  primaryCircuit?.assertAllowed(request.requestType);

  try {
    const response = await getAdapter(effectiveProvider).complete(
      minimizedRequest,
      adapterRuntime,
    );
    primaryCircuit?.recordSuccess();

    // Shadow mode: best-effort candidate call for comparison logs only
    if (
      !runtime?.disableDeployRouting &&
      deployFlags.mode === 'shadow' &&
      deployFlags.candidateProvider &&
      deployFlags.shadowLogOnly
    ) {
      void runShadowCandidate(minimizedRequest, deployFlags, adapterRuntime).catch(() => {
        /* shadow failures must not affect user path */
      });
    }

    if (phiMinimized) recordAiMonitorEvent('phi_redaction', { redactionCount });
    if (canaryServed) recordAiMonitorEvent('canary_served', { provider: effectiveProvider });
    recordAiMonitorEvent('egress_success', {
      provider: effectiveProvider,
      requestType: request.requestType,
    });
    return annotate(
      response,
      effectiveProvider,
      phiMinimized,
      redactionCount,
      false,
      deployFlags,
      canaryServed,
    );
  } catch (error) {
    // Kill-switch / config errors should not trip the provider circuit.
    const code = error instanceof AIError ? error.code : 'unknown';
    if (
      primaryCircuit &&
      code !== 'AI_KILL_SWITCH' &&
      code !== 'AI_CONFIG_ERROR' &&
      code !== 'AI_CIRCUIT_OPEN'
    ) {
      primaryCircuit.recordFailure();
    }
    recordAiMonitorEvent('egress_failure', {
      requestType: request.requestType,
      code,
    });
    const retryable = error instanceof AIError ? error.retryable : true;
    if (fallback && retryable && fallback !== effectiveProvider) {
      const fallbackCircuit = runtime?.disableCircuitBreaker
        ? null
        : getProviderCircuit(fallback);
      try {
        fallbackCircuit?.assertAllowed(request.requestType);
        const response = await getAdapter(fallback).complete(minimizedRequest, {
          ...adapterRuntime,
          model:
            runtime?.model ||
            (typeof process !== 'undefined' ? process.env.AI_FALLBACK_MODEL : undefined),
        });
        fallbackCircuit?.recordSuccess();
        return annotate(
          response,
          fallback,
          phiMinimized,
          redactionCount,
          true,
          deployFlags,
          canaryServed,
        );
      } catch (fallbackError) {
        if (
          fallbackCircuit &&
          !(fallbackError instanceof AIError && fallbackError.code === 'AI_CIRCUIT_OPEN')
        ) {
          fallbackCircuit.recordFailure();
        }
        throw fallbackError instanceof AIError
          ? fallbackError
          : new AIError({
              message:
                fallbackError instanceof Error
                  ? fallbackError.message
                  : String(fallbackError),
              code: 'AI_PROVIDER_ERROR',
              requestType: request.requestType,
              retryable: true,
              cause: fallbackError,
            });
      }
    }
    throw error instanceof AIError
      ? error
      : new AIError({
          message: error instanceof Error ? error.message : String(error),
          code: 'AI_NETWORK_ERROR',
          requestType: request.requestType,
          retryable: true,
          cause: error,
        });
  }
}

async function runShadowCandidate(
  request: AIRequest,
  flags: AiDeploymentFlags,
  baseRuntime: LlmAdapterRuntime,
): Promise<void> {
  if (!flags.candidateProvider) return;
  const provider = normalizeProvider(flags.candidateProvider);
  const response = await getAdapter(provider).complete(request, {
    ...baseRuntime,
    model: flags.candidateModel || baseRuntime.model,
  });
  recordAiMonitorEvent('shadow_candidate', {
    provider,
    model: flags.candidateModel,
  });
  if (typeof console !== 'undefined') {
    console.info('[AI_SHADOW_CANDIDATE]', {
      provider,
      model: flags.candidateModel,
      usage: response.usage,
      contentPreview: String(response.content || '').slice(0, 200),
    });
  }
}

function annotate(
  response: AIResponse,
  provider: LlmProviderId,
  phiMinimized: boolean,
  redactionCount: number,
  fallbackUsed: boolean,
  deployFlags?: AiDeploymentFlags,
  canaryServed = false,
): EgressResult {
  return {
    ...response,
    data: {
      ...response.data,
      provider,
      model: (response.data?.model as string) || UNIFIED_AI_MODEL,
      phiMinimized,
      redactionCount,
      fallbackUsed,
      killSwitchChecked: true,
      deployMode: deployFlags?.mode,
      canaryServed,
    },
  };
}

function normalizeProvider(value: string): LlmProviderId {
  const raw = value.toLowerCase();
  if (raw === 'openai') return 'openai';
  if (raw === 'azure' || raw === 'azure-openai' || raw === 'azure_openai') return 'azure-openai';
  if (raw === 'gemini' || raw === 'google') return 'gemini';
  if (raw === 'groq') return 'groq';
  if (raw === 'local' || raw === 'mock') return 'local';
  return 'anthropic';
}

export function getEgressHealth() {
  const deploy = readAiDeploymentFlags();
  return {
    killSwitch: isKillSwitchEngaged(),
    primary: resolvePrimaryProvider(),
    fallback: resolveFallbackProvider(),
    adapters: listAdapterHealth(),
    patientContextEnabled: isPatientContextEnabled(),
    requestTimeoutMs: readAiRequestTimeoutMs(),
    circuits: listProviderCircuitSnapshots(),
    deployment: {
      mode: deploy.mode,
      canaryPercent: deploy.canaryPercent,
      candidateProvider: deploy.candidateProvider,
      candidateModel: deploy.candidateModel,
      flags: describeDeploymentFlags(deploy),
    },
  };
}

export { listAdapterHealth, resolvePrimaryProvider, resolveFallbackProvider };
export { applyPatientContextGate, isPatientContextEnabled } from './patientContextGate';
