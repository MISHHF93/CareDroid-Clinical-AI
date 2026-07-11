import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';
import { recordAutomationBlocked } from './automationAuditLogger';

function disabledResult(action) {
  void recordAutomationBlocked({
    triggerFired: `${action} requested`,
    conditionsEvaluated: [{ label: 'Clinical alerts backend capability enabled', result: false }],
    actionSelected: action,
    toolCalled: 'clinical-alerts',
    backendEndpoint: '/api/clinical/alerts',
    reason: 'Clinical alerts backend capability is disabled or demo-only on this server.',
  });

  return {
    ok: false as const,
    disabled: true as const,
    message: `${UNSUPPORTED_CAPABILITY_MESSAGE} ${action} is available locally only.`,
  };
}

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
      return { ok: false as const, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true as const, data, message: '' };
  } catch (error: any) {
    return { ok: false as const, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchClinicalAlerts() {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return disabledResult('Clinical alerts');
  }
  return requestJson('/api/clinical/alerts');
}

export async function acknowledgeClinicalAlertApi(alertId, payload: any = {}) {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return disabledResult('Alert acknowledgement');
  }
  return requestJson(`/api/clinical/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function dismissClinicalAlertApi(alertId, payload: any = {}) {
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
