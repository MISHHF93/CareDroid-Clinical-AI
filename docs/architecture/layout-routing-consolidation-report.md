# Layout Routing Consolidation Report

Generated: 2026-06-12

## Changes Made

- Created `src/config/commandPalette.config.js` as the single command-palette route registry for the active Emergency OS route tree.
- Updated `src/components/CommandPalette.jsx` to consume `EMERGENCY_OS_ROUTE_COMMANDS` from the new registry instead of defining route commands inline.
- Updated `src/config/navigation.config.js` so the AppShell capacity rail item uses `CANONICAL_ROUTES.emergencyCapacity` instead of a hardcoded path.
- Updated `src/config/routes.config.js` protected alias records so legacy dashboard, assistant, tools, calculators, and operations aliases resolve into active `/emergency/*` routes.
- Updated `src/App.jsx` so Copilot conversation handlers navigate to `/emergency/copilot`, and old calculator/tool routes redirect to `/emergency/tools` with source/filter/open query parameters where applicable.
- Updated `src/data/workspaceArchitecture.js` so the Emergency workspace default path is `/emergency/whiteboard`, and core workspace shortcuts for assistant, command center, tools, calculators, and settings point at active Emergency OS routes.
- Updated route/config/navigation tests to assert the normalized Emergency OS route model instead of `/workspace/emergency`, `/dashboard`, `/assistant`, and old calculator pages.

## Files Refactored

- `src/App.jsx`
- `src/components/CommandPalette.jsx`
- `src/config/commandPalette.config.js`
- `src/config/navigation.config.js`
- `src/config/routes.config.js`
- `src/data/workspaceArchitecture.js`
- `src/layout/AppShell.navigation.test.jsx`
- `src/routing/routeAuthRebuild.test.js`
- `src/routing/canonicalRouteRedirects.test.js`
- `src/config/canonicalConfig.contract.test.js`
- `src/data/workspaceArchitecture.test.js`
- `src/components/QuickCommandLauncher.test.jsx`
- `src/pages/PlatformOSPages.test.jsx`

## Files Moved

- None.

No uncertain source file was moved because the largest legacy/future areas are still referenced by tests, inventories, compatibility redirects, platform catalog search, or backend module imports.

## Files Archived

- None.

No file met the threshold for safe archival during this pass. The review candidates remain documented below instead of being deleted or moved blindly.

## Routes Normalized

Active route target remains the mounted Emergency OS route tree:

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/tools`
- `/emergency/pulse`
- `/emergency/shift`
- `/emergency/analytics`
- `/emergency/settings`

Legacy/default paths now redirect or resolve to active Emergency OS routes:

- `/`, `/emergency`, and unknown routes target `/emergency/whiteboard`.
- `/home` resolves through route records to `/emergency/whiteboard`.
- `/dashboard` redirects in `src/App.jsx` to `/emergency/whiteboard`.
- `/chat`, `/ai`, `/copilot`, and `/assistant` resolve or redirect to `/emergency/copilot`.
- `/catalog`, `/all-tools`, `/clinical-tools`, `/tools`, `/tools/calculators`, `/tools/calculators/:slug`, `/calculators`, and `/scores/*` resolve or redirect to `/emergency/tools`.
- `/operations`, `/operations/*`, `/operations-center`, `/fleet/*`, `/hospital-map`, `/medical-iot`, `/devices`, and live-map aliases route into `/emergency/tools` with operations/map context.
- Emergency workspace quick-launch now opens `/emergency/whiteboard`.

## Layouts Removed

- None.

The active app already uses one `AppShell`, one shell-owned sidebar/rail, one header, and one main content region. Existing tests also assert that active pages do not mount nested shell/sidebar/main regions.

## Configs Consolidated

- Navigation remains centralized in `src/config/navigation.config.js`.
- Route aliases and route records remain centralized in `src/config/routes.config.js`, with legacy alias targets now pointing at Emergency OS routes.
- Command-palette route commands are centralized in `src/config/commandPalette.config.js`.
- API base configuration remains centralized through `src/config/appConfig.js`, `src/config/apiEnv.js`, `src/config/api.config.js`, and `src/services/apiClient.js`; no duplicate active API base config was introduced.
- Workspace projection remains in `src/config/workspace.config.js`, backed by `src/data/workspaceArchitecture.js`, with the active Emergency workspace path now normalized.

## Remaining Risks

- `src/data/workspaceArchitecture.js` and `src/pages/WorkspaceHome.jsx` still contain many `/workspace/emergency/*` deep-link and future subpage references. They are compatibility/future surfaces, not active default routing.
- Broad platform datasets still contain `/assistant`, `/dashboard`, and `/tools/calculators` as catalog or future module launch paths. They should be reviewed feature-by-feature before archival or rewiring.
- `src/data/searchFirstDiscovery.js` is the active global search registry, while `src/utils/catalogSearch.js` remains a specialized clinical tool catalog search utility. These are distinct search scopes, not duplicate global registries.
- Backend `AppModule` still imports broad healthcare platform modules; they are not safe to remove without a backend feature/module retirement plan.
- Optional Mongoose Emergency OS Express routes remain disabled unless `ENABLE_MONGOOSE_EMERGENCY_OS=true` and MongoDB env are configured.

## Manual Review Items

- Review `src/pages/WorkspaceHome.jsx` for eventual move to `src/features/future-modules/_review/` after confirming no active route/test/report still depends on it.
- Review broad platform data files with legacy launch paths, especially `src/data/emergencyOperatingSystem.js`, `src/data/platformOperatingSystem.js`, `src/data/segmentInventory.js`, and `src/data/toolRegistry.js`.
- Decide whether clinical calculator/tool pages are future modules, tool-catalog support pages, or should be fully replaced by Emergency OS Copilot workflows.
- Decide whether backend non-Emergency modules should remain in `backend/src/app.module.ts` or be split behind feature modules/flags.
- Consider adding a dedicated `src/config/searchRegistry.config.js` only if global search ownership needs to move out of `src/data/searchFirstDiscovery.js`.
