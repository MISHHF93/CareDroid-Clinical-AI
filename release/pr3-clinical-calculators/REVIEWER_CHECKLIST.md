# Reviewer checklist — PR3 clinical calculators

**PR title:** Add GRACE ACS, NIHSS, Canadian C-Spine, and Ottawa Ankle Clinical Tools

Use with [`PR_BODY.md`](./PR_BODY.md). Mark items before merge.

---

## Pre-review

- [ ] No `backend/dist/`, `.env`, credentials, or unrelated refactors
- [ ] No new `registerTool()` handlers (Tier C unchanged)
- [ ] Scope limited to: `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`

---

## Architecture & contracts

- [ ] `PR3_CALCULATOR_REGISTRY_IDS` in `clinicalToolIdContract.js` matches four ids above
- [ ] All four in `PR3_TIER_B_CHAT_CALCULATOR_IDS` and `TIER_B_CHAT_CALCULATOR_REGISTRY_IDS`
- [ ] All four in backend `NLU_TOOL_IDS_WITHOUT_EXECUTOR`
- [ ] `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` still only drug-check, lab-interp, sofa-score (3 executors)
- [ ] No PR3 id in `BUILTIN_CALC_ID_TO_REGISTRY_ID` or `builtinUiCalculators`

---

## Routing & launch

- [ ] `resolveCatalogLaunch(pr3-id)` → `path: /tools/calculators`, `openLabel: "Start guided chat"`, `orchestratorTool: null`, non-empty `chatSeed`
- [ ] `resolveNavigationPathForLaunch(resolveCatalogLaunch(pr3-id))` → **`/dashboard`**
- [ ] Wired in `Calculators.jsx`, `ClinicalToolCatalog.jsx`, `ToolsOverview.jsx`
- [ ] No `path: '/tools/calculators/{pr3-id}'` in `App.jsx`
- [ ] No `initialCalculatorId` for PR3 in `App.jsx`
- [ ] `CALCULATOR_ROUTE_DEFS` has no PR3 slugs

---

## Catalog & discovery

- [ ] One catalog row per `primaryId`; `chatOnlyForm: true`; `uiCalculatorSlug: null`; `pagePath: /tools/calculators`
- [ ] Search: `grace acs`, `nih stroke`, `c-spine`, `ottawa ankle` resolve
- [ ] Discovery: one canonical row per id; hyphenated aliases map correctly
- [ ] `stroke scale` → `nihss`; `cervical-spine-rule` → `canadian-c-spine` (no cross-map)

---

## Hub UI (manual)

- [ ] `/tools/calculators` — cardiac / neurology / trauma groups show four tools
- [ ] Launch from hub **or catalog** → user lands on dashboard with chat visible
- [ ] Tab + Enter on each card launches guided chat
- [ ] Group leads mention decision support and emergency-pathway priority
- [ ] Mobile: single-column cards; tap targets ≥44px

---

## Safety copy (spot check)

- [ ] GRACE: unstable ACS / STEMI STEP 0; no ACS diagnosis or treatment orders
- [ ] NIHSS: stroke pathways first; no tPA dosing; low NIHSS ≠ exclude LVO
- [ ] CCR: does not “clear” c-spine; unstable trauma STOP
- [ ] Ottawa: hard stops; not fracture clearance

---

## Backend NLU

- [ ] `tool.patterns.ts`: each PR3 `toolId` exactly once
- [ ] `preferGraceAcs`, `preferNihss`, `preferCanadianCSpine`, `preferOttawaAnkle` present
- [ ] `intent-classifier.service.ts` fallback lines describe chat-assisted scope

---

## Tests (CI / local)

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
  src/data/ottawaAnkleWiring.test.js
```

- [ ] All commands above pass
- [ ] `e2eToolValidationMatrix` lists `pr3TenAreaCoverage.test.js` for all four PR3 ids

---

## Sign-off

| Reviewer | Area | Date | Approved |
|----------|------|------|----------|
| | Frontend wiring / hub UX | | ☐ |
| | Backend NLU / patterns | | ☐ |
| | Clinical safety / informatics | | ☐ |
| | QA / accessibility | | ☐ |

**Merge recommendation:** ☐ Approve  ☐ Approve with nits  ☐ Request changes
