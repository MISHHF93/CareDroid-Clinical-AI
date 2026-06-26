import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { AUTH_CONFIG } from '../config/auth.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

const STABLE_GET_CACHE_TTL_MS = 30_000;
const stableGetCache = new Map();
const stableGetInflight = new Map();

function resolveAuthToken(authToken = null) {
  if (authToken !== null && authToken !== undefined) return authToken;
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
}

function authHeaders(authToken: any = null, contentType = false) {
  const headers: any = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = resolveAuthToken(authToken);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function disabledResponse(message) {
  return { ok: false, data: null, error: message };
}

function stableGetCacheKey(path, authToken) {
  return `${path}::${authToken || 'anonymous'}`;
}

async function cachedStableGet(cacheKey, producer) {
  const now = Date.now();
  const cached = stableGetCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (stableGetInflight.has(cacheKey)) {
    return stableGetInflight.get(cacheKey);
  }

  const promise = producer()
    .then((result) => {
      if (result?.ok) {
        stableGetCache.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + STABLE_GET_CACHE_TTL_MS,
        });
      }
      return result;
    })
    .finally(() => {
      stableGetInflight.delete(cacheKey);
    });

  stableGetInflight.set(cacheKey, promise);
  return promise;
}

export function clearClinicalToolsApiCache() {
  stableGetCache.clear();
  stableGetInflight.clear();
}

/**
 * Fetch registered tools from GET /api/tools (or /api/tools/available).
 * @param {{ availableOnly?: boolean, authToken?: string|null }} options
 */
export async function fetchBackendClinicalTools({ availableOnly = false, authToken = null }: any = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return { ok: false, tools: [], count: 0, tier: null, error: 'Tool list API is not available.' };
  }

  const path = availableOnly ? '/api/tools/available' : '/api/tools';
  const resolvedToken = resolveAuthToken(authToken);
  const cacheKey = stableGetCacheKey(path, resolvedToken);

  return cachedStableGet(cacheKey, async () => {
    try {
      const response = await apiFetch(path, { headers: authHeaders(resolvedToken) });
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
    } catch (error: any) {
      return {
        ok: false,
        tools: [],
        count: 0,
        tier: null,
        error: getApiErrorMessage(error),
      };
    }
  });
}

/**
 * Fetch backend metadata/schema for a registered or aliased tool.
 * @param {string} toolId
 * @param {{ authToken?: string|null }} options
 */
export async function fetchClinicalToolMetadata(toolId, { authToken = null }: any = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return disabledResponse('Tool metadata API is not available.');
  }
  if (!toolId) return disabledResponse('Tool id is required.');

  const path = `/api/tools/${encodeURIComponent(toolId)}`;
  const resolvedToken = resolveAuthToken(authToken);
  const cacheKey = stableGetCacheKey(path, resolvedToken);

  return cachedStableGet(cacheKey, async () => {
    try {
      const response = await apiFetch(path, {
        headers: authHeaders(resolvedToken),
      });
      const data = await parseApiResponse(response, { fallback: {} });
      if (!response.ok) {
        return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
      }
      return { ok: true, data, error: null };
    } catch (error: any) {
      return { ok: false, data: null, error: getApiErrorMessage(error) };
    }
  });
}

/**
 * Validate a tool payload without executing it.
 * @param {string} toolId
 * @param {Record<string, unknown>} parameters
 * @param {{ authToken?: string|null }} options
 */
export async function validateClinicalTool(toolId, parameters: any = {}, { authToken = null }: any = {}) {
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
  } catch (error: any) {
    return { ok: false, data: null, error: getApiErrorMessage(error) };
  }
}

/**
 * Fetch registered executors, aliases, and documented unsupported NLU ids.
 * @param {{ authToken?: string|null }} options
 */
export async function fetchToolExecutorCatalog({ authToken = null }: any = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return disabledResponse('Tool executor catalog API is not available.');
  }

  const path = '/api/tools/catalog/executors';
  const resolvedToken = resolveAuthToken(authToken);
  const cacheKey = stableGetCacheKey(path, resolvedToken);

  return cachedStableGet(cacheKey, async () => {
    try {
      const response = await apiFetch(path, {
        headers: authHeaders(resolvedToken),
      });
      const data = await parseApiResponse(response, { fallback: {} });
      if (!response.ok) {
        return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
      }
      return { ok: true, data, error: null };
    } catch (error: any) {
      return { ok: false, data: null, error: getApiErrorMessage(error) };
    }
  });
}

/**
 * Fetch aggregate tool usage/statistics when available.
 * @param {{ authToken?: string|null }} options
 */
export async function fetchToolStatistics({ authToken = null }: any = {}) {
  if (!isBackendCapabilityEnabled('toolsList')) {
    return disabledResponse('Tool statistics API is not available.');
  }

  const path = '/api/tools/statistics';
  const resolvedToken = resolveAuthToken(authToken);
  const cacheKey = stableGetCacheKey(path, resolvedToken);

  return cachedStableGet(cacheKey, async () => {
    try {
      const response = await apiFetch(path, {
        headers: authHeaders(resolvedToken),
      });
      const data = await parseApiResponse(response, { fallback: {} });
      if (!response.ok) {
        return { ok: false, data: null, error: data?.message || getApiErrorMessage(null, response) };
      }
      return { ok: true, data, error: null };
    } catch (error: any) {
      return { ok: false, data: null, error: getApiErrorMessage(error) };
    }
  });
}
