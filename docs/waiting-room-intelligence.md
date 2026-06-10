# Waiting Room Intelligence

## Goal

Treat the waiting room as a managed emergency department queue instead of a passive holding area. Waiting Room Intelligence makes waiting room pressure visible by tracking volume, wait duration, risk, and reassessment needs before patients deteriorate or delays cascade downstream.

## Tracked Signals

Waiting Room Intelligence tracks:

- `waitDuration`: how long each patient has been waiting since arrival, triage, or the most recent review checkpoint.
- `patientCount`: active patients currently assigned to the waiting room.
- `riskLevel`: operational and clinical risk posture for the queue.
- `reassessmentNeed`: patients who need repeat vitals, acuity review, symptom review, or escalation.

These signals align with the Patient Journey Engine states of Arrival, Triage, Waiting, and Assessment.

## Waiting Room Health Score

The primary output is the Waiting Room Health Score, a deterministic score from 0 to 100. Higher scores mean greater waiting room pressure.

The score considers:

- Current patient count against expected waiting room capacity.
- Median and oldest-patient wait duration.
- Number of patients with elevated risk.
- Number of patients due or overdue for reassessment.
- Recent trend in arrivals, triage completions, and provider starts.

## Risk States

Waiting Room Health Score maps to three risk states:

- `Normal`: waiting room pressure is within expected operating range.
- `Busy`: wait times, patient count, or reassessment needs are rising and require active awareness.
- `Critical`: waiting room pressure is unsafe or rapidly worsening and requires immediate operations review.

## Reassessment Detection

The engine flags reassessment need when:

- A patient has waited longer than the reassessment interval for their acuity level.
- A high-risk patient remains in the waiting room without recent review.
- Wait duration is rising faster than triage or provider throughput.
- A patient has a complaint, age, or risk profile that requires closer observation.
- The waiting room risk state is Busy or Critical and active patients have stale review timestamps.

The output should include the patient or cohort count, reason for reassessment, urgency, and recommended review action.

## Queue Management

The waiting room dashboard should help charge nurses and leadership answer:

- How many patients are waiting now?
- How long have they waited?
- Which patients need reassessment?
- Is pressure normal, busy, or critical?
- Is the waiting room bottleneck caused by triage, provider capacity, rooms, or downstream boarding?

This is operational guidance only. It does not change acuity, assign staff, make clinical decisions, or replace clinician reassessment.

## Dashboard Route

The Waiting Room Intelligence dashboard is mounted at:

`/workspace/emergency/waiting-room`

The dashboard should show:

- Waiting Room Health Score.
- Risk state: Normal, Busy, or Critical.
- Active patient count.
- Median wait and oldest active wait.
- Reassessment-needed list or count.
- Bottleneck source and recommended action.

## Acceptance Mapping

Acceptance is met when staff can open `/workspace/emergency/waiting-room` and immediately see waiting room pressure through patient count, wait duration, risk state, reassessment need, and the Waiting Room Health Score.
