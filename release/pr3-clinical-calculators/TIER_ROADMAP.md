# Tier roadmap — PR3 tools (future Tier A and Tier C)

**Context:** PR3 ships all four tools as **Tier B** (hub + guided chat + dashboard navigation). Client-side utils support deterministic testing and future promotion. This document supports backlog grooming and governance—not commitments in PR3.

---

## Current state (PR3)

| Registry ID | Tier | Catalog path | Navigation (chat) | Scoring in UI |
|-------------|------|--------------|-------------------|----------------|
| `grace-acs` | B | `/tools/calculators` | `/dashboard` | Chat-guided; `graceAcsCalculator.js` |
| `nihss` | B | `/tools/calculators` | `/dashboard` | Chat-guided; `nihssCalculator.js` |
| `canadian-c-spine` | B | `/tools/calculators` | `/dashboard` | Chat-guided; `canadianCSpineCalculator.js` |
| `ottawa-ankle` | B | `/tools/calculators` | `/dashboard` | Chat-guided; `ottawaAnkleCalculator.js` |

---

## Future Tier A candidates

**Tier A** = dedicated `/tools/calculators/{slug}`, `Calculators.jsx` form, `builtinUiCalculators` row, `openLabel: "Open"`, `uiCalculatorSlug` in catalog, `resolveCatalogLaunch` returns dedicated path (Tier-A navigation keeps `launch.path`).

**Promote when:** institution requires structured bedside documentation, offline field capture, or audit trail of inputs independent of LLM transcript.

| Tool | Rationale | Implementation notes | Priority |
|------|-----------|----------------------|----------|
| **NIHSS** | Highest demand for itemized exam capture; 15 domains map to form fields | Reuse `nihssCalculator.js`; preserve STEP 0 stroke gate on mount | **P1** |
| **GRACE ACS** | Finite admission variables; form reduces unit errors (creatinine, Killip) | Reuse `graceAcsCalculator.js`; mg/dL vs µmol/L toggle; ACS disclaimer banner | **P2** |
| **Canadian C-Spine** | High/low-risk / ROM checklist fits fieldset UI | Reuse `canadianCSpineCalculator.js`; applicability banner first | **P2** |
| **Ottawa Ankle** | Ankle vs foot zones + weight-bearing → compact form | Reuse `ottawaAnkleCalculator.js`; hard-stop panel above criteria | **P3** |

**Do not promote solely because utils exist** — chat may remain preferred for narrative documentation.

**Tier A migration checklist (any tool):**

1. Add `CALCULATOR_ROUTE_DEFS` + `App.jsx` route with `initialCalculatorId`  
2. Set `toolRegistry.initialCalc` and dedicated `path`  
3. Catalog: `chatOnlyForm: false`, set `uiCalculatorSlug`  
4. `resolveCatalogLaunch` → dedicated path + `openLabel: "Open"`  
5. Extend PR3 tests (mirror PR2 MELD/TIMI pattern)  
6. Re-sign clinical governance for form-level copy  

---

## Future Tier C candidates

**Tier C** = Nest `registerTool()` + `POST /tools/:id/execute`, optional `tool_results` persistence, server-attested scoring.

**Promote when:** EHR/API integrators require execute endpoint, institutional policy mandates server-side score logging, or native clients cannot ship shared JS formula module.

| Tool | Proposed executor id | Justification | PR3 decision |
|------|---------------------|---------------|--------------|
| **GRACE ACS** | `grace-acs-calculator` | API attestation of GRACE 2.0; EMR write-back | **Deferred** |
| **NIHSS** | `nihss-calculator` | Server NIHSS total for EMR | **Deferred** — item attestation governance first |
| **Canadian C-Spine** | `ccr-calculator` | Executable trauma workflow + audit log | **Deferred** — local trauma governance |
| **Ottawa Ankle** | `ottawa-ankle-calculator` | Same as CCR | **Deferred** |

**Tier C implementation pattern (when triggered):**

1. Shared formula package (TS) for Nest + optional SPA  
2. `registerTool()` with validation + deterministic flag  
3. Remove id from `NLU_TOOL_IDS_WITHOUT_EXECUTOR` only after contract tests pass  
4. Document schema in `EXECUTOR_REQUEST_CONTRACTS`  
5. Clinical governance re-sign for server-attested outputs  

**Do not promote for:** formula complexity alone, “server calculated” marketing, or duplicating chat without persistence requirement.

---

## Tools that should remain Tier B (near term)

| Tool | Reason |
|------|--------|
| GRACE ACS | Conversational Killip / arrest context may be faster than form for some workflows |
| Canadian C-Spine / Ottawa | Applicability narrative and hard-stop counseling fit chat; executable trauma without governance is high risk |

---

## Cross-PR dependencies

| Dependency | Impact |
|------------|--------|
| PR2 Wells / PERC | Same hub PE group; no ID collision |
| PR6 COPD GOLD / PR7 Rome IV | Independent Tier-B; shared hub patterns |
| Production hardening | `resolveCatalogLaunch`, `resolveNavigationPathForLaunch`, alias sync, safety guardrails |

---

*Last updated: PR3 clinical calculators release documentation.*
