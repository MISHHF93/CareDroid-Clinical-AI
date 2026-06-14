# Journey To Code Map

Generated: 2026-06-14

## Active Spine

- App entry: `src/App.jsx`
- AppShell: `src/components/AppShell.tsx`
- Whiteboard route wrapper: `src/components/EmergencyWhiteboard.jsx`
- Canonical Whiteboard page: `src/pages/emergency/index.tsx`
- Route registry: `src/config/routes.config.js`
- Navigation registry: `src/config/unified-navigation.config.ts`
- Command palette registry: `src/config/commandPalette.config.js`
- Store/domain state: `src/store/emergencyStore.ts`
- Domain types: `src/types/emergency.ts`
- Frontend API facade: `src/services/emergencyOsApi.js`
- Backend controller: `backend/src/modules/emergency-os/emergency-os.controller.ts`
- Backend services: `backend/src/modules/emergency-os/emergency-os.services.ts`

## Journey Stages

- Arrival: `EMSPipeline`, `QuickIntake`, `PatientState.Arrival`, `/api/emergency/ems`, `/api/emergency/intake`
- Registration: `PatientState.Registration`, Smart Intake identity review, Patients route search
- Smart Intake: `src/pages/emergency/SmartIntake.jsx`, `runSmartIntakeVerticalSlice`, `/api/emergency/intake/vertical-slice`
- Identity Verification: Smart Intake candidates, field decisions, provincial health placeholder, audit messaging
- Triage: `PatientState.Triage`, queue row, Smart Intake vertical slice, CTAS thresholds
- Waiting: Whiteboard filter, Queue route, patient card wait time, central-node `waiting`
- Reassessment: `ReassessmentDrawer`, `/emergency/reassessment`, `ReassessmentService`, reassessment workflow logs
- Assessment: `PatientState.Assessment`, Whiteboard/Queues/Patients visibility
- Orders: `PatientState.Orders`, Queue route, timeline event types
- Results: `PatientState.Results`, Queue route, result/timeline context
- Consultation/Referral: `ReferralPanel`, `Referral` type, `/api/emergency/referrals`
- Disposition: `PatientState.Disposition`, capacity discharge pipeline, referral/boarding logic
- Admission: `PatientState.Admission`, Boarding route, central-node boarders
- Discharge: `PatientState.Discharge`, discharge workflow, discharge-ready Queue row

## Active Modules Audited

- Whiteboard: active, mounted, journey-centered mission control
- Patients: active, mounted, patient search/census/timeline status
- EMS: active, mounted, arrival and handoff workflow
- Smart Intake: active, mounted, identity workflow with human review
- Queues: active, mounted, now includes referral and discharge-ready queue rows
- Reassessment: active, mounted, safety queue and drawer
- Capacity: active, mounted, occupancy/boarding/discharge/EMS pressure
- Boarding: active, mounted, admission pressure
- Referrals: active, mounted, consultation and transfer queue
- Analytics: active direct route, hidden from pilot primary nav but retained
- Copilot: active, mounted and docked in AppShell
- Settings: active direct route, hidden from pilot primary nav but retained

## Review/Future Artifacts

`src/layout/AppShell.jsx` is retained but not the active AppShell. Future/review modules under `src/features/future-modules/_review/` are not active journey routes and were not wired into the main experience during this pass.
