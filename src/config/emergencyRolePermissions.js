import { CANONICAL_ROUTES } from './routes.config';

export const EMERGENCY_ROLE_IDS = Object.freeze({
  admin: 'admin',
  edManager: 'ed_manager',
  chargeNurse: 'charge_nurse',
  triageNurse: 'triage_nurse',
  physician: 'physician',
  registrationClerk: 'registration_clerk',
  emsUser: 'ems_user',
  readOnlyViewer: 'read_only_viewer',
});

export const EMERGENCY_ROLE_LABELS = Object.freeze({
  [EMERGENCY_ROLE_IDS.admin]: 'Admin',
  [EMERGENCY_ROLE_IDS.edManager]: 'ED Manager',
  [EMERGENCY_ROLE_IDS.chargeNurse]: 'Charge Nurse',
  [EMERGENCY_ROLE_IDS.triageNurse]: 'Triage Nurse',
  [EMERGENCY_ROLE_IDS.physician]: 'Physician',
  [EMERGENCY_ROLE_IDS.registrationClerk]: 'Registration Clerk',
  [EMERGENCY_ROLE_IDS.emsUser]: 'EMS User',
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: 'Read-Only Viewer',
});

export const EMERGENCY_ACTIONS = Object.freeze({
  createPatient: 'patient.create',
  verifyIntake: 'intake.verify',
  triage: 'triage.manage',
  transitionPatient: 'patient.transition',
  writeVitals: 'vitals.write',
  writeNote: 'notes.write',
  manageFlags: 'flags.manage',
  assignStaff: 'patient.assignStaff',
  assignRoom: 'patient.assignRoom',
  escalatePatient: 'patient.escalate',
  dischargePatient: 'patient.discharge',
  prepareEmsBay: 'ems.prepareBay',
  convertEmsArrival: 'ems.convertArrival',
  completeEmsHandoff: 'ems.completeHandoff',
  manageReferral: 'referrals.manage',
  manageTransfer: 'transfers.manage',
  manageCapacity: 'capacity.manage',
  manageBoarding: 'boarding.manage',
  reassignWorkload: 'workload.reassign',
  useCopilot: 'copilot.use',
  viewAnalytics: 'analytics.view',
  runSimulation: 'simulation.run',
  // Future module
  manageFederatedLearning: 'federated.manage',
  // Future module
  runDigitalTwin: 'digitalTwin.run',
  manageSettings: 'settings.manage',
  // Future module
  viewAiGovernance: 'aiGovernance.view',
});

const ROUTES = Object.freeze({
  whiteboard: CANONICAL_ROUTES.emergencyWhiteboard,
  pulse: CANONICAL_ROUTES.emergencyPulse,
  patients: CANONICAL_ROUTES.emergencyPatients,
  journey: CANONICAL_ROUTES.emergencyJourney,
  ems: CANONICAL_ROUTES.emergencyEms,
  intake: CANONICAL_ROUTES.emergencyIntake,
  queues: CANONICAL_ROUTES.emergencyQueues,
  reassessment: CANONICAL_ROUTES.emergencyReassessment,
  capacity: CANONICAL_ROUTES.emergencyCapacity,
  boarding: CANONICAL_ROUTES.emergencyBoarding,
  referrals: CANONICAL_ROUTES.emergencyReferrals,
  provincialHealth: CANONICAL_ROUTES.emergencyProvincialHealth,
  integrations: CANONICAL_ROUTES.emergencyIntegrations,
  copilot: CANONICAL_ROUTES.emergencyCopilot,
  analytics: CANONICAL_ROUTES.emergencyAnalytics,
  simulation: CANONICAL_ROUTES.emergencySimulation,
  // Future module
  federatedLearning: CANONICAL_ROUTES.emergencyFederatedLearning,
  // Future module
  digitalTwin: CANONICAL_ROUTES.emergencyDigitalTwin,
  tools: CANONICAL_ROUTES.emergencyTools,
  shift: CANONICAL_ROUTES.emergencyShift,
  // Future module
  aiGovernance: CANONICAL_ROUTES.emergencyAiGovernance,
  // Future module
  aiGovernanceGlobal: CANONICAL_ROUTES.aiGovernance,
  settings: CANONICAL_ROUTES.emergencySettings,
});

const ALL_ROUTES = Object.freeze([
  ROUTES.whiteboard,
  ROUTES.patients,
  ROUTES.ems,
  ROUTES.intake,
  ROUTES.queues,
  ROUTES.reassessment,
  ROUTES.capacity,
  ROUTES.boarding,
  ROUTES.referrals,
  ROUTES.copilot,
  ROUTES.tools,
  ROUTES.analytics,
  ROUTES.settings,
]);
const CENTRAL_READABLE_ROUTES = Object.freeze(
  ALL_ROUTES.filter((route) => route !== ROUTES.settings),
);
const FUTURE_MODULE_ACTIONS = Object.freeze([
  EMERGENCY_ACTIONS.manageFederatedLearning,
  EMERGENCY_ACTIONS.runDigitalTwin,
  EMERGENCY_ACTIONS.viewAiGovernance,
]);
const ALL_ACTIONS = Object.freeze(
  Object.values(EMERGENCY_ACTIONS).filter((action) => !FUTURE_MODULE_ACTIONS.includes(action)),
);
const CLINICAL_VIEW_ROUTES = Object.freeze([
  ROUTES.whiteboard,
  ROUTES.patients,
  ROUTES.queues,
  ROUTES.reassessment,
  ROUTES.capacity,
  ROUTES.boarding,
  ROUTES.referrals,
  ROUTES.copilot,
  ROUTES.tools,
  ROUTES.analytics,
]);
const OPERATIONS_VIEW_ROUTES = Object.freeze([
  ROUTES.whiteboard,
  ROUTES.patients,
  ROUTES.ems,
  ROUTES.intake,
  ROUTES.queues,
  ROUTES.reassessment,
  ROUTES.capacity,
  ROUTES.boarding,
  ROUTES.referrals,
  ROUTES.copilot,
  ROUTES.tools,
  ROUTES.analytics,
]);

export const EMERGENCY_ROLE_DEFINITIONS = Object.freeze({
  [EMERGENCY_ROLE_IDS.admin]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.admin,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.admin],
    description:
      'Full Emergency OS administration, settings, governance, and clinical operations access.',
    routes: ALL_ROUTES,
    actions: ALL_ACTIONS,
    defaultRoute: ROUTES.whiteboard,
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
    defaultRoute: ROUTES.whiteboard,
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
    defaultRoute: ROUTES.whiteboard,
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
      ROUTES.intake,
      ROUTES.queues,
      ROUTES.reassessment,
      ROUTES.copilot,
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
    defaultRoute: ROUTES.whiteboard,
  }),
  [EMERGENCY_ROLE_IDS.physician]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.physician,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.physician],
    description:
      'Clinical decision role for patient review, state movement, referrals, reassessment, tools, and AI support.',
    routes: [...CLINICAL_VIEW_ROUTES, ROUTES.copilot, ROUTES.analytics],
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
    defaultRoute: ROUTES.whiteboard,
  }),
  [EMERGENCY_ROLE_IDS.registrationClerk]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.registrationClerk,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.registrationClerk],
    description:
      'Registration role for identity review and patient creation without clinical state management.',
    routes: [
      ROUTES.whiteboard,
      ROUTES.patients,
      ROUTES.intake,
      ROUTES.queues,
    ],
    actions: [EMERGENCY_ACTIONS.createPatient, EMERGENCY_ACTIONS.verifyIntake],
    defaultRoute: ROUTES.intake,
  }),
  [EMERGENCY_ROLE_IDS.emsUser]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.emsUser,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.emsUser],
    description:
      'EMS coordination role for inbound units, bay preparation, and handoff completion.',
    routes: [ROUTES.ems, ROUTES.whiteboard, ROUTES.patients, ROUTES.capacity],
    actions: [
      EMERGENCY_ACTIONS.prepareEmsBay,
      EMERGENCY_ACTIONS.convertEmsArrival,
      EMERGENCY_ACTIONS.completeEmsHandoff,
      EMERGENCY_ACTIONS.createPatient,
    ],
    defaultRoute: ROUTES.ems,
  }),
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: Object.freeze({
    id: EMERGENCY_ROLE_IDS.readOnlyViewer,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.readOnlyViewer],
    description: 'Observer role with Emergency OS visibility and no mutating actions.',
    routes: [
      ROUTES.whiteboard,
      ROUTES.patients,
      ROUTES.ems,
      ROUTES.queues,
      ROUTES.reassessment,
      ROUTES.capacity,
      ROUTES.boarding,
      ROUTES.referrals,
      ROUTES.analytics,
    ],
    actions: [EMERGENCY_ACTIONS.viewAnalytics],
    defaultRoute: ROUTES.whiteboard,
    readOnly: true,
  }),
});

const ROLE_ALIASES = Object.freeze({
  admin: EMERGENCY_ROLE_IDS.admin,
  administrator: EMERGENCY_ROLE_IDS.admin,
  'ed manager': EMERGENCY_ROLE_IDS.edManager,
  ed_manager: EMERGENCY_ROLE_IDS.edManager,
  edmanager: EMERGENCY_ROLE_IDS.edManager,
  manager: EMERGENCY_ROLE_IDS.edManager,
  charge: EMERGENCY_ROLE_IDS.chargeNurse,
  'charge nurse': EMERGENCY_ROLE_IDS.chargeNurse,
  charge_nurse: EMERGENCY_ROLE_IDS.chargeNurse,
  nurse: EMERGENCY_ROLE_IDS.chargeNurse,
  'triage nurse': EMERGENCY_ROLE_IDS.triageNurse,
  triage_nurse: EMERGENCY_ROLE_IDS.triageNurse,
  triage: EMERGENCY_ROLE_IDS.triageNurse,
  physician: EMERGENCY_ROLE_IDS.physician,
  doctor: EMERGENCY_ROLE_IDS.physician,
  md: EMERGENCY_ROLE_IDS.physician,
  'registration clerk': EMERGENCY_ROLE_IDS.registrationClerk,
  registration_clerk: EMERGENCY_ROLE_IDS.registrationClerk,
  clerk: EMERGENCY_ROLE_IDS.registrationClerk,
  registrar: EMERGENCY_ROLE_IDS.registrationClerk,
  ems: EMERGENCY_ROLE_IDS.emsUser,
  'ems user': EMERGENCY_ROLE_IDS.emsUser,
  ems_user: EMERGENCY_ROLE_IDS.emsUser,
  paramedic: EMERGENCY_ROLE_IDS.emsUser,
  viewer: EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read only': EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read only viewer': EMERGENCY_ROLE_IDS.readOnlyViewer,
  'read-only viewer': EMERGENCY_ROLE_IDS.readOnlyViewer,
  read_only_viewer: EMERGENCY_ROLE_IDS.readOnlyViewer,
  readonly: EMERGENCY_ROLE_IDS.readOnlyViewer,
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

export function getEmergencyRoleDefinition(role) {
  return EMERGENCY_ROLE_DEFINITIONS[normalizeEmergencyRole(role)];
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

export function hasEmergencyActionPermission(role, action) {
  const definition = getEmergencyRoleDefinition(role);
  if (!definition || !action) return false;
  return definition.actions.includes(action);
}

export function canAccessEmergencyRoute(role, path) {
  const definition = getEmergencyRoleDefinition(role);
  if (!definition || !path) return false;
  const normalizedPath = String(path).split('?')[0];
  if (
    CENTRAL_READABLE_ROUTES.some(
      (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`),
    )
  ) {
    return true;
  }
  return definition.routes.some(
    (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );
}

export function getNearestEmergencyRoute(role, preferredPath) {
  const definition = getEmergencyRoleDefinition(role);
  if (!definition) return CANONICAL_ROUTES.emergencyWhiteboard;
  if (preferredPath && canAccessEmergencyRoute(role, preferredPath)) return preferredPath;
  return definition.defaultRoute || definition.routes[0] || CANONICAL_ROUTES.emergencyWhiteboard;
}

export function getVisibleEmergencyNavigationItems(role, items) {
  return (items || []).filter((item) => canAccessEmergencyRoute(role, item.path));
}

export function canExecuteEmergencyCommand(role, command) {
  if (!command) return false;
  if (command.requiredAction && !hasEmergencyActionPermission(role, command.requiredAction))
    return false;
  const commandPath = command.path || command.build?.('')?.path;
  if (commandPath && !canAccessEmergencyRoute(role, commandPath)) return false;
  return true;
}
