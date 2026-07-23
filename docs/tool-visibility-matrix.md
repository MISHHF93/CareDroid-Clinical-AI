# Tool Visibility Matrix

*Generated from shipped source on **2026-07-23**. Regenerate:* `npm run visibility-matrix:write-docs`

## Summary

| Metric | Value |
|--------|------:|
| Matrix rows | 242 |
| Sidebar registry tools | 242 |
| NLU clinical profiles | 219 |
| Built-in calculator forms | 92 |
| Backend POST executors | 39 |

### Status distribution

| Status | Count |
|--------|------:|
| archived route | 242 |

## Tier semantics

| Tier | Meaning |
|------|---------|
| **A** | Dedicated calculator form in `Calculators.jsx` |
| **B** | Chat-assisted hub card (no standalone form) |
| **C** | Full page + registered `POST /api/tools/:id/execute` |
| **clinical-page** | Protocols, diagnosis, procedures (chat-first pages) |
| **fleet-A** | Dedicated `/fleet/*` page |
| **fleet-B** | Dispatch intelligence via calculators hub |
| **hub** | Calculators overview (`/tools/calculators`) |
| **nlu-hub-only** | NLU profile with no dedicated `toolRegistry` row |

## Column definitions

| Column | Meaning |
|--------|---------|
| Canonical ID | Registry id or NLU `toolId` when profile-specific |
| Tier | Delivery tier (A/B/C, fleet, hub, nlu-hub-only) |
| Route | Primary SPA path from registry or NLU catalog |
| Calc slug | `Calculators.jsx` / `?calc=` slug when applicable |
| Registry / Catalog / Discovery | Row present in respective indexes |
| Sidebar | Listed in `toolRegistry.ts` (workspace may filter) |
| NLU / Pattern / Executor | Chat profile, `tool.patterns.ts`, POST execute |
| Component / Renders | Frontend module and user-visible UI |
| Launch OK | Catalog/sidebar launch resolves to a real destination |
| Status | Derived visibility classification |

## Full matrix

| Canonical ID | Display name | Category | Tier | Route | Calc slug | Registry | Catalog | Discovery | Sidebar | NLU | Pattern | Executor | Component | Renders | Launch OK | Status |
|--------------|--------------|----------|------|-------|-----------|----------|---------|-----------|---------|-----|---------|----------|-----------|---------|----------|--------|
| medical-3d-viewer | 3D Viewer | visualization | C | /3d-viewer | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| aa-gradient | A-a Gradient | calculator | C | /tools/calculators/aa-gradient | aa-gradient | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| abcd2 | ABCD² score | calculator | C | /tools/calculators/abcd2 | abcd2 | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| abg-interpreter | ABG Interpreter | diagnostic | C | /tools/lab-interpreter | — | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| acls-protocol | ACLS Protocol | calculator | clinical-page | /protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| acs-workflow-assistant | ACS Workflow Assistant | calculator | B | /tools/cardiology/acs-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| adjusted-body-weight | Adjusted Body Weight | calculator | A | /tools/calculators/adjusted-body-weight | adjusted-body-weight | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| ai-artifacts | AI Artifacts | ai system | ai-system | /artifacts | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-command-center | AI Command Center | ai system | ai-system | /ai-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-cost-optimization | AI Cost Optimization | ai system | ai-system | /costs | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-evaluation | AI Evaluation | ai system | ai-system | /ai-evaluation | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-explainability | AI Explainability | reference | C | /tools/ai-explainability | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| ai-gateway | AI Gateway | ai system | ai-system | /assistant | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-governance | AI Governance | ai system | ai-system | /ai-governance | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-memory | AI Memory | ai system | ai-system | /memory | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-tool-calling | AI Tool Calling | ai system | ai-system | /assistant | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| ai-training | AI Training Pipeline | ai system | ai-system | /training | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| aki-staging-assistant | AKI Staging Assistant | calculator | B | /tools/nephrology/aki-staging-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| calculators | All calculators | calculator | hub | /tools/calculators | — | yes | yes | yes | yes | no | no | no | yes | yes | yes | archived route |
| ambient-scribe | Ambient Clinical Scribe | calculator | C | /tools/ambient-scribe | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| anion-gap | Anion Gap | calculator | C | /tools/calculators/anion-gap | anion-gap | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| antibiotic-guide | Antibiotic Guide | diagnostic | clinical-page | /tools/diagnosis | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| apache2-calculator | APACHE-II | calculator | C | /tools/calculators/apache-ii | apache-ii | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| apgar-score | Apgar score | calculator | A | /tools/calculators/apgar-score | apgar-score | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| apri | APRI | calculator | A | /tools/calculators/apri | apri | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| arrhythmia-risk-classifier | Arrhythmia Risk Classifier | diagnostic | C | /tools/cardiology/arrhythmia-risk-classifier | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| ascvd-risk | ASCVD 10-year risk | calculator | A | /tools/calculators/ascvd-risk | ascvd-risk | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| asset-tracking-dashboard | Asset Tracking Dashboard | hospital-operations | hospital-ops | /hospital-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| asthma-exacerbation-assistant | Asthma Exacerbation Assistant | calculator | B | /tools/pulmonology/asthma-exacerbation-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| asthma-severity-score | Asthma Severity Score | calculator | A | /tools/calculators/asthma-severity-score | asthma-severity-score | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| atls-protocol | ATLS Protocol | calculator | clinical-page | /protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| atrial-fibrillation-assistant | Atrial Fibrillation Assistant | calculator | B | /tools/cardiology/atrial-fibrillation-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| audit-c | AUDIT-C | calculator | A | /tools/calculators/audit-c | audit-c | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| bed-occupancy-calculator | Bed Occupancy Calculator | calculator | A | /tools/calculators/bed-occupancy-calculator | bed-occupancy-calculator | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| behavioral-analytics-dashboard | Behavioral Analytics Dashboard | reference | C | /tools/psychiatry/behavioral-analytics-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| bisap-score | BISAP score | calculator | A | /tools/calculators/bisap-score | bisap-score | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| bishop-score | Bishop score | calculator | A | /tools/calculators/bishop-score | bishop-score | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| calc-bmi | BMI | calculator | A | /tools/calculators/bmi | bmi | yes | yes | yes | yes | yes | no | no | yes | yes | no | archived route |
| bode-index | BODE Index | calculator | A | /tools/calculators/bode-index | bode-index | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| bsa | Body Surface Area | calculator | A | /tools/calculators/bsa | bsa | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| braden-scale | Braden scale | calculator | A | /tools/calculators/braden-scale | braden-scale | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| bun-creatinine-ratio | BUN/Creatinine Ratio | calculator | A | /tools/calculators/bun-creatinine-ratio | bun-creatinine-ratio | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| cage | CAGE | calculator | A | /tools/calculators/cage | cage | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| calculator-recommender-ai | Calculator Recommendation AI | calculator | clinical-page | /tools/calculator-recommender | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| canadian-c-spine | Canadian C-Spine Rule | calculator | C | /tools/calculators | — | yes | yes | yes | yes | yes | yes | yes | no | no | yes | archived route |
| capacity-prediction-engine | Capacity Prediction Engine | hospital-operations | hospital-ops | /hospital-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| cardiac-telemetry-analyzer | Cardiac Telemetry Analyzer | diagnostic | C | /tools/cardiology/cardiac-telemetry-analyzer | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| cardiology-command-center | Cardiology Command Center | diagnostic | C | /tools/cardiology/cardiology-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| centor-mcisaac | Centor / McIsaac | calculator | A | /tools/calculators/centor-mcisaac | centor-mcisaac | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| calc-chads2vasc | CHA₂DS₂-VASc | calculator | C | /tools/calculators/chads2vasc | chads2vasc | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| chads2 | CHADS2 | calculator | C | /tools/calculators/chads2 | chads2 | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| child-pugh | Child-Pugh | calculator | A | /tools/calculators/child-pugh | child-pugh | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| cirrhosis-monitoring-engine | Cirrhosis Monitoring Engine | reference | C | /tools/gastroenterology/cirrhosis-monitoring-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| ckd-progression-predictor | CKD Progression Predictor | reference | C | /tools/nephrology/ckd-progression-predictor | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| ckd-staging | CKD staging (KDIGO) | calculator | A | /tools/calculators/ckd-staging | ckd-staging | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| clinical-audit | Clinical Audit | reference | C | /tools/clinical-audit | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| clinical-decision-support | Clinical Decision Support Engine | diagnostic | C | /clinical-decision-support | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| clinical-documentation-assistant | Clinical Documentation Assistant | reference | C | /documentation | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| clinical-knowledge-graph | Clinical Knowledge Graph | reference | C | /knowledge-graph | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| cognitive-screening-assistant | Cognitive Screening Assistant | calculator | B | /tools/psychiatry/cognitive-screening-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| columbia-suicide-severity-workflow | Columbia Suicide Severity Workflow | calculator | A | /tools/calculators/columbia-suicide-severity-workflow | columbia-suicide-severity-workflow | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| competency-platform | Competency Platform | simulation | C | /competencies | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| continuous-glucose-command-center | Continuous Glucose Command Center | reference | C | /tools/endocrine/continuous-glucose-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| copd-gold | COPD GOLD | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| copd-gold-assessment | COPD GOLD Assessment | calculator | A | /tools/calculators/copd-gold-assessment | copd-gold-assessment | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| copd-workflow-assistant | COPD Workflow Assistant | calculator | B | /tools/pulmonology/copd-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| corrected-calcium | Corrected Calcium | calculator | C | /tools/calculators/corrected-calcium | corrected-calcium | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| corrected-sodium | Corrected Sodium | calculator | C | /tools/calculators/corrected-sodium | corrected-sodium | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| creatinine-clearance-cg | Creatinine Clearance (Cockcroft-Gault) | calculator | A | /tools/calculators/creatinine-clearance-cg | creatinine-clearance-cg | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| credentialing-platform | Credentialing Platform | simulation | C | /credentials | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| crisis-escalation-audit-log | Crisis Escalation Audit Log | reference | C | /tools/psychiatry/crisis-escalation-audit-log | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| curb65-calculator | CURB-65 | calculator | A | /tools/calculators/curb-65 | curb-65 | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| device-battery-intelligence | Device Battery Intelligence | iot | hospital-ops | /medical-iot | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| device-fleet-management | Device Fleet Management | hospital-operations | hospital-ops | /devices | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| device-maintenance | Device Maintenance | hospital-operations | hospital-ops | /devices | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| device-recommendation-assistant | Device Recommendation Assistant | hospital-operations | hospital-ops-B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| diabetes-care-assistant | Diabetes Care Assistant | calculator | B | /tools/endocrine/diabetes-care-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| diagnosis | Diagnosis Assistant | diagnostic | clinical-page | /tools/diagnosis | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| dialysis-readiness-helper | Dialysis Readiness Helper | reference | B | /tools/nephrology/dialysis-readiness-helper | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| dialysis-utilization-tracker | Dialysis Utilization Tracker | reference | C | /tools/nephrology/dialysis-utilization-tracker | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| differential-ai | Differential Diagnosis Assistant | diagnostic | C | /tools/differential-ai | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| dispatch-ai | Dispatch Intelligence | fleet | fleet-B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| dka-pathway-assistant | DKA Pathway Assistant | calculator | B | /tools/endocrine/dka-pathway-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| drug-check | Drug Checker | diagnostic | C | /tools/drug-checker | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | no | archived route |
| duke-treadmill-score | Duke Treadmill Score | calculator | C | /tools/calculators/duke-treadmill-score | duke-treadmill-score | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| ecg-interpretation-assistant | ECG Interpretation Assistant | calculator | B | /tools/cardiology/ecg-interpretation-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| ecg-trend-engine | ECG Trend Engine | diagnostic | C | /tools/cardiology/ecg-trend-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| eeg-trend-dashboard | EEG Trend Dashboard | reference | C | /tools/neurology/eeg-trend-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| calc-gfr | eGFR (CKD-EPI) | calculator | A | /tools/calculators/gfr | gfr | yes | yes | yes | yes | yes | no | no | yes | yes | no | archived route |
| egfr-ckd-epi | eGFR CKD-EPI 2021 | calculator | A | /tools/calculators/egfr-ckd-epi | egfr-ckd-epi | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| electrolyte-disorder-assistant | Electrolyte Disorder Assistant | calculator | B | /tools/nephrology/electrolyte-disorder-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| electrolyte-trend-engine | Electrolyte Trend Engine | reference | C | /tools/nephrology/electrolyte-trend-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| endocrine-monitoring-system | Endocrine Monitoring System | reference | C | /tools/endocrine/endocrine-monitoring-system | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| endoscopy-workflow-assistant | Endoscopy Workflow Assistant | reference | C | /tools/gastroenterology/endoscopy-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| epworth-sleepiness-scale | Epworth Sleepiness Scale | calculator | A | /tools/calculators/epworth-sleepiness-scale | epworth-sleepiness-scale | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| fena | FeNa | calculator | C | /tools/calculators/fena | fena | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| fenton-growth-chart-helper | Fenton Growth Chart Helper | calculator | A | /tools/calculators/fenton-growth-chart-helper | fenton-growth-chart-helper | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| feurea | FeUrea | calculator | C | /tools/calculators/feurea | feurea | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| fib4 | FIB-4 | calculator | A | /tools/calculators/fib4 | fib4 | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| fleet-command | Fleet Command | fleet | fleet-A | /fleet/command | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| fleet-live-map | Fleet Live Map | fleet | live-map | /fleet/map | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| fluid-balance-monitor | Fluid Balance Monitor | reference | C | /tools/nephrology/fluid-balance-monitor | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| four-score | FOUR Score | calculator | C | /tools/calculators/four-score | four-score | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| framingham-risk | Framingham CHD risk | calculator | C | /tools/calculators/framingham-risk | framingham-risk | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| free-water-deficit | Free Water Deficit | calculator | A | /tools/calculators/free-water-deficit | free-water-deficit | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| gad7 | GAD-7 | calculator | A | /tools/calculators/gad7 | gad7 | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| gestational-age-calculator | Gestational Age Calculator | calculator | A | /tools/calculators/gestational-age-calculator | gestational-age-calculator | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| gi-bleed-workflow-assistant | GI Bleed Workflow Assistant | calculator | B | /tools/gastroenterology/gi-bleed-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| gi-command-center | GI Command Center | reference | C | /tools/gastroenterology/gi-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| gi-surveillance-dashboard | GI Surveillance Dashboard | reference | C | /tools/gastroenterology/gi-surveillance-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| gcs-calculator | Glasgow Coma Scale (GCS) | calculator | C | /tools/calculators/gcs | gcs | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| glasgow-blatchford-score | Glasgow-Blatchford Score | calculator | A | /tools/calculators/glasgow-blatchford-score | glasgow-blatchford-score | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| glucose-telemetry-dashboard | Glucose Telemetry Dashboard | reference | C | /tools/endocrine/glucose-telemetry-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| grace-acs | GRACE ACS Risk | calculator | C | /tools/calculators | — | yes | yes | yes | yes | yes | yes | yes | no | no | yes | archived route |
| growth-trend-analytics | Growth Trend Analytics | reference | C | /tools/pediatrics-obgyn/growth-trend-analytics | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| guideline-rag | Guideline Retrieval + Evidence Engine | reference | C | /tools/guideline-rag | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| has-bled | HAS-BLED | calculator | C | /tools/calculators/has-bled | has-bled | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| hcm-sudden-death-risk | HCM Sudden Death Risk | calculator | A | /tools/calculators/hcm-sudden-death-risk | hcm-sudden-death-risk | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| headache-red-flag-assistant | Headache Red Flag Assistant | calculator | B | /tools/neurology/headache-red-flag-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| heart-failure-assistant | Heart Failure Assistant | calculator | B | /tools/cardiology/heart-failure-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| heart-failure-staging | Heart Failure Staging Helper | calculator | A | /tools/calculators/heart-failure-staging | heart-failure-staging | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| heart-score | HEART score | calculator | C | /tools/calculators/heart-score | heart-score | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| hepatic-trend-analytics | Hepatic Trend Analytics | reference | C | /tools/gastroenterology/hepatic-trend-analytics | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| homa-ir | HOMA-IR | calculator | A | /tools/calculators/homa-ir | homa-ir | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| hospital-command-assistant | Hospital Command Assistant | hospital-operations | hospital-ops-B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| hospital-map | Hospital Map | hospital-operations | hospital-ops | /hospital-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| hospital-operations-cockpit | Hospital Operations Cockpit | hospital-operations | hospital-ops | /hospital-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| hospital-operations-command | Hospital Operations Command | hospital-operations | hospital-ops | /hospital-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| hunt-hess-scale | Hunt-Hess Scale | calculator | C | /tools/calculators/hunt-hess-scale | hunt-hess-scale | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| ich-score | ICH Score | calculator | C | /tools/calculators/ich-score | ich-score | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| ideal-body-weight | Ideal Body Weight | calculator | A | /tools/calculators/ideal-body-weight | ideal-body-weight | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| incident-command-center | Incident Command Center | hospital-operations | hospital-ops | /hospital-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| insulin-trend-engine | Insulin Trend Engine | reference | C | /tools/endocrine/insulin-trend-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| order-set-ai | Intelligent Order Set Assistant | reference | C | /tools/order-set-ai | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| kfre | Kidney Failure Risk Equation | calculator | A | /tools/calculators/kfre | kfre | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| lab-interp | Lab Interpreter | diagnostic | C | /tools/lab-interpreter | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | no | archived route |
| laboratory-dashboard | Laboratory Dashboard | laboratory | C | /laboratory | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| live-tracking-map | Live Tracking Map | hospital-operations | live-map | /live-map | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| liver-disease-assistant | Liver Disease Assistant | calculator | B | /tools/gastroenterology/liver-disease-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| ai-security | LLM Security | ai system | ai-system | /security | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| maddrey-discriminant-function | Maddrey Discriminant Function | calculator | A | /tools/calculators/maddrey-discriminant-function | maddrey-discriminant-function | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| maternal-monitoring-dashboard | Maternal Monitoring Dashboard | reference | C | /tools/pediatrics-obgyn/maternal-monitoring-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| mdq | MDQ | calculator | A | /tools/calculators/mdq | mdq | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| medical-iot-dashboard | Medical IoT Dashboard | iot | medical-iot | /medical-iot | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| simulation-suite | Medical Simulation Suite | simulation | C | /simulation | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| dose-calculator | Medication Dose Calculator | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| meld | MELD | calculator | A | /tools/calculators/meld | meld | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| meld-na | MELD-Na | calculator | A | /tools/calculators/meld-na | meld-na | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| mental-health-screening-assistant | Mental Health Screening Assistant | calculator | B | /tools/psychiatry/mental-health-screening-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| metabolic-analytics | Metabolic Analytics | reference | C | /tools/endocrine/metabolic-analytics | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| metabolic-syndrome-assistant | Metabolic Syndrome Assistant | calculator | B | /tools/endocrine/metabolic-syndrome-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| mews | MEWS | calculator | C | /tools/calculators/mews | mews | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| mmse | MMSE | calculator | A | /tools/calculators/mmse | mmse | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| moca-placeholder-workflow | MoCA Placeholder Workflow | calculator | A | /tools/calculators/moca-placeholder-workflow | moca-placeholder-workflow | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| modified-rankin-scale | Modified Rankin Scale | calculator | C | /tools/calculators/modified-rankin-scale | modified-rankin-scale | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| moe-router | MoE Router | ai system | ai-system | /assistant | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| morse-fall-scale | Morse Fall Scale | calculator | A | /tools/calculators/morse-fall-scale | morse-fall-scale | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| neonatal-assessment-assistant | Neonatal Assessment Assistant | calculator | B | /tools/pediatrics-obgyn/neonatal-assessment-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| neonatal-bilirubin-risk-helper | Neonatal Bilirubin Risk Helper | calculator | A | /tools/calculators/neonatal-bilirubin-risk-helper | neonatal-bilirubin-risk-helper | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| neonatal-dashboard | Neonatal Dashboard | reference | C | /tools/pediatrics-obgyn/neonatal-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| neuro-exam-assistant | Neuro Exam Assistant | calculator | B | /tools/neurology/neuro-exam-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| neuro-monitoring-engine | Neuro Monitoring Engine | reference | C | /tools/neurology/neuro-monitoring-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| neuro-telemetry-dashboard | Neuro Telemetry Dashboard | reference | C | /tools/neurology/neuro-telemetry-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| neurology-timeline-ai | Neurology Timeline AI | reference | C | /tools/neurology/neurology-timeline-ai | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| news2 | NEWS2 | calculator | C | /tools/calculators/news2 | news2 | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| nexus-cspine | NEXUS C-Spine Rule | calculator | C | /tools/calculators | — | yes | yes | yes | yes | yes | yes | yes | no | no | yes | archived route |
| nihss | NIH Stroke Scale (NIHSS) | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| nihss-summary-view | NIHSS Summary View | calculator | A | /tools/calculators/nihss-summary-view | nihss-summary-view | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| ob-triage-assistant | OB Triage Assistant | calculator | B | /tools/pediatrics-obgyn/ob-triage-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| digital-operations-center | Operations Hub | hospital-operations | hospital-ops | /operations | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| osmolal-gap | Osmolal Gap | calculator | C | /tools/calculators/osmolal-gap | osmolal-gap | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| ottawa-ankle | Ottawa Ankle Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| oxygen-escalation-helper | Oxygen Escalation Helper | calculator | B | /tools/pulmonology/oxygen-escalation-helper | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pancreatitis-workflow-assistant | Pancreatitis Workflow Assistant | calculator | B | /tools/gastroenterology/pancreatitis-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pao2-fio2-ratio | PaO2/FiO2 Ratio | calculator | C | /tools/calculators/pao2-fio2-ratio | pao2-fio2-ratio | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| patient-summary-ai | Patient Summary AI | diagnostic | C | /tools/patient-summary-ai | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| timeline-ai | Patient Timeline AI | diagnostic | C | /tools/timeline-ai | — | yes | yes | yes | yes | no | no | no | yes | no | no | archived route |
| pcl5 | PCL-5 | calculator | A | /tools/calculators/pcl5 | pcl5 | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pecarn-head | PECARN Head Injury Rule | calculator | C | /tools/calculators | — | yes | yes | yes | yes | yes | yes | yes | no | no | yes | archived route |
| pediatric-bp-percentile | Pediatric BP Percentile | calculator | A | /tools/calculators/pediatric-bp-percentile | pediatric-bp-percentile | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pediatric-command-center | Pediatric Command Center | reference | C | /tools/pediatrics-obgyn/pediatric-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| pediatric-dose-safety-checker | Pediatric Dose Safety Checker | calculator | A | /tools/calculators/pediatric-dose-safety-checker | pediatric-dose-safety-checker | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pediatric-gcs | Pediatric GCS | calculator | A | /tools/calculators/pediatric-gcs | pediatric-gcs | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pediatric-sepsis-assistant | Pediatric Sepsis Assistant | calculator | B | /tools/pediatrics-obgyn/pediatric-sepsis-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| perc | PERC | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| perinatal-risk-dashboard | Perinatal Risk Dashboard | reference | C | /tools/pediatrics-obgyn/perinatal-risk-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| pews | PEWS | calculator | A | /tools/calculators/pews | pews | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| phq9 | PHQ-9 | calculator | A | /tools/calculators/phq9 | phq9 | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pneumonia-severity-index | Pneumonia Severity Index | calculator | A | /tools/calculators/pneumonia-severity-index | pneumonia-severity-index | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| population-screening-dashboard | Population Screening Dashboard | reference | C | /tools/psychiatry/population-screening-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| predictive-analytics-dashboard | Predictive Analytics Dashboard | reference | C | /predictive-analytics | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| predictive-maintenance | Predictive Maintenance Engine | fleet | fleet-A | /fleet/predictive-maintenance | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pregnancy-due-date-calculator | Pregnancy Due Date Calculator | calculator | A | /tools/calculators/pregnancy-due-date-calculator | pregnancy-due-date-calculator | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| pregnancy-workflow-assistant | Pregnancy Workflow Assistant | calculator | B | /tools/pediatrics-obgyn/pregnancy-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| procedures | Procedure Guide | calculator | clinical-page | /tools/procedures | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| protocols | Protocol and Clinical Pathway Library | calculator | clinical-page | /protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| psychiatry-monitoring-dashboard | Psychiatry Monitoring Dashboard | reference | C | /tools/psychiatry/psychiatry-monitoring-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| pulmonary-trend-engine | Pulmonary Trend Engine | reference | C | /tools/pulmonology/pulmonary-trend-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| qsofa | qSOFA (quick SOFA) | calculator | A | /tools/calculators/qsofa | qsofa | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| ai-rag | RAG Evidence Engine | ai system | ai-system | /tools/guideline-rag | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| ranson-criteria | Ranson criteria | calculator | A | /tools/calculators/ranson-criteria | ranson-criteria | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| rass | RASS | calculator | A | /tools/calculators/rass | rass | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| remote-cardiology-monitoring-dashboard | Remote Cardiology Monitoring Dashboard | diagnostic | C | /tools/cardiology/remote-cardiology-monitoring-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| renal-monitoring-dashboard | Renal Monitoring Dashboard | reference | C | /tools/nephrology/renal-monitoring-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| research-evidence-hub | Research and Evidence Hub | reference | C | /research | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| resource-allocation-assistant | Resource Allocation Assistant | hospital-operations | hospital-ops-B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| resource-utilization-index | Resource Utilization Index | calculator | A | /tools/calculators/resource-utilization-index | resource-utilization-index | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| respiratory-command-center | Respiratory Command Center | reference | C | /tools/pulmonology/respiratory-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| respiratory-telemetry-dashboard | Respiratory Telemetry Dashboard | reference | C | /tools/pulmonology/respiratory-telemetry-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| revised-trauma-score | Revised Trauma Score | calculator | C | /tools/calculators/revised-trauma-score | revised-trauma-score | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| reynolds-risk-score | Reynolds Risk Score Helper | calculator | C | /tools/calculators/reynolds-risk-score | reynolds-risk-score | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| rockall-score | Rockall Score | calculator | A | /tools/calculators/rockall-score | rockall-score | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| rome-iv-ibs | Rome IV IBS | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | archived route |
| route-optimizer | Route Optimization Engine | fleet | fleet-A | /fleet/route-optimizer | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| rox-index | ROX Index | calculator | C | /tools/calculators/rox-index | rox-index | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| screening-trend-engine | Screening Trend Engine | reference | C | /tools/psychiatry/screening-trend-engine | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| seizure-assistant | Seizure Assistant | calculator | B | /tools/neurology/seizure-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| serum-osmolality | Serum Osmolality | calculator | C | /tools/calculators/serum-osmolality | serum-osmolality | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| shock-index | Shock Index | calculator | C | /tools/calculators/shock-index | shock-index | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| competency-dashboard | Simulation Competency Dashboard | simulation | C | /simulation/outcomes | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| debrief-dashboard | Simulation Debrief Dashboard | simulation | C | /simulation/sepsis-deterioration | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| simulation-outcomes | Simulation Outcomes | simulation | C | /simulation/outcomes | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| scenario-player | Simulation Scenario Player | simulation | C | /simulation/sepsis-deterioration | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | archived route |
| sleep-apnea-analytics | Sleep Apnea Analytics | reference | C | /tools/pulmonology/sleep-apnea-analytics | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| sofa-score | SOFA Score | calculator | C | /tools/calculators/sofa | sofa | yes | yes | yes | yes | yes | yes | yes | yes | yes | no | archived route |
| staffing-ratio-calculator | Staffing Ratio Calculator | calculator | A | /tools/calculators/staffing-ratio-calculator | staffing-ratio-calculator | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| stemi-pathway-assistant | STEMI Pathway Assistant | calculator | B | /tools/cardiology/stemi-pathway-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| stop-bang | STOP-Bang | calculator | A | /tools/calculators/stop-bang | stop-bang | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| stroke-command-center | Stroke Command Center | reference | C | /tools/neurology/stroke-command-center | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| stroke-workflow-assistant | Stroke Workflow Assistant | calculator | B | /tools/neurology/stroke-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| substance-use-screening-assistant | Substance Use Screening Assistant | calculator | B | /tools/psychiatry/substance-use-screening-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| suicide-risk-workflow-assistant | Suicide Risk Workflow Assistant | calculator | B | /tools/psychiatry/suicide-risk-workflow-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| telemetry-monitoring | Telemetry Monitoring Center | hospital-operations | hospital-ops | /medical-iot | — | yes | yes | yes | yes | no | no | no | yes | no | yes | archived route |
| thyroid-disorder-assistant | Thyroid Disorder Assistant | calculator | B | /tools/endocrine/thyroid-disorder-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| timi-ua-nstemi | TIMI (UA/NSTEMI) | calculator | C | /tools/calculators/timi-ua-nstemi | timi-ua-nstemi | yes | yes | yes | yes | yes | yes | yes | yes | no | no | archived route |
| turnaround-time-calculator | Turnaround Time Calculator | calculator | A | /tools/calculators/turnaround-time-calculator | turnaround-time-calculator | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| ventilator-monitoring-dashboard | Ventilator Monitoring Dashboard | reference | C | /tools/pulmonology/ventilator-monitoring-dashboard | — | yes | yes | yes | yes | yes | yes | no | yes | no | no | archived route |
| ventilator-support-assistant | Ventilator Support Assistant | reference | B | /tools/pulmonology/ventilator-support-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| vertigo-hints-assistant | Vertigo HINTS Assistant | calculator | B | /tools/neurology/vertigo-hints-assistant | — | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| waist-hip-ratio | Waist-to-Hip Ratio | calculator | A | /tools/calculators/waist-hip-ratio | waist-hip-ratio | yes | yes | yes | yes | yes | yes | no | yes | yes | no | archived route |
| wells-dvt-calculator | Wells DVT | calculator | C | /tools/calculators | — | yes | yes | yes | yes | yes | yes | yes | yes | no | yes | archived route |
| wells-pe | Wells PE | calculator | C | /tools/calculators | — | yes | yes | yes | yes | yes | yes | yes | no | no | yes | archived route |

## Recommended code fixes (priority order)

1. **NLU hub-only sidebar rows** — Add `toolRegistry.ts` entries (or a collapsible “More calculators” group) for `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator` mapped to hub + chat launch (`applyRegistryToolLaunch`).
2. **Secondary NLU profiles** — Optional dedicated sidebar rows for ACLS/ATLS, ABG, dose calculator, antibiotic guide (currently catalog + parent page only).
3. **`dispatch-ai` catalog flag** — use `backendRouted` for NLU/chat support and `postExecutable` for POST `/api/tools/:id/execute` badges.
4. **Duplicate shortcut labels** — Deduplicate `shortcut` strings in `toolRegistry.ts` (PERC/PHQ-9, GRACE/GAD-7, etc.) even if global hotkeys are not wired yet.
5. **Account route discoverability** — Link `Profile` ? `/profile-settings`, `Settings` ? `/notifications`; expose `/gdpr` and `/hipaa` from AppShell/header-help navigation if they need authenticated discovery.
6. **Cost analytics nav** — Add sidebar or Analytics sub-link to `/costs` for `VIEW_ANALYTICS` users.
7. **Onboarding / biometric routes** — Link from `ProfileSettings` or `Settings` to `/onboarding` and `/biometric-setup` when product-ready.

## Verification

```bash
npm run test:visibility-matrix
npm run visibility-matrix:write-docs
npm run inventory:report
```

See also: `docs/e2e-tool-validation-matrix.md`, `docs/backend-frontend-tool-contract.md`, `docs/tool-render-execute-matrix.md`.

