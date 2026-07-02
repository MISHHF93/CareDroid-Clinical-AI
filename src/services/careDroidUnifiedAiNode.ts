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
  PLATFORM_AI_SERVICE_NODE_MAP,
  type UnifiedAiNodeCapability,
} from '../config/careDroidUnifiedAiNode.config';
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

export type UnifiedAiStructuredRequest = AIChiefStructuredRequest & {
  capabilityId?: string;
};

export type UnifiedAiConversationalRequest = AIChiefConversationalRequest & {
  capabilityId?: string;
  platformServiceId?: string;
};

export { CARE_DROID_UNIFIED_AI_NODE_ID };

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

/** Structured AI Chief intents — routes to POST /api/ai/node via transportCareDroidAINode. */
export async function invokeUnifiedAiStructured(
  request: UnifiedAiStructuredRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<CareDroidAIResponse> {
  const enriched: AIChiefStructuredRequest = {
    ...request,
    context: stampUnifiedNodeContext(request, request.capabilityId || request.intent),
  };
  return requestAiChiefStructured(enriched, options);
}

/** Conversational copilot/chat — audited through AI Chief orchestrator. */
export async function invokeUnifiedAiConversational(
  request: UnifiedAiConversationalRequest,
  runtime?: Parameters<typeof requestAiChiefConversational>[1],
): Promise<AIResponse> {
  const enriched: AIChiefConversationalRequest = {
    ...request,
    context: stampUnifiedNodeContext(
      request,
      request.capabilityId || request.platformServiceId || request.requestType,
    ),
  };
  return requestAiChiefConversational(enriched, runtime);
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