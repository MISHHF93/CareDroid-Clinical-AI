# Tool visibility matrix

*Generated from shipped source on **2026-05-19**. Regenerate:* `npm run visibility-matrix:write-docs`

## Summary

| Metric | Value |
|--------|------:|
| Matrix rows | 44 |
| Sidebar registry tools | 35 |
| NLU clinical profiles | 40 |
| Built-in calculator forms | 17 |
| Backend POST executors | 3 |

### Status distribution

| Status | Count |
|--------|------:|
| frontend-only | 16 |
| fully visible | 19 |
| hidden by layout | 9 |

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
| abg-interpreter | ABG Interpreter | diagnostic | nlu-profile | /tools/lab-interpreter | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| acls-protocol | ACLS Protocol | reference | nlu-profile | /tools/protocols | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| calculators | All calculators | calculator | hub | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| antibiotic-guide | Antibiotic Selection Guide | diagnostic | nlu-profile | /tools/diagnosis | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| apache2-calculator | APACHE-II Score | calculator | nlu-hub-only | /tools/calculators | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| ascvd-risk | ASCVD 10-year risk | calculator | A | /tools/calculators/ascvd-risk | ascvd-risk | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| atls-protocol | ATLS Protocol | reference | nlu-profile | /tools/protocols | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| audit-c | AUDIT-C | calculator | A | /tools/calculators/audit-c | audit-c | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| calc-bmi | BMI | calculator | A | /tools/calculator/bmi | bmi | yes | yes | yes | yes | yes | no | no | yes | yes | yes | frontend-only |
| canadian-c-spine | Canadian C-Spine Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| calc-chads2vasc | CHA₂DS₂-VASc | calculator | A | /tools/calculator/chads2vasc | chads2vasc | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| child-pugh | Child-Pugh | calculator | A | /tools/calculators/child-pugh | child-pugh | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| ckd-staging | CKD staging (KDIGO) | calculator | A | /tools/calculators/ckd-staging | ckd-staging | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| protocols | Clinical Protocols | reference | clinical-page | /tools/protocols | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| copd-gold | COPD GOLD | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| curb65-calculator | CURB-65 Score | calculator | nlu-hub-only | /tools/calculators | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| diagnosis | Diagnosis Assistant | diagnostic | clinical-page | /tools/diagnosis | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| dispatch-ai | Dispatch Intelligence | fleet | fleet-B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| drug-check | Drug Checker | diagnostic | C | /tools/drug-checker | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | fully visible |
| calc-gfr | eGFR (CKD-EPI) | calculator | A | /tools/calculator/gfr | gfr | yes | yes | yes | yes | yes | no | no | yes | yes | yes | frontend-only |
| fleet-command | Fleet Command | fleet | fleet-A | /fleet/command | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| gad7 | GAD-7 | calculator | A | /tools/calculators/gad7 | gad7 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| gcs-calculator | Glasgow Coma Scale | calculator | nlu-hub-only | /tools/calculators | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| grace-acs | GRACE ACS Risk | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| has-bled | HAS-BLED | calculator | A | /tools/calculators/has-bled | has-bled | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| lab-interp | Lab Interpreter | diagnostic | C | /tools/lab-interpreter | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | fully visible |
| dose-calculator | Medication Dose Calculator | calculator | nlu-profile | /tools/calculators | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| meld | MELD | calculator | A | /tools/calculators/meld | meld | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| meld-na | MELD-Na | calculator | A | /tools/calculators/meld-na | meld-na | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| news2 | NEWS2 | calculator | A | /tools/calculators/news2 | news2 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| nihss | NIH Stroke Scale (NIHSS) | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| ottawa-ankle | Ottawa Ankle Rule | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| perc | PERC | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| phq9 | PHQ-9 | calculator | A | /tools/calculators/phq9 | phq9 | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| predictive-maintenance | Predictive Maintenance | fleet | fleet-A | /fleet/predictive-maintenance | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| procedures | Procedure Guide | reference | clinical-page | /tools/procedures | — | yes | yes | yes | yes | no | no | no | yes | yes | yes | fully visible |
| qsofa | qSOFA (quick SOFA) | calculator | A | /tools/calculators/qsofa | qsofa | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| rome-iv-ibs | Rome IV IBS | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| route-optimizer | Route Optimization | fleet | fleet-A | /fleet/route-optimizer | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |
| sofa-score | SOFA Score | calculator | C | /tools/calculator/sofa | sofa | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | fully visible |
| stop-bang | STOP-Bang | calculator | A | /tools/calculators/stop-bang | stop-bang | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| timi-ua-nstemi | TIMI (UA/NSTEMI) | calculator | A | /tools/calculators/timi-ua-nstemi | timi-ua-nstemi | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | frontend-only |
| wells-dvt-calculator | Wells DVT Score | calculator | nlu-hub-only | /tools/calculators | — | no | yes | yes | no | yes | yes | no | yes | yes | yes | hidden by layout |
| wells-pe | Wells PE | calculator | B | /tools/calculators | — | yes | yes | yes | yes | yes | yes | no | yes | yes | yes | fully visible |

## Recommended code fixes (priority order)

1. **Tier B launch parity** — In `Sidebar.jsx` `handleToolClick`, for `TIER_B_CHAT_CALCULATOR_REGISTRY_IDS` and `dispatch-ai`, mirror `ToolsOverview.handleNluHubTool`: seed chat via `resolveCatalogLaunch` + `resolveNavigationPathForLaunch` (typically `/dashboard`) instead of only navigating to `/tools/calculators`.
2. **NLU hub-only sidebar rows** — Add `toolRegistry.js` entries (or a collapsible “More calculators” group) for `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator` mapped to hub + `initialCalc` or chat launch.
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

