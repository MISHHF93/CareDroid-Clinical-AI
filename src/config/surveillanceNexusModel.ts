/**
 * Surveillance & IoT Nexus — TrackMind-aligned registry, RBAC, KPIs, and integration contracts.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';

export const SURVEILLANCE_NEXUS_CONTRACT_VERSION = '1.0.0';

export const SURVEILLANCE_PERMISSION_KEYS = Object.freeze({
  nexusView: 'surveillance.nexus.view',
  cameraRegistryView: 'surveillance.camera.view',
  cameraRegistryManage: 'surveillance.camera.manage',
  iotRegistryView: 'surveillance.iot.view',
  iotRegistryManage: 'surveillance.iot.manage',
  zoneMapView: 'surveillance.zone.view',
  healthView: 'surveillance.health.view',
  alertRuleManage: 'surveillance.rule.manage',
  incidentLink: 'surveillance.incident.link',
  auditExport: 'surveillance.audit.export',
  kpiView: 'kpi.surveillance.view',
} as const);

export const SURVEILLANCE_INTEGRATION_DOMAIN = Object.freeze({
  security: 'security',
  facilities: 'facilities',
  raceDay: 'race_day',
  equineWelfare: 'equine_welfare',
  hospitalOps: 'hospital_ops',
  audit: 'audit',
} as const);

export type SurveillanceIntegrationDomainId =
  (typeof SURVEILLANCE_INTEGRATION_DOMAIN)[keyof typeof SURVEILLANCE_INTEGRATION_DOMAIN];

export type SurveillanceNexusRouteLink = Readonly<{
  id: string;
  label: string;
  route: string;
  permission: string;
  domain: SurveillanceIntegrationDomainId;
}>;

export const SURVEILLANCE_NEXUS_ROUTES: readonly SurveillanceNexusRouteLink[] = Object.freeze([
  {
    id: 'nexus-hub',
    label: 'Surveillance Nexus',
    route: CANONICAL_ROUTES.surveillanceNexus,
    permission: SURVEILLANCE_PERMISSION_KEYS.nexusView,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.security,
  },
  {
    id: 'hospital-map',
    label: 'Hospital map',
    route: CANONICAL_ROUTES.hospitalMap,
    permission: SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.hospitalOps,
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    route: CANONICAL_ROUTES.medicalIot,
    permission: SURVEILLANCE_PERMISSION_KEYS.iotRegistryView,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.hospitalOps,
  },
  {
    id: 'fleet-command',
    label: 'Fleet command',
    route: CANONICAL_ROUTES.fleetCommand,
    permission: TRACKMIND_PERMISSION_KEYS.analyticsView,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.facilities,
  },
  {
    id: 'security',
    label: 'Security operations',
    route: CANONICAL_ROUTES.security,
    permission: TRACKMIND_PERMISSION_KEYS.securityIncidentManage,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.security,
  },
  {
    id: 'trackmind',
    label: 'TrackMind workspace',
    route: CANONICAL_ROUTES.trackMindWorkspace,
    permission: TRACKMIND_PERMISSION_KEYS.workspaceView,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.raceDay,
  },
  {
    id: 'system-health',
    label: 'System health',
    route: CANONICAL_ROUTES.systemHealth,
    permission: TRACKMIND_PERMISSION_KEYS.intelligenceView,
    domain: SURVEILLANCE_INTEGRATION_DOMAIN.audit,
  },
]);

export const SURVEILLANCE_KPI_ARTIFACTS = Object.freeze([
  {
    id: 'cameras_online',
    label: 'Cameras online',
    permission: SURVEILLANCE_PERMISSION_KEYS.kpiView,
  },
  {
    id: 'iot_online',
    label: 'IoT devices online',
    permission: SURVEILLANCE_PERMISSION_KEYS.kpiView,
  },
  { id: 'zones_covered', label: 'Mapped zones', permission: SURVEILLANCE_PERMISSION_KEYS.kpiView },
  { id: 'open_alerts', label: 'Open alerts', permission: SURVEILLANCE_PERMISSION_KEYS.kpiView },
  {
    id: 'health_score',
    label: 'Platform health score',
    permission: SURVEILLANCE_PERMISSION_KEYS.healthView,
  },
  {
    id: 'welfare_safe_zones',
    label: 'Welfare-safe zones',
    permission: TRACKMIND_PERMISSION_KEYS.kpiWelfareView,
  },
  {
    id: 'raceday_ready',
    label: 'Race-day readiness',
    permission: TRACKMIND_PERMISSION_KEYS.kpiRaceDayView,
  },
]);

export const SURVEILLANCE_APPROVAL_DOMAINS = Object.freeze([
  'camera_privacy_override',
  'surveillance_recording_access',
  'iot_device_provisioning',
  'welfare_safe_stream_access',
]);

export const SURVEILLANCE_ROLE_PERMISSION_GRANTS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    platform_super_admin: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryManage,
      SURVEILLANCE_PERMISSION_KEYS.iotRegistryManage,
      SURVEILLANCE_PERMISSION_KEYS.alertRuleManage,
      SURVEILLANCE_PERMISSION_KEYS.auditExport,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    organization_admin: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.iotRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    security_manager: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryManage,
      SURVEILLANCE_PERMISSION_KEYS.iotRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.alertRuleManage,
      SURVEILLANCE_PERMISSION_KEYS.incidentLink,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    facilities_manager: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
      SURVEILLANCE_PERMISSION_KEYS.iotRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    race_day_operations_manager: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.incidentLink,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    equine_welfare_officer: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    racetrack_admin: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    hospital_administrator: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.cameraRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.iotRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
      SURVEILLANCE_PERMISSION_KEYS.kpiView,
    ]),
    biomedical_engineer: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.iotRegistryView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
    ]),
    fleet_operator: Object.freeze([
      SURVEILLANCE_PERMISSION_KEYS.nexusView,
      SURVEILLANCE_PERMISSION_KEYS.zoneMapView,
      SURVEILLANCE_PERMISSION_KEYS.healthView,
    ]),
  });

const SAAS_TO_SURVEILLANCE_ROLE: Readonly<Record<string, string>> = Object.freeze({
  'platform-admin': 'platform_super_admin',
  'hospital-administrator': 'hospital_administrator',
  'biomedical-engineer': 'biomedical_engineer',
  'fleet-operator': 'fleet_operator',
  'racetrack-admin': 'racetrack_admin',
  'race-day-operations-manager': 'race_day_operations_manager',
  steward: 'steward',
  'equine-welfare-officer': 'equine_welfare_officer',
  veterinarian: 'veterinarian',
  'executive-leadership': 'executive_leadership',
  'compliance-officer': 'compliance_officer',
});

export function resolveSurveillancePermissionsForRole(
  role: string | null | undefined,
): readonly string[] {
  const raw = String(role || 'generic_staff').trim();
  const normalized = raw.replace(/-/g, '_');
  const mapped =
    SAAS_TO_SURVEILLANCE_ROLE[raw] ||
    SAAS_TO_SURVEILLANCE_ROLE[normalized.replace(/_/g, '-')] ||
    normalized;
  return SURVEILLANCE_ROLE_PERMISSION_GRANTS[mapped] || [];
}

export function canAccessSurveillanceRoute(
  role: string,
  permission: string,
  hasPermission: (key: string) => boolean,
): boolean {
  const grants = resolveSurveillancePermissionsForRole(role);
  if (grants.includes(permission)) return true;
  return hasPermission(permission);
}
