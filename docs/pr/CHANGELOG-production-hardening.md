# Changelog — production hardening (A-to-Z wiring)

All notable changes for backend/frontend production readiness. Versioning follows app `1.0.0` unless otherwise tagged.

## Added

- `src/data/backendFrontendToolContract.js` — 17-column contract matrix generator and drift tests
- `src/data/toolRenderExecuteMatrix.js` — per-tool render/execute mode validation
- `src/data/orchestratorMappingAudit.js` — NLU ↔ registry ↔ POST executor audit
- `src/data/unsupportedOrchestratorTools.js` — explicit unsupported POST list
- `src/services/clinicalOrchestratorApi.js` — centralized tool execute wrapper
- `src/components/ApiConfigDegradedBanner.jsx` — visible API config failure state
- `src/components/ToolApiErrorBanner.jsx` — reusable executor/API error alert
- `src/data/testHelpers/calculatorRouteAudit.js` — App.jsx + `CALCULATOR_ROUTE_DEFS` assertions
- `src/data/testHelpers/catalogLaunchExpectations.js` — unknown launch test helpers
- `src/test/toolRenderExecuteSmoke.test.jsx` — Tier C + clinical page smoke tests
- `backend/scripts/run-eslint.mjs` — ESLint 9 + legacy `.eslintrc.js` bridge
- Docs: `backend-api-inventory.md`, `backend-frontend-tool-contract.md`, `proxy-config-audit.md`, `tool-render-execute-matrix.md`, `unsupported-orchestrator-tools.md`, `build-validation-report.md`, `branch-plan-production-hardening.md`

## Changed

- `src/services/apiClient.js` / `src/config/apiEnv.js` — centralized API root, timeout, error parsing
- `src/data/clinicalCatalogWiring.js` — guarded unknown launch; orchestrator tool resolution
- `src/App.jsx` — calculator routes via `CALCULATOR_ROUTE_DEFS` spread
- `src/pages/tools/Protocols.jsx`, `ProcedureGuide.jsx`, `DiagnosisAssistant.jsx` — API errors via banner (no silent fail)
- `src/pages/tools/DrugChecker.jsx`, `LabInterpreter.jsx` — executor error UX
- `vitest.config.js` — exclude `e2e/**` from Vitest
- `backend/.../tool.patterns.ts` — `category: 'fleet'` on fleet NLU patterns
- `backend/.../clinical-tool.interface.ts` — fleet category in union
- `backend/.env.example` — `FRONTEND_URL=http://localhost:8000`
- Wiring tests — `CALCULATOR_ROUTE_DEFS` instead of literal App.jsx path strings
- `README.md` — links to contract, proxy, render/execute matrices

## Fixed

- Duplicate `getToolIcon` import (`pr5Consistency.test.js`)
- `expect` not defined in `testRenderUtils.jsx`
- Audit controller double `/api/api/audit` prefix (documented fix in proxy audit)
- Removed localhost fallbacks from production API paths (audit)
- `ClinicalToolCatalog` clear-search accessibility (`aria-label`)
- `advancedRecommendationService` emergency boost unit test (tests `generateRecommendations` directly)

## Documentation

- Regenerated contract and matrix docs via `npm run contract:write-docs`, `npm run tool-matrix:write-docs`, `npm run orchestrator:write-docs`
- E2E matrix: 35/35 registry catalog + discovery coverage unchanged and validated

## Known issues (not fixed in this release)

- Backend Jest: 13 suites / 185 tests failing (SOFA, drug/lab integration, audit/auth)
- Backend ESLint: 85 errors (tsconfig scope for test files)
- `tools-share-results` API — contract status **broken**
- Playwright responsive QA: 9 timeout failures (no horizontal overflow failures)

## npm scripts (new or documented)

| Script | Purpose |
|--------|---------|
| `npm run contract:write-docs` | Regenerate backend-frontend contract markdown |
| `npm run test:contract-matrix` | Contract drift tests |
| `npm run test:executor-mapping` | Orchestrator mapping gates |
| `npm run test:tool-render-smoke` | Render/execute smoke suite |
| `npm run tool-matrix:write-docs` | Regenerate render/execute markdown |
| `npm run orchestrator:write-docs` | Regenerate unsupported orchestrator doc |
| `npm run test:responsive-regression` | Responsive Vitest bundle |
| `npm run qa:responsive` | Full Playwright responsive matrix |
