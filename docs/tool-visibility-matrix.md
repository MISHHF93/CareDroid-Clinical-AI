# Tool visibility matrix

*Generated from shipped source on **2026-05-20**. Regenerate:* `npm run visibility-matrix:write-docs`

## Summary

| Metric | Value |
|--------|------:|
| Matrix rows | 57 |
| Sidebar registry tools | 57 |
| NLU clinical profiles | 54 |
| Built-in calculator forms | 28 |
| Backend POST executors | 3 |

### Status distribution

| Status | Count |
|--------|------:|
| frontend-only | 27 |
| fully visible | 29 |
| hidden by layout | 1 |

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
| Sidebar | Listed in `toolRegistry.js` (workspace may filter) |
| NLU / Pattern / Executor | Chat profile, `tool.patterns.ts`, POST execute |
| Component / Renders | Frontend module and user-visible UI |
| Launch OK | Catalog/sidebar launch resolves to a real destination |
| Status | Derived visibility classification |

## Full matrix

| Canonical ID | Display name | Category | Tier | Route | Calc slug | Registry | Catalog | Discovery | Sidebar | NLU | Pattern | Executor | Component | Renders | Launch OK | Status |
|--------------|--------------|----------|------|-------|-----------|----------|---------|-----------|---------|-----|---------|----------|-----------|---------|----------|--------|
| abcd2 | ABCD² score | calculator | A | /tools/calculators/abcd2 | abcd2 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| abg-interpreter | ABG Interpreter | diagnostic | clinical-page | /tools/lab-interpreter | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| acls-protocol | ACLS Protocol | reference | clinical-page | /tools/protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| calculators | All calculators | calculator | hub | /tools/calculators | — | yes | yes | yes | yes | no | no | no | yes | yes | yes | fully visible |
| antibiotic-guide | Antibiotic Guide | diagnostic | clinical-page | /tools/diagnosis | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| apache2-calculator | APACHE-II | calculator | other | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| apgar-score | Apgar score | calculator | A | /tools/calculators/apgar-score | apgar-score | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| ascvd-risk | ASCVD 10-year risk | calculator | A | /tools/calculators/ascvd-risk | ascvd-risk | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| atls-protocol | ATLS Protocol | reference | clinical-page | /tools/protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| audit-c | AUDIT-C | calculator | A | /tools/calculators/audit-c | audit-c | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| bisap-score | BISAP score | calculator | A | /tools/calculators/bisap-score | bisap-score | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| bishop-score | Bishop score | calculator | A | /tools/calculators/bishop-score | bishop-score | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| calc-bmi | BMI | calculator | A | /tools/calculator/bmi | bmi | yes | yes | yes | yes | yes | no | no | yes | yes | yes | frontend-only |
| braden-scale | Braden scale | calculator | A | /tools/calculators/braden-scale | braden-scale | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| canadian-c-spine | Canadian C-Spine Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| centor-mcisaac | Centor / McIsaac | calculator | A | /tools/calculators/centor-mcisaac | centor-mcisaac | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| calc-chads2vasc | CHA₂DS₂-VASc | calculator | A | /tools/calculator/chads2vasc | chads2vasc | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| child-pugh | Child-Pugh | calculator | A | /tools/calculators/child-pugh | child-pugh | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| ckd-staging | CKD staging (KDIGO) | calculator | A | /tools/calculators/ckd-staging | ckd-staging | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| protocols | Clinical Protocols | reference | clinical-page | /tools/protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| copd-gold | COPD GOLD | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| curb65-calculator | CURB-65 | calculator | other | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| diagnosis | Diagnosis Assistant | diagnostic | clinical-page | /tools/diagnosis | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| dispatch-ai | Dispatch Intelligence | fleet | fleet-B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| drug-check | Drug Checker | diagnostic | C | /tools/drug-checker | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | fully visible |
| calc-gfr | eGFR (CKD-EPI) | calculator | A | /tools/calculator/gfr | gfr | yes | yes | yes | yes | yes | no | no | yes | yes | yes | frontend-only |
| fib4 | FIB-4 | calculator | A | /tools/calculators/fib4 | fib4 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| fleet-command | Fleet Command | fleet | fleet-A | /fleet/command | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| framingham-risk | Framingham CHD risk | calculator | A | /tools/calculators/framingham-risk | framingham-risk | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| gad7 | GAD-7 | calculator | A | /tools/calculators/gad7 | gad7 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| gcs-calculator | Glasgow Coma Scale (GCS) | calculator | other | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| grace-acs | GRACE ACS Risk | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| has-bled | HAS-BLED | calculator | A | /tools/calculators/has-bled | has-bled | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| heart-score | HEART score | calculator | A | /tools/calculators/heart-score | heart-score | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| lab-interp | Lab Interpreter | diagnostic | C | /tools/lab-interpreter | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | fully visible |
| dose-calculator | Medication Dose Calculator | calculator | other | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | no | yes | hidden by layout |
| meld | MELD | calculator | A | /tools/calculators/meld | meld | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| meld-na | MELD-Na | calculator | A | /tools/calculators/meld-na | meld-na | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| morse-fall-scale | Morse Fall Scale | calculator | A | /tools/calculators/morse-fall-scale | morse-fall-scale | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| news2 | NEWS2 | calculator | A | /tools/calculators/news2 | news2 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| nexus-cspine | NEXUS C-Spine Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| nihss | NIH Stroke Scale (NIHSS) | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| ottawa-ankle | Ottawa Ankle Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| pecarn-head | PECARN Head Injury Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| perc | PERC | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| phq9 | PHQ-9 | calculator | A | /tools/calculators/phq9 | phq9 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| predictive-maintenance | Predictive Maintenance | fleet | fleet-A | /fleet/predictive-maintenance | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| procedures | Procedure Guide | reference | clinical-page | /tools/procedures | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| qsofa | qSOFA (quick SOFA) | calculator | A | /tools/calculators/qsofa | qsofa | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| ranson-criteria | Ranson criteria | calculator | A | /tools/calculators/ranson-criteria | ranson-criteria | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| rome-iv-ibs | Rome IV IBS | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| route-optimizer | Route Optimization | fleet | fleet-A | /fleet/route-optimizer | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| sofa-score | SOFA Score | calculator | C | /tools/calculator/sofa | sofa | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | fully visible |
| stop-bang | STOP-Bang | calculator | A | /tools/calculators/stop-bang | stop-bang | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| timi-ua-nstemi | TIMI (UA/NSTEMI) | calculator | A | /tools/calculators/timi-ua-nstemi | timi-ua-nstemi | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| wells-dvt-calculator | Wells DVT | calculator | other | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| wells-pe | Wells PE | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |

## Recommended code fixes (priority order)

1. **NLU hub-only sidebar rows** — Add `toolRegistry.js` entries (or a collapsible “More calculators” group) for `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator` mapped to hub + chat launch (`applyRegistryToolLaunch`).
2. **Secondary NLU profiles** — Optional dedicated sidebar rows for ACLS/ATLS, ABG, dose calculator, antibiotic guide (currently catalog + parent page only).
3. **`dispatch-ai` catalog flag** — Set `backendExecutable: false` in `clinicalIntentToolCatalog.js` for `dispatch-ai`, or rename catalog column to “NLU/chat route” so it is not confused with POST `/api/tools/:id/execute`.
4. **Duplicate shortcut labels** — Deduplicate `shortcut` strings in `toolRegistry.js` (PERC/PHQ-9, GRACE/GAD-7, etc.) even if global hotkeys are not wired yet.
5. **Account route discoverability** — Link `Profile` → `/profile-settings`, `Settings` → `/notifications`; add footer links for `/gdpr` and `/hipaa` in `PublicShell.jsx`.
6. **Cost analytics nav** — Add sidebar or Analytics sub-link to `/costs` for `VIEW_ANALYTICS` users.
7. **Onboarding / biometric routes** — Link from `ProfileSettings` or `Settings` to `/onboarding` and `/biometric-setup` when product-ready.

## Verification

```bash
npm run test:visibility-matrix
npm run visibility-matrix:write-docs
npm run inventory:report
```

See also: `docs/e2e-tool-validation-matrix.md`, `docs/backend-frontend-tool-contract.md`, `docs/tool-render-execute-matrix.md`.

