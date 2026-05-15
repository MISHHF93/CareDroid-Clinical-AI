import { apiFetch, parseApiResponse } from './apiClient';

/**
 * Fetch registered tools from GET /api/tools (or /api/tools/available).
 * @param {{ availableOnly?: boolean, authToken?: string|null }} options
 */
export async function fetchBackendClinicalTools({ availableOnly = false, authToken = null } = {}) {
  const path = availableOnly ? '/api/tools/available' : '/api/tools';
  const headers = {};
  const token = authToken ?? localStorage.getItem('caredroid_access_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiFetch(path, { headers });
  const data = await parseApiResponse(response, { fallback: {} });

  if (!response.ok) {
    return { ok: false, tools: [], count: 0, tier: null, error: data?.message || 'Failed to load tools' };
  }

  const tools = data.tools || data.data?.tools || [];
  return {
    ok: true,
    tools,
    count: data.count ?? tools.length,
    tier: data.tier ?? null,
  };
}
