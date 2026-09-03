/**
 * TrackMind KPI visibility policy — role-resonant dashboard metrics.
 */
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const K = TRACKMIND_PERMISSION_KEYS;

export type TrackMindKpiDefinition = Readonly<{
  id: string;
  label: string;
  permission: string;
  domain: string;
}>;

export const TRACKMIND_KPI_CATALOG: readonly TrackMindKpiDefinition[] = Object.freeze([
  {
    id: 'executive_posture',
    label: 'Executive posture score',
    permission: K.kpiExecutiveView,
    domain: 'executive',
  },
  {
    id: 'race_readiness',
    label: 'Race-day readiness',
    permission: K.kpiRaceDayView,
    domain: 'race_day',
  },
  {
    id: 'pending_approvals',
    label: 'Pending approvals',
    permission: K.kpiRaceDayView,
    domain: 'race_day',
  },
  {
    id: 'open_incidents',
    label: 'Open incidents',
    permission: K.kpiRaceDayView,
    domain: 'race_day',
  },
  {
    id: 'welfare_restrictions',
    label: 'Active welfare restrictions',
    permission: K.kpiWelfareView,
    domain: 'welfare',
  },
  {
    id: 'welfare_incidents',
    label: 'Welfare incidents (7d)',
    permission: K.kpiWelfareView,
    domain: 'welfare',
  },
  {
    id: 'inspections_due',
    label: 'Inspections due',
    permission: K.kpiFacilitiesView,
    domain: 'facilities',
  },
  {
    id: 'maintenance_backlog',
    label: 'Maintenance backlog',
    permission: K.kpiFacilitiesView,
    domain: 'facilities',
  },
  {
    id: 'surface_readiness',
    label: 'Track surface readiness',
    permission: K.kpiFacilitiesView,
    domain: 'facilities',
  },
  {
    id: 'security_alerts',
    label: 'Security alert severity',
    permission: K.kpiSecurityView,
    domain: 'security',
  },
  {
    id: 'access_events',
    label: 'Restricted-zone access events',
    permission: K.kpiSecurityView,
    domain: 'security',
  },
  {
    id: 'cameras_online',
    label: 'Cameras online',
    permission: K.kpiSurveillanceView,
    domain: 'surveillance',
  },
  {
    id: 'iot_devices_online',
    label: 'IoT devices online',
    permission: K.kpiSurveillanceView,
    domain: 'surveillance',
  },
  {
    id: 'surveillance_health',
    label: 'Surveillance health score',
    permission: K.surveillanceHealthView,
    domain: 'surveillance',
  },
  {
    id: 'compliance_gaps',
    label: 'Unresolved control gaps',
    permission: K.kpiComplianceView,
    domain: 'compliance',
  },
  {
    id: 'evidence_gaps',
    label: 'Evidence collection gaps',
    permission: K.kpiComplianceView,
    domain: 'compliance',
  },
  {
    id: 'revenue_variance',
    label: 'Revenue variance',
    permission: K.kpiFinanceView,
    domain: 'finance',
  },
  {
    id: 'payout_pending',
    label: 'Pending payout approvals',
    permission: K.kpiFinanceView,
    domain: 'finance',
  },
  {
    id: 'attendance_trend',
    label: 'Attendance trend',
    permission: K.kpiFanView,
    domain: 'fan_experience',
  },
  {
    id: 'hospitality_sla',
    label: 'Hospitality SLA',
    permission: K.kpiFanView,
    domain: 'fan_experience',
  },
  {
    id: 'maturity_overall',
    label: 'Overall maturity score',
    permission: K.maturityView,
    domain: 'maturity',
  },
  {
    id: 'tenant_health',
    label: 'Tenant health index',
    permission: K.intelligenceView,
    domain: 'platform',
  },
]);

export const TRACKMIND_ROLE_PRIMARY_KPI_IDS: Record<TrackMindRoleId, readonly string[]> =
  Object.freeze({
    [TRACKMIND_ROLE_ID.platformSuperAdmin]: [
      'tenant_health',
      'maturity_overall',
      'compliance_gaps',
    ],
    [TRACKMIND_ROLE_ID.organizationAdmin]: [
      'executive_posture',
      'maturity_overall',
      'compliance_gaps',
    ],
    [TRACKMIND_ROLE_ID.racetrackAdmin]: ['maturity_overall', 'race_readiness', 'compliance_gaps'],
    [TRACKMIND_ROLE_ID.raceDayOperationsManager]: [
      'race_readiness',
      'pending_approvals',
      'open_incidents',
    ],
    [TRACKMIND_ROLE_ID.steward]: ['open_incidents', 'pending_approvals', 'race_readiness'],
    [TRACKMIND_ROLE_ID.starterRaceOfficial]: ['race_readiness', 'pending_approvals'],
    [TRACKMIND_ROLE_ID.paddockOfficial]: ['race_readiness', 'open_incidents'],
    [TRACKMIND_ROLE_ID.equineWelfareOfficer]: [
      'welfare_restrictions',
      'welfare_incidents',
      'race_readiness',
    ],
    [TRACKMIND_ROLE_ID.veterinarian]: ['welfare_restrictions', 'welfare_incidents'],
    [TRACKMIND_ROLE_ID.trainerLiaison]: ['race_readiness', 'pending_approvals'],
    [TRACKMIND_ROLE_ID.securityManager]: [
      'security_alerts',
      'access_events',
      'open_incidents',
      'cameras_online',
      'surveillance_health',
    ],
    [TRACKMIND_ROLE_ID.facilitiesManager]: [
      'inspections_due',
      'maintenance_backlog',
      'surface_readiness',
    ],
    [TRACKMIND_ROLE_ID.complianceOfficer]: [
      'compliance_gaps',
      'evidence_gaps',
      'pending_approvals',
    ],
    [TRACKMIND_ROLE_ID.financeManager]: ['revenue_variance', 'payout_pending'],
    [TRACKMIND_ROLE_ID.ticketingFanExperienceManager]: ['attendance_trend', 'hospitality_sla'],
    [TRACKMIND_ROLE_ID.executiveLeadership]: [
      'executive_posture',
      'race_readiness',
      'compliance_gaps',
      'revenue_variance',
    ],
    [TRACKMIND_ROLE_ID.auditorRegulator]: ['compliance_gaps', 'evidence_gaps', 'open_incidents'],
    [TRACKMIND_ROLE_ID.dataAnalyticsUser]: [
      'executive_posture',
      'race_readiness',
      'welfare_incidents',
      'revenue_variance',
    ],
    [TRACKMIND_ROLE_ID.supportInternalOperator]: ['tenant_health'],
    [TRACKMIND_ROLE_ID.genericStaff]: [],
  });

export function resolveTrackMindKpisForRole(
  role: string,
  can: (permission: string) => boolean,
): TrackMindKpiDefinition[] {
  const roleId = normalizeTrackMindRoleId(role);
  const primaryIds = new Set(TRACKMIND_ROLE_PRIMARY_KPI_IDS[roleId] || []);
  return TRACKMIND_KPI_CATALOG.filter((kpi) => primaryIds.has(kpi.id) && can(kpi.permission));
}

export const TRACKMIND_MATURITY_DOMAIN_PERMISSION: Record<string, string> = Object.freeze({
  operations: K.kpiRaceDayView,
  safety: K.kpiRaceDayView,
  compliance: K.kpiComplianceView,
  security: K.kpiSecurityView,
  equine_welfare: K.kpiWelfareView,
  facilities: K.kpiFacilitiesView,
  finance: K.kpiFinanceView,
  ai_governance: K.intelligenceView,
  data_quality: K.analyticsView,
});

export function filterTrackMindMaturityDomainsForRole<T extends { id: string }>(
  domains: readonly T[],
  can: (permission: string) => boolean,
  hasMaturityView: boolean,
): T[] {
  if (!hasMaturityView) return [];
  return domains.filter((domain) => {
    const permission = TRACKMIND_MATURITY_DOMAIN_PERMISSION[domain.id];
    return !permission || can(permission);
  });
}

export function filterTrackMindKpiCatalog(
  role: string,
  can: (permission: string) => boolean,
): TrackMindKpiDefinition[] {
  return TRACKMIND_KPI_CATALOG.filter((kpi) => can(kpi.permission));
}
