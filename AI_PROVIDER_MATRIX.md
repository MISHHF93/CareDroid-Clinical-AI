# CareDroid AI Provider Matrix

**Updated:** 2026-07-15 (Cycle 71)  
**Source of truth:** `lib/ai/providers/registry.ts`, `lib/ai/config.ts`, `data/model-registry/`

---

## Adapters

| Provider ID | Adapter file | Network | Config env | Health when unkeyed | CI default |
|-------------|--------------|---------|------------|---------------------|------------|
| `anthropic` | `anthropicAdapter.ts` | Yes | `ANTHROPIC_API_KEY`, `AI_MODEL` | configured=false | not called |
| `openai` | `openaiAdapter.ts` | Yes | `OPENAI_API_KEY` | configured=false | not called |
| `azure-openai` | `azureOpenAIAdapter.ts` | Yes | Azure endpoint + key | configured=false | not called |
| `gemini` | `geminiAdapter.ts` | Yes | `GEMINI_API_KEY` / Google | configured=false | not called |
| `groq` | `groqAdapter.ts` | Yes | `GROQ_API_KEY`, `GROQ_MODEL` | configured=false | not called |
| `local` | `localAdapter.ts` | No | none | always ok | yes (deterministic) |

Resolution: `AI_PROVIDER` → primary; `AI_FALLBACK_PROVIDER` or `AI_LOCAL_FALLBACK=1` → fallback.

## Transport safety

| Control | Implementation |
|---------|----------------|
| Per-request timeout | `fetchWithTimeout` / `AI_REQUEST_TIMEOUT_MS` |
| Circuit breaker | `getProviderCircuit` in `transportSafety.ts` |
| Kill switch | `AI_ENABLED` (default false) |
| PHI minimize | `phiMinimize.ts` on egress |
| Patient context gate | `patientContextGate.ts` (`AI_PATIENT_CONTEXT_ENABLED`) |

## Model registry entries

| ID | Kind | Status |
|----|------|--------|
| `mdl-claude-sonnet-4-6-v1` | foundation LLM | approved |
| `mdl-unified-ai-node-v1` | local NLU + artifact MLP | registered |
| `mdl-caredroid-heuristic-node-v1` | rule/heuristic | registered |
| `mdl-local-deterministic-v1` | offline adapter | registered |
| `mdl-offline-eval-harness-v1` | evaluation | registered |

## Discovery API / CLI

```bash
GET /api/ai/providers/health
GET /api/ai/models
npm run ai:query -- --providers
```

Never returns API keys. Health detail is redacted in the CLI.
