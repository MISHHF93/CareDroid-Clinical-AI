# Consecutive branch plan: backend → frontend production hardening

**Stack order (each branch merges into the previous):**

```
main
 └── branch/backend-frontend-audit
      └── branch/tool-contract-matrix
           └── branch/api-client-proxy-hardening
                └── branch/orchestrator-mapping-hardening
                     └── branch/render-execute-smoke-tests
                          └── branch/responsive-production-ui
                               └── branch/final-production-readiness
```

**Global rules**

- One concern per PR; no new clinical tools, NLU profiles, or executors while hardening.
- Every branch must pass at minimum: `npm run build` (root) and `cd backend && npm run build`.
- Prefer **docs + data matrices + tests** in early branches; **runtime behavior** in middle branches; **CSS/layout** only in `responsive-production-ui`.
- If work already exists on `main`, split with `git log --oneline -- path` and cherry-pick by directory—not by “everything at once.”

**Suggested PR size:** ≤ 25 production files changed (excluding generated `docs/*.md`, `qa/*.json`).

---

## 1. `branch/backend-frontend-audit`

### Goal

Establish a **read-only inventory** of what the backend exposes vs what the frontend calls/renders—gaps, phantom routes, double `/api` paths, missing controllers—without changing runtime wiring.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Docs | `docs/backend-api-inventory.md`, `docs/proxy-config-audit.md` (inventory sections only), new `docs/backend-frontend-audit-summary.md` |
| Data (read-only helpers) | `src/data/frontendRenderingInventory.js`, `src/data/frontendRenderingInventory.test.js` |
| Scripts | `scripts/print-smoke-checklist.mjs` (links only, optional) |
| Backend (inventory notes only) | Comments or `docs/` references to `backend/src/modules/**/controllers`, `backend/src/modules/medical-control-plane/tool-orchestrator/**` — **no controller logic changes** |

**Explicitly out of scope:** `apiClient.js`, orchestrator executors, CSS, catalog launch behavior.

### Acceptance criteria

- [ ] Single audit doc lists: API routes, frontend callers, registry tool IDs, known gaps (e.g. procedures NLU-only).
- [ ] No new `POST /api/tools/:id/execute` executors.
- [ ] `npm run test:run -- src/data/frontendRenderingInventory.test.js` passes.
- [ ] `npm run build` (root) and `cd backend && npm run build` pass.

### Tests required

```bash
npm run test:run -- src/data/frontendRenderingInventory.test.js
npm run build
cd backend && npm run build
```

### Rollback plan

Revert doc/data-only commit(s). Zero runtime impact.

### Risk level

**Low** — documentation and static analysis only.

### Reviewer focus

- Accuracy of route/caller tables vs `App.jsx`, `vite.config.js`, Nest controllers.
- Gaps labeled “documented” vs “must fix in later branch.”

---

## 2. `branch/tool-contract-matrix`

### Goal

Canonical **17-column (or equivalent) contract matrix**: registry ID ↔ NLU ↔ catalog ↔ POST executor ↔ launch path ↔ tier—with generated markdown and drift tests.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Canonical JS | `src/data/backendFrontendToolContract.js`, `src/data/clinicalToolIdContract.js` (constants only if needed) |
| Tests | `src/data/backendFrontendToolContract.test.js`, `src/data/backendFrontendToolContract.report.test.js` |
| Docs | `docs/backend-frontend-tool-contract.md` (generated) |
| Scripts | `scripts/write-backend-frontend-tool-contract.mjs`, `package.json` (`contract:write-docs`, `test:contract-matrix`) |
| README | Link to contract doc |

**Depends on:** audit branch (gap list should match contract rows).

**Out of scope:** UI components, proxy, responsive CSS.

### Acceptance criteria

- [ ] `npm run test:contract-matrix` passes (including report test when `CONTRACT_WRITE_DOCS=1`).
- [ ] Matrix covers all `ALL_REGISTRY_TOOL_IDS`; POST executors = exactly SOFA, drug-interactions, lab-interpreter.
- [ ] `npm run build` passes; no new tools added.

### Tests required

```bash
npm run test:contract-matrix
npm run contract:write-docs   # optional CI job; verifies generator
npm run build
cd backend && npm run build
```

### Rollback plan

Revert matrix module + generated doc. Frontend falls back to existing `clinicalToolIdContract` usage (unchanged if this branch only adds contract layer).

### Risk level

**Low–medium** — wrong matrix row causes false confidence; mitigated by tests.

### Reviewer focus

- Column definitions and “registry-only” / “phantom” statuses.
- No scope creep into executor implementation.

---

## 3. `branch/api-client-proxy-hardening`

### Goal

Centralize API base URL, proxy alignment, and **user-visible degraded state** when config is wrong—no localhost fallbacks in production paths.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Client | `src/services/apiClient.js`, `src/services/apiClient.test.js` |
| Config | `src/config/apiEnv.js`, `src/config/apiEnv.test.js` |
| UI | `src/components/ApiConfigDegradedBanner.jsx`, `src/components/ApiConfigDegradedBanner.css` |
| Consumers (surgical) | `src/contexts/SystemConfigContext.jsx`, `src/services/clinicalToolsApi.js`, audit/offline callers flagged in audit |
| Build | `vite.config.js`, `.env.example` |
| Docs | `docs/proxy-config-audit.md` |
| Backend (CORS/proxy only if needed) | `backend/.env.example` (`FRONTEND_URL`), `backend/src/main.ts` (CORS origin)—**minimal** |

**Out of scope:** Tool matrix, orchestrator mapping, layout CSS.

### Acceptance criteria

- [ ] Empty `VITE_API_URL` uses same-origin + Vite proxy in dev; explicit URL only when set.
- [ ] Failed API config shows `ApiConfigDegradedBanner` (or equivalent), not silent failure.
- [ ] `npm run test:run -- src/services/apiClient.test.js src/config/apiEnv.test.js` passes.
- [ ] `npm run build` passes.

### Tests required

```bash
npm run test:run -- src/services/apiClient.test.js src/config/apiEnv.test.js
npm run build
cd backend && npm run build
```

Manual: dev with backend on `:3000`, SPA on `:8000`; one authenticated API call succeeds.

### Rollback plan

Revert `apiClient` + env module; restore previous `axios`/`fetch` call sites from git. Toggle off banner via env if needed.

### Risk level

**Medium** — misconfigured `VITE_API_URL` breaks all API traffic in deploy.

### Reviewer focus

- No hardcoded `localhost` in production bundles.
- Proxy paths match Nest global prefix (`/api`).
- Error surfaces to user.

---

## 4. `branch/orchestrator-mapping-hardening`

### Goal

Harden **NLU ↔ registry ↔ orchestrator** mapping: only three POST executors; explicit unsupported list; safe `executeClinicalTool()` behavior.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Data | `src/data/unsupportedOrchestratorTools.js`, `src/data/orchestratorMappingAudit.js`, `src/data/clinicalCatalogWiring.js` (orchestrator fields only) |
| Service | `src/services/clinicalOrchestratorApi.js`, `src/services/clinicalOrchestratorApi.test.js` |
| Tests | `src/data/executorMappingAudit.test.js`, `src/data/orchestratorMappingHardening.test.js`, `src/data/unsupportedOrchestratorTools.test.js`, `src/data/clinicalToolIdContract.test.js` |
| Docs | `docs/unsupported-orchestrator-tools.md`, `docs/executor-readiness-report.md` (planning only), `scripts/write-unsupported-orchestrator-docs.mjs` |
| Backend patterns (type alignment only) | `backend/.../tool.patterns.ts`, `clinical-tool.interface.ts` (`category: 'fleet'`) |

**Out of scope:** New executors (MELD, GRACE, ASCVD, fleet POST). No Calculators.jsx refactors.

### Acceptance criteria

- [ ] `npm run test:executor-mapping` passes.
- [ ] `isOrchestratorPostExecutable` false for all non-registered NLU tools.
- [ ] Catalog launch sets `orchestratorTool` only when backend executor exists.
- [ ] `npm run build` (both packages) passes.

### Tests required

```bash
npm run test:executor-mapping
npm run orchestrator:write-docs   # optional
npm run build
cd backend && npm run build
```

### Rollback plan

Revert mapping modules and `clinicalOrchestratorApi`; frontend may call POST for unsupported tools again (document as known regression).

### Risk level

**Medium** — incorrect mapping blocks Tier C tools or allows invalid POST.

### Reviewer focus

- No new `execute` handlers in backend.
- `unsupportedOrchestratorTools` matches contract matrix branch.
- User-visible errors on failed execute (not swallowed).

---

## 5. `branch/render-execute-smoke-tests`

### Goal

Every shipped tool **renders**, **launches**, or **executes** per tier—with matrix, smoke tests, and API error banners on chat-style pages.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Matrix | `src/data/toolRenderExecuteMatrix.js`, `src/data/toolRenderExecuteMatrix.test.js`, `src/data/toolRenderExecuteMatrix.report.test.js` |
| Smoke | `src/test/toolRenderExecuteSmoke.test.jsx`, `src/test/routePagesSmoke.test.jsx`, `src/test/testRenderUtils.jsx` |
| Error UI | `src/components/ToolApiErrorBanner.jsx`, `src/components/ToolApiErrorBanner.css` |
| Pages (behavior only) | `src/pages/tools/Protocols.jsx`, `ProcedureGuide.jsx`, `DiagnosisAssistant.jsx`, `DrugChecker.jsx`, `LabInterpreter.jsx` |
| Catalog wiring | `src/data/e2eManualQaChecklist.js` (render-execute section) |
| Docs/scripts | `docs/tool-render-execute-matrix.md`, `scripts/write-tool-render-execute-matrix.mjs`, `package.json` (`test:tool-render-smoke`, `tool-matrix:write-docs`) |

**Out of scope:** AppShell/Sidebar layout, responsive CSS, new calculators.

### Acceptance criteria

- [ ] `npm run test:tool-render-smoke` passes.
- [ ] `runRenderExecuteValidation()` passes in matrix tests.
- [ ] Tier C pages show `ToolApiErrorBanner` on API failure (no blank page, no `alert()` for validation).
- [ ] `npm run build` passes.

### Tests required

```bash
npm run test:tool-render-smoke
npm run tool-matrix:write-docs   # optional CI
npm run build
cd backend && npm run build
```

### Rollback plan

Revert smoke tests and error banners; keep matrix as docs-only if needed for ops.

### Risk level

**Medium** — smoke tests can be brittle; page error handling touches clinical UX.

### Reviewer focus

- Tests mock services, not live backend.
- No removal of tests to green CI.
- Launch fallback (`/dashboard` + chat seed) consistent with `clinicalCatalogLaunch.test.js`.

---

## 6. `branch/responsive-production-ui`

### Goal

Production **responsive layout** for tools, fleet, sidebar, and catalog—CSS and layout tests only, no contract or API changes.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Layout/CSS | `src/layout/AppShell.css`, `src/layout/AppShell.jsx`, `src/styles/layout-breakpoints.css`, `src/styles/responsive-ux.css`, `src/components/Sidebar.css`, `src/components/Sidebar.jsx`, page `*.css` under `src/pages/tools/`, `src/pages/fleet/` |
| Components | `src/components/ui/button.css`, `src/components/ToolCard.css` |
| Tests | `src/**/*.responsive.test.js`, `src/layout/AppShell.layout.test.js`, `src/test/responsiveRegression.*`, `src/components/Sidebar.mobileRender.test.jsx` |
| E2E | `e2e/responsive-qa.spec.mjs`, `e2e/responsive-qa.helpers.mjs`, `playwright.config.mjs` |
| QA artifacts | `src/data/responsiveQaMatrix.js`, `qa/RESPONSIVE_QA_*.md`, `scripts/run-responsive-qa.mjs`, `scripts/retry-responsive-qa-failures.mjs` |
| Vitest | `vitest.config.js` (`exclude: e2e/**`) |

**Out of scope:** `apiClient`, orchestrator, contract matrix, backend.

### Acceptance criteria

- [ ] `npm run test:responsive-regression` passes.
- [ ] No horizontal overflow at documented breakpoints (matrix in `responsiveQaMatrix.js`).
- [ ] `npm run build` passes.
- [ ] Playwright responsive suite optional in CI: `npm run qa:responsive:chromium`.

### Tests required

```bash
npm run test:responsive-regression
npm run build
# Optional / nightly:
npm run qa:responsive:chromium
```

### Rollback plan

Revert CSS/layout commits; functional behavior unchanged on desktop.

### Risk level

**Medium** (visual) / **Low** (functional) — regression risk is layout-only.

### Reviewer focus

- Visual diff on tools catalog, calculators hub, fleet pages, mobile drawer.
- No accidental changes to `clinicalCatalogWiring` or routes.

---

## 7. `branch/final-production-readiness`

### Goal

**Release gate**: full build validation, README accuracy, env examples, backend lint script, and any remaining non-visual fixes required for “buildable + documented” production—not new features.

### Exact files likely changed

| Area | Paths |
|------|--------|
| Docs | `docs/build-validation-report.md`, README.md (scripts table, hardening links) |
| Backend hygiene | `backend/scripts/run-eslint.mjs`, `backend/package.json` (`lint`), `backend/.env.example` |
| CI/docs (optional) | `.github/workflows/*` if adding matrix gates |
| Test helpers | `src/data/testHelpers/calculatorRouteAudit.js`, `src/data/testHelpers/catalogLaunchExpectations.js` |
| Vitest | `vitest.config.js` (final exclude list) |

**Out of scope:** New tools, large refactors, responsive CSS (comes from branch 6).

### Acceptance criteria

- [ ] `npm run lint` (root): 0 errors.
- [ ] `npm run test:run` (root): all pass.
- [ ] `npm run build` (root): pass.
- [ ] `cd backend && npm run build`: pass.
- [ ] `docs/build-validation-report.md` reflects current CI truth.
- [ ] Backend test failures either fixed **or** documented with owner + follow-up issue (no silent skip).

### Tests required

```bash
npm run lint
npm run test:run
npm run build
cd backend && npm run build
cd backend && npm run lint    # document known failures if any remain
cd backend && npm test      # triage or ticket remaining failures
```

### Rollback plan

Revert README/CI/doc-only commits. Keep branch 6 merged state as last known-good UI.

### Risk level

**Low** if docs/CI only; **medium** if backend test fixes touch clinical executors.

### Reviewer focus

- Release checklist vs actual commands.
- No mixing of responsive CSS with executor fixes in same commit.
- Clear “known failures” section if backend Jest not fully green.

---

## Merge and dependency checklist

| Branch | Blocks | Must not include |
|--------|--------|------------------|
| backend-frontend-audit | — | Runtime API changes |
| tool-contract-matrix | audit gaps doc | apiClient, CSS |
| api-client-proxy-hardening | contract IDs stable | orchestrator executors |
| orchestrator-mapping-hardening | contract matrix | responsive CSS |
| render-execute-smoke-tests | orchestrator + api client | layout refactors |
| responsive-production-ui | smoke routes stable | contract/orchestrator edits |
| final-production-readiness | all above | new tools/features |

## Creating branches (safe sequence)

```bash
git checkout main && git pull
git checkout -b branch/backend-frontend-audit
# ... commit, PR, merge to main ...

git checkout main && git pull
git checkout -b branch/tool-contract-matrix
# ...

# Repeat for each branch off updated main.
```

**Alternative (stacked PRs):** branch 2 from branch 1, etc., then merge sequentially to avoid drift—rebase each open PR when parent merges.

## CI gate per PR (minimum)

```bash
npm run build
cd backend && npm run build
# Plus branch-specific test script from table above
```

---

*Generated for CareDroid-Clinical-AI production hardening. Adjust file lists if your working tree already contains overlapping changes—split by directory when cherry-picking.*
