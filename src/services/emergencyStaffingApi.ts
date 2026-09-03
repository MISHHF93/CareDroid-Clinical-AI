import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

async function requestJson(path, options: any = {}) {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data?.message || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data, message: '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function syncEmergencyAuditEvent(event: any = {}) {
  return requestJson('/api/audit/sync', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}
