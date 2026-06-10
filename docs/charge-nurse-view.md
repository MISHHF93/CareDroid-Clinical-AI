# Charge Nurse View

## Goal

Create an operational nurse dashboard for the Emergency OS at `/workspace/emergency/charge-nurse`.

The Charge Nurse View gives charge nurses actionable visibility into the operational state of the department:

- Waiting patients.
- Reassessment queue.
- Room availability.
- Critical alerts.
- Device availability.

This dashboard is for shift-level coordination. It should show what needs review now, what is blocking flow, and where staff should look next. It does not make clinical decisions, change acuity, assign staff, place patients, control devices, or autonomously escalate.

## Route

- Route: `/workspace/emergency/charge-nurse`
- Workspace: Emergency
- Audience: Charge nurses, triage nurses, flow coordinators, ED operations leads
- Mode: Operational nurse dashboard
- Data posture: demo/local first, live queue/resource/device feeds later

## Charge Nurse Dashboard Contract

```js
export const ChargeNurseView = Object.freeze({
  route: '/workspace/emergency/charge-nurse',
  title: 'Charge Nurse View',
  purpose: 'Give charge nurses actionable operational visibility.',
  summaryWindow: 'current shift',
  requiredSignals: [
    'waitingPatients',
    'reassessmentQueue',
    'roomAvailability',
    'criticalAlerts',
    'deviceAvailability',
  ],
});
```

Each operational signal must use this shape:

```js
{
  signalId: string,
  label: string,
  value: number | string,
  unit: 'patients' | 'rooms' | 'devices' | 'minutes' | 'status',
  status: 'normal' | 'busy' | 'critical',
  priority: 'routine' | 'urgent' | 'critical',
  trend: 'improving' | 'stable' | 'worsening',
  recommendedAction: string,
  source: string,
  primaryDrilldownRoute: string,
}
```

## Required Operational Signals

| Signal | What It Answers | Source | Drilldown |
| --- | --- | --- | --- |
| Waiting Patients | How many patients are waiting, who has waited longest, and whether pressure is normal, busy, or critical? | Waiting Room Intelligence, queue intelligence, patient journey states | `/workspace/emergency/waiting-room` |
| Reassessment Queue | Which patients need repeat vitals, acuity review, symptom review, or clinician reassessment? | `ReassessmentQueue`, Waiting Room Intelligence | `/workspace/emergency/waiting-room` |
| Room Availability | Which ED rooms or stretchers are available, occupied, or out of service? | Emergency Resource Board, capacity signals | `/workspace/emergency/resources` |
| Critical Alerts | Which operational or patient-flow alerts need immediate review? | Emergency Escalation Engine, critical alert queue, high-risk queue | `/workspace/emergency/escalations` |
| Device Availability | Are monitors, telemetry units, or infusion pumps available for active and incoming patients? | Emergency Resource Board, device status, Medical IoT expansion signals | `/workspace/emergency/resources` |

## Operational Summary Model

The top of the dashboard should provide a shift-level operating summary:

```js
{
  operatingState: 'normal' | 'busy' | 'critical',
  headline: string,
  reason: string,
  mostUrgentQueue: string,
  immediateAction: string,
  blockedFlowReason: string | null,
  lastUpdated: string,
  sourceState: 'demo' | 'manual' | 'live' | 'mixed' | 'stale',
}
```

Example:

```js
{
  operatingState: 'busy',
  headline: 'Waiting room and reassessment queues need active review.',
  reason: 'Oldest wait is over target and three patients are due for reassessment.',
  mostUrgentQueue: 'reassessmentQueue',
  immediateAction: 'Review urgent reassessment items and confirm room readiness.',
  blockedFlowReason: 'Two rooms are occupied and one monitor is out of service.',
  lastUpdated: 'current shift',
  sourceState: 'demo',
}
```

## Layout

The charge nurse should see operational priorities in this order:

1. Current operating state.
2. Waiting patients and oldest wait.
3. Reassessment queue.
4. Room availability.
5. Critical alerts.
6. Device availability.
7. Next operational action.

Minimum layout:

| Section | Purpose |
| --- | --- |
| Shift Status Banner | One-line state: normal, busy, or critical. |
| Waiting Patients Card | Count, oldest wait, median wait, waiting room health state, and bottleneck reason. |
| Reassessment Queue Card | Count by priority, oldest reassessment need, trigger reason, and review action. |
| Room Availability Card | Available, occupied, and out-of-service rooms/stretchers. |
| Critical Alerts Card | Active critical alerts, severity, affected workflow, and recommended review. |
| Device Availability Card | Monitor, telemetry unit, and infusion pump availability and shortages. |
| Action Strip | The next 1-3 human-reviewed operational actions. |

## Card Requirements

Each card must be actionable without requiring deep navigation.

Required fields:

- Current count or status.
- Oldest or highest-priority item.
- Trend.
- Bottleneck or trigger reason.
- Recommended action.
- Drilldown route.
- Source state label.

Cards should support deep links, but the charge nurse should understand the operating state from the top-level dashboard.

## Action Rules

Recommended actions must be human-reviewed operational prompts, such as:

- Review patients overdue for reassessment.
- Confirm room cleaning or readiness status.
- Review critical alert details.
- Check monitor or telemetry availability before rooming the next patient.
- Coordinate with provider, triage, EMS, or operations lead.

Recommended actions must not:

- Change acuity.
- Diagnose a patient.
- Assign a nurse or provider.
- Move a patient automatically.
- Control or reserve a device automatically.
- Trigger diversion, admission, discharge, or escalation without human review.

## Threshold Guidance

Initial demo thresholds:

| Signal | Normal | Busy | Critical |
| --- | --- | --- | --- |
| Waiting Patients | Count and waits within target | Count, oldest wait, or reassessment need rising | Multiple waits over target or high-risk waiting patient delayed |
| Reassessment Queue | No urgent reassessments overdue | Any urgent reassessment due or queue growing | Critical reassessment overdue or high-risk queue growth |
| Room Availability | Rooms/stretchers available | Availability nearing threshold | No appropriate room/stretchers available for demand |
| Critical Alerts | No unresolved critical alert | Active urgent alert | Critical alert with capacity, EMS, device, or high-risk patient impact |
| Device Availability | Devices available by type | Shortage risk for monitors, telemetry, or pumps | Critical device outage affecting active or incoming patients |

Thresholds should become configurable after live customer validation.

## Data Rules

- Waiting patient data comes from Waiting Room Intelligence and Emergency Queue Intelligence.
- Reassessment queue data comes from `ReassessmentQueue`.
- Room and device availability come from Emergency Resource Board.
- Critical alert data comes from Emergency Escalation Engine and high-risk queue signals.
- Device availability can start from demo/manual resource status and later upgrade to Medical IoT feeds.
- All source state must be labeled as demo, manual, live, mixed, stale, or unavailable.
- Do not calculate conflicting local definitions for waiting pressure, reassessment need, or resource availability.

## Non-Goals

- No autonomous triage.
- No autonomous reassessment.
- No autonomous patient movement or room assignment.
- No autonomous staffing decisions.
- No device control or automatic device reservation.
- No hospital-wide operations dashboard beyond ED charge nurse visibility.

## Acceptance

Charge nurse has actionable operational visibility.

The `/workspace/emergency/charge-nurse` dashboard standardizes waiting patients, reassessment queue, room availability, critical alerts, and device availability into a single operational nurse view.
