# Domain Model Unification

## Discovery Method

This pass searched frontend, backend, library, fixture, service, store, context, config, and test surfaces for domain definitions related to Patient, Encounter, EMS Case, Referral, Queue Item, Reassessment, Capacity Status, Boarding Status, Alert, User, Role, and Tenant.

Primary searches covered:

- Type/model definitions: `interface|type|class|enum|schema|const` names containing the requested domains across `src`, `backend/src`, `lib`, `engine`, `store`, and `config`.
- Focus areas: `src/types/emergency.ts`, `src/store/emergencyStore.ts`, `src/store/emergency-store.ts`, `frontend/src/store/emergency-store.ts`, `src/data/edScenarioFixtures.js`, `src/data/firstCustomerDemoMode.js`, `src/services/*`, `src/central-node/*`, `src/contexts/*User*`, `src/contexts/*Tenant*`, `src/config/emergencyRolePermissions.js`, `backend/src/modules/emergency-os/*`, `backend/src/models/unified-patient.model.ts`, and backend entity/DTO/type files.
- Consumer checks for `EmergencyEncounter`, `EMSArrival`, `EmsIncomingPatient`, `EmergencyBoardingPatient`, `EmergencyQueueSummary`, `UserRole`, `RolePermissions`, `TenantContext`, `organizationId`, and `workspaceId`.

## Canonical Model Registry

| Domain model | Classification | Canonical source | Notes |
| --- | --- | --- | --- |
| Patient | CANONICAL_MODEL | `src/types/emergency.ts` `Patient` | Frontend Emergency OS operational patient. Includes journey, flags, vitals, EMS linkage, referral, reassessment reminders, and current ED state. |
| Patient persistence record | BACKEND_DTO_BOUNDARY | `backend/src/models/unified-patient.model.ts` `IUnifiedPatient` / `UnifiedPatient` | Rich persisted backend patient with identifiers, clinical history, EMS lifecycle, reassessment, boarding, AI, and safety fields. Do not collapse into frontend `Patient` without a contract migration. |
| Backend Emergency OS patient DTO | BACKEND_DTO_BOUNDARY | `backend/src/modules/emergency-os/emergency-os.types.ts` `EmergencyPatient` | Narrow fixture/API DTO used by the backend Emergency OS module. It intentionally differs from the frontend type while the endpoint envelope remains fixture-backed. |
| Encounter | CANONICAL_MODEL | `src/types/emergency.ts` `Encounter` | Added as the frontend canonical encounter model matching the existing Smart Intake/backend encounter envelope shape, with extensible status/source for future channels. |
| Backend Smart Intake encounter DTO | BACKEND_DTO_BOUNDARY | `backend/src/modules/emergency-os/emergency-os.types.ts` `EmergencyEncounter` | Narrow `created`/`active`, `smart-intake` DTO. It maps cleanly to frontend `Encounter` but remains a backend boundary. |
| EMS Case | CANONICAL_MODEL | `src/types/emergency.ts` `EMSArrival` / `EMSCase` alias | `EMSArrival` is the active operational model; `EMSCase` now names it explicitly for domain registry consumers. |
| Backend EMS alert | LEGACY_COMPAT | `backend/src/services/ems.service.ts` `EMSAlert` | Legacy/persistent prehospital service using snake_case and `UnifiedPatient`; not rewritten due backend persistence risk. |
| Referral | CANONICAL_MODEL | `src/types/emergency.ts` `Referral` | Frontend operational referral model with status, target department, urgency, workflow, clinical summary, and timestamps. |
| Backend referral payloads | BACKEND_DTO_BOUNDARY | `backend/src/modules/emergency-os/emergency-os.services.ts` `ReferralService` | Returns mixed generated referral rows and created records. Frontend store normalizes into `Referral`. |
| Queue Item | CANONICAL_MODEL | `src/types/emergency.ts` `QueueItem` / `Queue` and `QueueSummary` | `Queue` remains the canonical full queue row; `QueueSummary` covers backend/fixture queue metric rows. |
| Reassessment | CANONICAL_MODEL | `src/types/emergency.ts` `ReassessmentReminder`, `ReassessmentQueueItem`, `VitalsAlert` | Frontend reassessment is represented as scheduled reminders plus queue rows and vitals alerts. |
| Backend reassessment service | BACKEND_DTO_BOUNDARY | `backend/src/services/reassessment.service.ts` | Persistent backend uses DPS score and `UnifiedPatient` snake_case fields; document as boundary. |
| Capacity Status | CANONICAL_MODEL | `src/types/emergency.ts` `CapacitySnapshot` / `CapacityStatus` alias | `CapacitySnapshot` is the Emergency OS status object used by store, central node, components, and capacity engine. |
| Capacity logic contract | ACTIVE_CONSUMER | `lib/emergency-os/logic.ts` `EmergencyOsCapacityInput` / `EmergencyOsCapacityOutput` | Shared calculator contract. Compatible with `CapacitySnapshot` but not a replacement model. |
| Boarding Status | CANONICAL_MODEL | `src/types/emergency.ts` `BoardingStatus` and `BoardingStatusSnapshot` | Frontend uses admission state plus flags operationally; explicit status/snapshot types now name the canonical domain concept. |
| Backend boarding status | CONFLICTING_MODEL | `backend/src/models/unified-patient.model.ts` `BoardingStatus` | Uses lower snake_case persisted values: `not_boarded`, `boarding`, `bed_assigned`, `transferred`. Needs mapper before any contract merge. |
| Alert | CANONICAL_MODEL | `src/types/emergency.ts` `Alert` | Frontend operational alert/escalation model with severity, type, patient/reminder linkage, dismissal, action metadata, and source. |
| Backend Emergency OS alert DTO | BACKEND_DTO_BOUNDARY | `backend/src/modules/emergency-os/emergency-os.types.ts` `EmergencyAlert` | Narrow fixture/API DTO normalized by frontend store into `Alert`. |
| Clinical alerts | PARTIAL_MODEL | `backend/src/modules/clinical-alerts/clinical-alerts.service.ts` `ClinicalAlert` | Separate clinical notification service with lower-case severity/status. Do not merge without alert/escalation contract work. |
| User | BACKEND_DTO_BOUNDARY | `backend/src/modules/users/entities/user.entity.ts` `User` | Persisted auth user entity remains backend canonical for authenticated users. Frontend `UserContext` is an open-access runtime context. |
| Frontend user context | LEGACY_COMPAT | `src/contexts/UserContext.jsx`, `src/contexts/UserIdentityContext.jsx` | Runtime JS contexts normalize open-access/demo identity and SaaS profile fields. Needs typed platform identity contract later. |
| Role | CANONICAL_MODEL | `src/config/emergencyRolePermissions.js` `EMERGENCY_ROLE_IDS` / `EMERGENCY_ROLE_DEFINITIONS` | Canonical Emergency OS operational roles and route/action permissions. |
| Backend auth roles | CONFLICTING_MODEL | `backend/src/modules/users/entities/user.entity.ts` `UserRole`, `backend/src/modules/auth/config/role-permissions.config.ts` | Backend global auth only has `physician`, `nurse`, `student`, `admin`; Emergency OS roles include charge nurse, triage nurse, ED manager, registration clerk, EMS user, and read-only viewer. Requires deliberate role mapping. |
| Tenant | BACKEND_DTO_BOUNDARY | `backend/src/modules/tenant-context/tenant-context.types.ts` `TenantContext` | Backend tenant isolation context is canonical for API boundaries. |
| Frontend tenant context | DUPLICATE_COMPAT | `src/contexts/TenantContext.jsx` `DEMO_TENANT_CONTEXT` / `normalizeTenantContext` | JS runtime adapter mirrors backend fields with demo support. Keep until typed frontend platform context is introduced. |

## Duplicate And Conflicting Definitions

| Finding | Classification | Evidence | Decision |
| --- | --- | --- | --- |
| `src/store/emergency-store.ts` and `frontend/src/store/emergency-store.ts` re-export `src/store/emergencyStore.ts` | DUPLICATE_COMPAT | Compatibility files forward the unified store and websocket hook. | Keep as compatibility shims. |
| `backend/src/modules/emergency-os/emergency-os.types.ts` duplicates `Patient`, `Alert`, `CapacitySnapshot`, and `EmergencyEncounter` shapes | BACKEND_DTO_BOUNDARY | Backend Emergency OS controller/services use those DTOs for `/api/emergency/*`. | Preserve. Frontend normalization handles differences. |
| `backend/src/models/unified-patient.model.ts` duplicates patient, EMS, reassessment, boarding, and alert fields with persisted/snake_case semantics | BACKEND_DTO_BOUNDARY / CONFLICTING_MODEL | `JourneyState`, `EMSStatus`, `BoardingStatus`, `IUnifiedPatient`, `ISafetyAlert`. | Preserve. Requires mapper before replacing API DTOs. |
| `backend/src/services/ems.service.ts` defines `EMSAlert` separate from `EMSArrival` | LEGACY_COMPAT | Uses `ems_unit_id`, `eta_minutes`, CTAS codes, and `UnifiedPatient`. | Keep as legacy/persistent prehospital boundary. |
| `backend/src/services/boarding.service.ts` defines boarding metrics over `UnifiedPatient` | BACKEND_DTO_BOUNDARY | Returns board-time benchmark metrics and `IPatient[]`. | Keep; not the frontend operational `BoardingStatusSnapshot`. |
| `backend/src/services/reassessment.service.ts` defines reassessment by DPS score | BACKEND_DTO_BOUNDARY | Uses `dps_score`, `next_reassessment_due`, `last_reassessment`. | Keep; frontend reassessment reminders are operational tasks. |
| `src/data/edScenarioFixtures.js` and `src/data/firstCustomerDemoMode.js` construct patient, queue, alert, capacity, EMS, and boarding fixture shapes | ACTIVE_CONSUMER / PARTIAL_MODEL | Fixture builders create simple and root patient shapes, queue metric rows, root flags, EMS-linked patients, and boarding/capacity data. | Keep as fixture producers. Store and scenario state normalize to canonical types where possible. |
| `src/contexts/UserContext.jsx` has frontend `Permission` and `RolePermissions` matching only some backend roles | LEGACY_COMPAT / CONFLICTING_MODEL | Frontend open-access context includes ED-specific roles; backend auth roles are narrower. | Manual review for typed identity/RBAC mapping. |
| `src/config/emergencyRolePermissions.js` defines Emergency OS role/action/route permission model | CANONICAL_MODEL | Used by AppShell/Header/Sidebar/CommandPalette and route tests. | Keep as Emergency OS canonical role model. |
| `backend/src/modules/tenant-context/tenant-context.types.ts` and `src/contexts/TenantContext.jsx` both define tenant context fields | DUPLICATE_COMPAT | Backend typed API boundary, frontend JS normalizer/demo adapter. | Keep; frontend adapter should be typed later. |

## Safe Updates Applied

- Added explicit canonical frontend domain names in `src/types/emergency.ts`:
  - `Encounter`, `EncounterStatus`, `EncounterSource`
  - `EMSCase`
  - `QueueItem`, `QueueSummary`
  - `CapacityStatus`
  - `BoardingStatus`, `BoardingStatusSnapshot`
- Updated `src/store/emergencyStore.ts` local aliases to reference canonical Emergency OS types:
  - `EmsIncomingPatient` is now `Partial<EMSArrival> & EmergencyRecord`.
  - `EmergencyBoardingPatient` is now `Partial<Patient> & EmergencyRecord` with optional canonical `BoardingStatus`.
  - `EmergencyQueueSummary` now aliases canonical `QueueSummary`.

No backend DTO, persistence schema, route, envelope, or fixture contract was rewritten in this pass.

## Backend DTO/API Boundary Notes

- `/api/emergency/*` remains backed by `backend/src/modules/emergency-os/emergency-os.types.ts` and service fixture DTOs. These are intentionally narrower than frontend operational models and should be treated as API envelopes, not the product-wide domain source of truth.
- `UnifiedPatient` is the backend persisted patient record. It carries clinical and operational state that overlaps with Emergency OS, but uses different naming, value casing, lifecycle states, and storage concerns.
- Referral service output includes generated patient-embedded rows and created flat referral rows. The frontend store `extractReferrals` remains the safe boundary mapper into `Referral`.
- Capacity calculations in `lib/emergency-os/logic.ts` are stable shared logic. Its input/output contract is a calculator boundary and should not replace `CapacitySnapshot`.
- Tenant and user/role APIs are platform-level boundaries. Emergency OS role definitions are a product-operational model and currently need explicit mapping to backend auth roles.

## Pending Parallel Work And Manual Review

| Area | Classification | Reason |
| --- | --- | --- |
| Backend/frontend patient contract migration | PENDING_PARALLEL_WORK | Active backend and state reconciliation workers may be touching patient, events, alerts, freshness, and operational metrics. |
| UnifiedPatient to Emergency OS patient mapper | MANUAL_REVIEW | Requires explicit casing/value mapping for state, EMS, boarding, alert severity, reassessment/DPS, identifiers, and persisted date fields. |
| Emergency OS role to backend `UserRole` mapping | MANUAL_REVIEW | Backend auth roles and Emergency OS operational roles are intentionally different today. |
| Frontend typed user/tenant platform context | FUTURE_REVIEW | Current contexts are JS runtime adapters with demo/open-access behavior. |
| Clinical alert service vs Emergency OS alert/escalation model | MANUAL_REVIEW | Severity/status semantics differ and may affect clinical safety. |
| Fixture root/simple patient shapes | PENDING_PARALLEL_WORK | Fixtures are broad active demo surfaces. This pass only documents and types downstream store aliases. |
| Backend legacy EMS/boarding/reassessment services | FUTURE_REVIEW | They operate on `UnifiedPatient` and may be legacy or future-module paths outside the active Emergency OS route surface. |

## Validation

Completed focused validation:

- `npm run typecheck:frontend` - passed.
- `npx eslint "src/types/emergency.ts" "src/store/emergencyStore.ts"` - passed.
- `npm run test:run -- "src/store/emergency-store.test.ts" "src/central-node/careDroidCentralNode.test.ts" "src/data/edScenarioFixtures.test.js"` - passed, 3 files / 12 tests.
