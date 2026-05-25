# Medical Expansion Cross-Pack Validation

## Scope

This document covers category packs 2 through 10 as defined by `MEDICAL_EXPANSION_CATEGORY_PACKS` in `src/data/clinicalToolIdContract.js`:

- Emergency Critical Care
- Pulmonology
- Nephrology
- Hepatology and Gastroenterology
- Endocrine and Metabolic
- Neurology
- Pediatrics and OB-GYN
- Psychiatry and Screening
- Hospital Operations, Medical IoT, and Fleet

The validation goal is that every category-pack tool is discoverable, launchable, mobile-safe, tested, and honest about backend support.

## Validation Contract

The aggregate guard is `src/data/medicalExpansionCrossPackValidation.test.js`. It verifies:

- Every pack tool has a canonical inventory ID and `toolRegistry.js` row.
- Every user-facing tool appears in the `/tools` catalog inventory and source discovery index.
- Every Tier A calculator launches through `/tools/calculators/*` and has a built-in form smoke hook or documented placeholder copy.
- Every Tier B tool has `chatSeed`, chat-assisted navigation metadata, backend NLU pattern coverage, and no POST executor claim.
- Every Tier C dashboard, map, or engine has a route, component, contract matrix row, and backend/demo/unsupported safety state.
- Canonical IDs are unique, accidental duplicate routes are blocked, and only intentional shared surfaces are allowed (`/tools/calculators`, `/hospital-map`, `/medical-iot`).
- Backend executors are limited to the registered orchestrator tools in `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`.
- No pack tool has blank launch metadata or unsupported-planned UI state.
- Mobile-first widths are covered by `responsiveQaMatrix.js`, and app light/dark theme wiring remains present.
- Clinical, operational, and demo safety disclaimers remain visible in launch copy or registry metadata.

## Shared Route Policy

Some tools intentionally share command surfaces rather than owning separate routes:

- Tier B guided assistants share `/tools/calculators` as a launch surface and navigate to `/assistant` with seeded chat context.
- Hospital operations dashboards share `/hospital-map`.
- Device Battery Intelligence shares `/medical-iot`.

The cross-pack test treats other duplicate routes as accidental drift.

## Backend Executor Policy

Category-pack tools do not become POST executors unless a real backend `registerTool()` implementation exists. Current POST executors remain:

- `sofa-calculator`
- `drug-interactions`
- `lab-interpreter`

All other category-pack tools are local calculators, chat-assisted workflows, clinical page workflows, or demo/backend-contract surfaces.

## Verification Commands

Primary cross-pack validation:

```bash
npm run test:run -- src/data/medicalExpansionCrossPackValidation.test.js
```

Related inventory, route, responsive, and contract checks:

```bash
npm run test:run -- src/data/*ToolsPack.test.js src/data/hospitalOperationsIotFleetPack.test.js src/data/toolInventory.test.js src/data/medicalToolsCatalogIndex.test.js src/data/calculatorHubManifest.test.js src/data/clinicalToolIdContract.test.js src/data/toolContractMatrix.test.js src/data/responsiveQaMatrix.test.js src/routes/clinicalToolRoutes.test.js
npm run test:contract-matrix
npm run test:responsive-regression
```

Production readiness checks:

```bash
npm run lint
npm run build
cd backend && npm test
```
