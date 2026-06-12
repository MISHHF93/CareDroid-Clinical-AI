# Disconnected Capabilities

Generated: 2026-06-12

Mode: discovery and validation only. No implementation changes were made.

## Executive Summary

The active Emergency OS UI is reachable and clinically coherent, but many commercially important capabilities are disconnected from production-grade backend chains. The recurring breakpoints are:

- Frontend renders store/mock/demo data instead of canonical backend feeds.
- Optional Mongoose Emergency OS routes are runtime-gated behind `ENABLE_MONGOOSE_EMERGENCY_OS=true`.
- Some backend routes exist but are not called by the active UI.
- Some UI workflows exist but persist only to Zustand/local state or generic patient PATCH.
- Key revenue metrics have no durable event model.

## Highest-Impact Chain Breaks

| Capability | Intended Chain | Current Break |
| --- | --- | --- |
| Whiteboard live patient flow | Database -> patient repository -> live patient/flow endpoint -> API client -> store -> whiteboard | Patient list is store/mock-first. Generic patient create/update sync exists, but no canonical backend hydration/feed for the whiteboard. |
| Queue intelligence | Patient states/events -> queue service -> queue endpoint -> queue client -> `QueueIntelligencePanel` | Queue rows are computed locally in `store/emergencyStore.ts`; emergency queue analytics capability is disabled. |
| EMS offload | EMS CAD/ePCR/pre-arrival event -> EMS endpoint/service -> offload record -> EMS UI | UI uses local `emsArrivals` plus demo fleet snapshot. Optional `/api/ems/*` backend is runtime-gated and not consumed. |
| Reassessment safety | Patient risk/vitals/wait events -> reassessment service -> reassessment endpoint -> route/drawer | UI uses local flags/reminders. Optional `/api/reassessment/*` exists but is gated and unused. |
| Capacity/occupancy | Room/bed/patient events -> capacity service -> dashboard endpoint -> capacity route/panel | UI computes capacity from local store. Optional `/api/capacity/dashboard` exists but is gated and shape-mismatched. |
| Boarding/wait-for-bed | Disposition/admission order -> bed request entity -> bed assignment workflow -> boarding route | No durable bed request entity, no wait-start timestamp, no bed assignment workflow, no active backend endpoint. |
| Referral status | Referral entity -> create/status endpoints -> referral client -> referral board | Create syncs to `POST /api/referrals`; status transitions remain local because no stable backend PATCH endpoint exists. |
| Smart Intake matching | Intake session -> OCR/manual evidence -> MPI match -> verify fields -> patient creation/link -> whiteboard | UI uses fixture fields/candidates and calls only session/final actions. Manual entry, OCR, match, verify-field, audit, and reconcile endpoints are not driving visible panels. |
| Operational metrics | Journey/EMS/bed events -> metrics service -> live analytics endpoint -> whiteboard/analytics | LOS/offload partially computed locally; LWBS is only a badge/risk concept; wait-to-provider is disconnected demo service; wait-to-bed is missing. |
| Alerting | Derived risk event -> alert service/persistence/stream -> AppShell alert UI | Alerts are store-derived; backend clinical alerts are demo/separate; no durable ED operational alert persistence/stream. |

## Detailed Breakpoints

### Patient Flow

| Capability | Backend Exists | Endpoint Exists | Frontend Exists | Route Exists | UI/Data Renders | Chain Break |
| --- | --- | --- | --- | --- | --- | --- |
| Whiteboard | Partial | Generic `/api/patients` only | Yes | Yes | Yes | No canonical backend whiteboard feed or hydration source. |
| Patient Journey Tracking | Partial | Generic PATCH only | Yes | Yes | Yes | No transition endpoint or durable transition event store. |
| Waiting Queue | No live backend | No | Yes | Yes | Yes | Queue derived from local store only. |
| Provider Queue | No live backend | No | Yes | Yes | Yes | Queue derived from local state; no provider wait metric. |
| Results Queue | No live backend | No | Yes | Yes | Yes | Queue derived locally; backend result tabs are separate patient detail APIs. |
| Disposition Queue | No live backend | No | Partial | Yes | Partial | Rendered in capacity/discharge context, not a dedicated live queue. |
| Discharge Queue | Partial | Generic PATCH only | Yes | Yes | Yes | Discharge is local workflow plus generic patient update, not a discharge queue backend. |

### EMS

| Capability | Backend Exists | Endpoint Exists | Frontend Exists | Route Exists | UI/Data Renders | Chain Break |
| --- | --- | --- | --- | --- | --- | --- |
| EMS Pre-Arrival | Optional/gated | `/api/ems/alert` gated | Yes | Yes | Yes | UI does not call optional EMS route. |
| EMS ETA Tracking | Optional/gated | EMS routes include ETA input | Yes | Yes | Yes | Frontend/backend shapes differ (`eta` vs `eta_minutes`). |
| EMS Offload Tracking | Partial | No stable active offload endpoint | Yes | Yes | Yes | Local timestamps only; no durable backend offload records. |
| EMS Pressure Score | No backend score | No | Yes | Yes | Yes | Client-only score, no persistence or endpoint. |
| Ambulance Handoff Tracking | Optional/gated | Status/arrive routes gated | Yes | Yes | Yes | Optional backend status contract mismatch and no frontend Socket.IO subscription. |

### Reassessment And Alerting

| Capability | Backend Exists | Endpoint Exists | Frontend Exists | Route Exists | UI/Data Renders | Chain Break |
| --- | --- | --- | --- | --- | --- | --- |
| Waiting Room Reassessment | Optional/gated | `/api/reassessment/due` gated | Yes | Yes | Yes | UI uses local flags/reminders. |
| High-Risk Waiting Detection | No backend | No | Yes | Yes | Yes | Client-only long-wait detection. |
| Escalation Alerts | Partial/demo | Demo clinical alerts only | Yes | Yes | Yes | ED operational alerts are not persisted/server-streamed. |
| Deterioration Tracking | Partial | Generic patient detail/labs only | Yes | Yes | Yes | No deterioration service endpoint. |
| High Wait Alerts | No backend | No | Yes | Yes | Yes | Store-derived only. |
| Capacity Alerts | No active backend | No | Yes | Yes | Yes | Store-derived only. |
| EMS Alerts | Optional/gated | Socket events exist | Yes | Yes | Yes | Backend Socket.IO events not consumed by frontend realtime client. |
| Boarding Alerts | No | No | No dedicated class | Partial | No dedicated alert | Boarding pressure folded into capacity/queue. |
| Reassessment Alerts | Optional/gated | Reassessment routes gated | Yes | Yes | Yes | Store-derived flags/reminders only. |

### Capacity And Boarding

| Capability | Backend Exists | Endpoint Exists | Frontend Exists | Route Exists | UI/Data Renders | Chain Break |
| --- | --- | --- | --- | --- | --- | --- |
| Capacity Score | Optional/gated | `/api/capacity/dashboard` gated | Yes | Yes | Yes | Store/client score is active source. |
| Occupancy Tracking | Partial | No room occupancy feed | Yes | Yes | Yes | Room state is local store. |
| Pending Admission Tracking | No dedicated backend | No | Yes | Yes | Yes | Uses patient state/flag, not bed request workflow. |
| Pending Discharge Tracking | No dedicated backend | No | Yes | Yes | Yes | Uses disposition state, no pending discharge endpoint. |
| Boarding Duration | Demo/local | No active endpoint | Yes | Yes | Partial | No boarding-start timestamp or durable event model. |
| Boarding Risk | Demo/local | No active endpoint | Partial | Yes | Partial | Demo risk logic not active end-to-end. |
| Wait For Bed Tracking | No | No | Partial | Yes | Partial | Missing bed request entity, status, and wait-start timestamp. |

### Referrals And Smart Intake

| Capability | Backend Exists | Endpoint Exists | Frontend Exists | Route Exists | UI/Data Renders | Chain Break |
| --- | --- | --- | --- | --- | --- | --- |
| Referral Requests | Partial | `POST /api/referrals` | Yes | Yes | Yes | Backend is in-memory/demo; no external consult integration. |
| Referral Queue | Partial | `GET /api/referrals` | Yes | Yes | Yes | Active store does not hydrate from backend referral list. |
| Referral Status | No stable status backend | No PATCH | Yes | Yes | Yes | Status workflow is local-first. |
| Identity Verification | Optional/gated | Verify endpoints exist | Yes | Yes | Yes | UI field decisions do not call backend verify-field. |
| OCR Intake | Placeholder | OCR endpoints exist | Fixture UI | Yes | Fixture data | No OCR provider/capture pipeline. |
| Patient Matching | Optional/gated | Match endpoint exists | Fixture UI | Yes | Fixture data | UI does not call match API. |
| Duplicate Detection | Optional/gated | Duplicate warning exists | Fixture UI | Yes | Fixture data | No connected duplicate review workflow. |
| Unknown Patient Workflow | Optional/gated | Continue/reconcile endpoints exist | Partial | Yes | Yes | Reconcile unknown is not surfaced. |

### Integrations

| Capability | Backend Exists | Endpoint Exists | Frontend Exists | Route Exists | UI/Data Renders | Chain Break |
| --- | --- | --- | --- | --- | --- | --- |
| EHR Connectors | Placeholder | Demo import/readiness | Partial | Settings/support | Partial | No credentialed live connector. |
| Provincial Health Connectors | No | No | Catalog/roadmap only | No | No | Missing runtime. |
| FHIR Support | Placeholder | Demo FHIR routes | Partial | Settings/support | Partial | Demo connection/test/sync only. |
| Device Integration Framework | Demo/disconnected | Demo telemetry/device endpoints | Future pages | Future routes redirected | No active Emergency OS UI | Device routes are outside active pilot router. |
| Notification Framework | Partial | REST/preferences/device token | Partial | Settings/support | Partial | Streams/send channels disabled; Firebase credential-dependent. |

## Revenue-Critical Metrics Breakpoints

| Metric | Current State | Break |
| --- | --- | --- |
| ED Length of Stay | Patient-level duration and local analytics concepts exist. | Not a live whiteboard KPI backed by durable journey events. |
| Ambulance Offload Time | EMS UI computes local offload summaries. | No active backend offload event source or percentile endpoint. |
| Wait To Provider | Demo service exists. | Not wired to active Emergency OS routes or backend. |
| Wait To Inpatient Bed | Missing as a measured workflow. | No bed request entity or timestamp model. |
| LWBS | Long-wait risk badge exists. | No LWBS state, action, endpoint, or reported metric. |

## Recommended Fix Order

1. Create a canonical backend flow event model for patient journey, EMS handoff/offload, bed request, and discharge events.
2. Hydrate whiteboard, queues, capacity, referrals, and metrics from backend-first sources.
3. Surface the five revenue KPIs live on the whiteboard and analytics route.
4. Connect reassessment and alert persistence to backend events.
5. Promote optional Mongoose routes only if they become the chosen production backend; otherwise retire them from the active pilot chain.
