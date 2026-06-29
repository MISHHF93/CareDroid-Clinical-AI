/**
 * Canonical user profile catalog — maps admin-assigned SaaS roles to domain access.
 */
import catalogData from './user-profile-catalog.data.json';
import { CANONICAL_ROUTES, getDefaultRouteForProfile } from './routes.config';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';
import { listTrackMindRoutesForRole } from './trackMindRolePermissions';
import { ROLE_PERMISSION_PRESETS, normalizeSaasRole, SAAS_USER_ROLES } from './saasProfileConstants';
import { getPlatformHomeRoute } from './receptionFirstUx.config';
import {
  isProfileAssignableForOrganization,
  resolveProfileSegregationDefaults,
  type ProfileSegregationContext,
} from './userProfileSegregation';

export type UserProfileDomain =
  | 'clinical'
  | 'operations'
  | 'education'
  | 'governance'
  | 'trackmind'
  | 'platform';

export type UserProfileToolPolicy = {
  allowedPacks: string[];
  restrictedToolIds: string[];
};

export type UserProfileCatalogEntry = Readonly<{
  saasRole: string;
  label: string;
  domain: UserProfileDomain;
  hierarchyLevel: number;
  emergencyRoleId: string | null;
  trackMindRoleId: string | null;
  allowedWorkspaces: string[];
  navigationGroups: string[];
  defaultScreenMode: string | null;
  toolPolicy: UserProfileToolPolicy;
  requiredToolIds: string[];
  restrictedToolIds?: string[];
  profileBenefits: string;
  assignableOrganizationTypes?: readonly string[];
  requiredEntitlementPacks?: readonly string[];
}>;

export type ResolvedUserProfile = UserProfileCatalogEntry &
  Readonly<{
    permissionPresets: string[];
    navigationRoutes: string[];
  }>;

export type UserProfileAccessSummary = Readonly<{
  saasRole: string;
  emergencyRole: string | null;
  trackMindRole: string | null;
  navigationRoutes: string[];
  allowedWorkspaces: string[];
  navigationGroups: string[];
  permissionPresets: string[];
  defaultScreenMode: string | null;
  toolPolicy: UserProfileToolPolicy;
  profileBenefits: string;
}>;

function resolveProfileHomeRoute(entry: UserProfileCatalogEntry): string {
  if (entry.emergencyRoleId) {
    return getDefaultRouteForProfile(entry.emergencyRoleId);
  }
  if (entry.trackMindRoleId) {
    return CANONICAL_ROUTES.trackMindWorkspace;
  }
  return CANONICAL_ROUTES.platformStart;
}

function getBaseProfileRoutes(entry?: UserProfileCatalogEntry): string[] {
  return [
    entry ? resolveProfileHomeRoute(entry) : getPlatformHomeRoute(),
    CANONICAL_ROUTES.profile,
    CANONICAL_ROUTES.profileSettings,
    CANONICAL_ROUTES.profileToolPreferences,
    '/profile/preferences',
    '/profile/security',
    '/profile/activity',
    '/profile/workspaces',
  ];
}

const PERMISSION_ROUTE_MAP: Record<string, string[]> = Object.freeze({
  USE_ASSISTANT: [CANONICAL_ROUTES.assistant, CANONICAL_ROUTES.emergencyCopilot],
  VIEW_TOOLS: [CANONICAL_ROUTES.tools, CANONICAL_ROUTES.emergencyTools],
  VIEW_EMERGENCY: [CANONICAL_ROUTES.emergencyWhiteboard],
  VIEW_EMERGENCY_RECEPTION: [
    CANONICAL_ROUTES.emergencyReception,
    CANONICAL_ROUTES.emergencyPatients,
    CANONICAL_ROUTES.emergencyIntake,
    CANONICAL_ROUTES.emergencyPulse,
    CANONICAL_ROUTES.emergencyShift,
  ],
  VIEW_OPERATIONS: [CANONICAL_ROUTES.operations, CANONICAL_ROUTES.integrationHub],
  VIEW_FLEET: [CANONICAL_ROUTES.fleetCommand, CANONICAL_ROUTES.fleetMap],
  VIEW_MEDICAL_IOT: [CANONICAL_ROUTES.medicalIot, CANONICAL_ROUTES.devices],
  VIEW_DEVICES: [CANONICAL_ROUTES.devices, CANONICAL_ROUTES.hospitalMap],
  VIEW_GOVERNANCE: [CANONICAL_ROUTES.governanceRegistry, CANONICAL_ROUTES.aiGovernance],
  VIEW_AUDIT_LOGS: [CANONICAL_ROUTES.audit, CANONICAL_ROUTES.automationAudit],
  VIEW_ANALYTICS: [CANONICAL_ROUTES.emergencyAnalytics, CANONICAL_ROUTES.executive],
  VIEW_SURVEILLANCE: [CANONICAL_ROUTES.surveillanceNexus],
  VIEW_TRACKMIND: [CANONICAL_ROUTES.trackMindWorkspace],
  VIEW_TRACKMIND_MATURITY: [CANONICAL_ROUTES.trackMindMaturity],
  VIEW_TRACKMIND_ENTERPRISE: [CANONICAL_ROUTES.enterprisePlatform],
  VIEW_TRACKMIND_INTELLIGENCE: [CANONICAL_ROUTES.platformIntelligence],
  VIEW_ICU: [CANONICAL_ROUTES.emergencyWhiteboard, CANONICAL_ROUTES.emergencyPulse],
  VIEW_CARDIOLOGY: [CANONICAL_ROUTES.emergencyWhiteboard, CANONICAL_ROUTES.tools],
  VIEW_PATIENT_CARE: [
    CANONICAL_ROUTES.emergencyReception,
    CANONICAL_ROUTES.emergencyWhiteboard,
    CANONICAL_ROUTES.emergencyPatients,
  ],
  VIEW_PHARMACY: [CANONICAL_ROUTES.tools, '/pharmacy'],
  VIEW_LABORATORY: [CANONICAL_ROUTES.laboratory, CANONICAL_ROUTES.tools],
  VIEW_RESEARCH: [CANONICAL_ROUTES.research, CANONICAL_ROUTES.tools],
  VIEW_EDUCATION: ['/education', CANONICAL_ROUTES.simulation, CANONICAL_ROUTES.tools],
  VIEW_SIMULATION: [CANONICAL_ROUTES.emergencySimulation, CANONICAL_ROUTES.simulation],
  MANAGE_STEWARDING: [CANONICAL_ROUTES.trackMindWorkspace, CANONICAL_ROUTES.governanceRegistry],
  MANAGE_RACEDAY_OPERATIONS: [CANONICAL_ROUTES.trackMindWorkspace, CANONICAL_ROUTES.operations],
  MANAGE_PLATFORM_TENANTS: [CANONICAL_ROUTES.platformAdmin, CANONICAL_ROUTES.tenantAdmin],
  MANAGE_ORGANIZATION: [CANONICAL_ROUTES.tenantAdmin, CANONICAL_ROUTES.adminOperations],
  CONFIGURE_SYSTEM: [CANONICAL_ROUTES.platformAdmin],
});

function enrichCatalogEntry(entry: UserProfileCatalogEntry): UserProfileCatalogEntry {
  const defaults = resolveProfileSegregationDefaults(entry.saasRole);
  const mergedRestricted = [
    ...new Set([
      ...(entry.toolPolicy?.restrictedToolIds || []),
      ...(entry.restrictedToolIds || []),
    ]),
  ];
  return Object.freeze({
    ...entry,
    toolPolicy: Object.freeze({
      allowedPacks: [...(entry.toolPolicy?.allowedPacks || ['core-platform'])],
      restrictedToolIds: mergedRestricted,
    }),
    assignableOrganizationTypes:
      entry.assignableOrganizationTypes?.length
        ? entry.assignableOrganizationTypes
        : defaults.assignableOrganizationTypes,
    requiredEntitlementPacks:
      entry.requiredEntitlementPacks?.length
        ? entry.requiredEntitlementPacks
        : defaults.requiredEntitlementPacks,
  });
}

const CATALOG_BY_ROLE = Object.freeze(
  (catalogData as UserProfileCatalogEntry[]).reduce(
    (map, entry) => {
      map.set(entry.saasRole, enrichCatalogEntry(entry));
      return map;
    },
    new Map<string, UserProfileCatalogEntry>(),
  ),
);

export const USER_PROFILE_CATALOG: readonly UserProfileCatalogEntry[] = Object.freeze(
  (catalogData as UserProfileCatalogEntry[]).map(enrichCatalogEntry),
);

export function resolveUserProfileFromSaasRole(
  role: string | null | undefined,
): ResolvedUserProfile {
  const saasRole = normalizeSaasRole(role);
  const entry = CATALOG_BY_ROLE.get(saasRole) || CATALOG_BY_ROLE.get('student')!;
  const permissionPresets = ROLE_PERMISSION_PRESETS[saasRole] || ROLE_PERMISSION_PRESETS.student;
  const navigationRoutes = buildNavigationRoutes(entry, permissionPresets);
  return Object.freeze({
    ...entry,
    permissionPresets: [...permissionPresets],
    navigationRoutes,
  });
}

export function buildNavigationRoutes(
  entry: UserProfileCatalogEntry,
  permissionPresets: string[] = ROLE_PERMISSION_PRESETS[entry.saasRole as keyof typeof ROLE_PERMISSION_PRESETS] ||
    ROLE_PERMISSION_PRESETS.student,
): string[] {
  const routes = new Set<string>(getBaseProfileRoutes(entry));

  if (entry.emergencyRoleId) {
    const definition = getEmergencyRoleDefinition(entry.emergencyRoleId);
    definition?.routes?.forEach((route: string) => routes.add(route));
  }

  if (entry.trackMindRoleId) {
    listTrackMindRoutesForRole(entry.trackMindRoleId).forEach((route) => routes.add(route));
  }

  permissionPresets.forEach((permission) => {
    (PERMISSION_ROUTE_MAP[permission] || []).forEach((route) => routes.add(route));
  });

  if (entry.navigationGroups.includes('fleet')) {
    routes.add(CANONICAL_ROUTES.fleetCommand);
  }
  if (entry.navigationGroups.includes('admin')) {
    routes.add(CANONICAL_ROUTES.adminOperations);
  }
  if (entry.navigationGroups.includes('devices') || entry.navigationGroups.includes('operations')) {
    if (permissionPresets.includes('VIEW_MEDICAL_IOT') || permissionPresets.includes('VIEW_DEVICES')) {
      routes.add(CANONICAL_ROUTES.surveillanceNexus);
    }
  }

  return [...routes].sort();
}

export function resolveEffectiveEmergencyRole(
  user: { profile?: { roleProfileId?: string }; roleProfileId?: string; role?: string } | null | undefined,
  emergencyOsSettings: { roles?: { emergencyRoleMapping?: Record<string, string> } } = {},
): string | null {
  const saasRole = normalizeSaasRole(
    user?.profile?.roleProfileId || user?.roleProfileId || user?.role,
  );
  const catalog = CATALOG_BY_ROLE.get(saasRole);
  const mapping = emergencyOsSettings?.roles?.emergencyRoleMapping || {};
  const profileId = user?.profile?.roleProfileId || user?.roleProfileId;

  if (profileId && mapping[profileId]) {
    return normalizeEmergencyRole(mapping[profileId]);
  }
  if (catalog?.emergencyRoleId) {
    return normalizeEmergencyRole(catalog.emergencyRoleId);
  }
  if (user?.role) {
    const normalized = normalizeEmergencyRole(user.role);
    if (Object.values(EMERGENCY_ROLE_IDS).includes(normalized)) return normalized;
  }
  return null;
}

export function resolveEffectiveTrackMindRole(
  user: {
    trackMindRole?: string;
    role?: string;
    profile?: { trackMindRole?: string; roleProfileId?: string; role?: string };
    roleProfileId?: string;
  } | null | undefined,
  settings: { trackMindRole?: string; roleOverrides?: Record<string, string> } = {},
): string | null {
  const override = settings?.trackMindRole || settings?.roleOverrides?.trackMind;
  if (override) return override;

  const saasRole = normalizeSaasRole(
    user?.profile?.roleProfileId || user?.roleProfileId || user?.profile?.role || user?.role,
  );
  const catalog = CATALOG_BY_ROLE.get(saasRole);
  if (catalog?.trackMindRoleId) return catalog.trackMindRoleId;

  return user?.trackMindRole || user?.profile?.trackMindRole || null;
}

export function isRouteAllowedForProfile(
  profile: ResolvedUserProfile | UserProfileCatalogEntry,
  path: string | null | undefined,
): boolean {
  if (!path) return false;
  const normalizedPath = String(path).split('?')[0];
  const resolved =
    'navigationRoutes' in profile
      ? profile
      : resolveUserProfileFromSaasRole(profile.saasRole);
  return resolved.navigationRoutes.some(
    (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );
}

export function buildUserProfileAccessSummary(
  role: string | null | undefined,
): UserProfileAccessSummary {
  const resolved = resolveUserProfileFromSaasRole(role);
  return Object.freeze({
    saasRole: resolved.saasRole,
    emergencyRole: resolved.emergencyRoleId,
    trackMindRole: resolved.trackMindRoleId,
    navigationRoutes: resolved.navigationRoutes,
    allowedWorkspaces: [...resolved.allowedWorkspaces],
    navigationGroups: [...resolved.navigationGroups],
    permissionPresets: [...resolved.permissionPresets],
    defaultScreenMode: resolved.defaultScreenMode,
    toolPolicy: { ...resolved.toolPolicy },
    profileBenefits: resolved.profileBenefits,
  });
}

export function listUserProfileCatalogOptions(context: ProfileSegregationContext = {}) {
  return USER_PROFILE_CATALOG.filter((entry) => isProfileAssignableForOrganization(entry, context)).map(
    (entry) => ({
      id: entry.saasRole,
      label: entry.label,
      domain: entry.domain,
      hierarchyLevel: entry.hierarchyLevel,
    }),
  );
}

export function validateHiddenAssetsWithinProfile(
  role: string | null | undefined,
  hiddenAssetIds: string[] = [],
): string[] {
  const entry = resolveUserProfileFromSaasRole(role);
  const required = new Set(entry.requiredToolIds || []);
  return hiddenAssetIds.filter((id) => !required.has(id));
}

export function isSaasRoleCatalogComplete(): boolean {
  return SAAS_USER_ROLES.every((role) => CATALOG_BY_ROLE.has(role));
}

/** Re-export for frontend — mirrors backend saas-profile.constants */
export { normalizeSaasRole, SAAS_USER_ROLES, ROLE_PERMISSION_PRESETS } from './saasProfileConstants';

export const DEFAULT_SCREEN_MODE_BY_SAAS_ROLE = Object.freeze(
  USER_PROFILE_CATALOG.reduce(
    (map, entry) => {
      if (entry.defaultScreenMode) {
        map[entry.saasRole] = entry.defaultScreenMode;
      }
      return map;
    },
    {} as Record<string, string>,
  ),
);

export function resolveDefaultScreenModeForSaasRole(role: string | null | undefined): string | null {
  const entry = CATALOG_BY_ROLE.get(normalizeSaasRole(role));
  return entry?.defaultScreenMode || null;
}

export const PUBLIC_DISPLAY_SAAS_ROLES = Object.freeze(['auditor-regulator', 'researcher']);

export function isPublicDisplaySaasRole(role: string | null | undefined): boolean {
  return PUBLIC_DISPLAY_SAAS_ROLES.includes(normalizeSaasRole(role));
}

export { isProfileAssignableForOrganization, resolveProfileSegregationDefaults };
export { CARE_DROID_SCREEN_MODES };
