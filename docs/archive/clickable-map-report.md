# Clickable Map Report

Generated: 2026-06-12

## Actual Stack Note
The prompt's sample paths use `frontend/src` and 8 relative routes. This repository's active frontend is `src/`, routing is in `src/App.jsx`, and the active Emergency OS navigation is the mounted `/emergency/*` route tree inside the unified `AppShell`.

## Navigation Items

| Item | Path | Button/Link Exists | Page Exists | Route Registered | Status |
|---|---|---:|---:|---:|---|
| Emergency Whiteboard | `/emergency/whiteboard` | Yes | Yes, `EmergencyWhiteboard` | Yes | working |
| Patients | `/emergency/patients` | Yes | Yes, `EmergencyWhiteboard` patient surface | Yes | working |
| EMS Pipeline | `/emergency/ems` | Yes | Yes, `EMSPipeline` | Yes | working |
| Smart Intake | `/emergency/intake` | Yes | Yes, `SmartIntake` | Yes | working |
| Queues | `/emergency/queues` | Yes | Yes, `EmergencyQueueRoute` | Yes | working |
| Reassessment | `/emergency/reassessment` | Yes | Yes, `EmergencyWhiteboard` plus drawer | Yes | fixed |
| Capacity | `/emergency/capacity` | Yes | Yes, `EmergencyCapacityRoute` | Yes | working |
| Boarding | `/emergency/boarding` | Yes | Yes, `EmergencyCapacityRoute` | Yes | working |
| Referrals | `/emergency/referrals` | Yes | Yes, `ReferralPanel` | Yes | fixed |
| ED Copilot | `/emergency/copilot` | Yes | Yes, `EmergencyCopilotRoute` | Yes | working |
| Medical Tools | `/emergency/tools` | Yes | Yes, `ToolsOverview` with embedded calculator intent | Yes | working |
| Department Pulse | `/emergency/pulse` | Yes | Yes, `EmergencyDepartmentPulse` | Yes | working |
| Shift Summary | `/emergency/shift` | Yes | Yes, `EmergencyShiftSummary` | Yes | working |
| Analytics | `/emergency/analytics` | Yes | Yes, `EmergencyAnalytics` | Yes | working |
| Settings | `/emergency/settings` | Yes | Yes, `SettingsRoute` | Yes | working |
| Global Search | `/search` | Yes, account/search surfaces | Yes, `SearchResultsPage` | Yes | fixed |

## Interactive Elements Per Active Surface

### AppShell

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| Sidebar navigation | React Router `Link` to each active route | working | None |
| Wordmark | `navigate('/emergency/whiteboard')` | working | None |
| Capacity badge | opens capacity detail | working | None |
| Reassessment badge | toggles reassessment drawer | working | None |
| Alert drawer actions | select patient, open EMS/queue, dismiss/snooze | working | None |
| Shift summary | `endShift()` then `/emergency/analytics?handoff=1` | working | Previously fixed |
| Command palette route commands | Mounted Emergency OS routes | working | None |
| Command palette calculator commands | `/emergency/tools?source=calculators&filter=calculator&open=...` | working | Previously fixed |

### Emergency Whiteboard / Patients

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| Patient search | `setWhiteboardSearchQuery`, backend search | working | None |
| New Patient | opens intake/new-patient panel | working | None |
| View/filter toggles | local/store state changes | working | None |
| Patient cards | `selectPatient(patient.id)` | working/manual review | Dedicated details button could improve accessibility |
| Patient detail clinical actions | vitals, notes, flags, referral, transfer, discharge | working | None |
| Run Score | `/emergency/tools?source=calculators&filter=calculator&patientId=...` | working | Previously fixed |
| New Order | disabled until backend order endpoint exists | intentionally disabled | None |

### EMS Pipeline

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| Prepare Bay | `prepareEMSBay(arrival.id)` | working | None |
| Add to Whiteboard | `convertEMSArrivalToPatient(arrival.id)` | working | None |
| Complete Handoff | `updateEMSArrival(...Complete...)` | working | None |
| Diversion Status | read-only backend status | working | Previously converted from no-op button |

### Smart Intake

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| Start Intake | `SmartIntakeApi.createSession`, demo fallback | working | None |
| Step buttons | `setActiveStep(index)` | working | None |
| Candidate selection | `setSelectedCandidateId` | working | None |
| Approve/Edit/Reject field | updates local field decision | working/manual review | `Edit` currently means staff override |
| Link/Create/Unknown/Send to Triage | records reviewed final action in local workflow status | working/manual review | Previously added handlers; backend persistence remains optional-runtime work |

### Queues / Reassessment

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| Queue collapse | `onCollapsedChange` state | working | Previously fixed |
| Queue rows | `setQueueFilter(queue.type)` | working | None |
| Clear filter | `setQueueFilter(null)` | working | None |
| `/emergency/reassessment` route | opens `ReassessmentDrawer` | fixed | Added route-driven drawer opening in `AppShell` |
| Reassessment drawer Assess Now | selects patient and closes drawer | working | None |

### Capacity / Boarding / Analytics / Settings

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| Capacity and boarding cards | rendered from store state | working | None |
| Settings tabs | route hash links | working/manual review | Hash section highlighting can be improved |
| Emergency settings controls | local/store and service updates | working | None |
| Feature management switches | feature store toggles and backend surfacing helpers | working/feature-flagged | None |
| Analytics cards | render operational analytics | working | None |

### Referrals

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| New Referral / Transfer | opens form with workflow state | working | None |
| Patient picker | filters and selects active patient | working | None |
| Save Draft / Send Referral | `createReferral` plus backend persistence attempt | working | None |
| Referral row View | selects patient and navigates to `/emergency/patients` | fixed | Added navigation and missing-patient feedback |
| Status actions | `updateReferralStatus` and transfer sync | working | None |

### Copilot / Tools / Search

| UI element | Handler/destination | Status | Fix applied |
|---|---|---|---|
| ED Copilot route | `/emergency/copilot` | working | Previously mounted route content |
| Medical Tools route | `/emergency/tools` | working | Owns clinical tool catalog, operations context, and calculator intent |
| Clinical tool cards | update Medical Tools active surface/search params | working | None |
| Calculator forms | input/output/reset inside `CalculatorInterface` | working | None |
| Save Score to Patient | timeline event and note | working | None |
| Drug checker | reachable from Medical Tools and current drug metadata | working | Older Copilot metadata remains for compatibility |
| `/tools/calculators/:slug` | redirects to `/emergency/tools?source=calculators&filter=calculator&q=:slug&open=:slug` | fixed | Added context-preserving redirect |
| `/tools/drug-checker` | redirects through Medical Tools tool handling | fixed | Older registry paths remain for compatibility |
| `/search` | renders `SearchResultsPage` | fixed | Mounted existing search page |

## Required Tool Accessibility

| Tool | Accessible via | Status | Remaining issue |
|---|---|---|---|
| Patient whiteboard | `/emergency/whiteboard`, sidebar, command palette, search | working | None |
| EMS intake/pipeline | `/emergency/ems`, sidebar, command palette, search | working | None |
| Smart Intake / OCR review | `/emergency/intake`, sidebar, command palette, search | working/manual review | Demo workflow falls back when optional backend is unavailable |
| Queue management | `/emergency/queues`, sidebar, command palette, search | working | None |
| Reassessment alerts | `/emergency/reassessment`, badge, shortcut, command | fixed | Drawer now opens on direct route |
| Capacity dashboard | `/emergency/capacity`, sidebar, command, header badge | working | None |
| Boarding intelligence | `/emergency/boarding`, sidebar, command | working | None |
| Patient search | whiteboard search, command palette, `/search` | fixed | `/search` now mounts |
| Referral workflow | `/emergency/referrals`, sidebar, command, patient quick actions | fixed | Referral View now opens patient surface |
| ED Copilot chat/tools | persistent panel and `/emergency/copilot` | working | None |
| Clinical calculators | Medical Tools hub, command palette, patient Run Score, legacy calculator deep links | fixed | Some complaint chips need product expansion |
| Drug interaction checker | Medical Tools, Copilot metadata, and legacy `/tools/drug-checker` handling | fixed | Older registry paths remain for compatibility |
| System settings | `/emergency/settings`, sidebar, command | working | None |
| MoH data lookup | Not found as active UI/API-backed tool | needs manual review | Do not expose until a real MoH lookup component/API exists |

## Missing Or Manual Review Items

- `src/components/PatientCard.jsx`: patient card container uses card-level selection with nested controls; it is clickable, but a dedicated details button would improve accessibility.
- `src/pages/emergency/SmartIntake.jsx`: final actions are connected locally; real link/create/triage persistence depends on optional backend runtime.
- `src/pages/emergency/SmartIntake.jsx`: field `Edit` currently means staff override, not inline editing.
- `src/components/ProtocolSuggestion.jsx`: complaint calculator chips are strongest for HEART, qSOFA, and NIHSS; trauma, respiratory, abdominal pain, and mental health chips need product-directed expansion.
- MoH lookup is not currently represented as a real active frontend tool.

## Fixes Applied

- Mounted `/search` to the existing `SearchResultsPage`.
- Added legacy calculator routing so `/tools/calculators/:slug` preserves the calculator slug as `/emergency/tools?source=calculators&filter=calculator&q=:slug&open=:slug`.
- Added legacy tool routing for `/tools/drug-checker` through the active Medical Tools handling path.
- Added route-driven reassessment drawer opening for `/emergency/reassessment`.
- Updated Referral row `View` to select the patient and navigate to `/emergency/patients`, with feedback for missing patient records.
- Updated source-level route tests for the new explicit legacy tool redirects.

## Validation

| Check | Result | Notes |
|---|---|---|
| Frontend typecheck | PASS | `npm run typecheck:frontend` |
| Frontend lint | PASS | `npm run lint` |
| Clickable route/search/AppShell tests | PASS | 7 files / 66 tests with `npm run test:run -- src/routing/canonicalRouteRedirects.test.js src/routing/routeAuthRebuild.test.js src/routing/sectionLinkInventory.test.js src/layout/AppShell.navigation.test.jsx src/layout/ProfileSettingsShell.test.jsx src/pages/PlatformOSPages.test.jsx src/routing/canonicalRouteTree.behavior.test.jsx` |
| Production build | PASS with existing warnings | `npm run build`; Vite still warns about large chunks and `offlineService` being both static and dynamic imported |
| Broad `WorkspaceHome.test.jsx` smoke | FAIL / not fixed here | 8 stale workspace-route assertions failed; this report treats them as manual review because they are broader legacy workspace expectations rather than missing click handlers |
