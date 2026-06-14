# Whiteboard Dominance Report

Date: 2026-06-14

## Scope

This pass reviewed the active CareDroid Emergency OS workflow surfaces around the Whiteboard:

- `src/pages/emergency/index.tsx`
- `src/components/PatientCard.tsx`
- `src/components/PatientDetailPanel.tsx`
- `src/components/QuickIntake.tsx`
- `src/components/ReassessmentDrawer.tsx`
- `src/components/ReferralPanel.jsx`
- `src/components/EMSPipeline.jsx`
- `src/components/CapacityCrisisMode.tsx`
- `src/components/QueueIntelligencePanel.jsx`
- `src/components/AppShell.tsx`, `src/components/Header.tsx`, `src/components/Sidebar.tsx`, `src/components/CommandPalette.tsx`
- `src/config/routes.config.js`, `src/config/unified-navigation.config.ts`, `src/config/commandPalette.config.js`, `src/config/emergencyRolePermissions.js`
- `src/store/emergencyStore.ts`

The pass preserved the single active AppShell, route system, navigation registry, command palette registry, API facade, Emergency OS domain model, operational state model, alert/escalation model, and design system.

## Whiteboard-Centered Workflow Model

The active Whiteboard is the operational hub for live patient flow:

```text
Whiteboard
  -> QuickIntake modal for new central intake
  -> PatientCard mission actions for patient-scoped work
  -> PatientDetailPanel for timeline, vitals, notes, staff/room assignment, escalation, discharge
  -> ReassessmentDrawer for due/deterioration review
  -> CapacityCrisisMode for deterministic capacity actions
  -> QueueIntelligencePanel for queue bottlenecks and filters
  -> EMS mission cards for bay preparation and arrival conversion
  -> ReferralPanel route when the full referral form/work queue is required
  -> CopilotPanel through the single AppShell command surface
```

The Whiteboard should keep clinicians in the same screen for actions that already have modal, drawer, panel, or store support. Full-page routes remain useful for deeper EMS, referrals, capacity, queues, analytics, and settings review, but the Whiteboard now owns the fastest path for shift work.

## Patient-Card Action Matrix

| Workflow | Direct Whiteboard / Card Launch | Active Surface | Current Status |
| --- | --- | --- | --- |
| Intake quick add | Yes, Whiteboard `Central Intake` and header/command shortcut dispatch `open-intake` | `QuickIntake` modal, `addPatient`, `/api/emergency/intake` | Direct |
| Reassessment | Yes, card `Reassess`, mission task list, header badge, command palette | `ReassessmentDrawer`, `selectPatient`, reassessment flags | Direct |
| Room assignment | Yes after selecting patient card | `PatientDetailPanel` action mode, `assignRoom` | Direct via detail panel |
| Staff assignment | Yes after selecting patient card | `PatientDetailPanel` action mode, `assignStaff` | Direct via detail panel |
| EMS handoff context | Partial on Whiteboard; full handoff on EMS page | Whiteboard EMS cards, `EMSPipeline`, `prepareEMSBay`, `convertEMSArrivalToPatient` | Direct for prep/convert, route for full handoff |
| Referral / transfer creation | Patient card routes with `patientId` and `new=1`; Whiteboard New Referral opens form route | `ReferralPanel`, `createReferral`, `/api/emergency/referrals` | Patient-scoped, route-backed |
| Boarding escalation | Yes, card `Board` and capacity crisis panel actions | `movePatientToState`, `CapacityCrisisMode` | Direct local/store action |
| Capacity review | Yes for live pressure banner/crisis actions; full route for detailed capacity page | `CapacityCrisisMode`, capacity snapshot | Direct summary, route for full review |
| Queue filtering | Yes, now embedded on Whiteboard | `QueueIntelligencePanel`, `activeQueueFilter`, Whiteboard patient grid | Direct |
| Copilot prompt/context | Yes through single AppShell/global command surface | `CopilotPanel`, command palette, keyboard shortcut | Direct panel |
| Timeline/detail view | Yes, card select and Timeline/Open Detail actions | `PatientDetailPanel`, `buildPatientTimeline` | Direct |
| Discharge/disposition | Yes, card `Discharge` opens detail-panel confirmation | `PatientDetailPanel`, `movePatientToState` | Direct local/store action |

## Navigation Reduction Opportunities

| Opportunity | Finding | Disposition |
| --- | --- | --- |
| Queue review should not force `/emergency/queues` for simple filtering | The Whiteboard already has enough patient state plus `activeQueueFilter`; route navigation was excessive for "Filter Waiting Queue". | Fixed by embedding existing `QueueIntelligencePanel` on the Whiteboard and filtering the patient grid in place. |
| Patient-level referral awareness was hidden until navigating to Referrals | Referral state already exists in the store and the patient card had a referral action. | Fixed by adding `Referral pending` / `Transfer pending` patient-card signals. |
| Capacity pressure was visible at department level but not on affected patient cards | Capacity band already exists in the store; patient cards already render operational signal badges. | Fixed by adding `Capacity pressure` signals for boarders, long waits, reassessment due, and EMS-arrival patients during Orange/Red capacity. |
| Full referral creation still leaves the Whiteboard | `ReferralPanel` is currently a route-backed form/work queue, not an AppShell drawer. Creating a new drawer would add workflow surface area. | Left route-backed, but patient context is preserved through `patientId` and `new=1`. |
| Full EMS handoff still leaves the Whiteboard | Whiteboard safely supports bay prep and arrival conversion; handoff completion and offload timing live in `EMSPipeline`. | Left route-backed for full EMS pipeline to avoid duplicating handoff workflow. |
| Header and command palette duplicate some route commands | They use the single command/action registry and AppShell event surface. | No change; duplication is registry-driven rather than a second command surface. |

## Fixes Applied

### Whiteboard Queue Intelligence

Before:

```text
Whiteboard "Filter Waiting Queue"
  -> set activeQueueFilter
  -> navigate to /emergency/queues
```

After:

```text
Whiteboard "Filter Waiting Queue"
  -> set activeQueueFilter
  -> QueueIntelligencePanel remains on Whiteboard
  -> patient grid filters to the selected queue
  -> clear action resets queue filter
```

Changed files:

- `src/pages/emergency/index.tsx`
- `src/components/EmergencyWhiteboard.css`
- `src/components/EmergencyWhiteboard.navigation.test.js`

### Patient-Card Operational Signals

Patient cards now surface existing store context without a new data model:

- Open referral state: `Referral pending`
- Open transfer state: `Transfer pending`
- Patient-level capacity pressure during Orange/Red capacity for boarders, long waits, reassessments, and EMS arrivals

Changed file:

- `src/components/PatientCard.tsx`

## Remaining Manual-Review Risks

- Referral/transfer creation still navigates to `ReferralPanel`; this is intentional until the active product chooses a first-class AppShell drawer for referrals.
- Full EMS handoff completion remains on `/emergency/ems`; only bay prep and conversion are Whiteboard-direct.
- Boarding and discharge actions are immediate local/store transitions in this pass. Durable backend write contracts were not added.
- Queue filters map route-level queue names to patient-grid states. `Provider` maps to `Assessment`, `Referral` maps to open referral patients, and `Discharge` maps to `Disposition`; this should be validated with clinicians for local terminology.
- `QueueIntelligencePanel` now loads analytics from the Whiteboard as well as the Queues route. This reuses existing behavior but may increase refresh frequency if many boards are open.

## Validation Commands / Results

- PASS: `npx eslint "src/pages/emergency/index.tsx" "src/components/PatientCard.tsx" "src/components/EmergencyWhiteboard.css" "src/components/EmergencyWhiteboard.navigation.test.js"`
  - ESLint returned 0 errors. It warned that `EmergencyWhiteboard.css` is ignored because the ESLint config does not lint CSS.
- PASS: `npm run typecheck:frontend`
- PASS: `npx vitest run "src/components/EmergencyWhiteboard.navigation.test.js" "src/components/QueueIntelligencePanel.test.jsx" "src/components/PatientCard.clinicalIntelligence.test.jsx"`
  - 3 test files passed, 8 tests passed.
- PASS: IDE diagnostics via `ReadLints` for touched files.

## Final Status

The Whiteboard now carries more of the active operational workload without adding another shell, router, command surface, API facade, store, domain model, alert model, or design system. The remaining route-backed workflows are the deeper referral and EMS work queues, where the existing active components still own the full workflow safely.
