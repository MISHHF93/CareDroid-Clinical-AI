# Tier roadmap — PR3 tools (future Tier A and Tier C)

**Context:** PR3 ships all four tools as **Tier B** (hub + guided chat). Client-side utils exist for deterministic testing and future promotion. This document supports backlog grooming and governance conversations—not commitments in PR3.

---

## Current state (PR3 merged)

| Registry ID | Tier | Route | Scoring in UI |
|-------------|------|-------|----------------|
| `grace-acs` | B | `/tools/calculators` | Chat-guided; utils in `graceAcsCalculator.js` |
| `nihss` | B | `/tools/calculators` | Chat-guided; utils in `nihssCalculator.js` |
| `canadian-c-spine` | B | `/tools/calculators` | Chat-guided; utils in `canadianCSpineCalculator.js` |
| `ottawa-ankle` | B | `/tools/calculators` | Chat-guided; utils in `ottawaAnkleCalculator.js` |

---

## Future Tier A candidates

Tier A = dedicated `/tools/calculators/{slug}`, `Calculators.jsx` form, `builtinUiCalculators` row, `openLabel: "Open"`, `uiCalculatorSlug` set in catalog.

Promote when: institution requires structured bedside documentation, offline form completion, or audit trail of field-level inputs independent of LLM transcript.

| Tool | Tier A rationale | Implementation notes | Priority |
|------|------------------|----------------------|----------|
| **NIHSS** | Highest clinical demand for itemized exam capture; 15 domains map cleanly to form fields | Reuse `nihssCalculator.js`; wizard or checkbox grid; preserve STEP 0 stroke gate on form mount | **P1** |
| **GRACE ACS** | Admission variables are finite; form reduces unit errors (creatinine units, Killip class) | Reuse `graceAcsCalculator.js`; mode toggle mg/dL vs µmol/L; ACS disclaimer banner | **P2** |
| **Canadian C-Spine** | High-risk / low-risk / ROM checklist fits fieldset UI | Reuse `canadianCSpineCalculator.js`; applicability banner before criteria | **P2** |
| **Ottawa Ankle** | Ankle vs foot zones + weight-bearing map to compact form | Reuse `ottawaAnkleCalculator.js`; hard-stop panel above criteria | **P3** |

**Tier A non-goals:** Do not auto-promote solely because utils exist—chat workflow may remain preferred for documentation flexibility.

**Migration checklist (any Tier A promotion):**

1. Add `CALCULATOR_ROUTE_DEFS` + `App.jsx` route with `initialCalculatorId`  
2. Set `toolRegistry.initialCalc` and dedicated `path`  
3. Flip catalog `chatOnlyForm: false`, set `uiCalculatorSlug`  
4. Update `resolveCatalogLaunch` to return dedicated path + `openLabel: "Open"`  
5. Extend `pr*N*Comprehensive` and wiring tests (mirror PR2 MELD/TIMI pattern)  
6. Re-run clinical governance checklist for form-level copy  

---

## Future Tier C candidates

Tier C = Nest `registerTool()` + `POST /tools/:id/execute`, optional `tool_results` persistence, server-attested scoring.

Promote when: external EHR/API integrators require execute endpoint, institutional policy mandates server-side score logging, or native clients cannot ship shared JS formula module.

| Tool | Proposed executor id | Tier C justification | PR3 decision |
|------|---------------------|----------------------|--------------|
| **GRACE ACS** | `grace-acs-calculator` (or `grace-acs-risk`) | API attestation of GRACE 2.0 outputs; map `grace-acs` registry → executor in `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` | **Deferred** — client utils sufficient |
| **NIHSS** | `nihss-calculator` | Server-side NIHSS total for EMR write-back | **Deferred** — governance for item-level attestation needed first |
| **Canadian C-Spine** | `ccr-calculator` | Executable trauma workflow with audit log | **Deferred** — local trauma governance required |
| **Ottawa Ankle** | `ottawa-ankle-calculator` | Same as CCR | **Deferred** |

**Tier C implementation pattern (when triggered):**

1. Extract shared formula package (TS) consumed by Nest executor and optionally retained in SPA  
2. `registerTool()` in `tool-orchestrator.service.ts` with validation + deterministic flag  
3. Remove id from `NLU_TOOL_IDS_WITHOUT_EXECUTOR` only after contract tests pass  
4. Document request/response schema in `EXECUTOR_REQUEST_CONTRACTS`  
5. Clinical governance re-sign for server-attested outputs  

**Do not promote to Tier C for:** formula complexity alone, marketing "server calculated" badge, or duplicating chat without persistence requirement.

---

## Tools that should remain Tier B

| Tool | Reason |
|------|--------|
| GRACE ACS (short term) | Conversational collection of Killip / arrest context may be faster than form for some users |
| Canadian C-Spine / Ottawa (short term) | Applicability narrative and hard-stop counseling fit chat; executable trauma without governance is high risk |

---

## Cross-PR dependencies

| Dependency | Impact |
|------------|--------|
| PR2 Wells / PERC | Same hub PE group; no ID collision with PR3 |
| PR6 COPD GOLD / PR7 Rome IV | Independent Tier-B; shared hub layout patterns |
| Production hardening | `resolveCatalogLaunch`, alias sync, safety guardrails |

---

*Last updated: PR3 clinical calculators release documentation.*
