# Three-Minute Response

Build features around the first 3 minutes of a critical alert or patient arrival.

Required UI signals: response timer, alert severity, patient status, responsible role, acknowledgement state, escalation state, next safest action, and clinician review required.

Workflow:
- 0:00-0:30 capture complaint, detect red flags, mark priority, and start timer.
- 0:30-1:00 suggest ESI-style acuity, identify missing life-critical data, and notify accountable roles.
- 1:00-2:00 recommend routing and next safest action, and surface allergies, medications, history, and vital risks.
- 2:00-3:00 escalate if unacknowledged, generate handoff, and update command center.

Use possible/suspected language only. Do not claim diagnosis or autonomous triage.
