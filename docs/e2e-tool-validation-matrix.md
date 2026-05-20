# E2E tool validation matrix

Generated: 2026-05-20T19:05:09.450Z

## Summary

| Metric | Value |
|--------|-------|
| Total inventory rows | 57 |
| Registry tools | 57 |
| NLU supplemental rows | 0 |
| POST executors | 3 |
| Catalog coverage | 57 |
| Discovery coverage | 57 |

### Tier distribution (registry)

- **A**: 27
- **B**: 10
- **C**: 3
- **clinical-page**: 7
- **fleet-A**: 3
- **fleet-B**: 1
- **hub**: 1
- **other**: 5

## Column definitions

| Column | Meaning |
|--------|---------|
| id | Canonical registry id or NLU-only profile id |
| tier | A / B / C / clinical-page / fleet-A / fleet-B / hub / nlu-hub-only |
| route | SPA path from registry or launch resolution |
| registry | Row exists in `toolRegistry.js` |
| catalog | Row in `getMedicalToolsCatalogRows()` |
| discovery | Mentioned in `getAllDiscoveredTools()` |
| nlu | NLU profile in `clinicalIntentTools` |
| postExecutor | Registered POST `/api/tools/:id/execute` |
| launchPath | `resolveCatalogLaunch` path |
| testCoverage | Vitest files associated with the tool |

## Inventory

| id | tier | route | registry | catalog | discovery | nlu | postExecutor | launchPath | testCoverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abcd2 | A | /tools/calculators/abcd2 | yes | yes | yes | yes | — | /tools/calculators/abcd2 | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| abg-interpreter | clinical-page | /tools/lab-interpreter | yes | yes | yes | yes | — | /tools/lab-interpreter | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| acls-protocol | clinical-page | /tools/protocols | yes | yes | yes | yes | — | /tools/protocols | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| antibiotic-guide | clinical-page | /tools/diagnosis | yes | yes | yes | yes | — | /tools/diagnosis | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| apache2-calculator | other | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| apgar-score | A | /tools/calculators/apgar-score | yes | yes | yes | yes | — | /tools/calculators/apgar-score | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| ascvd-risk | A | /tools/calculators/ascvd-risk | yes | yes | yes | yes | — | /tools/calculators/ascvd-risk | 13 files |
| atls-protocol | clinical-page | /tools/protocols | yes | yes | yes | yes | — | /tools/protocols | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| audit-c | A | /tools/calculators/audit-c | yes | yes | yes | yes | — | /tools/calculators/audit-c | 13 files |
| bisap-score | A | /tools/calculators/bisap-score | yes | yes | yes | yes | — | /tools/calculators/bisap-score | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| bishop-score | A | /tools/calculators/bishop-score | yes | yes | yes | yes | — | /tools/calculators/bishop-score | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| braden-scale | A | /tools/calculators/braden-scale | yes | yes | yes | yes | — | /tools/calculators/braden-scale | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| calc-bmi | A | /tools/calculator/bmi | yes | yes | yes | — | — | /tools/calculator/bmi | 5 files |
| calc-chads2vasc | A | /tools/calculator/chads2vasc | yes | yes | yes | yes (cha2ds2vasc-calculator) | — | /tools/calculator/chads2vasc | 5 files |
| calc-gfr | A | /tools/calculator/gfr | yes | yes | yes | — | — | /tools/calculator/gfr | 5 files |
| calculators | hub | /tools/calculators | yes | yes | yes | — | — | /tools/calculators | 6 files |
| canadian-c-spine | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| centor-mcisaac | A | /tools/calculators/centor-mcisaac | yes | yes | yes | yes | — | /tools/calculators/centor-mcisaac | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| child-pugh | A | /tools/calculators/child-pugh | yes | yes | yes | yes | — | /tools/calculators/child-pugh | 6 files |
| ckd-staging | A | /tools/calculators/ckd-staging | yes | yes | yes | yes | — | /tools/calculators/ckd-staging | 13 files |
| copd-gold | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 9 files |
| curb65-calculator | other | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| diagnosis | clinical-page | /tools/diagnosis | yes | yes | yes | yes (differential-diagnosis) | — | /tools/diagnosis | 5 files |
| dispatch-ai | fleet-B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 7 files |
| dose-calculator | other | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| drug-check | C | /tools/drug-checker | yes | yes | yes | yes (drug-interactions) | yes | /tools/drug-checker | 5 files |
| fib4 | A | /tools/calculators/fib4 | yes | yes | yes | yes | — | /tools/calculators/fib4 | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| fleet-command | fleet-A | /fleet/command | yes | yes | yes | yes | — | /fleet/command | 6 files |
| framingham-risk | A | /tools/calculators/framingham-risk | yes | yes | yes | yes | — | /tools/calculators/framingham-risk | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| gad7 | A | /tools/calculators/gad7 | yes | yes | yes | yes | — | /tools/calculators/gad7 | 10 files |
| gcs-calculator | other | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| grace-acs | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| has-bled | A | /tools/calculators/has-bled | yes | yes | yes | yes | — | /tools/calculators/has-bled | 6 files |
| heart-score | A | /tools/calculators/heart-score | yes | yes | yes | yes | — | /tools/calculators/heart-score | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| lab-interp | C | /tools/lab-interpreter | yes | yes | yes | yes (lab-interpreter) | yes | /tools/lab-interpreter | 5 files |
| meld | A | /tools/calculators/meld | yes | yes | yes | yes | — | /tools/calculators/meld | 7 files |
| meld-na | A | /tools/calculators/meld-na | yes | yes | yes | yes | — | /tools/calculators/meld-na | 7 files |
| morse-fall-scale | A | /tools/calculators/morse-fall-scale | yes | yes | yes | yes | — | /tools/calculators/morse-fall-scale | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| news2 | A | /tools/calculators/news2 | yes | yes | yes | yes | — | /tools/calculators/news2 | 7 files |
| nexus-cspine | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| nihss | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| ottawa-ankle | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| pecarn-head | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| perc | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 8 files |
| phq9 | A | /tools/calculators/phq9 | yes | yes | yes | yes | — | /tools/calculators/phq9 | 10 files |
| predictive-maintenance | fleet-A | /fleet/predictive-maintenance | yes | yes | yes | yes | — | /fleet/predictive-maintenance | 6 files |
| procedures | clinical-page | /tools/procedures | yes | yes | yes | yes | — | /tools/procedures | 5 files |
| protocols | clinical-page | /tools/protocols | yes | yes | yes | yes (protocol-lookup) | — | /tools/protocols | 5 files |
| qsofa | A | /tools/calculators/qsofa | yes | yes | yes | yes | — | /tools/calculators/qsofa | 7 files |
| ranson-criteria | A | /tools/calculators/ranson-criteria | yes | yes | yes | yes | — | /tools/calculators/ranson-criteria | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| rome-iv-ibs | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 9 files |
| route-optimizer | fleet-A | /fleet/route-optimizer | yes | yes | yes | yes | — | /fleet/route-optimizer | 6 files |
| sofa-score | C | /tools/calculator/sofa | yes | yes | yes | yes (sofa-calculator) | yes | /tools/calculator/sofa | 6 files |
| stop-bang | A | /tools/calculators/stop-bang | yes | yes | yes | yes | — | /tools/calculators/stop-bang | 13 files |
| timi-ua-nstemi | A | /tools/calculators/timi-ua-nstemi | yes | yes | yes | yes | — | /tools/calculators/timi-ua-nstemi | 7 files |
| wells-dvt-calculator | other | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, e2eToolValidationMatrix.test.js, medicalToolsCatalogIndex.test.js |
| wells-pe | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 8 files |

## Automated gates

```bash
npm run test:e2e-matrix
npm run e2e-matrix:report
```

See also: `docs/e2e-manual-qa-checklist.md`, `docs/e2e-regression-checklist.md`.

