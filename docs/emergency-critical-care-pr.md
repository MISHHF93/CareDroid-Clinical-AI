# Emergency & Critical Care Expansion Module

## 1. Executive Summary

This PR adds the Emergency & Critical Care package to CareDroid Clinical AI while preserving the existing React/Vite SPA calculator hub, unified inventory, canonical `/tools` catalog, `/tools/calculators` filtered view, and backend medical-control-plane intent pattern architecture.

The implementation promotes APACHE II, CURB-65, and Glasgow Coma Scale from hub-only chat entries to dedicated calculator routes, adds full UI calculators for MEWS, Revised Trauma Score, and PEWS, and keeps Wells DVT as a guided chat-assisted workflow. Existing qSOFA, NEWS2, SOFA, Shock Index, NIHSS, Canadian C-Spine, Ottawa Ankle, PERC, Wells PE, NEXUS C-Spine, PECARN Head Injury, HEART, and GRACE ACS wiring remains integrated through the canonical registry and launch system.

## 2. Tool Inventory

Tier A full UI calculators:

- qSOFA
- NEWS2
- SOFA
- APACHE II
- CURB-65
- MEWS
- Glasgow Coma Scale (GCS)
- Shock Index
- Revised Trauma Score
- Pediatric Early Warning Score (PEWS)

Tier B chat-assisted tools:

- NIH Stroke Scale (NIHSS)
- Canadian C-Spine Rule
- Ottawa Ankle Rule
- PERC Rule
- Wells PE
- Wells DVT
- NEXUS C-Spine
- PECARN Head Injury
- HEART Score
- GRACE ACS

## 3. Tier A Calculator Details

The added calculator UI follows the existing calculator shell pattern with required inputs, result panels, interpretation panels, risk categories, warning sections, references, mobile-compatible form grids, and clinical decision support disclaimers.

New dedicated routes:

- `/tools/calculators/apache-ii`
- `/tools/calculators/curb-65`
- `/tools/calculators/gcs`
- `/tools/calculators/mews`
- `/tools/calculators/revised-trauma-score`
- `/tools/calculators/pews`

Existing Tier A routes retained:

- `/tools/calculators/qsofa`
- `/tools/calculators/news2`
- `/tools/calculators/sofa`
- `/tools/calculators/shock-index`

## 4. Tier B Chat Tool Details

Tier B tools continue to launch through the calculator hub and chat workflow using `chatSeed`, `nluCalculatorHubOnly`, and canonical launch resolution where appropriate. Wells DVT remains hub-assisted and now includes a structured prompt that asks for missing inputs, summarizes entered findings, calculates the score, explains interpretation, states limitations, cites references, and warns: "Clinical decision support only. Not a diagnosis."

Existing guided chat tools remain wired through the catalog:

- NIHSS
- Canadian C-Spine
- Ottawa Ankle
- PERC
- Wells PE
- NEXUS C-Spine
- PECARN Head Injury
- GRACE ACS

HEART Score remains an existing dedicated calculator route with catalog/chat launch support already present in CareDroid.

## 5. Clinical References

- Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801-810.
- Royal College of Physicians. National Early Warning Score (NEWS) 2.
- Vincent JL, et al. The SOFA score to describe organ dysfunction/failure. Intensive Care Med. 1996.
- Knaus WA, et al. APACHE II. Crit Care Med. 1985;13(10):818-829.
- Lim WS, et al. Defining community acquired pneumonia severity on presentation to hospital. Thorax. 2003;58:377-382.
- Subbe CP, et al. Validation of a modified Early Warning Score in medical admissions. QJM. 2001;94(10):521-526.
- Teasdale G, Jennett B. Assessment of coma and impaired consciousness. Lancet. 1974;2:81-84.
- Champion HR, et al. A revision of the Trauma Score. J Trauma. 1989;29(5):623-629.
- Monaghan A. Detecting and managing deterioration in children. Arch Dis Child. 2005;90:297-301.
- Wells PS, et al. Clinical prediction rules for DVT/PE validation studies.
- Kline JA, et al. PERC rule validation literature.
- Antman EM, et al. TIMI/ACS risk score literature; Six AJ, et al. HEART score literature.
- GRACE investigators. Global Registry of Acute Coronary Events risk model literature.
- PECARN, NEXUS, Canadian C-Spine, and Ottawa Ankle original validation publications.

## 6. Routes Added

- `/tools/calculators/apache-ii`
- `/tools/calculators/curb-65`
- `/tools/calculators/gcs`
- `/tools/calculators/mews`
- `/tools/calculators/revised-trauma-score`
- `/tools/calculators/pews`

## 7. Inventory Changes

Updated frontend synchronization points:

- `src/data/toolRegistry.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/sourceCodeToolDiscovery.js`
- `src/data/medicalToolsCatalogIndex.js`
- `src/data/calculatorHubManifest.js`
- `src/data/clinicalToolIdContract.js`
- `src/routes/clinicalToolRoutes.js`

The catalog remains registry-derived. No duplicate routes or isolated components were added.

## 8. Backend Changes

Updated backend intent pattern coverage in:

- `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`

Added backend NLU pattern entries for:

- MEWS
- Revised Trauma Score
- PEWS

Existing APACHE II, CURB-65, GCS, Wells PE, Wells DVT, PERC, NIHSS, Canadian C-Spine, Ottawa Ankle, PECARN, NEXUS, HEART, and GRACE pattern coverage remains synchronized with frontend IDs.

## 9. Safety Notes

All added calculators include:

- "This tool supports clinical assessment and does not replace physician judgment."
- Clinical decision support only wording.
- Required-field validation.
- Empty and invalid input handling.
- Warning panels.
- Reference sections.

PEWS includes pediatric caution labeling. No drug-dosing recommendations were added, and missing values are not invented.

## 10. Test Results

Passed:

- `npm run test:run -- src/utils/emergencyCriticalCareCalculators.test.js src/data/emergencyCriticalCareWiring.test.js src/data/clinicalCatalogLaunch.test.js src/pages/tools/Calculators.formSmoke.test.jsx`
- `npm run test:registry-launch`
- `npm run test:catalog-launch`
- `npm run test:alias-sync`
- `npm run lint` (passes with existing warnings)
- `npm run build`
- `cd backend; npm run build`
- `cd backend; npm test`

## 11. Remaining Future Work

- Add optional exact raw-value APACHE II input calculators for every physiology variable while retaining point-band validation.
- Add dedicated full UI forms for selected Tier B tools if product priorities change.
- Add Playwright responsive screenshots for the new calculator routes at 320px, 390px, 412px, tablet, and desktop breakpoints.
- Extend backend executor support only if a registered NestJS executor is explicitly required for these local calculators.
