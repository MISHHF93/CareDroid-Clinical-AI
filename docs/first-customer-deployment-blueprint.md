# First Customer Deployment Blueprint

## Goal

Define how CareDroid can be deployed for the first Emergency Department customer with minimal operational risk.

The first deployment should prove that the Emergency Workspace can be demonstrated, piloted, and sold without requiring a full hospital-wide deployment.

## Deployment Principle

Start with a standalone Emergency Workspace, keep every clinical output human-reviewed, and add integrations only after the buyer sees value from the workspace, protocols, Copilot, and analytics.

## Phase 1: Standalone Emergency Workspace

Deploy Emergency Workspace with demo/local data and manual input:

- ED command center.
- Triage workspace.
- Calculator launch.
- Sample patients and alerts.
- Guided onboarding.
- ROI estimator.
- Human-review safety messaging.

Operational risk is minimal because there is no EHR writeback, no order placement, no disposition automation, and no live patient identity dependency.

## Phase 2: Protocol Library

Add a configured protocol library for the first customer:

- Chest pain.
- Stroke symptoms.
- Sepsis concern.
- Trauma.
- Shortness of breath.
- Local pathway notes where approved by the customer.

Protocol retrieval remains guidance only. Clinicians continue to verify local policy and make all clinical decisions.

## Phase 3: AI Copilot

Enable ED AI Copilot after the workspace and protocols are understood:

- Complaint-aware workflow guidance.
- Calculator recommendations.
- Protocol and evidence summaries.
- Next workflow step suggestions.
- Reasoning and safety boundary display.

Copilot does not diagnose, order treatment, determine disposition, or autonomously escalate.

## Phase 4: Analytics

Activate Emergency Analytics MVP:

- Assessments completed.
- Calculators used.
- Protocol retrievals.
- Workflow launches.
- AI requests.
- Simulation completion.

Analytics should demonstrate adoption, workflow efficiency, and ROI potential without claiming autonomous clinical quality outcomes.

## Phase 5: Optional Integrations

Add integrations only after the standalone pilot proves value:

- ADT or encounter feed.
- EHR documentation context.
- Protocol source synchronization.
- Referral or transfer center workflow.
- Device telemetry.
- Scheduling or staffing feed.
- LMS or simulation records.

Integrations should be scoped one at a time, with no live writeback until governance, testing, and customer approval are complete.

## Acceptance

The first ED customer deployment is ready when:

- Emergency Workspace can be demonstrated using demo/local data.
- A pilot can run without hospital-wide deployment.
- Protocols, Copilot, and analytics can be introduced in phases.
- Optional integrations are clearly separated from the sellable standalone Emergency Workspace.
- The buyer understands that CareDroid starts as an ED operating layer with human-reviewed guidance, not a replacement for the EHR or clinician judgment.
