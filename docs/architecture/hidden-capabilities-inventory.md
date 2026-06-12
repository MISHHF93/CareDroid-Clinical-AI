# Hidden Capabilities Inventory

Generated: 2026-06-12

Mode: discovery only. No implementation, route mounting, service wiring, endpoint changes, or feature expansion was performed.

## Scope

This audit searched for hidden, partially implemented, disconnected, placeholder, or dead operational intelligence artifacts that could support revenue-generating Emergency OS capabilities:

- notification systems
- alert engines
- queue visualization
- wait time prediction
- forecasting services
- analytics services
- boarding calculations
- EMS pressure calculations
- reassessment scoring
- operational KPIs
- patient tracking
- location tracking
- capacity scoring
- command center dashboards
- workflow engines
- event processors

## Summary

The repository already contains a large amount of operational intelligence. The highest-value hidden assets are not new product ideas; they are existing engines and surfaces that need source-of-truth, route, event, or backend wiring.

| Area | Strongest Hidden Asset | Current Classification | Quick Activation Potential |
| --- | --- | --- | --- |
| Operational notifications | `engine/alertEngine.ts` plus `AppShell` alert drawer/toasts | implemented locally | P0 |
| Realtime event processing | `src/services/emergencyRealtimeService.js` plus `store.handleRealtimeEvent` | partially implemented / disconnected | P0 |
| ED KPI metrics | `src/services/emergencyKpiLayerService.js` | placeholder/demo | P1 |
| Local analytics fallback | `src/services/emergencyAnalyticsApi.js` | partially implemented | P0 |
| Boarding intelligence | `src/services/boardingIntelligenceEngine.js` | placeholder/demo | P1 |
| EMS offload / pressure | `EMSPressureScore`, `emsOffloadCommandCenterService`, `EMSPipeline` | partially implemented | P1 |
| Door-to-provider | `doorToDoctorIntelligenceService.js` | disconnected/demo | P1 |
| Queue intelligence | `QueueIntelligencePanel`, store selectors, `queueIntelligenceService.js` | implemented local / partial | P0 |
| Reassessment scoring | `engine/reassessmentEngine.ts`, store reminders/flags, backend reassessment routes | implemented local / backend disconnected | P0 |
| Capacity scoring | `engine/capacityEngine.ts`, `store.computeCapacity`, `CapacityDetailPanel` | implemented local / backend disconnected | P0 |
| Notification REST/preferences | backend notifications module plus frontend preferences | partially implemented | P1 |
| Hospital map / RTLS foundation | hospital map backend module and frontend dashboard/service | disconnected/demo | P2 |
| Medical IoT / device telemetry | backend telemetry module and frontend dashboard/service | disconnected/demo | P2 |
| Fleet/live map | fleet backend modules and frontend fleet pages/services | disconnected/demo | P2 |
| Digital operations center | `digitalOperationsCenter.js`, `DigitalOperationsCenter.jsx` | placeholder/disconnected | P3 |
| Workflow automation builder | `workflowAutomationBuilder.js`, `WorkflowAutomationBuilder.jsx` | placeholder | P3 |
| Prometheus/Alertmanager configs | `config/prometheus`, `config/alertmanager` | implemented external config | P3 |

## Detailed Artifact Inventory

| Artifact | Classification | Trace | Chain Status | Rank |
| --- | --- | --- | --- | --- |
| `engine/alertEngine.ts` | implemented | Artifact -> `deriveAlerts`, `dispatch`, `registerAlertDispatcher`; Service/Event -> reassessment, capacity, EMS, referral, long-wait, queue alerts; API -> none required locally; UI -> `AppShell` alert drawer/toasts | Mounted and active, but not backend-persisted. | P0 |
| `src/utils/vitalsAlertPipeline.js` | implemented | Artifact -> vitals threshold evaluator; Service/Event -> `store.addVitals` creates `VitalsAlertFired`; API -> realtime can ingest vitals events; UI -> patient detail/AppShell alerts | Active local deterioration alerting. | P0 |
| `src/services/emergencyRealtimeService.js` | partially implemented / disconnected | Artifact -> SSE/WebSocket/polling client; Service/Event -> normalizes realtime event envelopes; API -> env-configured SSE/WS paths; UI -> store realtime connection and Emergency OS updates | Frontend processor exists; matching backend SSE/default WS route is not established. | P0 |
| `backend/src/api/ems.socket.ts` | partially implemented / disconnected | Artifact -> Socket.IO whiteboard event emitter; Service/Event -> EMS alert/status/arrival events; API -> optional EMS Express runtime; UI -> no matching Socket.IO client | Backend emits events that frontend does not subscribe to. | P0 |
| `store/emergencyStore.ts` `handleRealtimeEvent` | partially implemented | Artifact -> store realtime event reducer; Service/Event -> patient/EMS/vitals/lab/reassessment events; API -> `emergencyRealtimeService`; UI -> all Emergency OS store consumers | Good client ingestion point; backend event source not canonical. | P0 |
| `src/services/emergencyAnalyticsApi.js` | partially implemented | Artifact -> local analytics builder and guarded backend calls; Service/Event -> shift stats, LOS, LWBS text scan, queue performance; API -> disabled `/api/emergency/analytics`, `/capacity/history`, `/queues/analytics`; UI -> `EmergencyAnalytics`, `QueueIntelligencePanel`, capacity history | Local analytics exists; backend analytics endpoints disabled. | P0 |
| `src/components/QueueIntelligencePanel.jsx` | implemented local | Artifact -> visible queue dashboard; Service/Event -> store queue selectors and bottleneck alert; API -> optional analytics fallback; UI -> `/emergency/queues` and whiteboard | Active UI; no live backend queue endpoint. | P0 |
| `engine/capacityEngine.ts` and `store.computeCapacity` | implemented local | Artifact -> capacity score/deductions; Service/Event -> occupancy, boarding, reassessment, EMS pressure; API -> optional `/api/capacity/dashboard` disconnected; UI -> capacity route/badge/panel | Active local capacity intelligence. | P0 |
| `engine/reassessmentEngine.ts` and store reminders | implemented local | Artifact -> reassessment safety engine; Service/Event -> due/overdue reminders, flags, completion; API -> optional `/api/reassessment/*` disconnected; UI -> reassessment route/drawer/patient detail | Active local workflow; backend chain disconnected. | P0 |
| `src/components/EMSPressureScore.jsx` | implemented local | Artifact -> EMS pressure score; Service/Event -> incoming EMS and offload pressure; API -> none; UI -> `EMSPipeline` | Active UI score; no backend persistence. | P1 |
| `src/services/emsOffloadCommandCenterService.js` | placeholder/demo | Artifact -> EMS offload dashboard service; Service/Event -> offload delay demo metrics; API -> none active; UI -> not active Emergency OS route source | Useful model for future backend-backed offload KPIs. | P1 |
| `src/services/doorToDoctorIntelligenceService.js` | disconnected/demo | Artifact -> wait-to-provider/door-to-doctor intelligence; Service/Event -> demo delay calculations; API -> none active; UI -> not active route metric | Directly maps to revenue KPI but not connected. | P1 |
| `src/services/emergencyKpiLayerService.js` | placeholder/demo | Artifact -> unified ED KPI layer; Service/Event -> composes door-to-doctor, LOS, boarding, EMS offload, referral delay, discharge time; API -> none; UI -> not canonical active metric source | Valuable hidden KPI contract; demo data only. | P1 |
| `src/services/boardingIntelligenceEngine.js` | placeholder/demo | Artifact -> boarding risk, metrics, longest boarders, recommendations; Service/Event -> demo boarders/pending beds; API -> none; UI -> active boarding route uses store instead | Good calculation model, disconnected from active route/backend. | P1 |
| `backend/src/modules/notifications` | partially implemented | Artifact -> notification entities/controller/service; Service/Event -> preferences, unread, device registration, FCM; API -> `/api/notifications/*`; UI -> notification preferences | Backend REST foundation exists; ED domain producers/scheduler missing. | P1 |
| `src/contexts/NotificationContext.jsx` and `useNotificationActions` | implemented | Artifact -> local toast/notification context; Service/Event -> local UI notifications and alert dispatch; API -> optional notification APIs; UI -> mounted in app providers | Local UX ready; not tied to ED operational notification backend. | P1 |
| `backend/src/modules/clinical-alerts` | placeholder/demo | Artifact -> demo clinical alerts; Service/Event -> list/ack/dismiss demo alerts; API -> `/api/clinical/alerts`; UI -> `ClinicalAlertsPage` | Explicitly not bedside alarm source. | P2 |
| `backend/src/api/capacity.routes.ts` and `backend/src/services/capacity.service.ts` | partially implemented / disconnected | Artifact -> optional Mongoose capacity dashboard; Service/Event -> Patient model metrics; API -> `/api/capacity/dashboard` gated; UI -> no active consumer | Backend exists but inactive/gated and shape differs. | P2 |
| `backend/src/api/reassessment.routes.ts`, `backend/src/services/reassessment.service.ts` | partially implemented / disconnected | Artifact -> optional reassessment backend; Service/Event -> due/reassess/dismiss; API -> `/api/reassessment/*` gated; UI -> no active consumer | Backend exists but UI uses independent local engine. | P2 |
| `backend/src/modules/hospital-map` and `src/services/hospitalMapService.js` | disconnected/demo | Artifact -> floors/rooms/devices/location snapshot; Service/Event -> room/device location normalization; API -> `/api/hospital-map/*`; UI -> `HospitalMapDashboard`, route redirected | Strong RTLS foundation but not active pilot route. | P2 |
| `backend/src/modules/telemetry` and `src/services/medicalIotService.js` | disconnected/demo | Artifact -> device telemetry/alerts; Service/Event -> demo vitals/trends/device alerts; API -> `/api/devices/live`, `/api/telemetry/live`, `/api/alerts/devices`; UI -> `MedicalIotDashboard`, route redirected | Device tracking foundation, demo-only. | P2 |
| `backend/src/modules/fleet`, `src/pages/fleet/*`, `fleetTelemetryService.js` | disconnected/demo | Artifact -> fleet live map/routes/alerts; Service/Event -> demo vehicle/route/freshness; API -> `/api/fleet/*`; UI -> fleet pages, routes redirected | Useful EMS/transport adjacent surface, not active ED pilot. | P2 |
| `src/data/digitalOperationsCenter.js` and `DigitalOperationsCenter.jsx` | placeholder/disconnected | Artifact -> operations surfaces registry; Service/Event -> static snapshot/search; API -> none; UI -> route redirected | Command-center shell exists, not live. | P3 |
| `src/data/workflowAutomationBuilder.js` and `WorkflowAutomationBuilder.jsx` | placeholder | Artifact -> workflow builder UI/data; Service/Event -> preview-only rules; API -> none; UI -> route redirected | No worker/persistence/execution. | P3 |
| `config/prometheus/alert.rules.yml`, `config/alertmanager/config.yml` | implemented external config | Artifact -> infra alert config; Service/Event -> Prometheus/Alertmanager; API -> external; UI -> no app integration | Ops observability, not Emergency OS product feature yet. | P3 |
| `src/services/NotificationService.js` `subscribeToNotifications` | disconnected placeholder | Artifact -> intended notification SSE stream; Service/Event -> `/api/notifications/stream`; API -> disabled; UI -> callback consumers possible | No backend stream route. | P3 |
| `src/services/notifications/NotificationService.js` channel send | disconnected | Artifact -> channel send helper; Service/Event -> `/api/notifications/send/:channel`; API -> disabled; UI -> none active | No backend send-channel route. | P3 |

## Hidden Value Concentration

The repo’s hidden value is concentrated in three places:

1. Existing store-derived Emergency OS engines: alerts, queue, reassessment, capacity, EMS pressure.
2. Demo/placeholder KPI engines that already model hospital-buyer metrics: LOS, door-to-provider, boarding, EMS offload, referral delay.
3. Disconnected operations modules: hospital map, medical IoT, fleet/live tracking, notifications, and operations center.

The fastest pilot path is to connect the first two groups to a backend event model before activating broader route surfaces from the third group.
