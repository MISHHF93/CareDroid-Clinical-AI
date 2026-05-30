# Canonical Configuration Normalization Report

Date: 2026-05-30

## Duplicate Configs Found

- **Routes and aliases:** active route rendering lived in `src/App.jsx`, auth aliases lived in `src/routing/authPathAliases.js`, and product aliases were inline constants in `App.jsx`. Route health parsed those inline constants from source.
- **Navigation:** sidebar, mobile nav, and quick command destinations were sourced from `src/navigation/primaryNavigation.js`, while active consumers imported that implementation directly.
- **Calculators:** calculator hub metadata existed separately from route definitions, but was already mostly derived from `toolInventory`.
- **Workspaces:** workspace records lived in `src/data/workspaceArchitecture.js`, with UI consumers importing the data module directly.
- **Theme/layout:** CSS tokens and JS breakpoint constants were split across `theme-tokens.css`, `design-tokens.css`, `layout/designTokens.js`, and `layout/breakpoints.js`.
- **API/env/auth:** API path handling existed in `apiEnv.js`, app env parsing in `appConfig.js`, token storage keys were repeated in multiple services, and backend config endpoints were string literals in `configService.js`.
- **Backend executors:** backend executable tool IDs, aliases, unsupported NLU IDs, and request contracts were already centralized in `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`.

## Canonical Configs Created

- `src/config/routes.config.js`: canonical app paths plus auth/product alias groups.
- `src/config/auth.config.js`: canonical auth route, aliases, storage keys, dev-session endpoint, and demo exposure flag.
- `src/config/api.config.js`: frontend API route constants and normalized API helpers.
- `src/config/env.config.js`: stable projection of parsed Vite env flags from `appConfig`.
- `src/config/navigation.config.js`: active navigation projection for UI consumers.
- `src/config/workspace.config.js`: active workspace projection for UI consumers.
- `src/config/layout.config.js`: shell/sidebar/breakpoint constants and scroll ownership contract.
- `src/config/theme.tokens.js`: programmatic theme-token projection and theme storage config.

## Consumers Rewired

- `src/App.jsx` now imports route aliases from `routes.config` instead of defining local alias arrays.
- `src/routing/routeHealth.js` now imports alias groups from `routes.config` and no longer parses route alias constants out of `App.jsx`.
- `src/layout/AppShell.jsx`, `src/components/Sidebar.jsx`, and `src/components/QuickCommandLauncher.jsx` now consume canonical navigation/layout projections.
- `src/components/WorkspaceSwitcher.jsx`, `src/pages/WorkspaceHome.jsx`, and `src/pages/PlatformOSPages.jsx` now use `workspace.config`.
- `src/contexts/ThemeContext.jsx` now uses `theme.tokens` for the storage key.
- `src/auth/devAuthBypass.js`, `src/contexts/UserContext.jsx`, and API services now use `auth.config` storage keys.
- `src/services/configService.js`, `src/services/apiClient.js`, and orchestrator/client services now use `api.config`.

## Legacy / Compatibility Projections

- `src/routing/authPathAliases.js` is retained as a deprecated compatibility projection that re-exports aliases from `routes.config`.
- `src/navigation/primaryNavigation.js`, `src/data/workspaceArchitecture.js`, `src/layout/breakpoints.js`, and `src/config/apiEnv.js` remain implementation/source modules for compatibility and tests. Active UI consumers now go through `src/config/*` projections where safe.
- Backend executor mapping remains in `tool-orchestrator.registry.ts`; no competing backend executor registry was introduced.

## Layout Config Fixes

- `layout.config` documents the scroll contract: `AppShell` owns the viewport, `.app-shell-page-body` owns primary page scroll, and local scroll is reserved for chat, tables, maps, and drawers.
- App shell breakpoint imports now flow through the canonical layout config.
- Prior `/profile/settings` one-scroll/single-shell behavior remains covered by the existing profile shell and AppShell layout tests.

## Auth Config Fixes

- `/auth` remains the single canonical auth route.
- Login/signup aliases remain redirects and are now owned by `routes.config`.
- Demo auth exposure is resolved through `AUTH_CONFIG.demo.exposed`, preserving `VITE_DEMO_MODE`, `VITE_ENABLE_DEV_AUTH_BYPASS`, and `VITE_SHOW_DEMO_AUTH` behavior without duplicating flag logic in the auth page.

## Tests Added / Updated

- Added `src/config/canonicalConfig.contract.test.js` to enforce canonical route/auth/API/layout/theme/workspace/tool contracts.
- Updated route and consolidation tests to assert `App.jsx` consumes route config instead of owning local alias arrays.
- Ran backend executor registry tests to verify registered executors, aliases, unsupported NLU tools, and request contracts are still registered once.

## Remaining Risks

- Some lower-level implementation modules are intentionally still imported by tests and data/reporting code. They are compatibility sources, not new active user-facing config maps.
- Full route rendering still lives in `App.jsx`; moving every route object into a pure config file would be a larger router refactor and should be done in a separate PR-sized pass.
- Several legacy source-level tests still inspect strings in implementation files. They were updated where touched, but future config moves should continue reducing source-string coupling.
