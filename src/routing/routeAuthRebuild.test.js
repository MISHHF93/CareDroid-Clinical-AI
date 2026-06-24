import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from '../config/routes.config';
import { EMERGENCY_PAGE_ALL_RENDER_PATHS } from '../data/emergencyPageRenderInventory';

const appSource = readFileSync(join(__dirname, '..', 'App.jsx'), 'utf8');
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
    ).toEqual(EMERGENCY_PAGE_ALL_RENDER_PATHS);
  });

  it('uses redirects for retired assistant aliases', () => {
    for (const path of ['/assistant', '/chat', '/ai', '/copilot']) {
      expect(appSource).toContain(`path="${path}"`);
      expect(appSource).toContain('CANONICAL_ROUTES.emergencyWhiteboard');
    }
  });

  it('keeps fleet and operations routes wired in App.jsx', () => {
    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('CANONICAL_ROUTES.fleetCommand');
    expect(appSource).toContain('path="/fleet" element={<Navigate to={CANONICAL_ROUTES.fleetCommand}');
    expect(appSource).toContain('CANONICAL_ROUTES.hospitalMap');
  });

  it('ensures unknown protected routes redirect to the Emergency Whiteboard', () => {
    expect(appSource).toContain('path="*"');
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyWhiteboard');
  });
});
