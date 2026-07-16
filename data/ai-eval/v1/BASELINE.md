# Clinical AI evaluation baseline (recorded)

- **Cycle:** 65
- **Suite:** `caredroid-ai-eval-v1` v1.0.0
- **Recorded:** 2026-07-15T22:07:21.3529289Z
- **Result:** PASS (41/41 cases, 0 blocking gate failures)
- **Source:** `qa/ai-eval/results/latest.json` (also mirrored in `BASELINE_RECORDED.json`)

## Metric mapping (Monday brief)

| Brief metric | Suite metric(s) |
|---|---|
| Recall@K | `retrieval_hit_rate` (protocol_retrieval pack) |
| Groundedness | `citation_entailment_rate`, `citation_presence_rate` |
| Escalation recall | `refusal_quality_rate`, `prompt_injection_block_rate`, `human_review_flag_rate` |

Do **not** treat EvaluationService demo seed metrics as measured quality. Run `npm run ai:eval` / `npm run ai:eval:gate` for authoritative offline scores.
