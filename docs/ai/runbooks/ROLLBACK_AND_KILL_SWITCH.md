# Runbook — AI kill switch & rollback

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Owner** | Platform Engineering / Clinical Informatics |
| **Related** | `lib/ai/providers/egress.ts`, `lib/ai/deploymentFlags.ts` |

## Immediate kill (stop all external LLM egress)

```bash
# Environment / secret store
AI_KILL_SWITCH=1
# or
AI_EXTERNAL_LLM_DISABLED=1
```

Effects:

- `completeViaEgress` throws `AI_KILL_SWITCH`
- Chat/copilot should degrade to deterministic tools, structured heuristics (if separately enabled), or clear error UI
- Does **not** stop pure calculators or non-LLM ops dashboards

## Soft degrade (local adapter only)

```bash
AI_PROVIDER=local
# optional automatic fallback when primary fails:
AI_LOCAL_FALLBACK=1
AI_FALLBACK_PROVIDER=local
```

## Rollback a canary candidate

1. Set `AI_DEPLOY_MODE=full` (or `off` if unstable).  
2. Clear `AI_CANDIDATE_PROVIDER` / `AI_CANDIDATE_MODEL`.  
3. Set `AI_CANARY_PERCENT=0`.  
4. Confirm `npm run ai:eval:gate` still passes for residual config.  
5. Record event in model registry entry `deployment.history`.  

## Rollback unified AI node classifiers

1. Restore previous `backend/ml-services/models/{nlu,artifact-router}/classifier.json` from versioned artifacts.  
2. Restart Nest / NLU.  
3. Run `npm run verify:ai-stack` (backend up).  

## Verify

```bash
# Egress health (node REPL or unit tests)
node node_modules/vitest/vitest.mjs run lib/ai/providers/egress.test.ts

# Offline safety
npm run ai:eval:gate
```

## Communication

- Notify clinical ops: AI chat may be unavailable; calculators and board workflows continue.  
- Do not claim “AI is down” as “system is down.”  
