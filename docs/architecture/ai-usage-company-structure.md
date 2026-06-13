# AI Usage Company Structure

## CareDroid Emergency OS AI Layer

CareDroid Emergency OS uses AI as an operational support layer, not a generic medical chatbot platform.

## Active Structure

| Product role | Classification | Active files | Allowed use |
|---|---|---|---|
| ED Copilot | `ACTIVE_ED_COPILOT` | `src/components/CopilotPanel.tsx`, `src/services/clinicalChatService.js`, `backend/src/modules/chat/emergency-ai.controller.ts` | Operational questions, patient flow, queue/capacity/boarding/EMS status, workflow launch suggestions |
| Smart Intake Assistant | `SMART_INTAKE_ASSISTANT` | Route facade and prompt registry only | Extraction and verification helper; default disabled |
| Clinical Workflow Assistant | `EMERGENCY_WORKFLOW_ASSISTANT` | `lib/ai/toolRegistry.ts`, `src/lib/ai/toolRegistry.ts` | Launch workflows/calculators after staff action; default disabled except ED Copilot tool awareness |
| Referral Assistant | `REFERRAL_SUMMARIZER` | Route facade and prompt registry only | Referral context summarization; default disabled |
| Analytics Assistant | `OPERATIONAL_INTELLIGENCE` | Route facade and prompt registry only | Explain operational metrics; default disabled |
| Safety Layer | `ACTIVE_ED_COPILOT` safety | `lib/ai/safetyPolicy.ts`, `src/lib/ai/safety/policy.ts` | Blocks unsafe autonomous clinical actions and appends disclaimers |
| Audit Layer | `ACTIVE_ED_COPILOT` audit | `lib/ai/auditLogger.ts`, `src/lib/ai/audit/logger.ts`, backend `AuditService`, `AIGatewayService` | Logs user, tenant, patient context, timestamp, purpose, and source module |

## Allowed Active AI Tasks

- Answer operational questions.
- Summarize patient flow.
- Summarize external/provincial data with clinician review disclaimer.
- Launch clinical workflows.
- Explain calculator outputs.
- Summarize referrals.
- Help with Smart Intake verification.
- Identify bottlenecks.
- Show queue, capacity, boarding, and EMS status.

## Explicitly Disallowed

- Diagnose autonomously.
- Prescribe.
- Make disposition decisions.
- Replace clinical judgment.
- Auto-triage without human review.
- Auto-merge patients.
- Auto-import external health data.
- Make autonomous identity decisions.

## Review Modules

Legacy/general AI assets belong under `src/features/future-modules/_review/ai/` after test-aware migration:

- General AI dashboards.
- Model catalog pages.
- Clinical tool `*Ai.jsx` pages.
- CareDroid Brain / Business Brain services.
- Broad RAG/general medical chatbot surfaces not narrowed to Emergency OS.
