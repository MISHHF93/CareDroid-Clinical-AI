# Add GRACE ACS, NIHSS, Canadian C-Spine, and Ottawa Ankle Clinical Tools

## 1. Summary

PR3 delivers **four Tier-B chat-assisted clinical decision-support tools** on the calculators hub (`/tools/calculators`). Each tool uses structured conversational workflows (`chatSeed`), unified catalog launch (`resolveCatalogLaunch`), and **dashboard navigation** (`resolveNavigationPathForLaunch`) so guided chat is visible immediately. Client-side scoring utilities support deterministic regression testing and future Tier-A promotion—they are not mandatory bedside forms in this release.

| Registry ID | Clinical focus |
|-------------|----------------|
| `grace-acs` | GRACE 2.0 ACS admission mortality risk stratification |
| `nihss` | NIH Stroke Scale (0–42) severity documentation |
| `canadian-c-spine` | Canadian C-Spine Rule imaging decision support |
| `ottawa-ankle` | Ottawa Ankle / Foot Rules radiography decision support |

**Explicit non-goals:** No new NestJS `registerTool()` executors (Tier C). No dedicated `/tools/calculators/{id}` SPA routes or `Calculators.jsx` wizard forms. No treatment, anticoagulation, thrombolysis, imaging orders, or fracture/c-spine “clearance” language. All four ids remain in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` with `backendExecutable: false`.

**Outcome:** Clinicians reach ACS prognosis support, structured NIHSS documentation, and trauma imaging decision support from sidebar, medical catalog, NLU routing, and hub cards—with frozen registry IDs, audited aliases, clinical safety guardrails, accessibility-tested launch controls, and Vitest coverage across ten audit dimensions.

---

## 2. Clinical tools added

| Registry ID | Display name | Clinical role | Validated population / scope |
|-------------|--------------|---------------|------------------------------|
| `grace-acs` | GRACE ACS Risk | GRACE 2.0 admission mortality (in-hospital and 6-month); ACS risk stratification support | Suspected ACS after admission variables; unstable ACS/STEMI excluded in STEP 0 |
| `nihss` | NIH Stroke Scale (NIHSS) | Structured neurologic deficit severity (0–42) | Acute stroke evaluation; does not replace stroke team / imaging pathways |
| `canadian-c-spine` | Canadian C-Spine Rule | Cervical spine imaging decision support | Alert, stable adult blunt neck trauma; **not** c-spine clearance |
| `ottawa-ankle` | Ottawa Ankle Rule | Ankle / foot radiography decision support | Acute ankle/foot injury; hard stops override rule |

**Client scoring modules** (reference, Vitest, future Tier A):

| Module | Path |
|--------|------|
| GRACE ACS | `src/utils/graceAcsCalculator.js` |
| NIHSS | `src/utils/nihssCalculator.js` |
| Canadian C-Spine | `src/utils/canadianCSpineCalculator.js` |
| Ottawa Ankle | `src/utils/ottawaAnkleCalculator.js` |

**Chat-assisted configs:** `src/data/chatAssistedCalculators/{graceAcs,nihss,canadianCSpine,ottawaAnkle}.js`

**References (embedded in utils / seeds):** GRACE 2.0 registry models; NIHSS standard item definitions; Stiell et al. (Canadian C-Spine); Ottawa ankle/foot rule validation literature.

---

## 3. Tool tier classification

PR3 tools are **Tier B only**, frozen in `PR3_TIER_B_CHAT_CALCULATOR_IDS` and `PR3_CALCULATOR_REGISTRY_IDS` (`clinicalToolIdContract.js`).

```text
Tier B (PR3) — all four tools
────────────────────────────────────────────────────────────
Catalog path:     /tools/calculators (hub)
Navigation path:  /dashboard (when chatSeed + hub — chat UI host)
UI:               chatAssistedCalculators/*.js + CHAT_ASSISTED_HUB_GROUPS
Launch:           resolveCatalogLaunch → hub path, openLabel "Start guided chat"
NLU:              clinicalIntentTools + nluCalculatorHubOnly
Scoring:          Conversational (chat); utils tested client-side
backendExecutable: false
POST execute:     Not supported (NLU_TOOL_IDS_WITHOUT_EXECUTOR)
```

| Concern | PR3 (all four) |
|---------|----------------|
| Dedicated calculator route | **No** — absent from `CALCULATOR_ROUTE_DEFS` |
| `Calculators.jsx` form | **No** — hub chat-assisted cards only |
| Catalog `uiCalculatorSlug` | `null` |
| Catalog `chatOnlyForm` | `true` |
| Registry `initialCalc` | Undefined |
| Orchestrator POST | **Excluded** — same pattern as PR2 Tier B (Wells, PERC) |

**Unchanged by PR3:** Tier A (PR1/PR2 forms), Tier C (`sofa-calculator`, `drug-interactions`, `lab-interpreter`).

---

## 4. Registry changes

| File | Change |
|------|--------|
| `src/data/clinicalToolIdContract.js` | `PR3_TIER_B_CHAT_CALCULATOR_IDS`, `PR3_CALCULATOR_REGISTRY_IDS`; `NLU_TO_REGISTRY_ID` entries |
| `src/data/toolRegistry.js` | Four sidebar rows: `panelTool: calculators`, `path: /tools/calculators` |
| `src/data/clinicalIntentToolCatalog.js` | NLU profiles from chat configs; `nluCalculatorHubOnly` |
| `src/data/clinicalCatalogWiring.js` | `resolveCatalogLaunch`, `resolveNavigationPathForLaunch` |

**Canonical registry IDs (frozen):** `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`.

**Registry copy (decision-support framing):**

- **GRACE:** clinical decision support; not ACS diagnosis or treatment  
- **NIHSS:** does not replace urgent stroke care  
- **Canadian C-Spine:** imaging decision support; not c-spine clearance  
- **Ottawa Ankle:** not fracture clearance  

---

## 5. NLU additions

**Backend:** `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`

- One pattern block per `toolId`
- Disambiguation: `preferGraceAcs`, `preferNihss`, `preferCanadianCSpine`, `preferOttawaAnkle`
- LLM fallback lines in `intent-classifier.service.ts` (chat-assisted scope)

**Frontend alias contract:** `NLU_TO_REGISTRY_ID` + `pr3TestConstants.js` (aliases **derived** from `*_REQUIRED_NLU_ALIASES` in chat configs to prevent drift).

| Tool | Required NLU phrases (source of truth: chat config exports) |
|------|---------------------------------------------------------------|
| `grace-acs` | grace, grace score, grace acs, acs mortality risk, acute coronary syndrome risk |
| `nihss` | nihss, nih stroke scale, national institutes of health stroke scale, stroke scale, stroke severity score |
| `canadian-c-spine` | canadian c spine, canadian c-spine rule, c spine rule, cervical spine rule, neck trauma imaging rule |
| `ottawa-ankle` | ottawa ankle, ottawa ankle rule, ankle xray rule, ankle injury imaging, foot xray rule |

**Safety-critical alias separation:**

- `stroke scale` → `nihss` (not cervical spine)  
- `c spine rule` / `cervical-spine-rule` → `canadian-c-spine` (not NIHSS)  

**Orchestrator:** All PR3 NLU ids in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` (`tool-orchestrator.registry.ts`). NLU may route to catalog/chat; **no** `POST /api/tools/:id/execute`.

---

## 6. Chat-assisted workflow additions

| Tool | Config | Hub group | STEP 0 / safety gate |
|------|--------|-----------|----------------------|
| GRACE ACS | `graceAcs.js` | `cardiac` | Unstable ACS, STEMI, shock, arrest — emergency pathways before GRACE |
| NIHSS | `nihss.js` | `neurology` | Time-critical stroke — EMS, CT/CTA, stroke team before chat |
| Canadian C-Spine | `canadianCSpine.js` | `trauma` | Applicability + unstable trauma / primary survey priority |
| Ottawa Ankle | `ottawaAnkle.js` | `trauma` | Hard stops: neurovascular compromise, open fracture, deformity, etc. |

**Launch contract:**

```text
resolveCatalogLaunch(id | alias)
  → path: /tools/calculators          (catalog / metadata)
  → registryId: canonical id
  → openLabel: "Start guided chat"
  → orchestratorTool: null
  → chatSeed: from chatAssisted config (+ ensureChatSeedGuardrails)

resolveNavigationPathForLaunch(launch)
  → /dashboard when chatSeed + hub path   (chat UI visibility)
  → launch.path for Tier-A dedicated routes (unchanged)
```

**Consumers:** `Calculators.jsx`, `ClinicalToolCatalog.jsx`, `ToolsOverview.jsx`.

**Guardrail profiles (`clinicalSafetyGuardrails.js`):**

- `grace-acs` → `peAcs`  
- `nihss`, `canadian-c-spine`, `ottawa-ankle` → `traumaStroke`  

---

## 7. Discovery / catalog changes

**Discovery (`sourceCodeToolDiscovery.js`):**

- Hyphenated aliases (e.g. `grace-score`, `nih-stroke-scale`, `canadian-c-spine-rule`, `ottawa-ankle-rule`)  
- Exactly one canonical discovered row per PR3 id  

**Catalog (`medicalToolsCatalogIndex`):**

| Field | PR3 value |
|-------|-----------|
| `pagePath` | `/tools/calculators` |
| `chatOnlyForm` | `true` |
| `uiCalculatorSlug` | `null` |
| `chatOnRequest` | `true` |
| `backendExecutor` | `false` |
| `chatSeed` | Aligned with NLU profile |

**Search queries (`PR3_CATALOG_SEARCH_QUERIES`):** `grace acs`, `nih stroke`, `c-spine`, `ottawa ankle`.

**Alias sync:** PR3 pairs in `clinicalToolAliasSync.js` (`ALL_REQUIRED_CATALOG_ALIAS_PAIRS`).

---

## 8. Backend executor evaluation

| Tool | Tier C considered? | PR3 decision | Rationale |
|------|-------------------|--------------|-----------|
| GRACE ACS | `grace-acs-calculator` | **Deferred** | GRACE 2.0 in `graceAcsCalculator.js`; chat workflow sufficient unless server attestation or `tool_results` persistence required |
| NIHSS | `nihss-calculator` | **Deferred** | Itemized exam is conversational; server scoring needs governance for field-level attestation |
| Canadian C-Spine | `ccr-calculator` | **Deferred** | Applicability + exam narrative fit chat; executable trauma workflow needs local governance |
| Ottawa Ankle | `ottawa-ankle-calculator` | **Deferred** | Same as CCR; hard stops enforced in seed |

**Current backend state:**

- `REGISTERED_EXECUTOR_TOOL_IDS`: `sofa-calculator`, `drug-interactions`, `lab-interpreter` only  
- PR3 ids → `UNSUPPORTED_TOOL` on execute attempt  
- No PHI auto-persistence via orchestrator execute for PR3  

**Promote to Tier C when:** external integrators require `POST /tools/:id/execute`, institutional policy mandates server-side score logging, or native clients cannot ship shared formula modules. **Not** for formula complexity or marketing alone.

---

## 9. Safety considerations

| Risk | Mitigation |
|------|------------|
| Diagnostic certainty | Seeds: decision support only; GRACE does not confirm/exclude ACS; CCR does not “clear” c-spine; Ottawa does not prove absence of fracture |
| Delaying emergency care | STEP 0 on all four; hub group leads prioritize ACS, stroke, trauma over chat completion |
| Treatment / dosing | GRACE: no antiplatelet/anticoagulant/cath directives; NIHSS: no tPA/thrombectomy dosing |
| Low NIHSS false reassurance | Seed: low/incomplete NIHSS does not exclude LVO or hemorrhage |
| Unstable trauma / ACS | Hard stops and applicability before rule application |
| NLU collision (stroke vs c-spine) | Disambiguation helpers + alias separation tests |
| LLM adherence (Tier B) | `chatSeed` + `ensureChatSeedGuardrails`; `auditChatSeed` in tests |
| PHI via execute | No Tier C executor for PR3 |
| Chat invisible on hub-only nav | `resolveNavigationPathForLaunch` → `/dashboard` |

**Automated gates:** `clinicalSafetyGuardrails.test.js`, `pr3UxSafetyAccessibility.test.js`, per-tool `*Wiring.test.js`, `pr3TenAreaCoverage.test.js`.

---

## 10. Accessibility considerations

| Area | Implementation |
|------|----------------|
| Keyboard | Hub cards `<button type="button">`; group note: Tab + Enter |
| Screen readers | `chatAssistedLaunchAriaLabel` / `chatAssistedLaunchAriaLabelForTool` with PR3 urgency context |
| Descriptions | `aria-describedby` on cards |
| Decorative text | `aria-hidden="true"` on visible “Start guided chat” where full intent is in `aria-label` |
| Focus | `:focus-visible` on `.calc-chat-assisted-card` |
| Touch / mobile | `min-height` 44px (48px ≤480px); single-column grid; `touch-action: manipulation`; `safe-area-inset` padding |
| Motion | `prefers-reduced-motion` disables card transition |
| Text overflow | `overflow-wrap: anywhere` on descriptions |

**Regression:** `pr3UxSafetyAccessibility.test.js`, `clinicalCatalogLaunch.test.js`.

---

## 11. Testing performed

**Recommended CI command:**

```bash
npm test -- --run \
  src/data/pr3TenAreaCoverage.test.js \
  src/data/pr3Comprehensive.test.js \
  src/data/pr3RegistrationAudit.test.js \
  src/data/pr3Consistency.test.js \
  src/data/pr3Coverage.test.js \
  src/data/pr3LaunchAudit.test.js \
  src/data/pr3UxSafetyAccessibility.test.js \
  src/data/clinicalCatalogLaunch.test.js \
  src/data/clinicalToolAliasSync.test.js \
  src/data/clinicalSafetyGuardrails.test.js \
  src/data/e2eToolValidationMatrix.test.js \
  src/data/graceAcsWiring.test.js \
  src/data/nihssWiring.test.js \
  src/data/canadianCSpineWiring.test.js \
  src/data/ottawaAnkleWiring.test.js \
  src/utils/graceAcsCalculator.test.js \
  src/utils/nihssCalculator.test.js \
  src/utils/canadianCSpineCalculator.test.js \
  src/utils/ottawaAnkleCalculator.test.js
```

| Suite | Focus |
|-------|--------|
| `pr3TenAreaCoverage.test.js` | **Canonical** ten-area matrix (registry → orphans) |
| `pr3Comprehensive.test.js` | Cross-cutting matrix + utils smoke + per-tool launch |
| `pr3LaunchAudit.test.js` | Launch contract per tool + required alias launches |
| `pr3RegistrationAudit.test.js` | Cross-system registration (incl. parsed backend patterns) |
| `pr3Consistency.test.js` | Tier lists, alias aggregation, deep links |
| `pr3Coverage.test.js` | Cross-layer coverage (mirrors PR2 `pr2Coverage`) |
| `*Wiring.test.js` (×4) | Per-tool focused wiring |
| `clinicalCatalogLaunch.test.js` | Tier B/A launch + `resolveNavigationPathForLaunch` |
| `clinicalToolAliasSync.test.js` | FE ↔ BE alias drift (PR3 pairs included) |
| `e2eToolValidationMatrix.test.js` | Shipped inventory ↔ test file map |
| Utils `*.test.js` (×4) | Deterministic scoring regressions |

**Ten audit dimensions** (`pr3TenAreaCoverage.test.js` + `PR3_COVERAGE_AREA_LABELS`):

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

**Conventions:** PR1/PR2 patterns; deterministic `expect` / `it.each`; no snapshots; shared helpers in `src/data/testHelpers/pr3CoverageMatrix.js`.

**Last verified:** 700+ tests across PR3 core suites; 565+ across alias sync, catalog launch, UX/safety (local Vitest run).

---

## 12. Risk assessment

| Area | Level | Notes |
|------|-------|-------|
| Patient safety (copy) | Low–medium | STEP 0, hub leads, guardrails, Vitest copy contracts; Tier B output remains model-dependent |
| Trauma / stroke delay | Medium (residual) | Strong seed language; monitor pilot transcripts |
| NLU false routing | Low–medium | Disambiguation + alias tests; monitor intent logs |
| Formula drift (utils) | Low | Utils regression-tested; not exposed as mandatory UI forms |
| Routing / ID drift | Low | `pr3RegistrationAudit`, `clinicalToolAliasSync`, `pr3TenAreaCoverage` |
| Chat visibility regression | Low | `resolveNavigationPathForLaunch` + `clinicalCatalogLaunch` |
| Scope creep | Low | No Tier C; no new App calculator routes |
| Build / deploy | Low | Vite SPA; no DB migration |

**Residual:** Tier B adherence to structured NIHSS / CCR / Ottawa workflows depends on LLM following `chatSeed`; recommend periodic clinical informatics review of sample sessions.

---

## 13. Rollout strategy

1. **Merge** after CI green on PR3 test matrix (Section 11).  
2. **Staging** — smoke hub cards, catalog search, alias launches (`grace-score`, `nih-stroke-scale`, `c-spine-rule`, `ottawa-ankle-rule`); confirm navigation lands on **dashboard** with visible chat.  
3. **Clinical informatics review** — sign `CLINICAL_GOVERNANCE_CHECKLIST.md`.  
4. **Production** — standard SPA release; no database migration.  
5. **Post-deploy (48–72h)** — errors on `/tools/calculators` and `/dashboard`; chat launch counts; NLU routing for `stroke scale` vs c-spine aliases.  
6. **Communicate** — release notes: four chat-assisted tools under Calculators (cardiac, neurology, trauma groups).

**Feature flags:** Not required (additive). **Pilot:** ED / neurology / trauma service lines first.

---

## 14. Rollback strategy

| Scenario | Action |
|----------|--------|
| Single tool defective | Remove registry row, NLU profile, hub `toolIds`, discovery aliases; redeploy |
| Chat safety issue | Remove from `nluCalculatorHubOnly` + `CHAT_ASSISTED_HUB_GROUPS` (fastest Tier B kill switch) |
| NLU misrouting | Disable alias keys in `NLU_TO_REGISTRY_ID` + backend keywords; hotfix |
| Navigation regression | Revert `resolveNavigationPathForLaunch` consumers only if isolated |
| Full PR revert | Revert merge commit; redeploy previous SPA artifact |

**Data:** No server-side score persistence via orchestrator execute; rollback requires **no** database changes.

---

## 15. Follow-up roadmap

| Priority | Item |
|----------|------|
| P1 | Bedside manual QA: STEP 0 gates (stroke code, unstable ACS, trauma hard stops) |
| P1 | NLU analytics: `stroke scale` vs `c spine rule` collision rate |
| P2 | Tier A forms — see **Future Tier A candidates** in `TIER_ROADMAP.md` (NIHSS P1) |
| P2 | Shared scores package for native/offline clients |
| P3 | Tier C executors — only if execute API or audit persistence mandated |
| P3 | Visual QA in `e2eManualQaChecklist.js` for mobile hub layout |

**Related fleet:** PR6 (COPD GOLD), PR7 (Rome IV IBS) — independent Tier-B patterns.

---

## Appendices

| Document | Path |
|----------|------|
| Concise changelog | `release/pr3-clinical-calculators/CHANGELOG.md` |
| Reviewer checklist | `release/pr3-clinical-calculators/REVIEWER_CHECKLIST.md` |
| Clinical governance checklist | `release/pr3-clinical-calculators/CLINICAL_GOVERNANCE_CHECKLIST.md` |
| Future Tier A / Tier C candidates | `release/pr3-clinical-calculators/TIER_ROADMAP.md` |

---

*Document version: PR3 clinical calculators · aligns with `PR3_CALCULATOR_REGISTRY_IDS` and production-hardening tier model.*
