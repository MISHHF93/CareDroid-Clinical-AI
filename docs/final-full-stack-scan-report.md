# Final Full-Stack Scan Report

Generated: 2026-05-23

Scope: read-only full-stack inspection of the current CareDroid Clinical AI codebase before the next implementation phase. This report is based on direct source inspection of routes, layout, tool inventories, launch resolvers, backend controllers/services/DTOs, API contracts, environment/deployment files, and test/build scripts. No application code was modified.

## 1. Executive Summary

CareDroid Clinical AI is broadly stable and unified enough for strategic expansion, but it is not a clean production go without a short hardening pass. The app has a strong canonical spine: route definitions in `src/App.jsx`, tool ID contracts in `src/data/clinicalToolIdContract.js`, canonical inventory in `src/data/toolInventory.js`, launch resolution in `src/navigation/registryToolLaunch.js`, backend route inventory in `src/data/backendHttpRouteInventory.js`, API call inventory in `src/data/frontendApiCallsInventory.js`, and executor registry contracts in `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`.

The most important current state is:

- No confirmed critical blocker was found in the core `/tools`, calculator route, sidebar, or registered executor wiring.
- Registered direct POST executors remain intentionally limited to `sofa-calculator`, `drug-interactions`, and `lab-interpreter`.
- Clinical intelligence workflows are backend-backed platform routes, not tool-orchestrator executors, and are represented in inventory with permissions and endpoints.
- The remaining risks are mostly user trust and expansion readiness issues: mocked but visible operational pages, backend functions that should be surfaced deliberately, a chat fallback that can hide unsupported executor boundaries, stale generated docs, and production deployment assumptions.

## 2. Current Health Score

Overall readiness score: 84 / 100

- Frontend route and shell health: 88 / 100
- Tool inventory and launch health: 87 / 100
- Backend controller/service health: 82 / 100
- Contract and API wiring health: 84 / 100
- UX/mobile health: 83 / 100
- Test/build/deployment readiness: 78 / 100

Go posture: Go for the next implementation phase with a required hardening checklist. No-go for production or clinical pilot expansion until the high-severity findings below are fixed or explicitly accepted.

## 3. Frontend Findings

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| FE-01 | high | Clinical alerts are visible as an operations page with sample data, while the backend alert capability is disabled. The page does show an unsupported banner, but still renders realistic mock clinical alerts and user actions. | `src/App.jsx` mounts `/clinical/alerts`; `src/pages/Operations.jsx` links "Clinical alerts"; `src/pages/ClinicalAlertsPage.jsx` uses hard-coded `mockAlerts`; `src/config/backendApiCapabilities.js` sets `clinicalAlerts: false`. | Either keep `/clinical/alerts` dev/admin-only until a real backend exists, or relabel the page as "Sample alert demo" and remove it from normal Operations discovery. When productized, add backend routes and replace mock state with API-backed loading/error/empty states. |
| FE-02 | high | The Clinical Alerts "Export" button is a dead user-facing action. | `src/pages/ClinicalAlertsPage.jsx` renders `<button className="btn-export" title="Export alert details">` without `onClick`, capability gating, or disabled state. | Wire it to the existing export service with a local fallback, or disable/remove it until alert export is supported. Add a component test that every rendered alert action has either a handler or disabled/unsupported state. |
| FE-03 | medium | Tool pages' "Open in Assistant" panel sets the selected tool but does not seed Assistant context. Users can land in chat with no message or explanation of what was opened. | `src/pages/tools/ToolPageLayout.jsx` buttons call `selectTool(tool.id)` then `navigate('/assistant')`; they do not call `addMessage`, unlike `ToolsOverview.jsx` and `registryToolLaunch.js`. | Route these buttons through `applyRegistryToolLaunch()` or add a tool-specific guarded chat seed. Add a smoke test that tool-page Assistant buttons create an expected conversation seed. |
| FE-04 | medium | Custom workspaces can hide newly added tools indefinitely without an indicator. Defaults and the `all` workspace merge registry updates, but custom workspace records are returned unchanged. | `src/contexts/WorkspaceContext.jsx` loads persisted workspaces; `src/data/sidebarToolPresentation.js` only merges registry IDs into `all` and default category workspaces, returning custom workspaces unchanged. | Add a hidden-tools indicator and "Add new tools" or "Reset workspace" affordance in `Sidebar.jsx` and `ToolsOverview.jsx`. Test stale custom workspace behavior after adding a new registry ID. |
| FE-05 | low | `/tools/catalog` is developer/source-audit content but remains a normal route reachable from `/tools` and Settings navigation. This is intentional, but it can expose phantom/internal IDs to non-developer users. | `src/pages/tools/ToolsOverview.jsx` links "Trust and source details"; `src/navigation/primaryNavigation.js` includes `/tools/catalog` under Settings matching; `src/pages/tools/ClinicalToolCatalog.jsx` displays phantom rows from `sourceCodeToolDiscovery.js`. | Keep it if this is a trust feature, but gate source-audit/phantom sections behind admin/developer mode or split user "Trust details" from developer "Source Audit". |
| FE-06 | low | Some UI still uses icon glyph text for actions/status, which is not a wiring blocker but is weaker for accessibility and consistency than the centralized icon registry. | `src/pages/team/TeamManagement.jsx` uses glyphs for status/edit/delete; `src/pages/ClinicalAlertsPage.jsx` uses emoji/status glyphs. | Replace with `NavIcon` and explicit accessible text, or ensure glyphs are `aria-hidden` with separate labels. |

## 4. Backend Findings

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| BE-01 | high | Chat clinical-tool requests can silently fall back to general AI text when the classifier identifies a tool with no registered executor. This hides the boundary between "guided chat/local form" and "server-executable tool". | `backend/src/modules/chat/chat.service.ts` catches `NotFoundException` in `handleClinicalTool()` and calls `generateAIResponse()` with a note that the tool is not automated. `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` explicitly documents many unsupported NLU tool IDs. | Return a structured unsupported-tool response with `errorCode: UNSUPPORTED_TOOL`, the matched `toolId`, and a launch hint for the frontend to open the calculator hub or guided chat. Keep general educational fallback only after the unsupported boundary is visible. |
| BE-02 | medium | Several backend request bodies are inline object types, so the global validation pipe cannot enforce DTO/class-validator rules for those endpoints. | `backend/src/modules/chat/chat.controller.ts` uses inline body shapes for `suggestAction()` and `analyzeVitals()`; `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts` uses an inline object for `recordToolResult()`. | Add DTO classes with `class-validator` decorators for these request bodies, including array/object shape checks and max sizes. Add controller tests for invalid payloads. |
| BE-03 | medium | `POST /api/chat/suggest-action` and `POST /api/chat/analyze-vitals` are real backend functions marked "expose recommended" but have no frontend client entry in the canonical frontend API inventory. | `backend/src/modules/chat/chat.controller.ts` exposes both routes; `src/data/backendRouteExposurePolicy.js` marks both `expose-recommended`; `src/data/frontendApiCallsInventory.js` does not list them. | Decide whether these become surfaced features in Dashboard/Patients/Operations. If yes, add `clinicalChatService` client functions, capability entries, UI entry points, and tests. If no, change exposure policy to deferred/internal. |
| BE-04 | medium | The LLM fallback prompt in the intent classifier is stale relative to the current tool catalog. It lists only an older subset and omits many current calculator, clinical intelligence, and fleet tool IDs. | `backend/src/modules/medical-control-plane/intent-classifier/intent-classifier.service.ts` hard-codes tool options in the prompt; `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts` and `src/data/clinicalToolIdContract.js` contain a broader inventory. | Generate the LLM prompt tool list from the same pattern source or a shared serialized contract. Add a test that the fallback prompt includes all current NLU tool IDs or a declared supported subset. |
| BE-05 | medium | The medical-control-plane module comment still says RAG is "to be implemented" even though `RAGModule` and `RAGService` are present and used by chat and clinical intelligence. | `backend/src/modules/medical-control-plane/medical-control-plane.module.ts`; `backend/src/app.module.ts`; `backend/src/modules/chat/chat.service.ts`; `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts`. | Refresh comments/docs to reflect that RAG is implemented but operationally dependent on configuration and data ingestion. |
| BE-06 | low | Backend route exposure policy still labels `GET /api/auth/me` as deferred even though the controller exposes it and it may be a cleaner auth bootstrap endpoint than `/api/users/profile`. | `backend/src/modules/auth/auth.controller.ts`; `src/data/backendHttpRouteInventory.js`; `src/data/backendRouteExposurePolicy.js`; `src/contexts/UserContext.jsx`. | Either adopt `/api/auth/me` for SPA token hydration or keep `/api/users/profile` as canonical and mark `/api/auth/me` backend-only/deferred with rationale. |

## 5. Contract/Wiring Findings

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| CW-01 | high | The app has two visible clinical alert surfaces but no backend clinical-alert API. One page uses sample state, while client helpers are capability-gated. | `src/pages/ClinicalAlertsPage.jsx`; `src/utils/clinicalAlertNotifications.js`; `src/config/backendApiCapabilities.js`; `src/data/frontendApiCallsInventory.js`. | Pick one contract lane: local/demo-only or backend-backed. Until backend routes exist, remove normal discovery and make all alert actions explicitly local. |
| CW-02 | medium | Backend route and frontend API inventories disagree on recommended exposure for chat vitals/next-action features. | `src/data/backendRouteExposurePolicy.js` recommends surfacing `suggest-action` and `analyze-vitals`; `src/data/frontendApiCallsInventory.js` has no matching entries; `src/data/platformCapabilitiesCatalog.js` lists them as platform capabilities. | Add frontend API inventory rows and clients if the next phase will surface these functions; otherwise downgrade exposure policy to deferred. |
| CW-03 | medium | Generated contract docs exist, but they are harness summaries, not regenerated source-derived matrices. This can make the docs look authoritative while missing current counts/details. | `docs/backend-exposure-report.md`, `docs/tool-render-execute-matrix.md`, `docs/tool-contract-matrix.md`, `docs/backend-frontend-tool-contract.md`, `docs/tool-visibility-matrix.md`. | Run the writer scripts when package tooling is available and commit real generated output. Add a CI check that generated docs are up to date or clearly mark them as summaries. |
| CW-04 | medium | The production API contract relies on `VITE_API_URL` for split frontend/backend deployments and same-origin `/api` only for Vite proxy or verified reverse proxy. The guard exists, but this remains a deployment footgun. | `src/config/apiEnv.js`, `src/services/apiClient.js`, `vite.config.js`, `vercel.json`, `scripts/validate-vercel-env.mjs`, `.env.example`. | Keep the Vercel validation and add production smoke tests that assert `/api/config/system` returns JSON, not `index.html`, for each deployed environment. |
| CW-05 | low | Backend-only/internal functions are documented, but there is no generated orphan report artifact matching `docs/orphaned-backend-functions.md` referenced by source comments. | `src/data/backendOrphanAudit.js`; `src/data/backendRouteExposurePolicy.js`; `docs/` does not include `orphaned-backend-functions.md`. | Either generate the orphan report or update the source comment to point to `docs/backend-exposure-report.md`. |

## 6. Tool Inventory Findings

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| TI-01 | medium | No frontend tool currently appears to falsely claim direct tool-orchestrator POST executor support, but catalog wording still has multiple backend lanes that can be confused by users and future implementers. | `src/data/toolInventory.js` separates `executorStatus`; `src/pages/tools/ClinicalToolCatalog.jsx` displays `POST API` and `NLU backend`; `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` registers only three executors. | Keep labels explicit: "Registered POST executor", "Clinical intelligence backend", and "NLU/chat only". Add UI tests around badge language for `dispatch-ai`, Tier-B calculators, and clinical intelligence tools. |
| TI-02 | medium | Backend functions that should be surfaced but are not: chat next-action suggestions and vitals analysis. They exist as backend routes and platform catalog rows but lack user-facing clients. | `backend/src/modules/chat/chat.controller.ts`; `backend/src/modules/chat/chat.service.ts`; `src/data/platformCapabilitiesCatalog.js`; `src/data/backendRouteExposurePolicy.js`. | Surface them in Patients/Operations/Dashboard with explicit input forms and fallback states, or move them to deferred/internal until a product story exists. |
| TI-03 | medium | Clinical alert management is treated like a user-facing operational capability even though its backend contract is absent. | `src/pages/Operations.jsx`; `src/pages/ClinicalAlertsPage.jsx`; `src/data/frontendApiCallsInventory.js`; `src/config/backendApiCapabilities.js`. | Add a backend alert contract or remove the Operations card from production builds. |
| TI-04 | low | Phantom/source-scan rows remain discoverable in Developer Catalog. They are labeled, but they can still confuse screenshots, demos, or non-developer reviewers. | `src/data/sourceCodeToolDiscovery.js`; `src/pages/tools/ClinicalToolCatalog.jsx`. | Hide phantom rows by default or require the `phantom` filter/developer mode before showing them. |
| TI-05 | low | Canonical tool inventory is strong, but source-scan and generated-doc counts can drift if docs are not regenerated in CI. | `src/data/toolInventory.js`; `src/data/sourceCodeToolDiscovery.js`; `docs/tool-contract-matrix.md`; `docs/tool-render-execute-matrix.md`. | Make doc generation deterministic in CI or convert docs to clearly dated snapshots. |

## 7. UX/Mobile Findings

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| UX-01 | medium | Android compact layout is well covered, but the six-item bottom nav leaves little tolerance on 320px devices and long translated labels. Current labels are short enough, but future expansion can overflow quickly. | `src/layout/AppShell.jsx`; `src/layout/AppShell.css`; `src/navigation/primaryNavigation.js`; `src/data/androidDeviceQaMatrix.test.js`. | Keep bottom nav capped at six or move secondary items into the drawer. Add a regression test for 320px width with all labels visible/truncated without overlap. |
| UX-02 | medium | Clinical Alerts has local-only acknowledge state and a dead export action, so users can believe they reviewed/exported clinical data when nothing persisted. | `src/pages/ClinicalAlertsPage.jsx`; `src/config/backendApiCapabilities.js`. | Disable acknowledge/export when backend is unavailable, or label both actions as sample-only. Persist local state only if the page is explicitly demo/local. |
| UX-03 | medium | Chat-assisted calculator launches are centralized and generally safe, but unsupported executor fallback in backend chat can still feel like a silent failure if a user asks Assistant to calculate an unsupported Tier-B tool. | `src/pages/tools/Calculators.jsx`; `src/navigation/registryToolLaunch.js`; `backend/src/modules/chat/chat.service.ts`. | Return a structured unsupported response with a frontend launch target, then render a clear "guided chat / local form only" card. |
| UX-04 | low | Mobile responsive architecture is strong: drawer focus management, safe-area insets, touch targets, route smoke coverage, and Android QA matrix are present. Remaining risk is ongoing visual validation, not obvious missing CSS. | `src/layout/AppShell.jsx`; `src/layout/AppShell.css`; `src/styles/mobileFirstLayout.test.js`; `src/data/androidDeviceQaMatrix.test.js`; `package.json`. | Keep `npm run test:responsive-regression`, `npm run test:e2e:android`, and visual QA in the pre-release checklist. |

## 8. Test/Build Findings

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| TB-01 | high | The root Dockerfile is a development server image, not a production frontend image. It runs `npm run dev:lan` and exposes Vite dev server port `8000`. | `Dockerfile`; `package.json`; `vercel.json`; `backend/Dockerfile`. | Replace with a production static image or clearly rename it as `Dockerfile.dev`. For production, build `dist` and serve with an HTTP server/reverse proxy with `/api` configured. |
| TB-02 | medium | Validation scripts are comprehensive but were not executed as part of this documentation-only scan. Current stability is based on source inspection, not fresh runtime proof. | `package.json` includes `validate:ci`, `test:responsive-regression`, `test:e2e:android`, `test:e2e:production`; `backend/package.json` includes build/test/e2e scripts. | Before the next phase begins, run `npm run validate:ci`, `npm run test:e2e:android`, and `npm run test:e2e:production` in a clean environment. Record results in a release checklist. |
| TB-03 | medium | Missing targeted tests for current risks: clinical alerts sample/dead actions, backend unsupported-tool chat response, chat vitals/next-action exposure, production `/api` JSON smoke, and generated-doc freshness. | Current tests cover many route/inventory/responsive contracts, but no inspected test directly proves these risk areas. | Add focused tests: `ClinicalAlertsPage.actions.test.jsx`, backend `chat.unsupported-tool.spec.ts`, frontend exposure tests for `suggest-action/analyze-vitals`, production smoke for `/api/config/system`, and generated-doc drift checks. |
| TB-04 | low | Package scripts are strong but long and easy to partially bypass. `validate:ci` bundles many checks, but deployment-specific checks are separate. | `package.json`; `backend/package.json`; `playwright.production.config.mjs`; `playwright.android.config.mjs`. | Create a short release command or checklist that runs CI validation plus deployment smoke and Android QA. |

## 9. Deployment Risks

| ID | Severity | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| DR-01 | high | Production split frontend/backend deployments depend on correct `VITE_API_URL`. Without it, `/api` can hit the static SPA host; with `/api` appended, requests become `/api/api/*`. | `src/config/apiEnv.js`; `src/services/apiClient.js`; `scripts/validate-vercel-env.mjs`; `vercel.json`; `.env.example`. | Keep `validate:vercel-env` mandatory and add runtime smoke that checks API JSON content type after deploy. |
| DR-02 | high | The root Dockerfile is unsuitable as a production web image and can accidentally deploy Vite dev server. | `Dockerfile`; `package.json`. | Replace or rename it. Add a production frontend Dockerfile using built assets and explicit health checks. |
| DR-03 | medium | Backend CORS defaults only allow `http://localhost:8000`. Split production deployments require `FRONTEND_URL` to be set accurately. | `backend/src/main.ts`; `backend/.env.example`. | Make production startup fail fast if `NODE_ENV=production` and `FRONTEND_URL` is unset or still localhost. |
| DR-04 | medium | Backend Helmet CSP uses `connectSrc: ['self']`. This is safe for same-origin serving but can block external telemetry or split-origin browser calls if the backend serves the frontend. | `backend/src/main.ts`; `.env.example`; `src/config/appConfig.js`. | Parameterize CSP connect sources from environment for Sentry, Firebase, API, and WebSocket origins. Add CSP smoke in production preview. |
| DR-05 | medium | Production frontend build has sourcemaps enabled. This may be acceptable with private artifact handling but is a security/release policy decision. | `vite.config.js` sets `build.sourcemap: true`. | Either upload sourcemaps to the error tracker and prevent public exposure, or disable public sourcemaps for production builds. |
| DR-06 | low | Environment examples include placeholder secrets and defaults that are safe as examples but must not leak into deployed environments. | `.env.example`; `backend/.env.example`; `backend/src/config/encryption.config.ts`; `backend/src/config/auth.config.ts`. | Add deployment validation for secret length/placeholder detection, especially JWT, encryption, Stripe, Firebase, and OpenAI keys. |

## 10. Critical Fixes

No confirmed critical-severity defect was found. The required pre-expansion hardening list is:

1. Fix or hide the Clinical Alerts operational surface until a real backend contract exists.
2. Add a handler or disabled state for the Clinical Alerts export button.
3. Replace or rename the root development Dockerfile.
4. Make backend unsupported-tool chat responses explicit and structured.
5. Decide whether to surface `suggest-action` and `analyze-vitals`, then align backend exposure policy, frontend inventory, clients, UI, and tests.
6. Regenerate or clearly version generated contract/audit docs.
7. Run the full validation and production smoke suite before product expansion.

## 11. Recommended Next Phase

Recommended next implementation phase: Contract and operations hardening.

Phase goals:

- Productize or remove mocked operational surfaces.
- Promote selected backend-only functions through the canonical frontend API inventory.
- Tighten unsupported-tool responses so Assistant never masks executor boundaries.
- Stabilize production deployment artifacts and smoke tests.
- Regenerate source-derived docs and make drift visible in CI.

Suggested sequence:

1. Clinical alerts contract decision: implement backend routes or demote the UI to demo-only.
2. Backend exposure pass: `suggest-action`, `analyze-vitals`, tool statistics, and executor catalog.
3. Assistant/tool boundary pass: explicit unsupported responses plus UI launch hints.
4. Deployment pass: production Dockerfile, CORS/CSP env validation, API JSON smoke.
5. Documentation/test pass: regenerate docs and add missing targeted tests.

## 12. Go/No-Go Recommendation

Recommendation: conditional Go for strategic expansion planning; No-Go for production expansion until high-severity fixes are complete.

Rationale:

- Core navigation, `/tools`, calculator routes, chat-assisted launches, fallback screens, canonical inventory, API client normalization, and executor registry contracts are coherent.
- Backend controllers and services are present and mostly aligned with the frontend contract matrix.
- The remaining risks are concentrated and fixable, but they affect user trust and deployment safety: mocked clinical alerts, dead export action, implicit unsupported-tool fallback, recommended backend functions not surfaced, stale docs, and production Docker/API assumptions.

Minimum Go checklist before the next implementation phase:

- Resolve FE-01, FE-02, BE-01, TB-01, DR-01, and DR-02.
- Add tests for the resolved paths.
- Run `npm run validate:ci` plus Android and production smoke tests in a clean environment.
