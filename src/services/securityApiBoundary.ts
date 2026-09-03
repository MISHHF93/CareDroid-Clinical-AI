/**
 * Client-side API boundary validation — input sanitization and authorization preflight.
 */

import { normalizeApiPath } from '../config/api.config';
import { PHI_ACCESS_ACTIONS, type PhiAccessAction } from '../config/securityModel';
import {
  canAccessPhi,
  checkPermission,
  isProtectedApiPath,
  isPublicApiPath,
  type SecurityAccessContext,
} from './securityAccessService';

const PATIENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export type ApiBoundaryValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export function validatePatientIdentifier(patientId: unknown): ApiBoundaryValidation {
  if (typeof patientId !== 'string') {
    return { valid: false, errors: ['patientId must be a string'] };
  }
  const trimmed = patientId.trim();
  if (!trimmed) {
    return { valid: false, errors: ['patientId must not be empty'] };
  }
  if (!PATIENT_ID_PATTERN.test(trimmed)) {
    return { valid: false, errors: ['patientId contains invalid characters'] };
  }
  return { valid: true, errors: [] };
}

export function validatePhiAccessAction(action: unknown): action is PhiAccessAction {
  return typeof action === 'string' && (PHI_ACCESS_ACTIONS as readonly string[]).includes(action);
}

export function validatePhiMutationRequest(input: {
  patientId: unknown;
  action?: unknown;
  context: SecurityAccessContext;
}): ApiBoundaryValidation & { patientId?: string; action?: PhiAccessAction } {
  const idValidation = validatePatientIdentifier(input.patientId);
  if (!idValidation.valid) return idValidation;

  const action = (input.action || 'view') as PhiAccessAction;
  if (!validatePhiAccessAction(action)) {
    return { valid: false, errors: [`unsupported PHI action: ${String(input.action)}`] };
  }

  if (!canAccessPhi(input.context, action)) {
    return { valid: false, errors: [`missing permission for PHI ${action}`] };
  }

  return {
    valid: true,
    errors: [],
    patientId: String(input.patientId).trim(),
    action,
  };
}

export function validatePermissionForApiPath(
  context: SecurityAccessContext,
  path: string,
  requiredPermission?: string,
): ApiBoundaryValidation {
  const apiPath = normalizeApiPath(path);

  if (isPublicApiPath(apiPath)) {
    return { valid: true, errors: [] };
  }

  if (isProtectedApiPath(apiPath) && !context.compiledProfile?.user && !context.emergencyRole) {
    return { valid: false, errors: ['protected API requires authenticated security context'] };
  }

  if (requiredPermission && !checkPermission(context, requiredPermission)) {
    return { valid: false, errors: [`missing permission: ${requiredPermission}`] };
  }

  return { valid: true, errors: [] };
}

export function sanitizePatientIdForRequest(patientId: unknown): string | null {
  const validation = validatePatientIdentifier(patientId);
  return validation.valid ? String(patientId).trim() : null;
}
