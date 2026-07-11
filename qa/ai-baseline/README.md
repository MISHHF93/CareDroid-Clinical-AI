# AI baseline freeze (v1)

Frozen companion to `docs/ai/AI_BASELINE_REPORT_v1.md`.

| File | Purpose |
|------|---------|
| `metrics.schema.json` | Locked metric definitions for **measured** series |
| `measured-series.empty.json` | Empty series — fill only via offline eval harness |
| `verify-ai-stack.txt` | Output of `node scripts/verify-ai-stack.mjs` at freeze |
| `unified-ai-node-manifest.snapshot.json` | Snapshot of `backend/ml-services/models/manifest.json` |
| `nlu-metrics.snapshot.json` | NLU metrics file if present; else missing marker |
| `artifact-router-metrics.snapshot.json` | Artifact-router metrics if present |

## Rules

1. **Never** copy `EvaluationService` `DEFAULT_METRICS` into `measured-series` as measured values.
2. **Never** overwrite this freeze silently — bump baseline version for new freezes.
3. Production model/prompt/RAG promotion requires blocking gates in `measured-series` with `status: measured`.

## Re-probe stack

```bash
node scripts/verify-ai-stack.mjs
```

Requires Nest backend on port 3350 (default).
