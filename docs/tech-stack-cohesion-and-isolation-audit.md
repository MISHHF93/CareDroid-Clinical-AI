# Tech-Stack Cohesion and Isolation Audit — CareDroid Clinical AI

## 1. Executive Summary
CareDroid is **not a single-stack codebase** today. It is a multi-surface monorepo-like project containing:
- A canonical React 18 + Vite SPA frontend (`/src` + root `package.json`).
- A canonical NestJS backend (`/backend`).
- A separate MCP Node server (`/mcp`).
- A full native Android/Kotlin app tree (`/android`) that is beyond “optional Capacitor shell”.
- Separate Python ML services (`/backend/ml-services`) with their own runtime/deps.
- Multiple standalone test runners and prototype/debug artifacts.

Conclusion: the intended frontend/backend stack exists, but there are **multiple isolated technology islands** and **parallel tooling systems** that reduce cohesion and increase operational risk.

## 2. Intended Stack
Intended canonical stack (from request and repo reality):
- Frontend: React 18 + Vite SPA.
- Backend: NestJS API with medical-control-plane + tool orchestrator.
- Optional mobile integration via Capacitor Android.
- Tests: Vitest (frontend), Jest (backend), Playwright (E2E).
- Unified API/client and tool inventory contracts.

## 3. Actual Stack Inventory
### Canonical core
- React + React Router + Vite frontend.
- NestJS backend using TypeORM, Swagger, auth/permissions, control-plane/orchestrator modules.

### Additional stacks discovered
- Native Android app (Kotlin, Gradle, Jetpack Compose-style structure, Room, repositories, DI modules).
- MCP server (`mcp/src/server.mjs`) with independent package/lockfile.
- Python ML services (`anomaly_detector.py`, NLU app/train/eval/test scripts).
- Standalone helper/runner scripts: shell, PowerShell, Python, Kotlin script runner, Node.
- Monitoring/ops config stack (Prometheus/Grafana/Alertmanager/Kibana).
- Docker stack (`Dockerfile`, `backend/Dockerfile`, `Dockerfile.android`, `docker-compose.yml`).

## 4. Frontend Stack Findings
- Frontend is Vite SPA and routes are centralized in `src/App.jsx`; app shell and protected/public route patterns are cohesive.
- Canonical API boundary appears to be `src/services/apiClient.js` + domain APIs (`clinicalOrchestratorApi`, `clinicalToolsApi`, etc.).
- Frontend has mixed JS/TS: mostly JS/JSX with selected TS (`logger.ts`, `analyticsService.ts`, etc.).
- Requested directories `src/features`, `src/modules`, `src/layouts` are absent; actual structure uses `src/pages`, `src/components`, `src/layout`, `src/services`, `src/data`.
- `src/data/*` includes extensive inventory/audit/test matrices that function as governance layer, not typical production UI code.

## 5. Backend Stack Findings
- Backend is a real NestJS application with moduleized domains (`auth`, `clinical`, `medical-control-plane`, `chat`, `notifications`, etc.).
- Medical control plane and tool orchestrator are present and tested.
- Backend also serves production frontend static assets conditionally, coupling deploy mode with frontend build artifacts.
- Backend includes generated/bundled frontend artifacts in `backend/public/assets/*`, creating risk of stale embedded frontend assets if not regenerated consistently.

## 6. Mobile/Capacitor Findings
- Capacitor config exists and root deps include Capacitor packages.
- In addition, `/android` is a substantial native app with independent architecture (repositories, DTOs, local DB, DI, tests).
- This exceeds “optional Capacitor shell”; mobile is effectively a parallel client platform.
- Multiple Android build scripts at root and in `/android` suggest duplicate build entry points.

## 7. Testing Stack Findings
- Frontend: Vitest (with jsdom) configured centrally.
- Backend: Jest for unit/integration + Jest e2e config.
- E2E: Playwright configs for responsive, production smoke, and Android contexts.
- Additional ad hoc test runners exist: `test-runner.py`, `test-runner.kts`, `test-runner-full.js`.
- This is functional but fragmented; non-canonical runners are likely isolated utilities.

## 8. Build/Deployment Stack Findings
- Vercel config targets Vite `dist` with SPA rewrite.
- Frontend build includes asset validation and env validation scripts.
- Backend has independent build/start pipeline.
- Docker and docker-compose introduce additional deploy pathways.
- Multi-lockfile setup (`package-lock.json`, `backend/package-lock.json`, `mcp/package-lock.json`) is valid for multi-package repos but requires explicit ownership/documentation.

## 9. Isolated Code Islands
1. **MCP server island** (`/mcp`): own package/runtime; not part of SPA or Nest runtime by default.
2. **Python ML services island** (`/backend/ml-services`): separate deps and execution model; not first-class in backend npm scripts.
3. **Native Android island** (`/android`): independent app and tests; parallel API client and domain model.
4. **Standalone HTML debug prototype** (`AUTH_DEBUG_TEST.html`): not part of SPA routing/build.
5. **Standalone test runner files** (`test-runner.py`, `test-runner.kts`, `test-runner-full.js`): parallel execution pathways.
6. **Backend static asset bundle snapshots** (`backend/public/assets`): potentially stale generated artifacts if not tied to CI refresh.

## 10. Stack Conflicts
- Multiple client implementations (SPA services, Android repositories, MCP bridge) can drift from canonical API contracts.
- Mixed JS/TS with partial typecheck coverage can hide integration regressions.
- Parallel build systems for mobile (`build-android*.sh/.ps1`, android scripts, capacitor sync) increase inconsistency risk.
- Multiple runtime ecosystems (Node + Python + Kotlin/Gradle) require distinct dependency/security patch workflows.

## 11. Bridge Gaps
For non-core stacks:
- **MCP**: runnable (`npm run mcp:server` from root); bridge to API exists conceptually, but documentation/contract enforcement linkage to frontend/backend contract tests is unclear.
- **Python ML services**: have local scripts/tests, but no strong bridge contract in root CI scripts.
- **Android native**: runs via Gradle/Capacitor scripts; communicates via its own API layer, not shared JS client.
- **Ops configs** (Grafana/Prometheus/etc.): infra-only, not wired into frontend/backend app scripts directly.

## 12. Configuration Drift
- Directory naming drift: intended `layouts/features/modules` vs actual `layout/services/data`-centric shape.
- Frontend and backend each define independent lint/test/type standards.
- Root and backend maintain separate TS compiler settings.
- Backend serving static frontend can drift from Vercel SPA deployment model (two production modes).

## 13. Dependency Risks
- Root declares Capacitor + MCP SDK although MCP has separate package; potential duplication and ambiguous ownership.
- High script surface area can leave stale scripts unmaintained.
- Generated artifacts committed (`backend/public/assets`) can diverge from source and inflate review noise.
- Python cache artifacts (`__pycache__`) committed under NLU tests suggest repo hygiene drift.

## 14. Recommended Canonical Stack Map
- **Primary production web**: React/Vite frontend + NestJS backend.
- **Backend internal extensions**: medical-control-plane, orchestrator, chat, compliance, metrics.
- **Optional integrations**:
  - Mobile: Capacitor/Android (explicitly versioned as separate client surface).
  - MCP bridge: external integration server.
  - ML Python services: sidecar services with explicit API/queue contract.

## 15. Exact Files To Inspect Further
Priority files/groups:
- Root: `package.json`, `vite.config.js`, `vitest.config.js`, `vercel.json`, `tsconfig.frontend.json`.
- Frontend runtime: `src/main.jsx`, `src/App.jsx`, `src/services/apiClient.js`, `src/services/clinicalOrchestratorApi.js`, `src/config/apiEnv.js`.
- Backend runtime: `backend/package.json`, `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/modules/medical-control-plane/**`.
- Mobile: `capacitor.config.json`, `android/app/build.gradle`, `android/app/src/main/kotlin/**`.
- Islands: `mcp/package.json`, `mcp/src/server.mjs`, `backend/ml-services/nlu/*`, `AUTH_DEBUG_TEST.html`, `test-runner.py`, `test-runner.kts`, `test-runner-full.js`.

## 16. Prioritized Normalization Plan
1. **Define canonical production surfaces** in docs: Web SPA + Nest API (mandatory), Mobile/MCP/ML (optional/auxiliary).
2. **Create stack ownership matrix** per folder (owner, runtime, CI entrypoint, production status).
3. **Unify API contract enforcement** across SPA, backend, Android, MCP (schema-first or generated SDK).
4. **Consolidate test entrypoints**: keep Vitest/Jest/Playwright; deprecate ad hoc runner scripts unless justified.
5. **Separate generated artifacts** (`backend/public/assets`) from source control or enforce refresh checks.
6. **Harden CI** to explicitly include/exclude Android/ML/MCP with clear lanes.
7. **Standardize env conventions** (`VITE_*` frontend, backend server envs) with documented mapping.

## 17. Do-Not-Touch List
During normalization, avoid risky bulk edits to:
- `backend/src/modules/medical-control-plane/**` orchestration logic.
- `src/data/*` contract and inventory audit datasets/tests.
- `src/App.jsx` canonical routing map until route ownership matrix is finalized.
- `backend/src/main.ts` security middleware/CORS/static serving without deployment-mode tests.

## 18. Risk Assessment
- **High risk**: cross-client contract drift (web vs android vs mcp vs python services).
- **High risk**: deployment ambiguity (Vercel SPA vs backend-served static assets).
- **Medium risk**: duplicated runner/tool scripts causing false confidence in CI completeness.
- **Medium risk**: generated/static artifacts and pycache files in repo causing stale-state bugs.
- **Low-medium risk**: mixed JS/TS style inconsistency impacting maintainability.

---

## Classification Table (Non-core stack/code islands)
- MCP server: **supporting script / integration bridge** (currently semi-isolated).
- Android native app: **mobile integration** (parallel production candidate, not web-core).
- Python ML services: **backend internal sidecar** (currently isolated in tooling).
- Standalone test runners: **dev/test utility** (potentially stale/conflicting).
- AUTH_DEBUG_TEST.html: **prototype/sandbox** (orphaned unless documented usage).
- backend/public/assets committed bundle: **conflicting/generated artifact** risk.
