# Add MELD/MELD-Na, TIMI UA/NSTEMI, Wells PE, and PERC Clinical Tools

## 1. Summary

PR2 ships **five clinical decision-support tools** across the established production-hardening tier model: **three Tier-A calculators** with dedicated SPA routes and client-side deterministic scoring (MELD, MELD-Na, TIMI UA/NSTEMI), and **two Tier-B chat-assisted tools** on the calculators hub (Wells PE, PERC). All tools are wired end-to-end through registry, NLU profiles, medical catalog, discovery aliases, `resolveCatalogLaunch`, and backend `tool.patterns.ts` keywords.

**Explicit non-goals for this PR:** No new NestJS `registerTool()` executors (Tier C). MELD/TIMI remain `backendExecutable: false` and are listed in `NLU_TOOL_IDS_WITHOUT_EXECUTOR`. Scoring runs in the browser with auditable unit tests; chat tools use guided `chatSeed` prompts with clinical safety guardrails.

**Outcome:** Clinicians can access liver severity (MELD/MELD-Na), UA/NSTEMI risk stratification (TIMI), and PE pre-test probability support (Wells + PERC) from sidebar, catalog, and deep links—with consistent IDs, searchable catalog rows, and copy that avoids diagnostic certainty or treatment directives.

---

## 2. Clinical tools added

| Registry ID | Display name | Clinical role | Access tier |
|-------------|--------------|---------------|-------------|
| `meld` | MELD | UNOS laboratory MELD (6–40) for chronic liver disease severity | Tier A |
| `meld-na` | MELD-Na | MELD with sodium adjustment (UNOS clamps 125–140 mEq/L) | Tier A |
| `timi-ua-nstemi` | TIMI (UA/NSTEMI) | 14-day adverse-event risk in suspected UA/NSTEMI (0–7) | Tier A |
| `wells-pe` | Wells PE | Wells PE rule — pre-test probability only | Tier B |
| `perc` | PERC | PERC checklist when pre-test PE probability is low | Tier B |

**References embedded in utils/UI:** Kamath et al. (MELD); Kim et al. / UNOS policy (MELD-Na); Antman et al. JAMA 2000 (TIMI); Wells et al. (PE rule); PERC validation literature cited in chat seed and interpretation copy.

---

## 3. Tier A vs Tier B architecture

```text
Tier A (PR2)                         Tier B (PR2)
────────────────────────────────     ────────────────────────────────
/tools/calculators/{id}              /tools/calculators (hub)
Calculators.jsx form                 chatAssistedCalculators/*.js
src/utils/*Calculator.js             clinicalIntentToolCatalog chatSeed
builtinUiCalculators row             nluCalculatorHubOnly + hub group "pe"
App.jsx initialCalculatorId          resolveCatalogLaunch → hub + "Start guided chat"
backendExecutable: false             backendExecutable: false
No POST /tools/:id/execute           No POST /tools/:id/execute
```

| Concern | Tier A (MELD, MELD-Na, TIMI) | Tier B (Wells PE, PERC) |
|---------|------------------------------|-------------------------|
| Scoring location | Client (`computeMeldResult`, `calculateTimiUaNstemiScore`) | Conversational (chat); utils available for tests |
| Route | Dedicated `/tools/calculators/{slug}` | Hub only |
| Catalog | `uiCalculatorSlug` set; `chatOnlyForm: false` | `uiCalculatorSlug: null`; `chatOnlyForm: true` |
| Sidebar | `panelTool: calculators`; `initialCalc` on Tier A | Hub path; no `initialCalc` |
| NLU launch | `openLabel: "Open"` | `openLabel: "Start guided chat"` |

Tier C (`sofa-calculator`, `drug-interactions`, `lab-interpreter`) is **unchanged**—PR2 tools are intentionally excluded from `REGISTERED_EXECUTOR_TOOL_IDS`.

---

## 4. MELD formula implementation notes

**Module:** `src/utils/meldCalculator.js`

**MELD (laboratory):**
- UNOS floors: bilirubin and INR ≥ 1.0; creatinine ≥ 1.0 (cap 4.0 if not on dialysis).
- Dialysis (≥2×/week): creatinine fixed at 4.0 mg/dL regardless of entered value.
- Formula: `round(10 × (0.957×ln(Cr) + 0.378×ln(Bili) + 1.12×ln(INR) + 0.643))`, clamped **6–40**.
- Unit conversion: bilirubin μmol/L and creatinine μmol/L supported.

**MELD-Na:**
- Sodium clamped to **125–140 mEq/L** before adjustment.
- MELD floor of **11** applied for sodium step when laboratory MELD &lt; 11.
- `MELD-Na = max(laboratory MELD, round(adjusted))`, capped at 40.
- Regression-tested: MELD 15 + Na 125 → MELD-Na **25**.

**UI:** Single `MeldCalculator` component with `mode="meld" | "meld-na"`; validation blocks calculate until required labs (and sodium for MELD-Na) are valid.

**Safety copy:** Transplant listing explicitly disclaimed; interpretation uses historical mortality **signals**, not eligibility recommendations.

---

## 5. Registry changes

| File | Change |
|------|--------|
| `src/data/clinicalToolIdContract.js` | `PR2_*` tier slices; `NLU_TO_REGISTRY_ID` aliases for MELD/TIMI/Wells/PERC |
| `src/data/toolRegistry.js` | Five sidebar entries under calculators panel |
| `src/data/clinicalIntentToolCatalog.js` | NLU profiles + `nluCalculatorHubOnly` for Wells/PERC |
| `src/data/clinicalCatalogWiring.js` | Re-exports contract; `resolveCatalogLaunch` paths unchanged in pattern |

**Canonical IDs:** `meld`, `meld-na`, `timi-ua-nstemi`, `wells-pe`, `perc` (frozen in `PR2_CALCULATOR_REGISTRY_IDS`).

---

## 6. Discovery / catalog changes

**Discovery (`sourceCodeToolDiscovery.js`):**
- Hyphenated alias rows (e.g. `meld-score` → `meld`, `timi-score` → `timi-ua-nstemi`, `pe-score` → `wells-pe`, `pe-rule-out` → `perc`, `meld-sodium` → `meld-na`).
- Merged discovery exposes one canonical row per PR2 id.

**Catalog (`medicalToolsCatalogIndex`):**
- Tier-A: `pagePath` = dedicated route; `uiCalculatorSlug` = registry id.
- Tier-B: `pagePath` = `/tools/calculators`; `chatOnlyForm: true`.
- All five: `chatOnRequest: true`; `chatSeed` length &gt; 20 chars.

**Hub layout (`chatAssistedHubGroups.js`):**
- `groupId: "pe"` includes `wells-pe` and `perc` with shared PE safety lead.

**Search:** `PR2_CATALOG_SEARCH_QUERIES` in `pr2TestConstants.js`; verified via `catalogRowsMatchingQuery`.

---

## 7. NLU additions

**Backend:** `backend/.../patterns/tool.patterns.ts` — dedicated patterns for all five `toolId`s with disambiguation where needed (Wells vs Wells DVT via existing `preferWellsPe` filters).

**Frontend:** `NLU_TO_REGISTRY_ID` phrase and slug aliases (space-separated and hyphenated), consolidated in:
- `pr2MeldTestConstants.js`, `pr2TimiTestConstants.js`, `pr2WellsPeTestConstants.js`, `pr2PercTestConstants.js`
- `pr2TestConstants.js` (aggregated `PR2_ALL_ALIAS_PAIRS`)
- `clinicalToolAliasSync.js` (`ALL_REQUIRED_CATALOG_ALIAS_PAIRS`)

**Orchestrator:** PR2 ids remain in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` — NLU may route to catalog/chat but **not** imply `POST /api/tools/:id/execute`.

---

## 8. Conversational workflow additions

| Tool | Config | Launch behavior |
|------|--------|-----------------|
| Wells PE | `src/data/chatAssistedCalculators/wellsPe.js` | Stepwise criteria; **STEP 0** unstable-patient guard; forbids "confirmed/excluded/ruled out" PE language |
| PERC | `src/data/chatAssistedCalculators/perc.js` | Requires low pre-test probability (~≤15%) before checklist; emphasizes non-definitive rule-out |

**Launch:** `resolveCatalogLaunch('wells-pe' | 'perc')` → `/tools/calculators`, `registryId` preserved, `chatSeed` from config, `orchestratorTool: null`.

**Hub UI:** `calc-chat-assisted` section; cards use `chatAssistedLaunchAriaLabel()`; keyboard-accessible buttons with `aria-describedby` on descriptions.

---

## 9. Safety considerations

| Risk | Mitigation |
|------|------------|
| Diagnostic certainty | Shared `CalcDecisionSupportLead`; tool-specific disclaimers; interpretation avoids "rule out," "confirmed," transplant listing |
| Treatment directives | TIMI/GRACE-style ACS disclaimer: no antiplatelet/anticoagulant/revascularization orders |
| PE misclassification | Wells: pre-test probability only; PERC: low pre-test required; `pe-score` vs `pe-rule-out` alias separation |
| STEMI misuse | TIMI UI + `acsDisclaimer` state **not for STEMI** |
| Transplant misuse | MELD `transplantDisclaimer` on every result |
| PHI in backend | No Tier C executor — scores not auto-persisted to `tool_results` on execute |
| Emergency delay | Wells STEP 0; hub lead stresses urgent pathways over completing chat |

**Utils tests:** `pr2UxSafety.test.js` enforces copy contracts on interpretations and chat seeds.

---

## 10. Accessibility improvements

- **Tier A:** `CalcResultsPanel` with `aria-live="polite"`, focusable results region, scroll-into-view on calculate (respects `prefers-reduced-motion`).
- **MELD:** `role="alert"` validation summary; per-field `calcFieldClass` + `aria-invalid`; `aria-describedby` on inputs; labeled score regions (`aria-labelledby`).
- **TIMI:** Semantic `<fieldset>` / `<legend>`; checkbox `aria-describedby` per criterion; reset returns focus to first criterion.
- **Tier B:** `chatAssistedLaunchAriaLabel`; hub group `aria-labelledby`; 44px touch targets at mobile breakpoints (`Calculators.css`).
- **Regression tests:** `pr2UxAccessibility.test.js`, `pr1UxAccessibility.test.js` pattern parity.

**Build fix (included):** Corrected TIMI/MELD results-panel JSX closing tags so production builds compile.

---

## 11. Testing performed

**Recommended CI command:**

```bash
npm test -- --run \
  src/data/pr2Comprehensive.test.js \
  src/data/pr2RegistrationAudit.test.js \
  src/data/pr2Consistency.test.js \
  src/data/pr2Coverage.test.js \
  src/data/pr2UxSafety.test.js \
  src/data/pr2UxAccessibility.test.js \
  src/data/meldCalculatorsWiring.test.js \
  src/data/timiCalculatorsWiring.test.js \
  src/data/wellsPeWiring.test.js \
  src/data/percWiring.test.js \
  src/utils/meldCalculator.test.js \
  src/utils/timiUaNstemiCalculator.test.js \
  src/utils/wellsPeCalculator.test.js \
  src/utils/percCalculator.test.js
```

| Suite | Focus |
|-------|--------|
| `pr2Comprehensive.test.js` | Cross-layer: formulas, edges, registry, catalog, discovery, NLU, launch (166 tests) |
| `pr2RegistrationAudit.test.js` | PR1-style full wiring audit (168 tests) |
| `pr2Consistency.test.js` | Tier groupings, alias aggregation (57 tests) |
| `pr2Coverage.test.js` | Catalog/discovery + Wells/PERC launch (25 tests) |
| `pr2UxSafety.test.js` | Clinical copy contracts (14 tests) |
| `pr2UxAccessibility.test.js` | UI a11y contracts (9 tests) |
| Per-tool wiring + utils | Focused regressions |

**Edge cases explicitly covered:** MELD low creatinine floor; dialysis creatinine 4.0; MELD-Na 15+125→25; TIMI score 7; Wells all-criteria 12.5 (high probability); PERC all-negative (8 unmet).

**E2E matrix:** `e2eToolValidationMatrix.js` updated to reference `pr2Comprehensive.test.js` for all PR2 registry ids.

---

## 12. Risk assessment

| Area | Level | Notes |
|------|-------|-------|
| Patient safety (copy) | Low–medium | Mitigated by disclaimers + tests; chat output still model-dependent for Tier B |
| Formula drift | Low | Deterministic utils + regression vectors; no duplicate backend formula |
| Routing / ID drift | Low | `pr2RegistrationAudit` + alias sync suite |
| Build / deploy | Low | JSX fix applied; standard Vite SPA deploy |
| NLU false positives | Medium | Wells DVT disambiguation relies on existing pattern filters—monitor analytics |
| Scope creep | Low | No orchestrator executors; no PHI persistence changes |

**Residual:** Tier B tools depend on LLM adherence to `chatSeed` guardrails; periodic manual QA on chat transcripts recommended.

---

## 13. Follow-up roadmap

1. **Optional:** `pr2Comprehensive`-style visual QA checklist in `e2eManualQaChecklist.js` for bedside flows.
2. **Analytics:** Track catalog launches vs calculator form completion for MELD/TIMI.
3. **Shared scores package:** If native/Android clients need server MELD, extract `meldCalculator` logic to shared package before Tier C (see below).
4. **Alias monitoring:** Watch NLU logs for `pe-score` / `pe-rule-out` confusion.
5. **Backend pattern CI:** Resolve unrelated `tool.patterns.ts` typing issues if pattern tests are gated in CI.

---

## Concise changelog

```
feat(calculators): add MELD, MELD-Na, TIMI UA/NSTEMI Tier-A forms with UNOS/TIMI scoring
feat(calculators): add Wells PE and PERC Tier-B guided chat on calculators hub
feat(routing): register /tools/calculators/meld, meld-na, timi-ua-nstemi deep links
feat(nlu): PR2 tool.patterns, NLU_TO_REGISTRY_ID, and discovery alias rows
feat(catalog): PR2 catalog rows, PE hub group, searchable aliases
fix(calculators): TIMI/MELD CalcResultsPanel JSX structure for production build
a11y(calculators): MELD field validation, TIMI fieldset semantics, hub chat labels
test(pr2): comprehensive, registration audit, wiring, UX safety, and utils suites
docs: PR2 production documentation (release/pr2-clinical-calculators)
```

---

## Reviewer checklist

- [ ] Confirm five registry IDs match sidebar, catalog, and `PR2_CALCULATOR_REGISTRY_IDS`
- [ ] Open `/tools/calculators/meld`, `meld-na`, `timi-ua-nstemi` — forms calculate and reset
- [ ] Verify MELD-Na requires sodium; invalid labs show inline + summary errors
- [ ] Hub: launch Wells PE and PERC — chat seed includes safety language
- [ ] Catalog search: "meld score", "timi nstemi", "wells pe", "perc rule"
- [ ] Alias launch: `meld-score`, `timi-score`, `pe-score`, `pe-rule-out` resolve correctly
- [ ] Confirm PR2 tools **do not** appear in `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`
- [ ] Spot-check interpretation copy for treatment/transplant/diagnostic certainty
- [ ] Run PR2 test command above locally or in CI
- [ ] No unintended changes to Tier C executors or auth/billing

---

## Rollout strategy

1. **Merge to main** after CI green on PR2 test matrix.
2. **Staging deploy** — smoke test all five tools + alias deep links.
3. **Clinical informatics sign-off** (optional) — review disclaimers on MELD/TIMI/PE tools.
4. **Production deploy** — standard SPA release; no database migration required.
5. **Post-deploy monitoring** (48h) — error rates on `/tools/calculators/*`, chat launch counts, NLU tool routing logs.
6. **Communicate** — release notes to clinical users: new liver, ACS risk, and PE support tools on Calculators hub.

**Feature flags:** None required; tools are additive. To hide pre-release, omit registry rows (not recommended post-merge).

---

## Rollback strategy

| Scenario | Action |
|----------|--------|
| Single tool defective | Remove registry + NLU row + App route for that id; redeploy (no migration) |
| Formula error | Revert utils + Calculators.jsx; hotfix deploy; notify users if scores displayed |
| Chat safety issue | Disable Tier B card via removing from `nluCalculatorHubOnly` / hub group; redeploy |
| Full PR revert | Revert merge commit; redeploy previous SPA artifact |

**Data:** No server-side score persistence introduced; rollback does not require DB changes.

---

## Future PR recommendations

| PR | Scope |
|----|--------|
| PR3 follow-through | Ensure GRACE/NIHSS/Ottawa wiring parity with PR2 audit pattern |
| PR4a calculators | ASCVD, CKD, STOP-BANG, AUDIT-C — reuse `pr2Comprehensive` template |
| Manual QA doc | Bedside checklist entries for MELD dialysis toggle and PERC low-pretest gate |
| Catalog UX | Tier badges on PR2 rows in Clinical Tool Catalog (if not already visible) |
| Analytics hooks | `recordToolAccess` enrichment for PR2 calculator completions |

---

## Future Tier C candidates (not in PR2)

Evaluated and **deferred** unless product requires server attestation, API integrators, or mandatory audit persistence:

| Tool | Tier C justification (if ever needed) | PR2 decision |
|------|----------------------------------------|--------------|
| MELD / MELD-Na | Single `meld-calculator` executor + shared formula package; avoid duplicate JS/TS | Stay Tier A |
| TIMI UA/NSTEMI | Same as MELD — closed-form, already tested client-side | Stay Tier A |
| Wells PE / PERC | Chat-native; no deterministic form; executor adds little vs seed guardrails | Stay Tier B |
| SOFA | Already Tier C where ICU/chat POST needed | Unchanged |

**Trigger Tier C when:** external EHR API needs `POST /tools/meld-calculator/execute`, institutional policy requires server-side score logging, or native clients cannot ship shared JS formula module.

---

*Document version: PR2 clinical calculators · aligns with `clinicalToolIdContract` PR2 slices and production-hardening tier model.*
