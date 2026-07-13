/**
 * Route Metadata — Single Source of Truth
 *
 * Centralizes route-level metadata so page titles, breadcrumbs, permissions,
 * and workspace context are declared once and consumed consistently.
 *
 * Replaces the pattern of copying metadata into individual page components.
 */

import { CANONICAL_ROUTE_MAP, CANONICAL_ROUTES } from '../config/routes.config';

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
  return CANONICAL_ROUTE_MAP
    .filter((r) => r.navigationGroup === group)
    .map((r) => ({
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
