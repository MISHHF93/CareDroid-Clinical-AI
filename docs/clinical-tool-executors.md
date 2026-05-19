# Clinical tool orchestrator — executor mapping

Production POST executors live in `backend/src/modules/medical-control-plane/tool-orchestrator/`.  
Frontend launch maps use `src/data/clinicalToolIdContract.js` (`REGISTRY_ID_TO_ORCHESTRATOR_TOOL`).

## Registered executors (POST `/api/tools/:id/execute`)

| Canonical NLU id | Registry id | Deterministic | Required parameters | Response highlights |
|------------------|-------------|---------------|---------------------|---------------------|
| `sofa-calculator` | `sofa-score` | Yes | _(none — all optional)_ | `totalScore`, component scores, `mortalityEstimate` |
| `drug-interactions` | `drug-check` | No (AI-assisted) | `medications[]` | `interactions`, `summary` |
| `lab-interpreter` | `lab-interp` | No (AI-assisted) | `labValues[]` | `summary`, `criticalValues`, `interpretations` |

Aliases accepted at execute time:

- `drug-interaction-checker` → `drug-interactions`
- Sidebar registry ids (`sofa-score`, `drug-check`, `lab-interp`) resolve to canonical NLU ids

## Structured error codes

| Code | When |
|------|------|
| `INVALID_REQUEST` | `parameters` missing or not a plain object |
| `UNSUPPORTED_TOOL` | Known NLU id with no `registerTool()` (e.g. `dispatch-ai`, `phq9`) |
| `TOOL_NOT_FOUND` | Unknown id |
| `VALIDATION_FAILED` | Contract or tool `validate()` failure |
| `EXECUTION_FAILED` | Runtime error during `execute()` |

Responses include `requestedToolId`, `resolvedToolId`, `errorCode`, and `result.errors[]`. Audit metadata is written via `AuditService` for unsupported, validation, success, and failure paths.

## Frontend-only / chat-only tools

All other `clinicalIntentTools` / `tool.patterns.ts` profiles are documented in:

- Backend: `NLU_TOOL_IDS_WITHOUT_EXECUTOR` in `tool-orchestrator.registry.ts`
- Frontend: `src/data/unsupportedOrchestratorTools.js`

Examples:

- **Tier B chat-assisted** (`wells-pe`, `perc`, `grace-acs`, …) — calculators hub + guided chat; client-side scoring
- **Hub-only NLU** (`apache2-calculator`, `curb65-calculator`, …) — hub chat only
- **Fleet** (`dispatch-ai`, `route-optimizer`, …) — `dispatch-ai` is NLU/chat only; **not** a POST executor
- **Clinical pages** (`protocol-lookup`, `differential-diagnosis`, …) — routed to UI pages

`backendExecutable: true` on an NLU row means chat routing may reference the backend — it does **not** imply POST `/tools/:id/execute` unless the id is in `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`.

## Drift tests

- Frontend: `src/data/clinicalToolIdContract.test.js`, `src/data/unsupportedOrchestratorTools.test.js`, `src/data/executorMappingAudit.test.js`
- Backend: `tool-orchestrator.registry.spec.ts`, `backend/test/tool-orchestrator.spec.ts`

## Catalog API

`GET /tools/catalog/executors` (JWT) returns registered ids, request contracts, and unsupported tool documentation for ops and client discovery.
