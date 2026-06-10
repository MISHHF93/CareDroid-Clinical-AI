# Emergency KPI Layer

## Goal

Centralize emergency department KPIs so dashboards, recommendations, reports, and leadership surfaces all read operational metrics from one source of truth.

## EmergencyKPILayer

`EmergencyKPILayer` is the canonical metric source for the Emergency Workspace. It normalizes raw patient journey events, queue timestamps, EMS handoff events, referral activity, boarding state, and discharge milestones into consistent KPI outputs.

The layer should provide:

- One definition per KPI.
- One calculation path per KPI.
- Consistent units, thresholds, trend windows, and target compliance logic.
- Shared summaries for dashboards, escalation rules, and leadership reporting.
- Source metadata that explains which events or services produced each metric.

## Centralized Metrics

`EmergencyKPILayer` owns these metrics:

- `doorToDoctor`: time from patient arrival to provider assessment.
- `lengthOfStay`: time from patient arrival to ED discharge, admission transfer, or encounter closure.
- `boardingTime`: time admitted patients remain in the ED while waiting for inpatient bed placement or handoff.
- `emsOffload`: time from ambulance arrival to completed ED handoff.
- `referralDelay`: time from referral need or referral creation to referral acceptance, completion, or handoff.
- `dischargeTime`: time from disposition decision to completed discharge workflow.

Each metric should support current value, median, 90th percentile, longest active duration, trend direction, and target compliance when the source data is available.

## Source Mapping

The KPI layer consumes signals from:

- Patient Journey Engine for arrival, assessment, disposition, admission, discharge, and follow-up states.
- Door-to-Doctor Intelligence for provider assessment timing.
- Boarding Intelligence for boarding count and boarding duration.
- EMS Offload Command Center for ambulance arrival and handoff completion.
- Referral Intelligence Network for referral creation, routing, acceptance, and completion timing.
- Emergency Queue Intelligence for active queue age and throughput context.

Dashboards should not recalculate these KPIs locally. They should request KPI summaries from `EmergencyKPILayer` and render the returned values with clear source state.

## KPI Output Contract

Each KPI result should include:

- `metricId`: canonical metric identifier.
- `label`: display name.
- `value`: current numeric value.
- `unit`: minutes, hours, count, or percentage.
- `summaryWindow`: time range used for the calculation.
- `target`: operational target when configured.
- `targetCompliance`: percentage or status against target.
- `trend`: improving, stable, or worsening.
- `sourceSignals`: events, queues, or services used for the calculation.
- `dataState`: live, demo, manual, stale, unavailable, or mixed.

## Dashboard Integration

The KPI layer should feed:

- Emergency command center summaries.
- Throughput and waiting room dashboards.
- Boarding, EMS, referral, resource, and discharge views.
- Escalation recommendations.
- Leadership reporting and operational review surfaces.

This keeps Door-to-Doctor, Length of Stay, Boarding Time, EMS Offload, Referral Delay, and Discharge Time consistent across the product.

## Acceptance Mapping

Acceptance is met when all listed emergency metrics originate from `EmergencyKPILayer` and downstream dashboards consume the shared KPI contract instead of maintaining separate local calculations.
