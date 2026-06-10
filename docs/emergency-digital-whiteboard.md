# Emergency Digital Whiteboard

## Goal

Create a modern ED tracking board at `/workspace/emergency/whiteboard`.

The Emergency Digital Whiteboard gives ED staff a visual view of patient flow across the active department journey:

- Arrival.
- Triage.
- Waiting.
- Assessment.
- Orders.
- Results.
- Disposition.

The board is a visual operating surface. It helps staff see where patients are, what is delayed, which items need review, and where flow is blocked. It does not make clinical decisions, change acuity, place orders, move patients, admit, discharge, refer, or escalate without human review.

## Route

- Route: `/workspace/emergency/whiteboard`
- Workspace: Emergency
- Audience: Charge nurses, triage nurses, ED physicians, flow coordinators, operations leads
- Mode: Visual patient-flow tracking board
- Data posture: demo/local first, live ADT/EHR/queue feeds later

## Whiteboard Contract

```js
export const EmergencyDigitalWhiteboard = Object.freeze({
  route: '/workspace/emergency/whiteboard',
  title: 'Emergency Digital Whiteboard',
  purpose: 'Track patient flow visually across ED journey columns.',
  columns: [
    'arrival',
    'triage',
    'waiting',
    'assessment',
    'orders',
    'results',
    'disposition',
  ],
  features: ['filters', 'search', 'statusIndicators', 'alerts'],
});
```

Each patient card must use this shape:

```js
{
  patientId: string,
  displayName: string,
  currentColumn: 'arrival' | 'triage' | 'waiting' | 'assessment' | 'orders' | 'results' | 'disposition',
  chiefComplaint: string,
  acuity: string,
  waitMinutes: number,
  assignedLocation: string | null,
  statusIndicators: string[],
  alerts: string[],
  reassessmentDue: boolean,
  workflowId: string | null,
  sourceState: 'demo' | 'manual' | 'live' | 'mixed' | 'stale',
  lastUpdated: string,
}
```

## Columns

| Column | Purpose | Source Mapping |
| --- | --- | --- |
| Arrival | New walk-in, EMS, transfer, virtual ED, or door events not yet triaged. | Patient Journey Engine `arrival`, EMS pre-arrival/offload signals. |
| Triage | Patients undergoing vitals, chief complaint review, acuity documentation, and calculator routing. | Patient Journey Engine `triage`, Automated Triage Matrix. |
| Waiting | Patients waiting for assessment, reassessment, room, provider, or next workflow step. | Patient Journey Engine `waiting`, Waiting Room Intelligence, ReassessmentQueue. |
| Assessment | Patients under clinician assessment, protocol review, evidence review, or high-risk review. | Patient Journey Engine `assessment`, ED workflow registry. |
| Orders | Patients with diagnostics, medications, treatments, or protocol-linked order context pending. | Patient Journey Engine `orders`, local/demo order status. |
| Results | Patients waiting on lab, imaging, device, external result review, or result-driven reassessment. | Patient Journey Engine `results`, queue intelligence. |
| Disposition | Patients pending discharge, admission, referral, consult, transfer, observation, or follow-up. | Patient Journey Engine `disposition`, discharge/admission/referral workflows. |

Registration, reassessment, admission, discharge, and follow-up remain valid journey states, but the whiteboard should not add extra top-level columns for the first version. They appear as card status indicators, alerts, or disposition sub-states.

## Required Features

### Filters

The board must support fast operational filtering:

- Acuity or risk level.
- Chief complaint or workflow.
- Waiting over target.
- Reassessment due.
- EMS arrivals.
- Assigned area or room.
- Provider/team.
- Alerts only.
- Disposition type: discharge, admission, referral, transfer, observation, follow-up.
- Source state: demo, manual, live, mixed, stale.

### Search

Search must find patient cards by:

- Patient display name or demo label.
- Patient or encounter ID.
- Chief complaint.
- Workflow title.
- Assigned room/location.
- Alert text.
- Disposition status.

Search should preserve the column layout and highlight matching cards in place.

### Status Indicators

Each card should show compact indicators for:

- Acuity/risk.
- Wait over target.
- Reassessment due.
- High-risk queue.
- EMS arrival or handoff.
- Room assigned.
- Orders pending.
- Results pending.
- Disposition pending.
- Documentation gap.
- Device/equipment constraint.
- Source state.

Indicators must be visually scannable and should include text labels for accessibility.

### Alerts

Alerts should appear on cards and in a board-level alert strip.

Required alert categories:

- Critical clinical review needed.
- Waiting over target.
- Reassessment overdue.
- EMS offload delay.
- Boarding or bed pressure.
- Results delayed.
- Disposition blocked.
- Referral or consult delay.
- Device/equipment unavailable.
- Documentation gap.

Alerts are review prompts only. They do not change patient state or trigger autonomous action.

## Board Summary

The top of the whiteboard should show a department flow summary:

```js
{
  totalActivePatients: number,
  waitingPatients: number,
  highRiskPatients: number,
  reassessmentDue: number,
  longestWaitMinutes: number,
  bottleneckColumn: string,
  activeAlerts: number,
  sourceState: 'demo' | 'manual' | 'live' | 'mixed' | 'stale',
}
```

## Card Actions

Patient cards may expose human-reviewed actions:

- Open patient flow details.
- Start or continue triage review.
- Review reassessment recommendation.
- Open workflow guidance.
- Review protocols/evidence.
- View orders or results status.
- Review disposition blockers.
- Open documentation checklist.

Card actions must deep-link to existing Emergency OS surfaces when possible:

- `/workspace/emergency/triage`
- `/workspace/emergency/waiting-room`
- `/workspace/emergency/evidence`
- `/workspace/emergency/referrals`
- `/workspace/emergency/documentation`
- `/workspace/emergency/throughput`
- `/workspace/emergency/command-center`

## Visual Rules

- Columns must remain visible on desktop without hiding department state behind tabs.
- Cards should show only the most important operational facts by default.
- High-risk and overdue items must be visually distinct.
- Board-level alerts should not obscure the patient columns.
- Empty columns should still render with an empty-state message.
- Mobile layouts may stack columns, but must preserve journey order.

## Data Rules

- Column placement comes from Patient Journey Engine state or mapped queue state.
- Waiting pressure comes from Waiting Room Intelligence and Emergency Queue Intelligence.
- Reassessment state comes from `ReassessmentQueue`.
- Workflow labels come from the Emergency Workflow Registry.
- Alerts come from Emergency Escalation Engine, high-risk queue signals, waiting room signals, EMS offload signals, and resource/device constraints.
- Source state must be labeled clearly as demo, manual, live, mixed, stale, or unavailable.
- The whiteboard must not define competing KPI or queue logic locally.

## Non-Goals

- No autonomous patient movement.
- No autonomous acuity changes.
- No order placement.
- No admission, discharge, transfer, or referral submission.
- No device control.
- No replacement for EHR legal documentation.

## Acceptance

Staff can track patient flow visually.

The `/workspace/emergency/whiteboard` route standardizes the ED tracking board with Arrival, Triage, Waiting, Assessment, Orders, Results, and Disposition columns plus filters, search, status indicators, and alerts.
