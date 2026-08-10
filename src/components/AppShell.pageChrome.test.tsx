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
import {
  EMERGENCY_OS_PAGE_SUBTITLES,
  EMERGENCY_OS_PAGE_TITLES,
  resolveGovernanceWorkspaceLabel,
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
 * MB-L4 follow-up: the same drift class also affects the admin/governance/
 * training console route trees, confirmed live on /admin, /governance/registry,
 * /security, and /training. Fixed directly (admin, training) and via a
 * prefix-aware resolver over the governance workspace's own existing
 * `label` registry (resolveGovernanceWorkspaceLabel) so every current and
 * future governance route gets covered without a hand-copied entry per path.
 */
describe('console route chrome (admin / training / governance)', () => {
  it('has explicit title + subtitle entries for /admin and /training', () => {
    expect(EMERGENCY_OS_PAGE_TITLES[CANONICAL_ROUTES.adminOperations]).toBeTruthy();
    expect(EMERGENCY_OS_PAGE_SUBTITLES[CANONICAL_ROUTES.adminOperations]).toBeTruthy();
    expect(EMERGENCY_OS_PAGE_TITLES[CANONICAL_ROUTES.trainingDashboard]).toBeTruthy();
    expect(EMERGENCY_OS_PAGE_SUBTITLES[CANONICAL_ROUTES.trainingDashboard]).toBeTruthy();
  });

  it('has at least a handful of real governance workspace routes to check (sanity check on the fixture)', () => {
    expect(GOVERNANCE_WORKSPACE_ROUTES.length).toBeGreaterThan(10);
  });

  it.each(GOVERNANCE_WORKSPACE_ROUTES.map((route) => route.path))(
    'resolveGovernanceWorkspaceLabel resolves a real label for %s',
    (path) => {
      expect(resolveGovernanceWorkspaceLabel(path)).toBeTruthy();
    },
  );

  it('resolves sub-paths under a /* wildcard entry, not just the exact registered paths', () => {
    expect(resolveGovernanceWorkspaceLabel('/governance/registry')).toBe('Clinical governance');
    expect(resolveGovernanceWorkspaceLabel('/audit/some-record-id')).toBeTruthy();
  });

  it('returns null for a path with no governance-workspace match (does not falsely claim every path)', () => {
    expect(resolveGovernanceWorkspaceLabel('/emergency/reception')).toBeNull();
  });
});
