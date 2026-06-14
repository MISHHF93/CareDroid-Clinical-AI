# Central Node Architecture

## Definition
`CareDroidCentralNode` is the Emergency OS operational command contract. It coordinates Patient Journey, Whiteboard, Queues, EMS, Smart Intake, Reassessment, Capacity, Boarding, Referrals, Alerts, Analytics, ED Copilot, Settings, and Integrations through the existing Emergency OS state and API spine.

## Frontend Shape
- Pure contract and redaction logic: `src/central-node/careDroidCentralNode.ts`.
- React hook/facade: `src/hooks/useCareDroidCentralNode.ts`.
- Store source: `src/store/emergencyStore.ts`.
- Realtime/sync source: existing `src/services/emergencyRealtimeService.js`, with SSE/WebSocket when configured and safe polling fallback otherwise.
- Header consumer: `src/components/Header.tsx` uses the central node snapshot for operational strip metrics and compact live status badges.

## Backend Shape
- Endpoint: `GET /api/emergency/central-node/snapshot`.
- Service: `CareDroidCentralNodeService` in `backend/src/modules/emergency-os/emergency-os.services.ts`.
- Module wiring: existing `EmergencyOsModule`.
- API style: existing `EmergencyModuleEnvelope<T>` response convention.

## State Ownership
The central node does not own a second store. Active modules continue to read and publish through the existing emergency store and backend services. The central node derives one operational snapshot from those sources.

## Eventing
Frontend eventing uses current document events for UI surfaces, store workflow logs for auditable actions, and the existing realtime facade for SSE/WebSocket/polling. Backend action logging continues through `WorkflowActionLogService`. A production event bus remains a future hardening item.

## Safety
Copilot context is exposed only as human-review operational context. No autonomous clinical actions, audible alarms, fake lab/PACS viewers, or external viewer links were introduced.
