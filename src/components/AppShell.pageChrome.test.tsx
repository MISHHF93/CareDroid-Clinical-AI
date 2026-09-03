/**
 * Page-chrome registry drift guard (HEAL-069 / MB-E13 continuation).
 *
 * AppShell's ShellRouteTab (the H1 + subtitle shown under every /emergency/*
 * page) reads from two hand-maintained maps, EMERGENCY_OS_PAGE_TITLES and
 * EMERGENCY_OS_PAGE_SUBTITLES, keyed by pathname. A path missing from
 * EMERGENCY_OS_PAGE_TITLES falls back to the sidebar nav label, or all the
 * way to the generic product name if no nav item matches either (found on
 * /emergency/documentation, which rendered "CareDroid" as its H1). A path
 * missing from EMERGENCY_OS_PAGE_SUBTITLES falls back to the CURRENT USER'S
 * ROLE description (profileCopy.workspaceDescription) — text meant to
 * describe the logged-in role, not the page being viewed, and which changes
 * per role. Live screenshots against the dev server found 8 real pages
 * (dispatch, ed-readiness, collaboration, documentation, diagnostics,
 * handoffs, reports, alerts) all silently rendering the SAME physician-role
 * blurb ("Whiteboard rounds, orders, disposition, and copilot capture.") as
 * their subtitle, regardless of what page was actually open.
 *
 * CANONICAL_ROUTE_MAP (routes.config.ts) already carries a `label` and
 * `description` for every one of these routes — this is the same
 * hand-maintained-mirror-registry fragility class flagged generally at
 * MB-J4, caught here for the page-chrome instance specifically. This guard
 * doesn't force identical wording (AppShell's copy is deliberately more
 * chrome-appropriate/concise than the registry's), it just makes a missing
 * entry a build-time failure instead of a silently wrong page header.
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES, CANONICAL_ROUTE_MAP } from '../config/routes.config';
import { GOVERNANCE_WORKSPACE_ROUTES } from '../config/governanceConsoleRoutes';
import { ADMIN_CONSOLE_CHILD_ROUTES } from '../config/adminConsoleRoutes';
import { TRAINING_CONSOLE_ROUTES } from '../config/trainingConsoleRoutes';
import { TOOLS_AI_PAGE_ROUTES, TOOLS_SHORTCUT_PAGE_ROUTES } from '../config/toolsConsoleRoutes';
import { PROFILE_CONSOLE_ROUTES } from '../config/profileConsoleRoutes';
import { PUBLIC_CONSOLE_ROUTES } from '../config/publicConsoleRoutes';
import { OPERATIONS_FLEET_CONSOLE_ROUTES } from '../config/operationsFleetConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTES } from '../config/platformConsoleRoutes';
import {
  EMERGENCY_OS_PAGE_SUBTITLES,
  EMERGENCY_OS_PAGE_TITLES,
  resolveConsoleWorkspaceEntry,
} from './AppShell';

const realEmergencyPagePaths = CANONICAL_ROUTE_MAP.filter(
  (record: { path?: string; pageComponent?: string; redirectTo?: string }) =>
    typeof record.path === 'string' &&
    record.path.startsWith('/emergency/') &&
    !!record.pageComponent &&
    !record.redirectTo,
).map((record: { path?: string }) => record.path as string);

describe('AppShell page-chrome registry drift guard', () => {
  it('has at least one real /emergency/* page to check (sanity check on the filter itself)', () => {
    expect(realEmergencyPagePaths.length).toBeGreaterThan(10);
  });

  it.each(realEmergencyPagePaths)(
    'EMERGENCY_OS_PAGE_TITLES has an explicit entry for %s',
    (path) => {
      expect(EMERGENCY_OS_PAGE_TITLES[path]).toBeTruthy();
    },
  );

  it.each(realEmergencyPagePaths)(
    'EMERGENCY_OS_PAGE_SUBTITLES has an explicit entry for %s',
    (path) => {
      expect(EMERGENCY_OS_PAGE_SUBTITLES[path]).toBeTruthy();
    },
  );
});

/**
 * MB-L4: the same drift class affects all 8 console route trees (admin,
 * governance, training, tools, profile, public, operationsFleet, platform).
 * Fixed via a single generalized resolver (resolveConsoleWorkspaceEntry)
 * that consults each registry's own existing `label` data directly, so
 * every current and future console route gets covered without a
 * hand-copied entry per path. Originally governance-only
 * (resolveGovernanceWorkspaceLabel); generalized to cover the remaining 7
 * registries in the same pass rather than repeating the pattern per tree.
 */
const adminWorkspacePaths = ADMIN_CONSOLE_CHILD_ROUTES.filter((route) => route.path).map(
  (route) => `${CANONICAL_ROUTES.adminOperations}/${route.path}`,
);

const CONSOLE_REGISTRY_FIXTURES: Array<{ name: string; paths: string[] }> = [
  { name: 'governance', paths: GOVERNANCE_WORKSPACE_ROUTES.map((r) => r.path) },
  { name: 'admin', paths: adminWorkspacePaths },
  { name: 'training', paths: TRAINING_CONSOLE_ROUTES.map((r) => r.path) },
  {
    name: 'tools',
    paths: [...TOOLS_AI_PAGE_ROUTES, ...TOOLS_SHORTCUT_PAGE_ROUTES].map((r) => r.path),
  },
  { name: 'profile', paths: PROFILE_CONSOLE_ROUTES.map((r) => r.path) },
  {
    name: 'public (in-shell only)',
    paths: PUBLIC_CONSOLE_ROUTES.filter((r) => !r.outsideShell).map((r) => r.path),
  },
  { name: 'operationsFleet', paths: OPERATIONS_FLEET_CONSOLE_ROUTES.map((r) => r.path) },
  { name: 'platform', paths: PLATFORM_CONSOLE_ROUTES.map((r) => r.path) },
];

describe('console route chrome (all 8 console route trees)', () => {
  it('has explicit title + subtitle entries for /admin and /training', () => {
    expect(EMERGENCY_OS_PAGE_TITLES[CANONICAL_ROUTES.adminOperations]).toBeTruthy();
    expect(EMERGENCY_OS_PAGE_SUBTITLES[CANONICAL_ROUTES.adminOperations]).toBeTruthy();
    expect(EMERGENCY_OS_PAGE_TITLES[CANONICAL_ROUTES.trainingDashboard]).toBeTruthy();
    expect(EMERGENCY_OS_PAGE_SUBTITLES[CANONICAL_ROUTES.trainingDashboard]).toBeTruthy();
  });

  it('has at least a handful of real routes in each console registry fixture (sanity check on the fixtures)', () => {
    for (const registry of CONSOLE_REGISTRY_FIXTURES) {
      expect(registry.paths.length).toBeGreaterThan(0);
    }
  });

  for (const registry of CONSOLE_REGISTRY_FIXTURES) {
    it.each(registry.paths)(
      `resolveConsoleWorkspaceEntry resolves a real label for ${registry.name} %s`,
      (path) => {
        const entry = resolveConsoleWorkspaceEntry(path);
        expect(entry?.label).toBeTruthy();
        expect(entry?.subtitle).toBeTruthy();
      },
    );
  }

  it('resolves sub-paths under a /* wildcard entry, not just the exact registered paths', () => {
    expect(resolveConsoleWorkspaceEntry('/governance/registry')?.label).toBe('Clinical governance');
    expect(resolveConsoleWorkspaceEntry('/audit/some-record-id')?.label).toBeTruthy();
    expect(resolveConsoleWorkspaceEntry('/fleet/some-panel')?.label).toBeTruthy();
  });

  it('returns null for a path with no console-workspace match (does not falsely claim every path)', () => {
    expect(resolveConsoleWorkspaceEntry('/emergency/reception')).toBeNull();
  });

  it('returns null for outsideShell public routes (they render outside AppShell chrome entirely)', () => {
    const outsideShellPath = PUBLIC_CONSOLE_ROUTES.find((r) => r.outsideShell)?.path;
    expect(outsideShellPath).toBeTruthy();
    expect(resolveConsoleWorkspaceEntry(outsideShellPath as string)).toBeNull();
  });
});
