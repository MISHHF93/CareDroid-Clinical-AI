# Production hardening: tool routing, catalog wiring, NLU sync, and safety validation

## 1. Summary

This change set hardens the CareDroid clinical and fleet tool surface for production by establishing a **single ID contract** across registry, catalog, NLU, discovery, chat launch, and backend orchestration. It eliminates phantom routing, aligns frontend executor maps with the three real backend `registerTool()` handlers, improves catalog search and Tier labeling, and adds deterministic safety guardrails plus an E2E validation matrix.

**Outcome:** Shipped tools resolve predictably from sidebar, catalog, chat, and NLU; only registered executors POST to `/tools/:id/execute`; clinical copy meets decision-support and compliance expectations.

---

## 2. Scope

| Area | In scope |
|------|----------|
| Frontend routing | `App.jsx`, `clinicalToolRoutes.js`, `ToolsAreaFallback`, calculator deep links |
| ID contract | `clinicalToolIdContract.js`, `clinicalCatalogWiring.js`, alias sync |
| Catalog | `ClinicalToolCatalog.jsx`, `catalogSearch.js`, `medicalToolsCatalogIndex.js` |
| NLU / launch | `clinicalIntentToolCatalog.js`, `resolveCatalogLaunch`, chat seeds |
| Backend orchestrator | `tool-orchestrator.registry.ts`, structured errors, alias resolution |
| Safety | `clinicalSafetyGuardrails.js`, `ClinicalDecisionSupportDisclaimer`, CHA₂DS₂-VASc copy |
| Tests | Contract drift, launch, alias sync, E2E matrix (134+ tests in new/updated suites) |

**Out of scope:** New clinical calculators, new backend executors, auth/billing changes, mobile native builds.

---

## 3. Tool inventory

| Tier | Count (registry) | Access pattern |
|------|------------------|----------------|
| **A** — dedicated calculator forms | 17 | `/tools/calculator(s)/…` + client-side scoring |
| **B** — chat-assisted hub | 8 clinical + `dispatch-ai` | `/tools/calculators` + guided `chatSeed` |
| **C** — backend POST executors | 3 | `sofa-score`, `drug-check`, `lab-interp` → orchestrator |
| **Clinical pages** | 5 | drug, lab, protocols, diagnosis, procedures |
| **Fleet A** | 3 | `/fleet/command`, predictive maintenance, route optimizer |
| **Hub** | 1 | `calculators` |

**NLU profiles:** 47 (`clinicalIntentTools` ↔ `tool.patterns.ts`)  
**POST executors (backend):** `sofa-calculator`, `drug-interactions`, `lab-interpreter` only  
**Full matrix:** `getE2eValidationMatrixDocument()` in `src/data/e2eToolValidationMatrix.js`

---

## 4. Routing fixes

- Centralized calculator paths in `src/routes/clinicalToolRoutes.js` (`CALCULATOR_ROUTE_DEFS`, `KNOWN_TOOL_AREA_PATHS`).
- `App.jsx` calculator routes aligned with `builtinUiCalculators` paths.
- `/tools/*` and `/fleet/*` unknown paths route to `ToolsAreaFallback` (not silent redirect to dashboard).
- `ToolNotFound` component for invalid deep links within tool areas.
- Sidebar navigation uses registry paths; tools navigation test added.

---

## 5. Registry fixes

- **`clinicalToolIdContract.js`** — canonical `REGISTRY`, `NLU`, tier slices, `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` (3 entries only).
- Removed phantom NLU→registry mappings (e.g. `abc-assessment`, `trauma-score`, `vitals-monitor`).
- `ALL_REGISTRY_TOOL_IDS` drift-tested against `toolRegistry.js`.
- `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` documents real backend handlers; `dispatch-ai` excluded from POST map.

---

## 6. Catalog / discovery fixes

- **`medicalToolsCatalogIndex.js`** — rows from NLU + registry merge; enriched metadata.
- **`catalogSearch.js`** — shared search util (name, description, aliases, tier labels).
- **`ClinicalToolCatalog.jsx`** — Tier B/C labeling, empty states, chat-assisted category.
- **`sourceCodeToolDiscovery.js`** — phantom tools documented; executor count = 3.
- Catalog search and index tests extended.

---

## 7. NLU / backend sync fixes

- **`clinicalToolAliasSync.js`** + **`parseToolPatterns.js`** — frontend ↔ `tool.patterns.ts` drift tests (271 alias tests).
- **`clinicalIntentToolCatalog.js`** — `ensureChatSeedGuardrails()` on export; dose-calculator and antibiotic guide seeds hardened.
- **`unsupportedOrchestratorTools.js`** — documents NLU tools without `registerTool()`.
- Backend **`tool-orchestrator.registry.ts`** — `REGISTRY_ID_TO_EXECUTOR_TOOL_ID`, `EXECUTOR_ID_ALIASES` (`drug-interaction-checker` → `drug-interactions`), `ToolExecutionErrorCode`, audit metadata on execute/validate.

---

## 8. Chat launch fixes

- **`resolveCatalogLaunch()`** refactored: NLU profiles before builtin calculator slugs (fixes PHQ-9/GAD-7 vs generic builtin seeds).
- **`resolveOrchestratorToolForLaunch()`** — orchestrator only when registered (SOFA, drug, lab); not `dispatch-ai`.
- **`clinicalCatalogLaunch.test.js`** — 92 launch-path tests including safety seed guardrails.
- Open label: `Start guided chat` for hub tools; dedicated paths for Tier A.

---

## 9. Backend orchestrator fixes

- **`resolveExecutorToolId()`** before execute/validate/metadata.
- Structured responses: `errorCode`, `requestedToolId`, `resolvedToolId`.
- `UNSUPPORTED_TOOL` for `dispatch-ai` and other NLU-only ids (no fake executors).
- `VALIDATION_FAILED`, `INVALID_REQUEST`, `TOOL_NOT_FOUND`, `EXECUTION_FAILED`.
- Audit logs include `requestedToolId`, `aliased`, `errorCode`.
- **`tool-orchestrator.spec.ts`** — 57 tests; mocks for `ToolMetricsService` + `ToolResult` repository.
- **`tool-orchestrator.registry.spec.ts`** — registry contract tests.

---

## 10. Safety / compliance pass

- **`clinicalSafetyGuardrails.js`** — decision-support append rules, compliance audit, `GUARDRAIL_CHECKLIST`.
- **`ClinicalDecisionSupportDisclaimer`** on all `ToolPageLayout` tools (clinical / fleet / AI-doc / drug variants).
- Mental health: PHQ-9 Q9 / 988 pathways; GAD-7 crisis cross-reference.
- PE/ACS: Wells PE, PERC, GRACE seeds — no rule-out certainty.
- Anticoag: HAS-BLED UI warnings; CHA₂DS₂-VASc — removed “anticoagulation recommended” mandates.
- Fleet/dispatch: human approval, no auto-dispatch authority.
- Dose-calculator: reference-only; no mg/kg recommendations.
- **`clinicalSafetyGuardrails.test.js`** — 30 tests; compliance report `riskLevel: low`.

---

## 11. Testing performed

### Frontend (Vitest)

| Suite | Tests (approx.) | Focus |
|-------|-----------------|--------|
| `e2eToolValidationMatrix.test.js` | 134 | Full inventory, routes, catalog, NLU, launch, executors |
| `clinicalToolIdContract.test.js` | 16+ | Registry/NLU/pattern drift |
| `clinicalToolAliasSync.test.js` | 271 | Alias ↔ patterns sync |
| `clinicalCatalogLaunch.test.js` | 92 | Launch paths, safety seeds |
| `clinicalSafetyGuardrails.test.js` | 30 | Safety copy compliance |
| `catalogSearch.test.js` | — | Catalog query matching |
| `medicalToolsCatalogIndex.test.js` | — | Index completeness |
| `clinicalToolRoutes.test.js` | — | Known paths vs App |
| PR fleet / calculator wiring suites | — | Regression on PR1–PR7, fleet |
| `Calculators.route.test.jsx` | — | Route ↔ calculator slug |

### Backend (Jest)

| Suite | Tests | Focus |
|-------|-------|--------|
| `tool-orchestrator.spec.ts` | 57 | Execute, alias, errors, audit |
| `tool-orchestrator.registry.spec.ts` | 10 | Registry parity with frontend |

**Commands:**

```bash
npx vitest run src/data/e2eToolValidationMatrix.test.js src/data/clinicalToolIdContract.test.js src/data/clinicalCatalogLaunch.test.js src/data/clinicalToolAliasSync.test.js src/data/clinicalSafetyGuardrails.test.js
cd backend && npm test -- --testPathPattern=tool-orchestrator
```

---

## 12. Manual QA checklist

See **`release/production-hardening/MANUAL_QA_CHECKLIST.md`** (derived from `src/data/e2eManualQaChecklist.js`).

**Minimum smoke before merge:**

1. `/tools/catalog` — search PHQ-9, Wells PE, dispatch-ai; open each launch type.
2. Tier A — PHQ-9 Q9 non-zero shows crisis copy; HAS-BLED and CHA₂DS₂-VASc show anticoag disclaimers.
3. Tier C — drug checker (≥2 meds), lab interpreter, SOFA calculator.
4. Fleet — Fleet Command, Route Optimizer disclaimers; dispatch-ai chat seed requires human approval.
5. Invalid `/tools/unknown-tool` → fallback/not-found UX.

---

## 13. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Launch regression for alias phrases | Low | Medium | 271 alias sync tests + launch tests |
| Orchestrator ID mismatch in clients | Low | High | Registry file + drift tests; alias `drug-interaction-checker` |
| Over-aggressive safety append in chat | Low | Low | Append only when pattern missing; existing copy preserved |
| Catalog search false negatives | Low | Low | `catalogSearch.test.js` + manual spot check |
| CHA₂DS₂-VASc UX change (wording) | Medium | Low | Clinician-facing discussion labels only |
| Untracked `backend/dist` in workspace | N/A | Low | Do not commit build artifacts |

**Overall residual risk:** **Low** for production wiring; **medium** for AI output variability (mitigated by disclaimers, not eliminated).

---

## 14. Rollout plan

1. **Merge to `main`** after reviewer sign-off and CI green.
2. **Deploy backend first** (orchestrator registry + error codes are backward-compatible additions).
3. **Deploy frontend** — no DB migration required.
4. **Post-deploy smoke** (15 min): catalog, 3 executors, dispatch-ai chat, fleet disclaimer.
5. **Monitor** audit logs for `unsupported` / `validation_failed` on tools endpoints (24–48 h).

---

## 15. Rollback plan

1. Revert frontend + backend deploy to previous release tag.
2. No schema rollback required.
3. If partial rollback: backend-only revert safe (frontend may send old tool ids; aliases preserve compatibility).
4. Communicate rollback if orchestrator error-rate spikes or catalog launch failures reported.

---

## 16. Known limitations

- **Three backend executors only** — all other NLU tools are chat-assisted or client-side calculators.
- **`dispatch-ai`** — NLU/chat routing only; POST execute returns `UNSUPPORTED_TOOL`.
- **Hub-only NLU tools** (APACHE-II, CURB-65, GCS, Wells DVT, dose-calculator) — no dedicated forms; launch via calculators hub.
- **Phantom IDs** remain documented in discovery for cost-tracking/recommendations but are not routed to fake pages.
- **AI output** — guardrails constrain seeds and UI; runtime LLM responses still require clinician review.
- **E2E matrix** documents test file associations, not runtime code coverage %.

---

## 17. Follow-up work

- [ ] CI job: run `e2eToolValidationMatrix` + `tool-orchestrator` on every PR touching `src/data` or orchestrator.
- [ ] Export matrix JSON artifact in CI for release audits.
- [ ] Optional: OpenAPI snippet for tool execution error codes.
- [ ] Dedicated CHA₂DS₂-VASc form disclaimer block in UI (match HAS-BLED panel).
- [ ] Evaluate removing or gating phantom IDs from `advancedRecommendationService` cost map.
- [ ] Playwright smoke for `/tools/catalog` launch (non-blocking).

---

**Review artifacts:** `release/production-hardening/REVIEWER_CHECKLIST.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`
