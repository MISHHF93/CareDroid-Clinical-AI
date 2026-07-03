import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COMMAND_CENTER_INTELLIGENCE_REDIRECTS } from '../config/hospitalCommandCenterViews.config';
import { GOVERNANCE_CONSOLE_ROUTE_PATHS } from '../config/governanceConsoleRoutes';
import { OPERATIONS_FLEET_CONSOLE_ROUTES } from '../config/operationsFleetConsoleRoutes';
import {
  PROFILE_CONSOLE_REDIRECT_ROUTES,
  PROFILE_CONSOLE_ROUTE_PATHS,
} from '../config/profileConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTE_PATHS } from '../config/platformConsoleRoutes';
import { CANONICAL_ROUTES, IN_SHELL_ROUTE_REDIRECTS } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');

function normalizeConsolePath(path: string) {
  return path.replace(/\/\*$/, '');
}

const CONSOLE_ROUTE_PATHS = new Set(
  [
    ...PROFILE_CONSOLE_ROUTE_PATHS,
    ...PLATFORM_CONSOLE_ROUTE_PATHS,
    ...OPERATIONS_FLEET_CONSOLE_ROUTES.map((route) => route.path),
    ...GOVERNANCE_CONSOLE_ROUTE_PATHS,
  ].map(normalizeConsolePath),
);

function expectConsoleRouteMounted(path: string) {
  const normalized = normalizeConsolePath(path);
  const mounted =
    CONSOLE_ROUTE_PATHS.has(normalized) ||
    [...CONSOLE_ROUTE_PATHS].some(
      (candidate) => normalized === candidate || normalized.startsWith(`${candidate}/`),
    );
  expect(mounted, path).toBe(true);
}

describe('Codex issue card route mounts', () => {
  it('mounts platform card destinations through console route registries', () => {
    [
      CANONICAL_ROUTES.profile,
      CANONICAL_ROUTES.profileSettings,
      CANONICAL_ROUTES.profileToolPreferences,
      CANONICAL_ROUTES.medical3dViewer,
      CANONICAL_ROUTES.featureFlags,
      CANONICAL_ROUTES.hospitalMap,
      CANONICAL_ROUTES.medicalIot,
      CANONICAL_ROUTES.devices,
      CANONICAL_ROUTES.fleetCommand,
      CANONICAL_ROUTES.fleetMap,
      CANONICAL_ROUTES.billing,
      CANONICAL_ROUTES.usage,
      CANONICAL_ROUTES.audit,
    ].forEach(expectConsoleRouteMounted);

    expect(appSource).toContain('{renderProfileConsoleRoutes(LazyRoute)}');
    expect(appSource).toContain('{renderPlatformConsoleRoutes(LazyRoute)}');
    expect(appSource).toContain('{renderOperationsFleetConsoleRoutes(LazyRoute)}');
    expect(appSource).toContain('{renderGovernanceConsoleRoutes(LazyRoute)}');
  });

  it('consolidates retired intelligence card destinations into command center redirects', () => {
    [
      CANONICAL_ROUTES.executive,
      CANONICAL_ROUTES.predictiveAnalytics,
      CANONICAL_ROUTES.aiCommandCenter,
    ].forEach((path) => {
      expect(
        COMMAND_CENTER_INTELLIGENCE_REDIRECTS.some((redirect) => redirect.path === path),
        path,
      ).toBe(true);
    });

    expect(appSource).toContain('COMMAND_CENTER_INTELLIGENCE_REDIRECTS');
  });

  it('keeps legacy card destinations wired through profile and in-shell redirect tables', () => {
    ['/profile/activity', '/profile/preferences', '/profile/security', '/profile/workspaces'].forEach(
      (path) => {
        expect(PROFILE_CONSOLE_ROUTE_PATHS, path).toContain(path);
      },
    );

    expect(PROFILE_CONSOLE_REDIRECT_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/profile-settings',
          to: CANONICAL_ROUTES.profileSettings,
        }),
      ]),
    );

    expect(IN_SHELL_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/audit-logs', to: CANONICAL_ROUTES.audit }),
      ]),
    );
  });

  it('keeps developer catalog wired through the tools redirect mount', () => {
    expect(appSource).toContain(`path={CANONICAL_ROUTES.developerCatalog}`);
  });

  it('keeps route constants available for card authors', () => {
    expect(CANONICAL_ROUTES.featureFlags).toBe('/feature-flags');
    expect(CANONICAL_ROUTES.aiCommandCenter).toBe('/ai-command-center');
    expect(CANONICAL_ROUTES.predictiveAnalytics).toBe('/predictive-analytics');
  });
});