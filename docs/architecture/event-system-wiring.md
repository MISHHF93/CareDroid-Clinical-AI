# Event System Wiring

Date: 2026-06-14

## Scope

This pass traced event-driven behavior across the active CareDroid Emergency OS frontend and backend:

- Browser/custom events: `document.dispatchEvent`, `window.dispatchEvent`, keyboard listeners, route popstate shims, and command-palette actions.
- Realtime transports: Emergency OS polling/SSE/WebSocket service, legacy websocket hook, generic websocket manager, Socket.IO EMS support, notification SSE.
- Polling and timers: central-node polling, reassessment and capacity engines, clocks/freshness timers, EMS broadcast timers, health polling.
- Notifications and alerts: `dispatchAlert`, `NotificationProvider`, `NotificationService`, header alert drawer, Sonner toasts.
- Workflow/audit streams: store `workflowLogs`, backend `WorkflowActionLogService`, central-node recent events, automation/audit services.
- Backend event patterns: Emergency OS controller/services, EMS Socket.IO registration, reassessment scheduler, surge EventEmitter.

The active product spine remains:

```text
single AppShell
  -> single canonical route system
  -> canonical Emergency OS store
  -> Emergency OS API facade
  -> backend Emergency OS controller/services
  -> existing alert/notification surfaces
```

## Discovered Mechanisms

| Mechanism | Source | Event / trigger | Consumer | State or API side effect | Visible UI update | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Central-node realtime fallback | `Header` -> `useCareDroidCentralNode({ realtime: true })` -> `startEmergencyRealtime()` | Polls `/api/emergency/central-node/snapshot` every 30s unless SSE/WS env path is configured | `useEmergencyStore.dispatchWebSocketEvent()` | Hydrates capacity, alerts, workflow logs, queues/referrals/EMS when present; updates websocket status | Header central status, alert drawer, whiteboard/capacity views, central sync freshness | Fixed |
| Emergency realtime SSE/WS | `startEmergencyRealtime()` | Configured `VITE_ED_REALTIME_SSE_PATH` or `VITE_ED_REALTIME_WS_PATH` messages | Store `dispatchWebSocketEvent()` | Routes snapshot, alert, workflow, capacity, EMS, queue, referral, copilot, integration events | Existing store subscribers update active UI | Fixed for canonical event names |
| Legacy Emergency WS hook | `useEmergencyWebSocket.ts` | `message` from `/api/emergency/realtime` | Direct `hydrateFromApi()` | Would hydrate store if mounted | No active mount found in active AppShell | Manual review: obsolete or align with realtime service |
| Reassessment interval | `AppShell.tsx` startup | `startReassessmentEngine()` every 60s | Store `addFlag` / `removeFlag`, `dispatchAlert()` | Adds reassessment, long-wait, LWBS, high-risk, deterioration flags | Header/sidebar badges, reassessment drawer, whiteboard, alert drawer/toasts | Connected |
| Capacity interval | `AppShell.tsx` startup | `startCapacityEngine()` every 30s | Store `setCapacity()`, `dispatchAlert()` | Recomputes capacity snapshot and emits Orange/Red alerts | Header capacity strip, capacity page, crisis mode, alert drawer/toasts | Connected |
| Command palette events | `AppShell.tsx`, `CommandPalette.tsx`, `Header.tsx` | `open-command-palette`, `open-intake`, `clear-whiteboard-filters`, route actions | AppShell, whiteboard page, router | Opens panels, navigates canonical routes, selects patients | Palette, intake modal, queue filters, patient detail | Connected |
| Reassessment drawer events | Header, whiteboard, patient cards, capacity crisis mode | `open-reassessment-drawer`, `open-reassessment`, `close-all-panels` | `AppShell.tsx`, `ReassessmentDrawer.tsx` | Opens/closes drawer, selects patient when provided through store | Drawer and badges update from store flags | Connected |
| Discharge panel event | Header and patient card | `open-patient-discharge` | `PatientDetailPanel.tsx` | Opens discharge confirmation for selected patient | Patient detail panel action state | Connected |
| AI calculator launch | `ChatInterface.jsx`, `lib/ai/toolRegistry.ts` | `ed:open-calculator` | Active AppShell listener was found only in `src/layout/AppShell.jsx`, not active `src/components/AppShell.tsx` | Intended to navigate/open calculator | In active Emergency OS shell this is not fully connected | Manual review |
| Scenario selection event | Store `setActiveScenario()` | `ed:scenario-selected` | No active listener found | Scenario state changes directly through store; event is informational | Store-backed UI updates after scenario state set | Manual review: emitted without listener |
| Notifications context | `NotificationProvider`, `NotificationService`, notification toast compat | `addNotification`, `sendBrowserNotification`, `useToasts()` | `dispatchAlert()` and store `alerts` | Adds canonical alert instead of separate notification queue | Sonner toast, Header alert badge/drawer, notification consumers | Connected |
| Notification SSE | `NotificationService.subscribeToNotifications()` | `/api/notifications/stream` EventSource | Caller callback, gated by backend capability | Stream is disabled/gated when capability unavailable and records blocked automation audit | No active Emergency OS subscription found | Manual review |
| Backend Emergency OS workflow logs | Backend controller/service | `GET /api/emergency/workflow-logs`, central-node `recentEvents` | `useEmergencyOs` hooks and fixed realtime snapshot path | Hydrates store `workflowLogs` | Workflow views and central node recent events | Fixed for realtime snapshot path |
| Backend EMS Socket.IO | `backend/src/api/ems.socket.ts` | `join-whiteboard`, `edge-ai/ambulance:*`, `analyze-ultrasound`, `monitor-vitals` | Socket.IO clients, if separately connected | Emits ready/result/error messages | No active frontend Socket.IO client found for Emergency OS | Manual review |
| Backend reassessment scheduler | `backend/src/scheduler/reassessment.scheduler.ts` | Cron every minute | Mongo patient `alerts` array | Adds backend model alert text | Not routed into active Emergency OS store except through future backend reads | Manual review |
| Backend surge EventEmitter | `backend/src/services/surge-capacity.service.ts` | `surge_activated`, `batch_ems_intake` | No listener found in active Emergency OS path | Persists surge/patient changes and emits internal events | Not surfaced through active Emergency OS realtime | Manual review |
| Generic websocket manager | `src/services/websocket/WebSocketManager.js` | Message type subscriptions, heartbeat, reconnect | Cost/collaboration services | Routes generic message handlers | Not part of active Emergency OS store | Separate channel; leave isolated |

## Source-To-Consumer Map

### Active Emergency OS Realtime

```text
Header
  -> useCareDroidCentralNode({ realtime: true })
  -> startEmergencyRealtime()
  -> SSE/WS message or polling fallback
  -> dispatchWebSocketEvent()
  -> hydrateFromApi() / store actions
  -> Header, Sidebar, Whiteboard, Capacity, EMS, Referrals, Copilot, alerts
```

Supported canonical event families after this pass:

- Snapshot events: `emergency_snapshot`, `emergency_state`, `whiteboard_snapshot`, `whiteboard_updated`, `central_node_snapshot`, `central_node_updated`.
- Alert events: `alert_created`, `alert_updated`, `emergency_alert`, `notification`.
- Workflow events: `workflow_log`, `workflow_log_created`, `workflow_event`, `audit_event`, `patient_created`, `journey_state_changed`, `reassessment_created`, `reassessment_completed`, `referral_created`.
- Operational updates: `capacity_updated`, `capacity_changed`, `capacity_score_changed`, `boarding_updated`, `boarding_changed`, `boarding_started`, `ems_arrival`, `ems_arrival_created`, `ems_incoming`, `ems_updated`, `queue_updated`, `queue_changed`, `queues_updated`, `referral_updated`, `referrals_updated`.
- Copilot and integration events: existing `copilot_message`, `copilot_response`, `copilot_query_completed`, `integration_event`, `integration_event_received`, `integration_updated`.

### Active Browser Event Chains

| Source | Event | Consumer | Result | Status |
| --- | --- | --- | --- | --- |
| `Header`, keyboard shortcuts, command palette | `open-command-palette` | `AppShell.tsx` | Opens command palette | Connected |
| `Header`, keyboard `n`, command palette, whiteboard action | `open-intake` | `EmergencyWhiteboard` page | Opens central intake modal | Connected |
| Escape key and panel actions | `close-all-panels` | `AppShell`, `Header`, `EmergencyWhiteboard` | Closes palette/drawer/intake/alerts/workload | Connected |
| Header, whiteboard, patient cards, crisis mode | `open-reassessment-drawer` | `AppShell` | Opens reassessment drawer | Connected |
| Header/patient card | `open-patient-discharge` | `PatientDetailPanel` | Opens discharge confirmation | Connected |
| Patient detail navigation helpers | `popstate` | React Router browser history | Forces route update after pushState | Connected |
| Chat / AI tool launch | `ed:open-calculator` | Only old `layout/AppShell.jsx` listener found | Calculator launch from active shell is disconnected | Manual review |
| Store scenario selection | `ed:scenario-selected` | No active listener found | Direct store state already changes | Manual review |

### Alert And Notification Chain

```text
reassessment/capacity/calculator/API error/notification source
  -> dispatchAlert()
  -> useEmergencyStore.addAlert()
  -> Sonner toast
  -> NotificationProvider notifications projection
  -> Header alert badge/drawer
  -> Copilot active alert context
```

This chain is connected. The realtime fix now also lets backend `operationalAlerts` and alert events enter this same chain through the canonical store, rather than staying only in central-node snapshot metadata.

### Backend Event Sources

| Backend source | Mechanism | Active consumer | Status |
| --- | --- | --- | --- |
| `EmergencyOsController` | REST envelopes for whiteboard, patients, queues, reassessment, capacity, boarding, referrals, workflow logs, central-node snapshot | `emergencyOsApi`, `useEmergencyOs`, central-node polling | Connected |
| `CareDroidCentralNodeService` | Snapshot with `capacityStatus`, `operationalAlerts`, `queueMetrics`, `recentEvents` | Central-node polling now dispatches `central_node_snapshot` | Fixed |
| `registerEMSWebSocketSupport()` | Socket.IO `join-whiteboard` | No active frontend client found | Manual review |
| `registerEdgeAIAmbulanceWebSocketSupport()` | Socket.IO edge ambulance ready/result/error | No active Emergency OS frontend client found | Manual review |
| `ReassessmentScheduler` | Cron writes Mongoose patient `alerts` | No direct active Emergency OS event bridge | Manual review |
| `SurgeCapacityService` | Node `EventEmitter` emits `surge_activated`, `batch_ems_intake` | No listener found in active Emergency OS path | Manual review |

## Fixes Applied

### Central-Node Polling Hydrates Canonical Store

Before:

```text
startEmergencyRealtime polling
  -> fetchCareDroidCentralNodeSnapshot()
  -> setBackendSnapshot()
  -> setWebSocketStatus()
  -> active store fields unchanged
```

After:

```text
startEmergencyRealtime polling
  -> fetchCareDroidCentralNodeSnapshot()
  -> dispatchWebSocketEvent({ type: 'central_node_snapshot' })
  -> hydrateFromApi()
  -> capacity, alerts, workflowLogs, queues/referrals/EMS if present
  -> existing UI subscribers update
```

Changed file: `src/hooks/useCareDroidCentralNode.ts`

### Realtime Events Route Through Existing Store Actions

`dispatchWebSocketEvent()` now handles common Emergency OS event families and maps them into existing state/actions:

- Snapshot events hydrate the canonical store using `hydrateFromApi()`.
- Alert/notification events call `addAlert()` with normalized severity/source metadata.
- Workflow/audit events merge into `workflowLogs`.
- Capacity events update capacity metrics and full capacity snapshot when the event contains snapshot-like fields.
- Capacity, boarding, EMS, queue, and referral updates can synthesize canonical store alerts for existing alert drawer/toast consumers when their payloads carry alert-worthy operational pressure.
- EMS, queue, referral, copilot, and integration events route to existing store fields/actions.

Changed file: `src/store/emergencyStore.ts`

### Partial Realtime Hydration Preserves Local State

`hydrateFromApi()` now merges incoming alerts and workflow logs by id instead of replacing the full arrays. This keeps local interval-generated alerts and user-session workflow entries visible when a partial backend snapshot arrives.

Changed file: `src/store/emergencyStore.ts`

### Focused Test Coverage

Added a store test proving a central-node snapshot event updates the canonical capacity snapshot, alert list, workflow log list, and websocket freshness fields.

Changed file: `src/store/emergency-store.test.ts`

## Remaining Disconnected Or Manual-Review Chains

- `useEmergencyWebSocket.ts` is not mounted in the active shell and directly calls `hydrateFromApi()`. It should either be removed as legacy or changed to delegate to `dispatchWebSocketEvent()` before mounting anywhere.
- `ed:open-calculator` is emitted by chat/AI tools, but the listener found is in old `src/layout/AppShell.jsx`, while active routing uses `src/components/AppShell.tsx`. This needs a product decision on how calculator launch should work in the current Emergency OS shell.
- `ed:scenario-selected` is emitted by the store with no active listener. The store mutation itself updates state, so the custom event appears informational unless another consumer is planned.
- Backend Socket.IO EMS/edge ambulance support has no active frontend client in the Emergency OS path. Keep as external integration support or bridge into `startEmergencyRealtime()` later.
- Backend `ReassessmentScheduler` writes legacy/Mongoose patient alerts, but those alerts do not automatically enter the active Emergency OS store unless exposed through the active Emergency OS REST/realtime envelope.
- `SurgeCapacityService` emits internal Node events with no active listener. If surge mode becomes active product surface, bridge these through the Emergency OS controller/realtime snapshot rather than adding another frontend bus.
- Notification SSE is gated by backend capability and no active Emergency OS subscriber was found. Existing notification UI is connected through store alerts; do not enable the SSE channel without routing notifications into `dispatchAlert()`/store alerts.

## Validation

Commands run:

```text
npx vitest run "src/store/emergency-store.test.ts"
npm run typecheck:frontend
npx eslint "src/store/emergencyStore.ts" "src/hooks/useCareDroidCentralNode.ts" "src/store/emergency-store.test.ts"
```

Results:

- `src/store/emergency-store.test.ts`: passed, 1 file / 4 tests.
- `npm run typecheck:frontend`: passed.
- Targeted ESLint on touched files: passed.

## Files Changed

- `src/store/emergencyStore.ts`
- `src/hooks/useCareDroidCentralNode.ts`
- `src/store/emergency-store.test.ts`
- `docs/architecture/event-system-wiring.md`
