import { CANONICAL_ROUTES, getDefaultRouteForProfile } from './routes.config';
import {
  canAccessEmergencyRoutePermission,
  canPerformEmergencyMutation,
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  isPublicDisplayContext,
  isReadOnlyOperationalContext,
  listPermissionsForRole,
  resolveEmergencyPermissionKey,
} from './emergencyPermissionRegistry';
import {
  getPlatformHomeRoute,
  isReceptionFirstUxEnabled,
  RECEPTION_FIRST_UX,
} from './receptionFirstUx.config';
import { CARE_DROID_SCREEN_MODES, normalizeCareDroidScreenMode } from './careDroidScreenModes';
import { getTriagePendingQueuePath } from './triageScreenModel';
import { isPhysicianScreenMode } from './physicianScreenModel';
import { presentEmergencyRoleAction } from './emergencyRoleActionMatrix';
import { resolveEffectiveEmergencyRole } from './userProfileCatalog';
import { resolveRoleLandingRoute } from './emergencyRoleNavigationModel';

export {
  EMERGENCY_PERMISSION_KEYS,
  resolveEmergencyPermissionKey,
  hasEmergencyPermission,
  canPerformEmergencyMutation,
  canAccessEmergencyRoutePermission,
  isPublicDisplayContext,
  isReadOnlyOperationalContext,
  listPermissionsForRole,
} from './emergencyPermissionRegistry';

export const EMERGENCY_ROLE_IDS = Object.freeze({
  admin: 'admin',
  edManager: 'ed_manager',
  chargeNurse: 'charge_nurse',
  triageNurse: 'triage_nurse',
  physician: 'physician',
  registrationClerk: 'registration_clerk',
  emsUser: 'ems_user',
  dispatcher: 'dispatcher',
  emsCoordinator: 'ems_coordinator',
  readOnlyViewer: 'read_only_viewer',
  publicDisplay: 'public_display',
});

export const EMERGENCY_ROLE_LABELS = Object.freeze({
  [EMERGENCY_ROLE_IDS.admin]: 'Admin',
  [EMERGENCY_ROLE_IDS.edManager]: 'ED Manager',
  [EMERGENCY_ROLE_IDS.chargeNurse]: 'Charge Nurse',
  [EMERGENCY_ROLE_IDS.triageNurse]: 'Triage Nurse',
  [EMERGENCY_ROLE_IDS.physician]: 'Physician',
  [EMERGENCY_ROLE_IDS.registrationClerk]: 'Registration Clerk',
  [EMERGENCY_ROLE_IDS.emsUser]: 'EMS User',
  [EMERGENCY_ROLE_IDS.dispatcher]: 'Dispatcher',
  [EMERGENCY_ROLE_IDS.emsCoordinator]: 'EMS Coordinator',
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: 'Read-Only Display',
  [EMERGENCY_ROLE_IDS.publicDisplay]: 'Public Display',
});

export const EMERGENCY_ACTIONS = Object.freeze({
  createPatient: EMERGENCY_PERMISSION_KEYS.patientCreate,
  editPatientDemographics: EMERGENCY_PERMISSION_KEYS.patientDemographicsEdit,
  createEncounter: EMERGENCY_PERMISSION_KEYS.encounterCreate,
  verifyIntake: EMERGENCY_PERMISSION_KEYS.intakeVerify,
  triage: EMERGENCY_PERMISSION_KEYS.triageAssignAcuity,
  transitionPatient: EMERGENCY_PERMISSION_KEYS.queueMove,
  queueMove: EMERGENCY_PERMISSION_KEYS.queueMove,
  completeReassessment: EMERGENCY_PERMISSION_KEYS.reassessmentComplete,
  writeVitals: EMERGENCY_PERMISSION_KEYS.vitalsWrite,
  writeNote: EMERGENCY_PERMISSION_KEYS.notesWrite,
  manageFlags: EMERGENCY_PERMISSION_KEYS.flagsManage,
  assignStaff: EMERGENCY_PERMISSION_KEYS.patientAssignStaff,
  assignRoom: EMERGENCY_PERMISSION_KEYS.patientAssignRoom,
  escalatePatient: EMERGENCY_PERMISSION_KEYS.patientEscalate,
  receptionEscalate: EMERGENCY_PERMISSION_KEYS.receptionEscalate,
  dischargePatient: EMERGENCY_PERMISSION_KEYS.patientDischarge,
  prepareEmsBay: EMERGENCY_PERMISSION_KEYS.emsPrepareBay,
  convertEmsArrival: EMERGENCY_PERMISSION_KEYS.emsConvertArrival,
  completeEmsHandoff: EMERGENCY_PERMISSION_KEYS.emsHandoffComplete,
  manageReferral: EMERGENCY_PERMISSION_KEYS.referralCreate,
  manageTransfer: EMERGENCY_PERMISSION_KEYS.transferManage,
  manageCapacity: EMERGENCY_PERMISSION_KEYS.capacityManage,
  manageBoarding: EMERGENCY_PERMISSION_KEYS.boardingManage,
  reassignWorkload: EMERGENCY_PERMISSION_KEYS.workloadReassign,
  useCopilot: EMERGENCY_PERMISSION_KEYS.copilotUse,
  viewAnalytics: EMERGENCY_PERMISSION_KEYS.analyticsView,
  runSimulation: EMERGENCY_PERMISSION_KEYS.simulationRun,
  manageSettings: EMERGENCY_PERMISSION_KEYS.settingsManage,
  displayPublicWaitboard: EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard,
  displayPublicPublish: EMERGENCY_PERMISSION_KEYS.displayPublicPublish,
  completeDisposition: EMERGENCY_PERMISSION_KEYS.patientDischarge,
  displayWhiteboardReadonly: EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly,
  // Future module
  manageFederatedLearning: 'federated.manage',
  // Future module
  runDigitalTwin: 'digitalTwin.run',
  // Future module
  viewAiGovernance: 'aiGovernance.view',
});

const ROUTES = Object.freeze({
  whiteboard: CANONICAL_ROUTES.emergencyWhiteboard,
  commandCenter: CANONICAL_ROUTES.emergencyCommandCenter,
  pulse: CANONICAL_ROUTES.emergencyPulse,
  patients: CANONICAL_ROUTES.emergencyPatients,
  journey: CANONICAL_ROUTES.emergencyJourney,
  ems: CANONICAL_ROUTES.emergencyEms,
  intake: CANONICAL_ROUTES.emergencyIntake,
  reception: CANONICAL_ROUTES.emergencyReception,
  queues: CANONICAL_ROUTES.emergencyQueues,
  reassessment: CANONICAL_ROUTES.emergencyReassessment,
  capacity: CANONICAL_ROUTES.emergencyCapacity,
  boarding: CANONICAL_ROUTES.emergencyBoarding,
  referrals: CANONICAL_ROUTES.emergencyReferrals,
  provincialHealth: CANONICAL_ROUTES.emergencyProvincialHealth,
  integrations: CANONICAL_ROUTES.emergencyIntegrations,
  copilot: CANONICAL_ROUTES.emergencyCopilot,
  documentation: CANONICAL_ROUTES.emergencyDocumentation,
  analytics: CANONICAL_ROUTES.emergencyAnalytics,
  simulation: CANONICAL_ROUTES.emergencySimulation,
  // Future module
  federatedLearning: CANONICAL_ROUTES.emergencyFederatedLearning,
  // Future module
  digitalTwin: CANONICAL_ROUTES.emergencyDigitalTwin,
  tools: CANONICAL_ROUTES.emergencyTools,
  platform: CANONICAL_ROUTES.workspace,
  shift: CANONICAL_ROUTES.emergencyShift,
  // Future module
  aiGovernance: CANONICAL_ROUTES.emergencyAiGovernance,
  // Future module
  aiGovernanceGlobal: CANONICAL_ROUTES.aiGovernance,
  integrationHub: CANONICAL_ROUTES.integrationHub,
  cosmos: CANONICAL_ROUTES.cosmosViewer,
  settings: CANONICAL_ROUTES.emergencySettings,
  help: CANONICAL_ROUTES.emergencyHelp,
  alerts: CANONICAL_ROUTES.emergencyAlerts,
  dispatch: CANONICAL_ROUTES.emergencyDispatch,
  edReadiness: CANONICAL_ROUTES.emergencyEdReadiness,
  diagnostics: CANONICAL_ROUTES.emergencyDiagnostics,
  handoffs: CANONICAL_ROUTES.emergencyHandoffs,
  reports: CANONICAL_ROUTES.emergencyReports,
  fleet: CANONICAL_ROUTES.fleetCommand,
  surveillance: CANONICAL_ROUTES.surveillanceNexus,
  laboratory: CANONICAL_ROUTES.laboratory,
  knowledgeGraph: CANONICAL_ROUTES.knowledgeGraph,
  audit: CANONICAL_ROUTES.audit,
  aiCommandCenter: CANONICAL_ROUTES.aiCommandCenter,
  adminOperations: CANONICAL_ROUTES.adminOperations,
});

const ALL_ROUTES = Object.freeze([
  ROUTES.whiteboard,
  ROUTES.commandCenter,
  ROUTES.pulse,
  ROUTES.patients,
  ROUTES.journey,
  ROUTES.dispatch,
  ROUTES.edReadiness,
  ROUTES.ems,
  ROUTES.reception,
  ROUTES.intake,
  ROUTES.queues,
  ROUTES.reassessment,
  ROUTES.capacity,
  ROUTES.boarding,
  ROUTES.referrals,
  ROUTES.copilot,
  ROUTES.documentation,
  ROUTES.tools,
  ROUTES.platform,
  ROUTES.shift,
  ROUTES.analytics,
  ROUTES.integrations,
  ROUTES.integrationHub,
  ROUTES.cosmos,
  ROUTES.settings,
  ROUTES.help,
  ROUTES.alerts,
  ROUTES.diagnostics,
  ROUTES.handoffs,
  ROUTES.reports,
  ROUTES.fleet,
  ROUTES.surveillance,
  ROUTES.simulation,
  ROUTES.laboratory,
  ROUTES.knowledgeGraph,
  ROUTES.audit,
  ROUTES.aiCommandCenter,
  ROUTES.adminOperations,
]);
const FUTURE_MODULE_ACTIONS = Object.freeze([
  EMERGENCY_ACTIONS.manageFederatedLearning,
  EMERGENCY_ACTIONS.runDigitalTwin,
  EMERGENCY_ACTIONS.viewAiGovernance,
]);
const ALL_ACTIONS = Object.freeze(
  Object.values(EMERGENCY_ACTIONS).filter((action) => !FUTURE_MODULE_ACTIONS.includes(action as any)),
);
const CLINICAL_VIEW_ROUTES = Object.freeze([
  ROUTES.whiteboard,
  ROUTES.commandCenter,
  ROUTES.patients,
  ROUTES.journey,
  ROUTES.queues,
  ROUTES.reassessment,
  ROUTES.capacity,
  ROUTES.boarding,
  ROUTES.referrals,
  ROUTES.copilot,
  ROUTES.documentation,
  ROUTES.tools,
  ROUTES.platform,
  ROUTES.pulse,
  ROUTES.shift,
  ROUTES.analytics,
  ROUTES.alerts,
  ROUTES.settings,
  ROUTES.help,
  ROUTES.diagnostics,
  ROUTES.handoffs,
  ROUTES.reports,
]);
const OPERATIONS_VIEW_ROUTES = Object.freeze([
  ROUTES.whiteboard,
  ROUTES.commandCenter,
  ROUTES.pulse,
  ROUTES.patients,
  ROUTES.journey,
  ROUTES.dispatch,
  ROUTES.edReadiness,
  ROUTES.ems,
  ROUTES.reception,
  ROUTES.intake,
  ROUTES.queues,
  ROUTES.reassessment,
  ROUTES.capacity,
  ROUTES.boarding,
  ROUTES.referrals,
  ROUTES.copilot,
  ROUTES.tools,
  ROUTES.platform,
  ROUTES.shift,
  ROUTES.analytics,
  ROUTES.alerts,
  ROUTES.settings,
  ROUTES.help,
  ROUTES.diagnostics,
  ROUTES.handoffs,
  ROUTES.reports,
  ROUTES.fleet,
  ROUTES.surveillance,
  ROUTES.simulation,
  ROUTES.laboratory,
  ROUTES.knowledgeGraph,
  ROUTES.audit,
  ROUTES.aiCommandCenter,
  ROUTES.adminOperations,
]);

export const EMERGENCY_ROLE_DEFINITIONS = Object.freeze({
  [EMERGENCY_ROLE_IDS.admin]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.admin,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.admin],
    description:
      'Full CareDroid administration, settings, governance, and clinical operations access.',
    routes: ALL_ROUTES,
    actions: ALL_ACTIONS,
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.admin),
  }),
  [EMERGENCY_ROLE_IDS.edManager]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.edManager,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.edManager],
    description:
      'Operational manager focused on flow, capacity, analytics, simulation, and transfers.',
    routes: OPERATIONS_VIEW_ROUTES,
    actions: [
      EMERGENCY_ACTIONS.transitionPatient,
      EMERGENCY_ACTIONS.assignStaff,
      EMERGENCY_ACTIONS.assignRoom,
      EMERGENCY_ACTIONS.manageReferral,
      EMERGENCY_ACTIONS.manageTransfer,
      EMERGENCY_ACTIONS.manageCapacity,
      EMERGENCY_ACTIONS.manageBoarding,
      EMERGENCY_ACTIONS.reassignWorkload,
      EMERGENCY_ACTIONS.useCopilot,
      EMERGENCY_ACTIONS.viewAnalytics,
      EMERGENCY_ACTIONS.runSimulation,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.edManager),
  }),
  [EMERGENCY_ROLE_IDS.chargeNurse]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.chargeNurse,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.chargeNurse],
    description:
      'Shift command role for triage flow, reassessment, staff assignment, EMS readiness, and capacity pressure.',
    routes: OPERATIONS_VIEW_ROUTES,
    actions: [
      EMERGENCY_ACTIONS.createPatient,
      EMERGENCY_ACTIONS.triage,
      EMERGENCY_ACTIONS.transitionPatient,
      EMERGENCY_ACTIONS.writeVitals,
      EMERGENCY_ACTIONS.writeNote,
      EMERGENCY_ACTIONS.manageFlags,
      EMERGENCY_ACTIONS.assignStaff,
      EMERGENCY_ACTIONS.assignRoom,
      EMERGENCY_ACTIONS.escalatePatient,
      EMERGENCY_ACTIONS.prepareEmsBay,
      EMERGENCY_ACTIONS.convertEmsArrival,
      EMERGENCY_ACTIONS.completeEmsHandoff,
      EMERGENCY_ACTIONS.manageReferral,
      EMERGENCY_ACTIONS.manageTransfer,
      EMERGENCY_ACTIONS.manageCapacity,
      EMERGENCY_ACTIONS.manageBoarding,
      EMERGENCY_ACTIONS.reassignWorkload,
      EMERGENCY_ACTIONS.useCopilot,
      EMERGENCY_ACTIONS.viewAnalytics,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.chargeNurse),
  }),
  [EMERGENCY_ROLE_IDS.triageNurse]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.triageNurse,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.triageNurse],
    description:
      'Front-door clinical role for intake, triage, vitals, reassessment, and patient safety flags.',
    routes: [
      ROUTES.whiteboard,
      ROUTES.patients,
      ROUTES.ems,
      ROUTES.reception,
      ROUTES.intake,
      ROUTES.queues,
      ROUTES.reassessment,
      ROUTES.copilot,
      ROUTES.tools,
      ROUTES.platform,
    ],
    actions: [
      EMERGENCY_ACTIONS.createPatient,
      EMERGENCY_ACTIONS.verifyIntake,
      EMERGENCY_ACTIONS.triage,
      EMERGENCY_ACTIONS.transitionPatient,
      EMERGENCY_ACTIONS.writeVitals,
      EMERGENCY_ACTIONS.writeNote,
      EMERGENCY_ACTIONS.manageFlags,
      EMERGENCY_ACTIONS.escalatePatient,
      EMERGENCY_ACTIONS.prepareEmsBay,
      EMERGENCY_ACTIONS.convertEmsArrival,
      EMERGENCY_ACTIONS.completeEmsHandoff,
      EMERGENCY_ACTIONS.useCopilot,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.triageNurse),
  }),
  [EMERGENCY_ROLE_IDS.physician]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.physician,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.physician],
    description:
      'Clinical decision role for patient review, state movement, referrals, reassessment, tools, and AI support.',
    routes: [...CLINICAL_VIEW_ROUTES, ROUTES.reception, ROUTES.ems, ROUTES.intake, ROUTES.copilot, ROUTES.analytics],
    actions: [
      EMERGENCY_ACTIONS.transitionPatient,
      EMERGENCY_ACTIONS.writeVitals,
      EMERGENCY_ACTIONS.writeNote,
      EMERGENCY_ACTIONS.manageFlags,
      EMERGENCY_ACTIONS.escalatePatient,
      EMERGENCY_ACTIONS.dischargePatient,
      EMERGENCY_ACTIONS.manageReferral,
      EMERGENCY_ACTIONS.manageTransfer,
      EMERGENCY_ACTIONS.useCopilot,
      EMERGENCY_ACTIONS.viewAnalytics,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.physician),
  }),
  [EMERGENCY_ROLE_IDS.registrationClerk]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.registrationClerk,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.registrationClerk],
    description:
      'Emergency reception role for fast arrival capture, intake drafts, demographics, queue handoff, and critical staff notification without clinical override authority.',
    routes: [ROUTES.reception, ROUTES.patients, ROUTES.intake, ROUTES.queues, ROUTES.help],
    actions: [
      EMERGENCY_ACTIONS.createPatient,
      EMERGENCY_ACTIONS.editPatientDemographics,
      EMERGENCY_ACTIONS.createEncounter,
      EMERGENCY_ACTIONS.verifyIntake,
      EMERGENCY_ACTIONS.convertEmsArrival,
      EMERGENCY_ACTIONS.receptionEscalate,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.registrationClerk),
  }),
  [EMERGENCY_ROLE_IDS.emsUser]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.emsUser,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.emsUser],
    description:
      'EMS coordination role for inbound units, bay preparation, and handoff completion.',
    routes: [ROUTES.ems, ROUTES.whiteboard, ROUTES.patients, ROUTES.capacity, ROUTES.tools, ROUTES.platform, ROUTES.alerts, ROUTES.help],
    actions: [
      EMERGENCY_ACTIONS.prepareEmsBay,
      EMERGENCY_ACTIONS.convertEmsArrival,
      EMERGENCY_ACTIONS.completeEmsHandoff,
      EMERGENCY_ACTIONS.createPatient,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.emsUser),
  }),
  [EMERGENCY_ROLE_IDS.dispatcher]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.dispatcher,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.dispatcher],
    description:
      'Emergency call taker and CAD dispatch operator. Receives 911 calls, performs telephone triage, assigns EMS units, and notifies the ED of inbound critical patients.',
    routes: [ROUTES.dispatch, ROUTES.ems, ROUTES.alerts, ROUTES.help],
    actions: [
      EMERGENCY_ACTIONS.createPatient,
      EMERGENCY_ACTIONS.prepareEmsBay,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.dispatcher),
  }),
  [EMERGENCY_ROLE_IDS.emsCoordinator]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.emsCoordinator,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.emsCoordinator],
    description:
      'EMS operations coordinator who manages unit deployment, prehospital data relay, pre-arrival notifications, and ED readiness handoffs.',
    routes: [ROUTES.dispatch, ROUTES.ems, ROUTES.edReadiness, ROUTES.whiteboard, ROUTES.capacity, ROUTES.alerts, ROUTES.analytics, ROUTES.help],
    actions: [
      EMERGENCY_ACTIONS.createPatient,
      EMERGENCY_ACTIONS.prepareEmsBay,
      EMERGENCY_ACTIONS.convertEmsArrival,
      EMERGENCY_ACTIONS.completeEmsHandoff,
      EMERGENCY_ACTIONS.viewAnalytics,
    ],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.emsCoordinator),
  }),
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.readOnlyViewer,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.readOnlyViewer],
    description: 'Read-only hallway and departmental wall displays with no mutating actions.',
    routes: [ROUTES.whiteboard, ROUTES.analytics, ROUTES.help],
    actions: [EMERGENCY_ACTIONS.viewAnalytics, EMERGENCY_ACTIONS.displayWhiteboardReadonly],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.readOnlyViewer),
    readOnly: true,
  }),
  [EMERGENCY_ROLE_IDS.publicDisplay]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.publicDisplay,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.publicDisplay],
    description: 'Public waiting-room display — aggregate status only, no staff actions.',
    routes: [ROUTES.whiteboard],
    actions: [EMERGENCY_ACTIONS.displayPublicWaitboard, EMERGENCY_ACTIONS.displayPublicPublish],
    defaultRoute: getDefaultRouteForProfile(EMERGENCY_ROLE_IDS.publicDisplay),
    readOnly: true,
  }),
});

const roleDefinitionLandingCache = new Map();

const ROLE_ALIASES = Object.freeze({
  admin: EMERGENCY_ROLE_IDS.admin,
  administrator: EMERGENCY_ROLE_IDS.admin,
  'site admin': EMERGENCY_ROLE_IDS.admin,
  site_admin: EMERGENCY_ROLE_IDS.admin,
  'ed manager': EMERGENCY_ROLE_IDS.edManager,
  ed_manager: EMERGENCY_ROLE_IDS.edManager,
  edmanager: EMERGENCY_ROLE_IDS.edManager,
  manager: EMERGENCY_ROLE_IDS.edManager,
  director: EMERGENCY_ROLE_IDS.edManager,
  'department manager': EMERGENCY_ROLE_IDS.edManager,
  charge: EMERGENCY_ROLE_IDS.chargeNurse,
  'charge nurse': EMERGENCY_ROLE_IDS.chargeNurse,
  charge_nurse: EMERGENCY_ROLE_IDS.chargeNurse,
  'flow nurse': EMERGENCY_ROLE_IDS.chargeNurse,
  flow_nurse: EMERGENCY_ROLE_IDS.chargeNurse,
  nurse: EMERGENCY_ROLE_IDS.triageNurse,
  rn: EMERGENCY_ROLE_IDS.triageNurse,
  registered_nurse: EMERGENCY_ROLE_IDS.triageNurse,
  'triage nurse': EMERGENCY_ROLE_IDS.triageNurse,
  triage_nurse: EMERGENCY_ROLE_IDS.triageNurse,
  triage: EMERGENCY_ROLE_IDS.triageNurse,
  physician: EMERGENCY_ROLE_IDS.physician,
  doctor: EMERGENCY_ROLE_IDS.physician,
  md: EMERGENCY_ROLE_IDS.physician,
  np: EMERGENCY_ROLE_IDS.physician,
  pa: EMERGENCY_ROLE_IDS.physician,
  'nurse practitioner': EMERGENCY_ROLE_IDS.physician,
  'physician assistant': EMERGENCY_ROLE_IDS.physician,
  'registration clerk': EMERGENCY_ROLE_IDS.registrationClerk,
  registration_clerk: EMERGENCY_ROLE_IDS.registrationClerk,
  emergency_receptionist: EMERGENCY_ROLE_IDS.registrationClerk,
  'emergency receptionist': EMERGENCY_ROLE_IDS.registrationClerk,
  clerk: EMERGENCY_ROLE_IDS.registrationClerk,
  registrar: EMERGENCY_ROLE_IDS.registrationClerk,
  'ed clerk': EMERGENCY_ROLE_IDS.registrationClerk,
  ed_clerk: EMERGENCY_ROLE_IDS.registrationClerk,
  receptionist: EMERGENCY_ROLE_IDS.registrationClerk,
  ems: EMERGENCY_ROLE_IDS.emsUser,
  'ems user': EMERGENCY_ROLE_IDS.emsUser,
  ems_user: EMERGENCY_ROLE_IDS.emsUser,
  paramedic: EMERGENCY_ROLE_IDS.emsUser,
  'ems handoff': EMERGENCY_ROLE_IDS.emsUser,
  'ems handoff nurse': EMERGENCY_ROLE_IDS.emsUser,
  dispatcher: EMERGENCY_ROLE_IDS.dispatcher,
  'call taker': EMERGENCY_ROLE_IDS.dispatcher,
  call_taker: EMERGENCY_ROLE_IDS.dispatcher,
  '911 operator': EMERGENCY_ROLE_IDS.dispatcher,
  'cad operator': EMERGENCY_ROLE_IDS.dispatcher,
  'ems coordinator': EMERGENCY_ROLE_IDS.emsCoordinator,
  ems_coordinator: EMERGENCY_ROLE_IDS.emsCoordinator,
  'ems operations': EMERGENCY_ROLE_IDS.emsCoordinator,
  viewer: EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read only': EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read only viewer': EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read-only viewer': EMERGENCY_ROLE_IDS.readOnlyViewer,
  read_only_viewer: EMERGENCY_ROLE_IDS.readOnlyViewer,
  readonly: EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read-only display': EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read only display': EMERGENCY_ROLE_IDS.readOnlyViewer,
  'public display': EMERGENCY_ROLE_IDS.publicDisplay,
  'waiting room display': EMERGENCY_ROLE_IDS.publicDisplay,
  'public waiting display': EMERGENCY_ROLE_IDS.publicDisplay,
  public_display: EMERGENCY_ROLE_IDS.publicDisplay,
});

export function normalizeEmergencyRole(role) {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return (
    ROLE_ALIASES[normalized] ||
    ROLE_ALIASES[normalized.replace(/_/g, ' ')] ||
    EMERGENCY_ROLE_IDS.physician
  );
}

/**
 * Map platform membership roleProfileId to an CareDroid role via catalog + org settings.
 * @param {object} [user]
 * @param {object} [emergencyOsSettings]
 */
export function resolveEmergencyRoleId(user, emergencyOsSettings: any = {}) {
  const rolesConfig = emergencyOsSettings?.roles || {};
  const mapping = rolesConfig.emergencyRoleMapping || {};
  const explicitProfileId = user?.profile?.roleProfileId || user?.roleProfileId;

  if (explicitProfileId && mapping[explicitProfileId]) {
    return normalizeEmergencyRole(mapping[explicitProfileId]);
  }

  try {
    const catalogRole = resolveEffectiveEmergencyRole(user, emergencyOsSettings);
    if (catalogRole) return catalogRole;
  } catch {
    // catalog unavailable in some test contexts
  }

  if (user?.role) {
    const normalizedUserRole = normalizeEmergencyRole(user.role);
    if (Object.values(EMERGENCY_ROLE_IDS).includes(normalizedUserRole)) {
      return normalizedUserRole;
    }
  }

  const fallbackProfileId = explicitProfileId || rolesConfig.defaultRoleProfileId;
  if (fallbackProfileId && mapping[fallbackProfileId]) {
    return normalizeEmergencyRole(mapping[fallbackProfileId]);
  }

  if (
    fallbackProfileId &&
    Object.values(EMERGENCY_ROLE_IDS).includes(normalizeEmergencyRole(fallbackProfileId))
  ) {
    return normalizeEmergencyRole(fallbackProfileId);
  }

  return normalizeEmergencyRole(fallbackProfileId);
}

export function getEmergencyRoleDefinition(role) {
  const normalizedRole = normalizeEmergencyRole(role);
  const base = EMERGENCY_ROLE_DEFINITIONS[normalizedRole];
  if (!base) return undefined;
  if (!roleDefinitionLandingCache.has(normalizedRole)) {
    roleDefinitionLandingCache.set(
      normalizedRole,
      Object.freeze({
        ...base,
        defaultRoute: resolveRoleLandingRoute({
          role: normalizedRole,
          readOnly: Boolean(base.readOnly),
        }),
      }),
    );
  }
  return roleDefinitionLandingCache.get(normalizedRole);
}

export function getEmergencyDemoRoles() {
  return Object.values(EMERGENCY_ROLE_DEFINITIONS).map((definition) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
  }));
}

export function isEmergencyReadOnlyRole(role) {
  return Boolean(getEmergencyRoleDefinition(role)?.readOnly);
}

export function buildEmergencyPermissionContext(role, context: any = {}) {
  const normalizedRole = normalizeEmergencyRole(role);
  return {
    roleReadOnly: isEmergencyReadOnlyRole(normalizedRole),
    ...context,
  };
}

export function hasEmergencyActionPermission(
  role,
  action,
  permissionsOverrides: any = {},
  context: any = {},
) {
  if (!action) return false;
  const normalizedRole = normalizeEmergencyRole(role);
  return hasEmergencyPermission(
    normalizedRole,
    action,
    permissionsOverrides,
    buildEmergencyPermissionContext(normalizedRole, context),
  );
}

export function canPerformEmergencyAction(
  role,
  action,
  permissionsOverrides: any = {},
  context: any = {},
) {
  if (!action) return false;
  const normalizedRole = normalizeEmergencyRole(role);
  return canPerformEmergencyMutation(
    normalizedRole,
    action,
    permissionsOverrides,
    buildEmergencyPermissionContext(normalizedRole, context),
  );
}

export function canMutateEmergencySurface(role, context: any = {}) {
  const normalizedRole = normalizeEmergencyRole(role);
  const permissionContext = buildEmergencyPermissionContext(normalizedRole, context);
  if (permissionContext.roleReadOnly) return false;
  if (isPublicDisplayContext(permissionContext)) return false;
  if (isReadOnlyOperationalContext(permissionContext)) return false;
  return true;
}

export function canAccessEmergencyRoute(role, path) {
  const definition = getEmergencyRoleDefinition(role);
  if (!definition || !path) return false;
  const normalizedPath = String(path).split('?')[0];
  return definition.routes.some(
    (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );
}

export function getNearestEmergencyRoute(role, preferredPath) {
  const definition = getEmergencyRoleDefinition(role);
  if (!definition) return getPlatformHomeRoute();
  if (preferredPath && canAccessEmergencyRoute(role, preferredPath)) return preferredPath;
  return getEmergencyRoleHomeRoute(role);
}

export function getEmergencyRoleHomeRoute(role, emergencySettings: any = {}) {
  return resolveRoleLandingRoute({
    role,
    emergencySettings,
    readOnly: isEmergencyReadOnlyRole(role),
  });
}

/** Fastest reception create — express registration modal on reception workspace. */
export function getReceptionExpressCreatePath() {
  return `${CANONICAL_ROUTES.emergencyReception}?express=1`;
}

/** Embedded Smart Intake on reception — zero route hops from arrival dashboard. */
export function getReceptionEmbeddedIntakePath(options: any = {}) {
  const params = new URLSearchParams({ intake: '1', autostart: '1' });
  if (options.step) params.set('step', options.step);
  if (options.mode) params.set('mode', options.mode);
  if (options.patientId) params.set('patientId', options.patientId);
  if (options.emsArrivalId) params.set('emsArrivalId', options.emsArrivalId);
  if (options.artifactId) params.set('artifactId', options.artifactId);
  return `${CANONICAL_ROUTES.emergencyReception}?${params.toString()}`;
}

export function getReceptionSmartIntakePath(options: any = {}) {
  return getReceptionEmbeddedIntakePath(options);
}

/** Primary reception create path — embedded Smart Intake (legacy alias). */
export function getReceptionQuickCreatePath() {
  return getReceptionEmbeddedIntakePath();
}

/** Role-aware fastest create path — express for registration clerk, Smart Intake for others. */
export function getReceptionPrimaryCreatePath(role) {
  if (isRegistrationClerkRole(role)) {
    return getReceptionExpressCreatePath();
  }
  return getReceptionEmbeddedIntakePath();
}

/** Walk-in demographics shortcut without the identity wizard. */
export function getReceptionWalkInQuickPath() {
  return `${CANONICAL_ROUTES.emergencyReception}?quickCreate=1`;
}

export function isRegistrationClerkRole(role) {
  return normalizeEmergencyRole(role) === EMERGENCY_ROLE_IDS.registrationClerk;
}

export function isReceptionScreenMode(screenMode) {
  return normalizeCareDroidScreenMode(screenMode) === CARE_DROID_SCREEN_MODES.reception;
}

export function isTriageScreenMode(screenMode) {
  return normalizeCareDroidScreenMode(screenMode) === CARE_DROID_SCREEN_MODES.triage;
}

export function getTriagePrimaryLandingPath(role, patientId) {
  if (
    normalizeEmergencyRole(role) === EMERGENCY_ROLE_IDS.triageNurse ||
    isTriageScreenMode(role)
  ) {
    return getTriagePendingQueuePath(patientId);
  }
  return getEmergencyRoleHomeRoute(role);
}

export function prefersReceptionForPatientCreate(role, screenMode: any = undefined) {
  const normalizedRole = normalizeEmergencyRole(role);
  if (normalizedRole === EMERGENCY_ROLE_IDS.emsUser) return false;
  if (screenMode && isPhysicianScreenMode(screenMode)) return false;
  if (screenMode && isReceptionScreenMode(screenMode)) {
    return hasEmergencyActionPermission(role, EMERGENCY_ACTIONS.createPatient);
  }
  if (
    isReceptionFirstUxEnabled() &&
    RECEPTION_FIRST_UX.routeAllIntakeThroughReception &&
    canAccessEmergencyRoute(role, RECEPTION_FIRST_UX.platformHomeRoute)
  ) {
    return hasEmergencyActionPermission(role, EMERGENCY_ACTIONS.createPatient);
  }
  return hasEmergencyActionPermission(role, EMERGENCY_ACTIONS.createPatient);
}

export function prefersReceptionForPatientSearch(role, screenMode: any = undefined) {
  if (screenMode && isPhysicianScreenMode(screenMode)) return false;
  if (screenMode && isReceptionScreenMode(screenMode)) return true;
  if (
    isReceptionFirstUxEnabled() &&
    RECEPTION_FIRST_UX.routePatientSearchThroughReception &&
    canAccessEmergencyRoute(role, RECEPTION_FIRST_UX.platformHomeRoute)
  ) {
    return true;
  }
  return isRegistrationClerkRole(role);
}

export function shouldHideStandaloneIntakeNav(role) {
  const normalizedRole = normalizeEmergencyRole(role);
  return (
    isRegistrationClerkRole(normalizedRole) ||
    normalizedRole === EMERGENCY_ROLE_IDS.triageNurse ||
    normalizedRole === EMERGENCY_ROLE_IDS.chargeNurse ||
    normalizedRole === EMERGENCY_ROLE_IDS.edManager ||
    normalizedRole === EMERGENCY_ROLE_IDS.admin ||
    normalizedRole === EMERGENCY_ROLE_IDS.physician ||
    normalizedRole === EMERGENCY_ROLE_IDS.readOnlyViewer
  );
}

export function getVisibleEmergencyNavigationItems(role, items) {
  const normalizedRole = normalizeEmergencyRole(role);
  return (items || []).filter((item) => {
    if (item.id === 'intake' && shouldHideStandaloneIntakeNav(normalizedRole)) return false;
    return item.roles?.length
      ? item.roles.includes(normalizedRole)
      : canAccessEmergencyRoute(role, item.path);
  });
}

export function canExecuteEmergencyCommand(role, command, context: any = {}, permissionsOverrides: any = {}) {
  if (!command) return false;
  if (command.requiredAction) {
    const presentation = presentEmergencyRoleAction(
      role,
      command.requiredAction,
      permissionsOverrides,
      context,
    );
    if (!presentation.visible || !presentation.enabled) return false;
  }
  const commandPath = command.path || command.build?.('')?.path;
  if (commandPath && !canAccessEmergencyRoute(role, commandPath)) return false;
  return true;
}

export {
  EMERGENCY_ROLE_ACTIONS,
  EMERGENCY_ROLE_ACTION_MATRIX,
  EMERGENCY_ROLE_ACTION_PERMISSION,
  presentEmergencyRoleAction,
  resolveEmergencyRoleActionState,
  resolveRoleActionId,
  isEmergencyActionVisible,
  isEmergencyActionEnabled,
  isEmergencyActionReadOnly,
} from './emergencyRoleActionMatrix';

export {
  isPublicDisplayPersona,
  resolveRoleLandingRoute,
  resolveRoleLandingScreenMode,
  resolveRoleHomeNavItemId,
} from './emergencyRoleNavigationModel';
