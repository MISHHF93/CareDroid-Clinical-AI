## Research-backed expansion of the CareDroid platform

The next evolution should make CareDroid a **standards-based clinical workflow, intelligence, and safety platform**, not simply a collection of AI features. The most valuable additions are those that strengthen the chain from patient identification and intake through clinical action, operational coordination, and measurable outcomes.

### 1. Canonical clinical data and interoperability layer

Create a dedicated **CareDroid Interoperability Gateway** that separates external hospital interfaces from the internal domain model. It should support HL7 v2 ADT messages for registration, admission, discharge, transfer, and updates; FHIR APIs for modern exchange; SMART on FHIR for embedded application launch and authorization; CDS Hooks for workflow-triggered decision support; DICOMweb for imaging; and asynchronous FHIR Bulk Data for analytics and population-level exports. FHIR R5 remains the current published FHIR specification, while Canadian deployment should also map to CA Core+ and profiles in the Canadian FHIR Registry rather than using generic FHIR resources without Canadian constraints. ([HL7][1])

Implement an **anti-corruption layer** so CareDroid does not expose internal database tables directly as FHIR resources. Each integration should pass through:

```text
External System
   ↓
Integration Adapter
   ↓
Validation and Terminology Mapping
   ↓
Canonical CareDroid Domain Model
   ↓
Workflow and Event Engine
   ↓
FHIR/HL7 response or downstream event
```

Every interface should publish a `CapabilityStatement`, supported profile versions, terminology bindings, error semantics, retry policy, and conformance-test results.

### 2. Enterprise patient identity and duplicate-record management

Reception should include a formal **Enterprise Master Patient Index capability**, not only a basic patient search. It should support deterministic and probabilistic matching, configurable matching weights, temporary or unidentified patient creation, duplicate warnings, record linking, controlled merges, identity correction, and complete merge/unmerge audit history. IHE patient-administration guidance explicitly covers patient creation, demographic updates, identifier changes, admission/discharge/transfer workflows, and encounter management; IHE also recognizes that healthcare exchanges frequently operate across multiple identifier domains. ([IHE Profiles][2])

The Reception workflow should therefore include:

* Search before create.
* Exact and fuzzy matches across names, aliases, date of birth, health-card identifiers, telephone numbers, addresses, and previous encounters.
* Explicit “possible duplicate” and “confirmed duplicate” states.
* Human-reviewed merge and unmerge operations.
* Downtime identifiers and unidentified-patient workflows.
* Identity confidence scoring that is separate from clinical risk scoring.
* Detection of expired, inconsistent, or unreadable identity documents.
* Full propagation of corrected identity information to downstream systems.

OCR should assist identity matching, but **OCR output must never automatically overwrite an authoritative patient record**.

### 3. Structured intake and adaptive forms

Replace hardcoded registration forms with a **FHIR Questionnaire and QuestionnaireResponse–compatible intake engine**. FHIR QuestionnaireResponse is designed to preserve which questions were asked, their order, and the corresponding answers, making it suitable for configurable intake, screening, consent, and history forms. ([FHIR][3])

The form engine should support:

* Conditional questions and branching logic.
* Required-field rules based on jurisdiction and encounter type.
* Repeating sections.
* Multilingual labels and patient-facing explanations.
* Draft autosave and recovery.
* Versioned form templates.
* Data extraction into Patient, RelatedPerson, Coverage, Consent, Observation, AllergyIntolerance, Condition, and DocumentReference resources.
* Provenance linking each structured value to manual entry, OCR, imported records, or patient self-entry.
* Side-by-side comparison between scanned documents and extracted values.

This makes intake forms configurable without rebuilding the Reception frontend for every hospital.

### 4. Consent, privacy, provenance, and break-glass access

Add a **Consent and Information Governance Service** as a first-class subsystem. It should manage consent capture, withdrawal, expiry, substitute decision-makers, permitted purposes, sensitive-data restrictions, disclosure history, and emergency-access overrides.

Because CareDroid is being developed in Ontario, its privacy architecture should be designed around PHIPA obligations for electronic collection, use, modification, disclosure, retention, and disposal of personal health information. The final legal requirements must be reviewed by qualified Ontario privacy counsel and the participating health information custodian. ([Ontario][4])

Implement:

```text
Consent
Purpose of use
User role
Patient relationship
Organization
Data sensitivity
Jurisdiction
Emergency override
Decision
Audit record
```

Every important clinical or administrative data change should produce FHIR-compatible `Provenance` and `AuditEvent` records. Break-glass access should require a reason, produce immediate auditing, trigger configurable privacy review, and never silently bypass authorization.

### 5. Computable clinical knowledge platform

Build a **Clinical Knowledge Artifact Registry** rather than embedding medical logic directly inside frontend components or AI prompts. FHIR’s Clinical Reasoning module supports representing and evaluating clinical rules, protocols, order sets, evidence summaries, quality measures, and other knowledge artifacts using resources such as `Library`, `PlanDefinition`, `ActivityDefinition`, `Measure`, and expression languages such as CQL and FHIRPath. ([FHIR][5])

Each CareDroid knowledge artifact should include:

* Clinical owner.
* Source guideline or policy.
* Jurisdiction.
* Version and effective date.
* Patient population and exclusions.
* Computable logic.
* Required data elements.
* Evidence strength.
* Review and expiry date.
* Validation status.
* Change history.
* Deployment status.
* Measured clinical and workflow impact.

This permits hospitals to approve, version, test, and retire clinical rules independently of application releases.

### 6. Workflow-triggered clinical decision support

Create a **CDS Orchestration Gateway** supporting CDS Hooks discovery, prefetch, cards, suggested actions, source attribution, and SMART application launch. CDS Hooks is explicitly intended to invoke decision support within the clinician’s workflow and can return information or actionable suggestions. Existing hooks include encounter start, order selection, order signing, appointment booking, and order dispatch. ([CDS Hooks][6])

CareDroid should add internal equivalents for emergency workflows:

```text
patient-arrived
registration-started
identity-match-uncertain
registration-completed
triage-started
triage-completed
risk-status-changed
critical-result-received
patient-left-without-being-seen-risk
bed-requested
bed-assigned
consult-requested
discharge-started
discharge-ready
```

Every recommendation must support accept, modify, reject, defer, and “not applicable,” with reasons captured for evaluation. Interruptive alerts should be reserved for situations in which interruption is justified by clinical risk; lower-priority guidance should appear as passive cards or task-list suggestions. ONC guidance emphasizes that CDS should provide appropriately filtered information to the right person at the appropriate point of care, while its updated SAFER materials focus on safe implementation and monitoring of ordering and decision support. ([Health IT Playbook][7])

### 7. Clinical safety management system

Create a permanent **Clinical Safety Office module** within the repository. It should maintain:

* Hazard log.
* Safety case.
* Intended-use statements.
* Foreseeable misuse analysis.
* Clinical-risk controls.
* Human-factors findings.
* Known limitations.
* Safety-related test evidence.
* Incident and near-miss reports.
* Corrective and preventive actions.
* Release-safety approval.
* Post-deployment monitoring.

Any feature capable of changing triage priority, suggesting diagnosis or treatment, interpreting clinical data, or influencing care should undergo explicit clinical-risk classification before release.

CareDroid should also implement **model cards and clinical capability cards** describing each AI model’s intended use, prohibited use, training-data boundaries, evaluated populations, known failure modes, performance measures, required human oversight, and rollback procedures. NIST’s AI Risk Management Framework organizes ongoing AI governance around managing risks throughout the AI lifecycle, including validity, reliability, safety, transparency, accountability, interpretability, and explainability. ([NIST][8])

### 8. AI execution gateway and model operations

Do not allow pages to call language models directly. Build a centralized **AI Execution Gateway** responsible for:

```text
Authentication and authorization
Purpose-of-use checks
Prompt-template versioning
Retrieval orchestration
PHI handling controls
Model routing
Structured-output validation
Tool authorization
Confidence and uncertainty handling
Safety policies
Human approval
Latency and cost tracking
Audit and provenance
Evaluation
Fallback and rollback
```

Add an **AI evaluation laboratory** with golden datasets, synthetic test patients, adversarial cases, missing-data cases, demographic subgroup evaluation, hallucination tests, prompt-injection tests, retrieval-quality tests, and human-clinician review.

The AI assistant should never claim that an action was completed merely because it generated text. An action is complete only after the relevant backend command succeeds, the database transaction commits, downstream events are published, and the frontend receives confirmation.

### 9. OCR document-intelligence platform

Upgrade the trained OCR model into a full **Document Intelligence Service** with the following pipeline:

```text
Capture
→ Image-quality assessment
→ Document classification
→ Orientation and de-skewing
→ OCR
→ Field extraction
→ Terminology and format normalization
→ Confidence calculation
→ Identity comparison
→ Human verification
→ Structured persistence
→ Original-document retention
→ Provenance and audit
```

Create separate extraction schemas for health cards, driver’s licences, passports, insurance documents, referrals, medication lists, laboratory reports, discharge summaries, and consent forms. Each extracted field should retain its bounding box, page, model version, raw value, normalized value, confidence, reviewer, correction history, and destination field.

Add performance dashboards for:

* Document-classification accuracy.
* Character and word error rates.
* Field-level precision and recall.
* Straight-through processing rate.
* Manual correction rate.
* Processing latency.
* Failure rate by document type.
* Performance by capture device and image quality.
* Identity-mismatch detection.
* Model drift.

### 10. Emergency Department digital twin and bed-management engine

The digital twin should become operational rather than decorative. IHE has published a bed-management interoperability profile specifically addressing data exchange for patients admitted from an emergency department. ([IHE International][9])

Model:

* Waiting-room queues.
* Triage state.
* Treatment zones.
* Rooms and beds.
* Isolation requirements.
* Cleaning status.
* Staffing capacity.
* Diagnostic dependencies.
* Consult delays.
* Admission requests.
* Boarding time.
* EMS arrivals.
* Transport status.
* Discharge barriers.
* Predicted demand.

The system should distinguish clearly among:

1. **Observed state** from authoritative systems.
2. **Derived state** calculated from rules.
3. **Predicted state** generated by models.
4. **Simulated state** produced by scenario planning.

These states must never be visually interchangeable.

### 11. Imaging and diagnostics workspace

Add a standards-based diagnostics module using `ServiceRequest`, `DiagnosticReport`, `Observation`, `Specimen`, and `ImagingStudy`, with DICOMweb support for querying, retrieving, and displaying medical images. DICOMweb provides RESTful web services for imaging, while DICOM remains the international standard for medical images and related information. ([DICOM Standard][10])

Provide:

* Order status and turnaround tracking.
* Specimen lifecycle.
* Preliminary versus final reports.
* Critical-result acknowledgment.
* Result trending.
* Imaging thumbnail and viewer launch.
* Failed or delayed study escalation.
* Closed-loop communication.
* Audit of who reviewed each result.

CareDroid should initially orchestrate and display imaging rather than attempt to replace a certified diagnostic workstation.

### 12. Data-quality and Canadian reporting layer

Build a **Data Quality Command Center** that validates completeness, conformance, consistency, timeliness, uniqueness, and plausibility. For Canadian deployments, map the ED domain to NACRS demographic, administrative, clinical, and service-specific data requirements, as well as ICD-10-CA, CCI, and relevant Canadian ED pick lists. CIHI describes NACRS as the national system for emergency and ambulatory-care data, and the 2026–2027 data elements should inform—but not dictate—the internal domain model. ([CIHI][11])

Add:

* Real-time validation rules.
* Missing-data work queues.
* Coding suggestions requiring human confirmation.
* Submission-readiness reports.
* Error and warning decoders.
* Data lineage.
* Facility-specific configuration.
* Retrospective quality dashboards.

This is commercially valuable because it turns regulatory and operational reporting into a by-product of good workflows rather than a separate manual exercise.

### 13. Human-factors and usability laboratory

Establish measurable usability requirements for Reception and all subsequent modules. Health IT problems can arise from poor interface design, weak cognitive support, misalignment with physical workflows, and inadequate configuration or training. ONC therefore recommends user-centred design and human-factors methods grounded in frontline workflow needs. ([ONC][12])

Measure:

* Time to register a known patient.
* Time to create an unidentified patient.
* Number of keystrokes and clicks.
* Search success rate.
* Duplicate-record interception rate.
* Form abandonment rate.
* OCR correction time.
* Error recovery success.
* Keyboard-only task completion.
* Alert acceptance and override rates.
* Task completion during simulated interruptions.
* System Usability Scale or an equivalent validated instrument.
* Cognitive workload using an appropriate assessment method.
* Accessibility completion rates.

Do not allow “looks polished” to substitute for task-based usability evidence.

### 14. Regulatory boundary management

CareDroid needs a **Feature Intended-Use Registry** classifying each capability as administrative, operational, informational, clinical decision support, or potentially medical-device functionality. Health Canada’s machine-learning medical-device guidance applies where an ML system is used to achieve a medical purpose, and its transparency principles emphasize the performance of the human–AI team and provision of clear, essential information to users. ([Canada][13])

Each feature record should include:

* Intended user.
* Intended patient population.
* Intended purpose.
* Inputs and outputs.
* Whether the output influences diagnosis or treatment.
* Degree of user reliance.
* Required human review.
* Regulatory assessment.
* Validation evidence.
* Market jurisdictions.
* Approved product claims.

This avoids accidentally turning an operational tool into an unassessed medical-device function through marketing language or feature expansion.

---

# Recommended build order

CareDroid should not attempt all of these simultaneously. The safest sequence is:

**Phase 1 — Foundational intake**

Reception profile, identity search, patient creation, OCR verification, structured forms, consent, audit, role-based access, and complete frontend-to-backend execution.

**Phase 2 — Workflow backbone**

Canonical encounters, event engine, task engine, triage handoff, downstream status tracking, notifications, and digital-twin state synchronization.

**Phase 3 — Interoperability**

HL7 v2 ADT, FHIR gateway, terminology service, CA Core+ mapping, SMART authorization, CDS Hooks, and DICOMweb launch.

**Phase 4 — AI governance**

AI Execution Gateway, model registry, RAG provenance, evaluation laboratory, approval workflows, monitoring, and clinical-safety controls.

**Phase 5 — Operational intelligence**

Patient-flow forecasting, bed management, command centre, capacity modelling, wait-time prediction, and simulations.

**Phase 6 — Advanced clinical intelligence**

Computable guidelines, CQL-based rules, quality measures, order-support workflows, clinical models, and regulated functionality only after intended-use and regulatory assessment.

---

# Master prompt extension for Claude

> Extend the CareDroid Master Architecture Program by implementing a standards-based Medical Informatics Expansion Layer across the entire repository. Begin with a complete discovery audit and do not assume that any existing page, route, component, API, database entity, AI function, OCR function, workflow, integration, theme, permission, test, or documentation artifact is complete merely because it exists. Create a verified capability map that labels every function as production-ready, partially implemented, mocked, disconnected, duplicated, deprecated, unsafe, or missing, and trace each user action from the frontend through state management, API contracts, authentication, authorization, validation, business logic, database transactions, event publication, downstream integrations, observability, and final UI confirmation. Establish the Reception Desk and Reception User Profile as the first reference implementation and production-quality vertical slice of CareDroid, including enterprise patient search, deterministic and probabilistic duplicate detection, temporary and unidentified patient registration, identity correction, merge and unmerge controls, emergency registration, health-card and identity-document OCR, structured adaptive intake forms, consent capture, substitute decision-maker details, multilingual support, human verification, audit history, downstream encounter creation, triage handoff, and failure recovery. Treat OCR as a governed Document Intelligence Service with image-quality checks, document classification, orientation correction, field-level confidence, bounding-box provenance, normalized values, human review, correction history, model-version tracking, drift monitoring, and secure association of the original document with the patient record; OCR output must never silently overwrite authoritative data or trigger an irreversible clinical or identity action. Build a FHIR Questionnaire and QuestionnaireResponse-compatible adaptive form engine and map verified intake information into the canonical CareDroid domain model and appropriate FHIR resources. Create an enterprise patient-identity service supporting identifier domains, aliases, fuzzy matching, temporary identities, duplicate candidates, controlled linking, controlled merging, reversible corrections, and complete event propagation. Establish a dedicated interoperability gateway supporting versioned HL7 v2 ADT interfaces, FHIR APIs, SMART on FHIR authorization, CDS Hooks, DICOMweb, terminology validation, Canadian CA Core+ profiles, conformance testing, retry handling, acknowledgments, dead-letter processing, and an anti-corruption layer that prevents external message formats from becoming the internal domain model. Implement a Clinical Knowledge Artifact Registry using versioned Library, PlanDefinition, ActivityDefinition, Measure, terminology, CQL, FHIRPath, guidelines, order sets, institutional policies, evidence sources, clinical owners, review dates, approval states, and retirement workflows. Create a CDS Orchestration Gateway capable of responding to standard CDS Hooks and internal emergency-department events, returning non-interruptive information, warnings, evidence, suggested actions, and SMART application launches while recording acceptance, modification, rejection, deferral, reason, user, patient context, model or rule version, and clinical outcome. Build a centralized AI Execution Gateway so that no page calls a model directly; all AI requests must pass through authentication, authorization, purpose-of-use checks, prompt and model versioning, secure retrieval, PHI controls, structured-output schemas, tool permissions, provenance, confidence and uncertainty handling, human approval, latency and cost monitoring, safety policies, audit logging, fallback, and rollback. Maintain model cards and clinical capability cards defining intended use, prohibited use, input requirements, evaluated populations, performance, limitations, failure modes, human oversight, and deployment status, and create an AI evaluation laboratory containing synthetic patients, golden test sets, missing-data cases, contradictory data, adversarial prompts, prompt-injection tests, retrieval-grounding tests, subgroup evaluations, workflow simulations, and clinician-reviewed acceptance criteria. Establish a Clinical Safety Management System containing an intended-use registry, hazard log, foreseeable misuse analysis, safety case, risk controls, validation evidence, known limitations, incident and near-miss reporting, corrective and preventive actions, release approval, post-deployment monitoring, and regulatory-boundary assessment for every feature that may influence diagnosis, triage, treatment, or clinical prioritization. Build consent, privacy, provenance, and audit services supporting role, purpose of use, patient relationship, organization, sensitivity, jurisdiction, consent status, emergency break-glass access, disclosure logging, retention, correction, and immutable review history, with Ontario PHIPA and other target-jurisdiction requirements represented as configurable policy controls rather than hardcoded assumptions. Expand the Clinical Intelligence Graph and emergency-department digital twin to distinguish authoritative observed state, rule-derived state, model-predicted state, and simulation state across patients, encounters, queues, rooms, beds, staff capacity, diagnostics, consults, admissions, discharge barriers, EMS arrivals, cleaning, isolation, and operational resources. Add an interoperable bed-management engine, diagnostics workspace, critical-results acknowledgment workflow, specimen lifecycle, DICOMweb imaging access, result trending, and closed-loop communication. Implement a Canadian data-quality and reporting layer mapping the canonical domain to NACRS, ICD-10-CA, CCI, the Canadian Emergency Department Diagnosis Shortlist, CA Core+, and configurable provincial requirements while retaining a jurisdiction-neutral core architecture. Continuously validate completeness, conformance, consistency, uniqueness, plausibility, timeliness, lineage, coding readiness, and submission readiness. Create a formal Human Factors and Usability Laboratory that measures time on task, clicks, keystrokes, error rate, duplicate interception, OCR correction burden, keyboard-only completion, accessibility, alert response, workflow recovery, cognitive workload, and simulated high-pressure performance. Fully enforce the CareDroid Enterprise Design Language through centralized tokens, approved fonts, semantic colours, spacing, card dimensions, responsive grids, clinical light and dark themes, high-density mode, high-contrast mode, role-specific dashboards, consistent AI-assistant presentation, accessible status communication, and reusable components; scan every deep route and nested page, not merely top-level dashboards, and treat hardcoded colours, inconsistent typography, duplicate cards, unfinished screens, disconnected actions, mocked success messages, inaccessible controls, missing loading states, and theme divergence as defects. Preserve the CareDroid assistant as a calm, professional, empathetic female digital clinical colleague with one governed visual identity and role-adaptive communication, but do not allow gendered presentation, animation, or conversational personality to obscure clinical data, imply human credentials, create undue reliance, or interfere with accessibility. For every implementation cycle, produce an evidence-backed repository health report, capability matrix, architecture decision records, clinical-safety report, interoperability conformance report, accessibility report, AI and OCR evaluation report, unresolved-risk register, and prioritized next-action plan. Never claim that functionality works because a component renders or a model returns text; functionality is complete only when the authenticated user can execute the workflow, the backend validates and commits it, relevant events and integrations succeed or fail safely, the UI shows an accurate confirmed state, audit and provenance records exist, automated tests pass, observability confirms operation, and the workflow meets documented clinical, usability, privacy, security, and safety acceptance criteria.

The most important immediate objective remains **a fully executable Reception-to-Triage vertical slice**. That will provide the architectural pattern against which every later CareDroid department can be built and measured.

[1]: https://www.hl7.org/fhir/?utm_source=chatgpt.com "Hl7/FHIR"
[2]: https://profiles.ihe.net/ITI/HIE-Whitepaper/index.html?utm_source=chatgpt.com "HIE-Whitepaper - IHE Publications"
[3]: https://fhir.hl7.org/fhir/questionnaireresponse.html?utm_source=chatgpt.com "QuestionnaireResponse - FHIR v5.0.0"
[4]: https://www.ontario.ca/laws/statute/04p03?utm_source=chatgpt.com "Personal Health Information Protection Act, 2004"
[5]: https://fhir.hl7.org/fhir/clinicalreasoning-module.html?utm_source=chatgpt.com "Clinicalreasoning-module - FHIR v5.0.0 - HL7 FHIR Specification"
[6]: https://cds-hooks.org/specification/current/?utm_source=chatgpt.com "Current"
[7]: https://playbook.healthit.gov/playbook/quality-and-patient-safety/?utm_source=chatgpt.com "Quality & Patient Safety - Health IT Playbook - HealthIT.gov"
[8]: https://www.nist.gov/itl/ai-risk-management-framework?utm_source=chatgpt.com "AI Risk Management Framework | NIST"
[9]: https://www.ihe.net/uploadedFiles/Documents/PCC/IHE_PCC_Suppl_BED.pdf?utm_source=chatgpt.com "Technical Framework Supplement Bed Management"
[10]: https://www.dicomstandard.org/using/dicomweb?utm_source=chatgpt.com "DICOMweb™"
[11]: https://www.cihi.ca/en/national-ambulatory-care-reporting-system-nacrs-metadata?utm_source=chatgpt.com "National Ambulatory Care Reporting System (NACRS) ..."
[12]: https://healthit.gov/blog/electronic-health-and-medical-records/reducing-the-clinician-burden-shaping-health-it-as-an-asset/?utm_source=chatgpt.com "Reducing the Clinician Burden: Shaping Health IT as an ..."
[13]: https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/pre-market-guidance-machine-learning-enabled-medical-devices.html?utm_source=chatgpt.com "Pre-market guidance for machine learning-enabled ..."
