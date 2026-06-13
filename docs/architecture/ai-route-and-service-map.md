# AI Route And Service Map

## Normalized Emergency OS Routes

| Route | Product role | Backend owner | Status |
|---|---|---|---|
| `/api/emergency/copilot/message` | ED Copilot | `backend/src/modules/chat/emergency-ai.controller.ts` | Active |
| `/api/emergency/intake/ai/message` | Smart Intake Assistant | `backend/src/modules/chat/emergency-ai.controller.ts` | Route exists, tenant default disabled |
| `/api/emergency/referrals/ai/message` | Referral Assistant | `backend/src/modules/chat/emergency-ai.controller.ts` | Route exists, tenant default disabled |
| `/api/emergency/analytics/ai/message` | Analytics Assistant | `backend/src/modules/chat/emergency-ai.controller.ts` | Route exists, tenant default disabled |

## Active Frontend Flow

1. `src/components/CopilotPanel.tsx` builds an Emergency OS operational prompt from store state.
2. `src/services/clinicalChatService.js` builds the audit envelope and posts to `/api/emergency/copilot/message`.
3. `backend/src/modules/chat/emergency-ai.controller.ts` validates metadata and delegates to `ChatService`.
4. `ChatService` routes through AI gateway, intent classifier, RAG/tool orchestration as configured.
5. `lib/ai/client.ts` invokes the configured provider.
6. Response returns with required disclaimer and metadata.

## Shared AI Files

| File | Role |
|---|---|
| `lib/ai/config.ts` | Provider/model/tenant settings |
| `lib/ai/client.ts` | Provider abstraction |
| `lib/ai/promptRegistry.ts` | Prompt registry |
| `lib/ai/safetyPolicy.ts` | Safety and disclaimer policy |
| `lib/ai/auditLogger.ts` | Audit envelope helper |
| `lib/ai/toolRegistry.ts` | Tool/function registry |
| `lib/ai/routes.ts` | Normalized route constants |

## Frontend Structure

| Path | Role |
|---|---|
| `src/lib/ai/config.ts` | Browser-safe AI config defaults |
| `src/lib/ai/promptRegistry.ts` | Frontend prompt registry wrapper |
| `src/lib/ai/toolRegistry.ts` | Frontend tool registry wrapper |
| `src/lib/ai/routes.ts` | Frontend route constants |
| `src/lib/ai/safety/policy.ts` | Frontend safety policy wrapper |
| `src/lib/ai/audit/logger.ts` | Frontend audit helper wrapper |

## Legacy Routes

| Route | Status | Recommendation |
|---|---|---|
| `/api/chat/message` | Legacy generic AI route, still mounted | Keep as compatibility path until legacy ChatInterface/tools are archived |
| `/api/chat/suggest-action` | Legacy clinical action suggestion | Review; patient-specific AI must remain human-reviewed |
| `/api/chat/analyze-vitals` | Legacy vitals AI/calculator helper | Review; avoid autonomous triage |
| `/api/ai/*` | Legacy generic AI module | Narrow to Emergency OS or archive |

## Backend Optional/Future AI Services

- `backend/src/modules/rag/*`: RAG and vector retrieval.
- `backend/src/modules/moe-router/*`: model/expert routing.
- `backend/src/modules/medical-control-plane/*`: tool orchestration and clinical workflow launching.
- `backend/src/modules/simulation/*`: simulation/education AI support.

These remain available to `ChatService` but are not standalone active Emergency OS UI surfaces.
