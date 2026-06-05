# CareDroid Simulation Business Line Plan

**Status:** Planning baseline  
**Date:** 2026-06-05  
**Scope:** Medical simulation suite, scenario library, scenario player, debriefing, outcomes, competency tracking, OSCE support, AI tutor, laboratory integration, 3D viewer integration, and IoT/device-failure simulations.  
**Goal:** Turn simulation into a standalone sellable training and competency product while preserving its role inside clinical and operational solution packs.  
**Non-goal:** This document does not implement assessment scoring, credentialing policy, accreditation workflows, or live simulator integrations.

## Executive Summary

CareDroid Simulation should become its own business line: a training, competency, and readiness product for universities, hospitals, simulation centers, EMS programs, and enterprise clinical teams. The current platform already has core building blocks:

- Frontend simulation suite, scenario player, and outcomes pages in [`src/pages/MedicalSimulationSuite.jsx`](../src/pages/MedicalSimulationSuite.jsx), [`src/pages/SimulationScenarioPlayer.jsx`](../src/pages/SimulationScenarioPlayer.jsx), and [`src/pages/SimulationOutcomes.jsx`](../src/pages/SimulationOutcomes.jsx).
- Scenario catalog data in [`src/data/medicalSimulationCatalog.js`](../src/data/medicalSimulationCatalog.js).
- Backend scenario, run, debrief, outcome, and competency services in [`backend/src/modules/simulation`](../backend/src/modules/simulation).
- Adjacent competency and credentialing surfaces in [`src/pages/Competencies.jsx`](../src/pages/Competencies.jsx).
- Lab and 3D surfaces in [`src/pages/LaboratoryDashboard.jsx`](../src/pages/LaboratoryDashboard.jsx) and [`src/pages/Medical3DViewer.jsx`](../src/pages/Medical3DViewer.jsx).
- Digital Twin, Medical IoT, and fleet modules that can provide operational failure scenarios later.

The business line should sell scenario content, guided simulation delivery, AI tutoring, debriefing, competency analytics, OSCE support, and operational readiness simulations.

## Product Positioning

**Product name:** CareDroid Simulation & Training Suite  
**Commercial unit:** `simulation-training-suite` backed by `simulation-training-pack`  
**Core promise:** Train teams on clinical reasoning, operational readiness, device failures, and competency milestones using structured scenarios, AI-guided debriefs, and measurable outcomes.

## Customer Segments

| Segment | Buyer | Users | Primary value |
| --- | --- | --- | --- |
| Medical schools | Dean, simulation center director, course director | Medical students, standardized patients, faculty | Structured clinical reasoning practice and OSCE readiness |
| Nursing programs | Nursing school leadership, skills lab director | Nursing students, instructors | Competency tracking, deterioration recognition, handoff practice |
| Hospitals | CMO, CNO, quality leader, education department | Residents, nurses, rapid response teams, ED/ICU teams | Protocol readiness, team training, safety event rehearsal |
| EMS agencies | EMS director, training officer | Paramedics, dispatchers, transport crews | Prehospital simulation, triage, handoff, route/dispatch scenarios |
| Simulation centers | Center director, operations lead | Facilitators, learners, evaluators | Scenario library, debrief tooling, analytics |
| Research organizations | PI, education researcher | Researchers, trainees | Scenario-based studies, outcome data, explainability |
| Device and biomedical teams | Biomedical engineering leadership | Clinical engineers, device managers | Device-failure and telemetry-readiness drills |

## Simulation Categories

| Category | Example scenarios | Required capabilities |
| --- | --- | --- |
| Emergency medicine | sepsis deterioration, trauma, stroke, ACS, pediatric deterioration | calculators, protocols, ED AI, debrief |
| Critical care | ventilator escalation, shock, ABG interpretation, ICU rounds | lab, telemetry context, ICU tools, debrief |
| Cardiology | chest pain, STEMI activation, arrhythmia, telemetry event review | ECG/STEMI assets, cardiology tools |
| Laboratory | critical values, ABG, electrolyte disorder, specimen/result interpretation | lab dashboard, lab AI, calculator recommendation |
| Medical IoT | device offline, stale telemetry, alarm fatigue, maintenance escalation | device fleet, telemetry, alert workflows |
| Digital Twin operations | capacity surge, bed pressure, room closure, incident command | hospital map, alerts, operations dashboard |
| Fleet and EMS | dispatch, route delay, EMS handoff, vehicle failure | fleet map, route optimizer, dispatch AI |
| Governance | AI review, privacy incident, audit investigation, regulatory classification | governance, audit, human review |
| OSCE | standardized patient stations, checklist scoring, timed tasks | station templates, rubrics, evaluator tools |
| Research and education | guideline appraisal, evidence synthesis, explainability | RAG, citations, research AI |

## Product Modules

### Scenario Library

The scenario library is the content marketplace and curriculum builder.

Required fields:

- `scenarioId`
- `title`
- `category`
- `targetRoles`
- `difficulty`
- `durationMinutes`
- `learningObjectives`
- `clinicalContext`
- `requiredAssets`
- `requiredIntegrations`
- `assessmentRubricId`
- `debriefTemplateId`
- `version`
- `status`
- `packIds`

Library capabilities:

- Filter by specialty, role, duration, difficulty, pack, and competency.
- Mark scenario readiness: demo, validated, institution-authored, retired.
- Clone scenarios into organization curriculum.
- Attach rubrics, checklists, expected actions, and evidence references.
- Track scenario version used for each run.

### Scenario Player

The scenario player should guide facilitators and learners through structured states.

Core states:

- briefing
- initial presentation
- data reveal
- decision point
- tool use
- intervention
- complication
- handoff
- resolution
- debrief

Player requirements:

- Timed scenario flow.
- Learner actions and notes.
- Tool launch inside entitled assets.
- AI tutor mode when enabled.
- Facilitator controls.
- Branching events.
- Scenario state export.
- Audit trail for official assessments.

### Debriefing

Debriefing should be structured, not just a generated summary.

Debrief sections:

- Timeline of major actions.
- Learning objectives covered.
- Missed cues and delayed actions.
- Tool and calculator usage.
- Team communication notes.
- Evidence/citation review.
- AI-generated draft summary.
- Facilitator edits and final sign-off.

Debrief outputs:

- Learner feedback.
- Faculty report.
- Team training summary.
- Competency evidence.
- Program-level gap signals.

### Outcomes

Outcomes should track learning progress and operational readiness.

Outcome types:

- Completion.
- Time to recognition.
- Time to escalation.
- Correct tool/protocol use.
- Communication quality.
- Checklist completion.
- Diagnostic reasoning quality.
- Safety-critical action completion.
- Debrief quality.
- Remediation completion.

Program outcomes:

- Scenario pass rates.
- Competency trend over time.
- Skill gap heatmap.
- Cohort readiness.
- Instructor workload.
- Curriculum coverage.
- High-risk objective recurrence.

### Competency Tracking

Competency tracking should bridge simulation, OSCE, and credentialing without over-claiming clinical certification.

Competency objects:

- `competencyId`
- `domain`
- `milestone`
- `role`
- `rubric`
- `evidenceRequirements`
- `validityWindow`
- `assessmentOwner`

Evidence sources:

- Simulation run completion.
- Facilitator score.
- AI tutor/debrief draft.
- Tool usage record.
- OSCE station score.
- Remediation task completion.
- Faculty sign-off.

### OSCE Support

OSCE support should be a product tier, not an incidental scenario mode.

OSCE capabilities:

- Station templates.
- Timed station player.
- Standardized patient script.
- Candidate instructions.
- Examiner checklist.
- Scoring rubric.
- Feedback report.
- Cohort dashboard.
- Exportable assessment record.

OSCE guardrails:

- AI-generated feedback must be faculty-reviewed before official use.
- Scoring rubrics must be versioned.
- Candidate-identifiable data requires education privacy controls.
- Official competency decisions require human sign-off.

### AI Tutor

The AI tutor should use the AI commercialization rules in [AI Commercialization Layer Plan](./ai-commercialization-layer-plan.md).

Tutor modes:

- Pre-brief coach.
- In-scenario hint mode.
- Facilitator assistant.
- Debrief draft generator.
- Remediation planner.
- OSCE feedback drafter.

Tutor rules:

- No hidden answer leakage when learners are in assessment mode.
- Tutor prompts must know whether the session is practice, assessment, or faculty mode.
- Official scoring requires human review.
- AI tutor usage is metered by scenario, organization, learner, and model class.

## Integrations

### Laboratory Integration

Simulation should use laboratory assets for:

- ABG interpretation scenarios.
- Critical value workflows.
- Electrolyte disorder cases.
- Result trend interpretation.
- Specimen/result quality scenarios.

Target integration:

```text
Scenario player
  -> simulated lab event
  -> laboratory dashboard or lab interpreter
  -> learner action
  -> debrief and competency evidence
```

### 3D Viewer Integration

3D integration should support anatomy, procedure orientation, and spatial context.

Use cases:

- Anatomy review before OSCE or procedure simulation.
- Trauma or airway scenario visual context.
- Device placement orientation.
- Pathology explanation during debrief.

### IoT And Device-Failure Simulations

Medical IoT integration should make biomedical and operational training sellable.

Scenario examples:

- Infusion pump offline during care escalation.
- Monitor stale telemetry during deterioration.
- Device low battery and alarm fatigue.
- Calibration overdue before procedure.
- Multiple telemetry outages in one unit.
- Device security anomaly requiring governance review.

### Digital Twin Integration

Digital Twin integration should support operational readiness.

Scenario examples:

- Capacity surge with bed constraints.
- ED boarding and transport delay.
- Unit closure with device relocation.
- Mass casualty incident command.
- Fleet route delay affecting handoff.
- Hospital map alert cluster.

## Dashboards

### Learner Dashboard

- Assigned simulations.
- Completed scenarios.
- Competency progress.
- Feedback and remediation tasks.
- Upcoming OSCE stations.

### Faculty Dashboard

- Cohort progress.
- Scenario completion.
- Rubric scoring queue.
- Debrief review queue.
- Learner gap heatmap.

### Program Dashboard

- Curriculum coverage.
- Competency attainment.
- Scenario utilization.
- Faculty workload.
- Assessment reliability signals.
- Exportable reports.

### Enterprise Readiness Dashboard

- Team readiness by unit.
- Protocol readiness.
- Device-failure drill results.
- Operational scenario completion.
- High-risk skill gaps.

## Backend Needs

Minimum backend capabilities:

- Scenario catalog API.
- Scenario run state API.
- Debrief and outcome services.
- Competency service.
- Rubric and checklist versioning.
- Organization and workspace scoping.
- Role-based learner, faculty, and admin permissions.
- Audit events for official assessments.
- AI tutor usage metering.
- Exportable reports.

Enterprise capabilities:

- Curriculum builder.
- OSCE station management.
- Faculty review queue.
- Institution-authored scenarios.
- Scenario version lifecycle.
- Multi-campus reporting.
- LMS integration.
- Simulator/device integration hooks.
- SSO and roster provisioning.

## Product Tiers

| Tier | Included capabilities | Target buyer |
| --- | --- | --- |
| Simulation Core | scenario library, player, basic debrief, learner dashboard | small programs, trials |
| Simulation Standard | outcomes, competency tracking, faculty dashboard, AI debrief drafts | universities, nursing programs |
| Simulation Enterprise | OSCE support, custom scenarios, multi-site reporting, audit exports | hospitals, simulation centers |
| Simulation Operations Add-on | IoT failure, Digital Twin, fleet, incident command simulations | hospitals, EMS, biomedical teams |
| Simulation AI Add-on | premium AI tutor, remediation plans, advanced debrief analytics | education leaders, enterprise training |

## Packaging With Other Suites

- Emergency Department Suite: ED scenarios, deterioration, trauma, stroke, sepsis, protocol readiness.
- ICU Suite: critical care scoring, ABG, ventilator-adjacent workflows, sepsis.
- Laboratory Intelligence Suite: critical values, ABG, interpretation, QC workflows.
- Medical IoT Suite: telemetry and device-failure drills.
- Digital Twin Suite: operational readiness and incident command.
- Fleet & EMS Suite: dispatch, transport, route, handoff, vehicle readiness.
- Governance & Compliance Suite: AI review, privacy incident, audit evidence simulation.
- Research Suite: education research, evidence-backed scenario design, explainability.

## Assessment Metrics

Learner metrics:

- Scenario completion.
- Time to recognize critical cue.
- Time to launch correct tool.
- Correct score/protocol use.
- Missed critical action count.
- Communication checklist score.
- Debrief quality score.
- Remediation completion.

Program metrics:

- Competency coverage.
- Cohort readiness.
- Scenario utilization.
- Repeat failure patterns.
- Instructor review time.
- OSCE pass rate.
- Skill gap closure.

Operational metrics:

- Unit/team readiness.
- Incident drill completion.
- Device failure response time.
- Fleet/dispatch drill success.
- Governance review drill completion.

## Implementation Phases

### Phase 1: Product Definition

- Normalize scenario categories, role targets, and pack mappings.
- Label every simulation surface as a `PlatformAsset`.
- Define scenario readiness and version fields.
- Define practice versus assessment modes.

### Phase 2: Training Workflow

- Formalize scenario player state model.
- Connect run, debrief, outcome, and competency records.
- Add faculty review and sign-off semantics.
- Add learner and faculty dashboards.

### Phase 3: AI Tutor And Debrief

- Add AI tutor modes and metering rules.
- Gate answer reveal and assessment mode behavior.
- Require human review for official scoring.
- Add remediation plan generation.

### Phase 4: OSCE And Enterprise

- Add station templates, rubrics, standardized patient scripts, and examiner workflows.
- Add cohort reporting and export.
- Add LMS/roster integration plan.
- Add multi-site program dashboards.

### Phase 5: Operational Simulation

- Add lab, 3D, IoT, Digital Twin, fleet, and governance scenario families.
- Add integration hooks for live simulators or device emulators.
- Package operational readiness add-ons.

## Risks

- Simulation remains a feature inside Tools instead of becoming a priced business line.
- AI tutor leaks answers or over-influences official assessment.
- Competency dashboards imply certification without human sign-off and institutional policy.
- Scenario versions change without preserving assessment history.
- OSCE exports include learner data without education privacy controls.
- Operational simulations use demo data without clear labeling.

## Acceptance Criteria

- Simulation has clear customer segments, categories, modules, metrics, dashboards, backend needs, and product tiers.
- Scenario library, player, debrief, outcomes, competency, OSCE, AI tutor, lab, 3D, IoT, and Digital Twin integrations are all covered.
- Official assessment workflows require rubric versioning and human review.
- AI tutor behavior distinguishes practice, assessment, facilitator, and remediation modes.
- Simulation assets map to `simulation-training-pack` and cross-sell into ED, ICU, lab, IoT, Digital Twin, Fleet & EMS, Governance, and Research suites.

