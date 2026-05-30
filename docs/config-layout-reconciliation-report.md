# Config And Layout Reconciliation Report

## 1. Redundant frontend configs found

- `src/navigation/primaryNavigation.js` still owned active sidebar definitions while `src/config/navigation.config.js` claimed to be canonical.
- Route aliases were split between `src/config/routes.config.js` and one-off redirect route objects in `src/App.jsx`.
- Feature flags were parsed in `src/config/appConfig.js` and projected through `src/config/env.config.js`, but there was no stable feature flag config module.
- Dashboard launch cards in `src/pages/CommandDashboard.jsx` carried hardcoded major route paths.
- Calculator hub metadata remains a projection layer in `src/data/calculatorHubManifest.js`; it now continues to derive from `src/data/toolInventory.js`.

## 2. Redundant backend configs found

- `backend/src/modules/live-tracking/*live-tracking.controller.ts` defined legacy controller routes that overlapped active routes in `FleetController`, `HospitalMapController`, and `TelemetryController`.
- `src/data/backendHttpRouteInventory.js` still attributed those operational endpoints to inactive live-tracking controller classes.
- The active executor source remains `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`; executable IDs are limited to `sofa-calculator`, `drug-interactions`, and `lab-interpreter`.

## 3. Duplicate layouts found

- The active protected layout is `src/layout/AppShell.jsx` plus `src/App.jsx`'s `AppShellPage` wrapper.
- `/profile/settings` already uses `PageContainer` and does not render a second sidebar or shell.
- Local scroll remains allowed for conversation history, maps, tables, and drawers; normal pages rely on `.app-shell-page-body`.

## 4. Canonical configs kept/created

- Kept: `routes.config`, `navigation.config`, `toolInventory`, `workspace.config`, `profileToolSegmentation`, `theme.tokens`, `layout.config`, `api.config`, `auth.config`.
- Created: `featureFlags.config`.
- Quarantined compatibility: `navigation/primaryNavigation.js` now re-exports `config/navigation.config`.

## 5. Consumers rewired

- Sidebar, mobile nav, and quick command continue to consume `navigation.config`.
- Dashboard major launch cards now use `CANONICAL_ROUTES`.
- `env.config` now reads feature flags through `featureFlags.config`.
- `routeHealth` includes operations aliases from `routes.config`.

## 6. Legacy configs quarantined

- `navigation/primaryNavigation.js` is compatibility-only.
- Legacy live-tracking controller classes are undecorated adapters; active HTTP routes live in registered feature controllers.

## 7. Layout shell fixes

- No new page shell was introduced.
- `/profile/settings` remains under a single `AppShellPage` and `PageContainer`.
- The layout contract is still enforced by `src/layout/ProfileSettingsShell.test.jsx`, `src/layout/AppShell.layout.test.js`, and mobile scroll tests.

## 8. Backend registry fixes

- Backend route inventory now attributes:
  - fleet live/routes endpoints to `FleetController`
  - hospital map floors/devices endpoints to `HospitalMapController`
  - device/telemetry/alert endpoints to `TelemetryController`
- Added a route scan assertion that no duplicate active controller method/path pairs exist.

## 9. Contract reconciliation

- `docs/platform-capability-matrix.md` labels fleet map, live map, hospital map, and medical IoT as demo-backed operational capabilities.
- `docs/endpoint-to-frontend-matrix.md` now points demo operational endpoints at the active controllers.
- `docs/tool-contract-matrix.md` remains generated from `src/data/toolContractMatrix.js`; it continues to distinguish fully wired executors from frontend-only/chat-assisted tools.

## 10. Tests added/updated

- Canonical route aliases now include `/chat`, `/catalog`, `/fleet`, and `/operations`.
- Sidebar/navigation tests now validate `navigation.config` as the active source.
- Backend route scan tests now reject duplicate active controller routes.
- Canonical config tests cover `featureFlags.config`.

## 11. Remaining risks

- `workspace.config` remains a projection over `data/workspaceArchitecture.js` for compatibility with inventory/report consumers.
- `toolInventory` still derives from legacy registry/catalog inputs during migration; those legacy files should remain compatibility projections until every consumer has moved.
- Large generated docs should be regenerated with repository scripts after any future matrix model changes.
