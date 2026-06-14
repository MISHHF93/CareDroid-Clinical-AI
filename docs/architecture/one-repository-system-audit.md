# One Repository System Audit

Date: 2026-06-13
Updated: 2026-06-13 one-system cleanup pass

## Executive Finding

CareDroid is one repository with one active root Vite React frontend, one active Nest backend, and one active Emergency OS product spine. The repository also contains compatibility shims, future-module code, generated/build output, Android packaging, MCP tooling, and legacy broad-platform backend modules. Those artifacts are not all safe to delete because several are still imported by tests, config projections, scripts, or optional runtime gates.

The cleanup pass found one real blocking conflict: a backend static import cycle across `PlatformAssetsModule`, `UserProfileModule`, and `WorkspacesModule`. It was resolved by extracting `UserPreferencesModule`, so platform assets now depend only on the user preference provider they use rather than the entire user profile module graph.

## Root Inventory

| Artifact | Classification | Evidence | Decision |
| --- | --- | --- | --- |
| `src/main.jsx`, `src/App.jsx` | ACTIVE_EMERGENCY_OS | Vite entry and router mount. | Keep as only active frontend app entry/router. |
| `src/components/AppShell.tsx`, `Sidebar.tsx`, `Header.tsx` | ACTIVE_EMERGENCY_OS | Imported by `src/App.jsx`; header consumes central node. | Keep as active shell/chrome. |
| `backend/src/main.ts`, `backend/src/app.module.ts` | ACTIVE_EMERGENCY_OS + SHARED_REQUIRED | Nest bootstrap and module graph. | Keep as backend entry. |
| `backend/src/modules/emergency-os/*` | ACTIVE_EMERGENCY_OS | `@Controller('emergency')` maps to `/api/emergency/*`. | Keep as canonical Emergency OS API surface. |
| `src/services/emergencyOsApi.js` | ACTIVE_EMERGENCY_OS | Canonical `/api/emergency/*` facade. | Keep as active frontend API facade. |
| `src/store/emergencyStore.ts` | ACTIVE_EMERGENCY_OS | Canonical Zustand Emergency OS source. | Keep as source of truth. |
| `store/emergencyStore.ts`, `store/featureStore.ts` | DUPLICATE_INACTIVE | Thin re-exports into `src/store/emergencyStore.ts`. | Retain compatibility shims; no active conflict. |
| `frontend/src/store/emergency-store.ts` | DUPLICATE_INACTIVE | Thin re-export into `src/store/emergencyStore.ts`. No `frontend/package.json`. | Retain compatibility shim; not a second app. |
| `src/layout/AppShell.jsx` | DUPLICATE_INACTIVE / NEEDS_MANUAL_REVIEW | Legacy shell helper still read by tests and data audits, not mounted by `src/App.jsx`. | Do not delete; review dependent tests/helpers before archiving. |
| `backend/src/api/routes-registry.ts` Express route registry | NEEDS_MANUAL_REVIEW / conditional BLOCKING_CONFLICT | Mounted only when `ENABLE_MONGOOSE_EMERGENCY_OS=true`; may overlap `/api/emergency/*`. | Keep gated; document risk. |
| `android`, `capacitor.config.json` | FUTURE_MODULE / NEEDS_MANUAL_REVIEW | Android packaging points to root `dist`. | Not a second app; no cleanup. |
| `mcp/package.json` | SHARED_REQUIRED | MCP tooling package, not product runtime app. | Keep. |
| `archive/_review` | ARCHIVE_SAFE | Review archive exists. | Use for future manual archival only. |
| `dist`, `test-results`, `qa`, `logs` | ARCHIVE_SAFE / generated | Build/QA/log artifacts. | Do not remove in dirty tree. |
| `backend/src/modules/*` broad platform modules | LEGACY_STILL_MOUNTED / NEEDS_MANUAL_REVIEW | Imported in `AppModule`; frontend redirects many non-ED routes. | Not safe to disconnect without backend retirement plan. |

## Config Inventory

- Package roots: `package.json`, `backend/package.json`, `mcp/package.json`.
- Lockfiles: root `package-lock.json`, `backend/package-lock.json`, `mcp/package-lock.json`.
- TypeScript configs: `tsconfig.frontend.json`, root `tsconfig.json`, `backend/tsconfig.json`, `backend/tsconfig.eslint.json`.
- Active frontend build: `vite.config.js`.
- Test configs: `vitest.config.js`, root `jest.config.cjs`, backend Jest config in `backend/package.json`, Playwright configs.
- Deployment/runtime: Docker compose files and Vercel/env validators exist; no second frontend build root found.

## Conclusion

No active duplicate frontend app, AppShell, route system, settings source, AI config, integration source, or Emergency OS API facade was found. Real risk remains in legacy backend modules still mounted and optional Express/Mongoose compatibility routes if enabled.

## Cleanup Actions Executed

- Added `backend/src/modules/user-profile/user-preferences.module.ts`.
- Updated `backend/src/modules/user-profile/user-profile.module.ts` to import/export `UserPreferencesModule` instead of declaring `UserPreferencesService` directly.
- Updated `backend/src/modules/platform-assets/platform-assets.module.ts` to import `UserPreferencesModule` instead of the broader `UserProfileModule`.
- Updated `scripts/check-ports.sh` default ports to `3000 3001 8000 8080 1883 5432 27017`.
- Updated `src/data/duplicateSystemAudit.js` canonical shell references to `src/components/AppShell.tsx`.

## Non-Deletion Decision

No uncertain code was deleted. In particular, `src/layout/AppShell.jsx`, `android/`, `frontend/src/*` compatibility shims, broad backend modules, generated docs, and old platform inventories remain because they are still referenced by tests, scripts, optional gates, or manual-review workflows.
