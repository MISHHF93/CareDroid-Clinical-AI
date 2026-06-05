# CareDroid Asset-Pack Productization Plan

**Status:** Planning baseline  
**Scope:** Convert current CareDroid platform capabilities into sellable solution packs.  
**Non-goal:** This document does not implement code, change seed data, define final prices, or claim production readiness for demo-backed capabilities.

## Executive Summary

CareDroid should sell configured hospital solutions, not individual tools. The commercial unit is a solution suite that maps to one or more asset packs, and each asset pack contains platform assets such as calculators, dashboards, AI agents, simulations, workflows, maps, protocols, integrations, and governance surfaces.

The current repository already supports the core packaging model:

```text
Commercial plan
  -> Product / solution suite
  -> Asset pack
  -> Platform asset
  -> Route, dashboard, AI workflow, simulation, map, or backend capability
```

This plan defines ten sellable packs aligned with the existing product catalog and pack seeds:

- Emergency Department Suite
- ICU Suite
- Cardiology Suite
- Laboratory Intelligence Suite
- Medical IoT Suite
- Digital Twin Suite
- Fleet & EMS Suite
- Simulation & Training Suite
- Governance & Compliance Suite
- Research Suite

## Productization Principles

- `core-platform` is a prerequisite for all suites. It provides authentication, dashboard shell, assistant, search, calculators, protocols, drug checking, AI agents, and shared navigation.
- A suite should map to existing `Product.slug` and `AssetPack.id` values wherever possible, so sales packaging does not drift from entitlement enforcement.
- Asset visibility, launch, workspace scope, role targeting, and analytics should converge on `PlatformAsset.id`.
- Each suite should be sold with clear readiness labels: `production-ready`, `implementation-required`, `integration-required`, or `demo-backed`.
- Pricing remains a placeholder tier until billing, subscription reconciliation, contract terms, implementation services, and usage limits are finalized.
- Governance, audit, security, and clinical safety metadata should be attached to every clinical, operational, AI, and integration surface before broad commercial rollout.

## Portfolio Map

| Suite | Product slug | Backing pack IDs | Buyer | Pricing placeholder |
| --- | --- | --- | --- | --- |
| Emergency Department Suite | `emergency-department-suite` | `emergency-department-pack`, `emergency-medicine` | ED director, hospital operations | Enterprise |
| ICU Suite | `icu-suite` | `icu-pack` | Critical care leadership | Enterprise |
| Cardiology Suite | `cardiology-suite` | `cardiology-pack` | Cardiology service line | Standard |
| Laboratory Intelligence Suite | `laboratory-suite` | `laboratory-intelligence` | Lab medical director | Standard |
| Medical IoT Suite | `medical-iot-suite` | `medical-iot-pack` | Biomedical engineering | Enterprise |
| Digital Twin Suite | `digital-twin-suite` | `digital-twin-pack` | COO, facilities, operations command center | Enterprise |
| Fleet & EMS Suite | `fleet-ems-suite` | `fleet-logistics` | EMS and transport leadership | Standard |
| Simulation & Training Suite | `simulation-training-suite` | `simulation-training-pack` | GME, nursing education, simulation center | Academic / Standard |
| Governance & Compliance Suite | `governance-compliance-suite` | `governance-compliance-pack` | Compliance officer, CMIO, privacy/security | Add-on / Enterprise |
| Research Suite | `research-suite` | `research-education` | University, research institute | Academic / Standard |

## Pack Definitions

### Emergency Department Suite

**Target buyer:** ED director, chief medical officer, hospital operations leader, emergency preparedness leader.

**Target users:** Emergency physicians, triage nurses, charge nurses, advanced practice providers, stroke teams, trauma teams, ED pharmacists, care coordinators.

**Included assets:**

- `qsofa`, `news2`, `sofa-score`, `sofa-calculator`, `mews`
- `heart-score`, `nihss`, `gcs-calculator`, `revised-trauma-score`
- `apache2-calculator`, `curb65-calculator`, `pews`
- `protocols`, `acls-protocol`, `atls-protocol`, `emergency-protocols`
- `simulation-suite`, `scenario-player`, `hospital-map`
- `agent-emergency`, `agent-clinical`, `assistant`, `dashboard`, `search`

**Required backend capabilities:**

- Organization entitlement installation for `emergency-department-pack` and `emergency-medicine`.
- Emergency workspace presets with ED, triage, alerts, calculators, protocols, maps, and simulation assets.
- Role profiles for emergency physician and nurse recommendations.
- Clinical scoring, protocol launch, simulation launch, audit logging, and asset access projection.
- Organization analytics for launches, protocol usage, score usage, simulation completions, and workflow adoption.

**Required integrations:**

- EHR patient context through FHIR `Patient`, `Encounter`, `Condition`, `MedicationRequest`, and `Observation`.
- HL7 ADT feed for arrival, location, bed, and discharge events.
- Laboratory feed through FHIR `DiagnosticReport` and `Observation`.
- Imaging/PACS or radiology report links for stroke, trauma, and chest pain workflows.
- SSO/IAM and role provisioning for ED staff.

**AI workflows:**

- Triage risk summary from vitals, chief complaint, history, and labs.
- Sepsis, chest pain, stroke, trauma, and pediatric deterioration pathway guidance.
- ED handoff summary for admission, transfer, or discharge.
- Protocol-aware clinical assistant for ACLS, ATLS, stroke activation, and escalation.
- Simulation debrief summaries for emergency scenarios.

**Dashboards:**

- ED command dashboard with risk scores, protocol activity, and queue context.
- Triage acuity and deterioration dashboard.
- Stroke/chest pain/sepsis pathway dashboard.
- ED simulation and competency dashboard.

**Outcomes:**

- Faster risk stratification and escalation.
- More consistent protocol access and pathway adherence.
- Better handoff quality between ED, inpatient units, and EMS.
- Higher preparedness for trauma, deterioration, and resuscitation events.

**Pricing tier placeholder:** Enterprise.

### ICU Suite

**Target buyer:** Critical care medical director, ICU nursing leadership, chief medical officer, quality leader.

**Target users:** Intensivists, ICU nurses, respiratory therapists, hospitalists, pharmacists, rapid response teams.

**Included assets:**

- `sofa-score`, `sofa-calculator`, `news2`, `mews`, `apache2-calculator`
- `lab-interp`, `protocols`, `drug-check`
- `agent-clinical`, `assistant`, `dashboard`, `search`
- Optional shared assets from `ai-workflow-pack`: `timeline-ai`, `patient-summary-ai`, `order-set-ai`, `ambient-scribe`

**Required backend capabilities:**

- Entitlement installation for `icu-pack` plus `core-platform`.
- ICU workspace preset with critical care scores, labs, protocols, medication safety, and assistant access.
- Score calculation, lab interpretation, protocol usage, and clinical audit logging.
- Role-profile routing for ICU clinician and nurse users.
- Organization analytics for score adoption, bundle usage, and deterioration workflow usage.

**Required integrations:**

- EHR patient context, diagnoses, medication orders, allergies, and active problems.
- FHIR observations for vitals, ventilator-adjacent values, blood gases, lactate, creatinine, platelets, bilirubin, and urine output where available.
- Laboratory and ABG interfaces.
- Optional device/telemetry feed from the Medical IoT Suite.
- SSO/IAM and unit-based role provisioning.

**AI workflows:**

- Daily ICU patient summary and timeline synthesis.
- Sepsis and deterioration signal review.
- ABG and lab trend interpretation.
- Rounds preparation, handoff, and problem-list summarization.
- Protocol and order-set suggestion with governance review for high-risk actions.

**Dashboards:**

- ICU command dashboard with score trends and high-risk patients.
- Sepsis and deterioration watchlist.
- Critical lab and ABG interpretation dashboard.
- ICU protocol adherence and audit dashboard.

**Outcomes:**

- Standardized critical care scoring.
- Earlier recognition of deterioration and sepsis risk.
- Faster rounds preparation and handoff.
- Improved protocol adherence and clinical auditability.

**Pricing tier placeholder:** Enterprise.

### Cardiology Suite

**Target buyer:** Cardiology service-line leader, chest pain center director, hospital operations leader, quality leader.

**Target users:** Cardiologists, ED physicians, hospitalists, nurses, telemetry teams, cath lab coordinators.

**Included assets:**

- `heart-score`
- `ecg-interpretation-assistant`
- `stemi-pathway-assistant`
- `cardiology-command-center`
- `agent-clinical`, `assistant`, `dashboard`, `search`
- Optional ED pathway assets: `protocols`, `lab-interp`, `news2`

**Required backend capabilities:**

- Entitlement installation for `cardiology-pack`.
- Cardiology workspace preset with HEART score, ECG/STEMI workflow assets, telemetry dashboard, and cardiology assistant access.
- Care pathway metadata for chest pain and STEMI workflows.
- Audit events for score use, pathway launches, and escalation recommendations.
- Analytics for ACS pathway adoption and telemetry workflow usage.

**Required integrations:**

- ECG management system or ECG report import.
- Troponin and cardiac lab results through LIS/FHIR observations.
- EHR encounter and order context.
- Telemetry feed or integration handoff from Medical IoT where deployed.
- Cath lab notification or coordination endpoint where available.

**AI workflows:**

- Chest pain risk stratification using HEART score and available history/labs.
- ECG interpretation support with clinician review.
- STEMI pathway checklist and escalation guidance.
- Telemetry event summarization and handoff.
- Cardiology consult preparation.

**Dashboards:**

- Cardiology command center.
- Chest pain and ACS pathway dashboard.
- Telemetry event review dashboard.
- STEMI response and quality dashboard.

**Outcomes:**

- More consistent ACS risk stratification.
- Faster STEMI escalation and pathway coordination.
- Better visibility into telemetry and chest pain workflows.
- Improved documentation for quality programs.

**Pricing tier placeholder:** Standard.

### Laboratory Intelligence Suite

**Target buyer:** Laboratory medical director, pathology leader, diagnostics operations leader, quality leader.

**Target users:** Pathologists, lab managers, lab technologists, pharmacists, physicians, nurses, quality analysts.

**Included assets:**

- `lab-interp`
- `laboratory`
- `abg-interpreter`
- `calculator-recommender-ai`
- `clinical-audit`
- `agent-lab`, `agent-clinical`, `assistant`, `dashboard`, `search`

**Required backend capabilities:**

- Entitlement installation for `laboratory-intelligence`.
- Laboratory workspace preset with lab interpretation, ABG, laboratory dashboard, and clinical audit assets.
- Lab result ingestion, normalization, reference-range handling, interpretation history, and audit trail.
- Role profiles for pharmacist, clinician, and administrator users.
- Analytics for abnormal result review, interpretation usage, and quality-control workflows.

**Required integrations:**

- LIS integration through HL7 ORU, FHIR `DiagnosticReport`, and FHIR `Observation`.
- Reference range, unit normalization, and specimen metadata mapping.
- EHR patient and encounter context.
- Optional middleware for critical value notifications.
- SSO/IAM and lab role provisioning.

**AI workflows:**

- Lab abnormality explanation and next-step context.
- ABG interpretation and acid-base reasoning support.
- Delta-check and trend summarization.
- Calculator recommendation from lab and vital context.
- Quality-control anomaly triage and clinical audit summarization.

**Dashboards:**

- Laboratory intelligence dashboard.
- Critical values and abnormal trends dashboard.
- ABG interpretation dashboard.
- Lab quality and clinical audit dashboard.

**Outcomes:**

- Faster interpretation of complex lab patterns.
- Better critical value visibility.
- More consistent ABG and lab reasoning support.
- Improved auditability for diagnostic workflows.

**Pricing tier placeholder:** Standard.

### Medical IoT Suite

**Target buyer:** Biomedical engineering director, clinical engineering leader, hospital operations leader, chief information officer.

**Target users:** Biomedical engineers, device managers, clinical engineers, IT operations teams, nursing operations, administrators.

**Included assets:**

- `telemetry-monitoring`
- `device-fleet-management`
- `device-maintenance`
- `medical-iot`
- `agent-operations`, `assistant`, `dashboard`, `search`
- Optional shared assets: `asset-tracking-dashboard`, `clinical-audit`, `audit-logs`

**Required backend capabilities:**

- Entitlement installation for `medical-iot-pack`.
- Device inventory, telemetry status, device lifecycle, maintenance, and alert surfaces.
- Organization-scoped device and telemetry reads with membership checks.
- Audit logging for device state changes, alert acknowledgement, and maintenance actions.
- Analytics for uptime, utilization, maintenance risk, and alert burden.

**Required integrations:**

- Device gateways, telemetry brokers, or vendor APIs.
- Biomedical inventory / CMMS integration.
- Location services for device position where available.
- Identity and role provisioning for clinical engineering users.
- Optional SIEM integration for device security events.

**AI workflows:**

- Device anomaly summarization.
- Predictive maintenance prioritization.
- Alert deduplication and operational triage.
- Device utilization recommendations.
- Biomedical incident summary and escalation.

**Dashboards:**

- Medical IoT command dashboard.
- Device fleet and telemetry dashboard.
- Maintenance risk dashboard.
- Device security and operational alert dashboard.

**Outcomes:**

- Higher device uptime.
- Faster maintenance triage.
- Better visibility into telemetry and device utilization.
- Reduced operational noise from duplicate or low-value alerts.

**Pricing tier placeholder:** Enterprise.

### Digital Twin Suite

**Target buyer:** Chief operating officer, facilities leader, command center leader, health-system operations leader.

**Target users:** Operations managers, bed managers, facilities teams, administrators, incident commanders, biomedical engineering, transport coordinators.

**Included assets:**

- `digital-twin`
- `digital-operations-center`
- `hospital-map`
- `asset-tracking-dashboard`
- `hospital-operations-command`
- `incident-command-center`
- `agent-operations`, `assistant`, `dashboard`, `search`
- Optional dependency assets from Medical IoT and Fleet & EMS suites.

**Required backend capabilities:**

- Entitlement installation for `digital-twin-pack`.
- Organization-scoped digital twin read APIs with membership enforcement.
- Hospital map, asset overlay, occupancy, alert overlay, and incident command surfaces.
- Workspace presets for hospital operations and command center teams.
- Analytics for occupancy, asset visibility, incident response, and operational throughput.

**Required integrations:**

- HL7 ADT or FHIR encounter/location feed for bed and location context.
- Facilities, bed management, RTLS, and asset tracking systems.
- Medical IoT feeds for device status overlays.
- Fleet and transport feeds for movement overlays.
- Optional building management, alerting, and incident-management systems.

**AI workflows:**

- Capacity and bottleneck summarization.
- Bed, asset, and transport flow recommendations.
- Incident command situational briefing.
- Operational impact analysis for alerts, outages, or surges.
- What-if scenario support for staffing, capacity, and asset placement.

**Dashboards:**

- Digital operations center.
- Hospital map and asset overlay.
- Occupancy and flow dashboard.
- Incident command dashboard.

**Outcomes:**

- Better capacity visibility.
- Faster incident response and operational coordination.
- Improved asset location awareness.
- Better cross-functional command center workflows.

**Pricing tier placeholder:** Enterprise.

### Fleet & EMS Suite

**Target buyer:** EMS director, transport operations leader, public-safety health leader, health-system logistics leader.

**Target users:** Dispatchers, paramedics, fleet operators, transport coordinators, EMS supervisors, maintenance teams.

**Included assets:**

- `fleet-dashboard`
- `fleet-live-map`
- `live-map`
- `route-optimizer`
- `predictive-maintenance`
- `dispatch-ai`
- `agent-fleet`, `agent-operations`, `assistant`, `dashboard`, `search`

**Required backend capabilities:**

- Entitlement installation for `fleet-logistics`.
- Fleet workspace preset with dispatch, live map, routing, predictive maintenance, and fleet AI assets.
- Vehicle, unit, route, location, maintenance, and dispatch-state APIs.
- Audit logging for route changes, dispatch recommendations, and maintenance actions.
- Analytics for response time, route efficiency, fleet utilization, and maintenance risk.

**Required integrations:**

- CAD / dispatch platform integration.
- GPS / AVL feed for vehicles and crews.
- Fleet maintenance and work-order system integration.
- EHR or ePCR handoff context for patient transport workflows where available.
- Optional traffic, weather, and routing services.

**AI workflows:**

- Dispatch recommendation and unit selection.
- Route optimization with traffic, distance, and unit status.
- EMS-to-ED handoff summary.
- Predictive maintenance prioritization.
- Fleet incident and shift summary.

**Dashboards:**

- Fleet command dashboard.
- Live map and route dashboard.
- Dispatch performance dashboard.
- Maintenance risk and fleet utilization dashboard.

**Outcomes:**

- Improved dispatch efficiency.
- Better fleet visibility.
- Reduced avoidable downtime.
- Stronger EMS-to-hospital operational handoff.

**Pricing tier placeholder:** Standard.

### Simulation & Training Suite

**Target buyer:** Graduate medical education leader, nursing education leader, simulation center director, academic program director.

**Target users:** Medical students, residents, nurses, instructors, simulation technicians, competency administrators, researchers.

**Included assets:**

- `simulation-suite`
- `scenario-player`
- `competencies`
- `agent-education`, `agent-research`, `assistant`, `dashboard`, `search`
- Optional scenario-linked assets: `protocols`, `heart-score`, `news2`, `qsofa`, `gcs-calculator`

**Required backend capabilities:**

- Entitlement installation for `simulation-training-pack`.
- Education workspace preset with scenarios, simulation runs, competency tracking, and assistant access.
- Scenario catalog, run tracking, outcomes, debrief notes, competency mapping, and audit history.
- Role profiles for medical student, researcher, and instructor-style users.
- Analytics for scenario completion, competency gaps, and learner progress.

**Required integrations:**

- LMS integration for course, learner, and completion data.
- SSO/IAM and academic cohort provisioning.
- Credentialing or competency systems where available.
- Optional simulation hardware or scenario content imports.
- Optional calendar and scheduling integration for simulation sessions.

**AI workflows:**

- Scenario generation and adaptation by learner level.
- Real-time scenario hints for instructors.
- Post-scenario debrief and performance summary.
- Competency gap analysis.
- Remediation plan recommendations.

**Dashboards:**

- Simulation suite dashboard.
- Scenario run and completion dashboard.
- Competency coverage dashboard.
- Learner progress and remediation dashboard.

**Outcomes:**

- More consistent simulation delivery.
- Better competency tracking.
- Faster debrief preparation.
- Clearer remediation pathways for learners.

**Pricing tier placeholder:** Academic / Standard.

### Governance & Compliance Suite

**Target buyer:** Compliance officer, chief medical information officer, privacy officer, security officer, AI governance committee, quality leader.

**Target users:** Compliance analysts, privacy teams, security teams, clinical safety reviewers, administrators, quality analysts, model governance reviewers.

**Included assets:**

- `audit-logs`
- `ai-explainability`
- `clinical-audit`
- `system-config`
- `agent-governance`, `assistant`, `dashboard`, `search`
- Optional governance surfaces from platform governance, audit, consent, privacy, release gates, and source provenance modules.

**Required backend capabilities:**

- Entitlement installation for `governance-compliance-pack`.
- Audit log, clinical audit, explainability, policy, release gate, privacy, consent, and security event capabilities.
- Admin-only lifecycle controls and organization-scoped access checks.
- Governance metadata attached to clinical and AI assets.
- Analytics for policy exceptions, audit events, AI usage, safety findings, and compliance workflows.

**Required integrations:**

- IAM / SSO / SCIM for user and role governance.
- SIEM or security event export.
- GRC, ticketing, or compliance workflow systems.
- EHR audit context where available.
- Data retention, privacy request, and consent management integrations.

**AI workflows:**

- Audit event summarization and anomaly review.
- AI answer explainability and evidence trace review.
- Release gate and validation evidence review.
- Privacy request and consent workflow summarization.
- Policy gap and compliance readiness analysis.

**Dashboards:**

- Governance command dashboard.
- Audit and clinical safety dashboard.
- AI explainability and model governance dashboard.
- Privacy, consent, and security event dashboard.

**Outcomes:**

- Stronger audit readiness.
- Better AI governance and clinical safety oversight.
- Clearer evidence trails for regulated workflows.
- Faster compliance review and exception handling.

**Pricing tier placeholder:** Add-on / Enterprise.

### Research Suite

**Target buyer:** University research leader, research institute director, principal investigator, academic medical center innovation leader.

**Target users:** Researchers, principal investigators, research coordinators, medical librarians, students, educators, clinical informaticists.

**Included assets:**

- `guideline-rag`
- `research-evidence-hub`
- `ai-explainability`
- `simulation-suite`
- `differential-ai`
- `competencies`
- `agent-research`, `agent-education`, `assistant`, `dashboard`, `search`

**Required backend capabilities:**

- Entitlement installation for `research-education`.
- Research workspace preset with evidence, RAG, explainability, simulation, and assistant access.
- Evidence source tracking, source provenance, search, research workflow history, and explainability logs.
- Role profiles for researcher and medical student users.
- Analytics for evidence searches, RAG usage, research workflow adoption, and simulation/research outcomes.

**Required integrations:**

- Literature and guideline sources with citation metadata.
- Institutional library, document repository, or knowledge-base connectors.
- IRB or research operations workflow references where available.
- Optional de-identified dataset or analytics workspace integration.
- SSO/IAM and academic cohort provisioning.

**AI workflows:**

- Guideline and literature evidence synthesis.
- Citation-backed research question exploration.
- Differential diagnosis and clinical reasoning support for education/research contexts.
- Study protocol and background drafting support.
- Evidence trace and explainability review.

**Dashboards:**

- Research evidence hub.
- Guideline RAG usage dashboard.
- Evidence provenance and explainability dashboard.
- Research workspace activity dashboard.

**Outcomes:**

- Faster evidence synthesis.
- Better source traceability and explainability.
- Stronger education and research workflows.
- More reusable research knowledge assets.

**Pricing tier placeholder:** Academic / Standard.

## Current Readiness Notes

- Seeded platform assets are packaged into asset packs, but the broader user-facing registry still has `245` inventory-only tools that need canonical `PlatformAsset.id` coverage before every commercial surface can be strictly entitled.
- IoT, telemetry, digital twin, fleet, live tracking, and simulation capabilities should be sold with implementation and readiness qualifiers until production data pipelines replace demo or local-state sources.
- Billing, seat limits, trials, renewals, usage limits, and subscription reconciliation are not final pricing controls yet; pricing placeholders should remain metadata until those systems update organization entitlements.
- Integrations are required product capabilities, but each customer deployment should identify whether a given integration is already available, implementation-required, partner-required, roadmap, or demo-only.
- Clinical AI workflows require governance metadata, audit logging, safety labels, and validation evidence before they are marketed as production clinical decision support.

## Cross-Pack Dependencies

- **Core Platform:** Required by every suite for authentication, assistant access, dashboard shell, search, calculators, protocols, drug checking, and shared AI agent surfaces.
- **AI Workflow Pack:** Can be sold as an enterprise platform add-on or embedded into clinical suites where workflows require `ambient-scribe`, `differential-ai`, `timeline-ai`, `patient-summary-ai`, `order-set-ai`, or `clinical-documentation-assistant`.
- **Governance & Compliance Suite:** Recommended for any deployment using clinical AI, regulated workflows, PHI-bearing integrations, audit trails, release gates, or security exports.
- **Medical IoT Suite:** Strengthens ICU, Cardiology, Digital Twin, and Fleet workflows by providing telemetry, device state, and maintenance signals.
- **Digital Twin Suite:** Depends on live operational feeds for full value; it can launch in demo or planning mode without those integrations, but production claims require live ADT, location, facilities, asset, or IoT data.
- **Simulation & Training Suite:** Can be sold independently for education, or bundled with ED, ICU, Cardiology, and Research suites for pathway-specific scenario training.

## Shared Backend Capabilities

The packs depend on the following platform capabilities becoming consistent across product, onboarding, workspace, and runtime surfaces:

- Product catalog and commercial plan mapping.
- Asset pack entitlements through organization-level `OrganizationEntitlement` records.
- Platform asset registry coverage for every user-facing asset.
- Strict SaaS entitlement mode for tenant-scoped visibility and launch behavior.
- Backend authoritative workspaces for hospital, emergency, fleet, research, admin, and personal contexts.
- Role profiles for emergency physician, nurse, pharmacist, fleet operator, administrator, researcher, and medical student personas.
- Asset access projection for `allowed`, `locked`, `restricted`, `demo-only`, `requires-review`, and `unsupported` states.
- Audit, analytics, lifecycle, and governance metadata for clinical, operational, AI, and integration actions.
- Organization onboarding that installs commercial plan products, pack entitlements, role profiles, workspace templates, and requested integrations.

## Sales Readiness Backlog

1. Complete platform-asset backfill for the remaining user-facing registry tools so all sellable surfaces have canonical `PlatformAsset.id` records.
2. Normalize overlapping pack language, especially `emergency-department-pack` and `emergency-medicine`, so the Emergency Department Suite has one canonical sales story.
3. Attach readiness labels to every suite asset, especially IoT, telemetry, digital twin, fleet, live tracking, and simulation surfaces that are currently demo or local-state backed.
4. Define integration implementation status for each pack: available, implementation-required, partner-required, roadmap, or demo-only.
5. Reconcile billing and subscription events into organization entitlements rather than treating pricing metadata as the entitlement source.
6. Route all product and commercial launch actions through the central asset-aware access projection.
7. Seed baseline governance policies, audit retention settings, consent defaults, and AI safety gates per tenant type.
8. Add product analytics that report adoption and outcomes at suite, pack, asset, role, workspace, and organization levels.
9. Define services packaging for enterprise deployments: integration build, clinical validation, governance setup, workflow design, training, and go-live support.
10. Create sales collateral and implementation checklists from this plan once readiness status and pricing terms are finalized.

## Implementation Notes For Later Code Work

- Do not create separate product-specific tool lists. Products should continue to point to pack IDs, and packs should point to platform asset IDs.
- Keep `Laboratory Intelligence Suite` as the sales display name while preserving the existing `laboratory-suite` product slug and `laboratory-intelligence` pack ID unless a migration is planned.
- Treat pricing placeholders as sales packaging metadata only until billing, trials, seat limits, renewals, usage limits, and subscription reconciliation are implemented.
- Use the Governance & Compliance Suite as a control layer for clinical AI and regulated workflows rather than duplicating governance features in every specialty pack.
- Production rollout should require clear evidence for data integration, tenant isolation, auditability, clinical validation, safety labeling, and support ownership.
