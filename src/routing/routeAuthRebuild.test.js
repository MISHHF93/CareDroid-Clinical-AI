import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
} from '../config/routes.config';
import { EMERGENCY_PAGE_ALL_RENDER_PATHS } from '../data/emergencyPageRenderInventory';

const appSource = readFileSync(join(__dirname, '..', 'App.jsx'), 'utf8');
const redirectsByPath = Object.fromEntries(
  LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to])
);

describe('canonical route/auth architecture', () => {
  it('bypasses retired auth routes into the Emergency Whiteboard', () => {
    expect(appSource).not.toContain('function AuthPathRedirect()');
    expect(appSource).not.toContain('<TenantRequired>');
    expect(redirectsByPath['/auth']).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
  });

  it('keeps one AppShell owner for canonical Emergency OS routes', () => {
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');
    expect(appSource.match(/<AppShell>/g)).toHaveLength(1);
    expect(CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map((route) => route.path)).toEqual(
      EMERGENCY_PAGE_ALL_RENDER_PATHS
    );
  });

  it('uses redirects for retired assistant and login aliases', () => {
    for (const path of ['/assistant', '/chat', '/ai', '/copilot']) {
      expect(appSource).toContain(`path="${path}"`);
      expect(appSource).toContain('CANONICAL_ROUTES.emergencyWhiteboard');
    }
  });

  it('normalizes legacy tools and product aliases into Emergency OS redirects', () => {
    expect(appSource).toContain('path="/tools/*"');
    for (const path of [
      '/fleet',
      '/fleet/*',
      '/hospital-map',
      '/medical-iot',
      '/devices',
      '/operations',
      '/operations/*',
      '/marketplace',
      '/platform-admin',
    ]) {
      expect(redirectsByPath[path]).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
    }
  });

  it('ensures unknown protected routes redirect to the Emergency Whiteboard', () => {
    expect(appSource).toContain('path="*"');
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyWhiteboard');
  });
});
