# ED AI Copilot Report

## Goal

Make the Emergency Workspace AI act as an ED Copilot. The Copilot should help ED users move from patient context to review-required workflow guidance without making autonomous clinical decisions.

## Copilot Inputs

The ED Copilot accepts:

- Complaint
- Vitals
- Workspace context
- Selected calculators

## Copilot Outputs

The ED Copilot returns:

- Recommended tools
- Protocols
- Next workflow step
- Simulations
- Escalation suggestions
- Reasoning for every recommendation

## Operating Boundary

The ED Copilot is a workflow guidance layer. It may recommend calculators, protocols, workflows, simulations, and escalation review steps. It must not diagnose, determine disposition, order treatment, or autonomously escalate a patient.

Every output remains clinician-reviewed.

## Reasoning Requirement

The Copilot must explain why each recommendation was produced. Reasoning should reference the provided complaint, vitals summary, workspace context, selected calculators, and the matched Emergency workflow route.

Reasoning should be concise and operational:

- "Chest Pain matched the ACS pathway, so HEART and ACS workflow guidance are recommended."
- "Selected calculator HEART is included because the route requires chest pain risk review."
- "Vitals were provided, so clinician review should verify whether any escalation threshold applies."

Reasoning should not assert diagnosis:

- Do not say: "This patient has ACS."
- Do not say: "This patient should be admitted."
- Do not say: "Start treatment."

## Workflow Behavior

The Emergency Workspace should expose ED Copilot guidance near complaint routing:

1. User enters or selects a complaint.
2. User enters vitals context.
3. User selects calculators.
4. Copilot returns tools, protocols, next workflow step, simulations, escalation suggestions, and reasoning.
5. User can hand the context to the ED assistant for clinician-reviewed next steps.

## Acceptance Criteria

- ED Copilot metadata exists in the canonical Emergency model.
- Copilot guidance combines complaint, vitals, workspace context, and selected calculators.
- Outputs include recommended tools, protocols, next workflow step, simulations, escalation suggestions, and reasoning.
- Reasoning is visible in the Emergency Workspace.
- Safety language clearly states there are no autonomous clinical decisions.
