# Hepatology and Gastroenterology Tools Pack

This pack adds a hepatology/GI slice to the CareDroid clinical tool inventory. All tools are clinical decision support only: they do not establish diagnoses, recommend treatment, schedule procedures, determine transplant candidacy, or decide admission/discharge. Local emergency, GI bleed, pancreatitis, liver failure, endoscopy, and hepatology pathways take priority.

## Tier A Calculators

| Tool | Canonical ID | Formula / scoring basis | Unit handling | Safety scope |
| --- | --- | --- | --- | --- |
| Child-Pugh | `child-pugh` | Bilirubin, albumin, INR/PT, ascites, encephalopathy; class A/B/C | Bilirubin `mg/dL` or `umol/L`; albumin `g/dL` or `g/L` | Severity classification only; no treatment or transplant recommendation |
| MELD | `meld` | UNOS-style MELD: `10 * (0.957 ln Cr + 0.378 ln bili + 1.12 ln INR + 0.643)` with lab clamps | Bilirubin and creatinine `mg/dL` or `umol/L`; dialysis creatinine rule | Severity context only; no transplant listing or therapy recommendation |
| MELD-Na | `meld-na` | MELD plus UNOS sodium adjustment with sodium clamp 125-140 mEq/L | MELD units plus sodium `mEq/L` | Severity context only; no transplant listing or therapy recommendation |
| Maddrey Discriminant Function | `maddrey-discriminant-function` | `4.6 * (patient PT - control PT) + bilirubin mg/dL`; severe-range threshold `>=32` | Bilirubin `mg/dL` or `umol/L` | Alcoholic hepatitis risk marker only; no steroid, admission, discharge, or transplant recommendation |
| FIB-4 | `fib4` | `(age * AST) / (platelets * sqrt(ALT))` | AST/ALT `U/L`; platelets `x10^9/L` | Fibrosis screening only; no cirrhosis diagnosis |
| APRI | `apri` | `((AST / AST ULN) / platelets) * 100` | AST and AST ULN `U/L`; platelets `x10^9/L` | Fibrosis screening only; no cirrhosis diagnosis |
| Ranson Criteria | `ranson-criteria` | 5 admission and 6 48-hour pancreatitis criteria | Conventional criteria labels | Historical pancreatitis severity context only |
| BISAP | `bisap-score` | BUN, impaired mental status, SIRS, age, pleural effusion | BUN threshold documented with SI equivalent | Early pancreatitis risk context only |
| Glasgow-Blatchford Score | `glasgow-blatchford-score` | BUN/urea, hemoglobin, SBP, pulse, melena, syncope, hepatic disease, cardiac failure | BUN `mmol/L` or `mg/dL`; hemoglobin `g/dL` or `g/L` | Upper GI bleed risk stratification only; no transfusion/endoscopy/disposition recommendation |
| Rockall Score | `rockall-score` | Age, shock, comorbidity, diagnosis, endoscopic stigmata | Categorical scoring | Upper GI bleed risk stratification only; no procedure/disposition recommendation |

## Tier B Assistants

| Tool | Canonical ID | Launch | Scope |
| --- | --- | --- | --- |
| Rome IV IBS Criteria | `rome-iv-ibs` | Chat-assisted from calculator hub | Informational criteria support; not an IBS diagnosis and not alarm-feature triage |
| GI Bleed Workflow Assistant | `gi-bleed-workflow-assistant` | Chat-assisted with `/tools/gastroenterology/:toolId` reference route | Organizes hemodynamics, GBS/Rockall context, medications, and handoff prompts; no treatment, endoscopy timing, or disposition recommendations |
| Liver Disease Assistant | `liver-disease-assistant` | Chat-assisted with `/tools/gastroenterology/:toolId` reference route | Organizes Child-Pugh, MELD/MELD-Na, Maddrey DF, FIB-4/APRI, trends, and missing data; no diagnosis, transplant, or therapy recommendations |
| Pancreatitis Workflow Assistant | `pancreatitis-workflow-assistant` | Chat-assisted with `/tools/gastroenterology/:toolId` reference route | Organizes Ranson, BISAP, organ-failure context, trends, and missing data; no fluids, antibiotics, procedures, ICU, or disposition recommendations |

## Tier C Workflows

| Tool | Canonical ID | Route | Scope |
| --- | --- | --- | --- |
| GI Surveillance Dashboard | `gi-surveillance-dashboard` | `/tools/gastroenterology/gi-surveillance-dashboard` | Endoscopy follow-up, pathology gaps, recall queues, and human review tracking |
| Hepatic Trend Analytics | `hepatic-trend-analytics` | `/tools/gastroenterology/hepatic-trend-analytics` | Synthetic function, cholestasis, platelets, MELD/Child-Pugh inputs, and missing labs |
| Endoscopy Workflow Assistant | `endoscopy-workflow-assistant` | `/tools/gastroenterology/endoscopy-workflow-assistant` | Indication, prep status, risk context, documentation, and follow-up queue support |
| Cirrhosis Monitoring Engine | `cirrhosis-monitoring-engine` | `/tools/gastroenterology/cirrhosis-monitoring-engine` | Decompensation features, liver scores, surveillance gaps, and review queues |
| GI Command Center | `gi-command-center` | `/tools/gastroenterology/gi-command-center` | Cross-workflow GI bleed, liver, pancreatitis, endoscopy, and surveillance queue overview |

## Inventory and Launch Wiring

- Canonical IDs live in `src/data/clinicalToolIdContract.js`.
- User-facing metadata lives in `src/data/toolRegistry.js`.
- NLU/chat catalog rows live in `src/data/clinicalIntentToolCatalog.js`.
- Backend intent patterns live in `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`.
- Tier A calculator routes resolve through `src/routes/clinicalToolRoutes.js` and render in `src/pages/tools/Calculators.jsx`.
- Tier B workflow launches resolve to `/assistant` with guarded chat seeds.
- Tier C workflow pages render through `src/pages/tools/GastroenterologyAssistantPage.jsx`.

## Verification

Focused coverage includes:

- `src/utils/hepatologyGiCalculators.test.js` for formulas, thresholds, and unit conversion.
- `src/data/hepatologyGiToolsPack.test.js` for inventory, resolver, launch mode, and workflow safety wiring.
- Existing drift tests for the canonical ID contract, backend pattern parity, calculator hub manifest, registry launch, and calculator form smoke coverage.
