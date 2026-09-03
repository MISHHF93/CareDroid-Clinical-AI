import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { AUTH_CONFIG } from '../config/auth.config';

function authHeaders(options: any = {}) {
  const headers: any = { 'Content-Type': 'application/json' };
  const token = options.authToken ?? localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchPlatformSystemCapability(capabilityId, options: any = {}) {
  try {
    const response = await apiFetch(`/api/platform-systems/capabilities/${capabilityId}`, {
      method: 'GET',
      headers: authHeaders(options),
    });
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false,
        errorCode: data?.errorCode || `HTTP_${response.status}`,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return { ok: true, data };
  } catch (error: any) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function fetchPlatformSystemHub(pack, options: any = {}) {
  try {
    const response = await apiFetch(`/api/platform-systems/packs/${encodeURIComponent(pack)}`, {
      method: 'GET',
      headers: authHeaders(options),
    });
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false,
        errorCode: data?.errorCode || `HTTP_${response.status}`,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return { ok: true, data };
  } catch (error: any) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function postPlatformSystemContract(endpoint, payload: any = {}, options: any = {}) {
  try {
    const response = await apiFetch(endpoint, {
      method: 'POST',
      headers: authHeaders(options),
      body: JSON.stringify(payload),
    });
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false,
        errorCode: data?.errorCode || `HTTP_${response.status}`,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return { ok: true, data };
  } catch (error: any) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}
