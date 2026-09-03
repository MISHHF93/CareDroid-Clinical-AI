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
 * Regression coverage for CareDroid's two independent route-authorization
 * dimensions, proven live 2026-08-22 (the /organization investigation):
 *
 * DIMENSION A (clinical): "does this user's emergency/clinical role reach
 * this ED-operational route?" -- emergencyRole.canAccessRoute.
 *
 * DIMENSION B (platform): "does this user's SaaS/platform-tier role grant
 * this admin/business capability?" -- PERMISSION_ROUTE_MAP via
 * isRouteAllowedForProfile.
 *
 * ProfileRouteGuard combines them with OR-for-allow: a route is reachable
 * if EITHER dimension says yes. This is intentional, not accidental
 * duplication -- do not "simplify" this into a single role check. These
 * tests exist specifically so that simplification breaks a test instead of
 * silently shipping.
 */

type NavItem = { id?: string; path?: string; permission?: string | string[] };
const NAV_ITEM_ARRAYS: ReadonlyArray<readonly NavItem[]> = [
  APP_SHELL_NAV_ITEMS,
  ACCOUNT_UTILITY_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
];

function navRoutes(): string[] {
  const seen = new Set<string>();
  for (const items of NAV_ITEM_ARRAYS) {
    for (const item of items) {
      if (item.path) seen.add(item.path);
    }
  }
  return [...seen];
}

function dimensionA(emergencyRoleId: string | null | undefined, path: string): boolean {
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

describe('authorization dimensions -- independence regression coverage', () => {
  const routes = navRoutes();

  it('at least one route is reachable via Dimension A (clinical) alone, with Dimension B denying it', () => {
    const example = USER_PROFILE_CATALOG.flatMap((entry) => {
      const profile = resolveUserProfileFromSaasRole(entry.saasRole);
      return routes
        .filter(
          (path) =>
            dimensionA(entry.emergencyRoleId, path) && !isRouteAllowedForProfile(profile, path),
        )
        .map((path) => ({
          saasRole: entry.saasRole,
          emergencyRoleId: entry.emergencyRoleId,
          path,
        }));
    })[0];

    expect(
      example,
      'Expected at least one clinical-only-reachable route to exist in the current catalog',
    ).toBeDefined();
    if (example) {
      // Re-assert directly (not just via the search above) so this test
      // fails on its own if the specific example's behavior regresses.
      const profile = resolveUserProfileFromSaasRole(example.saasRole);
      expect(dimensionA(example.emergencyRoleId, example.path)).toBe(true);
      expect(isRouteAllowedForProfile(profile, example.path)).toBe(false);
    }
  });

  it('at least one route is reachable via Dimension B (platform) alone, with Dimension A denying it', () => {
    // Concrete, live-proven example: ed_manager / hospital-administrator /
    // /organization (2026-08-22 investigation, 9/9 reproducible).
    const profile = resolveUserProfileFromSaasRole('hospital-administrator');
    expect(dimensionA('ed_manager', '/organization')).toBe(false);
    expect(isRouteAllowedForProfile(profile, '/organization')).toBe(true);
  });

  it('a route is denied when neither dimension authorizes it', () => {
    // 'student' has the narrowest SaaS preset (VIEW_DASHBOARD, USE_ASSISTANT,
    // VIEW_TOOLS) and no emergency role -- a route neither system grants
    // (e.g. an admin-governance route) must be denied by both.
    const profile = resolveUserProfileFromSaasRole('student');
    const deniedRoute = routes.find(
      (path) => !dimensionA(null, path) && !isRouteAllowedForProfile(profile, path),
    );
    expect(
      deniedRoute,
      'Expected at least one route the student profile cannot reach via either dimension',
    ).toBeDefined();
  });

  it('a public/unauthenticated-style profile cannot gain staff access through either dimension', () => {
    // No USER_PROFILE_CATALOG entry represents a true "public" SaaS role by
    // that exact name, but 'student' (no emergencyRoleId, narrowest preset)
    // is the closest analog in the catalog and must not reach staff-only
    // clinical or admin routes.
    const profile = resolveUserProfileFromSaasRole('student');
    expect(dimensionA(null, '/organization')).toBe(false);
    expect(isRouteAllowedForProfile(profile, '/organization')).toBe(false);
    expect(dimensionA(null, '/emergency/whiteboard')).toBe(false);
  });

  it('every USER_PROFILE_CATALOG entry with an emergencyRoleId has SOME clinical route access', () => {
    // Sanity check that Dimension A isn't silently empty for real clinical
    // roles (which would make every access decision fall through to
    // Dimension B alone, defeating the point of having two dimensions).
    const emptyClinicalAccess = USER_PROFILE_CATALOG.filter(
      (entry) =>
        entry.emergencyRoleId && !routes.some((path) => dimensionA(entry.emergencyRoleId, path)),
    );
    expect(
      emptyClinicalAccess.map((e) => e.saasRole),
      `Profiles with an emergencyRoleId but zero reachable nav routes via Dimension A: ${JSON.stringify(emptyClinicalAccess.map((e) => e.saasRole))}`,
    ).toEqual([]);
  });
});
