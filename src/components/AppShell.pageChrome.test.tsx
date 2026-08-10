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
import { CANONICAL_ROUTE_MAP } from '../config/routes.config';
import { EMERGENCY_OS_PAGE_SUBTITLES, EMERGENCY_OS_PAGE_TITLES } from './AppShell';

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
