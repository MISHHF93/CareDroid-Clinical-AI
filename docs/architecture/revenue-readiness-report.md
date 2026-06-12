# Revenue Readiness Report

Generated: 2026-06-12

## Verdict

CareDroid Emergency OS is visually pilotable for a walkthrough, but it is not yet backend-source-of-truth ready. The main risk to taking money tomorrow is not route rendering; it is disconnected backend data flow.

## Scores

| Metric | Score | Basis |
| --- | ---: | --- |
| Route Coverage | 100% | 12 / 12 canonical Emergency OS routes are registered. |
| Render Coverage | 100% | 12 / 12 canonical routes render visible content after fixes. |
| API Coverage | 32% | Only a minority of Emergency OS backend endpoints reach visible UI; Smart Intake and patient detail are partial. |
| Data Flow Coverage | 58% | Store-to-UI flow is strong; backend-to-store-to-UI flow is incomplete. |
| Feature Coverage | 91% | All revenue-critical features are visible; reassessment/boarding/patients were normalized; backend source gaps remain. |
| Pilot Readiness Score | 76% | Weighted toward route/render readiness, reduced by API/data-flow disconnects. |

## What Is Ready

- Default app route lands on `/emergency/whiteboard`.
- Active Emergency OS routes are reachable and render inside the unified `AppShell`.
- Patients, reassessment, and boarding no longer look like accidental duplicate routes.
- Smart Intake, EMS, Referrals, and Settings now surface backend unavailable/error states instead of silent failures.
- ErrorBoundary is already present around the app.
- Frontend typecheck, lint, and focused route tests pass after fixes.

## Revenue Blockers

| Blocker | Why it matters | Recommended action |
| --- | --- | --- |
| Backend source of truth is not wired for most active pages. | A pilot customer may expect live operational data, but UI is mostly store/demo-backed. | Build one canonical Emergency OS hydration client for patients, rooms, staff, EMS, reassessment, capacity, referrals. |
| Smart Intake backend flow is partial. | Session/final actions work visibly, but extracted evidence/matching remains fixture-driven. | Render backend session fields/candidates/audit log when available. |
| EMS/reassessment backend events are not subscribed by frontend. | Backend mutations will not update visible UI live. | Add Socket.IO/SSE contract or remove event promises from pilot docs. |
| Copilot has duplicate APIs. | `/api/copilot/query` exists, but UI uses `/api/chat/message`. | Choose one API path for pilot support/debugging. |
| Legacy platform/tool artifacts remain in repo. | They can confuse demos, tests, and support expectations. | Keep redirects active; archive/review unmounted legacy pages after pilot flow stabilizes. |

## Fixes Applied In Revenue-Readiness Pass

- Added `EmergencyPatientsRoute`.
- Added `EmergencyReassessmentRoute` with metrics, queue list, action, and empty state.
- Added boarding-specific route variant.
- Corrected Settings Features tab to `/settings/features`.
- Added visible Settings backend unavailable/error statuses.
- Updated route behavior tests to match pilot-ready route behavior.
- Added reports:
  - `docs/architecture/render-path-report.md`
  - `docs/architecture/backend-to-ui-trace-report.md`
  - `docs/architecture/unmounted-components-report.md`
  - `docs/architecture/disconnected-api-report.md`
  - `docs/architecture/no-return-value-report.md`
  - `docs/architecture/revenue-readiness-report.md`

## First Customer Walkthrough Readiness

Recommended next workflow test:

`log in -> create patient -> triage -> whiteboard -> reassessment -> discharge`

Expected blockers to watch:

- New patient is local-store persisted, not canonical backend persisted.
- Reassessment action routes to patient detail but does not call backend reassessment endpoints.
- Discharge/disposition flow should be verified end-to-end in the store and UI.
- Backend not running or `ENABLE_MONGOOSE_EMERGENCY_OS` disabled will keep the pilot in demo/local mode.

## Validation

| Check | Result |
| --- | --- |
| `npm run typecheck:frontend` | PASS |
| `npm run lint` | PASS |
| `npx vitest run src/routing/canonicalRouteTree.behavior.test.jsx src/layout/AppShell.navigation.test.jsx src/layout/AppShell.layout.test.js src/routing/canonicalRouteRedirects.test.js src/routing/sectionLinkInventory.test.js` | PASS, 5 files / 48 tests |
| `npm run backend:build` | PASS |
| `npm run build` | PASS with existing Vite warnings for large chunks and mixed static/dynamic `offlineService` import. |
| `node --experimental-strip-types scripts/e2e-trace.ts` | PASS as a script. Frontend routes returned `200`; backend `3001` returned `NO_SERVER`. |

## Final Recommendation

For a customer walkthrough tomorrow, use the current app as a guided pilot demo with explicit “backend integration mode” caveat. Before taking real operational money, complete canonical backend hydration and a scripted first-customer walkthrough test.
