# Alert Lifecycle Spec

Alert lifecycle:

1. Created from clinical signal, operational signal, service bottleneck, reassessment timer, or manual escalation.
2. Classified by severity and source.
3. Routed to owner role using compiled access profile.
4. Displayed in Dashboard, Alerts, AI Chief, and contextual page surfaces.
5. Acknowledged by authorized owner.
6. Escalated if unacknowledged or owner unavailable.
7. Resolved with reason and outcome.
8. Audited and included in analytics.

Critical alert SLA:

- 0:00-0:30 capture complaint and red flags.
- 0:30-1:00 suggest triage and notify owner.
- 1:00-2:00 recommend department and handoff.
- 2:00-3:00 escalate if unacknowledged.
- After 3:00 mark breach and feed analytics.
