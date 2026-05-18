# Reviewer checklist — PR3 clinical calculators

**PR title:** Add GRACE ACS, NIHSS, Canadian C-Spine, and Ottawa Ankle Clinical Tools

Use with `release/pr3-clinical-calculators/PR_BODY.md`.

---

## Pre-review

- [ ] PR does **not** include `backend/dist/`, `.env`, credentials, or unrelated refactors
- [ ] No new `registerTool()` handlers added (Tier C unchanged)
- [ ] Scope limited to four registry ids: `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`

---

## Architecture & contracts

- [ ] `PR3_CALCULATOR_REGISTRY_IDS` frozen in `clinicalToolIdContract.js` matches four tools above
- [ ] All four in `PR3_TIER_B_CHAT_CALCULATOR_IDS` and `TIER_B_CHAT_CALCULATOR_REGISTRY_IDS`
- [ ] All four in backend `NLU_TOOL_IDS_WITHOUT_EXECUTOR` (`tool-orchestrator.registry.ts`)
- [ ] `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` still **only** drug-check, lab-interp, sofa-score (3 executors)
- [ ] No PR3 id in `BUILTIN_CALC_ID_TO_REGISTRY_ID` or `builtinUiCalculators`

---

## Routing & launch

- [ ] `resolveCatalogLaunch('grace-acs' | 'nihss' | 'canadian-c-spine' | 'ottawa-ankle')` → `/tools/calculators`, `openLabel: "Start guided chat"`, `orchestratorTool: null`
- [ ] No `path: '/tools/calculators/{pr3-id}'` in `App.jsx`
- [ ] No `initialCalculatorId` for PR3 tools in `App.jsx`
- [ ] `expectedLaunchPath(id)` → `/tools/calculators` for all four
- [ ] `CALCULATOR_ROUTE_DEFS` has **no** slug for PR3 ids

---

## Catalog & discovery

- [ ] Catalog: one row per `primaryId`; `chatOnlyForm: true`; `uiCalculatorSlug: null`; `pagePath: /tools/calculators`
- [ ] Catalog search: `grace acs`, `nih stroke`, `c-spine`, `ottawa ankle` resolve
- [ ] Discovery: one canonical row per id; alias rows map with correct `mapsTo`
- [ ] `stroke scale` → `nihss`; `cervical-spine-rule` → `canadian-c-spine` (not cross-mapped)

---

## Hub UI (manual)

- [ ] Open `/tools/calculators` → cardiac / neurology / trauma groups show four tools
- [ ] Tab to each card → Enter launches guided chat (stays on hub path per Tier B)
- [ ] Group leads mention decision support and emergency-pathway priority
- [ ] Mobile width: cards single-column; tap targets ≥44px

---

## Safety copy (spot check)

- [ ] GRACE seed: unstable ACS / STEMI STEP 0; does not confirm/exclude ACS; no treatment orders
- [ ] NIHSS seed: stroke pathways first; no tPA dosing; low NIHSS does not exclude LVO
- [ ] CCR seed: does not "clear" c-spine; unstable trauma STOP
- [ ] Ottawa seed: hard stops (neurovascular, open fracture, etc.); not fracture clearance

---

## Backend NLU

- [ ] `tool.patterns.ts`: each PR3 `toolId` appears exactly once
- [ ] Disambiguation: `preferGraceAcs`, `preferNihss`, `preferCanadianCSpine`, `preferOttawaAnkle` present
- [ ] `intent-classifier.service.ts` LLM fallback lines describe chat-assisted scope

---

## Tests (CI / local)

```bash
npm test -- --run \
  src/data/pr3Comprehensive.test.js \
  src/data/pr3RegistrationAudit.test.js \
  src/data/pr3Consistency.test.js \
  src/data/pr3Coverage.test.js \
  src/data/pr3UxSafetyAccessibility.test.js \
  src/data/clinicalSafetyGuardrails.test.js \
  src/data/clinicalToolAliasSync.test.js \
  src/data/e2eToolValidationMatrix.test.js
```

- [ ] All commands above pass locally or in CI
- [ ] `e2eToolValidationMatrix` lists `pr3Comprehensive.test.js` for all four PR3 registry ids

---

## Sign-off

| Reviewer | Area | Date | Approved |
|----------|------|------|----------|
| | Frontend wiring / hub UX | | ☐ |
| | Backend NLU / patterns | | ☐ |
| | Clinical safety / informatics | | ☐ |
| | QA / accessibility | | ☐ |

**Merge recommendation:** ☐ Approve  ☐ Approve with nits  ☐ Request changes
