# R10 Calculator Consolidation Report

## Scope

R10 consolidated frontend clinical calculator and scoring UI into the canonical `src/components/ClinicalCalculatorHub.tsx` registry and `src/components/calculators/` wrapper/save layer. Backend clinical score services were not moved. `caredroid.sqlite` was not touched.

## Calculator inventory

- Clinical Calculator Hub page | canonical re-export | `src/pages/emergency/ClinicalCalculatorHub.jsx`
- Clinical Calculator Hub component | canonical hub and `CALCULATORS` registry | `src/components/ClinicalCalculatorHub.tsx`
- Legacy Medical Calculators hub | wrapped as source form engine | `src/pages/tools/Calculators.jsx`
- qSOFA modal | complete, standardized save | `src/components/calculators/qSOFA.tsx`
- HEART Score modal | complete, standardized save | `src/components/calculators/HEARTScore.tsx`
- Pediatric Drug Calc modal | complete, standardized save | `src/components/calculators/PediatricDrugCalc.tsx`
- ClinicalScoreCalculator | complete reusable score modal, standardized save | `src/components/ClinicalScoreCalculator.jsx`
- PediatricDrugCalculator | complete legacy modal, standardized save | `src/components/PediatricDrugCalculator.jsx`
- Wells PE / PERC / GRACE / NIHSS / C-Spine / Ottawa / NEXUS / PECARN pack | complete, wrapped | `src/pages/tools/sourceBackedClinicalCalculators.jsx`
- PHQ-9 / GAD-7 pack | complete, wrapped | `src/pages/tools/mentalHealthCalculators.jsx`
- ASCVD / CKD / Stop-Bang / AUDIT-C pack | complete, wrapped | `src/pages/tools/pr4aCalculators.jsx`
- HEART / Centor / Bishop / Apgar / Braden / Morse / Ranson / BISAP / FIB-4 / Framingham pack | complete, wrapped | `src/pages/tools/pr8ClinicalBatchCalculators.jsx`
- APRI / Glasgow-Blatchford / Maddrey DF / Rockall pack | complete, wrapped | `src/pages/tools/hepatologyGiCalculators.jsx`
- ABCD2 score | complete, wrapped | `src/pages/tools/abcd2Calculator.jsx`
- Shock Index / Anion Gap / RASS pack | complete, wrapped | `src/pages/tools/nextWaveCalculators.jsx`
- GCS / CURB-65 / APACHE II / MEWS / RTS / PEWS pack | complete, wrapped | `src/pages/tools/emergencyCriticalCareCalculators.jsx`
- Cardiology risk pack | complete, wrapped | `src/pages/tools/cardiologyCalculators.jsx`
- Pulmonology pack | complete, wrapped | `src/pages/tools/pulmonologyCalculators.jsx`
- Nephrology pack | complete, wrapped | `src/pages/tools/nephrologyCalculators.jsx`
- Endocrine/metabolic pack | complete, wrapped | `src/pages/tools/endocrineMetabolicCalculators.jsx`
- Neurology helper pack | complete/partial workflows, wrapped | `src/pages/tools/neurologyCalculators.jsx`
- Pediatrics/OB pack | complete/partial workflows, wrapped | `src/pages/tools/pediatricsObgynCalculators.jsx`
- Psychiatry screening pack | complete/partial workflows, wrapped | `src/pages/tools/psychiatryScreeningCalculators.jsx`
- Hospital operations calculators | non-clinical, documented and left out of clinical hub | `src/pages/tools/hospitalOperationsCalculators.jsx`
- Calculator primitives | support UI only, left in place | `src/pages/tools/calculatorPrimitives.jsx`
- qSOFA utilities | support utility, left in place | `src/utils/qsofaCalculator.js`
- NEWS2 utilities | support utility, left in place | `src/utils/news2Calculator.js`
- Child-Pugh utilities | support utility, left in place | `src/utils/childPughCalculator.js`
- HAS-BLED utilities | support utility, left in place | `src/utils/hasBledCalculator.js`
- MELD utilities | support utility, left in place | `src/utils/meldCalculator.js`
- TIMI UA/NSTEMI utilities | support utility, left in place | `src/utils/timiUaNstemiCalculator.js`
- Wells PE utilities | support utility, left in place | `src/utils/wellsPeCalculator.js`
- PERC utilities | support utility, left in place | `src/utils/percCalculator.js`
- GRACE ACS utilities | support utility, left in place | `src/utils/graceAcsCalculator.js`
- NIHSS utilities | support utility, left in place | `src/utils/nihssCalculator.js`
- Canadian C-Spine utilities | support utility, left in place | `src/utils/canadianCSpineCalculator.js`
- Ottawa Ankle utilities | support utility, left in place | `src/utils/ottawaAnkleCalculator.js`
- NEXUS C-Spine utilities | support utility, left in place | `src/utils/nexusCSpineCalculator.js`
- PECARN Head utilities | support utility, left in place | `src/utils/pecarnHeadCalculator.js`
- ASCVD utilities | support utility, left in place | `src/utils/ascvdPceCalculator.js`
- CKD staging utilities | support utility, left in place | `src/utils/ckdStagingCalculator.js`
- AUDIT-C utilities | support utility, left in place | `src/utils/auditCCalculator.js`
- PHQ-9 utilities | support utility, left in place | `src/utils/phq9Calculator.js`
- GAD-7 utilities | support utility, left in place | `src/utils/gad7Calculator.js`
- Emergency critical care utilities | support utility, left in place | `src/utils/emergencyCriticalCareCalculators.js`
- Nephrology utilities | support utility, left in place | `src/utils/nephrologyCalculators.js`
- Endocrine/metabolic utilities | support utility, left in place | `src/utils/endocrineMetabolicCalculators.js`
- Pediatrics/OB utilities | support utility, left in place | `src/utils/pediatricsObgynCalculators.js`
- Psychiatry screening utilities | support utility, left in place | `src/utils/psychiatryScreeningCalculators.js`
- Pulmonology utilities | support utility, left in place | `src/utils/pulmonologyCalculators.js`
- Cardiology risk utilities | support utility, left in place | `src/utils/cardiologyRiskCalculators.js`
- HEART utilities | support utility, left in place | `src/utils/heartScoreCalculator.js`
- Centor/McIsaac utilities | support utility, left in place | `src/utils/centorMcisaacCalculator.js`
- Apgar utilities | support utility, left in place | `src/utils/apgarScoreCalculator.js`
- Bishop utilities | support utility, left in place | `src/utils/bishopScoreCalculator.js`
- Braden utilities | support utility, left in place | `src/utils/bradenScaleCalculator.js`
- Morse Fall utilities | support utility, left in place | `src/utils/morseFallScaleCalculator.js`
- BISAP utilities | support utility, left in place | `src/utils/bisapScoreCalculator.js`
- Ranson utilities | support utility, left in place | `src/utils/ransonCriteriaCalculator.js`
- FIB-4 utilities | support utility, left in place | `src/utils/fib4Calculator.js`
- Framingham utilities | support utility, left in place | `src/utils/framinghamRiskCalculator.js`
- Next-wave utilities | support utility, left in place | `src/utils/nextWaveCalculatorUtils.js`
- Hospital operations utilities | non-clinical support utility, left in place | `src/utils/hospitalOperationsCalculators.js`
- SOFA backend executor | backend service, left in place | `backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts`

## Moved, wrapped, or stubbed

- Wrapped the legacy calculator form engine with `src/components/calculators/LegacyCalculatorWrapper.jsx`.
- Converted `src/components/ClinicalCalculatorHub.tsx` from a compatibility re-export into the canonical registry hub.
- Changed `src/pages/emergency/ClinicalCalculatorHub.jsx` to a compatibility re-export of the canonical component.
- Registered complete/partial calculator forms through `CALCULATORS` using `ComponentType<{ patientId?: string; onClose: () => void }>` compatible components.
- Stub-only/chat-assisted entries from the calculator manifest now render searchable, categorized "Coming soon" components in the hub.
- Non-clinical hospital operations calculators were documented and excluded from the clinical hub.

## Registry status

`src/components/ClinicalCalculatorHub.tsx` exports `CALCULATORS` entries with:

- `id`
- `name`
- `description`
- `category`
- `component`
- `keywords`
- `timeCritical` when applicable

The registry is sourced from the existing calculator manifest, excludes operational calculators, applies direct component overrides for `qsofa`, `heart-score`, and `pediatric-dose-safety-checker`, and wraps all other complete/partial legacy calculator UIs.

## Save pattern status

- Added `src/components/calculators/calculatorSave.ts` with the shared R10 save pattern.
- Updated `src/store/emergencyStore.ts` so `addNote(patientId, noteText, staffId)` works while preserving existing `addNote(patientId, noteObject)` callers.
- Standardized Save buttons in:
  - `src/components/calculators/HEARTScore.tsx`
  - `src/components/calculators/qSOFA.tsx`
  - `src/components/calculators/PediatricDrugCalc.tsx`
  - `src/components/calculators/LegacyCalculatorWrapper.jsx`
  - `src/components/PediatricDrugCalculator.jsx`
  - `src/components/ClinicalScoreCalculator.jsx`
- Save now writes the score note and JSON detail note, dispatches warning alerts for critical score bands, and closes after save.

## Redirects

- `/tools/*` redirects through `ToolsRedirect` to `/emergency/tools?open=[id]`.
- `/calculators/*` redirects through `ToolsRedirect` to `/emergency/tools?open=[id]`.
- `/scores/*` now redirects through `ToolsRedirect` to `/emergency/tools?open=[id]`.
- `ClinicalCalculatorHub` reads `open`, `tool`, and `calc` query params and auto-opens the normalized calculator id.

## Verification

- `npx tsc --noEmit` passed.
- `npx vitest run src/components/ClinicalCalculatorHub.test.tsx src/components/PediatricDrugCalculator.test.jsx src/routing/canonicalRouteRedirects.test.js src/pages/tools/Calculators.route.test.jsx` passed: 4 files, 35 tests.
- Residual search confirmed active redirects for `/tools/*`, `/calculators/*`, and `/scores/*`.
- Residual search found no imports of the old emergency hub implementation path.
- `ReadLints` found no linter errors on edited files.

## Remaining risks

- Tool catalog/test fixtures still contain historical `/tools/calculators/:id` strings as registry metadata; active app routing now redirects those paths to the canonical hub.
- Legacy calculator form files remain under `src/pages/tools/` as wrapped implementation modules to avoid risky JSX rewrites.
- Backend SOFA executor remains backend-only by design.
