import {
  AUTOMATION_AUDIT_STATUSES,
  logAutomationAuditEvent,
} from '../data/automationAuditTrail';
import { createAutomationAuditEvent } from './automationAuditApi';
import { getTenantContext } from './tenantContextStore';

function entity(id, name) {
  return { id: id || 'unknown', name: name || id || 'Unknown' };
}

function resolveScope(scope: any = {}) {
  const tenantContext = getTenantContext() || {};
  return {
    user: entity(scope.userId || tenantContext.userId, scope.userName || 'Current user'),
    tenant: entity(
      scope.tenantId || tenantContext.organizationId,
      scope.tenantName || 'Current tenant'
    ),
    workspace: entity(
      scope.workspaceId || tenantContext.workspaceId,
      scope.workspaceName || 'Current workspace'
    ),
  };
}

async function persistOrFallback(event) {
  try {
    const result = await createAutomationAuditEvent(event);
    if (result.ok) return result.data;
  } catch {
    // The audit trail must remain visible even when persistence is unavailable.
  }
  return logAutomationAuditEvent(event);
}

export function recordAutomationBlocked(event) {
  const scope = resolveScope(event.scope);
  return persistOrFallback({
    triggerFired: event.triggerFired,
    conditionsEvaluated: event.conditionsEvaluated || [{ label: event.reason, result: false }],
    actionSelected: event.actionSelected,
    ...scope,
    aiInvolvement: event.aiInvolvement || { involved: false, summary: 'Rules-only automation gate.' },
    toolCalled: event.toolCalled || 'none',
    backendEndpoint: event.backendEndpoint || 'none',
    status: AUTOMATION_AUDIT_STATUSES.BLOCKED,
    reason: event.reason,
    timestamp: event.timestamp || new Date().toISOString(),
    reviewer: event.reviewer || { required: true, name: 'Automation owner' },
  });
}

export function recordAutomationFailure(event) {
  const scope = resolveScope(event.scope);
  const errorMessage =
    event.error instanceof Error ? event.error.message : String(event.error || 'Automation failed.');

  return persistOrFallback({
    triggerFired: event.triggerFired,
    conditionsEvaluated: event.conditionsEvaluated || [{ label: 'Automation completed successfully', result: false }],
    actionSelected: event.actionSelected,
    ...scope,
    aiInvolvement: event.aiInvolvement || { involved: false, summary: 'Rules-only automation path.' },
    toolCalled: event.toolCalled || 'none',
    backendEndpoint: event.backendEndpoint || 'none',
    status: AUTOMATION_AUDIT_STATUSES.FAILED,
    error: errorMessage,
    timestamp: event.timestamp || new Date().toISOString(),
    reviewer: event.reviewer || { required: true, name: 'Automation owner' },
  });
}

export default {
  recordAutomationBlocked,
  recordAutomationFailure,
};
