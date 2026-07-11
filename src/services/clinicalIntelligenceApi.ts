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

export async function generateAmbientScribeDraft(payload, options: any = {}) {
  try {
    const response = await apiFetch('/api/clinical-intelligence/ambient-scribe/generate', {
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

export async function queryGuidelineEvidence(payload, options: any = {}) {
  try {
    const response = await apiFetch('/api/clinical-intelligence/guideline-rag/query', {
      method: 'POST',
      headers: authHeaders(options),
      body: JSON.stringify(payload),
    });
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false as const,
        errorCode: data?.errorCode || `HTTP_${response.status}`,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return { ok: true as const, data };
  } catch (error: any) {
    return {
      ok: false as const,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function generateDifferentialAi(payload, options: any = {}) {
  try {
    const response = await apiFetch('/api/clinical-intelligence/differential-ai/generate', {
      method: 'POST',
      headers: authHeaders(options),
      body: JSON.stringify(payload),
    });
    const data = await parseApiResponse(response, { fallback: {} });

    if (!response.ok) {
      return {
        ok: false as const,
        errorCode: data?.errorCode || `HTTP_${response.status}`,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }

    return { ok: true as const, data };
  } catch (error: any) {
    return {
      ok: false as const,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function generateTimelineAi(payload, options: any = {}) {
  try {
    const response = await apiFetch('/api/clinical-intelligence/timeline-ai/generate', {
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

export async function generatePatientSummaryAi(payload, options: any = {}) {
  try {
    const response = await apiFetch('/api/clinical-intelligence/patient-summary-ai/generate', {
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

export async function generateOrderSetAi(payload, options: any = {}) {
  try {
    const response = await apiFetch('/api/clinical-intelligence/order-set-ai/generate', {
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

function queryString(params: any = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export async function fetchAiExplainabilityTrace(params: any = {}, options: any = {}) {
  try {
    const response = await apiFetch(
      `/api/clinical-intelligence/ai-explainability/trace${queryString(params)}`,
      {
        method: 'GET',
        headers: authHeaders(options),
      },
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
  } catch (error: any) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}

export async function fetchClinicalAuditExecutionLogs(params: any = {}, options: any = {}) {
  try {
    const response = await apiFetch(
      `/api/clinical-intelligence/clinical-audit/execution-logs${queryString(params)}`,
      {
        method: 'GET',
        headers: authHeaders(options),
      },
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
  } catch (error: any) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: getApiErrorMessage(error),
    };
  }
}
