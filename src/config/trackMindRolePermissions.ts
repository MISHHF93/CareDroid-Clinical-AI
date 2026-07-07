/**
 * TrackMind role permissions facade — routes, actions, demo roles, and access helpers.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  getTrackMindRoleDefinition,
  isTrackMindReadOnlyRole,
  normalizeTrackMindRoleId,
  TRACKMIND_ROLE_OPTIONS,
  TRACKMIND_ROLE_ID,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';
import {
  canAccessTrackMindRoute,
  canPerformTrackMindMutation,
  hasTrackMindPermission,
  listTrackMindPermissionsForRole,
  TRACKMIND_PERMISSION_KEYS,
  TRACKMIND_ROUTE_PERMISSION_MAP,
  type TrackMindPermissionContext,
} from './trackMindPermissionRegistry';
import { resolveEffectiveTrackMindRole as resolveCatalogTrackMindRole } from './userProfileCatalog';
import { resolveTrackMindRoleLandingRoute } from './trackMindRoleNavigationModel';
import { getTrackMindWorkspaceDefinition } from './trackMindWorkspaceModel';

export {
  TRACKMIND_PERMISSION_KEYS,
  TRACKMIND_ROUTE_PERMISSION_MAP,
  hasTrackMindPermission,
  canPerformTrackMindMutation,
  canAccessTrackMindRoute,
  listTrackMindPermissionsForRole,
} from './trackMindPermissionRegistry';

export {
  TRACKMIND_ROLE_ID,
  TRACKMIND_ROLE_OPTIONS,
  normalizeTrackMindRoleId,
  getTrackMindRoleDefinition,
  isTrackMindReadOnlyRole,
} from './trackMindRoleCatalog';

const TRACKMIND_PROTECTED_ROUTES = Object.freeze(
  Object.keys(TRACKMIND_ROUTE_PERMISSION_MAP),
);

export function resolveTrackMindRoleId(
  user: { trackMindRole?: string; role?: string; profile?: { trackMindRole?: string; roleProfileId?: string; role?: string }; roleProfileId?: string } | null | undefined,
  settings?: { trackMindRole?: string; roleOverrides?: Record<string, string> } | null,
): TrackMindRoleId {
  const catalogRole = resolveCatalogTrackMindRole(user, settings || {});
  if (catalogRole) return normalizeTrackMindRoleId(catalogRole);

  const override = settings?.trackMindRole || settings?.roleOverrides?.trackMind;
  if (override) return normalizeTrackMindRoleId(override);
  const fromUser =
    user?.trackMindRole ||
    user?.profile?.trackMindRole ||
    user?.profile?.role ||
    user?.role;
  return normalizeTrackMindRoleId(fromUser);
}

export function getTrackMindDemoRoles() {
  return TRACKMIND_ROLE_OPTIONS;
}

export function canAccessTrackMindSurface(
  role: string,
  path: string,
  overrides: Record<string, string[]> = {},
  context: TrackMindPermissionContext = {},
): boolean {
  if (!TRACKMIND_PROTECTED_ROUTES.includes(path)) return true;
  return canAccessTrackMindRoute(role, path, overrides, context);
}

export function listTrackMindRoutesForRole(role: string): string[] {
  const roleId = normalizeTrackMindRoleId(role);
  const permissions = new Set(listTrackMindPermissionsForRole(roleId));
  return TRACKMIND_PROTECTED_ROUTES.filter((route) => {
    const required = TRACKMIND_ROUTE_PERMISSION_MAP[route];
    return !required || permissions.has(required);
  });
}

export function getNearestTrackMindRoute(role: string, requestedPath: string): string {
  if (canAccessTrackMindSurface(role, requestedPath)) return requestedPath;
  return resolveTrackMindRoleLandingRoute(role);
}

export function buildTrackMindRoleContext(
  role: string,
  overrides: Record<string, string[]> = {},
): TrackMindPermissionContext {
  return { roleReadOnly: isTrackMindReadOnlyRole(role) };
}

export function hasTrackMindActionPermission(
  role: string,
  permission: string,
  overrides: Record<string, string[]> = {},
  context: TrackMindPermissionContext = {},
): boolean {
  return hasTrackMindPermission(role, permission, overrides, {
    roleReadOnly: context.roleReadOnly ?? isTrackMindReadOnlyRole(role),
  });
}

export function getTrackMindRoleSummary(role: string) {
  const definition = getTrackMindRoleDefinition(role);
  const workspace = getTrackMindWorkspaceDefinition(role);
  return Object.freeze({
    ...definition,
    landingRoute: resolveTrackMindRoleLandingRoute(role),
    workspaceTitle: workspace.title,
    allowedRoutes: listTrackMindRoutesForRole(role),
    allowedPermissions: listTrackMindPermissionsForRole(role),
  });
}

export const TRACKMIND_HUB_ROUTES = Object.freeze([
  CANONICAL_ROUTES.trackMindWorkspace,
  CANONICAL_ROUTES.trackMindMaturity,
  CANONICAL_ROUTES.enterprisePlatform,
  CANONICAL_ROUTES.platformIntelligence,
]);
