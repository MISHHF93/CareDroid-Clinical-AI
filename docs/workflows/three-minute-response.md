# Three-Minute Response Workflow

Purpose: reduce the time from arrival, alert, or deterioration signal to clinician action.

## Current Implementation

Primary screens: Reception, EMS, Whiteboard, Reassessment, Alerts, Copilot.

Services and engines: alert engine, reassessment engine, queue intelligence, EMS offload tracker, patient arrival sync, reception handoff, emergency store.

## Workflow

1. Signal appears from arrival, EMS, reassessment timer, patient flag, queue breach, or critical alert.
2. CareDroid surfaces the signal in the nearest operational context: Reception, Whiteboard, Alerts, or Reassessment.
3. The responsible human role acknowledges, opens the patient or queue, and verifies the source data.
4. Copilot may summarize context or suggest workflow prompts, but it does not diagnose, order, disposition, or autonomously escalate.
5. Clinician or charge nurse completes the operational action: triage review, reassessment, room/staff assignment, EMS bay preparation, referral, or escalation.
6. The patient card, queue, alert, and audit trail update.

## Safety Rules

AI supports the workflow. AI never replaces clinician review. Critical alerts and deterioration flags require human confirmation before clinical action.

## Known Limitations

The route-level Help button now covers shared emergency route pages. Reception, Whiteboard, Analytics, Pulse, Shift, Alerts, and Settings still rely mainly on global `?` help until page-level triggers are added.

