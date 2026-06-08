# Emergency Demo Mode

## Goal

Create a demo tenant that lets prospects experience the Emergency Workspace without EHR, ADT, telemetry, protocol library, scheduling, or analytics integrations.

Every demo-mode object must be clearly labeled as demo data.

## Demo Tenant

The demo tenant should represent a realistic emergency department pilot environment:

- Tenant name: CareDroid Emergency Demo Hospital.
- Workspace: Emergency.
- Data posture: demo/local data only.
- Integration posture: no live EHR writeback, no live ADT, no live patient identity, no live protocol source, and no live analytics feed.
- Safety posture: all clinical outputs remain workflow guidance for human review.

## Demo Data To Populate

Populate the demo tenant with:

- Sample patients: waiting room, triage, high-risk review, active assessment, results pending, and disposition-ready examples.
- Sample alerts: critical clinical alerts, workflow alerts, stale review prompts, and operational warnings.
- Sample workflows: triage review, calculator launch, protocol retrieval, AI Copilot request, simulation assignment, and analytics review.
- Sample protocols: chest pain, stroke symptoms, sepsis concern, trauma, and shortness of breath pathways.
- Sample analytics: assessments completed, calculators used, protocol retrievals, workflow launches, AI requests, and simulation completion.

## Labeling Requirements

Every demo object should include a visible label:

- `Demo data`
- `Demo tenant`
- `No live integration`

The UI should avoid implying that sample records are real patients, real orders, real alerts, real clinical outcomes, or live hospital activity.

## Prospect Experience

A prospect should be able to:

- Open the Emergency Workspace.
- See a realistic ED command center.
- Review sample patients and alerts.
- Launch guided workflows.
- Retrieve sample protocols.
- Ask ED AI Copilot with demo context.
- Review sample analytics that demonstrate adoption and ROI.

## Acceptance

Emergency Demo Mode is ready when:

- A demo tenant exists in the frontend data model.
- Sample patients, alerts, workflows, protocols, and analytics are available without integrations.
- Every sample item is labeled as demo data.
- The Emergency Workspace clearly communicates that demo mode is for product evaluation and does not use live clinical integrations.
