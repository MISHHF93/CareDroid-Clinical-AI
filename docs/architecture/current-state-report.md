# CURRENT STATE REPORT

Generated: 2026-06-12

## Techstack

- Backend Framework: NestJS 10, bootstrapped from `backend/src/main.ts`. The Nest HTTP adapter is Express.
- Backend Optional Runtime: Express routers in `backend/src/api/*.routes.ts`, mounted only by `registerEmergencyMongooseRuntime` when `ENABLE_MONGOOSE_EMERGENCY_OS=true`.
- Database: SQLite in local development by default (`DATABASE_CLIENT=sqlite`, `SQLITE_PATH`), PostgreSQL when configured by env.
- ORM/ODM: TypeORM for Nest entities; Mongoose for optional Emergency OS models/routes.
- Frontend Framework: React 18 at repository root under `src/`; there is no separate `frontend/` package.
- Frontend Routing: `react-router-dom` v6 in `src/App.jsx`.
- Build Tool: Vite/esbuild for frontend; Nest CLI/TypeScript for backend.
- Package Manager: npm (`package-lock.json` exists at root and backend).
- Authentication: Nest JWT + Passport/OAuth strategies; frontend `UserContext`, bearer token storage, tenant headers, and local/demo auth bypass flags.
- State Management: Zustand stores under `store/`, plus React context providers under `src/contexts`.
- Env Files Read: `.env` and `backend/.env` exist; `frontend/.env` does not exist.

## Backend Files Found

- Backend TypeScript files under `backend/src`: 556.
- Emergency OS Express route files:
  - `backend/src/api/capacity.routes.ts`
  - `backend/src/api/copilot.routes.ts`
  - `backend/src/api/ems.routes.ts`
  - `backend/src/api/reassessment.routes.ts`
  - `backend/src/api/smart-intake.routes.ts`
- Backend socket file:
  - `backend/src/api/ems.socket.ts`
- Backend app entry/module files:
  - `backend/src/main.ts`
  - `backend/src/app.module.ts`
  - `backend/src/app.controller.ts`
  - `backend/src/data-source.ts`
- Backend Emergency OS service registry:
  - `backend/src/services/index.ts`
- Backend optional Mongoose models:
  - `backend/src/models/Patient.ts`
  - `backend/src/models/PatientJourney.ts`
  - `backend/src/models/SmartIntake.ts`

## Frontend Files Found

- `frontend/src` does not exist.
- Root `src` TypeScript/TSX files found: 5.
  - `src/data/featureToggleBackendQueue.ts`
  - `src/services/analyticsService.test.ts`
  - `src/services/analyticsService.ts`
  - `src/services/crashReportingService.ts`
  - `src/utils/logger.ts`
- Active frontend is mostly JS/JSX under root `src`.
- Active frontend entry points:
  - `src/main.jsx`
  - `src/App.jsx`
- Active frontend layout:
  - `src/layout/AppShell.jsx`
  - `src/layout/AppShell.css`
- Active navigation config:
  - `src/config/navigation.config.js`
- Active route constants and alias config:
  - `src/config/routes.config.js`
- Active command-palette route registry:
  - `src/config/commandPalette.config.js`

## Current Layout Structure

- `src/main.jsx` renders `<App />`.
- `src/App.jsx` owns the provider stack and React Router route array.
- Protected pages are wrapped once by `AppShellPage`.
- `AppShellPage` renders one `src/layout/AppShell.jsx`.
- `AppShell.jsx` owns:
  - one navigation rail/sidebar
  - one header
  - one main content region
  - one persistent ED Copilot panel
  - command palette/drawers/overlays
- Tests assert no nested page-level `<AppShell>`, `<Sidebar>`, or duplicate `<main>` in active page routes.

## Current Route Structure

Current canonical Emergency OS routes:

- `/` redirects to `/emergency/whiteboard`.
- `/emergency` redirects to `/emergency/whiteboard`.
- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

Root-level compatibility shortcuts exist for the 8-route prompt shape:

- `/ems` redirects to `/emergency/ems`.
- `/queues` redirects to `/emergency/queues`.
- `/reassessment` redirects to `/emergency/reassessment`.
- `/capacity` redirects to `/emergency/capacity`.
- `/patients` redirects to `/emergency/patients`.
- `/copilot` redirects to `/emergency/copilot`.
- `/settings` redirects to `/emergency/settings`.
- `/` redirects to `/emergency/whiteboard`.

Additional legacy and future routes are redirected to active Emergency OS routes or `/emergency/whiteboard` rather than mounted as active pages.

## Problems Identified

1. The prompt references a `frontend/` package, but the actual frontend is root `src`; paths like `frontend/src/App.tsx` and `frontend/src/router.tsx` do not exist.
2. The prompt's 8 root routes conflict with the current normalized `/emergency/*` architecture. The app currently supports the 8 root paths as redirects while preserving the active Emergency OS route tree.
3. Non-emergency keywords (`icu`, `lab`, `research`, `education`, `fleet`, `iot`, `digital-twin`, `governance`, `enterprise`) appear in many active, tested, or future-module files. Blind deletion would remove referenced source and tests.
4. Optional Mongoose Emergency OS routes are disabled by default unless `ENABLE_MONGOOSE_EMERGENCY_OS=true` and MongoDB env are configured.
5. Broad platform modules are still imported in `backend/src/app.module.ts`; they are not safe to remove without a dedicated backend module retirement plan.

## Files That Should Be Removed

None were safe to remove automatically.

Files and areas recommended for manual review before archival:

- `src/pages/WorkspaceHome.jsx`
- `src/data/emergencyOperatingSystem.js`
- `src/data/platformOperatingSystem.js`
- `src/data/segmentInventory.js`
- `src/data/toolRegistry.js`
- `backend/src/modules/fleet/*`
- `backend/src/modules/platform-governance/*`
- `backend/src/modules/governance/*`
- `backend/src/modules/simulation/*`
- `backend/src/modules/hospital-map/*`

## Missing Files That Should Exist

No required active Emergency OS page is missing in the actual root React app.

The prompt's sample files are missing because this repo does not use that structure:

- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/router.tsx`
- `frontend/src/components/AppShell.tsx`

Equivalent actual files already exist:

- `src/main.jsx`
- `src/App.jsx`
- `src/layout/AppShell.jsx`
- `src/config/routes.config.js`
- `src/config/navigation.config.js`
- `src/config/commandPalette.config.js`
- `backend/src/services/index.ts`
