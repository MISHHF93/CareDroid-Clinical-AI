/**
 * Clinical reference content from Nest clinical module (drugs, protocols).
 */

import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { reportApiError } from './apiErrorHandling';

/**
 * @param {Record<string, string|number|undefined>} [query]
 */
export async function fetchProtocols(query: any = {}) {
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
  } catch (error: any) {
    reportApiError({
      title: 'Protocols load failed',
      message: 'Unable to load protocol reference data.',
      error,
      endpoint: path,
    });
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
  } catch (error: any) {
    reportApiError({
      title: 'Protocol categories load failed',
      message: 'Unable to load protocol categories.',
      error,
      endpoint: '/api/protocols/categories',
    });
    return { ok: false, categories: [], error: getApiErrorMessage(error) };
  }
}

/**
 * @param {string} protocolId
 */
export async function fetchProtocolById(protocolId) {
  if (!protocolId) {
    return { ok: false, protocol: null, error: 'Protocol ID is required.' };
  }

  const endpoint = `/api/protocols/${encodeURIComponent(protocolId)}`;
  try {
    const { response, data } = await apiFetchJson(endpoint);
    if (!response.ok) {
      return { ok: false, protocol: null, error: getApiErrorMessage(null, response) };
    }
    return { ok: true, protocol: data || null, fromServer: true };
  } catch (error: any) {
    reportApiError({
      title: 'Protocol detail load failed',
      message: 'Unable to load protocol details.',
      error,
      endpoint,
    });
    return { ok: false, protocol: null, error: getApiErrorMessage(error), fromServer: false };
  }
}

/**
 * @param {Record<string, string|number|undefined>} [query]
 */
export async function fetchDrugs(query: any = {}) {
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
  } catch (error: any) {
    reportApiError({
      title: 'Drug list load failed',
      message: 'Unable to load drug reference data.',
      error,
      endpoint: path,
    });
    return {
      ok: false,
      items: [],
      error: getApiErrorMessage(error),
    };
  }
}

/**
 * @returns {Promise<import('../../types/api').DrugCategoriesResponse>}
 */
export async function fetchDrugCategories() {
  try {
    const { response, data } = await apiFetchJson('/api/drugs/categories');
    if (!response.ok) {
      return { ok: false, categories: [], error: getApiErrorMessage(null, response) };
    }
    const categories = Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : [];
    return { ok: true, categories };
  } catch (error: any) {
    reportApiError({
      title: 'Drug categories load failed',
      message: 'Unable to load drug categories.',
      error,
      endpoint: '/api/drugs/categories',
    });
    return { ok: false, categories: [], error: getApiErrorMessage(error) };
  }
}

/**
 * @param {string} drugId
 * @returns {Promise<import('../../types/api').DrugDetailResponse>}
 */
export async function fetchDrugById(drugId) {
  if (!drugId) {
    return { ok: false, drug: null, error: 'Drug ID is required.' };
  }

  const endpoint = `/api/drugs/${encodeURIComponent(drugId)}`;
  try {
    const { response, data } = await apiFetchJson(endpoint);
    if (!response.ok) {
      return { ok: false, drug: null, error: getApiErrorMessage(null, response) };
    }
    return { ok: true, drug: data || null };
  } catch (error: any) {
    reportApiError({
      title: 'Drug detail load failed',
      message: 'Unable to load drug details.',
      error,
      endpoint,
    });
    return { ok: false, drug: null, error: getApiErrorMessage(error) };
  }
}
