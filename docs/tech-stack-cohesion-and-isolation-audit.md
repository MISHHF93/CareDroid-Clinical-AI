# Tech-Stack Cohesion and Isolation Audit

Date: 2026-05-23

Scope: read-only investigation of the CareDroid Clinical AI repository for mixed technologies, duplicate tooling, isolated feature islands, stack conflicts, bridge gaps, and build/deployment risk. Runtime code was not modified for this audit.

## 1. Executive Summary

CareDroid's canonical production spine is clear: a React 18 + Vite SPA in `src`, a NestJS API in `backend/src`, tool/orchestrator contracts in `src/data` plus `backend/src/modules/medical-control-plane`, and frontend API clients centered on `src/services/apiClient.js`.

The repository is not only that spine. It also contains a native Android/Kotlin Compose app, Capacitor config, Python ML sidecars, an MCP stdio bridge, Docker Compose observability infrastructure, multiple CI pipelines, multiple lockfiles, public/service-worker runtime code, standalone debug/prototype files, and generated audit/reporting scripts. Some of these are valid supporting systems, but several behave like isolated stacks rather than connected platform modules.

Highest-risk findings:

- The Android directory is a native Jetpack Compose application, while root scripts and docs describe Capacitor packaging of the Vite SPA. This is a real mobile-stack conflict, not just optional Capacitor glue.
- `backend/ml-services/anomaly-detection/anomaly_detector.py` is a standalone Python script, but `docker-compose.yml` treats it as an HTTP service with a Dockerfile and `/health` endpoint that do not exist.
- `docker-compose.yml` maps both `anomaly-detection` and `logstash` to host port `5000`, so the full compose stack cannot bind cleanly as written.
- `src/services/openaiService.ts` is an unimported browser-side OpenAI client using `VITE_OPENAI_API_KEY`; this conflicts with the intended backend-owned AI boundary.
- `src/services/NotificationService.js`, `src/services/notifications/NotificationService.js`, and `src/utils/clinicalAlertNotifications.js` form a duplicated notification stack with an import/export mismatch.
- Offline/sync code is split across localStorage, Dexie, service worker sync, and `/api/sync` calls, while backend capability flags mark bulk sync as unavailable.
- Root, backend, and MCP packages use separate lockfiles without an npm workspace, while root scripts call into backend and MCP packages.
- Frontend typechecking is configured but effectively misses most JS/JSX application code because `tsconfig.frontend.json` includes only TS/TSX files.
- CI is duplicated across several GitHub workflows with overlapping frontend/backend/Android jobs and inconsistent Node versions.

Overall status: the core React/Vite + NestJS stack is cohesive enough to keep. The non-core stacks should be either explicitly documented as sidecars/dev tooling or normalized behind the canonical API/client/inventory patterns before being treated as production surfaces.

## 2. Intended Stack

The intended platform stack is:

- React 18 SPA with React Router in `src/App.jsx`.
- Vite build/dev/preview configuration in `vite.config.js`.
- NestJS API with global `/api` prefix in `backend/src/main.ts`.
- Optional Capacitor Android packaging from built web assets.
- Vitest + Testing Library for frontend/unit/inventory tests.
- Jest + Supertest for backend unit/e2e tests.
- Playwright for responsive, Android-device, and production smoke checks.
- Unified tool inventory and launch contracts in `src/data/toolInventory.js`, `src/data/clinicalToolIdContract.js`, `src/navigation/registryToolLaunch.js`, and `src/routes/clinicalToolRoutes.js`.
- Backend medical control plane in `backend/src/modules/medical-control-plane`.
- Tool orchestrator executors in `backend/src/modules/medical-control-plane/tool-orchestrator`.
- Canonical frontend API layer in `src/services/apiClient.js`.
- Backend clinical intelligence workflows in `backend/src/modules/clinical-intelligence`.

## 3. Actual Stack Inventory

Canonical production stacks:

- React 18, React DOM, React Router, Vite, JSX/JS modules under `src`.
- NestJS 10, TypeORM, Passport/JWT, Swagger, Helmet, Express adapter/static middleware, class-validator, PostgreSQL/SQLite, Redis, Stripe, Firebase Admin, OpenAI, Pinecone/RAG, Sentry, Datadog, Prometheus metrics under `backend/src`.
- Frontend service clients using `fetch` and `axios` through `src/services/apiClient.js`.
- CSS through global CSS, route/component CSS files, and design token CSS in `src/styles`.
- Frontend tests through Vitest + jsdom + Testing Library.
- Backend tests through Jest + ts-jest + Supertest.

Supporting stacks:

- Playwright E2E/device/production smoke configs in `playwright.config.mjs`, `playwright.android.config.mjs`, and `playwright.production.config.mjs`.
- Node `.mjs` audit/report/validation scripts in `scripts`.
- Docker Compose infrastructure in `docker-compose.yml` for PostgreSQL, Redis, backend, frontend, NLU, anomaly detection, Elastic/Logstash/Kibana, Prometheus, Alertmanager, Grafana, and Sentry.
- Observability dashboards/config in `config/grafana`, `config/prometheus.yml`, `config/prometheus`, `config/alertmanager`, `config/kibana`, and `config/logstash.conf`.
- Vercel static frontend deployment in `vercel.json`.
- MCP stdio server in `mcp/src/server.mjs`.

Non-core or isolated stacks:

- Native Android app in `android` using Kotlin, Jetpack Compose, Hilt, Retrofit, Room, DataStore, Firebase, and Gradle.
- Capacitor config in `capacitor.config.json` and root Capacitor dependencies/scripts.
- Python FastAPI NLU sidecar in `backend/ml-services/nlu`.
- Python anomaly detection script in `backend/ml-services/anomaly-detection`.
- Standalone Python Android test simulator in `test-runner.py`.
- Plain HTML auth debug prototype in `AUTH_DEBUG_TEST.html`.
- Legacy/static backend public assets in `backend/public`.
- No dedicated `src/features` or `src/modules` frontend organization roots were found; production frontend code is organized mainly by `src/pages`, `src/components`, `src/layout`, `src/data`, `src/services`, `src/hooks`, `src/utils`, and `src/styles`.
- No Cypress config and no Vercel/Next-style serverless function directory were found in the current repo scan.

## 4. Frontend Stack Findings

Canonical frontend:

- `package.json` defines the frontend as a Vite SPA with React 18, React Router, Recharts, Dexie, Firebase, Axios, Lucide React, Vitest, Playwright, ESLint, Prettier, and Capacitor dependencies.
- `vite.config.js` uses `@vitejs/plugin-react`, dev/preview proxying for `/api`, `/socket.io`, and `/health`, manual chunks for vendor/dashboard/catalog/calculators/analytics/charts, and excludes Capacitor packages from optimized deps.
- `src/App.jsx` is the central route table, auth gate, permission gate, shell assignment point, and alias redirect owner.
- `src/layout/AppShell.jsx`, `src/layout/AuthShell.jsx`, and `src/layout/PublicShell.jsx` are the canonical shells.
- `src/navigation/primaryNavigation.js` is the canonical visible navigation map.
- `src/data/toolInventory.js`, `src/data/clinicalToolIdContract.js`, `src/routes/clinicalToolRoutes.js`, and `src/navigation/registryToolLaunch.js` are the canonical tool and launch contracts.
- `src/services/apiClient.js` is the canonical frontend API base URL/token/timeout/JSON parsing layer.

Frontend cohesion issues:

- `src/services/openaiService.ts` is not imported elsewhere and directly calls OpenAI with `VITE_OPENAI_API_KEY`. This should not be a production browser boundary for clinical AI; the Nest backend already owns OpenAI/RAG behavior.
- `src/components/ChatInterface.jsx` remains a parallel chat implementation beside the canonical `src/pages/Dashboard.jsx` Assistant flow.
- `src/services/NotificationService.js` and `src/services/notifications/NotificationService.js` are two notification service implementations. `src/utils/clinicalAlertNotifications.js` imports a default from `src/services/NotificationService.js`, but that file exports a named `NotificationService` object.
- `src/db/offline.js`, `src/db/offline.db.js`, `src/services/offlineService.js`, `src/services/syncService.js`, `src/components/offline/OfflineSupport.jsx`, and `public/sw.js` represent multiple offline/sync patterns. They are not yet one cohesive offline stack.
- `src/components/offline/OfflineSupport.jsx` and `public/sw.js` call or reference `/api/sync`, while `src/config/backendApiCapabilities.js` marks `bulkSync` false.
- `src/pages/AuditLogs.jsx`, `src/pages/BiometricSetup.jsx`, and `src/pages/AnalyticsDashboard.jsx` use the canonical client but still manually pull `caredroid_access_token` in places instead of relying entirely on `apiClient` token injection.
- `src/services/clinicalOrchestratorApi.js`, `src/services/clinicalToolsApi.js`, and `src/services/clinicalIntelligenceApi.js` are aligned around `apiClient`, but they each still resolve tokens or paths locally. Keep them as domain clients but avoid adding more one-off clients.
- `src/styles`, component CSS files, page CSS files, and token bridge files are the actual CSS system. No Tailwind/MUI/Chakra-style framework is active, but there are many one-off page styles that should converge on shared tokens/components.

Classification:

- React/Vite SPA: canonical production stack; keep and document.
- `src/services/apiClient.js`: canonical production API client; keep and route all API callers through it.
- `src/services/openaiService.ts`: conflicting/stale frontend island; remove later or convert to backend-only via Nest AI APIs.
- Parallel notification services: conflicting frontend internal stack; merge behind one notification service.
- Offline/sync/service-worker code: frontend internal but fragmented; connect to capability flags and a real sync backend before broad exposure.
- Legacy `ChatInterface.jsx`: stale or transitional frontend internal; decide whether to retire or explicitly keep as a test harness/component.

## 5. Backend Stack Findings

Canonical backend:

- `backend/package.json` defines a NestJS backend with build/start/lint/test/migration/ingest scripts.
- `backend/src/main.ts` bootstraps Nest, Sentry, Helmet, CORS, validation, production static frontend serving, global `/api` prefix, and Swagger.
- `backend/src/app.module.ts` wires ConfigModule, TypeORM, Throttler, Schedule, Auth, Users, Subscriptions, TwoFactor, AI, Clinical, Audit, Compliance, Chat, ClinicalIntelligence, Analytics, Notifications, MedicalControlPlane, Encryption, RAG, Metrics, Email, Cache, and Logger modules.
- `backend/src/modules/medical-control-plane` is the intended orchestration layer.
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` is the backend executor truth. The real POST executors are `sofa-calculator`, `drug-interactions`, and `lab-interpreter`.
- `backend/src/modules/clinical-intelligence` is the backend-backed AI workflow surface.

Backend cohesion issues:

- The backend is TypeScript/CommonJS through Nest, while the frontend is ESM Vite. This split is acceptable, but shared contracts are copied through source inventories rather than generated types.
- `backend/src/modules/medical-control-plane/intent-classifier/intent-classifier.service.ts` can call `NLU_SERVICE_URL/predict`, so NLU is bridged as an optional sidecar with fallback/circuit breaker behavior.
- `backend/src/modules/chat/chat.service.ts` calls `fetch(this.anomalyDetectionUrl, ...)`, but the anomaly sidecar file is not an HTTP app and `docker-compose.yml` does not provide a matching Dockerfile. That stack is isolated/stale.
- `backend/src/modules/rag/reranking/cohere-ranker.service.ts` directly fetches Cohere endpoints. This is backend internal and acceptable, but should remain behind RAG config/capabilities.
- `backend/src/main.ts` serves frontend assets in production, while `vercel.json` also describes split static frontend deployment. Both are valid deployment modes, but they need explicit ownership because API/spa fallback behavior differs.
- `backend/src/main.ts` logs `/api/metrics`, while the static asset exclude also treats `/metrics` as operational. Confirm the intended metrics path and Prometheus scrape target stay aligned.
- `backend/tsconfig.json` enables `strict` but disables `strictNullChecks`, `strictPropertyInitialization`, and `noImplicitAny`, so backend TypeScript strictness is weaker than the option name implies.

Classification:

- NestJS API: canonical production stack; keep.
- Medical control plane/tool orchestrator: canonical backend production stack; keep.
- RAG/AI modules: backend internal production stack; keep behind capability/config.
- NLU sidecar integration: supporting backend internal stack; keep and document as optional sidecar.
- Anomaly sidecar integration: stale/conflicting backend-adjacent stack; fix or disable until an actual HTTP service exists.
- Backend static frontend serving: production deployment option; document separately from Vercel split deploy.

## 6. Mobile/Capacitor Findings

Actual mobile stack:

- `capacitor.config.json` declares Capacitor app id `com.caredroid.clinical`, app name, `webDir: dist`, and Android scheme.
- Root `package.json` includes `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, and scripts `android-debug` and `android-release`.
- `Dockerfile.android`, `setup-android-sdk.sh`, `install-android-sdk-simple.sh`, `build-android-apk.sh`, `docker-android-emulator.sh`, `android/build-release.sh`, `android/validate-release.sh`, and `android/deploy-to-playstore.sh` are Android build/release helpers.
- `android/app/build.gradle` defines a native Kotlin/Compose app with Hilt, Retrofit, Room, DataStore, Firebase, Material 3, and Android tests.
- `android/app/src/main/kotlin/com/caredroid/clinical/MainActivity.kt` uses `setContent` and `AppNavigation`, not a Capacitor WebView.
- `android/app/src/main/kotlin/com/caredroid/clinical/ui/navigation/AppNavigation.kt` defines native routes for login, signup, chat, settings, profile, team, and audit.
- `android/app/src/main/kotlin/com/caredroid/clinical/data/remote/api/CareDroidApiService.kt` defines Retrofit endpoints, many of which do not match the current Nest route contract.
- `android/app/src/main/kotlin/com/caredroid/clinical/network/ApiService.kt` defines a second Retrofit interface with a different endpoint set, so the native Android island has duplicate API-client contracts internally before it even reaches the Nest contract boundary.

Mobile conflicts:

- The repo simultaneously describes optional Capacitor packaging of the Vite SPA and includes a native Kotlin/Compose app. These are two different mobile product stacks.
- The native Android Retrofit API uses paths like `/api/chat/conversations`, `/api/chat/export`, `/api/tools/drug-interactions`, `/api/tools/lab-interpreter`, `/api/tools/sofa-calculator`, `/api/system/config`, and `/api/user/permissions`, while the current backend contract uses `/api/chat/message`, `/api/tools/:id/execute`, `/api/config/system`, and `/api/users/profile`.
- The two native Android Retrofit interfaces disagree with each other and both bypass the frontend `src/data/backendHttpRouteInventory.js` / `src/data/frontendApiCallsInventory.js` contract system.
- `package.android.json` is a separate package manifest with scripts and metadata that are not connected to npm workspaces.
- GitHub has multiple Android workflows with different assumptions: one Capacitor-sync workflow and one native Gradle workflow.

Classification:

- Capacitor config/scripts: mobile integration, intended optional stack.
- Native Android app: conflicting/prototype-to-production island unless the product explicitly wants a separate native client.
- Android Retrofit API service: stale/conflicting until generated or aligned with backend route inventory.
- Android shell scripts and Dockerfile: supporting mobile build utilities, but should be documented under a single mobile strategy.

Recommendation:

- Choose one canonical Android strategy for the next release: Capacitor-wrapped Vite SPA or native Kotlin app.
- If Capacitor is canonical, move the native Compose app to `docs/examples` or a separate branch/repo until it is product-owned.
- If native Android is canonical, generate API contracts from Nest/OpenAPI and stop describing Android as merely Capacitor packaging.

## 7. Testing Stack Findings

Testing systems in use:

- Frontend unit/component/source-contract tests: Vitest through `vitest.config.js`, `src/test/setup.js`, Testing Library, jsdom, and CSS support.
- Backend unit tests: Jest embedded in `backend/package.json`.
- Backend e2e tests: Jest config in `backend/test/jest-e2e.json`.
- Playwright responsive/device/production tests: `playwright.config.mjs`, `playwright.android.config.mjs`, `playwright.production.config.mjs`, and `e2e`.
- Android unit/instrumentation tests: Gradle/JUnit/AndroidX tests under `android/app/src/test` and `android/app/src/androidTest`.
- Python sidecar tests: `backend/ml-services/nlu/tests`.
- Standalone Python test simulator: `test-runner.py`.
- Static/source validation scripts: many `scripts/*.mjs` writers/reporters plus build config tests under `src/config` and `src/data`.

Testing cohesion issues:

- Root `npm run validate:ci` assumes frontend dependencies, backend dependencies, and backend package scripts are available, but root install does not install backend dependencies unless backend has separately run `npm ci`.
- Vitest excludes `backend/**`, which is correct, but frontend `tsconfig.frontend.json` includes only `src/**/*.ts` and `src/**/*.tsx`; most JS/JSX application code is linted/tested but not typechecked.
- Frontend test suite uses many inventory/source-string tests, which protect contracts but do not replace runtime E2E proof for service workers, Docker/Vercel behavior, or native Android behavior.
- Multiple GitHub workflows duplicate lint/test/build responsibilities (`ci-cd.yml`, `quality.yml`, `test.yml`, `validate.yml`, plus Android workflows).
- `test-runner.py` simulates Android tests independently from Gradle; classify it as stale unless there is a documented reason to keep it.
- Python NLU tests are not wired into root CI or backend Jest. They require a Python environment and sidecar dependencies.

Classification:

- Vitest: canonical frontend test stack.
- Jest: canonical backend test stack.
- Playwright: canonical browser/device smoke stack.
- Gradle tests: canonical only if native Android remains product-owned; otherwise prototype/test island.
- Python NLU tests: sidecar tests; keep with sidecar docs/CI if sidecar remains.
- `test-runner.py`: stale/prototype; move to docs/examples or remove later.

## 8. Build/Deployment Stack Findings

Build/deployment systems:

- Vite static frontend build: `npm run build` writes `dist`.
- Nest backend build: `backend npm run build` writes `backend/dist`.
- Backend production static serving: `backend/src/main.ts` can serve frontend `dist` in production.
- Vercel split frontend deploy: `vercel.json` builds `dist` and rewrites all paths to `/index.html`.
- Docker frontend image: root `Dockerfile` installs root deps and runs `npm run dev:lan` on port 8000.
- Docker backend image: `backend/Dockerfile` builds Nest and runs `node dist/src/main.js`.
- Docker Compose stack: `docker-compose.yml` builds frontend/backend plus sidecars and observability.
- Android builds: root scripts, shell scripts, Dockerfile.android, Gradle workflows, and Capacitor sync workflow.
- CI/CD: multiple GitHub Actions workflows for frontend/backend quality, backend Docker, Android, release, validation, and dependency updates.

Build/deployment risks:

- Root `Dockerfile` is a dev-server container, not a production static server. It is acceptable for local compose but risky if treated as production.
- `docker-compose.yml` references `backend/ml-services/anomaly-detection/Dockerfile`, but that Dockerfile is absent.
- `docker-compose.yml` maps both anomaly detection and Logstash to host port `5000`.
- `vercel.json` rewrites every path to `index.html`; production API calls require `VITE_API_URL` or a verified same-origin proxy. `scripts/validate-vercel-env.mjs` correctly guards this, but the deployment story must stay explicit.
- Backend production static serving and Vercel split deployment are two valid but different deployment modes. They need separate smoke checks.
- Backend public assets in `backend/public` look like a legacy/static frontend copy and should not compete with root `public` plus Vite `dist`.
- Multiple lockfiles (`package-lock.json`, `backend/package-lock.json`, `mcp/package-lock.json`) are valid only if installs are documented or converted to npm workspaces.
- Node versions drift: root Dockerfile uses Node 20, backend Dockerfile uses Node 18, workflows use Node 18 and Node 20 in different places.

Classification:

- Vite build: canonical frontend build.
- Nest build: canonical backend build.
- Vercel config: production frontend deployment option; keep with API URL validation.
- Backend static serving: production single-service deployment option; keep with separate smoke tests.
- Docker Compose: dev/integration/observability stack; fix port/build blockers before treating as reliable.
- Root Dockerfile: dev utility, not production.
- Backend Dockerfile: production backend image.
- Android Docker/scripts: mobile build utilities; normalize once Android strategy is chosen.

## 9. Isolated Code Islands

Each island includes current classification and recommended action.

- `android`: conflicting mobile stack. It is a native Kotlin/Compose app, not just Capacitor output. Decide canonical mobile strategy; either connect it through generated API contracts or move it out of the main production path.
- `capacitor.config.json`: mobile integration. Keep if Capacitor-wrapped Vite SPA remains intended; otherwise remove Capacitor dependencies/scripts after native strategy is chosen.
- `package.android.json`: conflicting/stale mobile package manifest. Merge useful scripts into root package or remove after documenting Android ownership.
- `backend/ml-services/nlu`: supporting backend sidecar. Keep and document as optional; add Python setup/test/health checks to CI only if production-owned.
- `backend/ml-services/anomaly-detection/anomaly_detector.py`: stale/conflicting sidecar. Either convert into a real HTTP service with Dockerfile and routes, or remove/disable the compose/chat integration.
- `mcp`: supporting script/tooling stack. Keep as an external integration, but either add npm workspace support or document separate `cd mcp && npm ci`.
- `AUTH_DEBUG_TEST.html`: stale/prototype plain HTML debug file. Move to `docs/examples` or remove later; `cleanup-hybrid-files.sh` already treats it as removable.
- `test-runner.py`: stale/prototype Python Android test simulator. Replace with Gradle tests or move to docs/examples.
- `backend/public`: stale deployment artifact area if root Vite `public` and `dist` are canonical. Keep only if backend static serving still requires these files.
- `src/services/openaiService.ts`: conflicting frontend AI client. Remove later or convert to a backend-only integration.
- `src/services/NotificationService.js` and `src/services/notifications/NotificationService.js`: duplicate frontend notification stacks. Merge into one canonical notification client/service.
- `src/utils/clinicalAlertNotifications.js`: broken bridge island due to notification service import mismatch and methods not present on the named service.
- `src/db/offline.js`, `src/db/offline.db.js`, `src/services/offlineService.js`, `src/services/syncService.js`, `src/components/offline/OfflineSupport.jsx`, `public/sw.js`: fragmented offline/sync island. Pick one persistence/sync model and keep unsupported backend routes gated.
- `src/components/ChatInterface.jsx`: stale/parallel chat implementation unless explicitly retained as a reusable chat component.
- `config/grafana`, `config/prometheus.yml`, `config/prometheus`, `config/alertmanager`, `config/kibana`, `config/logstash.conf`: supporting observability stack. Keep as Docker Compose-owned infrastructure, not app runtime code.

## 10. Stack Conflicts

Mobile:

- Capacitor web packaging conflicts with the native Kotlin/Compose app. `MainActivity.kt` renders Compose UI directly, while root scripts still run `npx cap sync android`.
- Native Android endpoint definitions drift from the current Nest API and frontend route/tool contracts.

Backend/sidecars:

- Anomaly detection is configured as an HTTP sidecar but implemented as a script-only Prometheus analyzer.
- Docker Compose expects an anomaly Dockerfile that is not present.
- NLU is better connected than anomaly detection, but its FastAPI/Python dependency stack is separate from backend package management and CI.

Frontend/API:

- Browser-side OpenAI API key usage conflicts with the backend-owned AI/RAG boundary.
- Offline/sync paths call planned backend routes that are capability-disabled.
- Notification service duplication creates incompatible import patterns.
- Android Retrofit endpoints bypass the canonical frontend API inventory and backend route inventory.

Tooling:

- Root, backend, and MCP packages are separate installs without a workspace.
- CI workflows overlap and use mixed action versions and Node versions.
- Root Dockerfile runs Vite dev server while backend Dockerfile is production-oriented.
- `tsconfig.frontend.json` is stricter in name than in effect for the mostly-JS frontend.

Docs/config:

- `README.md` describes Capacitor Android packaging, but the `android` directory contains a native app.
- Older route docs still reference legacy `/dashboard` and `/chat` as if they render pages rather than redirecting to `/home` and `/assistant`.
- Root `.env.example`, `backend/.env.example`, `backend/.env.rag.example`, and `backend/ml-services/nlu/.env.example` overlap but are not a single ownership matrix.

## 11. Bridge Gaps

React/Vite frontend:

- Run: `npm run dev`, `npm run build`, `npm run preview`.
- Imported: browser entry through `src/main.jsx`, route table through `src/App.jsx`.
- Tested: Vitest and Playwright.
- Communicates with backend: `src/services/apiClient.js` plus domain clients.
- Documented: README and generated docs.
- Role: canonical production stack.
- Gap: JS/JSX type coverage is weak; some one-off clients/state/storage patterns remain.

NestJS backend:

- Run: `cd backend && npm run start:dev`, `backend:start`, Docker, or `start:single`.
- Imported: backend `main.ts` bootstraps `AppModule`.
- Tested: Jest and backend e2e.
- Communicates with frontend: `/api` REST, static asset serving in production, Vite proxy in dev.
- Documented: README, Swagger, route inventories.
- Role: canonical production stack.
- Gap: direct sidecar fetches and API exposure inventories need continued drift checks.

Medical control plane:

- Run: inside Nest backend.
- Imported: `MedicalControlPlaneModule` in `AppModule`.
- Tested: backend registry and tool-pattern specs.
- Communicates with frontend: `/api/tools`, `/api/chat`, clinical orchestrator clients.
- Documented: tool inventories and backend/frontend contract matrices.
- Role: canonical production backend module.
- Gap: only three POST executors exist; chat-assisted tools must remain clearly classified.

Clinical intelligence:

- Run: inside Nest backend and React tool pages.
- Imported: backend `ClinicalIntelligenceModule` and frontend `clinicalIntelligenceApi`.
- Tested: service/page tests and exposure tests.
- Communicates: `/api/clinical-intelligence/*`.
- Documented: README and inventory docs.
- Role: canonical production extension stack.
- Gap: result handoff to Assistant and DTO hardening remain follow-up work.

Capacitor:

- Run: `npm run android-debug` / `npm run android-release`.
- Imported: root package dependencies and `capacitor.config.json`.
- Tested: Android Playwright/device scripts and Android workflows.
- Communicates: built Vite web assets.
- Documented: README and scripts.
- Role: mobile integration.
- Gap: conflicts with native Compose app ownership.

Native Android:

- Run: Gradle scripts in `android`.
- Imported: Android app modules, not by React/Vite.
- Tested: Gradle unit/instrumentation tests and Android workflows.
- Communicates: Retrofit API service.
- Documented: scattered scripts/workflows.
- Role: conflicting/prototype unless chosen as canonical mobile.
- Gap: API endpoints and routes drift from the Nest/React contracts.

Python NLU:

- Run: Docker Compose or Python/FastAPI sidecar.
- Imported: not imported into Nest; called over HTTP by intent classifier.
- Tested: Python tests under sidecar directory.
- Communicates: `POST /predict` from Nest intent classifier.
- Documented: `.env.example`, Dockerfile, Compose config.
- Role: supporting backend sidecar.
- Gap: not wired into root/backend install or CI by default.

Python anomaly detection:

- Run: script-only `anomaly_detector.py` today.
- Imported: not imported into Nest; chat service attempts HTTP fetch.
- Tested: no visible canonical test harness.
- Communicates: intended Prometheus queries/pushgateway, but Compose expects HTTP.
- Documented: Compose and backend config imply service behavior.
- Role: stale/conflicting.
- Gap: no Dockerfile, no HTTP app, no `/health`, port conflict with Logstash.

MCP:

- Run: `npm run mcp:server` or `cd mcp && npm run start`.
- Imported: not imported by app runtime.
- Tested: `node --check src/server.mjs`.
- Communicates: calls Nest `/api/tools/:toolId/execute`.
- Documented: inline MCP README resource and root script.
- Role: supporting script/integration.
- Gap: separate package install and lockfile; not a production app surface.

Observability stack:

- Run: Docker Compose.
- Imported: backend Datadog/Sentry/metrics modules plus config files.
- Tested: partial config and backend metrics tests.
- Communicates: Prometheus scrape, Datadog/Sentry SDKs, Grafana dashboards, Logstash/Kibana.
- Documented: env examples and compose comments.
- Role: supporting infrastructure.
- Gap: compose bind conflicts and local Sentry/Elastic stack likely not validated by app CI.

## 12. Configuration Drift

- Root `.env.example` contains both frontend `VITE_*` variables and backend-ish variables such as `DATABASE_CLIENT`, `JWT_SECRET`, `OPENAI_API_KEY`, Sentry, Redis, and monitoring stack settings.
- `backend/.env.example` is the richer backend environment contract.
- `backend/.env.rag.example` repeats Pinecone/OpenAI/RAG settings with index names that differ from backend defaults.
- `backend/ml-services/nlu/.env.example` owns NLU-specific training/inference settings.
- `vite.config.js` uses `VITE_API_PROXY_TARGET`; production static builds require `VITE_API_URL` unless same-origin proxy is explicitly allowed.
- `vercel.json` validates `VITE_API_URL` through `scripts/validate-vercel-env.mjs`, but backend static serving uses `FRONTEND_URL` and CORS.
- `android/app/build.gradle` uses `API_BASE_URL`, not `VITE_API_URL` or backend `.env` names.
- Docker Compose uses `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_PASSWORD`, sidecar URLs, and observability envs that only partly overlap root/backend env examples.
- Node versions drift between Node 20 root workflows/Docker and Node 18 backend/Android workflows/Docker.
- `backend/tsconfig.json`, `backend/tsconfig.eslint.json`, `tsconfig.frontend.json`, Vitest config, backend Jest config, and Playwright configs are all valid but need ownership comments.

## 13. Dependency Risks

- `@capacitor/cli` is version `^8.0.2`, while `@capacitor/core` and `@capacitor/android` are `^5.6.0`; this is a likely Capacitor major-version mismatch.
- Root `@modelcontextprotocol/sdk` duplicates the MCP package dependency even though runtime MCP code lives under `mcp`.
- Root `zod` and MCP `zod` are duplicated across independent package installs.
- Frontend includes `firebase`, Android includes Firebase SDKs, and backend includes `firebase-admin`; that is acceptable only if browser/native/admin responsibilities are documented.
- Browser `VITE_OPENAI_API_KEY` is a security/product risk and should not be used for clinical production calls.
- `sqlite3` and `pg` both exist in backend dependencies, which is acceptable for dev/prod database modes but needs clear environment ownership.
- Python NLU/anomaly dependencies are not part of npm lockfiles; their dependency/security checks are separate.
- Multiple lockfiles without a workspace increase install drift and CI ambiguity.
- Android Gradle dependencies are independent of npm and need a separate update/security process.

## 14. Recommended Canonical Stack Map

Core app:

- Frontend: React 18 + Vite + React Router + AppShell/PublicShell/AuthShell.
- Frontend state: React Context plus local component state; avoid adding Redux/Zustand/etc. unless a clear shared-state problem appears.
- Frontend styling: CSS files using `src/styles/design-tokens.css`, `theme-tokens.css`, `theme-surfaces.css`, and shared UI components.
- Frontend API: `src/services/apiClient.js` plus domain clients. No direct OpenAI/browser-secret clients.
- Frontend inventory: `src/data/toolInventory.js`, `src/data/clinicalToolIdContract.js`, `src/data/segmentInventory.js`, and related route/launch tests.

Backend:

- NestJS modules under `backend/src/modules`.
- TypeORM entities/migrations under `backend/src`.
- Medical control plane and tool orchestrator as the only backend executor path.
- Clinical Intelligence module for structured AI workflows.
- AI/RAG/OpenAI/Pinecone/Cohere behind backend modules only.
- Notifications/audit/compliance/analytics as backend-owned platform capabilities.

Mobile:

- Pick one: Capacitor-wrapped Vite SPA or native Kotlin app.
- If Capacitor: root package/cap config is canonical; native Kotlin source should be moved out or demoted.
- If native: Android becomes a separate production client with generated OpenAPI/DTO contracts and its own CI; Capacitor config should be retired.

Sidecars/infrastructure:

- NLU Python service: optional backend sidecar with explicit health, test, Docker, and env ownership.
- Anomaly detection: disable until converted into a real service or fold into backend metrics jobs.
- MCP: external integration package; document separate install/run or convert repo to npm workspaces.
- Observability: Docker Compose-owned local/integration infrastructure.

Testing/build:

- Frontend tests: Vitest.
- Backend tests: Jest.
- Browser/device smoke: Playwright.
- Native Android tests: Gradle, only if native Android remains canonical.
- CI: consolidate overlapping workflows into a single quality pipeline plus optional mobile/release pipelines.

## 15. Exact Files To Inspect Further

Highest priority:

- `android/app/src/main/kotlin/com/caredroid/clinical/MainActivity.kt`
- `android/app/src/main/kotlin/com/caredroid/clinical/data/remote/api/CareDroidApiService.kt`
- `android/app/src/main/kotlin/com/caredroid/clinical/network/ApiService.kt`
- `capacitor.config.json`
- `package.android.json`
- `backend/ml-services/anomaly-detection/anomaly_detector.py`
- `docker-compose.yml`
- `src/services/openaiService.ts`
- `src/services/NotificationService.js`
- `src/services/notifications/NotificationService.js`
- `src/utils/clinicalAlertNotifications.js`
- `public/sw.js`
- `src/components/offline/OfflineSupport.jsx`
- `src/db/offline.js`
- `src/db/offline.db.js`
- `src/services/syncService.js`
- `src/components/ChatInterface.jsx`
- `AUTH_DEBUG_TEST.html`
- `test-runner.py`

Config/build/CI:

- `package.json`
- `package-lock.json`
- `backend/package.json`
- `backend/package-lock.json`
- `mcp/package.json`
- `mcp/package-lock.json`
- `vite.config.js`
- `vitest.config.js`
- `tsconfig.frontend.json`
- `backend/tsconfig.json`
- `backend/tsconfig.eslint.json`
- `vercel.json`
- `Dockerfile`
- `backend/Dockerfile`
- `Dockerfile.android`
- `.github/workflows/ci-cd.yml`
- `.github/workflows/quality.yml`
- `.github/workflows/test.yml`
- `.github/workflows/build-android.yml`
- `.github/workflows/android-build.yml`

Environment/docs:

- `.env.example`
- `backend/.env.example`
- `backend/.env.rag.example`
- `backend/ml-services/nlu/.env.example`
- `README.md`
- `docs/nested-pages-config-normalization-plan.md`
- `docs/duplicate-code-and-blocker-audit.md`
- `docs/unwired-orphan-code-scan.md`

## 16. Prioritized Normalization Plan

1. Decide mobile ownership.
   - Choose Capacitor SPA or native Kotlin/Compose for the next release.
   - Mark the other path as prototype/stale and remove it from CI/build expectations.

2. Fix or disable anomaly detection.
   - Add a real HTTP service + Dockerfile + routes + tests, or remove the Compose service and disable backend chat fetch integration.
   - Resolve the host port `5000` conflict with Logstash.

3. Consolidate package management.
   - Either convert root/backend/MCP to npm workspaces or document a setup script that runs `npm ci` in each package.
   - Make root scripts install-aware when they call backend or MCP.

4. Merge API/client islands.
   - Remove browser OpenAI client usage.
   - Route all frontend API calls through `apiClient` and domain services.
   - Generate or inventory Android API contracts if native Android remains.

5. Merge notification/offline stacks.
   - Pick one notification service export shape.
   - Fix `clinicalAlertNotifications.js`.
   - Pick one offline storage/sync strategy and keep `/api/sync` hidden until backend support exists.

6. Consolidate CI.
   - Keep one core quality workflow for frontend/backend lint/test/build.
   - Keep one mobile workflow after mobile ownership is decided.
   - Keep one release workflow.
   - Align Node versions.

7. Clarify deployment modes.
   - Document Vercel split frontend deployment versus Nest single-service static serving.
   - Add smoke tests for `/api/config/system` returning JSON and app routes returning SPA HTML in each mode.

8. Tighten type and dependency coverage.
   - Update frontend typecheck to include JS/JSX with `checkJs` where feasible, or migrate high-risk service files to TypeScript.
   - Add Python sidecar dependency checks if sidecars remain.
   - Audit Capacitor major-version compatibility.

9. Move or remove prototypes.
   - Move `AUTH_DEBUG_TEST.html` and `test-runner.py` to `docs/examples` or remove after confirming no owner.
   - Remove backend public asset copies if Vite root assets are canonical.

## 17. Do-Not-Touch List

Do not remove or rewrite these without a dedicated implementation plan:

- `src/App.jsx`
- `src/main.jsx`
- `src/layout/AppShell.jsx`
- `src/layout/AuthShell.jsx`
- `src/layout/PublicShell.jsx`
- `src/services/apiClient.js`
- `src/data/toolInventory.js`
- `src/data/clinicalToolIdContract.js`
- `src/routes/clinicalToolRoutes.js`
- `src/navigation/registryToolLaunch.js`
- `src/data/segmentInventory.js`
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/modules/medical-control-plane`
- `backend/src/modules/clinical-intelligence`
- `backend/src/modules/chat`
- `backend/src/modules/auth`
- `backend/src/modules/audit`
- `backend/src/modules/compliance`
- `backend/src/modules/notifications`
- `backend/src/modules/rag`
- `backend/src/modules/metrics`
- `backend/src/config`
- `vite.config.js`
- `vitest.config.js`
- `backend/package.json`
- `backend/tsconfig.json`
- `vercel.json`
- `.env.example`
- `backend/.env.example`

Do not delete these until ownership is decided:

- `android`
- `capacitor.config.json`
- `backend/ml-services/nlu`
- `mcp`
- `config/grafana`
- `config/prometheus.yml`
- `config/prometheus`
- `config/alertmanager`
- `config/kibana`
- `config/logstash.conf`

## 18. Risk Assessment

Critical risk:

- None found in the canonical React/Vite + NestJS spine that requires immediate code modification during this audit.

High risk:

- Native Android versus Capacitor conflict can produce two divergent products and duplicate API contracts.
- Anomaly detection sidecar is configured as a service but implemented as a non-service script, and Compose references missing service assets.
- Docker Compose port conflict prevents full local infrastructure from binding cleanly.
- Browser-side OpenAI client would expose AI credentials if used.
- Notification service duplication can break clinical alert notification flows.

Medium risk:

- Multiple package lockfiles without workspaces make fresh installs and CI setup ambiguous.
- Duplicate CI workflows can give inconsistent green/red signals.
- Offline/sync/service-worker stack calls unsupported backend routes.
- Vercel split deploy and Nest static serving need separate smoke tests to avoid serving SPA HTML to API clients.
- Frontend typecheck misses most JS/JSX app files.
- Native Android endpoints drift from backend routes.

Low risk:

- Observability dashboards/config are isolated but reasonable as Docker Compose-owned supporting infrastructure.
- NLU sidecar is optional and has a clearer bridge than anomaly detection, but still needs documented install/test ownership.
- Plain HTML/Python debug artifacts are easy to quarantine once confirmed unused.

Recommended next action: normalize mobile and sidecar ownership first, then merge notification/offline/API-client islands, then consolidate package/CI/deployment configuration.
