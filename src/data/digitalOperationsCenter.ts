import { CANONICAL_ROUTES } from '../config/routes.config';

export const OPERATIONS_CENTER_SURFACE_IDS = Object.freeze([
  'digital-twin',
  'hospital-map',
  'medical-iot',
  'fleet',
  'notifications',
  'system-health',
]);

export const OPERATIONS_CENTER_SURFACES = Object.freeze([
  {
    id: 'digital-twin',
    title: 'Digital Twin',
    path: CANONICAL_ROUTES.digitalTwin,
    domain: 'Operational model',
    status: 'demo-model',
    summary: 'Cross-system view of patient, device, workflow, and capacity state.',
    metrics: [
      { label: 'Active models', value: '12' },
      { label: 'Scenario overlays', value: '4' },
    ],
    roles: ['admin', 'physician', 'nurse', 'student'],
    permissions: ['VIEW_OPERATIONS'],
  },
  {
    id: 'hospital-map',
    title: 'Hospital Map',
    path: CANONICAL_ROUTES.hospitalMap,
    domain: 'Hospital operations',
    status: 'live-route-demo-data',
    summary: 'Floors, units, beds, devices, telemetry freshness, alerts, and maintenance context.',
    metrics: [
      { label: 'Units visible', value: '8' },
      { label: 'Active bed alerts', value: '5' },
    ],
    roles: ['admin', 'physician', 'nurse'],
    permissions: ['VIEW_OPERATIONS'],
  },
  {
    id: 'medical-iot',
    title: 'Medical IoT',
    path: CANONICAL_ROUTES.medicalIot,
    domain: 'Device telemetry',
    status: 'demo-device-streams',
    summary: 'Connected medical devices, stale telemetry, alarm context, and device readiness.',
    metrics: [
      { label: 'Connected devices', value: '42' },
      { label: 'Stale signals', value: '3' },
    ],
    roles: ['admin', 'physician', 'nurse'],
    permissions: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
  },
  {
    id: 'fleet',
    title: 'Fleet',
    path: CANONICAL_ROUTES.fleetCommand,
    domain: 'Fleet command',
    status: 'demo-fleet-ops',
    summary: 'Vehicle availability, dispatch readiness, maintenance risk, routes, and live map context.',
    metrics: [
      { label: 'Available vehicles', value: '18' },
      { label: 'Maintenance watch', value: '4' },
    ],
    roles: ['admin', 'nurse'],
    permissions: ['VIEW_OPERATIONS'],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    path: CANONICAL_ROUTES.notifications,
    domain: 'Command signals',
    status: 'local-notification-center',
    summary: 'Operational notices, clinical alerts, system messages, and follow-up reminders.',
    metrics: [
      { label: 'Unread alerts', value: '7' },
      { label: 'Escalations', value: '2' },
    ],
    roles: ['admin', 'physician', 'nurse', 'student'],
    permissions: [],
  },
  {
    id: 'system-health',
    title: 'System Health',
    path: CANONICAL_ROUTES.systemHealth,
    domain: 'Observability',
    status: 'deployment-truth-panel',
    summary: 'Frontend, backend, deployment, health endpoints, and observability status.',
    metrics: [
      { label: 'Health probes', value: '3' },
      { label: 'Build checks', value: '4' },
    ],
    roles: ['admin'],
    permissions: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
  },
]);

export const OPERATIONS_CENTER_ROLE_PROFILES = Object.freeze({
  admin: {
    label: 'Operations administrator',
    focus: 'Full operational command, incident coordination, observability, and system readiness.',
    prioritySurfaceIds: OPERATIONS_CENTER_SURFACE_IDS,
    incidentFocus: ['System health', 'Fleet readiness', 'Device telemetry', 'Hospital capacity'],
  },
  physician: {
    label: 'Clinical operations lead',
    focus: 'Clinical capacity, device telemetry, notifications, and patient-flow context.',
    prioritySurfaceIds: ['digital-twin', 'hospital-map', 'medical-iot', 'notifications'],
    incidentFocus: ['Bed alerts', 'Telemetry freshness', 'Clinical notifications'],
  },
  nurse: {
    label: 'Care team operations',
    focus: 'Unit map, device readiness, notifications, and transport/fleet coordination.',
    prioritySurfaceIds: ['hospital-map', 'medical-iot', 'fleet', 'notifications'],
    incidentFocus: ['Unit alerts', 'Device readiness', 'Transport readiness'],
  },
  student: {
    label: 'Training observer',
    focus: 'Read-only orientation to operational surfaces with simulation-safe labels.',
    prioritySurfaceIds: ['digital-twin', 'notifications'],
    incidentFocus: ['Orientation', 'Supervised review', 'Simulation-safe operations'],
  },
  default: {
    label: 'Operations viewer',
    focus: 'General command-center overview with limited priority surfaces.',
    prioritySurfaceIds: ['hospital-map', 'notifications'],
    incidentFocus: ['Operational overview'],
  },
});

function canAccessSurface(surface, role, hasPermission = (_permission?) => false) {
  const roleAllowed = !surface.roles?.length || surface.roles.includes(role);
  const permissionAllowed =
    !surface.permissions?.length || surface.permissions.some((permission) => hasPermission(permission));
  return roleAllowed || permissionAllowed;
}

export function getOperationsCenterRoleView({ role = 'default', hasPermission = () => false }: any = {}) {
  const normalizedRole = String(role || 'default').toLowerCase();
  const profile =
    OPERATIONS_CENTER_ROLE_PROFILES[normalizedRole] || OPERATIONS_CENTER_ROLE_PROFILES.default;
  const accessibleSurfaces = OPERATIONS_CENTER_SURFACES.filter((surface) =>
    canAccessSurface(surface, normalizedRole, hasPermission)
  );
  const prioritySurfaces = profile.prioritySurfaceIds
    .map((id) => accessibleSurfaces.find((surface) => surface.id === id))
    .filter(Boolean);

  return {
    role: normalizedRole,
    ...profile,
    accessibleSurfaces,
    prioritySurfaces,
  };
}

export function getOperationsCenterSnapshot(surfaces = OPERATIONS_CENTER_SURFACES) {
  return {
    sourceStatus: 'demo-operational-command-center',
    safetyLabel: 'Operational command center - demo state and live routes may differ by backend availability',
    surfaceCount: surfaces.length,
    alertSurfaceCount: surfaces.filter((surface) =>
      ['hospital-map', 'medical-iot', 'notifications', 'system-health'].includes(surface.id)
    ).length,
    combinedSurfaceLabels: surfaces.map((surface) => surface.title),
  };
}

export function searchOperationsCenterSurfaces(query = '', surfaces = OPERATIONS_CENTER_SURFACES) {
  const normalizedQuery = String(query).trim().toLowerCase();
  if (!normalizedQuery) return surfaces;

  return surfaces.filter((surface) =>
    [surface.title, surface.domain, surface.status, surface.summary]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
}
