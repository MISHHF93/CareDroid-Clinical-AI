# Revenue-Critical ED Scenario Gaps

Generated: 2026-06-12

This report ranks Emergency Department scenario gaps by commercial impact:

- P0 = blocks pilot/revenue tomorrow
- P1 = needed for strong pilot
- P2 = commercial differentiator
- P3 = future enterprise roadmap

## P0: Blocks Pilot or Revenue Tomorrow

| Gap | Affected scenarios | Current implementation | Why it blocks revenue |
| --- | --- | --- | --- |
| Durable ED event backend | arrivals, wait to triage, wait to provider, ED LOS, discharge turnaround, reassessment completion, LWBS, boarding, bed request | Mostly local store events in `store/emergencyStore.ts`; optional Mongoose routes are gated; analytics endpoints disabled. | Hospitals buy measurable flow improvement. Without durable event timestamps, KPIs cannot be trusted, audited, or reported. |
| Patient/external data source | medication history, allergy history, recent encounters, lab summary, FHIR-like snapshot, external data requires review | Frontend `patientManagementApi` expects patient endpoints; platform/interoperability routes return demo/synthetic data. | A pilot needs credible patient context or an explicit, reliable unavailable-state story. |
| Provincial health data unavailable state | provincial health fetch/unavailable | No provincial connector/runtime or unavailable UI state found. | For Canadian/Ontario ED positioning, provincial data absence must be handled explicitly rather than silently missing. |
| EMS/offload source of truth | EMS arrival, ETA update, offload delay, transfer-of-care delay, offload time KPI | Rendered local EMS pipeline; optional backend `/api/ems/*`; demo offload command center. | Ambulance offload time is a high-value buyer KPI, but current data is local/demo and not durable. |
| Wait-to-provider KPI | provider queue, door-to-doctor, wait to provider | Provider queue renders locally; demo KPI service exists; active analytics page does not render a backend-backed metric. | ED leadership expects door-to-provider or physician-initial-assessment metrics. |
| LWBS metric | high wait alert, LWBS risk/rate | LWBS risk badge and long-wait alerts exist; no LWBS disposition/action/rate endpoint. | LWBS is a core ED throughput/revenue leakage indicator. |
| Reassessment completion rate | reassessment overdue, reassessment queue, completion rate | Local reminders can be completed; no aggregate denominator/rate metric. | Safety/compliance story is incomplete without completion reporting. |
| Referral delay durability | referral delayed, accepted, closed | Referral UI/status actions are local; only create has a backend post path. | Consult/referral delay is operationally valuable only if persisted across sessions and reportable. |

## P1: Needed for a Strong Pilot

| Gap | Affected scenarios | Current implementation | Commercial impact |
| --- | --- | --- | --- |
| Smart Intake backend alignment | unknown patient, duplicate patient, returning patient, identity conflict, OCR extraction | Strong UI and backend service exist, but frontend capability is disabled and backend routes require optional Mongoose runtime. | Makes registration/intake demo credible when aligned; confusing if backend confirmation always fails. |
| Orders queue not rendered | orders queue, provider queue | `QueueType.Orders` exists and pt-006 is in `PatientState.Orders`, but `QueueIntelligencePanel` does not render an Orders row. | Flow story has a visible gap between provider, orders, and results. |
| Bed request/bed assigned model | bed request pending, bed assigned, boarding escalation | Local room assignment and `PendingAdmission` flags exist; no structured bed request. | Boarding and admission conversations need bed-management specificity. |
| Mental health crisis workflow | mental health crisis waiting/workflow, psychiatry referral | Psychiatry referral/calculators exist; no ED crisis workflow. | Common ED pilot scenario, especially for boarding and safety. |
| Stroke/sepsis waiting-room timers | stroke symptoms waiting, sepsis concern waiting | Calculator/protocol launchers exist; no active waiting-room-specific timer/rule. | Important safety demonstration for high-risk waiting room patients. |
| Backend queue analytics | triage bottleneck, queue performance | Queue panel is local; backend queue analytics disabled. | Pilot users will ask whether queue numbers survive refresh and integrate with hospital data. |
| Dedicated boarding alert type | boarding delay/boarding escalation | Boarding is folded into capacity alerts/recommendations. | Boarders are a buyer pain point and should be first-class in alerts and reporting. |

## P2: Commercial Differentiators

| Gap | Affected scenarios | Current implementation | Differentiator value |
| --- | --- | --- | --- |
| Mass casualty operations mode | mass casualty placeholder, sudden surge | Training scenario exists in `emergencySimulationScenariosService`; no active operations mode. | Strong enterprise/region demo, but not required for first pilot. |
| Seasonal respiratory surge | seasonal respiratory surge, pediatric fever, respiratory distress | Respiratory cases and sepsis surge demo exist; no seasonal detector. | Valuable forecasting story for winter surge. |
| Live device/IoT vitals integration | IoT/device vitals placeholder, abnormal vitals waiting | Telemetry endpoints are demo and labeled non-live. | Differentiator if connected, but should not block ED flow pilot. |
| Notification channel integration | notification integration placeholder, high wait/reassessment/capacity alerts | Local/global alerts exist; ED notification channels disabled. | Useful for escalation workflows after core alert logic is durable. |
| Full abdominal pain workflow | abdominal pain workflow | Triage and protocol metadata exist; no dedicated active workflow. | Helpful service-line expansion after core chest pain/sepsis/stroke flow. |
| Falls/frailty workflow | elderly fall waiting, falls/frailty workflow | Fall EMS fixture and Morse fall scale exist; no frailty pathway. | Strong geriatric ED differentiator. |

## P3: Future Enterprise Roadmap

| Gap | Affected scenarios | Current implementation | Roadmap rationale |
| --- | --- | --- | --- |
| Enterprise-wide command center feeds | capacity surge, EMS pressure, staffing pressure, device status | Multiple local/demo services model this. | Requires integrations and multi-department data governance. |
| Full provincial/HIE integration | provincial health fetch | Missing. | High-value but jurisdiction-specific and procurement-heavy. |
| Automated simulation/debrief suite | mass casualty, sepsis surge, stroke surge, EMS overload, boarding crisis | Simulation scenarios are data-only. | Training product line after operational pilot. |

## Revenue-Critical Implementation Themes

### 1. Make KPIs Trustworthy

Current code can render many operational signals, but hospitals will ask for source, timestamp, denominator, and history. The highest-value KPI event schema should cover:

- arrival time
- triage start/complete
- provider initial assessment
- orders placed/resulted
- referral sent/acknowledged/accepted/closed
- bed request created/assigned
- admission decision
- discharge ready/discharge complete
- EMS arrived/handoff started/handoff complete
- reassessment due/completed
- LWBS disposition

### 2. Turn Local Store Actions Into Backend Events

The local store already has the right shape for an MVP: `addPatient`, `movePatientToState`, `assignRoom`, `addVitals`, `scheduleReassessmentReminder`, `completeReassessmentReminder`, `createReferral`, `updateReferralStatus`, `convertEMSArrivalToPatient`, and `updateEMSArrival`. Revenue readiness requires these actions to write durable events and rehydrate from backend state.

### 3. Clarify Demo vs Production Sources

The repo has several useful demo services:

- `emergencyKpiLayerService`
- `emsOffloadCommandCenterService`
- `boardingIntelligenceEngine`
- `emergencySimulationScenariosService`
- `emergencyFlowEngineService`
- `platform-systems.service.ts` demo contracts

They should remain valuable demos, but the active ED pilot route should identify one canonical source for each metric and workflow.

## Pilot Readiness Scorecard

| Domain | Current state | Pilot readiness |
| --- | --- | --- |
| Whiteboard/patient flow visualization | Rendered and realistic local workflows | Medium-high |
| EMS/offload | Strong rendered UI, disconnected backend | Medium |
| Referrals/consults | Strong UI, partial backend create, local status | Medium |
| Capacity/boarding | Rendered local capacity and boarding | Medium |
| External patient data | Demo/disconnected | Low |
| Revenue KPIs | Local/demo/partial | Low |
| Alerts | Strong local alerts, weak notification integration | Medium |
| Smart Intake | Strong UI/backend pieces but guarded/disconnected | Medium-low |

## Top P0 Delivery Targets

1. Backend ED event log and patient-flow rehydration.
2. Backend KPI aggregates for wait-to-provider, LOS, offload time, boarding time, discharge turnaround, LWBS, reassessment completion.
3. EMS arrival/offload endpoint consumed by `EMSPipeline`.
4. Referral status persistence and hydration.
5. External patient context contract that either fetches real pilot data or renders explicit unavailable/review-required states.
