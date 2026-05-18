# Changelog — Production hardening (tool routing & safety)

All notable changes in this release branch. Version baseline: post-`f18eb94` (fleet foundation).

## Added

### Frontend
- `src/data/clinicalToolIdContract.js` — canonical registry, NLU, tier, and orchestrator maps.
- `src/data/clinicalToolAliasSync.js` + tests — NLU/catalog alias drift detection vs `tool.patterns.ts`.
- `src/data/parseToolPatterns.js` — shared pattern parsing for sync tests.
- `src/data/clinicalCatalogLaunch.test.js` — launch resolver coverage (92 tests).
- `src/data/unsupportedOrchestratorTools.js` — documents tools without POST executors.
- `src/utils/catalogSearch.js` + tests — catalog search utility.
- `src/routes/clinicalToolRoutes.js` + tests — `KNOWN_TOOL_AREA_PATHS`, calculator route defs.
- `src/data/e2eToolValidationMatrix.js` + tests — E2E inventory (134 tests).
- `src/data/e2eManualQaChecklist.js`, `e2eRegressionChecklist.js` — QA/regression artifacts.
- `src/data/clinicalSafetyGuardrails.js` + tests — safety copy normalization and audit.
- `src/data/clinicalSafetyComplianceReport.js` — compliance snapshot builder.
- `src/components/clinical/ClinicalDecisionSupportDisclaimer` — shared tool-page disclaimer.
- `src/pages/tools/ToolsAreaFallback.jsx`, `ToolNotFound.jsx` — unknown tool-area handling.
- `src/components/Sidebar.toolsNavigation.test.js` — sidebar tools nav tests.
- `src/pages/tools/Calculators.route.test.jsx` — route ↔ slug alignment.

### Backend
- `tool-orchestrator.registry.ts` + spec — executor IDs, aliases, contracts, `EXECUTOR_MAPPING_AUDIT`.
- Structured tool execution errors (`ToolExecutionErrorCode`) on DTO responses.
- Executor ID resolution (`drug-interaction-checker` → `drug-interactions`).
- Extended `tool-orchestrator.spec.ts` (metrics/repo mocks, unsupported-tool cases).

## Changed

### Frontend
- `clinicalCatalogWiring.js` — refactored launch resolution; NLU-before-builtin ordering.
- `clinicalIntentToolCatalog.js` — guardrailed chat seeds; dose/antibiotic/diagnosis copy.
- `ClinicalToolCatalog.jsx` / `.css` — search, tier labels, empty states.
- `medicalToolsCatalogIndex.js` — enriched rows via catalog search util.
- `ToolPageLayout.jsx` — decision-support disclaimer by tool variant.
- `Calculators.jsx` — CHA₂DS₂-VASc anticoagulation wording (discussion, not mandates).
- `App.jsx`, `Sidebar.jsx` — routing and navigation alignment.
- PR test constants re-export shared catalog search helpers.
- Multiple PR/fleet/dispatch tests updated for null orchestrator on `dispatch-ai`.

### Backend
- `tool-orchestrator.service.ts` — resolve IDs, structured errors, audit metadata.
- `tool-execution.dto.ts` — `errorCode`, `requestedToolId`, `resolvedToolId`.
- `drug-checker.service.ts` — strengthened interaction disclaimer.

## Fixed

- Phantom NLU routes removed from `NLU_TO_REGISTRY_ID` (no fake tool pages).
- `dispatch-ai` removed from `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` (no fake POST executor).
- Drug checker orchestrator ID drift (`drug-interaction-checker` alias vs `drug-interactions` canonical).
- PHQ-9/GAD-7 launch receiving generic builtin calculator seeds.
- Duplicate platform filter option in clinical catalog.
- Hub-only tools miscategorized as `calculator` tier in catalog.

## Security / compliance

- No new backend executors without governance.
- Clinical decision-support disclaimers on tool pages.
- PHQ-9/GAD-7 crisis-sensitive chat seeds.
- Fleet tools explicitly non-autonomous for dispatch/routing.

## Deprecated

- Ad-hoc orchestrator mappings in scattered test files (consolidated under `clinicalToolIdContract`).

## Removed

- Unsafe `NLU_TO_REGISTRY_ID` entries for non-shipped tool IDs (documented as phantoms in discovery instead).
