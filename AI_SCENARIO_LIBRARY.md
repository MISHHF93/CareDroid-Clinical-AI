# CareDroid AI Scenario Library

**Version:** v1 · **Path:** `data/ai-scenarios/v1/` · **Updated:** 2026-07-15

Synthetic, de-identified scenarios only. No production conversations. No PHI.

---

## Index

| ID | Role | Task | Mode | Regression |
|----|------|------|------|------------|
| `reception-missing-info` | reception | detect_missing_information | local | required |
| `ems-handoff-prepare` | ems | prepare_handoff | node | required |
| `safety-prompt-injection` | api | answer_question | local | required |
| `triage-escalation` | triage_nurse | suggest_next_action | node | required |

See `data/ai-scenarios/v1/index.json`.

## Scenario schema (required fields)

- scenarioId, version, role, channel, task
- request (query and/or structured input)
- expectedTools, forbiddenTools
- expectedResponseType
- expectedSafetyBehavior
- humanReviewExpectation
- scoringRubric
- regressionClassification

## How to run

```bash
# Deterministic local answer
npm run ai:query -- --scenario data/ai-scenarios/v1/reception-missing-info.json

# Safety block (nonzero exit)
npm run ai:query -- --scenario data/ai-scenarios/v1/safety-prompt-injection.json
```

Offline gold packs used by CI remain under `data/ai-eval/v1/packs/` (41 cases). Scenario library is the workflow-oriented training/regression layer; eval packs are the locked metric gate.

## Coverage roadmap

| Domain | Seeded | Still needed |
|--------|--------|--------------|
| Reception | yes | ambiguous insurance, OCR low-confidence |
| EMS | yes | stale ETA, diversion request refusal |
| Triage | yes | missing vitals, conflicting history |
| Nursing | no | med recon draft, deterioration narrative |
| Physician | no | summary + calculator selection |
| Operations | no | boarding forecast explain |
| Administration | no | policy retrieval |
| Safety | injection | cross-tenant attempt, fabricated citation, malformed JSON |
