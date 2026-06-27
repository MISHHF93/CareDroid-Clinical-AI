# Door-to-Doctor Intelligence

## Goal

Measure the patient journey from ED arrival to provider assessment so leadership can monitor throughput, identify delays, and intervene before wait pressure becomes unsafe.

## Journey Checkpoints

Door-to-Doctor Intelligence tracks three required timestamps:

- `arrivalTime`: when the patient enters the emergency department operating model.
- `triageTime`: when the patient completes triage or is clinically sorted into the triage queue.
- `providerTime`: when a provider begins assessment.

These timestamps align with the Patient Journey Engine states of Arrival, Triage, Waiting, and Assessment.

## Door-to-Doctor KPI

The primary KPI is:

`doorToDoctorMinutes = providerTime - arrivalTime`

Supporting intervals:

- `doorToTriageMinutes = triageTime - arrivalTime`
- `triageToProviderMinutes = providerTime - triageTime`

The KPI should be summarized by current median, 90th percentile, longest active wait, and target compliance.

## Delay Detection

The engine flags delay when:

- Door-to-triage time exceeds the operational target.
- Triage-to-provider time exceeds the operational target.
- Door-to-doctor time exceeds the leadership target.
- The oldest waiting patient is approaching or exceeding the target.
- High-acuity patients are waiting longer than lower-acuity patients.

Delay output should include the affected interval, patient or cohort count, severity, and recommended review action.

## Bottleneck Detection

Bottlenecks are detected by comparing the three timestamps with queue state and throughput:

- Arrival bottleneck: arrivals are outpacing registration or initial intake.
- Triage bottleneck: patients are arriving faster than triage can complete.
- Provider bottleneck: triaged patients are waiting too long for assessment.
- Downstream bottleneck: provider assessment is slowed by bed, room, boarding, or capacity pressure.

The dashboard should show which interval is creating the longest delay and whether pressure is rising, stable, or improving.

## Staffing Pressure

Staffing pressure is inferred from active demand and completion pace:

- Rising arrivals with flat or declining triage completions indicate triage staffing pressure.
- Rising triage queue age with flat provider starts indicates provider staffing pressure.
- Increasing door-to-doctor minutes during high census or boarding indicates department-wide pressure.
- Repeated target misses across consecutive time windows indicate sustained staffing strain.

The output is operational guidance only. It does not assign staff, alter clinical priority, or make clinical decisions.

## Current Product Route

Door-to-Doctor signals are not mounted as a standalone workspace page in the current Emergency OS route tree. Demonstrate them through:

- `/emergency/analytics` for operational KPI summaries and trends.
- `/emergency/queues` and `/emergency/reassessment` for queue age, reassessment pressure, and delay context.
- `/emergency/whiteboard` for the primary patient-flow operating picture.

The dashboard should show:

- Current Door-to-Doctor KPI.
- Door-to-triage and triage-to-provider interval trends.
- Active delays and oldest waiting patient.
- Bottleneck source and severity.
- Staffing pressure signal by triage, provider, or department-wide pressure.
- Recommended leadership action.

## Acceptance Mapping

Acceptance is met when leadership can use the mounted Emergency OS routes above to monitor ED throughput using arrival time, triage time, provider time, Door-to-Doctor KPI, delay detection, bottleneck detection, and staffing pressure signals.
