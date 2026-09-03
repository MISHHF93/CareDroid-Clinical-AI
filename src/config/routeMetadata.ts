/**
 * Route metadata -- a DERIVED VIEW over CANONICAL_ROUTE_MAP. Not adopted.
 *
 * Nothing in the app imports this file. It is kept because the shape it
 * projects (title/description/breadcrumbs/permissions/roles/navigationGroup/
 * helpTopicId) is a reasonable one, but two things must be understood before
 * anyone wires it:
 *
 * 1. It is NOT a source of truth. Every value is read out of
 *    CANONICAL_ROUTE_MAP in routes.config.ts, which is the actual registry
 *    driving navigation and authorization. The previous header here called
 *    this file the "Single Source of Truth" and said it "replaces the pattern
 *    of copying metadata into individual page components" -- it replaced
 *    nothing, because it has no consumers.
 *
 * 2. Its matcher is narrower than the real one. getRouteMetadata() below
 *    searches CANONICAL_ROUTE_MAP only. routes.config.ts's getRouteByPath()
 *    deliberately falls back to ROUTE_RECORDS as well, in both own-path and
 *    alias phases, because CANONICAL_ROUTE_MAP's `copilot` record declares no
 *    aliases while ROUTE_RECORDS' `assistant` declares /assistant, /chat, /ai
 *    and /copilot -- without that fallback every role was denied on all four
 *    alias URLs. Wiring this file as-is would reintroduce exactly that bug.
 *
 * If you need route metadata today, call getRouteByPath() / getRouteById()
 * from routes.config.ts. If you adopt this module instead, route its lookups
 * through those functions first rather than re-walking CANONICAL_ROUTE_MAP.
 */

import { CANONICAL_ROUTE_MAP } from '../config/routes.config';

export interface RouteMetadata {
  /** Route ID (e.g., 'reception', 'triage', 'whiteboard') */
  id: string;
  /** Route path (e.g., '/emergency/reception') */
  path: string;
  /** Human-readable page title */
  title: string;
  /** Page description */
  description: string;
  /** Breadcrumb trail */
  breadcrumbs: string[];
  /** Required permissions */
  permissions: string[];
  /** Allowed roles */
  roles: string[];
  /** Navigation group */
  navigationGroup: string;
  /** Help topic ID */
  helpTopicId: string;
  /** Whether read-only access is allowed */
  readOnlyAllowed: boolean;
  /** Whether the route is visible in navigation */
  showInNav: boolean;
}

/**
 * Get metadata for a specific route path.
 * Matches against CANONICAL_ROUTE_MAP.
 */
export function getRouteMetadata(pathname: string): RouteMetadata | null {
  // Normalize path (strip query params and hash)
  const normalizedPath = pathname.split('?')[0].split('#')[0];

  // Find matching route record
  const record = CANONICAL_ROUTE_MAP.find((r) => {
    // Exact match
    if (r.path === normalizedPath) return true;
    // Active paths match
    if (r.activePaths?.some((p) => p === normalizedPath)) return true;
    // Pattern match (e.g., /patients/:id)
    if (r.path.includes(':')) {
      const pattern = r.path.replace(/:[^/]+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(normalizedPath);
    }
    return false;
  });

  if (!record) return null;

  return {
    id: record.id,
    path: record.path,
    title: record.label,
    description: record.description,
    breadcrumbs: record.breadcrumbs || [],
    permissions: record.requiredPermissions || [],
    roles: record.allowedRoles || [],
    navigationGroup: record.navigationGroup || '',
    helpTopicId: record.helpTopicId || '',
    readOnlyAllowed: record.readOnlyAllowed ?? false,
    showInNav: record.showInNav ?? true,
  };
}

/**
 * Get metadata for a specific route ID.
 */
export function getRouteMetadataById(id: string): RouteMetadata | null {
  const record = CANONICAL_ROUTE_MAP.find((r) => r.id === id);
  if (!record) return null;

  return {
    id: record.id,
    path: record.path,
    title: record.label,
    description: record.description,
    breadcrumbs: record.breadcrumbs || [],
    permissions: record.requiredPermissions || [],
    roles: record.allowedRoles || [],
    navigationGroup: record.navigationGroup || '',
    helpTopicId: record.helpTopicId || '',
    readOnlyAllowed: record.readOnlyAllowed ?? false,
    showInNav: record.showInNav ?? true,
  };
}

/**
 * Get all route metadata for a specific navigation group.
 */
export function getRoutesByGroup(group: string): RouteMetadata[] {
  return CANONICAL_ROUTE_MAP.filter((r) => r.navigationGroup === group).map((r) => ({
    id: r.id,
    path: r.path,
    title: r.label,
    description: r.description,
    breadcrumbs: r.breadcrumbs || [],
    permissions: r.requiredPermissions || [],
    roles: r.allowedRoles || [],
    navigationGroup: r.navigationGroup || '',
    helpTopicId: r.helpTopicId || '',
    readOnlyAllowed: r.readOnlyAllowed ?? false,
    showInNav: r.showInNav ?? true,
  }));
}
