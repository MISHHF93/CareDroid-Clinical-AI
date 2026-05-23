# Unwired Code Discovery Audit

Generated: 2026-05-22

This audit was originally documentation-only. A follow-up under-skin wiring repair pass has since implemented the highest-priority runtime, contract, backend, and config fixes called out below.

## Executive Summary

CareDroid has a strong internal contract layer for tool IDs, routes, catalogs, and backend executor mappings. The core clinical tool surface is mostly wired: 69 user-facing registry/tool IDs, 59 NLU profiles, 31 built-in calculator form slugs, 15 chat-assisted calculator-hub rows, 101 backend HTTP routes in the canonical inventory, 82 frontend API call inventory rows, and 3 real tool-orchestrator POST executors.

The main defects are not missing forms for the core calculators. They are edge and trust-boundary mismatches:

- Share-result links generate an unrouted `/shared-result/:encoded` URL while the app only mounts `/shared/tools/:shareId`.
- Shared sessions are copied as public-looking URLs but are backed only by same-browser `localStorage`.
- Clinical-intelligence tool routes are visible to any authenticated user, while several backend endpoints require `READ_PHI`, `USE_AI_CHAT`, or `VIEW_AUDIT_LOGS`.
- `/api/users/profile` is required by the frontend auth bootstrap but the backend protects it with `READ_PHI`, excluding the frontend `student` role.
- Team management is route-permission-gated and initial-load capability-gated, but invite/edit/delete actions can still call disabled/missing team endpoints if the UI is opened.
- `dispatch-ai` is intentionally NLU/chat-backed but is flagged `backendExecutable: true`, which is easy to confuse with POST `/api/tools/:id/execute`.
- Source-scan metadata in `sourceCodeToolDiscovery.js` is stale: it documents 24 NLU patterns and 8 calculator UI slugs, while the current contracts contain 59 NLU profiles and 31 built-in calculator forms.
- Generated contract docs are referenced by package scripts and source comments, but no `docs/*.md` artifacts existed before this audit.

## Repair Implementation Status

Repair pass completed on 2026-05-22:

- Fixed local share links to use the mounted `/shared/tools/:shareId` route, clarified same-browser/local semantics, and added result rendering for local shared sessions.
- Added frontend permission gates for clinical-intelligence routes, relaxed self-profile hydration by removing the PHI requirement from `GET /api/users/profile`, and hardened team-management action gates when `teamManagement=false`.
- Split backend-routed NLU/chat semantics from POST-executable semantics with `backendRouted` and `postExecutable`, refreshed source-scan counts from current contracts, and normalized chat-assisted launches to `/chat` without duplicate chat seeds.
- Hardened backend executor contracts with SOFA snake_case/camelCase parameter aliases, `sofa-score` executor mapping, Stripe raw-body support, DTO validation for chat/tool/subscription request bodies, and clinical content write permissions.
- Aligned Docker/config defaults: backend on `3000`, Vite on `8000`, NLU on `8001`, backend Docker `start:prod` entrypoint, and a root frontend `Dockerfile`.
- Restored the referenced generated-doc paths as generation-pending artifacts because `npm` is not available on PATH in this shell.

## Evidence Sources

Primary frontend evidence:

- `src/App.jsx`
- `src/routes/clinicalToolRoutes.js`
- `src/navigation/registryToolLaunch.js`
- `src/data/toolInventory.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/calculatorHubManifest.js`
- `src/data/medicalToolsCatalogIndex.js`
- `src/data/sourceCodeToolDiscovery.js`
- `src/pages/tools/Calculators.jsx`
- `src/pages/tools/ClinicalToolCatalog.jsx`
- `src/pages/tools/ToolsOverview.jsx`
- `src/components/Sidebar.jsx`
- `src/components/tools/ToolResultShare.jsx`
- `src/pages/tools/SharedToolSession.jsx`

Primary backend evidence:

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`
- `backend/src/modules/users/users.controller.ts`

API and test/config evidence:

- `src/data/backendHttpRouteInventory.js`
- `src/data/frontendApiCallsInventory.js`
- `src/data/backendRouteExposurePolicy.js`
- `src/config/backendApiCapabilities.js`
- `src/services/apiClient.js`
- `src/services/clinicalOrchestratorApi.js`
- `src/services/clinicalToolsApi.js`
- `src/services/clinicalIntelligenceApi.js`
- `package.json`
- `backend/package.json`
- `vite.config.js`
- `vitest.config.js`
- `backend/test/jest-e2e.json`

## Inventory Snapshot

| Inventory | Count | Source |
|---|---:|---|
| Frontend registry/tool IDs | 69 | `clinicalToolIdContract.js` `ALL_REGISTRY_TOOL_IDS` groups |
| NLU profiles | 59 | `clinicalToolIdContract.js` `NLU_PROFILE_TOOL_IDS` |
| Built-in calculator forms | 31 | `clinicalIntentToolCatalog.js` `builtinUiCalculators`; `Calculators.jsx` switch cases |
| Chat-assisted calculator hub rows | 15 | `clinicalIntentToolCatalog.js` `nluCalculatorHubOnly` |
| Registered POST executors | 3 | backend `REGISTERED_EXECUTOR_TOOL_IDS` |
| Unsupported NLU profiles without POST executor | 56 | backend `NLU_TOOL_IDS_WITHOUT_EXECUTOR` |
| Backend HTTP route inventory | 101 | `backendHttpRouteInventory.js` |
| Frontend API call inventory | 82 | `frontendApiCallsInventory.js` |
| Capability-gated frontend API calls | 51 | `frontendApiCallsInventory.js` |
| Backend route exposure policies | 49 | `backendRouteExposurePolicy.js` |

### Frontend Routes

`src/App.jsx` mounts the core tool surfaces:

- `/tools`, `/tools/catalog`, `/tools/calculators`, `/tools/drug-checker`, `/tools/lab-interpreter`, `/tools/protocols`, `/tools/diagnosis`, `/tools/procedures`
- Clinical intelligence routes: `/tools/ambient-scribe`, `/tools/guideline-rag`, `/tools/differential-ai`, `/tools/timeline-ai`, `/tools/patient-summary-ai`, `/tools/order-set-ai`, `/tools/ai-explainability`, `/tools/clinical-audit`
- Fleet routes: `/fleet/command`, `/fleet/maintenance`, `/fleet/routes`
- Calculator routes from `CALCULATOR_ROUTE_DEFS`
- Fallbacks: `/tools/*` and `/fleet/*`
- Public shared route: `/shared/tools/:shareId`

No top-level tool page in the requested scope was found to be completely route-unreachable. The broken launch findings are specific path-generation and permission/capability mismatches, not absent React routes.

### Backend Routes And Executors

The tool-orchestrator backend has exactly three registered POST executors:

| Executor ID | Registry ID | Endpoint | Request contract |
|---|---|---|---|
| `sofa-calculator` | `sofa-score` | `POST /api/tools/sofa-calculator/execute` | Optional SOFA organ-system parameters |
| `drug-interactions` | `drug-check` | `POST /api/tools/drug-interactions/execute` | Required `medications`; optional `severityFilter` |
| `lab-interpreter` | `lab-interp` | `POST /api/tools/lab-interpreter/execute` | Required `labValues`; optional patient context |

The backend also exposes tool metadata, validation, executor catalog, statistics, result sync, and batch execute routes under `/api/tools`. Most NLU profiles are deliberately classified as unsupported for POST execution and should remain frontend-only, chat-assisted, or clinical-page workflows until a real executor exists.

## Complete Mismatch Table

| ID | Severity | Classification | Evidence | Impact | Proposed fix | Proof test |
|---|---|---|---|---|---|---|
| `share-result-route` | high | broken launch path | `ToolResultShare.jsx` generates `/shared-result/${encoded}`; `App.jsx` only mounts `/shared/tools/:shareId` | Copied result links route to the app fallback instead of the shared-session page | Generate links through `createSharedSession()` and `/shared/tools/:shareId`, or add a real `/shared-result/:encoded` route | Add `ToolResultShare` test asserting generated URL matches a mounted route |
| `shared-session-storage` | high | misleading public share | `ToolPageLayout.jsx` creates `/shared/tools/:shareId`; `sharedSessions.js` stores data in `localStorage` only | Links look public/shareable but only work in the same browser profile that created them | Label as local same-device share, or implement backend-backed shared-session storage with expiry | Browser test: create session, open link in fresh storage context, assert expected public/local behavior |
| `clinical-intelligence-route-permissions` | high | frontend/backend permission mismatch | `App.jsx` only requires auth for clinical intelligence tool routes; `clinical-intelligence.controller.ts` requires `READ_PHI`, `USE_AI_CHAT`, or `VIEW_AUDIT_LOGS` | Users can navigate to tools they cannot execute, then hit backend 403 errors | Add route-level permission metadata or visible preflight disabled states for each clinical-intelligence route | Route smoke with student/nurse/physician/admin role fixtures |
| `profile-bootstrap-permission` | high | auth/profile contract mismatch | `UserContext.jsx` fetches `/api/users/profile`; `UsersController.getProfile` requires `READ_PHI`; frontend `student` role lacks `READ_PHI` | A valid non-PHI student user can be unable to hydrate profile after reload/token restore | Relax backend self-profile permission or add a non-PHI `/api/auth/me`/profile endpoint used by the SPA | Auth bootstrap test for `student` token without `READ_PHI` |
| `team-management-action-gates` | high | frontend-visible unsupported feature | `backendApiCapabilities.teamManagement` is `false`; `TeamManagement.jsx` gates fetch but invite/edit/delete handlers still call `/api/team/*` | Disabled backend feature still has action paths that can call missing routes | Disable invite/edit/delete UI and add early capability checks in every handler | Component test with `teamManagement=false` asserting no team network calls |
| `dispatch-ai-backendExecutable` | medium | confusing executor flag | `clinicalIntentToolCatalog.js` marks `dispatch-ai` `backendExecutable: true`; contracts and backend registry exclude it from POST executors | Catalog/status labels can imply POST executor support when dispatch is chat/NLU only | Split `backendExecutable` into `nluBackendRouted` and `postExecutable`, or relabel UI badge | Existing `orchestratorMappingHardening.test.js` plus a catalog badge assertion |
| `source-scan-counts` | medium | stale audit inventory | `SOURCE_SCAN_LOCATIONS` says 24 NLU patterns and 8 calculator UI slugs; contracts now show 59 NLU profiles and 31 calculator forms | Developer Catalog / Source Audit underreports shipped surface area | Derive counts from contracts instead of hard-coded literals | `sourceCodeToolDiscovery.test.js` should compare source-scan counts to current constants |
| `generated-docs-absent` | medium | missing generated docs | `package.json` and source comments reference `docs/tool-contract-matrix.md`, `backend-frontend-tool-contract.md`, `backend-exposure-report.md`, etc.; no `docs/*.md` existed before this audit | Audit links and regeneration instructions point to absent artifacts | Run/write generated docs after dependencies are available, or remove stale references | `npm run contract:write-docs`, `npm run exposure:write-docs`, `npm run tool-matrix:write-docs` |
| `notification-service-duplicates` | medium | duplicated API client/service | `src/services/NotificationService.js` and `src/services/notifications/NotificationService.js` both implement notification behavior | Inconsistent error handling, fetch helpers, capability gates, and tests | Consolidate to one service; keep one compatibility export if needed | Import graph test proving only one implementation is used |
| `phantom-catalog-visibility` | low | intentional but risky audit surface | `/tools/catalog` renders "Developer Catalog / Source Audit" and lists phantom/roadmap IDs | Internal/planned IDs are visible behind a normal `/tools/catalog` route | Keep the explicit notice, or move source audit to admin/dev route | Catalog test asserting phantom rows are hidden unless developer mode is active |
| `custom-workspace-hidden-tools` | low | hidden feature risk | `WorkspaceContext` merges new tools into `all` and defaults, but leaves custom workspaces as stored | Users with old custom workspaces may not discover newly added tools | Show "N tools hidden by workspace" and a reset/add-new-tools affordance | Workspace test with stale custom workspace and new registry IDs |
| `silent-fire-and-forget-catches` | low | silent non-critical failure | `ErrorBoundary.jsx`, `deferStartup.js`, `deferStartupTasks.js`, and `DrugChecker.jsx` contain empty `.catch(() => {})` patterns | Telemetry/startup failures are intentionally non-blocking but are invisible during QA | Keep for telemetry only, but use `logger.debug/warn` in development | Lint/custom test allowing only documented fire-and-forget catches |

## Frontend Tool Classification Matrix

| Classification | Tool IDs | Evidence | Notes |
|---|---|---|---|
| Backend-backed POST executor | `sofa-score`, `drug-check`, `lab-interp` | `REGISTRY_ID_TO_ORCHESTRATOR_TOOL`, backend `REGISTERED_EXECUTOR_TOOL_IDS` | Fully wired through dedicated UI and `/api/tools/:id/execute` |
| Backend-backed clinical intelligence | `ambient-scribe`, `guideline-rag`, `differential-ai`, `timeline-ai`, `patient-summary-ai`, `order-set-ai`, `ai-explainability`, `clinical-audit` | `CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS`, `clinicalIntelligenceApi.js`, backend controller | Routes and clients exist; permission UX is the mismatch |
| Fully wired local calculator forms | `qsofa`, `news2`, `child-pugh`, `has-bled`, `meld`, `meld-na`, `timi-ua-nstemi`, `ascvd-risk`, `ckd-staging`, `stop-bang`, `audit-c`, `phq9`, `gad7`, `heart-score`, `centor-mcisaac`, `bishop-score`, `apgar-score`, `braden-scale`, `morse-fall-scale`, `ranson-criteria`, `bisap-score`, `fib4`, `framingham-risk`, `abcd2`, `shock-index`, `anion-gap`, `rass`, `gfr`, `bmi`, `chads2vasc` | `builtinUiCalculators`, `CALCULATOR_ROUTE_DEFS`, `Calculators.jsx` switch cases | Local deterministic calculators; no POST executor expected |
| Chat-assisted / frontend-only | `wells-pe`, `perc`, `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`, `pecarn-head`, `nexus-cspine`, `copd-gold`, `rome-iv-ibs`, `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator`, `dispatch-ai` | `nluCalculatorHubOnly`, `CHAT_ASSISTED_HUB_GROUPS`, `UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS` | No POST executor expected; `dispatch-ai` flag naming should be clarified |
| Clinical page / chat API | `protocols`, `acls-protocol`, `atls-protocol`, `diagnosis`, `antibiotic-guide`, `procedures`, `dose-calculator`, `abg-interpreter`, `calculator-recommender-ai` | `CLINICAL_AI_PAGE_REGISTRY_IDS`, `clinicalIntentTools`, `clinicalCatalogWiring.js` | User-facing; uses chat/API-assisted flows, not tool-orchestrator executors |
| Fleet local pages | `fleet-command`, `predictive-maintenance`, `route-optimizer` | `FLEET_TIER_A_REGISTRY_IDS`, `App.jsx` fleet routes | Frontend/fleet-service backed, not clinical tool-orchestrator executors |
| Hub | `calculators` | `REGISTRY.calculatorsHub`, `/tools/calculators` | Container for local and chat-assisted calculator workflows |
| Hidden or broken | None as a canonical registry tool | Route and registry inspection | Broken findings are launch/capability/permission edges, not absent tool pages |

## Backend Capability Classification Matrix

| Classification | Capabilities | Evidence | Notes |
|---|---|---|---|
| User-facing and wired | Auth login/register/dev-session/magic-link/2FA, profile read/update, subscriptions plans/current/checkout/portal, chat message/intent classify, protocols list/categories, drugs list, tools list/available/execute/results, notifications REST, audit logs/statistics/integrity, clinical intelligence endpoints, config/system, analytics events/metrics, crashes | `frontendApiCallsInventory.js`, `backendHttpRouteInventory.js` | Some wired endpoints still have permission or UX issues noted above |
| User-facing but missing/partial frontend | Biometric available/disable/delete, chat suggest-action/analyze-vitals, tool metadata/validate/catalog/statistics, drug categories/detail, protocol detail, audit my-logs/PHI access, compliance export/delete, notification unread/read-all/toggle-all | `backendRouteExposurePolicy.js` `expose-recommended` entries | Backend exists; frontend clients or pages are partial, hidden, or not surfaced |
| Internal-only | `/health`, OAuth/SAML/OIDC callbacks, Stripe webhook, `/api/health`, `/api/ai/query`, `/api/ai/structured`, `/api/metrics`, RAG, encryption, cache, email, emergency escalation, intent classifier internals | `backendRouteExposurePolicy.js`, `backendOrphanAudit.js` | Correctly backend-only unless product scope changes |
| Planned/deferred | OIDC/SAML, `/api/auth/me`, subscriptions config, chat 3D, batch tool execute, drug/protocol admin CRUD, PHI access compliance view, notification devices/admin deletion, AI usage meter | `backendRouteExposurePolicy.js` `deferred` entries | Not defects if kept out of user flows |
| Frontend-only unsupported / gated | Tool result email share, team management, bulk sync, chat persistence, notification stream/send-channel, clinical alert ack/dismiss/stream, PDF/Excel exports, report generate/schedule | `backendApiCapabilities.js` false keys and `frontendApiCallsInventory.js` | Most are guarded; team actions and share-route copy need stronger UX guards |
| Orphaned | None conclusively found in the canonical route inventory | `backendControllerRouteScan.js`, route inventory policy files | Controller/inventory comparison could not be executed in this environment |

## Hidden Calculator / Tool List

These are not broken, but they can be mistaken for missing forms because they are chat-assisted hub cards rather than dedicated calculator switch cases:

| Tool IDs | Classification | User-visible surface | Recommended label |
|---|---|---|---|
| `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator` | chat-assisted / no dedicated form | `/tools/calculators` chat-assisted hub and catalog | "Guided chat, no calculator form yet" |
| `wells-pe`, `perc`, `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`, `pecarn-head`, `nexus-cspine`, `copd-gold`, `rome-iv-ibs` | chat-assisted / no POST executor | Calculator hub cards and dashboard chat seed | "Chat-assisted, no POST executor" |
| `dispatch-ai` | fleet chat-assisted | Calculator hub/fleet dispatch group and dashboard chat seed | "Fleet chat assistant, not POST executable" |

Mobile/layout and workspace visibility risks:

- The responsive sidebar and app shell have explicit mobile coverage, drawer z-indexes, and 44px target rules, so there is no obvious mobile-only hidden route.
- Persisted custom workspaces can still hide newly added tools because only `all` and default category workspaces are automatically merged with new registry IDs.
- `/tools/catalog` intentionally exposes internal source-audit and phantom records. The page notice is clear, but the route lives under `/tools`, so product users can still reach audit-only records if linked.

## Broken Launch Paths

| Path or launch | Severity | Evidence | Fix |
|---|---|---|---|
| `/shared-result/:encoded` | high | Generated in `ToolResultShare.jsx`; no `App.jsx` route | Align to `/shared/tools/:shareId` or add route |
| `/shared/tools/:shareId` cross-device usage | high | `sharedSessions.js` reads local `localStorage` only | Backend storage or same-device copy |
| Clinical intelligence routes for unauthorized roles | high | Routes require auth only; backend requires permissions | Add route permission metadata or preflight disable |
| `/api/team/*` actions from team modal | high | `teamManagement=false`; handlers call endpoints after UI actions | Hide/disable actions and add early guards |

## Null, Undefined, And Silent Failure Risks

| Area | Severity | Evidence | Risk | Proposed fix |
|---|---|---|---|---|
| `sharedSessions.js` JSON parse | medium | `loadSessions()` catches and returns `{}` | Corrupt storage silently invalidates all share links | Log warning and show "share store corrupted" in development |
| Fire-and-forget telemetry/startup catches | low | Empty `.catch(() => {})` in `ErrorBoundary.jsx`, `deferStartup.js`, `deferStartupTasks.js`, `DrugChecker.jsx` | QA misses failed telemetry or deferred startup work | Log in development; keep production non-blocking |
| `syncService.js` per-item sync catches | low | Sync errors are logged but not surfaced to user | Offline data may remain unsynced without visible status | Add sync-status toast or badge when repeated failures occur |
| `ExportService.convertToCSV([])` | low | Empty data returns empty string | Blank file can be downloaded without warning | Show "No rows to export" before download |

## Duplicate ID / Alias List

No duplicate canonical registry IDs or route collisions were found in the inspected contract groups. Intentional aliases are extensive and mostly healthy. The alias set is centralized in `sourceCodeToolDiscovery.js` and `clinicalToolIdContract.js`.

High-risk aliases or duplicate surfaces:

| Alias or duplicate | Severity | Maps to | Evidence | Recommendation |
|---|---|---|---|---|
| `drug-checker`, `drug-interaction-checker`, `drug-interactions` | low | `drug-check` | Alias map and executor alias | Keep documented; ensure user-facing labels prefer `drug-check` or product name |
| `lab-interpreter` | low | `lab-interp` | Alias map and executor registry | Keep documented; avoid new `lab-interpreter` registry IDs |
| `sofa-calculator`, `sofa_calculator` | low | `sofa-score` / executor `sofa-calculator` | Alias map and backend executor | Keep the executor/registry distinction explicit |
| `calculator` | low | `calculators` | Advanced recommendation alias | Avoid using generic `calculator` as a canonical ID |
| `dispatch`, `dispatch-assistant`, `vehicle-dispatch`, `fleet-dispatch`, `dispatch-intelligence` | medium | `dispatch-ai` | Alias map and fleet tests | Keep chat-only label explicit; do not add POST executor mapping accidentally |
| `src/services/NotificationService.js` and `src/services/notifications/NotificationService.js` | medium | duplicate service implementations | Import graph shows both are used | Consolidate to one service |

## Prioritized Fix Plan

1. Fix share-route correctness in `src/components/tools/ToolResultShare.jsx`, `src/pages/tools/ToolPageLayout.jsx`, and `src/utils/sharedSessions.js`.
2. Align frontend route permissions with backend permissions in `src/App.jsx` for clinical-intelligence routes, and add role-aware tests.
3. Fix `/api/users/profile` authorization mismatch between `src/contexts/UserContext.jsx` and `backend/src/modules/users/users.controller.ts`.
4. Strengthen team capability gates in `src/pages/team/TeamManagement.jsx`.
5. Rename or split `backendExecutable` semantics for `dispatch-ai` in `src/data/clinicalIntentToolCatalog.js`, `src/data/clinicalToolIdContract.js`, and catalog labels.
6. Refresh source-audit counts in `src/data/sourceCodeToolDiscovery.js` and add drift tests against current constants.
7. Generate or restore the referenced docs: `docs/tool-contract-matrix.md`, `docs/backend-frontend-tool-contract.md`, `docs/backend-exposure-report.md`, `docs/tool-render-execute-matrix.md`, and `docs/tool-visibility-matrix.md`.
8. Consolidate notification services under one API client.
9. Add workspace "hidden tools" affordance in `src/contexts/WorkspaceContext.jsx`, `src/components/Sidebar.jsx`, and `src/pages/tools/ToolsOverview.jsx`.

## Recommended Targeted Tests

Add or extend:

- `src/components/tools/ToolResultShare.test.jsx`: generated share URL matches mounted route and avoids `/shared-result`.
- `src/pages/tools/SharedToolSession.test.jsx`: same-browser vs fresh-storage behavior is explicit.
- `src/App.permissions.test.jsx`: clinical-intelligence routes require the same permissions as backend controllers.
- `src/contexts/UserContext.profilePermissions.test.jsx`: profile hydration for `student`, `nurse`, `physician`, and `admin`.
- `src/pages/team/TeamManagement.capability.test.jsx`: with `teamManagement=false`, invite/edit/delete do not call `/api/team/*`.
- `src/data/sourceCodeToolDiscovery.test.js`: `SOURCE_SCAN_LOCATIONS` counts derive from current constants.
- `src/services/notificationServiceConsolidation.test.js`: only the canonical notification service is imported by UI code.
- `src/contexts/WorkspaceContext.hiddenTools.test.jsx`: stale custom workspaces show a hidden-tools indicator.

Existing command set that should be run once package tooling is available:

```bash
npm run test:alias-sync
npm run test:catalog-launch
npm run test:registry-launch
npm run test:executor-mapping
npm run test:contract-matrix
npm run test:backend-exposure
npm run test:visibility-matrix
npm run test:tool-render-smoke
npm run test:responsive-regression
cd backend && npm test
```

## Validation Status

Initial attempted validation on 2026-05-22:

```text
node --version
cmd /c npm --version
cmd /c npm run test:alias-sync
cmd /c npm run test:backend-exposure
cd backend && cmd /c npm test
```

Result:

```text
v22.22.0
'npm' is not recognized as an internal or external command,
operable program or batch file.
```

The shell has `node`, but `npm` is not currently available on `PATH`, so npm-backed Vitest/Jest scripts could not be executed. The audit should be revalidated with the recommended command set once Node/npm tooling is installed or the PATH is fixed.

Repair-pass validation attempted on 2026-05-22:

```text
node --version
npm --version
git diff --check
git status --short
cmd /c where npm
cmd /c where git
cmd /c npm --version
cmd /c git --version
```

Result:

```text
v22.22.0
npm: command not found
git: command not found
INFO: Could not find files for the given pattern(s). [npm]
INFO: Could not find files for the given pattern(s). [git]
'npm' is not recognized as an internal or external command, operable program or batch file.
'git' is not recognized as an internal or external command, operable program or batch file.
```

IDE diagnostics reported no linter errors for the files touched in the repair pass. Full Vitest/Jest validation and `git diff --check` remain blocked until `npm` and `git` are available on PATH.

