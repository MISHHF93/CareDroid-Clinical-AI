/**
 * PHI access gate — authorizes patient data reads/writes and records audit trails.
 */

import observabilityService from './observabilityService';
import {
  canAccessPhi,
  checkPermission,
  phiBackendPermissionForAction,
  requiresPhiAudit,
  type SecurityAccessContext,
} from './securityAccessService';
import { recordSecurityAuditEvent } from './securityAuditService';
import { BACKEND_PERMISSION_KEYS, type PhiAccessAction } from '../config/securityModel';

export type PhiAccessRequest = Readonly<{
  patientId: string;
  action?: PhiAccessAction;
  staffId?: string;
  source?: string;
  details?: Record<string, unknown>;
  context: SecurityAccessContext;
}>;

export type PhiAccessResult = Readonly<{
  allowed: boolean;
  reason?: string;
  audited: boolean;
}>;

export function assertPhiAccess(request: PhiAccessRequest): PhiAccessResult {
  const action = request.action || 'view';
  const allowed = canAccessPhi(request.context, action);

  if (!allowed) {
    observabilityService.recordEvent({
      category: 'audit',
      name: 'phi-access-denied',
      severity: 'warn',
      patientId: request.patientId,
      source: request.source || 'phiAccessService',
      message: `PHI ${action} denied`,
      metadata: { action, reason: 'insufficient_permissions' },
    });
    return {
      allowed: false,
      reason: `Missing ${phiBackendPermissionForAction(action)} permission`,
      audited: false,
    };
  }

  const audited = requiresPhiAudit(action);
  if (audited) {
    recordPhiAccess({
      ...request,
      action,
    });
  }

  return { allowed: true, audited };
}

export function recordPhiAccess(request: PhiAccessRequest): void {
  const action = request.action || 'view';
  recordSecurityAuditEvent({
    action: `phi.${action}`,
    patientId: request.patientId,
    staffId: request.staffId || 'unknown',
    details: {
      ...(request.details || {}),
      source: request.source || 'phiAccessService',
      backendPermission: phiBackendPermissionForAction(action),
    },
  });

  observabilityService.recordEvent({
    category: 'audit',
    name: 'phi-access',
    severity: 'info',
    patientId: request.patientId,
    source: request.source || 'phiAccessService',
    message: `PHI ${action} recorded`,
    metadata: {
      action,
      staffId: request.staffId,
    },
  });
}

export function canViewPatientPhi(context: SecurityAccessContext): boolean {
  return (
    canAccessPhi(context, 'view') || checkPermission(context, BACKEND_PERMISSION_KEYS.READ_PHI)
  );
}

export function canMutatePatientPhi(
  context: SecurityAccessContext,
  action: Exclude<PhiAccessAction, 'view'> = 'update',
): boolean {
  return canAccessPhi(context, action);
}
