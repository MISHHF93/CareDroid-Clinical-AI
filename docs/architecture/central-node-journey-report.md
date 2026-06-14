# Central Node Journey Report

Generated: 2026-06-14

## Active Central Node

The frontend central node is `src/central-node/careDroidCentralNode.ts`, consumed by `src/hooks/useCareDroidCentralNode.ts`. The active Header calls `useCareDroidCentralNode({ realtime: true })`, so central operational state is mounted in the AppShell.

The backend central node is `CareDroidCentralNodeService` in `backend/src/modules/emergency-os/emergency-os.services.ts`, exposed by `/api/emergency/central-node/snapshot`.

## Inputs

Central node inputs come from existing Emergency OS state:

- Patients and patient journey states
- Capacity and rooms
- Alerts
- EMS arrivals, incoming patients, and units
- Referrals
- Workflow logs
- Settings and enabled modules
- WebSocket/realtime status
- Copilot messages
- Integration events
- Selected patient and active queue/search context

## Outputs

Central node outputs include:

- Current department status
- Active patient flow and critical patient flow
- Queue health
- EMS pressure
- Capacity status
- Boarding status
- Reassessment status
- Referral status
- Operational alerts
- Screen context
- Role context
- Tenant settings
- Copilot safety context
- Module statuses
- Recent workflow events
- Operational summary metrics

## Screen Modes

The source supports the requested modes in one central-node configuration:

- Triage
- Registration
- Charge Nurse
- Physician
- EMS
- Waiting Room Display
- Command Center Display
- Admin
- Read Only

Public display modes redact patient-sensitive fields and force read-only behavior.

## Safe Wiring Applied

The central-node `queueHealth` now includes `referral`, `discharge`, and `reassessment` queues in addition to the journey state queues. This keeps referral and discharge-ready bottlenecks visible to the Header/AppShell operational strip and any future central-node consumers.

## Remaining Gaps

The central node is mounted and route-visible through the Header, but most individual module pages still consume their own module hooks/store selectors rather than directly consuming the central-node snapshot. That is acceptable for the current architecture; future work should avoid duplicating state and should use the central node only where it reduces repeated cross-module calculations.
