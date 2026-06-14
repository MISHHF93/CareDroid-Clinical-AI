# Frontend Functionality Usage Audit

Audit date: 2026-06-14

Scope: active CareDroid Emergency OS frontend entry points, routes, shell, navigation, command palette, page inventory, active Emergency OS workflows, API clients, and unused/disconnected code signals.

## Executive Summary

The active frontend spine is `src/main.jsx` -> `src/App.jsx` -> `src/components/AppShell.tsx`. `App.jsx` mounts the Emergency OS routes inside the single AppShell and redirects broad legacy routes back into the Emergency OS surface. `AppShell.tsx` owns the persistent Sidebar, Header, patient detail panel, Copilot panel, EMS broadcast, reassessment drawer, command palette, toaster, and startup engines.

No active Emergency OS route or visible pilot navigation item was found to be unmounted. The active whiteboard is mounted through the compatibility shim `src/components/EmergencyWhiteboard.jsx`, which re-exports `src/pages/emergency/index.tsx`.

No code was deleted. The safe fix applied in this audit was to repair the orphan-detection report parser so generated unused-code evidence recognizes JSX routes using `path={CANONICAL_ROUTES.*}` and configured redirect arrays.

## Active Functionality Map

| Functionality | Route or Surface | Runtime Owner | API or Store Path | Classification |
| --- | --- | --- | --- | --- |
| App boot | `src/main.jsx` | React root, global errors, service worker handling, viewport metrics | `scheduleDeferredStartupTasks`, `runAfterFirstPaint` | ACTIVE_USED |
| Route tree | `src/App.jsx` | `AppRoutes`, `RootLayout`, route guards, legacy redirects | `CANONICAL_APP_ROUTE_TREE`, `CANONICAL_ROUTES` | ACTIVE_USED |
| Shell/chrome | `src/components/AppShell.tsx` | Sidebar, Header, overlays, engines, command execution | `useEmergencyStore`, `startReassessmentEngine`, `startCapacityEngine` | ACTIVE_USED |
| Whiteboard | `/emergency/whiteboard` | `src/components/EmergencyWhiteboard.jsx` -> `src/pages/emergency/index.tsx` | `useEmergencyWhiteboard`, Central Node, local store fallback | ACTIVE_USED |
| Patients | `/emergency/patients` | Inline `PatientsRoute` in `src/App.jsx` | `useEmergencyPatients`, `usePatientJourney`, `PatientCard` | ACTIVE_USED |
| EMS | `/emergency/ems` | `src/components/EMSPipeline.jsx` | `useEMSIntake` | ACTIVE_USED |
| Intake | `/emergency/intake` | `src/pages/emergency/SmartIntake.jsx` | `fetchSmartIntake`, `runSmartIntakeVerticalSlice` | ACTIVE_USED |
| Queues | `/emergency/queues` | Inline `QueueRoute` in `src/App.jsx` | `useEmergencyQueues`, store queue filter | ACTIVE_USED |
| Reassessment | `/emergency/reassessment` | Inline `ReassessmentRoute` plus `ReassessmentDrawer` | `useReassessmentQueue`, reassessment flags | ACTIVE_USED |
| Capacity | `/emergency/capacity` | Inline `CapacityRoute` | `useCapacityStatus`, `useUpgradeHarnessCapacity` | ACTIVE_USED |
| Boarding | `/emergency/boarding` | Inline `BoardingRoute` | `useBoardingStatus` | ACTIVE_USED |
| Referrals | `/emergency/referrals` | `src/components/ReferralPanel.jsx` | `useReferrals` | ACTIVE_USED |
| Copilot | `/emergency/copilot`, docked panel | Inline `CopilotRoute`, `src/components/CopilotPanel.tsx` | `useEDCopilot`, Central Node context, upgrade harness signals | ACTIVE_USED |
| Medical tools | `/emergency/tools` | `src/pages/tools/ToolsOverview.jsx` | tool inventory and calculator launch filters | ACTIVE_USED |
| Department Pulse | `/emergency/pulse` | `src/pages/emergency/pulse/index.tsx` | direct route and command-palette command | ACTIVE_USED |
| Shift Summary | `/emergency/shift` | `src/pages/emergency/shift/index.tsx` | direct route and command-palette command | ACTIVE_USED |
| Analytics | `/emergency/analytics` | `src/pages/emergency/EmergencyAnalytics.jsx` | `loadEmergencyAnalytics`, Central Node, upgrade harness | ACTIVE_USED |
| Settings | `/emergency/settings` | `src/pages/emergency/EmergencySettings.jsx` | `emergencySettingsApi`, governance/integration fetchers, store settings | ACTIVE_USED |
| Notifications/Header | persistent AppShell | `src/components/Header.tsx` | alerts, Central Node status, patient lookup, workload controls | ACTIVE_USED |
| Sidebar | persistent AppShell | `src/components/Sidebar.tsx` | `getVisibleNavigation`, `FeatureGate`, role permissions | ACTIVE_USED |
| Command palette | persistent AppShell overlay | `src/components/CommandPalette.tsx`, `src/config/commandPalette.config.js` | route commands, patient lookup, guarded actions | ACTIVE_USED |
| Central Node | Header, Whiteboard, Analytics, Copilot | `useCareDroidCentralNode`, `careDroidCentralNode.ts` | `/api/emergency/central-node/snapshot`, realtime fallback | ACTIVE_USED |

## Navigation and Route Findings

| Finding | Evidence | Classification | Action |
| --- | --- | --- | --- |
| Pilot sidebar items derive from `unified-navigation.config.ts` and are projected through `navigation.config.js`. | `AppShell.tsx` calls `getVisibleNavigation`; `Sidebar.tsx` receives `visibleNavigationItems`; `AppShell.navigation.test.jsx` asserts projection. | ACTIVE_USED | Keep unified navigation as the source. |
| Analytics and Settings are direct routes but hidden from pilot sidebar. | `PILOT_CUSTOMER_MODE.hiddenNavItemIds` hides both; `CANONICAL_APP_ROUTE_TREE` and `App.jsx` still mount both. | ACTIVE_USED | Keep as retained direct routes. |
| Pulse and Shift are mounted direct routes and command-palette entries, not sidebar items. | `RETAINED_DIRECT_ROUTE_COMMANDS` includes both; `App.jsx` mounts both. | ACTIVE_USED | Keep as operational shortcuts. |
| Legacy routes redirect into the Emergency OS shell. | `LEGACY_EMERGENCY_ROUTE_REDIRECTS`, `ToolsRedirect`, assistant aliases, `/dashboard`, `/home`, `/workspace`, `/app`. | LEGACY_COMPAT | Do not delete without a migration decision. |
| Non-ED workspace routes redirect to the whiteboard. | `NON_ED_WORKSPACE_REDIRECT_ROUTES` under `RootLayout`. | LEGACY_COMPAT | Keep as compatibility redirects while product is ED-focused. |

## Unused and Disconnected Inventory

| Item | Evidence | Classification | Recommendation |
| --- | --- | --- | --- |
| `src/layout/AppShell.jsx` and `src/layout/AppShell.css` | Runtime `App.jsx` imports `src/components/AppShell.tsx`; old layout is referenced by compatibility/source-contract tests and duplicate-system docs. | DUPLICATE_SAFE_TO_CONSOLIDATE | Do not wire back into runtime. Consolidate or retire old tests in a dedicated cleanup. |
| `src/pages/settings/FeatureManagement.jsx` | No active `App.jsx` route or import; `/settings/features` redirects to `/emergency/settings`; referenced by docs/tests. | ACTIVE_TEST_ONLY | Keep out of active Emergency OS until product decision. If retired, update docs/tests and remove in one cleanup. |
| `src/pages/emergency/DepartmentPulse.jsx` | Orphan report classifies as legacy; active pulse route uses `src/pages/emergency/pulse/index.tsx`. | DUPLICATE_SAFE_TO_CONSOLIDATE | Keep current pulse route; review old DepartmentPulse component before removal. |
| `src/services/boardingApi.js` | Refreshed orphan report: no production import; active boarding route uses `useBoardingStatus` from `emergencyOsApi.js`. | DEAD_SAFE_TO_REMOVE | Candidate for later deletion after confirming no external import consumers. |
| `src/services/emergencyCopilotApi.js` | Refreshed orphan report: no production import; active Copilot surfaces use `useEDCopilot`, `clinicalChatService`, and Central Node context. | DEAD_SAFE_TO_REMOVE | Candidate for later deletion or merge into canonical API facade. |
| `src/services/reassessmentApi.js` | Refreshed orphan report: no production import; active reassessment route uses `useReassessmentQueue`. | DEAD_SAFE_TO_REMOVE | Candidate for later deletion or merge into canonical API facade. |
| `src/services/surgeApi.js` | Refreshed orphan report: no production import; surge is optional/manual-review in existing architecture docs. | FUTURE_REVIEW | Do not delete until surge ownership is decided. |
| `fetchCompleteImplementationReadiness` | Only test/docs references found; no active route or hook consumer. | ACTIVE_TEST_ONLY | Keep as review/reporting contract or move to review-only endpoint keys in a focused API cleanup. |
| `fetchEmergencyAiGovernanceSafetyRules` and `fetchEmergencyAiGovernanceViolations` | Only API tests and default export references found. | ACTIVE_TEST_ONLY | Keep while governance review contract remains documented; not active bedside UI. |
| `useProvincialHealth` and `useIntegrationHub` | Hook exports remain but active Settings calls direct fetchers; no active route consumes the hooks. | FUTURE_REVIEW | Either wire to a retained settings/runtime card or reclassify as review-only later. |
| `emergencyAnalyticsApi.js` capacity/history/queue/export calls | Only future-module ShiftSummary and inventory references found; active analytics page uses store and `emergencyOsApi.js`. | LEGACY_COMPAT | Keep guarded/stubbed until optional analytics endpoints are productized or removed. |
| Broad platform/future routes in `CANONICAL_ROUTES` and compatibility navigation config | Refreshed orphan report still reports many non-ED route gaps; active Emergency OS tests pass. | FUTURE_REVIEW | Separate broad platform route inventory from active Emergency OS route source to reduce false positives. |

## Safe Fixes Applied

| Fix | Files | Why |
| --- | --- | --- |
| Improved orphan-detection route parsing for JSX route declarations and configured route arrays. | `src/data/orphanDetectionAudit.js` | The generated unused-code report was falsely listing mounted Emergency OS routes as `wire` gaps because it only parsed object-style `path: '...'` entries. |
| Updated the orphan report test route-count ceiling. | `src/data/orphanDetectionAudit.report.test.js` | The parser now counts canonical JSX routes plus redirect arrays, so the previous ceiling was too low. |
| Regenerated the orphan report. | `docs/orphan-detection-report.md` | Records current scan output after the parser fix. |
| Added this active frontend usage audit. | `docs/architecture/frontend-functionality-usage-audit.md` | Captures the active map, unused/disconnected findings, manual review list, and validation results. |

No AppShell, router, store, or API surface was created. No active Emergency OS behavior or design language was changed.

## Manual Review List

| Area | Classification | Notes |
| --- | --- | --- |
| Old layout shell tests reading `src/layout/AppShell.jsx` | MANUAL_REVIEW | Several source-level tests still read the legacy shell file while runtime uses `src/components/AppShell.tsx`. Consolidate test ownership before deleting the old shell. |
| `FeatureManagement.jsx` docs/tests | MANUAL_REVIEW | Current route redirects to Emergency Settings. Decide whether this page is retired, test-only, or should be rebuilt as a tab inside active Emergency Settings. |
| Optional service wrappers (`boardingApi`, `emergencyCopilotApi`, `reassessmentApi`, `surgeApi`) | MANUAL_REVIEW | Import evidence says no active consumer, but existing docs describe them as guarded optional wrappers. Remove only after endpoint ownership is settled. |
| Review-only API facade exports | MANUAL_REVIEW | Simulation, federated learning, digital twin, governance safety-rule, and implementation-readiness exports are mostly review-only/test-only. Reclassify in `ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS` only in a focused API contract cleanup. |
| Broad platform route config | FUTURE_REVIEW | `CANONICAL_ROUTES` still carries many non-ED product routes. Active app redirects them, but broad orphan scans will continue to report non-ED gaps until active-vs-future route ownership is split or explicitly tagged. |

## Validation Results

| Command | Result |
| --- | --- |
| `npm run typecheck:frontend` | Passed |
| `npm run lint` | Passed |
| `npm run test:run -- src/data/orphanDetectionAudit.report.test.js` | Passed through `npm run orphan-detection:write-docs` |
| `npm run orphan-detection:write-docs` | Passed; regenerated `docs/orphan-detection-report.md` |
| `npm run test:run -- src/data/emergencyPageRenderInventory.test.js src/layout/AppShell.navigation.test.jsx src/routing/canonicalRouteRedirects.test.js src/data/backendFrontendExposure.test.js src/services/emergencyOsApi.test.js src/pages/emergency/EmergencySettings.test.jsx src/pages/emergency/EmergencyAnalytics.operationalAwareness.test.js src/components/Header.centralControl.test.tsx src/components/CopilotPanel.operationalAwareness.test.ts src/components/AppShell.r12.test.tsx src/components/EmergencyWhiteboard.storeReactivity.test.jsx` | Passed, 11 files / 59 tests |

## Residual Risk

The refreshed orphan report is useful for broad cleanup but still includes future/broad-platform route gaps because `CANONICAL_ROUTES` is wider than the active Emergency OS product. The active Emergency OS route, navigation, page-inventory, API exposure, and component tests passed, so those broad findings should not be treated as bedside workflow breakage without a separate platform-route cleanup decision.
