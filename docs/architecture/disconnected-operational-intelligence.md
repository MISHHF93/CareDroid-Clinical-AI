# Disconnected Operational Intelligence

Generated: 2026-06-12

Mode: discovery only. No code was changed.

## Executive Summary

CareDroid already contains the raw parts of an operational intelligence platform, but they are split across local Zustand-derived Emergency OS workflows, optional Mongoose APIs, demo services, redirected pages, and disabled backend capabilities.

The recurring disconnect is not UI absence. It is that operational intelligence does not consistently flow through:

`Artifact -> Service -> Event -> API -> UI`

Most artifacts stop at one of these points:

- event exists but has no backend persistence
- service exists but is demo/static
- API exists but is disabled, optional, or not called
- UI exists but is redirected as a future route
- UI is mounted but uses local/store data instead of backend events

## P0 Disconnections: Already Exists, Needs Wiring

| Feature | Artifact | Service | Event | API | UI | Break |
| --- | --- | --- | --- | --- | --- | --- |
| Operational Notification Engine | `engine/alertEngine.ts` | `deriveAlerts`, `dispatch`, `registerAlertDispatcher` | Reassessment, capacity, EMS, referral, long-wait, queue alerts | None active for persistence | `AppShell` alert drawer/toasts | Alerts are local/store-derived and not persisted or routed through notification backend. |
| Realtime Event Processor | `src/services/emergencyRealtimeService.js` | SSE/WS/poll normalizer | Generic normalized event envelope | Env-configured SSE/WS only | Store `handleRealtimeEvent` -> Emergency OS UI | Frontend processor exists, but no canonical backend realtime endpoint/default transport. |
| EMS Socket Events | `backend/src/api/ems.socket.ts` | Socket.IO emitter | `ems_alert_received`, `ems_status_updated`, `ems_arrival_confirmed` | Optional EMS runtime | Intended whiteboard | Frontend does not subscribe to Socket.IO whiteboard events; frontend realtime expects different event envelopes. |
| Queue Visualization | `QueueIntelligencePanel`, `store.computeQueues` | Store queue selectors | Patient state/flag changes | Disabled `/api/emergency/queues/analytics` | `/emergency/queues`, whiteboard panel | Queue intelligence is local only. |
| Capacity Scoring | `engine/capacityEngine.ts`, `store.computeCapacity` | Store-derived capacity score | Patient/room/EMS/reassessment changes | Optional `/api/capacity/dashboard`, disabled capacity history | AppShell badge/panel, `/emergency/capacity` | Active UI does not consume backend capacity endpoint/history. |
| Reassessment Safety | `engine/reassessmentEngine.ts`, store reminders | Reassessment flags/reminders/completion | `FlagAdded`, `ReassessmentReminder*`, vitals events | Optional `/api/reassessment/*` | `/emergency/reassessment`, drawer, patient detail | Backend reassessment service and frontend reassessment engine are parallel systems. |
| Local Emergency Analytics | `emergencyAnalyticsApi.buildLocalEmergencyAnalytics` | Shift/queue/capacity local analytics | Patient timelines, queues, capacity | Disabled `/api/emergency/analytics` | `/emergency/analytics`, capacity history, queue panel | Analytics works as client fallback, not backend operational truth. |

## P1 Disconnections: Mostly Implemented

| Feature | Artifact | Service | Event | API | UI | Break |
| --- | --- | --- | --- | --- | --- | --- |
| Notification REST Foundation | `backend/src/modules/notifications` | Notification service, Firebase service, preferences | Notification entities/device tokens | `/api/notifications/*` | Notification preferences | ED alert producers and scheduler worker are missing; local alert engine does not feed this module. |
| Frontend Notification Context | `NotificationContext`, `useNotificationActions` | Local toast and action helpers | UI notification events | Optional notification APIs | Global notification toasts | Good local UX but not connected to operational event stream. |
| ED KPI Layer | `src/services/emergencyKpiLayerService.js` | Composes door-to-doctor, LOS, boarding, EMS offload, referral delay | Demo service signals | None | Not active canonical UI source | Excellent metric contract, but all metrics are demo/local snapshots. |
| Boarding Intelligence | `src/services/boardingIntelligenceEngine.js` | Boarding risk, metrics, recommendations | Demo boarders/pending beds | None | Active boarding route uses store instead | Calculation model is disconnected from active route/backend. |
| EMS Offload Command Center | `src/services/emsOffloadCommandCenterService.js` | Demo offload metrics | Demo ambulance handoff data | None | `EMSPipeline` uses store/offload calculations instead | Useful model but not active backend event source. |
| Door-To-Doctor Intelligence | `src/services/doorToDoctorIntelligenceService.js` | Door-to-provider delays | Demo arrival/triage/provider timestamps | None | Not surfaced in active Emergency OS | Direct revenue KPI exists as demo service only. |
| Backend Reassessment Scheduler | `backend/src/scheduler/reassessment.scheduler.ts` | Cron-style overdue reassessment update | Appends patient alert strings | Optional Mongoose data path | No frontend consumer | Backend scheduler does not feed active store/UI. |
| Clinical Alerts Demo | `backend/src/modules/clinical-alerts` | Demo alert list/ack/dismiss | Static/demo alert state | `/api/clinical/alerts` | `ClinicalAlertsPage` | Explicit demo mode; not Emergency OS operational alerting. |

## P2 Disconnections: Backend Or UI Exists, Other Side Missing

| Feature | Artifact | Service | Event | API | UI | Break |
| --- | --- | --- | --- | --- | --- | --- |
| Hospital Map / RTLS | `backend/src/modules/hospital-map`, `hospitalMapService` | Room/device/floor/location normalization | Location/maintenance/read audit events | `/api/hospital-map/*` | `HospitalMapDashboard` | UI route is redirected from active app; backend is demo contract only. |
| Medical IoT / Device Telemetry | `backend/src/modules/telemetry`, `medicalIotService` | Telemetry/device/alert services | Demo vitals, trends, device alerts | `/api/devices/live`, `/api/telemetry/live`, `/api/alerts/devices` | `MedicalIotDashboard` | Route redirected; demo telemetry only. |
| Fleet / Live Map | `backend/src/modules/fleet`, `fleetTelemetryService`, fleet pages | Fleet vehicle/route/alert services | Fleet alerts/freshness/route events | `/api/fleet/*` | `FleetDashboard`, `FleetLiveMap`, `LiveTrackingMap` | Routes redirected or future-scoped; not active Emergency OS flow. |
| Device Fleet Management | `DeviceFleetManagement`, hospital map/device APIs | Device inventory/maintenance concepts | Device status/maintenance events | Demo hospital map/device endpoints | `/devices` page exists | Route redirected from active app. |
| Operations Center | `digitalOperationsCenter.js`, `DigitalOperationsCenter.jsx` | Static operations surface registry | None | None | Operations center page | Static/demo snapshot and route mismatch. |
| Capacity Backend | `backend/src/api/capacity.routes.ts`, `capacity.service.ts` | Mongoose capacity dashboard | Patient status-derived metrics | `/api/capacity/dashboard` optional | Active UI uses store | Backend exists but gated and shape-mismatched. |
| EMS Backend | `backend/src/api/ems.routes.ts`, `ems.service.ts` | Mongoose EMS alert/status/arrival | Socket.IO EMS events | `/api/ems/*` optional | Active UI uses store/demo fleet snapshot | Runtime-gated and status vocabulary mismatch. |

## P3 Disconnections: Future Or Dead/Placeholder

| Feature | Artifact | Current State | Break |
| --- | --- | --- | --- |
| Wait-time forecasting | `surge-prediction`, `capacity-prediction-engine` metadata | Placeholder | No concrete model, service, endpoint, or active UI. |
| Workflow automation builder | `workflowAutomationBuilder.js`, `WorkflowAutomationBuilder.jsx` | Preview-only placeholder | No save, queue, worker, event processor, or active pilot route. |
| Automation registry | `automationRegistry.js` | Product/catalog metadata | No runtime worker loop found. |
| Notification stream | `NotificationService.subscribeToNotifications` | Placeholder | `/api/notifications/stream` disabled/missing. |
| Notification channel sends | `src/services/notifications/NotificationService.js` | Disconnected helper | `/api/notifications/send/:channel` disabled/missing. |
| Prometheus/Alertmanager app integration | `config/prometheus`, `config/alertmanager` | External infra config | Not integrated into Emergency OS UI or alert engine. |
| Dead duplicate reassessment engine | `src/services/ReassessmentEngine.js` | Duplicate/test-only | Active system uses `engine/reassessmentEngine.ts`. |

## Revenue Metric Breaks

| Metric | Existing Pieces | Break |
| --- | --- | --- |
| LOS | `buildLocalEmergencyAnalytics`, `EmergencyKPILayerService`, journey timeline | Not backend-backed and not surfaced as live whiteboard KPI. |
| Door-to-provider | `doorToDoctorIntelligenceService`, KPI layer | Demo/disconnected from active route and backend events. |
| Ambulance offload | `EMSPipeline`, `EMSPressureScore`, `emsOffloadCommandCenterService` | UI local/demo only; no durable offload endpoint/event source. |
| Boarding time | `boardingIntelligenceEngine`, capacity/boarding route | Demo service disconnected from active route; no bed request/timestamp model. |
| LWBS | `longWaitRescue`, local analytics text scan | No LWBS state/action/backend metric. |
| Wait-to-bed | `PatientState.Admission`, `PendingAdmission`, boarding route | No bed request entity or wait-start/assigned/in-bed event chain. |

## Activation Guidance

Fastest operational intelligence activation should not mount every hidden page. The safest order is:

1. Persist/stream the existing alert engine outputs.
2. Connect realtime event processor to one backend event source.
3. Promote local analytics/KPI layer to backend-backed ED metrics.
4. Wire capacity/reassessment/EMS optional backend paths only after choosing canonical runtime.
5. Keep hospital map, IoT, fleet, and operations center demo-labeled until real feeds exist.

## Bottom Line

The project already contains the building blocks for a revenue-grade operational intelligence platform. The blocker is not the absence of code; it is fragmented ownership between local store, optional Mongoose APIs, demo services, disabled backend capabilities, and redirected UI surfaces.
