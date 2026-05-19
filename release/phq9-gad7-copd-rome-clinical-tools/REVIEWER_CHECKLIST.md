# Reviewer checklist — PHQ-9, GAD-7, COPD GOLD, Rome IV IBS

Use this checklist for code review. Check each item or note N/A with rationale.

## Scope & architecture

- [ ] PR scope matches title: four tools only; no unrelated refactors
- [ ] Tier A (PHQ-9, GAD-7) use dedicated routes + `mentalHealthCalculators.jsx`
- [ ] Tier B (COPD, Rome) are hub-only; no `case 'copd-gold':` / `rome-iv-ibs` in `Calculators.jsx` switch
- [ ] All four: `backendExecutable: false`, `orchestratorTool: null` on Tier-B launch
- [ ] `resolveNavigationPathForLaunch`: Tier B → `/dashboard`; Tier A → dedicated path

## Clinical content (spot-check)

- [ ] PHQ-9 severity bands: 0–4, 5–9, 10–14, 15–19, 20–27
- [ ] GAD-7 severity bands: 0–4, 5–9, 10–14, 15–21
- [ ] Q9 ≥ 1 → safety escalation (not only high total score)
- [ ] No “diagnose depression/anxiety/COPD/IBS” or “prescribe/start medication/inhaler” in UI strings or chat seeds
- [ ] COPD seed: STEP 0 acute exacerbation; no inhaler names or dosing
- [ ] Rome seed: STEP 0 alarm features; criteria support only

## Registry & wiring

- [ ] `toolRegistry.js`: four entries, correct `path` and `initialCalc` (Tier A only)
- [ ] `clinicalIntentToolCatalog.js`: matching `path`, `sidebarToolId`, `chatSeed`
- [ ] `NLU_TO_REGISTRY_ID` includes PR5/PR6/PR7 required aliases
- [ ] `sourceCodeToolDiscovery` aliases resolve via `resolveRegistryId`
- [ ] No duplicate registry ids or conflicting alias targets (`clinicalToolAliasSync` tests pass)

## Backend NLU

- [ ] `tool.patterns.ts`: four `toolId` blocks with keywords
- [ ] Disambiguation helpers present and filter `differential-diagnosis` where expected
- [ ] `preferGad7` does not steal PHQ-9 depression-screen intents (spot-check logic)

## UI / UX

- [ ] PHQ-9 and GAD-7 forms: submit, reset, validation, results panel
- [ ] Hub cards: `Start guided chat` label for COPD and Rome
- [ ] Calculator hub group headings/leads readable and accurate
- [ ] Mobile: no horizontal scroll on mental health forms (narrow viewport spot-check)

## Accessibility

- [ ] Labels associated with every `<select>` (`htmlFor` / `id`)
- [ ] Validation errors: `role="alert"`, focus moves to first empty item
- [ ] Results region focusable; `aria-live` assertive when safety alerts shown
- [ ] Hub launch buttons: `aria-label` + `aria-describedby`

## Tests & CI

- [ ] `npm test -- --run src/data/clinicalToolsComprehensive.test.js` passes
- [ ] `npm test -- --run src/data/wiringAuditConsistency.test.js` passes
- [ ] `npm test -- --run src/data/clinicalToolAliasSync.test.js` passes
- [ ] `npm test -- --run src/utils/phq9Calculator.test.js src/utils/gad7Calculator.test.js` passes
- [ ] No snapshot tests added for clinical copy (deterministic assertions only)
- [ ] `backend/dist` or build artifacts not committed (if applicable to your branch)

## Security & compliance

- [ ] No secrets, API keys, or PHI in test fixtures
- [ ] Auth still required on calculator routes (`requiresAuth: true` in `App.jsx`)
- [ ] No new unauthenticated API endpoints for scoring

## Documentation

- [ ] `release/phq9-gad7-copd-rome-clinical-tools/PR.md` accurate
- [ ] CHANGELOG reflects user-visible and test changes
- [ ] Clinical governance checklist completed or scheduled

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering reviewer | | | ☐ |
| QA (smoke) | | | ☐ |
| Clinical governance (if required) | | | ☐ |

**Smoke paths (staging):**

1. `/tools/calculators/phq9` — Q9 = 1 → safety alert before/after calculate  
2. `/tools/calculators/gad7` — total ≥ 15 → severe alert  
3. `/tools/calculators` → COPD GOLD → chat on dashboard  
4. `/tools/calculators` → Rome IV IBS → chat on dashboard  
5. Catalog search: `depression screen`, `anxiety screen`, `copd gold`, `rome iv`
