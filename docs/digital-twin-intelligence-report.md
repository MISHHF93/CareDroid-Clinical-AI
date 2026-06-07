# Digital Twin Intelligence Report

## Summary

Digital Twin Intelligence turns Hospital Map, Fleet, and Medical IoT signals into a smart operational twin. It combines rooms, devices, assets, telemetry, alerts, occupancy, and maintenance into predictive health, risk, and readiness scores.

The first implementation is an operational decision-support layer. It does not make autonomous dispatch, staffing, admission, discharge, clinical triage, or treatment decisions.

## Tracked Signals

| Signal | Source |
| --- | --- |
| Rooms | Hospital Map room, bed, floor, and unit snapshots |
| Devices | Hospital Map device inventory and Medical IoT devices |
| Assets | Digital Twin operational surfaces, devices, vehicles, and route-linked assets |
| Telemetry | Device freshness, vitals, trends, connectivity, and fleet location state |
| Alerts | Hospital Map, Medical IoT, and Fleet alerts |
| Occupancy | Bed occupancy, occupied rooms, critical beds, and floor pressure |
| Maintenance | Device maintenance status, calibration state, fleet service state, and stale/offline assets |

## Generated Scores

| Score | Purpose |
| --- | --- |
| Health Score | Shows current operational health across rooms, devices, telemetry, alerts, and fleet status |
| Risk Score | Highlights likelihood of operational degradation from occupancy, stale telemetry, active alerts, and maintenance risk |
| Readiness Score | Measures whether rooms, devices, fleet, and operational assets are ready for use |

Every score includes explainable contributing factors so operations teams can understand why the twin is healthy, degraded, or blocked.

## Predictive Behaviors

The intelligence layer surfaces:

- Rooms with concentrated alerts, high occupancy pressure, or stale device telemetry.
- Devices that are offline, stale, low battery, overdue for calibration, or due for maintenance.
- Fleet assets with delayed routes, low energy, high utilization, or maintenance warnings.
- Occupancy pressure that may require human capacity review.
- Readiness blockers that should be reviewed before they become incidents.

## Route

The intelligence surface is available at:

`/digital-twin-intelligence`

## Acceptance

Acceptance is met when operations teams can open `/digital-twin-intelligence` and see predictive health, risk, and readiness scores generated from Hospital Map, Fleet, and IoT signals, making operations proactive rather than reactive.
