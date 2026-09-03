import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ASSISTANT_ROUTE_ALIASES,
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  IN_SHELL_ROUTE_REDIRECTS,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  OUTSIDE_SHELL_ROUTE_REDIRECTS,
} from '../config/routes.config';
import { OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS } from '../config/operationsFleetConsoleRoutes';
import { getCanonicalAppPagePaths } from '../data/emergencyPageRenderInventory';

const appSource = readFileSync(join(__dirname, '..', 'app', 'router.tsx'), 'utf8');
const redirectsByPath = Object.fromEntries(
  LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to]),
);

describe('canonical route/auth architecture', () => {
  it('redirects the still-unbuilt legacy auth flows into the demo landing flow (login/register mount a real page instead, see routing/authRouteFlow.test.tsx)', () => {
    expect(appSource).toContain('function AuthPathsRedirect()');
    expect(appSource).toContain('legacyAuthPaths');
    expect(appSource).not.toContain('function AuthRoute()');
    expect(appSource).not.toContain('<TenantRequired>');
    expect(redirectsByPath['/auth']).toBeUndefined();
  });

  it('keeps one AppShell owner for canonical CareDroid routes', () => {
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');
    expect(appSource.match(/<AppShell>/g)).toHaveLength(1);
    expect(
      CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map((route) => route.path),
    ).toEqual(getCanonicalAppPagePaths());
  });

  it('uses redirects for retired assistant aliases', () => {
    expect(appSource).toContain('OUTSIDE_SHELL_ROUTE_REDIRECTS.map');
    for (const path of ASSISTANT_ROUTE_ALIASES) {
      expect(
        OUTSIDE_SHELL_ROUTE_REDIRECTS.some(
          (redirect) => redirect.path === path && redirect.to === CANONICAL_ROUTES.emergencyCopilot,
        ),
      ).toBe(true);
    }
  });

  it('keeps fleet and operations routes wired in router.tsx', () => {
    expect(appSource).toMatch(/<Route path="\/tools\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toContain('IN_SHELL_ROUTE_REDIRECTS.map');
    expect(
      IN_SHELL_ROUTE_REDIRECTS.some(
        (redirect) => redirect.path === '/fleet' && redirect.to === CANONICAL_ROUTES.fleetCommand,
      ),
    ).toBe(true);
    expect(OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS).toContain(CANONICAL_ROUTES.fleetCommand);
    expect(OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS).toContain(CANONICAL_ROUTES.hospitalMap);
  });

  it('ensures unknown protected routes use role-aware default redirect', () => {
    expect(appSource).toMatch(/<Route path="\*"\s+element=\{<EmergencyDefaultRedirect \/>\}/);
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyReception');
  });
});
