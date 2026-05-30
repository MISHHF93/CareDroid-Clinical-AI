# Terminal Error Fix and Wiring Report

Generated: 2026-05-29

## Summary

CareDroid was validated end-to-end from a clean terminal-driven loop. Root frontend, backend, route, responsive, production build, and live local smoke checks now pass.

Local app validation used:

- Frontend: `http://localhost:8000`
- Backend: `http://localhost:3000`
- Demo auth: `Continue in Demo Mode`
- Backend health: `POST /health`

## Commands Run

### Root / Frontend

- `git status --short`
- `npm install`
- `npm run lint`
- `npm run test:run`
- `npm run build`
- `npm run test:responsive-regression`
- `npm run test:run -- src/routing/routeHealth.test.js src/data/platformCapabilityMatrix.test.js`

### Backend

- `cd backend`
- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test -- src/modules/auth/auth.service.spec.ts`

### Live App Smoke

- Started local stack with `ENABLE_DEV_AUTH_BYPASS=true`, `DATABASE_CLIENT=sqlite`, `SQLITE_PATH=caredroid.dev.sqlite`, and a development `ENCRYPTION_MASTER_KEY`.
- Verified Vite routes return the SPA shell.
- Verified `POST http://localhost:3000/health` returns healthy.
- Verified `/auth` exposes demo access.
- Clicked demo login and verified these protected routes render real app content:
  - `/dashboard`
  - `/assistant`
  - `/tools`
  - `/tools/calculators`
  - `/hospital-map`
  - `/medical-iot`
  - `/devices`
  - `/fleet/map`
  - `/live-map`
  - `/profile`
  - `/settings`

## Failures Found and Root Causes

1. Frontend test failure: `src/pages/tools/ToolsOverview.visibility.test.jsx`
   - Classification: test failure, route/tool visibility contract drift.
   - Root cause: the test expected every user-facing canonical tool to render on initial load, but `ToolsOverview` now defaults to the profile-aware `Recommended for Me` filter.
   - Fix: update the test to explicitly select `All` for full-inventory assertions and compute expected visible tools through the same profile graph as the component.

2. Frontend IA/navigation tests failed:
   - Files:
     - `src/components/Sidebar.toolsNavigation.test.js`
     - `src/data/segmentInventory.test.js`
     - `src/routing/sectionLinkInventory.test.js`
     - `src/styles/compactUxFlattening.test.js`
   - Classification: test failure, route/IA contract drift.
   - Root cause: tests and segment metadata still treated `/tools/calculators` as a separate primary navigation entry, but the current flattened IA makes Calculators a child route under Tools.
   - Fix: keep `/tools/calculators` as a first-class app route, but update tests and segment inventory ownership so `tools` is the primary nav owner.

3. Live demo auth produced backend `401` warnings:
   - Classification: backend/frontend contract mismatch, env/local demo issue.
   - Root cause: Vite development enables demo auth automatically, but backend `/api/auth/dev-session` required `ENABLE_DEV_AUTH_BYPASS=true`. The frontend fell back to a local token that backend APIs rejected.
   - Fix: allow `/api/auth/dev-session` for loopback requests in non-production local development, while continuing to block production and non-local unflagged access.

4. Dashboard live smoke initially hit a React error boundary:
   - Classification: dev server/runtime asset cache issue.
   - Root cause: the existing Vite dev server was serving a stale empty transformed `CommandDashboard.jsx` module from an earlier dev-server state. Production build and source were valid.
   - Fix: stopped stale dev server processes on ports `8000` and `3000`, restarted the stack cleanly, and reran browser validation.

5. Backend dev watcher reported `EADDRINUSE` during final checks:
   - Classification: runtime port/process collision.
   - Root cause: final backend build/test activity triggered the watch process while another Nest process still held port `3000`.
   - Fix: stopped collided dev server processes and restarted the local stack cleanly before final live validation.

6. PowerShell rejected a combined validation command using `&&`:
   - Classification: terminal command syntax issue.
   - Root cause: the active PowerShell version did not accept `&&` as a statement separator.
   - Fix: reran with PowerShell-compatible sequencing using `$LASTEXITCODE`.

## Files Changed

- `backend/src/modules/auth/auth.service.ts`
- `src/pages/tools/ToolsOverview.visibility.test.jsx`
- `src/components/Sidebar.toolsNavigation.test.js`
- `src/data/segmentInventory.js`
- `src/routing/sectionLinkInventory.test.js`
- `src/styles/compactUxFlattening.test.js`
- `docs/terminal-error-fix-and-wiring-report.md`

## Frontend Wiring Fixes

- Profile-aware tool visibility tests now align with the actual `ToolsOverview` default filter and full-inventory filter behavior.
- Calculators route ownership now matches the flattened IA:
  - `/tools` owns primary Tools navigation.
  - `/tools/calculators` remains an app route and validated user-facing route.
- Live browser smoke confirms demo login routes into authenticated app shell pages without blank pages or auth dead ends.

## Backend Wiring Fixes

- `/api/auth/dev-session` now supports local development loopback demo sessions without requiring an explicit environment flag.
- Production remains blocked for dev sessions.
- Non-local unflagged dev session attempts still require `ENABLE_DEV_AUTH_BYPASS=true`.
- Backend health verified with `POST /health`.

## Test and Build Results

- Frontend lint: passed with warnings only.
- Frontend full tests: passed.
- Frontend production build: passed.
- Backend lint: passed with warnings only.
- Backend tests: passed.
- Backend build: passed.
- Responsive regression tests: passed.
- Route health tests: passed.
- Platform capability matrix tests: passed.
- Live authenticated route smoke: passed.

## Remaining Risks

- `npm install` reports existing dependency audit vulnerabilities in both root and backend packages. These were not changed because they require dependency/security triage beyond terminal failure repair.
- ESLint still reports pre-existing warnings in frontend and backend, but zero lint errors.
- Local stack startup should use a real development `ENCRYPTION_MASTER_KEY`, SQLite or an available Postgres instance, and `ENABLE_DEV_AUTH_BYPASS=true` when backend-backed demo API calls are desired.
- Running backend build/test while `nest start --watch` is active can trigger local watcher restarts; stop the dev stack before heavy backend validation to avoid port collisions.
