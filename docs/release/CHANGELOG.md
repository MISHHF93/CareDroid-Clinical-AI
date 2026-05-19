# Changelog — Production hardening (tool wiring & safety)

All notable changes in this release branch relative to prior `main` wiring behavior.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Production hardening

### Added

- Central tool ID contract (`clinicalToolIdContract.js`) with versioned tier lists and orchestrator maps.
- `clinicalToolRoutes.js` as SPA path authority; `CALCULATOR_ROUTE_DEFS` derived from `builtinUiCalculators`.
- Catalog launch pipeline: `resolveCatalogLaunch`, unknown-tool fallback, chat-seed guardrails (`clinicalCatalogWiring.js`).
- NLU alias sync module and CLI report (`clinicalToolAliasSync.js`, `npm run alias-sync:report`).
- Backend executor contracts, structured error codes, audit logging, `GET /tools/catalog/executors`.
- Clinical safety guardrails framework and production UI surface audits (`clinicalSafetyGuardrails.js`).
- E2E tool validation matrix (inventory builder, 136 tests, markdown docs).
- Report scripts: `e2e-matrix:report`, `safety-compliance:report`, `e2e-matrix:write-docs`.
- Docs: `clinical-tool-executors.md`, `clinical-safety-compliance.md`, `e2e-tool-validation-matrix.md`, QA/regression checklists.
- Tests: executor mapping audit, catalog launch expansion, production route tests, ToolsAreaFallback, catalog launch UI tests.

### Changed

- `App.jsx` — calculator routes from `CALCULATOR_ROUTE_DEFS`; `/tools/*` and `/fleet/*` use `ToolsAreaFallback`.
- `ClinicalToolCatalog.jsx` — search enrichment, tier badges, decision-support disclaimer, launch wiring.
- `clinicalIntentToolCatalog.js` — metadata safety framing; aligned tool names; guardrails on export.
- Chat-assisted configs (Wells PE, PERC, GRACE, NIHSS, C-spine, Ottawa, COPD, Rome IV, dispatch-ai) — safety appendices.
- `Calculators.jsx` — SOFA per-form disclaimer; hub decision-support lead unchanged in intent.
- `LabInterpreter.jsx` — explicit clinical decision-support disclaimer language.
- `package.json` — npm scripts for alias sync, catalog launch, executor mapping, safety, e2e matrix.
- Backend tool orchestrator service/controller — contract validation before execute; improved error payloads.

### Fixed

- Browser bundle break from re-exporting Node-only alias sync in `clinicalCatalogWiring.js`.
- Catalog unknown kebab-case launches routing to dashboard with empty seeds.
- Launch path mismatches for Tier B tools vs `expectedLaunchPath` contract.
- NLU `toolName` / backend pattern id mismatches affecting chat routing.
- Calculator route test brittleness (now asserts `CALCULATOR_ROUTE_DEFS.map` in App.jsx).

### Security / compliance

- Decision-support disclaimers required on catalog and tool pages.
- Fleet tools explicitly forbid auto-dispatch / auto-assign language in seeds and UI.
- No new dosing or anticoagulation directive strings in calculator outputs.

### Deprecated

- None.

### Removed

- None (phantom tool references remain documented, not removed from discovery scan).
