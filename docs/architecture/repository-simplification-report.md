# Repository Simplification Report

Date: 2026-06-14

## Scope

This pass measured duplication around the active CareDroid Emergency OS product without broad refactors. The active ownership boundary used for classification was:

- One app root and route renderer: `src/App.jsx`
- One active AppShell: `src/components/AppShell.tsx`
- One canonical route registry: `src/config/routes.config.js`
- One canonical navigation registry: `src/config/unified-navigation.config.ts`
- One command palette route registry: `src/config/commandPalette.config.js`
- One frontend Emergency OS API facade: `src/services/emergencyOsApi.js`
- One frontend Emergency OS state model: `src/store/emergencyStore.ts`
- One frontend Emergency OS domain model: `src/types/emergency.ts`
- One active backend Emergency OS module: `backend/src/modules/emergency-os/*`

Existing dirty-tree changes were preserved. No active state, event, alert, freshness, whiteboard, or operational metrics refactors were attempted because those areas may be under concurrent reconciliation.

## Measurement Methodology

Discovery used targeted source searches and import checks across the active Emergency OS surface:

- File discovery for Emergency OS pages, components, stores, services, config, backend module files, docs, and `_review`/archive locations.
- Import and reference searches for `useEmergencyStore`, `emergency-store`, `emergencyOsApi`, `emergencyTransportApi`, route registries, navigation registries, command palette registries, role permissions, and review shims.
- Backend route/controller scan for Nest controllers and HTTP decorators under `backend/src/modules/emergency-os`.
- Type scan for `src/types/emergency.ts` and `backend/src/modules/emergency-os/emergency-os.types.ts`.
- Review of prior architecture reports to avoid redoing or undoing earlier cleanup decisions.

## Summary Measurements

| Surface | Measurement | Canonical owner | Result |
| --- | ---: | --- | --- |
| Active Emergency OS React page routes | 15 | `src/App.jsx` + `CANONICAL_APP_ROUTE_TREE` | ACTIVE_CANONICAL |
| Legacy Emergency OS redirects | 77 | `LEGACY_EMERGENCY_ROUTE_REDIRECTS` | LEGACY_COMPAT |
| Non-ED workspace redirects | 21 | `NON_ED_WORKSPACE_REDIRECT_ROUTES` | LEGACY_COMPAT |
| Workspace Emergency subpage aliases | 31 | `WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS` | LEGACY_COMPAT |
| Backend active Emergency OS controller | 1 controller, 33 route handlers | `EmergencyOsController` | ACTIVE_CANONICAL |
| Backend research controllers mounted in Emergency OS module | 5 controllers | `emergency-os.research.controller.ts` | FUTURE_REVIEW |
| Frontend Emergency OS type file | 1 | `src/types/emergency.ts` | ACTIVE_CANONICAL |
| Backend Emergency OS DTO/type file | 1 | `backend/src/modules/emergency-os/emergency-os.types.ts` | ACTIVE_CANONICAL backend contract |
| Frontend Emergency OS service-like files | 29 files matched `src/services/*emergency*.js` | `emergencyOsApi.js` for API facade | Mixed classifications below |
| Existing review archive files | 9 under `src/features/future-modules/_review` | `_review` | FUTURE_REVIEW |
| Archive folder | 1 README under `archive/_review` | `archive/_review` | Available but unused this pass |

## Duplicate Files Inventory

| File or group | Classification | Decision |
| --- | --- | --- |
| `src/pages/emergency/pulse/index.tsx` and `src/pages/emergency/pulse/DepartmentPulse.css` | ACTIVE_CANONICAL | Active `/emergency/pulse` route implementation retained. |
| `src/pages/emergency/DepartmentPulse.jsx` | DUPLICATE_SAFE_TO_REMOVE | Deleted. It only re-exported the reviewed legacy pulse page and had no active imports. |
| `src/pages/emergency/DepartmentPulse.css` | DUPLICATE_SAFE_TO_REMOVE | Deleted. It only imported the reviewed legacy pulse CSS and had no active imports. |
| `src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx` and `.css` | FUTURE_REVIEW | Retained in existing review archive. |
| `src/pages/emergency/shift/index.tsx`, `shiftSummaryData.ts`, and `ShiftSummary.css` | ACTIVE_CANONICAL | Active `/emergency/shift` route retained. |
| `src/components/ShiftSummary.jsx` and `src/components/ShiftSummary.css` | LEGACY_COMPAT | Retained because `src/features/future-modules/_review/pages/WorkspaceHome.jsx` imports the shim and tests still cover the legacy workspace surface. |
| `src/features/future-modules/_review/components/ShiftSummary.jsx` and `.css` | FUTURE_REVIEW | Already archived under the accepted review path. |
| `src/components/QuickCommandLauncher.jsx` and CSS shim | LEGACY_COMPAT / MANUAL_REVIEW | Retained because tests and responsive/UX audits read the root shim. |
| `src/features/future-modules/_review/components/QuickCommandLauncher.jsx` and `.css` | FUTURE_REVIEW | Already archived under the accepted review path. |
| `src/pages/WorkspaceHome.jsx` and CSS shim | LEGACY_COMPAT / MANUAL_REVIEW | Retained because `src/pages/WorkspaceHome.test.jsx` still imports the root page shim. |
| `frontend/src/store/emergency-store.ts` | LEGACY_COMPAT | Retained as a thin re-export to `src/store/emergencyStore.ts` for the secondary `frontend/` wrapper. |
| `src/store/emergency-store.ts` | LEGACY_COMPAT | Retained as a tested compatibility shim over `src/store/emergencyStore.ts`. |
| `src\\services\\emergencyTransportApi.js` duplicate-looking glob output | ACTIVE_CANONICAL path rendering artifact | Same Windows path as `src/services/emergencyTransportApi.js`; no separate file was proven. |

## Duplicate Services Inventory

| Surface | Classification | Decision |
| --- | --- | --- |
| `src/services/emergencyOsApi.js` | ACTIVE_CANONICAL | Active frontend Emergency OS API facade for `/api/emergency/*`. |
| `src/services/emergencyTransportApi.js` | DO_NOT_TOUCH_ACTIVE_WORK | Retained. It is actively used by `EMSPipeline` and `ReferralPanel`, including the recent `/api/emergency/referrals` POST fix. |
| `src/services/emergencySettingsApi.js` | LEGACY_COMPAT | Retained as a settings wrapper over `emergencyOsApi.js`; active settings tests cover it. |
| `src/services/emergencyGovernanceApi.js` | MANUAL_REVIEW | Duplicates governance fetches also present in `emergencyOsApi.js`, but tests still target the separate client. |
| `src/services/emergencyAnalyticsApi.js` and `src/services/emergencyStaffingApi.js` | MANUAL_REVIEW | Separate operational/reporting API clients; not consolidated because analytics/settings are active direct routes and concurrent operational metrics work may touch them. |
| `src/services/emergencyWhiteboardService.js`, `queueIntelligenceService.js`, `emergencyCapacityIntelligenceService.js`, `emergencyOperatingSystemService.js`, `emergencyFlowEngineService.js`, `emergencyPatientPathService.js` | FUTURE_REVIEW / MANUAL_REVIEW | Demo/service-layer duplicates of active store/API/backend behavior. Retained because tests, inventories, and workspace data pipeline still import them. |
| `src/services/CapacityIntelligence.js`, `PatientJourneyEngine.js`, `ReassessmentEngine.js` | MANUAL_REVIEW | Older engines overlap with `src/engine/*` and active store selectors. Retained because tests still target them. |
| `backend/src/modules/emergency-os/emergency-os.services.ts` | ACTIVE_CANONICAL | Active Nest Emergency OS service aggregation. |
| `backend/src/modules/emergency-os/emergency-os.advanced-services.ts` and `emergency-os.upgrade-harness.service.ts` | FUTURE_REVIEW / DO_NOT_TOUCH_ACTIVE_WORK | Retained because active routes still expose upgrade/simulation/federated/digital-twin endpoints and other workers may be reviewing metrics/state. |
| `backend/src/modules/emergency-os/emergency-os.research.controller.ts` | FUTURE_REVIEW | Mounted research endpoints outside the active frontend route spine. Not moved because it is registered in `EmergencyOsModule`. |

## Duplicate Configs Inventory

| Surface | Classification | Decision |
| --- | --- | --- |
| `src/config/routes.config.js` | ACTIVE_CANONICAL | Retained as route and alias registry. |
| `src/App.jsx` route declarations | ACTIVE_CANONICAL renderer | Retained as React Router rendering surface; not treated as a competing registry. |
| `src/config/unified-navigation.config.ts` | ACTIVE_CANONICAL | Retained as canonical navigation source. |
| `src/config/navigation.config.js` | LEGACY_COMPAT | Retained as a projection derived from unified navigation; many tests/data files still import it. |
| `src/navigation/primaryNavigation.js` | LEGACY_COMPAT | Retained as a re-export of `navigation.config.js`. |
| `src/config/commandPalette.config.js` | ACTIVE_CANONICAL | Retained as route command registry. |
| `src/components/ChatInterface.jsx` in-chat command list | MANUAL_REVIEW | Separate chat action surface; not changed because it is not the global command palette and may have chat-specific behavior. |
| `src/config/emergencyRolePermissions.js` | ACTIVE_CANONICAL | Retained as Emergency OS role/route/action permission registry. |
| `src/utils/emergencyRolePermissions.js` | LEGACY_COMPAT / MANUAL_REVIEW | Older user/staff role helper used by legacy `src/layout/AppShell.jsx` and staff utilities. Not merged during dirty-tree pass. |
| `src/config/emergencySettings.config.js` and backend settings DTOs | MANUAL_REVIEW | Similar settings concepts across frontend defaults and backend contract. Retained because settings route and tests are active. |

## Duplicate Types Inventory

| Surface | Classification | Decision |
| --- | --- | --- |
| `src/types/emergency.ts` | ACTIVE_CANONICAL | Active frontend Emergency OS domain model retained. |
| `backend/src/modules/emergency-os/emergency-os.types.ts` | ACTIVE_CANONICAL backend contract | Retained as backend response/DTO contract. It duplicates names such as `EmergencyPatient`, `JourneyEvent`, `CapacitySnapshot`, and alert/workflow types, but serves Nest response typing. |
| `PatientState` / `EmergencyPatientState`, `Priority` / `EmergencyPriority`, `CapacitySnapshot`, `WorkflowActionLog`, `EmergencyAlert` across frontend and backend | MANUAL_REVIEW | Type sharing would be larger cross-package work; no local safe consolidation. |
| `EmsUnit` and `EMSUnit` in `src/types/emergency.ts` | MANUAL_REVIEW | Similar concepts with different shapes. Left for domain-model reconciliation rather than changed during this pass. |
| `Alert` model plus workflow/escalation event string unions | DO_NOT_TOUCH_ACTIVE_WORK | Active alert/escalation model may be under concurrent reconciliation. No edits made. |

## Duplicate Routes Inventory

| Surface | Classification | Decision |
| --- | --- | --- |
| `/emergency/whiteboard`, `/patients`, `/ems`, `/intake`, `/queues`, `/reassessment`, `/capacity`, `/boarding`, `/referrals`, `/copilot`, `/tools`, `/pulse`, `/shift`, `/analytics`, `/settings` | ACTIVE_CANONICAL | Retained as the active Emergency OS route set. |
| Legacy Emergency OS aliases in `LEGACY_EMERGENCY_ROUTE_REDIRECTS` | LEGACY_COMPAT | Retained because route tests assert redirect behavior and old entry points are intentionally redirected into Emergency OS. |
| Tool/calculator/scores aliases in `App.jsx` and `routes.config.js` | LEGACY_COMPAT | Retained; all redirect to `/emergency/tools`. |
| Non-ED workspace redirects | LEGACY_COMPAT | Retained to keep one active Emergency OS product while redirecting old product surfaces. |
| Backend `EmergencyOsController` under `/api/emergency/*` | ACTIVE_CANONICAL | Retained as active backend facade. |
| Backend research controllers under `/handover`, `/ems/federated`, `/federated/lmecs`, `/ems/ai-call-interrogation`, `/emergency/digital-twin/organizational` | FUTURE_REVIEW | Documented as research/future endpoints mounted in the same module, but not moved because Nest module registration is active. |
| `backend/src/modules/governance/governance.module.ts` controller under `/api/emergency/governance` | MANUAL_REVIEW | Shares Emergency path prefix but is outside `emergency-os`; not changed. |

## Safe Consolidations Applied

Removed two disconnected duplicate shims:

- Deleted `src/pages/emergency/DepartmentPulse.jsx`
- Deleted `src/pages/emergency/DepartmentPulse.css`

Why this was safe:

- Active `/emergency/pulse` imports `src/pages/emergency/pulse/index.tsx`.
- `src/pages/emergency/DepartmentPulse.test.jsx` imports `./pulse`, not the deleted wrapper.
- The reviewed legacy implementation remains under `src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx`.
- A focused search found no active import of the deleted root wrapper or root CSS shim.

## Archives Applied

No files were moved into `src/features/future-modules/_review/` or `archive/_review/` during this pass. The only uncertain-looking candidates were already in `_review` or still had active tests/imports. The disconnected Department Pulse shim pair was certain enough to remove rather than archive.

## Left For Manual Review

- Migrate or retire `src/pages/WorkspaceHome.jsx`, `src/components/QuickCommandLauncher.jsx`, and `src/components/ShiftSummary.jsx` root shims after tests and legacy workspace consumers stop importing them.
- Decide whether `src/config/navigation.config.js` should remain a long-term projection or whether consumers can move directly to `unified-navigation.config.ts`.
- Decide whether `src/navigation/primaryNavigation.js` can be removed after data/test consumers move to canonical navigation.
- Reconcile `src/services/emergencyGovernanceApi.js`, `emergencySettingsApi.js`, `emergencyAnalyticsApi.js`, and `emergencyTransportApi.js` with `emergencyOsApi.js` only after active API ownership is stable.
- Reconcile frontend/backend Emergency OS types through a shared contract package or generated types rather than ad hoc merging.
- Review research controllers in `emergency-os.research.controller.ts` for a future module boundary. They are not active frontend routes, but they are registered in the backend module.
- Review old demo/intelligence services under `src/services/*Intelligence*`, `*OperatingSystem*`, and older engine files after concurrent operational state, event, alert, freshness, and metrics work completes.

## Validation

Focused validation after the safe deletion:

- `npx eslint "src/pages/emergency/pulse/index.tsx" "src/config/routes.config.js" "src/config/unified-navigation.config.ts" "src/config/commandPalette.config.js" "src/store/emergency-store.ts"`: passed.
- `npm run typecheck:frontend`: passed.
- `npm run test:run -- src/pages/emergency/DepartmentPulse.test.jsx src/routing/canonicalRouteRedirects.test.js src/layout/AppShell.navigation.test.jsx src/store/emergency-store.test.ts`: passed, 4 files and 17 tests.
- IDE lint check for touched active files and this report: no linter errors found.
