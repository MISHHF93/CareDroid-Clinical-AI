import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { AUTH_CONFIG } from '../config/auth.config';

function authHeaders(options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = options.authToken ?? localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchPlatformSystemCapability(capabilityId, options = {}) {
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
  } catch (error) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function fetchPlatformSystemHub(pack, options = {}) {
  try {
    const response = await apiFetch(
      `/api/platform-systems/packs/${encodeURIComponent(pack)}`,
      {
        method: 'GET',
        headers: authHeaders(options),
      }
    );
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
  } catch (error) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function postPlatformSystemContract(endpoint, payload = {}, options = {}) {
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
  } catch (error) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

