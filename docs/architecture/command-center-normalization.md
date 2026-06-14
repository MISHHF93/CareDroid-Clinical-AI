# Command Center Normalization

## Summary

Emergency OS operational intelligence now resolves through one command context projection in the active app. The projection is exported from `src/store/emergencyStore.ts` as `selectEmergencyOperationalSummary` and is rendered once by `src/components/Header.tsx`, so every route inside the existing `AppShell` receives the same top-level operational context without adding routes, shells, routers, backend endpoints, or API conventions.

## Metric Source Map

| Metric | Projection source | Notes |
| --- | --- | --- |
| Patients Today | `store.patients[].arrivalTime` | Counts patients whose arrival date matches the current local day. |
| Waiting | `store.patients[].state` | Counts patients in `PatientState.Waiting`. |
| Longest Wait | `capacity.longestWaitMinutes` or waiting patient `arrivalTime` | Uses capacity snapshot value when present; otherwise derives the longest wait among waiting patients. |
| EMS Inbound | `store.emsArrivals`, `store.emsIncomingPatients`, `store.emsUnits` | Counts inbound arrivals, incoming EMS patient signals, and seeded inbound EMS units. |
| Reassessments Due | `capacity.reassessmentDueCount`, `capacity.reassessmentDue`, or `ReassessmentDue` flags | Prefers capacity snapshot counts and falls back to patient flags. |
| Capacity Score | `store.capacity.score` and `store.capacity.band` | Displayed as score plus band. |
| Boarders | `capacity.boardingCount` or patient boarding state/flags | Uses capacity snapshot count when present; fallback includes admission/disposition/pending-admission patients. |
| Referrals Pending | `store.referrals[].status` | Counts referrals not closed, completed, declined, or departed. |

## Global Visibility Behavior

`Header` now renders an `Operational command context` strip below the page title/action row. The strip contains the eight metrics above in a single horizontal command view. Each metric is route-aware and opens the relevant existing Emergency OS route when the current role can access it:

- Patients Today -> Patients
- Waiting and Longest Wait -> Queues
- EMS Inbound -> EMS
- Reassessments Due -> Reassessment
- Capacity Score -> Capacity
- Boarders -> Boarding
- Referrals Pending -> Referrals

The strip is horizontally scrollable on smaller screens and keeps the existing pilot top-bar actions intact. The previous standalone capacity pill was removed from the top row so capacity is represented by the same normalized metric projection as the rest of the operating context.

## Route Coverage

The change is inherited through the existing `AppShell` used by `src/App.jsx`. Pilot-facing routes covered by the global header context are:

- Whiteboard
- Patients
- EMS
- Intake
- Queues
- Reassessment
- Capacity
- Boarding
- Referrals
- Copilot

Analytics and Settings remain direct routes but hidden from pilot-facing navigation surfaces by `PILOT_CUSTOMER_MODE`.

## Validation

Focused validation should include:

- `vitest run src/components/Header.centralControl.test.tsx`
- `vitest run src/layout/AppShell.navigation.test.jsx src/routing/canonicalRouteTree.behavior.test.jsx`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`

The header test asserts that Pilot Customer Mode still hides advanced central-control surfaces and that all eight operational metrics render in the global command context.

## Manual QA

- Open each pilot-facing route and verify the same eight-metric strip remains visible.
- Confirm compact widths allow horizontal access to all eight metrics without hiding primary actions unexpectedly.
- Click metric chips as a permitted role and verify they route to the existing Patients, Queues, EMS, Reassessment, Capacity, Boarding, and Referrals pages.
- Confirm Analytics and Settings stay hidden from the pilot sidebar/command surfaces while direct routes still resolve.
- Verify seeded/local fallback data and `/api/emergency/*` hydrated data both update the same header projection through the store.
