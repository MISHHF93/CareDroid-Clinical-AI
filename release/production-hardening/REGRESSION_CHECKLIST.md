# Regression checklist — Production hardening release

Run before merge and before production deploy. Code source: `src/data/e2eRegressionChecklist.js`.

---

## Automated gates (CI / local)

- [ ] `npx vitest run src/data/e2eToolValidationMatrix.test.js`
- [ ] `npx vitest run src/data/clinicalToolIdContract.test.js`
- [ ] `npx vitest run src/data/clinicalCatalogLaunch.test.js`
- [ ] `npx vitest run src/data/clinicalToolAliasSync.test.js`
- [ ] `npx vitest run src/data/clinicalSafetyGuardrails.test.js`
- [ ] `cd backend && npm test -- --testPathPattern=tool-orchestrator`

---

## ID contract drift

- [ ] `ALL_REGISTRY_TOOL_IDS` matches `toolRegistry.js`
- [ ] `NLU_PROFILE_TOOL_IDS` matches `clinicalIntentTools` + backend `tool.patterns.ts`
- [ ] `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` matches backend `REGISTERED_EXECUTOR_TOOL_IDS` (3 only)
- [ ] `dispatch-ai` ∉ `REGISTRY_ID_TO_ORCHESTRATOR_TOOL`

---

## SPA routes

- [ ] Every registry tool path ∈ `KNOWN_TOOL_AREA_PATHS`
- [ ] Calculator routes in `App.jsx` match `CALCULATOR_ROUTE_DEFS`
- [ ] `/tools/*` and `/fleet/*` unknown paths → `ToolsAreaFallback`

---

## Catalog and discovery

- [ ] `getMedicalToolsCatalogRows()` includes all Tier A/B registry tools
- [ ] Catalog search: PHQ-9, Wells PE, dispatch-ai by alias
- [ ] Phantom list in `sourceCodeToolDiscovery` reviewed (no new phantoms routed to pages)

---

## Launch behavior

- [ ] `resolveCatalogLaunch(registryId)` non-empty for all shipped registry ids
- [ ] Tier B → `/tools/calculators` + `chatSeed`
- [ ] Tier C → orchestrator only for sofa, drug-check, lab-interp

---

## Safety

- [ ] `buildClinicalSafetyComplianceReport()` → `riskLevel: low`
- [ ] `ToolPageLayout` disclaimer on drug, lab, diagnosis, procedures
- [ ] CHA₂DS₂-VASc: no “Anticoagulation strongly recommended”

---

## Manual spot (smoke)

- [ ] `MANUAL_QA_CHECKLIST.md` Tier C + PHQ-9 + dispatch-ai items
- [ ] Tools API returns 401 when logged out (if applicable)

---

## Release record

| Gate | Owner | Date | Status |
|------|-------|------|--------|
| Automated | | | ☐ |
| Contract drift | | | ☐ |
| Manual smoke | | | ☐ |
| Clinical safety | | | ☐ |
| Operational safety | | | ☐ |
