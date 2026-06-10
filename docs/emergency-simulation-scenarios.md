# Emergency Simulation Scenarios

## Goal

Turn emergency department operations into training scenarios so teams can rehearse real pressure patterns, bottlenecks, handoffs, and escalation decisions inside the Emergency Workspace.

## Scenario Library

The initial scenario library includes:

- `massCasualty`: many simultaneous arrivals with triage, rooming, staffing, EMS, and resource pressure.
- `sepsisSurge`: clustered high-risk infection presentations requiring rapid reassessment, provider review, labs, and disposition coordination.
- `strokeSurge`: multiple time-sensitive neurologic presentations competing for triage, imaging, specialist referral, and transfer workflows.
- `emsOverload`: inbound ambulances, clustered ETAs, waiting handoffs, and rising offload delays.
- `boardingCrisis`: admitted patients remain in the ED long enough to block rooms, stretchers, provider flow, and EMS offload.

Each scenario should train operational recognition, coordination, escalation, and recovery, not only individual clinical decision-making.

## Scenario Inputs

Emergency simulation scenarios should use the same operating signals as the live Emergency Workspace:

- Patient arrivals and arrival mode.
- Triage queue growth.
- Waiting room pressure.
- Door-to-doctor delay.
- Boarding time and pending beds.
- EMS offload delay.
- Resource availability.
- Referral delay.
- Escalation recommendations.

Using shared signals keeps training aligned with the real operational problems staff see during active ED shifts.

## Scenario Flow

Each scenario should define:

- `scenarioId`: stable scenario identifier.
- `scenarioName`: user-facing scenario title.
- `triggerPattern`: operational pattern that starts the scenario.
- `pressureSignals`: queues, KPIs, resources, and escalations affected by the scenario.
- `expectedActions`: reviewable operational actions trainees should consider.
- `successCriteria`: measurable recovery, stabilization, or escalation outcomes.
- `debriefMetrics`: KPIs and decisions reviewed after the scenario.

Scenarios should be deterministic enough for repeatable training and flexible enough to vary arrivals, acuity mix, resource shortages, and downstream constraints.

## Emergency Workspace Integration

The simulation layer integrates with the Emergency Workspace by reusing:

- Patient Journey Engine states.
- Emergency KPI Layer metrics.
- Waiting Room Intelligence.
- EMS Offload Command Center.
- Emergency Resource Board.
- Emergency Escalation Engine.
- Boarding and referral intelligence surfaces.

Scenario mode should clearly label simulated data so users do not confuse training activity with live operations.

## Training Outputs

Each run should produce:

- Scenario timeline.
- Operational decisions made.
- Missed or delayed escalations.
- KPI movement during the scenario.
- Queue and bottleneck changes.
- Resource constraints encountered.
- Debrief summary with recommended improvement areas.

These outputs help leaders connect training performance to real ED operating risks.

## Acceptance Mapping

Acceptance is met when mass casualty, sepsis surge, stroke surge, EMS overload, and boarding crisis scenarios mirror real Emergency Workspace operational problems and can be used for training without creating separate workflow logic.
