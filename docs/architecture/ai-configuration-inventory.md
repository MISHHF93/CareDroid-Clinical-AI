# AI Configuration Inventory

## Central Configuration

| File | Purpose | Active status |
|---|---|---|
| `lib/ai/config.ts` | Source of truth for provider, model, temperature, max tokens, streaming, and tenant AI settings | Active shared config |
| `src/lib/ai/config.ts` | Browser-safe Emergency OS AI config types/defaults | Active frontend wrapper |
| `backend/src/config/ai.config.ts` | Nest config adapter for shared AI config | Active backend config |
| `.env.example` | Root documented AI env strategy | Active documentation |
| `backend/.env.example` | Backend documented AI env strategy | Active documentation |
| `backend/src/config/env.validation.ts` | Validates provider/model/token/tenant AI flags | Active backend validation |

## Provider And Model

- Active provider: `anthropic`
- Active runtime key: `ANTHROPIC_API_KEY`
- Active model source: `AI_MODEL`
- Central default model: `claude-sonnet-4-20250514`
- Temperature source: `AI_TEMPERATURE`, default `0.2`
- Max token source: `AI_MAX_TOKENS`, default `2000`
- Browser model env: removed from runtime config; frontend calls backend only.

## Tenant AI Settings

Defaults intentionally disable unclear/unsafe modules:

- `AI_ENABLED=false`
- `ED_COPILOT_AI_ENABLED=true`
- `SMART_INTAKE_AI_ENABLED=false`
- `REFERRAL_AI_ENABLED=false`
- `ANALYTICS_AI_ENABLED=false`
- `CLINICAL_WORKFLOW_AI_ENABLED=false`
- `AI_AUDIT_LOGGING_ENABLED=true`
- `AI_PATIENT_CONTEXT_ENABLED=false`

## Removed Or Centralized Runtime Scattering

- `lib/ai/client.ts` no longer owns a standalone hardcoded model constant as runtime source; it reads from `lib/ai/config.ts`.
- `backend/src/config/ai.config.ts` no longer contains the generic “Clinical Companion” prompt.
- `backend/src/modules/ai/ai.service.ts` now uses prompt registry text for LLM and schema requests.
- `src/config/appConfig.js` no longer exposes `VITE_AI_MODEL`.

## Still Needs Review

- Test fixtures and docs still contain model names as expected historical assertions/examples.
- Legacy AI modules remain mounted in backend because active ChatService imports them.
- RAG/Pinecone configuration remains optional and future-module scoped until Emergency OS-specific retrieval policy is finalized.
