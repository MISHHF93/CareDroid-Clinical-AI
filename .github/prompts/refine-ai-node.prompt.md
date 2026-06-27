# Refine CareDroid AI Node

Refine the current CareDroid codebase only. Do not create a new app.

Goal:
- Keep all AI workflow logic centralized through `lib/ai/careDroidAI.ts`.
- Preserve existing frontend routes, backend modules, and working behavior.
- Add or improve typed schemas, validation, error handling, audit metadata, and tests.

Checklist:
- Support the seven CareDroid AI intents.
- Return the universal AI response shape.
- Never log PHI; log metadata only.
- Keep clinical outputs as decision support requiring clinician review.
- Reuse `src/services/careDroidAiApi.ts`, `src/hooks/useCareDroidAI.ts`, and `src/components/ai`.
- Add tests for schema validation and fallback behavior.
