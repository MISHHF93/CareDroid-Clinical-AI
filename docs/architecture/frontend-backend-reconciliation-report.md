# Frontend Backend Reconciliation Report

## Active Structure Discovered

The prompt references `/frontend/src`, but the active harmonized application in this repository is the root Vite app under `src/`.

Active frontend spine:

- Entry: `src/main.jsx`
- Router: `src/App.jsx`
- Active AppShell: `src/components/AppShell.tsx`
- Active navigation source: `src/config/unified-navigation.config.ts`
- Navigation projection: `src/config/navigation.config.js`
- Emergency route inventory: `src/data/emergencyPageRenderInventory.js`
- Active store/domain model: `src/store/emergencyStore.ts` and `src/types/emergency.ts`
- Canonical Emergency OS API facade: `src/services/emergencyOsApi.js`

Active backend spine:

- Nest root module: `backend/src/app.module.ts`
- Active Emergency OS module: `backend/src/modules/emergency-os/emergency-os.module.ts`
- Active Emergency OS controller: `backend/src/modules/emergency-os/emergency-os.controller.ts`
- Active module services/types/fixtures: `backend/src/modules/emergency-os/emergency-os.services.ts`, `emergency-os.types.ts`, `emergency-os.fixtures.ts`
- Advanced/research services remain module-local or research-only.

## Discovery Coverage

Backend discovery included:

- `backend/src/services/*.ts` singleton-style services
- Nest module-local services/controllers under `backend/src/modules/**`
- Models/entities/DTO/schema files under `backend/src/**`
- Scheduler files under `backend/src/scheduler/**`
- Route registries under `backend/src/api/**`
- Emergency OS controller/module/service contracts

Frontend discovery included:

- Active routes and route config
- Active and legacy AppShell/layout files
- Header/sidebar/navigation/command palette projections
- Pages under `src/pages/emergency/**`
- Components, hooks, stores, contexts/providers, API clients
- Compatibility re-exports and legacy services

## Classification Summary

| Area | Classification | Finding | Action |
|---|---|---|---|
| `src/App.jsx` route surface | active and correctly used | Single active React Router tree for Emergency OS. | Preserved. |
| `src/components/AppShell.tsx` | active and correctly used | Active shell mounted by `RootLayout`. | Preserved. |
| `src/layout/AppShell.jsx` | legacy / duplicated / needs manual review | Legacy shell still read/imported by tests for compatibility projections. | Fixed broken imports; did not activate or delete. |
| `src/config/unified-navigation.config.ts` | active and correctly used | Source navigation model. | Preserved. |
| `src/config/navigation.config.js` | active projection | Compatibility projection from unified navigation. | Preserved; not treated as duplicate to delete. |
| `src/store/emergencyStore.ts` | active and correctly used | Active Zustand domain store. | Preserved. |
| `src/store/emergency-store.ts` | legacy compatibility alias | Re-export shim with initial-state helper for tests/compat. | Removed active component usage; retained. |
| `src/services/emergencyOsApi.js` | active and correctly used | Canonical Emergency OS facade. | Preserved. |
| `smartIntakeApi`, `surgeApi`, `emergencyCopilotApi`, `emergencyTransportApi`, `emergencyAnalyticsApi` | future/legacy/manual review | Optional runtime or older endpoint clients. | Not deleted; documented. |
| `backend/src/modules/emergency-os/*` | active and correctly used | Canonical Nest Emergency OS module. | Preserved. |
| `backend/src/services/service-registry.ts` and singleton service exports | legacy / optional runtime / needs manual review | Used by optional Mongoose Emergency OS runtime and health routes. | Not deleted; documented. |
| `backend/src/models/Patient.ts` | compatibility alias | Re-exports `unified-patient.model`. | Preserved. |
| `backend/src/models/unified-patient.model.ts` | active optional persistence model | Mongoose model for optional runtime. | Preserved. |
| `backend/src/scheduler/reassessment.scheduler.ts` | optional runtime scheduler | Started only when `enableMongooseEmergencyOs` runtime is enabled. | Preserved; no new scheduler created. |

## Workflow Chain Verification

Active Emergency OS workflows still follow:

Route -> Page -> AppShell -> Component -> Hook/Store -> API Client -> Backend Endpoint -> Controller -> Service -> Fixture/typed contract -> Response -> Rendered UI.

Key active chains:

- `/emergency/whiteboard` -> `EmergencyWhiteboard` re-export -> `src/pages/emergency/index.tsx` -> `useEmergencyWhiteboard` -> `emergencyOsApi` -> `GET /api/emergency/whiteboard` -> `EmergencyWhiteboardService`.
- `/emergency/ems` -> `EMSPipeline` -> `useEMSIntake` -> `GET /api/emergency/ems` -> `EMSIntakeService`.
- `/emergency/intake` -> `SmartIntake` -> `fetchSmartIntake` / `runSmartIntakeVerticalSlice` -> `SmartIntakeService`.
- `/emergency/referrals` -> `ReferralPanel` -> `useReferrals` -> `GET /api/emergency/referrals` -> `ReferralService`.
- `/emergency/analytics` -> `EmergencyAnalytics` / store loader -> `GET /api/emergency/analytics` -> `EmergencyAnalyticsService`.
- `/emergency/settings` -> `EmergencySettings` -> settings wrapper -> canonical `GET/PATCH /api/emergency/settings` -> `EmergencySettingsService`.

## Fixes Applied

- Corrected stale `../../` import paths in legacy `src/layout/AppShell.jsx` so compatibility tests importing `buildSidebarItems` resolve the current `src/` modules.
- Updated `src/components/StaffWorkloadPanel.tsx` to import the active store directly from `src/store/emergencyStore.ts`.
- Updated `src/components/StaffWorkloadPanel.test.tsx` mock path to match the canonical store import.

## No Deletions Or Archives

No files were deleted or archived in this pass. Several discovered duplicates are still referenced by tests, optional runtime paths, or documentation and are therefore classified as `needs manual review`.
