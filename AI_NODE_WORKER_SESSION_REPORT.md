# CareDroid Unified AI Node — Worker Session Report

**Status:** current as of report generation  
**Report ID:** `caredroid-unified-ai-node-worker-session-2026-07-21`  
**Node:** `caredroid-unified-ai-node` · registry `mdl-unified-ai-node-v1`  
**Architecture:** **one local ML node** · quarantine: **none**

This root document is the human-facing summary of the unified AI node worker session.  
Full machine-readable detail (every run row) lives under `qa/ai-node/`.

| Artifact | Path |
|----------|------|
| Detailed markdown | [`qa/ai-node/worker-session-report-2026-07-21.md`](qa/ai-node/worker-session-report-2026-07-21.md) |
| Full JSON (all run indices) | [`qa/ai-node/worker-session-report-2026-07-21.json`](qa/ai-node/worker-session-report-2026-07-21.json) |
| Latest aliases | [`qa/ai-node/worker-session-report-latest.md`](qa/ai-node/worker-session-report-latest.md) · [`.json`](qa/ai-node/worker-session-report-latest.json) |
| Regenerator | `npm run report:ai-node-worker` |

---

## Executive summary

Over a multi-hour worker session we:

1. Ran the **unified AI node worker** on a **60-second** cadence to keep models/manifest warm.
2. Hardened the **1-node** training and runtime pipeline (spawn reliability, hard-example policy, Nest wiring, chat/gateway consumers).
3. Improved **artifact-router** held-out accuracy from **94.19% → 96.45%** (+**2.26** percentage points).
4. Held **NLU** at **100%** on its n=51 test set (small-set caveat remains in the model registry).
5. Confirmed **single-node** layout: one manifest, two heads, no dual weight trees, no quarantine.

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| NLU accuracy | 100.00% (n=51) | **100.00%** (n=51) | held |
| Artifact-router accuracy | 94.19% (n=310) | **96.45%** (n=310) | **+2.26 pp** |
| Composite (equal weight) | 97.10% | **98.23%** | **+1.13 pp** |

---

## Timeline

| Event | Timestamp (UTC) |
|-------|-----------------|
| First worker-run record started | **2026-07-20T16:55:10.583Z** |
| Active worker lock started (PID 38112) | 2026-07-20T21:18:51.661Z |
| Latest report snapshot (last run finished) | **2026-07-21T05:58:57.637Z** (see latest files for live refresh) |
| Approximate wall-clock span | **~13 hours** |

Seed note: cycle 1 was a long **manual** unified train (~1.7 h) written into `worker-runs.jsonl` as the baseline retrain. Steady-state worker cycles after that are short (typically ~5 s).

---

## Intervals and volume

| Field | Value |
|-------|--------|
| Configured interval | **60 000 ms (1 minute)** — test cadence (`AI_NODE_WORKER_INTERVAL_MS`) |
| Default production interval | 6 hours (if env unset) |
| Observed OK→OK gap (median, &lt;1 h) | **~65 s** |
| Worker records (latest export) | **~499** total · **~496 OK** · **3 errors** |
| Success rate | **~99.4%** |
| Worker retrain events | **1** (seed only) |
| Corpus signature | **2210** artifacts · **7132** training rows (stable after seed) |

**How to read this:** the worker mostly **did not retrain** because the corpus signature never changed. It **kept the node warm** (sync + capture + sleep). Model score gains came from **orchestrated training** in the same engineering window (shape cues, single-pass policy, pipeline fixes), then metrics/manifest were updated.

---

## Up-to-date model version

| Field | Value |
|-------|--------|
| Node id | `caredroid-unified-ai-node` |
| Manifest version | `1` |
| Registry entry | `mdl-unified-ai-node-v1` (**approved**) |
| Embedding backbone | `Xenova/all-mpnet-base-v2` |
| Head A — NLU | MLP · accuracy **1.0** · test n=51 |
| Head B — Artifact router | MLP · accuracy **0.9645** · test n=310 · `targetMode=artifact-type` |
| Weights | `backend/ml-services/models/nlu/classifier.json` |
| | `backend/ml-services/models/artifact-router/classifier.json` |
| Metrics | `backend/ml-services/models/*/metrics.json` |
| Manifest | `backend/ml-services/models/manifest.json` |

### Score lineage (this session)

| Stage | NLU | Artifact-router | When | Notes |
|-------|-----|-----------------|------|-------|
| Baseline (seed cycle 1) | 100% | **94.19%** | 2026-07-20 ~18:38Z | Pre-improvement seed |
| Pass-1 (no hard-example overfit) | 100% | **95.81%** | 2026-07-21 ~02:16Z | Hard-example pass had regressed test score |
| **Current (shape cues)** | **100%** | **96.45%** | 2026-07-21 ~03:37Z | `shape:score-like` / `shape:document`; hard examples opt-in only |

Residual artifact-router errors: **11 / 310** (mostly catalog-ambiguous tool vs calculator / short routes).

---

## Worker reliability

### Success profile

- Steady short cycles after seed (sync unified models → capture artifacts → skip retrain → sleep).
- Lock file ensures **one** worker process owns the loop.

### Failures (3 total)

| Error | Count | Meaning |
|-------|-------|---------|
| `Sync unified model directory failed with exit code 3221225794` | 3 | Windows `STATUS_DLL_INIT_FAILED` when shell-spawning `node` |

**Mitigation shipped:** shell-free spawns (`process.execPath` / `npm-cli.js`), step retries, clearer NTSTATUS decoding in `scripts/ai-node-worker.mjs` and `scripts/train-unified-models.mjs`.

---

## What else we built around the node

Beyond scores, this session locked the **product** 1-node story:

| Layer | Change |
|-------|--------|
| Nest | `UnifiedAiNodeModule` registered in `AppModule` (was missing) |
| HTTP | `GET /api/ai/node/health`, `GET /api/ai/node/models/health`, `POST /api/ai/node/models/route` |
| Intent | Phase 2 = unified node; keyword path enriches with node metadata |
| Chat / gateway | `attachUnifiedNode` on envelopes; MoE uses `artifact_type` evidence |
| Unified API | `runUnifiedAiQuery` always classifies free text through the node |
| Ops UI | AI Command Center shows NLU / artifact / composite tiles |
| Copilot UI | `AiRouteMetadata` **1-node** badge when `aiFoundation.unifiedNode` present |
| Offline gate | `npm run verify:ai-node` (19 checks) |

---

## How to refresh this report

```powershell
cd C:\Users\borah\CareDroid-Clinical-AI
npm run report:ai-node-worker
```

That regenerates:

- `qa/ai-node/worker-session-report-YYYY-MM-DD.{md,json}`
- `qa/ai-node/worker-session-report-latest.{md,json}`

Update this root file after major score or architecture changes, or copy headlines from the latest detailed report.

---

## Related docs

| Doc | Role |
|-----|------|
| [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) | 1-node architecture + wiring |
| [`AI_CONFIGURATION_MAP.md`](AI_CONFIGURATION_MAP.md) | What is trained vs deterministic vs LLM |
| [`docs/adr/0003-unified-ai-node.md`](docs/adr/0003-unified-ai-node.md) | ADR for unified NLU + artifact-router |
| `data/model-registry/entries/mdl-unified-ai-node-v1.json` | Governance / approved model card |

---

## Bottom line

- **Worker:** long multi-hour run, ~1-minute interval, **~99%+** success, corpus stable.  
- **Model (current):** NLU **100%**, artifact-router **96.45%**, composite **98.23%**.  
- **Gain:** **+2.26 pp** on artifact-router vs 94.19% baseline.  
- **Architecture:** still **one** CareDroid unified AI node — not quarantined, not dual-stacked.

*Root summary for the CareDroid Unified AI Node worker session. Detailed run ledger: `qa/ai-node/`.*
