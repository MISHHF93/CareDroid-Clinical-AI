import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  APP_SHELL_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from './navigation.config';
import { USER_PROFILE_CATALOG, resolveUserProfileFromSaasRole, isRouteAllowedForProfile } from './userProfileCatalog';
import { canAccessRoute, compileCareDroidAccessProfile } from '../lib/users/canonicalAccess';

/**
 * Authorization mismatch matrix -- cross-references CareDroid's two
 * independent route-authorization dimensions against every concrete profile
 * in USER_PROFILE_CATALOG and every nav-visible route.
 *
 * DIMENSION A (clinical): emergencyRole.canAccessRoute -- itself backed by
 * TWO independently-maintained lists ORed together: EMERGENCY_ROLE_
 * DEFINITIONS[role].routes (role -> routes) and ROUTE_RECORDS[route].
 * allowedRoles (route -> roles, the inverse direction). These can drift
 * apart from each other without anyone noticing, since the OR masks a gap
 * in either single list -- only total absence from BOTH denies access.
 *
 * DIMENSION B (platform): PERMISSION_ROUTE_MAP via isRouteAllowedForProfile,
 * keyed on the profile's saasRole permission preset.
 *
 * This is NOT a claim that the two dimensions should be consolidated --
 * proven in the live /organization investigation that they answer
 * different questions (clinical-workflow access vs. platform-tier
 * capability access) and are correctly combined via OR-for-allow. This
 * matrix exists to make where they land for every real profile/route
 * combination visible and auditable, not to argue they're wrong.
 */

type NavItem = {
  id?: string;
  path?: string;
  label?: string;
  permission?: string | string[];
  kind?: 'route' | 'action';
};

const NAV_ITEM_ARRAYS: ReadonlyArray<readonly NavItem[]> = [
  APP_SHELL_NAV_ITEMS,
  ACCOUNT_UTILITY_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
];

function collectNavRoutes(): Array<{ id: string; path: string; label: string }> {
  const seen = new Map<string, { id: string; path: string; label: string }>();
  for (const items of NAV_ITEM_ARRAYS) {
    for (const item of items) {
      // kind: 'action' items (e.g. search, notifications) are client-side
      // triggers, not real navigable pages -- excluded by construction from
      // the reachability matrix rather than via an ever-growing exception
      // list. See navigation.config.ts's NavigationDestinationKind doc.
      if (item.path && item.kind !== 'action' && !seen.has(item.path)) {
        seen.set(item.path, { id: item.id || item.path, path: item.path, label: item.label || item.id || item.path });
      }
    }
  }
  return [...seen.values()];
}

function dimensionAAllows(emergencyRoleId: string | null | undefined, path: string): boolean {
  if (!emergencyRoleId) return false;
  try {
    const compiled = compileCareDroidAccessProfile({
      role: emergencyRoleId,
      profile: { roleProfileId: emergencyRoleId },
    } as any);
    return canAccessRoute(compiled, path);
  } catch {
    return false;
  }
}

describe('authorization mismatch matrix', () => {
  const routes = collectNavRoutes();

  it('sanity check: matches the live-proven ed_manager / /organization result (Dimension A = false)', () => {
    // Ground truth captured live 2026-08-22 via instrumented ProfileRouteGuard,
    // 9/9 reproducible: emergencyCanAccess was false for ed_manager on /organization.
    expect(dimensionAAllows('ed_manager', '/organization')).toBe(false);
  });

  it('builds the full matrix and reports classification totals', () => {
    const rows: Array<Record<string, unknown>> = [];
    const totals: Record<string, number> = {};

    for (const catalogEntry of USER_PROFILE_CATALOG) {
      const profile = resolveUserProfileFromSaasRole(catalogEntry.saasRole);
      for (const route of routes) {
        const dimA = dimensionAAllows(catalogEntry.emergencyRoleId, route.path);
        const dimB = isRouteAllowedForProfile(profile, route.path);
        const combined = dimA || dimB;

        let classification: string;
        if (dimA && dimB) classification = 'BOTH_ALLOW';
        else if (dimA && !dimB) classification = 'LEGITIMATE_CLINICAL_ONLY';
        else if (!dimA && dimB) classification = 'LEGITIMATE_PLATFORM_ONLY';
        else classification = 'BOTH_DENY';

        totals[classification] = (totals[classification] || 0) + 1;
        rows.push({
          saasRole: catalogEntry.saasRole,
          emergencyRoleId: catalogEntry.emergencyRoleId,
          routeId: route.id,
          path: route.path,
          dimensionA_clinical: dimA,
          dimensionB_platform: dimB,
          combined,
          classification,
        });
      }
    }

    // Routes that BOTH_DENY for every single profile in the catalog are
    // NO_PROFILE_CAN_ACCESS candidates -- genuinely worth surfacing.
    const deniedForEveryone = routes.filter((route) =>
      rows.filter((r) => r.path === route.path).every((r) => r.classification === 'BOTH_DENY'),
    );

    const summary = {
      totalProfiles: USER_PROFILE_CATALOG.length,
      totalRoutes: routes.length,
      totalCombinations: rows.length,
      classificationTotals: totals,
      routesNoProfileCanAccess: deniedForEveryone.map((r) => ({ id: r.id, path: r.path, label: r.label })),
    };

    console.log('MATRIX_SUMMARY ' + JSON.stringify(summary, null, 2));

    // 2026-08-22: originally 19 routes landed here. /search and
    // /notifications are now excluded from this matrix entirely (see
    // collectNavRoutes's `kind !== 'action'` filter) -- they're client-side
    // action triggers (a search overlay, a notification panel), not real
    // navigable pages, confirmed via their Header.tsx click handlers rather
    // than a <Route> registration. That leaves 17 tracked below. 5 sampled
    // (digital-twin, assets, live-map, agents, products) are confirmed via
    // exhaustive grep across router.tsx and every *RouteTree.tsx/*.Routes.ts
    // file to have ZERO <Route> registration anywhere in the app -- dead nav
    // entries pointing at URLs with no page behind them, a different and
    // more basic defect than an authorization-dimension gap (this matrix
    // can only prove "no dimension grants access to this path"; it can't
    // distinguish that from "no page exists at this path" without
    // cross-referencing the full route tree).
    //
    // Not hard-failing on this list: distinguishing "genuinely orphaned
    // authorization gap on a real page" from "dead nav entry with no page"
    // for the remaining 12 requires the same per-route <Route>-registration
    // check as the 5 sampled, which hasn't been done for all of them yet.
    // Tracking the exact known set below so any NEW entry (a route that
    // wasn't in this list before) fails the test and gets investigated
    // before it can silently join an already-known backlog.
    const KNOWN_UNRESOLVED_NO_ACCESS_ROUTES = new Set([
      '/customer-portal',
      '/knowledge-base',
      '/recommendations',
      '/products',
      '/service-lines',
      '/integration-readiness',
      '/solution-builder',
      '/value-tracking',
      '/success-center',
      '/specialties',
      '/care-pathways',
      '/agents',
      '/workspace-dependency-graph',
      '/digital-twin-intelligence',
      '/digital-twin',
      '/live-map',
      '/assets',
    ]);
    const newlyUnreachable = deniedForEveryone
      .map((r) => r.path)
      .filter((path) => !KNOWN_UNRESOLVED_NO_ACCESS_ROUTES.has(path));
    expect(
      newlyUnreachable,
      `New route(s) became unreachable by every catalog profile -- not in the known/tracked backlog: ${JSON.stringify(newlyUnreachable)}`,
    ).toEqual([]);
  });
});
