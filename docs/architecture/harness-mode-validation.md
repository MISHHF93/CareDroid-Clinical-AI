# Harness Mode Validation

Date: 2026-06-14

## Scope

Validation covers the safe P1 frontend upgrade in `src/App.jsx` and the required product-harness reports. Backend validation was not run because no backend file was changed in this pass.

## Command Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck:frontend` | PASS | TypeScript frontend check completed. |
| `npm run lint` | PASS | Root frontend ESLint completed. |
| `npm run build` | PASS with warnings | Asset validation passed and Vite build completed. Existing warnings remained: circular manual chunks (`vendor`/`vendor-react`, `data-tool-registry`/`data-clinical-tools`) and `offlineService.js` static/dynamic import warning. |
| `npx vitest run src/routing/canonicalRouteRedirects.test.js src/routing/canonicalRouteTree.behavior.test.jsx src/components/R12EndToEndWiring.test.tsx src/config/unified-navigation.config.test.ts` | PASS | 4 files and 44 tests passed. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-single-instance.ps1` | PASS | Confirmed active entrypoint, router, AppShell, Sidebar, Header, store, API facade, Nest app/controller, `/api/emergency` preference, no active `frontend/src` second app import, and no `frontend/package.json` second app. |

## Applied Upgrade Validation

| Upgrade | Validation |
| --- | --- |
| Shared Emergency OS route state and freshness messaging | PASS: typecheck, lint, build, focused Vitest route/navigation tests, single-instance verification, and IDE lints for `src/App.jsx`. |

## Manual Source Validation

- Confirmed the active route helpers remain in `src/App.jsx`.
- Confirmed no new route, shell, backend module, or API convention was introduced.
- Confirmed no backend files were edited.
- Confirmed IDE diagnostics report no linter errors for `src/App.jsx` after the code change.
