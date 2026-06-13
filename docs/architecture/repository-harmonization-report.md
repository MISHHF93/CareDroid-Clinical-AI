# Repository Harmonization Report

## What Was Found

CareDroid contains one active Vite React web app, one NestJS backend, one MCP bridge package, one Android/Capacitor mobile tree, and a large set of historical web platform pages/components/tests from a broader healthcare AI platform.

The active product should be CareDroid Emergency OS. Prior to this pass, the active app had already been rebuilt around `src/components/AppShell.tsx`, but routes still used `/emergency`, `/settings`, and `/emergency/tools` as active product paths.

## What Was Moved

No high-risk code directories were physically moved in this pass. The separate app/package candidates are documented in `archive/_review/README.md` for manual archive decisions because moving them would affect package scripts, CI, Android builds, or backend service assumptions.

## What Was Merged

- Active route ownership was consolidated in `src/App.jsx`.
- Active navigation route targets were consolidated in `src/components/Sidebar.tsx`.
- Active keyboard command destinations were consolidated in `src/components/AppShell.tsx`.
- Legacy generic settings route was unmounted from the active product and replaced with an Emergency OS settings placeholder at `/emergency/settings`.

## What Was Archived

- A review archive manifest was created at `archive/_review/README.md`.
- Existing reviewed future modules remain in `src/features/future-modules/_review/`.
- Android, MCP, backend NLU service, and broad legacy platform pages are classified for review rather than blindly moved.

## What Was Removed

- No files were deleted in this pass.
- Active references to old root/general product paths were removed from the primary route tree through redirects to `/emergency/whiteboard`.
- Active mounting of the generic `/settings` page was removed; `/settings` now redirects to `/emergency/settings`.

## What Still Needs Manual Review

- Whether `android/` should remain in-repo as `MOBILE_FUTURE_MODULE` or move under `archive/_review/android`.
- Whether `mcp/` should stay as first-class tooling or move under `archive/_review/mcp`.
- Which `src/pages/tools/*` calculators should be curated into the Emergency OS tools experience.
- Whether app-wide providers from legacy platform contexts can be safely removed from `src/App.jsx`.
- Backend endpoint migration from broad `/api/*` to `/api/emergency/*` where appropriate.
- Legacy tests that assert old component paths, such as `src/components/PatientCard.jsx`.

## Risks

- The repo contains many tests and docs that intentionally reference legacy platform files. Removing them wholesale would likely break historical audit tests.
- Android/Capacitor package scripts still exist and should be updated only if a product owner confirms mobile is archived.
- Backend routes are broad and auth-protected. Renaming controllers to `/api/emergency/*` requires backend contract and frontend API migration work.

## Commands Run

- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`
- `npm run test:run -- src/test/routePagesSmoke.test.jsx`
- `npm run backend:build`
- `npm ls --depth=0`
- `cd backend && npm ls --depth=0`
- Browser route validation with Playwright against Vite dev server on `/`, `/dashboard`, `/settings`, `/emergency`, and all normalized `/emergency/*` routes
- Repository searches for package roots, configs, Android/Kotlin, React components, backend controllers/modules, and deployment files

## Validation Result

Pass.

- Frontend typecheck: pass
- Frontend lint: pass
- Production build: pass, with existing large chunk warning for calculator bundle
- Focused route smoke test: pass
- Backend build: pass
- Root dependency install check: pass
- Backend dependency install check: pass
- Browser route/console smoke: pass, zero console errors
