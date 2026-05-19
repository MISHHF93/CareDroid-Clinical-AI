# Reviewer checklist — production readiness PR

## Architecture & scope

- [ ] PR does **not** add new clinical tools, NLU profiles, or `registerTool()` executors
- [ ] Changes are explainable via [branch-plan-production-hardening.md](../branch-plan-production-hardening.md) layers (no unrelated refactors)
- [ ] Generated docs (`docs/*.md` from npm scripts) match committed JS sources

## Contract & wiring

- [ ] `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` === exactly `sofa-calculator`, `drug-interactions`, `lab-interpreter`
- [ ] `backendFrontendToolContract.test.js` passes; no row marked `fully wired` without UI + patterns
- [ ] `tools-share-results` **broken** status acknowledged (not silently marked wired)
- [ ] `resolveCatalogLaunch` unknown ids → `/dashboard` + chat seed (not fake routes)

## API / proxy

- [ ] No new hardcoded `localhost` in `src/services/*` production paths
- [ ] `apiFetch` / `buildApiUrl` used for new or touched callers
- [ ] `ApiConfigDegradedBanner` shown when config bootstrap fails

## Orchestrator & Tier C

- [ ] `clinicalOrchestratorApi.executeClinicalTool` surfaces errors to UI (DrugChecker, LabInterpreter)
- [ ] Tier A calculators do **not** call POST execute in smoke tests
- [ ] `isOrchestratorPostExecutable` used before setting `orchestratorTool` on launch

## Routing

- [ ] New calculator tools would add to `builtinUiCalculators` + `CALCULATOR_ROUTE_DEFS` (not copy-paste routes in `App.jsx`)
- [ ] `ToolsAreaFallback` / `ToolNotFound` for invalid slugs

## Tests

- [ ] `npm run test:run` passes locally
- [ ] `npm run test:contract-matrix` passes
- [ ] `npm run test:executor-mapping` passes
- [ ] `npm run test:tool-render-smoke` passes
- [ ] No tests deleted or skipped to force green CI

## Backend (this PR)

- [ ] `cd backend && npm run build` passes
- [ ] Fleet `category: 'fleet'` type change is sufficient (no behavior change required for merge)
- [ ] Backend Jest failures documented in PR — agree they are follow-up, not blockers for frontend release

## Responsive (if CSS in diff)

- [ ] No changes to `clinicalCatalogWiring` / orchestrator in same commits as large CSS
- [ ] Vitest responsive tests pass; Playwright flakes called out in PR

## Security / safety

- [ ] Chat seeds still pass `ensureChatSeedGuardrails`
- [ ] No PHI logged in new error banners

## Sign-off

| Reviewer | Area | Approved |
|----------|------|----------|
| Frontend lead | SPA, tests | |
| Backend lead | Nest, executors | |
| QA | Manual smoke | |
| DevOps | Env / deploy | |
