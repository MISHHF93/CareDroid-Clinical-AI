import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

function authHeaders(authToken = null, contentType = false) {
  const headers = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = authToken ?? localStorage.getItem('caredroid_access_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function disabledResponse(message) {
  return { ok: false, data: null, error: message };
}

/**
 * Fetch registered tools from GET /api/tools (or /api/tools/available).
 * @param {{ availableOnly?: boolean, authToken?: string|null }} options
 */
export async function fetchBackendClinicalTools({ availableOnly = false, authToken = null } = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return { ok: false, tools: [], count: 0, tier: null, error: 'Tool list API is not available.' };
  }

  const path = availableOnly ? '/api/tools/available' : '/api/tools';
  const headers = authHeaders(authToken);

  try {
    const response = await apiFetch(path, { headers });
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false,
        tools: [],
        count: 0,
        tier: null,
        error: data?.message || getApiErrorMessage(null, response),
      };
    }

    const tools = data.tools || data.data?.tools || [];
    return {
      ok: true,
      tools,
      count: data.count ?? tools.length,
      tier: data.tier ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      tools: [],
      count: 0,
      tier: null,
      error: getApiErrorMessage(error),
    };
  }
}

/**
 * Fetch backend metadata/schema for a registered or aliased tool.
 * @param {string} toolId
 * @param {{ authToken?: string|null }} options
 */
export async function fetchClinicalToolMetadata(toolId, { authToken = null } = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return disabledResponse('Tool metadata API is not available.');
  }
  if (!toolId) return disabledResponse('Tool id is required.');

  try {
    const response = await apiFetch(`/api/tools/${encodeURIComponent(toolId)}`, {
      headers: authHeaders(authToken),
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, error: null };
  } catch (error) {
    return { ok: false, data: null, error: getApiErrorMessage(error) };
  }
}

/**
 * Validate a tool payload without executing it.
 * @param {string} toolId
 * @param {Record<string, unknown>} parameters
 * @param {{ authToken?: string|null }} options
 */
export async function validateClinicalTool(toolId, parameters = {}, { authToken = null } = {}) {
  if (!isBackendCapabilityEnabled('toolsExecute')) {
    return disabledResponse('Tool validation API is not available.');
  }
  if (!toolId) return disabledResponse('Tool id is required.');

  try {
    const response = await apiFetch(`/api/tools/${encodeURIComponent(toolId)}/validate`, {
      method: 'POST',
      headers: authHeaders(authToken, true),
      body: JSON.stringify({ parameters: parameters ?? {} }),
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, error: null };
  } catch (error) {
    return { ok: false, data: null, error: getApiErrorMessage(error) };
  }
}

/**
 * Fetch registered executors, aliases, and documented unsupported NLU ids.
 * @param {{ authToken?: string|null }} options
 */
export async function fetchToolExecutorCatalog({ authToken = null } = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return disabledResponse('Tool executor catalog API is not available.');
  }

  try {
    const response = await apiFetch('/api/tools/catalog/executors', {
      headers: authHeaders(authToken),
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, error: null };
  } catch (error) {
    return { ok: false, data: null, error: getApiErrorMessage(error) };
  }
}

/**
 * Fetch aggregate tool usage/statistics when available.
 * @param {{ authToken?: string|null }} options
 */
export async function fetchToolStatistics({ authToken = null } = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return disabledResponse('Tool statistics API is not available.');
  }

  try {
    const response = await apiFetch('/api/tools/statistics', {
      headers: authHeaders(authToken),
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, error: null };
  } catch (error) {
    return { ok: false, data: null, error: getApiErrorMessage(error) };
  }
}
