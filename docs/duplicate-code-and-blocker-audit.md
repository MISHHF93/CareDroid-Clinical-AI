# Duplicate Code and Blocker Audit

## 1. Executive Summary

This audit inspected the current CareDroid Clinical AI codebase across frontend, backend, route/tool inventory, build configuration, and tests. No refactors or deletions were performed.

The highest-risk issues are development and deployment blockers rather than one single duplicated component. The repo currently has npm-backed scripts that cannot run in this local shell when `npm` is unavailable, Vercel deploys are intentionally blocked unless production env is set exactly, backend Docker still uses Node 18 while current dependencies require Node 20/22, and Docker Compose has a hard host-port collision on `5000`.

The most harmful code duplicates are the two frontend notification services with incompatible exports, duplicated chat/assistant route expectations in many tests, and duplicated route/tool contract suites that now disagree about `/chat`, `/dashboard`, and `/tools/calculator/*` after route flattening. Tool inventory duplication is mostly intentional aliasing, but several aliases are still risky because executor mapping, NLU mapping, and user-facing launch mapping are not separated cleanly.

## 2. Critical Blockers

| Severity | Finding | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| critical | npm-backed development, test, lint, and build scripts cannot run when npm is missing from PATH. | Root `package.json` requires npm for every normal workflow, and existing docs already record npm/npx/package-manager availability failures. | `package.json`; `docs/unwired-code-discovery-audit.md`; `docs/layout-scroll-regression-report.md` | Install a full Node distribution and repair PATH, then rerun `npm ci`, `npm run build`, `npm run test:run:frontend`, backend `npm ci`, and backend tests. Add `.node-version` or `engines` to make setup deterministic. |

## 3. High-Risk Blockers

| Severity | Finding | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| high | Docker Compose cannot bind all services because two services publish host port `5000`. | `anomaly-detection` and `logstash` both declare `5000:5000`. | `docker-compose.yml` | Remap Logstash or anomaly detection to a unique host port, for example `5001:5000`, or make host ports env-driven. |
| high | Backend Docker image is pinned to Node 18 while current dependencies require Node 20/22. | Backend Dockerfile uses `node:18-alpine`; root uses Node 20 in Docker; lockfiles include packages requiring Node 20 or 22, and `@capacitor/cli@8` requires Node 22. | `backend/Dockerfile`; `Dockerfile`; `package-lock.json`; `backend/package-lock.json`; `package.json` | Standardize on Node `22.12+` across root, backend Docker, Vercel, and local docs, or downgrade incompatible dependencies. |
| high | Fresh root install does not install backend dependencies. | The repo has independent root, backend, and MCP lockfiles but no npm workspace. Root scripts `cd backend && npm run ...` assume backend `node_modules` already exists. | `package.json`; `backend/package.json`; `package-lock.json`; `backend/package-lock.json`; `mcp/package-lock.json` | Add npm workspaces or document and script `npm ci` in each package before backend commands. |
| high | Vercel deploys fail unless env is configured differently from local `.env.example`. | `vercel.json` runs `validate:vercel-env`; validator requires `VITE_API_URL` on Vercel unless same-origin proxy is explicitly allowed, and rejects `VITE_HIDE_DIVISION_MODE=false`. `.env.example` uses local defaults with empty `VITE_API_URL` and `VITE_HIDE_DIVISION_MODE=false`. | `vercel.json`; `scripts/validate-vercel-env.mjs`; `.env.example` | Split local and Vercel env docs. In Vercel, set API origin-only `VITE_API_URL` and set or omit `VITE_HIDE_DIVISION_MODE` so it is not false. |
| high | Duplicate notification services can break alert delivery. | `src/utils/clinicalAlertNotifications.js` imports a default from `../services/NotificationService`, but that file exports a named object. A separate default class exists in `src/services/notifications/NotificationService.js` with different methods and raw fetch behavior. | `src/services/NotificationService.js`; `src/services/notifications/NotificationService.js`; `src/utils/clinicalAlertNotifications.js` | Consolidate to one notification service, or rename by responsibility and add a compatibility export with the methods actually called. |
| high | Normal login and OAuth can remain unauthenticated until profile fetch succeeds. | `Auth.jsx` passes only `data.accessToken`; `AuthCallback.jsx` stores only token; `UserContext` considers auth true only when both token and user exist. | `src/pages/Auth.jsx`; `src/pages/AuthCallback.jsx`; `src/contexts/UserContext.jsx`; `src/App.jsx` | Pass returned user profiles when available, or make OAuth callback fetch/store user before navigating. Add explicit profile-fetch failure UI. |
| high | Clinical AI result pages can crash on partial backend responses. | Multiple pages render nested fields with `.map`, `.join`, or `.length` without array guards. | `src/pages/tools/DifferentialAi.jsx`; `src/pages/tools/TimelineAi.jsx`; `src/pages/tools/PatientSummaryAi.jsx`; `src/pages/tools/OrderSetAi.jsx` | Normalize response DTOs before setting state and default collection fields with `Array.isArray(...) ? ... : []`. |
| high | Broad Vitest runs will hit obsolete route expectations after flattening. | Many older tests still expect `/chat`, `/dashboard`, or legacy `/tools/calculator/*`, while current canonical route code uses `/assistant`, `/home`, and `/tools/calculators/*` with redirects. | `src/pages/tools/ToolsAreaFallback.test.jsx`; `src/data/pr1Coverage.test.js`; `src/data/pr2Coverage.test.js`; `src/data/pr3Coverage.test.js`; `src/data/pr3Comprehensive.test.js`; `src/data/pr4aCoverage.test.js`; `src/data/pr4aComprehensive.test.js`; `src/data/prFleetConsistency.test.js`; `src/data/pr6FleetComprehensive.test.jsx`; `src/data/dispatchAiWiring.test.js`; `src/data/copdGoldWiring.test.js`; `src/data/romeIvIbsWiring.test.js`; `src/data/wiringAuditConsistency.test.js` | Update the route contract tests so only legacy redirect tests assert `/chat`, `/dashboard`, or `/tools/calculator/*`; all user-facing launch expectations should use canonical paths. |

## 4. Duplicate Frontend Code

| Severity | Duplicate | Classification | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| high | Two notification service implementations with different exports and APIs. | harmful duplicate | One service is a named object for browser/backend notification APIs; another is a default class for cost/recommendation/emergency notifications. Consumers import the wrong one. | `src/services/NotificationService.js`; `src/services/notifications/NotificationService.js`; `src/utils/clinicalAlertNotifications.js` | Merge into a single notification API surface or rename to `BrowserNotificationService` and `CostNotificationService` with correct imports. |
| medium | API client behavior is split between shared `apiFetch` and raw `fetch`. | candidate for shared utility | Several services bypass shared API root, auth, timeout, and HTML-response handling. | `src/services/apiClient.js`; `src/services/export/ExportService.js`; `src/services/notifications/NotificationService.js` | Route all app API calls through `apiFetch` or `apiFetchJson`. |
| medium | Repeated unsafe DTO rendering patterns in clinical AI pages. | candidate for shared utility | Each AI page independently renders backend arrays/objects without a normalizer. | `src/pages/tools/DifferentialAi.jsx`; `src/pages/tools/TimelineAi.jsx`; `src/pages/tools/PatientSummaryAi.jsx`; `src/pages/tools/OrderSetAi.jsx` | Add shared result normalizers per DTO family or reusable `safeArray` helpers. |
| medium | Conversation state stores conversations separately from messages. | harmful design duplicate/state split | `conversations` and `messages` are separate global states; selecting a conversation clears messages. | `src/contexts/ConversationContext.jsx`; `src/components/Sidebar.jsx`; `src/App.jsx` | Store messages by conversation id or hydrate from persistence on selection. |
| medium | Tool selection semantics are duplicated: toggle selection vs deterministic selection. | candidate for shared utility | `selectTool` toggles off on same id; `setActiveTool` sets deterministically. Tool action code uses both. | `src/contexts/ConversationContext.jsx`; `src/pages/tools/ToolPageLayout.jsx`; `src/navigation/registryToolLaunch.js` | Use deterministic `setActiveTool` for navigation/launch flows; reserve toggle for interactive filter UI. |
| low | `ChatInterface.jsx` duplicates chat rendering and send behavior not used by current routes. | stale duplicate | Dashboard owns the routed chat/assistant UI while `ChatInterface.jsx` remains as a parallel component. | `src/components/ChatInterface.jsx`; `src/pages/Dashboard.jsx`; `src/App.jsx` | Remove if dead, or extract shared chat renderer used by Dashboard and tests. |
| low | Legacy singular calculator aliases only cover four calculators. | legacy compatibility, incomplete | `LEGACY_CALCULATOR_ROUTE_ALIASES` is hand-written for four old paths. | `src/routes/clinicalToolRoutes.js`; `src/App.jsx`; `src/pages/tools/ToolsAreaFallback.jsx` | Generate singular-to-plural aliases from calculator route defs if broad compatibility is desired. |

## 5. Duplicate Backend Code

| Severity | Duplicate | Classification | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| medium | Auth helper services/guard exist but are not registered or used. | orphan backend services | Injectable classes are present, but `AuthModule` providers do not include them and searches found no usages. | `backend/src/modules/auth/services/device-fingerprint.service.ts`; `backend/src/modules/auth/services/emergency-access.service.ts`; `backend/src/modules/auth/guards/two-factor-enforcement.guard.ts`; `backend/src/modules/auth/auth.module.ts` | Register and wire them into auth flows, or document/remove as deferred. |
| medium | System config endpoint reads an auth config namespace that is not registered under that key. | config mismatch | `AppController.getSystemConfig()` calls `configService.get('auth')`, while auth config exposes `jwt`, `oauth`, and `session`. | `backend/src/app.controller.ts`; `backend/src/config/auth.config.ts` | Read `configService.get('session')` for session timeouts. |
| low | DTOs are scattered inline inside controllers/services. | candidate for shared structure | Request DTOs live in controller/service files rather than module `dto/` folders. | `backend/src/modules/chat/chat.controller.ts`; `backend/src/modules/auth/auth.controller.ts`; `backend/src/modules/auth/services/biometric.service.ts`; `backend/src/modules/notifications/services/device-token.service.ts`; `backend/src/modules/notifications/services/notification-preference.service.ts` | Move DTOs into module `dto/` folders when touching those modules. |
| low | Many NLU tool IDs have no POST executor. | intentional alias/frontend-only contract | Only `sofa-calculator`, `drug-interactions`, and `lab-interpreter` are registered executors; the rest are documented unsupported/chat-only/client-only ids. | `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`; `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts`; `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts` | Keep unsupported docs accurate, or add executor services plus frontend contract updates for any tool requiring server execution. |

## 6. Duplicate Config/Test Code

| Severity | Duplicate/conflict | Classification | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| high | Route tests duplicate broad launch expectations and conflict with current canonical routes. | harmful duplicate | Multiple PR/batch test files assert route behavior independently. Some still expect `/chat`, `/dashboard`, and singular calculator routes. | `src/data/pr*Coverage.test.js`; `src/data/pr*Comprehensive.test.js`; `src/routes/clinicalToolRoutes.production.test.js`; `src/navigation/registryToolLaunch.test.js`; `src/routing/canonicalRouteRedirects.test.js`; `src/routing/sectionLinkInventory.test.js` | Keep one canonical route-contract suite; make other tests check only batch-specific aliases/data. |
| medium | Frontend typecheck appears broader than it is. | config/test friction | `allowJs` is true, but `include` only covers `src/**/*.ts` and `src/**/*.tsx`, excluding most `.js` and `.jsx` app code. | `tsconfig.frontend.json`; `package.json` | Include JS/JSX or rename script to limited TS-only typecheck. |
| medium | Backend lint mutates files during validation. | development-friction duplicate script | Backend `lint` calls a script that runs ESLint with `--fix`, and root `lint:all` uses it as a validation step. | `backend/scripts/run-eslint.mjs`; `backend/package.json`; `package.json` | Split `lint` and `lint:fix`; make CI lint check-only. |
| medium | Multiple package lockfiles without workspace config. | config duplication | Root, backend, and MCP are independent installs but root scripts chain across them. | `package-lock.json`; `backend/package-lock.json`; `mcp/package-lock.json`; `package.json`; `backend/package.json` | Add npm workspaces or explicit setup scripts. |
| low | One skipped backend e2e suite depends on external secrets. | intentional skip | RAG e2e suite uses `describe.skip` unless `OPENAI_API_KEY` and `PINECONE_API_KEY` exist. | `backend/test/rag.e2e-spec.ts` | Keep skip, but document in test plan and add a mock/unit equivalent for CI. |

## 7. Route and Link Conflicts

| Severity | Conflict | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| high | Current source still has many stale `/chat` and `/dashboard` expectations in tests/data. | Canonical routes moved to `/assistant` and `/home`, but older expectations remain. | `src/data/pr3Coverage.test.js`; `src/data/pr4aComprehensive.test.js`; `src/data/pr6FleetComprehensive.test.jsx`; `src/data/dispatchAiWiring.test.js`; `src/test/responsiveRegression.routes.js` | Update stale assertions/data to canonical paths and keep only redirect tests for legacy paths. |
| medium | `/tools/catalog` is now developer-only, but dev fallback user cannot reach it. | Dev fallback user role is `physician`; route requires `CONFIGURE_SYSTEM`; physicians lack that permission. | `src/auth/devAuthBypass.js`; `src/contexts/UserContext.jsx`; `src/App.jsx`; `src/components/Sidebar.jsx`; `src/pages/tools/ToolsOverview.jsx` | Either grant dev fallback user admin/config permission in explicit dev mode or route dev users to `/tools` and document catalog needs admin. |
| medium | Operations cards can route users into permission-gated pages. | Operations UI lists Analytics and Audit pages without checking permissions, but routes are permission-gated. | `src/pages/Operations.jsx`; `src/App.jsx` | Hide or disable cards with permission-aware copy. |
| low | Top-level unknown route redirects hide dead links. | Catch-all route redirects authenticated users to `/home` and anonymous users to `/`, instead of rendering a not-found page. | `src/App.jsx` | Add a top-level Not Found page while keeping known legacy redirects. |

## 8. Tool Inventory Conflicts

| Severity | Conflict | Classification | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| medium | Alias map drift for flattened child tools. | legacy compatibility, risky alias conflict | `ORCHESTRATOR_TO_REGISTRY_ID` maps some NLU IDs to parent pages while `NLU_TO_REGISTRY_ID` and `toolRegistry.js` now have dedicated child rows. | `src/data/clinicalToolIdContract.js`; `src/data/toolRegistry.js`; `src/data/clinicalIntentToolCatalog.js` | Split executor id mapping from launch/sidebar alias mapping; align child NLU ids to dedicated registry rows. |
| medium | `backendExecutable` flag is overloaded. | safe leave with misleading naming | `backendExecutable: true` can mean NLU/backend-routed, but not necessarily POST executor support. | `src/data/clinicalIntentToolCatalog.js`; `src/data/clinicalToolIdContract.js`; `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` | Rename/separate into `backendRouted` and `postExecutable`. |
| medium | Duplicate shortcut labels. | harmful duplicate if shortcuts become active | Many registry rows independently reuse `Ctrl+Shift+...` labels. | `src/data/toolRegistry.js`; `src/data/backendFrontendToolContract.js` | Create a single shortcut registry or remove display until shortcuts are dispatchable. |
| low | Workspace filters can make shipped tools look hidden. | intentional filter with visibility friction | Persisted custom workspaces are returned unchanged; new default workspace tool lists are refreshed. | `src/contexts/WorkspaceContext.jsx`; `src/data/sidebarToolPresentation.js`; `src/pages/tools/ToolsOverview.jsx` | Add "tools outside this workspace" affordance or prompt to add new tools. |
| low | Stale source-scan/report metadata. | stale generated metadata | Reports recommend adding rows that tests now expect to be visible; source text still references older pattern counts. | `src/data/toolVisibilityMatrix.js`; `src/data/sourceCodeToolDiscovery.js` | Regenerate/update report text and source-scan labels. |
| low | Disabled phantom endpoint appears in contract data. | safe leave, stale contract | `/api/tools/share-results` is documented in frontend contract data, but backend capability is disabled and no route exists. | `src/data/toolInventory.js`; `src/data/backendFrontendToolContract.js`; `src/data/frontendApiCallsInventory.js`; `src/config/backendApiCapabilities.js` | Mark planned/disabled explicitly or remove from active backend contract rows. |

## 9. Backend Contract Conflicts

| Severity | Conflict | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| medium | Frontend inventory misses real audit callers. | `auditApi.js` calls audit endpoints that are not listed in `FRONTEND_API_CALLS`; exposure policy may misclassify them. | `src/services/auditApi.js`; `src/data/frontendApiCallsInventory.js`; `src/data/backendRouteExposurePolicy.js`; `src/data/backendHttpRouteInventory.js` | Add `/api/audit/my-logs` and `/api/audit/phi-access` to the frontend call inventory with role/capability notes. |
| medium | Generated orphan-backend doc is referenced but absent. | Source comments and docs reference `docs/orphaned-backend-functions.md`, but the file does not exist. | `src/data/backendRouteExposurePolicy.js`; `src/data/backendOrphanAudit.js`; `docs/unwired-orphan-code-scan.md`; `docs/final-full-stack-scan-report.md` | Generate the doc or update references to an existing backend exposure report. |
| medium | OAuth endpoints can look available when strategies are not configured. | `AuthModule` providers return `null` when provider client IDs are missing, but auth UI still offers provider links. | `backend/src/modules/auth/auth.module.ts`; `src/pages/Auth.jsx` | Expose auth capability/config status to the UI and hide or label unavailable OAuth providers. |
| medium | Frontend local demo token does not imply backend API access. | Frontend fallback creates a mock token; backend protected endpoints still require valid JWT/dev-session token. | `src/auth/devAuthBypass.js`; `backend/src/modules/auth/auth.service.ts`; `backend/src/modules/auth/strategies/jwt.strategy.ts` | Make UI-only demo mode explicit in API error banners or require backend `ENABLE_DEV_AUTH_BYPASS=true` for API-backed dev sessions. |

## 10. Auth/Dev Access Blockers

| Severity | Finding | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| high | Login/OAuth token-only flows can bounce back to auth until profile fetch succeeds. | `isAuthenticated` is `Boolean(authToken && user)`, but normal login/OAuth stores only token initially. | `src/pages/Auth.jsx`; `src/pages/AuthCallback.jsx`; `src/contexts/UserContext.jsx` | Store returned profile where available and add a blocking "loading profile" state with explicit failure handling. |
| medium | Dev bypass fallback cannot inspect Developer Catalog after recent gating. | Dev fallback role is physician, but catalog route requires admin-level config permission. | `src/auth/devAuthBypass.js`; `src/contexts/UserContext.jsx`; `src/App.jsx` | Decide whether explicit dev mode should be admin-like or keep catalog admin-only and document that limitation. |
| medium | OAuth buttons are always visible even when backend strategies are unavailable. | UI builds OAuth URLs unconditionally; backend provider factory returns null without client IDs. | `src/pages/Auth.jsx`; `backend/src/modules/auth/auth.module.ts` | Fetch/display auth capability state or make provider buttons show configured/unavailable state. |

## 11. Build/Vercel Blockers

| Severity | Finding | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| critical | npm scripts cannot run in the current local environment without npm on PATH. | Tooling install/PATH issue outside application code, but it blocks every scripted validation path. | `package.json`; `backend/package.json`; `docs/unwired-code-discovery-audit.md`; `docs/layout-scroll-regression-report.md` | Fix Node/npm installation first; then run root and backend installs/tests. |
| high | Vercel build is intentionally env-gated. | `buildCommand` includes `validate:vercel-env`; local `.env.example` values are not valid Vercel production values. | `vercel.json`; `scripts/validate-vercel-env.mjs`; `.env.example` | Add Vercel-specific env documentation and verify `VITE_API_URL` is origin-only. |
| high | Node version is not pinned consistently. | Root Docker uses Node 20, backend Docker uses Node 18, dependencies require Node 20/22, and package metadata does not declare engines. | `Dockerfile`; `backend/Dockerfile`; `package.json`; `package-lock.json`; `backend/package-lock.json` | Add root/backend `engines`, update Dockerfiles, and document Node version. |
| medium | Backend lint mutates files during validation. | `backend/scripts/run-eslint.mjs` invokes `--fix`. | `backend/scripts/run-eslint.mjs`; `backend/package.json`; `package.json` | Make lint check-only; add `lint:fix` for mutation. |
| medium | Frontend typecheck excludes JS/JSX app code. | `tsconfig.frontend.json` include patterns only cover `.ts` and `.tsx`. | `tsconfig.frontend.json`; `package.json` | Include JS/JSX or clarify scope. |

## 12. Testing Gaps

| Severity | Gap | Root cause | Exact files | Proposed fix |
| --- | --- | --- | --- | --- |
| high | Tests can pass while normal login profile handling is broken. | Existing dev bypass tests cover mock session behavior, but normal login only-token behavior is not covered end-to-end. | `src/pages/Auth.devBypass.test.jsx`; `src/App.devBypass.test.jsx`; `src/pages/Auth.jsx`; `src/contexts/UserContext.jsx` | Add integration tests for login returning `{ accessToken, user }`, login returning token only, and profile fetch failure. |
| high | Route flattening tests conflict with current route strategy. | Many batch tests duplicate old route expectations. | `src/data/pr*`; `src/test/responsiveRegression.routes.js`; `src/pages/tools/ToolsAreaFallback.test.jsx` | Consolidate route assertions into one canonical contract and update batch tests. |
| medium | Permission-gated Operations links are not tested as disabled/hidden for normal users. | Operations page renders cards without permission awareness. | `src/pages/Operations.jsx`; `src/App.jsx` | Add tests for non-admin and admin route visibility. |
| medium | Notification service import mismatch lacks a failing test. | The alert notification utility imports a nonexistent default export from the named notification service. | `src/utils/clinicalAlertNotifications.js`; `src/services/NotificationService.js`; `src/services/notifications/NotificationService.js` | Add a unit test importing `clinicalAlertNotifications.js` and exercising each delivery channel. |
| low | External-service RAG e2e is skipped without a local mock equivalent. | Test uses `describe.skip` unless OpenAI and Pinecone env vars exist. | `backend/test/rag.e2e-spec.ts` | Add mocked RAG service tests for CI and keep real e2e as opt-in. |

## 13. Prioritized Fix Plan

1. Restore local tooling: install/repair Node/npm and pin a repo Node version.
2. Fix broad test blockers: update stale `/chat`, `/dashboard`, and `/tools/calculator/*` expectations.
3. Consolidate notification services and fix `clinicalAlertNotifications.js` imports.
4. Fix normal auth profile handling and OAuth capability visibility.
5. Align Node/Docker/Vercel env configuration.
6. Resolve Docker Compose port conflict.
7. Split tool mapping concepts: backend-routed, POST-executable, launch alias, and UI registry id.
8. Make Operations and Developer Catalog visibility permission-aware by design.
9. Normalize clinical AI response DTOs before rendering.
10. Reduce route/tool duplicate test suites to one canonical contract plus focused batch tests.

## 14. Exact Files To Modify

Highest priority:

- `package.json`
- `backend/package.json`
- `Dockerfile`
- `backend/Dockerfile`
- `docker-compose.yml`
- `scripts/validate-vercel-env.mjs`
- `.env.example`
- `src/pages/Auth.jsx`
- `src/pages/AuthCallback.jsx`
- `src/contexts/UserContext.jsx`
- `src/services/NotificationService.js`
- `src/services/notifications/NotificationService.js`
- `src/utils/clinicalAlertNotifications.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/toolRegistry.js`
- `src/data/frontendApiCallsInventory.js`
- `src/data/backendRouteExposurePolicy.js`
- `backend/src/app.controller.ts`
- `backend/src/modules/auth/auth.module.ts`
- `backend/scripts/run-eslint.mjs`
- `tsconfig.frontend.json`

Tests to update:

- `src/data/pr1Coverage.test.js`
- `src/data/pr2Coverage.test.js`
- `src/data/pr3Coverage.test.js`
- `src/data/pr3Comprehensive.test.js`
- `src/data/pr4aCoverage.test.js`
- `src/data/pr4aComprehensive.test.js`
- `src/data/prFleetConsistency.test.js`
- `src/data/pr6FleetComprehensive.test.jsx`
- `src/data/dispatchAiWiring.test.js`
- `src/data/copdGoldWiring.test.js`
- `src/data/romeIvIbsWiring.test.js`
- `src/data/wiringAuditConsistency.test.js`
- `src/pages/tools/ToolsAreaFallback.test.jsx`
- `src/test/responsiveRegression.routes.js`

## 15. Safe Refactor Strategy

- Fix blockers before cleanup. Start with toolchain, Node version, Docker ports, and test expectation drift.
- Keep legacy routes as redirects while normalizing user-facing links to canonical routes.
- Replace duplicates behind compatibility exports where imports are widespread.
- For notification services, add a facade first, then migrate callers one by one.
- For tool inventory, split the overloaded mapping fields before renaming ids.
- For clinical AI DTOs, add response normalizers and tests before changing render components.
- For backend orphan services, either register and test them or mark them as deferred in docs. Do not leave injectable security services ambiguous.

## 16. Risk Assessment

| Risk | Level | Reason |
| --- | --- | --- |
| Build/test validation remains blocked until npm is available | critical | Every normal script path depends on npm. |
| Vercel production deploy fails on env validation | high | Validator is strict and local env example is not production-safe. |
| Docker backend image fails with current dependencies | high | Backend Docker uses Node 18 while dependencies require newer engines. |
| Alert notification delivery fails at runtime | high | Import/export mismatch is present in code. |
| Normal auth silently loops or stalls on profile fetch | high | Auth state requires token and user, but login/OAuth stores token only. |
| Tool launch tests fail after route flattening | high | Multiple tests still assert legacy canonical paths. |
| Developer Catalog inaccessible in explicit dev mode | medium | Gating is intentional but conflicts with developer audit workflow. |
| Tool inventory remains confusing | medium | Alias compatibility is intentional, but executor/launch concepts are overloaded. |
| Broad cleanup changes create churn | medium | Many tests duplicate route/tool contracts; fix incrementally with one canonical source. |
