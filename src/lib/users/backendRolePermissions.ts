/**
 * Backend role → permission mapping (mirrors backend role-permissions.config.ts).
 * Used only as a last-resort fallback inside securityAccessService.
 */

import { Permission } from '../../config/backendPermissionCatalog';

const P = Permission;

export const BACKEND_ROLE_PERMISSIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  student: Object.freeze([
    P.USE_CALCULATORS,
    P.USE_DRUG_CHECKER,
    P.USE_LAB_INTERPRETER,
    P.USE_PROTOCOLS,
    P.USE_AI_CHAT,
  ]),
  nurse: Object.freeze([
    P.READ_PHI,
    P.WRITE_PHI,
    P.USE_CALCULATORS,
    P.USE_DRUG_CHECKER,
    P.USE_LAB_INTERPRETER,
    P.USE_PROTOCOLS,
    P.USE_AI_CHAT,
    P.TRIGGER_EMERGENCY_PROTOCOL,
  ]),
  charge_nurse: Object.freeze([
    P.READ_PHI,
    P.WRITE_PHI,
    P.USE_CALCULATORS,
    P.USE_DRUG_CHECKER,
    P.USE_LAB_INTERPRETER,
    P.USE_PROTOCOLS,
    P.USE_AI_CHAT,
    P.TRIGGER_EMERGENCY_PROTOCOL,
    P.VIEW_ANALYTICS,
    P.VIEW_OPERATIONS,
  ]),
  triage_nurse: Object.freeze([
    P.READ_PHI,
    P.WRITE_PHI,
    P.USE_CALCULATORS,
    P.USE_DRUG_CHECKER,
    P.USE_LAB_INTERPRETER,
    P.USE_PROTOCOLS,
    P.USE_AI_CHAT,
    P.TRIGGER_EMERGENCY_PROTOCOL,
  ]),
  physician: Object.freeze([
    P.READ_PHI,
    P.WRITE_PHI,
    P.EXPORT_PHI,
    P.DELETE_PHI,
    P.USE_CALCULATORS,
    P.USE_DRUG_CHECKER,
    P.USE_LAB_INTERPRETER,
    P.USE_PROTOCOLS,
    P.USE_AI_CHAT,
    P.TRIGGER_EMERGENCY_PROTOCOL,
    P.OVERRIDE_SAFETY_CHECKS,
    P.VIEW_AUDIT_LOGS,
    P.VIEW_REVIEW_QUEUE,
    P.REVIEW_CLINICAL_AI,
    P.REVIEW_DOCUMENTATION,
    P.VIEW_GOVERNANCE,
    P.VIEW_REGULATORY,
    P.VIEW_VALIDATION,
  ]),
  ed_manager: Object.freeze([
    P.READ_PHI,
    P.EXPORT_PHI,
    P.USE_CALCULATORS,
    P.USE_PROTOCOLS,
    P.USE_AI_CHAT,
    P.VIEW_ANALYTICS,
    P.VIEW_OPERATIONS,
    P.VIEW_OBSERVABILITY,
    P.MANAGE_INCIDENTS,
  ]),
  registration_clerk: Object.freeze([P.READ_PHI, P.WRITE_PHI, P.IMPORT_PATIENT_DATA]),
  ems_user: Object.freeze([P.READ_PHI, P.WRITE_PHI, P.TRIGGER_EMERGENCY_PROTOCOL]),
  read_only_viewer: Object.freeze([P.READ_PHI, P.VIEW_ANALYTICS, P.VIEW_OPERATIONS]),
  // Mirror backend: admin is near-full grant, but clinical break-glass is reserved/not implemented.
  admin: Object.freeze(Object.values(P).filter((permission) => permission !== P.BREAK_GLASS_ACCESS)),
});

export function resolveBackendRoleKey(role: string | null | undefined): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function hasBackendRolePermission(
  role: string | null | undefined,
  permission: string,
): boolean {
  const roleKey = resolveBackendRoleKey(role);
  const grants = BACKEND_ROLE_PERMISSIONS[roleKey];
  if (!grants) return false;
  return grants.includes(permission);
}