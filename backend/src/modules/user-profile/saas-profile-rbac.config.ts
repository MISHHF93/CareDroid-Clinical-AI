/**
 * SaaS profile → backend API permission mapping.
 * Complements clinical UserRole permissions using admin-assigned roleProfileId.
 */
import { Permission } from '../auth/enums/permission.enum';
import { normalizeSaasRole, type SaasUserRole } from '../user-profile/saas-profile.constants';

export const SAAS_PROFILE_PACK_POLICY: Record<SaasUserRole, string[]> = {
  'emergency-physician': ['core-platform', 'emergency-clinical'],
  'icu-physician': ['core-platform', 'emergency-clinical', 'icu-critical'],
  cardiologist: ['core-platform', 'emergency-clinical', 'cardiology'],
  'registration-clerk': ['core-platform', 'reception-desk'],
  nurse: ['core-platform', 'emergency-clinical'],
  pharmacist: ['core-platform', 'pharmacy'],
  'lab-technician': ['core-platform', 'laboratory'],
  'biomedical-engineer': ['core-platform', 'medical-iot', 'hospital-operations'],
  'fleet-operator': ['core-platform', 'fleet', 'hospital-operations'],
  'hospital-administrator': ['core-platform', 'operations', 'analytics'],
  researcher: ['core-platform', 'research'],
  educator: ['core-platform', 'education'],
  student: ['core-platform'],
  'compliance-officer': ['core-platform', 'governance'],
  'platform-admin': ['core-platform', 'platform-admin'],
  'racetrack-admin': ['core-platform', 'trackmind'],
  'race-day-operations-manager': ['core-platform', 'trackmind'],
  steward: ['core-platform', 'trackmind'],
  'equine-welfare-officer': ['core-platform', 'trackmind'],
  veterinarian: ['core-platform', 'trackmind'],
  'executive-leadership': ['core-platform', 'analytics', 'trackmind'],
  'auditor-regulator': ['core-platform', 'governance'],
};

export const SAAS_PROFILE_API_PERMISSIONS: Record<SaasUserRole, Permission[]> = {
  'emergency-physician': [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.EXPORT_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
    Permission.VIEW_ANALYTICS,
  ],
  'icu-physician': [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
  ],
  cardiologist: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
  ],
  'registration-clerk': [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
  ],
  nurse: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
  ],
  pharmacist: [
    Permission.READ_PHI,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_AI_CHAT,
  ],
  'lab-technician': [Permission.READ_PHI, Permission.USE_LAB_INTERPRETER],
  'biomedical-engineer': [
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_SURVEILLANCE,
    Permission.VIEW_OBSERVABILITY,
  ],
  'fleet-operator': [Permission.VIEW_OPERATIONS, Permission.VIEW_SURVEILLANCE],
  'hospital-administrator': [
    Permission.READ_PHI,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_USERS,
    Permission.VIEW_GOVERNANCE,
    Permission.VIEW_SURVEILLANCE,
  ],
  researcher: [
    Permission.USE_CALCULATORS,
    Permission.USE_AI_CHAT,
    Permission.VIEW_ANALYTICS,
  ],
  educator: [
    Permission.USE_CALCULATORS,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
  ],
  student: [
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
  ],
  'compliance-officer': [
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_AUDIT_LOGS,
    Permission.VIEW_GOVERNANCE,
  ],
  'platform-admin': [
    Permission.CONFIGURE_SYSTEM,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_GOVERNANCE,
    Permission.MANAGE_PLATFORM_TENANTS,
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_SURVEILLANCE,
    Permission.MANAGE_SURVEILLANCE_REGISTRY,
  ],
  'racetrack-admin': [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_SURVEILLANCE,
  ],
  'race-day-operations-manager': [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
    Permission.MANAGE_RACEDAY_OPERATIONS,
    Permission.VIEW_SURVEILLANCE,
  ],
  steward: [
    Permission.VIEW_TRACKMIND,
    Permission.MANAGE_STEWARDING,
    Permission.VIEW_AUDIT_LOGS,
  ],
  'equine-welfare-officer': [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_MATURITY,
    Permission.MANAGE_EQUINE_WELFARE,
  ],
  veterinarian: [
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_VETERINARY_RECORDS,
    Permission.WRITE_VETERINARY_RECORDS,
  ],
  'executive-leadership': [
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_TRACKMIND,
    Permission.VIEW_TRACKMIND_ENTERPRISE,
    Permission.VIEW_TRACKMIND_INTELLIGENCE,
  ],
  'auditor-regulator': [
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_TRACKMIND_AUDIT,
    Permission.VIEW_GOVERNANCE,
    Permission.VIEW_TRACKMIND,
  ],
};

export function resolveSaasProfilePermissions(roleProfileId?: string | null): Permission[] {
  const saasRole = normalizeSaasRole(roleProfileId);
  return SAAS_PROFILE_API_PERMISSIONS[saasRole] || SAAS_PROFILE_API_PERMISSIONS.student;
}

export function resolveSaasProfileAllowedPacks(roleProfileId?: string | null): string[] {
  const saasRole = normalizeSaasRole(roleProfileId);
  return SAAS_PROFILE_PACK_POLICY[saasRole] || SAAS_PROFILE_PACK_POLICY.student;
}

export function hasSaasProfilePermission(
  roleProfileId: string | null | undefined,
  permission: Permission,
): boolean {
  const grants = new Set(resolveSaasProfilePermissions(roleProfileId));
  return grants.has(permission);
}
