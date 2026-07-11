# AI evaluation results

| Command | Purpose |
|---------|---------|
| `npm run ai:eval` | Run offline synthetic suite |
| `npm run ai:eval:gate` | CI gate (blocking metrics/cases) |

| File | Purpose |
|------|---------|
| `results/latest.json` | Full harness report |
| `results/dashboard-run.latest.json` | Merged into EvaluationService when present |
| `../ai-baseline/measured-series.from-eval.json` | Baseline measured metrics |

Do **not** promote models/prompts/RAG on seed-only EvaluationService defaults.
