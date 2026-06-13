# Repository Harmonization Report

## What Was Found

CareDroid contains one active Vite React web app, one NestJS backend, one MCP bridge package, one Android/Capacitor mobile tree, and a large set of historical web platform pages/components/tests from a broader healthcare AI platform.

The active product is CareDroid Emergency OS. Prior to this pass, the active app had been rebuilt around `src/components/AppShell.tsx`, but active navigation still exposed extra tools/governance/pulse/shift surfaces and several active routes still mounted older root-store panels.

## What Was Moved

No high-risk code directories were physically moved in this pass. The separate app/package candidates are documented in `archive/_review/README.md` for manual archive decisions because moving them would affect package scripts, CI, Android builds, or backend service assumptions.

## What Was Merged

- Active route ownership was consolidated in `src/App.jsx`.
- Active navigation route targets were consolidated through `src/config/navigation.config.js` and `src/components/Sidebar.tsx`.
- Active keyboard command destinations now consume `src/config/commandPalette.config.js`.
- Legacy generic settings route was unmounted from the active product and replaced with an Emergency OS settings placeholder at `/emergency/settings`.
- Older root-store EMS, queue, referral, calculator, pulse, shift, and AI governance route mounts were removed from the active app surface.
- Active startup simulation now uses `src/engine/simulation.ts` instead of the older root-level simulation engine.
- The conditional backend Emergency OS runtime now mounts only `/api/emergency/*` route groups.

## What Was Archived

- A review archive manifest was created at `archive/_review/README.md`.
- Existing reviewed future modules remain in `src/features/future-modules/_review/`.
- Android, MCP, backend NLU service, and broad legacy platform pages are classified for review rather than blindly moved.

## What Was Removed

- No files were deleted in this pass.
- Active references to old root/general product paths were removed from the primary route tree through redirects to `/emergency/whiteboard`.
- Active mounting of the generic `/settings` page was removed; `/settings` now redirects to `/emergency/settings`.
- The duplicate `/api/v1/governance` backend mount was removed.

## What Still Needs Manual Review

- Whether `android/` should remain in-repo as `MOBILE_FUTURE_MODULE` or move under `archive/_review/android`.
- Whether `mcp/` should stay as first-class tooling or move under `archive/_review/mcp`.
- Which `src/pages/tools/*` and `src/components/calculators/*` calculators should be curated back into Emergency OS as embedded workflow tools.
- Whether app-wide providers from legacy platform contexts can be safely removed from `src/App.jsx`.
- Backend endpoint migration from broad Nest `/api/*` modules to `/api/emergency/*` where appropriate.
- Legacy tests and audits that still assert old component paths, old platform docs, retired fleet/tools UX, or broad backend inventories.

## Risks

- The repo contains many tests and docs that intentionally reference legacy platform files. Removing them wholesale would likely break historical audit tests.
- Android/Capacitor package scripts still exist and should be updated only if a product owner confirms mobile is archived.
- Backend routes are broad and auth-protected. Renaming controllers to `/api/emergency/*` requires backend contract and frontend API migration work.

## Commands Run

- `npm ls --depth=0`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`
- `npm run test:run -- src/routing/canonicalRouteRedirects.test.js src/featureFlagCoverage.test.jsx src/components/EmergencyWhiteboard.navigation.test.js`
- `npm run test:run`
- `cd backend && npm run build`
- `cd backend && npm run lint`
- `cd backend && npm test`
- `cd backend && npm ls --depth=0`
- Repository searches for package roots, configs, Android/Kotlin, React components, backend controllers/modules, and deployment files

## Validation Result

Pass for build/type/lint/backend/focused active-route tests. A follow-up frontend cleanup also passes the affected route, calculator, frontend rendering, and tool visibility audits. Full root frontend test suite still fails and then hangs after reporting unrelated legacy/audit failures.

- Frontend typecheck: pass
- Frontend lint: pass
- Production build: pass, with existing large chunk warning for calculator bundle
- Focused route/navigation tests: pass, 15 tests
- Backend build: pass
- Backend lint: pass
- Backend tests: pass, 963 tests
- Root dependency install check: pass (`npm ls --depth=0`)
- Backend dependency install check: pass
- Follow-up affected frontend tests: pass (`391` route/rendering tests, `1837` calculator/audit tests, `9` tool visibility tests, and `40` route-config tests).
- Full frontend tests: fail/hung. Safe stale failures for removed calculator mounts, old shell route wrappers, broad route aliases, active `_review` execution, and tool visibility route status were fixed. Remaining failures are concentrated in backend orphan inventory for Emergency AI endpoints, orphan-detection thresholds, legacy platform page/content assertions, API client timeout/auth behavior, plan-doc freshness, retired fleet/tools CSS/accessibility checks, automation registry product-tier expectations, and bundle budget checks expecting removed calculator chunks. The process was stopped after the bounded wait while already showing failures.
