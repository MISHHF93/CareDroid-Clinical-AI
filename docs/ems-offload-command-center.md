# EMS Offload Command Center

## Goal

Track EMS arrivals and ED handoffs so ambulance pressure becomes measurable before it creates unsafe delays for incoming patients, waiting crews, and department capacity.

## Monitored Signals

The EMS Offload Command Center monitors:

- `incomingAmbulances`: active inbound EMS units expected to arrive at the emergency department.
- `arrivalEta`: estimated arrival time for each inbound ambulance or patient.
- `waitingHandoffs`: EMS arrivals that have reached the ED but are still waiting for handoff completion.
- `offloadDelays`: time between ambulance arrival and completed ED handoff.

These signals connect EMS pre-arrival context with the Patient Journey Engine arrival state and Emergency Capacity Intelligence.

## EMS Pressure Model

EMS pressure is measured by combining inbound demand, arrival timing, handoff backlog, and offload delay:

- Rising incoming ambulances indicate near-term arrival pressure.
- Short or clustered ETAs indicate imminent surge pressure.
- Waiting handoffs indicate ED intake or rooming constraints.
- Increasing offload delays indicate ambulance turnaround pressure and reduced community EMS availability.

The command center should show whether EMS pressure is normal, rising, or critical, and whether the primary constraint is inbound volume, handoff capacity, treatment space, or downstream boarding.

## Handoff Tracking

Each EMS handoff item should include:

- `unitId`: ambulance, crew, or source identifier when available.
- `patientId`: encounter or pre-arrival case identifier.
- `eta`: expected arrival time before arrival.
- `arrivalTime`: actual ED arrival time.
- `handoffStartTime`: when ED handoff begins.
- `handoffCompleteTime`: when ED handoff is complete.
- `offloadDelayMinutes`: elapsed time from arrival to handoff completion.
- `status`: inbound, arrived, waiting handoff, handoff in progress, or offloaded.

Handoff data should remain operational and reviewable. It does not diagnose, assign final acuity, place orders, admit patients, or replace clinician-to-clinician handoff.

## Dashboard Route

The EMS Offload Command Center is mounted at:

`/workspace/emergency/ems`

The dashboard should show:

- Incoming ambulance count.
- Arrival ETA timeline.
- Waiting handoff count.
- Current and longest offload delay.
- Handoff status by EMS unit or case.
- EMS pressure state and recommended operational action.

## Acceptance Mapping

Acceptance is met when staff can open `/workspace/emergency/ems` and measure EMS pressure using incoming ambulances, arrival ETA, waiting handoffs, and offload delays.
