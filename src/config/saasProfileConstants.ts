/**
 * Frontend mirror of backend saas-profile.constants — keep in sync with
 * backend/src/modules/user-profile/saas-profile.constants.ts
 */
export const SAAS_USER_ROLES = Object.freeze([
  'emergency-physician',
  'icu-physician',
  'cardiologist',
  'registration-clerk',
  'nurse',
  'pharmacist',
  'lab-technician',
  'biomedical-engineer',
  'fleet-operator',
  'hospital-administrator',
  'researcher',
  'educator',
  'student',
  'compliance-officer',
  'platform-admin',
  'racetrack-admin',
  'race-day-operations-manager',
  'steward',
  'equine-welfare-officer',
  'veterinarian',
  'executive-leadership',
  'auditor-regulator',
] as const);

export const SAAS_ORGANIZATION_TYPES = Object.freeze([
  'hospital',
  'clinic',
  'EMS',
  'university',
  'research-center',
  'long-term-care',
  'telehealth',
  'government',
  'racetrack',
] as const);

export type SaasUserRole = (typeof SAAS_USER_ROLES)[number];

export const DEFAULT_SAAS_PROFILE = Object.freeze({
  organizationType: 'hospital',
  role: 'student' as SaasUserRole,
  defaultWorkspace: 'emergency',
  allowedWorkspaces: ['emergency', 'icu', 'cardiology', 'laboratory', 'operations'],
  permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  subscriptionEntitlements: ['core-platform'],
  enabledAssetPacks: ['core-platform'],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
  preferredAIStyle: 'concise',
  themePreference: 'light',
  compactMode: false,
  onboardingStatus: 'complete',
});

export const ROLE_PERMISSION_PRESETS: Record<SaasUserRole, string[]> = Object.freeze({
  'emergency-physician': [
    'VIEW_DASHBOARD',
    'USE_ASSISTANT',
    'VIEW_TOOLS',
    'VIEW_EMERGENCY',
    'VIEW_SIMULATION',
  ],
  'icu-physician': ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'VIEW_ICU'],
  cardiologist: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'VIEW_CARDIOLOGY'],
  'registration-clerk': ['VIEW_DASHBOARD', 'VIEW_EMERGENCY_RECEPTION'],
  nurse: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'VIEW_PATIENT_CARE'],
  pharmacist: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'VIEW_PHARMACY'],
  'lab-technician': ['VIEW_DASHBOARD', 'VIEW_TOOLS', 'VIEW_LABORATORY'],
  'biomedical-engineer': [
    'VIEW_DASHBOARD',
    'USE_ASSISTANT',
    'VIEW_TOOLS',
    'VIEW_OPERATIONS',
    'VIEW_MEDICAL_IOT',
    'VIEW_DEVICES',
  ],
  'fleet-operator': ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_OPERATIONS', 'VIEW_FLEET'],
  'hospital-administrator': [
    'VIEW_DASHBOARD',
    'VIEW_OPERATIONS',
    'VIEW_ANALYTICS',
    'VIEW_AUDIT_LOGS',
    'MANAGE_ORGANIZATION',
  ],
  researcher: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'VIEW_RESEARCH'],
  educator: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'VIEW_EDUCATION'],
  student: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  'compliance-officer': ['VIEW_DASHBOARD', 'VIEW_GOVERNANCE', 'VIEW_AUDIT_LOGS'],
  'platform-admin': [
    'VIEW_DASHBOARD',
    'USE_ASSISTANT',
    'VIEW_TOOLS',
    'VIEW_OPERATIONS',
    'VIEW_GOVERNANCE',
    'VIEW_AUDIT_LOGS',
    'MANAGE_ORGANIZATION',
    'CONFIGURE_SYSTEM',
    'VIEW_TRACKMIND',
    'MANAGE_PLATFORM_TENANTS',
    // MANAGE_SUBSCRIPTIONS was granted to zero roles in this whole preset
    // table -- PERMISSION_ROUTE_MAP already had customerPortal/billing in
    // its bucket (added 2026-08-21), but with nobody holding the
    // permission, both were unreachable regardless -- same failure shape
    // as VIEW_OBSERVABILITY. platform-admin already manages
    // MANAGE_PLATFORM_TENANTS/CONFIGURE_SYSTEM, so subscription/billing
    // administration is a natural, minimal extension rather than a new
    // role. Confirmed live 2026-08-22 via the authorization mismatch
    // matrix's 19-route backlog.
    'MANAGE_SUBSCRIPTIONS',
  ],
  'racetrack-admin': [
    'VIEW_DASHBOARD',
    'VIEW_TRACKMIND',
    'VIEW_TRACKMIND_MATURITY',
    'VIEW_TRACKMIND_ENTERPRISE',
    'MANAGE_ORGANIZATION',
    'VIEW_AUDIT_LOGS',
  ],
  'race-day-operations-manager': [
    'VIEW_DASHBOARD',
    'VIEW_TRACKMIND',
    'VIEW_TRACKMIND_INTELLIGENCE',
    'MANAGE_RACEDAY_OPERATIONS',
  ],
  steward: ['VIEW_DASHBOARD', 'VIEW_TRACKMIND', 'MANAGE_STEWARDING', 'VIEW_AUDIT_LOGS'],
  'equine-welfare-officer': [
    'VIEW_DASHBOARD',
    'VIEW_TRACKMIND',
    'VIEW_TRACKMIND_MATURITY',
    'MANAGE_EQUINE_WELFARE',
  ],
  veterinarian: [
    'VIEW_DASHBOARD',
    'VIEW_TRACKMIND',
    'VIEW_VETERINARY_RECORDS',
    'WRITE_VETERINARY_RECORDS',
  ],
  'executive-leadership': [
    'VIEW_DASHBOARD',
    'VIEW_TRACKMIND',
    'VIEW_TRACKMIND_ENTERPRISE',
    'VIEW_TRACKMIND_INTELLIGENCE',
    'VIEW_ANALYTICS',
  ],
  'auditor-regulator': [
    'VIEW_DASHBOARD',
    'VIEW_TRACKMIND',
    'VIEW_AUDIT_LOGS',
    'EXPORT_TRACKMIND_AUDIT',
    'VIEW_GOVERNANCE',
  ],
});

/**
 * Map a role string (a SaaS role id, an EMERGENCY_ROLE_IDS value, or one of
 * the legacy account-tier names) to its SaaS role -- or null when the input
 * is not a role this platform knows. normalizeSaasRole() below is the same
 * table with the null collapsed to the default profile role; callers that
 * must tell "this is the student role" from "this is not a role at all"
 * (the dev-session identity merge in demoPersonaModel.ts, which must not
 * let an unrecognised local string downgrade a real backend role) use this.
 */
export function resolveSaasRoleAlias(role?: string | null): SaasUserRole | null {
  // Normalize case/whitespace before matching (mirrors the backend's own
  // Cycle 220 fix, saas-profile.constants.ts -- this frontend copy never
  // received it): every comparison below was a strict, case-sensitive `===`,
  // so a differently-cased or padded input (e.g. context?.roleProfile?.id /
  // context?.user?.role fed in from profileRouteLaunch.ts, session/API-sourced
  // values) fell straight through to the DEFAULT_SAAS_PROFILE.role fallback
  // instead of matching its real alias, even where the backend would have
  // resolved it correctly -- a frontend/backend behavioral split (e.g. a real
  // administrator whose persisted role string is 'Administrator' or 'ADMIN'
  // got silently downgraded to the generic student profile/navigation here
  // but not server-side).
  const normalized = role == null ? role : role.trim().toLowerCase();
  if (normalized && (SAAS_USER_ROLES as readonly string[]).includes(normalized)) {
    return normalized as SaasUserRole;
  }
  if (normalized === 'physician') return 'emergency-physician';
  if (normalized === 'admin' || normalized === 'administrator') return 'hospital-administrator';
  if (normalized === 'nurse') return 'nurse';
  if (normalized === 'medical-student' || normalized === 'medical_student') return 'student';
  if (
    normalized === 'registration_clerk' ||
    normalized === 'registration-clerk' ||
    normalized === 'receptionist' ||
    normalized === 'clerk'
  ) {
    return 'registration-clerk';
  }
  // HEAL-323: these 9 EMERGENCY_ROLE_IDS values (emergencyRolePermissions.ts)
  // had no alias here at all -- normalizeSaasRole() fell through every one
  // of them to DEFAULT_SAAS_PROFILE.role ('student'), silently downgrading
  // e.g. a charge nurse's effectiveProfile/accessSummary/navigationRoutes
  // to the generic student profile. Mirrors the same HEAL-208 remediation
  // this file already applied to emergencyRolePermissions.ts's own
  // ROLE_ALIASES for a near-identical gap.
  if (normalized === 'it_admin') return 'platform-admin';
  if (normalized === 'ed_manager') return 'hospital-administrator';
  if (normalized === 'charge_nurse' || normalized === 'triage_nurse') return 'nurse';
  if (
    normalized === 'ems_user' ||
    normalized === 'dispatcher' ||
    normalized === 'ems_coordinator'
  )
    return 'fleet-operator';
  if (normalized === 'read_only_viewer' || normalized === 'public_display') return 'student';
  if (normalized === 'platform_super_admin' || normalized === 'platform-admin')
    return 'platform-admin';
  if (normalized === 'organization_admin' || normalized === 'racetrack_admin')
    return 'racetrack-admin';
  if (normalized === 'race_day_operations_manager') return 'race-day-operations-manager';
  if (normalized === 'steward' || normalized === 'racing_steward') return 'steward';
  if (normalized === 'equine_welfare_officer') return 'equine-welfare-officer';
  if (normalized === 'veterinarian' || normalized === 'vet') return 'veterinarian';
  if (normalized === 'executive_leadership') return 'executive-leadership';
  if (normalized === 'auditor_regulator') return 'auditor-regulator';
  return null;
}

export function normalizeSaasRole(role?: string | null): SaasUserRole {
  return resolveSaasRoleAlias(role) ?? DEFAULT_SAAS_PROFILE.role;
}

/**
 * The SaaS role string carried by an authenticated user object.
 *
 * Moved here verbatim from TrackMindRouteGuard (via userProfileCatalog.ts)
 * so the guard, the TrackMind workspace hub and the dev-session identity
 * merge in demoPersonaModel.ts cannot drift apart on what counts as a
 * user's role -- a guard that admits a user the page then treats as a
 * different role is exactly how a role sees a workspace built for someone
 * else. Deliberately NOT the same chain as resolveEffectiveEmergencyRole(),
 * which resolves the *emergency* role and prefers roleProfileId over the
 * account-tier role. This file has no imports, which is why the resolver
 * lives here rather than in the catalog.
 */
export function resolveSaasRoleFromUser(
  user:
    | {
        saasRole?: string;
        role?: string;
        profile?: { saasRole?: string; roleProfileId?: string };
      }
    | null
    | undefined,
): string {
  const profile = user?.profile || {};
  return user?.saasRole || profile.saasRole || profile.roleProfileId || user?.role || '';
}
