# Emergency OS Capability Inventory

Generated: 2026-06-12

Mode: discovery and validation only. No product features were implemented in this pass.

## Evaluation Basis

This inventory compares the current CareDroid Emergency OS implementation against operational capabilities that hospitals commonly buy in ED patient-flow systems: patient flow visibility, EMS offload, boarding, wait-time management, reassessment safety, operational forecasting, and integration readiness.

External operational indicators reviewed:

- Quorum / Ontario emergency access and flow indicators identify ED length of stay, LWBS, ambulance offload time, wait time to inpatient bed, and physician initial assessment as core ED flow measures.
- The user-provided JHMHP and PMC links were treated as contextual research. They were not fully retrievable from this environment, so repository findings below are grounded in local code evidence.

Classification key:

- `implemented`: active route/UI/workflow with rendered data and a backend chain.
- `partially implemented`: active UI/workflow exists, but backend, persistence, hydration, or production data is incomplete.
- `disconnected`: backend/service/code exists but does not reach the active UI or active UI does not call it.
- `placeholder`: demo/readiness/static/future contract exists but not production workflow.
- `missing`: no meaningful active implementation found.

## Summary By Category

| Category | Implemented | Partial | Disconnected | Placeholder | Missing | Category Readiness |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Patient Flow | 0 | 7 | 0 | 0 | 0 | 50% |
| EMS | 0 | 5 | 0 | 0 | 0 | 50% |
| Reassessment | 0 | 4 | 0 | 0 | 0 | 50% |
| Capacity | 0 | 4 | 0 | 0 | 0 | 50% |
| Boarding | 0 | 3 | 0 | 0 | 0 | 50% |
| Referrals | 0 | 3 | 0 | 0 | 0 | 50% |
| Smart Intake | 0 | 4 | 0 | 1 | 0 | 43% |
| Operational Intelligence | 0 | 3 | 1 | 1 | 1 | 32% |
| Alerting | 0 | 4 | 0 | 0 | 1 | 40% |
| Integrations | 0 | 1 | 1 | 2 | 1 | 21% |

## Capability Inventory

| Category | Capability | Status | Backend | Endpoint | Frontend / Route / UI | Data Renders | Workflow Reachable | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Patient Flow | Whiteboard | partially implemented | Partial | Generic `POST/PATCH /api/patients`; no canonical whiteboard feed | `src/App.jsx` `/emergency/whiteboard`; `src/components/EmergencyWhiteboard.jsx` | Yes, store-backed | Yes | Active route and UI render; patient list initializes from `store/emergencyStore.ts` mock/store state. |
| Patient Flow | Patient Journey Tracking | partially implemented | Partial | Generic patient PATCH only | `engine/journeyEngine.ts`, `src/components/JourneyTimeline.jsx`, `src/components/PatientCard.jsx` | Yes | Yes | Journey transitions and timeline render, but no authoritative transition endpoint. |
| Patient Flow | Waiting Queue | partially implemented | No live queue backend | No stable queue endpoint | `/emergency/queues`, `QueueIntelligencePanel`, `computeQueues()` | Yes | Yes | Queue is derived from local patient state. |
| Patient Flow | Provider Queue | partially implemented | No live queue backend | No provider queue endpoint | `QueueIntelligencePanel` provider row | Yes | Yes | Derived from local Assessment/Orders states. |
| Patient Flow | Results Queue | partially implemented | No live queue backend | No results queue endpoint | `QueueIntelligencePanel` results row | Yes | Yes | Queue type exists; patient detail can render backend result tabs separately. |
| Patient Flow | Disposition Queue | partially implemented | No live queue backend | No disposition endpoint | Capacity/discharge pipeline and `PatientState.Disposition` | Partial | Yes | Disposition patients render in capacity/discharge context, not as a dedicated queue row. |
| Patient Flow | Discharge Queue | partially implemented | Partial | Generic patient PATCH | `QueueIntelligencePanel` discharge row; patient detail discharge action | Yes | Yes | Discharge workflow works locally and syncs generic patient update. |
| EMS | EMS Pre-Arrival | partially implemented | Optional/gated | Runtime-gated `/api/ems/alert`, not active UI source | `/emergency/ems`, `EMSPipeline` | Yes, store/demo-backed | Yes | EMS arrivals render from store; demo fleet snapshot is separate from optional EMS backend. |
| EMS | EMS ETA Tracking | partially implemented | Optional/gated | Runtime-gated EMS routes | `EMSPipeline`, `EMSPressureScore` | Yes | Yes | UI uses `eta`/`estimatedArrivalTime`; backend shape uses `eta_minutes`. |
| EMS | EMS Offload Tracking | partially implemented | Optional/gated | No durable active offload endpoint | `EMSPipeline`, `emsOffloadCommandCenterService` demo | Yes | Partial | UI computes offload from local timestamps. |
| EMS | EMS Pressure Score | partially implemented | No backend score persistence | None | `EMSPressureScore` mounted in `EMSPipeline` | Yes | Yes | Client-side score only; feature registry points to demo fleet snapshot. |
| EMS | Ambulance Handoff Tracking | partially implemented | Optional/gated | Runtime-gated status/arrive routes | `store.convertEMSArrivalToPatient`, `EMSPipeline` | Yes | Yes | UI workflow exists; backend status contract mismatch and no active subscription. |
| Reassessment | Waiting Room Reassessment | partially implemented | Optional/gated | `/api/reassessment/*` gated and unused | `/emergency/reassessment`, `ReassessmentDrawer`, `PatientCard` | Yes | Yes | Store flags/reminders drive route and drawer. |
| Reassessment | High-Risk Waiting Detection | partially implemented | No server detection | None | `longWaitRescue`, `alertEngine`, patient cards | Yes | Yes | Client-derived flags and badges. |
| Reassessment | Escalation Alerts | partially implemented | No durable ED alert backend | Demo clinical alerts only | `alertEngine`, `AppShell` alert drawer/toasts | Yes | Yes | Store-generated alerts only. |
| Reassessment | Deterioration Tracking | partially implemented | Partial | Patient detail APIs may expose labs/detail; no deterioration endpoint | `vitalsAlertPipeline`, `reassessmentEngine`, `PatientCard` | Yes | Yes | Vitals and flags drive visible risk state. |
| Capacity | Capacity Score | partially implemented | Optional/gated | `/api/capacity/dashboard` gated and unused | `/emergency/capacity`, `AppShell` capacity badge/panel | Yes | Yes | Store/client score from `capacityEngine`/`emergencyStore`. |
| Capacity | Occupancy Tracking | partially implemented | Partial | No live room occupancy endpoint | Capacity route and detail panel room grid | Yes | Yes | Derived from store rooms, not backend room source. |
| Capacity | Pending Admission Tracking | partially implemented | No dedicated backend workflow | None | Boarding/capacity UI, `PendingAdmission` flag | Yes | Yes | Store-derived from state/flags. |
| Capacity | Pending Discharge Tracking | partially implemented | No dedicated backend workflow | None | Capacity discharge pipeline, `PatientState.Disposition` | Yes | Yes | Store-derived. |
| Boarding | Boarding Duration | partially implemented | No durable active model | None | `/emergency/boarding`, capacity detail boarding pressure | Partial | Yes | Uses patient state duration, not boarding-start timestamp. |
| Boarding | Boarding Risk | partially implemented | Demo only | None active | `boardingIntelligenceEngine` demo; capacity/boarding route | Partial | Partial | Risk concepts exist, but not active backend/UI score. |
| Boarding | Wait For Bed Tracking | partially implemented | No bed request entity | None | Admission/boarding UI and pending admission flags | Partial | Partial | Missing bed request status and wait-start model. |
| Referrals | Referral Requests | partially implemented | Partial | `POST /api/referrals` | `/emergency/referrals`, `ReferralPanel` | Yes | Yes | UI creates local referral and now syncs create to backend. |
| Referrals | Referral Queue | partially implemented | Partial | `GET /api/referrals` exists but not store hydration source | `ReferralPanel` status groups | Yes | Yes | Queue derives from store/local referrals. |
| Referrals | Referral Status | partially implemented | No backend status PATCH | Transfer status disabled | `ReferralPanel` status actions | Yes | Yes | Status workflow local-first. |
| Smart Intake | Identity Verification | partially implemented | Optional/gated | Smart Intake verify endpoints exist | `/emergency/intake`, `SmartIntake` | Yes, fixture-backed | Yes | UI field decisions do not call backend verify-field. |
| Smart Intake | OCR Intake | placeholder | Optional/gated placeholder | OCR intake endpoints exist | Smart Intake fixture panels | Yes, fixture-backed | Partial | No OCR provider/file pipeline. |
| Smart Intake | Patient Matching | partially implemented | Optional/gated | `SmartIntakeApi.matchPatient()` exists | Smart Intake demo candidates | Yes, fixture-backed | Partial | UI does not call match API. |
| Smart Intake | Duplicate Detection | partially implemented | Optional/gated | Backend duplicate warning exists | Smart Intake demo warning | Yes, fixture-backed | Partial | Duplicate review is fixture-backed. |
| Smart Intake | Unknown Patient Workflow | partially implemented | Optional/gated | Continue/reconcile endpoints exist | Smart Intake unknown action | Yes | Partial | Continue exists; reconcile flow not surfaced. |
| Operational Intelligence | LWBS Tracking | placeholder | No backend workflow | None | Long-wait rescue badge `LWBS RISK` | Partial | No dedicated workflow | No LWBS state/action/endpoint. |
| Operational Intelligence | ED Length of Stay | partially implemented | No aggregate backend | None stable | Journey timeline; local analytics calculations | Partial | Partial | Not surfaced as a core live whiteboard metric. |
| Operational Intelligence | Ambulance Offload Time | partially implemented | Optional/gated | No stable active offload API | EMS pipeline offload summary | Yes | Partial | Local arrival/handoff timestamp calculation. |
| Operational Intelligence | Wait To Provider Time | disconnected | Demo service only | None active | `doorToDoctorIntelligenceService` not active route metric | No | No | Exists outside active Emergency OS flow. |
| Operational Intelligence | Wait To Bed Time | missing | No | No | No dedicated UI | No | No | No timestamp model or metric found. |
| Operational Intelligence | Bottleneck Detection | partially implemented | No live backend | Disabled emergency queue analytics | `QueueIntelligencePanel`, store selector | Yes | Yes | Client-derived only. |
| Alerting | High Wait Alerts | partially implemented | No durable alert backend | None | `longWaitRescue`, `alertEngine`, AppShell alerts | Yes | Yes | Store-derived. |
| Alerting | Capacity Alerts | partially implemented | No active backend alert endpoint | None | `alertEngine`, capacity badge/drawer | Yes | Yes | Store-derived. |
| Alerting | EMS Alerts | partially implemented | Optional/gated/socket mismatch | Optional Socket.IO EMS events | `EMSCriticalBroadcast`, alerts | Yes | Yes | Frontend does not subscribe to backend Socket.IO events. |
| Alerting | Boarding Alerts | missing | No | No | Folded into capacity/queue | No dedicated class | No dedicated workflow | No dedicated `Boarding` alert derivation found. |
| Alerting | Reassessment Alerts | partially implemented | Optional/gated, unused | `/api/reassessment/*` gated | Reassessment drawer, badge, alerts | Yes | Yes | Store flags/reminders drive UI. |
| Integrations | EHR Connectors | placeholder | Demo/readiness | Import/readiness endpoints | Settings/integration surfaces | Partial | Partial | No credentialed live EHR connector. |
| Integrations | Provincial Health Connectors | missing | No | No | Roadmap/catalog only | No | No | No OHIP/HIE/provincial runtime found. |
| Integrations | FHIR Support | placeholder | Demo/readiness | FHIR connection/test/sync routes | Settings integration status | Partial | Partial | Demo connector contracts only. |
| Integrations | Device Integration Framework | disconnected | Demo telemetry/device modules | Demo endpoints | Future routes redirected from active app | No active Emergency OS route | No | Medical IoT/device pages are future-release redirected. |
| Integrations | Notification Framework | partially implemented | Partial | Notification REST/device-token/preferences exist | Preferences/local toasts | Partial | Partial | Streams/send channels disabled; credentials required. |

## Current Score Snapshot

Weighted scoring model:

- implemented = 1.00
- partially implemented = 0.50
- disconnected = 0.25
- placeholder = 0.15
- missing = 0.00

| Metric | Score | Basis |
| --- | ---: | --- |
| Emergency OS Completion | 61% | Active route/UI/workflow surface is broad, but backend source-of-truth and operational metric endpoints are incomplete. |
| Pilot Customer Readiness | 66% | Core demo/walkthrough works locally, but paying pilot requires clearer backend data ownership and live operational metrics. |
| Revenue Readiness | 52% | Hospitals buy live LOS, AOT, wait-to-provider, wait-to-bed, LWBS, boarding, and flow visibility; several are placeholder/disconnected/missing. |
| Operational Capability Coverage | 43% | 47 capabilities scored with the weighted model above: weighted total 20.1 / 47. |

## Bottom Line

CareDroid Emergency OS is not missing random features. It is missing revenue-grade operational chains for the metrics hospitals already measure: LOS, LWBS, ambulance offload, wait to provider, and wait to inpatient bed. The current product surface is strong enough to demonstrate the concept, but the commercial gap is durable live measurement and backend-backed operational flow data.
