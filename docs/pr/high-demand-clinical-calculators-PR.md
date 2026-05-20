# PR: Add high-demand clinical calculators and workflow tools

**Suggested PR title:** Add high-demand clinical calculators and workflow tools

**Related artifacts:** [CHANGELOG](./CHANGELOG-high-demand-clinical-calculators.md) · [Reviewer checklist](./REVIEWER_CHECKLIST-high-demand-clinical-calculators.md) · [Clinical governance checklist](./CLINICAL_GOVERNANCE_CHECKLIST-high-demand-clinical-calculators.md) · [Future roadmap](./ROADMAP-high-demand-clinical-calculators.md)

---

## 1. Summary

This PR ships **thirteen high-demand clinical calculators and trauma workflow tools** into the CareDroid clinical surface: **ten Tier-A built-in forms** (PR8 batch), **one Tier-A stroke-risk form** (PR10 ABCD²), and **two Tier-B chat-assisted trauma rules** (PR9 PECARN and NEXUS). Each tool is wired end-to-end—registry ID, catalog row, discovery aliases, NLU patterns, launch path, sidebar or hub visibility, optional backend intent patterns, and mobile responsive QA paths.

**Outcome:** Clinicians can open calculators from the tools sidebar, medical catalog, or natural-language chat without hidden tools, broken deep links, or orphaned routes. Scoring logic lives in dedicated `src/utils/*` modules with exported safety disclaimers, structured `riskCategory` outputs, and validation helpers. A **142-test cross-layer audit** (`newClinicalToolsWiringAudit.test.js`) guards the ten highest-priority tools; the full PR8 batch has an additional dedicated wiring suite.

**Not in scope:** New Tier-C POST executors, database schema changes, automated imaging orders, or treatment/disposition mandates.

---

## 2. Tools added

### Tier A — dedicated calculator routes (`/tools/calculators/{slug}`)

| Registry ID | Display name | Route | UI implementation |
|---------------|--------------|-------|-------------------|
| `heart-score` | HEART Score | `/tools/calculators/heart-score` | PR8 batch — dimension selects |
| `centor-mcisaac` | Centor / McIsaac | `/tools/calculators/centor-mcisaac` | PR8 batch — criterion checkboxes |
| `bishop-score` | Bishop Score | `/tools/calculators/bishop-score` | PR8 batch — `SelectDimensionCalculator` |
| `apgar-score` | Apgar Score | `/tools/calculators/apgar-score` | PR8 batch — 1- and 5-minute dual form |
| `braden-scale` | Braden Scale | `/tools/calculators/braden-scale` | PR8 batch — `SelectDimensionCalculator` |
| `morse-fall-scale` | Morse Fall Scale | `/tools/calculators/morse-fall-scale` | PR8 batch — `SelectDimensionCalculator` |
| `ranson-criteria` | Ranson Criteria | `/tools/calculators/ranson-criteria` | PR8 batch — criterion checkboxes |
| `bisap-score` | BISAP Score | `/tools/calculators/bisap-score` | PR8 batch — `CriterionCheckboxCalculator` |
| `fib4` | FIB-4 Index | `/tools/calculators/fib4` | PR8 batch — numeric lab inputs |
| `framingham-risk` | Framingham Risk | `/tools/calculators/framingham-risk` | PR8 batch — risk-factor form |
| `abcd2` | ABCD² Score | `/tools/calculators/abcd2` | Dedicated `abcd2Calculator.jsx` |

### Tier B — chat-assisted hub (`/tools/calculators` → guided chat)

| Registry ID | Display name | Hub group | Launch |
|---------------|--------------|-----------|--------|
| `pecarn-head` | PECARN Head Injury Rule | `trauma` | Start guided chat → `/dashboard` |
| `nexus-cspine` | NEXUS C-Spine Rule | `trauma` | Start guided chat → `/dashboard` |

**Util modules (scoring + disclaimers):** `heartScoreCalculator.js`, `bradenScaleCalculator.js`, `morseFallScaleCalculator.js`, `fib4Calculator.js`, `bisapScoreCalculator.js`, `apgarScoreCalculator.js`, `bishopScoreCalculator.js`, `abcd2Calculator.js`, `pecarnHeadCalculator.js`, `nexusCSpineCalculator.js` (+ existing PR8 utils for Centor, Ranson, Framingham).

**Chat configs:** `src/data/chatAssistedCalculators/pecarnHead.js`, `nexusCSpine.js`.

---

## 3. Clinical rationale

| Tool | Clinical need | Typical setting |
|------|---------------|-----------------|
| **HEART Score** | ED chest-pain risk stratification; supports shared decision-making on early discharge vs observation | Emergency / acute care |
| **ABCD²** | Short-term stroke risk after TIA; triage for urgent workup vs outpatient follow-up | Neurology / ED / primary care |
| **PECARN** | Evidence-based pediatric head CT decision support after minor blunt trauma | Pediatric ED / urgent care |
| **NEXUS** | C-spine imaging consideration in selected blunt trauma (not clearance) | Trauma / ED |
| **Braden Scale** | Pressure-injury risk screening for nursing care planning | Inpatient / LTC |
| **Morse Fall Scale** | Inpatient fall-risk screening and prevention bundles | Hospital nursing |
| **FIB-4** | Non-invasive hepatic fibrosis screening from routine labs | Hepatology / primary care |
| **BISAP** | Early severe acute pancreatitis risk stratification | ED / hospital medicine |
| **Apgar** | Standardized newborn assessment at 1 and 5 minutes | Delivery / NICU transition |
| **Bishop Score** | Cervical readiness for induction/labor assessment | Obstetrics |
| **Centor / McIsaac** | Strep pharyngitis probability; antibiotic stewardship context | Outpatient / urgent care |
| **Ranson Criteria** | Historical pancreatitis severity framing (educational; BISAP often preferred acutely) | Hospital medicine teaching |
| **Framingham Risk** | Cardiovascular risk communication (population-derived; not a treatment mandate) | Primary care / prevention |

All tools are framed as **clinical decision support (CDS)**—they summarize published criteria and do not replace clinician judgment, institutional protocols, or time-sensitive emergency pathways.

---

## 4. Registry changes

### Contract (`clinicalToolIdContract.js`)

- **`REGISTRY` / `NLU` / `BUILTIN_CALC`:** thirteen new canonical ids (see table above).
- **`PR8_TIER_A_CALCULATOR_REGISTRY_IDS`:** frozen list of ten Tier-A calculators.
- **`PR10_TIER_A_CALCULATOR_REGISTRY_IDS`:** `abcd2`.
- **`PR9_TIER_B_CHAT_CALCULATOR_IDS`:** `pecarn-head`, `nexus-cspine`.
- **`CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS`:** extended with PR8 + PR10 ids.
- **`CLINICAL_TIER_B_CHAT_REGISTRY_IDS`:** extended with PR9 ids.
- **`NLU_TO_REGISTRY_ID` / `BUILTIN_CALC_ID_TO_REGISTRY_ID`:** canonical mappings + alias resolution.

### Product registry & catalog

- **`toolRegistry.js`:** sidebar entries, paths, icons for all Tier-A tools.
- **`clinicalIntentToolCatalog.js`:** NLU profiles with STEP 0 workflow `chatSeed`s.
- **`medicalToolsCatalogIndex.js`:** catalog rows; Tier B marked `chatOnlyForm`.
- **`builtinUiCalculators`:** PR8 + ABCD² slugs for `Calculators.jsx` switch.
- **`calculatorHubManifest.js`:** hub cards for Tier B trauma tools.
- **`chatAssistedHubGroups.js`:** trauma group copy (imaging CDS limits, unstable-patient warnings).
- **`sourceCodeToolDiscovery.js`:** discovery rows for canonical + alias ids.
- **`clinicalToolAliasSync.js`:** audited alias pairs for PR8/9/10.
- **`responsiveQaMatrix.js`:** mobile QA paths for every Tier-A slug (including `abcd2`).

### Routes

- **`clinicalToolRoutes.js` / `App.jsx`:** `/tools/calculators/{slug}` for each Tier-A id.
- **`Calculators.jsx`:** `case` branches per `uiCalculatorSlug` (PR8 batch + ABCD²).

### Backend orchestrator registry

- **`tool-orchestrator.registry.ts`:** ids registered for NLU routing (frontend-only execution; no new POST executors).

---

## 5. NLU additions

### Backend (`tool.patterns.ts`)

Pattern blocks added/updated for: `heart-score`, `abcd2`, `bishop-score`, `apgar-score`, `braden-scale`, `morse-fall-scale`, `bisap-score`, `fib4`, `pecarn-head`, `nexus-cspine`, plus PR8 peers (`centor-mcisaac`, `ranson-criteria`, `framingham-risk`).

### Frontend alias map (representative)

| Alias / phrase | Resolves to |
|----------------|-------------|
| `heart`, `chest pain score` | `heart-score` |
| `morse-fall`, `fall-risk-score` | `morse-fall-scale` |
| `bisap` | `bisap-score` |
| `apgar` | `apgar-score` |
| `fib-4` | `fib4` |
| `abcd2-score`, `tia-stroke-risk` | `abcd2` |
| `pressure-injury-risk` | `braden-scale` |
| `pecarn`, `pediatric head ct rule`, … | `pecarn-head` |
| `nexus`, `nexus-criteria`, `nexus c-spine rule`, … | `nexus-cspine` |

### Chat seeds (STEP 0)

Every NLU profile and Tier-B chat config opens with a **STEP 0** gate: confirm applicability, stop for emergencies, and do not delay urgent care to finish scoring or chat. Domain-specific language covers ACS pathways (HEART), stroke activation (ABCD²), unstable trauma (PECARN/NEXUS), and inpatient nursing context (Braden/Morse).

---

## 6. Safety considerations

### Universal CDS framing

- Exported disclaimers on every util (`*_DISCLAIMER`, `*_HOSPITAL_DISCLAIMER`, `*_OBSTETRIC_DISCLAIMER`).
- UI surfaces disclaimer adjacent to results; interpretations include `riskCategory` + non-directive labels.
- Copy avoids diagnosing, ruling out disease, mandating imaging, or recommending specific drugs or disposition.

### Tool-specific gates

| Tool | Key safety behavior |
|------|---------------------|
| HEART | Does not diagnose ACS/MI or recommend invasive strategy |
| ABCD² | **Emergency stroke pathway** if acute stroke, crescendo symptoms, or new focal deficit |
| PECARN | GCS ≤8, herniation, seizures, instability → stop rule; no CT mandate/deferral |
| NEXUS | Not c-spine clearance; unstable trauma → primary survey without delay |
| Braden / Morse | Nursing screening only; not a substitute for fall/pressure-injury protocols |
| FIB-4 / BISAP | Lab-based stratification; confirm with institutional pathways and imaging |
| Apgar / Bishop | Obstetric CDS; resuscitation and fetal distress override scoring |
| Trauma hub group | Shared warning: unstable patients need full evaluation without deferring for chat |

### Tier B launch

- `resolveCatalogLaunch` / `resolveNavigationPathForLaunch` → `/dashboard` with trauma `chatSeed` (no fake dedicated routes).
- Hub trauma disclaimer in `chatAssistedHubGroups.js` reinforces imaging-rule limits.

### Validation

- Input validators: `validateFib4Inputs`, `validateBisapInputs`, `validateApgarMinuteInputs`, `validateBishopInputs`, and analogous checks where numeric bounds apply.

---

## 7. Accessibility improvements

- **Semantic structure:** `fieldset` / `legend` for criterion groups; `aria-labelledby` on form regions.
- **Controls:** `aria-label` on dimension selects and action buttons; `aria-describedby` linking help text.
- **Results:** `aria-live="polite"` on result panels; visible focus on calculate/reset.
- **Icons:** decorative `NavIcon` instances marked `aria-hidden`.
- **ABCD² page:** dedicated accessible form layout mirroring TIMI-style patterns (`abcd2Calculator.jsx`).
- **Apgar:** separate labeled inputs for 1- and 5-minute scores with validation feedback.
- **Reduced motion:** respects `prefers-reduced-motion` in animated PR8 wrappers.
- **Mobile:** all Tier-A paths registered in `responsiveQaMatrix` for breakpoint regression.

---

## 8. Testing

### Cross-layer audit (primary gate)

```bash
npx vitest run src/data/newClinicalToolsWiringAudit.test.js
```

**142 tests** covering: registry IDs, routes, calculator slugs, catalog, discovery, NLU aliases, launch behavior, sidebar icons, hub visibility, backend pattern source presence, responsive QA pages, and orphan-route checks for the audited set.

### Per-domain wiring

| Suite | Tools |
|-------|-------|
| `pr8BatchWiring.test.js` | All 10 PR8 Tier-A ids |
| `heartScoreWiring.test.js` | HEART |
| `abcd2Wiring.test.js` | ABCD² |
| `hospitalScalesWiring.test.js` | Braden, Morse |
| `fib4BisapWiring.test.js` | FIB-4, BISAP |
| `obstetricScalesWiring.test.js` | Apgar, Bishop |
| `pecarnHeadWiring.test.js` | PECARN |
| `nexusCSpineWiring.test.js` | NEXUS |
| `clinicalToolAliasSync.test.js` | Alias parity |
| `responsiveQaMatrix.test.js` | Mobile path matrix |

### Calculator unit tests

`heartScoreCalculator.test.js`, `abcd2Calculator.test.js`, `bradenScaleCalculator.test.js`, `morseFallScaleCalculator.test.js`, `fib4Calculator.test.js`, `bisapScoreCalculator.test.js`, `apgarScoreCalculator.test.js`, `bishopScoreCalculator.test.js`, plus PR8 peer utils as applicable.

### Backend Jest

```bash
cd backend && npx jest test/tool-patterns-heart-score.spec.ts test/tool-patterns-abcd2.spec.ts test/tool-patterns-pecarn-head.spec.ts test/tool-patterns-nexus-cspine.spec.ts test/tool-patterns-hospital-scales.spec.ts test/tool-patterns-fib4-bisap.spec.ts test/tool-patterns-obstetric-scales.spec.ts
```

### Recommended full frontend gate

```bash
npm run test:run
```

### Manual smoke (pre-merge)

- [ ] Open each Tier-A slug from sidebar and catalog search.
- [ ] Launch PECARN and NEXUS from hub → chat opens with STEP 0 visible.
- [ ] Voice/chat: “heart score”, “morse fall”, “pecarn head”, “nexus criteria”, “abcd2”.
- [ ] Android viewport: one PR8 form + ABCD² + hub trauma card.

---

## 9. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Misinterpretation as diagnostic or treatment directive | Medium | High | Disclaimers, STEP 0 gates, non-directive `riskCategory` labels |
| Delayed emergency care while using CDS | Low | Critical | ABCD² stroke language; trauma STEP 0; hub unstable-patient warning |
| NLU false positive routes wrong tool | Low | Medium | Alias audit + backend pattern tests + disambiguation in patterns |
| Hidden calculator (catalog without route) | Low | Medium | `newClinicalToolsWiringAudit` + `pr8BatchWiring` |
| Orphan route without UI case | Low | Medium | `CALCULATOR_ROUTE_DEFS` ↔ `Calculators.jsx` audit |
| Mobile layout regression | Medium | Low | `responsiveQaMatrix` + existing responsive Vitest |
| Backend executor scope creep | Low | Medium | No new `registerTool()` executors; Tier A remains client-side |
| Stale alias in discovery only | Low | Low | `clinicalToolAliasSync` + discovery pair tests |

**Overall release risk:** **Medium-low** for wiring/regression; **clinical content risk** managed through governance review (see checklist) rather than code alone.

---

## 10. Rollout strategy

1. **Merge to main** after reviewer + clinical governance sign-off (checklists below).
2. **Deploy frontend** with standard SPA pipeline; no DB migration required.
3. **Deploy backend** in same release window so `tool.patterns.ts` and orchestrator registry align with frontend NLU ids (backward-compatible if backend lags by one deploy—chat may miss new intents until backend ships).
4. **Feature visibility:** Tools appear immediately in sidebar/catalog for all users (no feature flag in this PR).
5. **Communications:** Release notes to clinical champions highlighting trauma hub (PECARN/NEXUS) vs form calculators; emphasize CDS-only framing.
6. **QA sampling:** Run cross-layer audit in CI; spot-check three Tier-A forms + both Tier-B launches on staging Android (Pixel profile) per `responsiveQaMatrix`.
7. **Monitor:** Intent-classification logs for new tool ids (volume, misroute rate) first 72 hours post-deploy.

---

## 11. Rollback strategy

| Scenario | Action |
|----------|--------|
| **Critical safety copy defect** | Hotfix forward (preferred); revert single util or `chatSeed` commit if isolated |
| **Broken routes / blank calculator** | Revert PR merge commit on frontend; verify `Calculators.jsx` switch intact |
| **NLU misrouting spike** | Disable affected pattern block in `tool.patterns.ts` via hotfix OR revert backend deploy; frontend catalog still reachable via sidebar |
| **Full rollback** | `git revert` merge commit(s) for PR8/9/10 tool wiring; redeploy frontend + backend together to avoid id/pattern skew |
| **Partial Tier B rollback** | Remove hub cards + chat configs for `pecarn-head` / `nexus-cspine` only; Tier A unaffected |

**Data impact:** None (client-side scoring; no persisted PHI in new modules).

**Post-rollback verification:** `npx vitest run src/data/wiringAuditConsistency.test.js` on reverted branch; confirm catalog does not advertise removed ids.

---

## Acceptance criteria (release gate)

- [ ] No hidden calculators (Tier A on sidebar; Tier B on hub with launch label)
- [ ] No broken launch paths (`resolveCatalogLaunch` matches routes and UI cases)
- [ ] No orphaned Tier-A routes in `CALCULATOR_ROUTE_DEFS`
- [ ] `newClinicalToolsWiringAudit.test.js` green (142 tests)
- [ ] Backend tool-pattern specs green for shipped ids
- [ ] Clinical governance checklist signed

---

## Files touched (representative)

**Frontend:** `clinicalToolIdContract.js`, `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `Calculators.jsx`, `pr8ClinicalBatchCalculators.jsx`, `abcd2Calculator.jsx`, `chatAssistedCalculators/*`, `responsiveQaMatrix.js`, `src/utils/*Calculator.js`, `newClinicalToolsAuditConstants.js`, `newClinicalToolsWiringAudit.test.js`

**Backend:** `tool.patterns.ts`, `tool-orchestrator.registry.ts`, `backend/test/tool-patterns-*.spec.ts`
