# CareDroid Workflow Map

Core closed loop:

Signal Capture -> Risk Detection -> Priority Assignment -> AI Chief Recommendation -> Staff Routing -> 3-Minute Timer -> Acknowledgement -> Escalation -> Handoff -> Outcome Tracking -> Analytics Feedback.

Workflow ownership:

- Signal Capture: Reception Clerk, Paramedic, Triage Nurse.
- Risk Detection: alert engine, triage, reassessment, bottleneck registry, AI Chief decision support.
- Priority Assignment: Triage Nurse or clinician owner.
- AI Chief Recommendation: roles with `ai:request`; review by roles with `ai:review`.
- Staff Routing: Charge Nurse, Patient Flow Coordinator, physician owner.
- Acknowledgement: alert owner with `alert:acknowledge`.
- Escalation: Charge Nurse, Emergency Physician, ED Manager, Patient Flow Coordinator.
- Handoff: sending owner and receiving owner.
- Analytics Feedback: Hospital Administrator, Quality & Safety Officer, ED Manager.
