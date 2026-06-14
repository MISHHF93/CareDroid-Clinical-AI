# Patient Journey Dominance

Date: 2026-06-14

## Discovery Method

This pass traced active CareDroid Emergency OS workflows through the mounted route surface, navigation registry, command palette, patient-card mission actions, whiteboard mission actions, AppShell/Header central-node context, store actions, frontend API hooks, backend Emergency OS controller/services, workflow logs, tests, fixtures, and previously generated journey reports.

Primary files reviewed:

- `src/config/routes.config.js`, `src/config/unified-navigation.config.ts`, `src/config/commandPalette.config.js`
- `src/App.jsx`, `src/components/AppShell.tsx`, `src/components/Header.tsx`
- `src/pages/emergency/index.tsx`, `src/components/PatientCard.tsx`, `src/components/EMSPipeline.jsx`, `src/components/ReferralPanel.jsx`
- `src/pages/emergency/SmartIntake.jsx`, `src/components/QuickIntake.tsx`, `src/pages/emergency/EmergencyAnalytics.jsx`, `src/pages/emergency/EmergencySettings.jsx`
- `src/store/emergencyStore.ts`, `src/types/emergency.ts`, `src/central-node/careDroidCentralNode.ts`
- `src/hooks/useEmergencyOs.js`, `src/hooks/useCareDroidCentralNode.ts`
- `src/services/emergencyOsApi.js`, `src/services/emergencyTransportApi.js`
- `backend/src/modules/emergency-os/emergency-os.controller.ts`, `backend/src/modules/emergency-os/emergency-os.services.ts`, `backend/src/modules/emergency-os/emergency-os.fixtures.ts`
- `src/data/emergencyPageRenderInventory.js`, `src/data/patientJourneyEngine.js`, `src/services/PatientJourneyEngine.js`
- Existing architecture docs including `docs/architecture/workflow-connectivity-report.md`, `docs/architecture/journey-to-code-map.md`, `docs/architecture/disconnected-journey-artifacts.md`, and `docs/architecture/central-node-journey-report.md`

The dominant movement model remains the existing `PatientState` sequence:

`Arrival -> Registration -> Triage -> Waiting -> Assessment -> Orders -> Results -> Disposition -> Admission -> Discharge`

For this report, `Orders` is treated as a sub-stage of Assessment/Results because the requested movement stages are Arrival, Triage, Waiting, Assessment, Results, Disposition, Admission, and Discharge.

## Workflow Inventory

| Workflow | Active Entry Points | Movement Contribution | Status |
| --- | --- | --- | --- |
| Whiteboard mission control | `/emergency/whiteboard`, `/emergency`, root redirect, AppShell nav, command palette, legacy aliases | Department command view for active patient movement, EMS, queues, reassessment, capacity, boarding, referrals, central intake | Active |
| Patient census/detail/timeline | `/emergency/patients`, patient lookup, `PatientCard`, `PatientDetailPanel`, `GET /api/emergency/patients`, `GET /api/emergency/journey` | Shows patient state, timeline events, workflow logs, detail actions, vitals, flags, notes, escalation, discharge | Active |
| Central intake / QuickIntake | Whiteboard `+ Central Intake`, `open-intake` event, `POST /api/emergency/patients`, `POST /api/emergency/intake` | Creates patient records and places them into Triage with arrival/triage timestamps and high-risk flags | Active, backend-connected with local fallback |
| Smart Intake identity review | `/emergency/intake`, command palette, `POST /api/emergency/intake/vertical-slice` | Verifies identity, creates/links patient, validates Arrival to Triage vertical slice, hydrates whiteboard/capacity/reassessment | Active |
| EMS pipeline | `/emergency/ems`, whiteboard EMS mission cards, `GET /api/emergency/ems`, store EMS actions | Pre-arrival, bay prep, arrival conversion to `PatientState.Arrival`, handoff completion | Active, write path local/demo |
| Queue intelligence | `/emergency/queues`, whiteboard queue filters, Header metrics, `GET /api/emergency/queues` | Bottleneck view for Waiting, Triage, Assessment, Orders, Results, Admission, Referral, Discharge, Reassessment | Active |
| Reassessment | `/emergency/reassessment`, AppShell drawer, patient-card reassess action, store reminders/flags, `GET /api/emergency/reassessment` | Safety loop across Waiting, Assessment, Results, Disposition using reassessment/deterioration/sepsis/high-risk flags | Active |
| Capacity and crisis mode | `/emergency/capacity`, whiteboard stats, capacity engine, `GET /api/emergency/capacity` | Indirectly controls flow through rooms, occupancy, wait pressure, boarders, reassessment due, EMS pressure | Active |
| Boarding | `/emergency/boarding`, patient-card `Board`, capacity and central node, `GET /api/emergency/boarding` | Moves or identifies patients in Admission / pending admission and surfaces inpatient bed pressure | Active, write path local/demo |
| Referral / transfer | `/emergency/referrals`, patient-card `Refer`, whiteboard `New Referral`, `GET/POST /api/emergency/referrals` | Supports Assessment/Results specialty review and Disposition/Admission/Discharge transfer decisions | Active |
| ED Copilot | `/emergency/copilot`, docked panel, keyboard shortcut, `GET /api/emergency/copilot` | Indirect movement support: summarizes high-risk patients, long waits, EMS, reassessment, capacity; blocks autonomous disposition | Active, human-review bound |
| Alerts and escalation | Header alert drawer, store alerts, capacity/boarding/EMS/reassessment/referral alert derivation | Drives attention back to patient movement bottlenecks and safety queues | Active |
| Analytics | `/emergency/analytics`, `GET /api/emergency/analytics`, central-node metrics | Leadership view of arrivals, waits, discharges, boarders, high-risk, reassessment, complaint mix | Active direct route, hidden from pilot primary nav |
| Settings / thresholds / audit | `/emergency/settings`, `GET/PATCH /api/emergency/settings`, workflow audit, integration/provincial/AI governance panels | Configures CTAS waits, reassessment cadence, capacity bands, EMS offload, boarding thresholds, alerts, central control | Active direct route, hidden from pilot primary nav |
| Central node | Header, whiteboard command layer, analytics, `GET /api/emergency/central-node/snapshot` | One operational snapshot across active patients, queues, EMS, capacity, boarders, referrals, reassessment, alerts, workflow logs | Active |
| Command palette and navigation | AppShell nav, command palette route commands, legacy redirects | Launches active movement surfaces without creating duplicate route/product surfaces | Active |
| Department Pulse | `/emergency/pulse`, command palette direct command | Compact charge-nurse movement view: queues, staff, EMS, alerts, capacity deltas | Active direct route |
| Shift Summary / Handoff | `/emergency/shift`, command palette direct command | Retrospective movement handoff: volume, discharge/admission, queue performance, capacity events, referrals, alerts, EMS | Active direct route |
| Medical Tools | `/emergency/tools`, tool redirects, calculator save-to-patient flows | Indirect Assessment/Results/Disposition support through scores, protocols, notes, and human-reviewed decisions | Active utility route |
| Workflow logs / audit | `GET /api/emergency/workflow-logs`, `GET /api/emergency/patients/:patientId/workflow-logs`, store `workflowLogs` | Makes patient movement, reassessment, boarding, capacity, referrals, Copilot, integration, and provincial data activity visible | Active |
| Fixtures and scenario hydration | backend fixtures, `edScenarioFixtures`, first customer demo mode | Seeds patient states across Arrival, Waiting, Assessment, Results, Disposition, Admission and supports validation walkthroughs | Active demo/test data |
| Upgrade harness / simulation / federated / digital twin | `/api/emergency/upgrade-harness/*`, `/api/emergency/simulation/*`, `/api/emergency/federated-learning/*`, `/api/emergency/digital-twin/*` | Indirect pilot-review signals for capacity, patient flow, clinical intelligence, governance | Review/future for autonomous movement |

## Patient Movement Contribution Matrix

Legend: `D` = directly changes or displays patient movement; `I` = indirect support; `R` = review/future/manual-review only.

| Workflow | Arrival | Triage | Waiting | Assessment | Results | Disposition | Admission | Discharge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Whiteboard mission control | D | D | D | D | D | D | D | D |
| Patients/detail/timeline | D | D | D | D | D | D | D | D |
| Central intake / QuickIntake | D | D |  |  |  |  |  |  |
| Smart Intake identity review | D | D |  |  |  |  |  |  |
| EMS pipeline | D | I |  |  |  |  |  |  |
| Queue intelligence | I | D | D | D | D | D | D | D |
| Reassessment |  |  | D | D | D | D |  |  |
| Capacity and crisis mode | I | I | I | I | I | I | I | I |
| Boarding |  |  |  |  |  | D | D | I |
| Referral / transfer |  |  |  | I | I | D | D | D |
| ED Copilot | I | I | I | I | I | I | I | I |
| Alerts and escalation | I | I | I | I | I | I | I | I |
| Analytics | I | I | I | I | I | I | I | I |
| Settings / thresholds / audit | I | I | I | I | I | I | I | I |
| Central node | D | D | D | D | D | D | D | D |
| Command palette and navigation | I | I | I | I | I | I | I | I |
| Department Pulse | I | I | I | I | I | I | I | I |
| Shift Summary / Handoff | I | I | I | I | I | I | I | I |
| Medical Tools |  | I |  | I | I | I |  |  |
| Workflow logs / audit | D | D | D | D | D | D | D | D |
| Fixtures and scenario hydration | D | D | D | D | D | D | D | D |
| Upgrade harness / simulation / federated / digital twin | R | R | R | R | R | R | R | R |

## Workflows That Do Not Directly Contribute

These workflows are not direct patient movement controls, but most still exist to keep one product surface operationally complete.

- Auth aliases and retired platform roots do not contribute to ED patient movement. They exist only to redirect into the Emergency OS whiteboard and preserve a single route surface.
- `src/layout/AppShell.jsx` does not contribute to the active journey because `src/App.jsx` mounts `src/components/AppShell.tsx`. It remains MANUAL_REVIEW because tests/history may still reference it.
- Future/review modules under `src/features/future-modules/_review/` do not contribute to active patient movement. They should remain review-only until intentionally promoted into the one AppShell and one route surface.
- Workflow mining, platform automation builder, marketplace, product intelligence, organization, billing, and other platform routes are not active Emergency OS movement workflows. Most are redirected, hidden, or retained outside the pilot surface.
- Provincial health and integration hub settings do not move patients directly. They currently provide manual-review evidence/status and workflow-log events because live credentials/connectors are placeholders.
- Upgrade harness simulation, federated learning, and digital twin endpoints do not move patients. They exist as review/future intelligence contracts and must not perform autonomous disposition, admission, discharge, or routing.
- Medical tools do not move patients by themselves. They support Assessment/Results/Disposition through scores, notes, and human-reviewed context.

## Disconnected Or Weak Chains

- EMS bay preparation, conversion, and handoff completion update the local Emergency OS store. Conversion creates a `PatientState.Arrival` patient and timeline event, but durable backend write endpoints remain demo/gated. Status: `PENDING_PARALLEL_WORK`.
- Boarding and discharge actions are movement-correct in the store and UI, but there is no durable backend patient-state transition endpoint in this pass. Status: `PENDING_PARALLEL_WORK`.
- Queue intelligence previously lacked explicit movement-stage labels in route inventory and queue cards. The backend queue service still returns operational labels rather than the report's stage metadata. Status: frontend/documentation fixed; backend metadata `PENDING_PARALLEL_WORK`.
- Referral create now writes to `POST /api/emergency/referrals`, but transfer status updates still use a capability-gated `/api/emergency/transfers/:id/status` path that is optional. Status: `PENDING_PARALLEL_WORK`.
- Patient journey is represented in both `PatientState` and legacy `patientJourneyEngine` helper data. Active movement uses `PatientState`, store timelines, backend `PatientJourneyService`, and central node; helper engines should not become a second movement engine. Status: `MANUAL_REVIEW`.
- Analytics mixes store analytics, backend analytics, and central-node snapshot metrics. This is acceptable for visibility, but analytics should not become an authority for movement changes. Status: documented.
- Settings can alter thresholds and module visibility, but settings changes do not retroactively migrate patient states. That is correct; movement remains patient/store/API owned. Status: documented.
- Patient journey events are visible through Patients/detail/timeline, central-node recent events, Settings workflow audit, and Shift Summary. Some local actions add audit entries without backend persistence. Status: `PENDING_PARALLEL_WORK`.

## Fixes / Refactors Applied

The refactor stayed within existing architecture and did not add a new AppShell, route surface, API surface, domain model, central node, movement engine, or design language.

- Added `PATIENT_MOVEMENT_STAGES` and per-page `movementStages` metadata to `src/data/emergencyPageRenderInventory.js`.
- Added inventory test coverage requiring every active page workflow to declare valid movement stages in `src/data/emergencyPageRenderInventory.test.js`.
- Added queue movement-stage labels in `src/App.jsx` so Queue Intelligence explicitly shows how each operational queue maps back to patient movement.
- Added route behavior test coverage for the new queue movement-stage label in `src/routing/canonicalRouteTree.behavior.test.jsx`.
- Generated this report at `docs/architecture/patient-journey-dominance.md`.

## Remaining Manual Review / Pending Parallel Work

- `PENDING_PARALLEL_WORK`: durable backend write contracts for patient state transitions, EMS handoff/bay actions, discharge, and transfer status updates.
- `PENDING_PARALLEL_WORK`: backend queue envelopes can adopt the new stage metadata after API/domain compression workers finish.
- `PENDING_PARALLEL_WORK`: reconcile any API compression or domain model unification changes before promoting review/future endpoints.
- `MANUAL_REVIEW`: decide whether `src/services/PatientJourneyEngine.js` and `src/data/patientJourneyEngine.js` remain utility/report helpers or should be folded behind `PatientState` to avoid duplicate movement language.
- `MANUAL_REVIEW`: review legacy AppShell and future-module artifacts only after active branch workers finish; no destructive cleanup was performed.
- `MANUAL_REVIEW`: external provincial, integration, device, and EMS CAD/ePCR connectors remain placeholders until live credentials/contracts exist.

## Validation Commands / Results

Pending in this run at report creation. Expected focused validation:

- `npm run lint -- src/App.jsx src/data/emergencyPageRenderInventory.js src/data/emergencyPageRenderInventory.test.js src/routing/canonicalRouteTree.behavior.test.jsx`
- `npm run typecheck:frontend`
- `npx vitest run src/data/emergencyPageRenderInventory.test.js src/routing/canonicalRouteTree.behavior.test.jsx`

