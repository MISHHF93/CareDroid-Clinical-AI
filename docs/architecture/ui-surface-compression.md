# UI Surface Compression

Date: 2026-06-14

## Scope

This pass discovered UI surfaces in the active CareDroid Emergency OS route spine and classified them for "more information, fewer screens" consolidation.

Active spine traced:

```text
src/App.jsx
  -> src/components/AppShell.tsx
  -> src/config/routes.config.js
  -> src/config/unified-navigation.config.ts
  -> src/config/commandPalette.config.js
  -> active /emergency/* routes
  -> whiteboard, patient detail, header, sidebar, panels, drawers, cards
```

The audit also checked legacy compatibility wrappers, future-review UI, modal/drawer/panel/card components, and route/page tests. Broad deletion or movement was intentionally avoided because parallel workers are likely touching state, event, alert, journey, metrics, and API convergence.

## Discovery Method

- Read active route ownership in `src/App.jsx`, `src/config/routes.config.js`, `src/config/unified-navigation.config.ts`, `src/config/commandPalette.config.js`, and `src/data/emergencyPageRenderInventory.js`.
- Read active shell surfaces in `src/components/AppShell.tsx`, `src/components/Header.tsx`, and `src/components/Sidebar.tsx`.
- Read primary Emergency OS surfaces in `src/pages/emergency/index.tsx`, `src/components/PatientCard.tsx`, `src/components/PatientDetailPanel.tsx`, `src/components/ReassessmentDrawer.tsx`, `src/components/ReferralPanel.jsx`, `src/components/QueueIntelligencePanel.jsx`, `src/components/CapacityCrisisMode.tsx`, `src/components/CopilotPanel.tsx`, and `src/components/EMSCriticalBroadcast.jsx`.
- Searched modal, drawer, panel, card, banner, widget, launcher, command, header, sidebar, shell, page, dashboard, future-review, and route-test naming patterns.
- Compared import reachability against the active `src/App.jsx` route tree and the active `src/components/AppShell.tsx` mount points.

## UI Surface Inventory

### Active Primary

| Surface | Files | Classification | Notes |
| --- | --- | --- | --- |
| Emergency OS AppShell | `src/components/AppShell.tsx`, `src/App.jsx` | ACTIVE_PRIMARY | Single active runtime shell. Owns sidebar, header, main outlet, docked patient detail, docked copilot, critical EMS broadcast, reassessment drawer, command palette, and toaster. |
| Whiteboard command center | `src/pages/emergency/index.tsx`, `src/components/EmergencyWhiteboard.jsx` | ACTIVE_PRIMARY | Central operational screen. Already compresses mission control, queue intelligence, EMS summary/actions, capacity crisis, patient cards, and who-next recommendation into one route. |
| Header command strip | `src/components/Header.tsx` | ACTIVE_PRIMARY | Central status, operational metrics, patient lookup, quick create/reassess/referral actions, command palette launcher, alerts drawer, and staff workload launcher. |
| Sidebar and mobile More sheet | `src/components/Sidebar.tsx`, `src/config/unified-navigation.config.ts` | ACTIVE_PRIMARY | Single visible navigation registry with pilot-mode filtering. Mobile collapses non-primary items into one More sheet. |
| Patient card grid | `src/components/PatientCard.tsx` | ACTIVE_PRIMARY | Card-level status, vitals, risk badges, score badges, and direct mission actions reduce route switching for move, reassess, refer, board, and discharge. |
| Patient detail panel | `src/components/PatientDetailPanel.tsx` | ACTIVE_PRIMARY | Docked detail surface for timeline, vitals, flags, workflow logs, calculators, critical checklist, protocol trackers, who-next, staff/room/escalation/discharge actions. |
| Docked Copilot | `src/components/CopilotPanel.tsx` | ACTIVE_PRIMARY | Persistent right rail with department awareness cards and human-reviewed prompt context. |

### Active Supporting Routes

| Surface | Files | Classification | Compression Role |
| --- | --- | --- | --- |
| Patients | inline `PatientsRoute` in `src/App.jsx` | ACTIVE_SUPPORTING | Search/census support route. Duplicates patient cards intentionally for list/search and patient journey counts. |
| EMS | `src/components/EMSPipeline.jsx` | ACTIVE_SUPPORTING | Full EMS pipeline for offload/handoff detail. Whiteboard keeps only immediate EMS arrivals/actions. |
| Intake | `src/pages/emergency/SmartIntake.jsx`, `src/components/QuickIntake.tsx` | ACTIVE_SUPPORTING | Smart Intake remains a full identity workflow; whiteboard/header use QuickIntake for fast central input. |
| Queues | inline `QueueRoute` in `src/App.jsx`, `src/components/QueueIntelligencePanel.jsx` | ACTIVE_SUPPORTING | Dedicated queue page is detail support; whiteboard queue panel is the compressed command surface. |
| Reassessment | inline `ReassessmentRoute` in `src/App.jsx`, `src/components/ReassessmentDrawer.tsx` | ACTIVE_SUPPORTING | Drawer is the command surface; route is a full due/overdue support view. |
| Capacity | inline `CapacityRoute` in `src/App.jsx`, `src/components/CapacityCrisisMode.tsx` | ACTIVE_SUPPORTING | Route gives full room/forecast/boarding view; header, whiteboard stats, and crisis drawer expose high-signal actions. |
| Boarding | inline `BoardingRoute` in `src/App.jsx` | ACTIVE_SUPPORTING | Boarding details overlap with Capacity and PatientCard. Keep as support route until bed-management workflow is fully compressed. |
| Referrals | `src/components/ReferralPanel.jsx` | ACTIVE_SUPPORTING | Full referral/transfer workflow. Whiteboard and patient cards launch prefilled referral action. |
| Medical Tools | `src/pages/tools/ToolsOverview.jsx`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `src/components/ClinicalCalculatorHub.tsx` | ACTIVE_SUPPORTING | Canonical tool route is `/emergency/tools`; calculator hub exists but is not the active route owner. |
| Department Pulse | `src/pages/emergency/pulse/index.tsx` | ACTIVE_SUPPORTING | Hidden operational artifact now mounted as direct route and linked from Analytics/command palette. |
| Shift Summary | `src/pages/emergency/shift/index.tsx` | ACTIVE_SUPPORTING | Handoff support route linked from Analytics/command palette. |
| Analytics | `src/pages/emergency/EmergencyAnalytics.jsx` | ACTIVE_SUPPORTING | Aggregates command-layer metrics, hidden artifact links, upgrade harness cards, and charts. Hidden from pilot sidebar but retained direct route. |
| Settings | `src/pages/emergency/EmergencySettings.jsx` | ACTIVE_SUPPORTING | Admin/support route hidden from pilot sidebar but retained direct route. |

### Drawers, Modals, Panels, Widgets, Banners

| Surface | Files | Classification | Notes |
| --- | --- | --- | --- |
| Reassessment drawer | `src/components/ReassessmentDrawer.tsx` | ACTIVE_SUPPORTING | Best active example of screen compression: route-level reassessment work is available as a drawer from header, command palette, patient cards, and crisis mode. |
| Alert drawer | `src/components/Header.tsx` | ACTIVE_SUPPORTING | Header-local drawer routes non-patient alerts to supporting pages and patient alerts to detail panel. |
| Staff workload panel | `src/components/StaffWorkloadPanel.tsx` | ACTIVE_SUPPORTING | Header-launched workload balancing panel. Hidden in pilot mode. |
| Capacity crisis drawer | `src/components/CapacityCrisisMode.tsx` | ACTIVE_SUPPORTING | Whiteboard-only escalation drawer for deterministic capacity actions and human-reviewed AI suggestion. |
| EMS critical overlay/banner | `src/components/EMSCriticalBroadcast.jsx` | ACTIVE_SUPPORTING | AppShell-level critical broadcast with checklist and conversion actions. |
| Command palette modal | `src/components/CommandPalette.tsx`, `src/config/commandPalette.config.js` | ACTIVE_SUPPORTING | Search and command surface over routes/patients/actions. Uses route and role visibility. |
| Quick intake modal | `src/components/QuickIntake.tsx` | ACTIVE_SUPPORTING | Whiteboard/header fast path into central intake. |
| Calculator modals | `src/components/calculators/HEARTScore`, `src/components/calculators/qSOFA`, `src/components/calculators/PediatricDrugCalc` via `PatientDetailPanel` | ACTIVE_SUPPORTING | Patient-context calculator modals reduce route switching for common detail-panel tasks. |
| Critical checklist modal/panel | `src/components/CriticalChecklist`, `src/components/StrokeCodeProtocol`, `src/components/SepsisBundleTracker` | ACTIVE_SUPPORTING | Patient detail embeds protocol/checklist work rather than routing away. |
| Who Next panel | `src/components/WhoNextPanel.tsx` | ACTIVE_SUPPORTING | Mounted as both floating whiteboard widget and detail-panel footer. This is useful duplication but needs one shared priority source. |
| Data/error banners | `ApiStateBanner` in `src/App.jsx`, `src/components/ApiConfigDegradedBanner.jsx`, `src/components/ToolApiErrorBanner.jsx` | ACTIVE_SUPPORTING | Banners are support surfaces, not routes. |

### Duplicate or Legacy Surfaces

| Surface | Files | Classification | Disposition |
| --- | --- | --- | --- |
| Legacy AppShell | `src/layout/AppShell.jsx` | LEGACY_COMPAT | Large older shell with capacity detail panel, alert toast stack, shortcut modal, pediatric calculator modal, workload balance panel, and embedded ChatInterface. It is not imported by active `src/App.jsx`. Do not wire back into runtime without a dedicated migration. |
| JSX compatibility shims | `src/components/CommandPalette.jsx`, `src/components/ReassessmentDrawer.jsx`, `src/components/WhoNextPanel.jsx`, `src/components/QuickCommandLauncher.jsx`, `src/pages/WorkspaceHome.jsx` | LEGACY_COMPAT | Re-export wrappers retained for compatibility/tests. Active implementations are TypeScript or future-review modules. |
| WorkspaceHome mega surface | `src/features/future-modules/_review/pages/WorkspaceHome.jsx` | FUTURE_REVIEW | Very large historical workspace with emergency queue/pulse/shift/EMS/referral surfaces. Keep quarantined; do not promote into active Emergency OS. |
| Future review DepartmentPulse and ShiftSummary | `src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx`, `src/features/future-modules/_review/components/ShiftSummary.jsx` | FUTURE_REVIEW | Superseded by active `src/pages/emergency/pulse` and `src/pages/emergency/shift`. |
| QuickCommandLauncher | `src/features/future-modules/_review/components/QuickCommandLauncher.jsx`, `src/components/QuickCommandLauncher.jsx` | FUTURE_REVIEW | Separate command launcher not mounted by active shell. Active command surface is `CommandPalette.tsx`. |
| Platform command/executive dashboards | `src/pages/CommandDashboard.jsx`, `src/pages/AiCommandCenterDashboard.jsx`, `src/pages/ExecutiveCommandCenter.jsx` | LEGACY_COMPAT | Platform-era dashboards remain in tests/records, but current route surface redirects product entry to Emergency OS. |

## Duplicate Surfaces

| Duplication | Classification | Recommendation |
| --- | --- | --- |
| Patient grid appears on Whiteboard and Patients route. | DUPLICATE_SURFACE | Keep Whiteboard as primary. Patients route should remain search/census support only. Avoid adding new patient list pages. |
| Queue status appears in Header metrics, Whiteboard stats, QueueIntelligencePanel, and QueueRoute. | DUPLICATE_SURFACE | Keep Header/Whiteboard as summary and QueueRoute as detail. Use the store `activeQueueFilter` handoff for drill-down rather than new queue pages. |
| Reassessment appears in Header badge/action, Whiteboard mission tasks, ReassessmentDrawer, ReassessmentRoute, PatientCard, and CapacityCrisisMode. | DUPLICATE_SURFACE | Drawer is the primary task surface. Route is support. Keep a shared flag predicate across all surfaces. |
| Capacity appears in Header status strip, Whiteboard stats, CapacityCrisisMode, CapacityRoute, BoardingRoute, and Analytics. | DUPLICATE_SURFACE | Whiteboard/Header should carry current state and actions; CapacityRoute should remain the detail route; BoardingRoute should be reviewed for eventual support-route demotion. |
| Referrals appear in PatientCard signals/actions, Whiteboard mission controls, ReferralPanel, QueueRoute referral row, and Analytics. | DUPLICATE_SURFACE | Keep ReferralPanel as write owner. Summary/launch surfaces should link or prefill, not duplicate referral write logic. |
| Copilot appears as docked panel and `/emergency/copilot` route. | DUPLICATE_SURFACE | Keep docked panel as primary working surface. Route should be explanatory/support context and not create a second chat state model. |
| Department Pulse and Analytics overlap on command metrics. | DUPLICATE_SURFACE | Analytics should link to Pulse and display aggregates; Pulse should stay compact live command view. |
| Legacy shell duplicates active alert, capacity, workload, pediatric calculator, command, and copilot surfaces. | DUPLICATE_SURFACE | Keep `src/layout/AppShell.jsx` manual-review only until tests depending on helpers are retired or migrated. |

## Hidden Capabilities

| Capability | Evidence | Classification | Action |
| --- | --- | --- | --- |
| Patient-context calculator launch from stroke/checklist workflow wrote `open=<calculatorId>` to `/emergency/whiteboard`, but whiteboard does not consume that query. | `PatientDetailPanel.openCalculatorHub`, `src/pages/emergency/index.tsx` search | HIDDEN_CAPABILITY | Fixed by routing to `/emergency/tools?source=calculators&filter=calculator&q=<calculatorId>&patientId=<id>`. |
| Active AppShell still had fallback handlers for `OPEN_PEDIATRIC_DRUGS` and `OPEN_CALCULATOR` that sent users to Whiteboard. | `src/components/AppShell.tsx` | HIDDEN_CAPABILITY | Fixed by routing these handlers to the existing Medical Tools calculator filter. |
| `ClinicalCalculatorHub` supports `open`, `tool`, and `calc` query state but is not the active `/emergency/tools` route owner. | `src/components/ClinicalCalculatorHub.tsx`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `src/App.jsx` | MANUAL_REVIEW | Decide whether to mount it inside `ToolsOverview` or retire the page wrapper after confirming no worker owns tool compression. |
| PediatricDrugCalculator modal is fully implemented in legacy shell, while active patient detail uses `PediatricDrugCalc`. | `src/layout/AppShell.jsx`, `src/components/PediatricDrugCalculator.jsx`, `src/components/PatientDetailPanel.tsx` | MANUAL_REVIEW | Keep active detail-panel calculator path. Do not reintroduce legacy shell modal. |
| WorkloadBalancePanel exists in legacy shell while active header mounts StaffWorkloadPanel. | `src/layout/AppShell.jsx`, `src/components/WorkloadBalancePanel.jsx`, `src/components/StaffWorkloadPanel.tsx` | MANUAL_REVIEW | Pick one staff balancing surface after operational metrics/state workers settle. |
| QuickCommandLauncher exists only through future-review wrapper/tests. | `src/components/QuickCommandLauncher.jsx`, `src/features/future-modules/_review/components/QuickCommandLauncher.jsx` | FUTURE_REVIEW | Keep out of active AppShell. Active command surface remains CommandPalette. |
| Future WorkspaceHome still contains emergency pages and widgets. | `src/features/future-modules/_review/pages/WorkspaceHome.jsx` | FUTURE_REVIEW | Keep quarantined. Mine only if a capability is missing from active Emergency OS. |

## Consolidation Model

The intended product model is:

```text
One primary operational screen:
  Whiteboard

Persistent command/context surfaces:
  AppShell
  Header
  Sidebar
  CommandPalette
  PatientDetailPanel
  CopilotPanel

Task drawers/modals:
  ReassessmentDrawer
  QuickIntake
  CapacityCrisisMode
  Alert drawer
  StaffWorkloadPanel
  Patient detail calculators/checklists

Support routes:
  Patients, EMS, Intake, Queues, Reassessment, Capacity, Boarding, Referrals,
  Tools, Pulse, Shift, Analytics, Settings
```

Compression rules:

- Whiteboard remains ACTIVE_PRIMARY. Add summary cards and launch actions there before adding primary routes.
- PatientCard and PatientDetailPanel should expose patient-specific actions before users need a route switch.
- Header should expose global status, search, and alert escalation only. It should not become a second dashboard.
- Analytics should aggregate hidden/support artifacts and link to direct routes, not duplicate live operational work.
- Support routes should be reachable through metrics, cards, command palette, or More navigation, but should not create independent domain/state/write ownership.
- Legacy/future-review surfaces should stay quarantined unless import evidence proves active ownership is missing.

## Safe Fixes Applied

Changed files:

- `src/components/PatientDetailPanel.tsx`
- `src/components/AppShell.tsx`
- `docs/architecture/ui-surface-compression.md`

Fixes:

- Routed patient-detail checklist/calculator launches to the existing Medical Tools route with calculator filter and patient context:

```text
/emergency/tools?source=calculators&filter=calculator&q=<calculatorId>&patientId=<patientId>
```

- Routed active AppShell fallback command actions `OPEN_PEDIATRIC_DRUGS` and `OPEN_CALCULATOR` to the same Medical Tools calculator surface.
- No new route, shell, navigation registry, API client, store, layout system, or design language was introduced.
- No broad UI deletion or movement was performed.

## Pending Parallel Work / Manual Review

| Item | Classification | Reason |
| --- | --- | --- |
| Sidebar route-tree test loop | MANUAL_REVIEW | `src/routing/canonicalRouteTree.behavior.test.jsx` currently fails all route cases with `Maximum update depth exceeded` from `Sidebar` under the test harness. This was not introduced by the route-only calculator fix and should be handled with the navigation/state worker. |
| Capacity versus Boarding route demotion | PENDING_PARALLEL_WORK | Capacity, boarding, metrics, alert, and state-event workers may already be consolidating operational state. Avoid demoting until those reports land. |
| StaffWorkloadPanel versus WorkloadBalancePanel | MANUAL_REVIEW | Active and legacy shells contain different workload surfaces. Needs one owner after role and staffing model settles. |
| ClinicalCalculatorHub versus ToolsOverview | MANUAL_REVIEW | Both can represent calculators, but active route owner is `ToolsOverview`. Decide whether to embed hub or retire wrapper. |
| Future review WorkspaceHome mining | FUTURE_REVIEW | Useful historical widgets exist but should not be mounted wholesale. Mine only missing capabilities. |
| Command palette calculator-specific actions | MANUAL_REVIEW | Active `CommandPalette.tsx` currently exposes route/patient/action commands, not the older calculator command set. The active shell fallback is now safe if such actions return. |

## Validation

Commands run:

```text
npx eslint "src/components/AppShell.tsx" "src/components/PatientDetailPanel.tsx"
npm run typecheck:frontend
npx vitest run "src/components/AppShell.r12.test.tsx" "src/components/PatientCard.clinicalIntelligence.test.jsx" "src/components/ClinicalCalculatorHub.test.tsx" "src/routing/canonicalRouteTree.behavior.test.jsx"
npx vitest run "src/components/AppShell.r12.test.tsx" "src/components/PatientCard.clinicalIntelligence.test.jsx" "src/components/ClinicalCalculatorHub.test.tsx"
```

Results:

| Command | Result |
| --- | --- |
| Edited-file ESLint | Passed |
| Frontend typecheck | Passed |
| Component-focused Vitest subset | Passed: 3 files, 6 tests |
| Full focused route/component Vitest batch | Failed only in `src/routing/canonicalRouteTree.behavior.test.jsx`: 31 route-tree tests hit `Maximum update depth exceeded` in `Sidebar`; the other 3 test files passed |

Remaining validation risk:

- The active route harness failure blocks route-tree proof for this pass. Because the failure occurs in `Sidebar` across every route case and the edited route-only calculator handlers lint/typecheck cleanly, it is recorded as MANUAL_REVIEW rather than fixed here.

## Final Status

The active Emergency OS UI already has the right compression direction: Whiteboard plus docked patient/copilot panels, header command strip, drawers for tasks, and support routes for detail. This pass safely surfaced the hidden calculator launch path through the existing Medical Tools route and documented the remaining duplicate/legacy/future surfaces for follow-up without creating another shell, route registry, API surface, or design language.
