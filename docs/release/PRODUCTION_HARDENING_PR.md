# Production hardening: tool routing, catalog wiring, NLU sync, and safety validation

**Type:** Production readiness / wiring hardening  
**Target:** `main`  
**Suggested labels:** `production`, `clinical-tools`, `safety`, `routing`

---

## 1. Summary

This change set closes the loop between **sidebar registry**, **NLU catalog**, **SPA routing**, **catalog UI**, **chat launch**, and **backend tool orchestration** so every shipped clinical and operational tool has a traceable, test-backed path from discovery → launch → UI or executor.

Highlights:

- Central **tool ID contract** (`clinicalToolIdContract.js`) with drift tests across registry, NLU, patterns, and orchestrator maps.
- **Production routes** for `/tools/*` and `/fleet/*` with calculator route generation from `CALCULATOR_ROUTE_DEFS` and safe fallbacks (`ToolsAreaFallback`).
- **Catalog wiring**: search, tier labeling, guarded chat seeds, unknown-tool fallback (no empty launches).
- **NLU alias sync** (~410 tests) aligned with `tool.patterns.ts` and catalog rows.
- **Three POST executors** only (SOFA, drug interactions, lab interpreter) with contract validation, structured errors, and `GET /tools/catalog/executors`.
- **Clinical safety guardrails** on chat seeds and UI surfaces (decision-support framing, crisis/urgent-care copy, fleet human-approval language).
- **E2E validation matrix** (35 registry tools, 136+ automated wiring tests) plus manual QA and regression checklists.

No new patient-specific dosing logic or treatment directives were introduced.

---

## 2. Scope

### In scope

| Area | Files / modules (representative) |
|------|----------------------------------|
| ID contract & drift | `clinicalToolIdContract.js`, `clinicalToolIdContract.test.js` |
| Catalog & launch | `clinicalCatalogWiring.js`, `clinicalIntentToolCatalog.js`, `clinicalCatalogLaunch.test.js` |
| Routes | `clinicalToolRoutes.js`, `App.jsx`, `ToolsAreaFallback.jsx`, route tests |
| Catalog UI | `ClinicalToolCatalog.jsx`, `catalogSearch.js`, launch tests |
| NLU / aliases | `clinicalToolAliasSync.js`, `parseToolPatterns.js`, alias-sync report |
| Orchestrator | `tool-orchestrator.registry.ts`, controller/service, executor mapping tests |
| Safety | `clinicalSafetyGuardrails.js`, compliance report, UI disclaimers |
| E2E matrix | `e2eToolValidationMatrix.js`, docs, report scripts |
| Docs | `docs/clinical-tool-executors.md`, `docs/clinical-safety-compliance.md`, `docs/e2e-*.md` |

### Out of scope

- New calculator clinical logic or scoring algorithm changes (except safety copy on outputs).
- Additional POST executors beyond the three registered tools.
- Mobile/Capacitor packaging or infrastructure (K8s, Terraform).
- Full Playwright E2E browser suite (responsive QA remains separate).

---

## 3. Tool inventory

**35 registry tools** (sidebar `toolRegistry.js`), **41 NLU profiles** (`clinicalIntentTools`), **17 calculator UI slugs** (`builtinUiCalculators`), **3 POST executors**.

| Tier | Count | Access pattern |
|------|-------|----------------|
| A | 16 | Dedicated calculator routes/forms |
| B | 8 | Calculators hub + chat-assisted seeds |
| C | 3 | Dedicated page + POST executor (SOFA, drug-check, lab-interp) |
| clinical-page | 3 | diagnosis, protocols, procedures |
| fleet-A | 3 | `/fleet/command`, predictive maintenance, route optimizer |
| fleet-B | 1 | dispatch-ai (hub chat; not POST executor) |
| hub | 1 | calculators hub |

**Authoritative inventory:** `docs/e2e-tool-validation-matrix.md` (regenerate: `npm run e2e-matrix:write-docs`).

**Programmatic inventory:** `buildE2eToolInventory()` in `src/data/e2eToolValidationMatrix.js`.

---

## 4. Routing fixes

- **`clinicalToolRoutes.js`** — single source for `CALCULATOR_ROUTE_DEFS`, `KNOWN_TOOL_AREA_PATHS`, `expectedLaunchPath`, calculator deep-link matching.
- **`App.jsx`** — calculator routes generated via `CALCULATOR_ROUTE_DEFS.map` (no per-calculator route drift); `/tools/*` and `/fleet/*` wildcards route to `ToolsAreaFallback` instead of silent dashboard redirect.
- **`ToolsAreaFallback.jsx`** — user-visible guidance for unknown tool paths; links to catalog/overview.
- **Tests:** `clinicalToolRoutes.test.js`, `clinicalToolRoutes.production.test.js`, `ToolsAreaFallback.test.jsx`, e2e matrix route validity.

---

## 5. Registry fixes

- **`clinicalToolIdContract.js`** — `REGISTRY`, `NLU`, `BUILTIN_CALC`, tier lists, `ORCHESTRATOR_TO_REGISTRY_ID`, `NLU_TO_REGISTRY_ID`, `ALL_REGISTRY_TOOL_IDS` partition.
- **`toolRegistry.js`** — unchanged count (35); contract tests enforce 1:1 with `ALL_REGISTRY_TOOL_IDS`.
- **Keyword-routed legacy** — GFR/BMI/SOFA paths documented; no phantom registry entries added.

---

## 6. Catalog / discovery fixes

- **`medicalToolsCatalogIndex.js`** — merged NLU + registry rows with launch metadata (`resolveCatalogLaunch`).
- **`catalogSearch.js`** — alias-aware search, tier/status enrichment, fleet filter, orchestrator registration labels.
- **`ClinicalToolCatalog.jsx`** — decision-support disclaimer banner; improved empty states and launch actions.
- **`sourceCodeToolDiscovery.js`** — consumed by catalog tables; phantom IDs remain documented, not launchable.
- **Tests:** `catalogSearch.test.js`, `ClinicalToolCatalog.launch.test.jsx`, e2e catalog discovery tests.

---

## 7. NLU / backend sync fixes

- **`clinicalToolAliasSync.js`** — drift report vs `tool.patterns.ts` and catalog; `npm run alias-sync:report`.
- **`parseToolPatterns.js`** — aligned parsing for audit tests.
- **Aligned `toolName` / intent rows** in `clinicalIntentToolCatalog.js` with backend pattern ids where mismatches caused launch failures.
- **Tests:** `clinicalToolAliasSync.test.js` (~410), `clinicalToolIdContract.test.js` (patterns parity).

---

## 8. Chat launch fixes

- **`clinicalCatalogWiring.js`** — `resolveCatalogLaunch`, `resolveCatalogLaunchFallback`, `ensureChatSeedGuardrails` on synthesized seeds, `CATALOG_UNKNOWN_TOOL_LAUNCH` for kebab-case unknowns.
- **Tier B** — hub path + seeded chat; `resolveNavigationPathForLaunch` sends chat-first flows to `/dashboard` when appropriate.
- **Chat configs** — safety appendices on Tier B calculators and dispatch-ai (`chatAssistedCalculators/*`, `chatAssistedFleet/dispatchAi.js`).
- **Tests:** `clinicalCatalogLaunch.test.js` (~168+ cases).

---

## 9. Backend orchestrator fixes

- **Registered executors (3):** `sofa-calculator`, `drug-interactions`, `lab-interpreter`.
- **Registry:** request contracts, `validateExecutorContractParameters`, `UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS`, `getExecutorCatalogSnapshot`.
- **Service:** structured `ToolExecutionErrorCode`, audit logging, disclaimer passthrough on results.
- **API:** `GET /tools/catalog/executors` for ops/discovery.
- **Docs:** `docs/clinical-tool-executors.md`.
- **Tests:** `tool-orchestrator.registry.spec.ts`, `backend/test/tool-orchestrator.spec.ts`, `executorMappingAudit.test.js`.

**Explicit non-goal:** `dispatch-ai` remains NLU/chat-only (not POST executable).

---

## 10. Safety / compliance pass

- **`clinicalSafetyGuardrails.js`** — checklist, regex audits, `ensureChatSeedGuardrails`, UI surface rules, production compliance audit.
- **UI:** `ClinicalDecisionSupportDisclaimer` on catalog; strengthened lab/SOFA copy; anticoag/PE/mental-health/fleet seeds guarded.
- **Docs:** `docs/clinical-safety-compliance.md`.
- **Tests:** `clinicalSafetyGuardrails.test.js`, `clinicalSafetyCompliance.report.test.js` (`npm run test:safety-compliance`).

**Constraints honored:** no weakened warnings; no treatment claims; no new mg/kg dosing logic.

---

## 11. Testing performed

Run locally before merge (representative gates):

```bash
npm run build
npm run test:e2e-matrix
npm run test:catalog-launch
npm run test:alias-sync
npm run test:executor-mapping
npm run test:safety-compliance
npm run test:run -- src/routes/clinicalToolRoutes.test.js src/routes/clinicalToolRoutes.production.test.js
cd backend && npm test -- --testPathPattern=tool-orchestrator
```

| Suite | Purpose |
|-------|---------|
| `test:e2e-matrix` | Full wiring matrix (136 tests) |
| `test:catalog-launch` | Launch resolution & guardrails |
| `test:alias-sync` | NLU ↔ patterns ↔ catalog drift |
| `test:executor-mapping` | Frontend ↔ backend executor contract |
| `test:safety-compliance` | Safety copy & UI surface lint |
| Backend orchestrator | Registry, execute, unsupported tool paths |

**Reports (stdout, exit 1 on drift):**

```bash
npm run e2e-matrix:report
npm run alias-sync:report
npm run safety-compliance:report
```

---

## 12. Manual QA checklist

Canonical: `docs/e2e-manual-qa-checklist.md` (source: `src/data/e2eManualQaChecklist.js`).

**Minimum smoke before prod:**

- [ ] Auth shell → `/tools` → `/tools/catalog` (search + launch)
- [ ] Tier A: PHQ-9 crisis copy; HAS-BLED / CHA₂DS₂-VASc no therapy mandates
- [ ] Tier B: Wells PE, NIHSS hub launch with seeded chat
- [ ] Tier C: drug checker, lab interpreter, SOFA (disclaimers present)
- [ ] Fleet: Fleet Command, Route Optimizer, Predictive Maintenance disclaimers; dispatch-ai no auto-assign language
- [ ] Unknown `/tools/foo` → fallback page (not blank dashboard)

---

## 13. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Route drift (new calculator without `CALCULATOR_ROUTE_DEFS`) | Medium | High | e2e matrix + `clinicalToolRoutes` tests fail CI |
| NLU alias / pattern drift | Medium | Medium | `test:alias-sync` + report script |
| False sense of POST support for chat-only tools | Low | High | Executor docs + `UNSUPPORTED_TOOL` errors + frontend `unsupportedOrchestratorTools` |
| Safety copy regression | Low | High | `test:safety-compliance`; no weakening in seed normalizer |
| Unknown tool launch to wrong page | Low | Medium | `resolveCatalogLaunchFallback` + guarded seeds |
| Backend contract break for 3 executors | Low | High | Contract validation + mapping audit tests |

**Overall residual risk:** **Low–medium** for wired surfaces; **medium** for unwired/phantom IDs (documented, not launchable).

---

## 14. Rollout plan

1. **Merge** to `main` after CI green and reviewer sign-off on safety + executor sections.
2. **Deploy backend** first (or with frontend) — new catalog executors endpoint is backward compatible.
3. **Deploy frontend** — no migration; users get improved catalog, routes, and fallbacks immediately.
4. **Post-deploy smoke** (15 min): registry paths in §12 + one Tier C API call per executor with valid JWT.
5. **Ops:** run `e2e-matrix:report` and `alias-sync:report` against release tag; archive stdout in change record.

---

## 15. Rollback plan

1. **Revert** merge commit on `main` (or redeploy previous frontend/backend artifacts).
2. **No data migration** — rollback is stateless for tool wiring.
3. **If partial failure:** revert frontend only if routing/catalog regression; revert backend only if executor API regression.
4. **Verify rollback:** prior `/tools/calculators` and drug/lab pages load; chat still functional on dashboard.

---

## 16. Known limitations

- **Only 3 POST executors** — all other NLU tools are chat-, hub-, or client-side only.
- **`procedures`** registry page has no dedicated NLU profile row (page route only).
- **Hub-only NLU** (apache2, curb65, gcs, wells-dvt) share calculators hub; no dedicated forms.
- **Phantom / roadmap IDs** in source discovery remain visible in catalog scan but are not launchable.
- **No full browser E2E** in this PR — manual QA still required for visual/a11y edge cases.
- **Safety audits** are copy/pattern-based, not clinical accuracy validation.

---

## 17. Follow-up work

| Item | Priority |
|------|----------|
| Playwright smoke for catalog launch → dashboard chat | Medium |
| Promote additional NLU tools to POST executors only with governance review | Low |
| Dedicated NLU row or page for `procedures` if chat routing needed | Low |
| CI job aggregating `test:e2e-matrix` + `test:safety-compliance` on every PR | Medium |
| Reduce hub-only NLU surface area (dedicated forms or clearer hub UX) | Low |

---

## Related artifacts (this release folder)

| Document | Path |
|----------|------|
| Changelog | `docs/release/CHANGELOG.md` |
| Reviewer checklist | `docs/release/REVIEWER_CHECKLIST.md` |
| Clinical safety checklist | `docs/release/CLINICAL_SAFETY_CHECKLIST.md` |
| Operational safety checklist | `docs/release/OPERATIONAL_SAFETY_CHECKLIST.md` |
| Release notes | `docs/release/RELEASE_NOTES.md` |
