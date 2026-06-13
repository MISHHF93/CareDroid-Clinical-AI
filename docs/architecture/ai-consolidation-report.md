# AI Consolidation Report

## What Was Found

The repo had three AI layers:

- Active Emergency OS ED Copilot UI.
- Backend shared AI/chat/RAG/tool orchestration platform.
- Legacy general healthcare AI pages, dashboards, model registries, and tool pages.

The active product had an ED Copilot panel but its prompt and API route were not fully aligned with the desired Emergency OS AI structure.

## What Was Moved

No large legacy modules were physically moved because backend `ChatService`, tests, and platform inventory scripts still reference them.

Created the review target:

- `src/features/future-modules/_review/ai/README.md`

## What Was Merged

- Provider/model defaults centralized in `lib/ai/config.ts`.
- Runtime prompt selection centralized in `lib/ai/promptRegistry.ts`.
- Runtime safety/disclaimer policy centralized in `lib/ai/safetyPolicy.ts`.
- AI audit envelope helper centralized in `lib/ai/auditLogger.ts`.
- Normalized route constants centralized in `lib/ai/routes.ts`.
- Frontend wrappers created under `src/lib/ai/*`.
- Active ED Copilot frontend now routes to `/api/emergency/copilot/message`.
- Backend Emergency AI facade delegates normalized routes to existing `ChatService` rather than creating another AI client.

## What Was Archived

- Legacy AI code was not physically archived in this pass.
- It is classified and documented in `src/features/future-modules/_review/ai/README.md`.

## What Was Removed

- Browser-facing `VITE_AI_MODEL` was removed from `.env.example`.
- `src/config/appConfig.js` no longer exposes a frontend AI model setting.
- Generic “Clinical Companion” and generic “CareDroid clinical assistant” runtime prompt strings were replaced with prompt registry usage.
- The active shared client no longer owns an isolated hardcoded model source; it reads from `lib/ai/config.ts`.

## What Still Needs Manual Review

- Archive or rewrite legacy AI dashboards and `*Ai.jsx` pages after tests are updated.
- Narrow `/api/chat/*` and `/api/ai/*` to Emergency OS or deprecate them behind compatibility redirects.
- Decide whether RAG/Pinecone should be active for Emergency OS external/provincial data summarization.
- Replace frontend console audit helper with durable backend audit calls where needed.
- Wire tenant AI settings into the product settings UI and backend tenant persistence.

## Risks

- Backend `ChatService` is broad and still imports RAG, AI gateway, tool orchestration, memory, artifacts, evaluation, and governance modules.
- Some legacy tests expect model names as fixtures; those were left intact.
- Tenant flags are configured and validated but not yet backed by a tenant settings persistence UI.

## Commands Run

- `npm run typecheck:frontend`
- `npm run backend:build`
- `npm run lint`
- `cd backend && npm run lint`
- `npm run build`
- `npm run test:run -- src/test/routePagesSmoke.test.jsx src/components/ChatInterface.nlu.test.jsx`
- `cd backend && npm test -- chat.ed-copilot.spec.ts ai.service.spec.ts`
- `cd backend && npm test`
- `npm run test:run`

## Validation Result

Pass.

- Frontend typecheck: pass
- Backend build/typecheck: pass
- Frontend lint: pass
- Backend lint: pass
- Production build: pass, with existing large calculator chunk warning
- Focused frontend route/chat tests: pass
- Focused backend chat/AI tests: pass
- Full backend test suite: pass, 144 suites / 963 tests
- Full frontend test suite: failed/hung after legacy failures unrelated to this AI consolidation. Captured failures include legacy/future-module `EmergencyWhiteboard.jsx` invalid component imports, old platform permission route tests expecting broad historical routes, fleet/hospital operations route registration tests, and orphan-detection audit tests. The active AI-focused frontend tests passed.
