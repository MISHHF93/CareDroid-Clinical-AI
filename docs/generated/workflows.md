# Workflows & automation

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 21

### Arrival

Capture arrival signal

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/reception`
- **Roles:** `registration_clerk`
- **Workflows:** `arrival`

### Registration & intake

Complete intake & hand off to triage

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/reception`
- **Roles:** `registration_clerk`
- **Workflows:** `registration`

### Triage

Confirm acuity & route to care

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/queues`
- **Roles:** `triage_nurse`
- **Workflows:** `triage`

### Waiting for provider

Assign provider & advance to assessment

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/queues`
- **Roles:** `patient_flow_coordinator`
- **Workflows:** `waiting`

### Clinical assessment

Begin assessment or order diagnostics

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/whiteboard`
- **Roles:** `emergency_physician`
- **Workflows:** `assessment`

### Diagnostics orders

Track orders to results

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/diagnostics`
- **Roles:** `emergency_physician`
- **Workflows:** `orders`

### Results review

Review results & decide next step

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/diagnostics`
- **Roles:** `emergency_physician`
- **Workflows:** `results`

### Disposition decision

Admit, transfer, or discharge

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/referrals`
- **Roles:** `emergency_physician`
- **Workflows:** `disposition`

### Admission / boarding

Complete boarding handoff

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/boarding`
- **Roles:** `patient_flow_coordinator`
- **Workflows:** `admission`

### Discharge & reporting

Complete discharge summary & handoff

- **Source:** `unifiedPatientWorkflowModel.ts`
- **Route:** `/emergency/handoffs`
- **Roles:** `registered_nurse`
- **Workflows:** `discharge`

### Reception

Arrival registration, identity capture, and intake handoff preparation.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/reception`
- **Roles:** `registration_clerk`
- **Workflows:** `patient_created`, `ems_arrival_created`, `ems_incoming`

### Intake

Rapid intake, missing-field resolution, and pre-triage documentation.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/intake`
- **Roles:** `registration_clerk`
- **Workflows:** `patient_created`, `journey_state_changed`

### Triage

Acuity assignment, triage packet prep, and reassessment triggers.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/queues`
- **Roles:** `triage_nurse`
- **Workflows:** `journey_state_changed`, `alert_created`, `reassessment_created`

### Patient routing

Queue placement, state advancement, and flow rebalance.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/queues`
- **Roles:** `patient_flow_coordinator`
- **Workflows:** `journey_state_changed`, `patient_flow_updated`

### Notifications

Department alerts, capacity surge notices, and escalation broadcasts.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/alerts`
- **Roles:** `charge_nurse`
- **Workflows:** `alert_created`, `operational_alert_dispatched`, `capacity_updated`

### Documentation

AI-assisted summaries and structured note drafts awaiting clinician review.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/copilot`
- **Roles:** `registered_nurse`
- **Workflows:** `journey_state_changed`, `workflow_log_created`

### Handoffs

Disposition, admission, and transfer handoff packages.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/handoffs`
- **Roles:** `registered_nurse`
- **Workflows:** `journey_state_changed`, `boarding_started`, `referral_created`

### Staff assignments

Owner assignment for unassigned high-acuity patients.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/command-center`
- **Roles:** `charge_nurse`
- **Workflows:** `staff_assigned`, `journey_state_changed`

### Analytics

Throughput signals, congestion metrics, and operational intelligence.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/analytics`
- **Roles:** `ed_manager`
- **Workflows:** `patient_flow_updated`, `capacity_score_changed`

### Reporting

Workflow action logs and audit-ready operational reporting.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/analytics`
- **Roles:** `quality_lead`
- **Workflows:** `workflow_log_created`

### AI recommendations

Explainable AI Chief suggestions — advisory until clinician review.

- **Source:** `unifiedWorkflowAutomationModel.ts`
- **Route:** `/emergency/copilot`
- **Roles:** `emergency_physician`
- **Workflows:** `workflow_orchestration_updated`
