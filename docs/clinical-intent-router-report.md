# Clinical Intent Router Report

## Goal

Clinical Intent Router converts patient complaints into workflow paths so Emergency Workspace users do not manually search for calculators, protocols, workflows, simulations, or referrals.

## Example Routes

The initial Emergency intent routes are:

- Chest Pain -> HEART -> ACS Workflow
- Stroke Symptoms -> NIHSS -> Stroke Workflow
- Sepsis Concern -> qSOFA -> NEWS2 -> Sepsis Workflow
- Trauma -> Trauma Pathway

## Router Outputs

`ClinicalIntentRouter` returns:

- `calculators`: recommended calculator tools for the complaint.
- `protocols`: protocol or guideline pathways to review.
- `workflows`: operational or clinical workflows to launch.
- `simulations`: training or practice scenarios related to the presentation.
- `referrals`: likely consult, transfer, or follow-up routes.

## Safety Model

The router does not diagnose, assign acuity, place orders, or select disposition. It routes complaint intent to reviewable Emergency Workspace assets and keeps clinicians responsible for all clinical decisions.

## Emergency Workspace Integration

The router should power complaint-driven routing in the Emergency evidence and copilot surfaces. Search remains available, but common ED complaints should resolve directly to structured next steps.

## Acceptance Mapping

Acceptance is met when the Emergency Workspace can route supported complaints into calculators, protocols, workflows, simulations, and referrals without manual search.
