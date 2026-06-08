# ED Workflow Command Center

## Goal

Create one Emergency Command Center page at `/workspace/emergency/dashboard` where ED users can perform most day-to-day actions without navigating through multiple subpages.

## Command Center Route

- Route: `/workspace/emergency/dashboard`
- Surface: Emergency workspace dashboard
- Purpose: Give triage nurses, charge nurses, ED physicians, and operations leads a single action-oriented view for ED flow, risk, alerts, assessments, recommended actions, and protocol guidance.

## Required Widgets

The Command Center contains exactly these primary widgets:

- Waiting Patients
- High Risk Queue
- Critical Alerts
- Recent Assessments
- Recommended Actions
- Protocol Guidance

## Action Model

Each widget should expose at least one primary action and one supporting action. The user should be able to start the most common ED workflows from this page:

- Start or continue triage review.
- Open calculator-guided risk review.
- Review critical alerts.
- Launch recent assessment follow-up.
- Ask the ED assistant for recommended next steps.
- Retrieve complaint-specific protocols and evidence.
- Move into deeper routes only when the user needs detail.

## Navigation Reduction

The Emergency workspace should be dashboard-first. Primary navigation should emphasize the Command Center and avoid forcing ED users to choose between many separate ED subpages for routine work.

Direct routes such as `/workspace/emergency/triage`, `/workspace/emergency/evidence`, and `/workspace/emergency/automations` can remain available for deep links and focused review, but the Command Center should be the main operational surface.

## Acceptance Criteria

- `/workspace/emergency/dashboard` renders one Emergency Command Center.
- The Command Center shows Waiting Patients, High Risk Queue, Critical Alerts, Recent Assessments, Recommended Actions, and Protocol Guidance.
- The widgets include action metadata and visible action controls.
- Most ED workflow starts are available from the Command Center.
- Emergency primary navigation is reduced.
- No separate shell or separate Emergency application is introduced.
