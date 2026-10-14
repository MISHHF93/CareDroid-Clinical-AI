# CareDroid — Product Requirements Document (PRD)

**Document Version:** 3.0.0  
**Status:** Living Product Specification / Feature Authority  
**Lead Authors:** CareDroid Clinical Product Management Working Group, Principal Enterprise Architect  
**Classification:** Enterprise Healthcare Architecture & Due Diligence Authority  

---

## 1. Product Overview & Architecture Alignment

CareDroid is an acute care medical intelligence platform designed for high-stress emergency departments, intensive care pods, and pre-hospital clinical operations. This PRD translates the business directives established in the BRD into concrete, verifiable, and testable feature specifications.

### Core Architectural Grounding:
- **Canonical Routing Registry:** All primary emergency workflows reside strictly under `/emergency/*` (`src/config/routes.config.ts`), with legacy root aliases automatically redirecting.
- **Calm Clinical Cockpit (CDL 2.1):** Compact 32px control heights (`--cdl-control-height-md: 32px`), zero-glare slate canvas (`--cdl-surface-page: #f4f7fb`), and high-contrast WCAG 2.2 AA/AAA typography.
- **Strict Virtualization Budgets:** Maximum 18 patient cards rendered in the DOM simultaneously to guarantee 60fps scrolling on resource-constrained hospital workstations.
- **Deterministic Clinical Math Isolation:** Complete separation of numerical clinical decision support (pediatric dosing, Wells, PERC, HEART, GCS) from stochastic generative AI models.

---

## 2. Core Functional Modules & Specifications

### 2.1 Module 1: Reception, Smart Intake & Self-Arrival (`/emergency/reception`)
- **PRD-REC-01 Rapid Demographic Capture:** Instant lookup and intake of patient legal name, DOB, provincial health number (OHIP, AHCIP, MSP), and emergency contact.
- **PRD-REC-02 Chief Complaint Classification:** NLP-assisted mapping of unstructured symptoms to standardized SNOMED-CT emergency complaint groups with sub-200ms auto-complete.
- **PRD-REC-03 Left-Without-Being-Seen (LWBS) Watchlist:** Automatic visual hazard flagging for patients waiting >60 minutes without triage assessment.
- **PRD-REC-04 Fast-Track Diversion Pathway:** One-click routing of ambulatory minor injuries (simple sprains, minor sutures) to Subacute or Fast-Track zones.
- **PRD-REC-05 Self-Arrival Kiosk Mode:** Touch-optimized kiosk mode (`/emergency/self-arrival`) with large 48px touch targets, multi-lingual support, and automatic session clearing after 60 seconds of inactivity.

### 2.2 Module 2: Emergency Triage & CTAS Scoring (`/emergency/triage`, `/triage`)
- **PRD-TRI-01 Vital Signs Input & Deviation Scoring:** Real-time entry fields for Heart Rate, Blood Pressure (Systolic/Diastolic), SpO2, Respiratory Rate, Temperature, and Pain Scale (1-10). Instant calculation of age-adjusted pediatric and adult physiological z-scores.
- **PRD-TRI-02 Automated CTAS Suggestion:** Evaluates vital extremes and chief complaints against Canadian Triage and Acuity Scale algorithms:
  - **Level 1 (Resuscitation):** Immediate life threat (e.g. cardiac arrest, severe respiratory failure, GCS < 8).
  - **Level 2 (Emergent):** Potential life threat (e.g. severe asthma, chest pain with diaphoresis, suspected sepsis).
  - **Level 3 (Urgent):** Serious condition requiring investigation (e.g. moderate trauma, acute abdominal pain).
  - **Level 4 (Less Urgent):** Distress without vital instability (e.g. minor trauma, uncomplicated UTI).
  - **Level 5 (Non-Urgent):** Minor routine complaints (e.g. medication renewal, stitch removal).
- **PRD-TRI-03 Clinician Override & Justification:** Clinicians retain absolute authority to override AI triage suggestions. Any override requires selecting a clinical rationale, permanently logged in the audit trail.
- **PRD-TRI-04 Red Flag Acute Stop Banners:** Immediate acoustic and visual banners for critical presentations (suspected STEMI, acute stroke within 4.5-hour thrombolytic window, pediatric respiratory exhaustion).

### 2.3 Module 3: Active Department Whiteboard (`/emergency/whiteboard`)
- **PRD-WBD-01 Pod & Spatial Layout:** Visual grid organizing active patients across physical pods (Resuscitation Bay, Pod A Acute, Pod B Subacute, Pod C Fast Track, Inpatient Boarding).
- **PRD-WBD-02 Patient Card Anatomy:** Compact clinical cards displaying:
  - Patient initials and bed identifier (e.g. `J.D. - Bed 04`)
  - CTAS color badge with pulse cadence for Level 1/2
  - Elapsed wait time (Door-to-Doctor, Length of Stay)
  - Assigned Attending Physician & Primary Registered Nurse
  - Active diagnostic status pills (Labs Pending, Imaging Completed, Orders Placed)
  - Deterioration warning indicator (qSOFA / NEWS2 score)
- **PRD-WBD-03 DOM Virtualization Guard:** Enforces an 18-card DOM limit per rendered viewport (`whiteboardOperationalLoadModel.ts`) with infinite scroll virtualization to eliminate browser memory thrashing.
- **PRD-WBD-04 Live WebSocket State Push:** Multi-client synchronization updating patient status, bed swaps, and orders in <500ms via `/emergency-os` WebSocket gateway.
- **PRD-WBD-05 Non-Disruptive Patient Drawer:** Clicking any patient card slides out an encounter inspection drawer from the right rail without unmounting or scrolling the background tracking board.

### 2.4 Module 4: Clinical Tools & Pediatric Dosing Checker (`/emergency/tools`)
- **PRD-TLS-01 Pediatric Weight-Based Dosing Engine:**
  - Mandatory verified weight entry in kilograms (supports lb-to-kg auto-conversion).
  - Computes exact single dose (mg) and volume (mL) based on standard formulary liquid suspensions.
  - Hard stops enforcing adult maximum single-dose and 24-hour ceiling caps.
  - Automated allergy cross-referencing (e.g. penicillin allergy warning on cephalosporin selection).
- **PRD-TLS-02 Evidence-Based Clinical Calculators:**
  - Wells Score for Pulmonary Embolism & DVT (risk stratification & D-dimer recommendation)
  - PERC Rule (8 criteria to safely rule out PE without radiation)
  - HEART Score for Major Adverse Cardiac Events (chest pain disposition risk)
  - Glasgow Coma Scale (Eye, Verbal, Motor breakdown)
  - Cockcroft-Gault / CrCl (Renal dosage adjustments)
  - SOFA / qSOFA (Sepsis organ failure assessment)
- **PRD-TLS-03 Provenance & Literature Traceability:** Every calculator displays underlying publication citations, sensitivity/specificity confidence intervals, and clinical cutoff scores.

### 2.5 Module 5: Inbound EMS & Ambulance Bay (`/emergency/ems`, `/emergency/dispatch`)
- **PRD-EMS-01 Pre-Arrival Ingestion:** Ingests field ambulance telemetry: call sign, ETA countdown, patient demographics, chief complaint, en-route serial vitals, and STEMI/Stroke/Trauma pre-alerts.
- **PRD-EMS-02 Bay & Resuscitation Suite Pre-Allocation:** Charge nurse can reserve an empty resuscitation suite and trigger trauma team paging with a single click.
- **PRD-EMS-03 Electronic Paramedic-Nurse Handoff:** Two-party cryptographic digital confirmation between Paramedic and Receiving Nurse, establishing precise legal transfer of care.

### 2.6 Module 6: Bed Capacity & Inpatient Boarding (`/emergency/capacity`)
- **PRD-CAP-01 Department Occupancy & Surge Meter:** Live tracking of physical bed utilization against hospital surge thresholds.
- **PRD-CAP-02 Inpatient Boarding Bottleneck Tracker:** Identifies admitted patients waiting in ED stretchers, tracking elapsed boarding hours and alerting hospital bed placement coordinators.
- **PRD-CAP-03 ALC Flow Coordination:** Tracks Alternate Level of Care patients awaiting long-term care transfer to liberate acute care capacity.

### 2.7 Module 7: Chief Investigation & Operational Pulse (`/emergency/pulse`, `/emergency/command-center`)
- **PRD-CHF-01 Longitudinal Bottleneck Analytics:** Continuous real-time measurement of Door-to-Doctor time, Lab Turnaround Time, and Radiology Reporting Latency.
- **PRD-CHF-02 Shift Quality Audit:** Evaluates documentation completeness, triage concordance, and clinical guideline adherence per physician and nursing shift.

---

## 3. User Experience & Ergonomic Standards

- **Control Sizing:** Primary headers, lookup inputs, search bars, and action buttons adhere strictly to `--cdl-control-height-md: 32px`.
- **Keyboard Navigation:** Full accessibility via keyboard shortcuts; global ⌘K / Ctrl+K opens the unified command palette to instantly jump to any patient, pod, or tool.
- **Dual-Mode Visual Authority:** Calibrated light mode (`#f4f7fb` canvas) for daylit triage desks; deep slate dark mode (`#061725` canvas) for night shifts and low-glare ultrasound suites.
- **Zero Distracting Animations:** Motion is reserved exclusively for clinical state changes (e.g. pulse cadence on CTAS 1 resuscitation alerts).

---

## 4. Product Acceptance Criteria

| Feature Area | Acceptance Criteria | Verification Test Suite |
| :--- | :--- | :--- |
| **Triage Input** | Vitals validation rejects impossible physiology (e.g. SBP < 20 or > 300); age-adjusted scoring executes in <200ms. | `vitest run src/utils/patientVitals.test.ts` |
| **CTAS Override** | Overriding CTAS prompts mandatory reason selection; persists original AI suggestion and reason in immutable audit table. | `vitest run src/engine/reassessmentEngine.test.ts` |
| **Whiteboard Sync** | New patient intake in Reception updates Whiteboard across 10 concurrent browser sessions in <500ms without page reload. | `npm --prefix backend test emergency-os.gateway.spec.ts` |
| **Pediatric Dosing**| Clamps strictly to adult max ceiling dose; prevents calculation if weight is 0 or negative. | `vitest run src/pages/tools/Calculators.test.tsx` |
| **DOM Budget** | Rendering 200 active department patients generates ≤ 18 patient card DOM nodes at any single scroll position. | `vitest run src/data/whiteboardOperationalLoadModel.test.ts` |
| **Accessibility** | 100% WCAG 2.2 AA compliance; all interactive controls maintain minimum 4.5:1 text contrast and 3:1 graphical element contrast. | `vitest run src/styles/cdl-v2/visual-upgrade.contract.test.ts` |

---

*This document is maintained under active product management governance by CareDroid Healthcare Systems.*

