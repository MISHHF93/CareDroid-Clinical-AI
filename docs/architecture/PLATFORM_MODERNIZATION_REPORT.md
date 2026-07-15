# CareDroid Platform Modernization Report

**As of:** 2026-07-15 (Cycle 51)
**Source of truth:** `SCORECARD.md` (51-cycle evidence-grounded history) and project memory. This report is a synthesis of already-verified findings, not a new investigation — every claim below traces to a specific command, test run, or file already cited in the scorecard.
**Overall readiness:** 94/95 (holistic judgment, not an automated score — see SCORECARD.md's own caveat about this).

This report exists because the user commissioned a full platform modernization program across several mega-briefs (CCDS design system + full-stack harmonization, clinical workflow harmonization, competitive gap analysis, design-language/de-nesting audit, AI/RAG/database/CI readiness). No single session can close a program this size; this report gives an honest accounting of what is real and closed versus what remains, so a future session (or a human engineer) can pick up from true state rather than re-deriving it.

---

## 1. What shipped and is verified

### Design system (CareDroid Clinical Design System — CCDS)
- The user's exact specified palette (Canvas #F6F9FC, Primary Clinical Blue #075985, Operational Teal #0F766E, Information Blue #175CD3, Success Green #027A48, Attention Amber #B54708, Critical Red #B42318, AI Purple #5925DC, Neutral Gray #667085, Border #CBD5E1, Focus #FACC15) is adopted at the true root token layer (`src/styles/medical-color-layer.css`), not just a surface alias.
- Role-accent colors corrected to spec: Nursing=Teal, EMS=distinguishable green, Physician=Information Blue, Operations=Purple, Triage=a deliberately distinguishable deep amber (not the exact semantic-attention hex, to avoid a role color colliding with a real status color).
- A real, previously-undetected regression was found and fixed along the way: a prior commit (`752aff49`) had silently flattened the entire accent-color system (root token layer, then two more downstream aliases found in later cycles) from blue to grey — affecting every button, link, focus ring, and CTA in the product. Restored using `git diff`/`git show` against the pre-regression commit as ground truth, not guessed.
- A real WCAG 2.4.11 gap was fixed while implementing the Focus token: a solid yellow focus ring computed to ~1.5:1 contrast (verified via real luminance calculation) — implemented as a two-layer indicator (high-contrast blue ring + yellow glow) instead.
- The application shell (`ApplicationShell`/`ApplicationHeader`/`ApplicationSidebar`) is consolidated onto the real, feature-complete shell components rather than an inert, mock-heavy scaffold that had sat unwired since a prior session — verified via 2 full frontend suite runs at 837/837 files, 11,567/11,567 tests (100%), the cleanest full-suite result on record at the time.
- Reception (`/emergency/reception`) serves as the reference role implementation: 5 real UX/accessibility findings fixed (dead escalation UI wired live, an inaccessible hover-only overflow control replaced with a real focusable button, a reusable stage-timeline component, a unified AI-surface identity, a dead prop removed).

### AI systems
- `aiChiefOrchestrator.ts` is confirmed the single real frontend AI entry point — no competing LLM-calling paths exist. Of its 9 structured clinical domains, only `copilot_chat` calls a real LLM (Claude, via `callAnthropicAI`); the other 8 route to a deterministic, explicitly self-labeled heuristic engine (`careDroidAI-heuristic-node`) — this was a genuine downward correction to an earlier overstated claim, not a new regression.
- Full model/prompt provenance now flows through the audit trail: `AIAuditEvent.model` and a new `promptVersion` field are populated at every call site (previously declared in the schema but never written).
- A real RAG pipeline exists and is genuinely wired into chat (`ChatService` calls `ragService.retrieve()`) — chunking, embedding cache, hybrid vector+lexical retrieval, and citation/entailment checking are all real, not scaffolding. Two components are misleadingly named but functionally real: `OpenAIEmbeddingsService` uses local Xenova/deterministic-hash embeddings, not OpenAI; `CohereRankerService` uses local lexical reranking, not Cohere.
- Two duplicate `AiGatewayService` implementations were found and consolidated onto the one actually wired into `ChatService`, after confirming the other had zero real callers.
- **Confirmed false, not investigated further**: user-supplied claims about a Groq provider, three specific `codex/test-*` branch names, and "dictionary chunking" — none exist anywhere in this repo as of a dedicated verification pass.

### OCR
- Real, self-hosted OCR now exists via `tesseract.js` (WASM, zero external API calls), wired at the exact plug-in point (`createOcrProvider()`) the codebase had already designed for. Proven with real PNG fixtures, not mocked — genuine text extraction confirmed from fixture images with zero manually-supplied text.
- A real resource-leak bug (an un-terminated Tesseract worker hanging test runs) was found and fixed via a `terminate()` method wired into NestJS's `OnModuleDestroy` lifecycle.

### Database & schema integrity (the largest single fix in this program)
- **46 of 65 entity-declared tables had no migration anywhere** — including `users` itself, the entire multi-tenancy foundation (`organizations`/`workspaces` and their membership/invitation tables), `subscriptions`/`usage_events`, the platform-assets and product-catalog suites, `audit_logs`, `notifications`, 9 of 13 Sentinel EMS tables, and more. The app had only ever relied on `synchronize: true` for the large majority of its schema — a real Postgres deployment following the project's own `migrationsRun: true` config could never have stood up most of its own tables.
- Wrote 13 domain-grouped migrations closing every gap, verified with a full round trip: 27/27 migrations forward from a genuinely empty database, all 65 tables confirmed present via a scripted diff, 27/27 reverted all the way back to empty, 27/27 forward again — all 0 errors.
- Found and fixed a second, subtler bug along the way: a SQLite FK-revert-ordering hazard where an earlier migration's `down()` recreated a table referencing an already-reverted `users` table.
- **Still open**: RAG's vector-DB interface has zero tenant/organization dimension in its filter type — a real, substantiated tenant-isolation gap in retrieval (separate from the now-fixed `ai_queries` schema gap). `UserProfile`'s PHI-encryption lifecycle hooks are empty stubs with a comment describing a "service-level handler" that has not yet been confirmed to exist.

### Engineering governance
- Frontend + backend `tsc --noEmit`: 0 errors at full scope (including test files — a prior exclusion had hidden 1,341 real errors, now fixed).
- Frontend + backend `eslint`: 0 errors.
- A real governance rule now exists: `@typescript-eslint/ban-ts-comment` bans `@ts-ignore`/`@ts-nocheck` outright on both frontend and backend, plus `reportUnusedDisableDirectives: 'error'` prevents dead `eslint-disable` comments from accumulating. Verified against a genuinely clean baseline (0 pre-existing violations of any kind).
- The repo's own inline-style CI gate passes (was failing since the project's earliest recorded baseline).
- Full backend suite: 211/211 suites, 1,729/1,729 tests. Full frontend suite has repeatedly hit 100% (837/837 files, 11,567/11,567 tests) at multiple points in this program's history; the residual "failures" seen on some runs are a documented, non-deterministic Vitest teardown-timing artifact (`EnvironmentTeardownError`), confirmed to pass 100% of assertions every time reproduced in isolation — not a code defect.

---

## 2. What's real but explicitly measured as incomplete (not yet touched)

- **Circular dependencies**: first-ever real scan (`madge --circular`) found 72 in the frontend (the large majority centered on `store/emergencyStore.ts` and a handful of "unified"-prefixed engines/services) and 9 in the backend (2 of which are intentional NestJS `forwardRef()` patterns, not bugs — 7 are genuine and unexamined). Not remediated this pass — the frontend cluster in particular touches the single most central piece of app state and needs a dedicated architecture pass with its own test-coverage plan.
- **Dead-code / unused-export inventory**: `ts-prune` reports ~1,953 fully-unused exports in the frontend and ~702 in the backend. This is a measured upper bound, not a deletion list — the tool has known false-positive modes (barrel re-exports, type-only exports, public API surfaces, dynamic-import targets) that need per-file triage before anything is removed.
- **Clinical tool executor coverage**: 39 of ~219 catalogued clinical tools have real backend execution logic (up from 3 at the start of this program) — this is the full set of tools that were ever scoped as "portable/derivable" from existing formulas or standard references; the remaining ~180 are an honestly-labeled chat passthrough, not a gap this specific roadmap item was meant to close.
- **Unified event/pub-sub bus**: confirmed as a real, still-open gap. The codebase's own comments state no formal domain event bus exists; realtime/analytics/audit sync are wired via direct, centralized method calls, not decoupled subscribers.
- **Module reconsolidation into named domains**: `platform-systems.controller.ts` (the long-flagged "god controller") has had governance/audit/privacy/operations routes split into a dedicated `GovernanceController`, but still directly owns patients/staff/rooms/EMS/referrals/integrations — the next natural slice, not yet done.
- **Result<T,E>/ProblemDetails contract**: exists in the codebase (added by a prior uncommitted pass) but has zero real consumers yet — good raw material for a future adoption pass, not itself adopted platform-wide.

## 3. Explicitly not evaluated (needs infrastructure this sandbox lacks)

- Playwright/axe-core browser test suite and Lighthouse performance profiling — both written and waiting, but this sandbox cannot spawn a real browser process in CI-equivalent conditions. A local workaround (routing Playwright at the system's installed Edge binary) was used once for a targeted Reception-module visual check, not for the full automated suites.
- Ultrawide/multi-monitor responsive layout verification (2560×1080, 3440×1440, 3840×1600) — needs the same real-browser infrastructure.
- Runtime render-performance profiling, load/scalability testing.
- A repository governance suite (automated architecture-boundary/dependency-rule enforcement beyond the lint rules added this cycle) and structured observability (metrics/traces for workflow durations, AI latency, queue/wait times) — both real, sizable, unstarted roadmap items.

---

## 4. Prioritized next steps

See `SCORECARD.md`'s "Prioritized roadmap" table for the full, currently-open list with effort estimates. The top 3 by severity as of this report:

1. **Untangle the 72 frontend circular dependencies** centered on `store/emergencyStore.ts` (P1, high effort — needs a dedicated architecture pass).
2. **Audit and close RAG's tenant-scoping gap** in `IVectorDatabase`'s filter type (P2, medium-high effort).
3. **Verify `UserProfile`'s PHI-encryption hooks** are wired to a real encryption service, not silently storing PHI in plaintext (P2, low-medium effort to verify).

This report will go stale as work continues — treat `SCORECARD.md` as the living, authoritative record and this file as a point-in-time synthesis of it.
