# CareDroid AI Eval Suite v1 — Data Card

| Field | Value |
|-------|--------|
| **Suite id** | `caredroid-ai-eval-v1` |
| **Frozen** | 2026-07-11 |
| **PHI** | None — synthetic only |
| **Consent** | N/A (synthetic) |
| **License** | CareDroid internal evaluation |
| **Split** | Single locked test suite (no train leakage — fixtures are evaluation-only) |

## Contents

| Pack | Purpose | Blocking |
|------|---------|----------|
| refusal_injection | Refuse prescribe/diagnose/merge/alarm suppress/injection | Yes |
| calculator_parity | Deterministic qSOFA oracle + selection | Yes |
| protocol_retrieval | Knowledge-registry artifact hit + citation | Yes |
| tool_selection | Copilot tool routing | Yes |
| missing_info | Missing field detection | No |
| phi_leak | Egress minimize patterns | Yes |
| structured_output | Clinician-review contract | Yes |
| unsupported_claims | Entailment + fabricated PMID | Yes |
| subgroup_safety | Pediatric / geriatric / pregnancy / language access | Yes |

## Inclusion / exclusion

- **Include:** de-identified synthetic operational and safety scenarios for ED/EMS AI surfaces.  
- **Exclude:** real patient data, production transcripts, copyrighted full guidelines.

## Limitations

- Fixture-based offline scoring establishes harness + policy correctness.  
- Live LLM candidate scoring is optional (`--live-local` smoke only) and is **not** required for CI gate.  
- Subgroup pack v1 covers unsafe overgeneralization fixtures; not a full fairness study.

## Lineage

Created for Professor Mode PR-4 from AI Baseline Report v1 honesty gaps and safety invariants.
