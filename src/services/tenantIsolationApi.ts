import { apiFetchJson, getApiErrorMessage } from './apiClient';

export async function fetchTenantDataIsolationAudit() {
  try {
    const { response, data } = await apiFetchJson('/api/tenant/isolation-audit', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: response.ok,
      data: response.ok ? data : null,
      message: response.ok ? '' : getApiErrorMessage(null, response),
    };
  } catch (error: any) {
    return {
      ok: false,
      data: null,
      message: getApiErrorMessage(error),
    };
  }
}
