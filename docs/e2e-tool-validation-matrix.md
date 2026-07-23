# E2E tool validation matrix

Generated: 2026-07-23T04:23:12.432Z

## Summary

| Metric | Value |
|--------|-------|
| Total inventory rows | 242 |
| Registry tools | 242 |
| NLU supplemental rows | 0 |
| POST executors | 39 |
| Catalog coverage | 242 |
| Discovery coverage | 242 |

### Tier distribution (registry)

- **A**: 62
- **ai-system**: 12
- **B**: 38
- **C**: 101
- **clinical-page**: 7
- **fleet-A**: 3
- **fleet-B**: 1
- **hospital-ops**: 11
- **hospital-ops-B**: 3
- **hub**: 1
- **live-map**: 2
- **medical-iot**: 1

## Column definitions

| Column | Meaning |
|--------|---------|
| id | Canonical registry id or NLU-only profile id |
| tier | A / B / C / clinical-page / fleet-A / fleet-B / hub / nlu-hub-only |
| route | SPA path from registry or launch resolution |
| registry | Row exists in `toolRegistry.ts` |
| catalog | Row in `getMedicalToolsCatalogRows()` |
| discovery | Mentioned in `getAllDiscoveredTools()` |
| nlu | NLU profile in `clinicalIntentTools` |
| postExecutor | Registered POST `/api/tools/:id/execute` |
| launchPath | `resolveCatalogLaunch` path |
| testCoverage | Vitest files associated with the tool |

## Inventory

| id | tier | route | registry | catalog | discovery | nlu | postExecutor | launchPath | testCoverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aa-gradient | C | /tools/calculators/aa-gradient | yes | yes | yes | yes | yes | /tools/calculators/aa-gradient | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| abcd2 | C | /tools/calculators/abcd2 | yes | yes | yes | yes | yes | /tools/calculators/abcd2 | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| abg-interpreter | C | /tools/lab-interpreter | yes | yes | yes | yes | yes | /tools/lab-interpreter | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| acls-protocol | clinical-page | /protocols | yes | yes | yes | yes | — | /protocols | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| acs-workflow-assistant | B | /tools/cardiology/acs-workflow-assistant | yes | yes | yes | yes | — | /tools/cardiology/acs-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| adjusted-body-weight | A | /tools/calculators/adjusted-body-weight | yes | yes | yes | yes | — | /tools/calculators/adjusted-body-weight | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-artifacts | ai-system | /artifacts | yes | yes | yes | yes | — | /artifacts | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-command-center | ai-system | /ai-command-center | yes | yes | yes | yes | — | /ai-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-cost-optimization | ai-system | /costs | yes | yes | yes | yes | — | /costs | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-evaluation | ai-system | /ai-evaluation | yes | yes | yes | yes | — | /ai-evaluation | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-explainability | C | /tools/ai-explainability | yes | yes | yes | — | — | /tools/ai-explainability | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-gateway | ai-system | /assistant | yes | yes | yes | yes | — | /assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-governance | ai-system | /ai-governance | yes | yes | yes | yes | — | /ai-governance | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-memory | ai-system | /memory | yes | yes | yes | yes | — | /memory | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-rag | ai-system | /tools/guideline-rag | yes | yes | yes | yes | — | /tools/guideline-rag | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-security | ai-system | /security | yes | yes | yes | yes | — | /security | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-tool-calling | ai-system | /assistant | yes | yes | yes | yes | — | /assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ai-training | ai-system | /training | yes | yes | yes | yes | — | /training | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| aki-staging-assistant | B | /tools/nephrology/aki-staging-assistant | yes | yes | yes | yes | — | /tools/nephrology/aki-staging-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ambient-scribe | C | /tools/ambient-scribe | yes | yes | yes | — | — | /tools/ambient-scribe | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| anion-gap | C | /tools/calculators/anion-gap | yes | yes | yes | yes | yes | /tools/calculators/anion-gap | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| antibiotic-guide | clinical-page | /tools/diagnosis | yes | yes | yes | yes | — | /tools/diagnosis | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| apache2-calculator | C | /tools/calculators/apache-ii | yes | yes | yes | yes | yes | /tools/calculators/apache-ii | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| apgar-score | A | /tools/calculators/apgar-score | yes | yes | yes | yes | — | /tools/calculators/apgar-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| apri | A | /tools/calculators/apri | yes | yes | yes | yes | — | /tools/calculators/apri | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| arrhythmia-risk-classifier | C | /tools/cardiology/arrhythmia-risk-classifier | yes | yes | yes | yes | — | /tools/cardiology/arrhythmia-risk-classifier | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ascvd-risk | A | /tools/calculators/ascvd-risk | yes | yes | yes | yes | — | /tools/calculators/ascvd-risk | 13 files |
| asset-tracking-dashboard | hospital-ops | /hospital-map | yes | yes | yes | — | — | /hospital-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| asthma-exacerbation-assistant | B | /tools/pulmonology/asthma-exacerbation-assistant | yes | yes | yes | yes | — | /tools/pulmonology/asthma-exacerbation-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| asthma-severity-score | A | /tools/calculators/asthma-severity-score | yes | yes | yes | yes | — | /tools/calculators/asthma-severity-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| atls-protocol | clinical-page | /protocols | yes | yes | yes | yes | — | /protocols | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| atrial-fibrillation-assistant | B | /tools/cardiology/atrial-fibrillation-assistant | yes | yes | yes | yes | — | /tools/cardiology/atrial-fibrillation-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| audit-c | A | /tools/calculators/audit-c | yes | yes | yes | yes | — | /tools/calculators/audit-c | 13 files |
| bed-occupancy-calculator | A | /tools/calculators/bed-occupancy-calculator | yes | yes | yes | yes | — | /tools/calculators/bed-occupancy-calculator | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| behavioral-analytics-dashboard | C | /tools/psychiatry/behavioral-analytics-dashboard | yes | yes | yes | yes | — | /tools/psychiatry/behavioral-analytics-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| bisap-score | A | /tools/calculators/bisap-score | yes | yes | yes | yes | — | /tools/calculators/bisap-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| bishop-score | A | /tools/calculators/bishop-score | yes | yes | yes | yes | — | /tools/calculators/bishop-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| bode-index | A | /tools/calculators/bode-index | yes | yes | yes | yes | — | /tools/calculators/bode-index | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| braden-scale | A | /tools/calculators/braden-scale | yes | yes | yes | yes | — | /tools/calculators/braden-scale | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| bsa | A | /tools/calculators/bsa | yes | yes | yes | yes | — | /tools/calculators/bsa | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| bun-creatinine-ratio | A | /tools/calculators/bun-creatinine-ratio | yes | yes | yes | yes | — | /tools/calculators/bun-creatinine-ratio | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| cage | A | /tools/calculators/cage | yes | yes | yes | yes | — | /tools/calculators/cage | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| calc-bmi | A | /tools/calculators/bmi | yes | yes | yes | — | — | /tools/calculators/bmi | 5 files |
| calc-chads2vasc | C | /tools/calculators/chads2vasc | yes | yes | yes | yes (cha2ds2vasc-calculator) | yes | /tools/calculators/chads2vasc | 5 files |
| calc-gfr | A | /tools/calculators/gfr | yes | yes | yes | — | — | /tools/calculators/gfr | 5 files |
| calculator-recommender-ai | clinical-page | /tools/calculator-recommender | yes | yes | yes | yes | — | /tools/calculator-recommender | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| calculators | hub | /tools/calculators | yes | yes | yes | — | — | /tools/calculators | 6 files |
| canadian-c-spine | C | /tools/calculators | yes | yes | yes | yes | yes | /tools/calculators | 12 files |
| capacity-prediction-engine | hospital-ops | /hospital-map | yes | yes | yes | — | — | /hospital-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| cardiac-telemetry-analyzer | C | /tools/cardiology/cardiac-telemetry-analyzer | yes | yes | yes | yes | — | /tools/cardiology/cardiac-telemetry-analyzer | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| cardiology-command-center | C | /tools/cardiology/cardiology-command-center | yes | yes | yes | yes | — | /tools/cardiology/cardiology-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| centor-mcisaac | A | /tools/calculators/centor-mcisaac | yes | yes | yes | yes | — | /tools/calculators/centor-mcisaac | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| chads2 | C | /tools/calculators/chads2 | yes | yes | yes | yes | yes | /tools/calculators/chads2 | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| child-pugh | A | /tools/calculators/child-pugh | yes | yes | yes | yes | — | /tools/calculators/child-pugh | 6 files |
| cirrhosis-monitoring-engine | C | /tools/gastroenterology/cirrhosis-monitoring-engine | yes | yes | yes | yes | — | /tools/gastroenterology/cirrhosis-monitoring-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ckd-progression-predictor | C | /tools/nephrology/ckd-progression-predictor | yes | yes | yes | yes | — | /tools/nephrology/ckd-progression-predictor | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ckd-staging | A | /tools/calculators/ckd-staging | yes | yes | yes | yes | — | /tools/calculators/ckd-staging | 13 files |
| clinical-audit | C | /tools/clinical-audit | yes | yes | yes | — | — | /tools/clinical-audit | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| clinical-decision-support | C | /clinical-decision-support | yes | yes | yes | yes | — | /clinical-decision-support | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| clinical-documentation-assistant | C | /documentation | yes | yes | yes | yes | — | /documentation | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| clinical-knowledge-graph | C | /knowledge-graph | yes | yes | yes | yes | — | /knowledge-graph | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| cognitive-screening-assistant | B | /tools/psychiatry/cognitive-screening-assistant | yes | yes | yes | yes | — | /tools/psychiatry/cognitive-screening-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| columbia-suicide-severity-workflow | A | /tools/calculators/columbia-suicide-severity-workflow | yes | yes | yes | yes | — | /tools/calculators/columbia-suicide-severity-workflow | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| competency-dashboard | C | /simulation/outcomes | yes | yes | yes | yes | — | /simulation/outcomes | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| competency-platform | C | /competencies | yes | yes | yes | yes | — | /competencies | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| continuous-glucose-command-center | C | /tools/endocrine/continuous-glucose-command-center | yes | yes | yes | yes | — | /tools/endocrine/continuous-glucose-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| copd-gold | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 9 files |
| copd-gold-assessment | A | /tools/calculators/copd-gold-assessment | yes | yes | yes | yes | — | /tools/calculators/copd-gold-assessment | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| copd-workflow-assistant | B | /tools/pulmonology/copd-workflow-assistant | yes | yes | yes | yes | — | /tools/pulmonology/copd-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| corrected-calcium | C | /tools/calculators/corrected-calcium | yes | yes | yes | yes | yes | /tools/calculators/corrected-calcium | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| corrected-sodium | C | /tools/calculators/corrected-sodium | yes | yes | yes | yes | yes | /tools/calculators/corrected-sodium | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| creatinine-clearance-cg | A | /tools/calculators/creatinine-clearance-cg | yes | yes | yes | yes | — | /tools/calculators/creatinine-clearance-cg | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| credentialing-platform | C | /credentials | yes | yes | yes | yes | — | /credentials | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| crisis-escalation-audit-log | C | /tools/psychiatry/crisis-escalation-audit-log | yes | yes | yes | yes | — | /tools/psychiatry/crisis-escalation-audit-log | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| curb65-calculator | A | /tools/calculators/curb-65 | yes | yes | yes | yes | — | /tools/calculators/curb-65 | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| debrief-dashboard | C | /simulation/sepsis-deterioration | yes | yes | yes | yes | — | /simulation/sepsis-deterioration | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| device-battery-intelligence | hospital-ops | /medical-iot | yes | yes | yes | — | — | /medical-iot | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| device-fleet-management | hospital-ops | /devices | yes | yes | yes | — | — | /devices | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| device-maintenance | hospital-ops | /devices | yes | yes | yes | — | — | /devices | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| device-recommendation-assistant | hospital-ops-B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| diabetes-care-assistant | B | /tools/endocrine/diabetes-care-assistant | yes | yes | yes | yes | — | /tools/endocrine/diabetes-care-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| diagnosis | clinical-page | /tools/diagnosis | yes | yes | yes | yes (differential-diagnosis) | — | /tools/diagnosis | 5 files |
| dialysis-readiness-helper | B | /tools/nephrology/dialysis-readiness-helper | yes | yes | yes | yes | — | /tools/nephrology/dialysis-readiness-helper | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| dialysis-utilization-tracker | C | /tools/nephrology/dialysis-utilization-tracker | yes | yes | yes | yes | — | /tools/nephrology/dialysis-utilization-tracker | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| differential-ai | C | /tools/differential-ai | yes | yes | yes | yes | — | /tools/differential-ai | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| digital-operations-center | hospital-ops | /operations | yes | yes | yes | yes | — | /operations | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| dispatch-ai | fleet-B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 7 files |
| dka-pathway-assistant | B | /tools/endocrine/dka-pathway-assistant | yes | yes | yes | yes | — | /tools/endocrine/dka-pathway-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| dose-calculator | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| drug-check | C | /tools/drug-checker | yes | yes | yes | yes (drug-interactions) | yes | /tools/drug-checker | 5 files |
| duke-treadmill-score | C | /tools/calculators/duke-treadmill-score | yes | yes | yes | yes | yes | /tools/calculators/duke-treadmill-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ecg-interpretation-assistant | B | /tools/cardiology/ecg-interpretation-assistant | yes | yes | yes | yes | — | /tools/cardiology/ecg-interpretation-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ecg-trend-engine | C | /tools/cardiology/ecg-trend-engine | yes | yes | yes | yes | — | /tools/cardiology/ecg-trend-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| eeg-trend-dashboard | C | /tools/neurology/eeg-trend-dashboard | yes | yes | yes | yes | — | /tools/neurology/eeg-trend-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| egfr-ckd-epi | A | /tools/calculators/egfr-ckd-epi | yes | yes | yes | yes | — | /tools/calculators/egfr-ckd-epi | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| electrolyte-disorder-assistant | B | /tools/nephrology/electrolyte-disorder-assistant | yes | yes | yes | yes | — | /tools/nephrology/electrolyte-disorder-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| electrolyte-trend-engine | C | /tools/nephrology/electrolyte-trend-engine | yes | yes | yes | yes | — | /tools/nephrology/electrolyte-trend-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| endocrine-monitoring-system | C | /tools/endocrine/endocrine-monitoring-system | yes | yes | yes | yes | — | /tools/endocrine/endocrine-monitoring-system | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| endoscopy-workflow-assistant | C | /tools/gastroenterology/endoscopy-workflow-assistant | yes | yes | yes | yes | — | /tools/gastroenterology/endoscopy-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| epworth-sleepiness-scale | A | /tools/calculators/epworth-sleepiness-scale | yes | yes | yes | yes | — | /tools/calculators/epworth-sleepiness-scale | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| fena | C | /tools/calculators/fena | yes | yes | yes | yes | yes | /tools/calculators/fena | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| fenton-growth-chart-helper | A | /tools/calculators/fenton-growth-chart-helper | yes | yes | yes | yes | — | /tools/calculators/fenton-growth-chart-helper | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| feurea | C | /tools/calculators/feurea | yes | yes | yes | yes | yes | /tools/calculators/feurea | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| fib4 | A | /tools/calculators/fib4 | yes | yes | yes | yes | — | /tools/calculators/fib4 | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| fleet-command | fleet-A | /fleet/command | yes | yes | yes | yes | — | /fleet/command | 6 files |
| fleet-live-map | live-map | /fleet/map | yes | yes | yes | — | — | /fleet/map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| fluid-balance-monitor | C | /tools/nephrology/fluid-balance-monitor | yes | yes | yes | yes | — | /tools/nephrology/fluid-balance-monitor | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| four-score | C | /tools/calculators/four-score | yes | yes | yes | yes | yes | /tools/calculators/four-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| framingham-risk | C | /tools/calculators/framingham-risk | yes | yes | yes | yes | yes | /tools/calculators/framingham-risk | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| free-water-deficit | A | /tools/calculators/free-water-deficit | yes | yes | yes | yes | — | /tools/calculators/free-water-deficit | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| gad7 | A | /tools/calculators/gad7 | yes | yes | yes | yes | — | /tools/calculators/gad7 | 10 files |
| gcs-calculator | C | /tools/calculators/gcs | yes | yes | yes | yes | yes | /tools/calculators/gcs | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| gestational-age-calculator | A | /tools/calculators/gestational-age-calculator | yes | yes | yes | yes | — | /tools/calculators/gestational-age-calculator | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| gi-bleed-workflow-assistant | B | /tools/gastroenterology/gi-bleed-workflow-assistant | yes | yes | yes | yes | — | /tools/gastroenterology/gi-bleed-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| gi-command-center | C | /tools/gastroenterology/gi-command-center | yes | yes | yes | yes | — | /tools/gastroenterology/gi-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| gi-surveillance-dashboard | C | /tools/gastroenterology/gi-surveillance-dashboard | yes | yes | yes | yes | — | /tools/gastroenterology/gi-surveillance-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| glasgow-blatchford-score | A | /tools/calculators/glasgow-blatchford-score | yes | yes | yes | yes | — | /tools/calculators/glasgow-blatchford-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| glucose-telemetry-dashboard | C | /tools/endocrine/glucose-telemetry-dashboard | yes | yes | yes | yes | — | /tools/endocrine/glucose-telemetry-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| grace-acs | C | /tools/calculators | yes | yes | yes | yes | yes | /tools/calculators | 12 files |
| growth-trend-analytics | C | /tools/pediatrics-obgyn/growth-trend-analytics | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/growth-trend-analytics | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| guideline-rag | C | /tools/guideline-rag | yes | yes | yes | — | — | /tools/guideline-rag | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| has-bled | C | /tools/calculators/has-bled | yes | yes | yes | yes | yes | /tools/calculators/has-bled | 6 files |
| hcm-sudden-death-risk | A | /tools/calculators/hcm-sudden-death-risk | yes | yes | yes | yes | — | /tools/calculators/hcm-sudden-death-risk | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| headache-red-flag-assistant | B | /tools/neurology/headache-red-flag-assistant | yes | yes | yes | yes | — | /tools/neurology/headache-red-flag-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| heart-failure-assistant | B | /tools/cardiology/heart-failure-assistant | yes | yes | yes | yes | — | /tools/cardiology/heart-failure-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| heart-failure-staging | A | /tools/calculators/heart-failure-staging | yes | yes | yes | yes | — | /tools/calculators/heart-failure-staging | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| heart-score | C | /tools/calculators/heart-score | yes | yes | yes | yes | yes | /tools/calculators/heart-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| hepatic-trend-analytics | C | /tools/gastroenterology/hepatic-trend-analytics | yes | yes | yes | yes | — | /tools/gastroenterology/hepatic-trend-analytics | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| homa-ir | A | /tools/calculators/homa-ir | yes | yes | yes | yes | — | /tools/calculators/homa-ir | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| hospital-command-assistant | hospital-ops-B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| hospital-map | hospital-ops | /hospital-map | yes | yes | yes | — | — | /hospital-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| hospital-operations-cockpit | hospital-ops | /hospital-map | yes | yes | yes | — | — | /hospital-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| hospital-operations-command | hospital-ops | /hospital-map | yes | yes | yes | — | — | /hospital-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| hunt-hess-scale | C | /tools/calculators/hunt-hess-scale | yes | yes | yes | yes | yes | /tools/calculators/hunt-hess-scale | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ich-score | C | /tools/calculators/ich-score | yes | yes | yes | yes | yes | /tools/calculators/ich-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ideal-body-weight | A | /tools/calculators/ideal-body-weight | yes | yes | yes | yes | — | /tools/calculators/ideal-body-weight | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| incident-command-center | hospital-ops | /hospital-map | yes | yes | yes | — | — | /hospital-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| insulin-trend-engine | C | /tools/endocrine/insulin-trend-engine | yes | yes | yes | yes | — | /tools/endocrine/insulin-trend-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| kfre | A | /tools/calculators/kfre | yes | yes | yes | yes | — | /tools/calculators/kfre | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| lab-interp | C | /tools/lab-interpreter | yes | yes | yes | yes (lab-interpreter) | yes | /tools/lab-interpreter | 5 files |
| laboratory-dashboard | C | /laboratory | yes | yes | yes | yes | — | /laboratory | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| live-tracking-map | live-map | /live-map | yes | yes | yes | — | — | /live-map | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| liver-disease-assistant | B | /tools/gastroenterology/liver-disease-assistant | yes | yes | yes | yes | — | /tools/gastroenterology/liver-disease-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| maddrey-discriminant-function | A | /tools/calculators/maddrey-discriminant-function | yes | yes | yes | yes | — | /tools/calculators/maddrey-discriminant-function | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| maternal-monitoring-dashboard | C | /tools/pediatrics-obgyn/maternal-monitoring-dashboard | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/maternal-monitoring-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| mdq | A | /tools/calculators/mdq | yes | yes | yes | yes | — | /tools/calculators/mdq | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| medical-3d-viewer | C | /3d-viewer | yes | yes | yes | yes | — | /3d-viewer | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| medical-iot-dashboard | medical-iot | /medical-iot | yes | yes | yes | — | — | /medical-iot | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| meld | A | /tools/calculators/meld | yes | yes | yes | yes | — | /tools/calculators/meld | 7 files |
| meld-na | A | /tools/calculators/meld-na | yes | yes | yes | yes | — | /tools/calculators/meld-na | 7 files |
| mental-health-screening-assistant | B | /tools/psychiatry/mental-health-screening-assistant | yes | yes | yes | yes | — | /tools/psychiatry/mental-health-screening-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| metabolic-analytics | C | /tools/endocrine/metabolic-analytics | yes | yes | yes | yes | — | /tools/endocrine/metabolic-analytics | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| metabolic-syndrome-assistant | B | /tools/endocrine/metabolic-syndrome-assistant | yes | yes | yes | yes | — | /tools/endocrine/metabolic-syndrome-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| mews | C | /tools/calculators/mews | yes | yes | yes | yes | yes | /tools/calculators/mews | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| mmse | A | /tools/calculators/mmse | yes | yes | yes | yes | — | /tools/calculators/mmse | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| moca-placeholder-workflow | A | /tools/calculators/moca-placeholder-workflow | yes | yes | yes | yes | — | /tools/calculators/moca-placeholder-workflow | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| modified-rankin-scale | C | /tools/calculators/modified-rankin-scale | yes | yes | yes | yes | yes | /tools/calculators/modified-rankin-scale | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| moe-router | ai-system | /assistant | yes | yes | yes | yes | — | /assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| morse-fall-scale | A | /tools/calculators/morse-fall-scale | yes | yes | yes | yes | — | /tools/calculators/morse-fall-scale | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neonatal-assessment-assistant | B | /tools/pediatrics-obgyn/neonatal-assessment-assistant | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/neonatal-assessment-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neonatal-bilirubin-risk-helper | A | /tools/calculators/neonatal-bilirubin-risk-helper | yes | yes | yes | yes | — | /tools/calculators/neonatal-bilirubin-risk-helper | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neonatal-dashboard | C | /tools/pediatrics-obgyn/neonatal-dashboard | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/neonatal-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neuro-exam-assistant | B | /tools/neurology/neuro-exam-assistant | yes | yes | yes | yes | — | /tools/neurology/neuro-exam-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neuro-monitoring-engine | C | /tools/neurology/neuro-monitoring-engine | yes | yes | yes | yes | — | /tools/neurology/neuro-monitoring-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neuro-telemetry-dashboard | C | /tools/neurology/neuro-telemetry-dashboard | yes | yes | yes | yes | — | /tools/neurology/neuro-telemetry-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| neurology-timeline-ai | C | /tools/neurology/neurology-timeline-ai | yes | yes | yes | yes | — | /tools/neurology/neurology-timeline-ai | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| news2 | C | /tools/calculators/news2 | yes | yes | yes | yes | yes | /tools/calculators/news2 | 7 files |
| nexus-cspine | C | /tools/calculators | yes | yes | yes | yes | yes | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| nihss | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| nihss-summary-view | A | /tools/calculators/nihss-summary-view | yes | yes | yes | yes | — | /tools/calculators/nihss-summary-view | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ob-triage-assistant | B | /tools/pediatrics-obgyn/ob-triage-assistant | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/ob-triage-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| order-set-ai | C | /tools/order-set-ai | yes | yes | yes | — | — | /tools/order-set-ai | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| osmolal-gap | C | /tools/calculators/osmolal-gap | yes | yes | yes | yes | yes | /tools/calculators/osmolal-gap | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ottawa-ankle | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| oxygen-escalation-helper | B | /tools/pulmonology/oxygen-escalation-helper | yes | yes | yes | yes | — | /tools/pulmonology/oxygen-escalation-helper | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pancreatitis-workflow-assistant | B | /tools/gastroenterology/pancreatitis-workflow-assistant | yes | yes | yes | yes | — | /tools/gastroenterology/pancreatitis-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pao2-fio2-ratio | C | /tools/calculators/pao2-fio2-ratio | yes | yes | yes | yes | yes | /tools/calculators/pao2-fio2-ratio | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| patient-summary-ai | C | /tools/patient-summary-ai | yes | yes | yes | — | — | /tools/patient-summary-ai | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pcl5 | A | /tools/calculators/pcl5 | yes | yes | yes | yes | — | /tools/calculators/pcl5 | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pecarn-head | C | /tools/calculators | yes | yes | yes | yes | yes | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pediatric-bp-percentile | A | /tools/calculators/pediatric-bp-percentile | yes | yes | yes | yes | — | /tools/calculators/pediatric-bp-percentile | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pediatric-command-center | C | /tools/pediatrics-obgyn/pediatric-command-center | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/pediatric-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pediatric-dose-safety-checker | A | /tools/calculators/pediatric-dose-safety-checker | yes | yes | yes | yes | — | /tools/calculators/pediatric-dose-safety-checker | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pediatric-gcs | A | /tools/calculators/pediatric-gcs | yes | yes | yes | yes | — | /tools/calculators/pediatric-gcs | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pediatric-sepsis-assistant | B | /tools/pediatrics-obgyn/pediatric-sepsis-assistant | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/pediatric-sepsis-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| perc | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 8 files |
| perinatal-risk-dashboard | C | /tools/pediatrics-obgyn/perinatal-risk-dashboard | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/perinatal-risk-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pews | A | /tools/calculators/pews | yes | yes | yes | yes | — | /tools/calculators/pews | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| phq9 | A | /tools/calculators/phq9 | yes | yes | yes | yes | — | /tools/calculators/phq9 | 10 files |
| pneumonia-severity-index | A | /tools/calculators/pneumonia-severity-index | yes | yes | yes | yes | — | /tools/calculators/pneumonia-severity-index | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| population-screening-dashboard | C | /tools/psychiatry/population-screening-dashboard | yes | yes | yes | yes | — | /tools/psychiatry/population-screening-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| predictive-analytics-dashboard | C | /predictive-analytics | yes | yes | yes | yes | — | /predictive-analytics | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| predictive-maintenance | fleet-A | /fleet/predictive-maintenance | yes | yes | yes | yes | — | /fleet/predictive-maintenance | 6 files |
| pregnancy-due-date-calculator | A | /tools/calculators/pregnancy-due-date-calculator | yes | yes | yes | yes | — | /tools/calculators/pregnancy-due-date-calculator | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pregnancy-workflow-assistant | B | /tools/pediatrics-obgyn/pregnancy-workflow-assistant | yes | yes | yes | yes | — | /tools/pediatrics-obgyn/pregnancy-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| procedures | clinical-page | /tools/procedures | yes | yes | yes | yes | — | /tools/procedures | 5 files |
| protocols | clinical-page | /protocols | yes | yes | yes | yes (protocol-lookup) | — | /protocols | 5 files |
| psychiatry-monitoring-dashboard | C | /tools/psychiatry/psychiatry-monitoring-dashboard | yes | yes | yes | yes | — | /tools/psychiatry/psychiatry-monitoring-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| pulmonary-trend-engine | C | /tools/pulmonology/pulmonary-trend-engine | yes | yes | yes | yes | — | /tools/pulmonology/pulmonary-trend-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| qsofa | A | /tools/calculators/qsofa | yes | yes | yes | yes | — | /tools/calculators/qsofa | 7 files |
| ranson-criteria | A | /tools/calculators/ranson-criteria | yes | yes | yes | yes | — | /tools/calculators/ranson-criteria | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| rass | A | /tools/calculators/rass | yes | yes | yes | yes | — | /tools/calculators/rass | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| remote-cardiology-monitoring-dashboard | C | /tools/cardiology/remote-cardiology-monitoring-dashboard | yes | yes | yes | yes | — | /tools/cardiology/remote-cardiology-monitoring-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| renal-monitoring-dashboard | C | /tools/nephrology/renal-monitoring-dashboard | yes | yes | yes | yes | — | /tools/nephrology/renal-monitoring-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| research-evidence-hub | C | /research | yes | yes | yes | yes | — | /research | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| resource-allocation-assistant | hospital-ops-B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| resource-utilization-index | A | /tools/calculators/resource-utilization-index | yes | yes | yes | yes | — | /tools/calculators/resource-utilization-index | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| respiratory-command-center | C | /tools/pulmonology/respiratory-command-center | yes | yes | yes | yes | — | /tools/pulmonology/respiratory-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| respiratory-telemetry-dashboard | C | /tools/pulmonology/respiratory-telemetry-dashboard | yes | yes | yes | yes | — | /tools/pulmonology/respiratory-telemetry-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| revised-trauma-score | C | /tools/calculators/revised-trauma-score | yes | yes | yes | yes | yes | /tools/calculators/revised-trauma-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| reynolds-risk-score | C | /tools/calculators/reynolds-risk-score | yes | yes | yes | yes | yes | /tools/calculators/reynolds-risk-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| rockall-score | A | /tools/calculators/rockall-score | yes | yes | yes | yes | — | /tools/calculators/rockall-score | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| rome-iv-ibs | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 9 files |
| route-optimizer | fleet-A | /fleet/route-optimizer | yes | yes | yes | yes | — | /fleet/route-optimizer | 6 files |
| rox-index | C | /tools/calculators/rox-index | yes | yes | yes | yes | yes | /tools/calculators/rox-index | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| scenario-player | C | /simulation/sepsis-deterioration | yes | yes | yes | yes | — | /simulation/sepsis-deterioration | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| screening-trend-engine | C | /tools/psychiatry/screening-trend-engine | yes | yes | yes | yes | — | /tools/psychiatry/screening-trend-engine | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| seizure-assistant | B | /tools/neurology/seizure-assistant | yes | yes | yes | yes | — | /tools/neurology/seizure-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| serum-osmolality | C | /tools/calculators/serum-osmolality | yes | yes | yes | yes | yes | /tools/calculators/serum-osmolality | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| shock-index | C | /tools/calculators/shock-index | yes | yes | yes | yes | yes | /tools/calculators/shock-index | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| simulation-outcomes | C | /simulation/outcomes | yes | yes | yes | yes | — | /simulation/outcomes | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| simulation-suite | C | /simulation | yes | yes | yes | yes | — | /simulation | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| sleep-apnea-analytics | C | /tools/pulmonology/sleep-apnea-analytics | yes | yes | yes | yes | — | /tools/pulmonology/sleep-apnea-analytics | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| sofa-score | C | /tools/calculators/sofa | yes | yes | yes | yes (sofa-calculator) | yes | /tools/calculators/sofa | 6 files |
| staffing-ratio-calculator | A | /tools/calculators/staffing-ratio-calculator | yes | yes | yes | yes | — | /tools/calculators/staffing-ratio-calculator | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| stemi-pathway-assistant | B | /tools/cardiology/stemi-pathway-assistant | yes | yes | yes | yes | — | /tools/cardiology/stemi-pathway-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| stop-bang | A | /tools/calculators/stop-bang | yes | yes | yes | yes | — | /tools/calculators/stop-bang | 13 files |
| stroke-command-center | C | /tools/neurology/stroke-command-center | yes | yes | yes | yes | — | /tools/neurology/stroke-command-center | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| stroke-workflow-assistant | B | /tools/neurology/stroke-workflow-assistant | yes | yes | yes | yes | — | /tools/neurology/stroke-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| substance-use-screening-assistant | B | /tools/psychiatry/substance-use-screening-assistant | yes | yes | yes | yes | — | /tools/psychiatry/substance-use-screening-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| suicide-risk-workflow-assistant | B | /tools/psychiatry/suicide-risk-workflow-assistant | yes | yes | yes | yes | — | /tools/psychiatry/suicide-risk-workflow-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| telemetry-monitoring | hospital-ops | /medical-iot | yes | yes | yes | — | — | /medical-iot | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| thyroid-disorder-assistant | B | /tools/endocrine/thyroid-disorder-assistant | yes | yes | yes | yes | — | /tools/endocrine/thyroid-disorder-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| timeline-ai | C | /tools/timeline-ai | yes | yes | yes | — | — | /tools/timeline-ai | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| timi-ua-nstemi | C | /tools/calculators/timi-ua-nstemi | yes | yes | yes | yes | yes | /tools/calculators/timi-ua-nstemi | 7 files |
| turnaround-time-calculator | A | /tools/calculators/turnaround-time-calculator | yes | yes | yes | yes | — | /tools/calculators/turnaround-time-calculator | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ventilator-monitoring-dashboard | C | /tools/pulmonology/ventilator-monitoring-dashboard | yes | yes | yes | yes | — | /tools/pulmonology/ventilator-monitoring-dashboard | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| ventilator-support-assistant | B | /tools/pulmonology/ventilator-support-assistant | yes | yes | yes | yes | — | /tools/pulmonology/ventilator-support-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| vertigo-hints-assistant | B | /tools/neurology/vertigo-hints-assistant | yes | yes | yes | yes | — | /tools/neurology/vertigo-hints-assistant | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| waist-hip-ratio | A | /tools/calculators/waist-hip-ratio | yes | yes | yes | yes | — | /tools/calculators/waist-hip-ratio | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| wells-dvt-calculator | C | /tools/calculators | yes | yes | yes | yes | yes | /tools/calculators | clinicalToolAliasSync.test.ts, clinicalToolIdContract.test.ts, e2eToolValidationMatrix.test.ts, medicalToolsCatalogIndex.test.ts |
| wells-pe | C | /tools/calculators | yes | yes | yes | yes | yes | /tools/calculators | 8 files |

## Automated gates

```bash
npm run test:e2e-matrix
npm run e2e-matrix:report
```

See also: `docs/e2e-manual-qa-checklist.md`, `docs/e2e-regression-checklist.md`.

