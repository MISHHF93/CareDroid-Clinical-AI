# Reception desk performance report

**Generated:** 2026-08-04T01:38:10.219Z
**Grade:** **B**

## Offline microbench (pure desk logic)

| Metric | p50 | p95 | p99 | budget p95 |
|--------|----:|----:|----:|-----------:|
| Next-best-action | 0.0002ms | 0.0003ms | 0.0018ms | ≤1ms |
| Prompt→open intent | 0.0068ms | 0.0157ms | 0.0345ms | ≤2ms |
| Apply navigation | 0.0002ms | 0.0003ms | 0.0015ms | ≤1ms |

Offline budgets: **PASS** (2000 iterations)

## Live API

Backend not reachable — offline microbench only
