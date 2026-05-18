# Reviewer checklist — Production hardening PR

Use with PR title: **Production hardening: tool routing, catalog wiring, NLU sync, and safety validation**

---

## Pre-review

- [ ] Confirm PR does **not** include `backend/dist/`, `.env`, or credentials.
- [ ] Confirm no new `registerTool()` handlers were added without clinical governance sign-off.
- [ ] Skim `release/production-hardening/PR_BODY.md` for scope alignment.

---

## Architecture & contracts

- [ ] `clinicalToolIdContract.js` — `ALL_REGISTRY_TOOL_IDS` matches `toolRegistry.js` (run `clinicalToolIdContract.test.js`).
- [ ] `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` has **exactly 3** keys: `drug-check`, `lab-interp`, `sofa-score`.
- [ ] `dispatch-ai` is **not** in orchestrator POST map.
- [ ] `tool-orchestrator.registry.ts` `REGISTRY_ID_TO_EXECUTOR_TOOL_ID` matches frontend map.
- [ ] `NLU_PROFILE_TOOL_IDS` matches `clinicalIntentTools` and backend `tool.patterns.ts`.

---

## Routing & launch

- [ ] `clinicalToolRoutes.js` paths ⊆ `App.jsx` route definitions.
- [ ] Unknown `/tools/foo` → `ToolsAreaFallback` / not-found (not dashboard).
- [ ] `resolveCatalogLaunch('phq9')` → dedicated path, not generic hub-only builtin seed.
- [ ] `resolveCatalogLaunch('dispatch-ai')` → `orchestratorTool: null`.
- [ ] Tier C launches return correct `orchestratorTool` for drug/lab/sofa only.

---

## Catalog & discovery

- [ ] Catalog search finds tools by alias (e.g. `PHQ9`, `pe-score`, `bleeding risk`).
- [ ] Tier B/C labels render correctly; no duplicate platform filter.
- [ ] `getMedicalToolsCatalogRows()` includes all registry ids.

---

## Backend orchestrator

- [ ] `POST` with `drug-interaction-checker` resolves to `drug-interactions`.
- [ ] `POST` with `dispatch-ai` returns structured `UNSUPPORTED_TOOL` (not 500).
- [ ] Validation failure returns `VALIDATION_FAILED` + audit log.
- [ ] SOFA calculator logic unchanged (deterministic scoring only).

---

## Safety copy (spot check)

- [ ] `ToolPageLayout` shows disclaimer on diagnosis, drug-check, fleet pages.
- [ ] PHQ-9 chat seed mentions Q9 / 988.
- [ ] CHA₂DS₂-VASc result text does **not** say “Anticoagulation recommended”.
- [ ] Wells PE / PERC seeds do not claim PE “ruled out”.

---

## Tests (CI / local)

- [ ] `npx vitest run src/data/e2eToolValidationMatrix.test.js` — pass.
- [ ] `npx vitest run src/data/clinicalToolAliasSync.test.js` — pass.
- [ ] `npx vitest run src/data/clinicalCatalogLaunch.test.js` — pass.
- [ ] `npx vitest run src/data/clinicalSafetyGuardrails.test.js` — pass.
- [ ] `cd backend && npm test -- --testPathPattern=tool-orchestrator` — pass.

---

## Sign-off

| Reviewer | Area | Date | Approved |
|----------|------|------|----------|
| | Frontend wiring | | ☐ |
| | Backend orchestrator | | ☐ |
| | Clinical safety | | | ☐ |
| | Fleet / ops | | | ☐ |

**Merge recommendation:** ☐ Approve  ☐ Approve with nits  ☐ Request changes
