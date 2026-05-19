# E2E tool validation matrix

Generated: 2026-05-19T02:41:09.492Z

## Summary

| Metric | Value |
|--------|-------|
| Total inventory rows | 35 |
| Registry tools | 35 |
| NLU supplemental rows | 0 |
| POST executors | 3 |
| Catalog coverage | 35 |
| Discovery coverage | 35 |

### Tier distribution (registry)

- **A**: 16
- **B**: 8
- **C**: 3
- **clinical-page**: 3
- **fleet-A**: 3
- **fleet-B**: 1
- **hub**: 1

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
| ascvd-risk | A | /tools/calculators/ascvd-risk | yes | yes | yes | yes | — | /tools/calculators/ascvd-risk | 13 files |
| audit-c | A | /tools/calculators/audit-c | yes | yes | yes | yes | — | /tools/calculators/audit-c | 13 files |
| calc-bmi | A | /tools/calculator/bmi | yes | yes | yes | — | — | /tools/calculator/bmi | 5 files |
| calc-chads2vasc | A | /tools/calculator/chads2vasc | yes | yes | yes | yes (cha2ds2vasc-calculator) | — | /tools/calculator/chads2vasc | 5 files |
| calc-gfr | A | /tools/calculator/gfr | yes | yes | yes | — | — | /tools/calculator/gfr | 5 files |
| calculators | hub | /tools/calculators | yes | yes | yes | yes (apache2-calculator, curb65-calculator, dose-calculator, gcs-calculator, wells-dvt-calculator) | — | /tools/calculators | 6 files |
| canadian-c-spine | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| child-pugh | A | /tools/calculators/child-pugh | yes | yes | yes | yes | — | /tools/calculators/child-pugh | 6 files |
| ckd-staging | A | /tools/calculators/ckd-staging | yes | yes | yes | yes | — | /tools/calculators/ckd-staging | 13 files |
| copd-gold | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 9 files |
| diagnosis | clinical-page | /tools/diagnosis | yes | yes | yes | yes (antibiotic-guide, differential-diagnosis) | — | /tools/diagnosis | 5 files |
| dispatch-ai | fleet-B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 7 files |
| drug-check | C | /tools/drug-checker | yes | yes | yes | yes (drug-interactions) | yes | /tools/drug-checker | 5 files |
| fleet-command | fleet-A | /fleet/command | yes | yes | yes | yes | — | /fleet/command | 6 files |
| gad7 | A | /tools/calculators/gad7 | yes | yes | yes | yes | — | /tools/calculators/gad7 | 10 files |
| grace-acs | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| has-bled | A | /tools/calculators/has-bled | yes | yes | yes | yes | — | /tools/calculators/has-bled | 6 files |
| lab-interp | C | /tools/lab-interpreter | yes | yes | yes | yes (abg-interpreter, lab-interpreter) | yes | /tools/lab-interpreter | 5 files |
| meld | A | /tools/calculators/meld | yes | yes | yes | yes | — | /tools/calculators/meld | 7 files |
| meld-na | A | /tools/calculators/meld-na | yes | yes | yes | yes | — | /tools/calculators/meld-na | 7 files |
| news2 | A | /tools/calculators/news2 | yes | yes | yes | yes | — | /tools/calculators/news2 | 7 files |
| nihss | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| ottawa-ankle | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 12 files |
| perc | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 8 files |
| phq9 | A | /tools/calculators/phq9 | yes | yes | yes | yes | — | /tools/calculators/phq9 | 10 files |
| predictive-maintenance | fleet-A | /fleet/predictive-maintenance | yes | yes | yes | yes | — | /fleet/predictive-maintenance | 6 files |
| procedures | clinical-page | /tools/procedures | yes | yes | yes | — | — | /tools/procedures | 5 files |
| protocols | clinical-page | /tools/protocols | yes | yes | yes | yes (acls-protocol, atls-protocol, protocol-lookup) | — | /tools/protocols | 5 files |
| qsofa | A | /tools/calculators/qsofa | yes | yes | yes | yes | — | /tools/calculators/qsofa | 7 files |
| rome-iv-ibs | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 9 files |
| route-optimizer | fleet-A | /fleet/route-optimizer | yes | yes | yes | yes | — | /fleet/route-optimizer | 6 files |
| sofa-score | C | /tools/calculator/sofa | yes | yes | yes | yes (sofa-calculator) | yes | /tools/calculator/sofa | 6 files |
| stop-bang | A | /tools/calculators/stop-bang | yes | yes | yes | yes | — | /tools/calculators/stop-bang | 13 files |
| timi-ua-nstemi | A | /tools/calculators/timi-ua-nstemi | yes | yes | yes | yes | — | /tools/calculators/timi-ua-nstemi | 7 files |
| wells-pe | B | /tools/calculators | yes | yes | yes | yes | — | /tools/calculators | 8 files |

## Automated gates

```bash
npm run test:e2e-matrix
npm run e2e-matrix:report
```

See also: `docs/e2e-manual-qa-checklist.md`, `docs/e2e-regression-checklist.md`.

