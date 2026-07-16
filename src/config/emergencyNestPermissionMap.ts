/**
 * Architect Mode Stage D — FE emergency role → Nest permission mapping.
 *
 * Server enforcement remains Nest JWT + Permission enum.
 * Emergency roles are operational views over permission sets — not a second authority.
 *
 * Nest UserRole (4 values) is an auth container only; clinical UX keeps ~12 emergency roles.
 * Values mirror backend/src/modules/auth/enums/permission.enum.ts string values.
 */

import { EMERGENCY_ROLE_ID, type EmergencyRoleId } from './emergencyRoleScreenMatrix';
import { EMERGENCY_PERMISSION_KEYS } from './emergencyPermissionRegistry';

/** Mirrors backend UserRole enum value strings */
export const NEST_USER_ROLE = Object.freeze({
  physician: 'physician',
  nurse: 'nurse',
  student: 'student',
  admin: 'admin',
} as const);

export type NestUserRole = (typeof NEST_USER_ROLE)[keyof typeof NEST_USER_ROLE];

/** Mirrors backend Permission enum value strings used by CareDroid ED paths */
export const NEST_PERMISSION = Object.freeze({
  READ_PHI: 'READ_PHI',
  WRITE_PHI: 'WRITE_PHI',
  EXPORT_PHI: 'EXPORT_PHI',
  DELETE_PHI: 'DELETE_PHI',
  USE_CALCULATORS: 'USE_CALCULATORS',
  USE_DRUG_CHECKER: 'USE_DRUG_CHECKER',
  USE_LAB_INTERPRETER: 'USE_LAB_INTERPRETER',
  USE_PROTOCOLS: 'USE_PROTOCOLS',
  USE_AI_CHAT: 'USE_AI_CHAT',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  VIEW_USERS: 'VIEW_USERS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  EXPORT_AUDIT_LOGS: 'EXPORT_AUDIT_LOGS',
  CONFIGURE_SYSTEM: 'CONFIGURE_SYSTEM',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  VIEW_GOVERNANCE: 'VIEW_GOVERNANCE',
  VIEW_OPERATIONS: 'VIEW_OPERATIONS',
  TRIGGER_EMERGENCY_PROTOCOL: 'TRIGGER_EMERGENCY_PROTOCOL',
  VIEW_SENTINEL_COMMAND: 'VIEW_SENTINEL_COMMAND',
  ACK_SENTINEL_ALARMS: 'ACK_SENTINEL_ALARMS',
  MANAGE_SENTINEL_UNITS: 'MANAGE_SENTINEL_UNITS',
  REVIEW_SENTINEL_AI: 'REVIEW_SENTINEL_AI',
  VIEW_SENTINEL_ANALYTICS: 'VIEW_SENTINEL_ANALYTICS',
} as const);

export type NestPermission = (typeof NEST_PERMISSION)[keyof typeof NEST_PERMISSION];

export type EmergencyNestRoleMapping = {
  /** Nest UserRole used as auth container when issuing tokens for this emergency role */
  nestUserRole: NestUserRole;
  /** Nest permissions that must be present for this emergency role to function */
  nestPermissions: readonly NestPermission[];
  /** Human-readable intent */
  intent: string;
};

const PHI_RW: NestPermission[] = [NEST_PERMISSION.READ_PHI, NEST_PERMISSION.WRITE_PHI];
const TOOLS_CORE: NestPermission[] = [
  NEST_PERMISSION.USE_CALCULATORS,
  NEST_PERMISSION.USE_DRUG_CHECKER,
  NEST_PERMISSION.USE_LAB_INTERPRETER,
  NEST_PERMISSION.USE_PROTOCOLS,
];
const AI: NestPermission[] = [NEST_PERMISSION.USE_AI_CHAT];
const SENTINEL_VIEW: NestPermission[] = [
  NEST_PERMISSION.VIEW_SENTINEL_COMMAND,
  NEST_PERMISSION.ACK_SENTINEL_ALARMS,
  NEST_PERMISSION.VIEW_SENTINEL_ANALYTICS,
];

/**
 * Canonical map: every emergency role → Nest container role + permission set.
 * JWT issuance (Stage D backend work) should expand claims from this map, not from UserRole alone.
 */
export const EMERGENCY_TO_NEST_ROLE_MAP: Record<EmergencyRoleId, EmergencyNestRoleMapping> = Object.freeze({
  [EMERGENCY_ROLE_ID.admin]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.admin,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      NEST_PERMISSION.EXPORT_PHI,
      NEST_PERMISSION.DELETE_PHI,
      ...TOOLS_CORE,
      ...AI,
      NEST_PERMISSION.MANAGE_USERS,
      NEST_PERMISSION.MANAGE_ROLES,
      NEST_PERMISSION.VIEW_USERS,
      NEST_PERMISSION.VIEW_AUDIT_LOGS,
      NEST_PERMISSION.EXPORT_AUDIT_LOGS,
      NEST_PERMISSION.CONFIGURE_SYSTEM,
      NEST_PERMISSION.VIEW_ANALYTICS,
      NEST_PERMISSION.VIEW_GOVERNANCE,
      NEST_PERMISSION.VIEW_OPERATIONS,
      NEST_PERMISSION.TRIGGER_EMERGENCY_PROTOCOL,
      ...SENTINEL_VIEW,
      NEST_PERMISSION.MANAGE_SENTINEL_UNITS,
      NEST_PERMISSION.REVIEW_SENTINEL_AI,
    ] as NestPermission[]),
    intent: 'Full site admin',
  }),
  [EMERGENCY_ROLE_ID.itAdmin]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.admin,
    nestPermissions: Object.freeze([
      // No PHI — technical administration only
      NEST_PERMISSION.CONFIGURE_SYSTEM,
      NEST_PERMISSION.MANAGE_USERS,
      NEST_PERMISSION.VIEW_USERS,
      NEST_PERMISSION.VIEW_AUDIT_LOGS,
      NEST_PERMISSION.VIEW_GOVERNANCE,
      NEST_PERMISSION.VIEW_ANALYTICS,
    ] as NestPermission[]),
    intent: 'IT admin — system config and audit; no clinical PHI grants',
  }),
  [EMERGENCY_ROLE_ID.edManager]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.admin,
    nestPermissions: Object.freeze([
      NEST_PERMISSION.READ_PHI,
      ...AI,
      NEST_PERMISSION.VIEW_ANALYTICS,
      NEST_PERMISSION.VIEW_OPERATIONS,
      NEST_PERMISSION.VIEW_GOVERNANCE,
      NEST_PERMISSION.VIEW_AUDIT_LOGS,
      ...SENTINEL_VIEW,
    ] as NestPermission[]),
    intent: 'ED operations manager — analytics and capacity, limited write',
  }),
  [EMERGENCY_ROLE_ID.chargeNurse]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.nurse,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      ...TOOLS_CORE,
      ...AI,
      NEST_PERMISSION.TRIGGER_EMERGENCY_PROTOCOL,
      NEST_PERMISSION.VIEW_OPERATIONS,
      NEST_PERMISSION.VIEW_ANALYTICS,
      ...SENTINEL_VIEW,
    ] as NestPermission[]),
    intent: 'Charge nurse — queue, assign, EMS handoff, capacity',
  }),
  [EMERGENCY_ROLE_ID.triageNurse]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.nurse,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      ...TOOLS_CORE,
      ...AI,
      NEST_PERMISSION.TRIGGER_EMERGENCY_PROTOCOL,
      ...SENTINEL_VIEW,
    ] as NestPermission[]),
    intent: 'Triage nurse — acuity and reassessment',
  }),
  [EMERGENCY_ROLE_ID.physician]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.physician,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      NEST_PERMISSION.EXPORT_PHI,
      NEST_PERMISSION.DELETE_PHI,
      ...TOOLS_CORE,
      ...AI,
      NEST_PERMISSION.TRIGGER_EMERGENCY_PROTOCOL,
      NEST_PERMISSION.VIEW_AUDIT_LOGS,
      NEST_PERMISSION.VIEW_ANALYTICS,
      ...SENTINEL_VIEW,
      NEST_PERMISSION.REVIEW_SENTINEL_AI,
    ] as NestPermission[]),
    intent: 'Attending / ED physician clinical full access',
  }),
  /** Reception golden path */
  [EMERGENCY_ROLE_ID.registrationClerk]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.nurse,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      NEST_PERMISSION.USE_AI_CHAT,
      // Calculators optional for identity assist; protocols not primary
      NEST_PERMISSION.USE_CALCULATORS,
    ] as NestPermission[]),
    intent: 'Reception / registration — intake, verify, EMS convert; no system config',
  }),
  [EMERGENCY_ROLE_ID.emsUser]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.nurse,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      ...AI,
      NEST_PERMISSION.VIEW_SENTINEL_COMMAND,
      NEST_PERMISSION.ACK_SENTINEL_ALARMS,
      NEST_PERMISSION.MANAGE_SENTINEL_UNITS,
    ] as NestPermission[]),
    intent: 'Field EMS user — arrival and handoff',
  }),
  [EMERGENCY_ROLE_ID.dispatcher]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.nurse,
    nestPermissions: Object.freeze([
      NEST_PERMISSION.READ_PHI,
      NEST_PERMISSION.WRITE_PHI,
      NEST_PERMISSION.VIEW_SENTINEL_COMMAND,
      NEST_PERMISSION.VIEW_OPERATIONS,
    ] as NestPermission[]),
    intent: 'Dispatch console',
  }),
  [EMERGENCY_ROLE_ID.emsCoordinator]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.nurse,
    nestPermissions: Object.freeze([
      ...PHI_RW,
      ...AI,
      NEST_PERMISSION.VIEW_ANALYTICS,
      NEST_PERMISSION.VIEW_OPERATIONS,
      ...SENTINEL_VIEW,
      NEST_PERMISSION.MANAGE_SENTINEL_UNITS,
    ] as NestPermission[]),
    intent: 'EMS coordinator — bay, handoff, analytics',
  }),
  [EMERGENCY_ROLE_ID.readOnlyViewer]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.student,
    nestPermissions: Object.freeze([
      NEST_PERMISSION.VIEW_ANALYTICS,
      // No PHI write; read may be limited to non-PHI aggregates in enforcement layer
    ] as NestPermission[]),
    intent: 'Read-only operational display — no PHI mutation',
  }),
  [EMERGENCY_ROLE_ID.publicDisplay]: Object.freeze({
    nestUserRole: NEST_USER_ROLE.student,
    nestPermissions: Object.freeze([] as NestPermission[]),
    intent: 'Public waitboard — no Nest PHI permissions',
  }),
});

/** Emergency action key → Nest permissions required for server-side enforcement */
export const EMERGENCY_ACTION_TO_NEST_PERMISSIONS: Record<string, readonly NestPermission[]> = Object.freeze({
  [EMERGENCY_PERMISSION_KEYS.patientCreate]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.patientDemographicsEdit]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.encounterCreate]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.intakeVerify]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.triageAssignAcuity]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.queueMove]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.vitalsWrite]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.notesWrite]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.flagsManage]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.reassessmentComplete]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.emsConvertArrival]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.emsHandoffComplete]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.emsPrepareBay]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  // Front-desk escalate to triage/charge — PHI write + audit; not full emergency protocol override
  [EMERGENCY_PERMISSION_KEYS.receptionEscalate]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.patientDischarge]: Object.freeze([NEST_PERMISSION.WRITE_PHI]),
  [EMERGENCY_PERMISSION_KEYS.copilotUse]: Object.freeze([NEST_PERMISSION.USE_AI_CHAT]),
  [EMERGENCY_PERMISSION_KEYS.analyticsView]: Object.freeze([NEST_PERMISSION.VIEW_ANALYTICS]),
  [EMERGENCY_PERMISSION_KEYS.settingsManage]: Object.freeze([NEST_PERMISSION.CONFIGURE_SYSTEM]),
  [EMERGENCY_PERMISSION_KEYS.capacityManage]: Object.freeze([NEST_PERMISSION.VIEW_OPERATIONS]),
  [EMERGENCY_PERMISSION_KEYS.boardingManage]: Object.freeze([NEST_PERMISSION.VIEW_OPERATIONS]),
});

export function resolveNestMappingForEmergencyRole(role: EmergencyRoleId): EmergencyNestRoleMapping {
  const mapping = EMERGENCY_TO_NEST_ROLE_MAP[role];
  if (!mapping) {
    throw new Error(`No Nest mapping for emergency role: ${role}`);
  }
  return mapping;
}

export function nestPermissionsForEmergencyAction(actionKey: string): readonly NestPermission[] {
  return EMERGENCY_ACTION_TO_NEST_PERMISSIONS[actionKey] ?? [];
}

/**
 * True when the emergency role's Nest permission set includes all permissions required by the action.
 * Used by FE preflight and contract tests; server must still enforce independently.
 */
export function emergencyRoleSatisfiesNestAction(
  role: EmergencyRoleId,
  actionKey: string,
): boolean {
  const required = nestPermissionsForEmergencyAction(actionKey);
  if (required.length === 0) return true;
  const held = new Set(resolveNestMappingForEmergencyRole(role).nestPermissions);
  return required.every((p) => held.has(p));
}
