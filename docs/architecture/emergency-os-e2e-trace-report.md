# Emergency OS End-to-End Trace Report

Generated: 2026-06-12

## Scope

This pass traced the active CareDroid Emergency OS surface across:

- Backend Express routers in `backend/src/api/`.
- Backend Nest platform endpoints in `backend/src/modules/platform-systems/`.
- Frontend API clients, route components, `AppShell`, and Emergency OS data flow in `src/`.
- Live route/endpoint reachability using `scripts/e2e-trace.ts`.

## Live Trace Results

Command:

```bash
node --experimental-strip-types scripts/e2e-trace.ts
```

Backend default URL: `http://localhost:3001`  
Frontend default URL: `http://localhost:8000`

### Backend Endpoints

The backend server was not reachable on `3001`, so all backend endpoint checks returned `NO_SERVER` in the live trace.

| Method | Endpoint | Live status | Notes |
| --- | --- | --- | --- |
| GET | `/api/whiteboard` | `NO_SERVER` | Backend unavailable; code path still needs a running backend to verify payload shape. |
| GET | `/api/capacity/dashboard` | `NO_SERVER` | Backend unavailable. |
| GET | `/api/ems/incoming` | `NO_SERVER` | Backend unavailable. |
| GET | `/api/reassessment/due` | `NO_SERVER` | Backend unavailable. |
| POST | `/api/copilot/query` | `NO_SERVER` | Backend unavailable. |
| GET | `/api/intake/session/test` | `NO_SERVER` | Backend unavailable; expected behavior when running is a controlled 404. |

### Frontend Routes

The Vite frontend was reachable on `8000`. All traced active routes returned HTML with HTTP `200`.

| Route | Live status |
| --- | --- |
| `/` | `PASS 200 html` |
| `/emergency/whiteboard` | `PASS 200 html` |
| `/emergency/patients` | `PASS 200 html` |
| `/emergency/ems` | `PASS 200 html` |
| `/emergency/intake` | `PASS 200 html` |
| `/emergency/queues` | `PASS 200 html` |
| `/emergency/reassessment` | `PASS 200 html` |
| `/emergency/capacity` | `PASS 200 html` |
| `/emergency/boarding` | `PASS 200 html` |
| `/emergency/referrals` | `PASS 200 html` |
| `/emergency/copilot` | `PASS 200 html` |
| `/emergency/analytics` | `PASS 200 html` |
| `/emergency/settings` | `PASS 200 html` |
| `/search` | `PASS 200 html` |

## Backend Error Handling Trace

| File | Status | Fix |
| --- | --- | --- |
| `backend/src/api/reassessment.routes.ts` | Expected domain failures were returned as `500`. | Added `reassessmentErrorStatus()` to map not-found errors to `404`, invalid input to `400`, and unknown errors to `500`. |
| `backend/src/api/smart-intake.routes.ts` | Expected workflow/state errors were returned as `500`. | Added `smartIntakeErrorStatus()` and `sendSmartIntakeError()` to map missing sessions to `404`, invalid workflow state to `409`, invalid input/consent errors to `400`, and unknown errors to `500`. |
| `backend/src/api/ems.routes.ts` | Write routes accepted missing/invalid EMS request fields. | Added validation for `ems_unit_id`, `triage_code`, numeric `eta_minutes`, and valid EMS status values. |
| `backend/src/modules/platform-systems/platform-systems.controller.ts` | Missing emergency patients returned `200 null`; incomplete writes could look successful. | Added `NotFoundException` for missing patient reads/updates and `BadRequestException` for missing create patient/referral fields. |

No empty catch blocks or route handlers that can hang indefinitely were found in the audited backend route files.

## Frontend API Call Trace

| File | API surface | Before | After |
| --- | --- | --- | --- |
| `src/services/smartIntakeApi.js` | Smart Intake POST calls | Parsed JSON without checking `response.ok`, so backend 4xx/5xx JSON could be treated as success. | Throws a user-facing error when the HTTP response is not OK. |
| `src/pages/emergency/SmartIntake.jsx` | Create session and final identity actions | Start action had no pending state; final buttons only recorded local status. | Added pending/error state, visible `role="alert"` failure messaging, and backend calls for link/create/continue/triage actions. |
| `src/components/EMSPipeline.jsx` | Fleet snapshot and diversion status | Unexpected promise rejections were not caught. | Added `.catch()` handlers that update existing error/unavailable UI state. |
| `src/components/ReferralPanel.jsx` | Referral persistence and transfer sync | Local store updated optimistically, but backend rejections were invisible. | Added pending state, visible backend status, and catch/finally handling. |
| `src/layout/AppShell.jsx` | Command palette patient search | Unexpected backend search rejection could interrupt command execution. | Wrapped backend search in `try/catch` and preserves local route/search behavior. |
| `src/services/emergencyTransportApi.js` | EMS transport APIs | OK. | Already checks `response.ok` and returns `{ ok, message }`. |
| `src/services/emergencyAnalyticsApi.js` | Analytics APIs | OK. | Already checks `response.ok` and returns controlled fallback state. |

## Rendering Trace

| Component or route | Rendering status |
| --- | --- |
| `src/App.jsx` | `PASS` - App is wrapped by `ErrorBoundary`, `Suspense`, providers, and route protection. |
| `src/layout/AppShell.jsx` | `PASS` - Single shell renders nav rail, header, main content, and Copilot panel. |
| `/emergency/whiteboard` | `PASS` - Mounted through `EmergencyWhiteboard` with store-backed content and route-level states. |
| `/emergency/patients` | `PASS` - Mounted through `PatientDetailView`. |
| `/emergency/ems` | `PASS` - Mounted through `EMSPipeline`; async backend failures now surface in UI state. |
| `/emergency/intake` | `PASS` - Mounted through `SmartIntake`; backend errors now surface visibly. |
| `/emergency/queues` | `PASS` - Mounted through `EmergencyQueueRoute` and `QueueIntelligencePanel`. |
| `/emergency/reassessment` | `PASS_WITH_CAVEAT` - Mounted through `EmergencyWhiteboard` with `ReassessmentDrawer` auto-opened by `AppShell`; a dedicated reassessment page remains a future improvement. |
| `/emergency/capacity` | `PASS` - Mounted through `EmergencyCapacityRoute`. |
| `/emergency/boarding` | `PASS_WITH_CAVEAT` - Reuses capacity route with boarding section, not a dedicated boarding page. |
| `/emergency/referrals` | `PASS` - Mounted through `ReferralPanel`; backend sync failures now surface. |
| `/emergency/copilot` | `PASS` - Mounted through `ClinicalCalculatorHub`. |
| `/emergency/analytics` | `PASS` - Mounted through `EmergencyAnalytics`. |
| `/emergency/settings` | `PASS` - Mounted through `EmergencySettings`. |

Rendering fix applied: `AppShellPage` no longer treats `patients.length === 0` as a global loading condition. A truly empty ED can now render page-level empty/error states instead of being hidden behind an indefinite shell loader.

## Data Flow Trace

| Feature | Data source | Trace result |
| --- | --- | --- |
| Emergency Whiteboard | `useEmergencyStore` seeded/hydrated state; optional backend search | Frontend route renders. Live backend `/api/whiteboard` was unavailable, so backend-to-frontend payload verification remains blocked until backend runs. |
| EMS Intake | `useEmergencyStore` arrivals plus `emergencyTransportApi` fleet/diversion calls | Route renders. Backend fleet/diversion failures now resolve into visible unavailable/error state. Live backend `/api/ems/incoming` was unavailable. |
| Reassessment | Store flags plus optional Express `/api/reassessment/due` backend | Route renders via whiteboard/drawer. Backend due endpoint was unavailable live; backend route now maps expected failures to 4xx. |
| Smart Intake | Demo workflow plus optional Smart Intake backend runtime | Route renders. Backend errors now reject through `SmartIntakeApi` and show visible UI alerts instead of being treated as successful JSON. |
| Referrals | Store referrals plus optional backend persistence/sync | Route renders. Backend sync failures now display as local-save/backend-sync status. |

Main remaining data-flow limitation: core operational state still primarily uses store/demo data. A full backend hydration bundle for patients, rooms, staff, EMS, referrals, and capacity remains a future architectural task.

## Fixes Applied

- Added `scripts/e2e-trace.ts` to run repeatable endpoint, route, and data-flow checks.
- Hardened Smart Intake frontend API error handling and UI feedback.
- Added catch handlers for EMS fleet/diversion async calls.
- Added referral backend pending/error state and failure messages.
- Guarded AppShell command palette backend patient search.
- Allowed route-level empty states by removing the shell-level `patients.length === 0` loader condition.
- Mapped reassessment and smart-intake Express domain failures to proper 4xx statuses.
- Added EMS Express request validation.
- Added Nest `BadRequestException`/`NotFoundException` semantics for platform emergency patients/referrals.
- Updated stale AppShell layout test assertions to match the current layout contract.

## Verification

| Command | Result |
| --- | --- |
| `node --experimental-strip-types scripts/e2e-trace.ts` | PASS as a script; frontend routes on `8000` returned `200`; backend on `3001` was not reachable. |
| `npm run typecheck:frontend` | PASS |
| `npm run lint` | PASS |
| `npm run backend:build` | PASS |
| `npm run test -- platform-systems.controller.spec.ts platform-systems.service.spec.ts` from `backend/` | PASS, 2 suites / 11 tests |
| `npx vitest run src/layout/AppShell.navigation.test.jsx src/layout/AppShell.layout.test.js src/routing/canonicalRouteRedirects.test.js src/routing/sectionLinkInventory.test.js` | PASS, 4 files / 39 tests |
| `npm run build` | PASS with existing Vite warnings for large chunks and `offlineService` mixed static/dynamic import. |

## Remaining Risks

- Live backend endpoint status could not be confirmed because the backend was not running on `3001`.
- `/emergency/reassessment` and `/emergency/boarding` still reuse broader Emergency OS views rather than dedicated page components.
- Store hydration remains demo-first for core Emergency OS state; full backend hydration would require a separate, broader implementation pass.
