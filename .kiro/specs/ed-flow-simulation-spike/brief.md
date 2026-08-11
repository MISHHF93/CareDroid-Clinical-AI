# Brief — ED Patient-Flow Simulation Feasibility Spike

| | |
|---|---|
| **Status** | Direction confirmed by repo owner 2026-08-10. Spike scope held as briefed (feasibility spike, kill criteria live). |
| **Author role** | Health data scientist (external evaluator, not the repo owner / main dev) |
| **Date** | 2026-08-10 |
| **Repo HEAD at analysis** | `cd2839d9` (branch `dev`) |
| **Audience** | (1) the cc-sdd pipeline that will generate `requirements.md` → `design.md` → `tasks.md`; (2) the repo owner, as the evidence pack for a go/no-go conversation |
| **Spec name** | `ed-flow-simulation-spike` |
| **Discovery path** | C — new single-scope feature |
| **Verified at** | HEAD `cd2839d9`, 2026-08-10 — all §12 seams confirmed present; `src/sim/` confirmed absent |

---

## 0. Spec brief summary

*Template-mandated discovery sections. Detail and citations follow in §1–§12; this section is the
entry point for `/kiro-spec-requirements` and `/kiro-spec-design`.*

### Problem

The repo owner cannot decide CareDroid's product direction on assertion. The codebase is a 613k-line
ED platform that is **not clinically deployable** (F1–F5) and cannot be made so without a Health
Canada SaMD pathway, clinical sign-off, EHR integration, and Canadian terminology licensing — none of
which exist, three of which are blocked on humans rather than code.

The proposed pivot to ED patient-flow simulation rests on **one untested assumption**: that the
existing ED board UI and engines can be driven by a simulation clock rather than wall time. If that
assumption is false, the pivot's entire economic basis — reuse the UI, don't rebuild it (§4.2) —
collapses. Today that would be discovered a quarter in. This spike exists to discover it in a week.

### Current State

There is no simulation engine (F6). `src/engine/*` are deterministic board-state calculators that
compute present state from present data; none advances a clock, samples a distribution, or projects
forward. `backend/src/modules/simulation/simulation-run.service.ts` has no clock, tick, or scheduler.
`competency.service.ts` and `debrief.service.ts` return hardcoded constants — they are stubs.
Nothing in the repo is reproducible: stochastic draws go through bare `Math.random()`.

The seams do exist, and this is what makes the spike cheap:

- `src/engine/simulation.ts` (770 lines) already drives the board on `setInterval` — an unseeded
  wall-clock demo animator. **The integration seam is built; its clock and sampler need replacing.**
- Most engine math is already clock-injectable (F7 green list); only the schedulers are not.
- A cohort injection point is already parameterized (F8).
- A simulation-mode gate already exists (C6).
- `src/sim/` does not exist — the spike lands on clean greenfield.

### Desired Outcome

A **go/no-go answer backed by a runnable artifact**, not a product increment. Q1 (virtual clock),
Q2 (reproducibility), Q3 (policy swapping) each answered with numbers — in ~1,100 additive LOC,
without modifying the store, any backend module, or any calculator. A no-go is a successful spike.

### Approach

A discrete-event simulation core in an isolated `src/sim/` tree that **writes through existing store
mutators rather than refactoring them**; clinical calculators wrapped as swappable decision policies;
Synthea FHIR R4 Bundles (Buffalo NY locale) as cohort source; a headless batch runner producing
interval estimates over >= 30 replications.

Rejected alternatives:

| Alternative | Why rejected |
|---|---|
| Fixed-time-step simulation | Cannot compress a 12-hour shift into seconds; Q1 fails by construction |
| Extend `backend/src/modules/simulation/` | Stubs (F6), wrong layer — a DES belongs where the state model lives |
| Build a purpose-built simulation UI | Falsifies the reuse thesis (§4.2) that is the pivot's whole economic basis |
| Refactor `emergencyStore.ts` for injectability | 6,406 lines; converts a one-week spike into a quarter of work before any evidence exists |

### Boundary Candidates

Responsibility seams inside the spike, each independently reviewable and each a candidate future spec
if the answer is go:

- **Sim kernel** — virtual clock, seeded PRNG, event queue, scheduler. Pure; zero domain knowledge.
- **Arrival + acuity model** — NHPP/thinning and complaint mix. This is the calibration surface.
- **Store adapter** — the *only* component coupled to `emergencyStore`; isolates C2/C3/C4/C7.
- **Decision-policy interface** — the differentiating capability (§4.3).
- **Cohort ingestion** — FHIR Bundle → internal `Patient`.
- **Batch runner + statistics** — replications, CIs, reporting.

### Out of Boundary

Distinct from §6.3 (which lists code not to touch); these are *responsibilities this spec does not own*
even where it might appear to:

- **Any clinical-outcome claim.** Operational outcomes only (§4.4). The H-1 precedent makes this fatal.
- Cohort **external validity** and Canadian recalibration — deferred and stated as deferred, not solved.
- Arrival-rate **calibration** against real data — spike parameters are hardcoded.
- CTAS / CEDIS / NACRS implementation and terminology licensing.
- Facilitator UI, scenario authoring, session replay, multi-learner sync, scoring/competency.
- Go-to-market sequencing (§4.5) — explicitly the repo owner's call, not this spec's.

### Upstream / Downstream

**Upstream** (this spike depends on, and must not modify):
`src/store/emergencyStore.ts` mutators · F7-green pure engine cores · F8 cohort seam
(`edScenarioFixtures.ts:964`) · C6 simulation-mode gate · Synthea (external, MITRE) ·
`npm ci` in root and `backend/` (node_modules currently absent).

**Downstream** — if **go**: cohort-calibration spec, policy-library spec, facilitator/session spec,
results-reporting spec (`MeasureReport` as the PHI-free output resource). If **no-go**: none; the
pivot is falsified and the direction is re-decided. Downstream work is deliberately unplanned until
Q1–Q3 are answered.

### Existing Spec Touchpoints

- **Extends**: none. `.kiro/specs/` is empty; this is the first spec in the project.
- **Adjacent** (avoid overlapping): `src/engine/simulation.ts` — superseded by this work, must be
  *stopped* (C4), never extended. `backend/src/modules/simulation/` and `training/` — stubs (F6),
  out of scope entirely.

### Constraints

Full detail in §7 (C1–C7) and §6.3. The load-bearing ones: demonstrate on `/emergency/whiteboard`
not `/emergency/patients` (C1, MB-P0-4 is unfixed and a flow simulator *will* trigger it); never
`syncToBackend` (C2); gate API hydration off during a run (C3); stop the existing animator first (C4);
no bare `Math.random()` anywhere in `src/sim/` (C5); reuse the existing simulation-mode gate rather
than adding a parallel switch (C6 — parallel switches are this codebase's core pathology).

## 1. Purpose of this document

This brief is the **steering context** for a single spec. It records what was found in an
evidence-based audit of the CareDroid repository, the product decision that followed, and the
constrained scope of a feasibility spike.

It exists because a **product-direction decision is pending and cannot be made on assertion.**
The author's role is to determine whether a viable product can be built from this codebase
*before* proposing a pivot to the repo owner. The spike this brief scopes is therefore a
**de-risking experiment, not a product increment.** Its deliverable is a go/no-go answer backed
by a runnable artifact.

Everything in §3 is cited to source. Nothing is inferred from filenames.

---

## 2. Background

CareDroid (`caredroid-clinical-ai`, v1.0.0) is a ~613k-line TypeScript monorepo: a React 18 + Vite
SPA (`src/`, `lib/`) and a NestJS backend (`backend/`), 1,130 commits, 1,269 test files.
It is positioned as an "Emergency Department Operating System" with an embedded clinical AI copilot.

It was built by a single developer **without clinical experience**, largely through
agent-assisted development, and targets Canadian EDs.

---

## 3. Findings

### F1 — The repository is not clinically deployable, and documents this itself

| Evidence | Source |
|---|---|
| No third-party pentest, no clinical-safety sign-off | `SECURITY.md` |
| Intended-use boundary is explicitly **a draft awaiting CMIO approval** | `docs/INTENDED_USE_BOUNDARY_v1.md` |
| Regulatory classification (SaMD under Health Canada) **unresolved, declared out of scope** | `docs/INTENDED_USE_BOUNDARY_v1.md` |
| Critical blockers self-logged: unauthenticated `/api/emergency/*` in prod (B001), `JWT_SECRET` at `CHANGE_ME_IN_PRODUCTION` (B004), cross-tenant settings singleton (B003), non-durable ED state (B006), in-memory audit logs (B007) | `src/config/productionReadinessModel.ts:155-179` |
| Zero references to Epic / Cerner / Oracle Health / Meditech | repo-wide grep |
| Integration registry: 8 IMPLEMENTED, 14 PARTIAL, **12 PLACEHOLDER** (SMART on FHIR, HL7v2 ADT, MLLP all PLACEHOLDER) | `src/config/integrationStatusRegistry.ts` |
| No data-residency provisions (PHIPA / provincial privacy) | repo-wide grep |
| Self-assessed score **731/1000**, individual domains as low as 10/100 | `CareDroid-Emergency-OS-Master-Scorecard.html` |

### F2 — Canadian ED clinical fit is thin

- **CTAS** exists only as wait-time threshold labels (`P1`–`P5` + target minutes) in
  `src/config/emergencySettings.config.ts:7-9` — **not** an implementation of the CTAS triage
  algorithm or its modifiers.
- **ESI** (the US scale) appears in 34 code locations alongside CTAS.
- **CEDIS** presenting-complaint list, **ICD-10-CA**, **SNOMED CT CA**: absent, and honestly
  declared unlicensed rather than fabricated (`src/data/clinicalTerminology/terminologyProviders.ts:47-50`).
  *This refusal to fabricate codes is a genuine strength and should be preserved.*
- **NACRS / CIHI** reporting: mentioned in 4 markdown files, zero implementation.
- AODA accessibility and FR/EN i18n: zero references.

### F3 — The repo is a chimera of three unreconciled aims

Git history shows three product identities layered without reconciliation:

1. **Nov 2025 – Feb 2026** — generic "clinical AI" app, built in machine-paced batches
   (commits literally titled `batch12`, `batch14-phase4`, `Batch 15 Phase 1`). 61 commits.
2. **May 2026 onward** — pivot to "Emergency Department Operating System." This carries the only
   coherent product thesis in the repo, stated in `src/config/caredroidProduct.config.ts`:
   *"One ED OS orchestrating the full patient journey"* and *"One Screen, One Decision."*
3. **Throughout** — a SaaS platform layer (Stripe, entitlements, white-label, marketplace packs)
   for a product with no customers.

Plus an accretion layer with no logical association to any aim: ambulance fleet command,
IoT/digital twin, a 3D medical viewer, a clinical knowledge graph, a collaboration hub.

**1,069 of 1,130 commits landed in four months (May–Aug 2026)** — 179/216/345/329.
The product was renamed twice and `BRANDING_NAME_OPTIONS.md` lists 40+ candidate names.

### F4 — The repo's own audits confirm F3

| Metric | Value | Source |
|---|---|---|
| Duplicate findings across 12 audit sections | 38 | `docs/duplicate-system-audit.md` |
| Routes defined in three competing places | 33 overlapping path strings | same |
| Competing workspace models | 3 | same |
| Orphan findings / orphan-or-gap routes | 432 / 125 | `docs/orphan-detection-report.md` |
| HEAL ledger entries (4-month convergence campaign) | 79 entries, 64 VALIDATED | `docs/architecture/CARE_DROID_HEALING_TODOS.md` |

The last four months of engineering have been spent making the system's own parts agree with
each other.

### F5 — Four unresolved P0s, three blocked on human decisions

| ID | Issue | Status |
|---|---|---|
| MB-P0-1 / HEAL-031 | Two live calculators disagree on **paediatric Rocuronium and Dextrose doses** for the same weight | BLOCKED — needs pharmacy sign-off |
| MB-P0-2 | `roleProfileId` written hyphenated, read underscored → 9 of 12 emergency roles fall through to a minimal default | BLOCKED — needs role-vocabulary decision |
| MB-P0-3 | `charge_nurse` reaches `/admin` frontend via a second route-access source | MANUAL_REVIEW |
| MB-P0-4 / HEAL-070 | **`/emergency/patients` never renders** — stuck on Suspense fallback 60s+; bisected to rendering an unpaginated 77-patient grid | CONFIRMED, unfixed |

MB-P0-4 is load-bearing for this spike — see §7.

### F6 — There is no simulation engine, but the integration seam already exists

**Critical structural finding.**

- `src/engine/*.ts` are **deterministic board-state calculators** — they compute current state from
  current data. None advances a clock, samples a distribution, or projects a future state.
- `backend/src/modules/simulation/simulation-run.service.ts` has **no clock, no tick, no scheduler** —
  it appends steps to an array.
- `backend/src/modules/simulation/competency.service.ts` and `debrief.service.ts` return
  **hardcoded constants** (`88, 72, 81, 76, 64`; `debriefQualityScore: 78`). They are stubs.
- Zero repo-wide hits for Poisson processes, service-time distributions, or Monte Carlo.

**However:** `src/engine/simulation.ts` (770 lines) is already an arrival generator that mutates the
store on `setInterval` timers (30s flow / 60s arrivals / 180s EMS / 300s alerts) using hardcoded
`ARRIVAL_TEMPLATES` and bare `Math.random()`. It is an unseeded, wall-clock demo animator.

**The seam to drive the board from a simulation exists. It needs its clock and its sampler replaced.**

### F7 — The engines are mostly clock-injectable

Nearly every engine is a **pure inner function wrapped in a store-reading shell**. Example:
`calculateCapacity()` (`src/engine/capacityEngine.ts:77`) takes no arguments and reads the global
Zustand store — but delegates to `calculateEmergencyOsCapacity(...)`
(`lib/emergency-os/logic.ts:134`), which takes explicit inputs and is pure.

**Green — already accepts an injected `now`, usable as-is:**

| Function | Location |
|---|---|
| `runContinuousPatientFlowTick(now = new Date())` | `src/engine/continuousPatientFlowEngine.ts:570` |
| `runEmergencyReassessment(now = new Date())` | `src/engine/reassessmentEngine.ts:203` |
| `resolveStageEnteredAt(patient, stateId, now: Date)` | `src/engine/continuousPatientFlowEngine.ts:190` |
| `buildContinuousPatientFlowSnapshot(...)` | `src/engine/continuousPatientFlowEngine.ts:466` |
| `deriveCapacityCrisisState(input)` (`CapacityCrisisInput` has `now?: Date`) | `src/engine/capacityEngine.ts:137` |
| `buildCrowdLevelSnapshot(input)` | `src/engine/crowdLevelEngine.ts:205` |
| `calculateEmergencyOsCapacity(...)` — **pure** | `lib/emergency-os/logic.ts:134` |
| `suggestTriagePriority(input)` — **pure, zero Date refs** | `src/engine/triageEngine.ts:213` |
| `getNextStates` / `isLegalTransition` / `movePatientToState` | `src/engine/journeyEngine.ts:64/72/189` |
| `reassessmentTimerEngine` (16 parameterized time refs) | `src/engine/reassessmentTimerEngine.ts` |

**Red — store-bound or wall-clock, must be bypassed:**

| Function | Location | Reason |
|---|---|---|
| `calculateCapacity()` | `capacityEngine.ts:77` | no args, reads store |
| `runCapacityIntelligence()` | `capacityEngine.ts:238` | reads and writes store |
| `startCapacityEngine()` | `capacityEngine.ts:243` | `setInterval` |
| `startReassessmentEngine()` | `reassessmentEngine.ts:103` | `setInterval` |
| `startContinuousPatientFlowEngine()` | `continuousPatientFlowEngine.ts:589` | `setInterval` |
| `threeMinuteTimerEngine.ts` | — | 5 Date refs, 0 injectable; UI timer |
| `alertEngine.ts` | — | 3 Date refs, 0 injectable |

**The math is clock-injectable; only the schedulers are not.**

### F8 — A cohort injection point already exists

`buildSrcEmergencyScenarioState(scenarioId)` (`src/data/edScenarioFixtures.ts:964`) produces the
store's initial state and is consumed at `src/store/emergencyStore.ts:2744`, falling back to
`SEED_PATIENTS`. This is a clean, already-parameterized seam for loading a generated cohort.

---

## 4. Decision

**The clinical-deployment path is closed. The product direction is ED patient-flow simulation.**

### 4.1 What the product is

A **discrete-event simulation of emergency department patient flow**, rendered through the
existing ED board UI, with **clinical decision rules as swappable simulation policies**.

It is a *department* simulator, not a *patient* simulator. Incumbent tools split into two camps and
neither occupies this space:

- **Clinical simulators** (Laerdal, CAE, Body Interact, i-Human, Oxford Medical Simulation) model
  one clinician managing one patient's clinical problem.
- **Operations simulators** (Arena, Simul8, AnyLogic, FlexSim) model patients as tokens with
  service-time distributions, produce box-and-arrow abstractions, and require a consultant to build.

### 4.2 Why this framing, specifically for this repo

Every liability identified in §3 inverts into an asset:

| Liability under the clinical framing | Under simulation |
|---|---|
| Health Canada SaMD licensing | Not a medical device — **removed** |
| PHIPA / data residency / PIA | Synthetic data only, no PHI — **removed** |
| No EHR integration (F1) | A simulator must *not* touch a live EHR — **removed** |
| NACRS/CIHI reporting (F2) | Not a system of record — **removed** |
| 41 screens / 23 roles / feature sprawl (F3, F4) | **Face validity** — a clinician can watch the board and critique the model. This is the #1 documented adoption barrier for healthcare DES, and this repo solves it by accident. |
| 40 clinical calculators | **Swappable decision policies** — the core differentiating feature |

### 4.3 The differentiating capability

**Clinical decision policy as a simulation parameter.** Rather than modelling the physician as
`disposition_time ~ N(25, 8)`, model the actual rule:

```
policy_A: HEART >= 4 -> admit
policy_B: TIMI  >= 2 -> admit
```

Run both against the same cohort, same arrival stream, same random seeds; measure downstream
**operational** consequences (admission rate, boarding hours, imaging utilisation, LOS distribution,
LWBS). This answers a question hospitals genuinely cannot answer today without adopting a rule and
finding out.

### 4.4 Hard boundary (non-negotiable)

The product may report **operational outcomes** with quantified uncertainty. It may **not** report
**clinical outcomes** (e.g. "missed injuries fall by X%") unless sensitivity/specificity are
propagated against the modelled population's disease prevalence with uncertainty carried through.

This constraint exists because the repo has already committed this exact error once: hazard **H-1**
(`docs/CLINICAL_HAZARD_LOG_v1.md`) documents 7 of 8 native-AI registry entries declaring trained-model
algorithms and specific F1/accuracy/AUC metrics when every implementation was keyword/regex scoring
with zero training, and **none of the cited metrics were produced by any script or test in the repo.**
Repeating that pattern would be fatal to credibility.

### 4.5 Architecture vs. go-to-market

One engine can serve training, certification, and operations strategy comparison. **Build one engine;
sell one use case.** "Let the user decide what it's for" is the exact instinct that produced the
chimera in F3. Sequencing is deferred to the repo owner conversation and is explicitly **not** part
of this spike.

---

## 5. Goal of this spec

> **Determine whether ED patient-flow simulation is technically feasible on this codebase, by
> producing a runnable prototype that answers three questions with evidence.**

| Q | Question | Passes if |
|---|---|---|
| **Q1** | Can the existing ED state model be driven by a **virtual clock** instead of wall time? | A simulated 12-hour ED shift completes in seconds, with no `setInterval` involvement and no wall-clock dependence in the run path |
| **Q2** | Are runs **reproducible**? | Same seed produces byte-identical output across runs; different seeds produce different output |
| **Q3** | Does **policy swapping** produce a measurable, directionally sensible operational difference? | Two triage/disposition policies over an identical cohort + arrival stream yield different admission rates, reported with confidence intervals over N replications |

A fourth question is **observational, not pass/fail**: does the existing board UI render the
simulated state convincingly enough that a clinician could critique it specifically? This informs
the face-validity thesis but is not gated by code.

**This spike does not build a product.** It produces the evidence for a go/no-go conversation.

---

## 6. Scope

### 6.1 In scope

| # | Deliverable | Target path | Est. LOC |
|---|---|---|---|
| D1 | Virtual clock + seeded PRNG | `src/sim/clock.ts`, `src/sim/rng.ts` | ~150 |
| D2 | DES core — event queue (binary heap), scheduler, NHPP arrival generator (thinning), resource pools | `src/sim/des/` | ~400 |
| D3 | Adapter mapping DES entities to store shape and writing through existing mutators | `src/sim/adapters/emergencyStoreAdapter.ts` | ~200 |
| D4 | Decision-policy interface + two concrete triage/disposition policies | `src/sim/policies/` | ~80 |
| D5 | Synthea FHIR Bundle loader → `Patient` | `src/sim/cohort/syntheaLoader.ts` | ~150 |
| D6 | Headless batch runner: N replications → summary stats with CIs | `scripts/sim-batch.mjs` | ~100 |
| D7 | Findings memo answering Q1–Q3 with numbers | `docs/sim-spike-findings.md` | — |

Approximately **1,100 LOC of new code**, all additive, all under `src/sim/` plus one script.

### 6.2 Cohort: Synthea, Buffalo NY

**Generator:** Synthea (MITRE, open source), FHIR R4 Bundle output.

**Locale: Buffalo, New York.** Rationale:

- Synthea ships **US Census demographic and geography files**; New York State (including Buffalo) works
  **out of the box with zero demographic-file authoring**. Canadian locales do not exist in Synthea and
  would require custom demographic files — real work, explicitly deferred.
- Buffalo is the nearest large US city to Toronto (~150 km), sharing Great Lakes climate and a
  post-industrial urban ED context.

**Documented limitation (must appear in D7):** Buffalo's demographic profile differs materially from
Toronto's — notably foreign-born proportion, language distribution, and consequent complaint mix.
Synthea additionally models **lifetime disease progression, not ED arrival processes**, and its
complaint/acuity mix will not match CTAS or CEDIS distributions. For a feasibility spike the question
is *"does the pipeline work end to end"*, not *"is the cohort externally valid."* Cohort validation and
Canadian recalibration are **deferred, not solved**, and this must be stated plainly rather than
implied away.

**Layered architecture the cohort sits in** (only layers 1 and 4–5 are built in this spike):

```
1. Synthea            -> cohort composition (who: demographics, comorbidities, meds, history)
2. Arrival model      -> when (NHPP; parameters hardcoded for the spike, calibration deferred)
3. Acuity/complaint   -> what (spike: simple distribution; CTAS/CEDIS calibration deferred)
4. Decision policies  -> what the clinician does (existing calculators)
5. DES core           -> resource contention and queueing
```

### 6.3 Out of scope — do not touch

- **`src/store/emergencyStore.ts` internals** (6,406 lines). Write *through* existing mutators
  (`setPatients`, `addPatient`, `movePatientToState`); do not refactor.
- **Any backend module.** The spike is frontend + Node script only.
- `backend/src/modules/simulation/` and `training/` — the competency/debrief stubs (F6) are
  irrelevant to a DES and must not be extended.
- Auth, RBAC, tenancy, SaaS/billing, entitlements.
- The orphan/duplicate audits (F4) and their remediation.
- Fixing MB-P0-1/2/3 (F5).
- CTAS/CEDIS/NACRS implementation, terminology licensing, FHIR *integration* surfaces.
- Facilitator UI, session replay, multi-learner sync, scenario authoring, scoring/competency engines.
- Any clinical-outcome claim (see §4.4).

---

## 7. Technical constraints and landmines

These are design inputs, discovered by audit. Each must be handled explicitly.

| # | Constraint | Handling |
|---|---|---|
| **C1** | **MB-P0-4 / HEAL-070**: `/emergency/patients` never renders — bisected to an unpaginated 77-patient grid. A flow simulator generates realistic census, so this *will* trigger. | Demonstrate on `/emergency/whiteboard`, **not** `/emergency/patients`. Record the collision in D7 as a known blocker for any real product. |
| **C2** | `addPatient(patient, options?: { syncToBackend?: boolean })` | Always pass `syncToBackend: false`. |
| **C3** | The store hydrates from `emergencyOsApi` (`fetchEmergencyWhiteboard`, `fetchEmergencyQueues`, … — imported at `emergencyStore.ts:57-75`). Live fetches will overwrite simulated state mid-run. | Gate API hydration off while a run is active. |
| **C4** | `src/engine/simulation.ts` writes to the same store on `setInterval`. | Call `stopEmergencySimulation()` (`simulation.ts:756`) before starting a run. |
| **C5** | `Math.random()` is used directly in `simulation.ts`; nothing in the repo is currently reproducible. | All stochastic draws in `src/sim/` must route through the seeded PRNG (D1). No bare `Math.random()`. |
| **C6** | A simulation-mode gate already exists (`isSimulationModeActive()`, `SimulationModeContext`). | Reuse it. Do **not** add a parallel switch — parallel switches are this codebase's core pathology (F4). |
| **C7** | Store-bound engine wrappers (F7 red list) will read live global state. | Call the pure cores directly; never the `start*Engine()` or no-arg wrappers. |

**Build environment:** Node 20 (`engines: >=20.19.0 <25`), npm >=10, ESM (`"type": "module"`),
Vite + Vitest (`jsdom`, globals on, setup at `src/test/setup.ts`), path aliases `@` → `src/`,
`@lib` → `lib/`, `@store` → `src/store/`. Note `node_modules` is **not currently installed** in either
tree — `npm ci` at root and in `backend/` is a prerequisite. Frontend typecheck is
`npx tsc --noEmit -p tsconfig.frontend.json`.

---

## 8. Acceptance criteria

The spike is **complete** when all of the following hold:

1. A simulated 12-hour ED shift runs to completion headlessly via `scripts/sim-batch.mjs`.
2. Two runs with an identical seed produce identical output; two runs with different seeds do not.
3. A run of >= 30 replications per configuration emits, per configuration: mean and 95% CI for
   admission rate, mean LOS, and peak census.
4. Two decision policies over an identical cohort and arrival stream produce different admission
   rates, with the difference reported as an interval — **not a point estimate**.
5. A Synthea Buffalo NY cohort of >= 200 patients loads from FHIR Bundles into the internal
   `Patient` type without hand-written per-patient mapping.
6. Simulated state renders on `/emergency/whiteboard` with the virtual clock driving it.
7. `npx tsc --noEmit -p tsconfig.frontend.json` and ESLint are clean on all new files; unit tests
   exist for the RNG (reproducibility), event queue (ordering), and cohort loader.
8. `docs/sim-spike-findings.md` answers Q1–Q3 with numbers, and states the deferred-validation
   limitations from §6.2 explicitly.

## 9. Kill criteria

Stop and report **no-go** if:

- **K1** — `emergencyStore.ts` cannot be driven by a virtual clock within one day of effort, due to
  internal `Date.now()` side effects, debounced writes, or async behaviour that assumes wall time.
  This would falsify the "reuse the existing UI" thesis, which is the entire economic basis of the
  pivot (§4.2).
- **K2** — Policy swapping cannot be expressed without modifying the calculators themselves. This
  would falsify the differentiating capability (§4.3).
- **K3** — The Synthea → `Patient` mapping requires per-patient hand mapping, i.e. FHIR-as-internal-model
  provides no leverage.

A no-go here is a **successful spike**. The purpose is to find this out in a week rather than a quarter.

---

## 10. Open questions for the repo owner

Not blocking the spike; to be raised in the go/no-go conversation.

1. Go-to-market sequencing: training vs. certification vs. operations strategy comparison (§4.5).
2. Whether hazard **H-1**'s unsourced `metrics` fields in `lib/native-ai/modelRegistry.ts` are
   removed or re-earned by real evaluation. They are incompatible with a product that sells
   quantitative predictions.
3. Whether **MB-P0-1** (paediatric dosing disagreement) is fixed before any calculator is reused as a
   decision policy. A wrong dose is harmful in a simulator too.
4. Disposition of the accretion layer (§F3) — fleet, IoT/digital twin, 3D viewer, knowledge graph.
5. Whether FHIR becomes the **internal data model** (versus an integration surface). This brief assumes
   yes: it is what makes policy swapping mechanically possible (calculators bound to LOINC-coded
   Observations rather than hand-named fields), it makes Synthea ingestion near-free, and
   `MeasureReport` is the correct PHI-free output resource for aggregate results. `research.md`
   already specifies CA Core+ and the Canadian FHIR Registry for this purpose.
6. Privacy vocabulary for future real-data calibration: the defensible position is
   **"no record-level data leaves the hospital; only fitted distribution parameters are ingested"**
   (aggregate-only disclosure, optionally differential privacy on small cells, optionally
   in-hospital federated calibration). Zero-knowledge proofs were considered and rejected as the
   wrong primitive — there is no adversarial verifier, and a DES cannot practically be expressed
   as an arithmetic circuit.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **DES** | Discrete-event simulation — state advances by scheduled events on a virtual clock, not fixed time steps |
| **NHPP** | Non-homogeneous Poisson process — arrival process with a time-varying rate; models diurnal/weekly ED arrival seasonality |
| **Thinning** | Rejection-sampling method for generating NHPP arrivals from a dominating homogeneous process |
| **Replication** | One complete run with a distinct seed; many replications are required for any interval estimate |
| **Face validity** | Whether a domain expert, watching the model behave, judges it credible — the dominant adoption barrier for healthcare DES |
| **CTAS** | Canadian Triage and Acuity Scale (levels 1–5) |
| **CEDIS** | Canadian Emergency Department Information System presenting-complaint list |
| **NACRS** | National Ambulatory Care Reporting System (CIHI) |
| **Synthea** | MITRE's open-source synthetic patient generator; emits FHIR natively |
| **LWBS** | Left without being seen |

---

## 12. Appendix — key file reference

| Purpose | Path |
|---|---|
| Pure capacity core | `lib/emergency-os/logic.ts:134` |
| Clock-injectable flow tick | `src/engine/continuousPatientFlowEngine.ts:570` |
| Clock-injectable reassessment | `src/engine/reassessmentEngine.ts:203` |
| Pure triage suggestion | `src/engine/triageEngine.ts:213` |
| Journey transition rules | `src/engine/journeyEngine.ts:64/72/189` |
| Existing wall-clock animator (to be superseded) | `src/engine/simulation.ts` |
| Store (write through, do not refactor) | `src/store/emergencyStore.ts` |
| Cohort injection seam | `src/data/edScenarioFixtures.ts:964` → `src/store/emergencyStore.ts:2744` |
| Domain types | `src/types/emergency.ts` |
| Product thesis | `src/config/caredroidProduct.config.ts` |
| Self-logged blockers | `src/config/productionReadinessModel.ts:155-179` |
| Hazard log (H-1 precedent) | `docs/CLINICAL_HAZARD_LOG_v1.md` |
| Healing ledger | `docs/architecture/CARE_DROID_HEALING_TODOS.md` |
