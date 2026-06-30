import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from '../config/routes.config';
import { getCanonicalAppPagePaths } from '../data/emergencyPageRenderInventory';

const appSource = readFileSync(join(__dirname, '..', 'app', 'router.tsx'), 'utf8');
const redirectsByPath = Object.fromEntries(
  LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to]),
);
const nonEdRedirectPaths = new Set(
  NON_ED_WORKSPACE_REDIRECT_ROUTES.map((redirect) => redirect.path),
);

describe('canonical route/auth architecture', () => {
  it('redirects legacy auth paths into the demo landing flow', () => {
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
    for (const path of ['/assistant', '/chat', '/ai', '/copilot']) {
      expect(appSource).toContain(`path="${path}"`);
      expect(appSource).toContain('to={CANONICAL_ROUTES.emergencyCopilot}');
    }
  });

  it('keeps fleet and operations routes wired in router.tsx', () => {
    expect(appSource).toMatch(/<Route path="\/tools\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toContain('CANONICAL_ROUTES.fleetCommand');
    expect(appSource).toMatch(
      /path="\/fleet"\s+element=\{<Navigate to=\{CANONICAL_ROUTES\.emergencyEms\}/,
    );
    expect(appSource).toContain('CANONICAL_ROUTES.hospitalMap');
  });

  it('ensures unknown protected routes use role-aware default redirect', () => {
    expect(appSource).toMatch(/<Route path="\*"\s+element=\{<EmergencyDefaultRedirect \/>\}/);
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyReception');
  });
});