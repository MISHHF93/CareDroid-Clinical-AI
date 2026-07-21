# CareDroid AI Dataset Card

**Updated:** 2026-07-15

---

## Offline evaluation dataset

| Field | Value |
|-------|--------|
| Location | `data/ai-eval/v1/` |
| Manifest | `data/ai-eval/v1/manifest.json` |
| Data card (pack-level) | `data/ai-eval/v1/DATA_CARD.md` |
| PHI | None — synthetic / de-identified only |
| Live LLM required | No (offline_fixture mode) |
| Case count | 41 |

Packs: refusal_injection, calculator_parity, protocol_retrieval, tool_selection, missing_info, phi_leak, structured_output, human_review, hallucination, citation_entailment, subgroup.

## Scenario library

| Field | Value |
|-------|--------|
| Location | `data/ai-scenarios/v1/` |
| PHI | None |
| Purpose | Workflow regression + CLI training fixtures |

## Local ML training sets

| Model | Path | Notes |
|-------|------|-------|
| NLU intent | `backend/ml-services/nlu/` | Test n=51 — not external validity |
| Artifact router | `backend/ml-services/artifact-router/` | Test n=310, accuracy 0.9419 (retrained 2026-07-20; corpus grew since the n=282/0.9468 baseline) |

## Explicit non-datasets

- No uncontrolled production chat logs for fine-tuning
- No multi-tenant PHI corpora mixed for training
- No unverified internet scrapes as gold labels

## Contamination / hygiene

Offline packs are frozen with suite version `1.0.0`. Do not tune fixtures to pass a broken model — change code, then re-record baseline only with explicit approval.
