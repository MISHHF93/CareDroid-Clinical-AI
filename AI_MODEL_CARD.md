# CareDroid AI Model Card

**Updated:** 2026-07-15  
**Registry:** `data/model-registry/`

---

## Foundation LLM (provider-managed)

| Field | Value |
|-------|--------|
| Default model | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Provider | Anthropic (default); OpenAI/Azure/Gemini/Groq optional |
| Trained by CareDroid | No |
| Entry | `mdl-claude-sonnet-4-6-v1.json` |
| Prohibited | Autonomous diagnosis; computing validated medical scores instead of calculators; fine-tune on production PHI |

## Unified AI Node (local ML)

| Field | Value |
|-------|--------|
| Components | NLU intent MLP + artifact-type MLP over frozen `Xenova/all-mpnet-base-v2` embeddings |
| Entry | `mdl-unified-ai-node-v1.json` |
| NLU test accuracy | 1.0 on n=51 — **do not cite as external validity** |
| Artifact accuracy | ~0.947 on n=282 |

## Heuristic CareDroid AI node

| Field | Value |
|-------|--------|
| Engine | `careDroidAI-heuristic-node` / `careDroidAI-node-v1` |
| Intents | 18 structured clinical/operational intents |
| Always | `requiresClinicianReview: true` |
| Entry | `mdl-caredroid-heuristic-node-v1.json` |

## Local deterministic adapter

| Field | Value |
|-------|--------|
| ID | `local-deterministic-v1` |
| Use | Tests, degraded mode, CLI default |
| Network | None |

## Offline eval harness

| Field | Value |
|-------|--------|
| ID | `mdl-offline-eval-harness-v1` |
| Role | Rule-based scorer over fixtures — not a clinical model |

## Deployment controls

- Feature flags / `AI_ENABLED`
- Kill switch + rollback: `docs/ai/runbooks/ROLLBACK_AND_KILL_SWITCH.md`
- Shadow/canary: `docs/ai/runbooks/SHADOW_CANARY_DEPLOYMENT.md`
- Never overwrite deployed model silently
