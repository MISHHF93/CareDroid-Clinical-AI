/**
 * Unified profile compiler — routes, tools, and launch policy per SaaS role.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  buildNavigationRoutes,
  resolveUserProfileFromSaasRole,
  type ResolvedUserProfile,
} from './userProfileCatalog';
import { resolveSaasToolResonance, applySaasResonanceToToolProfile, type SaasToolResonance } from './saasProfileToolResonance';
import {
  isProfileAssignableForOrganization,
  type ProfileSegregationContext,
} from './userProfileSegregation';
import { listTrackMindRoutesForRole } from './trackMindRolePermissions';
import { getEmergencyRoleDefinition } from './emergencyRolePermissions';
import {
  isStrictPackEnforcementForRole,
  toolMatchesProfilePackPolicy,
  type ToolPackCarrier,
} from './profilePackTaxonomy';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import {
  ASSET_ACCESS_STATES,
  projectToolsWithAccess,
  filterVisibleTools,
  resolveAssetAccessState,
} from '../data/assetAccess';
import { buildProfileToolGraph, buildUserToolProfile } from '../data/profileToolSegmentation';
import { getPlatformEntitlementContext } from '../data/assetEntitlements';

export type CompiledToolRecord = Record<string, unknown> & {
  id: string;
  accessState?: string;
  isLaunchable?: boolean;
  restrictionReason?: string;
  profileScore?: number;
};

export type CompiledUserProfile = Readonly<{
  saasRole: string;
  catalog: ResolvedUserProfile;
  resonance: SaasToolResonance;
  segregation: ProfileSegregationContext;
  assignableForOrg: boolean;
  strictPackEnforcement: boolean;
  routes: Readonly<{ allowed: string[]; home: string }>;
  tools: Readonly<{
    visible: CompiledToolRecord[];
    recommended: CompiledToolRecord[];
    restricted: CompiledToolRecord[];
    required: CompiledToolRecord[];
    launchable: CompiledToolRecord[];
  }>;
  trackMind?: Readonly<{ roleId: string; routes: string[] }>;
  emergency?: Readonly<{ roleId: string; landingRoute: string }>;
  segmentationProfile: Record<string, unknown>;
}>;

export type CompileUserProfileInput = Readonly<{
  saasRole: string | null | undefined;
  orgContext?: ProfileSegregationContext;
  workspaceContext?: Record<string, unknown>;
  userPrefs?: Record<string, unknown>;
  tools?: CompiledToolRecord[];
  entitlementContext?: Record<string, unknown>;
}>;

function resolveProfileHome(catalog: ResolvedUserProfile): string {
  if (catalog.emergencyRoleId) {
    const definition = getEmergencyRoleDefinition(catalog.emergencyRoleId);
    return definition?.defaultRoute || CANONICAL_ROUTES.emergencyReception;
  }
  if (catalog.trackMindRoleId) {
    return CANONICAL_ROUTES.trackMindWorkspace;
  }
  return CANONICAL_ROUTES.platformStart;
}

function buildSegmentationProfile(
  input: CompileUserProfileInput,
  saasRole: string,
): Record<string, unknown> {
  const base = buildUserToolProfile({
    preferences: input.userPrefs as Parameters<typeof buildUserToolProfile>[0]['preferences'],
    activeWorkspace: input.workspaceContext as Parameters<typeof buildUserToolProfile>[0]['activeWorkspace'],
    toolPreferences: (input.userPrefs?.toolPreferences as Record<string, unknown>) || {},
  });
  return applySaasResonanceToToolProfile(base, saasRole);
}

export function compileProfileRoutes(saasRole: string | null | undefined): string[] {
  const catalog = resolveUserProfileFromSaasRole(saasRole);
  return buildNavigationRoutes(catalog, catalog.permissionPresets);
}

export function compileUserProfile(input: CompileUserProfileInput): CompiledUserProfile {
  const catalog = resolveUserProfileFromSaasRole(input.saasRole);
  const saasRole = catalog.saasRole;
  const resonance = resolveSaasToolResonance(saasRole);
  const segregation: ProfileSegregationContext = {
    organizationType: input.orgContext?.organizationType ?? 'hospital',
    entitledPackIds: input.orgContext?.entitledPackIds ?? [],
  };
  const assignableForOrg = isProfileAssignableForOrganization(catalog, segregation);
  const strictPackEnforcement = isStrictPackEnforcementForRole(saasRole);
  const allowedRoutes = compileProfileRoutes(saasRole);
  const home = resolveProfileHome(catalog);

  const segmentationProfile = buildSegmentationProfile(input, saasRole);
  const rawTools = input.tools?.length
    ? input.tools
    : getUserFacingToolRegistryProjection();

  const entitlementContext = {
    ...getPlatformEntitlementContext(),
    ...(input.entitlementContext || {}),
    saasRole,
    roleProfile: { id: saasRole, ...(input.entitlementContext?.roleProfile as object) },
  };

  const withAccess = projectToolsWithAccess(rawTools, entitlementContext, saasRole);
  const graph = buildProfileToolGraph({ tools: withAccess, profile: segmentationProfile });

  const requiredIds = new Set(catalog.requiredToolIds || []);
  const required = withAccess.filter((tool) => requiredIds.has(tool.id));

  const visible = filterVisibleTools(
    graph.visibleTools.filter((tool) => {
      if (!toolMatchesProfilePackPolicy(tool, saasRole, { strict: strictPackEnforcement })) {
        return false;
      }
      return true;
    }),
    { includeLocked: false, includeDemo: true },
  ) as CompiledToolRecord[];

  const visibleIds = new Set(visible.map((t) => t.id));
  const recommended = graph.recommendedTools.filter((t) => visibleIds.has(t.id)) as CompiledToolRecord[];
  const restricted = [
    ...graph.restrictedTools,
    ...withAccess.filter(
      (tool) =>
        !visibleIds.has(tool.id) &&
        !graph.restrictedTools.some((r) => r.id === tool.id),
    ),
  ] as CompiledToolRecord[];

  const launchable = visible.filter((tool) =>
    [
      ASSET_ACCESS_STATES.ALLOWED,
      ASSET_ACCESS_STATES.BETA,
      ASSET_ACCESS_STATES.EXPERIMENTAL,
      ASSET_ACCESS_STATES.DEMO_ONLY,
    ].includes(tool.accessState as string),
  );

  const trackMind = catalog.trackMindRoleId
    ? {
        roleId: catalog.trackMindRoleId,
        routes: listTrackMindRoutesForRole(catalog.trackMindRoleId),
      }
    : undefined;

  const emergency = catalog.emergencyRoleId
    ? {
        roleId: catalog.emergencyRoleId,
        landingRoute: getEmergencyRoleDefinition(catalog.emergencyRoleId)?.defaultRoute || home,
      }
    : undefined;

  return Object.freeze({
    saasRole,
    catalog,
    resonance,
    segregation,
    assignableForOrg,
    strictPackEnforcement,
    routes: Object.freeze({ allowed: allowedRoutes, home }),
    tools: Object.freeze({
      visible,
      recommended,
      restricted,
      required: required as CompiledToolRecord[],
      launchable,
    }),
    trackMind,
    emergency,
    segmentationProfile,
  });
}

export function isToolLaunchableForProfile(
  toolId: string,
  compiled: CompiledUserProfile,
): boolean {
  return compiled.tools.launchable.some((tool) => tool.id === toolId);
}

export function isToolAllowedForCompiledProfile(
  toolId: string,
  tool: ToolPackCarrier,
  saasRole: string,
  entitlementContext?: Record<string, unknown>,
): boolean {
  const catalog = resolveUserProfileFromSaasRole(saasRole);
  if ((catalog.toolPolicy?.restrictedToolIds || []).includes(toolId)) return false;
  if (!toolMatchesProfilePackPolicy(
    { id: toolId, packId: tool.packId, assetPackId: tool.assetPackId, category: tool.category },
    saasRole,
  )) {
    return false;
  }
  const access = resolveAssetAccessState(
    { ...tool, id: toolId, canonicalInventoryId: toolId },
    { ...getPlatformEntitlementContext(), ...(entitlementContext || {}) },
    saasRole,
  );
  return [
    ASSET_ACCESS_STATES.ALLOWED,
    ASSET_ACCESS_STATES.BETA,
    ASSET_ACCESS_STATES.EXPERIMENTAL,
    ASSET_ACCESS_STATES.DEMO_ONLY,
  ].includes(access.accessState as string);
}

export function isRouteAllowedInCompiledProfile(
  path: string | null | undefined,
  compiled: CompiledUserProfile,
): boolean {
  if (!path) return false;
  const normalized = String(path).split('?')[0];
  return compiled.routes.allowed.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  );
}
