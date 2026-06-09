# Boarding Intelligence Engine Report

## Goal

Boarding Intelligence Engine tracks admitted Emergency Department patients waiting for inpatient beds. It makes boarding visible, measurable, and actionable for charge nurses, ED leaders, hospital operations, and bed management teams.

## Monitored Signals

The engine monitors:

- `boardingCount`: admitted patients still occupying ED capacity.
- `boardingTime`: average or median boarding duration in minutes.
- `longestBoarders`: patients with the longest bed waits.
- `pendingBeds`: inpatient beds needed or awaiting assignment.
- `bedPressure`: current operational pressure from bed availability and admitted-patient backlog.

## Boarding Risk Score

The Boarding Risk Score is a deterministic 0 to 100 score. Higher scores mean more severe boarding pressure. The score weighs boarding count, average boarding time, longest boarder wait, pending beds, and bed pressure.

## Dashboard Route

The dashboard is mounted at:

`/workspace/emergency/boarding`

The dashboard should show the risk score, boarding count, boarding time, longest boarders, pending beds, bed pressure, and recommended operational actions.

## Acceptance Mapping

Acceptance is met when boarding is visible and measurable through the Emergency Workspace pipeline and `/workspace/emergency/boarding` dashboard.
