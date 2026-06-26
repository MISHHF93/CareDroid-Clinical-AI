import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

export async function fetchMyAuditLogs(limit = 5) {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await apiFetch(`/api/audit/my-logs?${params.toString()}`);
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return {
      ok: true,
      logs: Array.isArray(data?.data) ? data.data : [],
      total: Number(data?.total || 0),
    };
  } catch (error: any) {
    return { ok: false, message: getApiErrorMessage(error), logs: [], total: 0 };
  }
}

export async function fetchPhiAccessLogs({ startDate, endDate }: any = {}) {
  try {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await apiFetch(`/api/audit/phi-access${suffix}`);
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return {
      ok: true,
      logs: Array.isArray(data?.data) ? data.data : [],
      total: Number(data?.total || 0),
    };
  } catch (error: any) {
    return { ok: false, message: getApiErrorMessage(error), logs: [], total: 0 };
  }
}
