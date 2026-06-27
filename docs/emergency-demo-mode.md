# Emergency Demo Mode

## Goal

Use the current First Customer Demo Mode to let prospects experience the Emergency OS without EHR, ADT, telemetry, protocol library, scheduling, or analytics integrations.

Every demo-mode object must be clearly labeled as demo/local data.

## Current Entry Points

- Open `/emergency/whiteboard` and choose `First Customer Demo Mode` from the Emergency OS scenario selector.
- Or open `/emergency/settings` and use `First Customer Demo Mode` > `Load Demo`.
- Use `Reset to Normal Day` or the `Normal day` scenario to leave the demo flow.

## Demo Tenant

The active demo scenario represents a realistic emergency department pilot environment:

- Tenant name: CareDroid Emergency Demo Hospital.
- Workspace: Emergency.
- Data posture: demo/local data only.
- Integration posture: no live EHR writeback, no live ADT, no live patient identity, no live protocol source, and no live analytics feed.
- Safety posture: all clinical outputs remain workflow guidance for human review.

## Demo Data To Populate

The current deterministic scenario populates:

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

Emergency Demo Mode is ready when a reviewer can load First Customer Demo Mode from `/emergency/whiteboard` or `/emergency/settings`, see sample patients, alerts, workflows, protocols, and analytics without integrations, and understand that the scenario is for product evaluation only.
