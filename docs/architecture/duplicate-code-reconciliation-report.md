# Duplicate Code Reconciliation Report

## Frontend Duplicates

| Duplicate surface | Active owner | Duplicate/projection | Classification | Fix/status |
|---|---|---|---|---|
| AppShell/layout | `src/components/AppShell.tsx` | `src/layout/AppShell.jsx` | legacy / duplicated / needs manual review | Broken imports fixed; legacy file retained for tests/read-source checks. |
| Navigation | `src/config/unified-navigation.config.ts` | `src/config/navigation.config.js` | active projection | Projection preserved because tests and command palette/sidebar rely on it. |
| Store | `src/store/emergencyStore.ts` | `src/store/emergency-store.ts` | compatibility alias | Active `StaffWorkloadPanel` now imports canonical store. Alias retained for compatibility tests. |
| Whiteboard component path | `src/pages/emergency/index.tsx` | `src/components/EmergencyWhiteboard.jsx` | compatibility re-export | Retained because active router imports the compatibility path and tests depend on it. |
| API clients | `src/services/emergencyOsApi.js` | `smartIntakeApi.js`, `emergencyTransportApi.js`, `emergencyAnalyticsApi.js`, `surgeApi.js`, `emergencyCopilotApi.js` | mixed: legacy, optional runtime, future/manual review | Active canonical Emergency OS flows stay on `emergencyOsApi`; optional runtime clients documented for later split/removal. |
| Page folders | `src/pages/emergency/**` active routes | `pulse`, `shift`, review pages | future module / needs manual review | Not moved during dirty-tree pass. |
| Context/providers | app-wide contexts | none proven duplicate | active or unrelated | No context/provider removal performed. |

## Backend Duplicates

| Duplicate surface | Active owner | Duplicate/projection | Classification | Fix/status |
|---|---|---|---|---|
| Emergency OS services | `backend/src/modules/emergency-os/emergency-os.services.ts` via Nest DI | `backend/src/services/*` singleton exports | active + optional runtime duplicate | Active Nest module preserved; singleton runtime documented because `main.ts` and health routes still import registry. |
| Emergency OS routes | `backend/src/modules/emergency-os/emergency-os.controller.ts` | `backend/src/api/routes-registry` optional Mongoose runtime and platform systems routes | active + optional/legacy | No route remounting; optional runtime remains feature-gated by environment. |
| Patient persistence model | `backend/src/models/unified-patient.model.ts` | `backend/src/models/Patient.ts` | compatibility alias | Alias already re-exports unified model; no extra model introduced. |
| Typed fixture model | `backend/src/modules/emergency-os/emergency-os.types.ts` | Mongoose `unified-patient.model.ts` | separate active contracts | Fixture/DTO contract is for Nest Emergency OS response shape; Mongoose model is optional persistence runtime. |
| Scheduler | `backend/src/scheduler/reassessment.scheduler.ts` | frontend reassessment/capacity engines | optional runtime / separate layer | No new scheduler registered; existing scheduler remains gated in Mongoose runtime. |
| Research/advanced controllers | `emergency-os.research.controller.ts`, `advanced-services.ts` | active Emergency OS module services | future module | Documented, not mounted into frontend. |

## Multiple Service Instances

Discovered singleton exports include `emsService`, `reassessmentService`, `capacityService`, `boardingService`, `smartIntakeService`, `copilotService`, and others under `backend/src/services/*.ts`. The active Nest Emergency OS module uses DI services from `backend/src/modules/emergency-os/*`. The singleton registry is still imported by:

- `backend/src/main.ts`
- `backend/src/api/health.routes.ts`
- `backend/src/index.ts`
- `backend/src/services/index.ts`
- `backend/src/services/service-registry.spec.ts`

Because these are still registered surfaces, no singleton files were deleted.

## Duplicate Models/Schemas

`backend/src/models/Patient.ts` is a compatibility alias that re-exports `UnifiedPatient` and related types from `backend/src/models/unified-patient.model.ts`. No new unified model was created.

`backend/src/modules/emergency-os/emergency-os.types.ts` remains the typed fixture/DTO contract for the active Nest Emergency OS controller. It is not merged into the Mongoose model because the current active controller is fixture-backed and the persistence runtime is optional.

## Circular Dependency Check

No new circular dependency tool was installed. Static search did not identify an obvious new circular import introduced by this pass. A full cycle scan with `madge` or equivalent remains recommended but was not run because it is not installed in project scripts.

## Fixes Applied

- Fixed broken import paths in the legacy layout compatibility file.
- Removed active usage of the store compatibility alias in `StaffWorkloadPanel`.

## Manual Review Remaining

- Decide whether `src/layout/AppShell.jsx` can be archived after tests/reports stop reading it.
- Decide whether optional backend singleton runtime should be moved into a dedicated legacy/research module or retained as the Mongoose runtime.
- Decide whether optional API clients should be renamed/split as future-runtime clients after endpoint ownership is clarified.
