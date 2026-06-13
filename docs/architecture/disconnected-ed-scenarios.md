# Disconnected Emergency Department Scenarios

Generated: 2026-06-12

This report lists ED scenarios where meaningful source code exists, but the active chain is disconnected across frontend, store, backend service, API endpoint, fixture data, or rendered UI.

## P0 Disconnections

### 1. EMS Arrival and Offload

| Trace point | Current state |
| --- | --- |
| Scenarios | EMS arrival, EMS pre-arrival, ETA update, ambulance offload delay, transfer-of-care delay, no ED bed available |
| Frontend | `EMSPipeline`, `EMSPressureScore`, `EMSCriticalBroadcast` render active EMS flow under `/emergency/ems`. |
| Store/actions | `store/emergencyStore.ts` owns `emsArrivals`, `prepareEMSBay`, `updateEMSArrival`, `convertEMSArrivalToPatient`, checklist actions, handoff completion. |
| Backend | `backend/src/api/ems.routes.ts` and `backend/src/services/ems.service.ts` exist only inside optional Mongoose Emergency OS runtime. |
| API mismatch | Frontend active EMS UI does not hydrate from `/api/ems/incoming`; optional status route accepts UI-like statuses while service logic uses lowercase status comparisons. |
| Fixture/demo overlap | `mockEMSArrivals`, `emsPreArrivalPipelineService`, `emsOffloadCommandCenterService`, and optional Mongoose patients all model EMS differently. |
| Impact | EMS/offload is a strong demo, but not a durable pilot workflow or revenue-grade ambulance offload time source. |
| Priority | P0 |

### 2. Patient Management and External Patient Snapshot

| Trace point | Current state |
| --- | --- |
| Scenarios | medication history, allergy history, recent encounters, lab summary, FHIR-like patient snapshot, external data requires review |
| Frontend | `PatientCard` expects backend tabs; `patientManagementApi` normalizes workspace, summary, timeline, risk scores, care plan, source data, review items, privacy access log. |
| Backend | `PlatformSystemsService` has demo patient workspace/timeline/risk/care-plan contracts; interoperability summary is synthetic/demo. |
| Missing chain | No active Nest patient controller was found for `/api/patients/:patientId/workspace`, `/summary`, `/timeline`, `/risk-scores`, `/care-plan`, `/source-data`, `/review-items`, imports, or `/api/privacy/patient/:patientId/access-log`. |
| Fixture/demo overlap | Local `mockPatients`, platform demo patient workspace, Smart Intake demo extracted data, optional Mongoose `Patient`. |
| Impact | Critical clinical context panes can show partial/error/demo states but cannot support a pilot needing medication/allergy/lab history. |
| Priority | P0 |

### 3. Operational KPI Chain

| Trace point | Current state |
| --- | --- |
| Scenarios | wait to triage, wait to provider, ED length of stay, ambulance offload time, boarding time, LWBS rate, discharge turnaround, reassessment completion rate |
| Frontend | `EmergencyAnalytics` renders daily volume, hourly arrivals, average wait trend, top complaints from local fallback. EMS and capacity routes render some local durations. |
| Service | `emergencyAnalyticsApi` computes local fallback; `emergencyKpiLayerService` models buyer KPIs from demo services. |
| Backend | `/api/emergency/analytics`, `/api/emergency/capacity/history`, `/api/emergency/queues/analytics`, and shift export are marked disabled in `backendApiCapabilities`. |
| Missing chain | No canonical backend event model for arrival, triage, provider start, offload start/end, bed request, bed assigned, discharge ready, discharge complete, LWBS, reassessment completed. |
| Impact | Revenue-critical KPI claims are not backed by durable source-of-truth data. |
| Priority | P0 |

### 4. Smart Intake Runtime Guard

| Trace point | Current state |
| --- | --- |
| Scenarios | unknown patient, duplicate patient, returning patient, identity conflict, OCR extraction error |
| Frontend | `/emergency/intake` renders `SmartIntake`, fixture candidates/conflicts, and local patient creation/link/unknown actions. |
| Backend | `smart-intake.routes.ts`, `smart-intake.service.ts`, `SmartIntakeSession`, `mpi.service.ts`, `ocr.service.ts` implement sessions, OCR results, matching, duplicate warnings, unknown continuation, and reconciliation. |
| API guard | `smartIntakeApi` throws before POST because `emergencySmartIntake` is disabled in `backendApiCapabilities`. |
| Runtime gate | Backend routes mount only when `ENABLE_MONGOOSE_EMERGENCY_OS=true` and MongoDB URI is configured. |
| Impact | The user sees a polished identity review UI, but backend audit/reconciliation is not active in default runtime. |
| Priority | P1, P0 if identity workflow is required for pilot. |

## P1 Disconnections

### 5. Referral Status Persistence

| Trace point | Current state |
| --- | --- |
| Scenarios | cardiology, neurology, psychiatry, internal medicine, surgery referrals; accepted/delayed/closed statuses |
| Frontend | `ReferralPanel` renders queue, create form, status groups, elapsed times, and status buttons. |
| Store/actions | `createReferral` and `updateReferralStatus` update local store and alerts. |
| Backend | `PlatformSystemsController` exposes `GET /api/referrals` and `POST /api/referrals` as in-memory platform data. |
| Missing chain | No stable PATCH status endpoint; `emergencyTransferWorkflow` and referral history endpoints are disabled. Store does not hydrate active referrals from backend list. |
| Impact | Create may sync, but accepted/delayed/closed statuses are not durable. |
| Priority | P1 |

### 6. Reassessment Backend vs Local Safety Queue

| Trace point | Current state |
| --- | --- |
| Scenarios | triage reassessment, reassessment overdue alert, reassessment queue, reassessment completion |
| Frontend | `/emergency/reassessment`, patient card reminders, alerts. |
| Store/actions | Local reminders, snooze, complete, flags, alerts. |
| Backend | Optional `GET /api/reassessment/due`, `POST /api/reassessment/:patientId/reassess`, dismiss routes exist under Mongoose runtime. |
| Missing chain | Active frontend reassessment route does not use optional reassessment API; no completion-rate KPI. |
| Impact | Safety queue demos well, but cannot support audited reassessment compliance reporting. |
| Priority | P0 for reporting/compliance, P1 for demo. |

### 7. Capacity and Boarding Multiple Sources

| Trace point | Current state |
| --- | --- |
| Scenarios | capacity color bands, boarding risk, bed request pending, boarding escalation alert |
| Frontend | `/emergency/capacity`, `/emergency/boarding` render local capacity/boarding state. |
| Store/engine | `computeCapacity` in store and `engine/capacityEngine.ts` both compute capacity. |
| Backend | Optional `GET /api/capacity/dashboard` computes Mongoose counts. |
| Demo services | `emergencyCapacityIntelligenceService` and `boardingIntelligenceEngine` provide separate demo models. |
| Missing chain | No canonical bed request, bed assigned, inpatient bed, or boarding escalation backend event model. |
| Impact | Several capacity/boarding numbers can disagree depending on source. |
| Priority | P1 |

### 8. Clinical Workflow Launchers vs Full Workflows

| Trace point | Current state |
| --- | --- |
| Scenarios | chest pain, sepsis, stroke, trauma, respiratory distress, abdominal pain, mental health crisis, falls/frailty |
| Frontend | `ClinicalCalculatorHub`, `PatientCard`, `ProtocolSuggestion`, `EMSCriticalBroadcast` render calculators, protocols, and EMS checklists. |
| Backend | Some clinical intelligence endpoints exist, but ED workflow state machines do not. |
| Fixture/demo | `emergencyOperatingSystem.js` has protocol cards and workflow metadata. |
| Missing chain | No workflow-specific ED care path state model for abdominal pain, mental health crisis, falls/frailty, trauma beyond checklist/calculators. |
| Impact | Good launchpad, not full operational workflow coverage. |
| Priority | P1-P2 depending on pilot scope. |

## P2/P3 Placeholders and Future Modules

| Scenario | Current evidence | Classification | Priority |
| --- | --- | --- | --- |
| mass casualty placeholder | `emergencySimulationScenariosService` has `mass-casualty` training scenario. | FUTURE_MODULE | P2 |
| seasonal respiratory surge | Respiratory/sepsis cases exist; no seasonal surge scenario/detector found. | MISSING | P2 |
| IoT/device vitals placeholder | Telemetry controller returns demo data labeled not live patient telemetry. | PLACEHOLDER | P2 |
| notification integration placeholder | General notification REST exists; ED notification stream/channel disabled. | PLACEHOLDER | P2 |
| provincial health unavailable | No provincial health connector or unavailable state found. | MISSING | P0 |

## Recommended Connection Order

1. Create one canonical ED event model for arrivals, triage, provider start, reassessment, room assignment, bed request, admission, discharge, EMS handoff/offload, referral status, and LWBS.
2. Hydrate active ED store from backend patient/event/referral/EMS endpoints, then keep local state as optimistic UI.
3. Align Smart Intake feature flags with the backend runtime, or keep the UI explicitly demo-only.
4. Promote the KPI layer from demo/local services to backend aggregates using the canonical event model.
5. Replace or clearly demote duplicate demo sources once canonical backend-backed sources exist.
