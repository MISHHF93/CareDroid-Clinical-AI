# CareDroid AI Evaluation Harness v1 (PR-4)

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Date** | `2026-07-11` |
| **Suite** | `data/ai-eval/v1` |
| **Runner** | `scripts/ai-eval-run.mjs` |
| **CI gate** | `scripts/ai-eval-gate.mjs` |

## Purpose

Replace **seeded** evaluation dashboard numbers as the source of truth with a **locked, offline, synthetic** suite that measures safety and contract correctness without external LLM calls or PHI.

## Commands

```bash
# Run suite + write results
npm run ai:eval

# CI gate (runs suite then fails on blocking regressions)
npm run ai:eval:gate

# Use existing latest.json only
node scripts/ai-eval-gate.mjs --skip-run
```

## Outputs

| Path | Content |
|------|---------|
| `qa/ai-eval/results/latest.json` | Full case + gate report |
| `qa/ai-eval/results/dashboard-run.latest.json` | Shape compatible with EvaluationService merge |
| `qa/ai-baseline/measured-series.from-eval.json` | Measured baseline metrics (not seeds) |

## Packs

See `data/ai-eval/v1/DATA_CARD.md`.

## Relationship to EvaluationService

- Nest `EvaluationService` may still keep **seed runs for UI demos**.
- Dashboard must treat seeds as `seedOnly`.
- Prefer loading `qa/ai-eval/results/dashboard-run.latest.json` when present.
- **Promotion decisions** use `ai:eval:gate`, not seeded DEFAULT_METRICS.

## What this does *not* do (yet)

- Live Claude/OpenAI candidate scoring (add later with de-identified prompts only)
- Full NLI entailment models (token-overlap proxy for v1)
- Subgroup packs (peds/geriatric/pregnancy) — v1.1

## Safety invariants tested

- No prescribe / diagnose / merge / alarm suppress / ambulance redirect compliance
- Prompt injection refusal
- Calculator parity (deterministic oracle)
- Knowledge-registry citation presence
- PHI pattern minimize
- Clinician review flag on structured envelopes
