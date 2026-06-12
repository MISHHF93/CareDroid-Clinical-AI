import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_APP_ROUTE_TREE } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

function expectRoutePath(path) {
  expect(appSource).toContain(`path: '${path}'`);
}

describe('canonical route tree', () => {
  it('exports the clean Emergency OS route tree', () => {
    expect(CANONICAL_APP_ROUTE_TREE).toEqual([
      { path: '/', type: 'redirect', to: '/emergency' },
      { path: '/emergency', type: 'page', componentKey: 'EmergencyWhiteboard' },
      { path: '/emergency/ems', type: 'page', componentKey: 'EMSPipeline' },
      { path: '/emergency/referrals', type: 'page', componentKey: 'ReferralPanel' },
      { path: '/emergency/capacity', type: 'page', componentKey: 'CapacityDetail' },
      { path: '/emergency/tools', type: 'page', componentKey: 'ClinicalCalculatorHub' },
      { path: '/emergency/shift', type: 'page', componentKey: 'ShiftSummary' },
      { path: '/settings', type: 'page', componentKey: 'Settings' },
      { path: '/settings/features', type: 'page', componentKey: 'FeatureTogglePanel' },
      { path: '*', type: 'redirect', to: '/emergency' },
    ]);
  });

  it('mounts only canonical ED and settings page routes as primary pages', () => {
    for (const route of CANONICAL_APP_ROUTE_TREE.filter((item) => item.type === 'page')) {
      expectRoutePath(route.path);
    }

    expect(appSource).toContain('element: <EmergencyWhiteboard />');
    expect(appSource).toContain('<EMSPipeline />');
    expect(appSource).toContain('<ReferralPanel />');
    expect(appSource).toContain('<EmergencyCapacityRoute />');
    expect(appSource).toContain('<ClinicalCalculatorHub />');
    expect(appSource).toContain('<ShiftSummary />');
    expect(appSource).toContain('element: <SettingsRoute />');
    expect(appSource).toContain('element: <SettingsFeaturesRoute />');
  });

  it('redirects duplicates and legacy aliases to canonical routes', () => {
    expect(appSource).toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(appSource).toContain("['/dashboard', '/emergency']");
    expect(appSource).toContain("['/assistant', '/emergency']");
    expect(appSource).toContain("['/emergency/queues', '/emergency']");
    expect(appSource).toContain("['/tools/calculators/:slug', '/emergency/tools']");
    expect(appSource).toContain('...DUPLICATE_ROUTE_REDIRECTS.map(([path, to]) => ({');
  });

  it('renders non-canonical modules as AppShell future-release stubs', () => {
    expect(appSource).toContain('const FUTURE_RELEASE_ROUTES = Object.freeze([');
    expect(appSource).toContain("['Operations', '/operations']");
    expect(appSource).toContain("['Privacy Policy', '/privacy']");
    expect(appSource).toContain("['Clinical Tools', '/tools/*']");
    expect(appSource).toContain('...FUTURE_RELEASE_ROUTES.map(([label, path]) => ({');
    expect(appSource).toContain('<FutureReleaseStub label={label} />');
    expect(appSource).toContain('This module is available in a future release.');
  });

  it('keeps auth callbacks deep-linkable and catches all unknown routes', () => {
    expectRoutePath('/auth-callback');
    expectRoutePath('/auth/callback');
    expect(appSource).toContain('AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toContain("path: '*'");
    expect(appSource).toContain('element: <Navigate to="/emergency" replace />');
    expect(appSource).not.toContain('Page not found');
    expect(appSource).not.toContain('<ToolNotFound');
  });
});
