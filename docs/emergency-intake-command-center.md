# Emergency Intake Command Center

## Goal

Monitor intake operations so registration and intake bottlenecks become visible.

The command center should give staff an operational view of arrivals, registration progress, verification work, intake review, and triage readiness.

## Track

The Emergency Intake Command Center should track:

- Arrivals
- Registrations
- Pending verification
- Pending intake review
- Triage-ready patients

## Dashboard

Display the dashboard at:

`/workspace/emergency/intake`

The dashboard should provide a real-time or near-real-time view of intake flow and unresolved work.

## Operational View

The command center should show:

- Total arrivals in the active window.
- Registrations started.
- Registrations completed.
- Patients pending identity or demographic verification.
- Patients pending intake review.
- Patients ready for triage.
- Stale or delayed intake items.
- Intake mode when available, such as kiosk, tablet, QR code, or receptionist-assisted intake.

## Bottleneck Signals

Registration bottlenecks should be visible through:

- Counts by intake state.
- Aging indicators for pending verification.
- Aging indicators for pending intake review.
- Completion rate for registration work.
- Triage-ready backlog.
- Missing or unconfirmed field indicators.

The dashboard should help staff decide where manual attention is needed without making autonomous clinical or triage decisions.

## Safety Boundary

The Emergency Intake Command Center is an operational monitoring layer. It does not diagnose, assign acuity, prioritize patients clinically, or replace triage assessment.

It should surface registration and intake work clearly so staff can reduce delays before triage.

## Acceptance

The Emergency Intake Command Center is ready when:

- Arrivals, registrations, pending verification, pending intake review, and triage-ready patients are tracked.
- The dashboard is available at `/workspace/emergency/intake`.
- Staff can see where registration and intake work is delayed.
- Registration bottlenecks become visible.
