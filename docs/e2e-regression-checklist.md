# Regression checklist — production promotion

Canonical source: `src/data/e2eRegressionChecklist.ts`.

## Automated gates (CI / local)

- [ ] npm run test:e2e-matrix (e2eToolValidationMatrix.test.js)
- [ ] vitest: clinicalToolIdContract.test.js
- [ ] vitest: clinicalCatalogLaunch.test.js
- [ ] vitest: clinicalToolAliasSync.test.js
- [ ] vitest: clinicalSafetyGuardrails.test.js
- [ ] backend jest: tool-orchestrator (registry + service)

## ID contract drift

- [ ] ALL_REGISTRY_TOOL_IDS matches toolRegistry.js
- [ ] NLU_PROFILE_TOOL_IDS matches clinicalIntentTools + backend tool.patterns.ts
- [ ] REGISTRY_ID_TO_ORCHESTRATOR_TOOL matches backend REGISTERED_EXECUTOR_TOOL_IDS (39 as of 2026-08-07 — re-count before trusting a cached number, this list has grown silently before)
- [ ] No dispatch-ai in REGISTRY_ID_TO_ORCHESTRATOR_TOOL

## SPA routes

- [ ] Every registry tool path in KNOWN_TOOL_AREA_PATHS
- [ ] Calculator routes in App.jsx match CALCULATOR_ROUTE_DEFS
- [ ] /tools/* and /fleet/* unknown paths hit ToolsAreaFallback (not dashboard)

## Catalog & discovery

- [ ] getMedicalToolsCatalogRows() includes all Tier A/B registry tools
- [ ] Catalog search finds PHQ-9, Wells PE, dispatch-ai by alias
- [ ] sourceCodeToolDiscovery phantom list unchanged or reviewed

## Launch behavior

- [ ] resolveCatalogLaunch(registryId) non-empty for shipped registry ids
- [ ] Tier B → /tools/calculators + chatSeed
- [ ] Tier C → orchestratorTool for sofa, drug-check, lab-interp only

## Clinical safety copy

- [ ] buildClinicalSafetyComplianceReport() riskLevel low
- [ ] ToolPageLayout disclaimer on drug, lab, diagnosis, procedures
- [ ] CHA2DS2-VASc no anticoagulation mandate strings

## Manual spot-check (smoke)

- [ ] Complete flattenManualQaChecklist() Tier C + PHQ-9 + dispatch-ai items
- [ ] Verify 401/403 on tools API when logged out

