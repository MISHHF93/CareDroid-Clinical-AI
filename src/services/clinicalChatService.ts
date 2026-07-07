import { apiFetch, buildApiUrl, parseApiResponse } from './apiClient';
import { buildAIAuditEvent, logAIAuditEvent, previewAIText } from '../lib/ai/audit/logger';
import { invokeUnifiedAiConversational } from './careDroidUnifiedAiNode';

import {
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  registryIdToOrchestratorTool,
} from '../data/clinicalCatalogWiring';
import { buildKnowledgeBaseAssistantContext } from '../data/customerKnowledgeBase';

export { REGISTRY_ID_TO_ORCHESTRATOR_TOOL };

/**
 * @param {string} registryId
 * @returns {string|undefined} backend tool id for `tool` field, or undefined
 */
export function registryIdToChatToolParam(registryId) {
  return registryIdToOrchestratorTool(registryId);
}

/**
 * POST /api/chat/message — shared by Dashboard, ChatInterface, and tools.
 * @param {{ message: string, messages?: Array<{role: string, content: string}>, tool?: string, feature?: string, requestType?: string, conversationId?: number|string, authToken?: string|null, workspaceContext?: object, memoryContext?: object, userId?: string, tenantId?: string, patientId?: string, encounterId?: string, purpose?: string, sourceModule?: string }} params
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function sendClinicalChatMessage({
  message,
  messages,
  tool,
  feature,
  requestType,
  conversationId,
  authToken,
  workspaceContext,
  memoryContext,
  userId = 'current-user',
  tenantId = 'default-tenant',
  patientId,
  encounterId,
  purpose = 'CareDroid operational support',
  sourceModule = 'ed-copilot',
}) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const aiRequest = {
    userId,
    tenantId,
    ...(patientId ? { patientId } : {}),
    ...(encounterId ? { encounterId } : {}),
    purpose,
    sourceModule,
    requestType,
  };

  const body: any = {
    message,
    userId,
    tenantId,
    ...(patientId ? { patientId } : {}),
    ...(encounterId ? { encounterId } : {}),
    purpose,
    sourceModule,
    ...(Array.isArray(messages) && messages.length ? { messages } : {}),
    ...(tool ? { tool } : {}),
    ...(feature ? { feature } : {}),
    knowledgeBaseContext: buildKnowledgeBaseAssistantContext(message),
    ...(workspaceContext || requestType
      ? {
          workspaceContext: {
            ...(workspaceContext || {}),
            aiRequest,
            ...(requestType
              ? {
                  aiRequest: {
                    ...aiRequest,
                    ...((workspaceContext && workspaceContext.aiRequest) || {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(memoryContext ? { memoryContext } : {}),
  };
  if (conversationId != null && String(conversationId).trim() !== '') {
    const n = Number(conversationId);
    if (Number.isFinite(n)) {
      body.conversationId = n;
    }
  }

  logAIAuditEvent(
    buildAIAuditEvent({
      userId,
      tenantId,
      ...(patientId ? { patientId } : {}),
      ...(encounterId ? { encounterId } : {}),
      purpose,
      module: sourceModule,
      action: 'ai_chat_request',
      result: 'allowed',
      requestType: requestType || 'UNKNOWN',
      inputPreview: previewAIText(message),
      safety: { requiresHumanReview: true, blocked: false, reasons: [] },
    }),
  );

  if (requestType === 'COPILOT_CHAT') {
    const aiResponse = await invokeUnifiedAiConversational({
      capabilityId: 'copilot',
      platformServiceId: 'copilot',
      requestType: 'COPILOT_CHAT',
      systemPrompt: '',
      message,
      messages: Array.isArray(messages) && messages.length
        ? messages.map((entry) => ({
            role: entry.role === 'assistant' ? 'assistant' : 'user',
            content: String(entry.content || ''),
          }))
        : [{ role: 'user', content: message }],
      patientId,
      encounterId,
      sourceScreen: sourceModule,
      context: {
        ...(workspaceContext || {}),
        aiRequest,
        ...(memoryContext ? { memoryContext } : {}),
        knowledgeBaseContext: body.knowledgeBaseContext,
        edCopilot: {
          enabled: true,
          querySource: 'clinical_chat_service',
          toolsEnabled: Boolean(tool || feature),
          tool,
          feature,
        },
      },
    });

    const rawData =
      aiResponse.data && typeof aiResponse.data === 'object' && !Array.isArray(aiResponse.data)
        ? (aiResponse.data as Record<string, unknown>)
        : {};
    const responseText =
      typeof rawData.response === 'string'
        ? rawData.response
        : typeof aiResponse.content === 'string'
          ? aiResponse.content
          : '';

    return {
      ok: aiResponse.ok,
      status: aiResponse.status,
      data: {
        ...rawData,
        response: responseText,
        metadata: {
          ...(isRecord(rawData.metadata) ? rawData.metadata : {}),
          aiChief: {
            orchestrated: true,
            sourceModule,
          },
        },
      },
    };
  }

  const response = await apiFetch('/api/chat/message', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await parseApiResponse(response, { fallback: {} });
  return { ok: response.ok, status: response.status, data };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export async function suggestClinicalAction({ patientId, context = {} as any, authToken }) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await apiFetch('/api/chat/suggest-action', {
    method: 'POST',
    headers,
    body: JSON.stringify({ patientId, context }),
  });

  const data = await parseApiResponse(response, { fallback: {} });
  return { ok: response.ok, status: response.status, data };
}

export async function analyzeClinicalVitals({ vitals, authToken }) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await apiFetch('/api/chat/analyze-vitals', {
    method: 'POST',
    headers,
    body: JSON.stringify({ vitals }),
  });

  const data = await parseApiResponse(response, { fallback: {} });
  return { ok: response.ok, status: response.status, data };
}

/**
 * Normalize API toolResult so ToolCard receives { toolId, toolName, result: { data, ... } }.
 * @param {object|undefined} tr
 */
export function normalizeToolResultForUi(tr) {
  if (!tr) return undefined;
  const toolId = tr.toolId;
  const toolName = tr.toolName;
  const inner = tr.result;
  const common = {
    toolId,
    toolName,
    parameters: tr.parameters,
    source: tr.source,
  };
  if (inner && typeof inner === 'object' && 'data' in inner) {
    return { ...common, result: inner };
  }
  return {
    ...common,
    result: { data: inner },
  };
}

export function normalizeAiFoundationMetadata(metadata: any = {}) {
  const foundation = metadata?.aiFoundation;
  if (!foundation) return undefined;

  const selectedExperts =
    Array.isArray(foundation.selectedExperts) && foundation.selectedExperts.length > 0
      ? foundation.selectedExperts
      : Array.isArray(metadata.routePlan?.selectedExperts) && metadata.routePlan.selectedExperts.length > 0
        ? metadata.routePlan.selectedExperts
        : foundation.selectedExpert
          ? [
              {
                expertId: foundation.selectedExpert,
                role: 'primary',
                confidence: foundation.confidence,
                score: foundation.routeScore,
              },
            ]
          : [];

  return {
    ...foundation,
    selectedExperts,
    routeScore: foundation.routeScore ?? selectedExperts[0]?.score,
    routingMode: foundation.routingMode ?? metadata.routePlan?.routingMode,
    fallbackApplied: foundation.fallbackApplied ?? metadata.routePlan?.fallbackApplied ?? false,
    estimatedCost:
      foundation.estimatedCost ??
      metadata.cost?.estimated ??
      metadata.routePlan?.costPlan?.estimatedCost,
    costReductionApplied:
      foundation.costReductionApplied ??
      metadata.cost?.savedBy ??
      metadata.routePlan?.costPlan?.costReductionApplied ??
      [],
    requiresHumanReview:
      foundation.requiresHumanReview ?? metadata.safety?.requiresHumanReview ?? false,
  };
}

export function normalizeRagSourcePanel(data: any = {}) {
  const panel = data.sourcePanel || data.ragContext?.sourcePanel;
  if (panel?.references?.length) {
    return panel;
  }

  const references = data.ragContext?.references;
  if (Array.isArray(references) && references.length > 0) {
    return {
      references,
      confidence: data.confidence ?? data.ragContext?.confidence,
      generatedAt: data.ragContext?.generatedAt,
      retrieval: {
        query: data.ragContext?.query,
        chunksRetrieved: data.ragContext?.chunksRetrieved,
        sourcesFound: data.ragContext?.sourcesFound,
        totalRetrieved: data.ragContext?.totalRetrieved,
        latencyMs: data.ragContext?.latencyMs,
      },
    };
  }

  return undefined;
}

/**
 * Map API JSON body to a single assistant message object for conversation state.
 * @param {object} data - parsed response from sendClinicalChatMessage
 */
export function mapChatResponseToAssistantMessage(data) {
  const toolResult = normalizeToolResultForUi(data.toolResult);
  const aiFoundation = normalizeAiFoundationMetadata(data.metadata);
  const sourcePanel = normalizeRagSourcePanel(data);
  const backendVisualizations = Array.isArray(data.visualizations) ? data.visualizations : [];
  const viz = [...backendVisualizations];
  if (toolResult?.result?.data != null && (toolResult.toolId || toolResult.toolName)) {
    const hasToolResultViz = viz.some((item) => item?.type === 'tool-result');
    if (!hasToolResultViz) {
      viz.push({
        type: 'tool-result',
        data: {
          toolId: toolResult.toolId,
          toolName: toolResult.toolName,
          result: toolResult.result,
          parameters: data.toolResult?.parameters,
        },
      });
    }
  }

  return {
    role: 'assistant',
    content: data.response || 'I could not generate a response.',
    citations: data.citations || [],
    confidence: data.confidence,
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    ragContext: data.ragContext,
    sourcePanel,
    toolResult,
    visualizations: viz.length > 0 ? viz : undefined,
    metadata: data.metadata,
    aiFoundation,
    aiGateway: data.metadata?.aiGateway,
    timestamp: new Date(),
  };
}

export function buildApiChatMessageUrl() {
  return buildApiUrl('/api/chat/message');
}
