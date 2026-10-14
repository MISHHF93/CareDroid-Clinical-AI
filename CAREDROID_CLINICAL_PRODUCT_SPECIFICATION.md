# CareDroid — Master Clinical Product & Architecture Specification

> **Classification:** Confidential — CareDroid Healthcare Technologies  
> **Target Platform:** CareDroid Clinical AI Platform  
> **Status:** Active Master Reference  
> **Version:** 2.4.0 (Clinical Consolidation Edition)  
> **Primary Jurisdiction:** Canada (PHIPA / PIPEDA) & United States (HIPAA / HITECH)  

---

## 1. Executive Summary & Vision

CareDroid is a modern **Medical Intelligence and Emergency Department Healthcare Operations Platform** engineered to eliminate operational bottlenecks, reduce patient wait times, accelerate triage-to-treatment intervals, and empower clinical care teams through agentic AI, real-time physiological telemetry, and streamlined clinical workflows.

CareDroid is **strictly a clinical healthcare platform**. All legacy references, non-clinical models, and non-medical domains (such as equine/racing legacy modules) are strictly excluded and excised from the core architecture. Every entity, role, calculator, interface, and telemetry pipeline serves human patients, clinical teams, and healthcare administration.

### Platform Mission
To empower emergency departments, intensive care units, inpatient wards, and regional healthcare networks with:
1. **Immediate Situational Awareness:** High-density, real-time departmental dashboards that surface bed occupancy, acuity, inbound EMS arrivals, and pending clinical tasks at a glance.
2. **Clinical Decision Support (CDS):** Validated medical calculation tools, evidence-based triage protocols, lab trend interpretation, and differential diagnostic guidance.
3. **Streamlined Clinical Usability:** Compact, high-density UI designs adhering to clinical workspace ergonomics — reducing unnecessary whitespace, eliminating oversized inputs, and putting critical patient data above the fold.
4. **Interoperable & Compliant Architecture:** HL7 FHIR R4 interoperability, end-to-end encrypted medical telemetry, audit logging, and role-based access control (RBAC).

---

## 2. Core Clinical Personas & Access Boundaries

CareDroid enforces a unified, role-based access control (RBAC) model grounded in `src/lib/users/canonicalAccess.ts` and `src/config/userProfileCatalog.ts`.

| Persona | Clinical Focus & Primary Workspaces | Key Capabilities |
| :--- | :--- | :--- |
| **Emergency Physician** | ED Whiteboard, Patient Detail, Clinical Decision Support, Medical Calculators | Order entry, diagnostic review, clinical discharge/admission, escalation notes |
| **Charge Nurse / Nurse Manager** | Department Pulse, ED Whiteboard, Shift Summary, Resource Board | Bed assignment, nursing staffing ratios, department capacity rebalancing, diversion alerts |
| **Triage Nurse** | Smart Intake, Reception Workspace, CTAS/ESI Scoring, Rapid Registration | Acuity assignment (CTAS 1–5), vital signs capture, infectious disease isolation flagging |
| **Paramedic / EMS Crew** | Dispatch Console, EMS Pipeline, Mobile Inbound Handover | Inbound telemetry, ETA calculation, pre-hospital vitals stream, digital turnover report |
| **Patient Flow Coordinator** | Bed Management, Transfer Board, Inpatient Bed Logistics | Bed requests, transport dispatch, discharge lounge tracking, bottleneck resolution |
| **Clinical Pharmacist** | Drug Checker, Pharmacy Dashboard, Medication Reconciliation | Drug-drug interaction screening, dosage renal adjustments, antibiotic stewardship |
| **Lab / Radiology Tech** | Laboratory Dashboard, Radiology Console, 3D Medical Viewer | Critical value reporting, specimen tracking, PACs integration, STAT imaging alerts |
| **Hospital Administrator / CMO** | Executive Command Center, Predictive Analytics, Automation Audit | Department throughput KPIs, length of stay (LOS), LWBS rates, regulatory audits |

---

## 3. High-Density UI & Visual Architecture Standards

CareDroid's frontend is crafted using React 18, TypeScript, and Vite. The design philosophy strictly prioritizes **clinical efficiency, information density, and ergonomic touch/keyboard navigation**:

### Control Dimensions & Sizing Scale
- **Compact Button Heights:** Primary and secondary actions utilize compact heights:
  - Small (`--cdl-control-height-sm`): **28px** (table action buttons, tags, chips)
  - Medium (`--cdl-control-height-md`): **32px** (standard buttons, form actions, toolbar controls)
  - Large (`--cdl-control-height-lg`): **36px** (modal triggers, primary submission banners)
- **Compact Form Inputs:** Form inputs and selects standardized to **32px** min-height with **5px 10px** padding and **13px–13.5px** legible typography, eliminating excessive vertical bloat.
- **Color Discipline & Brand Tokens:**
  - Medical Brand Primary: Teal 600 (`#0f766e`) and Teal 500 (`#0d9488`).
  - Critical Alerts: Red 600 (`#dc2626`) and Amber 500 (`#f59e0b`).
  - Medical Surfaces: Neutral slate backgrounds (`#f8fafc` / `#f1f5f9`), crisp white cards (`#ffffff`), and subtle clinical borders (`#e0f2fe` / `#e2e8f0`).
  - Strict absence of unapproved low-contrast grays (`#9ca3af` is prohibited by style contract test).

### Clinical Whiteboard Architecture
- **Zero Vertical Chrome Waste:** Top notification bars, command strips, and filters are compressed into dense, horizontal ribbons (44px–46px total height), preserving the primary viewport space for patient bed cards and acute care tracking.
- **Status Indicators:** Immediate visual triage badges (CTAS 1 Red, CTAS 2 Orange, CTAS 3 Yellow, CTAS 4 Green, CTAS 5 Blue) with high-contrast text and border differentiation.

---

## 4. Clinical Features & Applications

### 4.1. Emergency Department Operations
- **Interactive Whiteboard (`/emergency/whiteboard`):** Real-time bed board displaying patient status, bed assignment, primary nurse/physician, pending labs/imaging, and elapsed LOS.
- **Department Pulse (`/emergency/pulse`):** High-level operational telemetry showing active census, capacity score, high-risk patient count, reassessment alerts, and inbound EMS ambulances.
- **Reception & Smart Intake (`/emergency/reception`, `/emergency/intake`):** Rapid bedside intake, demographic verification, triage complaint capture, and immediate acuity assignment.
- **Dispatch Console & EMS Pipeline (`/emergency/dispatch`):** Real-time inbound ambulance telemetry, GPS tracking, pre-hospital vitals streaming, and direct ED handoff communication.

### 4.2. Evidence-Based Clinical Decision Support (CDS)
Integrated clinical calculators with validation testing and medical reference grounding:
- **Cardiology:** HEART Score, TIMI Risk Score (UA/NSTEMI), ASCVD Pooled Cohort Equations, GRACE ACS Risk.
- **Critical Care & Sepsis:** NEWS2 (National Early Warning Score), qSOFA, SOFA Score.
- **Pulmonology:** Wells' Criteria for Pulmonary Embolism, PERC Rule, STOP-Bang (Sleep Apnea).
- **Neurology:** Canadian C-Spine Rule, NEXUS Criteria, NIHSS (Stroke Scale), ABCD2 (TIA risk).
- **Gastroenterology & Hepatology:** MELD Score, Child-Pugh Score, Ranson's Criteria, FIB-4.
- **Mental Health & Screening:** PHQ-9 (Depression), GAD-7 (Anxiety), AUDIT-C (Alcohol Screening).

### 4.3. Clinical Agent Command Platform & Medical Intelligence
- **Clinical Agent Commander (Chief):** Orchestrator of an intelligence ecosystem rather than an ungrounded LLM. Governs context, planning, delegation, verification, and synthesis while remaining subordinate to domain backends and clinician approval.
- **Chief Investigation Plan Runner (`backend/src/modules/chief-investigation/`):** Deterministic patient deterioration investigation engine (OBSERVE + PREPARE only; no autonomous mutation or ungrounded planning). Prepares structured, human-reviewed diagnostic and therapeutic action proposals for bedside clinician approval.
- **Capability Registry (`src/lib/ai/capabilityRegistry.ts`, `src/lib/ai/capabilityRegistrations.ts`):** Canonical registry declaring clinical AI and tool capabilities with honest modality and source-category metadata (medical calculators explicitly tagged `TOOL_RESULT`).
- **Clinical Documentation Assistant:** Automated structuring of clinical encounter notes, SOAP notes, discharge summaries, and handover briefs with human-in-the-loop review.
- **Clinical Knowledge Graph:** Semantic graph linking symptoms, diseases, contraindications, and laboratory benchmarks.
- **Drug Interaction & Safety Engine:** Real-time checking of drug-drug, drug-allergy, and drug-disease contraindications against national formularies.

---

## 5. Security, Governance & Regulatory Preparedness

CareDroid is engineered from the ground up to meet stringent healthcare privacy, security, and safety standards:

1. **Zero PHI in Logs:** Application and backend logging pipelines filter out all Protected Health Information (PHI). Operational telemetry logs only transaction IDs, latency, role identifiers, and system events.
2. **Data Segregation & Tenancy:** Strict organization-level and department-level data segregation to ensure complete multi-tenant isolation.
3. **Auditability & Traceability:** Immutable audit logging for every clinical order, triage modification, patient state transition, and note export.
4. **Responsible AI Framework:**
   - AI outputs are explicitly labeled as assistive recommendations.
   - All AI clinical inferences mandate qualified human clinician verification before action or placement into patient records.
   - Guardrails prevent hallucinated dosing or ungrounded clinical claims.

---

## 6. Technical Stack & Repository Architecture

- **Frontend:** React 18, TypeScript 5, Vite, Lucide Icons, Recharts, Zustand.
- **Backend:** NestJS, TypeScript, TypeORM, PostgreSQL (Production) / SQLite with synchronize (Development).
- **Communication Protocol:** RESTful JSON HTTP APIs with strict type schemas.
- **Quality Gates:** 
  - `npm run verify`: Typecheck both frontend and backend, ESLint, living docs check, dependency integrity check, and architecture check.
  - Contract testing for CSS tokens, accessibility (Axe-core), contrast ratios, and route redirection parity.

---

## 7. Master Documentation Ecosystem (32 Primary Specifications)

CareDroid maintains a fully audited, living documentation suite across 15 canonical directories in `docs/`:

| Domain | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Index** | [`docs/MASTER_DOCUMENTATION_INDEX.md`](docs/MASTER_DOCUMENTATION_INDEX.md) | Central registry of all 32 specifications, maturity classifications, and verification triggers. | **Authoritative** |
| **Business** | [`docs/business/BRD.md`](docs/business/BRD.md) | 43-section Business Requirements Document: Canadian acute care crises, ALC delays, 23 roles, ROI. | **Authoritative** |
| **Business** | [`docs/business/EVIDENCE_REGISTER.md`](docs/business/EVIDENCE_REGISTER.md) | Validated peer-reviewed clinical calculator evidence base (CTAS, Wells, HEART), academic discovery context. | **Authoritative** |
| **Product** | [`docs/product/PRD.md`](docs/product/PRD.md) | Comprehensive functional PRD: canonical `/emergency/*` routes, CTAS scoring, 18-patient DOM cap. | **Authoritative** |
| **Product** | [`docs/product/REQUIREMENTS_TRACEABILITY_MATRIX.md`](docs/product/REQUIREMENTS_TRACEABILITY_MATRIX.md) | Forward/backward traceability from BRD drivers to PRD components, database tables, APIs, and tests. | **Authoritative** |
| **Product** | [`docs/product/IMPLEMENTATION_GAP_ANALYSIS.md`](docs/product/IMPLEMENTATION_GAP_ANALYSIS.md) | Ground-truth audit of implemented vs roadmap capabilities, non-medical artifact removal, and debt. | **Authoritative** |
| **Product** | [`docs/product/IMPLEMENTATION_PLAN.md`](docs/product/IMPLEMENTATION_PLAN.md) | Phased engineering schedule, release milestones, Gantt workstreams, and sprint quality gates. | **Authoritative** |
| **Product** | [`docs/product/PRODUCT_ROADMAP.md`](docs/product/PRODUCT_ROADMAP.md) | Multi-year vision spanning Wave 1 (Acute Core) through Wave 4 (Autonomous Distributed Health Systems 2028). | **Authoritative** |
| **Architecture** | [`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) | 12-layer system topology diagram (User to Infrastructure) with cross-cutting Zero Trust and observability. | **Authoritative** |
| **Technical** | [`docs/technical/TRD.md`](docs/technical/TRD.md) | Engineering translation of BRD, NestJS backend, Vite frontend, TypeORM, WebSockets, budgets. | **Authoritative** |
| **Technical** | [`docs/technical/API_ARCHITECTURE.md`](docs/technical/API_ARCHITECTURE.md) | Exhaustive REST endpoint catalog (all 54 registered living endpoints), WebSocket gateway contracts. | **Authoritative** |
| **Data** | [`docs/data/DATABASE_SCHEMA.md`](docs/data/DATABASE_SCHEMA.md) | Complete 80+ TypeORM entity dictionary (`patients`, `encounters`, `rooms`, `sentinel_*`), ERD, migrations. | **Authoritative** |
| **Data** | [`docs/data/DATA_ARCHITECTURE.md`](docs/data/DATA_ARCHITECTURE.md) | Real-time event bus, Redis pub/sub, retention (10y adult / 28y pediatric), zero PHI logs, DR. | **Authoritative** |
| **AI** | [`docs/ai/AI_ARCHITECTURE.md`](docs/ai/AI_ARCHITECTURE.md) | Hybrid model router (local INT8 edge models vs frontier LLMs), latency budgets, fallback breakers. | **Authoritative** |
| **AI** | [`docs/ai/AGENT_ARCHITECTURE.md`](docs/ai/AGENT_ARCHITECTURE.md) | Multi-agent framework: 10 specialized agent profiles, 4-tier memory, Level 4 HITL physician gates. | **Authoritative** |
| **AI** | [`docs/ai/KNOWLEDGE_ARCHITECTURE.md`](docs/ai/KNOWLEDGE_ARCHITECTURE.md) | Clinical ontologies (SNOMED, LOINC, ICD-10-CA, DIN), Clinical Intelligence Graph (CIG), Hybrid RAG. | **Authoritative** |
| **Governance** | [`docs/governance/AI_GOVERNANCE.md`](docs/governance/AI_GOVERNANCE.md) | Health Canada SaMD Class II, FDA Section 520(o) CDS, EU AI Act, demographic parity auditing. | **Authoritative** |
| **UX** | [`docs/ux/DESIGN_BRIEF.md`](docs/ux/DESIGN_BRIEF.md) | "Calm Clinical Command" design system: 32px controls, 52px headers, WCAG 2.2 AA/AAA, ergonomics. | **Authoritative** |
| **UX** | [`docs/ux/APP_FLOW.md`](docs/ux/APP_FLOW.md) | User journeys (Triage, Physician Whiteboard, Pediatric Dosing, EMS Pre-arrival) with recovery paths. | **Authoritative** |
| **UX** | [`docs/ux/INFORMATION_ARCHITECTURE.md`](docs/ux/INFORMATION_ARCHITECTURE.md) | Canonical route hierarchy (`/emergency/*`), 301 legacy redirects, drawer hierarchy, ⌘K palette. | **Authoritative** |
| **Integrations** | [`docs/integrations/HEALTHCARE_INTEROPERABILITY.md`](docs/integrations/HEALTHCARE_INTEROPERABILITY.md) | HL7 FHIR R4 mapping, HL7 v2.5 MLLP adapter, NEMSIS v3.5 EMS telemetry, DICOMweb PACS viewer. | **Authoritative** |
| **Integrations** | [`docs/integrations/IOT_ARCHITECTURE.md`](docs/integrations/IOT_ARCHITECTURE.md) | Device Abstraction Layer (DAL), IEEE 11073 MDC normalizer, MQTT 5.0 streaming, 72h offline buffer. | **Authoritative** |
| **Integrations** | [`docs/integrations/EDGE_AI_ARCHITECTURE.md`](docs/integrations/EDGE_AI_ARCHITECTURE.md) | On-premise Clinical Edge Gateways, INT8 quantization via ONNX/TensorRT, local biometrics. | **Authoritative** |
| **Integrations** | [`docs/integrations/ROBOTICS_INTEGRATION.md`](docs/integrations/ROBOTICS_INTEGRATION.md) | Vendor-neutral RASAL layer (VDA 5050 / ROS 2), specimen AMRs, UV-C disinfection, drone logistics. | **Authoritative** |
| **Security** | [`docs/security/SECURITY_ARCHITECTURE.md`](docs/security/SECURITY_ARCHITECTURE.md) | Zero Trust model, RS256 asymmetric JWT, refresh token rotation, mTLS 1.3, AES-256-GCM, Zero PHI. | **Authoritative** |
| **Security** | [`docs/security/THREAT_MODEL.md`](docs/security/THREAT_MODEL.md) | Microsoft STRIDE threat matrix across clinical surfaces, attack vectors, mitigations, residual risks. | **Authoritative** |
| **SEO** | [`docs/seo/SEO_STRATEGY.md`](docs/seo/SEO_STRATEGY.md) | Schema.org `MedicalWebPage` markup, CWV budgets, strict `noindex, nofollow` on clinical routes. | **Authoritative** |
| **Testing** | [`docs/testing/TEST_STRATEGY.md`](docs/testing/TEST_STRATEGY.md) | 10-tier verification pipeline, clinical math property-based testing, database migration testing. | **Authoritative** |
| **Deployment** | [`docs/deployment/DEPLOYMENT_ARCHITECTURE.md`](docs/deployment/DEPLOYMENT_ARCHITECTURE.md) | Air-gapped on-premise hospital appliance, AWS Canada Central, Azure Canada Central, K8s specs. | **Authoritative** |
| **Operations** | [`docs/operations/RUNBOOK.md`](docs/operations/RUNBOOK.md) | Fast diagnostics (`npm run doctor`), incident response for network partitions, DB replication lag. | **Authoritative** |
| **Commercial** | [`docs/commercialization/PILOT_READINESS.md`](docs/commercialization/PILOT_READINESS.md) | Phase 0 Shadow, Phase 1 Assisted Pod, Phase 2 Full ED Operations, site qualifications, rollback. | **Authoritative** |
| **Reference** | [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Master dictionary of clinical, architectural, security, robotics, and regulatory terminology. | **Authoritative** |

---

## 8. Academic Discovery & Institutional Collaboration Guardrails

CareDroid's development context includes authentic academic and clinical discovery engagements:
1. **Experiential Learning:** CareDroid has participated in project-based experiential learning engagements via Riipen.
2. **Business & Commercialization Evaluation:** A student consulting cohort from London Metropolitan University evaluated aspects of CareDroid's SaaS packaging, pricing models, and market positioning.
3. **Architecture Research Collaboration:** CareDroid collaborates with a multidisciplinary Arizona State University (ASU) PhD research team on technical systems architecture, agent governance, and clinical safety formalisms.
4. **Healthcare Discovery Conversations:** Early workflow discovery and clinical needs assessments have engaged individual healthcare professionals connected with Canadian health networks, including Humber River Health, Sinai Health, and University Health Network (UHN).

> **Regulatory & Institutional Guardrail:** These discovery engagements represent technical research, academic review, and user discovery. They must **never** be cited as institutional endorsements, formal partnerships, clinical validation certifications, hospital procurements, or Health Canada / FDA regulatory approvals. CareDroid maintains strict compliance with Canadian (PHIPA/PIPEDA) and US (HIPAA/HITECH) statutory frameworks.

