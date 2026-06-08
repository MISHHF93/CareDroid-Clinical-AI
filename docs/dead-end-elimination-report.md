# Dead-End Elimination Report

## Goal

No page becomes a dead end.

For every page, identify:

- No next action
- No recommendation
- No related tools
- No return path

Add:

- Related Assets
- Recommended Next Actions
- Recent Activity
- Back to Workspace

## Audit Areas

- Page shells and shared primitives
- Dashboard and workspace pages
- Tool and assistant pages
- Operations pages
- Profile, settings, and platform pages
- Empty states and detail pages

## Findings

### Shared Page Shells

- **Finding:** The canonical app shell provided navigation, workspace switcher, and search, but no guaranteed page-end continuation path.
- **Impact:** Any page that did not implement local next actions could strand users after they finished reading or reviewing content.
- **Repair:** Add a shared authenticated page continuation block at the shell level.

### Platform and Commercial Page Families

- **Finding:** `PlatformOSPages` and commercial pages use shared shells and cover many routes, but individual pages had inconsistent onward paths.
- **Impact:** Some pages had actions, while others ended after a grid, detail card, or empty state.
- **Repair:** Shell-level continuations cover these pages without editing every page body.

### Tools, Operations, and Workspace Pages

- **Finding:** Tools, Operations, Workspace, and Dashboard pages have some continuation patterns, but labels and data sources varied.
- **Impact:** Users had to learn different page endings for related assets, recommendations, activity, and workspace return.
- **Repair:** Use a common continuation block on authenticated pages that do not already have dedicated local flows.

### Empty and Detail States

- **Finding:** Empty states commonly offered a reset or back link but not related assets, recommended next actions, recent activity, and workspace return together.
- **Impact:** No-result and detail pages were especially likely to become dead ends.
- **Repair:** The shell continuation block appears after content, including empty/detail page content.

### Existing Data Sources

- Related assets can come from the active workspace inventory and user-facing tool registry.
- Recommended next actions can come from workspace recommendations plus canonical routes to Recommendations, Assistant, and Tools.
- Recent activity can come from recent tools and identity activity.
- Back to Workspace can use the active workspace id with an Emergency fallback.

## Repairs

- Added `src/components/ui/PageContinuations.jsx`.
- Added `src/components/ui/PageContinuations.css`.
- Wired `PageContinuations` into authenticated content pages through `src/layout/AppShell.jsx`.
- Kept local-flow routes (`/dashboard`, `/home`, `/assistant`, `/chat`) excluded because they already provide focused next actions and should not regain visual clutter.
- Added AppShell regression coverage for continuation labels and workspace return.

## Verification

Passed:

- `npm test -- AppShell.navigation.test.jsx`
