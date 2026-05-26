# Platform Integration Report

Date: 2026-05-26

## Scope

This report documents the complete platform wiring pass for the CareDroid clinical AI tool surface. The pass covered the canonical tool registry, normalized inventory, NLU launch catalog, catalog wiring, calculator hub visibility contracts, medical tools catalog index, source-code discovery inventory, backend intent patterns, route resolution, platform endpoint references, responsive QA coverage, and production-readiness verification.

## Wiring Updates

- Canonicalized AI Memory launches to `/ai-memory` while preserving the legacy `/memory` route in the application.
- Added AI Governance and LLM Security as first-class AI system tools with registry rows, NLU catalog rows, backend intent patterns, launch aliases, source-discovery aliases, responsive QA rows, and catalog launch allowlist coverage.
- Connected AI Governance to `GET /api/ai-governance/summary` and LLM Security to `GET /api/security/summary` in the platform capability inventory.
- Kept governance legacy routes (`/governance/ai`, `/governance/ai-security`) as platform route aliases without duplicating the canonical `/ai-governance` and `/security` launch paths.
- Marked platform-system catalog rows with route aliases and API-backed access where endpoints are declared.
- Added concrete component references for AI system inventory records so tool visibility audits do not produce component-missing or orphan rows.
- Expanded backend route inventory coverage to include scanned platform, governance, audit, privacy, hospital-map, fleet, profile workspace, and medical-IoT controller routes.
- Added responsive QA coverage for canonical AI system pages, legacy aliases, enterprise governance routes, and governance sub-routes used by smoke tests.

## Coverage Matrix

| Requirement | Status | Evidence |
| --- | --- | --- |
| All tools visible in `/tools` | Verified | `ToolsOverview` visibility tests and catalog/index audits render one launchable card per canonical user-facing tool and exclude audit-only rows. |
| AI assistant launches tools | Verified | `clinicalCatalogWiring`, `nluLaunchPaths`, and backend chat/tool-calling integration tests resolve AI system tools, chat-assisted tools, and direct tool hints without null launch data. |
| Routes resolve | Verified | Production route tests cover registry paths, dynamic specialty routes, calculator slugs, platform aliases, `/ai-memory`, `/ai-governance`, `/security`, and `/ai-command-center`. |
| Backend endpoints connect | Verified | Backend controller scan, backend/frontend exposure audit, and route inventory now agree on scanned Nest controllers and declared platform endpoints. |
| No null returns | Verified | Launch and inventory tests assert non-null paths, registry IDs, chat seeds, and source rows for launchable records. |
| No duplicate routes | Verified | Cross-pack validation allows only documented shared hubs and validates unique canonical IDs. |
| No orphan code | Verified | Backend orphan audit, controller route scan, source discovery, executor mapping, and visibility audits pass. |
| Mobile responsiveness | Verified | Responsive QA matrix includes core smoke routes, AI Memory canonical and legacy routes, Governance/Security routes, enterprise governance routes, fleet routes, and Tier A calculator routes. |
| Theme consistency | Verified | New rows reuse existing AI System, tool catalog, and platform dashboard components/styles; production build emits existing CSS chunks with no new isolated theme system. |

## Verification

Focused wiring verification:

```text
npm test -- src/data/clinicalToolIdContract.test.js src/data/toolInventory.test.js src/data/clinicalCatalogLaunch.test.js src/data/clinicalCatalogWiring.test.js src/data/medicalToolsCatalogIndex.test.js src/data/sourceCodeToolDiscovery.test.js src/data/platformSystemsExpansionPlan.test.js src/data/responsiveQaMatrix.test.js --run
```

Result: 8 test files passed, 857 tests passed.

Expanded audit verification:

```text
npm test -- src/data/nluLaunchPaths.test.js src/data/sidebarToolPresentation.test.js src/data/completeToolVisibilityAudit.test.js src/data/executorMappingAudit.test.js src/routes/clinicalToolRoutes.production.test.js src/data/capabilityExposureMatrix.test.js src/data/medicalExpansionCrossPackValidation.test.js --run
npm test -- src/data/backendControllerRouteScan.test.js src/data/backendOrphanAudit.test.js --run
npm test -- src/test/responsiveRegression.coverage.test.js src/data/responsiveQaMatrix.test.js --run
```

Result: all focused audit clusters passed.

Full verification:

```text
npm run test:run:frontend
cd backend && npm test
npm run lint:all
npm run build
cd backend && npm run build
```

Results:

- Frontend tests: 293 test files passed, 8,743 tests passed.
- Backend tests: 92 test suites passed, 769 tests passed.
- Lint: passed with 0 errors; existing warnings remain.
- Frontend production build: passed, including asset validation.
- Backend production build: passed.
