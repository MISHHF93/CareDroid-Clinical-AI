# Chat, Tools, and Routing Audit

Generated: 2026-06-14

## Discovery Method

- Inspected the active React route tree in `src/App.jsx`, the canonical route registry in `src/config/routes.config.js`, sidebar navigation in `src/config/unified-navigation.config.ts`, role permissions in `src/config/emergencyRolePermissions.js`, and command palette config in `src/config/commandPalette.config.js`.
- Inspected the existing chat and Copilot surfaces in `src/components/ChatInterface.jsx` and `src/components/CopilotPanel.tsx`.
- Inspected the tool and calculator surfaces in `src/pages/tools/ToolsOverview.jsx`, `src/pages/tools/ClinicalToolCatalog.jsx`, `src/components/ClinicalCalculatorHub.tsx`, `src/navigation/registryToolLaunch.js`, and the normalized tool inventory.
- Inventoried non-test page modules under `src/pages`: 154 page/source modules, including 46 tool page modules, 8 emergency page modules, and 72 top-level page modules.
- Loaded `ROUTE_RECORDS` from `src/config/routes.config.js`: 68 registry records total, with 56 active, 4 redirect, and 8 future records.

## Root Findings

- AppShell is the single active shell. No second shell or route architecture is needed.
- The active mounted route tree is intentionally Emergency OS first: 15 canonical AppShell pages are mounted in `CANONICAL_APP_ROUTE_TREE` and `src/App.jsx`.
- Medical Tools were sidebar-reachable at `/emergency/tools`, but calculator deep links previously landed as filtered tool cards instead of opening the existing calculator workspace.
- Chat and docked Copilot already had safe operational action patterns. The missing part was a route-backed bridge from chat/Copilot tool controls to the canonical Medical Tools route.
- The route registry contains many active product/platform records that are not mounted in the active Emergency OS AppShell. Those should not be blindly mounted while the product constraint is one active Emergency OS shell.

## Chatbot Layout Findings

- `ChatInterface` already had a scrollable message pane, sticky composer area, touch-sized quick actions, keyboard submit behavior, source panels, confirmable action cards, and reduced-motion handling.
- Safe improvement applied: added targetable route-backed tool chips in the composer for Medical Tools, Calculators, and qSOFA.
- Chips use stable `data-copilot-tool-action` attributes, accessible labels, existing button styling patterns, wrapping layout, and reduced-motion behavior.
- `CopilotPanel` now exposes the same targetable route-backed tool actions in the docked Copilot panel.

## Sidebar, Tools, and Calculator Routing Map

| Surface | Canonical path/action | Status |
| --- | --- | --- |
| Sidebar Medical Tools | `/emergency/tools` from `NAVIGATION_ITEMS` | Active mounted |
| Command palette Medical Tools | `EMERGENCY_OS_ROUTE_COMMANDS` | Active mounted |
| Command palette Calculators | `/emergency/tools?source=calculators&filter=calculator` | Added |
| qSOFA command | `/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa` | Added |
| HEART command | `/emergency/tools?source=calculators&filter=calculator&q=heart-score&open=heart-score` | Added |
| NIHSS command | `/emergency/tools?source=calculators&filter=calculator&q=nihss&open=nihss` | Added |
| Legacy `/tools/calculators/:slug` | Redirects to `/emergency/tools?...&q=:slug&open=:slug` | Updated |
| Registry calculator launch | `getRegistryToolNavigation()` returns `/emergency/tools?...&open=<slug>` | Updated |
| Chat/Copilot tool controls | `ed:open-tools` and `ed:open-calculator` handled by AppShell | Added |

## Page Inventory Classification

| Classification | Findings |
| --- | --- |
| `ACTIVE_MOUNTED` | 15 AppShell pages: whiteboard, patients, EMS, intake, queues, reassessment, capacity, boarding, referrals, copilot, tools, pulse, shift, analytics, settings. |
| `ACTIVE_UNMOUNTED_SAFE_TO_WIRE` | None mounted as new standalone pages in this pass. Calculator workspace was safely surfaced inside existing `/emergency/tools` instead. |
| `TOOL_SURFACE` | `ToolsOverview`, registry launcher, source/developer catalog, clinical tool pages, AI tool pages, and tool inventory projections. User-facing entry remains `/emergency/tools`. |
| `CALCULATOR_SURFACE` | `ClinicalCalculatorHub`, legacy `Calculators.jsx`, calculator components, calculator manifests, and calculator redirect aliases. Hub now loads from canonical tools route. |
| `LEGACY_COMPAT` | `/tools`, `/calculators`, `/scores`, `/assistant`, `/chat`, `/ai`, `/copilot`, workspace emergency aliases, and retired platform roots redirect into Emergency OS. |
| `FUTURE_REVIEW` | Future route records: platformAdmin, digitalTwin, laboratory, fleetMap, fleetCommand, governanceRegistry, aiGovernance, tenantAdmin. Not mounted. |
| `DUPLICATE` | Compatibility/export surfaces such as `src/pages/emergency/ClinicalCalculatorHub.jsx` and legacy calculator/catalog pages. Kept as aliases or internal audit surfaces. |
| `MANUAL_REVIEW` | Broad active route records for commercial, platform, organization, fleet, analytics, simulation, and marketplace modules. They exist in source but conflict with the current Emergency OS-only route tree unless product scope changes. |
| `DEAD_SAFE_TO_REMOVE` | None identified as safe to remove in this pass. No deletion performed. |

## Safe Fixes Applied

- Mounted `ClinicalCalculatorHub` inside `ToolsOverview` when the route/search params indicate calculator intent.
- Extended calculator launch params from registry, legacy redirects, AppShell command handling, and chat events to include `open=<calculatorId>`.
- Added `ed:open-tools` and `ed:open-calculator` AppShell event handlers that navigate through the existing Emergency OS route/permission guard.
- Added targetable tool chips to `ChatInterface` and `CopilotPanel` without introducing a new tool runner.
- Added command palette registry entries for the calculator hub and common calculators.
- Added focused test coverage for registry launch params, legacy route redirect params, calculator auto-open via search params, chat tool chips, Copilot tool controls, AppShell event bridge, and command registry entries.

## Validation Results

- `npm run typecheck:frontend` passed.
- `npm run lint` passed.
- Focused Vitest suites passed: `src/navigation/registryToolLaunch.test.js`, `src/routing/canonicalRouteTree.behavior.test.jsx`, `src/layout/AppShell.navigation.test.jsx`, `src/components/Sidebar.test.tsx`, `src/components/CommandPalette.test.tsx`, `src/components/ChatInterface.nlu.test.jsx`, `src/components/CopilotPanel.operationalAwareness.test.ts`, `src/components/ClinicalCalculatorHub.test.tsx`, and `src/pages/tools/ToolsOverview.responsive.test.js`.
- IDE linter diagnostics were checked for touched source and test files with no errors reported.

## Remaining Manual-Review Risks

- The route registry still documents many active product/platform records that are intentionally not mounted in the active Emergency OS AppShell. Mounting them would require a product decision, permissions review, and navigation scope decision.
- `ClinicalToolCatalog` remains a developer/source-audit surface, not a second user-facing tools catalog.
- Legacy calculator and tool pages remain useful for tests and compatibility, but user-facing launch should continue through `/emergency/tools`.
