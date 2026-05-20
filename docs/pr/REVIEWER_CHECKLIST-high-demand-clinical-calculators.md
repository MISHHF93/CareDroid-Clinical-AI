# Reviewer checklist — High-demand clinical calculators PR

**PR title:** Add high-demand clinical calculators and workflow tools  
**Main doc:** [high-demand-clinical-calculators-PR.md](./high-demand-clinical-calculators-PR.md)

---

## Scope & architecture

- [ ] Thirteen tools match contract lists: PR8 (10 Tier A) + PR10 (`abcd2`) + PR9 (2 Tier B)
- [ ] No new Tier-C POST executors (`registerTool`) for calculator ids
- [ ] Tier B tools use `chatOnlyForm` / hub launch → `/dashboard`, not fake `/tools/calculators/{slug}` routes
- [ ] Changes limited to clinical tools layer (no unrelated fleet/auth refactors)

## Registry & wiring

- [ ] Each Tier-A id exists in `toolRegistry`, `clinicalIntentTools`, `builtinUiCalculators`, `BUILTIN_CALC_ID_TO_REGISTRY_ID`
- [ ] `Calculators.jsx` has a `case` for every `builtinUiCalculators` slug in this PR
- [ ] `CALCULATOR_ROUTE_DEFS` entries match `App.jsx` and `toolRegistry.path`
- [ ] No orphan routes: every new `CALCULATOR_ROUTE_DEFS` slug has UI + registry
- [ ] Tier B: hub cards in `calculatorHubManifest` / `chatAssistedHubGroups` group `trauma`

## NLU & aliases

- [ ] `NLU_TO_REGISTRY_ID` includes canonical + required aliases (`morse-fall`, `bisap`, `apgar`, `fib-4`, `nexus-criteria`, etc.)
- [ ] `sourceCodeToolDiscovery.js` rows match `NEW_CLINICAL_TOOLS_DISCOVERY_ALIAS_PAIRS` / PR9 pairs
- [ ] `tool.patterns.ts` blocks exist for each new registry id (grep or audit test)
- [ ] `clinicalToolAliasSync.js` includes PR8/9/10 in audited set

## Launch & navigation

- [ ] `resolveCatalogLaunch` returns correct path for each id (form vs hub)
- [ ] `resolveNavigationPathForLaunch` for Tier B → `/dashboard` with non-empty `chatSeed`
- [ ] Catalog search finds tools by common names (heart, morse fall, pecarn, nexus, abcd2)
- [ ] Sidebar icons present for Tier A (`getToolIcon` not null)

## Safety copy

- [ ] Every util exports a `*_DISCLAIMER` used in interpretation + UI
- [ ] STEP 0 present in NLU `chatSeed` and Tier B chat configs
- [ ] ABCD² stroke emergency language visible before/during form
- [ ] Trauma hub group disclaimer mentions unstable patients and non-clearance
- [ ] No copy that mandates imaging, drugs, admission, or definitive diagnosis

## Accessibility

- [ ] Forms use labels / `aria-describedby` / fieldset legends where applicable
- [ ] Results region uses `aria-live` or equivalent announcement pattern
- [ ] Keyboard: calculate and reset reachable and labeled

## Tests (required green)

```bash
npx vitest run src/data/newClinicalToolsWiringAudit.test.js
npx vitest run src/data/pr8BatchWiring.test.js
npx vitest run src/data/heartScoreWiring.test.js src/data/abcd2Wiring.test.js src/data/hospitalScalesWiring.test.js src/data/fib4BisapWiring.test.js src/data/obstetricScalesWiring.test.js src/data/pecarnHeadWiring.test.js src/data/nexusCSpineWiring.test.js
npx vitest run src/data/responsiveQaMatrix.test.js src/data/clinicalToolAliasSync.test.js
```

```bash
cd backend && npx jest test/tool-patterns-heart-score.spec.ts test/tool-patterns-abcd2.spec.ts test/tool-patterns-pecarn-head.spec.ts test/tool-patterns-nexus-cspine.spec.ts test/tool-patterns-hospital-scales.spec.ts test/tool-patterns-fib4-bisap.spec.ts test/tool-patterns-obstetric-scales.spec.ts
```

- [ ] `npm run test:run` passes (or failures documented with ticket)
- [ ] No tests skipped/deleted to force green CI

## Backend

- [ ] `cd backend && npm run build` passes
- [ ] New ids in `tool-orchestrator.registry.ts` are routing-only (no executor stub required)

## Mobile / responsive

- [ ] `responsiveQaMatrix` includes `abcd2` and all PR8 Tier-A paths
- [ ] Spot-check one PR8 form + ABCD² on narrow viewport (375px)

## Manual smoke (staging)

- [ ] Sidebar → each new Tier-A calculator loads and scores
- [ ] Hub → PECARN / NEXUS → “Start guided chat” → dashboard chat with STEP 0
- [ ] Chat intent: “heart score”, “bisap”, “pecarn head injury”, “nexus criteria”

## Sign-off

| Reviewer | Area | Approved |
|----------|------|----------|
| Frontend lead | SPA, wiring, a11y | |
| Backend lead | NLU patterns, registry | |
| QA | Smoke + mobile | |
| Clinical SME | Copy & STEP 0 (see governance checklist) | |
