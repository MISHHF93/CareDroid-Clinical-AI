# Cognitive Load Destruction

Date: 2026-06-14

## Discovery Method

This pass inspected the active CareDroid Emergency OS surface only, preserving one product, one AppShell, one canonical route tree, one API surface, one central node, one operational state model, and the existing design language.

Traced surfaces:

- Routes and aliases in `src/App.jsx` and `src/config/routes.config.js`
- Whiteboard mission control in `src/pages/emergency/index.tsx`
- Patient cards and patient detail selection in `src/components/PatientCard.tsx` and `src/components/PatientDetailPanel.tsx`
- EMS handoff flow in `src/components/EMSPipeline.jsx`
- Queue intelligence in `src/components/QueueIntelligencePanel.jsx` and `QueueRoute`
- Reassessment route and drawer in `src/components/ReassessmentDrawer.tsx`
- AppShell, Header, Sidebar, and Command Palette command routing
- Store actions for `selectedPatientId`, `activeQueueFilter`, and patient/referral/EMS actions
- Existing reports: `workflow-connectivity-report.md` and `cognitive-load-reduction-report.md`

## Friction Inventory

### Whiteboard

- SAFE_FIX_APPLIED: Whiteboard operational metrics for waiting/longest/average wait now route to `Queues` with `?queue=Waiting` so users do not have to reselect the waiting queue after switching screens.
- SAFE_FIX_APPLIED: Whiteboard route guard now preserves query strings through role checks, preventing context loss for any current or future Whiteboard quick link using existing search params.
- HIGH_FRICTION_ACTIVE: Whiteboard still has both command-layer metric tiles and mission-control cards. This is useful for command-center visibility, but tablet density needs manual QA.
- PENDING_PARALLEL_WORK: Whiteboard dominance and final convergence workers may be handling broader mission-control consolidation. No new launcher system was introduced.

### Patients

- SAFE_FIX_APPLIED: `/emergency/patients?patientId=...` now selects the patient automatically and pins that patient first when no search query is present.
- SAFE_FIX_APPLIED: `/emergency/patients?patientSearch=...` now feeds the Patients search box behavior through the same `q` search path.
- CONTEXT_LOSS: Header patient lookup previously selected a patient, then navigated to `/emergency/patients` without durable patient context in the URL.
- SAFE_FIX_APPLIED: Header patient lookup now navigates to `/emergency/patients?patientId=...`.
- SEARCH_FRICTION: Patients still uses text search for broad lookup, but direct patient links no longer require duplicate search.

### EMS

- SAFE_FIX_APPLIED: EMS arrivals with a created/linked `patientId` now expose an `Open Patient` action that selects the patient and opens `/emergency/patients?patientId=...`.
- SCREEN_SWITCH_REQUIRED: Full EMS unit visibility remains on `/emergency/ems`, while Whiteboard keeps only top inbound actions. This split is intentional and follows the existing architecture.
- PENDING_PARALLEL_WORK: EMS bay prep, conversion, and handoff completion remain local/demo writes as documented in `workflow-connectivity-report.md`.

### Queues

- SAFE_FIX_APPLIED: `/emergency/queues` now honors `?queue=`, `?filter=`, and `?queueFilter=` search params and writes the selected queue into `activeQueueFilter`.
- SAFE_FIX_APPLIED: Queue filter clear now clears both store state and URL filter params.
- SAFE_FIX_APPLIED: Queue rows now render patient-name buttons that open the existing global patient detail panel, avoiding a second Patients search.
- DUPLICATED_ACTION: Queue filtering exists from Whiteboard, Queue Intelligence, Header KPI links, and direct URL params. The duplication is now convergent because all paths hit the same `activeQueueFilter` model.

### Reassessment

- SAFE_FIX_APPLIED: `/emergency/reassessment?patientId=...` now selects the patient immediately and prioritizes that due patient in the route list when applicable.
- SAFE_FIX_APPLIED: Drawer-first reassessment remains intact; PatientCard and Whiteboard task buttons still use the existing drawer event.
- SCREEN_SWITCH_REQUIRED: The dedicated reassessment route is still a summary surface. The drawer remains the low-click path for acting without leaving the board.
- MANUAL_REVIEW: Consider whether Header reassessment KPI should open the drawer, the route, or both. This overlaps with alert/escalation and Whiteboard dominance work.

### AppShell, Header, Sidebar, Command Palette

- SAFE_FIX_APPLIED: Header and Command Palette role-guarded navigation now check permissions against the pathname while preserving the original query string.
- SAFE_FIX_APPLIED: AppShell command execution now preserves query strings for `OPEN_ROUTE` actions.
- SAFE_FIX_APPLIED: Sidebar alert subscription now derives active alerts from raw store alerts with `useMemo`, avoiding a `useSyncExternalStore` snapshot loop in route tests.
- SEARCH_FRICTION: Command Palette patient search already selects patients globally without requiring a screen switch. No new command model was added.

## Fixes Applied

- Preserved query-string context in role-guarded navigation helpers across Header, Whiteboard, Command Palette, and AppShell.
- Made Patients route consume `patientId` and `patientSearch` params.
- Made Queues route consume queue filter params and clear them visibly.
- Made Queue rows open patient detail directly from queue patient chips.
- Made Reassessment route consume `patientId` and prioritize that patient when due.
- Added EMS `Open Patient` action for linked EMS arrivals.
- Stabilized Sidebar active-alert derivation to unblock route validation.
- Added focused route behavior coverage for patient and queue search-param handoff.

## Before / After Workflow Notes

Before:

```text
Header patient lookup
  -> select patient
  -> navigate /emergency/patients
  -> URL loses patient context
  -> user may need to search again after reload/share/screen switch
```

After:

```text
Header patient lookup
  -> select patient
  -> navigate /emergency/patients?patientId=<id>
  -> Patients route reselects context and pins patient first
```

Before:

```text
Whiteboard wait metric
  -> /emergency/queues
  -> user manually finds Waiting queue again
```

After:

```text
Whiteboard wait metric
  -> /emergency/queues?queue=Waiting
  -> QueueRoute applies activeQueueFilter
  -> clear button removes store and URL filter state
```

Before:

```text
Queue route
  -> shows patient names as passive text
  -> user switches to Patients or searches to open detail
```

After:

```text
Queue route
  -> patient chips call selectPatient()
  -> existing global PatientDetailPanel opens in-place
```

Before:

```text
EMS handoff converted to patient
  -> patient exists on board
  -> user leaves EMS and searches manually
```

After:

```text
EMS linked arrival
  -> Open Patient
  -> selected patient detail opens through /emergency/patients?patientId=<id>
```

## Remaining Manual Review / Pending Parallel Work

- PENDING_PARALLEL_WORK: Broader Whiteboard dominance, final convergence, flashpoint convergence, patient-journey dominance, API compression, and domain-model unification workers may be handling larger consolidation. This pass avoided route-system or workflow-engine changes.
- PENDING_PARALLEL_WORK: EMS write durability remains local/demo for bay prep, conversion, and handoff completion.
- MANUAL_REVIEW: Decide whether reassessment KPI links should always open the drawer, route, or both.
- MANUAL_REVIEW: Tablet/mobile header density should be manually checked after patient lookup, alerts, staff workload, reassessment, and central status remain visible.
- MANUAL_REVIEW: Queue rows currently expose the first three patients only, matching existing row density. A future design pass can decide whether overflow should expand inline or defer to Patients search.

## Validation

Passed:

- `npm run typecheck:frontend`
- `npm run lint`
- `npm exec vitest run src/routing/canonicalRouteTree.behavior.test.jsx src/components/CommandPalette.test.tsx src/components/EMSPressureScore.test.js`
- Edited-file diagnostics for `src/App.jsx`, `src/pages/emergency/index.tsx`, `src/components/Header.tsx`, `src/components/CommandPalette.tsx`, `src/components/AppShell.tsx`, `src/components/EMSPipeline.jsx`, `src/components/Sidebar.tsx`, and `src/routing/canonicalRouteTree.behavior.test.jsx`

Validation note:

- The first focused Vitest attempt exposed a Sidebar `useSyncExternalStore` snapshot loop from subscribing to a derived active-alert array. This pass stabilized the Sidebar selector, then reran the focused tests successfully.
