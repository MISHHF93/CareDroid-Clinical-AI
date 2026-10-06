# CareDroid — Business Requirements Document (BRD)

**Document Version:** 2.2.0  
**Status:** Living Business Requirements / Strategic Baseline  
**Lead Authors:** Chief Product Officer, Senior Business Analyst, Healthcare Informatics Architect  
**Classification:** Confidential — CareDroid Enterprise Operations

---

## 1. Executive Summary

CareDroid is a Canadian healthcare artificial intelligence venture advancing acute care through an integrated **Medical Intelligence and Healthcare Operations Platform**.

Modern emergency departments face historic crises: severe overcrowding, escalating nurse burnout, prolonged door-to-doctor wait times, and high Left-Without-Being-Seen (LWBS) rates. CareDroid addresses these systemic failures not by replacing clinicians, but by functioning as a high-reliability operational copilot. The platform unites real-time patient flow analytics, multimodal clinical decision support, pre-hospital ambulance telemetry, and automated operational orchestration into a single, unified command surface.

---

## 2. Company & Product Vision

### 2.1 Vision

To establish the global standard for autonomous-assisted clinical intelligence, transforming acute care facilities into agile, predictive, zero-delay healthcare delivery systems.

### 2.2 Mission

To empower frontline clinical teams with real-time intelligence, eliminate administrative friction, safeguard vulnerable patients through early deterioration detection, and ensure continuous human-in-the-loop oversight across every operational tier.

---

## 3. Problem Statement & Healthcare Realities

1. **Emergency Department Overcrowding & Surge Fragility:** Demand consistently outpaces capacity. Triage desks face volatile patient surges, creating lethal backlogs where subtle patient deterioration goes unnoticed in waiting rooms.
2. **Clinical Cognitive Overload & Burnout:** Physicians and triage nurses spend over 40% of their shift on documentation, manual risk calculation, and bed chasing rather than direct patient care.
3. **Information Silos Across the Care Continuum:** Pre-arrival EMS data arrives via disparate radio or paper handoffs; triage data remains disconnected from inpatient bed managers; diagnostic labs wait in fragmented portals.
4. **Pediatric Dosing & High-Risk Calculation Errors:** Weight-based medication dosing in pediatric resuscitations remains a major source of preventable clinical harm under high-stress conditions.

---

## 4. Target Users, Stakeholders & Personas

| Persona                 | Role & Setting                | Core Jobs to be Done                                                                              | CareDroid Value                                                                                |
| :---------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| **Triage Nurse**        | ED Reception / Triage Station | Rapid acuity assessment (CTAS / ESI), vital sign entry, identifying red flags, initial placement. | Age-adjusted vitals analysis, automated red-flag alerts, one-click acuity confirmation.        |
| **Emergency Physician** | Acute / Subacute Pods         | Whiteboard tracking, diagnostics review, clinical risk calculation, ordering, disposition.        | Real-time whiteboard, verified pediatric dosing safety checker, AI clinical note drafting.     |
| **Charge Nurse**        | Central Command / Desk        | Department-wide bed allocation, surge management, nurse staffing ratios, ambulance diversion.     | Live department bottleneck map, automated surge escalation, ambulance ETA tracking.            |
| **Paramedic / EMS**     | Field / Ambulance En Route    | Pre-hospital vital telemetry, pre-arrival alert submission, structured electronic handoff.        | Seamless mobile telemetry streaming, fast hospital confirmation, zero-delay ambulance offload. |
| **Hospital Executive**  | C-Suite / Operations          | Wait-time compliance, LWBS mitigation, ALC bed transfer management, resource budgeting.           | Executive intelligence dashboards, predictive surge forecasts, complete audit trails.          |

---

## 5. Strategic Horizons

To maintain absolute transparency during partner diligence and regulatory audits, CareDroid strictly delineates between implementation stages:

```
[CURRENT] Live in Production / Active Testing
├── Real-time Emergency Whiteboard & Pod Layouts
├── Automated CTAS / ESI Triage Decision Support
├── Pediatric Weight-Based Dosing Safety Checker
├── Inbound EMS Telemetry & Pre-Arrival Gateway
├── Bed Capacity & Boarding Bottleneck Engine
└── RBAC/ABAC Clinical Role Segregation & Audit Logging

[PLANNED] On Active Product Roadmap (Q1–Q2 2027)
├── Bi-directional HL7 FHIR R4 Inpatient Sync
├── Ambient AI Clinical Voice Scribe (Human-Approved)
├── Predictive LWBS & Deterioration Risk Modeling
└── Provincial Health Interoperability Gateway (Ontario Health / AHS)

[RESEARCH] Active Clinical R&D
├── Multimodal Vision-Based Waiting Room Ergonomics (Non-PII Optical Flow)
├── Digital Twin Department Simulation for Mass Casualty Management
└── Federated AI Model Tuning Across Regional Health Networks

[FUTURE] Long-Term Architectural Vision
├── Robotic Medical Supply Delivery Fleet Orchestration
└── Autonomous Drone Telemetry Integration for Remote Northern Communities
```

---

## 6. Functional Business Requirements

### 6.1 Clinical Triage & Intake

- **BR-TRI-01:** System must support rapid vital entry (HR, BP, SpO2, Temp, RR) and calculate age-adjusted physiological deviations within 200ms.
- **BR-TRI-02:** System must provide Canadian Triage and Acuity Scale (CTAS) recommendations with mandatory human clinician confirmation.
- **BR-TRI-03:** System must flag high-risk chief complaints (chest pain, acute neurologic deficit, pediatric stridor) with immediate visual banners.

### 6.2 Department Whiteboard & Bed Management

- **BR-WBD-01:** The Whiteboard must render all active patients categorized by physical Pod, Bed, and Acuity Tier with zero manual page refreshes (<1s WebSocket latency).
- **BR-WBD-02:** Clinicians must be able to inspect full encounter records via non-disruptive slide-out drawers without losing whiteboard spatial orientation.
- **BR-WBD-03:** System must track bed cleaning status, isolation precautions, and pending transfer holding times.

### 6.3 Clinical Safety & Medication Calculations

- **BR-SAF-01:** Pediatric dosing checker must calculate weight-based mg/kg/dose with hard ceiling caps against manufacturer and formulary guidelines.
- **BR-SAF-02:** All clinical calculators (Wells, PERC, HEART, GCS) must cite validated peer-reviewed evidence and require clinician sign-off.

### 6.4 Pre-Hospital Telemetry & EMS Integration

- **BR-EMS-01:** System must ingest pre-hospital ETA, vital streams, and 12-lead ECG captures from inbound EMS units.
- **BR-EMS-02:** System must provide one-click resuscitation suite reservation for critical inbound cases (STEMI, Stroke, Major Trauma).

---

## 7. Non-Functional Business Requirements

1. **Availability:** Minimum 99.95% uptime for acute care operations, with full local-first offline fallback mode during network interruption.
2. **Performance:** Sub-100ms response time for local UI interactions; sub-500ms for WebSocket operational event dispatch across 500 concurrent connections.
3. **Data Privacy & Compliance:** Strict compliance with Canada’s PIPEDA, Ontario PHIPA, and US HIPAA. All synthetic test datasets must carry zero real PHI.
4. **Accessibility:** 100% adherence to WCAG 2.2 Level AA standards, with Level AAA contrast compliance on all critical alert surfaces.
5. **Ergonomic Safety:** Low-glare dual-mode UI calibrated to prevent optical fatigue during 12-hour continuous clinical shifts.

---

## 8. Success Metrics & Key Performance Indicators (KPIs)

| Business Metric                       | Baseline    | CareDroid Pilot Target | Measurement Method                                                           |
| :------------------------------------ | :---------- | :--------------------- | :--------------------------------------------------------------------------- |
| **Door-to-Doctor Time**               | 94 min avg  | < 45 min avg           | Timestamp from Reception/Triage intake to First Physician Order.             |
| **Left Without Being Seen (LWBS)**    | 7.8%        | < 2.5%                 | Encounter status audit log of triage registrations vs. completed encounters. |
| **Ambulance Offload Delay**           | 52 min avg  | < 20 min avg           | EMS arrival timestamp to signed electronic nursing handoff timestamp.        |
| **Triage Intake Duration**            | 6.5 min avg | < 3.0 min avg          | Triage form initiation to confirmed CTAS acuity assignment.                  |
| **Pediatric Dosing Calculation Time** | 180 sec     | < 20 sec               | Calculator launch to verified dosage order drafting.                         |

---

## 9. Safety Boundaries & Non-Negotiables

- **No Autonomous Prescribing:** CareDroid shall never automatically submit or authorize medical orders without explicit, licensed human practitioner authentication.
- **Explicit AI Tone & Provenance:** Every AI-generated draft, risk prediction, or recommendation must be visually branded in violet (`--cdl-ai-*`), declare its model version and evidence sources, and state: _"Assisted clinical intelligence — requires licensed clinical validation."_
- **Audit Immutability:** Every clinical action, acuity override, order creation, and patient transfer is recorded in an immutable, cryptographically verifiable audit trail.

---
