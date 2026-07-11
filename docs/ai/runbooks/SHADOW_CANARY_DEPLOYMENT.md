# Runbook — Shadow & canary AI deployment

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Flags** | `lib/ai/deploymentFlags.ts` |

## Modes (`AI_DEPLOY_MODE`)

| Mode | Behavior |
|------|----------|
| `off` | No candidate; kill-like operational pause of deploy ladder (use kill switch for hard stop) |
| `shadow` | Primary response still served; candidate may be invoked for **log-only** comparison (`AI_SHADOW_LOG_ONLY`) |
| `canary` | Stable hash of user/session id → `AI_CANARY_PERCENT` bucket gets candidate provider/model |
| `full` | Primary production path only (default) |

## Env reference

| Variable | Purpose |
|----------|---------|
| `AI_DEPLOY_MODE` | `off` \| `shadow` \| `canary` \| `full` |
| `AI_CANARY_PERCENT` | 0–100 (default 10 in code when canary) |
| `AI_CANDIDATE_PROVIDER` | e.g. `openai`, `local` |
| `AI_CANDIDATE_MODEL` | Candidate model id |
| `AI_SHADOW_LOG_ONLY` | Force shadow logging semantics |
| `AI_REQUIRE_EVAL_GATE_PASS` | Ops strictness: require offline gate before full (policy) |
| `AI_KILL_SWITCH` | Immediate egress block |

## Promotion ladder (mandatory)

```
dev → sim → shadow → canary (small %) → full
```

Gates before each step:

1. `npm run verify:knowledge-registry`  
2. `npm run verify:model-registry`  
3. `npm run ai:eval:gate`  
4. Clinician checklist for clinical-facing candidates (`docs/ai/CLINICIAN_REVIEW_CHECKLIST_v1.md`)  
5. Model registry entry updated (`status`, `deployment.history`)  

## Never

- Silent model swap without registry entry  
- Canary without kill switch tested  
- Production training on PHI chats  

## Rollback

See [ROLLBACK_AND_KILL_SWITCH.md](./ROLLBACK_AND_KILL_SWITCH.md).
