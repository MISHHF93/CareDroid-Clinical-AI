# Gap Analysis — ed-flow-simulation-spike

| | |
|---|---|
| **Date** | 2026-08-10 |
| **HEAD** | `cd2839d9` (branch `dev`) |
| **Method** | Direct code execution against the repository. Every claim below was verified by reading the cited line, not inferred from `brief.md`. |
| **Purpose** | Inform `design.md`. Options, not decisions. |

> **Why this pass mattered.** `brief.md` established its store-related claims by reading, not by
> tracing call paths. Three of those claims survive; four do not, and one of the four would have
> silently violated a requirement in the browser. Corrections are marked **[CORRECTION]**.

---

## 1. Current State Investigation

### 1.1 What exists and is directly reusable

| Asset | Location | Fitness |
|---|---|---|
| Pure clinical calculators | `src/clinical-calculators/` | **Good** — `computeHeart`, `computeQsofa`, `computeNews2`, `computeGcs`, `computeNihss`, `computeWellsPe` are pure `(input) => result`. Usable as policies with no modification (R3.4). |
| Runtime patient injection | `emergencyStore.setPatients(patients)` (`:3191`) | **Good** — bulk replace, no clock, no I/O. |
| Time-injectable engine cores | `continuousPatientFlowEngine.ts:570`, `reassessmentEngine.ts:203`, `triageEngine.ts:213`, `lib/emergency-os/logic.ts:134` | **Good** — accept `now`/explicit input. |
| Timeline event injection | `movePatientToState(id, to, { timelineEvent })` (`:2575`) | **Partial** — a fully-formed event bypasses the wall clock, but only for the patient timeline. See G2. |
| Arrival-time control | `addPatient` (`:3057`) | **Good** — stamps the intake event from `patient.arrivalTime`, not from the wall clock. Caller owns time. |

### 1.2 Conventions that constrain the work

- Co-located faceted tests (`<subject>.<facet>.test.ts`); Vitest under `jsdom` with **`window` defined**.
- Relative imports dominate (~7,888 vs 5 aliased).
- Pure-core / impure-shell layering: the pure core is always the correct call target.

---

## 2. Findings — verified gaps

### G1 — [CORRECTION] Every state move fires a floating async audit write that reaches the network **[Constraint · Critical]**

`movePatientToState` unconditionally calls `appendAuditLog` (`:1068`), which does:

```
appendAuditLog()
  -> void import('../services/securityAuditService')      // dynamic import, floating promise
     .then(ingestEmergencyAuditEntries)
       -> scheduleAuditSync()                             // setInterval(SYNC_INTERVAL_MS)
          -> flushPendingSecurityAudits()
             -> apiFetch(...)                             // network POST, bearer token
```

This is not reachable only through opt-in code — it is on the default path of the primary mutator
the simulator must call.

**The only guard is `typeof window === 'undefined'`** inside `scheduleAuditSync`, plus an
access-token check inside the flush.

| Environment | Consequence |
|---|---|
| Headless Node (`scripts/`) | Safe. No `window`, so no timer and no transmission. |
| Browser (R6 rendering) | **Violates R7.1** — simulated patient audit entries are queued and POSTed if a token is present. Also starts a `setInterval`, touching R1.1/R1.3. |
| Vitest `jsdom` | `window` **is** defined — tests inherit the browser behaviour, not the headless behaviour. |

`brief.md` C3 anticipated inbound hydration overwriting simulated state. It did not anticipate
**outbound** transmission. This is the single most consequential finding in this pass.

### G2 — [CORRECTION] Byte-identical reproducibility is not reachable through the store's mutators as written **[Constraint · Critical]**

```ts
function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;   // :946
}
```

Wall clock **and** unseeded randomness, in one identifier. 14 call sites in the store.

`movePatientToState` writes three things per call: a patient timeline event, an audit entry, and a
workflow log. Its options expose `timelineEvent` — so the **timeline** can be made deterministic —
but expose no way to supply the id or timestamp of the **audit entry** or the **workflow log**.
Both therefore receive `createId()` and `new Date()` values.

Consequence: if the reproducibility artifact of R2.2 includes store audit/workflow logs, R2 **cannot
pass** without changing the store — which R7.5 forbids and K1 makes a no-go trigger. R2.4 (exclude
non-reproducible values from the compared outputs) is the escape, and it must be an explicit,
stated design decision rather than an accident of what the runner happens to serialise.

### G3 — Timeline events default to wall clock, but are injectable **[Constraint · Medium]**

`createPatientTimelineEvent` (`:2014`) resolves `options.timestamp || new Date().toISOString()`.
`movePatientToState` calls it **without** a timestamp. Supplying a complete `timelineEvent` avoids
both the wall clock and `createId`. Confirms `brief.md` F7's optimism for the timeline specifically —
and only there.

### G4 — [CORRECTION] The existing simulation-mode gate cannot serve as the run-active gate **[Constraint · Medium]**

`isSimulationModeActive()` requires **all** of: the `enableSimulationMode` feature flag, a defined
`window`, and `localStorage['caredroid.simulationMode.active'] === 'true'`. Headless, it is
unconditionally `false`.

`brief.md` C6 ("reuse it, do not add a parallel switch") is right about the **UI indication** and
wrong if read as "use it as the run gate." These are two different concerns:

- **Display state** — reuse `simulationModeService` (satisfies R6.3).
- **Run-active state** — must live in the simulator; it has to work headless.

Implementing the second is not the parallel-switch pathology; conflating them would produce a
browser-only simulator.

### G5 — No FHIR or Synthea assets exist **[Missing · Medium]**

No FHIR dependency in either `package.json`; no FHIR type definitions; zero `synthea` references.
Existing "FHIR" hits are status-registry strings recording SMART on FHIR as `PLACEHOLDER`.
R4 is entirely greenfield — design must choose between adding a typed FHIR dependency and
hand-rolling the narrow subset the loader needs.

### G6 — Synthea cannot supply three required `Patient` fields **[Constraint · High]**

`Patient` (`src/types/emergency.ts`) requires `chiefComplaint`, `complaintCategory`, and `priority`.
Synthea models **lifetime disease progression, not ED arrival episodes** — it emits no ED presenting
complaint and no triage acuity.

This sits directly against **R4.4** ("shall not invent clinical values the source data does not
contain"). The resolution is already implied by `brief.md` §6.2's layering: the cohort supplies
*who* (demographics, comorbidities, medications); the **arrival/acuity model** supplies *what*
(complaint, acuity) as a declared, seeded modelling assumption.

Design must state this explicitly, because the distinction is the whole difference between a
modelling assumption and a fabricated clinical value. R4.4 governs the loader; it does not govern
the arrival model.

### G7 — [CORRECTION] There are 6 reusable calculators in scope, not ~40 **[Constraint · Medium]**

`CLINICAL_CALCULATOR_REGISTRY` contains exactly **6**: `qsofa`, `heart`, `wells-pe`, `gcs`, `news2`,
`nihss`.

The "39/40 calculators" figure repeated in `brief.md` §4.2, several root markdown files, and the
`product.md` I generated traces to `REGISTERED_EXECUTOR_TOOL_IDS` in
`backend/.../tool-orchestrator.registry.ts` — verified at **39 entries**, but these are backend
AI-executable *tools*, a mix of calculators and non-calculators (`drug-interactions`,
`lab-interpreter`), and `backend/` is out of scope per §6.3.

Impact: **R3.2 is still satisfiable** — `heart.ts` exists, so the brief's illustrative policy A is
implementable. **TIMI does not exist anywhere in the repo**, so policy B must be authored. But the
product claim that 40 calculators become swappable policies is not supported by in-scope code, and
the largest calculator surface sits behind a boundary this spike declares out of scope.

Duplicate implementations also exist (`src/utils/neurologyCalculators.ts`,
`src/utils/wellsPeCalculator.ts`) — pick the registry version.

### G8 — Inbound hydration is browser-only **[Constraint · Low]**

`hydrateFromApi` is driven from `useEmergencyOs.tsx` (React effect) and from realtime
`whiteboard_snapshot` / `central_node_updated` events. Both are browser-layer. C3 gating is a
**rendering-path concern only**; headless runs are unaffected.

### G9 — The cohort seam is initialization-time, not runtime **[Constraint · Low]**

`buildSrcEmergencyScenarioState()` is invoked once at module load (`emergencyStore.ts:2744`), and
`getInitialEdScenarioId()` reads `localStorage`. It is not a per-run injection point.
**`setPatients()` is the runtime cohort seam.** `brief.md` F8 overstates this slightly.

---

## 3. Requirement-to-Asset Map

| Req | Existing asset | Gap | Tag |
|---|---|---|---|
| R1 Virtual clock | Injectable engine cores (F7 green) | No event queue or scheduler exists | **Missing** |
| R1.5 Fail on wall-clock dependence | — | Needs an explicit detection mechanism | **Missing** |
| R2 Reproducibility | — | `createId` is wall-clock + `Math.random` (G2); no seeded PRNG anywhere | **Missing / Constraint** |
| R3 Policy substitution | 6 pure calculators; `heart.ts` present | Policy interface absent; TIMI absent (G7) | **Missing** |
| R4 Cohort ingestion | `setPatients` | No FHIR assets (G5); 3 required fields unsourceable (G6) | **Missing / Constraint** |
| R5 Replications + CIs | — | No batch runner, no statistics helper | **Missing** |
| R6 Board rendering | Whiteboard surface; `simulationModeService` for display | Gate is browser-only (G4); outbound audit fires (G1) | **Constraint** |
| R7.1 No transmission | `typeof window` guard | Holds headless; **fails in browser** (G1) | **Constraint** |
| R7.2 No inbound overwrite | — | Hook + realtime channel must be suppressed (G8) | **Constraint** |
| R7.3 Stop existing animator | `stopEmergencySimulation()` (`simulation.ts:756`) | Available as-is | — |
| R7.5 No store modification | Mutators are sufficient for state | Not sufficient for determinism (G2) | **Constraint** |
| R8 Evidence integrity | — | Report is a deliverable, not code | — |
| R9 Verdict | — | Deliverable | — |

**Research Needed** (carry to design, do not resolve here):
1. Does anything else on the mutator path perform I/O? `emergencyStore.ts` holds 15 `await` / 12 `async` / 1 `setTimeout`; only the audit path was traced.
2. Whether `buildCapacitySnapshot`, called inside `movePatientToState`, is time-dependent.
3. Whether a 12-hour shift at realistic census stays within R1.2's 10-second budget once each move writes three log entries with array copies.
4. Which FHIR resources Synthea actually emits per patient at the chosen cohort size, and their volume.

---

## 4. Implementation Approach Options

### Option A — Drive the real store in-process

The DES calls `setPatients` / `movePatientToState` directly; the store is the simulation's state.

- ✅ Maximum face validity; the board is literally the model. Smallest new surface.
- ❌ Inherits G1 (browser transmission) and G2 (nondeterministic ids/timestamps) on **every** move.
- ❌ Reproducibility depends on excluding store-generated logs from comparison — R2 becomes contingent.
- ❌ Per-move array copies plus three log writes make R1.2 a genuine performance question.
- **Effort M · Risk High** — puts K1 in play for reasons unrelated to the clock.

### Option B — Sim-owned state model, store used only for display

The DES owns its entities and never calls store mutators during a run; a projection writes snapshots
via `setPatients` for rendering.

- ✅ Determinism is total — no `createId`, no audit path, no floating promises. R2 clean.
- ✅ Headless runs never touch browser code. R7.1 satisfied structurally, not by guard.
- ✅ R1.2 comfortably reachable.
- ❌ Weakest test of the reuse thesis: proves the *board renders* simulated state, not that the
  *existing state model* can be simulated. Q1 risks being answered for an easier question.
- ❌ Requires a parallel entity model — mitigated by reusing the `Patient` type itself.
- **Effort M · Risk Medium**

### Option C — Hybrid: sim-owned kernel, store as a projection target, mutators exercised in a bounded probe

Run headless on sim-owned state (Option B); **additionally** run a small, explicit probe that drives
a short shift through the real mutators (Option A) purely to answer Q1 honestly and measure G1/G2.

- ✅ Q1 answered against the real store, which is what K1 actually asks.
- ✅ R2/R5 rest on the deterministic path; reproducibility is never contingent.
- ✅ G1/G2 become **measured findings for D7** rather than blockers.
- ✅ Rendering path (R6) is the projection, where G1 is confined and can be gated.
- ❌ Two paths to keep coherent; the probe needs its own scope discipline.
- **Effort M–L · Risk Medium**

---

## 5. Effort and Risk by Deliverable

| # | Deliverable | Effort | Risk | Justification |
|---|---|---|---|---|
| D1 | Clock + seeded PRNG | **S** | **Low** | Self-contained, no integration. |
| D2 | DES core | **M** | **Low** | Well-understood algorithms, greenfield, no host coupling. |
| D3 | Store adapter | **M** | **High** | G1, G2, G3 all land here; this is where K1 is decided. |
| D4 | Policy interface + 2 policies | **S** | **Low** | Calculators already pure; second policy authored, not adapted (G7). |
| D5 | Synthea loader | **M** | **Medium** | Greenfield (G5); G6 needs an explicit modelling boundary. |
| D6 | Batch runner + statistics | **S** | **Low** | Pure computation over run outputs. |
| D7 | Findings report | **S** | **Low** | Writing, gated on the above producing numbers. |

**Overall: M–L effort, Medium risk, concentrated almost entirely in D3.**

---

## 6. Recommendations for Design

1. **Adopt Option C.** It is the only option that answers Q1 against the real store while keeping
   R2 and R5 on a provably deterministic path. Options A and B each sacrifice one of those.
2. **Decide and document the R2.2 comparison artifact explicitly.** Given G2, name exactly what is
   compared — recommended: the simulator's own event log and summary statistics, excluding
   store-generated audit and workflow logs, justified in writing under R2.4.
3. **Treat G1 as a first-class design constraint for the rendering path.** Establish before the
   browser demo that no simulated audit entry can be transmitted. The `typeof window` guard does not
   protect the browser case, which is the case R6 requires.
4. **Separate display gating from run gating (G4).** Reuse `simulationModeService` for the
   indication; own the run-active flag in the simulator. State this in the design so it is not read
   as the parallel-switch pathology.
5. **Draw the loader/arrival-model line explicitly (G6).** The loader maps only what Synthea emits;
   complaint and acuity are seeded draws from the arrival model and must be labelled modelling
   assumptions in D7.
6. **Correct the calculator count in the product narrative (G7).** Six in scope, `heart` usable,
   TIMI to be authored. The 39 backend tools are real but out of scope — worth flagging to the
   repo owner as a downstream question, since the product thesis leans on them.
7. **Instrument R1.2 early.** Measure the 12-hour run time as soon as D2 exists, before D3 adds
   per-move log writes, so a performance problem is attributable.
