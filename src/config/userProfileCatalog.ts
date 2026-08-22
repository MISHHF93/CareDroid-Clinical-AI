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

// Exported (not just module-private) specifically so
// navigationPermissionInvariants.test.ts can cross-check this against every
// permission gate in navigation.config.ts -- the two are independently
// maintained and drifted apart repeatedly (2026-08-21 sweep, 17 routes across
// 8 buckets). No other consumer should import this directly; use
// isRouteAllowedForProfile/buildNavigationRoutes instead.
export const PERMISSION_ROUTE_MAP: Record<string, string[]> = Object.freeze({
  USE_ASSISTANT: [CANONICAL_ROUTES.assistant, CANONICAL_ROUTES.emergencyCopilot],
  // HEAL-347.47: /protocols and /lab are standalone top-level pages
  // (toolsConsoleRoutes.ts's TOOLS_SHORTCUT_PAGE_ROUTES) -- unlike
  // /tools/calculators and friends, they're NOT under the /tools/ prefix
  // that router.tsx's ToolsRedirect folds into /emergency/tools, so neither
  // was reachable through any other entry in this map. ProfileRouteGuard
  // silently bounced every role (including physician, whose real JWT
  // permissions include USE_PROTOCOLS) straight back to their landing
  // route on direct navigation -- live-reproduced via Playwright, 3/3
  // repeat attempts. VIEW_TOOLS is the permission preset every
  // clinical/tool-using role already carries (emergency-physician,
  // icu-physician, cardiologist, nurse, pharmacist, lab-technician,
  // biomedical-engineer), so both belong in its route bucket rather than a
  // separate permission key the ROLE_PERMISSION_PRESETS vocabulary doesn't
  // otherwise use.
  VIEW_TOOLS: [
    CANONICAL_ROUTES.tools,
    CANONICAL_ROUTES.emergencyTools,
    CANONICAL_ROUTES.protocols,
    '/lab',
    CANONICAL_ROUTES.knowledgeHub,
    CANONICAL_ROUTES.assetPacks,
    // /marketplace is a redirect-only alias to /plugins (routes.config.ts's
    // IN_SHELL_ROUTE_REDIRECTS) -- ProfileRouteGuard wraps that redirect
    // route too, so without an entry here the redirect itself never fires
    // (bounced before it can run), same failure mode as the /vehicle
    // three-competing-redirect-systems bug found in the same sweep.
    CANONICAL_ROUTES.marketplace,
    CANONICAL_ROUTES.plugins,
    // recommendations/knowledgeBase/digitalTwin have no `permission` field
    // in navigation.config.ts at all (visible to everyone) yet were still
    // unreachable by direct nav for the usual reason -- no
    // PERMISSION_ROUTE_MAP bucket. All three resolve to Tools-console
    // destinations (ToolsFilteredConsole / ToolsRedirect), so VIEW_TOOLS is
    // the natural fit. Traced 2026-08-22 as part of the authorization
    // mismatch matrix's 19-route backlog.
    CANONICAL_ROUTES.recommendations,
    CANONICAL_ROUTES.knowledgeBase,
    CANONICAL_ROUTES.digitalTwin,
  ],
  VIEW_EMERGENCY: [CANONICAL_ROUTES.emergencyWhiteboard],
  VIEW_EMERGENCY_RECEPTION: [
    CANONICAL_ROUTES.emergencyReception,
    CANONICAL_ROUTES.emergencyPatients,
    CANONICAL_ROUTES.emergencyIntake,
    CANONICAL_ROUTES.emergencyPulse,
    CANONICAL_ROUTES.emergencyShift,
  ],
  // HEAL-347.48: a live sweep found 14 fully-built platform pages with zero
  // PERMISSION_ROUTE_MAP coverage at all -- same bug class as HEAL-347.47's
  // /protocols//lab gap, ~7x larger. Confirmed live with 2 roles/mechanisms
  // (dev-bypass physician; platform-admin, which correctly reaches
  // /governance-registry via VIEW_GOVERNANCE, proving the guard itself
  // works and this is purely a missing-data gap). Grouped into the existing
  // buckets by what each page actually does, using the SAME
  // ROLE_PERMISSION_PRESETS vocabulary (saasProfileConstants.ts) already in
  // use, rather than introducing new permission keys nothing emits.
  VIEW_OPERATIONS: [
    CANONICAL_ROUTES.operations,
    CANONICAL_ROUTES.integrationHub,
    CANONICAL_ROUTES.workflows,
    CANONICAL_ROUTES.workflowMining,
    CANONICAL_ROUTES.discover,
    // systemHealth/saasHealth/selfDiagnostics are gated in navigation.config.ts
    // on permission: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'] (either grants
    // nav visibility) but VIEW_OBSERVABILITY has no PERMISSION_ROUTE_MAP bucket
    // at all -- same missing-coverage bug found live 2026-08-21. Listing them
    // under the OR'd permission that does have a bucket.
    CANONICAL_ROUTES.systemHealth,
    CANONICAL_ROUTES.saasHealth,
    CANONICAL_ROUTES.selfDiagnostics,
    // workspaceDependencyGraph/liveMap also had no `permission` field and
    // no PERMISSION_ROUTE_MAP coverage despite both being real, fully-built,
    // internally-linked pages (WorkspaceDependencyGraph.tsx,
    // LiveTrackingMap.tsx) -- confirmed live 2026-08-22, part of the same
    // 19-route backlog. Both are platform/operations-monitoring
    // capabilities, matching this bucket's existing siblings
    // (dependencyMap/dependencyGraph/systemHealth).
    CANONICAL_ROUTES.workspaceDependencyGraph,
    CANONICAL_ROUTES.liveMap,
  ],
  // /vehicle is a legacy-alias path -- PilotExtensionRouteGuard (see
  // edApplication.config.ts's ED_EXTENSION_ROUTE_REDIRECTS) already has the
  // correct, purpose-built rule folding it into /emergency/ems, but
  // ProfileRouteGuard wraps that guard and evaluates first, so any role
  // this map didn't cover for '/vehicle' got bounced to its OWN generic
  // landing route before PilotExtensionRouteGuard's redirect ever ran.
  // Live-confirmed: same URL landed a physician on /emergency/whiteboard
  // (wrong) and an ems_coordinator on /emergency/ems (correct) -- role-
  // dependent silent inconsistency with zero access-denied messaging.
  // Granting it alongside the real fleet routes lets the specific,
  // already-correct redirect fire consistently for fleet/EMS-capable roles.
  VIEW_FLEET: [CANONICAL_ROUTES.fleetCommand, CANONICAL_ROUTES.fleetMap, '/vehicle'],
  VIEW_MEDICAL_IOT: [CANONICAL_ROUTES.medicalIot, CANONICAL_ROUTES.devices],
  VIEW_DEVICES: [CANONICAL_ROUTES.devices, CANONICAL_ROUTES.hospitalMap],
  VIEW_GOVERNANCE: [
    CANONICAL_ROUTES.governanceRegistry,
    CANONICAL_ROUTES.aiGovernance,
    CANONICAL_ROUTES.humanReview,
    CANONICAL_ROUTES.security,
    // Caught by navigationPermissionInvariants.test.ts, not the manual sweep:
    // the 'governance' nav item uses CANONICAL_ROUTES.emergencyAiGovernance
    // ('/emergency/ai-governance'), a DIFFERENT route from the
    // similarly-named CANONICAL_ROUTES.aiGovernance ('/ai-governance') above
    // -- a naming collision that made this bucket look complete on manual
    // inspection while actually missing the real target route.
    CANONICAL_ROUTES.emergencyAiGovernance,
  ],
  // dataLineage is gated in navigation.config.ts on permission:
  // 'VIEW_AUDIT_LOGS' (it's also reachable via CONFIGURE_SYSTEM below, but a
  // role holding only VIEW_AUDIT_LOGS -- exactly what its own nav item
  // requires -- still couldn't reach it directly). Same sweep, 2026-08-21.
  VIEW_AUDIT_LOGS: [CANONICAL_ROUTES.audit, CANONICAL_ROUTES.automationAudit, CANONICAL_ROUTES.dataLineage],
  // Broader sweep of the same PERMISSION_ROUTE_MAP-coverage bug (2026-08-21):
  // navigation.config.ts gates 'security' on VIEW_AI_SECURITY (nav shows it
  // to VIEW_AI_SECURITY holders), 'regulatory' on VIEW_REGULATORY, and
  // 'customerPortal' on MANAGE_SUBSCRIPTIONS -- none of the three had ANY
  // PERMISSION_ROUTE_MAP bucket, so a role with exactly the permission its
  // own nav item requires (and nothing else) still couldn't reach the route
  // by direct navigation. 'security' was already reachable via VIEW_GOVERNANCE
  // for roles that hold both; this restores the intended standalone path too.
  VIEW_AI_SECURITY: [CANONICAL_ROUTES.security],
  VIEW_REGULATORY: [CANONICAL_ROUTES.regulatory],
  // navigation.config.ts's ADMIN_NAV_PERMISSION_BY_ID (a SECOND, separate
  // route->permission mapping, distinct from the per-item `permission` field
  // above) ORs 'billing' in under MANAGE_SUBSCRIPTIONS too, and grants
  // 'platform-admin'/'tenant-admin' nav visibility to MANAGE_USERS holders
  // as an alternative to CONFIGURE_SYSTEM/MANAGE_ORGANIZATION -- a role with
  // only MANAGE_USERS saw both in nav but had no PERMISSION_ROUTE_MAP path
  // to either. Same coverage-gap sweep, 2026-08-21.
  MANAGE_SUBSCRIPTIONS: [CANONICAL_ROUTES.customerPortal, CANONICAL_ROUTES.billing],
  MANAGE_USERS: [CANONICAL_ROUTES.platformAdmin, CANONICAL_ROUTES.tenantAdmin],
  // Live sweep (2026-08-21) found 5 more nav items gated on permission:
  // 'VIEW_ANALYTICS' in navigation.config.ts with zero PERMISSION_ROUTE_MAP
  // coverage -- same bug class as HEAL-347.47/347.48: the nav shows/hides
  // these for VIEW_ANALYTICS holders, but direct navigation (ProfileRouteGuard
  // -> isRouteAllowedInCompiledProfile) silently bounced everyone, including
  // those holders, back to their landing route with no error message.
  // departmentIntelligence had no `permission` field in navigation.config.ts
  // at all (visible in nav to everyone) yet was still unreachable by direct
  // nav for the same reason -- grouped here since it's an analytics/insights
  // surface like its siblings, not because its nav gate said so.
  VIEW_ANALYTICS: [
    CANONICAL_ROUTES.emergencyAnalytics,
    CANONICAL_ROUTES.executive,
    CANONICAL_ROUTES.expansionOpportunities,
    CANONICAL_ROUTES.productIntelligence,
    CANONICAL_ROUTES.usage,
    CANONICAL_ROUTES.platformLearningEngine,
    CANONICAL_ROUTES.businessBrain,
    CANONICAL_ROUTES.aiEvaluation,
    CANONICAL_ROUTES.departmentIntelligence,
    CANONICAL_ROUTES.maturityAssessment,
    // ADMIN_NAV_PERMISSION_BY_ID grants 'enterprise-readiness' nav visibility
    // to VIEW_ANALYTICS holders; same gap, same sweep.
    CANONICAL_ROUTES.enterpriseReadiness,
    // customerSuccessDashboard is the real page a stale nav-item redirect
    // chain was pointed away from (see navigation.config.ts's
    // 'customer-success' item, fixed 2026-08-22) -- had zero
    // PERMISSION_ROUTE_MAP coverage since nothing linked to it directly
    // before. Business-intelligence page, same bucket as its siblings.
    CANONICAL_ROUTES.customerSuccessDashboard,
  ],
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
  MANAGE_ORGANIZATION: [
    CANONICAL_ROUTES.tenantAdmin,
    CANONICAL_ROUTES.adminOperations,
    // navigation.config.ts gates 'organization' on MANAGE_ORGANIZATION too;
    // same coverage-gap sweep, 2026-08-21.
    CANONICAL_ROUTES.organization,
    // serviceLines is a real, fully-built, backend-wired organization
    // structure page (ServiceLinesPage.tsx, platformConsoleRoutes.ts) with
    // no `permission` field in navigation.config.ts and zero
    // PERMISSION_ROUTE_MAP coverage -- confirmed live 2026-08-22 as part of
    // the 19-route backlog. Same bucket as its sibling organization pages.
    CANONICAL_ROUTES.serviceLines,
  ],
  CONFIGURE_SYSTEM: [
    CANONICAL_ROUTES.platformAdmin,
    CANONICAL_ROUTES.featureFlags,
    CANONICAL_ROUTES.dependencyMap,
    CANONICAL_ROUTES.dependencyGraph,
    CANONICAL_ROUTES.dataLineage,
    CANONICAL_ROUTES.selfDiagnostics,
    // configurationStudio/developerCatalog/plugins are gated in
    // navigation.config.ts on permission: 'CONFIGURE_SYSTEM' but were
    // missing from this bucket -- same coverage-gap sweep, 2026-08-21.
    CANONICAL_ROUTES.configurationStudio,
    CANONICAL_ROUTES.developerCatalog,
    CANONICAL_ROUTES.plugins,
  ],
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
  // HEAL-336: a user's own role is checked before the catalog's generic
  // saasRole -> emergencyRoleId default. The catalog maps each broad
  // saasRole to a single representative emergency role (e.g. 'nurse' ->
  // 'triage_nurse'), so once HEAL-323 taught normalizeSaasRole() the
  // charge_nurse/triage_nurse aliases (both now correctly resolving to the
  // 'nurse' saasRole tier for permissions/copy purposes), that generic
  // mapping started winning here too -- silently collapsing a charge nurse's
  // already-specific, already-valid 'charge_nurse' role into 'triage_nurse'
  // for role-based UI/routing (confirmed live: RouteScreenMode resolved
  // 'triage_nurse' for a charge_nurse demo user). A user's own specific role
  // is always at least as precise as the catalog's generic bucket, so it
  // must win; the catalog default is only for users with no specific
  // emergency role of their own to fall back on.
  if (user?.role) {
    const normalizedUserRole = normalizeEmergencyRole(user.role);
    if (Object.values(EMERGENCY_ROLE_IDS).includes(normalizedUserRole)) return normalizedUserRole;
  }
  if (catalog?.emergencyRoleId) {
    return normalizeEmergencyRole(catalog.emergencyRoleId);
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
