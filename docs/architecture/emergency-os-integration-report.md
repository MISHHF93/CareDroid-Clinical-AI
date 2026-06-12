# Emergency OS Integration Report

Generated: 2026-06-12T21:37:03.803Z

Scanned 2274 text/code files. Resolved 5689 relative import edges. Found 281 backend endpoint declarations and 1307 frontend API references.

## Workflow Coverage

| Module |Route |Route Mounted |Sidebar |Command |Search |Live Data |Events |Journey Engine |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Emergency Whiteboard | /emergency/whiteboard | yes | yes | yes | yes | partial | RealtimeEventEnvelope, JourneyEvent, StateChange | engine/journeyEngine.ts |
| Patient Journey Engine | /emergency/patients | yes | yes | yes | yes | partial | JourneyEvent, StateChange | engine/journeyEngine.ts |
| EMS Intake | /emergency/ems | yes | yes | yes | yes | backend-route-unconsumed | ems_alert_received, ems_status_updated, ems_arrival_confirmed | store/emergencyStore.ts |
| Smart Intake | /emergency/intake | yes | yes | yes | yes | conditional | PatientArrived, ARRIVAL | backend/src/models/PatientJourney.ts |
| Queue Intelligence | /emergency/queues | yes | yes | yes | yes | client-derived | PatientQueued, ReassessmentDue | store/emergencyStore.ts |
| Reassessment Engine | /emergency/reassessment | yes | yes | yes | yes | backend-route-unconsumed | ReassessmentDue, ReassessmentCompleted | store/emergencyStore.ts |
| Capacity Intelligence | /emergency/capacity | yes | yes | yes | yes | mixed | CapacityChanged | store/emergencyStore.ts |
| Boarding Intelligence | /emergency/boarding | yes | yes | yes | yes | client-derived | BoardingStarted, BoardingEnded | store/emergencyStore.ts |
| Referral Intelligence | /emergency/referrals | yes | yes | yes | yes | client-derived | ReferralCreated, ReferralClosed | store/emergencyStore.ts |
| ED Copilot | /emergency/copilot | yes | yes | yes | yes | mixed | OperationalAlertCreated | store/emergencyStore.ts |
| Analytics | /emergency/analytics | yes | yes | yes | yes | client-fallback | CapacityChanged, PatientDischarged | store/emergencyStore.ts |

## System-Wide Integration Score

| Metric |Score |
| --- | --- |
| Route Coverage | 100% |
| Component Coverage | 100% |
| API Coverage | 45% |
| Service Coverage | 64% |
| Entity Coverage | 100% |
| Event Coverage | 100% |
| Sidebar Coverage | 100% |
| Command Palette Coverage | 100% |
| Search Coverage | 100% |
| Emergency OS Workflow Coverage | 45% |

## Breaks in the Chain

- Patient Journey events are authoritative in the frontend store, but not yet the single persisted backend event stream for every workflow.
- Real-time support exists through `src/services/emergencyRealtimeService.js` and EMS socket support, but the frontend defaults to polling/no endpoint unless realtime env vars are configured.
- Several active workflows consume local store projections before backend data: queues, boarding, referrals, and parts of analytics.
- Several backend Emergency OS endpoints are mounted only in the conditional Mongoose runtime and therefore are not guaranteed in the default NestJS API surface; `/api/config/system` exposes `emergencyOs` readiness so support surfaces can show that state.

## Recommended Next Safe Steps

- Promote Emergency OS backend endpoints into the default Nest module, or surface `config.system.emergencyOs` in the System Health UI so tenants can see when conditional Mongoose routes are configured.
- Add dedicated frontend API clients for `/api/ems`, `/api/reassessment`, `/api/capacity/dashboard`, and `/api/copilot/query` or remove unused endpoints if the Nest APIs replace them.
- Replace local queue/referral/boarding derivations with Journey event-backed selectors once backend event persistence is available.
- Move legacy platform pages/services into `future-modules` only after backend module imports and test imports have been rewritten.
