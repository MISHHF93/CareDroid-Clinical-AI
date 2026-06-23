/**
 * TrackMind Nexus backend RBAC — maps canonical TrackMind roles to API permissions.
 */
import { Permission } from '../auth/enums/permission.enum';

export const TRACKMIND_BACKEND_ROLE_ID = Object.freeze({
  platformSuperAdmin: 'platform_super_admin',
  organizationAdmin: 'organization_admin',
  racetrackAdmin: 'racetrack_admin',
  raceDayOperationsManager: 'race_day_operations_manager',
  steward: 'steward',
  starterRaceOfficial: 'starter_race_official',
  paddockOfficial: 'paddock_official',
  equineWelfareOfficer: 'equine_welfare_officer',
  veterinarian: 'veterinarian',
  trainerLiaison: 'trainer_liaison',
  securityManager: 'security_manager',
  facilitiesManager: 'facilities_manager',
  complianceOfficer: 'compliance_officer',
  financeManager: 'finance_manager',
  ticketingFanExperienceManager: 'ticketing_fan_experience_manager',
  executiveLeadership: 'executive_leadership',
  auditorRegulator: 'auditor_regulator',
  dataAnalyticsUser: 'data_analytics_user',
  supportInternalOperator: 'support_internal_operator',
  genericStaff: 'generic_staff',
} as const);

export type TrackMindBackendRoleId =
  (typeof TRACKMIND_BACKEND_ROLE_ID)[keyof typeof TRACKMIND_BACKEND_ROLE_ID];

export const TRACKMIND_ROLE_API_PERMISSIONS: Record<TrackMindBackendRoleId, Permission[]> = {
  [TRACKMIND_BACKEND_ROLE_ID.platformSuperAdmin]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_PLATFORM_TENANTS,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.VIEW_VETERINARY_RECORDS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_OBSERVABILITY,
    Permission.VIEW_SURVEILLANCE,
    Permission.MANAGE_SURVEILLANCE_REGISTRY,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.organizationAdmin]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_GOVERNANCE,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.racetrackAdmin]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_USERS,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.MANAGE_RACEDAY_OPERATIONS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.raceDayOperationsManager]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_RACEDAY_OPERATIONS,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.MANAGE_INCIDENTS,
    Permission.VIEW_SURVEILLANCE,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.steward]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_STEWARDING,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.starterRaceOfficial]: [
    Permission.VIEW_TRACKMIND,
    Permission.MANAGE_RACEDAY_OPERATIONS,
    Permission.MANAGE_TRACKMIND_APPROVALS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.paddockOfficial]: [
    Permission.VIEW_TRACKMIND,
    Permission.MANAGE_RACEDAY_OPERATIONS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.equineWelfareOfficer]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.MANAGE_EQUINE_WELFARE,
    Permission.VIEW_VETERINARY_RECORDS,
    Permission.VIEW_SURVEILLANCE,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.veterinarian]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_VETERINARY_RECORDS,
    Permission.WRITE_VETERINARY_RECORDS,
    Permission.MANAGE_EQUINE_WELFARE,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.trainerLiaison]: [
    Permission.VIEW_TRACKMIND,
    Permission.MANAGE_RACEDAY_OPERATIONS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.securityManager]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_SECURITY_OPERATIONS,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.VIEW_SURVEILLANCE,
    Permission.MANAGE_SURVEILLANCE_REGISTRY,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.facilitiesManager]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.MANAGE_RACEDAY_OPERATIONS,
    Permission.VIEW_SURVEILLANCE,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.complianceOfficer]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.VIEW_GOVERNANCE,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.MANAGE_TRACKMIND_APPROVALS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.financeManager]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_TRACKMIND_APPROVALS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.ticketingFanExperienceManager]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.VIEW_ANALYTICS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.executiveLeadership]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_TRACKMIND_APPROVALS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.auditorRegulator]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.VIEW_GOVERNANCE,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.dataAnalyticsUser]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.VIEW_ANALYTICS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.supportInternalOperator]: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_OBSERVABILITY,
    Permission.CONFIGURE_SYSTEM,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [TRACKMIND_BACKEND_ROLE_ID.genericStaff]: [Permission.VIEW_TRACKMIND],
};

export function normalizeTrackMindBackendRoleId(role?: string | null): TrackMindBackendRoleId {
  const raw = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const values = Object.values(TRACKMIND_BACKEND_ROLE_ID);
  if (values.includes(raw as TrackMindBackendRoleId)) {
    return raw as TrackMindBackendRoleId;
  }
  return TRACKMIND_BACKEND_ROLE_ID.genericStaff;
}

export function getTrackMindApiPermissionsForRole(role?: string | null): Permission[] {
  const roleId = normalizeTrackMindBackendRoleId(role);
  return TRACKMIND_ROLE_API_PERMISSIONS[roleId] || [Permission.VIEW_TRACKMIND];
}

export function trackMindRoleHasApiPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  return getTrackMindApiPermissionsForRole(role).includes(permission);
}
