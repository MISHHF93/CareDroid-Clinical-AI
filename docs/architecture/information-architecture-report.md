# Emergency OS Information Architecture Report

Date: 2026-06-13

## Scope

This refactor used the active CareDroid Emergency OS architecture only:

- Vite React SPA mounted through `src/App.jsx`.
- Existing `src/components/AppShell.tsx`, `src/components/Header.tsx`, sidebar, command palette, patient detail panel, reassessment drawer, and active route pages.
- Existing Nest `/api/emergency/*` backed frontend services and local Emergency OS store fallbacks.

No new AppShell, router, duplicate layout, API convention, feature module, or product workflow was introduced.

## IA Changes Made

- Promoted the primary Emergency OS action set into the existing AppShell header: create patient, EMS intake, reassessment, referral, discharge, queue review, and patient lookup.
- Added a compact shell-level patient lookup that searches name, MRN, complaint, category, state, and priority, then opens the existing patient detail panel or routes to the Patients page with the current query.
- Extended command palette discovery so core actions are findable by intent, not only by destination names: Create Patient, Patient Lookup, EMS Intake, Queue Review, New Referral, Reassessment Queue, and Discharge Selected Patient.
- Reused existing page behavior:
  - Central Intake still dispatches the existing `open-intake` event and opens the whiteboard QuickIntake flow.
  - EMS uses the current EMS pipeline page and existing prepare/convert/handoff controls.
  - Reassessment opens the existing reassessment drawer.
  - Referral opens the current Referrals route with the existing `new=1` form trigger.
  - Discharge opens the existing Patient Detail discharge confirmation and still moves the patient to `Discharge` through the current state transition.
  - Queue Review routes to the existing queue intelligence page.
- Kept disabled states visible where role or context blocks safe action, especially referral creation, patient creation, discharge without a selected patient, and route-level access.

## Active Page Audit

- `/emergency/whiteboard`: Strongest operational home. Already exposes filters, KPIs, Central Intake, patient cards, Capacity Crisis Mode, and Who Next. Header action rail now makes patient creation, EMS, reassessment, referrals, discharge, queues, and lookup reachable without scrolling.
- `/emergency/patients`: Patient census already supports query-param patient search. Header lookup and command palette now route into this page with query context, reducing dependency on page-specific search alone.
- `/emergency/ems`: EMS actions already exist inline per unit: Prepare Bay, Add to Whiteboard, and Handoff complete. Header and command palette now make EMS intake reachable from every core route.
- `/emergency/intake`: Smart Intake already exposes Start Intake and final identity actions. Header Create Patient keeps the faster central intake path close while the full intake route remains reachable.
- `/emergency/queues`: Queue rows and KPI summary already identify bottlenecks. Header Queue Review and command palette Queue Review reduce dashboard hopping from any route.
- `/emergency/reassessment`: Reassessment route and drawer already show due patients. Header Reassess and command palette Reassessment Queue open the drawer globally.
- `/emergency/capacity`: Capacity detail and header capacity badge remain intact. Capacity is still one click from the header badge and command palette.
- `/emergency/boarding`: Boarding route remains the detail page for admission boarders. Boarding remains one sidebar or command palette action away; capacity/queues provide upstream entry points.
- `/emergency/referrals`: Referral form already supports patient search and `?new=1`. Header Referral and command palette New Referral open the existing form trigger.
- `/emergency/copilot`: Copilot remains available via sidebar, route, keyboard shortcut, and command palette. No new AI workflow was added.
- `/emergency/analytics`: Analytics remains a KPI/detail page. No additional primary action was needed beyond global IA actions.
- `/emergency/settings`: Settings remains admin/configuration only. Primary clinical actions stay in the shell rather than being duplicated inside settings.

## Primary Action Click-Depth Matrix

| Primary action | New global entry point | Existing behavior reused | Click depth from core routes |
| --- | --- | --- | --- |
| Create patient | Header `Create`, command `Create Patient`, keyboard `N` | Existing `open-intake` event and whiteboard QuickIntake | 1 click |
| EMS intake | Header `EMS`, command `EMS Intake`, sidebar EMS | Existing EMS Pipeline route and handoff controls | 1 click |
| Reassessment | Header `Reassess`, reassessment badge, command `Reassessment Queue`, keyboard `R` | Existing reassessment drawer and route | 1 click |
| Referral | Header `Referral`, command `New Referral` | Existing Referrals route with `?new=1` form trigger | 1 click |
| Discharge | Header `Discharge`, command `Discharge Selected Patient` | Existing Patient Detail discharge confirmation | 1 click after patient selection, 2 clicks from lookup |
| Queue review | Header `Queues`, command `Queue Review`, sidebar Queues | Existing Queue Intelligence route | 1 click |
| Patient lookup | Header lookup, command palette patient results, Patients page search | Existing store `selectPatient` and Patients route query | 1 click/search action |

## Validation Results

Passed:

- `npx vitest run src/components/CommandPalette.test.tsx src/routing/canonicalRouteTree.behavior.test.jsx src/config/unified-navigation.config.test.ts src/components/AppShell.r12.test.tsx`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`
- Edited-file diagnostics for `Header.tsx`, `Header.css`, `CommandPalette.tsx`, `CommandPalette.test.tsx`, `PatientDetailPanel.tsx`, and this report.

Nonblocking existing build warnings:

- Vite still reports the existing circular manual chunk warning: `vendor -> vendor-react -> vendor`.
- Vite still reports the existing mixed static/dynamic import warning for `src/services/offlineService.js`.

## Remaining Manual QA

- Exercise header action rail at desktop, tablet, and mobile widths; confirm mobile keeps lookup accessible while primary actions remain available through sidebar and command palette.
- Verify role-specific disabled states for Admin, Charge Nurse, Physician, Registration Clerk, EMS User, and Read-Only Viewer.
- Select a patient from header lookup, then use the global Discharge button and confirm the existing discharge confirmation appears.
- Open Referral from the header and command palette and confirm the existing Referrals form opens with patient search intact.
- Verify overlay stacking with command palette, reassessment drawer, patient detail panel, alert drawer, Copilot, and QuickIntake.
