import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');

function expectRoutePath(path) {
  const routeNames = Object.entries(CANONICAL_ROUTES)
    .filter(([, routePath]) => routePath === path)
    .map(([name]) => name);
  if (routeNames.length) {
    expect(
      routeNames.some((routeName) => appSource.includes(`path={CANONICAL_ROUTES.${routeName}}`)),
    ).toBe(true);
    return;
  }
  expect(appSource).toContain(`path="${path}"`);
}

describe('canonical route tree', () => {
  it('exports the consolidated CareDroid emergency route tree', () => {
    expect(CANONICAL_APP_ROUTE_TREE.find((route) => route.path === '/')).toEqual(
      expect.objectContaining({ type: 'redirect', to: '/emergency/whiteboard' }),
    );
    expect(CANONICAL_APP_ROUTE_TREE.find((route) => route.path === '*')).toEqual(
      expect.objectContaining({ type: 'redirect', to: '/emergency/whiteboard' }),
    );
    expect(
      CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map((route) => route.path),
    ).toEqual(
      expect.arrayContaining([
        '/emergency/whiteboard',
        '/emergency/reception',
        '/emergency/intake',
        '/emergency/queues',
        '/emergency/copilot',
        '/emergency/alerts',
        '/emergency/help',
        '/emergency/settings',
      ]),
    );
  });

  it('mounts canonical ED routes inside the flattened AppShell', () => {
    for (const route of CANONICAL_APP_ROUTE_TREE.filter((item) => item.type !== 'redirect')) {
      if (route.path === '/auth-callback') {
        expect(appSource).toContain('CANONICAL_ROUTES.authCallback');
        continue;
      }
      expectRoutePath(route.path);
    }

    expect(appSource).toContain('<PilotExtensionRouteGuard>');
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<EMSPipeline />');
    expect(appSource).toContain('<ReceptionWorkspace />');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyReception}');
    expect(appSource).toContain('<SmartIntake />');
    expect(appSource).toContain('<QueueRoute />');
    expect(appSource).toContain('<ReferralPanel />');
    expect(appSource).toContain('<CapacityRoute />');
    expect(appSource).toContain('<CopilotRoute />');
    expect(appSource).toContain('<ToolsOverview />');
    expect(appSource).toContain('<EmergencyDepartmentPulse />');
    expect(appSource).toContain('<EmergencyShiftSummary />');
    expect(appSource).toContain('<EmergencyAnalytics />');
    expect(appSource).toContain('<EmergencySettings />');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyCopilot}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyTools}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyPulse}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyShift}');
    expect(appSource).not.toContain('ComingSoonPage');
    expect(appSource).toContain('<EdApplicationEntryRedirect />');
    expect(appSource).toContain('path={CANONICAL_ROUTES.workspace}');
  });

  it('redirects duplicates and legacy aliases to canonical routes', () => {
    expect(appSource).not.toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/queue', to: '/emergency/queues' }),
        expect.objectContaining({ path: '/workspace/emergency', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/settings/general', to: '/emergency/settings' }),
        expect.objectContaining({ path: '/patients', to: '/emergency/patients' }),
      ]),
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/assistant', to: '/emergency/copilot' }),
      ]),
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/dashboard' })]),
    );
    expect(appSource).toContain('path="/dashboard"');
    expect(appSource).toContain('to={CANONICAL_ROUTES.emergencyWhiteboard}');
    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('path="/scores/*"');
    expect(appSource).toMatch(/<Route path="\/tools\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toMatch(/<Route path="\/calculators\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toContain('to={CANONICAL_ROUTES.emergencyCopilot}');
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/pulse', to: '/emergency/pulse' }),
        expect.objectContaining({ path: '/shift', to: '/emergency/shift' }),
        expect.objectContaining({ path: '/emergency/simulation', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/emergency/calculators', to: '/emergency/tools' }),
      ]),
    );
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/pulse', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/emergency/shift', to: '/emergency/whiteboard' }),
      ]),
    );
  });

  it('redirects non-ED workspace routes while preserving CareDroid fallbacks', () => {
    expect(appSource).toContain('path="/app"');
    expect(appSource).toContain('path={CANONICAL_ROUTES.workspace}');
    expect(appSource).toContain('path="/mobile"');
    expect(appSource).toContain('path="/emergency/*"');
    expect(appSource).toContain('NON_ED_WORKSPACE_REDIRECT_ROUTES.map(({ path, moduleName }) => (');
    expect(appSource).toContain('element={<NonEdWorkspaceRedirect');
    expect(NON_ED_WORKSPACE_REDIRECT_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/analytics', moduleName: 'Analytics' }),
        expect.objectContaining({ path: '/fleet/*', moduleName: 'Fleet' }),
        expect.objectContaining({ path: '/lab', moduleName: 'Laboratory' }),
        expect.objectContaining({ path: '/governance/*', moduleName: 'Governance' }),
      ]),
    );
    expect(NON_ED_WORKSPACE_REDIRECT_ROUTES).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: CANONICAL_ROUTES.platformAdmin }),
        expect.objectContaining({ path: CANONICAL_ROUTES.tenantAdmin }),
      ]),
    );
  });

  it('keeps auth callbacks deep-linkable and catches all unknown routes', () => {
    expect(appSource).toMatch(/<Route path="\*"\s+element=\{<EmergencyDefaultRedirect \/>\}/);
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyReception');
    expect(appSource).not.toContain('Page not found');
    expect(appSource).not.toContain('<ToolNotFound');
  });
});