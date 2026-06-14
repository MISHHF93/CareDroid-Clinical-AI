# Emergency OS Whiteboard-First Refactor

## Goal

Treat `/emergency/whiteboard` as the Emergency OS mission-control surface while preserving the existing active architecture:

- Vite React SPA mounted through `src/App.jsx`
- App shell in `src/components/AppShell.tsx`
- Active Whiteboard page in `src/pages/emergency/index.tsx`
- Existing Emergency OS stores, drawers, modals, routes, and `/api/emergency/*` clients

No new router, layout, API convention, or feature module was introduced.

## Workflow Audit

| Workflow | Existing owner | Whiteboard-first placement | Wiring decision |
| --- | --- | --- | --- |
| Patient lookup/detail | `PatientCard`, `PatientDetailPanel`, `/emergency/patients` | Mission-control "Patient Lookup" and card "Detail" action | Opens existing route or selects patient in `useEmergencyStore` to show the existing detail drawer. |
| Create patient / quick intake | `QuickIntake` on Whiteboard, `open-intake` event | Mission-control "Create Patient" and existing header "+ Central Intake" button | Reuses the existing `QuickIntake` modal and `open-intake` event path. |
| Smart Intake | `/emergency/intake`, `SmartIntake.jsx` | Mission-control "Smart Intake" | Navigates to the existing Smart Intake route when role access allows. |
| EMS intake / arrival conversion | `/emergency/ems`, `EMSPipeline`, EMS store actions | Mission-control "EMS Intake" plus active EMS arrival cards | Uses `prepareEMSBay` and `convertEMSArrivalToPatient`; unavailable actions render disabled. |
| Reassessment task launch | `ReassessmentDrawer`, `/emergency/reassessment`, reassessment flags | Mission-control "Reassessment Tasks", immediate task list, card "Reassess" | Uses `open-reassessment-drawer`; card can flag reassessment only when role allows `flags.manage`. |
| Referral workflow | `ReferralPanel`, `/emergency/referrals` | Mission-control "Referral Workflow", card "Refer" | Navigates with `patientId` and `new=1` into the existing referral form. |
| Boarding action | `movePatientToState`, `/emergency/boarding` | Mission-control "Boarding Review", card "Board" | Moves patient to `Admission` through existing store transition; already-boarded or unauthorized states are disabled. |
| Discharge action | `PatientDetailPanel` confirmation | Card "Discharge" | Selects patient and opens existing discharge confirmation via `open-patient-discharge`; no direct one-click discharge from the card. |
| Queue review / move patient | `/emergency/queues`, `setQueueFilter`, `movePatientToState` | Mission-control "Queue Review", "Filter Waiting Queue", card "Next" | Uses existing queue route/filter and store state transition. |

## Changes Made

- Added a Whiteboard mission-control band below KPI cards with direct launch points for patient lookup, central intake, Smart Intake, EMS, reassessment, referrals, queue review, and boarding review.
- Added live EMS arrival actions on the Whiteboard for `Prepare Bay` and `Add to Board`, backed by existing EMS store methods.
- Added immediate reassessment task shortcuts that select the patient and open the existing reassessment drawer.
- Added Whiteboard-only patient card actions for detail, next queue state, reassessment, referral, boarding, and discharge confirmation.
- Preserved dedicated workflow pages; no logic was duplicated out of EMS, referrals, Smart Intake, reassessment, queue, boarding, or patient detail owners.
- Added a `clear-whiteboard-filters` listener so AppShell command actions can reset the active Whiteboard and queue filters.
- Kept non-blank states for loading, backend error fallback, empty patient views, empty EMS arrivals, and empty reassessment tasks.

## Action Placement Matrix

| Launch surface | Actions promoted |
| --- | --- |
| Whiteboard mission-control band | Patient Lookup, Create Patient, Smart Intake, EMS Intake, Reassessment Tasks, Referral Workflow, Queue Review, Boarding Review |
| Whiteboard EMS panel | Prepare Bay, Add to Board, Open EMS |
| Whiteboard immediate tasks panel | Open reassessment drawer for due patients, Open Referral Board, Filter Waiting Queue |
| Whiteboard patient cards | Detail, Next, Reassess / +Reassess, Refer, Board / Boarded, Discharge |
| Dedicated routes | Remain available at `/emergency/patients`, `/emergency/intake`, `/emergency/ems`, `/emergency/queues`, `/emergency/reassessment`, `/emergency/boarding`, `/emergency/referrals` |

## Validation

Focused validation targets:

- `src/components/EmergencyWhiteboard.navigation.test.js`
- `src/components/PatientCard.clinicalIntelligence.test.jsx`
- `src/components/R12EndToEndWiring.test.tsx`
- `src/routing/canonicalRouteTree.behavior.test.jsx`
- `src/routing/workspaceSubpageRoutes.test.js`
- frontend typecheck, lint, and build when feasible

## Remaining Manual QA

- Confirm role-specific disabled states for intake, EMS conversion, referral creation, state transition, boarding, and discharge.
- Verify click depth from Whiteboard is no more than two interactions for detail, reassessment, referral, queue move, boarding, and discharge confirmation.
- Confirm mobile layout still keeps the mission-control panels usable without obscuring the patient detail drawer.
- Validate EMS arrival conversion against live backend-backed `/api/emergency/*` responses when the Nest runtime is enabled.
