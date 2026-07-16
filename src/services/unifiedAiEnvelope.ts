/**
 * Bridges CareDroid Unified AI contracts (lib/ai/unifiedAiContracts) into the
 * product AI Chief / Copilot surfaces without requiring every caller to rewrite
 * overnight. Reception Copilot and AI Chief attach this envelope on every reply.
 */

import {
  CARE_DROID_AI_CHANNELS,
  CARE_DROID_AI_TASKS,
  mapHeuristicNodeToUnifiedResponse,
  validateUnifiedAiRequest,
  type CareDroidUnifiedAIRequest,
  type CareDroidUnifiedAIResponse,
  type CareDroidUnifiedChannel,
  type CareDroidUnifiedTask,
} from '../../lib/ai/unifiedAiContracts';
import {
  createAccountableRecommendation,
  type AccountableRecommendation,
  type AccountableSafetyStatus,
} from '../contracts/accountableAi';
import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import type { AIResponse } from '../lib/ai/client';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safetyPolicy';

export type UnifiedEnvelopeBuildInput = {
  requestId?: string;
  correlationId?: string;
  organizationId?: string;
  workspaceId?: string;
  userId?: string;
  role?: string;
  permissions?: string[];
  channel?: CareDroidUnifiedChannel | string;
  task?: CareDroidUnifiedTask | string;
  query: string;
  patientContext?: Record<string, unknown>;
  workflowContext?: Record<string, unknown>;
  locale?: string;
  responseFormat?: CareDroidUnifiedAIRequest['responseFormat'];
};

const ROLE_CHANNEL: Record<string, CareDroidUnifiedChannel> = {
  receptionist: 'reception',
  reception: 'reception',
  front_desk: 'reception',
  registration_clerk: 'reception',
  patient_flow_coordinator: 'reception',
  ems: 'ems',
  ems_paramedic: 'ems',
  ems_coordinator: 'ems',
  paramedic: 'ems',
  dispatcher: 'ems',
  triage_nurse: 'triage',
  triage: 'triage',
  nurse: 'nursing',
  charge_nurse: 'nursing',
  registered_nurse: 'nursing',
  physician: 'physician',
  emergency_physician: 'physician',
  attending: 'physician',
  attending_physician: 'physician',
  resident: 'physician',
  resident_physician: 'physician',
  specialist: 'physician',
  ed_manager: 'operations',
  ed_director: 'operations',
  operations: 'operations',
  hospital_admin: 'administration',
  super_admin: 'administration',
  admin: 'administration',
  administrator: 'administration',
  it_admin: 'administration',
};

export function resolveUnifiedChannelFromRole(
  role?: string | null,
  fallback: CareDroidUnifiedChannel = 'api',
): CareDroidUnifiedChannel {
  if (!role) return fallback;
  const key = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ROLE_CHANNEL[key] || fallback;
}

export function isReceptionChannel(channel: string | undefined): boolean {
  return channel === 'reception';
}

export function createClientIds(): { requestId: string; correlationId: string } {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    requestId: `req-${stamp}`,
    correlationId: `corr-${stamp}`,
  };
}

export function buildUnifiedAiRequestEnvelope(
  input: UnifiedEnvelopeBuildInput,
): { valid: true; request: CareDroidUnifiedAIRequest } | { valid: false; errors: Array<{ field: string; message: string }> } {
  const ids = createClientIds();
  const channelRaw = input.channel || resolveUnifiedChannelFromRole(input.role);
  const taskRaw = input.task || 'answer_question';
  const channel = (CARE_DROID_AI_CHANNELS as readonly string[]).includes(String(channelRaw))
    ? (channelRaw as CareDroidUnifiedChannel)
    : 'api';
  const task = (CARE_DROID_AI_TASKS as readonly string[]).includes(String(taskRaw))
    ? (taskRaw as CareDroidUnifiedTask)
    : 'answer_question';

  const candidate: CareDroidUnifiedAIRequest = {
    requestId: input.requestId || ids.requestId,
    correlationId: input.correlationId || ids.correlationId,
    organizationId: input.organizationId || 'unknown-org',
    workspaceId: input.workspaceId,
    userId: input.userId || 'unknown-user',
    role: input.role || 'unknown',
    permissions: input.permissions?.length ? input.permissions : ['use_ai_chat'],
    channel,
    task,
    patientContext: input.patientContext,
    workflowContext: input.workflowContext,
    query: input.query,
    responseFormat: input.responseFormat || 'structured',
    locale: input.locale,
  };

  const validation = validateUnifiedAiRequest(candidate);
  if (!validation.valid || !validation.request) {
    return { valid: false, errors: validation.errors };
  }
  return { valid: true, request: validation.request };
}

export function isCareDroidUnifiedAIResponse(value: unknown): value is CareDroidUnifiedAIResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'string' &&
    typeof v.correlationId === 'string' &&
    typeof v.status === 'string' &&
    typeof v.responseType === 'string' &&
    typeof v.content === 'string' &&
    Array.isArray(v.evidence) &&
    v.safety != null &&
    typeof v.safety === 'object' &&
    v.model != null &&
    typeof v.model === 'object'
  );
}

function mapUnifiedStatusToAccountableSafety(
  status: CareDroidUnifiedAIResponse['status'],
  safetyAllowed: boolean,
): AccountableSafetyStatus {
  if (status === 'blocked_by_safety') return 'escalate';
  if (status === 'insufficient_evidence') return 'abstain';
  if (status === 'provider_unavailable' || status === 'failed') return 'degraded';
  if (status === 'needs_human_review') return safetyAllowed ? 'ok' : 'escalate';
  return safetyAllowed ? 'ok' : 'escalate';
}

/** Convert a canonical unified response into the UI AccountableRecommendation card shape. */
export function accountableFromUnifiedResponse(
  response: CareDroidUnifiedAIResponse,
): AccountableRecommendation {
  const uncertaintyText =
    response.uncertainty?.length > 0
      ? response.uncertainty.join(' ')
      : response.limitations?.join(' ') || undefined;

  return createAccountableRecommendation({
    content: response.content,
    evidence: (response.evidence || []).map((item, index) => ({
      sourceId: item.id || `ev-${index}`,
      title: item.title,
      citation: item.title || item.snippet || item.id || `Source ${index + 1}`,
      score: item.score,
      url: item.url,
    })),
    confidence: typeof response.confidence === 'number' ? response.confidence : null,
    uncertainty: uncertaintyText,
    model: {
      provider: response.model.provider || 'caredroid',
      name: response.model.model || 'unknown',
      version: response.model.promptVersion,
    },
    promptVersion: response.model.promptVersion || 'unified-ai@1',
    safetyStatus: mapUnifiedStatusToAccountableSafety(
      response.status,
      response.safety?.allowed !== false,
    ),
    safetyReasons: [
      ...(response.safety?.reasons || []),
      ...(response.status === 'needs_human_review' ? ['clinician_review_required'] : []),
    ],
    humanReviewRequired:
      response.safety?.requiresHumanReview === true ||
      response.status === 'needs_human_review' ||
      Boolean(response.humanReview),
    requestId: response.requestId,
  });
}

/** Map structured heuristic node response → unified envelope. */
export function unifiedFromStructuredNode(input: {
  request: Pick<CareDroidUnifiedAIRequest, 'requestId' | 'correlationId'>;
  node: CareDroidAIResponse;
  model?: string;
  latencyMs?: number;
}): CareDroidUnifiedAIResponse {
  const contentParts = [
    ...(input.node.reasoning || []),
    ...(input.node.nextActions?.length
      ? [`Next actions: ${input.node.nextActions.join('; ')}`]
      : []),
  ];
  const content =
    contentParts.join(' ').trim() ||
    (typeof input.node.data === 'object' && input.node.data
      ? JSON.stringify(input.node.data)
      : String(input.node.status));

  return mapHeuristicNodeToUnifiedResponse({
    requestId: input.request.requestId,
    correlationId: input.request.correlationId,
    intent: String(input.node.intent),
    status: input.node.status === 'success' ? 'success' : 'error',
    content,
    confidence: input.node.confidence,
    requiresClinicianReview: input.node.requiresClinicianReview !== false,
    model: input.model || input.node.provenance?.modelOrEngine || 'careDroidAI-node-v1',
    latencyMs: input.latencyMs,
    uncertainty: input.node.warnings || [],
    missingInformation: [],
    limitations: [input.node.safetyDisclaimer || HUMAN_REVIEW_DISCLAIMER],
    humanReview: input.node.requiresClinicianReview
      ? { status: 'pending', reviewType: 'clinical_ai', severity: 'high' }
      : undefined,
  });
}

/** Map conversational AIResponse → unified envelope (always clinician review). */
export function unifiedFromConversationalResponse(input: {
  request: Pick<CareDroidUnifiedAIRequest, 'requestId' | 'correlationId' | 'query'>;
  response: AIResponse;
  model?: string;
  provider?: string;
  latencyMs?: number;
}): CareDroidUnifiedAIResponse {
  const content =
    typeof input.response.content === 'string'
      ? input.response.content
      : String(
          (input.response.data as Record<string, unknown> | undefined)?.response ||
            (input.response.data as Record<string, unknown> | undefined)?.message ||
            '',
        );

  const ok = input.response.ok === true && Boolean(content.trim());
  const provider = input.provider || 'caredroid';
  const model = input.model || 'claude-sonnet-4-6';

  return {
    requestId: input.request.requestId,
    correlationId: input.request.correlationId,
    status: ok ? 'needs_human_review' : 'failed',
    responseType: ok ? 'answer' : 'error',
    content: content || 'AI returned no response text.',
    structuredData: input.response.data,
    evidence: [],
    citations: [],
    confidence: ok ? 0.55 : undefined,
    uncertainty: ['Conversational model confidence is not calibrated clinical uncertainty.'],
    missingInformation: [],
    limitations: [HUMAN_REVIEW_DISCLAIMER],
    toolExecutions: (input.response.toolCalls || []).map((tool) => ({
      toolName: tool.name || 'tool',
      status: 'success' as const,
      requiresHumanApproval: true,
    })),
    model: {
      provider,
      model,
      latencyMs: input.latencyMs,
      inputTokens: input.response.usage?.inputTokens,
      outputTokens: input.response.usage?.outputTokens,
      totalTokens: input.response.usage?.totalTokens,
      fallbackApplied: false,
    },
    safety: {
      allowed: ok,
      requiresHumanReview: true,
      reasons: ok ? ['clinician_review_required'] : ['conversational_response_failed'],
      disclaimer: HUMAN_REVIEW_DISCLAIMER,
    },
    humanReview: { status: 'pending', reviewType: 'clinical_ai', severity: 'high' },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Attach unified envelope (+ accountable card payload) onto a conversational AIResponse.
 * CopilotPanel already reads accountable via accountableFromGatewayPayload.
 */
export function attachUnifiedEnvelopeToAiResponse(
  response: AIResponse,
  envelope: CareDroidUnifiedAIResponse,
): AIResponse {
  const accountable = accountableFromUnifiedResponse(envelope);
  const existingData =
    response.data && typeof response.data === 'object' ? (response.data as Record<string, unknown>) : {};

  return {
    ...response,
    data: {
      ...existingData,
      content: envelope.content,
      response: envelope.content,
      unifiedAiEnvelope: envelope,
      accountableRecommendation: accountable,
      requiresHumanReview: envelope.safety.requiresHumanReview,
      requestId: envelope.requestId,
      correlationId: envelope.correlationId,
      status: envelope.status,
    },
  };
}

export function extractUnifiedEnvelope(payload: unknown): CareDroidUnifiedAIResponse | null {
  if (isCareDroidUnifiedAIResponse(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (isCareDroidUnifiedAIResponse(root.unifiedAiEnvelope)) {
    return root.unifiedAiEnvelope;
  }
  if (
    root.data &&
    typeof root.data === 'object' &&
    isCareDroidUnifiedAIResponse((root.data as Record<string, unknown>).unifiedAiEnvelope)
  ) {
    return (root.data as Record<string, unknown>).unifiedAiEnvelope as CareDroidUnifiedAIResponse;
  }
  return null;
}
