/**
 * Permission presentation — derives visible / hidden / disabled / readonly for any
 * CareDroid action, composing matrix overrides with registry grants.
 */
import {
  EMERGENCY_PERMISSION_KEYS,
  EMERGENCY_PERMISSION_REGISTRY,
  ROLE_PERMISSION_GRANTS,
  canPerformEmergencyMutation,
  getEmergencyPermissionDefinition,
  hasEmergencyPermission,
  isPublicDisplayContext,
  isReadOnlyOperationalContext,
  normalizeEmergencyRoleId,
  resolveEmergencyPermissionKey,
  type EmergencyPermissionContext,
} from './emergencyPermissionRegistry';
import {
  EMERGENCY_ROLE_ACTION_MATRIX,
  EMERGENCY_ROLE_ACTION_PERMISSION,
  resolveRoleActionId,
  type EmergencyRoleActionId,
  type EmergencyRoleActionPresentation,
  type EmergencyRoleActionState,
} from './emergencyRoleActionMatrix';
import { EMERGENCY_ROLE_ID, type EmergencyRoleId } from './emergencyRoleScreenMatrix';

const K = EMERGENCY_PERMISSION_KEYS;

const CLINICAL_CREATE_PERMISSIONS = new Set<string>([
  K.patientCreate,
  K.encounterCreate,
  K.triageAssignAcuity,
]);

const CLINICAL_MUTATION_PERMISSIONS = new Set<string>([
  K.patientCreate,
  K.patientDemographicsEdit,
  K.encounterCreate,
  K.triageAssignAcuity,
  K.queueMove,
  K.reassessmentComplete,
  K.vitalsWrite,
  K.notesWrite,
  K.flagsManage,
  K.emsHandoffComplete,
  K.emsPrepareBay,
  K.emsConvertArrival,
  K.referralCreate,
  K.transferManage,
  K.patientDischarge,
  K.patientEscalate,
  K.receptionEscalate,
  K.capacityManage,
  K.boardingManage,
  K.workloadReassign,
  K.patientAssignStaff,
  K.patientAssignRoom,
]);

const DESTRUCTIVE_PERMISSIONS = new Set<string>([
  K.patientDischarge,
  K.transferManage,
  K.patientEscalate,
  K.simulationRun,
]);

const DISPLAY_ONLY_PERMISSIONS = new Set<string>([
  K.displayPublicWaitboard,
  K.displayWhiteboardReadonly,
  K.displayPublicPublish,
]);

export type EmergencyUiActionSurface = {
  id: string;
  label: string;
  permission: string;
  surface: string;
  destructive?: boolean;
  clinical?: boolean;
};

/** Audited UI actions mapped to canonical permissions. */
export const EMERGENCY_UI_ACTION_AUDIT: readonly EmergencyUiActionSurface[] = Object.freeze([
  { id: 'header-create-patient', label: 'Create patient', permission: K.patientCreate, surface: 'Header', clinical: true },
  { id: 'header-create-referral', label: 'Create referral', permission: K.referralCreate, surface: 'Header', clinical: true },
  { id: 'header-disposition', label: 'Disposition', permission: K.patientDischarge, surface: 'Header', destructive: true, clinical: true },
  { id: 'command-create-patient', label: 'Create patient', permission: K.patientCreate, surface: 'Command palette', clinical: true },
  { id: 'command-start-intake', label: 'Start intake', permission: K.patientCreate, surface: 'Command palette', clinical: true },
  { id: 'command-complete-reassessment', label: 'Complete reassessment', permission: K.reassessmentComplete, surface: 'Command palette', clinical: true },
  { id: 'command-manage-referral', label: 'Manage referral', permission: K.referralCreate, surface: 'Command palette', clinical: true },
  { id: 'command-discharge', label: 'Discharge patient', permission: K.patientDischarge, surface: 'Command palette', destructive: true, clinical: true },
  { id: 'patient-card-move-queue', label: 'Move queue', permission: K.queueMove, surface: 'Patient card', clinical: true },
  { id: 'patient-card-referral', label: 'Referral', permission: K.referralCreate, surface: 'Patient card', clinical: true },
  { id: 'patient-card-disposition', label: 'Disposition', permission: K.patientDischarge, surface: 'Patient card', destructive: true, clinical: true },
  { id: 'patient-detail-transition', label: 'Advance state', permission: K.queueMove, surface: 'Patient detail', clinical: true },
  { id: 'patient-detail-vitals', label: 'Add vitals', permission: K.vitalsWrite, surface: 'Patient detail', clinical: true },
  { id: 'patient-detail-note', label: 'Add note', permission: K.notesWrite, surface: 'Patient detail', clinical: true },
  { id: 'patient-detail-flags', label: 'Manage flags', permission: K.flagsManage, surface: 'Patient detail', clinical: true },
  { id: 'patient-detail-assign-staff', label: 'Assign staff', permission: K.patientAssignStaff, surface: 'Patient detail', clinical: true },
  { id: 'patient-detail-assign-room', label: 'Assign room', permission: K.patientAssignRoom, surface: 'Patient detail', clinical: true },
  { id: 'patient-detail-escalate', label: 'Escalate', permission: K.patientEscalate, surface: 'Patient detail', destructive: true, clinical: true },
  { id: 'patient-detail-discharge', label: 'Discharge', permission: K.patientDischarge, surface: 'Patient detail', destructive: true, clinical: true },
  { id: 'ems-prepare-bay', label: 'Prepare EMS bay', permission: K.emsPrepareBay, surface: 'EMS pipeline', clinical: true },
  { id: 'ems-convert-arrival', label: 'Convert EMS arrival', permission: K.emsConvertArrival, surface: 'EMS pipeline', clinical: true },
  { id: 'ems-complete-handoff', label: 'Complete EMS handoff', permission: K.emsHandoffComplete, surface: 'EMS pipeline', clinical: true },
  { id: 'reception-quick-intake', label: 'Quick intake', permission: K.patientCreate, surface: 'Reception', clinical: true },
  { id: 'reception-verify-intake', label: 'Verify intake', permission: K.intakeVerify, surface: 'Reception', clinical: true },
  { id: 'reception-escalate', label: 'Reception escalate', permission: K.receptionEscalate, surface: 'Reception', clinical: true },
  { id: 'referral-manage', label: 'Manage referral', permission: K.referralCreate, surface: 'Referral panel', clinical: true },
  { id: 'referral-transfer', label: 'Manage transfer', permission: K.transferManage, surface: 'Referral panel', destructive: true, clinical: true },
  { id: 'whiteboard-mutate', label: 'Whiteboard mutations', permission: K.queueMove, surface: 'Emergency whiteboard', clinical: true },
  { id: 'settings-manage', label: 'Manage settings', permission: K.settingsManage, surface: 'Emergency settings' },
  { id: 'public-display-publish', label: 'Publish public display', permission: K.displayPublicPublish, surface: 'Display settings' },
  { id: 'copilot-use', label: 'Use copilot', permission: K.copilotUse, surface: 'Copilot' },
  { id: 'analytics-view', label: 'View analytics', permission: K.analyticsView, surface: 'Analytics' },
]);

function stateToPresentation(
  state: EmergencyRoleActionState,
  permission: string | null,
): EmergencyRoleActionPresentation {
  return Object.freeze({
    state,
    visible: state !== 'hidden',
    enabled: state === 'allowed',
    readOnly: state === 'readonly' || state === 'disabled',
    permission,
  });
}

function matrixStateForRole(
  roleId: EmergencyRoleId,
  actionId: EmergencyRoleActionId,
): EmergencyRoleActionState | null {
  const state = EMERGENCY_ROLE_ACTION_MATRIX[roleId]?.[actionId];
  return state ?? null;
}

export function derivePermissionPresentationState(
  role: string,
  permission: string,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): EmergencyRoleActionState {
  const roleId = normalizeEmergencyRoleId(role);
  const key = resolveEmergencyPermissionKey(permission);
  if (!key) return 'hidden';

  const definition = getEmergencyPermissionDefinition(key);
  const granted = hasEmergencyPermission(role, key, permissionsOverrides, context);

  if (roleId === EMERGENCY_ROLE_ID.publicDisplay) {
    if (DISPLAY_ONLY_PERMISSIONS.has(key)) {
      return definition?.category === 'display' ? 'readonly' : 'hidden';
    }
    return 'hidden';
  }

  if (roleId === EMERGENCY_ROLE_ID.readOnlyViewer) {
    if (DISPLAY_ONLY_PERMISSIONS.has(key)) {
      return 'readonly';
    }
    if (definition?.category === 'display' && granted) {
      return 'readonly';
    }
    return 'hidden';
  }

  if (!granted) return 'hidden';

  if (definition?.blockedInPublicDisplay && isPublicDisplayContext(context)) {
    return 'hidden';
  }

  if (
    (definition?.blockedForReadOnlyRole && context.roleReadOnly) ||
    isReadOnlyOperationalContext(context)
  ) {
    return 'hidden';
  }

  if (roleId === EMERGENCY_ROLE_ID.edManager) {
    if (key === K.settingsManage) return 'readonly';
    if (key === K.displayPublicPublish) return 'allowed';
    if (CLINICAL_CREATE_PERMISSIONS.has(key) || DESTRUCTIVE_PERMISSIONS.has(key)) {
      return 'disabled';
    }
    if (CLINICAL_MUTATION_PERMISSIONS.has(key) && key !== K.queueMove) {
      return 'disabled';
    }
  }

  if (definition?.category === 'display') {
    return 'readonly';
  }

  if (canPerformEmergencyMutation(role, key, permissionsOverrides, context)) {
    return 'allowed';
  }

  return 'readonly';
}

export function presentEmergencyPermission(
  role: string,
  actionOrPermission: string,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): EmergencyRoleActionPresentation {
  const key = resolveEmergencyPermissionKey(actionOrPermission);
  const actionId = resolveRoleActionId(actionOrPermission);

  if (actionId) {
    const matrixState = matrixStateForRole(normalizeEmergencyRoleId(role), actionId);
    if (matrixState) {
      const permission = EMERGENCY_ROLE_ACTION_PERMISSION[actionId];
      const roleId = normalizeEmergencyRoleId(role);
      const roleHasGrant = (ROLE_PERMISSION_GRANTS[roleId] || []).includes(permission);

      if (matrixState === 'hidden') {
        return stateToPresentation('hidden', permission);
      }
      if (matrixState === 'disabled') {
        return stateToPresentation('disabled', permission);
      }
      if (matrixState === 'readonly') {
        return stateToPresentation('readonly', permission);
      }
      if (
        matrixState === 'allowed' &&
        !canPerformEmergencyMutation(role, permission, permissionsOverrides, context)
      ) {
        return stateToPresentation('readonly', permission);
      }
      if (matrixState === 'allowed' && !roleHasGrant) {
        return stateToPresentation('hidden', permission);
      }
      return stateToPresentation(matrixState, permission);
    }
  }

  const derived = derivePermissionPresentationState(
    role,
    actionOrPermission,
    permissionsOverrides,
    context,
  );
  return stateToPresentation(derived, key);
}

export function auditRoleActionSurfaces(
  role: string,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): Array<EmergencyUiActionSurface & EmergencyRoleActionPresentation> {
  return EMERGENCY_UI_ACTION_AUDIT.map((surface) => ({
    ...surface,
    ...presentEmergencyPermission(role, surface.permission, permissionsOverrides, context),
  })) as Array<EmergencyUiActionSurface & EmergencyRoleActionPresentation>;
}

export function assertUnauthorizedRolesCannotSeeDestructiveClinicalActions(
  roles: string[],
): boolean {
  for (const role of roles) {
    const roleId = normalizeEmergencyRoleId(role);
    if (
      roleId !== EMERGENCY_ROLE_ID.publicDisplay &&
      roleId !== EMERGENCY_ROLE_ID.readOnlyViewer
    ) {
      continue;
    }

    for (const entry of EMERGENCY_UI_ACTION_AUDIT) {
      if (!entry.destructive && !entry.clinical) continue;
      const presentation = presentEmergencyPermission(role, entry.permission);
      if (presentation.visible && presentation.enabled) {
        return false;
      }
    }
  }
  return true;
}

export function listRegisteredPermissions(): string[] {
  return EMERGENCY_PERMISSION_REGISTRY.map((entry) => entry.key);
}
