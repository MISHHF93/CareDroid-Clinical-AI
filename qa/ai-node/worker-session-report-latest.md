# CareDroid Unified AI Node — Worker Session Report

**Report ID:** `caredroid-unified-ai-node-worker-session-2026-07-21`  
**Generated:** 2026-07-21T05:59:07.712Z  
**Node:** `caredroid-unified-ai-node` · registry `mdl-unified-ai-node-v1` · **single node** · quarantine: **none**

---

## 1. Up-to-date model version

| Field | Value |
|-------|--------|
| Node name | `caredroid-unified-ai-node` |
| Manifest version | 1 |
| Manifest updatedAt | 2026-07-21T05:58:52.963Z |
| Embedding backbone | `Xenova/all-mpnet-base-v2` |
| Registry model id | `mdl-unified-ai-node-v1` (approved) |
| Heads | NLU (mlp) + artifact-router (mlp, targetMode=`artifact-type`) |
| Weights path | `backend/ml-services/models/{nlu,artifact-router}/classifier.json` |
| NLU accuracy | **100.00%** (n=51) |
| Artifact-router accuracy | **96.45%** (n=310) |
| Composite (equal weight) | **98.23%** |
| Artifact evaluatedAt | 2026-07-21T03:37:52.735Z |

### Improvement vs session baseline

| Metric | Baseline | Current | Gain |
|--------|----------|---------|------|
| Artifact-router test accuracy | 94.19% | **96.45%** | **+2.26 pp** (2.4% relative) |
| NLU test accuracy | 100.00% | 100.00% | 0 pp (held) |

### Score lineage (this session)

| Stage | NLU | Artifact-router | Test n | When | Notes |
|-------|-----|-----------------|--------|------|-------|
| Baseline (seeded worker cycle 1 / pre-improvement) | 100.00% | 94.19% | 310 | 2026-07-20T18:38:08.522Z | From first worker-runs.jsonl retrain row (manual train:unified-models seed) |
| Pass-1 single train (no hard-example overfit) | 100.00% | 95.81% | 310 | 2026-07-21T02:16:38.369Z | Recovered after hard-example second pass regressed test accuracy to ~94.19% |
| Shape-cue retrain (current production weights) | 100.00% | 96.45% | 310 | 2026-07-21T03:37:52.735Z | shape:score-like / shape:document cues; ARTIFACT_HARD_EXAMPLES default off |

> **Note:** Worker loop itself only **retrained once** (seed cycle 1). Score gains above came from **manual / orchestrated training** during the same engineering session (shape cues, hard-example policy, pipeline fixes), while the worker kept the corpus warm on a 60s cadence.

---

## 2. Timeline

| Event | Timestamp (UTC) |
|-------|-----------------|
| First run started | **2026-07-20T16:55:10.583Z** |
| Worker lock started | 2026-07-20T21:18:51.661Z |
| Last run started | 2026-07-21T05:58:52.924Z |
| Last run finished | **2026-07-21T05:58:57.637Z** |
| Wall-clock span | **13.06 hours** (47027054 ms) |

---

## 3. Intervals

| Field | Value |
|-------|--------|
| Configured interval | **1 minutes** (`60000` ms) |
| Estimated configured intervals in wall-clock | **783** |
| Worker records written | **499** |
| Successful records | **496** |
| Observed gap median (OK→OK, &lt;1h) | **65.3 s** (n=494) |
| Observed gap average (OK→OK, &lt;1h) | 66.2 s |

Gaps between consecutive OK finishes under 1 hour (excludes multi-hour pauses)

Cycle range: **1 → 496** · Attempt range: **1 → 484**

---

## 4. Worker run summary

| Metric | Value |
|--------|--------|
| Total records | **499** |
| OK | **496** |
| Error | **3** |
| Success rate | **99.40%** |
| Retrained runs | **1** |
| Corpus signature | artifacts=2210, trainingRows=7132 (stable after seed) |
| Cycle duration min / median / avg / max (s) | 0.005 / 4.77 / 17.39 / 6177.939 |

### Errors

| Error | Count |
|-------|-------|
| `Sync unified model directory failed with exit code 3221225794` | 3 |

The three failures are Windows `STATUS_DLL_INIT_FAILED` (exit `3221225794`) during `sync-unified-models` child spawn — later fixed via shell-free process spawning + retries in the worker/train scripts.

---

## 5. Product wiring (1-node CareDroid AI)

- Nest: `UnifiedAiNodeModule (AppModule)`
- HTTP: `GET /api/ai/node/health`, `GET /api/ai/node/models/health`, `POST /api/ai/node/models/route`
- Consumers:
  - IntentClassifierService
  - ChatService + AIGatewayService.attachUnifiedNode
  - MoE ExpertSelector (artifact_type evidence)
  - AIService.runUnifiedAiQuery
  - AI Command Center (unifiedAiNodeApi)
  - CopilotPanel AiRouteMetadata 1-node badge

---

## 6. Source artifacts

| Artifact | Path |
|----------|------|
| Worker runs | `backend/ml-services/models/worker-runs.jsonl` |
| Worker state | `backend/ml-services/models/worker-state.json` |
| Lock | `backend/ml-services/models/.worker.lock` |
| Manifest | `backend/ml-services/models/manifest.json` |
| NLU metrics | `backend/ml-services/models/nlu/metrics.json` |
| Artifact metrics | `backend/ml-services/models/artifact-router/metrics.json` |
| This report (JSON) | `qa/ai-node/worker-session-report-2026-07-21.json` |
| This report (MD) | `qa/ai-node/worker-session-report-2026-07-21.md` |

---

## 7. Recent runs (last 15)

| # | Started | Finished | Status | Cycle | Attempt | Retrain | Duration (s) |
|---|---------|----------|--------|-------|---------|---------|--------------|
| 485 | 2026-07-21T05:43:40.991Z | 2026-07-21T05:43:45.608Z | ok | 482 | 470 | false | 4.62 |
| 486 | 2026-07-21T05:44:46.115Z | 2026-07-21T05:44:50.626Z | ok | 483 | 471 | false | 4.51 |
| 487 | 2026-07-21T05:45:51.148Z | 2026-07-21T05:45:55.713Z | ok | 484 | 472 | false | 4.57 |
| 488 | 2026-07-21T05:46:56.259Z | 2026-07-21T05:47:00.824Z | ok | 485 | 473 | false | 4.57 |
| 489 | 2026-07-21T05:48:01.390Z | 2026-07-21T05:48:05.918Z | ok | 486 | 474 | false | 4.53 |
| 490 | 2026-07-21T05:49:06.441Z | 2026-07-21T05:49:10.951Z | ok | 487 | 475 | false | 4.51 |
| 491 | 2026-07-21T05:50:11.488Z | 2026-07-21T05:50:16.003Z | ok | 488 | 476 | false | 4.51 |
| 492 | 2026-07-21T05:51:16.553Z | 2026-07-21T05:51:21.169Z | ok | 489 | 477 | false | 4.62 |
| 493 | 2026-07-21T05:52:21.712Z | 2026-07-21T05:52:26.276Z | ok | 490 | 478 | false | 4.56 |
| 494 | 2026-07-21T05:53:26.803Z | 2026-07-21T05:53:31.293Z | ok | 491 | 479 | false | 4.49 |
| 495 | 2026-07-21T05:54:31.809Z | 2026-07-21T05:54:36.409Z | ok | 492 | 480 | false | 4.6 |
| 496 | 2026-07-21T05:55:36.944Z | 2026-07-21T05:55:41.431Z | ok | 493 | 481 | false | 4.49 |
| 497 | 2026-07-21T05:56:41.960Z | 2026-07-21T05:56:46.528Z | ok | 494 | 482 | false | 4.57 |
| 498 | 2026-07-21T05:57:47.073Z | 2026-07-21T05:57:52.401Z | ok | 495 | 483 | false | 5.33 |
| 499 | 2026-07-21T05:58:52.924Z | 2026-07-21T05:58:57.637Z | ok | 496 | 484 | false | 4.71 |

---

## 8. Bottom line

1. **Worker** ran successfully for **13.06h** wall-clock with a **1 minutes** interval, writing **499** records (**99.40%** OK).
2. **Model (current):** NLU **100.00%**, artifact-router **96.45%**, composite **98.23%**.
3. **Gain vs baseline:** artifact-router **+2.26 percentage points** (94.19% → 96.45%).
4. **Architecture:** still **one** unified node, **not quarantined**, no dual weight trees.
5. Worker mostly **did not retrain** (corpus unchanged); it **kept the node warm** while training improvements were applied out-of-band and then reflected in metrics/manifest.

*Generated by `scripts/export-ai-node-worker-report.mjs`.*
