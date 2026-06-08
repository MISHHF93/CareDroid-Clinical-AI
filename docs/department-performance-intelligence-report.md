# Department Performance Intelligence Report

## Goal

Department performance intelligence gives every department measurable platform outcomes. The report turns platform usage, workflow progress, readiness, uptime, and operational workload signals into a department health score.

## Route

Department intelligence is available at `/department-intelligence`.

## Department Outcomes

Emergency outcomes measure clinical operating readiness:

- Workflow adoption
- Calculator utilization
- Simulation readiness

Laboratory outcomes measure diagnostic throughput and interpretation support:

- Turnaround metrics
- Interpretation utilization

Operations outcomes measure infrastructure and fleet reliability:

- Asset uptime
- Maintenance workload

Additional departments can be added by registering outcome metrics with a score, trend, target, and evidence source.

## Health Score

Each department receives a `Department Health Score` from 0 to 100.

The score is the rounded average of outcome metric scores. Each metric remains explainable and includes:

- `label`: user-facing metric name.
- `value`: current measured value.
- `target`: expected operating target.
- `score`: normalized 0 to 100 outcome score.
- `trend`: improving, steady, or attention.
- `source`: platform signal family that produced the metric.

Health bands:

- 85-100: strong
- 70-84: stable
- 50-69: watch
- 0-49: attention

## Initial Signal Contract

The first implementation uses platform-safe aggregate signals from existing frontend models and fixture-backed operating data:

- Workflow adoption: completed or launched workflow blocks divided by expected workflow coverage.
- Calculator utilization: calculator usage compared with expected department demand.
- Simulation readiness: completed simulation readiness against target readiness.
- Turnaround metrics: lab turnaround performance against target minutes.
- Interpretation utilization: diagnostic interpretation assistant usage against expected volume.
- Asset uptime: uptime percentage for operational assets and devices.
- Maintenance workload: open maintenance workload against target capacity.

No patient identifiers, MRNs, clinical notes, or free-text diagnostic content are stored in department performance intelligence.

## Generated Views

The `/department-intelligence` page should generate:

- Overall department health score cards.
- Metric-level outcome cards for each department.
- Outcome highlights for strong metrics.
- Attention items for departments below target.

## Acceptance

Every department represented in the intelligence model has measurable platform outcomes, at least one health score, and evidence-backed metric rows that can drive operational decisions.

## Verification

Verification should cover:

- The data model calculates department health scores from measurable outcomes.
- Emergency, Laboratory, and Operations expose the requested example metrics.
- `/department-intelligence` renders all department cards and metric rows.
- Route, navigation, and smoke tests include the new page.
