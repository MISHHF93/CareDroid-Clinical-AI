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
  'registration-clerk': [Permission.READ_PHI, Permission.WRITE_PHI],
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
  pharmacist: [Permission.READ_PHI, Permission.USE_DRUG_CHECKER, Permission.USE_AI_CHAT],
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
  researcher: [Permission.USE_CALCULATORS, Permission.USE_AI_CHAT, Permission.VIEW_ANALYTICS],
  educator: [Permission.USE_CALCULATORS, Permission.USE_PROTOCOLS, Permission.USE_AI_CHAT],
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
  steward: [Permission.VIEW_TRACKMIND, Permission.MANAGE_STEWARDING, Permission.VIEW_AUDIT_LOGS],
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

/**
 * A user with no roleProfileId at all isn't using the SaaS-persona system --
 * they should carry ZERO permissions from it, not a silent 'student' default.
 * normalizeSaasRole's fallback to DEFAULT_SAAS_PROFILE.role ('student') is a
 * deliberate, tested contract (Cycle 220) for a *provided-but-unrecognized*
 * profile string (e.g. wrong casing) -- it was never meant to apply when no
 * profile was provided in the first place. AuthorizationGuard.hasRolePermission
 * ORs hasSaasProfilePermission's result with the user's base UserRole
 * permissions unconditionally, so routing null through the same fallback
 * silently upgraded even UserRole.READ_ONLY_VIEWER -- built specifically to
 * grant nothing beyond READ_PHI -- with 'student'-tier clinical-tool access
 * (USE_CALCULATORS/USE_DRUG_CHECKER/USE_LAB_INTERPRETER/USE_PROTOCOLS/
 * USE_AI_CHAT) whenever roleProfileId was unset, which is the common case.
 * Every other base UserRole (STUDENT, NURSE, PHYSICIAN, ADMIN) already grants
 * these same permissions directly, so this changes nothing for them.
 *
 * Deliberately NOT applied to resolveSaasProfileAllowedPacks below -- that
 * function drives CONTENT/feature-pack entitlement display (platform-assets
 * .service.ts / platform-context.service.ts), a different, non-security
 * concern where defaulting an unassigned profile to the 'core-platform' pack
 * is a reasonable content default, not a permission grant.
 */
export function resolveSaasProfilePermissions(roleProfileId?: string | null): Permission[] {
  if (roleProfileId === null || roleProfileId === undefined) return [];
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
