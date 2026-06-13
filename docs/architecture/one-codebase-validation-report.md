# One Codebase Validation Report

## Active Product

The active user-facing product is CareDroid Emergency OS.

## Active Route Contract

The active route tree in `src/App.jsx` now uses:

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

Legacy roots redirect to `/emergency/whiteboard`, including `/dashboard`, `/home`, `/app`, `/workspace`, `/mobile`, `/general-healthcare`, and retired `/tools/*` paths.

## One-System Checks

| Check | Result | Notes |
|---|---|---|
| One active app shell | Pass | `src/components/AppShell.tsx` is mounted by `src/App.jsx` |
| One active router | Pass | `BrowserRouter` and route tree are owned by `src/App.jsx` |
| One active sidebar | Pass | `src/components/Sidebar.tsx` is mounted by active shell |
| One active header | Pass | `src/components/Header.tsx` is mounted by active shell |
| One active whiteboard | Pass | `src/pages/emergency/index.tsx` is mounted |
| One active intake | Pass | `src/components/QuickIntake.tsx` is used by whiteboard |
| One active patient card | Pass | `src/components/PatientCard.tsx` is used by active whiteboard |
| One active detail panel | Pass | `src/components/PatientDetailPanel.tsx` is mounted by active shell |
| One active ED Copilot panel | Pass | `src/components/CopilotPanel.tsx` is mounted by active shell |
| One Emergency OS type model | Pass | `src/types/emergency.ts` powers new Emergency OS modules |
| Mobile code imported into active web | Pass | No active web imports of Android/Capacitor code found |
| Legacy platform pages mounted | Pass | Not mounted by active route tree |
| Standalone general calculator/tools route mounted | Pass | Removed from active route tree; unknown `/emergency/*` falls back to whiteboard |
| Conditional Emergency OS backend aliases | Pass | Express runtime mounts only `/api/emergency/*` groups |

## Backend Endpoint Convention

The desired backend convention is `/api/emergency/*`. The conditional Mongoose Emergency OS runtime now mounts these groups only:

- `/api/emergency/boarding`
- `/api/emergency/capacity`
- `/api/emergency/copilot`
- `/api/emergency/ems`
- `/api/emergency/governance`
- `/api/emergency/intake`
- `/api/emergency/reassessment`
- `/api/emergency/surge`

The broader Nest backend still exposes documented exceptions:

- `/api/auth/*`
- `/api/chat/*`
- `/api/settings/features`
- `/api/patients/*`
- `/api/fleet/*`
- `/api/audit/*`
- `/api/subscriptions/*`
- `/api/tenant/*`
- other platform-governance and clinical-tool endpoints

These are documented exceptions until backend controllers and frontend service wrappers are migrated or archived.

## What Was Moved

No physical moves in this pass.

## What Was Merged

- Active route tree, sidebar targets, and command palette route destinations now align to the requested Emergency OS route set.
- Backend Emergency OS runtime route groups now align to `/api/emergency/*`.

## What Was Archived

- Review archive manifest created at `archive/_review/README.md`.

## What Was Removed

- Generic platform `/settings` page removed from active mount.
- Legacy product roots removed from active route surface via redirects.
- Standalone `/emergency/tools`, pulse, shift, and AI governance route mounts removed from active product.
- Duplicate backend `/api/v1/governance` alias removed.

## Manual Review

- Backend endpoint migration for broad Nest modules to `/api/emergency/*`.
- Provider reduction in `src/App.jsx`.
- Legacy route/navigation/config/test cleanup.
- Mobile archive decision.
- Full frontend suite cleanup for legacy/audit tests.

## Commands Run

- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`
- `npm ls --depth=0`
- `npm run test:run -- src/routing/canonicalRouteRedirects.test.js src/featureFlagCoverage.test.jsx src/components/EmergencyWhiteboard.navigation.test.js`
- `npm run test:run`
- `cd backend && npm run build`
- `cd backend && npm run lint`
- `cd backend && npm test`
- `cd backend && npm ls --depth=0`
- Repository glob and ripgrep inventory

## Validation Result

Pass for active build/type/lint/backend/focused-route validation and the cleaned broad-frontend failure clusters covered below. The full frontend suite still requires a longer unbounded CI-style run; local broad runs were stopped at bounded waits to avoid leaving hung Vitest processes.

- Frontend typecheck: pass
- Frontend lint: pass
- Production build: pass, with existing large chunk warning
- Focused route/navigation tests: pass, 15 tests
- Backend build: pass
- Backend lint: pass
- Backend tests: pass, 963 tests
- Root dependency install check: pass
- Backend dependency install check: pass
- Full frontend tests: bounded runs still exceed local wait limits. Follow-up passes fixed the previously listed backend orphan inventory for new Emergency AI controller endpoints, orphan-detection thresholds, legacy platform page assertions, API client timeout/auth expectations, plan-doc freshness checks, retired fleet/tools CSS/accessibility assumptions, automation registry product-tier expectations, bundle budget checks expecting removed calculator chunks, Knowledge Graph heading copy drift, Emergency Whiteboard grid identity hooks, Simulation Outcomes heading ambiguity, and PR1 calculator safety-copy source drift.

## Follow-up Validation

- `npx vitest run src/components/PatientCard.clinicalIntelligence.test.jsx src/routing/routeHealth.test.js src/routing/workspaceSubpageRoutes.test.js src/routing/authRouteFlow.test.jsx src/layout/AppShell.layout.test.js src/data/gad7Wiring.test.js src/data/abcd2Wiring.test.js src/data/stopBangWiring.test.js src/data/ascvdRiskWiring.test.js src/data/phq9Wiring.test.js src/data/pr4aComprehensive.test.js src/data/pr1Coverage.test.js src/data/pr2Coverage.test.js src/data/pr4aCoverage.test.js src/data/frontendRenderingInventory.test.js`: pass, 391 tests.
- `npx vitest run src/data/e2eToolValidationMatrix.test.js src/data/wiringAuditConsistency.test.js src/data/clinicalToolsComprehensive.test.js src/data/pr4aTenAreaCoverage.test.js src/data/pr4aConsistency.test.js src/data/pr5Consistency.test.js src/data/ckdStagingWiring.test.js src/data/auditCWiring.test.js src/data/heartScoreWiring.test.js src/data/fib4BisapWiring.test.js src/data/pr1RegistrationAudit.test.js src/data/pr2RegistrationAudit.test.js src/data/pr4aRegistrationAudit.test.js src/data/newClinicalToolsWiringAudit.test.js`: pass, 1837 tests.
- `npx vitest run src/data/toolVisibilityMatrix.test.js`: pass, 9 tests.
- `npx vitest run src/config/canonicalConfig.contract.test.js src/pages/tools/Calculators.route.test.jsx src/routing/canonicalRouteRedirects.test.js src/routing/authRouteFlow.test.jsx`: pass, 40 tests.
- `npm run test:run -- --reporter=verbose`: still fail/hung; stopped after the bounded wait once the remaining non-harmonization failures were captured.

## Second Frontend Cleanup Validation

- `npx vitest run src/data/backendOrphanAudit.test.js src/data/backendFrontendExposure.test.js src/data/backendFrontendExposure.report.test.js src/data/orphanDetectionAudit.report.test.js src/data/fullPlatformConsolidation.test.js src/pages/PlatformOSPages.test.jsx src/pages/ClinicalKnowledgeGraph.test.jsx src/components/EmergencyWhiteboard.storeReactivity.test.jsx src/pages/SimulationLaboratoryViewer.test.jsx src/services/apiClient.auth.test.js src/services/apiClient.test.js src/data/planProgressDashboard.test.js src/data/planImplementationBacklog.test.js src/pages/fleet/fleet.responsive.test.js src/data/accessibilityAudit.test.js src/styles/responsiveUx.test.js src/styles/compactUxFlattening.test.js src/styles/layout-visibility.test.js src/pages/tools/ToolsOverview.responsive.test.js src/services/edAutomationMarketplace.test.js src/data/saasOperatingSystem.test.js src/data/automationRegistry.test.js src/build/bundleBudget.test.js`: pass, 144 tests.
- `npx vitest run src/data/pr1UxAccessibility.test.js`: pass, 16 tests.
- `npm run lint`: pass.
- `npm run typecheck:frontend`: pass.
- `npm run build`: pass, with existing Vite large chunk warning and offline service static/dynamic import warning.
- `npm run test:bundle-budget -- --reporter=verbose`: pass, 1 test.
- `npm run test:run -- --reporter=verbose`: bounded broad reruns continued past 180 seconds and were stopped. The last observed failure was `src/data/pr1UxAccessibility.test.js`, then fixed and verified with the targeted pass above.

## Final Frontend Verification

- `npm run test:run -- --reporter=verbose`: did not pass within the final verification budget. A fresh run on 2026-06-13 was allowed 630,000 ms; the shell moved it to the background at that limit and it was confirmed still running at 641,632 ms. The process tree was terminated; final shell exit after cleanup was 1 at 654,636 ms. No Vitest summary was emitted before termination.
- Latest visible progress at termination: passing late page/data suites through `src/pages/commercial/MaturityAssessmentPage.test.jsx`.
- Failure clusters captured before the timeout:
  - `src/data/pr6FleetComprehensive.test.jsx`, `src/data/prFleetConsistency.test.js`, and `src/data/hospitalOperationsWiring.test.js`: stale dedicated fleet/hospital route expectations inconsistent with the Emergency OS-only active route contract.
  - `src/routes/clinicalToolRoutes.test.js` and `src/routes/clinicalToolRoutes.production.test.js`: stale calculator `/tools/calculators/*` route expectations now redirected or removed from the active route tree.
  - `src/routing/canonicalRouteTree.behavior.test.jsx`, `src/routing/canonicalAppRoutes.deepLink.test.jsx`, `src/App.permissions.test.jsx`, and `src/App.devBypass.test.jsx`: stale legacy route/auth/platform access assumptions plus router-context errors after route cleanup.
  - Other captured legacy/platform failures included `src/pages/OperatingWorkspace.launch.test.jsx`, `src/services/workspaceDataPipelineService.test.js`, `src/services/emergencyOperatingSystemService.test.js`, and `src/utils/chatCapabilitySuggestions.test.js`; these were not changed during final verification because they require broader test ownership decisions.
- Recommended next step: split the broad frontend command into Emergency OS contract tests versus archived legacy/platform tests, update or retire the stale legacy assertions in a dedicated cleanup pass, then rerun the broad suite with the same or higher CI budget.

## Remaining Manual Review

- Full frontend suite remains unverified as a single broad pass; final bounded run exposed pre-timeout stale legacy/platform failures and exceeded the 10.5-minute local budget.
- The broader route smoke inventory still contains archived legacy/platform pages for review visibility; the active `src/App.jsx` route tree remains Emergency OS-only with legacy roots redirecting to `/emergency/whiteboard`.

## Dedicated Legacy Test Cleanup Pass

Completed on 2026-06-13 after the final verification pass. This pass separated active Emergency OS validation from archived legacy/platform inventory expectations without deleting uncertain code.

- Active production routing remains the normalized `/emergency/*` route tree. Retired auth, assistant/chat, tools, fleet, hospital-operations, marketplace, platform-admin, customer portal, enterprise-readiness, success-center, workspaces, and operations paths are now explicit legacy redirects into Emergency OS instead of implicit wildcard fallthrough.
- Stale broad-suite assertions for PR-FLEET, calculator route mounts, hospital operations mounts, old tenant-gated App route permissions, App dev-bypass welcome routing, canonical route behavior, route auth rebuild, workspace/referral data shape, search-first chat suggestions, and Recommendations page heading copy were updated to distinguish active Emergency OS checks from archived/platform inventory checks.
- Router-context errors in `src/pages/OperatingWorkspace.launch.test.jsx` were fixed with a `MemoryRouter` wrapper, and the shared Vitest setup now provides a `scrollIntoView` shim for jsdom.

Validation from this pass:

- `npx vitest run src/data/pr6FleetComprehensive.test.jsx src/data/prFleetConsistency.test.js src/data/hospitalOperationsWiring.test.js src/routes/clinicalToolRoutes.test.js src/routes/clinicalToolRoutes.production.test.js src/routing/canonicalRouteTree.behavior.test.jsx src/routing/canonicalAppRoutes.deepLink.test.jsx src/App.permissions.test.jsx src/App.devBypass.test.jsx src/pages/OperatingWorkspace.launch.test.jsx src/services/workspaceDataPipelineService.test.js src/services/emergencyOperatingSystemService.test.js src/utils/chatCapabilitySuggestions.test.js --reporter=verbose`: pass, 515 tests.
- `npx vitest run src/config/canonicalConfig.contract.test.js src/routing/canonicalRouteRedirects.test.js src/routing/routeHealth.test.js src/routing/workspaceSubpageRoutes.test.js src/routing/routeAuthRebuild.test.js --reporter=verbose`: pass, 26 tests.
- `npx vitest run src/pages/RecommendationsPage.test.jsx --reporter=verbose`: pass, 2 tests.
- `npm run lint`: pass.
- `npm run typecheck:frontend`: pass.
- `npm run build`: pass, with existing Vite large chunk warning and existing offline service static/dynamic import warning.
- `npm run test:run -- --reporter=verbose`: still bounded/unverified as a full-suite run. The 300,000 ms local run was stopped and its process tree was terminated. It exposed a stale `src/pages/RecommendationsPage.test.jsx` heading/copy assertion before the timeout; that focused test was fixed and verified, but the full broad suite was not rerun to completion after that fix.
