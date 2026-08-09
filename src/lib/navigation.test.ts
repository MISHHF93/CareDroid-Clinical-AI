import { describe, it, expect } from 'vitest';
import {
  ROUTE_ACCESS_CONFIG,
  getRouteAccess,
  canRoleAccessRoute,
  getNavVisibleRoutes,
  getUnauthorizedFallback,
} from './navigation';

// Routes intentionally open to every role with no fine-grained permission gate
// (e.g. the role-aware user manual) — role membership alone controls access.
// '/navigator' (App navigator): same permission-free shape as '/emergency/help' --
// backend AppNavigatorController only requires @UseGuards(AuthGuard('jwt')) (any
// authenticated user), no @RequirePermission, and its route config has
// allowedRoles: ALL_USER_PROFILES with no requiredPermissions, consistent with
// its own 2026-08-06 shipping commit describing it as "a real sidebar entry
// under Help".
const ROUTES_WITHOUT_REQUIRED_PERMISSIONS = new Set(['/emergency/help', '/navigator']);

describe('ROUTE_ACCESS_CONFIG', () => {
  it('every entry has required fields', () => {
    for (const entry of ROUTE_ACCESS_CONFIG) {
      expect(entry.path).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.allowedRoles.length).toBeGreaterThan(0);
      if (!ROUTES_WITHOUT_REQUIRED_PERMISSIONS.has(entry.path)) {
        expect(entry.requiredPermissions.length).toBeGreaterThan(0);
      }
      expect(typeof entry.navVisible).toBe('boolean');
      expect(typeof entry.priority).toBe('number');
    }
  });

  it('no duplicate paths', () => {
    const paths = ROUTE_ACCESS_CONFIG.map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('canRoleAccessRoute', () => {
  it('super_admin can access all configured routes', () => {
    for (const entry of ROUTE_ACCESS_CONFIG) {
      expect(canRoleAccessRoute('super_admin', entry.path)).toBe(true);
    }
  });

  it('demo_observer can access reception and alerts', () => {
    expect(canRoleAccessRoute('demo_observer', '/emergency/reception')).toBe(true);
    expect(canRoleAccessRoute('demo_observer', '/emergency/alerts')).toBe(true);
  });

  it('demo_observer cannot access simulation or admin', () => {
    expect(canRoleAccessRoute('demo_observer', '/emergency/simulation')).toBe(false);
    expect(canRoleAccessRoute('demo_observer', '/admin')).toBe(false);
  });

  it('registration_clerk cannot access capacity', () => {
    expect(canRoleAccessRoute('registration_clerk', '/emergency/capacity')).toBe(false);
  });

  it('returns true for unknown routes (no lockout on unregistered paths)', () => {
    expect(canRoleAccessRoute('demo_observer', '/some/unknown/path')).toBe(true);
  });
});

describe('getNavVisibleRoutes', () => {
  it('returns routes sorted by priority', () => {
    const routes = getNavVisibleRoutes('emergency_physician');
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].priority).toBeGreaterThanOrEqual(routes[i - 1].priority);
    }
  });

  it('all returned routes are nav-visible', () => {
    const routes = getNavVisibleRoutes('charge_nurse');
    for (const route of routes) {
      expect(route.navVisible).toBe(true);
    }
  });

  it('hospital_admin can see analytics in nav', () => {
    const routes = getNavVisibleRoutes('hospital_admin');
    expect(routes.some((r) => r.label === 'Analytics')).toBe(true);
  });

  it('registration_clerk nav does not include capacity', () => {
    const routes = getNavVisibleRoutes('registration_clerk');
    expect(routes.some((r) => r.path.includes('capacity'))).toBe(false);
  });
});

describe('getUnauthorizedFallback', () => {
  it('returns a valid path string', () => {
    const fallback = getUnauthorizedFallback();
    expect(typeof fallback).toBe('string');
    expect(fallback.startsWith('/')).toBe(true);
  });
});
