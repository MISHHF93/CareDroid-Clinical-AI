# CareDroid Master Documentation Index

**Repository:** `CareDroid-Clinical-AI`  
**Generated:** 2026-10-07  
**Platform Version:** 1.0.0 (Clinical Intelligence & Healthcare Operations Platform)  
**Status:** Complete & Authoritative Master Registry  

---

## Executive Summary

CareDroid is an enterprise-grade Canadian AI healthcare technology platform evolving into a comprehensive **Medical Intelligence and Healthcare Operations Platform**. This index serves as the master catalog across all 15 primary documentation directories, auditing and linking every technical, clinical, architectural, security, operational, and commercial artifact.

All documentation strictly enforces the 4-phase maturity model:
- **`[CURRENT]`**: Production-active in codebase (React 18 + Vite, NestJS 10, TypeORM, 54 APIs, 32px clinical controls, 18-patient whiteboard limit, CTAS triage engine).
- **`[PLANNED]`**: Active engineering roadmap for Wave 2/3 pilots.
- **`[RESEARCH]`**: In-vitro clinical research collaboration (Riipen, London Metropolitan University, ASU PhD team).
- **`[FUTURE]`**: Strategic long-term integrations (specimen AMR logistics, autonomous drone delivery, multi-hospital digital twins).

---

## Master Directory & Artifact Registry

### 1. Product & Strategy (`docs/product/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Product Requirements Document** | [`docs/product/PRD.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/product/PRD.md) | Exhaustive product specification for acute care, triage, physician whiteboard, chief investigation, and clinical decision support. | **Exists (Authoritative)** |
| **Requirements Traceability Matrix** | [`docs/product/REQUIREMENTS_TRACEABILITY_MATRIX.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/product/REQUIREMENTS_TRACEABILITY_MATRIX.md) | End-to-end forward/backward mapping from BRD business drivers to PRD components, APIs, database tables, and Vitest test suites. | **Exists (Authoritative)** |
| **Implementation Gap Analysis** | [`docs/product/IMPLEMENTATION_GAP_ANALYSIS.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/product/IMPLEMENTATION_GAP_ANALYSIS.md) | Ground-truth audit of implemented vs roadmap capabilities, non-medical artifact removal, and technical debt. | **Exists (Authoritative)** |
| **Implementation Plan** | [`docs/product/IMPLEMENTATION_PLAN.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/product/IMPLEMENTATION_PLAN.md) | Engineering roadmap, release milestones, Gantt workstreams, and sprint gates through Phase 3. | **Exists (Authoritative)** |
| **Product Roadmap** | [`docs/product/PRODUCT_ROADMAP.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/product/PRODUCT_ROADMAP.md) | Multi-year vision spanning Wave 1 (Acute Core) through Wave 4 (Autonomous Distributed Health Systems) to 2028. | **Exists (Authoritative)** |

---

### 2. Business & Clinical Evidence (`docs/business/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Business Requirements Document** | [`docs/business/BRD.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/business/BRD.md) | 43-section enterprise BRD addressing Canadian healthcare crises, hospital overcrowding, ALC bottlenecks, and pilot ROI models. | **Exists (Authoritative)** |
| **Clinical Evidence Register** | [`docs/business/EVIDENCE_REGISTER.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/business/EVIDENCE_REGISTER.md) | Validated peer-reviewed clinical calculator evidence (CTAS, Wells PE/DVT, PERC, HEART, GCS, NEWS2, Pediatric Dosing) and institutional research boundaries. | **Exists (Authoritative)** |

---

### 3. Enterprise System Architecture (`docs/architecture/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **System Architecture Document** | [`docs/architecture/SYSTEM_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/architecture/SYSTEM_ARCHITECTURE.md) | Full 12-tier architecture topology (User Experience to Hybrid Infrastructure) with cross-cutting Zero Trust and observability. | **Exists (Authoritative)** |

---

### 4. Technical Specifications (`docs/technical/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Technical Requirements Document** | [`docs/technical/TRD.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/technical/TRD.md) | Translation of business requirements into engineering architecture, tech stack (Vite, React 18, NestJS 10, TypeORM), and performance budgets. | **Exists (Authoritative)** |
| **API Architecture** | [`docs/technical/API_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/technical/API_ARCHITECTURE.md) | Exhaustive REST endpoint catalog (all 54 registered endpoints), WebSocket gateway contracts (`/emergency-os`), and FHIR R4 schema payloads. | **Exists (Authoritative)** |

---

### 5. Data & Database Architecture (`docs/data/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Database Schema** | [`docs/data/DATABASE_SCHEMA.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/data/DATABASE_SCHEMA.md) | Complete TypeORM entity dictionary (80+ entities), indexes, foreign keys, Mermaid ERD, and migration verification protocol. | **Exists (Authoritative)** |
| **Data Architecture** | [`docs/data/DATA_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/data/DATA_ARCHITECTURE.md) | Data governance, streaming event pipeline (Redis/PubSub), retention lifecycles (10y adult / 28y pediatric), Zero PHI logs, and disaster recovery. | **Exists (Authoritative)** |

---

### 6. Artificial Intelligence & Multi-Agent Architecture (`docs/ai/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **AI Architecture** | [`docs/ai/AI_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/ai/AI_ARCHITECTURE.md) | Hybrid model router (local edge INT8 models vs cloud frontier LLMs), latency budgets, fallback circuit breakers, and token cost controls. | **Exists (Authoritative)** |
| **Agent Architecture** | [`docs/ai/AGENT_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/ai/AGENT_ARCHITECTURE.md) | Autonomous multi-agent framework: 10 specialized agent roles, 4-tier memory model, tool governance, and Level 4 HITL physician approval gates. | **Exists (Authoritative)** |
| **Knowledge Architecture** | [`docs/ai/KNOWLEDGE_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/ai/KNOWLEDGE_ARCHITECTURE.md) | Clinical ontology mappings (SNOMED-CT, LOINC, ICD-10-CA, DIN), Clinical Intelligence Graph (CIG), Hybrid RAG, and citation provenance. | **Exists (Authoritative)** |

---

### 7. Governance, Ethics & Regulatory Compliance (`docs/governance/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **AI Governance & Regulatory Readiness** | [`docs/governance/AI_GOVERNANCE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/governance/AI_GOVERNANCE.md) | Health Canada SaMD Class II alignment, FDA Section 520(o) CDS compliance, EU AI Act conformity, demographic parity auditing, and 4-gate verification harness. | **Exists (Authoritative)** |

---

### 8. User Experience & Product Design (`docs/ux/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Design Brief** | [`docs/ux/DESIGN_BRIEF.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/ux/DESIGN_BRIEF.md) | "Calm Clinical Command" design system: 32px control heights, 52px headers, typography, WCAG 2.2 AA/AAA compliance, and shift ergonomics. | **Exists (Authoritative)** |
| **Application Flow** | [`docs/ux/APP_FLOW.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/ux/APP_FLOW.md) | Comprehensive UX state diagrams and journeys (Triage Intake, Physician Whiteboard, Pediatric Dosing, Inbound EMS Pre-arrival) with recovery paths. | **Exists (Authoritative)** |
| **Information Architecture** | [`docs/ux/INFORMATION_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/ux/INFORMATION_ARCHITECTURE.md) | Canonical route hierarchy (`/emergency/*`), 301 legacy redirects, drawer hierarchy, ⌘K search palette, and role-based route gating. | **Exists (Authoritative)** |

---

### 9. Healthcare Interoperability & Integration (`docs/integrations/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Healthcare Interoperability** | [`docs/integrations/HEALTHCARE_INTEROPERABILITY.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/integrations/HEALTHCARE_INTEROPERABILITY.md) | HL7 FHIR R4 bidirectional adapters, HL7 v2.5 MLLP engine, NEMSIS v3.5 EMS telemetry, DICOMweb PACS viewer, and provincial health registries. | **Exists (Authoritative)** |
| **IoT & Medical Device Architecture** | [`docs/integrations/IOT_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/integrations/IOT_ARCHITECTURE.md) | Device Abstraction Layer (DAL), IEEE 11073 MDC normalizer, MQTT 5.0 streaming, alarm fatigue filtering, and 72h offline edge buffers. | **Exists (Authoritative)** |
| **Edge AI Architecture** | [`docs/integrations/EDGE_AI_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/integrations/EDGE_AI_ARCHITECTURE.md) | On-premise Clinical Edge Gateways, INT8 quantization via ONNX/TensorRT, sub-50ms local biometrics, and network partition fail-safes. | **Exists (Authoritative)** |
| **Robotics & Autonomous Systems** | [`docs/integrations/ROBOTICS_INTEGRATION.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/integrations/ROBOTICS_INTEGRATION.md) | Vendor-neutral RASAL layer (VDA 5050 / ROS 2), specimen AMR dispatch, UV-C disinfection, drone logistics, and strict hardware-agnostic boundaries. | **Exists (Authoritative)** |

---

### 10. Security, Privacy & Threat Modeling (`docs/security/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Security Architecture** | [`docs/security/SECURITY_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/security/SECURITY_ARCHITECTURE.md) | Zero Trust model, RS256 asymmetric JWT, refresh token rotation, mTLS 1.3, AES-256-GCM encryption at rest, and Zero PHI structured logging. | **Exists (Authoritative)** |
| **Threat Model** | [`docs/security/THREAT_MODEL.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/security/THREAT_MODEL.md) | Formal Microsoft STRIDE threat modeling across all clinical surfaces, attack vectors, defensive controls, and residual risk matrix. | **Exists (Authoritative)** |

---

### 11. Testing & Quality Assurance (`docs/testing/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Test Strategy** | [`docs/testing/TEST_STRATEGY.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/testing/TEST_STRATEGY.md) | 10-tier verification pipeline, clinical math property-based testing, database migration testing, load testing, and architecture isolation enforcer. | **Exists (Authoritative)** |

---

### 12. Deployment & Infrastructure (`docs/deployment/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Deployment Architecture** | [`docs/deployment/DEPLOYMENT_ARCHITECTURE.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/deployment/DEPLOYMENT_ARCHITECTURE.md) | Multi-enclave deployment models: Air-gapped on-premise hospital appliance, AWS Canada Central, Azure Canada Central, and Kubernetes pod specs. | **Exists (Authoritative)** |

---

### 13. Operations & Reliability (`docs/operations/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Production Runbook** | [`docs/operations/RUNBOOK.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/operations/RUNBOOK.md) | Fast diagnostics (`npm run doctor`), incident response playbooks (network partitions, database replication lag, WebSocket storms, AI failover). | **Exists (Authoritative)** |

---

### 14. Commercialization & Pilots (`docs/commercialization/`)

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Pilot Readiness Plan** | [`docs/commercialization/PILOT_READINESS.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/commercialization/PILOT_READINESS.md) | Phased hospital rollout (Phase 0 Shadow, Phase 1 Assisted Pod, Phase 2 Full ED Operations), site qualification, and instant rollback protocols. | **Exists (Authoritative)** |

---

### 15. Cross-Cutting Master Glossary & Index

| Artifact | Canonical Path | Description | Audit Status |
| :--- | :--- | :--- | :--- |
| **Master Glossary** | [`docs/GLOSSARY.md`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/GLOSSARY.md) | Comprehensive dictionary of clinical informatics, Canadian healthcare systems, AI/ML concepts, robotics protocols, and security terms. | **Exists (Authoritative)** |
| **Living Documentation** | [`docs/generated/`](file:///c:/Users/borah/CareDroid-Clinical-AI/docs/generated/) | 12 automated snapshot contracts (APIs, routes, roles, permissions, workflows, services, AI capabilities) verified continuously by `npm run docs:check`. | **Active / Automated** |

---

## Documentation Verification & CI Integration

All 32 documents in this master catalog are synchronized with the living code. The verification suite is validated by running:

```bash
npm run verify
```

Which automatically verifies:
1. `npm run typecheck:all` (Frontend React 18 and Backend NestJS TypeScript)
2. `npm run lint` (ESLint on all application source and scripts)
3. `npm run docs:check` (12 living contract snapshot verification)
4. `npm run deps:integrity` (Knip dependency and unresolved module audit)
5. `npm run architecture:check` (Frontend-to-backend strict boundary and circular import verification)
