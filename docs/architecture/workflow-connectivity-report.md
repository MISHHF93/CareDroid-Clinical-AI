# Workflow Connectivity Report

Date: 2026-06-14

## Scope

This pass traced the active CareDroid Emergency OS workflows through the single active product spine:

```text
route / command / navigation
  -> src/App.jsx route
  -> active page/component
  -> hook/store
  -> frontend API client
  -> backend controller
  -> backend service
  -> response envelope
  -> rendered UI update
```

The traced workflows were patient journey, EMS, intake, queues, reassessment, capacity, boarding, referrals, and copilot.

## Connectivity Matrix

| Workflow | Entry Point | Page / Component | API / Hook | Backend Endpoint | Backend Service | Response | UI Update | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Patient journey | `/emergency/patients`, Patients nav, command palette, legacy `/journey` aliases | `PatientsRoute` in `src/App.jsx`, `PatientCard`, `PatientDetailPanel` | `useEmergencyPatients()`, `usePatientJourney()`, `fetchEmergencyPatients()`, `fetchPatientJourney()` | `GET /api/emergency/patients`, `GET /api/emergency/journey` | `EmergencyPatientService.getPatientEnvelope()`, `PatientJourneyService.getJourney()` | Emergency module envelopes with patients, state counts, timeline events | Patient search/cards and Patient Journey Engine status panel render backend state counts and event count | Connected |
| EMS | `/emergency/ems`, EMS nav, command palette, whiteboard EMS actions | `EMSPipeline` | `useEMSIntake()`, store EMS actions | `GET /api/emergency/ems` | `EMSIntakeService.getEMSIntake()` | Envelope with EMS arrivals and available resus rooms | EMS pipeline renders arrivals, offload/readiness context, and local bay/handoff actions | Read connected; write actions local/demo |
| Intake | `/emergency/intake`, Intake nav, command palette, whiteboard intake action, `QuickIntake` | `SmartIntake`, `QuickIntake`, intake form flows | `fetchSmartIntake()`, `runSmartIntakeVerticalSlice()`, store hydration | `GET /api/emergency/intake`, `POST /api/emergency/intake`, `POST /api/emergency/intake/vertical-slice` | `SmartIntakeService.getSmartIntake()`, `createFromIntake()`, `createVerticalSlice()` | Envelope or vertical-slice payload with patient, encounter, transitions, capacity/reassessment validation | Intake page status/steps render; created patients hydrate store and become visible on Patients/Whiteboard/Queues | Connected |
| Queues | `/emergency/queues`, Queues nav, command palette, whiteboard Filter Waiting Queue | `QueueRoute` in `src/App.jsx` | `useEmergencyQueues()`, store `activeQueueFilter` | `GET /api/emergency/queues` | `QueueIntelligenceService.getQueues()` | Envelope with queue rows, patients, counts, target/breach metadata | Queue metrics and rows render backend rows plus supplemental referral/discharge/reassessment queues | Fixed |
| Reassessment | `/emergency/reassessment`, Reassess nav, command palette, reassessment drawer actions | `ReassessmentRoute`, `ReassessmentDrawer` | `useReassessmentQueue()`, store patients/flags | `GET /api/emergency/reassessment` | `ReassessmentService.getReassessmentQueue()` | Envelope with due patients, overdue count, next action | Dedicated route and drawer now share the same attention criteria across deterioration, sepsis, high-risk, and reassessment-due flags | Fixed |
| Capacity | `/emergency/capacity`, Capacity nav, command palette | `CapacityRoute` | `useCapacityStatus()`, `useUpgradeHarnessCapacity()` | `GET /api/emergency/capacity`, `GET /api/emergency/upgrade-harness/capacity` | `CapacityService.getCapacity()`, `EmergencyOsUpgradeHarnessService.getCapacityAndForecasting()` | Envelope with capacity, rooms, recommendations, plus pilot forecast signals | Capacity metrics, room counts, recommendations, boarding patients, and forecast/simulation cards render | Connected |
| Boarding | `/emergency/boarding`, Boarding nav, command palette, patient card boarding actions | `BoardingRoute`, `PatientCard` actions | `useBoardingStatus()`, local store transition actions | `GET /api/emergency/boarding` | `BoardingService.getBoarding()` | Envelope with boarding patients, longest boarding minutes, escalation | Boarding route renders boarders and escalation state; local actions update patient/capacity state immediately | Read connected; write actions local/demo |
| Referrals | `/emergency/referrals`, Referrals nav, command palette, patient-card referral action, whiteboard New Referral | `ReferralPanel` | `useReferrals()`, `persistEmergencyReferral()`, store referral actions | `GET /api/emergency/referrals`, `POST /api/emergency/referrals` | `ReferralService.getReferrals()`, `ReferralService.createReferral()` | Read envelope with generated plus created referrals; create envelope with referral and refreshed list | Referral panel metrics/rows update locally immediately and backend-created referrals return through the same Emergency OS read envelope | Fixed |
| Copilot | `/emergency/copilot`, Copilot nav, command palette, docked panel, keyboard shortcut | `CopilotRoute`, `CopilotPanel` | `useEDCopilot()`, `callAI()`, store messages/context | `GET /api/emergency/copilot` for context; chat requests through AI client | `EDCopilotService.getCopilotContext()` plus AI client path | Envelope with prompt context and quick actions; chat response from AI client | Copilot route renders metrics/quick actions; docked panel uses current patients/capacity/alerts for prompts and messages | Connected |

## Fixes Applied

### Queue Filter Chain

Before:

```text
Whiteboard "Filter Waiting Queue"
  -> store.activeQueueFilter = "Waiting"
  -> /emergency/queues
  -> QueueRoute ignored activeQueueFilter
```

After:

```text
Whiteboard "Filter Waiting Queue"
  -> store.activeQueueFilter
  -> QueueRoute filters/highlights requested queue
  -> clear action resets store filter
```

Changed files:

- `src/App.jsx`
- `src/routing/canonicalRouteTree.behavior.test.jsx`

### Reassessment Scope Chain

Before:

```text
/api/emergency/reassessment
  -> ReassessmentRoute showed ReassessmentDue only

ReassessmentDrawer
  -> showed DeteriorationRisk, SepsisAlert, HighRisk, ReassessmentDue
```

After:

```text
/api/emergency/reassessment + local patient flags
  -> ReassessmentRoute unions backend due patients with the drawer attention flag set
  -> route and drawer present the same operational safety scope
```

Changed file:

- `src/App.jsx`

### Referral Read / Write Chain

Before:

```text
ReferralPanel read:
  -> GET /api/emergency/referrals
  -> ReferralService.getReferrals()

ReferralPanel create:
  -> POST /api/referrals
  -> PlatformSystemsController.createEmergencyReferral()
```

After:

```text
ReferralPanel read:
  -> GET /api/emergency/referrals
  -> ReferralService.getReferrals()

ReferralPanel create:
  -> POST /api/emergency/referrals
  -> ReferralService.createReferral()
  -> created referrals are returned by the same read envelope
```

Changed files:

- `src/services/emergencyTransportApi.js`
- `backend/src/modules/emergency-os/emergency-os.controller.ts`
- `backend/src/modules/emergency-os/emergency-os.services.ts`
- `backend/src/modules/emergency-os/emergency-os.controller.spec.ts`
- `src/data/backendHttpRouteInventory.js`
- `src/data/frontendApiCallsInventory.js`

## Remaining Local / Demo Chains

- EMS bay prep, conversion, and handoff completion still update the local Emergency OS store. The optional runtime write endpoints remain gated/demo until a durable EMS write contract is defined.
- Boarding patient actions update local state immediately and are visible in capacity/boarding UI, but there is no durable backend write endpoint for patient state transitions in this pass.
- Copilot context fetches are backend connected, while message generation uses the existing AI client path and local operational context. Usage logging should distinguish page context fetches from actual prompt submissions in a later pass.
- Platform `/api/referrals` remains present as a compatibility route, but active Emergency OS UI now writes to `/api/emergency/referrals`.

## Final Status

All requested workflows have a documented active chain. Broken safe chains were fixed without adding another AppShell, route registry, API facade, backend module, store, or design system.

