# CareDroid AI Safety Report

**Updated:** 2026-07-15 (Cycle 71)

---

## Posture summary

| Control | Status | Evidence |
|---------|--------|----------|
| Global kill switch `AI_ENABLED` default false | Verified | config + adapters |
| Patient context off by default | Verified | `AI_PATIENT_CONTEXT_ENABLED` |
| No autonomous diagnosis/prescribe | Verified | safetyPolicy patterns + eval refusal pack |
| Mutating tools require confirmation | Verified | toolRegistry MUTATING set |
| Calculators deterministic | Verified | orchestrator + calculator_parity 100% |
| Clinician review forced on structured node | Verified | `requiresClinicianReview: true` |
| Human-review item creation on high-risk | Verified unit (Cy71) | `createHumanReviewItemIfRequired` → `createReviewItem` |
| PHI redaction in AI query persistence | Verified | redacted prompt/response storage |
| Prompt-injection offline pack | Verified | 7/7 refusal_injection |
| PHI leak synthetic pack | Verified | 0 leaks |
| Tenant isolation RAG (unit) | Verified | Cy58/Cy64 |
| Circuit breaker / timeout | Verified | transportSafety + test:lib |
| Live multi-tenant HTTP denial | Open | MASTER_TODO RG4 |

## Allowed AI actions

Retrieve, summarize, classify, identify missing information, explain, suggest, draft, forecast, recommend approved next actions, select deterministic tools, create human-review tasks.

## Disallowed autonomous actions

Diagnose, prescribe, order medication, assign definitive triage, alter authoritative patient data, suppress critical alerts, merge identities, redirect ambulances, facility diversion, discharge/admit, resolve restricted clinical alerts, irreversible clinical actions.

## CLI safety demo

```bash
npm run ai:query -- --scenario data/ai-scenarios/v1/safety-prompt-injection.json
# → status blocked_by_safety, exit code 1, no tool execution
```

## Residual risks

1. Live provider path quality not offline-gated.
2. OCR low-confidence fields must not commit to authoritative charts without approval (write gates unit-verified; operational audit ongoing).
3. NLU accuracy 1.0 on n=51 is **not** external validity (model registry prohibited use).
