# CareDroid AI Runbook

**Updated:** 2026-07-15 (Cycle 71)

---

## Quick health

```bash
# Offline safety gate (CI-equivalent)
npm run ai:eval:gate

# Provider adapters (no secrets printed)
npm run ai:query -- --providers
# or authenticated: GET /api/ai/providers/health

# Deterministic local query
npm run ai:query -- --role reception --task answer_question --query "What is missing for handoff?"

# Safety block fixture (expect exit 1)
npm run ai:query -- --scenario data/ai-scenarios/v1/safety-prompt-injection.json
```

## Kill switch

1. Set `AI_ENABLED=false` (default).
2. Optionally set `AI_LOCAL_FALLBACK=1` so critical heuristic paths continue without foundation LLMs.
3. See `docs/ai/runbooks/ROLLBACK_AND_KILL_SWITCH.md`.

## Provider outage

1. Circuit breaker opens after repeated timeouts (`transportSafety.ts`).
2. Fallback provider via `AI_FALLBACK_PROVIDER` or local adapter.
3. Structured CareDroid AI node (heuristic) remains available for 8/9 AI Chief domains without LLM.

## Human review queue

- Items created when AI queries log `requiresHumanReview=true`.
- List: `GET /api/human-review/items` (permission `VIEW_REVIEW_QUEUE`)
- Decide: `POST /api/human-review/items/:itemId/decision` (permission `REVIEW_CLINICAL_AI`)
- Governance twin: `/api/platform-governance/review/*`

## RAG issues

```bash
npm run verify:rag
```

- Tenant filter: caller org + global scope only.
- No-evidence: abstain / escalate — do not invent citations.

## OCR issues

- Default provider: `tesseract` (`OCR_PROVIDER=mock` for tests).
- Low-confidence fields must go through review gates before authoritative commit.
- PDFs: not rasterized yet — manual text fallback with warning.

## Calculator issues

- Always use tool-orchestrator executors — never trust LLM arithmetic for validated scores.
- Re-run: calculator suites under `backend/test/*` and `npm run ai:eval` calculator_parity pack.

## Migrations / AI queries table

- `ai_queries` includes tenant + routing + `requiresHumanReview` columns.
- Never enable production `synchronize: true`.

## Escalation contacts

Document owners in model registry entries under `data/model-registry/entries/`.
