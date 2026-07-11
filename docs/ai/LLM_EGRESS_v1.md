# CareDroid LLM Egress v1 (PR-3)

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Date** | `2026-07-11` |
| **Code** | `lib/ai/providers/`, `lib/ai/serverClient.ts`, `lib/ai/llmTransport.ts` |

## Goal

One audited generation boundary for all external (and local) LLM calls:

```
callAI / unifiedAIClient.request
        │
        ▼
completeViaEgress
  1. Kill switch (AI_KILL_SWITCH / AI_EXTERNAL_LLM_DISABLED / optional AI_EGRESS_REQUIRE_AI_ENABLED)
  2. PHI / secret minimize (pattern redaction)
  3. Primary provider adapter (AI_PROVIDER)
  4. Optional fallback (AI_FALLBACK_PROVIDER or AI_LOCAL_FALLBACK=1)
  5. Metadata log [AI_EGRESS]
```

Browser clients **must not** hold provider keys — they proxy via Nest (`src/lib/ai/client.ts` → backend).

## Providers

| `AI_PROVIDER` | Adapter | Notes |
|---------------|---------|--------|
| `anthropic` (default) | Anthropic Messages API | Full tool + stream support |
| `openai` | Chat Completions | Non-streaming in this build |
| `azure-openai` | Azure Chat Completions | Needs endpoint + deployment + key |
| `gemini` | generateContent | Non-streaming text |
| `local` | Deterministic degraded text | No network; tests & offline |

## Kill switches

| Env | Effect |
|-----|--------|
| `AI_KILL_SWITCH=1` | Block all egress |
| `AI_EXTERNAL_LLM_DISABLED=1` | Block all egress |
| `AI_EGRESS_REQUIRE_AI_ENABLED=1` | Require `AI_ENABLED=true` as well |

## Fallback

| Env | Effect |
|-----|--------|
| `AI_FALLBACK_PROVIDER=local` | On retryable primary failure, use local adapter |
| `AI_LOCAL_FALLBACK=1` | Same as fallback provider local |
| `AI_FALLBACK_MODEL` | Model override for fallback call |

## PHI minimize

Applied to `systemPrompt`, `messages[]`, and `message` before any adapter runs. Pattern-based (SSN, MRN-ish, phone, email, secrets, DOB labels). **Not** a full de-id pipeline — keep `AI_PATIENT_CONTEXT_ENABLED=false` by default.

## Patient-context hard gate

| Env | Effect |
|-----|--------|
| `AI_PATIENT_CONTEXT_ENABLED` (default **false**) | When unset/false, egress **strips** `patientId`, `encounterId`, and chart-shaped `context` keys (`patient`, `mrn`, `demographics`, …) **before** PHI minimize |

Code: `lib/ai/providers/patientContextGate.ts` → called from `completeViaEgress`.  
Strips record `phi_redaction` monitor events with `detail.reason = 'patient_context_gate'`.

This is a **boundary gate**, not a substitute for institutional de-identification when the flag is intentionally turned on.

## Health probe

```ts
import { getLlmEgressHealth } from '../lib/ai/serverClient';
// or
import { getEgressHealth } from '../lib/ai/providers';
// health.patientContextEnabled reflects the gate
```

## Tests

```bash
node node_modules/vitest/vitest.mjs run lib/ai/providers lib/ai/productionMonitoring.test.ts --reporter=dot
```
