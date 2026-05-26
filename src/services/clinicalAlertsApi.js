import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';

function disabledResult(action) {
  return {
    ok: false,
    disabled: true,
    message: `${UNSUPPORTED_CAPABILITY_MESSAGE} ${action} is available locally only.`,
  };
}

async function requestJson(path, options = {}) {
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
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchClinicalAlerts() {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return disabledResult('Clinical alerts');
  }
  return requestJson('/api/clinical/alerts');
}

export async function acknowledgeClinicalAlertApi(alertId, payload = {}) {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return disabledResult('Alert acknowledgement');
  }
  return requestJson(`/api/clinical/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function dismissClinicalAlertApi(alertId, payload = {}) {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return disabledResult('Alert dismissal');
  }
  return requestJson(`/api/clinical/alerts/${encodeURIComponent(alertId)}/dismiss`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export default {
  fetchClinicalAlerts,
  acknowledgeClinicalAlertApi,
  dismissClinicalAlertApi,
};
