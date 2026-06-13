# R5 AI Consolidation Report

## Scope

Executed R5 only: consolidate AI/LLM caller behavior behind the canonical `src/lib/ai/client.ts` surface using `CONSOLIDATION_DECISIONS.md` and `DUPLICATE_MAP.md` Search 3 as source of truth.

## AI Caller Audit

| Caller | Model | System prompt | Streams | Response handling | UI wiring |
| --- | --- | --- | --- | --- | --- |
| `lib/ai/client.ts` | Previously `AI_MODEL`/legacy Claude default through direct Anthropic Messages API; now thin re-export to `src/lib/ai/client.ts` using `claude-sonnet-4-6` | Previously caller supplied or built from prompt registry/context engine; now delegated to canonical client | Previously supported Anthropic SSE parsing; now delegated | Previously parsed text, tool calls, usage, provider errors; now delegated | Not directly wired to UI; backend AI/chat services used it |
| `backend/src/modules/ai/ai.service.ts` | Now uses canonical client export and `UNIFIED_AI_MODEL = claude-sonnet-4-6` | `promptForRequestType()` or `buildSystemPrompt()` with caller context | No direct streaming in this service | Persists AI query usage/cost/audit metadata; handles structured JSON and tool-call responses | Backend API service used by chat/tools, not direct UI component |
| `backend/src/modules/chat/chat.service.ts` | Now uses canonical client export and `claude-sonnet-4-6` through wrapper | ED Copilot prompt from `buildSystemPrompt(edContext, 'COPILOT_CHAT')`; other chat paths use clinical/RAG prompts | No direct provider stream in inspected ED Copilot path | Converts AI text into chat response, suggestions, tool/fallback behavior | Wired through `/api/chat/message` and `/api/emergency/copilot/message`, consumed by Copilot UI/API clients |
| `lib/ai/responseParser.ts` | Previously streamed through `unifiedAIClient.request({ stream: true })`; now thin re-export to canonical client parser helpers | Caller supplied via `AIRequestConfig.systemPrompt` | Yes, via canonical `streamAIResponse()` | Reads token stream, parses tool calls/action cards/data blocks/citations | No active direct importer found; kept as compatibility wrapper |
| `src/lib/ai/client.ts` | Canonical model `claude-sonnet-4-6` | Caller passes `systemPrompt`; server path appends department context safely | Yes: `streamAI(req)` returns a stream or accepts `onChunk/onDone`; browser path routes to backend | Browser calls normalize backend API responses; server path parses Anthropic text/tool calls/usage | Active import from `src/components/CopilotPanel.tsx` |
| `src/services/clinicalIntelligenceApi.js` | No direct model/provider call; endpoint wrapper only | Backend clinical-intelligence services own prompts | No | Returns normalized `{ ok, data/error }` API results | Wired to Ambient Scribe, Guideline RAG, Differential AI, Patient Summary AI, Order Set/Timeline/Audit tool pages |

## Canonical Client Shape And Safety Model

`src/lib/ai/client.ts` now exports `AIRequestType`, `AIRequest`, `callAI`, `streamAI`, `unifiedAIClient`, `UNIFIED_AI_MODEL`, parser helpers, and legacy response types.

The canonical client intentionally deviates from the literal `import Anthropic from '@anthropic-ai/sdk'` sample because the file is imported by browser code. Browser runtime calls route through backend API endpoints and never receive provider credentials. Server runtime calls are the only path that uses `ANTHROPIC_API_KEY` and the Anthropic Messages URL. The repo does not currently depend on `@anthropic-ai/sdk`, so no SDK dependency was added.

## Files Migrated, Wrapped, Or Updated

| File | Action |
| --- | --- |
| `src/lib/ai/client.ts` | Rebuilt as canonical AI client with browser-safe backend routing, server-only Anthropic fetch, unified model, streaming, usage/tool parsing, and parser/action-card helpers |
| `lib/ai/client.ts` | Converted to thin compatibility re-export of `src/lib/ai/client.ts` |
| `lib/ai/responseParser.ts` | Converted to thin compatibility re-export of parser helpers from `src/lib/ai/client.ts` |
| `src/components/CopilotPanel.tsx` | Migrated active caller to pass `requestType`, `systemPrompt`, and user/assistant-only messages to `callAI()` |
| `backend/src/modules/ai/ai.service.ts` | Updated AI client import to canonical `src/lib/ai/client.ts` |
| `backend/src/modules/chat/chat.service.ts` | Updated AI client import to canonical `src/lib/ai/client.ts` |
| `backend/src/modules/moe-router/moe-router.service.ts` | Updated model import to canonical client |
| `backend/src/modules/ai/foundation/ai-routing-engine.service.ts` | Updated model import to canonical client |
| `backend/src/modules/ai/ai.service.spec.ts` | Updated canonical import, unified model fixtures, and normalized response mock shape |
| `backend/test/tool-calling.spec.ts` | Updated canonical import |
| `lib/ai/config.ts`, `backend/src/config/environment.config.ts`, `.env.example`, `backend/.env.example` | Aligned default generation model to `claude-sonnet-4-6` |
| `lib/ai/types.ts`, `lib/ai/toolRegistry.ts` | Added requested `INTAKE_SUGGEST` alias alongside existing `INTAKE_SUGGESTION` |
| `src/lib/ai/client.test.ts` | Added mocked no-network test for canonical server request shape |

## Residual Direct AI Caller Search Results

Required residual patterns:

| Pattern | Result |
| --- | --- |
| `useChat(` | No matches |
| `createOpenAI` | No matches |
| `openai.chat` | No matches |
| `anthropic.messages` | No matches |
| `@anthropic-ai/sdk` | No matches |
| `fetch('https://api.anthropic.com...` | Exact wrapper search failed twice with a tooling path error; equivalent literal checks found `fetch(ANTHROPIC_MESSAGES_URL)` only in `src/lib/ai/client.ts` |

Expected residuals:

| Residual | Reason |
| --- | --- |
| `src/lib/ai/client.ts` contains `https://api.anthropic.com/v1/messages` and `fetch(ANTHROPIC_MESSAGES_URL)` | This is the single canonical server-side provider call |
| `lib/ai/client.ts`, `lib/ai/responseParser.ts` | Thin compatibility re-exports only; no provider logic |
| `unifiedAIClient.request` in backend AI/chat services and tests | Compatibility object exported by the canonical client; it delegates to `callAI()` to preserve existing service mockability |
| OpenAI/Anthropic config, metrics, docs, local embedding names | Config/documentation/non-caller residuals; `OpenAIEmbeddingsService` is deterministic local embedding generation, not an external OpenAI caller |

## Verification

| Command / check | Result |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.frontend.json` | Passed |
| `npx vitest run src/lib/ai/client.test.ts` | Passed: 1 file, 1 test |
| `cd backend && npm test -- ai.service.spec.ts` | Passed: 1 suite, 7 tests |
| Residual AI caller search | No direct OpenAI/Anthropic caller patterns outside canonical client; see residual table |
| `ReadLints` on edited files | No linter errors |

## Remaining Risks

The backend still calls `unifiedAIClient.request` for compatibility, but that object now lives in and delegates to the canonical client. A future cleanup can migrate those calls directly to `callAI()` if tests are adjusted to mock module functions instead of the wrapper object.

Some documentation and config registries still mention older or alternate model names for historical inventory or non-caller modules. They were not deleted because R5 was limited to AI/LLM caller consolidation and directly related tests/docs.
