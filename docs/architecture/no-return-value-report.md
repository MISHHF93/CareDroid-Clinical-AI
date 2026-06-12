# No Return Value Report

Generated: 2026-06-12

## Summary

No active frontend route was found to blank because a component failed to return JSX. Backend route handlers return responses, but several service/endpoint contracts either return `void`, return demo placeholders, or return data that is never consumed by active UI.

## Findings

| File / symbol | Finding | Classification | Status |
| --- | --- | --- | --- |
| `backend/src/services/reassessment.service.ts` / `dismissReassessment` | Service performs mutation and returns `void`; route serializes only `{ message: 'Reassessment dismissed' }`. | No Return Value | Not consumed by UI. Safe future fix: return updated patient or dismissal audit event. |
| `backend/src/scheduler/reassessment.scheduler.ts` | Scheduler updates backend state/logs errors but emits no UI event and has no visible delivery status. | Event Not Subscribed, Silent Error | Reported; no safe UI patch without realtime contract. |
| `backend/src/modules/platform-systems/platform-systems.service.ts` / `demo` callers | Many write-like platform endpoints return demo review payloads instead of persisted domain data. | Legacy Artifact, Broken State Flow | Keep out of pilot Emergency OS workflow or label as demo. |
| `src/services/smartIntakeApi.js` before this pass | Non-OK JSON responses were returned as normal payloads. | Broken API Response | Fixed by throwing on `!response.ok`. |
| `src/App.jsx` before this pass | Shell loading condition used `patients.length === 0`, hiding legitimate route empty states. | Rendering Failure, Broken State Flow | Fixed in prior E2E pass. |

## Safe Fixes Applied

- `SmartIntakeApi` now throws on non-OK API responses.
- Smart Intake, EMS, Referral, Settings, and AppShell async paths now surface failures instead of silently swallowing them.
- Reassessment route now has a visible empty state when no patients are due.
- Boarding route now has distinct visible content instead of appearing as a duplicate capacity page.

## Recommended Next Fixes

- Change `dismissReassessment` to return a dismissal audit event or updated patient.
- Add a realtime/event bridge for reassessment and EMS events.
- Replace demo write responses with explicit `success: false`, `executed: false`, or real persistence before production pilot use.
