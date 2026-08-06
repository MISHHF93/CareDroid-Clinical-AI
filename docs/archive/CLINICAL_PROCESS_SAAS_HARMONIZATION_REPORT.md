# CareDroid Clinical Process & SaaS Harmonization Report

**As of:** 2026-07-15 (Cycle 51)
**Source of truth:** `SCORECARD.md` and project memory. This is a synthesis of already-verified findings from the clinical-workflow and SaaS-harmonization mega-brief, not a new investigation.

This report answers the brief's core questions — is there a canonical patient-journey workflow engine, how are clinical AI domains actually routed, what does real multi-tenant SaaS infrastructure look like today, and where are the process gaps — using evidence already gathered and verified across this program's cycles.

---

## 1. The canonical patient-journey workflow engine already exists

The brief asked for one to be built. It was already there: `src/engine/journeyEngine.ts` is a real, enforced finite-state machine — illegal stage transitions throw a typed error rather than merely getting logged or documented. `unifiedPatientWorkflowModel.ts` layers a 10-step canonical journey on top, with atomic audit-log and `workflowLogs` entries written on every transition. No rebuild was needed; this was confirmed via direct code reading, not assumed from a name match.

**What's still missing**: a unified event/pub-sub bus. The codebase's own comments state plainly that no formal domain event bus exists — realtime sync, analytics, and audit logging are wired via direct, centralized method calls out of the workflow engine, not decoupled subscribers reacting to journey-state events. This is a real architectural gap for a platform this brief's harmonization goals depend on (e.g., "any subsystem should be able to react to a patient-journey transition without the journey engine needing to know it exists").

## 2. AI orchestration: real capability vs. labeled capability

`aiChiefOrchestrator.ts` is the single, confirmed frontend AI entry point — zero competing LLM-calling paths were found anywhere in the app. It routes 9 named clinical domains: intake, triage, alerts, routing, summaries, bottlenecks, handoffs, operational awareness, and copilot chat.

**Of these 9, only `copilot_chat` calls a real large language model** (Claude, via `callAnthropicAI`). The other 8 route to `runCareDroidAI()`, a deterministic rule/heuristic engine that is explicitly self-labeled in its own code as `modelOrEngine: 'careDroidAI-heuristic-node'`, with a comment stating it is "not foundation-model inference." This is legitimate, safer, working infrastructure — clinical safety logic that doesn't depend on a model's non-determinism is a defensible design choice — but it means "AI-driven triage/alerts/routing/etc." should be described accurately as rule-based decision support with an LLM layer reserved for free-text chat, not as uniformly LLM-backed. Full model/prompt provenance (which engine, which prompt version) is now recorded on every audit event, so this distinction is auditable going forward, not just documented here.

Separately, a real RAG (retrieval-augmented generation) pipeline exists and is genuinely wired into the chat path — this is not scaffolding. It has one confirmed, unresolved gap directly relevant to a multi-tenant SaaS posture: **the vector-DB retrieval layer has zero tenant/organization dimension** in its filter type — a real tenant-isolation gap in retrieval, separate from (but analogous to) the `ai_queries` schema gap that has since been fixed.

## 3. Multi-tenant SaaS foundation: now schema-complete, previously wasn't

The clinical/SaaS harmonization brief depends on real multi-tenancy — organizations, workspaces, subscriptions, entitlements. As of this program's start, **the persistence layer for nearly all of this literally did not exist outside of dev-mode schema auto-sync**: `organizations`, `organization_memberships`, `workspaces`, `workspace_memberships`, `workspace_invitations`, `user_workspace_states`, `subscriptions`, `usage_events`, and the entire `platform_assets`/`asset_packs`/`role_profiles`/`organization_entitlements` entitlement suite had no migration anywhere. A real production (Postgres) deployment following this project's own documented migration workflow could never have stood these tables up.

This is now closed: 13 migrations were written covering all 46 previously-missing tables (of 65 total), verified with a full forward/revert/forward round trip against a real database engine, not just a type-check. The multi-tenant foundation this harmonization program depends on is now schema-real, not aspirational.

**Still open**: the RAG tenant-isolation gap above; and whether `UserProfile`'s PHI-encryption lifecycle hooks (currently empty stubs referencing an unconfirmed "service-level handler") actually encrypt PHI at rest for this newly-schema-complete table.

## 4. EMS & Sentinel command-center workflows

Dedicated real engines exist for triage (`triageEngine.ts`, `selfArrivalTriageEngine.ts`) and EMS (`emsOffloadCommandCenterService.ts`, `emergencyOperatingSystemService.ts`), confirmed via a 23-file/94-test spot-verification pass — this was a genuine upward correction to two previously-frozen, stale-low category scores that no longer reflected reality.

The Sentinel fleet/CAD-ingest command center (7 permissions, 17 HTTP routes) is real and now fully mirrored across all 3 frontend RBAC/route contract catalogs it had been silently missing from — closing a real "sidebar shows a link the role's own access-check would reject" latent bug. Of its 13 backing database tables, all are now schema-complete (9 were part of this program's missing-migration fix; the other 4 already had migrations).

**EMS handoff** (the frontend-to-hospital patient handoff flow) is frontend-only — all state lives in a Zustand store derived from whiteboard data, with zero backend API calls in the handoff-completion path. This is a legitimate root cause for a "handoff isn't working" report, but it's a scope gap (this subsystem never had a backend), not a regression — building a real EMS-handoff backend is new-capability work, not a bug fix.

## 5. Clinical tool breadth

39 of ~219 catalogued clinical calculators/tools have real backend execution logic (up from 3 at this program's start) — every tool that was ever scoped as portable/derivable from an existing formula or a standard clinical reference now has one, each independently verified against its source reference (e.g. Wells 1997/2003 DVT criteria, Winters 1965 respiratory-compensation formula, Berlin 2012 ARDS P/F-ratio criteria) rather than assumed correct from a plausible-looking implementation. The remaining ~180 tools route through an honestly-labeled generic chat passthrough — this was never in scope to close as part of the executor-porting work, and shouldn't be read as an unfinished 82%.

## 6. Real OCR for intake

Self-hosted, real OCR (Tesseract.js) is now wired into the clinical-document-intake path — proven against real image fixtures, not mocked. This directly supports any harmonized "digitize incoming paperwork into structured intake fields" process the brief envisions; the separate Mongoose-backed smart-intake/MPI-matching subsystem remains real but fully feature-flagged off (`ENABLE_MONGOOSE_EMERGENCY_OS`).

---

## 7. Net assessment against the harmonization brief

| Brief expectation | Actual state |
|---|---|
| Canonical patient-journey workflow engine | **Already existed**, confirmed real and enforced — no rebuild needed |
| Unified event/pub-sub model | **Confirmed real gap** — no formal domain event bus exists |
| Broad AI-model integration across clinical domains | **1 of 9 domains** hits a real LLM; the other 8 are deterministic heuristics — safe, but not what "AI orchestration" implies without qualification |
| Real, tenant-scoped SaaS persistence | **Was mostly missing (46 of 65 tables), now fully schema-complete** as of this program |
| EMS/triage workflow depth | **Real, substantiated infrastructure** — a prior stale/frozen low score has been corrected |
| Clinical tool breadth | **39/~219 real executors**, the full portable-tool set closed; ~180 remain an honest chat passthrough by design |
| Real self-hosted OCR for intake | **Shipped and verified this program**, replacing a prior mock-only implementation |
| Reception as reference workflow | **Rebuilt and verified** with 5 real UX/accessibility fixes |

This report will go stale as work continues — treat `SCORECARD.md` as the living, authoritative record and this file as a point-in-time synthesis of it.
