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
      expect.objectContaining({ type: 'redirect', to: '/emergency/reception' }),
    );
    expect(CANONICAL_APP_ROUTE_TREE.find((route) => route.path === '*')).toEqual(
      expect.objectContaining({ type: 'redirect', to: '/emergency/reception' }),
    );
    expect(CANONICAL_APP_ROUTE_TREE.find((route) => route.path === '/emergency')).toEqual(
      expect.objectContaining({ type: 'redirect', to: '/emergency/reception' }),
    );
    expect(CANONICAL_APP_ROUTE_TREE.find((route) => route.path === '/triage')).toEqual(
      expect.objectContaining({ type: 'redirect', to: '/emergency/queues?queue=pretriage' }),
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
        expect.objectContaining({ path: '/home', to: '/emergency/reception', routeId: 'startup' }),
        expect.objectContaining({
          path: '/dashboard',
          to: '/emergency/command-center',
          routeId: 'dashboard',
        }),
      ]),
    );
    expect(appSource).toContain('OUTSIDE_SHELL_ROUTE_REDIRECTS.map');
    expect(appSource).toContain('ED_CANONICAL_ROUTE_ALIASES.map');
    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('path="/scores/*"');
    expect(appSource).toMatch(/<Route path="\/tools\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toMatch(/<Route path="\/calculators\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toContain('COMMAND_CENTER_INTELLIGENCE_REDIRECTS.map');
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(appSource).toContain('IN_SHELL_ROUTE_REDIRECTS.map');
    // The exact '/organization' entry was removed 2026-08-21: it never
    // actually fired (platformConsoleRoutes.ts's real Organization Dashboard
    // page always won that exact path -- proven live across fresh-load,
    // refresh, and client-side navigation). Only the wildcard child-path
    // redirect is live; asserting on that instead.
    expect(IN_SHELL_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/organization/*', to: CANONICAL_ROUTES.adminOperations }),
        expect.objectContaining({ path: '/fleet', to: CANONICAL_ROUTES.fleetCommand }),
        expect.objectContaining({ path: '/ai/evaluation', to: CANONICAL_ROUTES.aiEvaluation }),
      ]),
    );
    expect(IN_SHELL_ROUTE_REDIRECTS).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/organization' })]),
    );
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/pulse', to: '/emergency/pulse' }),
        expect.objectContaining({ path: '/shift', to: '/emergency/shift' }),
        expect.objectContaining({ path: '/emergency/simulation', to: '/simulation' }),
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

  it('never lets an IN_SHELL_ROUTE_REDIRECTS alias get shadowed by resolveEdExtensionRedirect', async () => {
    // HEAL-347.79: PilotExtensionRouteGuard wraps <Outlet/> ABOVE every
    // nested <Route>, including the ones IN_SHELL_ROUTE_REDIRECTS.map()
    // renders -- so if resolveEdExtensionRedirect(path) returns a DIFFERENT
    // target than the one this table declares, that Route's own
    // EmergencyAliasRedirect never gets a chance to mount at all. Proven
    // live for /customer-portal: every role landed on /emergency/settings
    // (an ED_EXTENSION_ROUTE_REDIRECTS prefix match) instead of the real
    // /admin/tenant page IN_SHELL_ROUTE_REDIRECTS declares. Fixed at the
    // root by teaching isInShellRoute() about this table's own paths
    // (inShellRouteAllowlist.ts) -- this test guards the whole class, not
    // just the one instance, so a future IN_SHELL_ROUTE_REDIRECTS addition
    // that collides with an ED_EXTENSION_ROUTE_REDIRECTS prefix fails loudly
    // here instead of silently dead-ending in production.
    const { resolveEdExtensionRedirect } = await import('../config/edApplication.config');
    for (const entry of IN_SHELL_ROUTE_REDIRECTS) {
      const exactPath = entry.path.replace(/\/\*$/, '');
      const shadowTarget = resolveEdExtensionRedirect(exactPath);
      expect(
        shadowTarget === null || shadowTarget === entry.to,
        `IN_SHELL_ROUTE_REDIRECTS entry '${entry.path}' -> '${entry.to}' is shadowed by ` +
          `resolveEdExtensionRedirect, which resolves it to '${shadowTarget}' instead -- the ` +
          `real alias route would never actually render.`,
      ).toBe(true);
    }
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
        expect.objectContaining({ path: '/federated-learning', moduleName: 'Federated Learning' }),
      ]),
    );
    expect(NON_ED_WORKSPACE_REDIRECT_ROUTES).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/analytics' })]),
    );
    expect(NON_ED_WORKSPACE_REDIRECT_ROUTES).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/fleet/*' }),
        expect.objectContaining({ path: '/lab' }),
        expect.objectContaining({ path: '/governance/*' }),
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