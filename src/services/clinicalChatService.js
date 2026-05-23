import { apiFetch, buildApiUrl, parseApiResponse } from './apiClient';

import {
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  registryIdToOrchestratorTool,
} from '../data/clinicalCatalogWiring';

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

export async function suggestClinicalAction({ patientId, context = {}, authToken }) {
  const headers = { 'Content-Type': 'application/json' };
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
  const headers = { 'Content-Type': 'application/json' };
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

/**
 * Map API JSON body to a single assistant message object for conversation state.
 * @param {object} data - parsed response from sendClinicalChatMessage
 */
export function mapChatResponseToAssistantMessage(data) {
  const toolResult = normalizeToolResultForUi(data.toolResult);
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
    toolResult,
    visualizations: viz.length > 0 ? viz : undefined,
    metadata: data.metadata,
    timestamp: new Date(),
  };
}

export function buildApiChatMessageUrl() {
  return buildApiUrl('/api/chat/message');
}
