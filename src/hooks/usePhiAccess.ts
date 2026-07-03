/**
 * PHI access hook — composes security context with audit-gated patient data access.
 */

import { useCallback, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import useSecurityAccess from './useSecurityAccess';
import {
  assertPhiAccess,
  recordPhiAccess,
  type PhiAccessRequest,
  type PhiAccessResult,
} from '../services/phiAccessService';
import type { PhiAccessAction } from '../config/security';

export type PhiAccessAuditOptions = Readonly<{
  action?: PhiAccessAction;
  staffId?: string;
  source?: string;
  details?: Record<string, unknown>;
  skipIfDenied?: boolean;
}>;

export function usePhiAccess() {
  const { user } = useUser();
  const security = useSecurityAccess();

  const defaultStaffId =
    user?.id || security.compiledProfile?.user?.id || security.emergency.canonicalProfile?.id || 'unknown';

  const guardPhiAccess = useCallback(
    (patientId: string, options: PhiAccessAuditOptions = {}): PhiAccessResult => {
      return assertPhiAccess({
        patientId,
        action: options.action || 'view',
        staffId: options.staffId || defaultStaffId,
        source: options.source || 'usePhiAccess',
        details: options.details,
        context: security.context,
      });
    },
    [defaultStaffId, security.context],
  );

  const auditPhiAccess = useCallback(
    (request: Omit<PhiAccessRequest, 'context'>): PhiAccessResult => {
      return assertPhiAccess({
        ...request,
        staffId: request.staffId || defaultStaffId,
        context: security.context,
      });
    },
    [defaultStaffId, security.context],
  );

  const logPhiMutation = useCallback(
    (patientId: string, action: Exclude<PhiAccessAction, 'view'>, options: Omit<PhiAccessAuditOptions, 'action'> = {}) => {
      recordPhiAccess({
        patientId,
        action,
        staffId: options.staffId || defaultStaffId,
        source: options.source || 'usePhiAccess',
        details: options.details,
        context: security.context,
      });
    },
    [defaultStaffId, security.context],
  );

  return {
    context: security.context,
    canAccessPhi: security.canAccessPhi,
    guardPhiAccess,
    auditPhiAccess,
    logPhiMutation,
    recordPhiAccess: auditPhiAccess,
  };
}

export function usePhiViewAudit(
  patientId: string | null | undefined,
  options: PhiAccessAuditOptions & { enabled?: boolean } = {},
) {
  const phi = usePhiAccess();
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled || !patientId) return;
    phi.guardPhiAccess(patientId, {
      action: 'view',
      staffId: options.staffId,
      source: options.source,
      details: options.details,
    });
  }, [
    enabled,
    options.details,
    options.source,
    options.staffId,
    patientId,
    phi.guardPhiAccess,
  ]);
}

export default usePhiAccess;