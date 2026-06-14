# Disconnected Artifacts After Upgrade

Date: 2026-06-14

## Summary

No active Emergency OS artifact was intentionally left without a route or visible surface. Some retained artifacts are compatibility shims, guarded optional clients, archived review modules, or legacy product surfaces that require a separate cleanup decision.

## Still Disconnected Or Guarded

| Artifact | Classification | Status after upgrade | Reason |
| --- | --- | --- | --- |
| `fetchEmergencyCapacityDashboard` -> `/api/emergency/capacity/dashboard` | MANUAL_REVIEW | Guarded and disabled by `emergencyCapacityDashboard`. | No mounted Nest route found; active capacity uses `/api/emergency/capacity`. |
| `fetchEmergencyCapacityHistory` -> `/api/emergency/capacity/history` | MANUAL_REVIEW | Guarded and disabled by `emergencyCapacityHistory`. | Optional history endpoint is not mounted. |
| `fetchEmergencyQueueAnalytics` -> `/api/emergency/queues/analytics` | MANUAL_REVIEW | Guarded and disabled by `emergencyQueueAnalytics`. | Optional analytics endpoint is not mounted; active queues use `/api/emergency/queues`. |
| `exportEmergencyShiftReport` -> `/api/emergency/shift/report/export` | MANUAL_REVIEW | Guarded and disabled by `emergencyShiftReportExport`. | Export endpoint is not mounted. |
| Smart Intake session API clients | MANUAL_REVIEW | Guarded/optional. | Optional Mongoose runtime endpoints are not active in the current backend module. |
| Referral history/transfer/diversion clients | MANUAL_REVIEW | Guarded or documented as optional. | Current active referral persistence is visible; deeper transfer workflow is not promoted. |
| Simulation/federated/digital-twin advanced clients | MANUAL_REVIEW | Deferred. | Demo backend facades exist, but promotion needs product, reliability, and clinical safety ownership. |
| Upgrade harness endpoints | MANUAL_REVIEW | Rendered only as pilot review cards. | Existing backend facades are deterministic decision-support/audit harnesses, not production automation. |
| Copilot vision model execution | MANUAL_REVIEW | UI input supported; model execution guarded. | The active Copilot can collect image context, but no reviewed backend vision endpoint, audit payload, storage policy, or model governance contract is active. |
| `src/features/future-modules/_review/*` | ARCHIVED | Archived review code. | Already in allowed review folder; not active runtime. |
| `src/layout/AppShell.jsx` | MANUAL_REVIEW | Compatibility/legacy layout artifact. | Runtime AppShell is `src/components/AppShell.tsx`; test/report compatibility still references the legacy file. |
| Broad platform dashboards outside Emergency OS | MANUAL_REVIEW | Retained. | Not safe to move/remove during this Emergency OS pass. |

## Resolved In This Pass

| Gap | Resolution |
| --- | --- |
| Active queue/capacity API rows reused optional disabled capability names. | Added active demo capabilities `emergencyQueues` and `emergencyCapacity`; kept optional dashboard/history/analytics disabled. |
| Integration Hub backend envelope was not rendered in active UI. | Added Settings runtime cards for `/api/emergency/integrations`. |
| Provincial Health backend envelope was not rendered in active UI. | Added Settings runtime cards for `/api/emergency/provincial-health`. |
| Central-node backend envelope was fetched but not driving visible operational status. | `useCareDroidCentralNode` now passes the backend envelope into the central snapshot builder, which harmonizes it into header/status metrics. |
| Patient Journey endpoint had no visible active route evidence. | Patients route now renders `usePatientJourney` state-count and timeline-event status without creating a duplicate journey page. |
| AppShell startup only hydrated a subset of active backend modules. | Store startup now uses the canonical Emergency OS API facade and hydrates queues, reassessment, referrals, and workflow logs into the central store. |
| Copilot composer was text-only while voice/image workflows existed as product direction. | `CopilotPanel.tsx` now renders typed prompts, browser image attachment metadata/previews, and browser speech-recognition dictation where supported; image interpretation remains guarded. |
| EMS and referral vital shapes could appear missing despite existing data. | Normalized current and legacy vital keys. |
| Analytics route fallback was under-shaped. | Store fallback now matches active chart/KPI expectations. |

## Follow-Up Cleanup Candidates

- Decide whether to keep or archive legacy `src/layout/AppShell.jsx` after all tests that import it are migrated.
- Review optional advanced Emergency OS clients once backend route ownership is confirmed.
- Define an explicit Copilot vision-model backend route, audit schema, storage/retention policy, and human-review workflow before enabling clinical image interpretation.
- Perform a focused CSS/browser QA pass for horizontal overflow and mobile breakpoints.
- Audit platform dashboards outside Emergency OS in a separate non-Emergency cleanup task.
