import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  APP_SHELL_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from './navigation.config';
import {
  USER_PROFILE_CATALOG,
  resolveUserProfileFromSaasRole,
  isRouteAllowedForProfile,
} from './userProfileCatalog';
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
        seen.set(item.path, {
          id: item.id || item.path,
          path: item.path,
          label: item.label || item.id || item.path,
        });
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
      routesNoProfileCanAccess: deniedForEveryone.map((r) => ({
        id: r.id,
        path: r.path,
        label: r.label,
      })),
    };

    console.log('MATRIX_SUMMARY ' + JSON.stringify(summary, null, 2));

    // 2026-08-22: originally 19 routes landed here. Resolved via a full
    // per-item trace (agent investigation + manual classification) rather
    // than blanket permission grants:
    //
    // /search, /notifications -- excluded from this matrix by construction
    // (`kind !== 'action'` in collectNavRoutes): client-side action
    // triggers, not real pages.
    //
    // 9 dead nav entries REMOVED (navigation.config.ts): products,
    // specialties, care-pathways, agents, integration-readiness,
    // solution-builder, value-tracking, digital-twin-intelligence, assets.
    // All confirmed via exhaustive grep to have zero <Route> registration
    // anywhere in the app. 8 of the 9 trace to a single deliberate commit
    // (eb6a2463, "normalize codebase into one unified ED application",
    // 2026-06-25) that purged CommercialPages.jsx's pre-pivot SaaS/
    // marketing pages -- these nav entries were simply never cleaned up
    // afterward. `assets` is the one exception with no history of ever
    // having a page at all. Backend routes for the purged features were
    // deliberately RETAINED (not deleted) per "don't delete useful backend
    // capability merely because its old page disappeared" -- they may
    // still serve API consumers outside the nav, and rebuilding pre-pivot
    // commercial pages for a now-ED-focused clinical platform isn't this
    // fix's call to make unilaterally.
    //
    // 7 real, working routes were missing PERMISSION_ROUTE_MAP coverage
    // (or, for customer-portal, the permission existed in the map but was
    // granted to zero roles -- same failure shape as VIEW_OBSERVABILITY)
    // and are now fixed in userProfileCatalog.ts: recommendations,
    // knowledgeBase, digitalTwin (-> VIEW_TOOLS), workspaceDependencyGraph,
    // liveMap (-> VIEW_OPERATIONS), serviceLines (-> MANAGE_ORGANIZATION),
    // customerPortal (-> MANAGE_SUBSCRIPTIONS, now granted to platform-admin).
    //
    // 1 rename-drift case fixed: the 'customer-success' nav item
    // (label "Success Center") pointed at a stale two-hop redirect chain
    // ending at /admin/tenant, while a real, fully-built
    // CustomerSuccessDashboard page sat unlinked at
    // /customer-success-dashboard. Repointed the nav item at the real page
    // and added its missing PERMISSION_ROUTE_MAP entry.
    //
    // The known-unresolved set is now empty. Any route that lands in
    // deniedForEveryone from this point on is a genuinely NEW regression,
    // not a backlog item -- investigate it the same way, don't just add it
    // here.
    const KNOWN_UNRESOLVED_NO_ACCESS_ROUTES = new Set<string>([]);
    const newlyUnreachable = deniedForEveryone
      .map((r) => r.path)
      .filter((path) => !KNOWN_UNRESOLVED_NO_ACCESS_ROUTES.has(path));
    expect(
      newlyUnreachable,
      `New route(s) became unreachable by every catalog profile -- not in the known/tracked backlog: ${JSON.stringify(newlyUnreachable)}`,
    ).toEqual([]);
  });
});
