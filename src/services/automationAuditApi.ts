import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';
import { createAutomationAuditEntry } from '../data/automationAuditTrail';

function disabledResult(action) {
  return {
    ok: false,
    disabled: true,
    data: null,
    message: `${UNSUPPORTED_CAPABILITY_MESSAGE} ${action} is available locally only.`,
  };
}

function toFrontendEntry(event) {
  return createAutomationAuditEntry({
    id: event.id,
    triggerFired: event.triggerFired,
    conditionsEvaluated: event.conditionsEvaluated,
    actionSelected: event.actionSelected,
    user: { id: event.userId, name: event.userName },
    tenant: { id: event.tenantId, name: event.tenantName },
    workspace: { id: event.workspaceId, name: event.workspaceName },
    aiInvolvement: { involved: event.aiInvolved, summary: event.aiSummary },
    toolCalled: event.toolCalled,
    backendEndpoint: event.backendEndpoint,
    status: event.status,
    timestamp: event.timestamp,
    reviewer: { required: event.reviewerRequired, name: event.reviewerName },
    reason: event.reason,
    error: event.error,
  });
}

function toBackendPayload(event) {
  const entry = createAutomationAuditEntry(event);
  return {
    triggerFired: entry.triggerFired,
    conditionsEvaluated: entry.conditionsEvaluated,
    actionSelected: entry.actionSelected,
    user: entry.user,
    tenant: entry.tenant,
    workspace: entry.workspace,
    aiInvolvement: entry.aiInvolvement,
    toolCalled: entry.toolCalled,
    backendEndpoint: entry.backendEndpoint,
    status: entry.status,
    timestamp: entry.timestamp,
    reviewer: entry.reviewer,
    reason: entry.reason,
    error: entry.error,
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

export async function fetchAutomationAuditEntries({ tenantId }: any = {}) {
  if (!isBackendCapabilityEnabled('automationAudit')) {
    return disabledResult('Automation audit persistence');
  }

  const params = new URLSearchParams();
  if (tenantId) params.set('tenantId', tenantId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await requestJson(`/api/automation-audit${query}`);

  if (!result.ok) return result;
  return {
    ok: true,
    data: (result.data?.data || []).map(toFrontendEntry),
    message: '',
  };
}

export async function createAutomationAuditEvent(event) {
  if (!isBackendCapabilityEnabled('automationAudit')) {
    return disabledResult('Automation audit event creation');
  }

  const result = await requestJson('/api/automation-audit', {
    method: 'POST',
    body: JSON.stringify(toBackendPayload(event)),
  });

  if (!result.ok) return result;
  return {
    ok: true,
    data: toFrontendEntry(result.data?.data || {}),
    message: '',
  };
}

export default {
  fetchAutomationAuditEntries,
  createAutomationAuditEvent,
};
