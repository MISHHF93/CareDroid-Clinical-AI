# Emergency Department Scenario Coverage Audit

Generated: 2026-06-12

Scope: source-code audit only. No product code was modified. Classifications below are based on active source files, route wiring, guarded API clients, backend controllers/services, fixtures, and rendered React routes.

## Classification Legend

| Classification | Meaning |
| --- | --- |
| IMPLEMENTED_AND_RENDERED | Reachable UI renders the scenario and has local workflow state/actions. |
| IMPLEMENTED_NOT_RENDERED | Source/model/service exists, but no active rendered route/panel exposes it directly. |
| BACKEND_ONLY | Backend model/service/API exists, but no active frontend flow consumes it. |
| FRONTEND_ONLY | Rendered UI/local store/action exists, but no durable backend/API chain backs it. |
| FIXTURE_ONLY | Static/demo data or tests model the scenario, but no active workflow owns it. |
| PLACEHOLDER | Stub/demo/guarded capability advertises the scenario without production-grade behavior. |
| DISCONNECTED | Multiple pieces exist, but the active route/API/store chain does not connect end-to-end. |
| DUPLICATE | Competing representations exist and can drift. |
| MISSING | No meaningful implementation was found. |
| FUTURE_MODULE | Roadmap/future-review/demo module only. |

## Executive Summary

CareDroid has a strong rendered Emergency OS demo/MVP surface: patient whiteboard, quick intake, EMS pipeline, queues, reassessment, capacity, boarding, referrals, clinical calculators, Smart Intake identity review, and analytics routes are all reachable under `/emergency/*`. Most ED operations run through the local Zustand store in `store/emergencyStore.ts` with realistic fixtures and local actions.

The main commercial gap is backend durability. Several runtime routes exist only behind `ENABLE_MONGOOSE_EMERGENCY_OS=true`, while the frontend guards mark those capabilities disabled. Patient management endpoints are called by the UI but do not have a matching active Nest patient controller. Revenue-critical KPIs such as wait-to-provider, ED LOS, ambulance offload time, LWBS rate, and reassessment completion rate are partially computed locally or in demo services, but not backed by durable event models.

## Coverage Matrix

### 1. Arrival and Registration

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| walk-in arrival | IMPLEMENTED_AND_RENDERED | `NewPatientIntake`, `EmergencyWhiteboard`, `store/emergencyStore.ts`, `/emergency/whiteboard`, `/emergency/patients` | P1 | Quick intake creates a local patient, assigns Arrival/Triage state, writes timeline events, and renders on the whiteboard. Backend create is attempted via `patientManagementApi`, but matching patient controller was not found. |
| EMS arrival | DISCONNECTED | `EMSPipeline`, `EMSCriticalBroadcast`, `store/emergencyStore.ts`, `backend/src/api/ems.routes.ts` | P0 | Rendered EMS pipeline and conversion to patient exist locally. Backend EMS API exists only when optional Mongoose runtime is enabled and is not the active frontend data source. |
| unknown patient | DISCONNECTED | `SmartIntake`, `smartIntakeApi`, `backend/src/api/smart-intake.routes.ts`, `backend/src/services/smart-intake.service.ts` | P1 | UI can locally continue as unknown patient. Backend route/service exists but frontend capability `emergencySmartIntake` is disabled by default. |
| duplicate patient | DISCONNECTED | `SmartIntake`, `smartIntakeFixtures`, `backend/src/services/mpi.service.ts`, `SmartIntakeSession` | P1 | Candidate matching and duplicate warnings exist, but the active frontend uses demo fixtures unless the guarded backend is enabled. |
| returning patient | PLACEHOLDER | `smartIntakeFixtures`, `Patient` identifiers, `platform-systems.service.ts` patient workspace demo | P1 | Returning-patient match is represented by candidates and identifiers, not a durable active patient search/link workflow. |
| identity conflict | FRONTEND_ONLY | `SmartIntake`, `smartIntakeFixtures`, field conflict statuses | P1 | Conflict fields render and require staff decisions in UI; backend audit exists behind disabled Smart Intake client guard. |
| provincial health data unavailable | MISSING | Search found product/integration roadmap mentions only | P0 | No provincial/HIE/OHIP connector runtime or fallback state specific to provincial data was found. |
| OCR extraction error | PLACEHOLDER | `SmartIntake`, `smartIntakeApi`, `ocr.service.ts`, `SmartIntakeSession` | P2 | OCR result ingestion and extracted-field review exist, but no active OCR provider/file pipeline or specific rendered OCR-error recovery was found. |

### 2. Triage and First Assessment

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| long wait to triage | FRONTEND_ONLY | `QueueIntelligencePanel`, `longWaitRescue`, `store/emergencyStore.ts` | P0 | Queue metrics and long-wait flags exist locally; no durable door-to-triage event endpoint. |
| wait to provider | FIXTURE_ONLY | `emergencyKpiLayerService`, `doorToDoctorIntelligenceService`, `QueueIntelligencePanel` | P0 | Provider queue renders, but door-to-provider KPI is demo/hidden rather than active backend-backed metric. |
| acuity assignment | IMPLEMENTED_AND_RENDERED | `NewPatientIntake`, `TriageSuggestionEngine`, `Priority`, CTAS labels | P1 | Complaint/vitals drive suggested P1-P5 acuity with override support and rendered controls. |
| abnormal vitals | IMPLEMENTED_AND_RENDERED | `vitalsAlertPipeline`, `PatientCard`, `store.addVitals`, `selectActiveAlerts` | P0 | Vitals warning/critical alerts, flags, timeline events, and active alerts are implemented locally. |
| high-risk complaint | IMPLEMENTED_AND_RENDERED | `TriageSuggestionEngine`, `PatientCard`, `ClinicalCalculatorHub`, `ProtocolSuggestion` | P1 | Chest pain, stroke, sepsis, severe respiratory, and trauma-like complaints drive high-priority suggestions and tool prompts. |
| triage bottleneck | FRONTEND_ONLY | `QueueIntelligencePanel`, `selectQueueBottleneckAlert`, queue targets | P0 | Rendered bottleneck panel exists; no backend queue-event source. |
| triage reassessment | DISCONNECTED | `EmergencyReassessmentRoute`, `reassessment.routes.ts`, `store` reminders | P0 | Local reassessment queue is rendered. Backend reassessment routes are optional Mongoose runtime and not the active source. |

### 3. Waiting Room Risk

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| high-risk waiting patient | IMPLEMENTED_AND_RENDERED | `EmergencyWhiteboard` filters, `PatientCard`, `longWaitRescue`, `selectActiveAlerts` | P0 | High-risk and long-wait flags render in patient lists and alerts. |
| chest pain waiting | FRONTEND_ONLY | `mockPatients` pt-001, `TriageSuggestionEngine`, `ClinicalCalculatorHub` HEART | P0 | Chest pain is rendered as an arrival/high-risk case and tool workflow, not a dedicated waiting-room safety rule. |
| stroke symptoms waiting | PLACEHOLDER | `emergencyOperatingSystem.js` demo alerts/protocols, NIHSS launcher | P0 | Stroke protocol/tool launch exists; no active waiting-room stroke patient scenario or timer. |
| sepsis concern waiting | PLACEHOLDER | `emergencyOperatingSystem.js` demo alert/protocol, qSOFA/NEWS2 launchers | P0 | Sepsis workflow context exists; no active waiting-room sepsis risk scenario. |
| elderly fall waiting | FRONTEND_ONLY | EMS inbound fall fixture, `ReferralPanel`, `morse-fall-scale` calculator | P1 | Fall risk appears through EMS/fall and calculator surfaces, not a dedicated elderly waiting-room workflow. |
| mental health crisis waiting | FUTURE_MODULE | Psychiatry calculators, referral department Psychiatry, roadmap/future modules | P1 | Mental health calculators and psychiatry referral exist, but no active ED waiting-room crisis workflow. |
| pediatric fever waiting | FRONTEND_ONLY | `mockPatients` pt-002 fever pediatric triage, `NewPatientIntake` Pediatric category | P1 | Pediatric fever appears in triage fixture, not as a dedicated waiting-room risk workflow. |
| abnormal vitals waiting | FRONTEND_ONLY | `vitalsAlertPipeline`, `longWaitRescue`, patient flags | P0 | Vitals alerts exist, but not specifically scoped to waiting-room patients in a backend rule. |
| reassessment overdue | IMPLEMENTED_AND_RENDERED | `EmergencyReassessmentRoute`, `store` reminders, `alertEngine` reassessment alerts | P0 | Local reassessment reminders/overdue alerts and route are rendered. |

### 4. EMS and Offload

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| EMS pre-arrival | DISCONNECTED | `EMSPipeline`, `emsPreArrivalPipelineService`, `backend/src/api/ems.routes.ts` | P0 | Rendered local EMS pre-arrivals exist. Optional backend EMS routes are not active frontend source. |
| ETA update | DISCONNECTED | `EMSPipeline`, `updateEMSArrival`, `ems.routes.ts` status patch | P0 | Local ETA/status update exists. Backend status route is gated and uses inconsistent frontend/backend status contracts. |
| multiple ambulances inbound | IMPLEMENTED_AND_RENDERED | `mockEMSArrivals`, `EMSPipeline`, `EMSPressureScore` | P1 | Multiple inbound ambulances render and affect local capacity/pressure. |
| ambulance offload delay | FRONTEND_ONLY | `EMSPipeline` offload minutes, `emsOffloadCommandCenterService` demo | P0 | UI computes offload from local timestamps; no durable offload records/API. |
| transfer-of-care delay | FRONTEND_ONLY | `EMSPipeline` Handoff/Complete states, `EMSCriticalBroadcast` | P0 | Handoff pending/complete UI exists locally; no transfer-of-care backend event model. |
| no ED bed available | FRONTEND_ONLY | `prepareEMSBay`, room statuses, capacity recommendations | P0 | Bay preparation is local and can be disabled if no room; no bed-management backend integration. |
| EMS pressure score | IMPLEMENTED_AND_RENDERED | `EMSPressureScore`, `EMSPipeline`, capacity inputs | P1 | Rendered pressure score uses local EMS/store data. |
| EMS handoff complete | IMPLEMENTED_AND_RENDERED | `EMSPipeline` Handoff complete button, `updateEMSArrival` | P1 | Local action marks arrival complete and updates rendered state. |

### 5. Patient Flow and Queues

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| waiting queue | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `QueueType.Waiting`, `/emergency/queues` | P0 | Rendered queue row and whiteboard filter. |
| provider queue | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `patientMatchesQueue` Provider | P0 | Provider queue maps Assessment/Orders states and renders. |
| orders queue | IMPLEMENTED_NOT_RENDERED | `QueueType.Orders`, `PatientState.Orders`, `mockPatients` pt-006 | P1 | Store computes Orders queue, but `QueueIntelligencePanel` omits it from visible rows. |
| results queue | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `PatientState.Results` | P1 | Results queue renders. |
| referral queue | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `ReferralPanel`, `store.referrals` | P1 | Referral queue renders and actions exist, with partial backend create only. |
| admission queue | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `EmergencyCapacityRoute`, `PendingAdmission` | P0 | Admission/boarding pressure renders locally. |
| discharge queue | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `EmergencyCapacityRoute`, `dischargePatient` | P0 | Discharge queue and expedite action render locally. |
| reassessment queue | IMPLEMENTED_AND_RENDERED | `EmergencyReassessmentRoute`, `QueueIntelligencePanel`, `selectReassessmentQueue` | P0 | Reassessment route and queue rows render. |
| bottleneck detection | IMPLEMENTED_AND_RENDERED | `selectQueueBottleneckAlert`, `QueueIntelligencePanel`, `alertEngine` | P0 | Local bottleneck detection and alert rendering exist. |

### 6. Capacity and Surge

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| capacity green/yellow/orange/red | IMPLEMENTED_AND_RENDERED | `capacityEngine`, `computeCapacity`, `EmergencyCapacityRoute`, `alertEngine` | P0 | Capacity bands, score, alerts, and route render. |
| sudden patient surge | FIXTURE_ONLY | `emergencySimulationScenariosService`, `EmergencyAnalytics` local arrivals | P1 | Simulation/demo scenario exists; no live surge detector. |
| staffing pressure | FRONTEND_ONLY | `EMERGENCY_COMMAND_CENTER_WIDGETS`, `DepartmentPulse`, `buildStaffWorkloads` | P1 | Staffing pressure visible in rendered surfaces, but no staffing backend/feed. |
| room unavailable | IMPLEMENTED_AND_RENDERED | `Room.status`, `EmergencyCapacityRoute` room grid, `prepareEMSBay` | P0 | Room availability/unavailability renders and affects EMS bay prep locally. |
| discharge-ready backlog | IMPLEMENTED_AND_RENDERED | `EmergencyCapacityRoute`, Disposition patients, `dischargePatient` action | P0 | Discharge-ready backlog and expedite button render. |
| admission backlog | IMPLEMENTED_AND_RENDERED | `QueueIntelligencePanel`, `EmergencyCapacityRoute`, `PendingAdmission` | P0 | Admission/boarding backlog renders locally. |
| mass casualty placeholder | FUTURE_MODULE | `emergencySimulationScenariosService`, docs/roadmap references | P2 | Training scenario only; no active MCI operations workflow. |
| seasonal respiratory surge | MISSING | Search found respiratory cases and sepsis/stroke surge demos only | P2 | No seasonal respiratory surge detector/scenario. |

### 7. Boarding

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| admitted patient waiting for bed | IMPLEMENTED_AND_RENDERED | `PatientState.Admission`, `PendingAdmission`, `EmergencyCapacityRoute` | P0 | Admitted/boarding patients render in capacity/boarding route. |
| boarding duration | IMPLEMENTED_AND_RENDERED | `EmergencyCapacityRoute`, `latestStateTimestamp`, `boardingIntelligenceEngine` | P0 | Route computes boarding-since durations; demo engine also models duration. |
| boarding risk | FRONTEND_ONLY | `computeCapacity` boarding deductions, `boardingIntelligenceEngine` risk score | P0 | Risk is local/demo; no backend bed event source. |
| bed request pending | FRONTEND_ONLY | `PendingAdmission` flag, referral to Internal Medicine, `EmergencyCapacityRoute` | P0 | Represented as flags/referrals, not a structured bed request entity. |
| bed assigned | FRONTEND_ONLY | `assignRoom`, `RoomAssignment` events, `Room.status` | P1 | Local room assignment exists; no inpatient bed assignment backend. |
| boarding escalation alert | FRONTEND_ONLY | `alertEngine` capacity alert includes boarding count, capacity recommendations | P0 | Capacity alert/recommendation covers boarding, but no dedicated boarding escalation alert type/API. |

### 8. Clinical Workflow Launchers

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| chest pain / HEART / ACS workflow | IMPLEMENTED_AND_RENDERED | `ClinicalCalculatorHub`, `PatientCard`, HEART/TIMI/GRACE launchers, `ProtocolSuggestion` | P1 | Calculators/protocol context render and can save scores locally. |
| sepsis / qSOFA / NEWS2 / sepsis workflow | IMPLEMENTED_AND_RENDERED | `ClinicalCalculatorHub`, `PatientCard`, qSOFA/NEWS2/SOFA, protocol demos | P1 | Rendered calculator/protocol workflow exists; no full sepsis pathway state machine. |
| stroke / NIHSS / stroke workflow | IMPLEMENTED_AND_RENDERED | `ClinicalCalculatorHub`, `PatientCard`, `EMSCriticalBroadcast`, stroke checklist | P1 | NIHSS and stroke prep checklist render; no live stroke timer/backend pathway. |
| trauma workflow | FRONTEND_ONLY | `criticalChecklists`, trauma checklist, GCS/revised trauma/shock index tools | P1 | Trauma tools/checklist exist locally, no full trauma workflow backend. |
| respiratory distress workflow | IMPLEMENTED_AND_RENDERED | `TriageSuggestionEngine`, `ClinicalCalculatorHub`, respiratory tools, respiratory-failure checklist | P1 | Respiratory calculators/checklists render locally. |
| abdominal pain workflow | PLACEHOLDER | `TriageSuggestionEngine`, `emergencyOperatingSystem.js` abdominal protocol demo | P2 | Abdominal pain triage and protocol metadata exist; no active workflow-specific UI beyond generic tools. |
| mental health crisis workflow | PLACEHOLDER | Psychiatry calculators, Columbia suicide workflow, Psychiatry referral | P1 | Mental-health tools exist, but no ED crisis waiting/escalation workflow. |
| falls/frailty workflow | PLACEHOLDER | EMS fall fixture, Morse fall scale, trauma/fall checklist matches | P2 | Fall risk/tools exist; no frailty/elderly-fall ED workflow. |

### 9. Referrals and Consults

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| cardiology referral | IMPLEMENTED_AND_RENDERED | `ReferralPanel`, department options, `/emergency/referrals`, `POST /api/referrals` | P1 | Create/status local; create posts to platform backend if patient ID matches backend in-memory list. |
| neurology referral | IMPLEMENTED_AND_RENDERED | `ReferralPanel`, department options, stroke workflow metadata | P1 | Same partial backend caveat as cardiology. |
| psychiatry referral | IMPLEMENTED_AND_RENDERED | `ReferralPanel`, department options | P1 | Same partial backend caveat. |
| internal medicine referral | IMPLEMENTED_AND_RENDERED | `mockReferrals` pt-011, `ReferralPanel`, `EmergencyCapacityRoute` | P1 | Internal medicine accepted referral fixture renders. |
| surgery referral | IMPLEMENTED_AND_RENDERED | `mockReferrals` pt-008, `ReferralPanel` | P1 | Surgery referral fixture and status actions render. |
| referral accepted | FRONTEND_ONLY | `ReferralPanel` Accept button, `updateReferralStatus` | P1 | Local status transition exists; transfer/status PATCH backend disabled. |
| referral delayed | FRONTEND_ONLY | `alertEngine` referral delay alerts, `ReferralPanel` elapsed timers | P0 | Local delay alerts/timers exist; no durable SLA backend. |
| referral closed | FRONTEND_ONLY | `ReferralPanel` Complete/Decline actions, `updateReferralStatus` | P1 | Local closure exists; no backend status persistence. |

### 10. External Data and Integrations

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| provincial health fetch | MISSING | No provincial connector runtime found | P0 | Critical pilot gap for Ontario/provincial data story. |
| FHIR-like patient snapshot | PLACEHOLDER | `platform-systems.service.ts`, `interoperability.module.ts`, patient workspace demo | P1 | Demo FHIR/patient workspace contracts exist, not real patient data flow. |
| medication history | DISCONNECTED | `patientManagementApi`, `PatientCard` backend tabs, `platform-systems` demo | P0 | Frontend normalizes medications, but matching active patient endpoints are absent/demo. |
| allergy history | DISCONNECTED | `patientManagementApi`, `PatientCard`, `SmartIntake` fixtures | P0 | Same endpoint gap as medication history. |
| recent encounters | DISCONNECTED | `patientManagementApi` visits normalization, patient workspace demo | P1 | Frontend expects encounters; no active patient endpoint found. |
| lab summary | DISCONNECTED | `patientManagementApi`, `LabInterpreter`, `PatientCard` labs tab | P0 | Lab UI/tooling exists; patient lab source endpoint is absent/demo. |
| IoT/device vitals placeholder | PLACEHOLDER | `TelemetryController`, `medicalIotService`, command widgets | P2 | Demo device/telemetry endpoints are labeled non-live patient telemetry. |
| notification integration placeholder | PLACEHOLDER | `notifications` module, `backendApiCapabilities` notification statuses | P2 | General notification APIs exist; ED-specific alert delivery integration is not implemented. |
| external data requires review | IMPLEMENTED_AND_RENDERED | `SmartIntake`, `platform-systems.service.ts`, `interoperability.module.ts` | P1 | Review-required language and fields render; real external feeds remain demo/gated. |

### 11. Alerts and Notifications

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| high wait alert | IMPLEMENTED_AND_RENDERED | `longWaitRescue`, `alertEngine`, `PatientCard` LWBS badge | P0 | Local long-wait/LWBS-risk alerts render. |
| reassessment overdue alert | IMPLEMENTED_AND_RENDERED | `alertEngine`, reassessment reminders, `EmergencyReassessmentRoute` | P0 | Due/overdue reminders and alerts render locally. |
| capacity red alert | IMPLEMENTED_AND_RENDERED | `capacityEngine`, `alertEngine`, `EmergencyCapacityRoute` | P0 | Capacity degradation/red alert exists locally. |
| EMS ETA alert | IMPLEMENTED_AND_RENDERED | `alertEngine` critical EMS, `EMSCriticalBroadcast`, countdown badge | P0 | Critical inbound EMS ETA alert/banner renders. |
| boarding delay alert | FRONTEND_ONLY | `EmergencyCapacityRoute`, capacity alert message, boarding recommendations | P0 | Boarding pressure surfaces through capacity alert/recommendation, not a dedicated backend alert. |
| identity conflict alert | FRONTEND_ONLY | `SmartIntake` warnings/status panels | P1 | Conflict warning renders inside Smart Intake; not integrated into global alert engine. |
| abnormal vitals alert | IMPLEMENTED_AND_RENDERED | `vitalsAlertPipeline`, `store.addVitals`, `PatientCard` active vitals alerts | P0 | Local warning/critical vitals alerts render and can be acknowledged. |
| referral delay alert | FRONTEND_ONLY | `alertEngine` referral delay, `ReferralPanel` | P0 | Local referral delay alert exists; no durable SLA event source. |

### 12. Revenue/Operational KPIs

| Scenario | Classification | Primary evidence | Gap priority | Notes |
| --- | --- | --- | --- | --- |
| patients today | IMPLEMENTED_AND_RENDERED | `EmergencyAnalytics`, `buildLocalEmergencyAnalytics` daily volume/hourly arrivals | P1 | Rendered with local fallback; backend aggregate endpoints disabled. |
| wait to triage | FRONTEND_ONLY | `buildLocalEmergencyAnalytics` avg wait uses arrival to triage/assessment | P0 | Local average exists; not a durable KPI endpoint. |
| wait to provider | FIXTURE_ONLY | `emergencyKpiLayerService`, `doorToDoctorIntelligenceService` | P0 | Demo KPI exists but is not active rendered canonical source. |
| ED length of stay | IMPLEMENTED_NOT_RENDERED | `buildLocalEmergencyAnalytics` avgLos, hidden shift summary/future module | P0 | Computed in local service but not shown on active analytics page. |
| ambulance offload time | FRONTEND_ONLY | `EMSPipeline` average/offload breach, `emsOffloadCommandCenterService` demo | P0 | Rendered local EMS offload metrics, no backend AOT model. |
| boarding time | IMPLEMENTED_AND_RENDERED | `EmergencyCapacityRoute`, `boardingIntelligenceEngine` | P0 | Rendered boarding durations locally. |
| LWBS risk/rate | FRONTEND_ONLY | `longWaitRescue`, `PatientCard` LWBS badge, local analytics text scan | P0 | LWBS risk renders; no LWBS disposition/action/rate endpoint. |
| discharge turnaround | FRONTEND_ONLY | `EmergencyCapacityRoute` discharge pipeline duration | P0 | Disposition duration and expedite button render; no KPI endpoint. |
| reassessment completion rate | MISSING | Reassessment queue/reminder actions exist, no completion-rate metric found | P0 | Need durable denominator/completion KPI for pilot reporting. |

## Overall Readiness

| Area | Readiness | Key risk |
| --- | --- | --- |
| ED demo/pilot visualization | Strong | Most workflows are local-state/demo backed. |
| Operational safety alerts | Moderate | Local alerts render; backend/event durability is thin. |
| External data/integration readiness | Weak | FHIR/telemetry/imports are demo/gated; provincial health is missing. |
| Revenue KPI readiness | Weak to moderate | Core buyer KPIs are not backend-backed and several are not active rendered metrics. |
| EMS/offload readiness | Moderate | EMS UI is compelling, but active backend/offload data chain is disconnected. |

## Highest-Risk Gaps

1. P0: durable patient/event backend for arrivals, state changes, reassessments, provider times, bed requests, discharge, and LWBS.
2. P0: real or pilot-simulated patient data source for medication/allergy/labs/recent encounters, with explicit provincial-unavailable states.
3. P0: backend-backed KPI layer for wait-to-provider, ED LOS, ambulance offload time, boarding time, discharge turnaround, LWBS rate, and reassessment completion.
4. P0: EMS/offload source of truth. Current frontend EMS workflow is rendered, but backend routes are optional/gated and not consumed as the active source.
5. P1: Smart Intake backend/client alignment. Backend route/service exists, but the frontend marks the capability disabled by default.
