# FLATTENED EMERGENCY OS - FINAL STATE

Generated: 2026-06-12

## Architecture Summary

- Layout: single active `src/layout/AppShell.jsx`, wrapped once by `AppShellPage` in `src/App.jsx`.
- Routes: flat route objects in `src/App.jsx`; no nested router tree beyond the single protected shell wrapper.
- Default route: `/` redirects to `/emergency/whiteboard`.
- Emergency OS routes: 12 active `/emergency/*` routes, with 8 root-level prompt shortcuts redirecting into them.
- Services: optional Emergency OS Express routes import singleton services from `backend/src/services/index.ts`.
- Pages: active Emergency OS pages/components render independently inside AppShell.
- Non-emergency code: retained where active, tested, or future-module referenced; not deleted blindly.

## File Structure

```text
backend/src/
├── main.ts                         # Nest bootstrap
├── app.module.ts                   # Nest module registry
├── api/
│   ├── capacity.routes.ts          # Optional Express route
│   ├── copilot.routes.ts           # Optional Express route
│   ├── ems.routes.ts               # Optional Express route
│   ├── reassessment.routes.ts      # Optional Express route
│   └── smart-intake.routes.ts      # Optional Express route
├── services/
│   └── index.ts                    # Emergency OS singleton service exports
├── models/
│   ├── Patient.ts
│   ├── PatientJourney.ts
│   └── SmartIntake.ts
└── modules/
    └── ...                         # Nest feature modules

src/
├── main.jsx                        # React mount
├── App.jsx                         # Providers + flat route array
├── layout/
│   └── AppShell.jsx                # Only active app shell
├── config/
│   ├── routes.config.js            # Canonical route/alias config
│   ├── navigation.config.js        # Single active navigation config
│   └── commandPalette.config.js    # Single Emergency OS command route registry
├── components/
│   ├── EmergencyWhiteboard.jsx
│   ├── EMSPipeline.jsx
│   ├── QueueIntelligencePanel.jsx
│   └── ReferralPanel.jsx
└── pages/
    └── emergency/
        ├── SmartIntake.jsx
        ├── EmergencyAnalytics.jsx
        └── EmergencySettings.jsx
```

## Active Routes

- `/` -> `/emergency/whiteboard`
- `/emergency` -> `/emergency/whiteboard`
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

## Root Shortcut Routes

These satisfy the 8-route prompt shape as compatibility redirects:

- `/ems` -> `/emergency/ems`
- `/queues` -> `/emergency/queues`
- `/reassessment` -> `/emergency/reassessment`
- `/capacity` -> `/emergency/capacity`
- `/patients` -> `/emergency/patients`
- `/copilot` -> `/emergency/copilot`
- `/settings` -> `/emergency/settings`
- `/` -> `/emergency/whiteboard`

## What Was Removed

- No source files were removed.
- No uncertain code was deleted by keyword.

## What Was Added

- `docs/architecture/current-state-report.md`
- `docs/architecture/flattened-emergency-os-final-state.md`

Already present from the preceding normalization pass:

- `src/config/commandPalette.config.js`
- `docs/architecture/current-tech-stack-and-structure.md`
- `docs/architecture/layout-routing-consolidation-report.md`
- `docs/architecture/current-stack-normalization-validation.md`

## What Was Modified

- `docs/architecture/current-state-report.md` was refreshed to match the actual root Vite frontend and Nest backend.

Already modified in the preceding normalization pass:

- `src/App.jsx`: normalized Emergency OS redirects and Copilot navigation.
- `src/config/navigation.config.js`: canonical AppShell navigation paths.
- `src/config/routes.config.js`: alias records point legacy routes into Emergency OS routes.
- `src/components/CommandPalette.jsx`: consumes `src/config/commandPalette.config.js`.
- `src/data/workspaceArchitecture.js`: Emergency workspace opens `/emergency/whiteboard`.
- `backend/src/modules/platform-assets/platform-context.service.spec.ts`: updated test providers to match actual service dependencies.
- Route/layout/search tests updated to assert the current flattened Emergency OS model.

## Verification

Commands run for this prompt:

- `npm run typecheck:frontend`
- `npm run lint`
- `npm run test:run -- src/layout/AppShell.navigation.test.jsx src/routing/canonicalRouteRedirects.test.js src/routing/routeAuthRebuild.test.js src/data/workspaceArchitecture.test.js`
- `cd backend && npm run build`
- `cd backend && npm run lint`

Results:

- Frontend typecheck: passed.
- Frontend lint: passed.
- Frontend route/layout tests: passed, 4 files and 28 tests.
- Backend build: passed.
- Backend lint: passed.

Full validation from the preceding normalization pass also passed:

- Frontend targeted tests: 7 files and 55 tests.
- Frontend production build.
- Backend Jest: 142 suites and 958 tests.

## Next Steps

1. Run `npm run dev` to start the Vite frontend on port 8000.
2. Run `npm run backend:dev` to start the Nest backend on port 3000.
3. Open `http://localhost:8000`; it should route to `/emergency/whiteboard`.
4. Click through the Emergency OS navigation rail and verify each `/emergency/*` route loads.
5. Review future-module candidates before moving anything into `src/features/future-modules/_review/`.
