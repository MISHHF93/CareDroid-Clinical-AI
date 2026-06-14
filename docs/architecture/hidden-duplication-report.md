# Hidden Duplication Report

Date: 2026-06-13

## Verdict

CareDroid is mostly one active system. The active runtime is a root Vite SPA plus a Nest backend. Hidden duplication risk comes from compatibility shims, old platform inventories, optional Express/Mongoose routes, and dormant mobile/legacy modules that are retained in the repository but are not the active Emergency OS product.

## Findings

| Area | Classification | Artifacts | Status | Safe Action |
| --- | --- | --- | --- | --- |
| Frontend app root | ACTIVE_EMERGENCY_OS | `src/main.jsx`, `src/App.jsx`, `vite.config.js` | One active Vite app. | Keep root `src` as source of truth. |
| `frontend/src` | DUPLICATE_INACTIVE | `frontend/src/store/emergency-store.ts`, `frontend/src/hooks/useEmergencyWebSocket.ts`, `frontend/src/components/SystemHealth.tsx` | Compatibility/re-export layer; no `frontend/package.json`. Active `SystemHealth` implementation was moved to `src/components/SystemHealth.tsx`. | Do not treat as a second app; retain unless importers are migrated. |
| AppShells | ACTIVE_EMERGENCY_OS + DUPLICATE_INACTIVE | `src/components/AppShell.tsx`, `src/layout/AppShell.jsx` | Runtime imports only `src/components/AppShell.tsx`; legacy shell is test/manual-review material. | Keep active shell; do not wire legacy shell back in. |
| Sidebar/Header | ACTIVE_EMERGENCY_OS | `src/components/Sidebar.tsx`, `src/components/Header.tsx` | Owned by active `AppShell`. | Keep; not duplicates. |
| Store files | ACTIVE_EMERGENCY_OS + DUPLICATE_INACTIVE | `src/store/emergencyStore.ts`, `src/store/emergency-store.ts`, `frontend/src/store/emergency-store.ts` | One real Zustand store; other files re-export it. | Keep shims until importers converge. |
| Navigation configs | ACTIVE_EMERGENCY_OS + SHARED_REQUIRED | `src/config/unified-navigation.config.ts`, `src/config/navigation.config.js`, `src/navigation/primaryNavigation.js` | Unified config owns pilot nav; JS configs are compatibility projections. | Ban new nav constants outside unified config. |
| Command palette | ACTIVE_EMERGENCY_OS + DUPLICATE_INACTIVE | `src/components/CommandPalette.tsx`, `src/components/CommandPalette.jsx` | JSX file re-exports TSX implementation. | Keep shim if older imports exist. |
| Backend API | ACTIVE_EMERGENCY_OS | `backend/src/modules/emergency-os/emergency-os.controller.ts` | Nest global prefix exposes `/api/emergency/*`. | Keep as canonical pilot API. |
| Express routes registry | NEEDS_MANUAL_REVIEW | `backend/src/api/routes-registry.ts`, `backend/src/api/*.routes.ts` | Discovery always available; routes mount only when `ENABLE_MONGOOSE_EMERGENCY_OS=true`. | Keep gated; avoid enabling for pilot unless contract-reviewed. |
| Patient/domain types | NEEDS_MANUAL_REVIEW | `backend/src/models/unified-patient.model.ts`, `backend/src/modules/emergency-os/emergency-os.types.ts`, `src/types/emergency.ts` | Different layers: Mongoose optional model, Nest DTO contract, frontend UI/store contract. | Do not delete; align through DTO/schema review later. |
| AI config | SHARED_REQUIRED | `lib/ai/config.ts`, `src/config/ai.config.ts`, `backend/src/config/ai.config.ts`, `backend/src/config/ai-governance.registry.ts` | Shared config plus frontend/backend projections. | Keep projections; ensure new AI services derive from shared config. |
| Android/mobile | FUTURE_MODULE / NEEDS_MANUAL_REVIEW | `android/`, `capacitor.config.json`, Android npm scripts | Capacitor packaging, not active web runtime. | Do not delete during web Emergency OS cleanup. |
| Platform/catalog modules | LEGACY_STILL_MOUNTED / NEEDS_MANUAL_REVIEW | Fleet, simulation, tools, platform assets, product catalog modules | Many backend modules still import in `AppModule`; frontend routes mostly redirect. | Requires product/backend retirement plan before removal. |

## Conclusion

No hidden second frontend app, second router, second active store, or second active AppShell is currently mounted. The main duplication risks are stale documentation/inventory references and optional backend route surfaces.
# Hidden Duplication Report

Date: 2026-06-13

## Duplicate-Looking Artifacts

| Finding | Classification | Why It Is Not Blindly Deleted | Safe Action |
| --- | --- | --- | --- |
| `frontend/src/store/emergency-store.ts` | DUPLICATE_INACTIVE | It re-exports the canonical root `src/store/emergencyStore.ts`; no separate `frontend/package.json` exists. | Keep as compatibility shim. |
| Root `store/emergencyStore.ts` and `store/featureStore.ts` | DUPLICATE_INACTIVE | Both re-export canonical `src/store/emergencyStore.ts`; tests still import root paths. | Keep as compatibility shims. |
| `src/layout/AppShell.jsx` versus `src/components/AppShell.tsx` | DUPLICATE_INACTIVE / NEEDS_MANUAL_REVIEW | Active router imports `src/components/AppShell.tsx`; legacy file is still imported/read by tests and helpers. | Do not archive until dependent tests/data helpers are migrated. |
| `src/config/navigation.config.js` versus `src/config/unified-navigation.config.ts` | SHARED_REQUIRED | `navigation.config.js` is a compatibility projection from unified navigation. | Keep projection; canonical source is unified navigation. |
| `src/services/emergencySettingsApi.js` versus `src/services/emergencyOsApi.js` | SHARED_REQUIRED | Settings API wraps canonical `/api/emergency/settings` and tenant/admin settings calls. | Keep; not a conflicting active API source. |
| `src/services/smartIntakeApi.js` versus `src/services/emergencyOsApi.js` | NEEDS_MANUAL_REVIEW | Smart Intake session endpoints are deeper workflow APIs under `/api/emergency/intake/*`; active create flow uses canonical facade. | Keep until Smart Intake session workflows are fully traced. |
| `backend/src/api/routes-registry.ts` versus Nest `EmergencyOsController` | DUPLICATE_INACTIVE / conditional BLOCKING_CONFLICT | Express/Mongoose routes mount only when `ENABLE_MONGOOSE_EMERGENCY_OS=true`; they may overlap active API paths when enabled. | Keep gated; require explicit owner review before enabling in pilot. |
| `backend/src/models/Patient.ts` and `backend/src/models/unified-patient.model.ts` | SHARED_REQUIRED | `Patient.ts` re-exports `UnifiedPatient`; not a second model implementation. | Keep. |
| `backend/src/models/PatientJourney.ts` | NEEDS_MANUAL_REVIEW | Journey domain model exists alongside Emergency OS in-memory timeline contracts. | Keep until persistence plan is approved. |
| Broad feature flag registry entries for fleet/IOT/simulation/governance | LEGACY_STILL_MOUNTED / FUTURE_MODULE | Registry is broader than active Emergency OS, but no duplicate IDs were found. | Keep; hide/redirect inactive UI via route surface. |
| `android` and Capacitor config | FUTURE_MODULE | Mobile package wraps root `dist`; no independent app source found. | Keep. |

## Hidden Imports

- Active `src/App.jsx` imports `src/components/AppShell.tsx`, not `src/layout/AppShell.jsx`.
- `src/featureFlagCoverage.test.jsx`, source audits, and legacy tests still read or import `src/layout/AppShell.jsx`.
- Several root-level tests import root `store/*` shims, which forward into canonical `src/store/emergencyStore.ts`.

## Duplicate API Conventions

The active frontend facade uses `/api/emergency/*`. `/api/v1/*` governance paths exist as compatibility/governance surfaces and are not the active Emergency OS API convention.

## Cleanup Decision

No duplicate-looking artifact was proven safe to remove in this dirty tree. The only safe cleanup executed was disabling destructive cleanup-script behavior and adding verification-only scripts.
