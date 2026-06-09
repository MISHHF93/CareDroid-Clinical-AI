# Emergency Capacity Intelligence Report

## Goal

Emergency Capacity Intelligence helps staff understand department pressure instantly. It turns census, space utilization, boarding, admission pressure, EMS arrivals, and discharge readiness into a single capacity score and clear risk level.

## Tracked Signals

The Emergency Workspace tracks:

- `currentCensus`: patients currently occupying or waiting inside the ED operating model.
- `occupiedSpaces`: treatment, hallway, observation, and boarding spaces in use.
- `availableSpaces`: spaces ready for incoming or waiting patients.
- `pendingAdmissions`: admitted patients waiting for inpatient handoff or beds.
- `boardingPatients`: admitted patients still occupying ED capacity.
- `emsArrivals`: inbound EMS patients expected soon.
- `dischargeCandidates`: patients likely to release ED capacity after review.

## Capacity Score

The capacity score is a deterministic operational pressure score from 0 to 100. Higher scores mean greater ED pressure. The score considers space occupancy, boarding load, pending admissions, EMS arrivals, and discharge relief.

## Risk Levels

Capacity score maps to:

- `Green`: normal capacity posture.
- `Yellow`: rising pressure requiring awareness.
- `Orange`: constrained capacity requiring active coordination.
- `Red`: severe pressure requiring immediate operations review.

## Dashboard Route

The dashboard is mounted at:

`/workspace/emergency/capacity`

The route stays inside the existing Emergency Workspace and should show the pressure inputs, score, risk level, and recommended operational actions.

## Acceptance Mapping

Acceptance is met when staff can open `/workspace/emergency/capacity` and immediately see the department capacity score, risk level, core pressure signals, and recommended actions for capacity relief.
