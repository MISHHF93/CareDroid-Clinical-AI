# Glossary

> Clinical, platform-architecture, and role/permission terminology used across CareDroid. For a full clinical calculator/KPI reference (thresholds, scoring bands, sources), see [`docs/MEDICAL_KPIS_AND_BIOMEDICAL_INFORMATICS.md`](MEDICAL_KPIS_AND_BIOMEDICAL_INFORMATICS.md) — this glossary defines terms briefly; that document is the clinical source of truth.

## Clinical scoring & triage terms

| Term | Meaning |
|---|---|
| **CTAS** | Canadian Triage and Acuity Scale — 5-level acuity classification (1 = resuscitation, 5 = non-urgent) used in `TriageAcuityCode`. |
| **ESI** | Emergency Severity Index — the US 5-level triage acuity system, also represented in `TriageAcuityCode` alongside CTAS. |
| **SOFA** | Sequential Organ Failure Assessment — 0–24 score; ≥2 indicates organ dysfunction, used in sepsis/ICU severity assessment. One of the 3 clinical tools with a real backend executor (`sofa-calculator`). |
| **qSOFA** | Quick SOFA — bedside sepsis screen (0–3); a qSOFA ≥2 is a **platform-level governance override** that prevents the AI from downgrading patient priority. |
| **NEWS2** | National Early Warning Score 2 — 0–20 aggregate vital-signs score; ≥7 typically triggers resuscitation-team escalation. |
| **MEWS** | Modified Early Warning Score — similar early-warning score, ≥5 flags urgent review. |
| **DPS** | Deterioration Prediction Score — CareDroid's own composite deterioration score (`DPSScore` on `UnifiedPatient`); DPS of 1 or 2 (highest deterioration) triggers a priority lock. |
| **GCS** | Glasgow Coma Scale — neurological consciousness assessment. |
| **HEART score** | Risk stratification for chest pain / possible ACS. |
| **Wells PE / Wells DVT** | Clinical prediction rules for pulmonary embolism and deep vein thrombosis probability. |

## Platform architecture terms

| Term | Meaning |
|---|---|
| **Journey State** | A patient's position in the 20-stage 911→outcome pipeline (`JourneyState` type: `EMS_DISPATCHED` → ... → `DISCHARGE`), defined as a pure state-machine map in `backend/src/models/PatientJourney.ts`. |
| **Unified AI Node** | The combined endpoint (`POST /api/ai/node/models/route`) that runs the NLU intent classifier and the artifact-router classifier together. See [Platform Architecture Overview §AI Platform](architecture/platform-architecture-overview.md#5-ai-platform). |
| **Artifact Router** | An MLP classifier (128 hidden units, same embedding model as the NLU head) that maps free text to one of 10 artifact types (api-endpoint, prompt, tool, calculator, etc.), trained on the output of the artifact-intelligence pipeline. |
| **Artifact Intelligence Pipeline** | The repo-cataloging process (`npm run artifact-intelligence:generate`) that exports every routable/callable thing in the codebase as structured, ML-ready training data. Not a claim that a model has been trained by running the generator alone — see `docs/artifact-intelligence-pipeline-report.md`. |
| **Tool Orchestrator** | The backend module (`medical-control-plane/tool-orchestrator`) that actually executes clinical tools. 39 tools have real, live server-side executors (`REGISTERED_EXECUTOR_TOOL_IDS` in `tool-orchestrator.registry.ts`, each backed by a real `registerTool()` call in `tool-orchestrator.service.ts` — verified by matching counts, not assumed) — `sofa-calculator`, `drug-interactions`, and `lab-interpreter` are 3 of the 39, not the whole list. |
| **MCP (Model Context Protocol)** | An open protocol for exposing tools/resources/prompts to LLM clients (Claude Desktop, Cursor). CareDroid's own MCP server is `mcp/src/server.mjs`. |
| **Emergency-OS** | The legacy/parallel real-time patient-flow domain, backed by Mongoose (`UnifiedPatient`) and the `emergency-os.controller.ts` mega-controller — distinct from, and larger than, the newer NestJS module system. Only fully live when `ENABLE_MONGOOSE_EMERGENCY_OS=true`. |
| **Engine (client-side)** | A `src/engine/*.ts` module implementing deterministic clinical/operational logic (triage scoring, capacity math, alert derivation) as plain TypeScript run in the browser against Zustand store state — not a backend service. |
| **Suite** | One of 11 normalized product groupings (Reception & Arrival, Emergency Whiteboard, Triage/Reassessment/Clinical Flow, etc.) defined in `lib/features/suiteRegistry.ts` — see [README §Product suites](../README.md#product-suites). |

## Identity, tenancy & access terms

| Term | Meaning |
|---|---|
| **Organization** | The top-level tenant boundary (`organizations` table) — typically one hospital/health-system customer. |
| **Workspace** | A sub-scope inside an organization (`workspaces` table) that a user can be a member of; workspace-level roles are independent of the organization-level role. |
| **Tenant isolation** | Enforcement (via `TenantIsolationGuard` + `@TenantScoped`/`@OrganizationScoped`/`@WorkspaceScoped` decorators) that requests can't read/write data belonging to a different organization/workspace than the requester's. |
| **UserRole (backend)** | The coarse, actually-enforced backend role: `PHYSICIAN \| NURSE \| STUDENT \| ADMIN`. |
| **HospitalRole (frontend)** | The fine-grained, 23-role clinical/operational taxonomy used for frontend UX gating (`charge_nurse`, `triage_nurse`, `paramedic`, `dispatcher`, `pharmacist`, etc.) — a UX concept, not a backend-enforced permission set. See [Platform Architecture Overview §Authorization](architecture/platform-architecture-overview.md#4-authorization--rbac) for exactly how these two relate. |
| **Permission (backend)** | A fine-grained backend capability (`READ_PHI`, `WRITE_PHI`, `MANAGE_USERS`, `VIEW_AUDIT_LOGS`, ...), mapped per `UserRole` and enforced by `AuthorizationGuard`. |
| **CareDroid permission string (frontend)** | A colon-delimited permission string (`patient:read`, `triage:override-ai`, `ai:configure`) used by frontend `PermissionGate`/`RoleGate` components — a separate vocabulary from backend `Permission` enum values. |
| **Access scope** | How broadly a user's data access extends: `none \| self \| assigned \| department \| site \| network \| all` — set per user for `patientAccessScope`, `aiReviewScope`, `alertOwnershipScope`. |
| **Break-glass** | *(Planned / not implemented.)* A clinical emergency access override that would temporarily expand a user's access scope with justification + distinct audit. **Do not confuse** with `emergency-access.service.ts`, which only verifies 2FA backup codes for account login recovery. `Permission.BREAK_GLASS_ACCESS` is reserved and not granted. |
| **Data minimization level** | Per-user setting (`none` → `metadata_only`) controlling how much PHI detail a role sees by default. |

## AI governance terms

| Term | Meaning |
|---|---|
| **Human-reviewed AI** | CareDroid's core AI posture — no AI output (Copilot answer, triage suggestion, documentation draft) is treated as final without clinician review; enforced via required-disclaimer UI and the `human-review` module. |
| **PendingToolAction** | A mutating Copilot tool call (e.g. `flag_patient`, `dispatch_alert`) that is proposed but not executed until a human explicitly confirms it. |
| **Circuit breaker (AI pipeline)** | The `nluCircuitBreaker`/`llmCircuitBreaker` mechanism in `IntentClassifierService` that opens after repeated failures (auto-resets after 30s) to stop cascading calls to a failing NLU or LLM phase. |
| **Governance registry** | The set of safety rules, compliance checks, and violation records exposed by the (currently triplicated) governance controllers — see [Known Documentation Debt](DOCUMENTATION_CENTER.md#known-documentation-debt). |

See also: [Platform Architecture Overview](architecture/platform-architecture-overview.md), [Data Model Reference](data-model/data-model-reference.md), [AI Features Reference](AI_FEATURES.md).
