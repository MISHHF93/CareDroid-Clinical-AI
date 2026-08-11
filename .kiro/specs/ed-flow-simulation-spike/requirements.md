# Requirements Document

## Project Description (Input)

> Source: `.kiro/specs/ed-flow-simulation-spike/brief.md` (discovery, Path C, 2026-08-10).
> The brief is the authoritative evidence pack — findings F1–F8, constraints C1–C7, acceptance
> criteria §8, kill criteria §9. This section is its summary, not a replacement for it.

**Who has the problem.** The CareDroid repo owner (sole developer, non-clinician) cannot decide the
product's direction on assertion. The codebase is a ~613k-line ED platform that is not clinically
deployable and cannot be made so without a Health Canada SaMD pathway, clinical sign-off, EHR
integration, and licensed Canadian terminology — none of which exist, and three of which are blocked
on human decisions rather than code. The direction has been confirmed as ED patient-flow simulation,
but that pivot rests on **one untested technical assumption**: that the existing ED board UI and
engines can be driven by a simulation clock instead of wall time. If that assumption is false, the
pivot's entire economic basis — reuse the UI, don't rebuild it — collapses. Today that would surface
a quarter into the build.

**Current situation.** There is no simulation engine. `src/engine/*` are deterministic board-state
calculators: they compute present state from present data, and none advances a clock, samples a
distribution, or projects forward. `backend/src/modules/simulation/simulation-run.service.ts` has no
clock, tick, or scheduler; the neighbouring competency and debrief services return hardcoded
constants and are stubs. Nothing in the repo is reproducible — stochastic draws use bare
`Math.random()` (7 occurrences in `src/engine/simulation.ts` alone). `src/sim/` does not exist.

The seams that make the experiment cheap do already exist: `src/engine/simulation.ts` (770 lines)
already drives the board on `setInterval` timers, so the integration seam is built and needs only its
clock and sampler replaced; most engine math already accepts an injected `now` (only the schedulers
do not); `edScenarioFixtures.ts:buildSrcEmergencyScenarioState()` is a parameterized cohort injection
point; and a simulation-mode gate already exists in `src/services/simulationModeService.ts`.

**What should change.** Produce a **runnable prototype that answers three questions with evidence**,
as a de-risking experiment rather than a product increment:

- **Q1 — Virtual clock.** A simulated 12-hour ED shift completes in seconds, with no `setInterval`
  involvement and no wall-clock dependence in the run path.
- **Q2 — Reproducibility.** The same seed produces byte-identical output across runs; different seeds
  produce different output.
- **Q3 — Policy swapping.** Two clinical decision policies over an identical cohort and arrival
  stream yield different admission rates, reported as an interval over N ≥ 30 replications — never a
  point estimate.

Deliverables D1–D7 (~1,100 LOC, all additive, all under `src/sim/` plus one script): virtual clock +
seeded PRNG; DES core (event queue, scheduler, NHPP arrivals via thinning, resource pools); a store
adapter writing through existing mutators; a decision-policy interface with two concrete policies; a
Synthea FHIR R4 Bundle → `Patient` loader (Buffalo NY cohort); a headless batch runner emitting
summary statistics with confidence intervals; and a findings memo answering Q1–Q3 with numbers.

**A no-go is a successful outcome.** Kill criteria K1–K3 remain live: if the store cannot be driven
by a virtual clock within a day of effort (K1), if policy swapping requires modifying the calculators
themselves (K2), or if Synthea → `Patient` needs per-patient hand mapping (K3), the spike stops and
reports no-go. The purpose is to learn this in a week rather than a quarter.

**Non-negotiable boundary.** Operational outcomes only — admission rate, boarding hours, LOS, peak
census, LWBS. No clinical-outcome claim may be made unless sensitivity and specificity are propagated
against the modelled population's disease prevalence with uncertainty carried through. The repo has
already committed this error once (hazard H-1: AI registry entries citing F1/AUC figures that no
script in the repo ever produced), and repeating it would be fatal to credibility.

**Explicitly out of scope.** Refactoring `emergencyStore.ts` internals (6,406 lines — write through
its existing actions); any backend module; extending `backend/src/modules/simulation/` or
`training/`; auth, RBAC, tenancy, billing; the orphan/duplicate audit remediation; fixing MB-P0-1/2/3;
CTAS/CEDIS/NACRS implementation and terminology licensing; facilitator UI, scenario authoring, session
replay, multi-learner sync, scoring/competency engines; cohort external validity and Canadian
recalibration (deferred, and to be stated as deferred rather than implied away).

## Introduction

This spec covers a **feasibility spike**, not a product increment. Its deliverable is a go/no-go
answer, backed by a runnable artifact, to a single question: can CareDroid's existing ED state model
and board be driven by a simulation instead of by wall time?

The confirmed product direction is ED patient-flow simulation, and its economic basis is reuse of the
existing UI rather than a rebuild. That basis is currently **untested**. This spike tests it in a week
rather than discovering it a quarter into a build. Three questions gate the answer: whether a
simulated shift can run on a virtual clock (Q1), whether runs are reproducible from a seed (Q2), and
whether substituting clinical decision policies produces a measurable operational difference (Q3).

**A no-go is a successful outcome.** These requirements are written so that a negative finding is a
first-class, reportable result rather than a failure to deliver.

Throughout, **the ED Flow Simulator** denotes the runnable simulation artifact this spike produces,
**the Spike Findings Report** denotes its written evidence deliverable, and **the Spike** denotes the
overall exercise and its verdict.

## Boundary Context

- **In scope**: headless execution of a simulated ED shift on a virtual clock; seeded, reproducible
  runs; substitution of clinical decision policies without altering the underlying clinical
  calculators; loading a synthetic patient cohort; replicated batch runs reported with confidence
  intervals; rendering simulated state on the existing department whiteboard; a written findings
  report answering Q1–Q3 with numbers; an explicit go/no-go verdict.

- **Out of scope**: any clinical-outcome claim; calibration of arrival rates, acuity, or complaint mix
  against real data; external validity of the cohort and Canadian recalibration; CTAS/CEDIS/NACRS
  conformance and terminology licensing; facilitator interfaces, scenario authoring, session replay,
  multi-learner synchronisation, and scoring or competency engines; authentication, roles, tenancy,
  and billing; remediation of the repository's existing duplicate/orphan findings or its open P0
  defects.

- **Adjacent expectations**: the Simulator consumes the existing ED state model, its patient-state
  transition rules, and the existing department whiteboard surface, and expects them to remain
  behaviourally unchanged — it does not own them and must not alter them. It expects synthetic cohort
  data to be supplied in the FHIR R4 Bundle form that Synthea emits; it does not own cohort
  generation. It expects the application's existing simulation-mode indication to be reused rather
  than duplicated. Known defective surfaces of the host application remain defective and are not this
  spike's to fix; the Simulator is expected to route around them and record the collision.

## Requirements

### Requirement 1: Virtual-clock execution (Q1)

**Objective:** As the evaluator running the spike, I want a simulated ED shift to advance on its own
clock rather than on wall time, so that the reuse-the-existing-UI thesis is either confirmed or
falsified before any product is built.

#### Acceptance Criteria

1. The ED Flow Simulator shall advance simulated time without requiring a proportional amount of real
   time to elapse.
2. When a 12-hour simulated shift is executed headlessly, the ED Flow Simulator shall run it to
   completion within 10 seconds of real time on a standard development workstation.
3. When a simulated run is executed, the ED Flow Simulator shall derive every time-dependent decision
   from the simulated clock rather than from the real-world clock.
4. While a simulated run is in progress, the ED Flow Simulator shall produce identical results
   irrespective of the real-world time, date, or timezone at which the run is started.
5. If any part of the run path is found to depend on real-world time elapsing, then the ED Flow
   Simulator shall fail the run with a diagnostic identifying the dependency rather than silently
   producing a wall-clock-influenced result.

### Requirement 2: Reproducibility from a seed (Q2)

**Objective:** As the evaluator running the spike, I want runs to be exactly reproducible from a
stated seed, so that any interval estimate the product later reports rests on repeatable evidence.

#### Acceptance Criteria

1. The ED Flow Simulator shall accept a seed as an explicit input to every run.
2. When two runs are executed with the same seed and the same configuration, the ED Flow Simulator
   shall produce identical recorded event sequences and identical summary statistics.
3. When two runs are executed with different seeds and the same configuration, the ED Flow Simulator
   shall produce differing recorded event sequences.
4. The ED Flow Simulator shall exclude real-world timestamps and any other non-reproducible values
   from the outputs that reproducibility is asserted over.
5. The ED Flow Simulator shall record the seed used alongside the results of every run.
6. If any random draw in the run path is not derived from the run's seed, then the ED Flow Simulator
   shall be treated as failing Q2 regardless of whether a given pair of runs happened to match.

### Requirement 3: Clinical decision policy substitution (Q3)

**Objective:** As the evaluator running the spike, I want to swap the clinical decision rule that
drives patient disposition without altering the clinical logic itself, so that the product's
differentiating capability is shown to be mechanically possible.

#### Acceptance Criteria

1. The ED Flow Simulator shall accept the clinical decision policy governing patient disposition as a
   selectable input to a run.
2. The ED Flow Simulator shall provide at least two distinct decision policies that differ only in the
   clinical decision rule applied.
3. When a run is executed, the ED Flow Simulator shall apply the selected policy at every point where
   the modelled decision arises, and shall record which policy was used.
4. The ED Flow Simulator shall reuse the repository's existing clinical calculation logic as the basis
   of a policy without modifying that logic.
5. If expressing a policy requires changing the underlying clinical calculation, then the ED Flow
   Simulator shall not make that change.
6. Where a clinical calculator carries a known unresolved correctness dispute, the ED Flow Simulator
   shall not adopt it as a decision policy, and the Spike Findings Report shall state the exclusion
   and its reason.

### Requirement 4: Synthetic cohort ingestion

**Objective:** As the evaluator running the spike, I want a synthetic patient cohort to load from
published-profile-conformant data without per-patient hand mapping, so that the claim that
standards-based patient data gives this product leverage is tested rather than assumed, and so that
ingestion targets a specification rather than one generator's output shape.

#### Acceptance Criteria

1. The ED Flow Simulator shall load a synthetic patient cohort supplied as FHIR R4 Bundles conforming
   to the US Core implementation guide.
2. When a cohort of at least 200 synthetic patients is supplied, the ED Flow Simulator shall load it
   into the application's patient representation using a single general mapping, with no
   per-patient special-case handling.
3. When a cohort record cannot be mapped, the ED Flow Simulator shall skip that record, continue
   loading, and report the count and reason for every skipped record.
4. The ED Flow Simulator shall populate only those patient attributes the cohort data actually
   supports, and shall not invent clinical values that the source data does not contain.
5. Where a clinical decision-rule input is absent from the cohort, the ED Flow Simulator shall record
   the generated value in the same standard representation it uses for cohort-derived values, marked
   as generated and distinguishable from derived values on inspection.

### Requirement 5: Replicated execution and interval reporting

**Objective:** As the repo owner, I want results reported as intervals over many replications, so that
no operational claim from this product is ever a single-run point estimate.

#### Acceptance Criteria

1. When a batch is requested, the ED Flow Simulator shall execute at least 30 replications per
   configuration, each with a distinct seed.
2. When a batch completes, the ED Flow Simulator shall report, per configuration, the mean and a 95%
   confidence interval for admission rate, mean length of stay, and peak census.
3. When two configurations differing only by decision policy are compared, the ED Flow Simulator shall
   report the difference between them as an interval and shall separately state whether that interval
   excludes zero.
4. The ED Flow Simulator shall report a measured difference together with its interval whether or not
   the interval excludes zero, and shall treat a null or overlapping result as a valid reportable
   outcome.
5. The ED Flow Simulator shall not present any operational result as a bare point estimate.
6. When a batch is executed, the ED Flow Simulator shall complete a 30-replication comparison without
   manual intervention.

### Requirement 6: Rendering on the department board

**Objective:** As the repo owner, I want to watch simulated state on the existing department board, so
that the face-validity premise underlying the whole pivot can be judged by eye.

#### Acceptance Criteria

1. When a simulated run is executed with rendering enabled, the ED Flow Simulator shall display the
   resulting patient state on the existing department whiteboard surface.
2. While a simulated run is rendering, the ED Flow Simulator shall drive the displayed state from the
   simulated clock.
3. While a simulated run is active, the ED Flow Simulator shall make the simulated state distinguishable
   from real operational state by reusing the application's existing simulation-mode indication.
4. Where a host application surface is known to fail under realistic patient volumes, the ED Flow
   Simulator shall demonstrate rendering on an unaffected surface, and the Spike Findings Report shall
   record the affected surface as a known blocker for any future product.
5. The Spike shall treat clinician judgement of face validity as an observation to be recorded, not as
   a pass/fail condition on the Simulator.

### Requirement 7: Isolation from live application state

**Objective:** As the repo owner, I want simulation runs to leave the real application untouched, so
that an experiment can never contaminate operational state or be corrupted by it.

#### Acceptance Criteria

1. While a simulated run is active, the ED Flow Simulator shall not transmit any simulated patient data
   to any server or external service.
2. While a simulated run is active, the ED Flow Simulator shall prevent externally sourced state from
   overwriting simulated state mid-run.
3. When a simulated run starts, the ED Flow Simulator shall stop the application's pre-existing
   wall-clock demonstration behaviour so that only one source drives the board.
4. When a simulated run ends, the ED Flow Simulator shall leave the application in a state where normal
   operation can resume without a reload.
5. The ED Flow Simulator shall confine its changes to the application's state to the operations that
   state model already exposes, and shall not alter the state model itself.

### Requirement 8: Evidence integrity and reporting boundary

**Objective:** As the repo owner, I want every claim the spike makes to be sourced and bounded, so that
this product does not repeat the unsourced-metrics failure already recorded in this repository.

#### Acceptance Criteria

1. The Spike Findings Report shall answer Q1, Q2, and Q3 with figures produced by the artifact itself.
2. The Spike Findings Report shall not state any quantitative result that no run or test in this
   repository produced.
3. The Spike Findings Report shall report operational outcomes only, and shall make no claim about
   clinical outcomes.
4. If a clinical-outcome claim is proposed, then the Spike shall reject it unless diagnostic
   sensitivity and specificity are propagated against the modelled population's disease prevalence with
   uncertainty carried through.
5. The Spike Findings Report shall state explicitly that cohort external validity, arrival-rate
   calibration, and acuity/complaint-mix calibration are deferred and unvalidated.
6. The Spike Findings Report shall state the known demographic divergence between the synthetic cohort's
   locale and the intended target population.
7. The Spike Findings Report shall record every deviation from planned scope and every workaround
   applied to a defective host surface.

### Requirement 9: Go/no-go determination

**Objective:** As the repo owner, I want an explicit verdict with its reasoning, so that the product
decision rests on evidence and a negative result ends the matter cleanly instead of drifting.

#### Acceptance Criteria

1. When the spike concludes, the Spike shall report a separate verdict of pass or fail for each of Q1,
   Q2, and Q3, with the supporting figures for each.
2. When the spike concludes, the Spike shall report one overall go/no-go recommendation and state which
   findings drove it.
3. If the existing state model cannot be driven by a virtual clock without internal modification, or
   more than one working day of effort is spent attempting it, then the Spike shall stop that line of
   work and report no-go with the specific obstruction.
4. If a decision policy cannot be expressed without modifying the underlying clinical calculators, then
   the Spike shall stop that line of work and report no-go on the differentiating capability.
5. If the synthetic cohort cannot be mapped without per-patient hand mapping, then the Spike shall stop
   that line of work and report no-go on cohort leverage.
6. The Spike shall treat a no-go verdict as a successful and complete outcome, and shall not expand
   scope in order to convert it into a go.
7. The Spike shall not begin any work outside this spec's scope on the basis of a go verdict; a go
   verdict shall result only in a recommendation.
