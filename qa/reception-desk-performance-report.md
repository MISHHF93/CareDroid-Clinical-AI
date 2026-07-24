# Reception desk performance report

**Generated:** 2026-07-24T04:40:17.221Z
**Grade:** **A**

## Offline microbench (pure desk logic)

| Metric | p50 | p95 | p99 | budget p95 |
|--------|----:|----:|----:|-----------:|
| Next-best-action | 0.0002ms | 0.0004ms | 0.0015ms | ≤1ms |
| Prompt→open intent | 0.0069ms | 0.015ms | 0.0335ms | ≤2ms |
| Apply navigation | 0.0002ms | 0.0003ms | 0.0015ms | ≤1ms |

Offline budgets: **PASS** (2000 iterations)

## Live API

Backend :3350 reachable (health 9.7ms).
Creates: 8/8 ok · p95 794.3ms
List patients: status 200 in 84.9ms
