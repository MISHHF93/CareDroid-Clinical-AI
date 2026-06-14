# Central Node Wiring Report

## Implemented Wiring
- Backend `CareDroidCentralNodeService` derives the central snapshot from existing patient, settings, capacity, alert, queue, EMS, boarding, referral, and workflow-log services.
- Existing `EmergencyOsController` exposes `GET /api/emergency/central-node/snapshot`.
- Existing `EmergencyOsModule` registers the central node service.
- Existing `emergencyOsApi.js` facade exposes `fetchCareDroidCentralNodeSnapshot`.
- `useCareDroidCentralNode` derives a frontend snapshot from `useEmergencyStore`, refreshes the backend snapshot, and uses the existing realtime facade for SSE/WebSocket/polling.
- Header operational metrics and badges now read from `CareDroidCentralNode`.
- AppShell now supports Ctrl/Cmd+K using the existing command-palette event path.
- Command palette copy/actions were tightened around existing human-reviewed workflows.
- Emergency Settings now persists screen-mode central-node settings through the existing settings store/API flow.

## Active Modules
- Whiteboard: already reads patients/capacity/EMS/referrals/reassessment from store and whiteboard API; now shares central node header context.
- Queues: represented through central queue health and existing queues route.
- EMS: represented through inbound pressure and existing EMS route/actions.
- Capacity: represented through capacity status and header badge.
- Reassessment: represented through due/overdue status and existing drawer/route.
- Boarding: represented through boarder count/risk and existing route.
- Referrals: represented through pending count and existing referral workflow.
- Analytics: backend central snapshot uses the same patient/capacity basis as analytics.
- Copilot: central snapshot exposes human-review Copilot context only.
- Settings/Integrations: included in tenant/module status and documented placeholders.

## Not Rewired
No dedicated page was removed or collapsed. The current modal/drawer model is sufficient for this pass; adding a `UnifiedModalManager` would be a new architecture and remains future consolidation only if modal stacking becomes a measured issue.

## Manual/Future Wiring
- WebSocket single-connection ownership across all modules.
- Backend event bus enforcing publish/subscribe updates for every action.
- Audit enforcement at API boundaries rather than fixture/demo action logging.
- Role API authorization enforcement beyond frontend role-aware affordances.
- Production lab/PACS/EHR viewers and credentials.
- Audible alerts with clinical governance and alarm-fatigue review.
