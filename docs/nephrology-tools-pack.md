# Nephrology Clinical Tools Pack

## Summary

This pack adds nephrology calculators, guided assistants, and workflow dashboards through the existing CareDroid tool architecture:

- Unified inventory: `src/data/clinicalToolIdContract.js` and `src/data/toolInventory.js`
- Canonical launch resolution: `resolveCatalogLaunch()` and `applyRegistryToolLaunch()`
- Calculator hub and deep links: `/tools/calculators` and `/tools/calculators/:slug`
- Chat-assisted routes: `/tools/nephrology/:toolId`
- NLU catalog and backend keyword patterns: `clinicalIntentToolCatalog.js` and `tool.patterns.ts`
- Safety framing: tools are clinical decision support only and do not diagnose kidney disease, initiate dialysis, prescribe fluids, recommend electrolyte correction, or automate medication dosing.

## Tier A Calculators

| Tool | Registry ID | Route | Surface |
|---|---|---|---|
| eGFR CKD-EPI 2021 | `egfr-ckd-epi` | `/tools/calculators/egfr-ckd-epi` | Dedicated calculator form |
| Creatinine Clearance Cockcroft-Gault | `creatinine-clearance-cg` | `/tools/calculators/creatinine-clearance-cg` | Dedicated calculator form |
| FeNa | `fena` | `/tools/calculators/fena` | Dedicated calculator form |
| FeUrea | `feurea` | `/tools/calculators/feurea` | Dedicated calculator form |
| Kidney Failure Risk Equation | `kfre` | `/tools/calculators/kfre` | Dedicated calculator form |
| BUN/Creatinine Ratio | `bun-creatinine-ratio` | `/tools/calculators/bun-creatinine-ratio` | Dedicated calculator form |
| Corrected Sodium | `corrected-sodium` | `/tools/calculators/corrected-sodium` | Dedicated calculator form |
| Free Water Deficit | `free-water-deficit` | `/tools/calculators/free-water-deficit` | Dedicated calculator form |
| Osmolal Gap | `osmolal-gap` | `/tools/calculators/osmolal-gap` | Dedicated calculator form |
| Anion Gap | `anion-gap` | `/tools/calculators/anion-gap` | Existing dedicated calculator form |

## Tier B Assistants

These tools are registered as chat-assisted nephrology workflows. Their canonical detail routes are under `/tools/nephrology/:toolId`, and launch actions seed `/assistant` with renal safety guardrails.

- `aki-staging-assistant`
- `dialysis-readiness-helper`
- `electrolyte-disorder-assistant`

## Tier C Workflows

These tools are registered as Tier C nephrology workflows and use the shared nephrology workflow page for launch context and assistant seeding.

- `renal-monitoring-dashboard`
- `ckd-progression-predictor`
- `dialysis-utilization-tracker`
- `electrolyte-trend-engine`
- `fluid-balance-monitor`

## Backend Contract Scope

No new `/api/tools/:id/execute` executors were added. Nephrology tools are deterministic client-side calculators or chat-assisted workflows. Their catalog launches therefore resolve `orchestratorTool` to `null` unless a real backend executor is registered in the future.

## Safety Scope

The pack does not diagnose AKI, CKD, kidney failure, electrolyte etiology, acid-base disorder, or toxic alcohol ingestion. It does not recommend medication doses, renal dose adjustments, IV fluids, enteral water, diuretics, electrolyte replacement, sodium correction rates, dialysis initiation, dialysis prescription settings, ultrafiltration goals, transplant referral, admission, discharge, or disposition. Local AKI, nephrology, electrolyte, acid-base, toxicology, dialysis, and critical-care pathways take priority.

## Verification

Focused coverage was added for:

- Nephrology calculator helper logic: `src/utils/nephrologyCalculators.test.js`
- Inventory, routes, launch behavior, and backend-contract checks: `src/data/nephrologyToolsPack.test.js`
- Backend NLU pattern matching: `backend/test/tool-patterns-nephrology-pack.spec.ts`
