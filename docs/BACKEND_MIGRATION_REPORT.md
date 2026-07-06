# Backend Migration Report — Python/FastAPI → TypeScript (NestJS)

**Date:** 2026-07-03  
**Lead engineer audit:** Complete repository inspection before and after cleanup  
**Status:** **COMPLETE** — zero application Python; NestJS is the sole backend runtime

---

## Executive summary

CareDroid’s backend is **100% TypeScript on Node.js** using **NestJS 10** (Express adapter). The former Python/FastAPI NLU sidecar (`_deprecated-python/`, port `8001`, Docker `nlu:` service) was removed in commit `bbc804cb` and replaced with an **in-process NLU module** at `/api/nlu`. No `.py` application files, `requirements.txt`, or Python Docker layers remain in the repository (excluding transitive `node_modules` tooling).

---

## Framework choice

| Layer | Technology |
|-------|------------|
| API framework | **NestJS 10** + Express |
| Language | TypeScript (Node ≥20.19) |
| ORM | TypeORM (SQLite dev / PostgreSQL prod) |
| Optional ED OS | Mongoose (when `ENABLE_MONGOOSE_EMERGENCY_OS=true`) |
| NLU / intent routing | In-process `NluModule` — Xenova `all-mpnet-base-v2` + MLP |
| AI orchestration | `lib/ai/*` shared config + Claude via `unifiedAIClient` |
| Real-time | Socket.io (`ems.socket.ts`) |
| Entry point | `backend/src/main.ts` → `node dist/backend/src/main.js` |

**Not used:** FastAPI, uvicorn, Flask, Django, separate Python microservices (except optional external anomaly-detection HTTP URL).

---

## Removed Python artifacts (commit `bbc804cb`)

### Application code deleted

| Path | Role |
|------|------|
| `backend/ml-services/nlu/_deprecated-python/app.py` | FastAPI NLU server |
| `backend/ml-services/nlu/_deprecated-python/model.py` | DistilBERT inference |
| `backend/ml-services/nlu/_deprecated-python/config.py` | Python NLU config |
| `backend/ml-services/nlu/_deprecated-python/train.py` | Training script |
| `backend/ml-services/nlu/_deprecated-python/prepare_data.py` | Dataset prep |
| `backend/ml-services/nlu/_deprecated-python/evaluate.py` | Eval script |
| `backend/ml-services/nlu/_deprecated-python/evaluate_simple.py` | Simple eval |
| `backend/ml-services/nlu/_deprecated-python/load_test.py` | Load test |
| `backend/ml-services/nlu/_deprecated-python/load_test_runner.py` | Load runner |
| `backend/ml-services/nlu/_deprecated-python/utils.py` | Utilities |
| `backend/ml-services/nlu/_deprecated-python/tests/test_model.py` | Pytest |
| `backend/ml-services/nlu/_deprecated-python/tests/test_utils.py` | Pytest |
| `backend/ml-services/_deprecated-python/anomaly_detector.py` | Python anomaly stub |

### Infrastructure deleted

| Path | Role |
|------|------|
| `backend/ml-services/nlu/Dockerfile` | Python NLU container |
| `backend/ml-services/nlu/requirements.txt` | Python dependencies (if present) |
| `docker-compose.yml` `nlu:` service | Port 8001 sidecar |
| `__pycache__/*.pyc` | Compiled Python cache |

---

## TypeScript replacements

| Former Python surface | TypeScript replacement |
|----------------------|------------------------|
| FastAPI `/nlu/predict` | `NluController` → `POST /api/nlu/predict` |
| FastAPI `/health` | `GET /api/nlu/health` |
| `model.py` inference | `backend/ml-services/nlu/nlu.service.ts` |
| `train.py` / `prepare_data.py` | `backend/ml-services/nlu/scripts/{train,prepareData,evaluate}.ts` |
| `load_test.py` | `backend/ml-services/nlu/scripts/loadTest.ts` |
| HuggingFace DistilBERT (Python) | `@xenova/transformers` + linear/MLP head (`training/classifier.ts`) |
| Port `8001` sidecar | In-process DI: `IntentClassifierService` → `NluService` |
| `lib/ai` Python config drift | Unified `lib/ai/config.ts` + `backend/src/config/nlu.config.ts` |

---

## API contract preservation

Public NLU contract **preserved** on Nest:

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/nlu/health` | `modelLoaded`, `modelName` |
| GET | `/api/nlu/model-info` | Classifier metadata |
| POST | `/api/nlu/predict` | `{ text }` → `{ intent, confidence, ... }` |

All other clinical APIs remain on Nest under `/api/*` (chat, tools, emergency-os, rag, governance, auth, audit, etc.). Frontend uses **same-origin** `/api` via Vite proxy (`src/services/apiClient.ts`); no `localhost:8001` references.

---

## Route map (high level)

| Domain | Nest module / express mount | Prefix |
|--------|----------------------------|--------|
| Auth, users, subscriptions | `modules/auth`, `users`, `subscriptions` | `/api` |
| Chat + copilot | `modules/chat`, `modules/ai` | `/api/chat`, `/api/ai` |
| Tool orchestration | `medical-control-plane` | `/api/tools/*` |
| NLU | `ml-services/nlu/NluModule` | `/api/nlu` |
| RAG | `modules/rag` | `/api/rag`, `/api/clinical-intelligence/guideline-rag` |
| Governance / safety | `modules/governance`, `services/ai-governance` | `/api/emergency/governance`, `/api/v1/governance` |
| Emergency OS (optional) | Express routes via `routes-registry.ts` | `/api/*`, `/api/emergency/*` |
| Health / metrics | `main.ts` | `/health`, `/api/health`, `/api/metrics` |

Full inventory: `src/data/frontendApiCallsInventory.ts` + `backend/src/data/backendHttpRouteInventory` (exposure tests).

---

## Configuration changes

| Variable | Before | After |
|----------|--------|-------|
| `NLU_SERVICE_MODE` | `http` (sidecar) | `in-process` (default) |
| `NLU_SERVICE_URL` | `http://nlu:8001` | `http://127.0.0.1:3350/api/nlu` |
| `AI_EMBEDDING_MODEL` | `distilbert-base-uncased` | `Xenova/all-mpnet-base-v2` |
| Dev ports | Mixed docs (`8000`) | **5190** frontend / **3350** backend |

Docker: `docker-compose.app.yml` + `docker-compose.ml.yml` set `NLU_SERVICE_MODE=in-process` on the Node backend image only.

---

## Frontend integration

- **Proxy:** `vite.config.ts` → `localhost:3350` for `/api`, `/health`, `/socket.io`
- **Dev stack:** `scripts/dev-stack.mjs` spawns Nest + Vite with `NLU_SERVICE_MODE=in-process`
- **API client:** `src/services/apiClient.ts` — relative `/api` paths only
- **NLU path in chat:** `POST /api/chat/intent-classify` (Nest intent classifier, not Python)

---

## Tests added / updated

| Suite | Purpose |
|-------|---------|
| `backend/ml-services/nlu/*.spec.ts` | NLU service unit tests |
| `backend/test/clinical-safety-rules.spec.ts` | Safety rule engine |
| `scripts/verify-ai-stack.mjs` | Live NLU + stale-config guard |
| `scripts/verify-ts-backend.mjs` | **No Python** repo-wide scan |
| `src/data/backendFrontendExposure.test.ts` | Frontend↔Nest route parity |

---

## Verification commands (run 2026-07-03)

```bash
# No Python application code
npm run verify:ts-backend

# NLU in-process on Nest
npm run verify:ai-stack

# Full stack connectivity
npm run verify:stack

# Backend unit tests (1051 tests)
cd backend && npm test

# Production builds
cd backend && npm run build
npm run build
```

### Results

| Command | Result |
|---------|--------|
| `npm run verify:ts-backend` | **PASS** — 0 `.py` files, 0 stale sidecar refs |
| `cd backend && npm test` | **PASS** — 165 suites, 1051 tests |
| `cd backend && npm run build` | **PASS** |
| `npm run build` (Vite) | **PASS** |
| `npm run typecheck:frontend` | **Pre-existing errors** in `src/utils/platformSaasChartModel.ts` (unrelated to backend migration) |

---

## Remaining risks

| Risk | Mitigation |
|------|------------|
| `NLU_SERVICE_MODE=http` allows external NLU URL | Default is `in-process`; document if deploying separate service |
| Anomaly detection URL `:5000` | Optional external service; disabled by default; not in compose |
| Mongoose Emergency OS routes | Optional; gated by `ENABLE_MONGOOSE_EMERGENCY_OS` |
| Frontend typecheck debt | `platformSaasChartModel.ts` — separate fix |
| Historical comments in `backend/ml-services/nlu/training/*` | Non-runtime; trimmed in key entry files |

---

## Cleanup performed in this audit

- Aligned README + smoke checklist dev ports (`5190`/`3350`)
- Fixed NLU load-test default URL → `http://localhost:3350/api/nlu/predict`
- Updated `docs/AI_FEATURES.md` TOC and anomaly-detection compose wording
- Removed Python cache entries from `.gitignore`
- Added `npm run verify:ts-backend` migration guard script
- Trimmed stale FastAPI migration comments in NLU controller/service

---

## Conclusion

The repository is **fully TypeScript-based** for backend runtime behavior. Python/FastAPI has no executable path in local dev, Docker app stack, or CI. All frontend API calls target the NestJS backend via `/api`. Use `npm run verify:ts-backend` in CI to prevent Python sidecar regressions.
