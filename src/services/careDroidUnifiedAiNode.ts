/**
 * CareDroid Unified AI Node — lite single entry for all AI features.
 * Structured intents and conversational copilot traffic route through AI Chief.
 */

import type { CareDroidAIRequest, CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import type { AIResponse } from '../lib/ai/client';
import {
  AI_SYSTEM_TOOL_NODE_MAP,
  buildUnifiedAiNodeContext,
  CARE_DROID_UNIFIED_AI_NODE_ID,
  CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH,
  PLATFORM_AI_SERVICE_NODE_MAP,
  type UnifiedAiNodeCapability,
} from '../config/careDroidUnifiedAiNode.config';
import { apiFetch, parseApiResponse } from './apiClient';
import {
  requestAiChiefConversational,
  requestAiChiefCopilotQuery,
  requestAiChiefStructured,
  type AIChiefConversationalRequest,
  type AIChiefCopilotQueryOptions,
  type AIChiefCopilotQueryResult,
  type AIChiefStructuredRequest,
} from './aiChiefOrchestrator';
import { resolvePlatformServiceIdForIntent } from '../config/careDroidUnifiedAiNode.config';
import type { CareDroidAIIntent } from '../../lib/ai/careDroidAI';
import {
  attachUnifiedEnvelopeToAiResponse,
  buildUnifiedAiRequestEnvelope,
  resolveUnifiedChannelFromRole,
  unifiedFromConversationalResponse,
  unifiedFromStructuredNode,
} from './unifiedAiEnvelope';
import type { CareDroidUnifiedAIResponse } from '../../lib/ai/unifiedAiContracts';

export type UnifiedAiStructuredRequest = AIChiefStructuredRequest & {
  capabilityId?: string;
};

export type UnifiedAiConversationalRequest = AIChiefConversationalRequest & {
  capabilityId?: string;
  platformServiceId?: string;
};

export { CARE_DROID_UNIFIED_AI_NODE_ID, CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH };

export type UnifiedModelHealth = {
  status: 'ready' | 'degraded';
  embeddingModel: string;
  heads: {
    nlu: { loaded: boolean; classifierExists: boolean };
    artifactRouter: { loaded: boolean; classifierExists: boolean };
  };
};

/** Ops health for unified classifier directory (intent + artifact-router heads). */
export async function fetchUnifiedModelHealth(): Promise<UnifiedModelHealth> {
  const response = await apiFetch(`${CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH}/health`);
  return parseApiResponse<UnifiedModelHealth>(response, { fallback: null });
}

export function resolveUnifiedAiCapability(
  capabilityId: string,
): UnifiedAiNodeCapability | null {
  return (
    PLATFORM_AI_SERVICE_NODE_MAP[capabilityId] ||
    AI_SYSTEM_TOOL_NODE_MAP[capabilityId] ||
    null
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stampUnifiedNodeContext(
  request: { context?: unknown },
  capabilityId?: string,
): Record<string, unknown> {
  const existingContext = isRecord(request.context) ? request.context : {};
  return buildUnifiedAiNodeContext({
    ...existingContext,
    capabilityId,
  });
}

function readRoleFromContext(context: unknown): string | undefined {
  if (!isRecord(context)) return undefined;
  if (typeof context.userRole === 'string') return context.userRole;
  if (isRecord(context.tenant) && typeof context.tenant.role === 'string') return context.tenant.role;
  return undefined;
}

/** Structured AI Chief intents — routes to POST /api/ai/node via transportCareDroidAINode. */
export async function invokeUnifiedAiStructured(
  request: UnifiedAiStructuredRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<CareDroidAIResponse> {
  const started = Date.now();
  const enriched: AIChiefStructuredRequest = {
    ...request,
    context: stampUnifiedNodeContext(request, request.capabilityId || request.intent),
  };
  const response = await requestAiChiefStructured(enriched, options);
  const role = readRoleFromContext(enriched.context);
  const ctx = isRecord(enriched.context) ? enriched.context : {};
  const tenant = isRecord(ctx.tenant) ? ctx.tenant : {};
  const envelopeBuild = buildUnifiedAiRequestEnvelope({
    role,
    channel: resolveUnifiedChannelFromRole(role),
    task: 'suggest_next_action',
    query: `structured:${request.intent}`,
    organizationId: String(ctx.organizationId || tenant.organizationId || 'unknown-org'),
    userId: String(tenant.userId || ctx.userId || 'unknown-user'),
  });
  if (envelopeBuild.valid) {
    const unified = unifiedFromStructuredNode({
      request: envelopeBuild.request,
      node: response,
      latencyMs: Date.now() - started,
    });
    // Preserve CareDroidAIResponse shape; attach envelope under a non-schema field
    // consumed by accountableFromGatewayPayload / plan-aware clients.
    return Object.assign({}, response, {
      unifiedAiEnvelope: unified,
    }) as CareDroidAIResponse & { unifiedAiEnvelope: CareDroidUnifiedAIResponse };
  }
  return response;
}

/** Conversational copilot/chat — audited through AI Chief orchestrator; attaches unified envelope. */
export async function invokeUnifiedAiConversational(
  request: UnifiedAiConversationalRequest,
  runtime?: Parameters<typeof requestAiChiefConversational>[1],
): Promise<AIResponse> {
  const started = Date.now();
  const role =
    request.profile?.role ||
    readRoleFromContext(request.context) ||
    (typeof request.profile?.id === 'string' ? undefined : undefined);
  const channelHint =
    (isRecord(request.context) && typeof request.context.unifiedChannel === 'string'
      ? request.context.unifiedChannel
      : undefined) || resolveUnifiedChannelFromRole(role, 'api');

  const queryText =
    request.message ||
    [...(request.messages || [])].reverse().find((m) => m.role === 'user')?.content ||
    '';

  const envelopeBuild = buildUnifiedAiRequestEnvelope({
    role: role || 'unknown',
    channel: channelHint,
    task: 'answer_question',
    query: String(queryText || 'copilot_query'),
    organizationId: request.profile?.organizationId || 'unknown-org',
    userId: request.profile?.id || 'unknown-user',
    patientContext: request.patientId ? { patientId: request.patientId } : undefined,
    workflowContext: {
      sourceScreen: request.sourceScreen,
      capabilityId: request.capabilityId || request.platformServiceId,
      requestType: request.requestType,
    },
  });

  const stampedContext = stampUnifiedNodeContext(
    request,
    request.capabilityId || request.platformServiceId || request.requestType,
  );
  const enriched: AIChiefConversationalRequest = {
    ...request,
    context: {
      ...stampedContext,
      ...(envelopeBuild.valid
        ? {
            unifiedAiRequest: {
              requestId: envelopeBuild.request.requestId,
              correlationId: envelopeBuild.request.correlationId,
              channel: envelopeBuild.request.channel,
              task: envelopeBuild.request.task,
            },
            unifiedChannel: envelopeBuild.request.channel,
          }
        : {}),
    },
  };

  const response = await requestAiChiefConversational(enriched, runtime);
  if (!envelopeBuild.valid) {
    return response;
  }

  const unified: CareDroidUnifiedAIResponse = unifiedFromConversationalResponse({
    request: envelopeBuild.request,
    response,
    latencyMs: Date.now() - started,
  });
  return attachUnifiedEnvelopeToAiResponse(response, unified);
}

/** Convenience wrapper for plain AIRequest shapes used by legacy panels. */
export async function invokeUnifiedAiRequest(
  request: UnifiedAiConversationalRequest,
  runtime?: Parameters<typeof requestAiChiefConversational>[1],
): Promise<AIResponse> {
  return invokeUnifiedAiConversational(request, runtime);
}

/** Shift handoff brief generation through the unified node (smartHandover facet). */
export async function invokeUnifiedAiHandoffBrief(
  request: UnifiedAiConversationalRequest,
  runtime?: Parameters<typeof requestAiChiefConversational>[1],
): Promise<AIResponse> {
  return invokeUnifiedAiConversational(
    {
      ...request,
      requestType: request.requestType || 'HANDOFF_BRIEF',
      domain: request.domain || 'handoffs',
      capabilityId: request.capabilityId || 'smartHandover',
      platformServiceId: request.platformServiceId || 'smartHandover',
      sourceScreen: request.sourceScreen || 'handoff_brief_generator',
    },
    runtime,
  );
}

/** ED copilot one-shot query through the unified node (copilot facet). */
export async function invokeUnifiedAiCopilotQuery(
  query: string,
  options: AIChiefCopilotQueryOptions & { capabilityId?: string; platformServiceId?: string } = {},
): Promise<AIChiefCopilotQueryResult> {
  return requestAiChiefCopilotQuery(query, {
    ...options,
    context: buildUnifiedAiNodeContext({
      ...(options.context || {}),
      capabilityId: options.capabilityId || options.platformServiceId || 'copilot',
      platformServiceId: options.platformServiceId || 'copilot',
    }),
  });
}

/** Structured request with automatic platform-service binding from CareDroid AI intent. */
export async function invokeUnifiedAiStructuredByIntent(
  request: UnifiedAiStructuredRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<CareDroidAIResponse> {
  const capabilityId =
    request.capabilityId ||
    resolvePlatformServiceIdForIntent(request.intent as CareDroidAIIntent) ||
    request.intent;
  return invokeUnifiedAiStructured({ ...request, capabilityId }, options);
}