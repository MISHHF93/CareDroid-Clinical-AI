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

export function normalizeSaasRole(role?: string | null): SaasUserRole {
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
  return DEFAULT_SAAS_PROFILE.role;
}
