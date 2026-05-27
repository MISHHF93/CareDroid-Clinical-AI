# Navigation Simplification Report

Date: 2026-05-26

## Old Navigation Issues

- The sidebar mixed primary destinations with a large nested Actions/tools drawer, workspace controls, profile quick links, recent chats, notifications, and sign out.
- Operations, maps, fleet, Medical IoT, and device pages overlapped conceptually, making it unclear whether users should start from `/operations`, `/live-map`, `/hospital-map`, `/medical-iot`, or `/fleet/map`.
- Developer/source-audit navigation was close to normal user-facing tools, even though `/tools/catalog` is a developer/audit surface.
- The dashboard had rich panels, but it did not provide one compact launchpad for every major work area.

## Duplicate Buttons Found

- Sidebar had a primary Assistant destination plus a separate “Start Assistant” button that did not clearly behave as a route launcher.
- Sidebar exposed Tools and then an expandable Actions area containing many individual tool cards that duplicated `/tools` and Quick Command.
- Profile entry points were split between the user card, sidebar profile quick links, Settings, and profile routes.
- Fleet and operations were reachable through both `/operations` and fleet-specific routes.

## Redundant Routes Found

Routes remain available for compatibility, but visible navigation now favors canonical paths:

- `/dashboard` for the main entry.
- `/assistant` for AI chat; `/chat`, `/ai`, and `/copilot` remain redirects/aliases.
- `/tools` for user-facing tools.
- `/tools/calculators` for calculators.
- `/tools/catalog` for Developer Catalog / Source Audit.
- `/hospital-map` for hospital mapping.
- `/medical-iot` for Medical IoT.
- `/fleet/map` for fleet live tracking; `/fleet` now redirects there.
- `/profile` and `/settings` for user/account flows.

## Simplified Navigation Model

Primary sidebar:

1. Dashboard
2. AI Assistant
3. Tools
4. Calculators
5. Hospital Map
6. Medical IoT
7. Fleet
8. Profile
9. Settings

Advanced group:

- Developer Catalog / Source Audit
- System Health
- Governance
- Audit Logs

## Sidebar Changes

- Replaced the mixed sidebar IA with the simplified primary model.
- Moved developer/governance/audit/system surfaces into a collapsed Advanced section.
- Removed the nested Actions/tool-card drawer from sidebar exposure; tools remain accessible through `/tools`, `/tools/calculators`, dashboard cards, and Quick Command.
- Changed the assistant CTA to “New Chat” and made it navigate to `/assistant`.
- Kept the mobile drawer semantics, inert closed state, focus restoration, independent sidebar scrolling, and route-close behavior.

## Dashboard Entry Changes

- Added a compact Launchpad panel with direct cards for AI Assistant, Tools, Calculators, Hospital Map, Medical IoT, Fleet, Device Management, Recent Activity, and System Status.
- Updated Fleet panel labeling and links to prefer `/fleet/map` instead of `/operations`.
- Kept detailed tool, analytics, recent activity, and status panels below the compact launch surface.

## Quick Command Changes

- Quick Command remains a search/launcher rather than a second visible navigation tree.
- Destination entries now come from the simplified primary navigation model.
- Tool entries continue to come from the unified user-facing inventory and avoid duplicating destinations already covered by primary nav paths.
- Shared-route clinical tools that intentionally launch through `/tools/calculators` remain searchable, so hub-assisted tools such as Wells PE, PERC, and GRACE ACS are not hidden by route dedupe.
- Keyboard behavior and mobile-safe overlay scrolling remain covered by existing Quick Command tests.

## Mobile Navigation Validation

- Bottom navigation now uses the compact primary set: Dashboard, AI Assistant, Tools, Calculators, and Hospital Map.
- The full drawer still exposes the remaining primary destinations and Advanced group.
- Sidebar CSS continues to keep the closed drawer non-interactive and the open drawer independently scrollable.
- Dashboard launch cards use responsive grids that collapse to one column on narrow viewports.

## Tests Added Or Updated

- `src/navigation/primaryNavigation.test.js` verifies canonical primary order, Advanced grouping, no duplicate visible destinations, and compact mobile nav.
- `src/components/Sidebar.mobileRender.test.jsx` verifies simplified sidebar items and collapsed Advanced links.
- `src/components/Sidebar.responsive.test.js` verifies Advanced drawer behavior and preserves mobile drawer contracts.
- `src/components/QuickCommandLauncher.test.jsx` verifies canonical destination entries and inventory-backed secondary operations search.
- `src/components/Sidebar.toolsNavigation.test.js` verifies the simplified sidebar contract and prevents stale tool-card props from returning to the shell.
- `src/pages/CommandDashboard.test.jsx` verifies the new Launchpad cards and updated Fleet route.
- `src/routing/canonicalRouteRedirects.test.js` verifies `/fleet` redirects to `/fleet/map`.

## Verification

- Targeted navigation tests: `66 passed`.
- Responsive regression suite: `463 passed`.
- Frontend lint: passed with existing warnings only.
- Production build: passed; Vite still reports existing large chunk warnings for calculator/chart bundles.

## Remaining Risks

- Deep feature routes are still intentionally available, so future feature additions should update `primaryNavigation.js` only when they deserve primary IA exposure.
- Some legacy `/operations/*` routes remain for platform administration and should stay out of normal user navigation unless they are promoted intentionally.
- The sidebar CSS still contains historical styles for old tool-card sections; they are no longer rendered by the simplified sidebar and can be pruned later after a visual regression pass.
