import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  IN_SHELL_ROUTE_REDIRECTS,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from './config/routes.config';
import { OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS } from './config/operationsFleetConsoleRoutes';
import { EMERGENCY_PAGE_PRIMARY_PATHS } from './data/emergencyPageRenderInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, 'app/router.tsx'), 'utf8');

const ACTIVE_EMERGENCY_PAGE_PATHS = CANONICAL_APP_ROUTE_TREE.filter(
  (route) => route.type === 'page',
).map((route) => route.path);

const RETIRED_PLATFORM_PATHS = [
  '/tools/ambient-scribe',
  '/tools/differential-ai',
  '/tools/timeline-ai',
  '/tools/patient-summary-ai',
  '/tools/order-set-ai',
  '/tools/ai-explainability',
  '/tools/guideline-rag',
  '/tools/clinical-audit',
  '/marketplace',
  '/enterprise-readiness',
  '/platform-admin',
  '/success-center',
  '/fleet/command',
];

describe('App CareDroid route contract', () => {
  it('mounts the active CareDroid pages through the single AppShell route tree', () => {
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');

    // Compare against the primary (non-alias) paths — EMERGENCY_PAGE_ALL_RENDER_PATHS
    // also includes legacy redirect aliases like /emergency/journey, which are
    // intentionally not 'page'-typed route-tree entries.
    expect(ACTIVE_EMERGENCY_PAGE_PATHS).toEqual(EMERGENCY_PAGE_PRIMARY_PATHS);
  });

  it.each(RETIRED_PLATFORM_PATHS)('%s is not mounted as an App page route', (path) => {
    expect(appSource).not.toContain(`path: '${path}'`);
    expect(appSource).not.toContain(`path="${path}" element={<`);
  });

  it('redirects retired product roots and platform surfaces into CareDroid', () => {
    const redirectsByPath = Object.fromEntries(
      LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to]),
    );
    const nonEdRedirectPaths = new Set(
      NON_ED_WORKSPACE_REDIRECT_ROUTES.map((redirect) => redirect.path),
    );
    const inShellRedirectsByPath = Object.fromEntries(
      IN_SHELL_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to]),
    );
    // Hospital IoT/fleet/operations surfaces are real pages mounted via the
    // operations-fleet console route tree (a config-driven sub-tree, not
    // literal <Route> JSX in router.tsx) rather than a redirect table.
    const operationsFleetMountedPaths = new Set(OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS);

    for (const path of [
      '/dashboard',
      '/home',
      '/mobile',
      '/general-healthcare',
      '/tools',
      '/settings/features',
      '/fleet',
      '/fleet/*',
      '/hospital-map',
      '/medical-iot',
      '/devices',
      '/live-map',
      '/operations',
    ]) {
      expect(
        redirectsByPath[path] ||
          inShellRedirectsByPath[path] ||
          (nonEdRedirectPaths.has(path as any) ? CANONICAL_ROUTES.emergencyWhiteboard : null) ||
          (appSource.includes(`path="${path}"`) ? CANONICAL_ROUTES.emergencyWhiteboard : null) ||
          (operationsFleetMountedPaths.has(path) ? path : null),
        path,
      ).toBeTruthy();
    }

    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('path="*"');
  });
});
