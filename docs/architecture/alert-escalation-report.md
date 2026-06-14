# Emergency OS Alert Escalation Report

Generated: 2026-06-14

## Scope

This pass reviewed active CareDroid Emergency OS alert and escalation paths across the frontend shell, canonical store, backend Emergency OS module, notification adapters, patient detail surfaces, and priority operational pages. The goal was to keep one alert model by routing alert visibility through `src/store/emergencyStore.ts` and the existing Header/AppShell/Sidebar/page surfaces.

## Discovered Alert Sources

| Source | Generated Where | Trigger / Threshold | Alert Type / Severity | Transport |
| --- | --- | --- | --- | --- |
| Backend fixture alerts | `backend/src/modules/emergency-os/emergency-os.fixtures.ts` | Seeded sepsis, reassessment, EMS stroke examples | `EmergencyAlert`, Warning/Critical | `/api/emergency/whiteboard`, `/api/emergency/patients`, `/api/emergency/central-node/snapshot` |
| Backend capacity intelligence | `backend/src/modules/emergency-os/emergency-os.services.ts` via `computeCapacity()` | Occupancy, boarding, reassessment, waiting, discharge-ready, critical EMS deductions | Capacity Warning/Critical, workflow `capacity_score_changed` | `/api/emergency/capacity`, central node snapshot |
| Backend EMS intake | `EMSIntakeService.getEMSIntake()` | EMSArrival flag, ambulance/pre-arrival complaint, high-risk offload | EMS high/critical pressure | `/api/emergency/ems`, central node snapshot |
| Backend boarding intelligence | `BoardingService.getBoarding()` | Admission/Disposition/PendingAdmission boarders, longest boarding minutes | Boarding Warning/Critical | `/api/emergency/boarding`, central node snapshot |
| Backend reassessment engine | `ReassessmentService.getReassessmentQueue()` | `ReassessmentDue` flags and overdue count | Reassessment Warning/Critical | `/api/emergency/reassessment`, central node snapshot |
| Backend referral intelligence | `ReferralService.getReferrals()` / `createReferral()` | Disposition/boarding/high-risk patients and created consult/transfer requests | Referral Warning/Critical | `/api/emergency/referrals`, central node snapshot |
| Backend queue intelligence | `QueueIntelligenceService.getQueues()` | Queue oldest wait above target | Queue Warning | `/api/emergency/queues`, central node snapshot |
| Local alert engine | `src/engine/alertEngine.ts` | Explicit dispatches, score/vitals alerts, notification adapters | Canonical `Alert`, Info/Warning/Critical | `useEmergencyStore.getState().addAlert()` and Sonner toast |
| Local capacity engine | `src/engine/capacityEngine.ts` | Capacity band Orange/Red every capacity interval | Capacity Warning/Critical | Store alert engine |
| Local reassessment/long-wait engine | `src/engine/reassessmentEngine.ts` | Long wait warning/critical/LWBS, vitals age, P1/P2 not assessed, deterioration vitals | Queue/Reassessment/risk flags and alerts | Store flags plus alert engine |
| Patient detail actions | `src/components/PatientDetailPanel.tsx` | Add flag, vitals/NEWS2, referral/timeline activity | Patient scoped alerts and workflow logs | Store mutations |
| Notification adapters | `src/contexts/NotificationContext.jsx`, `src/services/NotificationService.js` | In-app/browser notification requests | System/clinical alerts | Canonical alert engine |
| Vitals alert utility | `src/utils/vitalsAlertPipeline.js` | SpO2, HR, SBP, GCS, temperature thresholds | Patient vitals alert records | Patient detail/Copilot support; not a global dispatcher by itself |
| Clinical alert banner | `src/components/clinical/ClinicalAlertBanner.jsx` | Caller-provided clinical alert object | Local banner severity | Render component only; not canonical Emergency OS alert transport |

## Discovered Render Surfaces

| Surface | Rendered Where | What It Shows | Who Sees It |
| --- | --- | --- | --- |
| Header alert bell/drawer | `src/components/Header.tsx` | Canonical store alerts plus central-node operational alerts | All Emergency OS roles with AppShell access; route actions respect role route access |
| Header operational strip | `src/components/Header.tsx` | Capacity, EMS inbound, reassessment, boarders, referrals, waiting/longest wait | All Emergency OS roles with route fallback |
| Sidebar badges | `src/components/Sidebar.tsx` | Active category alert counts on Whiteboard, Capacity, EMS, Boarding, Reassessment, Referrals, Queues | All roles seeing the canonical navigation item |
| Whiteboard hero/stats | `src/pages/emergency/index.tsx` | Capacity band, EMS signals, reassessment due, boarding, IoMT/VVT signals | All roles that can open the whiteboard |
| Capacity crisis banner/drawer | `src/components/CapacityCrisisMode.tsx` | Orange/Red capacity crisis, score factors, boarding/discharge/reassessment/EMS action list | Whiteboard users; actions gated by store/role action handlers where applicable |
| EMS critical broadcast | `src/components/EMSCriticalBroadcast.jsx` | Critical inbound EMS overlay, banner, checklist, countdown | AppShell users; prep/convert actions gated by EMS permissions |
| Reassessment drawer | `src/components/ReassessmentDrawer.tsx` | Deterioration, sepsis, high-risk, reassessment due patients | AppShell users; patient selection opens detail |
| Referral panel | `src/components/ReferralPanel.jsx` | Referral/transfer queue metrics, active rows, action workflow | Referral/transfer actions gated by role permissions |
| Queue intelligence panel | `src/components/QueueIntelligencePanel.jsx` | Bottleneck alert, queue health rows, queue filters | Queue surface users |
| Patient detail panel | `src/components/PatientDetailPanel.tsx` | Patient-scoped active alerts, flags, vitals, notes, workflow log | Patient-view roles |
| Department pulse | `src/pages/emergency/pulse/index.tsx` | Active alerts, queue bottleneck, EMS, capacity, reassessment return state | Operational roles with pulse route |
| Copilot context | `src/components/CopilotPanel.tsx` | Active alerts included in prompt context | Roles with Copilot permission |
| Notification context | `src/contexts/NotificationContext.jsx` | Store alerts as notifications/read state | Consumers under provider |

## Priority Alert Map

| Area | Generation Source | Trigger / Threshold | Store / API Transport | Render Surface | Target Roles / Users | Current Status |
| --- | --- | --- | --- | --- | --- | --- |
| Capacity | Backend `computeCapacity()`, local `startCapacityEngine()`, `CapacityCrisisMode` administrator action | Orange/Red band, score >= 80, occupancy/boarding/reassessment/EMS deductions | `/api/emergency/capacity`, central node, `store.alerts` | Header bell, operational strip, Sidebar capacity badge, Whiteboard stats, CapacityCrisisMode | Charge nurse, ED manager, admin, read-only/EMS visibility; capacity actions remain gated | Fixed: backend and realtime capacity alerts now hydrate to store and Sidebar/Header |
| EMS | Backend EMS intake, local `addEMSArrival()`, realtime EMS events, EMS critical checklist | Active inbound EMS; Critical/high/P1/stroke/STEMI/trauma/offload-risk | `/api/emergency/ems`, store EMS arrivals, `store.alerts` | Header bell, operational strip, Sidebar EMS badge, EMSCriticalBroadcast, Whiteboard EMS card | Charge nurse, triage nurse, EMS user, ED manager, admin, read-only visibility; prepare/convert gated | Fixed: local and backend EMS alerts now enter store and global badges |
| Boarding | Backend boarding service, `movePatientToState(Admission)`, `addFlag(PendingAdmission)`, capacity crisis derivation | Admission/Disposition/PendingAdmission, longest boarding minutes | `/api/emergency/boarding`, workflow logs, `store.alerts` | Header bell, operational strip, Sidebar boarding badge, CapacityCrisisMode, Boarding page | Charge nurse, ED manager, physician, admin, read-only visibility; boarding management gated | Fixed: PendingAdmission and backend boarding alerts now render globally |
| Reassessment | Backend reassessment service, local reassessment engine, addVitals/NEWS2, addFlag, reassessment reminders | ReassessmentDue, deterioration/sepsis/high-risk, overdue count, long wait/LWBS | `/api/emergency/reassessment`, patient flags, `store.alerts` | Header bell, reassessment badge, Sidebar reassessment badge, drawer, Whiteboard tasks | Triage/charge/physician/admin/read-only visibility; actions gated by patient/vitals permissions | Fixed: reassessment flags now emit global alerts and Sidebar no longer hides them on Whiteboard only |
| Referrals | Backend referral service, ReferralPanel create/update, central node pending count | Active consult/transfer, emergent/stat urgency, pending active queue | `/api/emergency/referrals`, `store.referrals`, `store.alerts` | Header bell, operational strip, Sidebar referral badge, ReferralPanel metrics | Physician, charge nurse, ED manager, admin; read-only visibility; create/update gated | Fixed: created/updated and backend referral alerts now enter store and global badges |

## Missing Visibility Found

- Backend `operationalAlerts` from central node were visible in the Header `ALR` count but not necessarily in the Header alert drawer because the drawer read only `store.alerts`.
- Backend module endpoints produced capacity, EMS, boarding, reassessment, queue, and referral pressure data without guaranteed conversion into canonical store alerts.
- Local `addFlag(ReassessmentDue)` and `addFlag(PendingAdmission)` created workflow logs and page badges but not global alert drawer entries.
- Local `addEMSArrival()` created EMS broadcast/checklist state and workflow logs but not Header/Sidebar alert visibility.
- Local referral creation updated the referral page and workflow logs but did not create global alert visibility.
- Sidebar badge visibility was reassessment-only and attached to the Whiteboard item, leaving capacity/EMS/boarding/referral/queue alerts page-local or Header-only.
- Queue bottleneck synthetic alert used a noncanonical `Red` severity in one selector; retained for existing test compatibility, but canonical store alerts now normalize red-like severities to `Critical`.

## Fixes Applied

- Added canonical alert normalization, merge, and dedupe helpers in `src/store/emergencyStore.ts`.
- Derived operational alerts from backend whiteboard, capacity, EMS, queue, reassessment, boarding, and referral module payloads during refresh/hydration.
- Added realtime derivation for capacity, boarding, queue, and referral updates.
- Routed local reassessment/boarding flags, NEWS2 vitals alerts, EMS arrivals, and referral create/update workflows into `store.alerts`.
- Updated `Header` to merge `centralSnapshot.operationalAlerts` with `store.alerts` for the alert drawer and to route category-only alerts to the relevant Emergency OS page.
- Updated `Sidebar` to show category alert badges on Whiteboard, Capacity, EMS, Boarding, Reassessment, Referrals, and Queues instead of only Whiteboard reassessment count.
- Added CSS positioning support for Sidebar mobile and overflow badges.

## Who Sees Alerts

- Admin, ED manager, charge nurse, physician, triage nurse, EMS user, registration clerk, and read-only viewer can see global shell alert visibility when they are in the Emergency OS AppShell.
- Route/action restrictions still apply. For example, referral creation/update remains permission-gated, EMS prep/convert remains permission-gated, workload/staffing remains permission-gated, and read-only viewers retain observer behavior.
- Public display modes in the central-node model continue to redact patient-sensitive alert details.

## Remaining Manual-Review Risks

- Clinical alert banners and some legacy clinical-alert pages still accept caller-local alert objects and are not fully canonical Emergency OS alert sources.
- Backend Emergency OS alerts are fixture/in-memory-backed; persistence and notification delivery semantics need a production persistence decision.
- Alert dismissal/read state remains local and does not yet round-trip through `/api/emergency/*`.
- Queue bottleneck selector still returns `severity: 'Red'` for existing compatibility; broader cleanup should align it to `Critical` after tests are updated.
- Browser/push notification services still use separate `/api/notifications/*` infrastructure for history/preferences/device registration.

## Validation

- Passed: `npm run typecheck:frontend -- --pretty false`
- Passed: `npx vitest run "src/central-node/careDroidCentralNode.test.ts" "src/store/emergency-store.test.ts" "src/layout/AppShell.navigation.test.jsx" "src/components/QueueIntelligencePanel.test.jsx" "src/components/EMSCriticalBroadcast.test.jsx"`
- Passed: `npx eslint "src/store/emergencyStore.ts" "src/components/Header.tsx" "src/components/Sidebar.tsx"`
