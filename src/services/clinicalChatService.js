import { apiFetch, buildApiUrl, parseApiResponse } from './apiClient';

/**
 * Maps UI tool registry ids (sidebar) to backend orchestrator tool ids for the chat API.
 * Only registered executors should appear here; other tools rely on intent + RAG/LLM.
 */
export const REGISTRY_ID_TO_ORCHESTRATOR_TOOL = {
  'drug-check': 'drug-interactions',
  'lab-interp': 'lab-interpreter',
  'sofa-score': 'sofa-calculator',
};

/**
 * @param {string} registryId
 * @returns {string|undefined} backend tool id for `tool` field, or undefined
 */
export function registryIdToChatToolParam(registryId) {
  if (!registryId) return undefined;
  return REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId];
}

/**
 * POST /api/chat/message — shared by Dashboard, ChatInterface, and tools.
 * @param {{ message: string, tool?: string, feature?: string, conversationId?: number|string, authToken?: string|null }} params
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function sendClinicalChatMessage({
  message,
  tool,
  feature,
  conversationId,
  authToken,
}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const body = {
    message,
    ...(tool ? { tool } : {}),
    ...(feature ? { feature } : {}),
  };
  if (conversationId != null && String(conversationId).trim() !== '') {
    const n = Number(conversationId);
    if (Number.isFinite(n)) {
      body.conversationId = n;
    }
  }

  const response = await apiFetch('/api/chat/message', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
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
  if (inner && typeof inner === 'object' && 'data' in inner) {
    return { toolId, toolName, result: inner };
  }
  return {
    toolId,
    toolName,
    result: { data: inner },
  };
}

/**
 * Map API JSON body to a single assistant message object for conversation state.
 * @param {object} data - parsed response from sendClinicalChatMessage
 */
export function mapChatResponseToAssistantMessage(data) {
  const toolResult = normalizeToolResultForUi(data.toolResult);
  const viz = [];
  if (toolResult?.result?.data != null && (toolResult.toolId || toolResult.toolName)) {
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

  return {
    role: 'assistant',
    content: data.response || 'I could not generate a response.',
    citations: data.citations || [],
    confidence: data.confidence,
    ragContext: data.ragContext,
    toolResult,
    visualizations: viz.length > 0 ? viz : undefined,
    metadata: data.metadata,
    timestamp: new Date(),
  };
}

export function buildApiChatMessageUrl() {
  return buildApiUrl('/api/chat/message');
}
