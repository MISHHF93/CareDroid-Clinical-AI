# Chief Complaint Router Report

## Goal

Make the Emergency Workspace complaint-driven. A user should be able to start with a chief complaint and receive workflow guidance that points to the right calculators, protocols, workflows, and referral paths.

This router is not an autonomous diagnosis engine. It only routes users to review-required Emergency Department workflows.

## Required Complaint Paths

### Chest Pain

Chest Pain routes to:

- HEART
- ACS Workflow
- Cardiology Referral

### Stroke Symptoms

Stroke Symptoms routes to:

- NIHSS
- Stroke Workflow

### Sepsis Concern

Sepsis Concern routes to:

- qSOFA
- NEWS2
- Sepsis Workflow

### Shortness of Breath

Shortness of Breath routes to:

- Wells PE
- Respiratory Protocol

## Routing Engine Requirements

The routing engine should:

- Accept a chief complaint string.
- Normalize complaint wording and synonyms.
- Return recommended calculators, workflows, protocols, and referral guidance.
- Surface safety language that recommendations require clinician review.
- Avoid diagnosis, disposition, treatment, or autonomous routing claims.

## Workspace Behavior

The Emergency Workspace should expose complaint routing as workflow guidance:

- The user selects or enters a complaint.
- The workspace displays the matching guidance path.
- The workspace shows which calculators to open.
- The workspace shows workflow and protocol guidance.
- The workspace can hand off the context to the ED assistant for review-required next steps.

## Safety Boundary

The router may say: "For chest pain, review HEART and ACS workflow guidance."

The router must not say: "This patient has ACS" or "send the patient to cardiology without review."

Every route remains human-reviewed and workflow-focused.

## Acceptance Criteria

- Chief complaint routing exists in the canonical Emergency model.
- Chest Pain routes to HEART, ACS Workflow, and Cardiology Referral.
- Stroke Symptoms routes to NIHSS and Stroke Workflow.
- Sepsis Concern routes to qSOFA, NEWS2, and Sepsis Workflow.
- Shortness of Breath routes to Wells PE and Respiratory Protocol.
- The Emergency Workspace displays complaint-driven workflow guidance.
- Tests cover the routing engine and UI behavior.
