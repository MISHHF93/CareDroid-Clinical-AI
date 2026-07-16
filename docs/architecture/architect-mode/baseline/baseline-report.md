# Architect Mode — Stage 0 Baseline Report

**Date:** 2026-07-15  
**Branch:** `main`  
**HEAD (last commit):** `1aec4ce8` — docs: Monday AI/RAG readiness verification audit (Cycle 62)  
**Working tree:** Dirty — Cycles 63–68 uncommitted work present (not force-committed)

## Scope

Capture green/red before structural consolidation. No product behavior changes in Stage 0.

## Git inventory (Cycles 63–68 delta — uncommitted)

### Notable new files

| Path | Intent |
|------|--------|
| `backend/src/api/runtime-auth.ts` + `.spec.ts` | JWT auth middleware for legacy Express/Mongoose mounts |
| `backend/src/database/migrations/1772701300000-CreatePgVectorRagStore.ts` | pgvector RAG store migration |
| `backend/src/modules/rag/vector-db/pgvector.store.ts` + `.spec.ts` | pgvector adapter |
| `backend/src/modules/rag/retrieval.tenant-adversarial.spec.ts` | Tenant isolation adversarial tests |
| `lib/ai/providers/groqAdapter.ts` + tests | Groq as configurable demo provider |
| `lib/ai/providers/transportSafety.ts` + tests | LLM timeout/circuit/PHI egress safety |
| `e2e/ems-copilot-handoff.spec.mjs` + Playwright config | EMS ↔ Copilot handoff e2e |
| `data/ai-eval/v1/BASELINE.md` + `BASELINE_RECORDED.json` | AI eval baseline scaffold |
| `src/components/dashboard/DashboardCharts.tsx` | Recharts isolation from non-chart dashboards |
| `src/pages/tools/lazySpecialtyCalculators.tsx` | Lazy specialty calculator loading |
| `src/config/emsHandoffPermission.contract.test.ts` | EMS handoff permission contract |

### Notable modified areas

- RAG module (embedding, rerank, pinecone, rag.service, controller, config)
- `src/main.tsx` reception preload gate (path-conditional)
- `emergencyStore`, `emergencyOsApi`, EMS pipeline, Copilot shell
- Many dashboard pages re-pointed to chart split
- `.env.example` / backend env examples

## Validation commands and results

### Frontend Vitest (Stage 0 core)

```
npx vitest run src/contracts/results.test.ts src/store/emergency-store.test.ts \
  src/config/emsHandoffPermission.contract.test.ts \
  src/components/dashboard/dashboardBundleContract.test.ts
```

| Metric | Value |
|--------|------:|
| Success | **true** |
| Total | 99 |
| Passed | 99 |
| Failed | 0 |
| Artifact | `vitest-stage0.json` |

### Frontend Vitest (Cycle 63–68 related)

```
npx vitest run src/store/emergencyStore.workflowActions.test.ts \
  src/pages/tools/lazySpecialtyCalculators.test.ts \
  lib/ai/providers/transportSafety.test.ts \
  lib/ai/providers/groqAdapter.test.ts
```

| Metric | Value |
|--------|------:|
| Success | **true** |
| Total | 26 |
| Passed | 26 |
| Failed | 0 |
| Artifact | `vitest-stage0b.json` |

### Backend Jest (RAG / auth / pgvector)

```
cd backend && npm test -- --testPathPattern="runtime-auth|retrieval.tenant|pgvector.store"
```

| Metric | Value |
|--------|------:|
| Suites | 3 passed |
| Tests | **13 passed** |
| Failed | 0 |
| Note | Jest force-exits (open handles) — residual observability debt, not gate fail |

### Backend Vitest (attempted — not the project runner)

```
cd backend && npx vitest run src/api/runtime-auth.spec.ts ...
```

| Result | **FAIL setup** — `Cannot find module .../backend/src/test/setup.ts` |
| Conclusion | Use **Jest** for backend unit tests, not root Vitest |

## Known risks carried into Stage A

1. Large uncommitted delta on main — consolidation must not lose Cycles 63–68 fixes  
2. Dual HTTP (Nest + Express registry) still live when Mongoose emergency OS enabled  
3. Nest `UserRole` has 4 values; FE `EMERGENCY_ROLE_IDS` has 12 — mapping incomplete  
4. Production synchronize prohibition must be re-proven in config/data-source (Stage H)  
5. Full `npm run build` / full frontend suite not run in Stage 0 (time-box); required before PR-C  

## Stage 0 gate

| Criterion | Status |
|-----------|--------|
| Baseline folder exists | PASS |
| Focused FE tests green | PASS (125 tests) |
| Focused BE tests green | PASS (13 tests) |
| Command log retained | PASS (this file + JSON) |

**Stage 0: COMPLETE** — proceed to Stage A artifacts.
