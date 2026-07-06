# ADR-0003: Combine NLU and artifact-router into a single Unified AI Node

- **Status:** Accepted (implemented)
- **Date:** 2026-07-05 (commit `b14693f8`, "unified NLU + artifact-router AI node with leak-free training pipeline")

## Context

Two separate classification needs emerged: (1) routing a clinical query to the right intent (drug interaction check, lab interpretation, SOFA calculation, ...) for the 3-phase `IntentClassifierService` pipeline, and (2) routing a free-text query or repo artifact to the right *artifact type* (page, tool, calculator, prompt, ...) for internal tooling and the artifact-intelligence pipeline. Both problems have the same shape — frozen sentence embeddings feeding a small classifier head — and both had been developed as separate MLP models (`backend/ml-services/nlu/`, `backend/ml-services/artifact-router/`).

## Decision

Share the embedding model (`Xenova/all-mpnet-base-v2`) and expose both classifier heads behind one endpoint and one manifest: the **Unified AI Node** (`backend/ml-services/unified-ai-node/`, `POST /api/ai/node/models/route`, backed by `backend/ml-services/models/manifest.json` under the name `caredroid-unified-ai-node`). A single call runs both heads in parallel and returns `{ intent, artifact, latencyMs }`. Training was also hardened with a "leak-free" pipeline — a hard-example mining loop that mines new training examples only from validation errors, never letting the test set leak back into training (per code comments in `scripts/dumpErrors.ts` / `scripts/generateHardExamples.ts`).

## Consequences

- **One embedding computation serves two classifiers** — avoids redundant embedding calls when both signals are useful in the same request path.
- **One health/manifest surface** (`GET /api/ai/node/models/health`, `GET /api/ai/node/models/manifest`) instead of two, simplifying operational monitoring.
- **Coupling risk:** the two classifier heads, despite serving different purposes (clinical intent vs. artifact type), now share a deployment unit and a training orchestration script (`scripts/train-unified-models.mjs`). A change intended for one head (e.g. retraining NLU on new clinical intents) runs through the same pipeline as artifact-router training — care is needed to avoid accidentally coupling their release cadence.
- **Naming risk documented in this Documentation Center:** it is easy to conflate the two 128-hidden-dim MLPs as "one model" because they share architecture and embedding — they have different label spaces (10 clinical intents vs. 10 artifact types) and should be reasoned about separately. See [Platform Architecture Overview §AI Platform](../architecture/platform-architecture-overview.md#5-ai-platform).

## Alternatives considered

- Keeping the two classifiers as fully independent services with separate endpoints — simpler mental model, but duplicates the embedding computation on any request that needs both signals, and duplicates health/manifest plumbing.
