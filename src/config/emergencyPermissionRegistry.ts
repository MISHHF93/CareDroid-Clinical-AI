/**
 * Canonical CareDroid permission registry � actions, routes, screens, and display modes.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  CARE_DROID_SCREEN_MODE_CONFIG,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import {
  EMERGENCY_ROLE_ID,
  type EmergencyRoleId,
  resolveDisplayParamScreenMode,
} from './emergencyRoleScreenMatrix';

export type EmergencyPermissionCategory = 'action' | 'route' | 'screen' | 'display';

export type EmergencyPermissionDefinition = {
  key: string;
  category: EmergencyPermissionCategory;
  label: string;
  description: string;
  legacyAliases?: readonly string[];
  /** Blocked while public/wall display mode is active */
  blockedInPublicDisplay?: boolean;
  /** Blocked for read-only viewer role or read-only display */
  blockedForReadOnlyRole?: boolean;
};

/** Canonical permission keys � single vocabulary for CareDroid. */
export const EMERGENCY_PERMISSION_KEYS = Object.freeze({
  patientCreate: 'patient.create',
  patientDemographicsEdit: 'patient.demographics.edit',
  patientTransition: 'patient.transition',
  patientAssignStaff: 'patient.assignStaff',
  patientAssignRoom: 'patient.assignRoom',
  patientEscalate: 'patient.escalate',
  patientDischarge: 'patient.discharge',
  encounterCreate: 'encounter.create',
  intakeVerify: 'intake.verify',
  triageAssignAcuity: 'triage.assign_acuity',
  queueMove: 'queue.move',
  vitalsWrite: 'vitals.write',
  notesWrite: 'notes.write',
  flagsManage: 'flags.manage',
  reassessmentComplete: 'reassessment.complete',
  emsPrepareBay: 'ems.prepareBay',
  emsConvertArrival: 'ems.convertArrival',
  emsHandoffComplete: 'ems.handoff.complete',
  referralCreate: 'referral.create',
  transferManage: 'transfers.manage',
  capacityManage: 'capacity.manage',
  boardingManage: 'boarding.manage',
  workloadReassign: 'workload.reassign',
  receptionEscalate: 'reception.escalate',
  copilotUse: 'copilot.use',
  analyticsView: 'analytics.view',
  simulationRun: 'simulation.run',
  settingsManage: 'settings.manage',
  displayPublicWaitboard: 'display.public.waitboard',
  displayPublicPublish: 'display.public.publish',
  displayWhiteboardReadonly: 'display.whiteboard.readonly',
  screenTriage: 'screen.triage',
  screenRegistration: 'screen.registration',
  screenChargeNurse: 'screen.charge_nurse',
  screenPhysician: 'screen.physician',
  screenEms: 'screen.ems',
  screenCommandCenter: 'screen.command_center',
  screenAdmin: 'screen.admin',
});

const K = EMERGENCY_PERMISSION_KEYS;

export const EMERGENCY_PERMISSION_REGISTRY: readonly EmergencyPermissionDefinition[] = Object.freeze([
  { key: K.patientCreate, category: 'action', label: 'Create patient', description: 'Register new patients and walk-ins.', legacyAliases: ['patient.create'], blockedInPublicDisplay: true, blockedForReadOnlyRole: true },
  { key: K.patientDemographicsEdit, category: 'action', label: 'Edit demographics', description: 'Update identity and demographic fields during intake.', legacyAliases: ['demographics.edit'], blockedInPublicDisplay: true, blockedForReadOnlyRole: true },
  { key: K.encounterCreate, category: 'action', label: 'Create encounter', description: 'Open clinical encounters after registration.', legacyAliases: ['encounter.create'], blockedInPublicDisplay: true, blockedForReadOnlyRole: true },
  { key: K.intakeVerify, category: 'action', label: 'Verify intake', description: 'Complete identity verification and Smart Intake review.', legacyAliases: ['intake.verify'], blockedInPublicDisplay: true },
  { key: K.triageAssignAcuity, category: 'action', label: 'Assign triage acuity', description: 'Record triage priority and acuity assignment.', legacyAliases: ['triage.manage', 'triage.assign_acuity'], blockedInPublicDisplay: true },
  { key: K.queueMove, category: 'action', label: 'Move queue', description: 'Advance patients between journey states and queues.', legacyAliases: ['patient.transition', 'queue.move'], blockedInPublicDisplay: true, blockedForReadOnlyRole: true },
  { key: K.reassessmentComplete, category: 'action', label: 'Complete reassessment', description: 'Clear reassessment tasks and document review.', legacyAliases: ['reassessment.complete'], blockedInPublicDisplay: true },
  { key: K.vitalsWrite, category: 'action', label: 'Write vitals', description: 'Record patient vital signs.', legacyAliases: ['vitals.write'], blockedInPublicDisplay: true },
  { key: K.notesWrite, category: 'action', label: 'Write notes', description: 'Add clinical and operational notes.', legacyAliases: ['notes.write'], blockedInPublicDisplay: true },
  { key: K.flagsManage, category: 'action', label: 'Manage flags', description: 'Add or clear patient safety flags.', legacyAliases: ['flags.manage'], blockedInPublicDisplay: true },
  { key: K.emsHandoffComplete, category: 'action', label: 'Complete EMS handoff', description: 'Finalize ambulance offload and handoff checklist.', legacyAliases: ['ems.completeHandoff', 'ems.handoff.complete'], blockedInPublicDisplay: true },
  { key: K.emsPrepareBay, category: 'action', label: 'Prepare EMS bay', description: 'Stage receiving area for inbound EMS.', legacyAliases: ['ems.prepareBay'], blockedInPublicDisplay: true },
  { key: K.emsConvertArrival, category: 'action', label: 'Convert EMS arrival', description: 'Convert pre-arrival EMS unit to registered patient.', legacyAliases: ['ems.convertArrival'], blockedInPublicDisplay: true },
  { key: K.referralCreate, category: 'action', label: 'Create referral', description: 'Initiate specialty referrals and consult requests.', legacyAliases: ['referrals.manage', 'referral.create'], blockedInPublicDisplay: true, blockedForReadOnlyRole: true },
  { key: K.transferManage, category: 'action', label: 'Manage transfers', description: 'Coordinate inter-facility transfers.', legacyAliases: ['transfers.manage'], blockedInPublicDisplay: true },
  { key: K.capacityManage, category: 'action', label: 'Manage capacity', description: 'Adjust capacity thresholds and surge posture.', legacyAliases: ['capacity.manage'], blockedInPublicDisplay: true },
  { key: K.boardingManage, category: 'action', label: 'Manage boarding', description: 'Admission boarding workflow controls.', legacyAliases: ['boarding.manage'], blockedInPublicDisplay: true },
  { key: K.workloadReassign, category: 'action', label: 'Reassign workload', description: 'Shift staff assignments and workload balancing.', legacyAliases: ['workload.reassign'], blockedInPublicDisplay: true },
  { key: K.patientEscalate, category: 'action', label: 'Escalate patient', description: 'Clinical escalation for deteriorating patients.', legacyAliases: ['patient.escalate'], blockedInPublicDisplay: true },
  { key: K.receptionEscalate, category: 'action', label: 'Reception escalate', description: 'Front-desk escalation to triage or charge nurse.', legacyAliases: ['reception.escalate'], blockedInPublicDisplay: true },
  { key: K.patientDischarge, category: 'action', label: 'Discharge patient', description: 'Complete discharge workflow.', legacyAliases: ['patient.discharge'], blockedInPublicDisplay: true, blockedForReadOnlyRole: true },
  { key: K.patientAssignStaff, category: 'action', label: 'Assign staff', description: 'Assign responsible clinicians to patients.', legacyAliases: ['patient.assignStaff'], blockedInPublicDisplay: true },
  { key: K.patientAssignRoom, category: 'action', label: 'Assign room', description: 'Assign patient care locations and rooms.', legacyAliases: ['patient.assignRoom'], blockedInPublicDisplay: true },
  { key: K.copilotUse, category: 'action', label: 'Use copilot', description: 'Access CareDroid Copilot.', legacyAliases: ['copilot.use'] },
  { key: K.analyticsView, category: 'action', label: 'View analytics', description: 'Open operational analytics surfaces.', legacyAliases: ['analytics.view'] },
  { key: K.simulationRun, category: 'action', label: 'Run simulation', description: 'Execute ED simulation scenarios.', legacyAliases: ['simulation.run'], blockedInPublicDisplay: true },
  { key: K.settingsManage, category: 'action', label: 'Manage settings', description: 'Configure tenant CareDroid settings.', legacyAliases: ['settings.manage'], blockedInPublicDisplay: true },
  { key: K.displayPublicWaitboard, category: 'display', label: 'Public waiting board', description: 'View aggregate public waiting-room wall display.', blockedForReadOnlyRole: false },
  { key: K.displayPublicPublish, category: 'action', label: 'Publish public display', description: 'Publish or update public waiting-room and hallway wall displays.', legacyAliases: ['display.public.publish'], blockedInPublicDisplay: true },
  { key: K.displayWhiteboardReadonly, category: 'display', label: 'Read-only whiteboard', description: 'View departmental read-only whiteboard display.', blockedForReadOnlyRole: false },
  { key: K.screenTriage, category: 'screen', label: 'Triage screen', description: 'Operate triage nurse screen mode.' },
  { key: K.screenRegistration, category: 'screen', label: 'Registration screen', description: 'Operate reception registration screen mode.' },
  { key: K.screenChargeNurse, category: 'screen', label: 'Charge nurse screen', description: 'Operate charge nurse command screen mode.' },
  { key: K.screenPhysician, category: 'screen', label: 'Physician screen', description: 'Operate physician clinical screen mode.' },
  { key: K.screenEms, category: 'screen', label: 'EMS screen', description: 'Operate EMS handoff screen mode.' },
  { key: K.screenCommandCenter, category: 'screen', label: 'Command center screen', description: 'Operate department command center display.' },
  { key: K.screenAdmin, category: 'screen', label: 'Admin screen', description: 'Operate site admin configuration screen mode.' },
]);

const PERMISSION_BY_KEY = new Map(
  EMERGENCY_PERMISSION_REGISTRY.map((entry) => [entry.key, entry]),
);

const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const entry of EMERGENCY_PERMISSION_REGISTRY) {
  ALIAS_TO_CANONICAL.set(entry.key, entry.key);
  for (const alias of entry.legacyAliases || []) {
    ALIAS_TO_CANONICAL.set(alias, entry.key);
  }
}

/** Role ? granted action/display/screen permission keys */
export const ROLE_PERMISSION_GRANTS: Record<EmergencyRoleId, readonly string[]> = Object.freeze({
  [EMERGENCY_ROLE_ID.admin]: Object.freeze([
    K.patientCreate,
    K.patientDemographicsEdit,
    K.encounterCreate,
    K.intakeVerify,
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
    K.capacityManage,
    K.boardingManage,
    K.workloadReassign,
    K.patientEscalate,
    K.receptionEscalate,
    K.patientDischarge,
    K.patientAssignStaff,
    K.patientAssignRoom,
    K.copilotUse,
    K.analyticsView,
    K.simulationRun,
    K.settingsManage,
    K.displayPublicWaitboard,
    K.displayPublicPublish,
    K.displayWhiteboardReadonly,
    K.screenAdmin,
    K.screenCommandCenter,
    K.screenChargeNurse,
    K.screenTriage,
    K.screenRegistration,
    K.screenPhysician,
    K.screenEms,
  ]),
  [EMERGENCY_ROLE_ID.edManager]: Object.freeze([
    K.queueMove,
    K.reassessmentComplete,
    K.referralCreate,
    K.transferManage,
    K.capacityManage,
    K.boardingManage,
    K.workloadReassign,
    K.copilotUse,
    K.analyticsView,
    K.simulationRun,
    K.settingsManage,
    K.displayPublicPublish,
    K.displayWhiteboardReadonly,
    K.screenCommandCenter,
    K.screenChargeNurse,
  ]),
  [EMERGENCY_ROLE_ID.chargeNurse]: Object.freeze([
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
    K.capacityManage,
    K.boardingManage,
    K.workloadReassign,
    K.patientEscalate,
    K.copilotUse,
    K.analyticsView,
    K.displayWhiteboardReadonly,
    K.screenChargeNurse,
    K.screenCommandCenter,
  ]),
  [EMERGENCY_ROLE_ID.triageNurse]: Object.freeze([
    K.patientCreate,
    K.patientDemographicsEdit,
    K.encounterCreate,
    K.intakeVerify,
    K.triageAssignAcuity,
    K.queueMove,
    K.reassessmentComplete,
    K.vitalsWrite,
    K.notesWrite,
    K.flagsManage,
    K.patientEscalate,
    K.emsHandoffComplete,
    K.emsPrepareBay,
    K.emsConvertArrival,
    K.copilotUse,
    K.screenTriage,
    K.screenRegistration,
  ]),
  [EMERGENCY_ROLE_ID.physician]: Object.freeze([
    K.patientDemographicsEdit,
    K.queueMove,
    K.reassessmentComplete,
    K.vitalsWrite,
    K.notesWrite,
    K.flagsManage,
    K.patientEscalate,
    K.patientDischarge,
    K.referralCreate,
    K.transferManage,
    K.copilotUse,
    K.analyticsView,
    K.displayWhiteboardReadonly,
    K.screenPhysician,
  ]),
  [EMERGENCY_ROLE_ID.registrationClerk]: Object.freeze([
    K.patientCreate,
    K.patientDemographicsEdit,
    K.encounterCreate,
    K.intakeVerify,
    K.emsConvertArrival,
    K.receptionEscalate,
    K.screenRegistration,
  ]),
  [EMERGENCY_ROLE_ID.emsUser]: Object.freeze([
    K.patientCreate,
    K.emsPrepareBay,
    K.emsConvertArrival,
    K.emsHandoffComplete,
    K.displayWhiteboardReadonly,
    K.screenEms,
  ]),
  [EMERGENCY_ROLE_ID.dispatcher]: Object.freeze([
    K.patientCreate,
    K.emsPrepareBay,
    K.displayWhiteboardReadonly,
    K.screenEms,
  ]),
  [EMERGENCY_ROLE_ID.emsCoordinator]: Object.freeze([
    K.patientCreate,
    K.emsPrepareBay,
    K.emsConvertArrival,
    K.emsHandoffComplete,
    K.analyticsView,
    K.displayWhiteboardReadonly,
    K.screenEms,
    K.screenCommandCenter,
  ]),
  [EMERGENCY_ROLE_ID.readOnlyViewer]: Object.freeze([
    K.analyticsView,
    K.displayPublicWaitboard,
    K.displayWhiteboardReadonly,
    K.displayPublicPublish,
  ]),
  [EMERGENCY_ROLE_ID.publicDisplay]: Object.freeze([
    K.displayPublicWaitboard,
    K.displayPublicPublish,
  ]),
});

export const ROUTE_PERMISSION_MAP: Record<string, string | null> = Object.freeze({
  [CANONICAL_ROUTES.emergencyReception]: K.screenRegistration,
  [CANONICAL_ROUTES.emergencyIntake]: K.intakeVerify,
  [CANONICAL_ROUTES.emergencyEms]: K.screenEms,
  [CANONICAL_ROUTES.emergencyDispatch]: K.patientCreate,
  [CANONICAL_ROUTES.emergencyEdReadiness]: K.displayWhiteboardReadonly,
  [CANONICAL_ROUTES.emergencyCommandCenter]: K.displayWhiteboardReadonly,
  [CANONICAL_ROUTES.emergencyJourney]: K.displayWhiteboardReadonly,
  [CANONICAL_ROUTES.emergencyWhiteboard]: K.displayWhiteboardReadonly,
  [CANONICAL_ROUTES.emergencySettings]: K.settingsManage,
  [CANONICAL_ROUTES.emergencyAnalytics]: K.analyticsView,
  [CANONICAL_ROUTES.emergencyReports]: K.analyticsView,
  [CANONICAL_ROUTES.emergencyDiagnostics]: K.displayWhiteboardReadonly,
  [CANONICAL_ROUTES.emergencyHandoffs]: K.displayWhiteboardReadonly,
  [CANONICAL_ROUTES.emergencyReassessment]: K.reassessmentComplete,
  [CANONICAL_ROUTES.emergencyReferrals]: K.referralCreate,
});

const SCREEN_MODE_PERMISSION: Record<CareDroidScreenMode, string> = {
  [CARE_DROID_SCREEN_MODES.triage]: K.screenTriage,
  [CARE_DROID_SCREEN_MODES.reception]: K.screenRegistration,
  [CARE_DROID_SCREEN_MODES.chargeNurse]: K.screenChargeNurse,
  [CARE_DROID_SCREEN_MODES.physician]: K.screenPhysician,
  [CARE_DROID_SCREEN_MODES.ems]: K.screenEms,
  [CARE_DROID_SCREEN_MODES.publicWaiting]: K.displayPublicWaitboard,
  [CARE_DROID_SCREEN_MODES.commandCenter]: K.screenCommandCenter,
  [CARE_DROID_SCREEN_MODES.admin]: K.screenAdmin,
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: K.displayWhiteboardReadonly,
};

export type EmergencyPermissionContext = {
  screenMode?: CareDroidScreenMode;
  displayParam?: string | null;
  readOnlyDisplayMode?: boolean;
  roleReadOnly?: boolean;
};

export function resolveEmergencyPermissionKey(permission: string | null | undefined): string | null {
  if (!permission) return null;
  const normalized = String(permission).trim();
  return ALIAS_TO_CANONICAL.get(normalized) || normalized;
}

export function getEmergencyPermissionDefinition(
  permission: string,
): EmergencyPermissionDefinition | undefined {
  const key = resolveEmergencyPermissionKey(permission);
  return key ? PERMISSION_BY_KEY.get(key) : undefined;
}

export function normalizeEmergencyRoleId(role: string): EmergencyRoleId {
  const normalized = String(role || '').trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'public_display' || normalized === 'public_waiting_display') {
    return EMERGENCY_ROLE_ID.publicDisplay;
  }
  const values = Object.values(EMERGENCY_ROLE_ID);
  if (values.includes(normalized as EmergencyRoleId)) return normalized as EmergencyRoleId;
  return EMERGENCY_ROLE_ID.physician;
}

function hasOverrideGrant(
  role: string,
  key: string,
  permissionsOverrides: Record<string, string[]>,
): boolean {
  const roleId = normalizeEmergencyRoleId(role);
  const extra =
    permissionsOverrides[roleId] ||
    permissionsOverrides[role] ||
    permissionsOverrides[normalizeEmergencyRoleId(role)];
  if (!Array.isArray(extra)) return false;
  return extra.some((entry) => resolveEmergencyPermissionKey(entry) === key);
}

function roleGrants(role: string, permissionsOverrides: Record<string, string[]> = {}): Set<string> {
  const roleId = normalizeEmergencyRoleId(role);
  const base = ROLE_PERMISSION_GRANTS[roleId] || [];
  const extra =
    permissionsOverrides[roleId] ||
    permissionsOverrides[role] ||
    permissionsOverrides[normalizeEmergencyRoleId(role)];
  const merged = new Set(base.map((key) => resolveEmergencyPermissionKey(key) || key));
  if (Array.isArray(extra)) {
    for (const entry of extra) {
      const resolved = resolveEmergencyPermissionKey(entry);
      if (resolved) merged.add(resolved);
    }
  }
  return merged;
}

export function isPublicDisplayContext(context: EmergencyPermissionContext = {}): boolean {
  const displayMode =
    context.screenMode ||
    resolveDisplayParamScreenMode(context.displayParam) ||
    (context.readOnlyDisplayMode ? CARE_DROID_SCREEN_MODES.readOnlyWhiteboard : null);
  if (!displayMode) return false;
  const config = CARE_DROID_SCREEN_MODE_CONFIG[displayMode];
  return Boolean(config?.publicDisplay);
}

export function isReadOnlyOperationalContext(context: EmergencyPermissionContext = {}): boolean {
  if (context.roleReadOnly) return true;
  if (context.readOnlyDisplayMode) return true;
  const displayMode = context.screenMode || resolveDisplayParamScreenMode(context.displayParam);
  if (!displayMode) return false;
  return Boolean(CARE_DROID_SCREEN_MODE_CONFIG[displayMode]?.readOnly);
}

export function hasEmergencyPermission(
  role: string,
  permission: string,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): boolean {
  const key = resolveEmergencyPermissionKey(permission);
  if (!key) return false;

  const definition = PERMISSION_BY_KEY.get(key);
  const grants = roleGrants(role, permissionsOverrides);
  if (!grants.has(key)) return false;

  if (definition?.category === 'display') {
    return true;
  }

  if (definition?.blockedInPublicDisplay && isPublicDisplayContext(context)) return false;
  if (
    definition?.blockedForReadOnlyRole &&
    context.roleReadOnly &&
    !hasOverrideGrant(role, key, permissionsOverrides)
  ) {
    return false;
  }

  return true;
}

export function canPerformEmergencyMutation(
  role: string,
  permission: string,
  permissionsOverrides: Record<string, string[]> = {},
  context: EmergencyPermissionContext = {},
): boolean {
  const definition = getEmergencyPermissionDefinition(permission);
  if (definition?.category === 'display') return false;
  if (isPublicDisplayContext(context)) return false;
  if (isReadOnlyOperationalContext(context)) return false;
  return hasEmergencyPermission(role, permission, permissionsOverrides, context);
}

export function canAccessEmergencyRoutePermission(
  role: string,
  path: string,
  permissionsOverrides: Record<string, string[]> = {},
): boolean {
  const normalizedPath = String(path || '').split('?')[0];
  const required = ROUTE_PERMISSION_MAP[normalizedPath];
  if (required) {
    return hasEmergencyPermission(role, required, permissionsOverrides);
  }
  return true;
}

export function canUseScreenModePermission(
  role: string,
  screenMode: CareDroidScreenMode,
  permissionsOverrides: Record<string, string[]> = {},
): boolean {
  const required = SCREEN_MODE_PERMISSION[screenMode];
  if (!required) return true;
  return hasEmergencyPermission(role, required, permissionsOverrides, { screenMode });
}

export function listPermissionsForRole(role: string): string[] {
  return [...roleGrants(role)];
}
