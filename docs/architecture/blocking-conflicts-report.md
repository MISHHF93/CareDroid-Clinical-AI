# Blocking Conflicts Report

Date: 2026-06-13

## Resolved Blocking Conflict

| Conflict | Classification | Evidence | Resolution |
| --- | --- | --- | --- |
| Backend circular dependency | BLOCKING_CONFLICT | `madge` reported `modules/platform-assets/platform-assets.module.ts > modules/user-profile/user-profile.module.ts > modules/workspaces/workspaces.module.ts`. | Added `backend/src/modules/user-profile/user-preferences.module.ts`; `PlatformAssetsModule` now imports `UserPreferencesModule` instead of `UserProfileModule`; backend circular check now passes. |

## Remaining Non-Blocking Risks

| Risk | Classification | Evidence | Current Decision |
| --- | --- | --- | --- |
| Optional Express/Mongoose Emergency OS routes | NEEDS_MANUAL_REVIEW | `backend/src/main.ts` mounts `registerAllRoutes()` only inside `ENABLE_MONGOOSE_EMERGENCY_OS` runtime branch. | Keep disabled by default; canonical pilot API remains Nest `/api/emergency/*`. |
| Broad backend modules still mounted | LEGACY_STILL_MOUNTED | `backend/src/app.module.ts` imports many non-Emergency modules, including fleet, simulation, product catalog, platform assets, and governance modules. | Not safe to remove without backend retirement plan and contract review. |
| Stale legacy shell references in tests/inventories | DUPLICATE_INACTIVE | Several tests and data inventories still read `src/layout/AppShell.jsx`; runtime uses `src/components/AppShell.tsx`. | Corrected duplicate audit metadata; leave legacy shell file for manual review to avoid breaking tests. |
| Unavailable unused-export tooling | NEEDS_MANUAL_REVIEW | `npx --no-install ts-prune` failed because `ts-prune` is not installed. | Do not install new tooling during safe cleanup; use optional future approval if needed. |
| Local port occupancy | NEEDS_MANUAL_REVIEW | Ports `3000` and `8000` are currently in use by local node/idle processes; `3001`, `8080`, `1883`, `5432`, and `27017` are free. | Do not kill processes automatically; developers should coordinate local dev server ports. |

## Circular Dependency Status

- Backend before cleanup: failed with one cycle.
- Backend after cleanup: passed, no circular dependencies found.
- Frontend: passed, no circular dependencies found.

## No Blind Deletion

The prompt listed destructive deletion commands for models, headers, sidebars, legacy files, and `node_modules`. Those commands were not executed because active code, tests, or compatibility contracts still depend on several listed files.
# Blocking Conflicts Report

Date: 2026-06-13

## Active Blocking Conflicts

No active blocker was found that prevents the discovered spine from running as one Emergency OS system:

- One active frontend entrypoint: `src/main.jsx`.
- One active app/router: `src/App.jsx`.
- One active AppShell: `src/components/AppShell.tsx`.
- One active Emergency OS API facade: `src/services/emergencyOsApi.js`.
- One always-on Nest Emergency OS controller surface: `backend/src/modules/emergency-os/emergency-os.controller.ts`.

## Conditional Conflicts

| Conflict | Classification | Trigger | Impact | Required Action |
| --- | --- | --- | --- | --- |
| Optional Express/Mongoose route registry may overlap Nest `/api/emergency/*` | BLOCKING_CONFLICT if enabled | `ENABLE_MONGOOSE_EMERGENCY_OS=true` plus Mongo URI | Express route groups mount under `/api/*` and `/api/emergency/*`, which can shadow or duplicate active Nest module behavior. | Do not enable for pilot without endpoint-by-endpoint ownership review. |
| Broad backend modules still imported in `AppModule` | LEGACY_STILL_MOUNTED / NEEDS_MANUAL_REVIEW | Backend startup | Non-Emergency platform controllers/services remain mounted even though frontend routes redirect to Emergency OS. | Requires backend retirement plan, contract tests, and owner approval. |
| Legacy `src/layout/AppShell.jsx` still referenced by tests/data audits | DUPLICATE_INACTIVE / NEEDS_MANUAL_REVIEW | Test/source-audit imports | Not active at runtime, but removal would break tests. | Migrate tests/helpers before archival. |
| Existing cleanup scripts previously supported deletion | BLOCKING_CONFLICT mitigated | `CLEAN_EXECUTE=true` | Could delete active or uncertain modules blindly. | Fixed: scripts now verify only. |

## Environment/Port Conflicts

Port status is checked by `scripts/check-ports.sh` without killing processes. Results are recorded in `final-one-system-validation.md`.

## Dependency/Circular Tooling

No `madge`, `ts-prune`, or `dependency-cruiser` dependency was found in root `package.json`. `scripts/fix-circular.sh` reports this and suggests an optional approved command instead of installing tooling.
