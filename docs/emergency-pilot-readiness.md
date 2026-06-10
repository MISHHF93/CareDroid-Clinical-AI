# Emergency Pilot Readiness

## Goal

Assess readiness for the first hospital Emergency Department pilot.

This assessment evaluates:

- Workflows.
- Automations.
- Onboarding.
- Demo environment.
- Analytics.
- Reporting.
- AI guardrails.

The first pilot target is a controlled Emergency OS pilot using demo/manual data, clearly labeled source state, human-reviewed workflows, and no dependency on hospital-wide deployment, EHR writeback, autonomous clinical decisions, live EMS CAD, live bed board, live staffing, or live device telemetry.

## Pilot Readiness Score

**Pilot Readiness Score: 74 / 100**

Status: **Demo/manual pilot ready with implementation blockers before first hospital-facing pilot.**

Interpretation:

- CareDroid has a clear Emergency OS product boundary and strong pilot narrative.
- The demo environment, core workflow concepts, ED Copilot boundaries, and KPI posture are credible.
- The main gap is that several first-pilot surfaces are now specified but not yet implemented or verified as app routes.
- The first pilot should proceed only after the highest-severity blockers below are closed.

## Score Breakdown

| Category | Weight | Score | Readiness |
| --- | ---: | ---: | --- |
| Workflows | 20 | 16 | Ten canonical ED workflows are standardized, but they need runtime registry wiring and UI launch coverage. |
| Automations | 15 | 10 | Core automations are defined, but ROI events and some expansion automations are not pilot-grade yet. |
| Onboarding | 10 | 8 | 10-minute onboarding exists and matches the first-customer story, but it needs a validated pilot script and role-specific checklist. |
| Demo Environment | 15 | 13 | Demo tenant and deterministic ED population are strong; reset/scenario controls need final validation. |
| Analytics | 15 | 11 | KPI layer and adoption metrics exist; automation ROI and pilot outcome dashboard need event wiring. |
| Reporting | 10 | 6 | Reporting concepts exist, but first-pilot weekly review and executive summary outputs need a concrete template. |
| AI Guardrails | 15 | 10 | Human-review boundaries are clear; specialized agent routing and audit evidence need implementation verification. |
| **Total** | **100** | **74** | **Controlled pilot path is clear, but not yet fully pilot-ready.** |

## Readiness Assessment

### Workflows

Current state:

- `EmergencyWorkflowRegistry` defines Chest Pain, Stroke, Sepsis, Trauma, Respiratory Distress, Abdominal Pain, Behavioral Health, Discharge, Referral, and Admission.
- Each workflow has triggers, calculators, protocols, AI context, automations, and KPIs.
- The workflow registry aligns with Emergency Knowledge Layer, Whiteboard, and Copilot direction.

Pilot readiness:

- Ready for pilot narrative and demo walkthrough.
- Needs runtime wiring so workflows can be launched, filtered, searched, and measured consistently across triage, whiteboard, knowledge, and command-center surfaces.

### Automations

Current state:

- Emergency automations are defined across triage, referral, surge staffing, simulation, IoT monitoring, documentation, RAG evidence retrieval, virtual ED, discharge drafting, and prior authorization.
- `AutomationROIService` is specified to require time saved, clicks reduced, queue impact, throughput impact, and adoption.

Pilot readiness:

- Triage and RAG evidence retrieval are strongest for pilot scope.
- Referral visibility can support the first pilot if kept as review queue/demo workflow.
- ROI measurement is not yet ready unless eligible, started, completed, accepted, dismissed, queue snapshot, and KPI snapshot events are wired.

### Onboarding

Current state:

- Emergency onboarding is defined as a 10-minute walkthrough covering overview, calculators, protocols, ED Copilot, workflows, and analytics.
- First-customer path defines 30/60/90-day rollout expectations.

Pilot readiness:

- Strong enough for prospect education.
- Needs a hospital pilot checklist with roles, pre-demo data posture, source-state explanation, safety boundary script, and acceptance questions.

### Demo Environment

Current state:

- Emergency demo environment is designed around a clearly labeled demo tenant with 100+ demo patients.
- Demo data covers waiting room, triage, provider queue, results, referrals, boarding, discharge, EMS arrivals, and capacity issues.
- The MVP implementation summary says `/workspace/emergency/demo` renders the ED demo tenant and deterministic demo patients.

Pilot readiness:

- Strongest readiness area.
- Needs final validation that demo scenarios can reset, remain deterministic, and show source-state labels on all surfaces used in the pilot.

### Analytics

Current state:

- Emergency KPI Layer centralizes Door-to-Doctor, Length of Stay, Boarding Time, EMS Offload, Referral Delay, and Discharge Time.
- Emergency Analytics tracks assessments completed, calculators used, protocol retrievals, workflow launches, AI requests, and simulation completion.
- Automation ROI is specified but not yet proven as a working dashboard.

Pilot readiness:

- Adequate for adoption and KPI demo.
- Needs pilot outcome dashboard or report tying usage to time saved, queue pressure, referral delay, EMS offload, and throughput.

### Reporting

Current state:

- First-customer path describes weekly operating review and day 30/60/90 outcomes.
- KPI and analytics layers provide source metrics for leadership reporting.

Pilot readiness:

- Reporting is conceptually ready but not packaged.
- Needs a standard weekly pilot report template and final pilot readout template for ED leadership.

### AI Guardrails

Current state:

- Emergency Copilot explicitly supports workflow guidance only.
- AI outputs require clinician review.
- Specialized agents are specified behind one Emergency Copilot: Triage, Flow, Referral, Documentation, Protocol, Simulation Coach, and Operations.

Pilot readiness:

- Guardrail language is strong.
- Needs implementation verification that every Copilot and agent response includes source context, reasoning, review requirement, and prohibited action reminder.

## Blockers Ranked By Severity

### P0 - Must Close Before First Hospital-Facing Pilot

| Blocker | Impact | Resolution |
| --- | --- | --- |
| Role-specific pilot routes are not all implemented and verified. | ED Director, Charge Nurse, Whiteboard, Knowledge, Automation ROI, and agent ecosystem are now specified, but pilot users need working route coverage or a scoped route plan. | Implement or explicitly defer each new route before pilot kickoff; verify navigation, source labels, and demo data. |
| Pilot source-state labeling must be universal. | A hospital pilot can be misunderstood if demo/manual data appears live. | Audit all pilot surfaces for `Demo data`, `Manual`, `No live integration`, `Stale`, or `Live` source labels. |
| AI guardrail output must be consistent across Copilot surfaces. | Any AI output without human-review boundaries creates clinical and trust risk. | Require every Copilot response to include reasoning, source context, review requirement, and prohibited action reminder. |

### P1 - Should Close Before Pilot Kickoff

| Blocker | Impact | Resolution |
| --- | --- | --- |
| Workflow registry is documented but not fully wired as a runtime source. | Workflows may drift between docs, UI, search, Copilot, and analytics. | Create a runtime `EmergencyWorkflowRegistry` module or equivalent single source consumed by UI/search/Copilot. |
| Automation ROI events are not yet complete. | The pilot cannot prove automation value beyond qualitative feedback. | Wire eligible, started, completed, accepted, dismissed, queue snapshot, and KPI snapshot events. |
| Weekly pilot reporting template is missing. | ED leadership will not have a repeatable operating review artifact. | Create a weekly report with adoption, queue pressure, throughput, referral, EMS offload, top blockers, and next actions. |
| Onboarding needs a role-specific pilot checklist. | ED directors, charge nurses, clinicians, and implementation leads need different validation prompts. | Add role checklists for director, charge nurse, clinician, referral/EMS reviewer, and implementation lead. |

### P2 - Can Close During 30-Day Pilot

| Blocker | Impact | Resolution |
| --- | --- | --- |
| Demo scenario reset controls need validation. | Repeated demos or pilot training may drift if sample state changes unpredictably. | Add or validate resettable scenarios: normal pressure, waiting room surge, EMS congestion, boarding crisis, referral delay. |
| Threshold tuning remains customer-specific. | Default queue/KPI thresholds may not match the pilot ED. | Tune wait, reassessment, EMS offload, referral delay, and boarding thresholds during pilot setup. |
| Reporting beyond ED Core remains expansion scope. | Resource, escalation, simulation, and IoT reports could distract from Emergency Core. | Keep expansion reporting hidden unless tied to a pilot outcome. |

### P3 - Post-Pilot Expansion

| Blocker | Impact | Resolution |
| --- | --- | --- |
| Live ADT/EHR/EMS/device integrations are not connected. | Limits production realism but should not block the first demo/manual pilot. | Add selected read-only integrations only after pilot value is proven. |
| Simulation debrief persistence is not complete. | Training analytics are limited. | Add stored debriefs and completion history if simulation becomes a pilot outcome. |
| Backend operational escalation history is not complete. | Trend analysis is limited. | Add escalation history after operational review becomes a paid expansion need. |

## Go / No-Go Criteria

### Go For Controlled Demo/Manual Pilot

Proceed when:

- Emergency Workspace remains the default and primary product surface.
- Demo tenant is stable and clearly labeled.
- Patient journey, queues, EMS, referrals, Copilot, and analytics can be demonstrated end to end.
- Every AI output includes human-review boundaries.
- ED leadership can see pilot value without live integration dependency.

### No-Go For Hospital-Facing Pilot

Do not proceed if:

- Demo/manual data is not clearly labeled.
- Copilot output can be interpreted as autonomous clinical decision-making.
- Core pilot routes are missing or dead-ended.
- The team cannot explain how adoption and value will be measured.
- Non-Emergency modules distract from the ED OS scope lock.

## 30-Day Pilot Path

1. Lock pilot scope to Emergency Core: patient journey, queue intelligence, ED Copilot, referral visibility, EMS visibility, analytics, and demo/manual data.
2. Implement or explicitly defer the new role and support routes: `/workspace/emergency/director`, `/workspace/emergency/charge-nurse`, `/workspace/emergency/whiteboard`, `/workspace/emergency/knowledge`, and `/workspace/emergency/automation-roi`.
3. Validate the demo tenant with source-state labels across every pilot surface.
4. Wire workflow registry and knowledge search to the same canonical ED workflow definitions.
5. Add Copilot response guardrail checks for reasoning, source context, human review, and prohibited actions.
6. Create weekly pilot reporting from Emergency KPI Layer, Emergency Analytics, and Automation ROI events.
7. Run a pilot rehearsal using scenarios for waiting room pressure, EMS offload, referral delay, boarding, and high-risk queue review.

## Acceptance

Clear path to first pilot customer.

CareDroid is ready to pursue a controlled Emergency OS pilot after P0 blockers are closed. The first pilot should stay ED-only, demo/manual-data-first, human-reviewed, and measured through workflow adoption, queue pressure, EMS offload, referral delay, throughput, analytics, and reporting.
