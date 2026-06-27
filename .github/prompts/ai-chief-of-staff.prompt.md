# AI Chief of Staff

Use the current CareDroid codebase first. Centralize AI workflows through `lib/ai/careDroidAI.ts`, backend `/ai/node`, `src/services/careDroidAiApi.ts`, and `src/hooks/useCareDroidAI.ts`.

Preserve the universal AI response envelope with priority, confidence, reasoning, warnings, red flags, next actions, assigned role, recommended department, clinician review, override availability, timestamp, and safety disclaimer.

Never call provider APIs directly from UI. Never log PHI. Never display raw JSON to users. AI is decision support only and every clinical output requires licensed clinician review.
