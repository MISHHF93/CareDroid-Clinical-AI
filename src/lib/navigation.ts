import {
  CANONICAL_ROUTE_MAP,
  getDefaultRouteForProfile,
  getRouteByPath,
  normalizeRoutePath,
} from '../config/routes.config';
import type { HospitalRole } from './users/userTypes';
import { getPermissionsForRole } from './users/permissions';

export type RouteAccessEntry = Readonly<{
  path: string;
  label: string;
  allowedRoles: readonly HospitalRole[];
  requiredPermissions: readonly string[];
  navVisible: boolean;
  priority: number;
}>;

export const ROUTE_ACCESS_CONFIG: readonly RouteAccessEntry[] = Object.freeze(
  CANONICAL_ROUTE_MAP.map((route) =>
    Object.freeze({
      path: route.path,
      label: route.label,
      allowedRoles: route.allowedRoles as readonly HospitalRole[],
      requiredPermissions: route.requiredPermissions,
      navVisible: route.showInNav,
      priority: route.priority,
    }),
  ),
);

export function getRouteAccess(path: string): RouteAccessEntry | undefined {
  const route = getRouteByPath(path);
  const normalizedPath = normalizeRoutePath(route?.path || path);
  return ROUTE_ACCESS_CONFIG.find((entry) => normalizeRoutePath(entry.path) === normalizedPath);
}

export function canRoleAccessRoute(role: HospitalRole, path: string): boolean {
  const entry = getRouteAccess(path);
  if (!entry) return true;
  const permissions = getPermissionsForRole(role) as readonly string[];
  return (
    (entry.allowedRoles as HospitalRole[]).includes(role) &&
    entry.requiredPermissions.every((permission) => permissions.includes(permission))
  );
}

export function getNavVisibleRoutes(role: HospitalRole): RouteAccessEntry[] {
  return ROUTE_ACCESS_CONFIG.filter(
    (entry) => entry.navVisible && (entry.allowedRoles as HospitalRole[]).includes(role),
  ).sort((a, b) => a.priority - b.priority);
}

export function getUnauthorizedFallback(role?: HospitalRole | string): string {
  return getDefaultRouteForProfile(role);
}
