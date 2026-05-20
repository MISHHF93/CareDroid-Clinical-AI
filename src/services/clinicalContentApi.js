/**
 * Clinical reference content from Nest clinical module (drugs, protocols).
 */

import { apiFetchJson, getApiErrorMessage } from './apiClient';

/**
 * @param {Record<string, string|number|undefined>} [query]
 */
export async function fetchProtocols(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/protocols?${qs}` : '/api/protocols';

  try {
    const { response, data } = await apiFetchJson(path);
    if (!response.ok) {
      return {
        ok: false,
        items: [],
        error: getApiErrorMessage(null, response),
        fromServer: false,
      };
    }
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return { ok: true, items, total: data?.total ?? items.length, fromServer: true };
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: getApiErrorMessage(error),
      fromServer: false,
    };
  }
}

export async function fetchProtocolCategories() {
  try {
    const { response, data } = await apiFetchJson('/api/protocols/categories');
    if (!response.ok) {
      return { ok: false, categories: [], error: getApiErrorMessage(null, response) };
    }
    const categories = Array.isArray(data) ? data : [];
    return { ok: true, categories };
  } catch (error) {
    return { ok: false, categories: [], error: getApiErrorMessage(error) };
  }
}

/**
 * @param {Record<string, string|number|undefined>} [query]
 */
export async function fetchDrugs(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/drugs?${qs}` : '/api/drugs';

  try {
    const { response, data } = await apiFetchJson(path);
    if (!response.ok) {
      return {
        ok: false,
        items: [],
        error: getApiErrorMessage(null, response),
      };
    }
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return { ok: true, items, total: data?.total ?? items.length };
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: getApiErrorMessage(error),
    };
  }
}
