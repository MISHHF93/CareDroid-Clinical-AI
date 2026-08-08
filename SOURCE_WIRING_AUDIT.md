# Source Wiring Audit & Healing Pass

Generated: 2026-08-08 · HEAD at generation time: `99649d3d`/`977ca80c` (round 44) → this round: `<see Verification Log>`

## 0. Scope, methodology, and an honest note on scale

This repository is large: **1,434 frontend source files**, **927 frontend test files**, **95 `lib/` files**, **722 backend source files**, and **201 backend test files** (counts taken directly from the working tree at generation time, not estimated). A literal file-by-file re-derivation of a full dependency/capability map from zero, in one sitting, is not a credible claim for a codebase this size — anyone who tells you they did that either didn't, or did it shallowly.

What this document actually is: a synthesis, cross-validation, and extension of **three separate first-party audit systems that already exist in this repository**, refreshed today and checked against each other where they disagree, plus targeted fresh investigation aimed specifically at the kinds of gaps those systems don't check (backend service wiring, and the audit tooling's own correctness). This is the same evidence-driven discipline the [Emergency OS Master Scorecard](./CareDroid-Emergency-OS-Master-Scorecard.html) campaign has applied across 44 prior rounds — verify from source, correct rather than repeat a stale claim, and never inflate a finding to make a round look more productive than it was.

**The three existing systems, refreshed today:**

| System | Generator | Output | Refreshed |
|---|---|---|---|
| Duplicate System Audit | `npm run duplicate-system-audit:write-docs` | [`docs/duplicate-system-audit.md`](./docs/duplicate-system-audit.md) — 38 findings across 12 sections (routes, layouts, nav, inventories, calculators, dashboards, auth, workspace, assets, executors, config) | ✅ today, 2/2 tests passing |
| Orphan Detection Report | `npm run orphan-detection:write-docs` | [`docs/orphan-detection-report.md`](./docs/orphan-detection-report.md) — 432 findings (routes, pages, components, services, APIs, markdown) | ✅ today, 3/3 tests passing |
| Backend Exposure Report | `npm run exposure:write-docs` | [`docs/backend-exposure-report.md`](./docs/backend-exposure-report.md) — 649 backend routes vs. 358 frontend API calls | ✅ today, 2/2 tests passing |

**Plus the accumulated evidence of the Emergency OS Master Scorecard campaign** (44 rounds, same session lineage, same repository) — which has already done deep, source-verified wiring investigation across 12 clinical/product domains, closing dozens of real dead-code/unwired-endpoint/truthfulness bugs with regression tests. That work is not repeated here; it's cited where relevant.

**What this round added that the existing systems don't cover:** a backend-side "DI-registered service, zero real callers" sweep (the exact bug shape Round 44 found and fixed in `IncidentReportingService`), and — the most significant finding of this pass — **direct verification that the existing audit tooling's own claims are trustworthy**, which surfaced one that wasn't (§2.1).

## 1. Classification legend

| Class | Meaning |
|---|---|
| **WORKING** | Real implementation, real caller(s) on both sides of every boundary it crosses, verified by a passing test or direct source trace |
| **PARTIAL** | Real and reachable, but with a known, named, bounded gap (e.g., a subset of endpoints unwired, a claim narrower than advertised) |
| **UNWIRED** | Genuinely built, but has no real caller/consumer anywhere — the "should be connected" case this audit was asked to distinguish from dead code |
| **DUPLICATE** | Two or more implementations of the same capability; one is canonical, the rest need a merge/alias/quarantine decision |
| **DEAD** | No real caller, no evidence of unfinished-but-valuable intent, safe to remove (verified exhaustively, not assumed) |
| **BROKEN** | Present, wired, and *looks* like it works, but the implementation itself is wrong — including validation/test code whose check is vacuous |

This maps directly onto the existing systems' own `wire`/`merge`/`quarantine`/`legacy` action taxonomy: `wire` ≈ UNWIRED, `merge` ≈ DUPLICATE, `quarantine`/confirmed-dead ≈ DEAD, `legacy`/intentional-compat ≈ WORKING (by design), and items marked `done` in `duplicate-system-audit.md` are WORKING (re-verified, not just closed and forgotten).

## 2. Findings this round (new, not in any existing report)

### 2.1 BROKEN — `routeHealth.ts`'s orphan-page check was a hardcoded stub · **FIXED**

`src/routing/routeHealth.ts` is the authoritative, tested route-wiring checker (`routeHealth.test.ts`, referenced from `docs/duplicate-system-audit.md`'s own "Routes" section as proof that router-mount drift is closed). Reading its source to cross-validate a suspicious discrepancy against `orphan-detection-report.md`'s raw route-orphan counts found this:

```js
function orphanPageEntries(): Array<{ path: string; [key: string]: any }> {
  return [];
}
```

Every "No orphan pages" gate this module has ever reported — including the one cited as evidence in this repository's own prior audit work — **passed unconditionally, regardless of actual repository state.** It could never have failed, no matter how badly the repo drifted. This is exactly the "placeholder/mock behavior leaking into production" failure shape this audit was commissioned to find, except it had leaked into the **validation tooling itself**, which is a more consequential place for it to hide than in a UI component.

**Note on `/outcomes` and `/platform-analytics`, the routes that triggered this investigation:** these are *not* broken — `duplicate-system-audit.md` flags them as missing a `toolInventory` catalog entry (see §3.2), and I initially suspected they might be entirely unmounted. Direct trace showed they render through `PlatformSystemPage.tsx`, a real, generic, capability-driven page component (fetches live backend data per-capability, discloses demo/simulated/backend-unavailable state honestly via `StateSourceNotice`) that's shared across many `/governance`, `/integrations`, and platform-system routes. `routeHealth.ts`'s `componentKey: 'OutcomesDashboardPage'` label in `routes.config.ts` is documentation metadata, not a literal import reference — a legitimate pattern in this codebase, not a bug. This is worth recording because it's exactly the kind of "looks orphaned, isn't" false positive this whole audit has to guard against making in the other direction.

**Fix**: implemented a real detector (`findOrphanPageFiles`, exported and parameterized for testability) that walks every `.tsx`/`.jsx` file under `src/pages`, and for each, checks whether its own basename is referenced by any *other* source file anywhere under `src/` — the same whole-repo-reference technique used throughout this session and the scorecard campaign (most recently: Round 44's `IncidentReportingService` verification). Run against the real repository, it independently confirms **zero orphan pages currently exist** (146 page files checked) — the same answer the stub gave, but now for a real reason instead of by construction.

**Verification**: 3 new regression tests using a synthetic fixture directory (not the real repo, so the test proves the *logic* works, not just that today's repo happens to pass) — one confirms a genuinely unreferenced page is flagged, one confirms a referenced page is not, one confirms test/spec files under `pages/` are correctly excluded. All 8 tests in `routeHealth.test.ts` pass (5 original + 3 new); frontend typecheck and lint clean.

**Classification**: was BROKEN (silently vacuous), now WORKING (real, tested, currently reports true-zero).

### 2.2 UNWIRED — `ConsentService` (backend): fully implemented patient-AI-consent tracking, zero real callers since inception

Following up on Round 44's proven "DI-registered service, zero real callers beyond the generic health-check sweep" bug shape (`IncidentReportingService`), the same check was run against every service in `service-registry.ts`'s ~26-entry registry. `ai-governance.service.ts`'s public methods (`getRegistrySnapshot`, `validateAllPromptTemplates`) are genuinely called from `governance.module.ts` — WORKING, no action needed. `consent.service.ts` is not:

```ts
export class ConsentService {
  getConsentStatus(patientId: string, consentType = 'emergency-os-ai'): ConsentRecord { ... }
  updateConsent(patientId, consentType, granted, updatedBy?): ConsentRecord { ... }
  checkHealth() { ... }
}
```

- `checkHealth()` is real (invoked by the generic registry health sweep, same as `IncidentReportingService` before its Round 44 fix).
- `getConsentStatus()` and `updateConsent()` have **zero callers anywhere** — not a controller, not another service, not a frontend client, not even a test beyond the service's own unit spec. Confirmed by whole-repo grep, including `backend/dist`.
- A same-named `getConsentStatus(userId)` exists on a **completely different service**, `ComplianceService` (`compliance.controller.ts` → `compliance.service.ts`), with a different signature and different semantics (user-level compliance consent, not patient-level AI-processing consent). Grepping for `getConsentStatus` without checking *which* service owns the match would have produced a false "it's called" conclusion — worth flagging as a specific trap for anyone re-running this check later.
- The frontend has a `consentStatus` concept too (`UnifiedIntakePanel.tsx`, `ReceptionWorkspace.tsx`, `receptionIntakeOrchestrator.ts`) — but it's local Reception-intake draft state (`'captured'|'deferred'|'unable'|'unknown'`, administrative/treatment consent captured at registration), never persisted to any backend, and structurally unrelated to `ConsentService`'s `patientId`+`'emergency-os-ai'`-keyed record. Two systems that share a word, not two halves of one feature.

**Why this is UNWIRED, not DEAD:** the shape (a keyed per-patient consent record, gating a named `'emergency-os-ai'` policy, with an explicit `granted: boolean` default of `false`) reads exactly like infrastructure built ahead of a "gate AI actions on patient consent" feature that was never finished — a real, plausible, safety/compliance-relevant capability, not accidental leftover code.

**Why this round does not wire it up:** unlike `IncidentReportingService` (where the correct integration point — the global exception filter, already firing on every real error — was unambiguous and low-risk), there is no equally obvious safe integration point here. `updateConsent()` also has zero callers, meaning if anything started gating a real AI action on `getConsentStatus()` today, that check would **always evaluate to `granted: false`** for every patient, since nothing has ever granted consent — wiring this in blindly risks silently disabling a real feature for every user, not fixing a gap. Which AI actions should require consent, and how consent actually gets captured and granted in the first place, is a product decision this audit should surface, not guess at.

**Classification**: UNWIRED, P1. Flagged for a dedicated future cycle with product input, matching this campaign's established discipline of not forcing safety-relevant, ambiguous-intent fixes through under time pressure (see §3.1, §3.3 for two more examples of the same discipline applied this round).

## 3. Findings carried forward from existing audits (re-verified today, not re-derived)

### 3.1 DUPLICATE — `emergency-medicine` / `emergency-department-pack` asset packs (P1, deferred)

`docs/duplicate-system-audit.md`'s "Asset registries" section flags these as duplicate SKUs sharing the same asset contents. Re-verified directly: `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts:494` and `:586` both set `assetIds: EMERGENCY_MEDICINE_ASSET_IDS` — the literal same array reference, confirmed identical, not just similar.

**Why this round defers the merge**: both ids are referenced live across `entitlements.config.ts` (gates real feature access), `hospital-solution-builder.service.ts`, `product-catalog-seed.data.ts`, and `service-line-taxonomy.ts` — five-plus files deep into business logic that determines what a real organization can actually access. A rushed merge risks silently changing entitlement resolution for a real deployment. This needs the same "dedicated, carefully-tested cycle" treatment `duplicate-system-audit.md` already recommends for the workspace-model merge below, not a fold-in to an already-large round.

### 3.2 UNWIRED — `AnalyticsDashboard` (`/platform-analytics`) and the `/outcomes` capability have zero `toolInventory` catalog record (P1, deferred)

Confirmed still open, per `duplicate-system-audit.md`'s "Dashboards" section. Both are real, reachable pages (§2.1 confirms `/outcomes` specifically renders live content, not a stub) but are absent from the tool catalog entirely — meaning Tools Overview, sidebar tool search, and command-dashboard panels can't surface them. This is a materially different, larger task than the sibling fix already closed for `CostAnalyticsDashboard`/`AiCommandCenterDashboard`/`AiMemoryDashboard`/`TrainingDashboard` (which already had correct `toolInventory` records and only needed a panel-group wire-up): these two need a **new** record authored from scratch, including `packId`, segmentation, and permissions — product classification decisions, not a mechanical fix. The prior round's own text says this precisely: "left open rather than guessed at." This round agrees with and preserves that judgment rather than fabricating pack/permission values to close it out.

### 3.3 MERGE (deferred, unchanged from prior audit) — three workspace models

`WorkspaceContext.tsx`, `workspaceArchitecture.ts`'s `CARE_WORKSPACES`, and the backend workspace entities. `duplicate-system-audit.md` already found this "sharpened, not closed" — a real `applyBackendContext()` merge path exists and backend fields take priority, but whether *every* enforcement/entitlement decision in the app reads the merged state (vs. falling back to UX defaults before backend context loads) is unverified. Too central to the app's authorization model to verify inside this round; still correctly flagged as needing its own dedicated cycle.

### 3.4 Route-orphan and API-orphan counts in `orphan-detection-report.md` — mostly pre-triaged, not a fresh backlog

The raw executive-summary numbers (432 total findings, 125 "orphan/gap" routes, 127 API orphans/stubs) look alarming in isolation but are misleading read that way: **all 127 API-orphan findings are already classified `legacy`** by the tool's own logic (gated stubs that intentionally no-op, or legitimate backend-only routes — OAuth callbacks, webhooks, internal governance endpoints not yet exposed in UI) — zero are classified `wire` (actionable). The route-orphan heuristic (exact-string match against `router.tsx`) is cruder than `routeHealth.ts`'s alias/redirect-aware check and produces false positives for routes reachable through generated/redirect/capability-driven patterns (the same `/outcomes` case from §2.1 is a good example of why). Also note: the report's own text still says "App.jsx routes" and "no exact App.jsx route" throughout — cosmetic, stale labeling (the underlying generator does correctly read `router.tsx`, confirmed by source read; only the printed English lags the 2026-07 router.tsx rename). Low-priority cosmetic fix, not queued this round.

**Net effect**: this system's genuinely-actionable backlog is much smaller than its headline numbers suggest — consistent with `duplicate-system-audit.md`'s own finding that the large majority of its 38 tracked items are already `done`.

## 4. Backend exposure — the healthiest of the three systems

Per today's refresh (`docs/backend-exposure-report.md`): **649 backend HTTP routes**, **358 frontend API calls**, **336 wired** (route exists and is called), **22 gated stubs** (frontend call exists, capability flag off, intentional no-op — not a broken call), **0 unguarded missing routes**, **0 contract gaps**. This is WORKING at the aggregate level, with the sole caveat that "wired" here means "a route exists for this call" — it does not independently re-verify that every one of the 649 backend routes has a real handler doing real work end-to-end (that finer-grained verification is what the Emergency OS Master Scorecard's Domain 1 and Domain 8 rounds have been doing incrementally, one controller at a time, e.g. the `ReassessmentController`/`BoardingController`/`EmsController` correction).

## 5. Cross-reference: what the Scorecard campaign already closed in this exact problem space

Rather than re-deriving these, citing them directly (all independently verified with regression tests across 44 rounds — see `CareDroid-Emergency-OS-Master-Scorecard.html` for full evidence per item):

| Bug shape | Example instances closed | Round(s) |
|---|---|---|
| DI-registered backend service, zero real callers | `IncidentReportingService` (this round's direct predecessor) | 44 |
| Function has a real caller but the event it dispatches has no handler ("looks wired, isn't") | 8 `sync*OperationalSurfaces` functions, 6 WebSocket-dispatch call sites, 4 DOM `CustomEvent` dispatches | 39–42 |
| Unreachable exported function (zero callers anywhere) | Ctrl+Shift+D simulation-shortcut subsystem, 2 alarm-surface routing functions | 43 |
| Truthfulness/provenance label missing or overridden on AI-derived UI | `nativeAiCore.ts`, `clinicalAcuityModel.ts`, `modelRegistry.ts`, 5 more component-level instances | 34–38 |
| Demo/fixture data leaking into a real session | `SmartIntake.tsx`'s fabricated identity + audit log | (prior session) |
| Backend controller wired at a route prefix that real traffic never reaches (dual Mongoose/TypeORM fork) | `ReassessmentController`/`BoardingController`/`EmsController` — corrected from "13/13 real callers" to "1/13" | (prior session) |
| Config comment describing the code incorrectly | Rate-limit window comment vs. actual `ttl`/`limit` values | (prior session) |

These are the same six failure shapes (UNWIRED, BROKEN, DEAD, DUPLICATE, and the frontend/backend split this document's taxonomy names) recurring across a completely different slice of the codebase (clinical/emergency-domain logic vs. this document's platform/tooling-infrastructure focus) — strong convergent evidence that this is a real, repeatable pattern in how this codebase accumulates drift, not a one-off.

## 6. P0 / P1 summary

| # | Finding | Class | Status | Risk if left alone |
|---|---|---|---|---|
| 1 | `routeHealth.ts` orphan-page check was a no-op stub | BROKEN → WORKING | **Fixed this round** | False confidence in a validation gate; future orphan pages would go undetected forever |
| 2 | `ConsentService` fully unwired since inception | UNWIRED | Documented, P1 | Patient-AI-consent infrastructure sits inert; if a future feature naively wires it without checking `updateConsent()` has no callers, it could silently block real functionality for every patient |
| 3 | Duplicate `emergency-medicine`/`emergency-department-pack` asset packs | DUPLICATE | Documented, P1 (deferred, cross-cutting) | Entitlement/product-catalog drift risk if only one side is edited in the future |
| 4 | `AnalyticsDashboard`/`/outcomes` missing from tool catalog | UNWIRED | Documented, P1 (deferred, needs product input) | Two real features stay undiscoverable via the primary tool-search/catalog surface |
| 5 | Three workspace models, enforcement-path coverage unverified | DUPLICATE (partial) | Documented, P1 (deferred, needs dedicated cycle — pre-existing finding) | Central to authorization; not safe to rush |
| 6 | `orphan-detection-report.md`'s stale "App.jsx" labeling | cosmetic | Documented, not queued | None — purely cosmetic |

Only #1 was both safe and correctly scoped to fix within this round without guessing at product intent or touching cross-cutting business logic. #2–#5 are real, verified, and precisely described — each with an explicit reason it isn't being forced through, matching this campaign's standing anti-gaming discipline (see `[[feedback-cycles-need-code-changes]]`-style memory: real fixes only, no padding, no rushed merges of safety-relevant systems).

## 7. Verification log (this round)

- `src/routing/routeHealth.test.ts`: **8/8 passing** (5 pre-existing + 3 new fixture-based regression tests)
- `npx tsc --noEmit -p tsconfig.frontend.json`: **clean**
- `npx eslint src/routing/routeHealth.ts src/routing/routeHealth.test.ts`: **clean**
- Direct script run of `findOrphanPageFiles` against the real repository: **0 orphans across 146 real page files** (independently confirms, doesn't just repeat, the old stub's answer)
- Broader regression sweep (`src/routing`, `canonicalConfig.contract.test.ts`, `platformCapabilityMatrix.test.ts`, `duplicateSystemAudit.report.test.ts` — every real consumer of `routeHealth.ts`): **191/191 passing** across 20 test files
- `docs/duplicate-system-audit.md` regenerated: **2/2 tests passing**
- `docs/orphan-detection-report.md` regenerated: **3/3 tests passing**
- `docs/backend-exposure-report.md` regenerated: **2/2 tests passing**
- `npm run build` (frontend production build via Vite): **succeeded**, 27.03s
- `cd backend && npm run build` (`nest build`): **succeeded**
- Live dev stack (frontend :5190, backend :3350, both already running from the prior round's app-restart): re-confirmed healthy post-fix — `GET http://localhost:5190/` → 200, `GET http://localhost:3350/health/live` → `{"status":"ok"}`. (`routeHealth.ts` is Node-only audit tooling, never imported by any live page/component or the backend — confirmed by whole-repo grep — so it has no live runtime surface to exercise beyond the build check above.)

## 8. How to keep this current

Re-run the three generator scripts (`duplicate-system-audit:write-docs`, `orphan-detection:write-docs`, `exposure:write-docs`) before trusting their numbers — they were 1 day stale at the start of this round and drift quickly on an actively-changing repo. Do not trust a validation gate's "pass" without reading what it actually checks at least once (§2.1). When a grep-based "is this called" check returns a hit, confirm the hit is calling *the same* function/service you think it is, not a same-named one on a different class (§2.2).
