# Emergency Escalation Engine

## Goal

Identify operational risk early so emergency department leaders can respond before pressure becomes a safety, throughput, or capacity failure.

## Escalation Triggers

The Emergency Escalation Engine watches five primary triggers:

- `capacityOverload`: census, occupied spaces, waiting room load, or resource constraints exceed the configured operating threshold.
- `boardingOverload`: admitted patients remain in the ED long enough to block rooms, stretchers, provider flow, or EMS offload.
- `emsCongestion`: incoming ambulances, clustered ETAs, waiting handoffs, or offload delays exceed the operational threshold.
- `highRiskQueueGrowth`: high-risk waiting, triage, provider, or reassessment queues grow faster than staff can review them.
- `criticalDeviceOutage`: monitors, telemetry units, infusion pumps, or other critical operational devices are unavailable or out of service during active demand.

Each trigger should include severity, affected area, current value, threshold, trend, and the source signal that caused escalation.

## Escalation Recommendations

The engine generates reviewable escalation recommendations for charge nurses, ED leadership, operations teams, and command center users.

Recommendations should include:

- `trigger`: the condition that caused escalation.
- `severity`: awareness, urgent, or critical.
- `affectedWorkflow`: capacity, boarding, EMS, waiting room, provider queue, or resource availability.
- `reason`: plain-language explanation of the risk.
- `recommendedAction`: suggested operational review or coordination step.
- `supportingSignals`: relevant metrics from capacity, queues, EMS, resources, or device status.

Examples include opening capacity review, prioritizing boarding coordination, reviewing EMS offload backlog, reassessing high-risk waiting patients, or resolving a critical device outage.

## Risk Evaluation

Operational risk should rise when:

- Multiple triggers are active at the same time.
- A trigger remains active across consecutive time windows.
- Pressure is worsening rather than stable.
- High-risk patient queues are growing during capacity or EMS pressure.
- A critical device outage affects resources needed for active or incoming patients.

The engine should make early escalation visible without automating clinical decisions, changing acuity, assigning staff, admitting patients, discharging patients, or controlling devices.

## Emergency Workspace Integration

The Emergency Escalation Engine consumes signals from:

- Emergency Capacity Intelligence.
- Boarding Intelligence.
- EMS Offload Command Center.
- Emergency Queue Intelligence.
- Waiting Room Intelligence.
- Emergency Resource Board.

Escalations should be available to the Emergency Workspace dashboard, leadership surfaces, and operational command center views.

## Acceptance Mapping

Acceptance is met when capacity overload, boarding overload, EMS congestion, high-risk queue growth, and critical device outage are surfaced early with clear escalation recommendations.
