# Clinical hazard log (v1)

Built 2026-08-04 for release gate P0.3 ("Clinical release evidence" —
signed clinician review, platform hazard log/safety case, calculator
source/version register, approved intended-use boundary). This is the
hazard-log piece. It is **prep material for a CMIO/clinical-safety
reviewer, not a substitute for their sign-off** — the gate stays open
until a qualified reviewer signs it.

**Method:** every entry below was verified directly against current
source in this session (2026-08-04), not carried forward from prior
audit notes. Two hazards previously logged in earlier project memory
(a stale `RAG_MODEL` embedding fallback, and an unenforced
`BREAK_GLASS_ACCESS` permission) were re-checked before drafting this
log and found **already fixed** since they were first noted — they are
listed below under "Closed" for traceability, not as open hazards. This
log only asserts what was checked today; it does not claim completeness
across the whole platform.

**Format:** lightweight ISO-14971-style (hazard → cause → potential harm
→ severity → current mitigation → residual risk → status), scoped to
what a code-only audit can actually assess. Severity/probability are
engineering judgment, not a clinical risk classification — a clinician
reviewer should re-grade every row.

## Open hazards

### H-1: Fabricated-looking ML performance claims in the native-ai model registry

- **Location:** `lib/native-ai/modelRegistry.ts` (distinct from the
  governed `lib/ai/modelRegistry.ts` / `data/model-registry/` system
  described in `docs/ai/MODEL_REGISTRY_v1.md` — this native-ai registry
  bypasses that governance process entirely: no `purpose`,
  `prohibitedUses`, `trainingDataLineage`, `benchmarkResults`, or
  `reviewers` fields, no `npm run verify:model-registry` coverage).
- **Cause:** 7 of 8 registry entries declared a trained-model algorithm
  (`xgboost`, `random_forest`, `nlp_hybrid`, `router`) and specific
  F1/accuracy/AUC metrics. Direct reading of every one of those 7
  implementations confirmed each is keyword/regex/rule-based scoring
  with zero training (`predictAdmissionLikelihoodMl` →
  `calculateAdmissionHeuristicScore`; `predictProlongedEdStay`; the
  post-ED orientation classifier's threshold logic; the NLP triage rule
  engine; the panel-of-experts router's keyword scoring; both domain
  specialists' keyword/regex pattern matching). None of the 8 cited
  metric numbers, or any of the 7 model ids, appear anywhere else in
  this repository or in `docs/ai/` — no evaluation script, report, or
  test produces them.
- **Potential harm:** a clinician, engineer, or reviewer who trusts this
  registry's `algorithm`/`metrics` fields at face value would
  overestimate these tools' reliability (e.g. treating an "86% accurate
  XGBoost model" claim as validated, when the real system is an
  unvalidated heuristic with no measured accuracy at all). Downstream
  outputs (admission likelihood, triage suggestions, specialist routing,
  post-ED orientation, prolonged-stay risk) already carry
  `requiresHumanReview: true` and are now covered by the new
  `AiTruthLabel` system (P0.4), which independently confirms each of
  these 7 as "Manual" (not "Live" AI) regardless of what the registry's
  own fields claim — so the immediate UI-facing risk is mitigated, but
  the registry data itself is still wrong.
- **Severity (engineering estimate):** Moderate — no direct patient-facing
  action is gated solely on these numbers today (every consuming badge
  requires human review), but the false algorithm/metric claims could
  mislead a technical or clinical reviewer evaluating the platform's AI
  maturity, including for a hospital pilot decision.
- **Current mitigation:** `algorithm` field corrected to `'rules'` for
  all 7 confirmed entries (2026-08-04, verified by direct source
  reading, typecheck/lint/test clean). `AiTruthLabel` now labels every
  consumer of this registry "Manual," independent of the registry's own
  fields.
- **Residual risk / what's still open:** the `metrics` (f1/accuracy/auc)
  fields were deliberately **not** altered — deleting or replacing them
  requires a product/clinical decision (remove entirely vs. run a real
  offline evaluation and replace with real numbers), not a unilateral
  code fix. The 8th entry (`multi-channel-text`, `algorithm: 'nlp_hybrid'`)
  was not traced this pass and its claim is unverified either way.
- **Status:** OPEN — needs product/clinical decision on the metrics
  fields; needs someone to trace `multi-channel-text`.

### H-2: RASS (Richmond Agitation-Sedation Scale) has no citation in source

- **Location:** `src/utils/nextWaveCalculatorUtils.ts`.
- **Cause:** the RASS helper documents descriptive ranges (+4 combative
  to −5 unarousable) but the file carries no citation to the published
  scale (Sessler CN, et al. Am J Respir Crit Care Med. 2002;166(10):1338–1344).
- **Potential harm:** low — the helper doesn't score against uncited
  thresholds, it only documents the range, so there's no computation
  correctness risk. The gap is provenance/traceability, not accuracy.
- **Severity:** Low.
- **Current mitigation:** none yet — logged here and in
  `docs/CLINICAL_CALCULATOR_SOURCE_REGISTER.md`.
- **Status:** OPEN — trivial fix (add the citation comment), not done
  this pass because it's a content addition a reviewer may want to
  phrase themselves rather than have an agent write clinical citation
  text unprompted.

### H-3: NIHSS implemented twice with no cross-check

- **Location:** `src/utils/nihssCalculator.ts` (primary) and
  `src/utils/neurologyCalculators.ts` (a second "summary/handoff view").
- **Cause:** both cite the same source (Brott T, et al. Stroke. 1989)
  but are independent code paths. Nothing in this codebase tests that
  they agree on identical input.
- **Potential harm:** if the two implementations silently drift (a fix
  applied to one but not the other), a clinician could see two different
  NIHSS totals for the same patient depending on which surface they're
  viewing — a real, if currently hypothetical, safety-relevant
  discrepancy risk.
- **Severity:** Low today (no drift detected — not compared), but the
  *absence of a guard* is the hazard, not a confirmed current bug.
- **Current mitigation:** none.
- **Status:** OPEN — needs either a shared implementation or a
  regression test asserting both paths agree on a shared fixture set.

## Closed (verified fixed before this log was drafted)

### C-1: Stale `RAG_MODEL` causing silent hash-embedding fallback

Previously logged (project memory, 2026-07-15 audit) as
`backend/.env`'s `RAG_MODEL` pointing at `text-embedding-ada-002`,
routing RAG retrieval through a SHA-256 hash-embedding fallback instead
of real semantic embeddings, with no error surfaced. **Re-checked
2026-08-04: `backend/.env` now sets `RAG_MODEL=Xenova/all-mpnet-base-v2`
— the stale value is gone.** Closed; not carried forward as an open
hazard. (Root cause of the fix and when it landed were not re-traced
this pass — only the current `.env` state was verified.)

### C-2: `BREAK_GLASS_ACCESS` permission definable but unenforced

Previously logged (project memory) as `Permission.BREAK_GLASS_ACCESS`
being defined but never checked by any guard, while architecture docs
misattributed a working break-glass mechanism to a 2FA recovery service.
**Re-checked 2026-08-04:
`backend/src/modules/auth/config/role-permissions.break-glass.spec.ts`
now enforces that `BREAK_GLASS_ACCESS` is reserved and cannot be granted
to any role** — the gap was closed by making the permission permanently
unassignable (fail-safe by construction) rather than by building a
break-glass workflow. Closed; not carried forward as an open hazard.
(Whether the architecture-doc misattribution itself was corrected was
not re-checked this pass.)

## What this log does not cover

This pass checked the 3 open + 2 closed items above because they were
either freshly discovered (H-1) or already flagged in prior project
history and worth re-verifying before citing (H-2, H-3, C-1, C-2). It is
**not** a systematic hazard analysis of the whole platform — that is
exactly the work a CMIO/clinical-safety reviewer needs to scope and
lead, using this document, `docs/CLINICAL_CALCULATOR_SOURCE_REGISTER.md`,
`AI_CONFIGURATION_MAP.md`, and the CareDroid Project Scorecard's P0 gate
list as inputs, not as a finished product.
