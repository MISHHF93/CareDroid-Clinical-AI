export const SAAS_USER_ROLES = Object.freeze([
  'emergency-physician',
  'icu-physician',
  'cardiologist',
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
  subscriptionEntitlements: ['clinical-core'],
  enabledAssetPacks: ['clinical-core'],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
  preferredAIStyle: 'concise',
  themePreference: 'system',
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
  ],
});

export function normalizeSaasRole(role?: string | null): SaasUserRole {
  if (role && (SAAS_USER_ROLES as readonly string[]).includes(role)) return role as SaasUserRole;
  if (role === 'physician') return 'emergency-physician';
  if (role === 'admin') return 'hospital-administrator';
  if (role === 'nurse') return 'nurse';
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
