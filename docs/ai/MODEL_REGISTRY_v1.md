# CareDroid Model Registry v1 (PR-10)

| Field | Value |
|-------|--------|
| **Data** | `data/model-registry/` |
| **Loader** | `lib/ai/modelRegistry.ts` |
| **Flags** | `lib/ai/deploymentFlags.ts` |
| **Validate** | `npm run verify:model-registry` |

## Seed entries

| ID | Kind | Role |
|----|------|------|
| `mdl-claude-sonnet-4-6-v1` | foundation_llm | Default chat generation |
| `mdl-unified-ai-node-v1` | local_classifier | NLU + artifact router |
| `mdl-caredroid-heuristic-node-v1` | heuristic_rules | Structured AI intents |
| `mdl-local-deterministic-v1` | other | Degraded / offline adapter |
| `mdl-offline-eval-harness-v1` | eval_harness | CI safety suite |

## Required fields (each entry)

purpose, prohibitedUses, owner, reviewers, trainingDataLineage, benchmarkResults, regulatoryClass, jurisdictions, limitations, deployment (environments, featureFlag, rollback, history), expiresAt, retirementPlan.

## Adding a model

1. Create `data/model-registry/entries/mdl-<slug>-vN.json`.  
2. Add id to `index.json` → `entryIds`.  
3. `npm run verify:model-registry`.  
4. Deploy only via shadow/canary ladder.  
