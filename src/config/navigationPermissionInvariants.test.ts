import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  ADMIN_NAV_PERMISSION_BY_ID,
  APP_SHELL_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from './navigation.config';
import { PERMISSION_ROUTE_MAP } from './userProfileCatalog';

/**
 * Regression coverage for the class of bug found live 2026-08-21: a route's
 * navigation visibility (navigation.config.ts's per-item `permission` field,
 * or the separate ADMIN_NAV_PERMISSION_BY_ID map) and its direct-navigation
 * authorization (userProfileCatalog.ts's PERMISSION_ROUTE_MAP, consulted by
 * ProfileRouteGuard) are two independently hand-maintained sources of the
 * same fact. They drifted apart 17 times across 8 permission buckets before
 * this file existed -- a route would show in the sidebar for a role holding
 * the right permission, but that same role got silently bounced back to
 * their landing route (no error message) on direct navigation, because
 * nobody had added the route to PERMISSION_ROUTE_MAP's matching bucket.
 *
 * This does not eliminate the duplication (that would mean rebuilding
 * ProfileRouteGuard's whole compiled-profile pipeline around a single
 * source, a larger change deferred pending broader route/workspace/action
 * model work), but it makes the two sources structurally impossible to
 * silently drift again: a new nav item, a renamed permission, or a new
 * PERMISSION_ROUTE_MAP bucket that isn't kept in sync now fails a test
 * instead of shipping a silent redirect.
 */

type NavItem = {
  id?: string;
  path?: string;
  permission?: string | string[];
};

const NAV_ITEM_ARRAYS: ReadonlyArray<readonly NavItem[]> = [
  APP_SHELL_NAV_ITEMS,
  ACCOUNT_UTILITY_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
];

function permissionsFor(item: NavItem): string[] {
  if (!item.permission) return [];
  return Array.isArray(item.permission) ? item.permission : [item.permission];
}

/** True if the route is reachable by direct navigation via ANY of the given permissions. */
function routeReachableViaAnyPermission(path: string, permissions: string[]): boolean {
  return permissions.some((permission) => (PERMISSION_ROUTE_MAP[permission] || []).includes(path));
}

describe('navigation <-> PERMISSION_ROUTE_MAP invariants', () => {
  it('every permission-gated nav item (per-item `permission` field) is reachable by direct navigation', () => {
    const failures: string[] = [];
    for (const items of NAV_ITEM_ARRAYS) {
      for (const item of items) {
        const permissions = permissionsFor(item);
        if (!permissions.length || !item.path) continue;
        if (!routeReachableViaAnyPermission(item.path, permissions)) {
          failures.push(
            `${item.id || item.path}: nav shows this to [${permissions.join(', ')}] holders, ` +
              `but ${item.path} is not in PERMISSION_ROUTE_MAP for any of those permissions`,
          );
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('every ADMIN_NAV_PERMISSION_BY_ID entry is reachable by direct navigation', () => {
    const allItemsById = new Map<string, NavItem>();
    for (const items of NAV_ITEM_ARRAYS) {
      for (const item of items) {
        if (item.id) allItemsById.set(item.id, item);
      }
    }

    const failures: string[] = [];
    for (const [id, permissions] of Object.entries(ADMIN_NAV_PERMISSION_BY_ID)) {
      const item = allItemsById.get(id);
      if (!item?.path) {
        failures.push(`ADMIN_NAV_PERMISSION_BY_ID['${id}']: no nav item with this id has a path`);
        continue;
      }
      if (!routeReachableViaAnyPermission(item.path, permissions as string[])) {
        failures.push(
          `${id}: ADMIN_NAV_PERMISSION_BY_ID grants nav visibility via [${(permissions as string[]).join(', ')}], ` +
            `but ${item.path} is not in PERMISSION_ROUTE_MAP for any of those permissions`,
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('no nav item requires a permission combination that zero roles can ever hold', () => {
    // Regression for the system-health/saas-health/self-diagnostics bug:
    // requireAllPermissions:true with a permission nobody is ever granted
    // makes a nav item permanently invisible, independent of whether
    // PERMISSION_ROUTE_MAP covers it. This only checks for the specific
    // 'referenced permission has zero PERMISSION_ROUTE_MAP coverage at all'
    // signal (a proxy for 'is this permission used anywhere real'), since
    // this file doesn't import the full role-preset roster.
    const failures: string[] = [];
    for (const items of NAV_ITEM_ARRAYS) {
      for (const item of items as Array<NavItem & { requireAllPermissions?: boolean }>) {
        if (!item.requireAllPermissions) continue;
        const permissions = permissionsFor(item);
        const uncovered = permissions.filter(
          (permission) => !PERMISSION_ROUTE_MAP[permission]?.length,
        );
        if (uncovered.length) {
          failures.push(
            `${item.id || item.path}: requireAllPermissions is true but [${uncovered.join(', ')}] ` +
              `has no PERMISSION_ROUTE_MAP coverage at all -- if nothing grants that permission, this item can never be seen`,
          );
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('every route in PERMISSION_ROUTE_MAP is a real, non-empty path (catches CANONICAL_ROUTES typos)', () => {
    const failures: string[] = [];
    for (const [permission, routes] of Object.entries(PERMISSION_ROUTE_MAP)) {
      routes.forEach((route, index) => {
        if (typeof route !== 'string' || !route.trim() || !route.startsWith('/')) {
          failures.push(
            `PERMISSION_ROUTE_MAP.${permission}[${index}] is not a valid path: ${JSON.stringify(route)}`,
          );
        }
      });
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
