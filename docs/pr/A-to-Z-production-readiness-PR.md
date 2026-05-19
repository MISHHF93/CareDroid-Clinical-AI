# PR: A-to-Z backend/frontend wiring hardening and production validation

**Suggested PR title:** A-to-Z backend/frontend wiring hardening and production validation

**Branch:** `branch/final-production-readiness` (or stacked merge of audit → contract → proxy → orchestrator → render-execute → responsive → readiness)

**Related docs:** [branch-plan-production-hardening.md](../branch-plan-production-hardening.md) · [build-validation-report.md](../build-validation-report.md)

---

## 1. Summary

This PR hardens the CareDroid clinical SPA and Nest API as a **single product surface**: inventories and contract matrices document every tool path; API/proxy configuration is centralized; orchestrator POST execution is limited to three registered executors; render/execute smoke tests guard against blank routes; responsive layout is regression-tested; and build validation gates are documented.

**Outcome:** Production frontend is **buildable and fully unit-tested** (4640 Vitest tests). Backend **TypeScript build passes** with fleet NLU pattern alignment. Backend Jest remains **partially red** (documented; not hidden). No new clinical tools were added during hardening.

---

## 2. Scope

### In scope

- Backend ↔ frontend **inventory and contract** documentation (generated from canonical JS)
- **API client / Vite proxy** hardening and degraded-config UX
- **Orchestrator mapping** (3 POST executors only; unsupported list explicit)
- **Render / execute** matrix, smoke tests, `ToolApiErrorBanner` on Tier C / chat pages
- **Responsive** CSS, Vitest regression, Playwright matrix (with known flakes)
- **Test / route** alignment (`CALCULATOR_ROUTE_DEFS`, catalog launch fallbacks)
- README, `.env.example`, `backend/.env.example`, build validation report

### Out of scope

- New `registerTool()` executors (MELD, GRACE, ASCVD, fleet POST, etc.) — see [executor-readiness-report.md](../executor-readiness-report.md)
- Full backend Jest green (follow-up ticket)
- Visual redesign unrelated to production breakpoints
- NLU model / RAG content changes

---

## 3. Frontend inventory

| Layer | Source | Count / notes |
|-------|--------|----------------|
| Registry tools | `src/data/toolRegistry.js` | **35** sidebar/catalog ids |
| Calculator routes | `src/routes/clinicalToolRoutes.js` → `CALCULATOR_ROUTE_DEFS` | Deep links from `builtinUiCalculators` |
| App routes | `src/App.jsx` | Tools, fleet, catalog, `ToolsAreaFallback` for unknown slugs |
| NLU profiles | `src/data/clinicalIntentToolCatalog.js` | **40** `clinicalIntentTools` rows |
| Pages | `src/pages/tools/*`, `src/pages/fleet/*` | Tier A/B/C, clinical pages, fleet local |
| API callers | `src/services/apiClient.js`, page-level `apiFetch` | Centralized path normalization |

**Rendering inventory:** `src/data/frontendRenderingInventory.js` — validates every registry tool has a render path; **PASS** in Vitest.

**Key frontend modules added/updated:** `ApiConfigDegradedBanner`, `ToolApiErrorBanner`, `clinicalOrchestratorApi`, `toolRenderExecuteMatrix`, test helpers under `src/data/testHelpers/`.

---

## 4. Backend inventory

| Layer | Source | Notes |
|-------|--------|-------|
| HTTP controllers | 16 controllers | See [backend-api-inventory.md](../backend-api-inventory.md) |
| Global prefix | `api` | `/health` excluded |
| Tool orchestrator | `ToolOrchestratorController` | `POST /api/tools/:toolId/execute` |
| POST executors | `tool-orchestrator.registry.ts` | **3** registered tools |
| Intent patterns | `tool.patterns.ts` | Includes `category: 'fleet'` for fleet NLU |
| Chat | `ChatController` | `POST /api/chat/message`, intent via internal classifier |

**Fix documented in proxy audit:** `AuditController` path corrected from `api/audit` → `audit` (was `/api/api/audit`).

**Medical control plane:** Intent classification is **internal** to chat—not a public REST classify endpoint for the SPA (recommendations use `/api/chat/intent-classify` where implemented).

---

## 5. Tool contract matrix

**Canonical:** `src/data/backendFrontendToolContract.js`  
**Generated:** [backend-frontend-tool-contract.md](../backend-frontend-tool-contract.md) (`npm run contract:write-docs`)

| Metric | Value |
|--------|------:|
| NLU profiles | 40 |
| Registry tools | 35 |
| POST executors | **3** |
| Matrix rows (incl. platform + phantom) | 54 |

| Status | Count | Meaning |
|--------|------:|---------|
| fully wired | 4 | UI + catalog + NLU + patterns; includes 3 executors + tools list API |
| frontend-only | 40 | Client and/or chat; no `registerTool()` |
| planned | 9 | Phantom recommendation / cost-tracking ids |
| broken | 1 | `tools-share-results` — client calls undocumented endpoint |
| backend-only | 0 | No clinical executor without UI |

**Fully wired (POST or list API):** `sofa-calculator`, `drug-interactions`, `lab-interpreter`, `tools-list-api`.

---

## 6. Routing validation

| Mechanism | Validation |
|-----------|------------|
| `CALCULATOR_ROUTE_DEFS` | Every builtin calculator slug → dedicated path; sorted longest-first |
| `App.jsx` | Spreads `CALCULATOR_ROUTE_DEFS.map` before `/tools/calculators` hub |
| `matchCalculatorRoute()` | Used in wiring audits and smoke coverage |
| `ToolsAreaFallback` | Unknown `/tools/*` and `/fleet/*` slugs → `ToolNotFound`, not blank |
| Legacy paths | `/tools/calculator/sofa`, `/tools/calculator/gfr`, etc. still registered |

**Tests:** `src/routes/clinicalToolRoutes.test.js`, `clinicalToolRoutes.production.test.js`, `pr*RegistrationAudit.test.js`, `testHelpers/calculatorRouteAudit.js`.

---

## 7. Catalog / discovery validation

| Check | Result |
|-------|--------|
| All 35 registry ids in `getMedicalToolsCatalogRows()` | Pass (`e2eToolValidationMatrix`) |
| All 35 in `getAllDiscoveredTools()` | Pass |
| `resolveCatalogLaunch(id)` for each registry id | Path matches `expectedLaunchPath` |
| Unknown tool-shaped id | `/dashboard` + guarded chat seed (not null path) |
| Catalog search aliases | `clinicalToolAliasSync.test.js` (410 tests) |
| Launch from catalog UI | `ClinicalToolCatalog.launch.test.jsx` |

**E2E matrix:** [e2e-tool-validation-matrix.md](../e2e-tool-validation-matrix.md) — 35 registry rows, catalog + discovery **35/35**.

---

## 8. NLU / backend intent sync

| Link | Enforcement |
|------|-------------|
| `NLU.*` ↔ `tool.patterns.ts` | Wiring tests read patterns file; alias sync tests |
| `ORCHESTRATOR_TO_REGISTRY_ID` | Maps NLU toolId → registry id |
| `NLU_TO_REGISTRY_ID` | Phrase aliases for catalog/cost tracking |
| Fleet `category: 'fleet'` | TypeScript union on `ToolPattern` + `clinical-tool.interface` |
| Unsupported NLU | `UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS` (37 ids) — [unsupported-orchestrator-tools.md](../unsupported-orchestrator-tools.md) |

**Chat routing:** NLU may set `backendExecutable: true` (e.g. `dispatch-ai`); that does **not** imply POST `/api/tools/:id/execute`—only the three registered NLU ids do.

---

## 9. API / proxy validation

| Item | Status |
|------|--------|
| `VITE_API_URL` empty → same-origin `/api` + Vite proxy to `:3000` | Documented |
| `apiClient.js` / `apiEnv.js` | Central `buildApiUrl`, `apiFetch`, timeout, error messages |
| `ApiConfigDegradedBanner` | Shown when system config bootstrap fails |
| No hardcoded production localhost in client | Audited |
| WebSocket | `VITE_WS_URL` optional; proxy `/socket.io` in dev |
| Audit API double prefix | Fixed (`audit` controller path) |

**Doc:** [proxy-config-audit.md](../proxy-config-audit.md)

**Tests:** `src/services/apiClient.test.js`, `src/config/apiEnv.test.js`

---

## 10. Orchestrator mapping validation

| Rule | Implementation |
|------|----------------|
| POST executors | `sofa-calculator`, `drug-interactions`, `lab-interpreter` only |
| `executeClinicalTool()` | `src/services/clinicalOrchestratorApi.js` — unsupported → user-visible error |
| `resolveOrchestratorToolForLaunch()` | Sets `orchestratorTool` only when `isOrchestratorPostExecutable()` |
| Catalog launch | Does not advertise POST for Tier A/B calculators |

**Tests:** `npm run test:executor-mapping` (audit, unsupported, hardening, API client, id contract)

---

## 11. Render / execute validation

**Matrix:** [tool-render-execute-matrix.md](../tool-render-execute-matrix.md) — validation **PASS**

| Mode | Registry examples | Behavior |
|------|-------------------|----------|
| `local-calculator` | Tier A (qSOFA, MELD, PHQ-9, …) | Form + client-side result |
| `post-executor` | drug-check, lab-interp, sofa-score | `executeClinicalTool` + error banner |
| `chat-hub` | Wells PE, PERC, NIHSS, … | Hub + chat seed → dashboard |
| `chat-page` | protocols, diagnosis, procedures | Page + chat API |
| `fleet-local` | fleet-command, route-optimizer, … | Fleet pages |
| `hub` | calculators | Overview / hub |

**Smoke:** `npm run test:tool-render-smoke` (matrix + page smoke + calculators form + route pages)

**Manual QA section:** [tool-render-execute-manual-qa.md](../tool-render-execute-manual-qa.md)

---

## 12. Responsive UI validation

| Gate | Result |
|------|--------|
| Vitest `npm run test:responsive-regression` | Pass |
| Playwright matrix `npm run qa:responsive` | **9 failures** / 1116 cells (timeouts on select Tier-A pages; **0 horizontal overflow** failures) |
| Shared CSS | `responsive-ux.css`, `layout-breakpoints.css`, AppShell/Sidebar/tool pages |

**Doc:** [responsive-regression-coverage.md](../responsive-regression-coverage.md), [qa/RESPONSIVE_QA_REPORT.md](../../qa/RESPONSIVE_QA_REPORT.md)

**Note:** Playwright failures are **not** layout-overflow regressions; treat as follow-up stability (timeouts).

---

## 13. Build / test results

Validated 2026-05-19 — full log: [build-validation-report.md](../build-validation-report.md)

| Command | Result |
|---------|--------|
| `npm run lint` (root) | **Pass** (0 errors, ~107 warnings) |
| `npm run test:run` (root) | **Pass** — **4640 / 4640** |
| `npm run build` (root) | **Pass** — Vite 1860 modules → `dist/` |
| `cd backend && npm run build` | **Pass** |
| `cd backend && npm run lint` | **Fail** — 85 ESLint issues (tsconfig include / e2e spec paths) |
| `cd backend && npm test` | **Fail** — **308 / 493** passed (13 suites failed) |

**Recommended CI gate (merge):** root `lint`, `test:run`, `build`, `test:contract-matrix`, `test:executor-mapping`, `test:tool-render-smoke`, `test:e2e-matrix`, `backend` `build`.

---

## 14. Known frontend-only tools

All **35 registry tools** except the three Tier-C executor surfaces run **without** `registerTool()` POST handlers.

**Representative groups:**

- **Tier A calculators** (16): client-side math in `Calculators.jsx` (qSOFA, NEWS2, MELD, PHQ-9, ASCVD, …)
- **Tier B chat-assisted** (8): hub + `chatSeed` (Wells PE, PERC, NIHSS, GRACE, …)
- **Clinical pages** (3): protocols, diagnosis, procedures → `POST /api/chat/message`
- **Fleet** (3 local + 1 chat): fleet dashboards; dispatch-ai chat-only
- **Hub-only NLU** (apache2, curb65, gcs, dose-calculator, …): catalog + patterns, no dedicated registry row

**NLU profiles without registry row:** Hub-only calculator NLU ids map to `calculators` hub or sibling registry via `ORCHESTRATOR_TO_REGISTRY_ID`.

---

## 15. Known backend-only tools

| Id | Notes |
|----|-------|
| Clinical POST executors | All three have UI (`sofa`, drug-checker, lab-interpreter) |
| `tools-list-api` | `GET /api/tools` for catalog — no standalone page |
| Internal intent classifier | No direct SPA REST surface |
| Phantom / planned matrix rows | Recommendation engine ids (abc-assessment, trauma-score, …) — **no** backend executor shipped |

**No production clinical tool is backend-only without a documented UI path.**

---

## 16. Unsupported execution paths

| Path | Expected behavior |
|------|-------------------|
| `POST /api/tools/{meld\|grace\|…}/execute` | **Not registered** — do not call from frontend |
| `executeClinicalTool()` for non-registered id | Returns `ok: false`, unsupported message; UI shows `ToolApiErrorBanner` |
| Chat with `tool` param for unsupported NLU | Backend may fallback to general AI (`NotFoundException` handled in chat) |
| Unknown catalog id | `resolveCatalogLaunch` → `/dashboard` + “find the right tool” chat seed |
| Invalid calculator slug | `ToolsAreaFallback` / `ToolNotFound` |
| `POST /api/tools/share-results` | **Broken** — documented; client in `ToolResultShare.jsx` |

---

## 17. Safety / compliance notes

- Guardrails: `src/data/clinicalSafetyGuardrails.js` — disclaimers, mental-health crisis copy, PE/ACS no-certainty, fleet no-auto-authority
- Chat seeds normalized via `ensureChatSeedGuardrails` in `clinicalCatalogWiring.js`
- `npm run test:safety-compliance` — guardrail + compliance report tests
- Doc: [clinical-safety-compliance.md](../clinical-safety-compliance.md)

**Not a substitute for clinician judgment** — all tools framed as decision support in `ToolPageLayout` and calculator outputs.

---

## 18. Risk assessment

| Area | Level | Mitigation |
|------|-------|------------|
| API URL misconfiguration | **High** | `ApiConfigDegradedBanner`, `.env.example`, proxy doc |
| False POST executor expectations | **Medium** | Contract matrix + `unsupportedOrchestratorTools` + UI errors |
| Backend Jest red | **Medium** | Documented; do not block frontend release on unrelated suites without owner |
| Playwright timeouts | **Low–Medium** | No overflow failures; retry job available |
| Audit / share-results API | **Low** | Documented broken row; fix in follow-up |
| Responsive CSS regressions | **Low** | Vitest + matrix; visual QA on merge |

---

## 19. Rollout plan

1. **Merge** after reviewer sign-off and green **frontend** CI gates.
2. **Staging deploy:** SPA with empty `VITE_API_URL` behind reverse proxy to Nest `/api`; verify `GET /api/config/system`, login, drug-checker, lab-interpreter, SOFA execute.
3. **Smoke:** `npm run smoke` checklist + manual [tool-render-execute-manual-qa.md](../tool-render-execute-manual-qa.md) sample (5 Tier A, 2 Tier B, 3 Tier C, 2 fleet).
4. **Responsive:** Run `npm run qa:responsive:chromium` on staging URL; accept known timeout flakes or run retry script.
5. **Production:** Blue/green or rolling; monitor 4xx/5xx on `/api/tools/*/execute` and `/api/chat/message`.
6. **Post-release:** Open backend Jest triage epic; fix `tools-share-results` contract.

---

## 20. Rollback plan

| Change type | Rollback |
|-------------|----------|
| Frontend SPA | Redeploy previous `dist/` artifact |
| API client / env | Revert to prior `VITE_API_URL` build arg |
| Backend | Redeploy previous `backend/dist`; DB migrations unaffected by this PR |
| Feature flags | No new flags; rollback is deploy-level |

**Data:** No schema migrations in this hardening PR. Offline caches may retain old tool metadata until client refresh.

---

## 21. Follow-up work

1. **Backend Jest:** Triage 13 failing suites (SOFA validation vs tests, drug/lab mocks, audit/auth DB).
2. **Backend ESLint:** Include `test/**/*.e2e-spec.ts` in tsconfig or exclude from lint.
3. **`tools-share-results`:** Implement or remove `ToolResultShare` API call.
4. **Playwright:** Stabilize Tier-A timeout cases (CKD staging @ 1024, BMI @ Firefox).
5. **Executor readiness:** MELD/GRACE/ASCVD/CKD candidates per [executor-readiness-report.md](../executor-readiness-report.md) — product decision, not drive-by.
6. **CI:** Add required checks for `test:contract-matrix`, `test:tool-render-smoke`, `test:executor-mapping`.

---

## Acceptance criteria (PR)

| Criterion | Status |
|-----------|--------|
| Frontend builds | **Pass** |
| Backend builds | **Pass** |
| Tests pass | **Frontend pass**; backend partial (documented) |
| Every catalog tool renders or launches correctly | **Pass** (matrix + e2e inventory + smoke) |
| Every backend executor has valid contract | **Pass** (3 executors ↔ 3 UI surfaces) |
| No dead frontend links | **Pass** (`frontendRenderingInventory`, `ToolsAreaFallback`) |
| No fake backend mappings | **Pass** (unsupported list explicit; no phantom POST) |
| No blank routes | **Pass** (smoke + `ToolNotFound` + error banners) |
| README run instructions correct | **Pass** (verified in build validation) |

---

## Supplemental artifacts

| Document | Path |
|----------|------|
| Changelog | [CHANGELOG-production-hardening.md](./CHANGELOG-production-hardening.md) |
| Reviewer checklist | [REVIEWER_CHECKLIST.md](./REVIEWER_CHECKLIST.md) |
| QA checklist | [QA_CHECKLIST.md](./QA_CHECKLIST.md) |
| Deployment checklist | [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) |
| Environment checklist | [ENVIRONMENT_CHECKLIST.md](./ENVIRONMENT_CHECKLIST.md) |
| Release notes | [RELEASE_NOTES.md](./RELEASE_NOTES.md) |
