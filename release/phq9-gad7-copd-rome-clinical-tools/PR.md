# Add PHQ-9, GAD-7, COPD GOLD Assessment, and Rome IV IBS Clinical Tools

## 1. Summary

This change ships four clinical decision-support tools into CareDroid Clinical AI using the established **Tier A / Tier B** calculator pattern:

| Tool | Registry ID | Tier | UX surface |
|------|-------------|------|------------|
| PHQ-9 (depression symptom screen) | `phq9` | **A** | Dedicated route + built-in Likert form |
| GAD-7 (anxiety symptom screen) | `gad7` | **A** | Dedicated route + built-in Likert form |
| COPD GOLD grouping | `copd-gold` | **B** | Calculators hub → guided chat |
| Rome IV IBS criteria | `rome-iv-ibs` | **B** | Calculators hub → guided chat |

All four tools are wired end-to-end: **tool registry**, **medical tools catalog**, **source discovery**, **App routes** (Tier A), **NLU intent patterns** (backend), **catalog launch resolution**, and **deterministic Vitest coverage**. Outputs are explicitly **screening / decision support only** — no diagnosis, no medication or inhaler recommendations, and no replacement of emergency or specialty pathways.

---

## 2. Clinical tools added

### PHQ-9 (`phq9`) — Tier A

- **Purpose:** Nine-item depression symptom screen (past two weeks), total score 0–27.
- **Implementation:** `src/utils/phq9Calculator.js`, UI in `src/pages/tools/mentalHealthCalculators.jsx` (`Phq9Calculator`).
- **Route:** `/tools/calculators/phq9` (`App.jsx` → `Calculators` with `initialCalculatorId="phq9"`).
- **Severity bands:** None–minimal (0–4), mild (5–9), moderate (10–14), moderately severe (15–19), severe (20–27).
- **Reference:** Kroenke et al., J Gen Intern Med 2001.

### GAD-7 (`gad7`) — Tier A

- **Purpose:** Seven-item anxiety symptom screen (past two weeks), total score 0–21.
- **Implementation:** `src/utils/gad7Calculator.js`, UI in `mentalHealthCalculators.jsx` (`Gad7Calculator`).
- **Route:** `/tools/calculators/gad7`.
- **Severity bands:** None–minimal (0–4), mild (5–9), moderate (10–14), severe (15–21).
- **Reference:** Spitzer et al., Arch Intern Med 2006.

### COPD GOLD (`copd-gold`) — Tier B

- **Purpose:** GOLD **A / B / E** grouping support from symptom burden (mMRC/CAT/clinical summary) and exacerbation/hospitalization history.
- **Implementation:** `src/data/chatAssistedCalculators/copdGold.js`; hub group `pulmonary-copd` in `chatAssistedHubGroups.js`.
- **Launch:** `/tools/calculators` → **Start guided chat** → `/dashboard` (chat seed visible).
- **Explicitly out of scope:** Spirometry grades 1–4, COPD diagnosis, inhaler or pharmacotherapy selection.

### Rome IV IBS (`rome-iv-ibs`) — Tier B

- **Purpose:** Stepwise Rome IV **symptom criteria** review (abdominal pain frequency, duration, defecation relation, stool changes).
- **Implementation:** `src/data/chatAssistedCalculators/romeIvIbs.js`; hub group `gastrointestinal`.
- **Launch:** Same Tier-B pattern as COPD GOLD.
- **Explicitly out of scope:** IBS diagnosis, alarm-feature workup, treatment plans.

---

## 3. Safety considerations

### Mental health (PHQ-9, GAD-7)

- **PHQ-9 Question 9:** Any non-zero Q9 score triggers **critical** UI severity, inline/form/result alerts, and copy directing urgent safety assessment. Q9 elevation **overrides** lower total-score bands for presentation priority.
- **High symptom burden (PHQ-9 total ≥ 15, Q9 = 0):** Escalation message notes score does not rule out suicide risk.
- **GAD-7 severe (≥ 15):** Acute distress safety alert with crisis-line framing (e.g. 988 where applicable).
- **GAD-7 moderate (10–14):** Escalation references PHQ-9 Q9 / suicide-risk pathways.
- **Persistent disclaimers:** 911 / 988 crisis language on forms; screening-only, no diagnosis, no prescribing language in calculator outputs and catalog `chatSeed`s.
- **GAD-7 chat STEP 0:** Suicide/self-harm gate before routine scoring (aligned with PHQ-9).

### Pulmonary / GI (COPD GOLD, Rome IV IBS)

- **Chat STEP 0 gates:** Acute respiratory distress / exacerbation (COPD); alarm features (Rome IV) before criteria chat.
- **Seeds prohibit:** Diagnosis certainty, inhaler recommendations (COPD), and skipping urgent evaluation.
- **Hub group leads** reinforce emergency-pathway priority over completing chat.

### System-wide

- **`backendExecutable: false`** for all four — no autonomous backend executor; clinician-in-the-loop.
- **NLU disambiguation** (`preferPhq9`, `preferGad7`, `preferCopdGold`, `preferRomeIvIbs`) reduces collision with `differential-diagnosis` and cross-tool mental-health routing.

---

## 4. Registry changes

**File:** `src/data/toolRegistry.js`

| ID | `panelTool` | `path` | `initialCalc` |
|----|-------------|--------|---------------|
| `phq9` | `calculators` | `/tools/calculators/phq9` | `phq9` |
| `gad7` | `calculators` | `/tools/calculators/gad7` | `gad7` |
| `copd-gold` | `calculators` | `/tools/calculators` | — |
| `rome-iv-ibs` | `calculators` | `/tools/calculators` | — |

Shortcuts: PHQ-9 `Ctrl+Shift+P`, GAD-7 `Ctrl+Shift+G`, COPD `Ctrl+Shift+O`, Rome `Ctrl+Shift+R` (verify no conflict with existing bindings in your deployment).

**Contract maps** (`clinicalToolIdContract.js` / `clinicalCatalogWiring.js`):

- `BUILTIN_CALC_ID_TO_REGISTRY_ID`: `phq9`, `gad7`
- `NLU_TO_REGISTRY_ID`: full alias tables (PR5/PR6/PR7 constants)
- `ORCHESTRATOR_TO_REGISTRY_ID`: Tier-A ids only; Tier-B launches use `orchestratorTool: null`

---

## 5. NLU additions

**Backend:** `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`

| Tool | `toolId` | Disambiguation helper |
|------|----------|------------------------|
| PHQ-9 | `phq9` | `preferPhq9` |
| GAD-7 | `gad7` | `preferGad7` |
| COPD GOLD | `copd-gold` | `preferCopdGold` |
| Rome IV IBS | `rome-iv-ibs` | `preferRomeIvIbs` |

**Required NLU phrase aliases (examples):**

- **PHQ-9:** `phq9`, `depression screen`, `depression questionnaire`, `mood screen`
- **GAD-7:** `gad7`, `anxiety screen`, `anxiety questionnaire`, `generalized anxiety screen`
- **COPD GOLD:** `gold copd`, `copd assessment`, `copd risk`, `gold classification`
- **Rome IV IBS:** `ibs criteria`, `rome iv`, `irritable bowel syndrome criteria`

**Discovery slugs** (hyphenated): e.g. `phq-9`, `gad-7`, `copd-gold`, `rome-iv-ibs` — resolved via `resolveRegistryId()` and `sourceCodeToolDiscovery.toolIdAliases`.

**Frontend catalog NLU profiles:** `clinicalIntentToolCatalog.js` entries with safety-first `chatSeed` for all four.

---

## 6. Catalog changes

**Medical tools catalog** (`medicalToolsCatalogIndex` / `clinicalIntentToolCatalog`):

- One row per tool with `chatOnlyForm: true` for Tier B; Tier A rows include `uiCalculatorSlug` matching registry id.
- **Launch labels:** Tier A → `Open` (dedicated form); Tier B → `Start guided chat`.
- **Navigation after launch:** Tier B hub tools → `resolveNavigationPathForLaunch` → `/dashboard`; Tier A stays on dedicated calculator path.

**Catalog search queries** (verified in tests):

- `phq9` / `depression screen`
- `gad7` / `anxiety screen`
- `copd gold`
- `rome iv`

**Calculators hub UI:** COPD under **COPD (GOLD grouping)**; Rome under **Rome IV IBS criteria** (`CHAT_ASSISTED_HUB_GROUPS`).

---

## 7. Accessibility improvements

### Tier A (PHQ-9, GAD-7)

- Native `<form>` with keyboard submit; reset returns focus to Q1.
- Every item: `<label htmlFor>`, `aria-required`, `aria-invalid` + visible `.calc-select-field--invalid` when validation fails.
- Fieldset + `<legend>` for question groups; Q9 **Safety item** badge + field help.
- Form `aria-describedby` links disclaimer + validation summary (`formDescribedByIds`).
- Results region: `tabIndex={-1}`, `aria-live` (assertive when safety escalations), score `aria-label`, interpretation `role="region"` with heading id.
- Empty state: `role="status"`; `prefers-reduced-motion` respected for scroll-into-view.

### Tier B hub + shared

- Chat-assisted cards: native `<button>`, `aria-describedby` on description, `chatAssistedLaunchAriaLabelForTool()` with tool-specific urgency context (COPD respiratory distress, Rome alarm features, PHQ-9 Q9, GAD-7 psychiatric emergency).
- Mobile: stacked layout, 44px+ touch targets, warning text wrap (`Calculators.css`).

---

## 8. Testing

### Run commands

```bash
# Four-tool comprehensive suite (176 tests)
npm test -- --run src/data/clinicalToolsComprehensive.test.js

# Calculator units
npm test -- --run src/utils/phq9Calculator.test.js src/utils/gad7Calculator.test.js

# Wiring + cross-tool audit
npm test -- --run src/data/wiringAuditConsistency.test.js src/data/clinicalToolAliasSync.test.js

# Per-tool wiring
npm test -- --run src/data/phq9Wiring.test.js src/data/gad7Wiring.test.js \
  src/data/copdGoldWiring.test.js src/data/romeIvIbsWiring.test.js

# UX / safety
npm test -- --run src/data/pr5UxSafetyAccessibility.test.js src/data/mentalHealthToolsUxAccessibility.test.js
```

### Coverage map (deterministic; no snapshots)

| Area | Primary test file(s) |
|------|----------------------|
| PHQ-9 scoring | `phq9Calculator.test.js`, `clinicalToolsComprehensive.test.js` §1 |
| GAD-7 scoring | `gad7Calculator.test.js`, `clinicalToolsComprehensive.test.js` §2 |
| PHQ-9 Q9 | `phq9Calculator.test.js`, `clinicalToolsComprehensive.test.js` §3 |
| COPD launch | `copdGoldWiring.test.js`, `pr6Consistency.test.js`, comprehensive §4 |
| Rome launch | `romeIvIbsWiring.test.js`, `pr7Consistency.test.js`, comprehensive §5 |
| Registry | `wiringAuditConsistency.test.js`, comprehensive §6 |
| Catalog | `pr5Coverage.test.js`, `pr6`/`pr7` consistency, comprehensive §7 |
| Discovery | `sourceCodeToolDiscovery` contracts, comprehensive §8 |
| Routes | `clinicalToolRoutes.test.js`, comprehensive §9 |
| NLU | `clinicalToolAliasSync.test.js`, `parseToolPatterns.test.js`, comprehensive §10 |

**E2E validation matrix:** all four registry ids list `clinicalToolsComprehensive.test.js` in `e2eToolValidationMatrix.js`.

---

## 9. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User treats screen score as diagnosis | Medium | High | Screening-only copy on UI, results, catalog seeds; governance sign-off |
| Missed suicide risk (Q9 bypass) | Low | Critical | Q9 alerts at field, form, and result layers; STEP 0 in chat seeds |
| NLU routes depression query to wrong tool | Low | Medium | `preferPhq9` / `preferGad7`; alias sync tests |
| COPD/Rome chat implies treatment | Low | High | Seed prohibits inhalers / diagnosis; STEP 0 urgent gates |
| Keyboard / SR users miss warnings | Low | Medium | `aria-live`, labels, hub aria context — UX test contracts |
| Shortcut collision | Low | Low | Document shortcuts; verify in QA |
| Backend pattern drift vs frontend | Medium | Medium | `clinicalToolAliasSync.test.js`, `parseToolPatterns.test.js` |

**Residual risk:** Chat-assisted Tier B outputs depend on model behavior; seeds and guardrails are not a substitute for institutional protocols or clinician review.

---

## 10. Rollout strategy

1. **Merge** behind standard CI (Vitest suites above + existing e2e matrix).
2. **Deploy frontend + backend** together so NLU patterns and catalog launches stay aligned.
3. **Feature visibility:** Tools appear in registry, medical catalog search, calculators hub (Tier B), and dedicated routes (Tier A) — no feature flag required unless your org uses one for clinical tools.
4. **Smoke test (staging):**
   - Open `/tools/calculators/phq9` → complete form → verify Q9 alert with Q9 ≥ 1.
   - Open `/tools/calculators/gad7` → score 15+ → severe alert.
   - Hub → COPD GOLD / Rome IV → confirm chat opens on dashboard with STEP 0 visible in first turn.
   - Catalog search: `depression screen`, `copd gold`, `rome iv`.
5. **Communicate** to clinical champions: screening-only scope, crisis pathways, no new backend executors.
6. **Monitor** (optional): catalog launch analytics, chat tool-id attribution, support tickets for mis-routing.

---

## 11. Rollback strategy

| Layer | Rollback action |
|-------|-----------------|
| **Application** | Revert merge commit; redeploy previous frontend/backend build. |
| **NLU** | Revert `tool.patterns.ts` entries and disambiguation helpers for the four `toolId`s. |
| **Routes** | Removing Tier-A routes (`/tools/calculators/phq9`, `gad7`) returns 404 for bookmarks — acceptable during rollback. |
| **Data** | No schema migrations; no persisted calculator state in DB. |
| **Catalog** | Revert registry/catalog rows; discovery reverts with code. |

**Partial rollback:** Not recommended — registry, NLU, and UI are coupled; partial removal can leave orphan aliases or broken launches.

---

## 12. Future roadmap

| Item | Tier | Notes |
|------|------|-------|
| Dedicated Tier-A forms for additional scores | A | Follow `mentalHealthCalculators` pattern |
| Backend executors (optional) | C | Only with governance + API contracts |
| PHQ-9 / GAD-7 PDF export or EHR writeback | — | Integration workstream |
| COPD GOLD numeric CAT/mMRC embedded inputs | B | Could evolve to hybrid form + chat |
| Rome IV subtype classification (IBS-C/D/M) | B | Extend seed; still non-diagnostic |
| Localization of crisis resources | All | Replace U.S.-centric 988/911 examples |
| Playwright E2E for Q9 alert and hub launch | QA | Complements Vitest contracts |
| Dark-mode contrast audit on warning panels | A11y | WCAG verification |

---

## Key files (reviewer index)

```
src/utils/phq9Calculator.js
src/utils/gad7Calculator.js
src/pages/tools/mentalHealthCalculators.jsx
src/pages/tools/Calculators.jsx
src/pages/tools/Calculators.css
src/data/chatAssistedCalculators/copdGold.js
src/data/chatAssistedCalculators/romeIvIbs.js
src/data/chatAssistedHubGroups.js
src/data/clinicalIntentToolCatalog.js
src/data/toolRegistry.js
src/data/clinicalCatalogWiring.js
src/App.jsx
backend/.../patterns/tool.patterns.ts
src/data/clinicalToolsComprehensive.test.js
```
