import { CANONICAL_ROUTES } from '../config/routes.config';
import type { HospitalRole } from './users/userTypes';
import { CAREDROID_PERMISSIONS, getPermissionsForRole } from './users/permissions';

const P = CAREDROID_PERMISSIONS;

export type RouteAccessEntry = Readonly<{
  path: string;
  label: string;
  allowedRoles: readonly HospitalRole[];
  requiredPermissions: readonly string[];
  navVisible: boolean;
  priority: number;
}>;

const CLINICAL_ROLES: readonly HospitalRole[] = [
  'super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'registered_nurse',
  'emergency_physician', 'attending_physician', 'resident_physician', 'specialist',
  'paramedic',
];

const CLINICAL_AND_OPS_ROLES: readonly HospitalRole[] = [
  ...CLINICAL_ROLES,
  'hospital_admin', 'patient_flow_coordinator',
];

const ALL_ROLES: readonly HospitalRole[] = [
  'super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'triage_nurse',
  'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician',
  'specialist', 'paramedic', 'registration_clerk', 'patient_flow_coordinator',
  'lab_technician', 'radiology_technician', 'pharmacist', 'social_worker',
  'security_officer', 'it_admin', 'quality_safety_officer', 'demo_observer',
];

export const ROUTE_ACCESS_CONFIG: readonly RouteAccessEntry[] = Object.freeze([
  {
    path: CANONICAL_ROUTES.emergencyReception,
    label: 'Reception',
    allowedRoles: ALL_ROLES,
    requiredPermissions: [P.PATIENT_READ],
    navVisible: true,
    priority: 10,
  },
  {
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    label: 'Whiteboard',
    allowedRoles: CLINICAL_AND_OPS_ROLES,
    requiredPermissions: [P.PATIENT_READ],
    navVisible: true,
    priority: 20,
  },
  {
    path: CANONICAL_ROUTES.emergencyIntake,
    label: 'Intake',
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse',
      'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician',
      'registration_clerk', 'paramedic'],
    requiredPermissions: [P.PATIENT_CREATE],
    navVisible: false,
    priority: 15,
  },
  {
    path: CANONICAL_ROUTES.emergencyQueues,
    label: 'Queues',
    allowedRoles: CLINICAL_AND_OPS_ROLES,
    requiredPermissions: [P.PATIENT_READ, P.TRIAGE_READ],
    navVisible: true,
    priority: 30,
  },
  {
    path: CANONICAL_ROUTES.emergencyReassessment,
    label: 'Reassessment',
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse',
      'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician'],
    requiredPermissions: [P.PATIENT_READ, P.TRIAGE_READ],
    navVisible: true,
    priority: 35,
  },
  {
    path: CANONICAL_ROUTES.emergencyEms,
    label: 'EMS',
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse',
      'emergency_physician', 'attending_physician', 'paramedic', 'registration_clerk'],
    requiredPermissions: [P.PATIENT_READ],
    navVisible: true,
    priority: 40,
  },
  {
    path: CANONICAL_ROUTES.emergencyCapacity,
    label: 'Flow & Capacity',
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse',
      'patient_flow_coordinator'],
    requiredPermissions: [P.ANALYTICS_READ],
    navVisible: true,
    priority: 45,
  },
  {
    path: CANONICAL_ROUTES.emergencyBoarding,
    label: 'Boarding',
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse',
      'patient_flow_coordinator'],
    requiredPermissions: [P.ANALYTICS_READ],
    navVisible: true,
    priority: 50,
  },
  {
    path: CANONICAL_ROUTES.emergencyReferrals,
    label: 'Referrals',
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'emergency_physician',
      'attending_physician', 'resident_physician', 'specialist'],
    requiredPermissions: [P.PATIENT_READ],
    navVisible: true,
    priority: 55,
  },
  {
    path: CANONICAL_ROUTES.emergencyAlerts,
    label: 'Alerts',
    allowedRoles: ALL_ROLES,
    requiredPermissions: [P.ALERT_READ],
    navVisible: true,
    priority: 60,
  },
  {
    path: CANONICAL_ROUTES.emergencyAnalytics,
    label: 'Analytics',
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse',
      'emergency_physician', 'attending_physician', 'patient_flow_coordinator',
      'quality_safety_officer', 'demo_observer'],
    requiredPermissions: [P.ANALYTICS_READ],
    navVisible: true,
    priority: 65,
  },
  {
    path: CANONICAL_ROUTES.emergencyCopilot,
    label: 'Copilot',
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse',
      'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician',
      'specialist', 'patient_flow_coordinator'],
    requiredPermissions: [P.AI_REQUEST],
    navVisible: true,
    priority: 70,
  },
  {
    path: CANONICAL_ROUTES.emergencyTools,
    label: 'Medical Tools',
    allowedRoles: CLINICAL_AND_OPS_ROLES,
    requiredPermissions: [P.PATIENT_READ],
    navVisible: true,
    priority: 75,
  },
  {
    path: CANONICAL_ROUTES.emergencyPulse,
    label: 'Pulse',
    allowedRoles: CLINICAL_AND_OPS_ROLES,
    requiredPermissions: [P.ANALYTICS_READ],
    navVisible: false,
    priority: 80,
  },
  {
    path: CANONICAL_ROUTES.emergencyShift,
    label: 'Shift',
    allowedRoles: CLINICAL_AND_OPS_ROLES,
    requiredPermissions: [P.STAFF_READ],
    navVisible: false,
    priority: 85,
  },
  {
    path: CANONICAL_ROUTES.emergencySettings,
    label: 'Settings',
    allowedRoles: ALL_ROLES,
    requiredPermissions: [P.SETTINGS_READ],
    navVisible: false,
    priority: 90,
  },
  {
    path: CANONICAL_ROUTES.emergencySimulation,
    label: 'Simulation',
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'it_admin',
      'quality_safety_officer'],
    requiredPermissions: [P.ANALYTICS_READ],
    navVisible: false,
    priority: 95,
  },
  {
    path: CANONICAL_ROUTES.laboratory,
    label: 'Laboratory',
    allowedRoles: ['super_admin', 'emergency_physician', 'attending_physician',
      'resident_physician', 'charge_nurse', 'lab_technician'],
    requiredPermissions: [P.LABS_READ],
    navVisible: true,
    priority: 100,
  },
  {
    path: CANONICAL_ROUTES.adminOperations,
    label: 'Admin',
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'it_admin',
      'quality_safety_officer'],
    requiredPermissions: [P.SETTINGS_READ],
    navVisible: false,
    priority: 200,
  },
  {
    path: CANONICAL_ROUTES.audit,
    label: 'Audit',
    allowedRoles: ['super_admin', 'it_admin', 'quality_safety_officer', 'hospital_admin'],
    requiredPermissions: [P.AUDIT_READ],
    navVisible: false,
    priority: 210,
  },
]);

export function getRouteAccess(path: string): RouteAccessEntry | undefined {
  const normalizedPath = path.split('?')[0];
  return ROUTE_ACCESS_CONFIG.find(
    (entry) =>
      normalizedPath === entry.path || normalizedPath.startsWith(`${entry.path}/`),
  );
}

export function canRoleAccessRoute(role: HospitalRole, path: string): boolean {
  const entry = getRouteAccess(path);
  if (!entry) return true;
  const permissions = getPermissionsForRole(role) as readonly string[];
  return (
    (entry.allowedRoles as HospitalRole[]).includes(role) &&
    entry.requiredPermissions.every((permission) => permissions.includes(permission))
  );
}

export function getNavVisibleRoutes(role: HospitalRole): RouteAccessEntry[] {
  return ROUTE_ACCESS_CONFIG.filter(
    (entry) => entry.navVisible && (entry.allowedRoles as HospitalRole[]).includes(role),
  ).sort((a, b) => a.priority - b.priority);
}

export function getUnauthorizedFallback(): string {
  return CANONICAL_ROUTES.emergencyReception;
}
