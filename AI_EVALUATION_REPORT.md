# CareDroid AI Evaluation Report

**Updated:** 2026-07-15 / 2026-07-16  
**Mode:** offline_fixture (no external LLMs)  
**Command:** `npm run ai:eval` · gate: `npm run ai:eval:gate`

---

## Latest gate result

| Field | Value |
|-------|--------|
| Suite | `caredroid-ai-eval-v1` |
| Cases | **41/41 passed** |
| Blocking gate failures | **0** |
| Overall | **PASS** |
| Artifact | `qa/ai-eval/results/latest.json` |

### Blocking metrics (all OK)

| Metric | Result | Threshold |
|--------|--------|-----------|
| refusal_quality_rate | 1.0 | ≥ 0.95 |
| prompt_injection_block_rate | 1.0 | ≥ 0.99 |
| calculator_parity_pass_rate | 1.0 | ≥ 1.0 |
| retrieval_hit_rate | 1.0 | ≥ 0.7 |
| citation_presence_rate | 1.0 | ≥ 0.95 |
| tool_call_accuracy | 1.0 | ≥ 0.9 |
| phi_leak_rate_synthetic | 0 | ≤ 0 |
| structured_output_validity | 1.0 | ≥ 0.99 |
| human_review_flag_rate | 1.0 | ≥ 0.99 |
| hallucination_rate | 0 | ≤ 0.05 |
| unsupported_claim_rate | 0 | ≤ 0.05 |
| citation_entailment_rate | 1.0 | ≥ 0.9 |
| subgroup_min_accuracy | 1.0 | ≥ 0.9 |

Non-blocking: `clinical_omission_rate` = 0 (threshold ≤ 0.15).

## Baseline comparison

Frozen baseline: `data/ai-eval/v1/BASELINE_RECORDED.json` (Cy69).  
Current offline fixture run matches baseline gate pass rate (41/41). No offline regression.

## Not yet measured (explicit)

- Live foundation-model quality (requires approved keys + separate harness)
- Live retrieval Recall@K against real pgvector corpus
- OCR messy-handwriting / PDF accuracy
- Concurrent quota atomicity under load
- Cross-tenant HTTP integration on real Postgres

## Cycle 71 additions affecting eval surface

- Unified request validation unit tests (`lib/ai/unifiedAiContracts.test.ts`)
- Chunker edge-case matrix (`document-chunker.spec.ts`)
- Human-review creation assertion from high-risk structured node (`ai.service.spec.ts`)
- Scenario library seed for workflow regression (`data/ai-scenarios/v1/`)

## Cycle 73 — Interactive Intelligence evaluation notes

| Interaction metric (design) | Current status |
|-----------------------------|----------------|
| Task completion via proposals | Unit-proven state machine (propose→approve→execute→rollback) |
| Inappropriate automation rate | High-risk auto-approve throws; moderate requires approval |
| Evidence comprehension | AccountableRecommendationCard + Why-this-suggestion fields on proposals |
| Stream progress clarity | Named states (validating…completed/blocked/failed); cancel supported |
| Alert burden | Workflow cards dedupe (5m cooldown) + dismissible non-critical |
| Keyboard / screen-reader | Live region for status transitions only (not per-token) |
| Offline safety packs | Still 41/41 gate (unchanged this cycle) |

**Not yet measured in browser:** Playwright streaming reconnect, ultrawide reflow, full keyboard task completion for InteractiveAIWorkspace.

## Interaction evaluation commands

```bash
npx tsc --noEmit -p tsconfig.frontend.json
npx vitest run src/contracts/interactiveAi.test.ts src/services/interactiveAi --maxWorkers=1
npm run ai:eval:gate
```
