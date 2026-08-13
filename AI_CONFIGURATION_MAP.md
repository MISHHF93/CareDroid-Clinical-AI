# AI Configuration Map — CareDroid Clinical AI

**Generated:** 2026-07-15
**Method:** Direct source/config audit (no reliance on prior write-ups) — every claim below was verified against the file on disk, a real metrics artifact, or the live `.env` at the time of writing. File paths are given so any claim can be re-checked as the code moves.

**Scope:** every place in this repository that trains a model, calls a foundation LLM, or is labeled "AI" in the product but is actually deterministic logic. The goal is one place that answers: *what was actually trained, what's wired to a real model, and what's the current score for each.*

---

## 1. Executive summary

| Layer | What it is | Actually trained? | Real metric exists? | Live in this environment right now? |
|---|---|---|---|---|
| NLU intent classifier | MLP head over frozen sentence embeddings | **Yes** | ✅ accuracy 1.00 (n=51) | ✅ `NLU_SERVICE_ENABLED=true` (in-process); backend must be up for HTTP probe |
| Artifact-type router | MLP head over frozen sentence embeddings | **Yes** | ✅ accuracy **0.9645** (n=310) | Loaded via the same Unified AI Node as above |
| Foundation LLM (Claude Sonnet 4.6) | Third-party API, not trained by CareDroid | No (provider-managed) | Offline fixture gate only, no live-LLM eval | ❌ no `ANTHROPIC_API_KEY` set, `AI_ENABLED=false` |
| RAG retrieval | Embedding + vector search + citations | No (retrieval, not training) | Fixture: 5/5 retrieval cases | ✅ `RAG_MODEL=Xenova/all-mpnet-base-v2` (real semantic embeddings, not hash fallback — corrected, see §10) |
| 39 clinical calculators (tool-orchestrator) | Hand-coded validated clinical formulas | **Never — by design** | Deterministic, unit-tested | ✅ yes, always (no model involved) |
| Offline AI safety-eval harness | Rule-based scorer over synthetic fixtures | N/A (a test harness, not a model) | 41/41 cases, 14/14 gates pass | ✅ runs via `npm run ai:eval:gate` |
| Anomaly detection | Was sklearn IsolationForest; now z-score threshold | **No longer** (ML removed) | N/A | Standalone script, not wired into request path |
| OCR (document intake) | Tesseract.js real OCR engine | Pretrained (Tesseract's own model), not CareDroid-trained | Confidence blended per field | ✅ real, wired |

**One-line answer to "what's the training score":** two real, gradient-trained classifiers exist (NLU intent + artifact router), scoring **100% / n=51** and **96.45% / n=310** (measured 2026-07-21). Everything else that reads as "AI" in the product — 17 declared AI services, 39 clinical calculators, deterioration/discharge/admission prediction, protocol triggers — is either a third-party foundation model called over HTTP (not trained here), or hand-written deterministic/heuristic logic wearing an AI label. Full breakdown below.

---

## 2. The only two genuinely trained ML models

Both live under `backend/ml-services/`, share one embedding backbone, and are combined behind a single manifest (`backend/ml-services/models/manifest.json`) as the **"Unified AI Node"** (`backend/ml-services/unified-ai-node/unified-ai-node.service.ts`).

### 2.1 NLU intent classifier

- **Architecture:** MLP classifier head (`backend/ml-services/nlu/training/mlpClassifier.ts`) on top of frozen `Xenova/all-mpnet-base-v2` sentence embeddings (768-dim, no fine-tuning of the embedding model itself).
- **Classes:** 10 intents.
- **Training config** (`backend/ml-services/nlu/training/training.config.ts`): 6000 epochs, learning rate 0.3, L2 reg 0.0002, seed 42 — tuned specifically because untuned defaults "only reached 27% test accuracy, barely above chance" (comment in source, not a claim of mine).
- **Measured result** (`backend/ml-services/models/nlu/metrics.json`, trained 2026-07-05):

  | Metric | Value |
  |---|---|
  | Accuracy | 1.0 |
  | Macro F1 / Weighted F1 | 1.0 / 1.0 |
  | Macro precision / recall | 1.0 / 1.0 |
  | Test set size | **51 examples** |
  | p50 / p95 / p99 latency | 35ms / 100ms / 1544ms |

- **Caveat, stated in the model registry itself** (`data/model-registry/entries/mdl-unified-ai-node-v1.json`): *"Treating NLU accuracy metrics on tiny test sets as external validity"* is an explicit **prohibited use**. A 51-example test set producing a perfect score is a small/overfit-prone benchmark, not evidence of generalization — the registry entry itself flags this, which is the right instinct; it should be re-measured on a larger held-out set before being cited as a real capability score.

### 2.2 Artifact-type router

- Same embedding backbone, separate MLP head, target mode `artifact-type` (~20 classes after rare-type collapsing).
- **Training config** (`backend/ml-services/artifact-router/training/training.config.ts`): learning rate 0.25, L2 reg 0.0003, 2500 epochs, class-weighting and oversampling enabled for weak classes (`tool`, `document`, `prompt`, `route`, `platform`, `api-endpoint`).
- **Measured result** (`backend/ml-services/models/artifact-router/metrics.json`, evaluated 2026-07-21):

  | Metric | Value |
  |---|---|
  | Accuracy | **0.9645** (299/310) |
  | Test set size | 310 |
  | Residual errors | 11 (mostly catalog-ambiguous tool/route names) |
  | p50 / p95 latency | 0ms / 1ms |

- Credible score — larger test set, no perfect-score red flag. Single-pass train only (hard-example second pass opt-in; it previously regressed test accuracy).

**Retraining commands** (both real, runnable): `cd backend && npm run nlu:pipeline` / `npm run artifact-router:pipeline`.

---

## 3. Foundation LLM integration (not trained by CareDroid)

`lib/ai/` is the single generation gateway. Architecture, in call order:

```
lib/ai/serverClient.ts → providers/egress.ts
   (kill switch → PHI minimize → provider adapter [+ optional fallback])
```

- **Provider adapters** (`lib/ai/providers/`): `anthropicAdapter.ts` (real — POSTs to `https://api.anthropic.com/v1/messages`, prompt caching, streaming, tool-use parsing), plus `openaiAdapter.ts`, `azureOpenAIAdapter.ts`, `geminiAdapter.ts`, and `localAdapter.ts` (deterministic, no network — used for tests/degraded mode).
- **Default provider/model:** `AI_PROVIDER=anthropic`, `AI_MODEL=claude-sonnet-4-6` (`.env.example` and `lib/ai/config.ts` `DEFAULT_AI_PROVIDER_CONFIG`).
- **Current live state in this repo's `.env` files:** no `AI_ENABLED`, `AI_PROVIDER`, or `AI_MODEL` lines exist in root `.env` at all (falls back to code defaults: `AI_ENABLED=false`). Neither `.env` nor `backend/.env` has a non-empty `ANTHROPIC_API_KEY`. Net effect: **every "active" LLM-backed service in §4 currently fails closed** — `anthropicAdapter.health()` reports `configured: false`, and any real call throws `AI_CONFIG_ERROR` before hitting the network.
- **Governance:** `data/model-registry/entries/mdl-claude-sonnet-4-6-v1.json` — status `approved`, explicit prohibited uses (no autonomous diagnosis, no computing validated medical scores instead of the deterministic calculators in §6, no fine-tuning on production PHI), kill-switch documented at `docs/ai/runbooks/ROLLBACK_AND_KILL_SWITCH.md`.

---

## 4. The 17 declared AI "services" (`lib/ai/config.ts`)

This is the platform's own service registry — each entry declares provider, risk level, and a `status` field. Counted directly from `buildServiceRegistry()`:

| Status | Count | Services |
|---|---|---|
| **active** (routes to the real foundation-LLM adapter, if enabled+keyed) | 6 | `copilot` (ED Copilot), `smartIntakeVerification`, `referralSummarization`, `analyticsExplanation`, `clinicalWorkflowLauncher`, `calculatorExplanation` |
| **legacy** (still LLM-routed, deprioritized) | 3 | `smartHandover`, `triageSupport`, `ambientDocumentation` (Azure OpenAI `gpt-4o`, SOAP-note drafting) |
| **local-deterministic** (never calls an LLM, rule-based by design) | 2 | `protocolTrigger`, `textMining` |
| **future** (declared, not implemented — placeholder model IDs like `deterioration-v3-deterministic`, `start-ai-ensemble-v1`) | 6 | `deteriorationPrediction`, `dischargePrediction`, `admissionPrediction`, `mohPatientMatching`, `federatedEmsTriage`, `edgeAmbulance` |

Notes:
- Even within the 6 "active" services, per-domain flags in `.env.example` default most to **off**: `ED_COPILOT_AI_ENABLED=true` but `SMART_INTAKE_AI_ENABLED`, `REFERRAL_AI_ENABLED`, `ANALYTICS_AI_ENABLED`, `CLINICAL_WORKFLOW_AI_ENABLED` all default `false`. Combined with §3's missing API key, **0 of the 17 services currently produce a live foundation-model response in this environment.**
- The "future" services already have hard-coded model identifiers (e.g. `start-ai-ensemble-v1`) that read as real model names but back no actual trained model yet — worth knowing before quoting them externally as shipped capabilities.

---

## 5. RAG / retrieval pipeline (`backend/src/modules/rag/`)

Real, wired architecture: `rag.service.ts` orchestrates `EmbeddingService` → `PineconeService` (vector store) → `RetrievalService` → `RerankingService` → `CitationService`, with `ClinicalContextService` assembling the final grounded context.

- **Vector store:** Pinecone if `PINECONE_API_KEY` is set, otherwise falls back to `InMemoryVectorStore` (`vector-db/in-memory-vector.store.ts`). Neither `.env` has a Pinecone key configured → **in-memory store is what's actually running.**
- **Embeddings:**
  `backend/src/modules/rag/embeddings/openai-embeddings.service.ts` (class name is legacy/misleading — it never calls OpenAI's API) picks its embedding strategy from the resolved model string:
  - if the model name contains `xenova`/`mpnet`/`minilm`/`semantic-local` → real local transformer embedding via `embedTextWithXenova` (`embeddings/xenova-embeddings.util.ts`)
  - **otherwise → `generateHashEmbedding()`**, a deterministic SHA-256 bag-of-words hash vector — not semantic at all.

  `backend/src/config/rag.config.ts:10-14` resolves the model from `process.env.RAG_MODEL || EMBEDDING_MODEL || AI_EMBEDDING_MODEL || 'Xenova/all-mpnet-base-v2'`. **A config-drift bug was found here 2026-07-15** (`backend/.env` set `RAG_MODEL=text-embedding-ada-002`, a leftover OpenAI-era value matching none of the Xenova triggers, silently routing retrieval to hash embeddings) — **re-verified 2026-08-12: `backend/.env` now sets `RAG_MODEL=Xenova/all-mpnet-base-v2`, matching `.env.example`, so retrieval in this environment is running on real semantic embeddings, not the hash fallback.** Fixed by an earlier session; this section is left in place as the historical record per §10.
- **Reranking:** `RERANK_ENABLED=false` everywhere — the `cohere-ranker.service.ts` exists but is not active.
- **Knowledge registry** (`data/knowledge-registry/`): 9 accepted artifacts (ACLS cardiac arrest, sepsis hour-1, SOFA overview, warfarin/aspirin, stroke FAST, pediatric fever, pregnancy ED caution, FHIR R4 citation, NEMSIS citation), each with a required SHA-256 content hash, license, provenance chain — validated by `scripts/validate-knowledge-registry.mjs`.

---

## 6. The 39 deterministic clinical calculators — not AI, not trained

`backend/src/modules/medical-control-plane/tool-orchestrator/services/` (39 `.service.ts` files, confirmed by direct file count) implements published clinical scoring formulas as plain TypeScript: HEART score, Wells (PE + DVT), NEWS2, qSOFA/SOFA, GCS, CHA₂DS₂-VASc, HAS-BLED, GRACE ACS, APACHE II, PECARN head, ABG interpreter, anion gap, corrected sodium/calcium, ROX index, and 25 others.

These are exposed through the same "AI Chief" / tool-orchestrator UX as the LLM-backed services in §4, which is why they're easy to mistake for ML — but there is no model, no training, no embedding involved. They are validated-formula calculators, intentionally kept deterministic (the model registry explicitly lists *"Computing validated medical scores instead of deterministic calculators"* as a **prohibited use** for the foundation LLM — i.e., the LLM is barred from doing this job precisely so it stays in this deterministic layer).

---

## 7. Offline AI safety-evaluation harness

`scripts/ai-eval-run.mjs` / `scripts/ai-eval-gate.mjs`, gated in CI via `npm run ai:eval:gate`. **Explicitly does not call any external LLM** — it scores synthetic fixture candidates against 9 rule-based scorers (refusal quality, calculator parity, protocol retrieval, tool selection, missing-info, PHI leak, structured-output validity, unsupported-claims/hallucination, subgroup safety).

**Latest run** (`qa/ai-eval/results/latest.json`, 2026-07-11T21:43:41Z):

| Metric | Value | Gate | Blocking | Passed |
|---|---|---|---|---|
| refusal_quality_rate | 1.0 | ≥0.95 | yes | ✅ |
| prompt_injection_block_rate | 1.0 | ≥0.99 | yes | ✅ |
| calculator_parity_pass_rate | 1.0 | ≥1.0 | yes | ✅ |
| retrieval_hit_rate | 1.0 | ≥0.70 | yes | ✅ |
| citation_presence_rate | 1.0 | ≥0.95 | yes | ✅ |
| tool_call_accuracy | 1.0 | ≥0.90 | yes | ✅ |
| phi_leak_rate_synthetic | 0.0 | ≤0.0 | yes | ✅ |
| structured_output_validity | 1.0 | ≥0.99 | yes | ✅ |
| human_review_flag_rate | 1.0 | ≥0.99 | yes | ✅ |
| hallucination_rate | 0.0 | ≤0.05 | yes | ✅ |
| unsupported_claim_rate | 0.0 | ≤0.05 | yes | ✅ |
| citation_entailment_rate | 1.0 | ≥0.90 | yes | ✅ |
| clinical_omission_rate | 0.0 | ≤0.15 | no | ✅ |
| subgroup_min_accuracy | 1.0 | ≥0.90 | yes | ✅ |

**41/41 cases passed, 14/14 gates passed, 0 blocking failures.** Important honesty check already written into the harness output itself: `"notes": "Fixture-based offline eval. Does not call external LLMs. Seeds in EvaluationService remain non-authoritative."` This is a real, passing safety-contract test suite — but it is not evidence of live foundation-model output quality, since §3 confirms no live LLM calls are currently configured to score against.

---

## 8. Model + knowledge governance registries

`data/model-registry/` — 5 approved entries, each carrying purpose, prohibited uses, owner, reviewers, regulatory class, expiry, and rollback plan (validated by `scripts/validate-model-registry.mjs`):

| ID | Kind | Provider | Status | Expires |
|---|---|---|---|---|
| `mdl-claude-sonnet-4-6-v1` | foundation_llm | anthropic | approved | 2027-07-11 |
| `mdl-unified-ai-node-v1` | local_classifier | local | approved | 2027-01-11 |
| `mdl-caredroid-heuristic-node-v1` | heuristic_rules | local | approved | 2027-07-11 |
| `mdl-local-deterministic-v1` | other (degraded-mode adapter) | local | approved | 2028-07-11 |
| `mdl-offline-eval-harness-v1` | eval_harness | local | approved | 2027-07-11 |

The heuristic-node entry (`careDroidAI-heuristic-node`) is worth calling out on its own: it documents **18 structured intents** (intake, triage assist, handoff, EMS pre-arrival risk, bottlenecks, etc.) implemented in `lib/ai/careDroidAI.ts` as **pure rule/heuristic handlers** — its own registry entry states plainly: *"No ML training. Logic in lib/ai/careDroidAI.ts handlers; prompts in careDroidAIPrompts.ts for documentation/persona only."* This is the clearest first-party admission that a chunk of what's labeled "AI" in the product is hand-written control flow.

---

## 9. Adjacent systems worth knowing about

- **Anomaly detection** (`backend/ml-services/anomaly-detection/anomaly-detector.ts`): the file's own header comment says it is a *"TypeScript replacement for anomaly_detector.py (sklearn IsolationForest → z-score)"* — i.e., a trained ML model (IsolationForest) was **replaced with a simple statistical z-score threshold**. It runs as a standalone script polling Prometheus and pushing to a Pushgateway; it is not invoked from the request path. `ANOMALY_DETECTION_ENABLED=true` in `backend/.env`, but the URL it targets (`http://anomaly-detection:5000`) only exists under the optional `docker-compose.ml.yml` profile.
- **OCR** (`backend/src/modules/emergency-os/ocr-providers.ts`): real, wired to `tesseract.js`'s `Worker` API, with per-field confidence blended from actual OCR confidence when an image is processed. Not "trained" by CareDroid (Tesseract ships its own pretrained model), but genuinely functional, not a stub.

---

## 10. Config drift found in the current environment (actionable)

These are concrete, file-and-line findings from comparing the real `.env` / `backend/.env` against `.env.example` and the code paths that read them — not documentation gaps:

1. ~~**RAG embeddings silently degraded**~~ — **CLOSED, re-verified 2026-08-12.** Originally found 2026-07-15: `backend/.env` had `RAG_MODEL=text-embedding-ada-002` (stale OpenAI-era value), routing retrieval to SHA-256 hash embeddings instead of real `Xenova/all-mpnet-base-v2` semantic embeddings, with no error or warning surfaced anywhere. Re-checked `backend/.env` directly on 2026-08-12: `RAG_MODEL=Xenova/all-mpnet-base-v2`, matching `.env.example` — real semantic embeddings are running, not the hash fallback. Fixed by an earlier session.
2. ~~**Trained NLU classifier not served locally**~~ — **CLOSED, re-verified 2026-08-12.** Originally found 2026-07-15: `backend/.env` had `NLU_SERVICE_ENABLED=false` against `.env.example`'s `true`. Re-checked directly on 2026-08-12: `backend/.env` now sets `NLU_SERVICE_ENABLED=true`, matching `.env.example` — the 100%-on-51-examples classifier in §2.1 is live locally. Fixed by an earlier session (the executive-summary table in §1 already reflected this; this section had drifted behind it).
3. **No foundation LLM key anywhere** — neither `.env` nor `backend/.env` has a non-empty `ANTHROPIC_API_KEY` (re-checked 2026-08-12, still empty); root `.env` doesn't even have the `AI_*` block that `.env.example` ships. Every "active"/"legacy" service in §4 is running in fail-closed/local-adapter mode as a result. **Not actionable without the user supplying a real API key** — an external-credential blocker, not a code fix.
4. **`OpenAIEmbeddingsService` is a misleading class name** — it never calls OpenAI's API in current code (`generateEmbedding()` branches only between Xenova and a local hash fallback); worth a rename so a future reader doesn't assume a live OpenAI dependency exists. Still open as of 2026-08-12.
5. ~~**Dead `OPENAI_*`/`COHERE_API_KEY` block in `backend/.env`**~~ — **CLOSED, 2026-08-12.** `backend/.env` had `OPENAI_API_KEY=sk-your-openai-api-key` (a placeholder, never a real key) plus 6 sibling `OPENAI_*` vars and `COHERE_API_KEY=`; confirmed via repo-wide grep that nothing in `backend/src` reads any of them — leftover from an older provider-naming scheme. Separately confirmed `AI_PROVIDER`/`AI_MODEL` (the names the code actually reads, via `environment.config.ts`'s `readOptional(env, 'AI_PROVIDER') || 'anthropic'`) were simply absent from `.env` — **not a bug**, since the code default (`anthropic`/`claude-sonnet-4-6`) already matches `.env.example`'s stated default, so this was silently correct, not broken. Removed the dead block and made the real config explicit (`AI_PROVIDER=anthropic`, `AI_MODEL=claude-sonnet-4-6`, `GROQ_API_KEY=` for App Navigator's optional LLM enhancement, `GROQ_MODEL=llama-3.3-70b-versatile`) so the file no longer implies OpenAI is the active/configured provider. `backend/.env` is gitignored (no commit possible/needed for this fix — pure local-environment hygiene).

Findings #1 and #2 above are the kind of thing that's invisible until someone reads the branch logic, which is exactly what the original audit required — and worth periodically re-verifying against the live `.env` rather than assuming a documented finding stays true forever, since both had already been silently fixed by the time of this re-check.

---

## 11. Composite training score

| Question | Answer |
|---|---|
| How many models were actually gradient-trained by CareDroid? | **2** — NLU intent classifier, artifact-type router (shared Xenova embedding backbone, separate MLP heads) |
| Best measured accuracy | NLU: **1.00** (n=51, small-set caveat flagged by the registry itself) |
| Most credible measured accuracy | Artifact router: **0.947** (n=282) |
| Offline safety/contract harness pass rate | **41/41 cases, 14/14 gates** (100%) — fixture-based, not live-LLM validated |
| Foundation-LLM-backed services live right now | **0 of 17** declared services (no API key configured, `AI_ENABLED` unset/false) |
| Deterministic/heuristic logic mislabeled as "AI" in the UI | 39 clinical calculators + 18 heuristic intents + 2 "local-deterministic" services — all explicitly documented as non-ML in their own registry entries |
| "Future" services with a model name but no model | 6 (`deteriorationPrediction`, `dischargePrediction`, `admissionPrediction`, `mohPatientMatching`, `federatedEmsTriage`, `edgeAmbulance`) |

**Bottom line:** the genuinely-trained ML surface of this codebase is small, real, and honestly self-documented (the model registry itself flags its own small-test-set risk) — two classifiers with credible-to-excellent measured scores. The much larger "AI" surface area in the product (17 services, 39 calculators, 18 heuristic intents) is either a well-governed pass-through to a third-party foundation model that isn't currently keyed/enabled in this environment, or deliberately deterministic logic that the model registry itself says must never be replaced by a model. That governance discipline (explicit prohibited-uses lists, expiry dates, kill switches, an offline safety gate) is the most mature part of this AI surface — more mature, currently, than the live-model coverage it's governing.

---

## 12. Is the trained model "standalone" — independent of Claude and of transformer AI?

Answered precisely, on the two trained classifiers from §2 (NLU intent classifier + artifact-type router), since those are the only models CareDroid itself trained.

**Independent of Claude/Anthropic: yes, completely.** Verified with a full-text search of `backend/ml-services/` for any mention of `anthropic` or `claude` (case-insensitive) — **zero matches**. There is no import, no call, no shared code path between `backend/ml-services/` (the trained classifiers) and `lib/ai/providers/anthropicAdapter.ts` (the Claude integration). These are two architecturally separate subsystems; the classifiers would work identically if the Claude integration were deleted entirely.

**Independent of transformer AI: no.** The inference path is, by the code's own comment (`backend/ml-services/nlu/training/embeddings.ts:1-4`):

> *"Produces sentence embeddings via `@xenova/transformers` ... the Node-native analog of tokenizing + running a text through BERT ... minus the fine-tuning of BERT's own weights."*

Concretely, there are two layers, and only one of them is "ours":

1. **Feature extraction (not ours — a real transformer):** `Xenova/all-mpnet-base-v2`, a distilled MPNet/BERT-family sentence-transformer, executed locally through `@xenova/transformers` (Transformers.js) → ONNX Runtime. Both the NLU classifier and the artifact router call the *same* `embedText()` function (`backend/ml-services/unified-ai-node/artifact-router.service.ts:3` imports it straight from `../nlu/training/embeddings`) — so both trained heads sit on top of the identical transformer backbone, not two different ones.
2. **Classification head (ours — not a transformer):** a plain 2-layer MLP (`backend/ml-services/nlu/training/mlpClassifier.ts`) — hand-written forward pass, softmax, cross-entropy loss, and manual backprop with L2 regularization and a seeded PRNG for reproducibility. No ML framework (no TensorFlow/PyTorch/ONNX-training), no attention mechanism, no transformer architecture at all in this layer. This is the part that was actually gradient-trained on CareDroid's own labeled data (`backend/ml-services/nlu/data/*.jsonl`) and is genuinely "ours."

**Runtime network dependency: none, either way.** The transformer's weights are not fetched from the internet at request time — they're vendored on disk after first download, at `backend/node_modules/@xenova/transformers/.cache/Xenova/all-mpnet-base-v2/onnx/model_quantized.onnx` (confirmed present). So even though the embedding step depends on a transformer, it runs fully offline/in-process — no API key, no network call, no dependency on any cloud provider (Anthropic or otherwise) for either trained model to produce a prediction.

**A true zero-transformer, zero-Claude fallback does exist, but it's a degraded path, not the trained model:** `nlu.service.ts`'s `ruleBasedPredict()` — pure keyword-overlap scoring, no embedding, no classifier — is what runs only if `classifier.json` is missing or the embedding call throws. It is intentionally cruder (confidence capped at 0.95, and only 0.45 with no keyword hits) and is not what the 1.00/0.947 accuracy scores in §2 were measured on.

**Answer to "is our AI model a standalone model":**

- Standalone from **Claude**: **yes**, unconditionally — verified by full-text search, not inference.
- Standalone from **any transformer AI**: **no** — the trained classifier heads are genuinely custom (hand-rolled MLP, gradient-trained on CareDroid's own data), but they run on top of a pretrained transformer (Xenova MPNet) for feature extraction, not on raw text. The only way to get a prediction with *zero* transformer involvement is the cruder keyword-fallback path, which is not the measured/trained model.
