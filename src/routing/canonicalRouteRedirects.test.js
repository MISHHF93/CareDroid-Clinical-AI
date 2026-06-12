import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

function expectRoutePath(path) {
  expect(appSource).toContain(`path: '${path}'`);
}

describe('canonical route tree', () => {
  it('exports the clean Emergency OS route tree', () => {
    expect(CANONICAL_APP_ROUTE_TREE).toEqual([
      { path: '/', type: 'redirect', to: '/emergency/whiteboard' },
      { path: '/emergency', type: 'redirect', to: '/emergency/whiteboard' },
      { path: '/emergency/whiteboard', type: 'page', componentKey: 'EmergencyWhiteboard' },
      { path: '/emergency/patients', type: 'page', componentKey: 'EmergencyPatientsRoute' },
      { path: '/emergency/ems', type: 'page', componentKey: 'EMSPipeline' },
      { path: '/emergency/intake', type: 'page', componentKey: 'SmartIntake' },
      { path: '/emergency/queues', type: 'page', componentKey: 'EmergencyQueueRoute' },
      { path: '/emergency/reassessment', type: 'page', componentKey: 'EmergencyReassessmentRoute' },
      { path: '/emergency/capacity', type: 'page', componentKey: 'CapacityDetail' },
      { path: '/emergency/boarding', type: 'page', componentKey: 'EmergencyBoardingRoute' },
      { path: '/emergency/referrals', type: 'page', componentKey: 'ReferralPanel' },
      { path: '/emergency/copilot', type: 'page', componentKey: 'EmergencyCopilotPanel' },
      { path: '/emergency/analytics', type: 'page', componentKey: 'EmergencyAnalytics' },
      { path: '/emergency/settings', type: 'page', componentKey: 'Settings' },
      { path: '*', type: 'redirect', to: '/emergency/whiteboard' },
    ]);
  });

  it('mounts only canonical ED and settings page routes as primary pages', () => {
    for (const route of CANONICAL_APP_ROUTE_TREE.filter((item) => item.type === 'page')) {
      expectRoutePath(route.path);
    }

    expect(appSource).toContain('element: <EmergencyWhiteboard />');
    expect(appSource).toContain('<EMSPipeline />');
    expect(appSource).toContain('<SmartIntake />');
    expect(appSource).toContain('<EmergencyQueueRoute />');
    expect(appSource).toContain('<ReferralPanel />');
    expect(appSource).toContain('<EmergencyCapacityRoute />');
    expect(appSource).toContain('<EmergencyCopilotRoute />');
    expect(appSource).toContain('<ClinicalCalculatorHub />');
    expect(appSource).toContain('<EmergencyAnalytics />');
    expect(appSource).toContain('element: <SettingsRoute />');
  });

  it('redirects duplicates and legacy aliases to canonical routes', () => {
    expect(appSource).not.toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/queue', to: '/emergency/queues' }),
        expect.objectContaining({ path: '/workspace/emergency', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/settings/general', to: '/emergency/settings' }),
      ])
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/assistant', to: '/emergency/copilot' }),
        expect.objectContaining({ path: '/tools', to: '/emergency/copilot' }),
      ])
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/dashboard' }),
      ])
    );
    expect(appSource).toContain("path: '/dashboard'");
    expect(appSource).toContain("path: '/tools/calculators/:slug'");
    expect(appSource).toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain("path: '/tools/drug-checker'");
    expect(appSource).toContain('<LegacyToolRouteRedirect toolId="drug-check" />');
    expect(appSource).toContain('...LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => ({');
  });

  it('keeps unsupported future modules on the Emergency OS whiteboard fallback', () => {
    expect(appSource).toContain('const FUTURE_RELEASE_ROUTES = Object.freeze([');
    expect(appSource).toContain('const ACTIVE_RELEASE_ROUTE_PATHS = new Set([');
    expect(appSource).toContain("path: '/operations'");
    expect(appSource).toContain("['Privacy Policy', '/privacy']");
    expect(appSource).toContain("['Clinical Tools', '/tools/*']");
    expect(appSource).toContain('.filter(([, path]) => !ACTIVE_RELEASE_ROUTE_PATHS.has(path))');
    expect(appSource).toContain('.map(([, path]) => ({');
    expect(appSource).toContain('element: <LegacyProtectedRouteRedirect to="/emergency/whiteboard" />');
    expect(appSource).not.toContain('<FutureReleaseStub');
  });

  it('keeps auth callbacks deep-linkable and catches all unknown routes', () => {
    expectRoutePath('/auth-callback');
    expectRoutePath('/auth/callback');
    expect(appSource).toContain('AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toContain("path: '*'");
    expect(appSource).toContain('element: <Navigate to="/emergency/whiteboard" replace />');
    expect(appSource).not.toContain('Page not found');
    expect(appSource).not.toContain('<ToolNotFound');
  });
});
