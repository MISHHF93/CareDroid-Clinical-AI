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

### G1 — [CORRECTION] Simulated patient IDs are persisted into the production audit table **[Constraint · Critical]**

*Hardened 2026-08-10: client chain, wire payload, and server-side persistence all traced to source.*

`movePatientToState` unconditionally calls `appendAuditLog` (`:1068`). The full path, client through
database:

```
movePatientToState()                        emergencyStore.ts:3456
 └─ appendAuditLog()                                      :1068
     └─ void import('../services/securityAuditService')    ← dynamic import, floating promise
         └─ ingestEmergencyAuditEntries()   securityAuditService.ts:41
             └─ scheduleAuditSync()                        :55
                 └─ setInterval(…, 30_000)                 :58
                     └─ flushPendingSecurityAudits()       :63
                         └─ apiFetch('POST /api/audit/sync')
                             └─ AuditController.syncAuditEvent()   backend/…/audit.controller.ts:28
                                 └─ AuditService.log()
                                     └─ auditRepository.save()     audit.service.ts:87
```

This is not opt-in code. It is the default path of the primary mutator the simulator must call.

#### What reaches the database

Wire payload assembled at `securityAuditService.ts:76-90`:

```js
resourceType: entry.patientId ? 'patient' : 'security',   // → 'patient'
resourceId:   entry.patientId || entry.id,                // → the simulated patient's ID
metadata:     { staffId, fromState, toState, phiAccessed: false }
```

The controller then persists it as `resource: "patient:<simulated-patient-id>"`, stamped with the
real logged-in user's `userId`, their `organizationId` and `workspaceId`, their IP address, and
their user agent.

**The failure mode is not a stray network call.** It is synthetic patient identifiers written into
the production audit log, labelled as patient resources and attributed to a real user and tenant —
with nothing in the stored row distinguishing them from audit entries about real patients. For a
product whose entire regulatory position is "synthetic data only, no PHI," an audit table that mixes
the two is a materially bad artifact to create, and it is not straightforwardly reversible.

`phiAccessed` resolves to `false` (it keys off `action.startsWith('phi.')`). `resourceType: 'patient'`
does not.

#### The two gates

Independent, and at different layers:

| Gate | Location | Blocks |
|---|---|---|
| `typeof window === 'undefined'` | `scheduleAuditSync:56` | the timer — nothing ever flushes |
| `getStoredAccessToken()` falsy | `flushPendingSecurityAudits:67` | the POST only |

| Environment | Consequence |
|---|---|
| Headless Node (`scripts/`) | **Safe.** No `window` → no timer, no transmission. |
| Browser + active session (R6) | **Violates R7.1.** Neither gate holds. Also starts a `setInterval`, touching R1.1/R1.3. |
| Vitest `jsdom` | `window` **is** defined — tests inherit the browser path, not the headless one. |

#### Why the obvious fixes are constrained

- **No off switch exists.** `syncTimer` is module-private and `clearInterval` is never called
  anywhere in `securityAuditService.ts`. Once started, the 30-second interval lives for the page
  lifetime. The module's full export surface — `recordSecurityAuditEvent`,
  `ingestEmergencyAuditEntries`, `getPendingSecurityAuditCount`, `flushPendingSecurityAudits` —
  offers no way to stop it.
- **A contract test pins the wiring.** `platformCohesion.contract.test.ts:64-68` asserts that
  `emergencyStore.ts` *source text* contains `ingestEmergencyAuditEntries` and the literal
  `import('../services/securityAuditService')`. Because the assertion is on source text, a **runtime
  guard passes**; **deletion breaks the test.** Gating is viable, excision is not.
- **Volume, on the mutator path.** ~77 patients × ~20 journey stages ≈ 1,500 audit entries per
  simulated shift against `MAX_PENDING_AUDIT_ENTRIES = 100`. The buffer discards via `slice(-100)`,
  so most entries are dropped and the surviving 100 POST one-at-a-time in an awaited loop.

#### Blast radius is narrower than it first appears

`setPatients` also audits (`:3195` — one of 23 audit-writing mutators), but its entry carries **no
`patientId`**, so it degrades to `resourceType: 'security'` with `metadata: { count: N }`. It leaks a
count, never an identity. A rendering path built on `setPatients` alone therefore starts the timer
but writes no synthetic patient IDs.

#### Options for R6

| # | Option | Cost | Assessment |
|---|---|---|---|
| 1 | Render via projection only — browser path calls `setPatients`, never `movePatientToState` | None; falls out of Option C | **Recommended.** Leaks a count, no identities. |
| 2 | Runtime guard in `appendAuditLog` skipping the import while a run is active | Small, targeted | Viable (contract test survives). Edits a file §6.3 says to write *through*, not *into*. |
| 3 | Demo unauthenticated so no token exists | Zero code | **Not a control.** Relies on an unenforceable operational precondition; one login makes it wrong. |
| 4 | Drop R6; assess face validity from a recording | Requirements change | Costs more than the problem. Face validity is the one thing headless cannot test, and it is the premise the pivot rests on. |

**Recommended: option 1, with option 2 as belt-and-braces if Option C's mutator probe is ever run in
a browser rather than headless.**

`brief.md` C3 anticipated inbound hydration overwriting simulated state. It did not anticipate
**outbound** transmission, and this is the single most consequential finding in this pass.

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

### G10 — The calculators consume clinical judgement, not patient data **[Constraint · High]**

*Found during design validation, 2026-08-10.*

`HeartInput` (`src/clinical-calculators/heart.ts:16-22`) is five **pre-scored ordinals**:

```ts
export type HeartInput = {
  history: 0 | 1 | 2; ecg: 0 | 1 | 2; age: 0 | 1 | 2;
  riskFactors: 0 | 1 | 2; troponin: 0 | 1 | 2;
};
```

It accepts no observations. Each component is a clinician's judgement already reduced to a band. Of
the five, **only `age` is derivable from a cohort `Patient`**; history, ECG interpretation,
risk-factor count, and troponin band are not emitted by Synthea and cannot be inferred from it.

**Design consequence.** A calculator-backed policy cannot be driven from cohort data. The four
non-derivable components are seeded draws, and they are located in `AcuityAssigner` — never in the
policy — so that fabrication cannot migrate into the policy layer and defeat 4.4. Provenance is
tracked **per field**, because collapsing `age` and the other four to one label would overstate how
much of the decision rests on the cohort.

**Product consequence — revised 2026-08-10 after standards research.** The first version of this
finding said `history`, `ecg`, `riskFactors` and `troponin` were "irreducibly modelled." **That was
wrong**, and it was wrong because it reasoned from the repository's bespoke `HeartInput` struct
instead of from what the standards already specify. Corrected position:

| HEART item | Bands | Status |
|---|---|---|
| Age | `<45` / `45–64` / `≥65` | **Derivable** — pure function of `Patient.birthDate` |
| Risk factors | `0` / `1–2` / `≥3 or known atherosclerotic disease` | **Derivable** — count of SNOMED-coded `Condition` |
| Troponin | `≤normal` / `1–3×` / `>3× normal` | **Derivable when present** — LOINC `Observation` vs reference range |
| ECG | `normal` / `non-specific` / `significant ST deviation` | Codeable in LOINC, but Synthea emits no interpretation — generated |
| History | `slightly` / `moderately` / `highly suspicious` | Genuine clinician gestalt — generated |

Three of five derive from coded data. **One** is irreducibly gestalt, not four.

**The representation was also being invented rather than adopted.** Scored clinical instruments have
a standard FHIR shape: a `Questionnaire` whose `answerOption`s carry `itemWeight` (formerly
`ordinalValue`), answered by a `QuestionnaireResponse`, totalled by the SDC `weight()` FHIRPath
function. The specification's own cited examples are **Apgar and the Glasgow Coma Score** — the same
class of instrument. The design now uses this and confines the repository's `HeartInput` struct to a
thin adapter at the calculator's doorstep, so the internal model stays FHIR and the calculator stays
unmodified.

**Ingestion was targeting a generator rather than a specification.** Synthea emits US Core natively
(`--exporter.fhir.use_us_core_ig true --exporter.fhir.us_core_version 6.1.0`; supported 6.1.0,
5.0.1, 4.0.0, 3.1.1). Requirement 4.1 was amended from "Bundles of the form Synthea emits" to "US
Core conformant Bundles" — so the loader is written against a published profile set, and swapping
the generator, or later swapping US Core for **CA Core+** (`ca.infoway.io.core`, the FHIR expression
of CACDI), is configuration rather than a rewrite.

**What remains true.** Generation does not disappear for a synthetic cohort — Synthea emits no HEART
`QuestionnaireResponse` and no ECG interpretation at any conformance level. What changed is that
generated values now land in the *same standard resource* as derived ones, marked as generated
(4.5), so a real response from a live system drops in unchanged and the generated fraction falls
without any policy changing. **The honest metric is the per-item derived-versus-generated fraction**,
and 8.5 requires the findings report to publish it.

**Licensing** (checked, nothing blocks this): LOINC free under licence agreement; SNOMED CT free to
US implementers via the NLM UMLS national licence; US Core, CA Core+ and `ca-baseline` are freely
downloadable HL7/Infoway packages; Synthea is Apache 2.0.

**Secondary finding — resolved.** `HEART_META.disclaimer` states the score "does not ... recommend
treatment or disposition," yet a disposition policy thresholds exactly that. Defensible when
modelling a policy rather than advising care, but not silently: the disclaimer is copied verbatim
into `RunRecord.policyProvenance` alongside `usage: 'modelled-decision-rule'`, so it travels with
every result.

Sources: [SDC itemWeight](https://build.fhir.org/ig/HL7/fhir-extensions//StructureDefinition-itemWeight.html),
[Synthea HL7 FHIR wiki](https://github.com/synthetichealth/synthea/wiki/HL7-FHIR),
[US Core](https://hl7.org/fhir/us/core/),
[CA Core+](https://simplifier.net/guide/ca-core).

---

## 3. Requirement-to-Asset Map

| Req | Existing asset | Gap | Tag |
|---|---|---|---|
| R1 Virtual clock | Injectable engine cores (F7 green) | No event queue or scheduler exists | **Missing** |
| R1.5 Fail on wall-clock dependence | — | Needs an explicit detection mechanism | **Missing** |
| R2 Reproducibility | — | `createId` is wall-clock + `Math.random` (G2); no seeded PRNG anywhere | **Missing / Constraint** |
| R3 Policy substitution | 6 pure calculators; `heart.ts` present | Policy interface absent; TIMI absent (G7); calculator inputs are pre-scored judgement, not cohort-derivable (G10) | **Missing / Constraint** |
| R4 Cohort ingestion | `setPatients` | No FHIR assets (G5); 3 required fields unsourceable (G6) | **Missing / Constraint** |
| R5 Replications + CIs | — | No batch runner, no statistics helper | **Missing** |
| R6 Board rendering | Whiteboard surface; `simulationModeService` for display | Gate is browser-only (G4); outbound audit fires (G1) | **Constraint** |
| R7.1 No transmission | `typeof window` guard | Holds headless; **fails in browser with a session** — persists synthetic patient IDs to the audit table (G1) | **Constraint** |
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
3. **Build the rendering path on `setPatients` projection only (G1 option 1).** The browser path
   must not call `movePatientToState`, because that writes synthetic patient IDs into the production
   audit table as `resource: "patient:<id>"` against the real user and tenant. The `typeof window`
   guard does not protect the browser case, which is exactly the case R6 requires. If Option C's
   mutator probe is ever run in a browser rather than headless, add the runtime guard in
   `appendAuditLog` as well (option 2) — a contract test permits gating but forbids deletion.
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

---

# Design Discovery & Synthesis — 2026-08-10

*Appended during `/kiro-spec-design`. The gap analysis above supplied the codebase half of discovery; this section records the external research and the synthesis decisions that shaped `design.md`.*

## Discovery scope

Codebase discovery was already complete (G1–G9 above). This pass covered only what was still unknown: external dependency viability and the actual shape of Synthea's FHIR output.

## External investigations

### I1 — Synthea FHIR R4 output structure

| Finding | Design implication |
|---|---|
| One file per patient, `Bundle.type = transaction`, `Patient` resource as the **first entry** | The loader keys on entry order rather than searching, and one general mapping is genuinely achievable (4.2) |
| Followed by Encounter / Condition / Observation / Procedure / MedicationRequest entries, grouped by encounter in chronological order | Vitals selection is "most recent Observation before cohort cutoff", not "first match" |
| **Organizations and Practitioners exported in separate files** because they are referenced across patients | The loader must classify these as `not-a-patient-bundle` and skip them — otherwise a normal export produces spurious failures. This is why `CohortLoadSkip.reason` includes that variant (4.3) |
| Resources cross-reference by relative URI / `urn:uuid` | No reference resolution is needed for the spike's narrow subset; noted so it is not attempted |
| Observations carry LOINC codes | Vitals mapping is a declared LOINC→field table (`loincVitalsMap.ts`), not display-name string matching |

Sources: [MITRE FHIR for Research — Synthea overview](https://mitre.github.io/fhir-for-research/modules/synthea-overview), [FHIR test data from Synthea](https://darrendevitt.com/fhir-test-data-from-synthea/).

### I2 — Seeded PRNG

`pure-rand` (dubzzz, MIT, TypeScript-native, ESM): offers `congruential32`, `mersenne`, `xorshift128plus`, `xoroshiro128plus`, with `xoroshiro128plus` recommended by the maintainers. Actively maintained. Critically, it provides a **jump** operation — jumping in xoroshiro128+ moves 2⁶⁴ generations forward in a 2¹²⁸ sequence — which yields genuinely independent streams per replication.

`seedrandom` (davidbau, 3.0.5) is the better-known alternative but offers no jump primitive. The TC39 `SeededPRNG` proposal (ChaCha12) is not shipped and cannot be relied on.

Sources: [pure-rand](https://github.com/dubzzz/pure-rand), [seedrandom](https://github.com/davidbau/seedrandom), [TC39 proposal-seeded-random](https://tc39.es/proposal-seeded-random/).

### I3 — FHIR TypeScript types

`@types/fhir` (DefinitelyTyped, MIT, updated June 2026) and `@medplum/fhirtypes` (updated June 2026) are both current. `@ahryman40k/ts-fhir-types` was last published four years ago and is rejected. `@types/fhir` is chosen: it is a pure type package, installs as a devDependency, and adds **zero runtime footprint** — which matters in a repo with 12 runtime dependencies.

Sources: [@types/fhir](https://www.npmjs.com/package/@types/fhir), [@medplum/fhirtypes](https://www.npmjs.com/package/@medplum/fhirtypes).

## Synthesis outcomes

### Generalization

- **`DecisionPolicy` is the generalization of requirement 3.** Requirements 3.1–3.6 are variations on one problem: making the clinical decision rule a run parameter. The interface is generalized to admit any disposition rule; only two are implemented. Interface generalized, implementation not — per the synthesis rule.
- **`IntervalEstimate` generalizes requirement 5.** 5.2 (per-configuration intervals) and 5.3 (paired difference) are the same statistical object at different arities. One type, used twice.
- **Rejected generalization**: a pluggable "process model" abstraction over `EdFlowModel`. There is exactly one ED process in scope and no second in prospect. Speculative.

### Build vs. adopt

| Component | Decision | Rationale |
|---|---|---|
| Seeded PRNG | **Adopt** `pure-rand` | Correct stream independence across 30 replications is the part that is easy to get subtly wrong. Deriving replication streams by `seed + i` produces correlated sequences in LCG-family generators and would silently invalidate every interval in 5.2 — a failure that produces plausible numbers rather than an error. Jump-based derivation is the established fix and is provided. |
| FHIR types | **Adopt** `@types/fhir` | Type-only, zero runtime cost, actively maintained. Hand-writing R4 shapes is pure toil. |
| Event queue | **Build** | `tinyqueue` and `heap-js` are battle-tested but do **not** guarantee stable ordering for equal keys. Determinism (2.2) requires a total order, so ties must break on a monotonic sequence number. Adopting would mean wrapping a library to add the property that actually matters. ~60 lines. |
| Statistics | **Build** | `simple-statistics` supplies the arithmetic but not the type-level constraint that makes 5.5 enforceable — the design makes a bare point estimate *unrepresentable*, which a general library cannot do. CI computation must also be auditable for 8.1/8.2. ~40 lines. |
| Virtual clock | **Build** | Trivial; no library fits an advance-only simulated instant. |

### Simplification

- **Removed** a `SimulationSession` façade over clock + rng + queue + scheduler. It added a layer without adding a decision.
- **Removed** a generic `Distribution` abstraction. Only exponential and categorical draws are needed; both are methods on `SeededRng`.
- **Kept** `StoreProjection` and `MutatorProbe` as two adapters rather than one with a mode flag. They answer different questions, carry different risks, and only one may ever run in a browser — collapsing them would put a boundary violation one boolean away.
- **Kept** `AcuityAssigner` separate from `SyntheaCohortLoader` despite both producing patient attributes. This seam is what keeps 4.4 honest: the loader maps only cohort data, the assigner produces declared modelling assumptions. Merging them would make fabricated and sourced values indistinguishable — precisely the H-1 failure.

## Architecture pattern evaluation

| Pattern | Verdict |
|---|---|
| **Hexagonal** (chosen) | The only pattern that lets one kernel serve a deterministic headless run, a browser projection, and a mutator probe without cross-contamination. The host sits behind adapters, which is exactly where G1 needs to be contained. |
| Layered / MVC | No natural home for three different host-contact strategies. |
| Event-sourced | Superficially attractive — `RunRecord` is already an append-only event log — but adds projection and replay machinery for a spike that needs neither. Rejected as speculative. |

## Risks carried into implementation

| Risk | Mitigation |
|---|---|
| 1.2's 10-second budget is unverified and may fail once the model writes per-event records | Instrument at the first runnable scheduler, before the model grows, so a regression is attributable |
| Cohort load time for ≥200 Synthea patients is unmeasured and could dominate a batch | Measure separately from the run budget; load once and reuse across replications |
| `MutatorProbe` run in a browser by mistake would violate 7.1 | Headless-only is a stated invariant; `storeProjection.isolation.test.ts` guards the projection path |
| Two policies may produce overlapping intervals | Already resolved in requirements: 5.4 makes a null result valid output, so this is a finding rather than a failure |
