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

export type SaasUserRole = (typeof SAAS_USER_ROLES)[number];

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

export type SaasOrganizationType = (typeof SAAS_ORGANIZATION_TYPES)[number];

export const SAAS_ASSET_ACCESS_STATES = Object.freeze([
  'visible',
  'recommended',
  'pinned',
  'hidden',
  'restricted',
  'locked',
  'demo-only',
  'unsupported',
] as const);

export type SaasAssetAccessState = (typeof SAAS_ASSET_ACCESS_STATES)[number];

export const DEFAULT_SAAS_PROFILE = Object.freeze({
  organizationType: 'hospital' as SaasOrganizationType,
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
  // Normalize case/whitespace before matching (Cycle 220): every comparison
  // below is a strict, case-sensitive `===`, so a differently-cased or
  // padded input (e.g. dto.role from a client-controlled API request body —
  // user-profile.service.ts persists it straight into roleProfileId) fell
  // straight through to the DEFAULT_SAAS_PROFILE.role fallback instead of
  // matching its real alias. Fails safe (student, minimal privilege), not
  // unsafe, but still a genuine "Admin"/"ADMIN" silently becomes "student"
  // data-quality bug for any real client that doesn't happen to send exactly
  // lowercase.
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

export function normalizeOrganizationType(value?: string | null): SaasOrganizationType {
  if (value && (SAAS_ORGANIZATION_TYPES as readonly string[]).includes(value)) {
    return value as SaasOrganizationType;
  }
  return DEFAULT_SAAS_PROFILE.organizationType;
}

export function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
