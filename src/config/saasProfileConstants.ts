/**
 * Frontend mirror of backend saas-profile.constants — keep in sync with
 * backend/src/modules/user-profile/saas-profile.constants.ts
 */
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
  'racetrack-admin',
  'race-day-operations-manager',
  'steward',
  'equine-welfare-officer',
  'veterinarian',
  'executive-leadership',
  'auditor-regulator',
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
  if (role && (SAAS_USER_ROLES as readonly string[]).includes(role)) return role as SaasUserRole;
  if (role === 'physician') return 'emergency-physician';
  if (role === 'admin') return 'hospital-administrator';
  if (role === 'nurse') return 'nurse';
  if (role === 'platform_super_admin' || role === 'platform-admin') return 'platform-admin';
  if (role === 'organization_admin' || role === 'racetrack_admin') return 'racetrack-admin';
  if (role === 'race_day_operations_manager') return 'race-day-operations-manager';
  if (role === 'steward' || role === 'racing_steward') return 'steward';
  if (role === 'equine_welfare_officer') return 'equine-welfare-officer';
  if (role === 'veterinarian' || role === 'vet') return 'veterinarian';
  if (role === 'executive_leadership') return 'executive-leadership';
  if (role === 'auditor_regulator') return 'auditor-regulator';
  return DEFAULT_SAAS_PROFILE.role;
}
