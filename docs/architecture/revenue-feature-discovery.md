# Revenue Feature Discovery

Generated: 2026-06-12

Mode: discovery and ranking only. No implementation changes were made.

## Ranking Key

For this report, priorities mean:

- `P0`: already exists and mainly needs wiring to become pilot-useful.
- `P1`: mostly implemented but needs data-source or UI integration work.
- `P2`: backend or UI exists, but the other side is missing/disconnected.
- `P3`: future feature, demo shell, placeholder, or enterprise roadmap.

## Executive Finding

The highest-value hidden opportunity is to activate existing operational intelligence around:

- alerting and notifications
- queue visibility
- capacity/reassessment/EMS event processing
- KPI layer for LOS, door-to-provider, boarding time, offload time, referral delay
- backend-backed operational metrics

This is more valuable for revenue than adding new calculators or experimental AI.

## P0: Already Exists And Needs Wiring

| Feature | Existing Assets | Revenue Value | Wiring Needed |
| --- | --- | --- | --- |
| Operational Notification Engine | `engine/alertEngine.ts`, `AppShell` alert drawer/toasts, `NotificationContext` | Real-time alerts for high waits, reassessment, EMS, capacity, referrals, queue bottlenecks. | Persist alert events, route critical alerts into notification backend, add audit trail. |
| Realtime ED Event Processor | `emergencyRealtimeService`, `store.handleRealtimeEvent` | Live whiteboard and operational visibility. | Provide canonical backend SSE/WS endpoint and align event names/payloads. |
| Queue Visualization | `QueueIntelligencePanel`, store queue selectors | Visible waiting/provider/results/discharge queue operational value. | Hydrate from backend flow events; expose queue metrics endpoint. |
| Capacity Score | `capacityEngine`, `store.computeCapacity`, `CapacityDetailPanel`, capacity route | Administrators buy capacity visibility. | Connect to backend capacity endpoint or create matching stable endpoint. |
| Reassessment Safety | `reassessmentEngine`, reassessment route/drawer, patient detail completion | Waiting-room safety and risk management. | Persist reminders/flags/completions and hydrate route from backend. |
| Emergency Analytics Local Fallback | `buildLocalEmergencyAnalytics`, `EmergencyAnalytics` | Existing LOS/LWBS/queue analytics scaffolding. | Replace fallback with backend event-derived metrics. |
| EMS Pressure UI | `EMSPressureScore`, `EMSPipeline`, EMS alerts | EMS pressure/offload is a spend area. | Normalize EMS backend status/ETA/offload events and consume them in UI. |

## P1: Mostly Implemented

| Feature | Existing Assets | Revenue Value | Work Remaining |
| --- | --- | --- | --- |
| ED KPI Layer | `EmergencyKPILayerService` | Models LOS, door-to-doctor, boarding, offload, referral delay, discharge time. | Convert demo inputs to backend/store event data and mount on whiteboard/analytics. |
| Boarding Intelligence | `boardingIntelligenceEngine`, boarding route | Boarding duration/risk drives bed-flow sales. | Replace demo boarders with real admission/bed-request events. |
| Door-To-Provider Intelligence | `doorToDoctorIntelligenceService` | Directly maps to PIA/wait-to-provider KPI. | Connect to provider-first-seen timestamp and active KPI UI. |
| EMS Offload Command Center | `emsOffloadCommandCenterService` | Directly maps to ambulance offload KPI. | Connect to EMS arrival/handoff complete events. |
| Notification REST Foundation | backend notifications module, Firebase service, frontend preferences | Staff/patient notification infrastructure. | Add ED event producers and scheduler worker; enforce PHI/consent policy. |
| Referral Delay Tracking | `ReferralPanel`, `ReferralHub`, KPI layer | Consult bottleneck and transfer delay visibility. | Add backend status PATCH and duration metrics. |

## P2: Backend Or UI Exists, Other Side Missing

| Feature | Existing Assets | Revenue Value | Gap |
| --- | --- | --- | --- |
| Hospital Map / RTLS Readiness | hospital-map backend module, `hospitalMapService`, `HospitalMapDashboard` | Location readiness for rooms/devices/future RTLS. | Active route is redirected and backend is demo-labeled. |
| Medical IoT / Device Tracking | telemetry backend, `medicalIotService`, `MedicalIotDashboard` | Future device/location alerts. | Active route is redirected and data is demo-only. |
| Fleet / Live Map | fleet backend, fleet pages/services | EMS/transport operations adjacency. | Routes are future-scoped; not tied to ED offload workflow. |
| Backend Capacity Route | optional `/api/capacity/dashboard` | Backend operational score source. | Runtime-gated and not consumed by active UI. |
| Backend EMS Routes | optional `/api/ems/*` | EMS pre-arrival/offload source. | Runtime-gated, status mismatch, no frontend consumer. |
| Backend Reassessment Routes | optional `/api/reassessment/*` | Backend safety queue source. | Runtime-gated and parallel to local engine. |
| Clinical Alerts Demo | clinical-alerts backend and page | Alert center foundation. | Demo-only and not tied to Emergency OS alerts. |

## P3: Future Feature Or Placeholder

| Feature | Existing Assets | Why P3 |
| --- | --- | --- |
| Forecasting / Surge Prediction | `surge-prediction`, `capacity-prediction-engine` metadata | Product metadata only; no concrete event history/model/endpoint. |
| Digital Operations Center | `digitalOperationsCenter.js`, `DigitalOperationsCenter.jsx` | Static/demo command center, route mismatch. |
| Workflow Automation Builder | `workflowAutomationBuilder.js`, `WorkflowAutomationBuilder.jsx` | Preview-only, no persistence/execution worker. |
| Notification Streams / Channel Sends | disabled stream/send-channel helpers | Backend routes disabled/missing. |
| Prometheus/Alertmanager Product Integration | infra configs | Useful for ops, not a user-facing ED flow feature yet. |
| Full RTLS Device/Staff/Patient Tracking | hospital-map/telemetry foundations | Needs real feeds, privacy model, and active routes. |

## Best Quick Activation Sequence

### Step 1: Operational Alerts

Use existing:

- `engine/alertEngine.ts`
- `store.dispatchAlert`
- `AppShell` alert drawer/toasts
- backend notifications module

Goal:

- Convert local alert output into persisted operational notifications.
- Start with high wait, reassessment overdue, EMS arriving soon, capacity red, boarding pressure, and referral delayed.

### Step 2: Realtime Event Backbone

Use existing:

- `src/services/emergencyRealtimeService.js`
- `store.handleRealtimeEvent`
- backend EMS Socket.IO/event concepts

Goal:

- Pick one realtime transport and event envelope.
- Feed patient updates, EMS arrivals, vitals, reassessment, capacity, and queue events into the store.

### Step 3: Revenue KPI Layer

Use existing:

- `EmergencyKPILayerService`
- `buildLocalEmergencyAnalytics`
- `doorToDoctorIntelligenceService`
- `emsOffloadCommandCenterService`
- `boardingIntelligenceEngine`

Goal:

- Surface live backend-backed values for LOS, door-to-provider, boarding time, offload time, LWBS, patients today.

### Step 4: Backend Source Of Truth

Use existing:

- generic patient APIs
- optional EMS/capacity/reassessment routes
- store patient/queue/capacity structures

Goal:

- Stop relying on mock/store-only state for paying pilot metrics.

### Step 5: Hidden Operations Pages

Use existing:

- `HospitalMapDashboard`
- `MedicalIotDashboard`
- `FleetLiveMap`
- `DigitalOperationsCenter`

Goal:

- Keep them hidden/demo-labeled until real feeds or pilot-safe route labels exist.

## Pilot Readiness Opportunity Map

| Opportunity | Readiness | Pilot Impact | Caution |
| --- | --- | --- | --- |
| Persist operational alerts | High | High | Requires alert audit/PHI policy. |
| Live queue metrics | High | High | Needs backend event source. |
| KPI command strip on whiteboard | Medium | Very high | Must avoid demo values in pilot. |
| EMS offload metric | Medium | Very high | Needs EMS event timestamps. |
| Reassessment backend sync | Medium | High | Runtime-gated backend must be resolved. |
| Boarding duration metric | Medium | High | Needs bed request/start timestamp. |
| Hospital map / RTLS | Low-medium | Medium | Demo route should not be sold as live RTLS. |
| Medical IoT / device tracking | Low-medium | Medium | Requires real device feeds. |
| Forecasting | Low | Medium-later | Needs historical event data first. |

## Recommended Next Prompt

```txt
Design the activation plan for existing hidden Emergency OS operational intelligence.

Do not build yet.

Using the discovered artifacts, design the minimum wiring plan for:
- operational notifications
- realtime event backbone
- live queue metrics
- LOS
- door-to-provider
- ambulance offload time
- boarding duration
- LWBS
- reassessment safety
- capacity score

For each, specify:
- existing artifact to reuse
- missing event
- backend endpoint contract
- frontend consumer
- UI placement
- validation test
- privacy/audit requirement
- whether it is P0, P1, P2, or P3

Generate:
docs/architecture/operational-intelligence-activation-plan.md
```

## Bottom Line

CareDroid has enough hidden operational intelligence to justify a focused activation phase. The best revenue move is not to build new modules; it is to wire existing alert, queue, realtime, capacity, reassessment, EMS, and KPI artifacts into a single backend-backed operational truth layer.
