# Emergency OS First-Customer Execution Sequence

This roadmap concentrates engineering effort on the first sellable Emergency Department or urgent care customer. The product focus is CareDroid Emergency OS as a commercial operating system for small emergency departments, urgent care clinics, and clinics handling 50-150 patients/day with fewer than 10 staff, not a collection of disconnected healthcare tools.

## Product Cut

Visible Emergency OS navigation:

- Whiteboard
- Patients
- EMS
- Operations
- Copilot

Contextual capabilities stay available through patient cards, Whiteboard actions, Copilot routing, and deep links:

- calculators
- workflows
- protocols
- analytics
- automations
- referrals
- boarding
- capacity
- evidence and knowledge surfaces

Deferred from primary product focus until the first ED customer path is stable:

- ICU
- Laboratory
- Fleet
- IoT
- Governance
- Research
- Education

## Execution Tracks

### Track 1 - Emergency OS Core

Build the Emergency Department Operating System as the primary commercial experience.

Core capabilities:

- Patient Journey Engine
- Emergency Whiteboard
- Queue Intelligence
- Referral Intelligence
- Boarding Intelligence
- Capacity Intelligence
- Emergency Analytics

Required routes:

- `/workspace/emergency`
- `/workspace/emergency/patients`
- `/workspace/emergency/whiteboard`
- `/workspace/emergency/referrals`
- `/workspace/emergency/capacity`
- `/workspace/emergency/analytics`

Acceptance standard: all ED functionality plugs into one operating model, with no isolated tools and no disconnected dashboards.

### Track 2 - Patient Intake OS

Make intake an embedded Emergency OS capability, not a separate application.

Core capabilities:

- Smart Intake OS
- ID scan
- OCR extraction
- demographic extraction
- insurance extraction
- referral ingestion
- document ingestion
- Patient Snapshot
- Instant Patient Context

Acceptance standard: every arriving patient enters Emergency OS already summarized, verified by patient or staff, and visible on patient cards.

### Track 3 - EMS & Handoff Intelligence

Bring pre-arrival and offload operations into the Emergency OS flow.

Core capabilities:

- EMS Pre-Arrival Pipeline
- EMS assessment, complaint, vitals, ETA, risk bundle, and ED notification
- incoming status model: Incoming, En Route, Arriving, Arrived
- structured ED handoff summary
- EMS Offload Intelligence
- EMS Pressure Score

Acceptance standard: patients appear before arrival, handoff summaries attach to the Patient Journey Engine, and EMS bottlenecks are visible on the Whiteboard.

### Track 4 - Flow / Queue / Capacity Intelligence

Turn Emergency OS into the operational control layer for department flow.

Core capabilities:

- Patient Journey Engine states
- Reassessment Engine
- Queue Intelligence
- Referral Intelligence
- Boarding Intelligence
- Capacity Engine
- Emergency Analytics

Patient journey states:

- Arrival
- Registration
- Triage
- Waiting
- Assessment
- Orders
- Results
- Disposition
- Admission
- Discharge

Acceptance standard: all automations, queues, referrals, capacity signals, analytics, and alerts attach to patient journey states.

### Track 5 - ED Copilot & Commercialization

Make Copilot the navigation and decision-support layer for the Emergency OS.

Copilot must understand:

- complaint
- patient journey
- queues
- referrals
- EMS
- capacity

Supported actions:

- Show high-risk patients
- Show boarding bottlenecks
- Open chest pain workflow
- Show EMS arrivals

Commercial surfaces:

- ED Director View
- Charge Nurse View
- Emergency Demo Tenant
- commercial Emergency OS packaging

Acceptance standard: leaders understand department health in under 30 seconds, charge nurses see actionable work immediately, and sales can demo Emergency OS without integrations.

## Cursor Execution Sequence

1. Emergency OS Core
2. Whiteboard First UX
3. Patient Journey Engine
4. Smart Intake OS
5. Instant Patient Context
6. Complaint Driven Navigation
7. Dynamic Risk Bundle
8. EMS Pre-Arrival Intelligence
9. EMS Offload Intelligence
10. Reassessment Engine
11. Queue Intelligence
12. Referral Intelligence
13. Boarding Intelligence
14. Capacity Engine
15. ED Copilot
16. Director View
17. Charge Nurse View
18. Emergency Analytics
19. Emergency Demo Tenant
20. Commercial Emergency OS

## Operating Principles

- Optimize for teams handling 50-150 patients/day.
- Assume fewer than 10 staff with high operational load.
- Reduce clicks, searching, dashboard hopping, and cognitive load.
- Increase operational awareness from the Whiteboard first.
- Keep clinical decision support human-reviewed.
- Hide complexity until context makes it useful.
- Treat non-ED workspaces as deferred until CareDroid Emergency OS is sellable.
