# CareDroid AI Tool Catalog

**Updated:** 2026-07-15 (Cycle 71)

There are **three** tool surfaces. Do not conflate them.

---

## 1. ED Copilot LLM tools (`lib/ai/toolRegistry.ts`)

Emergency copilot function schemas for the foundation-model path:

- `get_patient_details`, `get_queue_status`, `search_patients`, `get_capacity_status`
- Mutating (confirmation required): `flag_patient`, `move_patient_state`, `launch_calculator`, `create_referral`, `dispatch_alert`

Mutating tools always require human confirmation (`requiresConfirmation: true`).

## 2. Clinical tool orchestrator (deterministic calculators)

`backend/src/modules/medical-control-plane/tool-orchestrator/`

- **39 registered executors** (`REGISTERED_EXECUTOR_TOOL_IDS`)
- Pure TypeScript formulas — LLM must **not** perform the arithmetic
- Offline eval pack `calculator_parity`: **100% pass** (blocking gate)

Examples: SOFA, NEWS2, Wells DVT, ABG interpreter, MEWS, corrected calcium/sodium, FENa, ROX, Hunt-Hess, ICH, FOUR, mRS, PECARN, etc.

## 3. Legacy LLM function schemas on `AIService`

`GET /api/ai/tools` returns the Nest `AIService` tool definition list (SOFA-style legacy schemas used by older tool_use paths). Canonical clinical execution remains the orchestrator registry.

---

## Tool definition contract (target)

Every tool should declare (plan §6):

- name, version, description
- riskLevel: low | moderate | high
- allowedRoles, requiredPermissions
- inputSchema / outputSchema
- timeoutMs, retryPolicy
- requiresHumanApproval
- execute(input, context) → Result

**Partial:** orchestrator tools have contracts + aliases; full typed registry with role allowlists is not fully uniform across all three surfaces.

## Forbidden autonomous tools / actions

From `lib/ai/safetyPolicy.ts` and governance gates:

- diagnose / prescribe / auto-triage without review
- auto-merge patients / auto-import external data without review
- redirect ambulance / facility diversion
- discharge/admit / suppress critical alerts
