/**
 * POST /api/tools/:id/execute — only for registered orchestrator executors.
 * Unsupported tools fail explicitly before any network call.
 */

import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { API_ROUTES } from '../config/api.config';
import { AUTH_CONFIG } from '../config/auth.config';
import { classifyOrchestratorExecution } from '../data/orchestratorMappingAudit';
import { parseToolExecutionResponse } from '../utils/toolExecutionResponse';

/**
 * @param {string} toolId - NLU or registry id
 * @param {Record<string, unknown>} parameters
 * @param {{ authToken?: string|null, userId?: string|number, conversationId?: string|number }} [options]
 */
export async function executeClinicalTool(toolId, parameters, options = {}) {
  const classification = classifyOrchestratorExecution(toolId);

  if (classification.status === 'unsupported') {
    return {
      ok: false,
      unsupported: true,
      errorCode: classification.errorCode,
      message: classification.message,
      requestedId: classification.requestedId,
      tools: [],
    };
  }

  if (classification.status !== 'executable') {
    return {
      ok: false,
      unsupported: false,
      errorCode: classification.errorCode,
      message: classification.message,
      requestedId: classification.requestedId,
      tools: [],
    };
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = options.authToken ?? localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = { parameters: parameters ?? {} };
  if (options.userId != null) {
    body.userId = options.userId;
  }
  if (options.conversationId != null) {
    body.conversationId = String(options.conversationId);
  }

  try {
    const response = await apiFetch(API_ROUTES.tools.execute(classification.nluToolId), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await parseApiResponse(response, { fallback: {} });
    const parsed = parseToolExecutionResponse(data);

    if (!response.ok) {
      return {
        ok: false,
        unsupported: data?.errorCode === 'UNSUPPORTED_TOOL',
        errorCode: data?.errorCode || `HTTP_${response.status}`,
        message: data?.message || parsed.errors?.[0] || getApiErrorMessage(null, response),
        requestedId: classification.requestedId,
        nluToolId: classification.nluToolId,
        raw: data,
      };
    }

    return {
      ok: parsed.ok,
      unsupported: false,
      data: parsed.data,
      errors: parsed.errors,
      toolId: parsed.toolId || classification.nluToolId,
      toolName: parsed.toolName,
      requestedId: classification.requestedId,
      nluToolId: classification.nluToolId,
      raw: data,
    };
  } catch (error) {
    return {
      ok: false,
      unsupported: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
      requestedId: classification.requestedId,
      nluToolId: classification.nluToolId,
    };
  }
}

export { classifyOrchestratorExecution };
