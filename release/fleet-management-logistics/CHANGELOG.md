# Changelog — Fleet Management + Logistics AI Foundation

## [Unreleased]

### Added

#### Tier A — fleet operations pages

- **Fleet Command** (`fleet-command`): `FleetDashboard.jsx`, widgets (`FleetSummaryWidget`, `FleetMaintenanceWidget`, `FleetVehicleListWidget`, `FleetEnergyMeter`), route `/fleet/command`
- **Predictive Maintenance** (`predictive-maintenance`): `PredictiveMaintenance.jsx`, `PredictiveMaintenanceWidgets.jsx`, route `/fleet/predictive-maintenance`
- **Route Optimization** (`route-optimizer`): `RouteOptimizer.jsx`, `RouteOptimizerWidgets.jsx`, route `/fleet/route-optimizer`
- Shared chrome: `FleetPageChrome.jsx`, `fleetUxShared.css`

#### Tier B — chat-assisted dispatch

- **Dispatch Intelligence** (`dispatch-ai`): `chatAssistedFleet/dispatchAi.js`, hub group `fleet-dispatch` in `chatAssistedHubGroups.js`
- Calculators hub card with fleet styling, safety pill, and `fleetChatAssistedLaunchAriaLabel`
- Launch: hub path `/tools/calculators` → navigation `/dashboard`

#### Client services (deterministic)

- `fleetTelemetryService.js` — mock fleet command snapshot with `AbortController` support
- `predictiveMaintenanceScoring.js` — rules engine, risk bands, inspection windows, anomalies
- `routeOptimizationService.js` — sort-based sequencing, traffic multiplier, window status, savings math

#### Registry & catalog wiring

- `toolRegistry.js` — four Fleet category entries with shortcuts and icons
- `clinicalIntentToolCatalog.js` — fleet NLU profiles and `chatSeed`s
- `clinicalToolIdContract.js` — `PR_FLEET_ALL_REGISTRY_IDS`; `dispatch-ai` in `AI_EXECUTABLE_NLU_TOOL_IDS`
- Discovery aliases: NLU phrases + hyphenated slugs (`PR_FLEET_ALL_ALIAS_PAIRS`)
- Medical catalog rows: fleet category, `chatOnlyForm` for Tier B, paths per tier

#### Backend NLU (no fleet REST APIs)

- `tool.patterns.ts` — patterns for `fleet-command`, `predictive-maintenance`, `route-optimizer`, `dispatch-ai`
- Disambiguation: `preferFleetCommand`, `preferPredictiveMaintenance`, `preferRouteOptimizer`, `preferDispatchAi`
- `tool-orchestrator.registry.ts` — fleet tools in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` (including `dispatch-ai`)

#### Routing

- `App.jsx` lazy routes for three Tier A fleet pages + `/fleet/*` fallback
- `clinicalToolRoutes.js` — fleet paths in `KNOWN_TOOL_AREA_PATHS`; `isFleetAreaPath()`, `expectedLaunchPath()`

#### Accessibility & safety UX

- Skip link, focus management, `aria-busy` refresh, operational `role="alert"` warnings
- Anti-automation copy on all Tier A pages and dispatch hub
- `type="time"` window inputs on route planner; form validation `aria-invalid`

#### Tests & audit infrastructure

- `src/data/pr6FleetComprehensive.test.jsx` — 130-test comprehensive suite (8 dimensions)
- `src/data/prFleetConsistency.test.js` — cross-layer consistency (88 tests)
- Per-tool wiring tests: `fleetCommandWiring`, `predictiveMaintenanceWiring`, `routeOptimizerWiring`, `dispatchAiWiring`
- `src/data/testHelpers/fleetToolsTestFixtures.js` — deterministic fixtures
- `src/data/prFleetTestConstants.js` — `PR_FLEET_*` audit constants
- `npm run test:pr6-fleet` — aggregated fleet test script
- Page/service tests under `src/pages/fleet/` and `src/services/`

### Changed

- `Calculators.jsx` — fleet-dispatch hub group rendering and launch aria labels
- `Calculators.css` — `.calc-chat-assisted-group--fleet`, safety pill, focus-visible on cards
- `unsupportedOrchestratorTools.js` — documents fleet NLU ids without POST executors

### Security & safety

- No POST tool-orchestrator executors for fleet tool IDs
- Chat seeds and UI copy require human dispatcher / fleet manager approval before operational action

### Not included

- Live telematics integration
- Fleet database schema or migrations
- Auto-dispatch, auto-schedule, or telematics write paths
- ML/graph production engines (hooks only)
