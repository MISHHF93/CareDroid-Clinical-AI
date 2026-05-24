# Nested Pages, Config, and Feature Island Normalization Plan

Generated: 2026-05-23

Scope: read-only audit of frontend pages/components/layouts/data, backend modules/controllers/services/DTOs/executors, configuration files, env examples, test runners, docs-adjacent scripts, and sandbox/prototype-like islands. No production source code was modified for this plan.

## 1. Executive Summary

CareDroid Clinical AI does not currently have separate frontend `src/features`, `src/modules`, `src/sandbox`, `src/prototypes`, or `src/experimental` directories. The sandbox/prototype risk instead appears as visible pages and services that are partially wired, mock-only, local-only, or gated behind false backend capabilities.

The canonical app architecture is already present: `src/App.jsx` owns SPA route registration, `AppShell` owns protected layout, `AuthShell` and `PublicShell` own unauthenticated/public layout, `toolInventory.js` and `clinicalToolIdContract.js` normalize tool identity, `registryToolLaunch.js` centralizes tool launch behavior, `apiClient.js` centralizes API URL/auth handling, and `backendApiCapabilities.js` gates unavailable backend contracts.

The main flattening work is therefore not a rewrite. It is a containment and normalization pass:

- Collapse duplicate route names into one canonical route per user-facing concept.
- Promote local/mock surfaces into clearly labeled local-only features or hide them until backend support exists.
- Move duplicate service/config behavior behind canonical clients and matrices.
- Ensure every page is either routed through the app shell, public by design, or marked internal/audit-only.
- Ensure every tool launch uses canonical inventory and launch helpers.
- Ensure every unavailable API path is capability-gated and tested.

## 2. Route Duplication Findings

| Concept | Current paths or names | Classification | Canonical recommendation | Compatibility plan |
|---|---|---|---|---|
| Auth entry | `/auth`, `/login`, `/log-in`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/join`, account aliases | canonical plus legacy aliases | `/auth` | Keep aliases as redirects. Preserve signup intent with `?mode=signup`. |
| OAuth callback | `/auth-callback`, `/auth/callback` | canonical plus legacy | `/auth-callback` | Keep `/auth/callback` redirect until provider configs are migrated. |
| Home/Pulse | `/home`, `/dashboard` | duplicate/legacy | `/home` | Convert `/dashboard` to redirect, preserving legacy query handling during migration. |
| Assistant/chat | `/assistant`, `/chat` | duplicate/legacy | `/assistant` | Convert first-party launches to `/assistant`; keep `/chat` as temporary redirect/alias. |
| Tools browser vs developer catalog | `/tools`, `/tools/catalog` | canonical plus audit/admin surface | `/tools` for users; `/tools/catalog` or `/tools/developer-audit` for audit | Keep developer catalog protected and label as audit-only. Do not add top-level `/catalog`. |
| Calculator hub | `/tools/calculators`, `?calc=` | canonical plus legacy query selection | `/tools/calculators` | Keep `?calc=` accepted short term. |
| Calculator forms | `/tools/calculator/sofa`, `/tools/calculator/gfr`, `/tools/calculator/bmi`, `/tools/calculator/chads2vasc`, plus `/tools/calculators/:slug` | legacy singular plus canonical plural | `/tools/calculators/:slug` | Redirect singular paths to plural. |
| Patient AI workflows | `/patients` overview, but workflow pages under `/tools/patient-summary-ai`, `/tools/timeline-ai`, `/tools/ambient-scribe`, `/tools/order-set-ai` | partially wired/naming drift | Keep routes under `/tools` or move all patient workflow routes under `/patients/ai/*` | Short term: document URL/nav mismatch; long term: pick one hierarchy. |
| Fleet/operations | `/operations`, `/fleet/command`, `/fleet/route-optimizer`, `/fleet/predictive-maintenance`; no `/fleet` index | duplicate grouping/partial index | `/operations` as operational hub, `/fleet/command` as fleet dashboard | Add `/fleet` redirect to `/fleet/command` or `/operations`. |
| Clinical alerts | `/clinical/alerts` under Operations nav | partially wired | `/operations/clinical-alerts` or keep `/clinical/alerts` as operational subroute | Keep visible only with unsupported/local-only banner until backend exists. |
| Team management | `/team` | planned/future, capability-gated | `/settings/team` or `/admin/team` | Keep route protected and unsupported until backend team API exists. |
| Analytics/costs | `/analytics`, `/costs` | duplicate analytics surfaces | `/analytics` | Keep `/costs` if it is a detail page, otherwise merge as tab/subroute. |

## 3. Nested Page Findings

### Page Inventory And Classification

| Area | Files | Route state | Classification | Normalization action |
|---|---|---|---|---|
| Public/legal/help | `PrivacyPolicy.jsx`, `TermsOfService.jsx`, `GDPRNotice.jsx`, `HIPAANotice.jsx`, `HelpCenter.jsx` | routed public | canonical | Keep under `PublicShell`. |
| Auth | `Auth.jsx`, `AuthCallback.jsx` | routed public-only | canonical plus legacy redirects | Add mode preservation for signup aliases; redirect callback to `/home`. |
| App shell homes | `Dashboard.jsx`, `Patients.jsx`, `Operations.jsx` | routed protected | canonical, with duplicate URL aliases | Keep as top-level protected pages; normalize route names. |
| Settings/account | `Profile.jsx`, `ProfileSettings.jsx`, `Settings.jsx`, `NotificationPreferences.jsx`, `TwoFactorSetup.jsx`, `BiometricSetup.jsx`, `Onboarding.jsx` | routed protected | canonical/partially wired | Keep under Settings IA; consider `/settings/*` nesting later. |
| Tools browser/catalog | `ToolsOverview.jsx`, `ClinicalToolCatalog.jsx`, `ToolNotFound.jsx`, `ToolsAreaFallback.jsx` | routed protected | canonical plus audit-only | Keep `/tools` user-facing and mark catalog as developer/audit-only. |
| Tool pages | `DrugChecker.jsx`, `LabInterpreter.jsx`, `Protocols.jsx`, `DiagnosisAssistant.jsx`, `ProcedureGuide.jsx` | routed protected via `AppShell` and `ToolPageLayout` | mixed canonical/partially wired | Keep backend-backed pages canonical; normalize chat-only pages through `clinicalChatService`. |
| Calculator implementation batches | `Calculators.jsx`, `pr4aCalculators.jsx`, `pr8ClinicalBatchCalculators.jsx`, `mentalHealthCalculators.jsx`, `nextWaveCalculators.jsx`, `abcd2Calculator.jsx` | rendered only through `Calculators.jsx` | intentionally internal | Keep internal, not routeable directly. Enforce every exported calculator has a canonical slug record. |
| Clinical intelligence pages | `AmbientScribe.jsx`, `GuidelineRag.jsx`, `DifferentialAi.jsx`, `TimelineAi.jsx`, `PatientSummaryAi.jsx`, `OrderSetAi.jsx`, `AiExplainability.jsx`, `ClinicalAudit.jsx` | routed protected with permissions for PHI/audit pages | canonical | Keep routeable; decide whether patient AI belongs under Tools or Patients. |
| Fleet pages | `FleetDashboard.jsx`, `RouteOptimizer.jsx`, `PredictiveMaintenance.jsx`, widget files, `FleetPageChrome.jsx` | routed protected | frontend-only/local-only | Keep visible with local-only labels until backend fleet API exists. |
| Operations islands | `ClinicalAlertsPage.jsx`, `TeamManagement.jsx`, `AnalyticsDashboard.jsx`, `CostAnalyticsDashboard.jsx`, `AuditLogs.jsx` | routed protected | partially wired/planned | Keep gated or label unsupported/local-only. |
| Public shared session | `SharedToolSession.jsx` | public dynamic route | intentionally public | Keep public but ensure shared data cannot imply backend persistence if no share route exists. |

### Nested Or Indirectly Reachable Pages

- `ClinicalAlertsPage.jsx` is reachable through `/clinical/alerts` and Operations, but it uses sample alert data while backend capability `clinicalAlerts` is false.
- `TeamManagement.jsx` is reachable at `/team` with permissions, but all team API calls are disabled by `teamManagement: false`.
- `CostAnalyticsDashboard.jsx` and `LiveCostDashboard.jsx` are visible analytics surfaces backed largely by frontend cost/state services rather than a backend cost API.
- Calculator subcomponents are correctly internal, but their route visibility depends on `builtinUiCalculators`, `CALCULATOR_ROUTE_DEFS`, and switch cases staying synchronized.
- `SharedToolSession.jsx` is public and routeable, but the related share API `/api/tools/share-results` is disabled/missing.
- `NotificationPreferences.jsx` has a page wrapper and a component implementation. This is acceptable if the component remains the canonical view and the page remains a route adapter.

## 4. Sandbox/Prototype Findings

No dedicated production frontend sandbox/prototype directories were found under `src`.

Prototype-like or experimental surfaces found in production tree:

| Surface | Evidence | Classification | Recommendation |
|---|---|---|---|
| Clinical alerts page | Local sample alerts and `clinicalAlerts` capability false | sandbox/prototype visible as product page | Keep unsupported banner; move sample data behind `sampleClinicalAlerts` fixture or integrate real API before production labeling. |
| Fleet command telemetry | `fleetTelemetryService.js` states "Mock fleet telemetry" and returns `source: 'mock-telemetry'` | sandbox/prototype, protected visible | Keep as local demo/decision support, or integrate a backend fleet module before calling it operations-grade. |
| Route optimizer and predictive maintenance | Deterministic client-side engines, no backend fleet routes | partially wired/local-only | Mark local-only or convert into real backend-backed fleet tools. |
| Team management | `teamManagement` capability false, but `/team` route exists | planned/future | Keep protected unsupported page or hide from nav until API exists. |
| Chat message 3D endpoint | `POST /api/chat/message-3d` exists and policy marks it deferred | planned/future/internal | Keep out of visible UI until 3D avatar feature is real. |
| OIDC/SAML auth endpoints | Backend returns "not configured yet" | planned/future | Keep as placeholder probes, but label as unavailable in UI. |
| Frontend direct OpenAI service | `openaiService.ts` calls OpenAI directly with `VITE_OPENAI_API_KEY` | sandbox/prototype/security risk if exposed | Move under docs/examples or delete later; production AI should route through backend `AiModule`/chat. |
| External medical data service | `medicalDataService.ts` calls FDA/NIH/PubMed directly from browser | planned/future/integration island | Integrate through backend proxy or mark as internal utility if unused. |
| Backend ML services | `backend/ml-services/nlu`, `backend/ml-services/anomaly-detection` | isolated service island | Document as optional sidecars and wire health/capability status if production-owned. |
| Android native app sources | Native API service files exist alongside Capacitor config | parallel client island | Align with canonical React/Nest contract before treating native app as production. |

Sandbox policy decision:

- Visible protected page with no backend: mark local-only in UI and contract matrix.
- Unused prototype utility: move to `docs/examples` or delete later.
- Optional sidecar service: document startup, env, health check, and failure behavior.
- Native/parallel client: treat as separate client with explicit contract tests against `backendHttpRouteInventory`.

## 5. Configuration Drift Findings

| Config area | Current files | Classification | Drift risk | Recommendation |
|---|---|---|---|---|
| Vite dev/build | `vite.config.js` | canonical | Dev/preview both proxy `/api`, `/socket.io`, `/health` to `VITE_API_PROXY_TARGET`; port fixed to 8000 in config/scripts. | Keep as canonical frontend dev/build config. |
| Vitest | `vitest.config.js` | canonical frontend unit config | Excludes backend/e2e, default workers 1 for Windows. | Keep; document `VITEST_MAX_WORKERS`. |
| Playwright responsive | `playwright.config.mjs` | canonical responsive E2E | Has its own webServer and auth state. | Keep but centralize shared Playwright defaults. |
| Playwright Android | `playwright.android.config.mjs` | variant runner | Separate workers/timeouts/project. | Extract shared config helper to avoid drift. |
| Playwright production | `playwright.production.config.mjs` | production smoke variant | Requires `QA_BASE_URL`, no webServer. | Keep separate but share reporter/timeouts/defaults. |
| Frontend TS | `tsconfig.frontend.json` | partial/weak typecheck | `allowJs: true`, `checkJs: false`, includes only TS/TSX, while app is mostly JS/JSX. | Either rename as TS-only check or add JS checking gradually. |
| Backend TS | `backend/tsconfig.json`, `backend/tsconfig.eslint.json` | canonical backend config | Backend uses CommonJS, frontend uses ESM/bundler. Expected, but aliases differ. | Keep separate; document client/server boundary. |
| ESLint | `eslint.config.js`, backend `scripts/run-eslint.mjs` | split frontend/backend lint | Root ESLint ignores backend; backend lint has separate runner. | Keep split but document in `lint:all`. |
| Env examples | `.env.example`, `backend/.env.example`, `backend/.env.rag.example`, `backend/ml-services/nlu/.env.example` | duplicate/parallel env surfaces | Root `.env.example` includes both frontend and backend-ish vars; backend has richer backend env; RAG and NLU repeat some vars with divergent names/index defaults. | Create env ownership matrix: frontend VITE vars in root, Nest vars in backend, sidecar vars under sidecar docs. |
| Package scripts | root `package.json`, `backend/package.json`, `mcp/package.json` | split runners | Root scripts orchestrate frontend/backend; `npm` unavailable in current shell, but scripts are present. | Keep root as orchestration entry; backend owns Nest/Jest/TypeORM. |
| Capacitor/Android | `capacitor.config.json`, `android/**` | parallel client/build config | Native routes/API may drift from React/Nest. | Treat Android as separate client with contract validation. |

Duplicate or divergent config concerns:

- Root `.env.example` includes backend-adjacent `DATABASE_*`, `JWT_SECRET`, monitoring stack, OpenAI, and Sentry vars while backend `.env.example` also owns those concepts.
- RAG env naming differs: backend uses `PINECONE_INDEX_NAME=caredroid-medical-knowledge`; `.env.rag.example` uses `caredroid-medical`.
- NLU sidecar has separate confidence threshold and service port; backend also has `NLU_SERVICE_*` and `NLU_CONFIDENCE_THRESHOLD`.
- Frontend has legacy demo auth flags (`VITE_SHOW_DEMO_AUTH`, `VITE_HIDE_DIVISION_MODE`) alongside canonical `VITE_ENABLE_DEV_AUTH_BYPASS`.
- Playwright configs duplicate timeouts/reporters/workers rather than sharing a base.

## 6. Feature Island Findings

| Island | Bypass or drift | Classification | Normalize by |
|---|---|---|---|
| `DiagnosisAssistant.jsx` | Calls `/api/chat/message` directly and sends `tool: 'diagnosis-assistant'`, which is an alias rather than canonical registry ID `diagnosis`. | partially wired | Use `clinicalChatService.sendClinicalChatMessage` and canonical tool ID. |
| `Protocols.jsx` | Uses `fetchProtocols` for catalog, then direct chat call with `tool: 'protocols'`. | partially wired | Use `clinicalChatService`; keep `clinicalContentApi` for protocol catalog. |
| `ProcedureGuide.jsx` | Direct chat call with hardcoded token lookup. | partially wired | Use `clinicalChatService` and canonical API auth handling. |
| `ClinicalToolCatalog.jsx` | Imports `toolRegistry` directly in addition to canonical inventory projections. | duplicate/inventory bypass | Consume `toolInventory` projection for user/audit rows; keep raw registry only for migration tests. |
| `Calculators.jsx` | Uses `toolRegistryById`, `resolveCatalogLaunch`, `getRegistryToolNavigation`, and local switch cases. | canonical but fragile | Keep route/launch helpers; enforce slug-to-switch coverage tests. |
| `ToolPanel.jsx` | Uses `featureInventory`, not unified tool inventory. | legacy/feature island | Replace with canonical inventory projection or retire if old `ChatInterface` is superseded by `Dashboard`. |
| `ChatInterface.jsx` | Separate chat UI component with `ToolPanel`; `Dashboard.jsx` now owns main chat surface. | legacy/partially wired | Either route Dashboard through this component or mark `ChatInterface` as legacy/test-only. |
| `NotificationService.js` and `services/notifications/NotificationService.js` | Two services with overlapping notification concepts and different API roots/fetch styles. | duplicate | Make root `services/NotificationService.js` canonical for REST/push; move cost notification queue under a separate named cost-alert service if needed. |
| `ExportService.js` | Uses direct `fetch` and manual `apiBaseUrl`; capabilities false for backend exports/reports. | partially wired | Use `apiFetch` for backend calls and local export fallback while capabilities are false. |
| `openaiService.ts` | Browser-side OpenAI API key path. | sandbox/prototype/security risk | Remove from production bundle or move to docs/examples; backend owns LLM. |
| `medicalDataService.ts` | Browser-side external medical data APIs. | planned/future | Backend proxy or documented internal utility. |
| `ClinicalAlertsPage.jsx` | Mock local alert data and local acknowledge state. | sandbox/prototype | Integrate backend clinical alerts or label device-local/demo. |
| `fleetTelemetryService.js` | Mock telemetry with local snapshots. | sandbox/prototype | Integrate backend fleet APIs or keep local demo labels. |
| `WorkspaceContext`/workspace filters | Local workspace state only. | partially wired/local-only | Keep as device-local or add backend workspace persistence. |
| Offline sync | `OfflineSupport.jsx` and `syncService.js` call gated `/api/sync`, chat persistence, and result sync paths. | partially wired | Keep capability gates; surface sync status as local-only unless backend sync exists. |
| Android Retrofit services | Stale native routes documented in capability matrix. | parallel client island | Align native API definitions to `backendHttpRouteInventory`. |

## 7. Canonical Architecture Map

| Layer | Canonical owner | Rule |
|---|---|---|
| Route registration | `src/App.jsx` plus route helper modules | Every user-facing route is declared once or generated from canonical inventory. |
| Protected layout | `src/layout/AppShell.jsx` | Every authenticated user-facing page renders inside `AppShellPage`. |
| Public layout | `src/layout/PublicShell.jsx` | Public legal/help/shared routes use public layout intentionally. |
| Auth layout | `src/layout/AuthShell.jsx` | Auth pages and callback use auth layout only. |
| Primary IA | `src/navigation/primaryNavigation.js` | Visible nav labels and active matching live here. |
| Tool identity | `src/data/clinicalToolIdContract.js` | Registry, NLU, slug, executor, and alias maps live here. |
| Tool inventory | `src/data/toolInventory.js` | User-facing, sidebar, catalog, audit, calculator, backend-backed projections come from here. |
| Tool launch | `src/navigation/registryToolLaunch.js` | All launchable tools use `applyRegistryToolLaunch` or its successor. |
| Catalog launch metadata | `src/data/clinicalCatalogWiring.js` | Alias and chat-seed resolution stays centralized. |
| API client | `src/services/apiClient.js` | Internal REST calls use `apiFetch`/`apiFetchJson`; direct fetch only for true external/public APIs or web platform APIs. |
| Backend route contract | `src/data/backendHttpRouteInventory.js` and `src/data/frontendApiCallsInventory.js` | Every frontend call maps to a backend route or disabled capability. |
| Backend capability gates | `src/config/backendApiCapabilities.js` | No unsupported backend path should be called without a false-capability guard. |
| Backend executors | `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` and service registration | Only registered executors are POST-executable. |
| Tests | Route, launch, contract, exposure, responsive, and smoke tests | Drift prevention lives in focused tests, not manual audit docs. |

## 8. Recommended Route Normalization

Canonical route decisions:

| Current concept | Canonical route | Legacy aliases to retain temporarily |
|---|---|---|
| Landing | `/` | none |
| Auth | `/auth` | `/login`, `/signin`, `/sign-in`, `/signup`, `/register`, account variants |
| OAuth callback | `/auth-callback` | `/auth/callback` |
| Home/Pulse | `/home` | `/dashboard` |
| Assistant | `/assistant` | `/chat` |
| Tools browser | `/tools` | none |
| Developer catalog/audit | `/tools/catalog` or `/tools/developer-audit` | whichever is not chosen |
| Calculator hub | `/tools/calculators` | none |
| Calculator form | `/tools/calculators/:slug` | `/tools/calculator/:slug`, `?calc=` |
| Patient workflows | `/patients` plus either existing `/tools/*` or future `/patients/ai/*` | current `/tools/patient-summary-ai` etc. if moved |
| Operations | `/operations` | none |
| Fleet command | `/fleet/command` | `/fleet` redirect |
| Settings | `/settings` | future `/settings/profile`, `/settings/notifications` optional |

Implementation constraints:

- Do not delete legacy routes first. Add redirects and update first-party navigation before removal.
- Keep `ToolsAreaFallback` as the canonical not-found/redirect boundary for `/tools/*` and `/fleet/*`.
- Keep public `SharedToolSession` out of `AppShell` by design, but add explicit shared/local status if backend sharing remains disabled.
- Route aliases must be tested as redirects, not as second pages.

## 9. Recommended Config Normalization

Canonical config ownership:

| Config type | Canonical file | Policy |
|---|---|---|
| Frontend build/dev proxy | `vite.config.js` | Owns Vite port, proxy, chunks, and frontend build output. |
| Frontend unit tests | `vitest.config.js` | Owns JS/JSX test environment and frontend excludes. |
| Responsive E2E | `playwright.config.mjs` | Owns responsive suite only; share base defaults later. |
| Android E2E | `playwright.android.config.mjs` | Keep as device suite, share common config values. |
| Production smoke | `playwright.production.config.mjs` | Keep separate because it requires `QA_BASE_URL`. |
| Frontend env | `.env.example` | VITE-only plus orchestration notes. Remove backend-only secrets from root example over time. |
| Backend env | `backend/.env.example` | Nest, DB, auth, OpenAI, RAG, monitoring, Firebase, Redis. |
| RAG sidecar/docs | `backend/.env.rag.example` or backend docs | Align index names and embedding var names with backend config. |
| NLU sidecar | `backend/ml-services/nlu/.env.example` | Own NLU service runtime/training vars. Backend only points to service URL and threshold. |
| Frontend TS check | `tsconfig.frontend.json` | Either broaden to JS checking intentionally or rename expectations to TS-only. |
| Backend TS/Jest | `backend/tsconfig.json`, backend `package.json` Jest config | Keep backend-owned. |
| Lint | root `eslint.config.js` plus backend lint runner | Keep split but make `npm run lint:all` authoritative. |

Recommended config cleanup:

1. Create a short env ownership doc or table in `.env.example` and `backend/.env.example`.
2. Remove duplicate backend-only examples from root `.env.example` after backend `.env.example` is complete.
3. Extract a Playwright base config module for shared timeout/reporter/retry values.
4. Make `backendApiCapabilities.js` the only source for disabled frontend API features.
5. Add a config consistency test for env names that must match across frontend/backend sidecars.

## 10. Recommended Sandbox Policy

Use these statuses in code comments, catalog rows, and tests:

| Status | Definition | Allowed in production UI? | Required treatment |
|---|---|---|---|
| canonical | Fully routed, app-shell integrated, contract-backed or explicitly local by design. | Yes | Normal route tests and contract tests. |
| duplicate | Same product concept has multiple routes/configs/services. | Temporarily | Pick canonical owner and redirect/project old path. |
| legacy | Old route/name kept for compatibility. | Temporarily | Redirect and test deprecation. |
| sandbox/prototype | Demo/sample/local/mock implementation. | Only if clearly labeled | Unsupported/local-only banner and no production claims. |
| orphaned | Not imported, routed, tested, or documented. | No | Integrate, move to docs/examples, or delete later. |
| partially wired | UI exists but backend or canonical inventory integration is incomplete. | Yes with guard | Capability gate, no silent network calls. |
| intentionally internal | Helper, implementation detail, or generated projection. | No direct route | Keep internal and test through parent surface. |
| planned/future | Placeholder route/API/component. | Prefer hidden | Mark unavailable and keep out of primary workflows. |

Policy for sandbox/prototype files:

- Integrate if there is a real user workflow and backend/client contract exists.
- Convert into a real feature if product wants it and acceptance criteria can be met.
- Move under `docs/examples` if it is sample/demo code with no production owner.
- Delete later if no tests, no imports, no docs, and no roadmap owner.
- Mark experimental only if it remains routeable and has explicit UI copy, capabilities, and tests.

## 11. Exact Files To Inspect/Modify

Routing and layout:

- `src/App.jsx`
- `src/routing/authPathAliases.js`
- `src/routes/clinicalToolRoutes.js`
- `src/navigation/primaryNavigation.js`
- `src/navigation/registryToolLaunch.js`
- `src/layout/AppShell.jsx`
- `src/layout/AuthShell.jsx`
- `src/layout/PublicShell.jsx`
- `src/components/Sidebar.jsx`

User-facing pages:

- `src/pages/Auth.jsx`
- `src/pages/AuthCallback.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Patients.jsx`
- `src/pages/Operations.jsx`
- `src/pages/ClinicalAlertsPage.jsx`
- `src/pages/Profile.jsx`
- `src/pages/ProfileSettings.jsx`
- `src/pages/Settings.jsx`
- `src/pages/NotificationPreferences.jsx`
- `src/pages/AuditLogs.jsx`
- `src/pages/AnalyticsDashboard.jsx`
- `src/pages/CostAnalyticsDashboard.jsx`
- `src/pages/team/TeamManagement.jsx`
- `src/pages/fleet/FleetDashboard.jsx`
- `src/pages/fleet/RouteOptimizer.jsx`
- `src/pages/fleet/PredictiveMaintenance.jsx`
- `src/pages/tools/*.jsx`
- `src/pages/legal/*.jsx`

Feature islands and shared components:

- `src/components/ChatInterface.jsx`
- `src/components/ToolPanel.jsx`
- `src/data/featureInventory.js`
- `src/components/NotificationPreferences.jsx`
- `src/services/NotificationService.js`
- `src/services/notifications/NotificationService.js`
- `src/components/offline/OfflineSupport.jsx`
- `src/contexts/OfflineProvider.jsx`
- `src/components/tools/ToolResultShare.jsx`
- `src/components/LiveCostDashboard.jsx`
- `src/utils/clinicalAlertNotifications.js`

Canonical tool/inventory/data:

- `src/data/toolInventory.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/calculatorHubManifest.js`
- `src/data/medicalToolsCatalogIndex.js`
- `src/data/sourceCodeToolDiscovery.js`
- `src/data/frontendApiCallsInventory.js`
- `src/data/backendHttpRouteInventory.js`
- `src/config/backendApiCapabilities.js`

API clients:

- `src/services/apiClient.js`
- `src/services/clinicalChatService.js`
- `src/services/clinicalIntelligenceApi.js`
- `src/services/clinicalOrchestratorApi.js`
- `src/services/clinicalContentApi.js`
- `src/services/complianceApi.js`
- `src/services/subscriptionApi.js`
- `src/services/profileApi.js`
- `src/services/auditApi.js`
- `src/services/export/ExportService.js`
- `src/services/openaiService.ts`
- `src/services/medicalDataService.ts`
- `src/services/fleetTelemetryService.js`
- `src/services/syncService.js`

Backend:

- `backend/src/app.module.ts`
- `backend/src/app.controller.ts`
- `backend/src/modules/auth/**`
- `backend/src/modules/chat/**`
- `backend/src/modules/clinical-intelligence/**`
- `backend/src/modules/medical-control-plane/**`
- `backend/src/modules/clinical/**`
- `backend/src/modules/notifications/**`
- `backend/src/modules/audit/**`
- `backend/src/modules/compliance/**`
- `backend/src/modules/analytics/**`
- `backend/src/modules/subscriptions/**`
- `backend/src/modules/rag/**`
- `backend/src/modules/encryption/**`
- `backend/ml-services/**`

Config and runners:

- `package.json`
- `backend/package.json`
- `vite.config.js`
- `vitest.config.js`
- `playwright.config.mjs`
- `playwright.android.config.mjs`
- `playwright.production.config.mjs`
- `eslint.config.js`
- `tsconfig.frontend.json`
- `backend/tsconfig.json`
- `backend/tsconfig.eslint.json`
- `.env.example`
- `backend/.env.example`
- `backend/.env.rag.example`
- `backend/ml-services/nlu/.env.example`
- `capacitor.config.json`
- `android/**`

## 12. Migration Plan

Phase 0: Freeze behavior with tests.

- Add route inventory tests for canonical routes and legacy aliases.
- Add launch-plan snapshots for every registry ID.
- Add feature-island tests that assert false-capability pages show unsupported/local-only UI and do not call disabled endpoints.
- Add config consistency tests for env examples and Playwright shared settings.

Phase 1: Normalize first-party navigation only.

- Update first-party code to navigate to `/home`, `/assistant`, `/tools`, `/tools/calculators/:slug`, `/operations`, and selected fleet routes.
- Leave old routes in place as redirects or aliases.
- Keep all existing tests passing by updating expected canonical paths and adding explicit legacy tests.

Phase 2: Contain local-only/prototype surfaces.

- Add or standardize unsupported/local-only banners for clinical alerts, fleet, team management, shared tool persistence, exports/reports, and offline sync.
- Ensure false capabilities never perform network calls.
- Move sample/mock data to named fixtures or services with "local/demo" labels.

Phase 3: Collapse duplicate services.

- Make `services/NotificationService.js` the canonical notification REST/push client.
- Rename or isolate `services/notifications/NotificationService.js` as `CostNotificationQueue` if still needed.
- Convert direct internal REST calls in tool pages to `clinicalChatService`, `clinicalOrchestratorApi`, or feature-specific canonical clients.
- Remove browser-side OpenAI and external medical data services from production imports unless product explicitly keeps them behind backend proxies.

Phase 4: Promote inventory ownership.

- Treat `toolInventory.js` as the authoring source for launchable tools.
- Keep `toolRegistry.js`, catalog rows, calculator hub records, and source audit as projections or migration compatibility files.
- Enforce one route, one launch mode, and one backend support status per inventory record.

Phase 5: Config cleanup.

- Split root and backend env example ownership.
- Extract shared Playwright config.
- Add sidecar docs for NLU/anomaly detection and align backend env names with sidecar env names.
- Decide whether Android native code is a production client, a parallel prototype, or a Capacitor artifact; then align API routes accordingly.

Phase 6: Remove or demote legacy.

- After redirects and analytics confirm safe migration, remove direct first-party references to `/dashboard`, `/chat`, and singular calculator routes.
- Hide or move developer/audit-only pages if they should not be clinician-facing.
- Delete or move orphaned prototype utilities after tests prove no imports.

## 13. Test Plan

Route tests:

- Every route in `App.jsx` renders non-blank UI or redirects.
- Every auth alias redirects to `/auth` with intended mode.
- `/dashboard` redirects to `/home`.
- `/chat` redirects to `/assistant` or remains documented alias.
- `/tools/calculator/:slug` redirects to `/tools/calculators/:slug`.
- `/fleet` redirects to `/fleet/command` or `/operations`.
- Unknown `/tools/*` and `/fleet/*` show `ToolNotFound` or canonical fallback, never blank UI.

Inventory and launch tests:

- Every `toolInventory` user-facing record has exactly one canonical route, navigation path, or chat-assisted launch.
- Every launchable tool calls `applyRegistryToolLaunch` or a single successor helper.
- Every calculator slug in `builtinUiCalculators` has a switch case, route def, hub card, and smoke test.
- Every chat-assisted calculator is explicitly `hasDedicatedForm: false`.
- No production page imports raw `toolRegistry` unless listed as an audit/projection exception.

API contract tests:

- Every `FRONTEND_API_CALLS` row maps to `BACKEND_HTTP_ROUTES` or a false capability.
- Every false capability path is guarded before network calls.
- No internal API call uses raw `fetch` when `apiFetch` is appropriate.
- Registered backend executors match frontend `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`.
- Unsupported NLU tools return structured unsupported metadata, not hidden fallback behavior.

Config tests:

- Env examples contain only variables owned by that layer or documented as orchestration variables.
- RAG/sidecar env names align with backend config names or are documented as sidecar-only.
- Playwright configs share base values for retries/reporters/timeouts unless intentionally overridden.
- `package.json` scripts point to existing files and config names.

UX/layout tests:

- Every protected page route renders inside `AppShell`.
- Public shared/legal routes render outside `AppShell` intentionally.
- Mobile bottom nav and sidebar routes use canonical paths.
- Local-only/prototype pages display unsupported/local-only copy.
- No page with false capability returns null, blank UI, or silently disconnected state.

## 14. Risk Assessment

| Severity | Finding | Risk | Mitigation |
|---|---|---|---|
| Critical | None confirmed in static inspection. | No verified app-wide blank route or auth bypass. | Maintain smoke tests during migration. |
| High | Duplicate canonical route concepts (`/home`/`/dashboard`, `/assistant`/`/chat`, singular/plural calculators). | Deep-link, test, analytics, and launch drift. | Redirect legacy paths and update first-party navigation first. |
| High | Visible local/mock feature islands (`ClinicalAlertsPage`, fleet pages, team management). | Users can mistake local-only or unsupported UI for production backend workflows. | Capability gates, banners, and product labels. |
| High | Duplicate notification services. | Divergent notification behavior, API roots, and state models. | Consolidate into canonical REST/push client and separate cost queue. |
| High | Browser-side OpenAI and external medical API services. | Security and contract bypass if imported into production flows. | Move behind backend proxy or docs/examples. |
| High | Frontend API calls to disabled/missing routes. | Silent runtime failures if gates are bypassed. | Contract tests and false-capability no-network tests. |
| Medium | Patient AI routes live under `/tools` while nav groups them under Patients. | User mental-model and active-nav mismatch. | Pick route hierarchy or document intentional grouping. |
| Medium | Root/backend/sidecar env examples overlap. | Wrong env vars in wrong process, inconsistent local setup. | Env ownership matrix and consistency tests. |
| Medium | Playwright config variants duplicate settings. | QA behavior drifts by suite. | Shared base config with explicit overrides. |
| Medium | `ToolPanel`/`ChatInterface` use legacy `featureInventory` path. | Old chat/tool model may survive as hidden behavior. | Retire or connect to canonical inventory. |
| Low | Page wrapper/component duplicate for notification preferences. | Minimal if wrapper stays route adapter. | Keep page thin and component canonical. |
| Low | Internal calculator component batches are not directly routed. | Acceptable internal nesting. | Keep parent smoke coverage. |

## 15. Acceptance Criteria

- Every user-facing page has one canonical route and any legacy route redirects or is explicitly documented.
- Every protected user-facing page renders through `AppShell`.
- Every public page outside `AppShell` is intentionally public and tested.
- Every tool uses `toolInventory.js`/`clinicalToolIdContract.js` or is explicitly audit/internal-only.
- Every launchable tool uses `applyRegistryToolLaunch` or the canonical successor launch helper.
- Every calculator has exactly one canonical form route or an explicit chat-assisted/no-form status.
- No sandbox/prototype/mock page is presented as production-backed UI without local-only or unsupported labeling.
- No duplicate config silently changes behavior across Vite, Vitest, Playwright, backend Jest, env examples, or sidecar services.
- No feature island bypasses backend/frontend route contracts or canonical API clients unless it is an external public API utility marked as internal/future.
- Every disabled backend capability is tested to avoid network calls.
- Every user-facing path returns a route, redirect, not-found state, or unsupported state. No path returns null, blank UI, or disconnected state.
- Each migration phase can land independently while tests and builds remain green.

