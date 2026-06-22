/**
 * TrackMind role landing routes and home navigation mapping.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const R = TRACKMIND_ROLE_ID;

export const TRACKMIND_ROLE_LANDING_ROUTES: Record<TrackMindRoleId, string> = Object.freeze({
  [R.platformSuperAdmin]: CANONICAL_ROUTES.platformIntelligence,
  [R.organizationAdmin]: CANONICAL_ROUTES.enterprisePlatform,
  [R.racetrackAdmin]: CANONICAL_ROUTES.trackMindMaturity,
  [R.raceDayOperationsManager]: CANONICAL_ROUTES.trackMindWorkspace,
  [R.steward]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=stewarding`,
  [R.starterRaceOfficial]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=racing_control`,
  [R.paddockOfficial]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=paddock`,
  [R.equineWelfareOfficer]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=equine_welfare`,
  [R.veterinarian]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=veterinary`,
  [R.trainerLiaison]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=horse_ops`,
  [R.securityManager]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=security`,
  [R.facilitiesManager]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=facilities`,
  [R.complianceOfficer]: CANONICAL_ROUTES.governanceRegistry,
  [R.financeManager]: CANONICAL_ROUTES.billing,
  [R.ticketingFanExperienceManager]: `${CANONICAL_ROUTES.trackMindWorkspace}?focus=fan_experience`,
  [R.executiveLeadership]: CANONICAL_ROUTES.executive,
  [R.auditorRegulator]: CANONICAL_ROUTES.audit,
  [R.dataAnalyticsUser]: `${CANONICAL_ROUTES.platformIntelligence}#kpi-intelligence`,
  [R.supportInternalOperator]: CANONICAL_ROUTES.platformAdmin,
  [R.genericStaff]: CANONICAL_ROUTES.trackMindWorkspace,
});

export const TRACKMIND_ROLE_HOME_NAV_ID: Record<TrackMindRoleId, string> = Object.freeze({
  [R.platformSuperAdmin]: 'platform-intelligence',
  [R.organizationAdmin]: 'enterprise-platform',
  [R.racetrackAdmin]: 'trackmind-maturity',
  [R.raceDayOperationsManager]: 'trackmind-workspace',
  [R.steward]: 'trackmind-workspace',
  [R.starterRaceOfficial]: 'trackmind-workspace',
  [R.paddockOfficial]: 'trackmind-workspace',
  [R.equineWelfareOfficer]: 'trackmind-workspace',
  [R.veterinarian]: 'trackmind-workspace',
  [R.trainerLiaison]: 'trackmind-workspace',
  [R.securityManager]: 'trackmind-workspace',
  [R.facilitiesManager]: 'trackmind-workspace',
  [R.complianceOfficer]: 'governance-registry',
  [R.financeManager]: 'billing',
  [R.ticketingFanExperienceManager]: 'trackmind-workspace',
  [R.executiveLeadership]: 'executive',
  [R.auditorRegulator]: 'audit',
  [R.dataAnalyticsUser]: 'platform-intelligence',
  [R.supportInternalOperator]: 'platform-admin',
  [R.genericStaff]: 'trackmind-workspace',
});

export function resolveTrackMindRoleLandingRoute(role: string | null | undefined): string {
  const roleId = normalizeTrackMindRoleId(role);
  return TRACKMIND_ROLE_LANDING_ROUTES[roleId] || CANONICAL_ROUTES.trackMindWorkspace;
}

export function resolveTrackMindRoleHomeNavId(role: string | null | undefined): string {
  const roleId = normalizeTrackMindRoleId(role);
  return TRACKMIND_ROLE_HOME_NAV_ID[roleId] || 'trackmind-workspace';
}

export function resolveTrackMindRoleIdFromUser(
  user: { trackMindRole?: string; role?: string; profile?: { trackMindRole?: string; role?: string } } | null | undefined,
): TrackMindRoleId {
  const candidate =
    user?.trackMindRole ||
    user?.profile?.trackMindRole ||
    user?.profile?.role ||
    user?.role;
  return normalizeTrackMindRoleId(candidate);
}
