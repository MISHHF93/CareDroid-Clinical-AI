# Emergency Demo Environment

## Goal

Create a realistic emergency department demo tenant that lets prospects experience the ED operating system without EHR, ADT, EMS CAD, telemetry, bed-management, referral, or analytics integrations.

Everything in the environment must be clearly labeled as demo data.

## Demo Tenant

The demo environment should represent a busy emergency department with realistic operational pressure:

- Tenant name: CareDroid Emergency Demo Hospital.
- Workspace: Emergency.
- Data posture: deterministic demo data only.
- Integration posture: no live patient identity, no live EHR writeback, no live ADT, no live EMS feed, no live device telemetry, and no live bed-management feed.
- Safety posture: all patients, queues, alerts, recommendations, and analytics are sample data for product evaluation.

## Demo Population

The tenant should include 100+ demo patients distributed across the ED journey:

- Waiting room patients.
- Triage queue patients.
- Provider queue patients.
- Active assessment patients.
- Results-pending patients.
- Referral-pending patients.
- Boarding patients.
- Discharge-ready patients.
- EMS pre-arrival and offload patients.

Patients should include realistic variation in acuity, arrival mode, complaint, age band, wait duration, risk score, reassessment need, and disposition state.

## Operational Data

The demo tenant should include:

- Queues: waiting room, triage, provider, results, referral, admission, discharge, and reassessment queues.
- Boarding: admitted patients occupying ED capacity while waiting for inpatient beds or handoff.
- EMS arrivals: inbound ambulances, ETAs, waiting handoffs, and offload delays.
- Referrals: pending specialty, transfer, social work, and care coordination referrals.
- Capacity issues: crowded waiting room, limited rooms, occupied stretchers, unavailable monitors, boarding pressure, and discharge bottlenecks.

This data should create a believable ED operating picture without implying live hospital activity.

## Demo Pressure Scenarios

The environment should support common prospect walkthroughs:

- Normal weekday pressure with visible but controlled throughput.
- Busy waiting room with reassessment needs.
- EMS congestion with clustered arrivals and offload delay.
- Boarding crisis with blocked rooms and stretchers.
- Referral delay affecting disposition and length of stay.
- Capacity overload with resource constraints and escalation recommendations.

Each scenario should be reversible or resettable so demos remain predictable.

## Demo Labels

Every demo object and surface should show clear source-state language:

- `Demo data`
- `Demo tenant`
- `No live integration`
- `Sample patient`
- `Simulated operational signal`

The UI must avoid presenting demo patients, alerts, queues, device status, EMS arrivals, recommendations, KPIs, or outcomes as live clinical or operational truth.

## Emergency Workspace Coverage

The demo environment should populate:

- Emergency command center.
- Door-to-Doctor throughput dashboard.
- Waiting room dashboard.
- Reassessment queue.
- EMS Offload Command Center.
- Emergency Resource Board.
- Boarding and referral intelligence views.
- Emergency KPI Layer summaries.
- Emergency Escalation Engine recommendations.
- Emergency simulation scenarios.

Prospects should be able to navigate the ED OS and see how operational signals connect across dashboards without requiring integrations.

## Acceptance Mapping

Acceptance is met when prospects can enter the Emergency demo tenant, see 100+ clearly labeled demo patients, experience queues, boarding, EMS arrivals, referrals, and capacity issues, and understand the ED operating system without any live integrations.
