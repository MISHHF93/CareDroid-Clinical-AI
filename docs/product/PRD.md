# CareDroid — Product Requirements Document (PRD)

**Document Version:** 2.2.0  
**Status:** Living Product Specification / Feature Authority  
**Author:** CareDroid Clinical Product Management Working Group  

---

## 1. Product Overview & Architecture Alignment

CareDroid is an acute care medical intelligence platform designed for high-stress emergency departments and clinical operations. This PRD translates the business directives established in the BRD into concrete, verifiable feature requirements.

---

## 2. Core Functional Modules & Specifications

### 2.1 Module 1: Reception & Smart Intake (`/reception`)
- **PRD-REC-01 Demographic Capture:** Instant lookup and capture of patient name, DOB, provincial health card (OHIP, AHCIP, etc.), and contact phone.
- **PRD-REC-02 Chief Complaint Classification:** NLP-assisted mapping of free-text symptoms to SNOMED-CT emergency complaint groups.
- **PRD-REC-03 LWBS Watchlist:** Auto-flagging patients waiting >60 minutes without triage assessment with visual warning badges.
- **PRD-REC-04 Fast-Track Routing:** Immediate diversion pathway for ambulatory minor injuries (sprains, simple lacerations) to Subacute / Fast-Track zones.

### 2.2 Module 2: Emergency Triage & CTAS Scoring (`/triage`)
- **PRD-TRI-01 Vital Signs Input:** Entry fields for Heart Rate, Blood Pressure (Systolic/Diastolic), SpO2, Respiratory Rate, Temperature, and Pain Scale (1-10).
- **PRD-TRI-02 Automated CTAS Suggestion:** Evaluates vital extremes and chief complaints against Canadian Triage and Acuity Scale algorithms:
  - Level 1: Resuscitation (immediate life threat, e.g. cardiac arrest, severe respiratory failure)
  - Level 2: Emergent (potential life threat, e.g. severe asthma, chest pain with diaphoresis)
  - Level 3: Urgent (serious condition, e.g. moderate trauma, appendicitis presentation)
  - Level 4: Less Urgent (distress, e.g. minor trauma, urinary tract infection)
  - Level 5: Non-Urgent (routine, e.g. medication renewal, stitch removal)
- **PRD-TRI-03 Clinician Override:** Nurse can override the automated suggestion; requires mandatory selection of clinical justification reason (stored in immutable audit trail).

### 2.3 Module 3: Active Department Whiteboard (`/whiteboard`)
- **PRD-WBD-01 Pod & Bed View:** Visual grid layout organizing active patients by Pod (Pod A Resus, Pod B Acute, Pod C Subacute, Pod D Rapid Assessment).
- **PRD-WBD-02 Status Badges:** Patient tiles display CTAS level, elapsed wait time, assigned physician, assigned nurse, active lab order count, and alert flags.
- **PRD-WBD-03 Live Synchronization:** WebSocket subscriptions update patient state, new orders, and bed transfers across all open browser instances in <500ms without page reload.
- **PRD-WBD-04 Quick Disposition:** Dropdown action allowing direct disposition updates (Admit, Discharge, Transfer, Operating Room, Morgue).

### 2.4 Module 4: Clinical Tools & Pediatric Dosing Checker (`/tools`)
- **PRD-TLS-01 Pediatric Weight-Based Dosing Checker:**
  - Mandatory verified weight entry in kilograms.
  - Computes exact single dose (mg) and volume (mL) based on suspension concentration.
  - Enforces maximum adult ceiling doses (e.g. Amoxicillin max 1000mg/dose regardless of weight).
  - Explicit safety warning on contraindicated allergies.
- **PRD-TLS-02 Evidence-Based Clinical Calculators:**
  - Wells Score for Pulmonary Embolism
  - PERC Rule for PE Exclusion
  - HEART Score for Major Cardiac Events
  - Glasgow Coma Scale (GCS)
  - Creatinine Clearance / Cockcroft-Gault for renal drug clearance adjustments.
- **PRD-TLS-03 Provenance & Citations:** Every calculator displays original peer-reviewed publication citation, clinical sensitivity/specificity stats, and validation cutoff scores.

### 2.5 Module 5: Inbound EMS & Ambulance Bay (`/ems`)
- **PRD-EMS-01 Pre-Arrival Notification:** Ingests inbound ambulance telemetry: vehicle call sign, ETA countdown, patient age/gender, preliminary vitals, and suspicion of STEMI / Stroke / Trauma.
- **PRD-EMS-02 Bay Allocation:** Charge nurse can pre-assign an empty resuscitation suite before ambulance arrival.
- **PRD-EMS-03 Electronic Handoff Sign-Off:** Two-party digital confirmation between Paramedic and Receiving Nurse, timestamping transfer of care.

### 2.6 Module 6: Bed Capacity & Surge Management (`/capacity`)
- **PRD-CAP-01 Department Occupancy Gauge:** Real-time percentage tracking of physical bed utilization.
- **PRD-CAP-02 Boarding Bottleneck Tracker:** Highlights admitted inpatient holding patients remaining in ED stretchers, tracking elapsed boarding hours.
- **PRD-CAP-03 Surge Protocol Triggers:** Visual and acoustic alerts when department reaches Overcapacity Surge Action Plan (OSAP) Stage 1, 2, or 3.

---

## 3. User Stories & Acceptance Criteria

### User Story 1: Triage Assessment
> *As a Triage Nurse, I want the system to compute age-adjusted vital sign alerts as I enter patient measurements, so that I can immediately detect subtle pediatric septic shock before rooming the child.*

**Acceptance Criteria:**
- Given a patient age of 3 years and entered Heart Rate of 165 bpm,
- When the nurse tabs out of the HR field,
- Then the system displays a prominent amber warning chip: `"Tachycardia for age (3yo norm: 80-120 bpm)"` within 100ms.

### User Story 2: Pediatric Dosing Calculation
> *As an Emergency Physician, I want a verified weight-based calculator for pediatric amoxicillin, so that I never prescribe a toxic overdose during an acute resuscitation.*

**Acceptance Criteria:**
- Given a patient weight of 14.0 kg and selected medication Amoxicillin 40mg/kg/day divided BID,
- When the doctor clicks "Calculate Dose",
- Then the system outputs: `280 mg per dose (5.6 mL of 250mg/5mL suspension) PO twice daily`,
- And explicitly displays the maximum safe daily limit for confirmation.

---

## 4. Safety Guardrails & Human-in-the-Loop Constraints

1. **Non-Autonomous Execution:** Under no circumstances will CareDroid autonomously submit electronic orders to hospital pharmacy or laboratory information systems without explicit clinician credential authentication.
2. **Deterministic Fallbacks:** All clinical calculations are executed via transparent, deterministic TypeScript mathematical formulas with 100% unit test coverage; generative LLMs are never used for numeric medication arithmetic.
3. **Audit Immutability:** Overridden alerts, dismissed sepsis warnings, and changed acuity scores require mandatory entry of clinical reasoning and are committed permanently to audit tables.

---

