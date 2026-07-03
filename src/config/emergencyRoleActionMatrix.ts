/**
 * Role-action matrix � canonical allowed / disabled / hidden / readonly states per role.
 * Composes with emergencyPermissionRegistry grants and display context overrides.
 */
import {
  EMERGENCY_PERMISSION_KEYS,
  ROLE_PERMISSION_GRANTS,
  canPerformEmergencyMutation,
  normalizeEmergencyRoleId,
  type EmergencyPermissionContext,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID, type EmergencyRoleId } from './emergencyRoleScreenMatrix';

export const EMERGENCY_ROLE_ACTIONS = Object.freeze({
  patientCreate: 'patient-create',
  demographicsEdit: 'demographics-edit',
  encounterCreate: 'encounter-create',
  assignAcuity: 'assign-acuity',
  moveQueue: 'move-queue',
  completeReassessment: 'complete-reassessment',
  completeEmsHandoff: 'complete-ems-handoff',
  createReferral: 'create-referral',
  disposition: 'disposition',
  settingsEdit: 'settings-edit',
  publicDisplayPublish: 'public-display-publish',
} as const);

export type EmergencyRoleActionId =
  (typeof EMERGENCY_ROLE_ACTIONS)[keyof typeof EMERGENCY_ROLE_ACTIONS];

export type EmergencyRoleActionState = 'allowed' | 'disabled' | 'hidden' | 'readonly';

export type EmergencyRoleActionPresentation = Readonly<{
  state: EmergencyRoleActionState;
  visible: boolean;
  enabled: boolean;
  readOnly: boolean;
  permission: string | null;
}>;

const K = EMERGENCY_PERMISSION_KEYS;

/** Matrix action ? canonical permission key */
export const EMERGENCY_ROLE_ACTION_PERMISSION: Record<EmergencyRoleActionId, string> =
  Object.freeze({
    [EMERGENCY_ROLE_ACTIONS.patientCreate]: K.patientCreate,
    [EMERGENCY_ROLE_ACTIONS.demographicsEdit]: K.patientDemographicsEdit,
    [EMERGENCY_ROLE_ACTIONS.encounterCreate]: K.encounterCreate,
    [EMERGENCY_ROLE_ACTIONS.assignAcuity]: K.triageAssignAcuity,
    [EMERGENCY_ROLE_ACTIONS.moveQueue]: K.queueMove,
    [EMERGENCY_ROLE_ACTIONS.completeReassessment]: K.reassessmentComplete,
    [EMERGENCY_ROLE_ACTIONS.completeEmsHandoff]: K.emsHandoffComplete,
    [EMERGENCY_ROLE_ACTIONS.createReferral]: K.referralCreate,
    [EMERGENCY_ROLE_ACTIONS.disposition]: K.patientDischarge,
    [EMERGENCY_ROLE_ACTIONS.settingsEdit]: K.settingsManage,
    [EMERGENCY_ROLE_ACTIONS.publicDisplayPublish]: K.displayPublicPublish,
  });

/** Permission key or EMERGENCY_ACTIONS alias ? matrix action */
export const PERMISSION_TO_ROLE_ACTION: Record<string, EmergencyRoleActionId> = Object.freeze({
  [K.patientCreate]: EMERGENCY_ROLE_ACTIONS.patientCreate,
  [K.patientDemographicsEdit]: EMERGENCY_ROLE_ACTIONS.demographicsEdit,
  [K.encounterCreate]: EMERGENCY_ROLE_ACTIONS.encounterCreate,
  [K.triageAssignAcuity]: EMERGENCY_ROLE_ACTIONS.assignAcuity,
  [K.queueMove]: EMERGENCY_ROLE_ACTIONS.moveQueue,
  [K.reassessmentComplete]: EMERGENCY_ROLE_ACTIONS.completeReassessment,
  [K.emsHandoffComplete]: EMERGENCY_ROLE_ACTIONS.completeEmsHandoff,
  [K.referralCreate]: EMERGENCY_ROLE_ACTIONS.createReferral,
  [K.patientDischarge]: EMERGENCY_ROLE_ACTIONS.disposition,
  [K.settingsManage]: EMERGENCY_ROLE_ACTIONS.settingsEdit,
  [K.displayPublicPublish]: EMERGENCY_ROLE_ACTIONS.publicDisplayPublish,
  [K.displayPublicWaitboard]: EMERGENCY_ROLE_ACTIONS.publicDisplayPublish,
});

const H = EMERGENCY_ROLE_ACTIONS;
const A = 'allowed' as const;
const D = 'disabled' as const;
const X = 'hidden' as const;
const R = 'readonly' as const;

/**
 * Base role-action matrix � Receptionist, Triage Nurse, Charge Nurse, Physician,
 * EMS Handoff Nurse, Manager, Admin, Public Display.
 */
export const EMERGENCY_ROLE_ACTION_MATRIX: Record<
  EmergencyRoleId,
  Record<EmergencyRoleActionId, EmergencyRoleActionState>
> = Object.freeze({
  [EMERGENCY_ROLE_ID.registrationClerk]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: A,
    [H.encounterCreate]: A,
    [H.assignAcuity]: X,
    [H.moveQueue]: X,
    [H.completeReassessment]: X,
    [H.completeEmsHandoff]: X,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: X,
  }),
  [EMERGENCY_ROLE_ID.triageNurse]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: A,
    [H.encounterCreate]: A,
    [H.assignAcuity]: A,
    [H.moveQueue]: A,
    [H.completeReassessment]: A,
    [H.completeEmsHandoff]: A,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: X,
  }),
  [EMERGENCY_ROLE_ID.chargeNurse]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: A,
    [H.encounterCreate]: A,
    [H.assignAcuity]: A,
    [H.moveQueue]: A,
    [H.completeReassessment]: A,
    [H.completeEmsHandoff]: A,
    [H.createReferral]: A,
    [H.disposition]: D,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: D,
  }),
  [EMERGENCY_ROLE_ID.physician]: Object.freeze({
    [H.patientCreate]: X,
    [H.demographicsEdit]: A,
    [H.encounterCreate]: X,
    [H.assignAcuity]: X,
    [H.moveQueue]: A,
    [H.completeReassessment]: A,
    [H.completeEmsHandoff]: X,
    [H.createReferral]: A,
    [H.disposition]: A,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: X,
  }),
  [EMERGENCY_ROLE_ID.emsUser]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: X,
    [H.encounterCreate]: X,
    [H.assignAcuity]: X,
    [H.moveQueue]: X,
    [H.completeReassessment]: X,
    [H.completeEmsHandoff]: A,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: X,
  }),
  [EMERGENCY_ROLE_ID.dispatcher]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: X,
    [H.encounterCreate]: X,
    [H.assignAcuity]: X,
    [H.moveQueue]: X,
    [H.completeReassessment]: X,
    [H.completeEmsHandoff]: X,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: X,
  }),
  [EMERGENCY_ROLE_ID.emsCoordinator]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: X,
    [H.encounterCreate]: X,
    [H.assignAcuity]: X,
    [H.moveQueue]: X,
    [H.completeReassessment]: X,
    [H.completeEmsHandoff]: A,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: X,
  }),
  [EMERGENCY_ROLE_ID.edManager]: Object.freeze({
    [H.patientCreate]: D,
    [H.demographicsEdit]: D,
    [H.encounterCreate]: D,
    [H.assignAcuity]: D,
    [H.moveQueue]: A,
    [H.completeReassessment]: D,
    [H.completeEmsHandoff]: D,
    [H.createReferral]: A,
    [H.disposition]: D,
    [H.settingsEdit]: R,
    [H.publicDisplayPublish]: A,
  }),
  [EMERGENCY_ROLE_ID.admin]: Object.freeze({
    [H.patientCreate]: A,
    [H.demographicsEdit]: A,
    [H.encounterCreate]: A,
    [H.assignAcuity]: A,
    [H.moveQueue]: A,
    [H.completeReassessment]: A,
    [H.completeEmsHandoff]: A,
    [H.createReferral]: A,
    [H.disposition]: A,
    [H.settingsEdit]: A,
    [H.publicDisplayPublish]: A,
  }),
  [EMERGENCY_ROLE_ID.readOnlyViewer]: Object.freeze({
    [H.patientCreate]: X,
    [H.demographicsEdit]: X,
    [H.encounterCreate]: X,
    [H.assignAcuity]: X,
    [H.moveQueue]: X,
    [H.completeReassessment]: X,
    [H.completeEmsHandoff]: X,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: R,
  }),
  [EMERGENCY_ROLE_ID.publicDisplay]: Object.freeze({
    [H.patientCreate]: X,
    [H.demographicsEdit]: X,
    [H.encounterCreate]: X,
    [H.assignAcuity]: X,
    [H.moveQueue]: X,
    [H.completeReassessment]: X,
    [H.completeEmsHandoff]: X,
    [H.createReferral]: X,
    [H.disposition]: X,
    [H.settingsEdit]: X,
    [H.publicDisplayPublish]: R,
  }),
});

export function resolveRoleActionId(
  actionOrPermission: string | EmergencyRoleActionId,
): EmergencyRoleActionId | null {
  const normalized = String(actionOrPermission || '').trim();
  if (!normalized) return null;
  if (Object.values(EMERGENCY_ROLE_ACTIONS).includes(normalized as EmergencyRoleActionId)) {
    return normalized as EmergencyRoleActionId;
  }
  return PERMISSION_TO_ROLE_ACTION[normalized] || null;
}

export function getRoleActionMatrixState(
  role: string,
  actionId: EmergencyRoleActionId,
): EmergencyRoleActionState {
  const roleId = normalizeEmergencyRoleId(role);
  return EMERGENCY_ROLE_ACTION_MATRIX[roleId]?.[actionId] ?? X;
}

export function resolveEmergencyRoleActionState(
  role: string,
  actionOrPermission: string | EmergencyRoleActionId,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): EmergencyRoleActionState {
  const actionId = resolveRoleActionId(actionOrPermission);
  if (!actionId) return X;

  const base = getRoleActionMatrixState(role, actionId);
  if (base === X) return X;

  const permission = EMERGENCY_ROLE_ACTION_PERMISSION[actionId];
  const roleId = normalizeEmergencyRoleId(role);
  const roleHasGrant = (ROLE_PERMISSION_GRANTS[roleId] || []).includes(permission);

  if (base === D) return D;

  if (base === R) {
    return roleHasGrant ? R : X;
  }

  if (!roleHasGrant) return X;

  if (base === A && !canPerformEmergencyMutation(role, permission, permissionsOverrides, context)) {
    return R;
  }

  return A;
}

export function presentEmergencyRoleAction(
  role: string,
  actionOrPermission: string | EmergencyRoleActionId,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): EmergencyRoleActionPresentation {
  const actionId = resolveRoleActionId(actionOrPermission);
  const state = actionId
    ? resolveEmergencyRoleActionState(role, actionId, permissionsOverrides, context)
    : X;
  const permission = actionId ? EMERGENCY_ROLE_ACTION_PERMISSION[actionId] : null;

  return Object.freeze({
    state,
    visible: state !== X,
    enabled: state === A,
    readOnly: state === R || state === D,
    permission,
  });
}

export function isEmergencyActionVisible(state: EmergencyRoleActionState): boolean {
  return state !== X;
}

export function isEmergencyActionEnabled(state: EmergencyRoleActionState): boolean {
  return state === A;
}

export function isEmergencyActionReadOnly(state: EmergencyRoleActionState): boolean {
  return state === R || state === D;
}

export const EMERGENCY_ROLE_ACTION_LABELS: Record<EmergencyRoleActionId, string> = Object.freeze({
  [H.patientCreate]: 'Create patient',
  [H.demographicsEdit]: 'Edit demographics',
  [H.encounterCreate]: 'Create encounter',
  [H.assignAcuity]: 'Assign acuity',
  [H.moveQueue]: 'Move queue',
  [H.completeReassessment]: 'Complete reassessment',
  [H.completeEmsHandoff]: 'Complete EMS handoff',
  [H.createReferral]: 'Create referral',
  [H.disposition]: 'Disposition',
  [H.settingsEdit]: 'Edit settings',
  [H.publicDisplayPublish]: 'Publish public display',
});

export function gateRoleAction(
  presentAction:
    | ((actionOrPermission: string | EmergencyRoleActionId) => EmergencyRoleActionPresentation)
    | undefined,
  matrixActionId: EmergencyRoleActionId,
  permission: string,
  can: (permission: string) => boolean,
): EmergencyRoleActionPresentation {
  if (presentAction) {
    const presentation = presentAction(matrixActionId);
    if (!presentation.visible) return presentation;
    if (!presentation.enabled) return presentation;
    return can(permission)
      ? presentation
      : Object.freeze({ ...presentation, enabled: false, readOnly: true });
  }
  const allowed = can(permission);
  return Object.freeze({
    state: allowed ? A : X,
    visible: allowed,
    enabled: allowed,
    readOnly: false,
    permission,
  });
}
