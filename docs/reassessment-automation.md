# Reassessment Automation

## Goal

Detect patients who have been waiting too long or whose risk profile has risen while they remain in the emergency department waiting room. Reassessment Automation keeps patients visible until they are reviewed, escalated, or moved forward in the patient journey.

## Trigger Rules

Reassessment Automation creates a reassessment recommendation when either rule is true:

- Waiting threshold exceeded: a patient has waited longer than the allowed reassessment interval for their acuity, complaint, age, or operational risk state.
- Risk score elevated: a patient's risk score rises above the configured threshold or enters a higher-risk band while they are still waiting.

The rules may trigger independently. A patient who exceeds both the waiting threshold and risk score threshold should be prioritized higher in the queue.

## ReassessmentQueue

`ReassessmentQueue` is the canonical queue of patients who need repeat review before they continue waiting.

Each queue item should include:

- `patientId`: stable patient or encounter identifier.
- `currentLocation`: waiting room, triage queue, provider queue, or other ED holding state.
- `waitDuration`: current wait duration in minutes.
- `riskScore`: current deterministic risk score.
- `triggerReason`: waiting threshold exceeded, risk score elevated, or both.
- `priority`: normal, urgent, or critical reassessment priority.
- `lastAssessmentTime`: the last triage, vitals, reassessment, or clinician review timestamp.
- `recommendedAction`: clinician-reviewable reassessment recommendation.

## Recommendation Output

The recommendation should tell staff why the patient needs review:

- How long the patient has been waiting.
- Which threshold was exceeded.
- What risk signal changed.
- Whether the patient has stale vitals, stale triage context, or worsening risk.
- What action should be reviewed next.

This output is operational guidance only. It does not change acuity, diagnose the patient, or replace clinician reassessment.

## Queue Behavior

Patients enter `ReassessmentQueue` when a trigger rule is met.

Patients leave `ReassessmentQueue` when:

- A clinician completes reassessment.
- The patient moves to provider assessment.
- The patient is escalated out of the waiting room.
- The encounter is closed or the patient is no longer active in the ED workflow.

Queue priority should increase when wait duration continues to grow, risk score rises, or the waiting room enters a Busy or Critical state.

## Emergency Workspace Integration

Reassessment Automation feeds:

- Waiting Room Intelligence reassessment-needed counts.
- Emergency Queue Intelligence bottleneck and oldest-patient signals.
- Patient Journey Engine Reassessment state transitions.
- Leadership and charge nurse review surfaces.

The automation should be visible from the waiting room dashboard and any emergency command center view that summarizes active patient safety pressure.

## Acceptance Mapping

Acceptance is met when patients who wait too long or develop elevated risk are automatically placed into `ReassessmentQueue` with a clear reassessment recommendation, so patients do not disappear into the waiting room.
