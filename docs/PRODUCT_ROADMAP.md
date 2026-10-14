# CareDroid — Master Product Roadmap (2026–2028)

**Document Version:** 3.0.0  
**Status:** Living Strategic Roadmap  
**Lead Authors:** Chief Product Officer, Healthcare Systems Lead, Chief AI Architect  
**Classification:** Enterprise Healthcare Architecture & Due Diligence Authority  

---

## 1. Roadmap Horizon Overview

CareDroid paces platform evolution across four deliberate clinical, technical, and regulatory horizons:

```
2026 Q3–Q4                     2027 Q1–Q2                     2027 Q3–Q4                     2028+
[Wave 1: Cockpit Core] ─────► [Wave 2: Interop & Scribe] ─► [Wave 3: Prediction & Twin] ──► [Wave 4: Autonomous Systems]
• Real-time Whiteboard         • Bi-directional FHIR R4       • Continuous NEWS2/qSOFA       • AMR Specimen Transport
• CTAS & ESI Acuity Engine     • Epic / Cerner / MEDITECH     • Predictive LWBS Model        • Drone Cold-Chain Logistics
• Pediatric Dosing Checker     • Ambient AI Clinical Scribe   • Digital Twin ED Simulation   • Remote Northern Telemedicine
• Inbound EMS Telemetry        • Provincial Health Gateways   • Federated Regional Tuning    • Closed-Loop Care Mesh
```

---

## 2. Detailed Milestone Specifications

### Wave 1: Acute Care Clinical Cockpit (Q3–Q4 2026) — CURRENT / OPERATIONAL
- **Milestone 1.1 (Real-Time Emergency Whiteboard):** High-reliability tracking board organizing beds across Resus, Acute, and Subacute pods with live WebSocket delta synchronization (<500ms latency).
- **Milestone 1.2 (Deterministic Triage Engine):** Automated Canadian Triage and Acuity Scale (CTAS) and ESI suggestions with age-adjusted vital z-score evaluation and mandatory clinician confirmation.
- **Milestone 1.3 (Pediatric Medication Safety Checker):** Weight-based dosing engine computing exact mg/kg and liquid volume (mL) with hard stops against adult maximum ceiling doses.
- **Milestone 1.4 (Pre-Hospital EMS Telemetry Gateway):** Ingests inbound ambulance telemetry, GPS location, and real-time hospital ETA countdowns (`/emergency/ems`).
- **Milestone 1.5 (Calm Clinical Design Authority):** Standardized 32px compact controls (`--cdl-control-height-md: 32px`), slate zero-glare canvas, 18-patient DOM virtualization limit, and 100% WCAG 2.2 AA contrast compliance.
- **Milestone 1.6 (Multi-Tenant Zero Trust Backend):** 60+ modular NestJS domains, TypeORM database entities, and immutable cryptographic audit logging with zero real PHI in logs.

### Wave 2: Regional Interoperability & Ambient AI (Q1–Q2 2027) — PLANNED
- **Milestone 2.1 (Bi-Directional HL7 FHIR R4 Interface):** Certified FHIR translation gateway connecting with Epic Systems, Oracle Cerner, and MEDITECH Expanse.
- **Milestone 2.2 (Ambient AI Clinical Scribe):** Ambient microphone audio capture structuring dialogue into draft History & Physical (H&P) notes with strict physician approval gates.
- **Milestone 2.3 (Provincial Health Gateways):** Integration with Ontario Health eHealth client registries and Alberta Health Services Netcare for provincial health number validation.
- **Milestone 2.4 (Bed Boarding & ALC Flow):** Predictive inpatient admission notifications and Alternate Level of Care (ALC) placement tracking to eliminate ED bed gridlock.

### Wave 3: Predictive Intelligence & Digital Twin (Q3–Q4 2027) — RESEARCH
- **Milestone 3.1 (Early Deterioration Streaming):** Continuous automated streaming calculation of qSOFA and NEWS2 scores from bedside telemetry, triggering proactive clinical escalation.
- **Milestone 3.2 (Left-Without-Being-Seen Hazard Model):** Real-time waiting room predictive modeling forecasting individual patient walk-out probabilities based on acuity, wait time, and congestion.
- **Milestone 3.3 (Digital Twin Emergency Department Simulation):** Discrete-event simulation model mirroring real hospital physical floorplans for disaster response drills and surge load-balancing.
- **Milestone 3.4 (Federated Privacy-Preserving Learning):** Collaborative AI model fine-tuning across regional hospital networks without centralized patient data pooling.

### Wave 4: Autonomous Systems & Hardware Orchestration (2028+) — FUTURE
- **Milestone 4.1 (Autonomous Mobile Robot Specimen Dispatch):** Orchestration of third-party AMRs (Aethon TUG, OMRON LD) via VDA 5050 protocols for stat lab specimen transit and pharmacy cart restock.
- **Milestone 4.2 (Remote Northern Drone Telemedicine):** Cold-chain emergency drone delivery for packed red blood cells and antivenom in remote fly-in northern communities.
- **Milestone 4.3 (Regional Emergency Telemedicine Mesh):** Closed-loop telemedicine communication linking rural community emergency pods with tertiary trauma center specialists.

---

*This roadmap is reviewed quarterly by the CareDroid Product and Commercialization Executive Working Group.*
