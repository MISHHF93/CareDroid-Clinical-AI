# API Surface Compression

Date: 2026-06-14

## Scope

This pass discovered API surfaces across the active CareDroid Emergency OS frontend and backend, measured duplication, and compressed safe active usage toward the canonical Nest surface:

```text
/api/emergency/*
```

No legacy controllers were deleted. The working tree is dirty and parallel workers may be editing adjacent Emergency OS state, metrics, freshness, alert, and convergence files, so broad backend removals are deferred unless a route has no active consumers and tests prove it safe.

## Discovery Method

Discovery covered:

- Frontend API clients and direct calls: `src/services/*Api.*`, `src/lib/ai/client.ts`, `src/store/emergencyStore.ts`, `src/config/api.config.js`, and API call inventories.
- Backend route owners: Nest controllers under `backend/src/modules/**`, Express route files under `backend/src/api/**`, optional Emergency OS runtime routes, and route registry files.
- Inventories and policy checks: `src/data/backendHttpRouteInventory.js`, `src/data/frontendApiCallsInventory.js`, `src/data/backendFrontendExposure.js`, `src/data/backendRouteExposurePolicy.js`, and `src/config/backendApiCapabilities.js`.
- DTO/model/schema overlap: Emergency OS backend types, platform-system inline patient/referral shapes, chat DTOs, frontend patient types, patient cards, and smart-intake models.
- Existing architecture reports: `docs/architecture/api-surface-normalization-report.md` and `docs/architecture/workflow-connectivity-report.md`.

## Measurements

Inventory counts after this pass:

| Metric | Count | Classification |
| --- | ---: | --- |
| Backend HTTP route inventory rows | 485 | MANUAL_REVIEW |
| Frontend API call inventory rows | 320 | ACTIVE_CONSUMER |
| Frontend calls with matching backend routes | 289 | ACTIVE_CONSUMER |
| Frontend calls gated or missing durable routes | 31 | GATED_UNSUPPORTED |
| Backend `/api/emergency/*` routes | 55 | CANONICAL_EMERGENCY_API |
| Frontend `/api/emergency/*` calls | 67 | CANONICAL_EMERGENCY_API |
| Optional Emergency OS runtime routes | 40 | OPTIONAL_RUNTIME |
| Exact backend method/path duplicates | 0 | CANONICAL_EMERGENCY_API |
| Legacy Emergency-concept backend routes outside `/api/emergency/*` | 23 | LEGACY_COMPAT |
| Legacy/shared frontend concept calls outside `/api/emergency/*` | 31 | LEGACY_COMPAT |

Top backend route owners:

| Controller | Route Rows | Finding |
| --- | ---: | --- |
| `PlatformSystemsController` | 123 | OVERLAPPING_CONTROLLER |
| `EmergencyOsController` | 44 | CANONICAL_EMERGENCY_API |
| `ProductCatalogController` | 27 | LEGACY_COMPAT |
| `PlatformAssetsController` | 26 | LEGACY_COMPAT |
| `SubscriptionsController` | 15 | LEGACY_COMPAT |

## Canonical Emergency OS Surface

The canonical active Emergency OS surface is:

| Workflow | Canonical Endpoint(s) | Consumer | Classification |
| --- | --- | --- | --- |
| Central node | `GET /api/emergency/central-node/snapshot` | `emergencyOsApi.js`, central node hook | CANONICAL_EMERGENCY_API |
| Whiteboard | `GET /api/emergency/whiteboard` | `emergencyOsApi.js`, whiteboard hooks/store | CANONICAL_EMERGENCY_API |
| Patients | `GET /api/emergency/patients`, `POST /api/emergency/patients` | `emergencyOsApi.js`, intake/whiteboard flows | CANONICAL_EMERGENCY_API |
| Journey | `GET /api/emergency/journey` | `emergencyOsApi.js`, patient journey panels | CANONICAL_EMERGENCY_API |
| EMS read | `GET /api/emergency/ems` | `emergencyOsApi.js`, EMS pipeline | CANONICAL_EMERGENCY_API |
| Smart intake | `GET /api/emergency/intake`, `POST /api/emergency/intake`, `POST /api/emergency/intake/vertical-slice` | `emergencyOsApi.js`, intake pages | CANONICAL_EMERGENCY_API |
| Queues | `GET /api/emergency/queues` | `emergencyOsApi.js`, queue route | CANONICAL_EMERGENCY_API |
| Reassessment | `GET /api/emergency/reassessment` | `emergencyOsApi.js`, reassessment route/drawer | CANONICAL_EMERGENCY_API |
| Capacity | `GET /api/emergency/capacity` | `emergencyOsApi.js`, capacity route | CANONICAL_EMERGENCY_API |
| Boarding | `GET /api/emergency/boarding` | `emergencyOsApi.js`, boarding route | CANONICAL_EMERGENCY_API |
| Referrals | `GET /api/emergency/referrals`, `POST /api/emergency/referrals` | `emergencyOsApi.js`, `emergencyTransportApi.js` | CANONICAL_EMERGENCY_API |
| Provincial health | `GET /api/emergency/provincial-health` | `emergencyOsApi.js`, settings runtime card | CANONICAL_EMERGENCY_API |
| Integrations hub | `GET /api/emergency/integrations` | `emergencyOsApi.js`, settings runtime card | CANONICAL_EMERGENCY_API |
| Copilot context | `GET /api/emergency/copilot` | `emergencyOsApi.js`, copilot route | CANONICAL_EMERGENCY_API |
| Copilot message | `POST /api/emergency/copilot/message` | `clinicalChatService.js`, `lib/ai/client.ts` | ACTIVE_CONSUMER |
| Intake AI | `POST /api/emergency/intake/ai/message` | `lib/ai/client.ts` | SAFE_FIX_APPLIED |
| Referral AI | `POST /api/emergency/referrals/ai/message` | `lib/ai/client.ts` | SAFE_FIX_APPLIED |
| Analytics AI | `POST /api/emergency/analytics/ai/message` | `lib/ai/client.ts` | SAFE_FIX_APPLIED |
| Workflow audit | `GET /api/emergency/workflow-logs`, `GET /api/emergency/patients/:patientId/workflow-logs` | `emergencyOsApi.js`, store/settings | CANONICAL_EMERGENCY_API |
| Analytics | `GET /api/emergency/analytics` | `emergencyOsApi.js`, analytics page | CANONICAL_EMERGENCY_API |
| Settings | `GET /api/emergency/settings`, `PATCH /api/emergency/settings` | `emergencyOsApi.js`, `emergencySettingsApi.js` | CANONICAL_EMERGENCY_API |
| Governance | `GET /api/emergency/governance/*` | `emergencyGovernanceApi.js`, `emergencyOsApi.js` | CANONICAL_EMERGENCY_API |

Review-only/demo advanced endpoints under `/api/emergency/simulation/*`, `/api/emergency/federated-learning/*`, `/api/emergency/digital-twin/*`, and `/api/emergency/upgrade-harness/*` remain visible in inventories but should not be treated as durable clinical production APIs.

## Duplication And Overlap Findings

| Finding | Evidence | Classification | Decision |
| --- | --- | --- | --- |
| Patient concepts exist under both `/api/emergency/patients` and `/api/patients*`. | `EmergencyOsController` owns the canonical envelope; `PlatformSystemsController` owns legacy patient CRUD/import/workspace/detail routes. | OVERLAPPING_CONTROLLER, OVERLAPPING_DTO | Keep active Emergency OS list/create on `/api/emergency/patients`; leave platform patient detail/import routes as legacy/manual-review because active detail panels still reference platform shell data. |
| Referrals had split read/write ownership. | Recent workflow pass moved active create to `POST /api/emergency/referrals`; legacy `POST /api/referrals` remains. | SAFE_FIX_APPLIED, LEGACY_COMPAT | Keep `/api/emergency/referrals` canonical. Do not remove `/api/referrals` until no active consumers and backend specs prove safe. |
| EMS exists as canonical read, legacy research, fleet, and optional write surfaces. | `GET /api/emergency/ems`, `/api/ems/*` research controllers, `/api/fleet/*`, optional `/api/emergency/ems/*` Express routes. | DUPLICATE_ENDPOINT, OPTIONAL_RUNTIME | Keep active read on `/api/emergency/ems`. Fleet live tracking and EMS optional writes remain manual-review because payloads are not equivalent. |
| Chat/AI had generic chat routes for Emergency OS request types despite matching Emergency AI endpoints. | `src/lib/ai/client.ts` routed intake/referral/analytics request types to `/api/chat/*`; backend exposes `/api/emergency/intake/ai/message`, `/api/emergency/referrals/ai/message`, and `/api/emergency/analytics/ai/message`. | DUPLICATE_ENDPOINT, OVERLAPPING_DTO | Compressed matching browser AI request types to `/api/emergency/*/ai/message` and added frontend inventory rows. |
| Governance has canonical Emergency OS routes, `/api/v1/governance/*` aliases, and optional Express aliases. | `EmergencyAIGovernanceController`, `AIGovernanceV1Controller`, optional `ExpressGovernanceRoutes`. | LEGACY_COMPAT, OPTIONAL_RUNTIME | Active frontend uses `/api/emergency/governance/*`; v1/Express aliases stay compatibility/manual-review. |
| Smart Intake has canonical quick-intake endpoints and optional identity-session runtime endpoints. | `POST /api/emergency/intake` and `POST /api/emergency/intake/vertical-slice`; optional `/api/emergency/intake/:sessionId/*`. | OPTIONAL_RUNTIME, GATED_UNSUPPORTED | Keep optional identity runtime gated by `emergencySmartIntakeIdentitySession=false`. |
| Surge APIs are optional but direct store calls exist. | `src/services/surgeApi.js` is capability gated; `src/store/emergencyStore.ts` directly calls `POST /api/emergency/surge/activate`. | PENDING_PARALLEL_WORK | Documented only. Large store is actively dirty and likely handled by parallel state workers. |
| Optional copilot query route has direct store call. | Optional route `POST /api/emergency/copilot/query`; `src/store/emergencyStore.ts` directly calls it. | PENDING_PARALLEL_WORK | Leave for parallel store/API convergence. Active message path is now `/api/emergency/copilot/message`. |

## DTO Overlap

| Model / Payload | Canonical Shape | Overlap | Classification |
| --- | --- | --- | --- |
| Emergency patient | `backend/src/modules/emergency-os/emergency-os.types.ts` uses `EmergencyPatient` with `flags: string[]`, `vitals: EmergencyVitals[]`, and typed journey events. | `PlatformSystemsController` inline patients use object flags, singleton vitals objects, `lastAssessedTime`, and different room/type labels; frontend `PatientCard.tsx` tolerates legacy vital names. | OVERLAPPING_DTO, MANUAL_REVIEW |
| Emergency referral | `ReferralService.createReferral()` returns an Emergency OS envelope with `referral` and refreshed `referrals`. | `PlatformSystemsController.createEmergencyReferral()` returns a raw referral object and validates against its separate patient array. | OVERLAPPING_DTO, LEGACY_COMPAT |
| Emergency AI message | `EmergencyAIMessageDto` requires `message`, `purpose`, `sourceModule`, and Emergency OS context fields. | Generic `ChatMessageDto` accepts broader chat/tool fields and no required Emergency OS purpose/source module. | OVERLAPPING_DTO, SAFE_FIX_APPLIED |
| Settings | `EmergencyOsSettingsContract` is canonical for `/api/emergency/settings`. | Tenant admin and feature flags remain separate organization/platform settings APIs. | LEGACY_COMPAT |
| Smart intake identity session | Optional Express runtime has session/document/OCR/biometric DTOs. | Canonical Nest quick intake creates `EmergencyPatient` directly. | OPTIONAL_RUNTIME, GATED_UNSUPPORTED |

## Safe Fixes Applied

1. `src/lib/ai/client.ts`
   - Added `EMERGENCY_AI_ROUTES`.
   - Routed `INTAKE_SUGGEST` and `INTAKE_SUGGESTION` to `POST /api/emergency/intake/ai/message`.
   - Routed `CLINICAL_SUMMARY` to `POST /api/emergency/referrals/ai/message`.
   - Routed `SHIFT_SUMMARY` to `POST /api/emergency/analytics/ai/message`.
   - Left generic assistant/tool request types on `/api/chat/message` where no equivalent durable Emergency OS endpoint exists.

2. `src/data/frontendApiCallsInventory.js`
   - Added frontend inventory rows for:
     - `POST /api/emergency/copilot/message`
     - `POST /api/emergency/intake/ai/message`
     - `POST /api/emergency/referrals/ai/message`
     - `POST /api/emergency/analytics/ai/message`

3. `src/lib/ai/client.test.ts`
   - Added a focused browser-routing test that pins Emergency OS AI request types to canonical Emergency OS endpoints.

## Remaining Items

| Item | Classification | Next Action |
| --- | --- | --- |
| `/api/patients*` platform routes overlap with `/api/emergency/patients`. | MANUAL_REVIEW | Decide whether patient detail/source-data/review APIs move under `/api/emergency/patients/:patientId/*` or remain platform compatibility. |
| `/api/ems/*` research and `/api/fleet/*` EMS-adjacent APIs overlap Emergency OS EMS. | MANUAL_REVIEW | Keep fleet/CAD semantics separate unless product defines a durable EMS transport model. |
| Optional Express/Mongoose Emergency OS runtime routes. | OPTIONAL_RUNTIME | Keep disabled/gated unless `ENABLE_MONGOOSE_EMERGENCY_OS` and MongoDB are explicitly configured. |
| Direct store calls to optional surge and copilot-query routes. | PENDING_PARALLEL_WORK | Let state/API convergence workers gate or replace these calls; do not touch broad dirty store in this pass. |
| `/api/v1/governance/*` and optional governance aliases. | LEGACY_COMPAT | Retain as compatibility aliases while frontend remains canonical on `/api/emergency/governance/*`. |
| Platform settings/integration/admin routes used from Emergency settings page. | LEGACY_COMPAT | Keep because `/api/emergency/integrations` is a status envelope, not a replacement for FHIR/HL7 admin endpoints. |
| Backend controller inventory versus generated source scan. | MANUAL_REVIEW | Existing route inventory tests pass; full automatic Nest route extraction remains a separate hardening task. |

## Validation

Commands run:

```powershell
npx eslint src/lib/ai/client.ts src/lib/ai/client.test.ts src/data/frontendApiCallsInventory.js
```

Result: passed with no output.

```powershell
npx vitest run src/lib/ai/client.test.ts src/data/backendFrontendExposure.test.js src/config/backendApiCapabilities.test.js src/services/emergencyOsApi.test.js; if ($LASTEXITCODE -eq 0) { npm run typecheck:frontend } else { exit $LASTEXITCODE }
```

Result:

```text
Test Files  4 passed (4)
Tests       35 passed (35)
typecheck:frontend passed
```

IDE diagnostics for touched files also reported no linter errors.

Backend controller specs were not run because this pass did not edit backend controller/service code. Full `npm run test:backend-exposure` and backend Jest can be run after parallel backend workers settle.
