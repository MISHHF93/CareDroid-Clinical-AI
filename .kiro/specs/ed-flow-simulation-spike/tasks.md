# Implementation Plan

- [ ] 1. Foundation: build prerequisites and shared vocabulary

- [ ] 1.1 Install dependencies in both trees and add the entropy lint rule
  - Run a clean install at the repository root and in the backend tree; neither has `node_modules` present, so every later typecheck, test and benchmark is blocked until this completes
  - Add the seeded random number generator as a runtime dependency and the FHIR type definitions as a development dependency
  - Add a lint rule scoped to the simulation tree that bans wall-clock access and ambient randomness, so the no-entropy invariant is mechanically enforced rather than conventional
  - Observable: frontend typecheck and lint both run to completion on the untouched repository, and a scratch file under the simulation tree using a banned global fails lint
  - _Requirements: 2.6_

- [ ] 1.2 Define the shared leaf vocabulary for the simulation
  - Create the leaf type module holding simulated time, event kinds and payloads, recorded events, answer provenance, resolved answers, retained cohort source, acuity assignment, and per-item coverage
  - These are plain records over host and FHIR types only; they must import nothing from within the simulation tree, which is what allows every later layer to read them without an upward import
  - Observable: the type module compiles with no imports from sibling simulation directories, and a dependency check confirms it sits at the leaf
  - _Requirements: 2.4, 4.5_
  - _Boundary: SharedTypes_

- [ ] 1.3 Provision the synthetic patient generator and capture a conformant fixture
  - Install the Java runtime the generator requires and obtain the generator itself; it is an external tool outside this repository and nothing downstream can produce cohort data without it
  - Produce a small sample export with implementation-guide conformance enabled, and commit a trimmed fixture bundle plus one organisation-only bundle for use by ingestion tests
  - Record the generator version and the exact conformance flags used, so the cohort's provenance is reproducible rather than remembered
  - Observable: the committed fixture contains a patient resource with declared profile identifiers, coded conditions and at least one coded observation, and the recorded command reproduces it
  - _Requirements: 4.1_

- [ ] 2. Simulation kernel: deterministic primitives

- [ ] 2.1 (P) Build the virtual clock and the totally-ordered event queue
  - Provide an advance-only simulated instant that never consults the real clock
  - Provide a minimum-ordered event store keyed on simulated time and then on a monotonically increasing sequence number assigned at push time, so events sharing an instant cannot reorder between runs
  - Cover ordering with a unit test that pushes events sharing an instant in shuffled order and asserts they emerge in push order
  - Observable: the ordering test passes, and the queue exposes no path that returns events in a non-deterministic order
  - _Requirements: 1.1, 1.3, 2.2_
  - _Boundary: VirtualClock, EventQueue_

- [ ] 2.2 (P) Build the seeded random source with independent replication streams
  - Wrap the adopted generator so it is the only source of randomness in the simulation tree
  - Derive per-replication streams by the generator's jump operation, never by arithmetic on the seed, because seed arithmetic yields correlated sequences and would silently invalidate every later interval estimate
  - Expose uniform, exponential, integer and selection draws so no caller reaches the underlying library directly
  - Cover with a unit test asserting identical seeds reproduce sequences exactly, and that derived streams differ from one another and from the parent
  - Observable: the reproducibility test passes and no module outside this one imports the generator library
  - _Requirements: 2.1, 2.3, 2.6, 5.1_
  - _Boundary: SeededRng_

- [ ] 3. Decision instruments: the swappable rule, in standard form

- [ ] 3.1 (P) Define the instrument contracts and express HEART as a weighted questionnaire
  - Define the per-item resolution contract and the instrument pairing of a questionnaire with its resolvers
  - Express the chest-pain rule as a standards-conformant questionnaire whose answer options carry numeric weights, so scoring is the standard weighted sum rather than a bespoke calculation
  - Observable: the questionnaire's every answer option carries a weight, and a unit test asserts the declared weights reproduce the published banding for each item
  - _Requirements: 3.2_
  - _Boundary: HeartInstrument_
  - _Depends: 1.2_

- [ ] 3.2 Implement per-item resolution for the chest-pain instrument
  - Derive the age item from date of birth, the risk-factor item from the count of coded conditions, and the troponin item from a coded observation compared against its reference range
  - Generate the history and electrocardiogram items from the seeded stream, since no coded source in the cohort carries them
  - Mark every answer with its provenance and the codes actually consulted; an unparseable code degrades that item to generated and is reported rather than silently scored as zero
  - Observable: a source carrying coded conditions and a troponin result resolves three items as derived with populated code lists, and the same source without the troponin result degrades only that item to generated
  - _Requirements: 3.4, 4.4, 4.5_
  - _Boundary: HeartInstrument_
  - _Depends: 2.2_

- [ ] 4. Decision policies: substitutable rules over a resolved response

- [ ] 4.1 (P) Define the policy contract and the comparator policy
  - Define a pure decision contract taking a patient and a simulated instant and returning a disposition with its rationale
  - Implement the acuity-threshold comparator policy, authored rather than adapted because no second published score exists in this repository
  - Observable: both policies satisfy one contract, neither performs input or output, and a unit test confirms the same input yields the same decision on repeated calls
  - _Requirements: 3.1, 3.2_
  - _Boundary: DecisionPolicy, AcuityAdmitPolicy_

- [ ] 4.2 Adapt the resolved response to the existing calculator and threshold it
  - Map a resolved questionnaire response to the shape the repository's existing chest-pain calculator already accepts, confining that bespoke shape to the calculator's doorstep so the internal model stays standards-based
  - Apply the disposition threshold and record which policy decided
  - Carry the calculator's own published disclaimer verbatim alongside the decision, together with an explicit marker that the score is being used as a modelled decision rule rather than as clinical decision support
  - Do not modify the calculator; if the rule cannot be expressed without changing it, stop and record the obstruction
  - Observable: the adapter's output scores identically under the existing calculator and under the questionnaire's weighted sum, and every produced decision carries the disclaimer text
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 8.2, 8.4_
  - _Boundary: HeartInputAdapter, HeartAdmitPolicy_
  - _Depends: 3.1_

- [ ] 5. Cohort ingestion: profile-conformant, code-driven

- [ ] 5.1 Load a profile-conformant cohort and retain its coded context
  - Read patient bundles, taking the patient resource as the leading entry and mapping vitals by coded identifier through a declared code-to-field table rather than by display name
  - Retain condition and observation codes alongside each patient, since decision items resolve from codes rather than from the mapped patient record
  - Skip bundles that carry no patient resource — organisation and practitioner bundles are exported separately by the generator and are normal, not failures — and report each skip with its reason so counts reconcile against the source file count
  - Record the profile identifiers the data declares, so conformance can be reported as what the artifact asserts rather than as an unverified claim
  - Observable: the committed fixture bundle maps to a patient with retained codes, the organisation-only fixture is skipped with a stated reason, counts reconcile, and a bundle stripped of profile declarations yields an empty profile list instead of a silent conformance claim
  - _Requirements: 4.1, 4.2, 4.3, 8.2_
  - _Boundary: UsCoreCohortLoader_
  - _Depends: 1.3_

- [ ] 5.2 Resolve decision inputs into standard responses with in-band provenance
  - For each patient, walk the instrument's items, deriving from the retained coded context where possible and generating from the seeded stream otherwise
  - Write generated and derived answers into the same response resource, marking provenance through a single declared extension on each answer rather than through any side-channel structure
  - Observable: a resolved response answers every item, each answer carries a provenance marker readable from the resource alone, and derived answers never consume the random stream
  - _Requirements: 4.4, 4.5_
  - _Boundary: DecisionInputResolver_
  - _Depends: 3.2, 5.1_

- [ ] 6. Run output: the reproducibility artifact and its summaries

- [ ] 6.1 (P) Define the run record and its append-only writer
  - Provide the canonical run output carrying seed, policy identity and provenance, configuration summary including declared cohort profiles, the ordered event log, coverage, and operational metrics
  - Exclude real-world timestamps and host-generated identifiers by construction, since the host's identifier helper embeds wall-clock and ambient randomness and cannot be injected through the mutators
  - Restrict metrics to operational quantities; a clinical-outcome field is a review-blocking change
  - Observable: the record serialises to a stable form containing no real-world timestamp, and the writer exposes only append and seal
  - _Requirements: 2.4, 2.5_
  - _Boundary: RunRecord_

- [ ] 6.2 (P) Summarise replications as intervals, never as point estimates
  - Produce a mean with a ninety-five percent confidence interval over a set of replication values
  - Compare two configurations as a difference reported as an interval, and separately state whether that interval excludes zero
  - Make a bare point estimate unrepresentable in the returned types, so the reporting constraint is enforced structurally rather than by discipline
  - Observable: a unit test over deliberately overlapping samples returns a difference interval with the exclusion flag false, demonstrating that a null result is valid reportable output rather than a failure
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 8.3_
  - _Boundary: Statistics_

- [ ] 6.3 (P) Compute per-item derived-versus-generated coverage
  - Read the provenance marker across every resolved response in a cohort and produce per-item derived and generated counts with their fraction
  - Derive provenance from the recorded marker only, never by inspecting whether an answer value looks plausible
  - Observable: a cohort whose troponin item is derived for half its patients reports a derived fraction of one half for that item and one for the age item
  - _Requirements: 4.5, 8.5_
  - _Boundary: DecisionInputCoverage_
  - _Depends: 1.2_

- [ ] 7. Process model: arrivals, contention and patient lifecycle

- [ ] 7.1 (P) Implement resource pools with priority-ordered queueing
  - Provide seize and release over named pools with waiting handled in priority then arrival order
  - Observable: a unit test shows a higher-priority waiter is served before an earlier-arriving lower-priority waiter, and that no resource is ever held by two patients
  - _Requirements: 1.1_
  - _Boundary: ResourcePools_

- [ ] 7.2 (P) Generate arrivals from a time-varying rate
  - Produce arrival instants from a non-homogeneous rate profile using rejection sampling against a dominating rate, drawing exclusively from the seeded stream
  - Observable: at a fixed seed the generated arrival instants are identical across runs, and a flat rate profile produces inter-arrival times whose mean approaches the reciprocal of the rate
  - _Requirements: 1.1, 2.2_
  - _Boundary: ArrivalProcess_

- [ ] 7.3 Assign presentation and attach the resolved decision input
  - Draw presenting complaint and triage priority from the seeded stream and attach the resolved decision response to each patient
  - Label complaint, category and priority as modelled assumptions; distributions are uncalibrated for this spike and must not be presented otherwise
  - Observable: every assignment carries its provenance label and a decision response, and no assignment is produced without one
  - _Requirements: 4.4_
  - _Boundary: AcuityAssigner_
  - _Depends: 5.2_

- [ ] 7.4 Implement the patient lifecycle as the sole owner of run state
  - Advance patients through arrival, triage, resourcing, disposition and departure, deriving every time-dependent decision from the injected simulated instant
  - Consult the selected policy at the disposition event and record which policy decided
  - Hold all mutable run state here, so a run is a pure function of cohort, seed, configuration and policy
  - Append to the run record on every transition
  - Observable: a short scripted run produces a record whose events are ordered and whose patients each reach a terminal state, with no other component holding mutable state
  - _Requirements: 1.3, 3.3, 5.2_
  - _Boundary: EdFlowModel_
  - _Depends: 2.1, 4.1, 7.1, 7.2, 7.3, 6.1_

- [ ] 8. Implement the scheduler and its failure envelope
  - Pop the earliest event, advance the clock to it, dispatch into the model, and continue to the horizon
  - Fail the run with a diagnostic naming the dependency if any part of the run path is found to depend on real time elapsing, rather than returning a wall-clock-influenced result
  - Return a discriminated outcome so callers cannot mistake a failed run for a completed one
  - Observable: a twelve-hour horizon runs to completion and the final clock equals the last dispatched instant, never a real-world value
  - _Requirements: 1.1, 1.2, 1.5_
  - _Boundary: Scheduler_
  - _Depends: 7.4_

- [ ] 9. Host adapters: rendering and the store probe

- [ ] 9.1 (P) Project simulated state onto the department board without transmitting
  - Replay record snapshots into the host's bulk patient replacement action only; the per-patient movement action must never be called from this path because its audit entry carries a patient identifier that reaches the server and is persisted against the real signed-in user and tenant
  - On begin, stop the host's pre-existing wall-clock animation, suppress inbound hydration, and set the existing simulation-mode indication; on end, restore hydration and clear the indication so normal operation resumes without a page reload
  - Demonstrate on the department board surface, not the patient list surface, which is a known unrendered surface under realistic census
  - Observable: a projection test asserts the bulk action is called, that no patient-identifying mutator is called, and that no network request is issued
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Boundary: StoreProjection_
  - _Depends: 6.1_

- [ ] 9.2 (P) Probe the real store over a full horizon and measure contamination
  - Drive one full twelve-hour replication through the host's real mutators, headless only, and report its own real-time duration alongside the horizon actually reached
  - Count the wall-clock timestamps and non-reproducible identifiers the host generates during the run, since these are what determine whether the existing state model can be simulated at all
  - Report whether the store could be driven without modifying its internals, and list any obstruction encountered
  - Observable: the probe returns a result carrying duration, horizon reached, and both contamination counts; failing to reach the horizon is recorded as a finding rather than as a test failure
  - _Requirements: 1.2, 1.3, 9.3_
  - _Boundary: MutatorProbe_
  - _Depends: 8_

- [ ] 10. Integration: cohort generation and the batch runner

- [ ] 10.1 Generate and commit a profile-conformant synthetic cohort
  - Generate at least two hundred synthetic patients with the generator's implementation-guide conformance enabled, targeting the locale chosen for this spike
  - Verify the export loads through the loader with reconciling counts and a non-empty declared profile list
  - Observable: the cohort loads to at least two hundred patients, skipped files are accounted for by reason, and the declared profile list is non-empty
  - _Requirements: 4.1, 4.2, 4.3_
  - _Depends: 1.3, 5.1_

- [ ] 10.2 Wire the headless batch runner and emit a machine-readable evidence bundle
  - Execute at least thirty replications per configuration, each on its own derived stream, and complete a two-configuration comparison without manual intervention
  - Emit per-configuration interval estimates, the paired difference with its zero-exclusion flag, per-item coverage, policy provenance, and the seeds used
  - Print per-replication seed, duration and event count so the runtime budget is observable on every batch rather than measured once
  - Observable: one command produces a comparison bundle on disk containing intervals, coverage and provenance, with no interactive prompt
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 2.5, 8.1_
  - _Depends: 8, 6.2, 6.3, 10.1_

- [ ] 11. Validation: determinism, independence and budget

- [ ] 11.1 (P) Prove reproducibility and independence from real time
  - Assert two runs at one seed produce identical records and that different seeds diverge
  - Assert a run executed under a faked system time and a different timezone produces an identical record
  - Observable: both assertions pass, and the compared artifact is the run record only, with host-generated audit and workflow entries explicitly excluded and that exclusion stated in the test
  - _Requirements: 2.2, 2.3, 2.4, 1.4_
  - _Boundary: SchedulerDeterminismTests_
  - _Depends: 10.2_

- [ ] 11.2 (P) Prove policy substitution produces a measurable, reported difference
  - Run two policies over an identical cohort, seed and arrival stream and report the admission-rate difference as an interval with its zero-exclusion flag
  - Observable: the comparison completes and reports a difference interval whether or not it excludes zero, with each record carrying its policy provenance and disclaimer
  - _Requirements: 3.1, 3.3, 5.3, 5.4_
  - _Boundary: PolicySwapTests_
  - _Depends: 10.2_

- [ ] 11.3 (P) Measure the runtime budget on both paths
  - Measure a twelve-hour replication on the deterministic path against the ten-second budget
  - Measure the same horizon through the store probe and report it separately; neither number may be reported without the other, since the deterministic path never contacts the host and its duration alone would answer an easier question than the one posed
  - Observable: both durations are recorded in the evidence bundle under distinct labels
  - _Requirements: 1.2, 5.6_
  - _Boundary: HorizonBenchmarks_
  - _Depends: 9.2, 10.2_

- [ ] 12. Findings: the spike's deliverable

- [ ] 12.1 Assemble the findings report from machine-produced evidence
  - Answer the three gating questions with figures taken from the evidence bundle, quoting no quantity that no run or test in this repository produced
  - Report operational outcomes only; reject any clinical-outcome claim unless diagnostic sensitivity and specificity are propagated against modelled prevalence with uncertainty carried through
  - State per item the fraction of the cohort derived from codes versus generated, and state that to the extent items are generated the policy comparison compares two functions of the same draws
  - State that cohort external validity, arrival-rate calibration and acuity calibration are deferred and unvalidated, and state the demographic divergence between the cohort's locale and the intended target population
  - State that conformance was established by generation configuration and verified only to the extent the data declares it
  - Record every deviation from planned scope, every workaround applied to a defective host surface, and the exclusion of any calculator under unresolved dispute
  - Observable: every numeric claim in the report is traceable to a field in the evidence bundle
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 3.6, 6.5_
  - _Depends: 11.1, 11.2, 11.3_

- [ ] 12.2 Record the per-question verdicts and the overall recommendation
  - Report a separate pass or fail for each gating question with its supporting figures, and one overall recommendation naming the findings that drove it
  - Apply the stop conditions: report no-go if the existing state model cannot be driven without internal modification or more than one working day is spent attempting it; if a policy cannot be expressed without modifying the calculator; or if the cohort requires per-patient hand mapping
  - Treat a no-go as a complete and successful outcome; do not expand scope to convert it into a go, and do not begin work outside this spec on the basis of a go
  - Observable: the report carries three question verdicts, one overall recommendation, and an explicit statement of which stop conditions were and were not triggered
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - _Depends: 12.1_
