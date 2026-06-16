import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from './config/routes.config';
import { EMERGENCY_PAGE_ALL_RENDER_PATHS } from './data/emergencyPageRenderInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, 'App.jsx'), 'utf8');

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

describe('App Emergency OS route contract', () => {
  it('mounts the active Emergency OS pages through the single AppShell route tree', () => {
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');

    expect(ACTIVE_EMERGENCY_PAGE_PATHS).toEqual(EMERGENCY_PAGE_ALL_RENDER_PATHS);
  });

  it.each(RETIRED_PLATFORM_PATHS)('%s is not mounted as an App page route', (path) => {
    expect(appSource).not.toContain(`path: '${path}'`);
    expect(appSource).not.toContain(`path="${path}" element={<`);
  });

  it('redirects retired product roots and platform surfaces into Emergency OS', () => {
    const redirectsByPath = Object.fromEntries(
      LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to]),
    );
    const nonEdRedirectPaths = new Set(
      NON_ED_WORKSPACE_REDIRECT_ROUTES.map((redirect) => redirect.path),
    );

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
      '/operations/*',
    ]) {
      expect(
        redirectsByPath[path] ||
          (nonEdRedirectPaths.has(path) ? CANONICAL_ROUTES.emergencyWhiteboard : null) ||
          (appSource.includes(`path="${path}"`) ? CANONICAL_ROUTES.emergencyWhiteboard : null),
        path,
      ).toBeTruthy();
    }

    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('path="*"');
  });
});
