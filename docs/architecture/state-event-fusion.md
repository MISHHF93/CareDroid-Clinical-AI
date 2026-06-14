# State/Event Fusion

## Discovery Method

This pass traced active CareDroid Emergency OS propagation from source mutation to visible UI using targeted reads and focused searches across:

- Frontend canonical stores and shims: `src/store/emergencyStore.ts`, `src/store/emergency-store.ts`.
- API hydration and realtime hooks: `src/hooks/useEmergencyOs.js`, `src/hooks/useCareDroidCentralNode.ts`, `src/hooks/useEmergencyWebSocket.ts`, `src/services/emergencyRealtimeService.js`.
- Active shell and consumers: `src/components/AppShell.tsx`, `src/components/Header.tsx`, `src/components/Sidebar.tsx`, `src/pages/emergency/index.tsx`, `src/components/CopilotPanel.tsx`.
- Active workflow surfaces: EMS, queues, reassessment, capacity, boarding, referrals, analytics, notification and alert surfaces.
- Backend Emergency OS surface: `backend/src/modules/emergency-os/*`, plus websocket/socket registration in `backend/src/api/ems.socket.ts`.

The focus was not to replace existing state reconciliation or event wiring reports. It was to confirm whether source changes reach canonical state, derived central-node context, visible UI, alerts, notifications, and workflow/audit traces.

## Propagation Mechanism Inventory

| Mechanism | Location | Role | Status |
| --- | --- | --- | --- |
| Canonical Zustand store | `src/store/emergencyStore.ts` | Operational source of truth for patients, rooms, capacity, EMS, referrals, alerts, workflow logs, settings, feature flags, queues, central-node inputs, Copilot history. | ACTIVE_CANONICAL |
| Store shim | `src/store/emergency-store.ts` | Re-exports canonical store for legacy imports and reset snapshots. | CONNECTED |
| API hydration hook | `src/hooks/useEmergencyOs.js` | Fetches `/api/emergency/*` envelopes and hydrates canonical store where payloads contain operational state. | FIXED for settings envelopes |
| Central node hook | `src/hooks/useCareDroidCentralNode.ts` | Builds `CareDroidCentralNode` snapshot from store, optionally refreshes backend snapshot, starts SSE/websocket/polling fallback. | CONNECTED |
| Realtime service | `src/services/emergencyRealtimeService.js` | Optional SSE/websocket connection plus polling fallback through central-node refresh. | CONNECTED with polling fallback |
| Standalone websocket hook | `src/hooks/useEmergencyWebSocket.ts` | Raw websocket listener for Emergency OS event envelopes. | FIXED to dispatch event envelopes |
| Browser/custom events | `AppShell`, `Header`, `QueueIntelligencePanel`, `CapacityCrisisMode`, `EmergencyWhiteboard` | Opens command palette, intake, reassessment drawer, clears whiteboard filters. | CONNECTED for UI-only commands |
| Notification provider | `src/contexts/NotificationContext.jsx` | Adapts app notifications into canonical Emergency OS alerts via `dispatchAlert`. | CONNECTED |
| Alert engine | `src/engine/alertEngine.ts` | Adds canonical alert and emits Sonner toast. | CONNECTED |
| Polling engines | `src/engine/reassessmentEngine.ts`, `src/engine/capacityEngine.ts` | Periodically derive flags, alerts, and capacity from store. | CONNECTED |
| Backend Emergency OS API | `backend/src/modules/emergency-os/*` | Fixture/in-memory `/api/emergency/*` envelopes for active Emergency OS routes. | CONNECTED API, no active generic realtime gateway |
| Backend Socket.IO | `backend/src/api/ems.socket.ts` | EMS/edge ambulance socket support, separate from Emergency OS canonical event stream. | MANUAL_REVIEW for event contract alignment |

## Source-To-Consumer Map

### Capacity

Source: `startCapacityEngine`, backend `/api/emergency/capacity`, realtime `capacity_updated`, central-node snapshot.

Propagation: source payload -> `setCapacity` or `hydrateFromApi`/`dispatchWebSocketEvent` -> `store.capacity`, `capacityHistory`, `workflowLogs`, `alerts` -> `useCareDroidCentralNode` -> Header operational strip, Whiteboard stats and crisis banner, Analytics central metrics, Sidebar badges, Copilot prompt context.

Status: CONNECTED.

### EMS

Source: `useEMSIntake`, `addEMSArrival`, `prepareEMSBay`, `convertEMSArrivalToPatient`, realtime `ems_arrival`/`ems_updated`, EMS pipeline timers.

Propagation: EMS API/realtime/local action -> `emsArrivals`, `emsIncomingPatients`, rooms, patients, capacity, alerts, workflow logs -> EMS Pipeline, Whiteboard EMS cards, EMSCriticalBroadcast, Header EMS metric, Sidebar EMS badge, Copilot central context.

Status: CONNECTED. Socket.IO backend EMS support exists, but no canonical frontend Socket.IO subscription was introduced in this pass.

### Boarding

Source: patient state `Admission`/`Disposition`, backend `/api/emergency/boarding`, capacity engine, realtime `boarding_updated`.

Propagation: patient movement or boarding payload -> `patients`, `boardingMetrics`, capacity, alerts, workflow logs -> CapacityCrisisMode, Header boarders metric, Whiteboard boarding filter/stat, Analytics boarders metric, Sidebar badge.

Status: CONNECTED.

### Queue Filter

Source: `QueueIntelligencePanel`, Whiteboard mission controls, CapacityCrisisMode reassessment action, command palette clear event.

Propagation: `setQueueFilter`/`setActiveQueueFilter` -> `store.activeQueueFilter` -> Whiteboard visible patient filter and filter banner, QueueIntelligencePanel active row, central-node source context.

Status: CONNECTED.

### Reassessment

Source: `startReassessmentEngine`, backend `/api/emergency/reassessment`, patient flags, realtime workflow events with patient payloads.

Propagation: flags/patients -> `patients`, `alerts`, `workflowLogs`, capacity -> ReassessmentDrawer, Header badge, Sidebar badge, Whiteboard immediate tasks, CapacityCrisisMode, Copilot prompt context.

Status: FIXED for single-record realtime patient event payloads.

### Referrals

Source: `ReferralPanel`, backend `POST /api/emergency/referrals`, backend `/api/emergency/referrals`, realtime `referral_created`/`referral_updated`.

Propagation: create/update -> canonical `referrals`, patient timeline, alerts, audit/workflow logs -> ReferralPanel groups and metrics, Header referral metric, Sidebar referral badge, Whiteboard pending-referral filter, Analytics/Central Node pending count, Copilot prompt context.

Status: FIXED. Local-created referral IDs are now sent to the backend and successful backend responses are routed through `dispatchWebSocketEvent`, avoiding local/backend referral drift.

### Alerts/Notifications

Source: `dispatchAlert`, capacity/reassessment/clinical components, NotificationProvider, realtime `alert_created`/`notification`.

Propagation: alert source -> `store.alerts` -> Sonner toast, Header alert drawer/count, Sidebar route badges, central-node operational alerts, Copilot active-alert context, NotificationCenter context projection.

Status: CONNECTED.

### Copilot Messages/Context

Source: CopilotPanel local prompt, backend `/api/emergency/copilot`, realtime `copilot_message`, central-node snapshot.

Propagation: store patients/capacity/alerts/settings/central-node snapshot -> Copilot system prompt. Copilot response -> local panel stream -> canonical `copilotMessages` -> central-node source context. Realtime `copilot_message` -> `copilotMessages` -> CopilotPanel message list.

Status: FIXED for canonical message propagation and realtime-visible Copilot messages.

### Central Node Snapshot

Source: canonical store and optional backend `/api/emergency/central-node/snapshot`.

Propagation: store slices -> `buildCareDroidCentralNodeSnapshot` -> Header central status and strip, Whiteboard command layer, Analytics central metrics, Copilot context. Backend refresh/poll -> `dispatchWebSocketEvent('central_node_snapshot')` -> capacity/alerts/workflow/settings hydration where present.

Status: FIXED for settings/threshold propagation from central-node or settings envelopes.

### Settings Thresholds

Source: Emergency Settings page, backend `/api/emergency/settings`, realtime `settings_updated`/`thresholds_updated`, central-node `tenantSettings`.

Propagation: settings envelope/realtime event -> `saveEmergencySettings` or `hydrateFromApi` -> `emergencySettings` and derived `thresholds` -> capacity engine, reassessment engine, EMS offload threshold, Header/Copilot central context, Settings page draft.

Status: FIXED for generic module hydration and realtime events.

### Patient Movement

Source: `movePatientToState`, Smart Intake vertical slice, EMS conversion, patient detail actions, backend/realtime `patient_created`/`journey_state_changed`.

Propagation: patient payload/action -> `patients`, `rooms`, capacity, audit/workflow logs, alerts where applicable -> Whiteboard, PatientDetailPanel, Header metrics/search, Sidebar badges, ReassessmentDrawer, CapacityCrisisMode, Analytics/Central Node/Copilot.

Status: FIXED for single-record realtime patient events. Backend patient movement endpoints remain fixture/in-memory and are not a full live event stream.

## Disconnected Propagation Findings

1. `referral_created` realtime events were treated as workflow logs only, so a socket event with a single `referral` payload did not update `store.referrals` or visible referral badges until a later full snapshot.
2. `patient_created` and `journey_state_changed` realtime events were treated as workflow logs only, so single `patient` payloads did not update Whiteboard/Header/Sidebar/Copilot unless a later full snapshot arrived.
3. `useEmergencyWebSocket` parsed raw websocket messages and called `hydrateFromApi` directly. Event envelopes such as `{ type, payload }` bypassed event-type dispatch.
4. `useEmergencyOs` did not treat settings envelopes as hydration payloads, leaving threshold changes dependent on the settings page's local fetch path.
5. Realtime settings/threshold event types had no canonical reducer branch.
6. `ReferralPanel` created a local referral and then posted a separate backend payload without preserving the local ID or hydrating the returned backend referral list.
7. Copilot panel responses stayed in panel-local state and workflow logs; canonical `copilotMessages` and realtime Copilot messages were not guaranteed to reach visible panel history.

## Safe Fixes Applied

- Added single-record realtime hydration support for `patient` and `referral` payloads in `src/store/emergencyStore.ts`.
- Routed workflow realtime events through `hydrateFromApi` when they carry operational state, while preserving workflow logs.
- Added realtime settings/threshold handling that updates `emergencySettings` and derived `thresholds`.
- Extended `hydrateFromApi` with `emergencySettings` support.
- Updated `src/hooks/useEmergencyOs.js` so settings envelopes hydrate canonical settings.
- Updated `src/hooks/useEmergencyWebSocket.ts` so socket messages use `dispatchWebSocketEvent`.
- Updated `src/components/ReferralPanel.jsx` so local referral IDs are sent to the backend and successful backend responses hydrate via the existing event dispatcher.
- Updated `src/components/CopilotPanel.tsx` so Copilot responses append to canonical `copilotMessages` and store/realtime Copilot messages render in the panel.
- Added regression coverage in `src/store/emergency-store.test.ts` for single-record realtime patient/referral/settings propagation.

## Pending Parallel Work / Manual Review

- PENDING_PARALLEL_WORK: Existing state reconciliation and event wiring workers may further document or harden broader cross-module state ownership. This pass avoided broad rewrites.
- MANUAL_REVIEW: Backend `backend/src/api/ems.socket.ts` Socket.IO events are not a canonical Emergency OS realtime event stream. Aligning Socket.IO event names with `dispatchWebSocketEvent` should be a separate API contract pass.
- MANUAL_REVIEW: Backend Emergency OS services are fixture/in-memory. Durable persistence, replayable event logs, and multi-client consistency need a persistence/event-stream design before production claims.
- MANUAL_REVIEW: Transfer status persistence currently routes through `/api/emergency/transfers/:id/status` capability gating, while active referral creation uses `/api/emergency/referrals`. Confirm transfer endpoint ownership before expanding sync.
- MANUAL_REVIEW: Analytics still uses `loadEmergencyAnalytics` local fallback and backend aggregate envelopes. It consumes central-node metrics for live command state but is not a real streaming analytics surface.

## Validation Commands And Results

- `npx eslint src/store/emergencyStore.ts src/hooks/useEmergencyOs.js src/hooks/useEmergencyWebSocket.ts src/components/ReferralPanel.jsx src/components/CopilotPanel.tsx src/store/emergency-store.test.ts` - passed.
- `npx tsc --noEmit -p tsconfig.frontend.json` - passed.
- `npx vitest run src/store/emergency-store.test.ts` - initial run exposed missing `referral.patientId` workflow metadata; after fixing, rerun passed with 5 tests.

