# Backend executor readiness report

**Date:** 2026-05-19  
**Scope:** Planning only — **no new executors on the current branch** (orchestrator mapping hardening only).  
**Registered today:** `sofa-calculator`, `drug-interactions`, `lab-interpreter` ([tool-orchestrator.registry.ts](../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts)).

## Evaluation criteria

| Criterion | When backend POST adds production value |
|-----------|----------------------------------------|
| **Deterministic clinical math** | Server-attested scores for chat/MCP/Android parity, enterprise audit, or liability-sensitive formulas — not because the math is hard. |
| **Non-deterministic / external data** | Drug DB, lab interpretation, routing graphs, ML models — already the pattern for existing executors. |
| **Audit logging** | PHI-adjacent inputs (labs, vitals, fleet telemetry) or institutional compliance. |
| **Persisted execution history** | Analytics, replay, or sync — optional; orchestrator already has `ToolResult` + `saveToolResult()`. |
| **DTO validation** | Required for any POST executor (contract + `validate()` + registry contract tests). |
| **Formula / version metadata** | Required for all clinical score executors (traceability, drift tests). |

**Principles:** Keep calculators **deterministic**; port existing `src/utils/*Calculator.js` logic (do not re-derive); include `formulaMetadata` on every clinical response; do not register fleet tools in the clinical orchestrator until their engine is no longer pure client sort/rules.

---

## Summary matrix

| Candidate | Decision | Audit if backend | Persist history | DTO validation | Formula metadata |
|-----------|----------|------------------|-----------------|----------------|------------------|
| **MELD / MELD-Na** | Frontend-only **now**; backend **Phase 2** (optional) | Yes (labs, INR, Cr, Na) | Recommended | Yes | Yes — UNOS laboratory MELD + MELD-Na |
| **GRACE ACS** | Frontend-only **now**; backend **Phase 3** (defer) | Yes (ACS vitals, Cr) | Optional | Yes | Yes — `GRACE 2.0-admission-logistic` |
| **ASCVD risk** | Frontend-only **now**; backend **Phase 4** (defer) | Light (risk factors) | Optional | Yes | Yes — ACC/AHA PCE 2013 |
| **CKD staging** | Frontend-only **now**; backend **Phase 4** (defer) | Yes (Cr, ACR, demographics) | Optional | Yes | Yes — CKD-EPI 2021 + KDIGO 2012 G×A |
| **Fleet route optimizer** | Frontend-only until **graph/routing provider** | Fleet ops (not clinical PHI) | Yes when telemetry-backed | Yes | **Engine** metadata (`sort` vs `graph`), not clinical formula |
| **Predictive maintenance** | Frontend-only until **ML/telemetry pipeline** | Fleet ops | Yes when fleet-linked | Yes | **Ruleset** version (`rules-v1`), not clinical formula |

---

## 1. MELD / MELD-Na

### Current state

- **Tier A** registry: `meld`, `meld-na` — dedicated routes in `Calculators.jsx`.
- **NLU:** `meld`, `meld-na` profiles; hub paths; **no** POST executor.
- **Implementation:** [src/utils/meldCalculator.js](../src/utils/meldCalculator.js) — UNOS clamps, `calculateMeldScore`, `calculateMeldNaScore`, `computeMeldResult`, extensive Vitest coverage.
- **Production value of backend today:** **Low–medium**. UI works fully client-side. Value rises if MCP/chat must call `POST /tools/:id/execute` with the same math as the form, or if enterprise customers require server-attested formula version for transplant-adjacent documentation.

### Decisions

| # | Decision |
|---|----------|
| 1 | **Remain frontend-only** on current branch and near term. |
| 2 | **Become backend-executable** in Phase 2 as a **single** executor `meld-calculator` with `includeMeldNa: boolean` (mirrors `computeMeldResult`). |
| 3 | **Audit logging:** Yes — `AuditAction.AI_QUERY` on execute (same as SOFA); metadata: score band only, not raw labs in audit if policy restricts. |
| 4 | **Persisted history:** Recommended — `saveToolResult` with redacted input summary + `formulaMetadata` + scores. |
| 5 | **DTO validation:** Yes — unit enums, dialysis rule, sodium 100–180, positive labs. |
| 6 | **Formula metadata:** Yes — see API draft below. |

### If implemented — design sketch

| Item | Value |
|------|--------|
| **Orchestrator ID** | `meld-calculator` |
| **NLU IDs served** | `meld`, `meld-na` (alias → same executor; `meld-na` forces `includeMeldNa: true`) |
| **Registry map** | `meld` → `meld-calculator`, `meld-na` → `meld-calculator` (do **not** map other Tier-A calcs) |
| **Service** | `MeldCalculatorService` implementing `ClinicalToolService` |
| **Source of truth** | Port `meldCalculator.js` → shared `packages/clinical-scores` (or `backend/.../clinical-scores/`) — **one** implementation, frontend imports built bundle in a later PR |
| **Tests** | Port [meldCalculator.test.js](../src/utils/meldCalculator.test.js); registry spec parity; e2e POST smoke |

---

## 2. GRACE ACS

### Current state

- **Tier B** chat-assisted — [graceAcs.js](../src/data/chatAssistedCalculators/graceAcs.js) explicitly defers Tier C executor.
- **Implementation:** [graceAcsCalculator.js](../src/utils/graceAcsCalculator.js) — `GRACE_MODEL_VERSION = '2.0-admission-logistic'`, dual logistic outputs, Vitest + wiring tests.
- **Production value of backend today:** **Low**. Chat seeds guide workflow; scoring can stay client-side unless an integrator requires POST-only access.

### Decisions

| # | Decision |
|---|----------|
| 1 | **Remain frontend-only** (recommended through Phase 3). |
| 2 | **Backend-executable** only if product requires NLU/MCP to **execute** GRACE without a browser (same bar as GRACE file comment). |
| 3 | **Audit logging:** Yes if backend — ACS-related vitals are sensitive. |
| 4 | **Persisted history:** Optional. |
| 5 | **DTO validation:** Yes — Killip I–IV, age/HR/SBP/Cr ranges, boolean flags. |
| 6 | **Formula metadata:** Yes — embed existing `modelVersion`. |

### If implemented — design sketch

| Item | Value |
|------|--------|
| **Orchestrator ID** | `grace-acs-calculator` (NLU id `grace-acs` unchanged) |
| **Registry map** | `grace-acs` → `grace-acs-calculator` |
| **Service** | `GraceAcsCalculatorService` — port `computeGraceAcsRisk` + `interpretGraceAcsRisk` |

---

## 3. ASCVD risk (PCE)

### Current state

- **Tier A** — `ascvd-risk` form; [ascvdPceCalculator.js](../src/utils/ascvdPceCalculator.js) — ACC/AHA 2013 PCE, age 40–79, race/sex coefficients, `computeAscvdPceResult`.
- **Production value of backend today:** **Low**. Deterministic primary-prevention risk; client tests are strong; no MCP execute demand documented.

### Decisions

| # | Decision |
|---|----------|
| 1 | **Remain frontend-only** (Phase 4 or later). |
| 2 | **Backend** only for multi-channel parity or contractual “server-calculated risk” wording. |
| 3 | **Audit logging:** Light — risk-factor flags, not full lipid panel in audit if avoidable. |
| 4 | **Persisted history:** Optional. |
| 5 | **DTO validation:** Yes — age 40–79, HDL &lt; total, BP range, cholesterol units. |
| 6 | **Formula metadata:** `pce-2013-acc-aha`, coefficient set id, `usesOtherRaceWhiteCoefficients` flag. |

### If implemented — design sketch

| Item | Value |
|------|--------|
| **Orchestrator ID** | `ascvd-risk-calculator` |
| **Registry map** | `ascvd-risk` → `ascvd-risk-calculator` |

---

## 4. CKD staging

### Current state

- **Tier A** — `ckd-staging`; [ckdStagingCalculator.js](../src/utils/ckdStagingCalculator.js) — CKD-EPI 2021, KDIGO G×A, `computeCkdStagingResult`.
- **Production value of backend today:** **Low–medium** (similar to MELD for nephrology audit, but no current POST consumer).

### Decisions

| # | Decision |
|---|----------|
| 1 | **Remain frontend-only** (Phase 4). |
| 2 | **Backend** when enterprise audit or MCP execute is required. |
| 3 | **Audit logging:** Yes — creatinine, ACR, age/sex. |
| 4 | **Persisted history:** Optional. |
| 5 | **DTO validation:** Yes — units, age ≥18, positive Cr/ACR. |
| 6 | **Formula metadata:** `ckd-epi-2021-creatinine` + `kdigo-2012-prognostic-matrix`. |

### If implemented — design sketch

| Item | Value |
|------|--------|
| **Orchestrator ID** | `ckd-staging-calculator` |
| **Registry map** | `ckd-staging` → `ckd-staging-calculator` |

---

## 5. Fleet route optimization

### Current state

- **Tier A fleet page** — [routeOptimizationService.js](../src/services/routeOptimizationService.js): deterministic **sort** engine (`ROUTE_ENGINE_SORT`); comments reserve `ROUTE_ENGINE_GRAPH` for future backend.
- **No clinical PHI** — destinations, priorities, time windows.
- **Production value of backend today:** **None** for current sort-only UX. **High** only after integrating OSRM/Google/graph solver + optional fleet telemetry.

### Decisions

| # | Decision |
|---|----------|
| 1 | **Remain frontend-only** until a real routing provider exists. |
| 2 | **Do not** register in **clinical** `tool-orchestrator` as-is — use a **fleet module** (`FleetRouteService`) or separate controller prefix `/api/fleet/routes/optimize`. |
| 3 | **Audit logging:** Fleet operations audit (vehicle ids, route id) — not `AuditAction.AI_QUERY` unless product merges fleets into clinical audit stream. |
| 4 | **Persisted history:** Yes when routes are saved or dispatched. |
| 5 | **DTO validation:** Stops array, priority enum, window format. |
| 6 | **Metadata:** `engine: 'sort-v1' | 'graph-v1'`, `provider: 'internal-sort' | 'osrm'`, not clinical formula metadata. |

---

## 6. Predictive maintenance

### Current state

- [predictiveMaintenanceScoring.js](../src/services/predictiveMaintenanceScoring.js) — rule-based score 0–100, `SCORING_ENGINE_RULES`; AI engine deferred.
- **Production value of backend today:** **None** for rules-only. **High** when ingesting telematics + ML model serving.

### Decisions

| # | Decision |
|---|----------|
| 1 | **Remain frontend-only** for rules engine. |
| 2 | **Backend** as `FleetMaintenanceScoringService` when telemetry API + model exist — **not** fake executor in clinical orchestrator. |
| 3 | **Audit logging:** Fleet maintenance decisions. |
| 4 | **Persisted history:** Yes — vehicle maintenance recommendations over time. |
| 5 | **DTO validation:** Telemetry fields, DTC parse rules. |
| 6 | **Metadata:** `rulesetVersion: 'pm-rules-2026-01'`, later `modelId` + `modelVersion` for ML. |

---

# Implementation plan (phased)

## Phase 0 — Current branch (done / in progress)

- Orchestrator mapping hardening, `clinicalOrchestratorApi`, unsupported docs, no new executors.

## Phase 1 — Shared clinical scores package (prerequisite for any new **clinical** executor)

1. Create `packages/clinical-scores` (or `backend/src/clinical-scores/`) with TypeScript ports of:
   - `meldCalculator`, `graceAcsCalculator`, `ascvdPceCalculator`, `ckdStagingCalculator`
2. Export `formulaMetadata` builders alongside `compute*` functions.
3. CI: same golden vectors as existing Vitest files (import JSON fixtures both sides).
4. Frontend continues calling JS utils until cutover PR swaps imports.

**Effort:** ~3–5 days. **Risk:** Low if tests copied verbatim.

## Phase 2 — MELD executor (highest clinical priority among candidates)

1. `MeldCalculatorService` + register `meld-calculator`.
2. Update `REGISTERED_EXECUTOR_TOOL_IDS`, `REGISTRY_ID_TO_EXECUTOR_TOOL_ID`, frontend `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` (only if product enables POST from UI — optional keep UI client-only).
3. Extend `EXECUTOR_REQUEST_CONTRACTS` + `NLU_TOOL_IDS_WITHOUT_EXECUTOR` removals for `meld` / `meld-na`.
4. MCP: document execute schema.
5. **Do not** enable catalog `orchestratorTool` for Tier-A MELD unless product wants chat POST.

**Effort:** ~2–3 days after Phase 1. **Ship criteria:** POST parity with `computeMeldResult` on all existing tests.

## Phase 3 — GRACE ACS (conditional)

Only if product signs off on MCP/chat execute for Tier-B tool.

**Effort:** ~2 days after Phase 1.

## Phase 4 — ASCVD + CKD (batch)

Single PR, two services, if enterprise audit required.

**Effort:** ~3–4 days after Phase 1.

## Phase 5 — Fleet backends (separate track)

1. Route: graph provider integration + `/api/fleet/routes/optimize`.
2. Maintenance: telemetry ingestion + rules/ML service.
3. **Do not** mix into `tool-orchestrator` until API surface is stable.

**Effort:** highly dependent on provider; not estimable without vendor choice.

---

# API contract drafts

## Common clinical score envelope

All **clinical** deterministic executors should return this inside `result.data`:

```json
{
  "formulaMetadata": {
    "formulaId": "string",
    "formulaVersion": "string",
    "engine": "deterministic",
    "computedAt": "ISO-8601",
    "references": ["string"]
  },
  "inputsNormalized": {},
  "scores": {},
  "interpretation": {
    "severity": "normal | warning | critical",
    "label": "string",
    "summary": "string",
    "safetyDisclaimer": "string",
    "pathwayDisclaimer": "string"
  }
}
```

**Errors** (existing orchestrator contract):

| `errorCode` | When |
|-------------|------|
| `UNSUPPORTED_TOOL` | NLU id not registered (unchanged) |
| `VALIDATION_FAILED` | DTO / tool `validate()` |
| `EXECUTION_FAILED` | Internal error |
| `TOOL_NOT_FOUND` | Unknown id |

---

## Draft: `POST /api/tools/meld-calculator/execute`

**Orchestrator ID:** `meld-calculator`  
**Aliases:** `meld`, `meld-na` (registry ids → resolve to same executor; `meld-na` sets `includeMeldNa: true`)

### Request body

```json
{
  "parameters": {
    "bilirubin": 2.1,
    "bilirubinUnit": "mg_dl",
    "inr": 1.8,
    "creatinine": 1.4,
    "creatinineUnit": "mg_dl",
    "onDialysis": false,
    "sodium": 132,
    "includeMeldNa": true
  },
  "userId": "optional-uuid",
  "conversationId": "optional"
}
```

### Validation rules

| Field | Rules |
|-------|--------|
| `bilirubin`, `inr`, `creatinine` | Required finite numbers; positive where applicable |
| `bilirubinUnit`, `creatinineUnit` | `mg_dl` \| `umol_l` |
| `onDialysis` | boolean; if true, creatinine clamped to 4.0 mg/dL per UNOS |
| `sodium` | Required when `includeMeldNa: true`; 100–180 entry, clamped 125–140 for formula |
| `includeMeldNa` | boolean, default false |

### Response `result.data` (success)

```json
{
  "formulaMetadata": {
    "formulaId": "meld-unos-laboratory",
    "formulaVersion": "unos-laboratory-2016-sodium-adjustment",
    "engine": "deterministic",
    "computedAt": "2026-05-19T12:00:00.000Z",
    "references": [
      "Kamath PS et al. Hepatology. 2001;33(2):464-470",
      "Kim WR et al. Hepatology. 2008;48(3):997-1005"
    ]
  },
  "inputsNormalized": {
    "bilirubinMgDl": 2.1,
    "inr": 1.8,
    "creatinineMgDl": 1.4,
    "onDialysis": false,
    "sodiumMmolL": 132,
    "sodiumUsedForFormula": 132
  },
  "scores": {
    "meld": 18,
    "meldNa": 20,
    "meldForNaBaseline": 18
  },
  "clampedLabs": {
    "bilirubinMgDl": 2.1,
    "inr": 1.8,
    "creatinineMgDl": 1.4
  },
  "interpretation": {
    "severity": "warning",
    "label": "Moderately increased 90-day mortality signal",
    "summary": "Scores 20–29 fall in a moderate-risk band...",
    "safetyDisclaimer": "Decision support only — not for transplant listing..."
  }
}
```

### Frontend mapping (when enabled)

| Layer | Change |
|-------|--------|
| `clinicalToolIdContract.js` | Add `meld-calculator` to `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`; map `meld`, `meld-na` in `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` only if UI uses POST |
| `unsupportedOrchestratorTools.js` | Remove `meld`, `meld-na` from unsupported list |
| `Calculators.jsx` (optional) | Call `executeClinicalTool('meld-calculator', params)` instead of inline client compute |
| Tests | `executorMappingAudit`, `meldCalculator` golden parity, orchestrator e2e |

---

## Draft: `POST /api/tools/grace-acs-calculator/execute`

**Orchestrator ID:** `grace-acs-calculator` (NLU `grace-acs`)

### Request `parameters`

```json
{
  "ageYears": 68,
  "heartRateBpm": 88,
  "systolicBpMmHg": 142,
  "creatinine": 1.1,
  "creatinineUnit": "mg_dl",
  "killipClass": "I",
  "cardiacArrestAtAdmission": false,
  "stSegmentDeviation": true,
  "elevatedCardiacEnzymes": true
}
```

### Response `scores` + metadata

```json
{
  "formulaMetadata": {
    "formulaId": "grace-acs-admission",
    "formulaVersion": "2.0-admission-logistic",
    "engine": "deterministic"
  },
  "scores": {
    "inHospitalMortalityPct": 2.1,
    "sixMonthMortalityPct": 5.4,
    "sixMonthRiskCategory": "intermediate"
  }
}
```

---

## Draft: `POST /api/tools/ascvd-risk-calculator/execute`

**Orchestrator ID:** `ascvd-risk-calculator`

### Request `parameters`

```json
{
  "ageYears": 55,
  "sex": "male",
  "race": "white",
  "totalCholesterol": 180,
  "hdlCholesterol": 45,
  "cholesterolUnit": "mg_dl",
  "systolicBpMmHg": 128,
  "onHypertensionTreatment": true,
  "diabetes": false,
  "smoker": false
}
```

### Response metadata

```json
{
  "formulaMetadata": {
    "formulaId": "acc-aha-pce",
    "formulaVersion": "2013-pooled-cohort",
    "engine": "deterministic"
  },
  "scores": {
    "tenYearRiskPct": 12.4,
    "riskCategory": "intermediate"
  }
}
```

---

## Draft: `POST /api/tools/ckd-staging-calculator/execute`

**Orchestrator ID:** `ckd-staging-calculator`

### Request `parameters`

```json
{
  "ageYears": 62,
  "sex": "female",
  "serumCreatinine": 1.8,
  "creatinineUnit": "mg_dl",
  "urineAcr": 45,
  "acrUnit": "mg_g"
}
```

### Response metadata

```json
{
  "formulaMetadata": {
    "formulaId": "kdigo-ckd-staging",
    "formulaVersion": "ckd-epi-2021-creatinine_kdigo-2012-gxa",
    "engine": "deterministic",
    "references": ["KDIGO 2012", "Inker LA et al. NEJM 2021 (CKD-EPI 2021)"]
  },
  "scores": {
    "egfrMlMin": 34,
    "gfrCategory": "G3b",
    "albuminuriaCategory": "A2",
    "prognosticRisk": "high",
    "combinedStage": "G3bA2"
  }
}
```

---

## Draft: Fleet APIs (not clinical orchestrator)

### `POST /api/fleet/routes/optimize` (future)

```json
{
  "depot": { "label": "Depot A", "lat": 0, "lng": 0 },
  "destinations": [{ "id": "stop-1", "priority": "urgent", "windowStart": "09:00" }],
  "options": {
    "engine": "sort",
    "traffic": "moderate"
  }
}
```

Response metadata: `{ "engine": "sort-v1", "provider": "internal" }` — upgrade to `graph-v1` + `provider: "osrm"` when integrated.

### `POST /api/fleet/maintenance/score` (future)

```json
{
  "vehicleId": "uuid",
  "telemetry": { "engineTempSpikes": 2, "faultCodesLast30Days": 1 },
  "options": { "engine": "rules" }
}
```

Response metadata: `{ "rulesetVersion": "pm-rules-2026-01" }`.

---

## Test plan (per clinical executor)

| Layer | Cases |
|-------|--------|
| Unit | Port all existing Vitest vectors from `src/utils/*.test.js` |
| Registry | `tool-orchestrator.registry.spec.ts` — contracts, unsupported list drift |
| Frontend | `executorMappingAudit.test.js`, `orchestratorMappingHardening.test.js` |
| API e2e | `tool-orchestrator-api.e2e-spec.ts` — happy path + validation failures |
| Parity | Optional: POST vs client `compute*` same inputs → same scores (tolerance 0 for integers) |

---

## Recommendation

| Priority | Action |
|----------|--------|
| **Now** | Keep all six candidates **frontend-only**; no `registerTool()` on this branch. |
| **Next** | Phase 1 shared scores package if any clinical POST is approved. |
| **First executor** | **MELD** only if product needs server-attested liver scores or MCP execute. |
| **Defer** | GRACE, ASCVD, CKD until explicit integrator or compliance demand. |
| **Fleet** | Separate fleet API track; do not force into clinical orchestrator until engine ≠ client sort/rules. |

**Related docs:** [unsupported-orchestrator-tools.md](./unsupported-orchestrator-tools.md), [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md).
