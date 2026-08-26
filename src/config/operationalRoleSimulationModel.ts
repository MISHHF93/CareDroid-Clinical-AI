/**
 * Operational role simulation — single contract for verifying that every hospital
 * persona lands on the right surface, sees coherent navigation, permissions, command
 * bars, AI/workflow affordances, and backend integration for one ED workflow spine.
 */
import {
  CANONICAL_ROUTE_MAP,
  CANONICAL_ROUTES,
  getDefaultRouteForProfile,
  getRouteById,
  USER_PROFILE_ROUTE_POLICIES,
} from './routes.config';
import {
  compileCareDroidAccessProfile,
  canAccessRoute,
  canSeeNavigationItem,
  getCanonicalRoleMapping,
  normalizeCareDroidProfile,
} from '../lib/users/canonicalAccess';
import { getPermissionsForRole } from '../lib/users/permissions';
import type { HospitalRole } from '../lib/users/userTypes';
import { getHomeRouteForRole, getNavItemIdsForRole } from './roleClusterNav.config';
import { resolveRoleLandingRoute } from './emergencyRoleNavigationModel';
import { getPractitionerSurfaceVisibility } from './practitionerSurfaceVisibility';
import { NAVIGATION_ITEMS } from './unified-navigation.config';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import { WORKFLOW_AUTOMATION_TRIGGER_EVENTS } from './unifiedWorkflowAutomationModel';

export const OPERATIONAL_WORKFLOW_SPINE = Object.freeze([
  'reception',
  'ems',
  'triage',
  'clinical-care',
  'diagnostics',
  'flow-coordination',
  'reporting',
] as const);

export type OperationalWorkflowSpinePhase = (typeof OPERATIONAL_WORKFLOW_SPINE)[number];

/** Hospital personas requested for end-to-end operational simulation. */
export const SIMULATED_OPERATIONAL_ROLE_IDS = Object.freeze([
  'registration_clerk',
  'dispatcher',
  'ems_coordinator',
  'triage_nurse',
  'charge_nurse',
  'emergency_physician',
  'specialist',
  'pharmacist',
  'radiology_technician',
  'lab_technician',
  'patient_flow_coordinator',
  'hospital_admin',
  'it_admin',
  'demo_observer',
] as const);

export type SimulatedOperationalRoleId = (typeof SIMULATED_OPERATIONAL_ROLE_IDS)[number];

export type OperationalCommandBarVisibility = Readonly<{
  journey: boolean;
  aiChief: boolean;
  threeMinuteMission: boolean;
  workflowAutomation: boolean;
}>;

export type OperationalRoleSimulation = Readonly<{
  profileId: SimulatedOperationalRoleId;
  label: string;
  emergencyRoleId: string;
  homeRoute: string;
  landingRoute: string;
  navItemIds: readonly string[];
  visibleNavRoutes: readonly string[];
  workflowSpinePhases: readonly OperationalWorkflowSpinePhase[];
  commandBars: OperationalCommandBarVisibility;
  readOnly: boolean;
  alertActions: readonly string[];
  aiChiefActions: readonly string[];
  backendEndpoints: readonly string[];
  permissions: readonly string[];
  accessibilityLandmarks: readonly string[];
}>;

const ROLE_LABELS: Readonly<Record<SimulatedOperationalRoleId, string>> = Object.freeze({
  registration_clerk: 'Reception',
  dispatcher: 'Dispatcher',
  ems_coordinator: 'EMS Coordinator',
  triage_nurse: 'Triage Nurse',
  charge_nurse: 'Charge Nurse',
  emergency_physician: 'Emergency Physician',
  specialist: 'Specialist',
  pharmacist: 'Pharmacist',
  radiology_technician: 'Radiology',
  lab_technician: 'Laboratory',
  patient_flow_coordinator: 'Patient Flow Coordinator',
  hospital_admin: 'Hospital Administrator',
  it_admin: 'IT Administrator',
  demo_observer: 'Demo Observer',
});

const WORKFLOW_SPINE_BY_ROLE: Readonly<Record<SimulatedOperationalRoleId, readonly OperationalWorkflowSpinePhase[]>> =
  Object.freeze({
    registration_clerk: ['reception'],
    dispatcher: ['ems', 'reception'],
    ems_coordinator: ['ems', 'triage', 'flow-coordination'],
    triage_nurse: ['reception', 'triage', 'clinical-care'],
    charge_nurse: ['triage', 'clinical-care', 'flow-coordination'],
    emergency_physician: ['clinical-care', 'diagnostics', 'reporting'],
    specialist: ['clinical-care', 'diagnostics'],
    pharmacist: ['diagnostics', 'clinical-care'],
    radiology_technician: ['diagnostics'],
    lab_technician: ['diagnostics'],
    patient_flow_coordinator: ['flow-coordination', 'reporting', 'triage'],
    hospital_admin: ['flow-coordination', 'reporting'],
    it_admin: ['reporting'],
    demo_observer: ['clinical-care'],
  });

const SPINE_ROUTE_ANCHORS: Readonly<Record<OperationalWorkflowSpinePhase, string>> = Object.freeze({
  reception: CANONICAL_ROUTES.emergencyReception,
  ems: CANONICAL_ROUTES.emergencyEms,
  triage: CANONICAL_ROUTES.emergencyQueues,
  'clinical-care': CANONICAL_ROUTES.emergencyWhiteboard,
  diagnostics: CANONICAL_ROUTES.emergencyDiagnostics,
  'flow-coordination': CANONICAL_ROUTES.emergencyCapacity,
  reporting: CANONICAL_ROUTES.emergencyReports,
});

const BACKEND_ENDPOINTS_BY_ROLE: Readonly<Record<SimulatedOperationalRoleId, readonly string[]>> =
  Object.freeze({
    registration_clerk: [
      EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
      EMERGENCY_OS_API_ENDPOINTS.operatingSurface,
    ],
    dispatcher: [EMERGENCY_OS_API_ENDPOINTS.ems, EMERGENCY_OS_API_ENDPOINTS.operatingSurface],
    ems_coordinator: [
      EMERGENCY_OS_API_ENDPOINTS.ems,
      EMERGENCY_OS_API_ENDPOINTS.capacity,
      EMERGENCY_OS_API_ENDPOINTS.operatingSurface,
    ],
    triage_nurse: [
      EMERGENCY_OS_API_ENDPOINTS.triageAssist,
      EMERGENCY_OS_API_ENDPOINTS.reassessment,
      EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    ],
    charge_nurse: [
      EMERGENCY_OS_API_ENDPOINTS.patientFlow,
      EMERGENCY_OS_API_ENDPOINTS.capacity,
      EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    ],
    emergency_physician: [
      EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceSnapshot,
      EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    ],
    specialist: [EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration],
    pharmacist: [EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration],
    radiology_technician: [EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration],
    lab_technician: [EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration],
    patient_flow_coordinator: [
      EMERGENCY_OS_API_ENDPOINTS.patientFlow,
      EMERGENCY_OS_API_ENDPOINTS.queues,
      EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    ],
    hospital_admin: [
      EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceSnapshot,
      EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    ],
    it_admin: [EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceModelHealth],
    demo_observer: [EMERGENCY_OS_API_ENDPOINTS.operatingSurface],
  });

const ACCESSIBILITY_LANDMARKS = Object.freeze([
  'Operational command bars',
  'Primary navigation',
  'Operational alarm dock',
]);

function buildDemoProfile(roleId: SimulatedOperationalRoleId) {
  return normalizeCareDroidProfile({
    id: `sim-${roleId}`,
    employeeId: `SIM-${roleId}`,
    fullName: ROLE_LABELS[roleId],
    preferredName: ROLE_LABELS[roleId],
    email: `${roleId}@simulation.caredroid.local`,
    phone: '555-0199',
    avatarUrl: '',
    role: roleId as HospitalRole,
    title: ROLE_LABELS[roleId],
    department: 'Emergency Department',
    hospitalSite: 'Central City Hospital',
    cityZone: 'Central',
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    licenseNumber: '',
    specialties: [],
    availabilityStatus: 'available',
    escalationLevel: 'none',
    permissions: getPermissionsForRole(roleId),
    assignedPatients: [],
    currentLoad: 0,
    lastActiveAt: new Date().toISOString(),
  });
}

function resolveCommandBarVisibility(
  roleId: SimulatedOperationalRoleId,
  emergencyRoleId: string,
  readOnly: boolean,
): OperationalCommandBarVisibility {
  const surfaces = getPractitionerSurfaceVisibility({ role: emergencyRoleId });
  const emergencyRoutes = surfaces.emergencyRoutes;
  const isKioskObserver = roleId === 'demo_observer' || readOnly;
  return Object.freeze({
    journey: emergencyRoutes.showJourneyRail && !isKioskObserver,
    aiChief: emergencyRoutes.showAiChiefBar && !isKioskObserver,
    threeMinuteMission: emergencyRoutes.showThreeMinuteMissionBar && !isKioskObserver,
    workflowAutomation: emergencyRoutes.showWorkflowAutomationBar && !isKioskObserver,
  });
}

function resolveVisibleNavRoutes(
  profileId: SimulatedOperationalRoleId,
  navItemIds: readonly string[],
): readonly string[] {
  const compiled = compileCareDroidAccessProfile(buildDemoProfile(profileId));
  return Object.freeze(
    navItemIds
      .map((id) => getRouteById(id)?.path || NAVIGATION_ITEMS.find((item) => item.id === id)?.route)
      .filter((route): route is string => Boolean(route))
      .filter((route) => canAccessRoute(compiled, route)),
  );
}

export function simulateOperationalRole(profileId: SimulatedOperationalRoleId): OperationalRoleSimulation {
  const mapping = getCanonicalRoleMapping(profileId);
  const routePolicy = USER_PROFILE_ROUTE_POLICIES[profileId];
  const homeRoute = getHomeRouteForRole(profileId);
  const landingRoute = resolveRoleLandingRoute({ role: profileId });
  const navItemIds = getNavItemIdsForRole(profileId);

  return Object.freeze({
    profileId,
    label: ROLE_LABELS[profileId],
    emergencyRoleId: mapping.emergencyRoleId,
    homeRoute,
    landingRoute,
    navItemIds,
    visibleNavRoutes: resolveVisibleNavRoutes(profileId, navItemIds),
    workflowSpinePhases: WORKFLOW_SPINE_BY_ROLE[profileId],
    commandBars: resolveCommandBarVisibility(profileId, mapping.emergencyRoleId, mapping.readOnly),
    readOnly: mapping.readOnly,
    alertActions: Object.freeze([...(routePolicy?.allowedAlertActions || [])]),
    aiChiefActions: Object.freeze([...(routePolicy?.allowedAiChiefActions || [])]),
    backendEndpoints: BACKEND_ENDPOINTS_BY_ROLE[profileId],
    permissions: getPermissionsForRole(profileId),
    accessibilityLandmarks: ACCESSIBILITY_LANDMARKS,
  });
}

export function listOperationalRoleSimulations(): readonly OperationalRoleSimulation[] {
  return Object.freeze(SIMULATED_OPERATIONAL_ROLE_IDS.map(simulateOperationalRole));
}

export function validateOperationalRoleCoherence(profileId: SimulatedOperationalRoleId): string[] {
  const issues: string[] = [];
  const simulation = simulateOperationalRole(profileId);
  const compiled = compileCareDroidAccessProfile(buildDemoProfile(profileId));

  const expectedLanding = getDefaultRouteForProfile(profileId);
  if (simulation.landingRoute !== expectedLanding) {
    issues.push(`${profileId}: landing route ${simulation.landingRoute} !== ${expectedLanding}`);
  }
  if (simulation.homeRoute !== expectedLanding) {
    issues.push(`${profileId}: home route ${simulation.homeRoute} !== ${expectedLanding}`);
  }

  for (const navId of simulation.navItemIds) {
    const routeRecord = getRouteById(navId);
    if (!routeRecord) {
      issues.push(`${profileId}: unknown nav item id ${navId}`);
      continue;
    }
    const navItem = NAVIGATION_ITEMS.find((item) => item.id === navId);
    if (navItem && !canSeeNavigationItem(compiled, navItem)) {
      issues.push(`${profileId}: cannot access nav item ${navId} (${routeRecord.path})`);
    }
  }

  if (!simulation.navItemIds.includes('help')) {
    issues.push(`${profileId}: help nav item missing from curated nav`);
  }

  for (const phase of simulation.workflowSpinePhases) {
    const anchor = SPINE_ROUTE_ANCHORS[phase];
    const reachable =
      canAccessRoute(compiled, anchor) ||
      simulation.visibleNavRoutes.some((route) => route === anchor || route.startsWith(`${anchor}/`));
    if (!reachable) {
      issues.push(`${profileId}: workflow spine phase "${phase}" not reachable via ${anchor}`);
    }
  }

  if (simulation.readOnly) {
    const mutatingRoutes = simulation.visibleNavRoutes.filter(
      (route) => route === CANONICAL_ROUTES.emergencySettings,
    );
    if (mutatingRoutes.length > 0 && profileId !== 'it_admin') {
      issues.push(`${profileId}: read-only persona exposes mutating route ${mutatingRoutes.join(', ')}`);
    }
  }

  if (!WORKFLOW_AUTOMATION_TRIGGER_EVENTS.length) {
    issues.push(`${profileId}: workflow trigger events unavailable`);
  }

  const homeRecord = CANONICAL_ROUTE_MAP.find((record) => record.path === simulation.homeRoute.split('?')[0]);
  if (homeRecord && !homeRecord.allowedRoles.map((r) => r.replace(/-/g, '_')).includes(profileId)) {
    issues.push(`${profileId}: home route ${simulation.homeRoute} not in allowedRoles`);
  }

  return issues;
}

export function validateAllOperationalRolesCoherent(): Readonly<Record<SimulatedOperationalRoleId, string[]>> {
  return Object.freeze(
    SIMULATED_OPERATIONAL_ROLE_IDS.reduce(
      (acc, roleId) => {
        acc[roleId] = validateOperationalRoleCoherence(roleId);
        return acc;
      },
      {} as Record<SimulatedOperationalRoleId, string[]>,
    ),
  );
}