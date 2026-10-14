# CareDroid — Hospital Pilot Readiness & Deployment Protocol

**Document Version:** 3.0.0  
**Status:** Living Commercialization & Pilot Specification  
**Lead Authors:** Chief Commercial Officer, Clinical Pilot Director, Medical Informatics Lead  
**Classification:** Enterprise Healthcare Architecture & Due Diligence Authority  

---

## 1. Three-Phase Hospital Pilot Strategy

CareDroid pilots deploy across three sequential clinical phases designed to ensure zero disruption to live emergency operations:

```
[Phase 0: Shadow Mode Validation] (Weeks 1–4)
├── System ingests HL7/FHIR feeds and vital streams in read-only background mode
├── Algorithm evaluations run in parallel without clinician-facing output
└── Validation of CTAS concordance against historical nurse triage decisions (>95% target)

[Phase 1: Assisted Pod Pilot] (Weeks 5–12)
├── CareDroid deployed to a single acute care pod (e.g. Pod B - 12 beds)
├── Clinicians interact directly with Whiteboard, Pediatric Dosing, and Triage CDS
└── Weekly clinical feedback and safety review sessions with Department Chief

[Phase 2: Full Department Operations] (Weeks 13–24)
├── Full emergency department rollout (All pods, reception desk, ambulance bay)
├── Integration with hospital inpatient bed management for boarding optimization
└── Formal measurement against primary KPIs (Door-to-doctor time, LWBS, ambulance offload)
```

---

## 2. Hospital Site Qualification Criteria

Before initiating Phase 0 shadow deployment, a candidate hospital site must satisfy:
1. **Clinical Sponsorship:** Written charter approved by Emergency Department Chief and Nursing Director.
2. **IT & Network Readiness:**
   - Minimum 10 Mbps dedicated bandwidth per clinical pod.
   - Wi-Fi 6 coverage across all patient stretchers and triage bays with signal strength > -65 dBm.
   - Support for outbound mTLS 1.3 connections to CareDroid Canadian Cloud Enclave.
3. **EHR Interface Availability:** Provisioned HL7 v2 (ADT/ORU) or HL7 FHIR R4 test endpoint with synthetic data feeds.
4. **Ethics & Governance Approval:** Research Ethics Board (REB) or Institutional Review Board (IRB) exemption/clearance for quality improvement evaluation.

---

## 3. Clinical Acceptance Criteria & Go/No-Go Gates

Progression between pilot phases requires achieving explicit, quantifiable milestones:

| Pilot Phase Gate | Mandatory Acceptance Criteria | Evaluation Methodology |
| :--- | :--- | :--- |
| **Phase 0 -> Phase 1 Gate** | • CTAS algorithmic concordance ≥ 95% against historical nurse triage.<br>• Zero calculation errors in 500 simulated pediatric doses.<br>• System availability ≥ 99.9% over 30 continuous days in shadow mode. | Retrospective audit against 1,000 anonymized historical triage encounters. |
| **Phase 1 -> Phase 2 Gate** | • Clinician usability satisfaction score ≥ 85% (SUS questionnaire).<br>• Zero software-induced clinical adverse events or missed resuscitations.<br>• Door-to-doctor wait time reduced by ≥ 15% in the pilot pod.<br>• Sub-500ms WebSocket synchronization maintained across all pod devices. | Weekly clinical governance review with ED Medical Director. |

---

## 4. Clinician Training, Shift Handoff & Rollback Protocols

### 4.1 15-Minute Micro-Training Modules
To accommodate rotating nursing schedules without taking staff away from clinical duties, CareDroid provides role-specific micro-training:
- *Triage Nurses (15m):* Fast demographic lookup, vital signs entry, and one-click CTAS confirmation.
- *Emergency Physicians (15m):* Whiteboard navigation, encounter drawers, and pediatric dosing verification.
- *Unit Clerks & Scribes (10m):* Reception queue intake and kiosk monitor oversight.

### 4.2 Seamless Instant Rollback Protocol
If an unresolvable technical or operational issue arises during live pilot phases:
1. **Single-Click Failover:** Department charge nurse clicks "Switch to Secondary Board" in top utility bar, instantaneously reverting all pod displays to the hospital's legacy EHR tracking board.
2. **Zero Data Loss:** All encounters registered in CareDroid remain fully archived in PostgreSQL and can be exported as standard PDF/CSV shift reports within 60 seconds.

---

*This protocol governs all hospital pilot deployments, site evaluations, and commercialization gates for CareDroid.*
