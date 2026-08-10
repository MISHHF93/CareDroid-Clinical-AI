# CareDroid Master A–Z Healing Backlog

**The coverage map of the healing campaign.** Every demand from every user directive (the ONE-of-everything convergence brief, the WORKFLOWS brief and its additions — missing pages as first-class builds, the visual UI integrity pass, demo-config removal / production-mode migration — plus standing feedback directives) decomposed into one statused line item each. **Companion to the canonical evidence ledger** [`CARE_DROID_HEALING_TODOS.md`](./CARE_DROID_HEALING_TODOS.md): the ledger holds deep per-fix evidence; this file holds one row per directive demand and cites ledger IDs instead of duplicating evidence. Scorecards hold scoring. Three documents, three roles, no duplication.

**Maintenance protocol** (binding for every future round):
1. Every healing round updates the touched rows' statuses **in the same commit** as its ledger entry.
2. Every new user directive gets decomposed into new rows here — never into a new document.
3. Republish the backlog dashboard artifact whenever this file changes; update the memory index line.
4. Statuses use the established vocabularies only — ledger statuses (`VALIDATED`, `CONFIRMED`, `IN_PROGRESS`, `BLOCKED`, `WONT_FIX_WITH_REASON`, `SUPERSEDED`) and workflow statuses (`FULLY_WIRED`, `PARTIALLY_WIRED`, `FRONTEND_ONLY`, `BACKEND_ONLY`, `FIXTURE_ONLY`, `DUPLICATE`, `LEGACY`, `MISSING`, `NEEDS_VERIFICATION`, `BLOCKED_EXTERNAL`, `MANUAL_REVIEW`, `FUTURE_MODULE`). Priorities P0–P3 per the ledger's severity legend.
5. A row marked done must cite its evidence (HEAL id, commit, or ledger section) — no unevidenced check-offs, per the campaign's own scoring discipline.

**Last updated**: 2026-08-10 · HEAD `1ace6646` · Campaign state: 68 HEAL fixes (66 validated, 2 confirmed-not-fixed pending human decision/dedicated round), score 731/1000.

---

## ⚠ Standing P0 flags (blocked on humans, re-surfaced every round until decided)

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-P0-1 | **Pediatric dose disagreement** — two live calculators give different Rocuronium/Dextrose doses for the same weight; needs clinical/pharmacy sign-off on the correct table before any code change | `BLOCKED` (clinical review) | HEAL-031 |
| MB-P0-2 | **Role-vocabulary mismatch** — `roleProfileId` written hyphenated, read underscored; 9 of 12 emergency-role IDs fall through to minimal default; needs a human decision on the canonical role vocabulary (4 candidates) — wrong guess risks privilege escalation | `BLOCKED` (product/security decision) | HEAL-011 |
| MB-P0-3 | **Admin-console route-access drift** — `charge_nurse` (and every role sharing `OPERATIONS_VIEW_ROUTES`) can reach the `/admin` frontend page/nav, bypassing that route's own curated 5-role `allowedRoles` list, via a second independent route-access source; 2 candidate code fixes tried and reverted after breaking real tested access — needs a decision on whether this frontend reach is intentional. Blast radius now BOUNDED (HEAL-059 closed the real data-exposure risk: both read and write on the actual tenant-admin data are backend-enforced to real admin/owner membership regardless of frontend reachability) | `MANUAL_REVIEW` (product/security decision on frontend nav intent only) | HEAL-058, HEAL-059 |

---

## A. Architecture convergence (ONE-of-everything)

| ID | Item | Status | Ref / evidence |
|----|------|--------|----------------|
| MB-A1 | ONE repository / frontend / backend — no hidden competing runtimes | `VALIDATED` (re-verified 4+ times; re-check on drift) | Ledger "one repository" entries; memory |
| MB-A2 | ONE AppShell — no duplicate shells | `VALIDATED` (2 thin re-export wrappers confirmed harmless) | EPIC-A "duplicate AppShells" |
| MB-A3 | ONE route/navigation architecture — consolidate `ROUTE_RECORDS` vs `CANONICAL_ROUTE_MAP` | `IN_PROGRESS` — status-drift class regression-guarded + 23 entries corrected (HEAL-057); `/tenant-admin` registration traced and confirmed a non-gap (HEAL-058); traced `CANONICAL_ROUTE_MAP` is legitimately scoped to core/emergency routes (NOT exhaustive — 8 `*ConsoleRouteTree.tsx` sub-trees are the real mount points for platform/admin/ops/profile routes, verified 25 of 27 "orphan" candidates were false alarms once checked against the real sub-trees); found + fixed the 1 genuine gap (`/organization` unmounted despite 2 real nav surfaces pointing at it — HEAL-065); remaining: full "one array" consolidation is now a lower-priority nice-to-have (the dangerous failure mode — a claimed-active route with no real mount — is what this round's audit swept for and found only 1 instance of, now fixed), plus 2 small follow-ups (stale `platformAnalytics` componentKey metadata; 2 confirmed-dead `OrganizationPages.tsx` exports) | HEAL-045, HEAL-057, HEAL-058, HEAL-065 |
| MB-A4 | ROUTE_RECORDS phantom-page cluster | `VALIDATED` — all 21 phantom-active entries (incl. 2 newly found) flipped to honest `future`; drift guard prevents recurrence | HEAL-057 |
| MB-A5 | ONE `/api/emergency/*` API surface — shallow TypeORM tier always-on, deep Mongoose tier gated | `PARTIALLY_WIRED` by design — needs the standing "unify or bless the gate" decision | EPIC-A Express/Mongoose category; ADR-0002 |
| MB-A6 | Governed quarantine structure (`archive/quarantine/`) for uncertain historical code | `MISSING` — never built; only needed when a MANUAL_REVIEW deletion is approved | Convergence brief |
| MB-A7 | `lib/ai` vs `src/lib/ai` duplicated AI client layer (deliberate credential isolation, real consolidation candidate) | `MANUAL_REVIEW` — flagged, not single-round-safe | EPIC-A "alternate API clients" |
| MB-A8 | Express remnants — only 3 deliberate direct-mount files remain, documented | `VALIDATED` (clean) | EPIC-A category update, `docs/api/api-reference.md` §1 |
| MB-A9 | Android/mobile remnants | `VALIDATED` — nothing ever existed | EPIC-A category check |
| MB-A10 | Old healthcare-super-platform dashboards (4+3 orphaned pages, substantial content) | `MANUAL_REVIEW` — product decision to restore or delete | HEAL-022, HEAL-025, HEAL-029 |
| MB-A11 | Dead-code sweep epic — 14 named categories, all checked at least once | `VALIDATED` as discovery; residual items tracked individually above | HEAL-EPIC-A |
| MB-A12 | ONE canonical configuration/feature-flag/capability registry (`backendApiCapabilities` labels truthful) | `VALIDATED` — every DEMO-labeled key individually traced | HEAL-002/008/033/048 |

## B. Patient journey & workflows

The FSM backbone (`src/engine/journeyEngine.ts` `VALID_TRANSITIONS`) + step model (`src/config/unifiedPatientWorkflowModel.ts`) + orchestrator (`unifiedPatientWorkflowOrchestrator.ts`) are the canonical engine — verified live. Statuses below are per-workflow.

| ID | Workflow | Status | Ref / evidence |
|----|----------|--------|----------------|
| MB-W1 | Walk-in arrival → Reception capture | `FULLY_WIRED` | `completeIntakeHandoff` trace (workflows round) |
| MB-W2 | Returning-patient search | `FULLY_WIRED` | `patientSearchActions.ts`; reception traces |
| MB-W3 | New-patient registration (quick intake / express register) | `FULLY_WIRED` | HEAL-047a; reception rebuild |
| MB-W4 | Unknown-patient registration (provisional identity) | `FULLY_WIRED` — `provisionalIdentityIntake.ts` | Reception traces |
| MB-W5 | Duplicate-patient review | `PARTIALLY_WIRED` — match/link real in Smart Intake; dedicated review surface depth unverified | SmartIntake `matchPatient`/`linkPatient` |
| MB-W6 | Smart Intake session (identity, fields, verification) | `FULLY_WIRED`; demo-seed bugs fixed | Domain 1 2026-08-07/08 fixes |
| MB-W7 | ID/document capture | `FULLY_WIRED` — `ReceptionDocumentCapture` → OCR jobs | HEAL-047a |
| MB-W8 | OCR ingestion → extraction → staff review | `FULLY_WIRED` (Tesseract.js real) | OCR audit 2026-07-14; `OcrIntakeApi` |
| MB-W9 | Demographic extraction & verification workflow | `FULLY_WIRED` — blank-unverified rows enforced | Domain 1 fix (no doc = no vacuous verify) |
| MB-W10 | Health-card/MRN handling | `FULLY_WIRED` (MRN real everywhere; monospace legibility fixed) | HEAL-051 |
| MB-W11 | Presenting-complaint entry + terminology recognition (raw wording preserved) | `FULLY_WIRED` — canonical `recognizeComplaint()` + merged red-flag detector | Domain 1 2026-08-08; area G |
| MB-W12 | Arrival-mode/source capture | `FULLY_WIRED` — `HANDOFF_ENCOUNTER_SOURCE` map | `receptionHandoff.ts` |
| MB-W13 | Encounter creation & linkage | `FULLY_WIRED` — timeline-event model, deliberate (no separate store needed) | EPIC-D Encounter finding |
| MB-W14 | Queue assignment (triage queue entry) | `FULLY_WIRED` — `enterTriageQueue` | `queueAssignment.ts` |
| MB-W15 | Urgent triage escalation from Reception | `FULLY_WIRED` — `submitReceptionEscalation` + broadcast | Reception escalation workflow + tests |
| MB-W16 | Registration→Triage handoff (incl. backend sync + recovery state) | `FULLY_WIRED` — `handoffSyncPending`/`handoffSyncError` | HEAL ledger workflows-round notes |
| MB-W17 | Triage queue / complaint confirmation | `FULLY_WIRED` | `triageScreenModel`, QueueRoute |
| MB-W18 | Vital-sign capture | `FULLY_WIRED` — single converged pipeline (dead NEWS2 branch absorbed) | HEAL-052 |
| MB-W19 | Acuity workflow (priority, triage assist) | `FULLY_WIRED` — client + capability-gated backend assist | `triageAssist.ts` |
| MB-W20 | High-risk complaint review | `FULLY_WIRED` — canonical registry drives Reception too | Domain 1 2026-08-08 |
| MB-W21 | Fit-to-sit / monitored-chair / room-needed | `FULLY_WIRED` — full classification + 3 UI consumers | Round 28 confirmation |
| MB-W22 | Reassessment scheduling | `FULLY_WIRED` | Store + scheduler + timers |
| MB-W23 | Waiting-room reassessment **completion** (clears flag/reminders/alerts everywhere) | `FULLY_WIRED` — was the campaign's biggest missing link | **HEAL-052** |
| MB-W24 | Overdue reassessment escalation (in-app + out-of-band email) | `FULLY_WIRED`; email channel default-off (see MB-K4) | Round 30; HEAL-052 |
| MB-W25 | Deterioration watch lifecycle (flag add AND evidence-based clear, escalation-pinned) | `FULLY_WIRED` | **HEAL-054** |
| MB-W26 | LWBS risk watch | `FULLY_WIRED` | `lwbsRiskLayer` + tests |
| MB-W27 | Provider queue / clinician assignment | `FULLY_WIRED` — `assignStaff` + WhoNext | Store + `WhoNextPanel` |
| MB-W28 | Orders / Results workflow depth (states exist; dedicated ordering UI/backend depth) | `NEEDS_VERIFICATION` — states + diagnostics surfaces real (HEAL-033); order-entry depth never traced | Next verification target |
| MB-W29 | Complaint-driven workflow/calculator launchers from patient context | `FULLY_WIRED` — intent router + launchers | Interactive-intelligence backlog (17/17) |
| MB-W30 | Referral request / classification / review / close | `FULLY_WIRED` + persisted | Round 27 (`ReferralEntity`) |
| MB-W31 | Specialty queue | `PARTIALLY_WIRED` — referral targeting real; dedicated per-specialty queue view unverified | — |
| MB-W32 | Disposition decision | `FULLY_WIRED` — FSM + crisis-mode legal-only shortcuts | CapacityCrisisMode trace |
| MB-W33 | Admission request / bed request / boarding start-end | `FULLY_WIRED` — boarding = derived projection (by design) | EPIC-D |
| MB-W34 | Discharge-ready + discharge completion | `FULLY_WIRED` | `dischargePatient`, crisis panel |
| MB-W35 | EMS pre-arrival → ETA → arrival → handoff → offload timer → conversion | `FULLY_WIRED` + durable statuses | Round 28 (`EmsArrivalStatus`) |
| MB-W36 | EMS receiving-area assignment (bay prep) | `FULLY_WIRED` — `prepareEMSBay` | Store tests |
| MB-W37 | EMS→encounter linkage into canonical journey | `FULLY_WIRED` — `convertEMSArrivalToPatient` → Registration-first | Store test (workflows round) |
| MB-W38 | Capacity monitoring / crisis mode | `FULLY_WIRED` | `capacityEngine` + tests |
| MB-W39 | Queue bottleneck monitoring | `FULLY_WIRED` — bottleneck registry | `bottleneckRegistry.ts` |
| MB-W40 | Operational-alert generation (one derived-alert path) | `FULLY_WIRED` — dead broadcast shims removed | Rounds 39–43 |
| MB-W41 | Notification Center delivery / acknowledgment / dismissal | `FULLY_WIRED`; reminder-alert dismissal on completion added | HEAL-052; `useNotificationCenter` |
| MB-W42 | Patient timeline (journey events, audit-visible) | `FULLY_WIRED` — FlagRemoved/completion events added | HEAL-052/054 |
| MB-W43 | Operational analytics / shift summary | `FULLY_WIRED` | `EmergencyAnalytics`, shift data tests |
| MB-W44 | Command-center metrics | `FULLY_WIRED` — real `baseContext()` sources | HEAL-033 |
| MB-W45 | ED Copilot requests through canonical AI pipeline | `FULLY_WIRED` — keyword responder retired | Converged 2026-08-08 |
| MB-W46 | AI tool invocation (39-service tool orchestrator) | `FULLY_WIRED` server-side; provenance labels partial (MB-D2) | EPIC-A calculators check |
| MB-W47 | Clinical terminology lookup | `FULLY_WIRED` | Area G |
| MB-W48 | Provincial/external health-data fetch | `FIXTURE_ONLY`/`FUTURE_MODULE` — honestly self-labeled demo | HEAL-027/048 |
| MB-W49 | IoT/integration ingestion (surveillance nexus) | `FIXTURE_ONLY` — honestly self-labeled (`demo: true`) | HEAL-048 |
| MB-W50 | Public Waiting Display (zero-PHI) | `FULLY_WIRED` — zero-PHI directly confirmed | Domain 6 |
| MB-W51 | Read-Only Whiteboard kiosk | `FULLY_WIRED` + server-enforced viewer role | Round 29 (`READ_ONLY_VIEWER`) |
| MB-W52 | Tenant/admin configuration | `FULLY_WIRED` + DTO-validated | Rounds 31–32; HEAL-047 onboarding |
| MB-W53 | Role/permission configuration UI↔server | `PARTIALLY_WIRED` — see MB-P0-2 vocabulary decision | HEAL-011 |
| MB-W54 | Screen-mode configuration (density/kiosk/wall) | `FULLY_WIRED` | `careDroidScreenModes`, density models |
| MB-W55 | Workflow automation engine (triggers/refresh) | `FULLY_WIRED` | `unifiedWorkflowAutomationEngine` + tests |
| MB-W56 | Workflow step-model `nextStepIds` vs FSM drift (triage→assessment) | `CONFIRMED` latent — zero consumers today; fix when first consumer appears | HEAL-052 follow-up (b) |
| MB-W57 | Route-chrome header actions (workflow entry buttons) survive navigation | `VALIDATED` | **HEAL-053** |
| MB-W58 | Full-journey E2E coverage in one test path | `PARTIALLY_WIRED` — pilotWalkthrough covers it but is env-flaky; split per-stage | HEAL-053 follow-up (a); MB-J1 |

## C. RBAC & the 8 profiles

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-C1 | Canonical role vocabulary decision (4 competing vocabularies) | `BLOCKED` — human decision | **HEAL-011 / MB-P0-2** |
| MB-C2 | Server-side permission enforcement (guards fail closed; body validation 97.8%) | `VALIDATED` | Cy238–241; rounds 31–32 |
| MB-C3 | Read-only viewer server-enforced (READ_PHI only) | `VALIDATED` | Round 29 |
| MB-C4 | Training/AI-Evaluation route gating (`allowedRoles` decision needed) | `CONFIRMED`, needs product decision | HEAL-039 follow-up |
| MB-C5 | 8-profile end-to-end propagation matrix (Reception→Triage→Whiteboard→Manager→Public per profile) | `MISSING` — epic not started | HEAL-EPIC-B |
| MB-C6 | Per-profile default screens / nav visibility / action availability | `PARTIALLY_WIRED` — models exist + tested per-role; full 8×workflow matrix is MB-C5 | Screen models + role tests |
| MB-C7 | PHI scopes per profile (public displays zero-PHI confirmed) | `PARTIALLY_WIRED` — public confirmed; systematic per-profile PHI audit not done | Domain 6/7 |
| MB-C8 | Hidden/disabled buttons are not authorization (server always checks) | `VALIDATED` for traced routes; re-verify per new workflow | Guard audits |
| MB-C9 | Admin-console route-access drift — two independent route-access sources disagree on charge_nurse (+ OPERATIONS_VIEW_ROUTES-sharing roles) reaching `/admin`; 2 fix attempts reverted after breaking real tested access; frontend nav-intent question still open | `MANUAL_REVIEW` — **see MB-P0-3**; data-exposure risk now bounded by HEAL-059 | HEAL-058, HEAL-059 |
| MB-C10 | Tenant-admin GET endpoint had no admin-scope check — staff roster + permission overrides + billing config exposed to any org member regardless of role | `VALIDATED` — matched to sibling PATCH's existing `admin: 'organization'` guard | HEAL-059 |
| MB-C11 | `GET :organizationId` / "list my orgs" leaked `permissionsOverrides`/`navigation`/`dashboardLayout` via an unfiltered settings spread — route audience is genuinely general-member (unlike MB-C10), fixed with a field allowlist not a route gate | `VALIDATED` | HEAL-060 |
| MB-C12 | `feature-flags` GET/PATCH asymmetry investigated | `VALIDATED` (no fix needed) — low-sensitivity data; PATCH already double-gated (decorator + service-level `assertAdmin`) | HEAL-060 |

## D. AI/ML wiring

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-D1 | ONE AI orchestration path (Copilot → `ChatService.processMessage` pipeline) | `VALIDATED` | Converged 2026-08-08 |
| MB-D2 | Provenance truth-labels on every AI surface (~17–19 of original 38 remain) | `IN_PROGRESS` — rotate search signals (imports / on-screen copy / vocabulary / bare-% without provenance). 2026-08-10 round: checked `PatientDetailPanel.tsx`'s Upgrade Harness signals (already discloses a `deterministic-*-provider` string per-signal — adequately honest, just not the standardized component), `AccountableRecommendationCard.tsx` (exemplary — model/prompt/corpus version, safety, human-review, already wired into CopilotPanel/InteractiveAIWorkspace), `AiRouteMetadata.tsx` (shows the REAL backend gateway's own self-reported routing confidence, not fabricated) — genuine negative result, no new violation found this round | Rounds 34–35 recipes, HEAL-061 |
| MB-D3 | Model/tool registry — 2 real trained models (NLU 1.00/n=51; artifact-router 0.947/n=282) documented | `VALIDATED` as inventory | `AI_CONFIGURATION_MAP.md` |
| MB-D4 | RAG pipeline live + correct embedding model (`RAG_MODEL` env fix landed 2026-07-15) | `NEEDS_VERIFICATION` — re-confirm env fix still deployed | RAG audit memory |
| MB-D5 | LLM transport timeout (D1 from RAG audit) | `NEEDS_VERIFICATION` — may be stale claim; trace before trusting | 2026-07-15 audit |
| MB-D6 | `anomaly-detector.ts` dangling ml-service (no compose service, no imports) | `MANUAL_REVIEW` — already flagged in compose comments | EPIC-A |
| MB-D7 | AI evaluation + training run persistence | `VALIDATED` | HEAL-020/021 |
| MB-D8 | Deterministic tools/rules honestly labeled (NEWS2 `news2-auto-score`, flow engine, Sentinel helpers) | `VALIDATED` pattern; extend with MB-D2 | HEAL-052; rounds 34–35 |
| MB-D9 | AI-unavailable fallback honesty (no fabricated success; explicit unavailable states) | `PARTIALLY_WIRED` — crisis-mode + copilot verified; systematic sweep open | CapacityCrisisMode trace |
| MB-D10 | MoE router vs RoutingOptimizer disclosed duplication | `MANUAL_REVIEW` — known debt, both live | HEAL-010b/022 |

## E. UX / UI / visual

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-E1 | Undefined CSS token families (4 families × 148 call sites) + v→a typo class | `VALIDATED` | HEAL-051 |
| MB-E2 | `.settings-page` `display: flex` vs `grid` conflict (Settings.css vs cdl-unified-application.css) | `CONFIRMED`, open | HEAL-051 deferred list |
| MB-E3 | `.reception-quick-complaints__chip` triple-definition with dueling `!important`s | `CONFIRMED`, open | HEAL-051 deferred list |
| MB-E4 | `.patient-card` dual shadow system (tokens vs literals) | `CONFIRMED`, open | HEAL-051 deferred list |
| MB-E5 | `ReceptionEscalationQuickActions.css` hardcoded `#ffffff` outlier | `CONFIRMED`, open | HEAL-051 deferred list |
| MB-E6 | 8 orphaned dead CSS files (+1 class-name mismatch) | `CONFIRMED`, open — safe deletions after re-verification | HEAL-051 deferred list |
| MB-E7 | `WaitingRoomSafetyBoard.css` zero responsive treatment | `CONFIRMED`, open | HEAL-051 deferred list |
| MB-E8 | Remaining low-priority undefined tokens (`--error`, `--font-22`, `--font-32`, `--shadow-3`, `--surface-3`, `--app-button-bg`) | `CONFIRMED`, open | HEAL-051 deferred list |
| MB-E9 | Visual UI integrity pass — Playwright screenshot sweep of ALL pages (cards/components aligned, no layout drift) | `IN_PROGRESS` — recipe proven (HEAL-051 verified 5 pages); full sweep open | Directive addition; memory recipe |
| MB-E10 | Framer-quality polish scanning (standing bar) | `IN_PROGRESS` — continuous | feedback-visual-design-bar |
| MB-E11 | Presentation contexts: tablet / wallboard / command display / kiosk verification | `PARTIALLY_WIRED` — screen modes real; per-context visual verification open (part of MB-E9) | Screen-mode models |
| MB-E12 | Contrast/a11y guards (critical-card typography exclusions, axe-core) | `PARTIALLY_WIRED` — CSS contract tests real; live axe-core run never done | Round 33; Domain 9 |
| MB-E13 | Duplicate/redundant CTA and page-element sweep (user-reported: "create new patient" appeared 3× on Reception in one viewport) | `IN_PROGRESS` — Reception fixed (HEAL-067: 2 of 3 "New walk-in" buttons were a true duplicate, same handler; 3rd is a sticky-header button with real distinct scroll-depth value, left alone). Continued the sweep to Whiteboard/Triage/EMS/Referrals/Reassessment: found + fixed a REAL duplicate-record bug on EMS (HEAL-068 — same workflow_card seeded twice due to a patientId-instability race in the dedup key, not just a visual issue); other 4 pages checked clean this round. Not yet swept: remaining ~30+ pages | HEAL-067, HEAL-068 |

## F. Backend & API correctness

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-F1 | Pediatric dosing dual-implementation disagreement | `BLOCKED` — clinical sign-off | **HEAL-031 / MB-P0-1** |
| MB-F2 | HEART/qSOFA/NIHSS dual implementations locked by equivalence tests | `VALIDATED` | HEAL-030 |
| MB-F3 | 3 patient-creation routes without DTO validation | `WONT_FIX_WITH_REASON` pending product decision (roadmap #18) | Cy191/241; G3 register |
| MB-F4 | 6-of-14 SmartIntake endpoints unwired (incl. backend audit-log fetch) | `BACKEND_ONLY`, documented — product question | Domain 1 corrected trace |
| MB-F5 | 12 Mongoose-tier endpoints with zero frontend callers (reassessment/boarding/EMS deep) | `BACKEND_ONLY` by gating design — tied to MB-A5 | Domain 1 corrected trace |
| MB-F6 | Body-validation regression guard (128-entry baseline test) | `VALIDATED`, permanent | `body-validation-coverage.spec.ts` |
| MB-F7 | Settings/thresholds persistence (was in-memory) | `VALIDATED` | HEAL-019 |
| MB-F8 | Referral/EMS-status/AI-eval persistence | `VALIDATED` | Rounds 27–28; HEAL-020/021 |

## G. Terminology & complaint recognition

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-G1 | ONE complaint-recognition architecture (canonical registry merged into Reception; additive by design) | `VALIDATED`; keep auditing NEW surfaces for private keyword lists | Domain 1 2026-08-08; round-26 lesson |
| MB-G2 | Raw-wording preservation + confidence + human verification in recognition pipeline | `VALIDATED` | `recognizeComplaint()` |
| MB-G3 | Terminology-gap review UI (backend `terminology_gap_events` table + review surface) | `MANUAL_REVIEW` — product scope decision | HEAL-009 |
| MB-G4 | Licensed terminology providers (CEDIS/SNOMED-CA scaffolding) | `FUTURE_MODULE` — honest forward scaffolding | EPIC-A check |

## H. Events & notifications

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-H1 | Event-publisher discovery (WebSocket/SSE/cron/queues/emitters — all categories traced, no orphans) | `VALIDATED` (discovery) | HEAL-EPIC-C |
| MB-H2 | Canonical event schema normalization (type/version/eventId/tenant/actor/correlationId…) | `MISSING` — design/schema task, not started | HEAL-EPIC-C |
| MB-H3 | Dead outbound event dispatches removed (7 + 4 DOM CustomEvents) | `VALIDATED` | Rounds 41–42 |
| MB-H4 | Reminder-alert dismissal on completion; deduped long-wait alert buckets | `VALIDATED` | HEAL-052; `reassessmentEngine` |
| MB-H5 | Escalation out-of-band channel default-on + on-duty targeting (paging/SMS) | `CONFIRMED`, open — currently email-only, opt-in | Domain 2 partial |

## I. Persistence & audit

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-I1 | Persistence-ownership audit, all 15 domains individually checked | `VALIDATED` (3 fixed / 6 already real / 5 correctly derived / 1 deferred=MB-G3) | HEAL-EPIC-D |
| MB-I2 | No silent localStorage/fixture truth in production paths | `PARTIALLY_WIRED` — terminology gap queue is the known localStorage exception (MB-G3); demo-data flows are explicit | EPIC-D |
| MB-I3 | Audit/provenance on meaningful transitions (actor/source/timestamp; FlagRemoved reasons) | `PARTIALLY_WIRED` — strong on patient board (auditLog + workflowLogs + timeline); tenant/site propagation not systematically audited | HEAL-052/054 events |
| MB-I4 | Dev-DB hygiene (stale `perf-*` fixture patients causing "407h waits") | `CONFIRMED`, open — cleanup script or reseed | Memory note 2026-08-09 |

## J. Quality / test / build infra

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-J1 | Split `pilotWalkthrough` into per-stage tests (durable env-flake fix; no in-process retries) | `VALIDATED` — 5 independent per-stage tests, each own fresh render; stages 3-5 build preconditions via the real `createPatientAndRouteFromReception` orchestrator instead of re-driving earlier UI; residual flake isolated to 1 heavy stage under full sequential load (traced to `vitest.config.ts`'s deliberate single-worker `pool:'threads'`, not a logic defect) — no longer takes down all 5 stages | HEAL-064 |
| MB-J2 | Full frontend vitest pass cadence (967/970 last run; re-run after multi-registry commits) | `IN_PROGRESS` — standing practice | Next steps #7 |
| MB-J3 | Capacity/waiting-count Header KPI: retire test vs restore KPI | `MANUAL_REVIEW` — product decision | HEAL-044 |
| MB-J4 | Hand-maintained mirror registries → generated from source (route inventory, nav baselines, page counts) | `CONFIRMED`, open — structural fragility, 4 stale artifacts from one commit | Infra note recommendation |
| MB-J5 | Docker compose smoke test | `BLOCKED` — no Docker in environment | HEAL-014 |
| MB-J6 | Body-validation + calculator-equivalence + chrome + propagation-chain regression guards | `VALIDATED`, permanent | Various |
| MB-J7 | Continuous performance healing — frontend + backend pipelines measurably faster without compromising clinical safety/data integrity; read-the-actual-code lens every round | `IN_PROGRESS` — HEAL-056 (console object retention), HEAL-062 (`updateAlerts` hot path), HEAL-063 (backend N+1 pass), HEAL-066 (real `vite build` + treemap analysis: measured the eager entry payload at ~2.5MB, traced the `data-navigation` chunk's real 1.06MB composition to `WorkspaceContext.tsx`'s synchronous `toolInventory.tsx` catalog-merge dependency — genuine finding, CONFIRMED not fixed, both viable repair paths carry real blast radius requiring a dedicated round). All 4 originally-seeded MB-J7 targets now have real evidence on record | HEAL-056, HEAL-062, HEAL-063, HEAL-066 |

## K. Production readiness (newest directive — mostly discovery-stage)

| ID | Item | Status | Ref |
|----|------|--------|-----|
| MB-K1 | Demo-configuration inventory & removal plan (demo-mode boundary, not blanket deletion) | `IN_PROGRESS` — first-pass inventory in HEAL-055 (personas/simulation flag-gated; fixtures envelope-labeled via `EdDataSourceBanner`; Smart Intake seeds already fixed); remaining: per-artifact demo-mode boundary doc | HEAL-055 |
| MB-K2 | Authentication migrated to production mode | `PARTIALLY_WIRED` — backend already postured (JWT-verified runtime-auth, double-gated demo mint, secret sentinel guard) + HEAL-055 boot guards; REMAINING: frontend has no token-acquisition path (auth UI removed, open-access hard-coded in `authSession.ts`) — a real login flow needs a product auth-UX decision | HEAL-055 |
| MB-K3 | Environment settings production posture (single doc + boot guards) | `PARTIALLY_WIRED` — 3 dangerous flags now fail-at-boot in production (tenant isolation, dev-auth bypass, simulated health — HEAL-055); single posture doc still open | HEAL-055 |
| MB-K4 | `INCIDENT_ESCALATION_EMAILS` + SMTP configured by default for production deployments | `CONFIRMED`, open | Domain 2 partial; MB-H5 |
| MB-K5 | End-to-end pipeline validation in production-equivalent environment | `BLOCKED_EXTERNAL` partially (Docker, real infra) + `MISSING` (runbook) | HEAL-014; latest brief |
| MB-K6 | Pentest / bespoke security review / legal & clinical sign-offs | `BLOCKED_EXTERNAL` | Domain 7/10 gates |
| MB-K7 | Live-runtime validation practice (curl against dev backend; Playwright visual passes) | `IN_PROGRESS` — proven, keep using | Infra notes 1–2 |

---

**Queue order** (safety-first ranking, re-confirmed 2026-08-10): MB-P0-1/MB-P0-2/MB-P0-3 (surface to humans every round) → MB-E13 duplicate-CTA sweep continuation (other pages) → MB-D2 provenance labeling → MB-E2..E8 CSS cluster → everything else by ledger priority. (MB-J1 closed by HEAL-064; MB-A3's dangerous-gap sweep substantially closed by HEAL-065; MB-J7 bundle analysis closed with a CONFIRMED finding by HEAL-066, real fix needs a dedicated round.)
