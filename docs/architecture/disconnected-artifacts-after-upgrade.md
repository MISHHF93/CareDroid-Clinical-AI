# Disconnected Artifacts After Upgrade

Date: 2026-06-14

## Summary

No active Emergency OS artifact was intentionally left without a route or visible surface. Some retained artifacts are compatibility shims, guarded optional clients, archived review modules, or legacy product surfaces that require a separate cleanup decision.

## Still Disconnected Or Guarded

| Artifact | Status after upgrade | Reason |
| --- | --- | --- |
| `fetchEmergencyCapacityDashboard` -> `/api/emergency/capacity/dashboard` | Guarded and disabled by `emergencyCapacityDashboard`. | No mounted Nest route found; active capacity uses `/api/emergency/capacity`. |
| `fetchEmergencyCapacityHistory` -> `/api/emergency/capacity/history` | Guarded and disabled by `emergencyCapacityHistory`. | Optional history endpoint is not mounted. |
| `fetchEmergencyQueueAnalytics` -> `/api/emergency/queues/analytics` | Guarded and disabled by `emergencyQueueAnalytics`. | Optional analytics endpoint is not mounted; active queues use `/api/emergency/queues`. |
| `exportEmergencyShiftReport` -> `/api/emergency/shift/report/export` | Guarded and disabled by `emergencyShiftReportExport`. | Export endpoint is not mounted. |
| Smart Intake session API clients | Guarded/optional. | Optional Mongoose runtime endpoints are not active in the current backend module. |
| Referral history/transfer/diversion clients | Guarded or documented as optional. | Current active referral persistence is visible; deeper transfer workflow is not promoted. |
| Simulation/federated/digital-twin advanced clients | Deferred. | Routes are redirected or review-scoped; not active pilot surface. |
| `src/features/future-modules/_review/*` | Archived review code. | Already in allowed review folder; not active runtime. |
| `src/layout/AppShell.jsx` | Compatibility/legacy layout artifact. | Runtime AppShell is `src/components/AppShell.tsx`; test/report compatibility still references the legacy file. |
| Broad platform dashboards outside Emergency OS | Retained. | Not safe to move/remove during this Emergency OS pass. |

## Resolved In This Pass

| Gap | Resolution |
| --- | --- |
| Active queue/capacity API rows reused optional disabled capability names. | Added active demo capabilities `emergencyQueues` and `emergencyCapacity`; kept optional dashboard/history/analytics disabled. |
| Integration Hub backend envelope was not rendered in active UI. | Added Settings runtime cards for `/api/emergency/integrations`. |
| Provincial Health backend envelope was not rendered in active UI. | Added Settings runtime cards for `/api/emergency/provincial-health`. |
| EMS and referral vital shapes could appear missing despite existing data. | Normalized current and legacy vital keys. |
| Analytics route fallback was under-shaped. | Store fallback now matches active chart/KPI expectations. |

## Follow-Up Cleanup Candidates

- Decide whether to keep or archive legacy `src/layout/AppShell.jsx` after all tests that import it are migrated.
- Review optional advanced Emergency OS clients once backend route ownership is confirmed.
- Perform a focused CSS/browser QA pass for horizontal overflow and mobile breakpoints.
- Audit platform dashboards outside Emergency OS in a separate non-Emergency cleanup task.
