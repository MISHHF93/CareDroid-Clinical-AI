# Add GRACE ACS, NIHSS, Canadian C-Spine, and Ottawa Ankle Clinical Tools

## 1. Summary

PR3 ships **four Tier-B chat-assisted clinical decision-support tools** on the calculators hub (`/tools/calculators`). Each tool uses guided conversational workflows (`chatSeed`), shared launch wiring (`resolveCatalogLaunch`), and client-side scoring utilities for deterministic validation—not for mandatory bedside forms in this release.

**Tools:** GRACE ACS (ACS mortality risk stratification), NIH Stroke Scale (NIHSS), Canadian C-Spine Rule (CCR), and Ottawa Ankle / Foot Rules.

**Explicit non-goals:** No new NestJS `registerTool()` executors (Tier C). No dedicated `/tools/calculators/{id}` SPA routes or `Calculators.jsx` wizard forms. No treatment, anticoagulation, thrombolysis, or imaging orders in UI or seeds. All four registry ids remain in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` with `backendExecutable: false`.

**Outcome:** Clinicians can access ACS prognosis support, structured NIHSS documentation, and trauma imaging decision support from sidebar, medical catalog, NLU routing, and hub cards—with consistent registry IDs, searchable aliases, clinical safety guardrails, and accessibility-tested launch controls.

---

## 2. Clinical tools added

| Registry ID | Display name | Clinical role | Validated population / scope |
|-------------|--------------|---------------|------------------------------|
| `grace-acs` | GRACE ACS | GRACE 2.0 admission mortality risk (in-hospital and 6-month); ACS risk stratification support | Suspected ACS after admission variables collected; unstable ACS/STEMI excluded in STEP 0 |
| `nihss` | NIH Stroke Scale (NIHSS) | Structured neurologic deficit severity (0–42) | Acute stroke evaluation context; does not replace stroke team / imaging pathways |
| `canadian-c-spine` | Canadian C-Spine Rule | Cervical spine imaging decision support | Alert, stable adult blunt neck trauma; not c-spine clearance |
| `ottawa-ankle` | Ottawa Ankle Rule | Ankle / foot radiography decision support after acute injury | Acute ankle/foot injury; hard stops override rule |

**Client scoring modules (reference / test / future Tier A):**

| Module | Purpose |
|--------|---------|
| `src/utils/graceAcsCalculator.js` | GRACE 2.0 logistic mortality estimates |
| `src/utils/nihssCalculator.js` | NIHSS item validation, total, severity bands |
| `src/utils/canadianCSpineCalculator.js` | CCR high/low-risk branches, ROM 45° |
| `src/utils/ottawaAnkleCalculator.js` | Ottawa ankle and foot radiograph criteria |

**Clinical references (embedded in utils / seeds):** GRACE 2.0 registry models; NIHSS standard item definitions; Stiell et al. (Canadian C-Spine); Ottawa ankle/foot rule validation literature cited in chat seeds.

---

## 3. Tool tier classification

PR3 tools are **Tier B only**—frozen in `PR3_TIER_B_CHAT_CALCULATOR_IDS` and `PR3_CALCULATOR_REGISTRY_IDS` (`clinicalToolIdContract.js`).

```text
Tier B (PR3) — all four tools
────────────────────────────────────────────────────────────
Route:           /tools/calculators (hub only)
UI:              chatAssistedCalculators/*.js + hub cards (CHAT_ASSISTED_HUB_GROUPS)
Launch:          resolveCatalogLaunch → path hub, openLabel "Start guided chat"
NLU:             clinicalIntentTools + nluCalculatorHubOnly
Scoring:         Conversational (chat); utils tested client-side
backendExecutable: false
POST execute:    Not supported (NLU_TOOL_IDS_WITHOUT_EXECUTOR)
```

| Concern | PR3 (all four) |
|---------|----------------|
| Dedicated calculator route | **No** — not in `CALCULATOR_ROUTE_DEFS` |
| `Calculators.jsx` form | **No** — hub chat-assisted cards only |
| Catalog `uiCalculatorSlug` | `null` |
| Catalog `chatOnlyForm` | `true` |
| `initialCalc` on registry row | Undefined |
| Orchestrator POST | **Excluded** — same pattern as PR2 Tier B (Wells, PERC) |

**Tier A (PR1/PR2)** and **Tier C (SOFA, drug-interactions, lab-interpreter)** are unchanged by this PR.

---

## 4. Registry changes

| File | Change |
|------|--------|
| `src/data/clinicalToolIdContract.js` | `PR3_TIER_B_CHAT_CALCULATOR_IDS`, `PR3_CALCULATOR_REGISTRY_IDS`; `NLU_TO_REGISTRY_ID` aliases for GRACE, NIHSS, CCR, Ottawa |
| `src/data/toolRegistry.js` | Four sidebar entries: `panelTool: calculators`, `path: /tools/calculators` |
| `src/data/clinicalIntentToolCatalog.js` | NLU profiles sourced from chat configs; `nluCalculatorHubOnly` entries |
| `src/data/clinicalCatalogWiring.js` | Re-exports contract slices; `resolveCatalogLaunch` returns hub path + config `chatSeed` |

**Canonical registry IDs (frozen):** `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`.

**Registry copy (decision-support framing):**

- GRACE: clinical decision support; not ACS diagnosis or treatment  
- NIHSS: does not replace urgent stroke care  
- Canadian C-Spine: imaging decision support; not c-spine clearance  
- Ottawa Ankle: not fracture clearance  

---

## 5. NLU additions

**Backend:** `backend/.../intent-classifier/patterns/tool.patterns.ts`

- One pattern block per `toolId` (`grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`)
- Disambiguation helpers: `preferGraceAcs`, `preferNihss`, `preferCanadianCSpine`, `preferOttawaAnkle`
- LLM fallback lines in `intent-classifier.service.ts` describing chat-assisted scope

**Frontend alias maps:** `NLU_TO_REGISTRY_ID` in `clinicalToolIdContract.js`; consolidated test constants in `pr3TestConstants.js`:

- `PR3_REQUIRED_NLU_ALIAS_PAIRS` — product ship list  
- `PR3_NLU_ALIAS_PAIRS` — extended phrases  
- `PR3_DISCOVERY_ALIAS_PAIRS` — hyphenated slugs  
- `PR3_ALL_ALIAS_PAIRS` — union for audit tests  

**Alias separation (safety-critical):**

- `stroke scale` → `nihss` (not cervical spine)  
- `c spine rule` / `cervical-spine-rule` → `canadian-c-spine`  

**Orchestrator:** All PR3 NLU ids listed in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` (backend `tool-orchestrator.registry.ts`). NLU may route to catalog/chat; **no** `POST /api/tools/:id/execute` for PR3 tools.

---

## 6. Chat-assisted workflow additions

| Tool | Config | Hub group | STEP 0 / safety gate |
|------|--------|-----------|----------------------|
| GRACE ACS | `chatAssistedCalculators/graceAcs.js` | `cardiac` | Unstable ACS, STEMI, shock, arrest — emergency pathways before GRACE |
| NIHSS | `chatAssistedCalculators/nihss.js` | `neurology` | Time-critical stroke — EMS, CT/CTA, stroke team before completing chat |
| Canadian C-Spine | `chatAssistedCalculators/canadianCSpine.js` | `trauma` | Applicability + unstable trauma / primary survey priority |
| Ottawa Ankle | `chatAssistedCalculators/ottawaAnkle.js` | `trauma` | Hard stops: neurovascular compromise, open fracture, deformity, etc. |

**Launch contract:**

```text
resolveCatalogLaunch(id | alias)
  → path: /tools/calculators
  → registryId: canonical id
  → openLabel: "Start guided chat"
  → orchestratorTool: null
  → chatSeed: from chatAssisted config (guardrails appended via ensureChatSeedGuardrails)
```

**Hub UI (`Calculators.jsx`):**

- `CHAT_ASSISTED_HUB_GROUPS` section with group `role="group"` and `aria-labelledby`  
- Keyboard note: Tab + Enter to launch  
- PR3 cards use `chatAssistedLaunchAriaLabelForTool()` with tool-specific urgent-care context  
- `backendExecutable: false` on all NLU rows  

**Guardrail profiles (`clinicalSafetyGuardrails.js`):**

- `grace-acs` → `peAcs` (no ACS diagnostic certainty, no treatment directives)  
- `nihss`, `canadian-c-spine`, `ottawa-ankle` → `traumaStroke` (urgent pathways, no clearance language)  

---

## 7. Discovery / catalog changes

**Discovery (`sourceCodeToolDiscovery.js`):**

- Hyphenated alias rows (e.g. `grace-score` → `grace-acs`, `nih-stroke-scale` → `nihss`, `canadian-c-spine-rule` → `canadian-c-spine`, `ottawa-ankle-rule` → `ottawa-ankle`)  
- Merged discovery: exactly one canonical row per PR3 id with calculator provenance  

**Catalog (`medicalToolsCatalogIndex`):**

- `pagePath`: `/tools/calculators`  
- `chatOnlyForm`: `true`  
- `uiCalculatorSlug`: `null`  
- `chatOnRequest`: `true`  
- `backendExecutor`: `false`  
- `chatSeed` aligned with NLU profile  

**Search queries (`PR3_CATALOG_SEARCH_QUERIES`):** `grace acs`, `nih stroke`, `c-spine`, `ottawa ankle` — verified via `catalogRowsMatchingQuery`.

**Alias sync:** PR3 pairs included in `clinicalToolAliasSync.js` (`ALL_REQUIRED_CATALOG_ALIAS_PAIRS` aggregation).

---

## 8. Backend executor evaluation

| Tool | Tier C considered? | PR3 decision | Rationale |
|------|-------------------|--------------|-----------|
| GRACE ACS | Optional `grace-acs-calculator` executor | **Deferred** | GRACE 2.0 logistic model implemented and tested in `graceAcsCalculator.js`; chat-native workflow sufficient unless institution requires server attestation or mandatory `tool_results` persistence |
| NIHSS | Possible `nihss-calculator` | **Deferred** | Domain-by-domain exam is conversational; server scoring adds governance burden without clear bedside form in PR3 |
| Canadian C-Spine | Possible `ccr-calculator` | **Deferred** | Applicability gates and exam documentation fit chat; executable trauma workflow needs local governance |
| Ottawa Ankle | Possible `ottawa-ankle-calculator` | **Deferred** | Same as CCR; hard stops and applicability are seed-enforced |

**Current backend state:**

- `REGISTERED_EXECUTOR_TOOL_IDS` unchanged: `sofa-calculator`, `drug-interactions`, `lab-interpreter` only  
- PR3 ids in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` → structured `UNSUPPORTED_TOOL` if execute is attempted  
- No PHI auto-persistence to `tool_results` via execute for PR3  

**Trigger Tier C when:** external API requires `POST /tools/:id/execute`, institutional policy mandates server-side score logging, or native clients cannot ship shared JS formula modules.

---

## 9. Safety considerations

| Risk | Mitigation |
|------|------------|
| Diagnostic certainty | Seeds state decision support only; GRACE does not confirm/exclude ACS; CCR does not "clear" c-spine; Ottawa does not prove absence of fracture |
| Delaying emergency care | STEP 0 gates on all four tools; hub group leads prioritize ACS, stroke, and trauma pathways over chat completion |
| Treatment / dosing directives | GRACE forbids specific treatments; NIHSS forbids IV tPA / thrombectomy dosing recommendations |
| Low NIHSS false reassurance | Seed: low or incomplete NIHSS does not exclude LVO or hemorrhage |
| Unstable trauma / ACS | Hard stops and applicability checks before rule application |
| PE/ACS phrase collision | Backend disambiguation + separate alias maps (`stroke scale` vs `c spine rule`) |
| LLM adherence (Tier B) | `chatSeed` + `ensureChatSeedGuardrails`; `auditChatSeed` in tests |
| PHI via execute | No Tier C executor — scores not auto-persisted on POST execute |

**Automated gates:** `clinicalSafetyGuardrails.test.js`, `pr3UxSafetyAccessibility.test.js`, per-tool wiring tests for forbidden phrasing patterns.

---

## 10. Accessibility considerations

| Area | Implementation |
|------|----------------|
| Keyboard launch | Hub cards are `<button type="button">`; group note documents Tab + Enter |
| Screen readers | `aria-label` via `chatAssistedLaunchAriaLabel` / `chatAssistedLaunchAriaLabelForTool` (PR3 urgency context) |
| Descriptions | `aria-describedby` on each card linking to description element |
| Focus | `:focus-visible` outline on `.calc-chat-assisted-card` |
| Touch / mobile | `min-height` 44px (48px at ≤480px); single-column grid; `touch-action: manipulation` |
| Motion | `prefers-reduced-motion` disables card transition |
| Text overflow | `overflow-wrap: anywhere` on descriptions |

**Regression tests:** `pr3UxSafetyAccessibility.test.js` (source contracts on `Calculators.jsx` / `Calculators.css`).

---

## 11. Testing performed

**Recommended CI command:**

```bash
npm test -- --run \
  src/data/pr3Comprehensive.test.js \
  src/data/pr3RegistrationAudit.test.js \
  src/data/pr3Consistency.test.js \
  src/data/pr3Coverage.test.js \
  src/data/pr3UxSafetyAccessibility.test.js \
  src/data/graceAcsWiring.test.js \
  src/data/nihssWiring.test.js \
  src/data/canadianCSpineWiring.test.js \
  src/data/ottawaAnkleWiring.test.js \
  src/data/clinicalSafetyGuardrails.test.js \
  src/data/clinicalToolAliasSync.test.js \
  src/data/e2eToolValidationMatrix.test.js \
  src/utils/graceAcsCalculator.test.js \
  src/utils/nihssCalculator.test.js \
  src/utils/canadianCSpineCalculator.test.js \
  src/utils/ottawaAnkleCalculator.test.js
```

| Suite | Focus | Tests (approx.) |
|-------|--------|-----------------|
| `pr3Comprehensive.test.js` | Ten audit areas: registry, catalog, discovery, NLU, launch, chatSeed, backend, routes, duplicates, orphans + utils smoke + per-tool launch aliases | 220 |
| `pr3RegistrationAudit.test.js` | Cross-system registration audit (parsed backend patterns) | 172 |
| `pr3Consistency.test.js` | Tier lists, alias aggregation, deep links | 27 |
| `pr3Coverage.test.js` | Cross-layer coverage matrix | 29 |
| `pr3UxSafetyAccessibility.test.js` | Safety copy, hub UX, a11y contracts | 43 |
| `*Wiring.test.js` (×4) | Per-tool focused wiring | 28 |
| Utils `*.test.js` (×4) | Deterministic scoring regressions | 24 |
| `clinicalToolAliasSync.test.js` | Global alias drift (includes PR3 pairs) | 403 |
| `e2eToolValidationMatrix.test.js` | Shipped tool inventory ↔ test file map | 134 |

**PR3 comprehensive coverage areas (deterministic, no snapshots):**

1. Registry inclusion  
2. Catalog inclusion  
3. Discovery inclusion  
4. NLU alias matching  
5. `resolveCatalogLaunch` behavior  
6. `chatSeed` presence  
7. Backend alias consistency  
8. Route / hub path correctness  
9. Duplicate alias detection  
10. No orphaned tool IDs  

**E2E matrix:** `e2eToolValidationMatrix.js` updated to reference `pr3Comprehensive.test.js` for all four PR3 registry ids.

---

## 12. Risk assessment

| Area | Level | Notes |
|------|-------|-------|
| Patient safety (copy) | Low–medium | Mitigated by STEP 0 gates, hub leads, guardrails, and Vitest copy contracts; Tier B chat output remains model-dependent |
| Trauma / stroke delay | Medium (residual) | Strong seed language; monitor chat transcripts in pilot |
| NLU false routing | Low–medium | Disambiguation helpers + alias separation tests; monitor intent logs |
| Formula drift (utils) | Low | Client utils regression-tested; not exposed as mandatory UI forms in PR3 |
| Routing / ID drift | Low | `pr3RegistrationAudit` + `clinicalToolAliasSync` |
| Scope creep | Low | No Tier C executors; no new App routes |
| Build / deploy | Low | Standard Vite SPA; no DB migration |

**Residual:** Tier B adherence to structured NIHSS / CCR / Ottawa workflows depends on LLM following `chatSeed`; recommend periodic clinical informatics review of sample sessions.

---

## 13. Rollout strategy

1. **Merge to main** after CI green on PR3 test matrix above.  
2. **Staging deploy** — smoke test hub cards, catalog search, and representative alias launches (`grace-score`, `nih-stroke-scale`, `c-spine-rule`, `ottawa-ankle-rule`).  
3. **Clinical informatics review (recommended)** — sign `CLINICAL_GOVERNANCE_CHECKLIST.md` for ACS, stroke, and trauma copy.  
4. **Production deploy** — standard SPA release; no database migration.  
5. **Post-deploy monitoring (48–72h)** — error rates on `/tools/calculators`, chat launch counts, NLU routing for `stroke scale` vs c-spine aliases.  
6. **Communicate** — release notes: GRACE ACS, NIHSS, Canadian C-Spine, and Ottawa Ankle available under Calculators → chat-assisted groups (cardiac, neurology, trauma).

**Feature flags:** Not required; tools are additive. To hide pre-release, remove registry + NLU rows (not recommended post-merge).

**Pilot suggestion:** Enable for ED / neurology / trauma service lines first; collect feedback on STEP 0 gate visibility in chat transcripts.

---

## 14. Rollback strategy

| Scenario | Action |
|----------|--------|
| Single tool defective | Remove registry row, NLU profile, hub group `toolIds` entry, and discovery aliases for that id; redeploy |
| Chat safety issue | Remove tool from `nluCalculatorHubOnly` and `CHAT_ASSISTED_HUB_GROUPS`; redeploy (fastest Tier B kill switch) |
| NLU misrouting | Disable affected alias keys in `NLU_TO_REGISTRY_ID` + backend keywords; hotfix deploy |
| Full PR revert | Revert merge commit; redeploy previous SPA artifact |

**Data:** No server-side score persistence introduced via orchestrator execute; rollback does not require database changes.

---

## 15. Follow-up roadmap

| Priority | Item |
|----------|------|
| P1 | Bedside manual QA checklist entries for STEP 0 gates (stroke code, unstable ACS, trauma hard stops) |
| P1 | NLU analytics: `stroke scale` vs `c spine rule` collision rate |
| P2 | Optional Tier A forms for NIHSS or GRACE if institution requests structured UI (see `TIER_ROADMAP.md`) |
| P2 | Shared scores package if Android/native clients need offline GRACE/NIHSS without chat |
| P3 | Tier C evaluation only if execute API or audit persistence mandated (see `TIER_ROADMAP.md`) |
| P3 | Visual QA in `e2eManualQaChecklist.js` for mobile hub layout (44–48px targets) |

**Related fleet work:** PR6 (COPD GOLD), PR7 (Rome IV IBS) continue independent Tier-B patterns—no coupling to PR3 merge.

---

## Related documents

| Document | Path |
|----------|------|
| Concise changelog | `release/pr3-clinical-calculators/CHANGELOG.md` |
| Reviewer checklist | `release/pr3-clinical-calculators/REVIEWER_CHECKLIST.md` |
| Clinical governance checklist | `release/pr3-clinical-calculators/CLINICAL_GOVERNANCE_CHECKLIST.md` |
| Tier A / Tier C roadmap | `release/pr3-clinical-calculators/TIER_ROADMAP.md` |

---

*Document version: PR3 clinical calculators · aligns with `PR3_CALCULATOR_REGISTRY_IDS` and production-hardening tier model.*
