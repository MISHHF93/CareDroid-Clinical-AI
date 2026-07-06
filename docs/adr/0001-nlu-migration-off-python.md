# ADR-0001: Migrate NLU/anomaly-detection off a separate Python service

- **Status:** Accepted (implemented)
- **Date:** 2026-07-03 (per `docs/BACKEND_MIGRATION_REPORT.md`)

## Context

The NLU intent-classification layer originally ran as a separate Python/FastAPI sidecar (`backend/ml-services/nlu/_deprecated-python/`, DistilBERT inference, port 8001, its own Docker service and `docker-compose.yml` entry) alongside a Python anomaly-detection stub. This meant the backend was polyglot (TypeScript + Python), needed a second Docker image, a second dependency set (`requirements.txt`), and a network hop between the NestJS backend and the NLU sidecar for every intent classification.

## Decision

Remove the Python NLU service entirely and reimplement intent classification as an **in-process TypeScript module** (`backend/ml-services/nlu/`, `NluModule`, exposed at `/api/nlu`), using `@xenova/transformers` for embeddings (`Xenova/all-mpnet-base-v2`) and a hand-implemented MLP classifier (`mlpClassifier.ts`) instead of a Python/DistilBERT model. The change landed in commit `bbc804cb`.

The optional anomaly-detection service remains reachable via an external HTTP URL (`ANOMALY_DETECTION_URL`) rather than being removed outright — it's the one place the codebase still leaves room for a non-TypeScript service, and it's explicitly optional/disabled by default.

## Consequences

- **Simpler deployment:** one Docker image family (Node) instead of two; `docker-compose.ml.yml` now only sets environment variables (`NLU_SERVICE_MODE=in-process`) rather than standing up a second container.
- **No network hop for intent classification** — it's an in-process function call inside the same NestJS process, reducing latency and a class of failure modes (sidecar unavailable, version skew between services).
- **Model capability trade-off:** the MLP-over-frozen-embeddings approach is lighter-weight than DistilBERT fine-tuning; accuracy is currently reported as very high (100% on a 51-example held-out test set) but that test set is small — treat headline accuracy with appropriate skepticism until validated on a larger corpus.
- **Single-language backend** — anyone maintaining the NLU pipeline now needs TypeScript/Node ML tooling knowledge (`@xenova/transformers`) rather than Python ML tooling, which is a net simplification for a team that is otherwise all-TypeScript.

## Alternatives considered

- Keeping the Python sidecar and hardening it (containerization, health checks) — rejected in favor of eliminating the polyglot surface area entirely.
- Calling out to a hosted embeddings API instead of local `@xenova/transformers` — would introduce an external dependency and per-request cost for a high-frequency internal classification path; local frozen embeddings were kept instead.
