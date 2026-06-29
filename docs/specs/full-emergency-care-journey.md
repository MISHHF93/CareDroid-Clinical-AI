# Full Emergency Care Journey

**Status:** Defined 2026-06-28. Prehospital tier implemented (Phase B). ED tier previously complete.  
**Mission:** Model the full emergency response lifecycle from first patient contact to hospital outcome.  
**Core principle:** It takes 3 minutes to save someone's life. AI is decision support only — it never replaces licensed clinicians, dispatchers, paramedics, or nurses.

---

## Journey Overview

```
Emergency Event
    │
    ▼
911 / Emergency Call ─────────────────────── [Stage 1-2]  PRE-DISPATCH
    │   Dispatcher receives call, telephone triage
    ▼
Dispatcher Assessment ────────────────────── [Stage 3]    DISPATCH TRIAGE
    │   Priority assigned (Echo/Delta/Charlie/Bravo/Alpha)
    │   Pre-arrival instructions issued to caller
    ▼
CAD Dispatch / Unit Assignment ─────────────[Stage 4]    UNIT DISPATCH
    │   ALS or BLS unit assigned by call priority
    │   Unit acknowledges, status: En Route
    ▼
EMS En Route ────────────────────────────── [Stage 5]    PRE-HOSPITAL
    │   Field vitals captured, scene safety assessed
    ▼
EMS Scene Arrival / Assessment ─────────────[Stage 6]    SCENE
    │   Prehospital assessment: vitals trend, mechanism, interventions
    │   Crew reports: STEMI/Stroke/Trauma/Sepsis/OB flags
    ▼
Prehospital Care ────────────────────────── [Stage 7]    TREATMENT EN ROUTE
    │   Medications administered, airway managed
    │   IV access established, patient stabilized for transport
    ▼
Hospital Pre-Arrival Notification ──────────[Stage 8]    ED ALERT
    │   MIST or SBAR transmitted to receiving ED
    │   AI EMS Pre-Arrival Risk Summary assists charge nurse
    ▼
ED Readiness Activation ────────────────────[Stage 9]    ED PREP
    │   Charge nurse activates readiness plan: bay, staff, equipment
    │   Specialty teams called (cath lab, stroke team, trauma)
    ▼
Patient Arrival ─────────────────────────── [Stage 10]   ARRIVAL
    │   Ambulance offload, handoff checklist completed
    │   Patient entered into CareDroid as ED patient
    ▼
Rapid Intake ────────────────────────────── [Stage 11]   INTAKE
    │   Registration, provisional identity, chief complaint captured
    │   SmartIntake or Reception conversion
    ▼
Triage ──────────────────────────────────── [Stage 12]   TRIAGE
    │   CTAS/ESI acuity assigned (1–5)
    │   AI Triage Recommendation reviewed by triage nurse
    │   Vitals, flags, red flags documented
    │   3-minute timer starts if CTAS 1 or 2
    ▼
AI Chief Review ─────────────────────────── [Stage 13]   AI CHIEF
    │   Critical Alert Assessment, Triage Recommendation
    │   Patient Summary, Department Routing, Three-Minute Response Plan
    │   AI output reviewed by licensed clinician before any action
    ▼
Clinical Action ─────────────────────────── [Stage 14]   ASSESSMENT
    │   Physician/NP assessment, orders placed
    │   Vitals monitored, flags updated, escalation if needed
    ▼
Diagnostics ─────────────────────────────── [Stage 15]   DIAGNOSTICS
    │   Labs ordered, imaging requested, results reviewed
    │   Critical lab results fire alerts via alert engine
    ▼
Treatment / Observation ─────────────────── [Stage 16]   TREATMENT
    │   Medications administered, procedures completed
    │   Patient reassessed per timers
    ▼
Disposition ─────────────────────────────── [Stage 17]   DISPOSITION
    │   Decision: Admit / Discharge / Transfer
    │   AI Department Routing recommendation reviewed by physician
    ▼
Handoff / Reporting ─────────────────────── [Stage 18]   HANDOFF
    │   SBAR handoff summary generated (AI-assisted, nurse/physician reviews)
    │   Ambulance handoff or inpatient transfer completed
    ▼
Outcome Tracking ────────────────────────── [Stage 19]   OUTCOME
    │   CareOutcome record: LOS, door-to-physician, breach status
    │   Disposition documented, bed cleared
    ▼
Analytics Feedback ──────────────────────── [Stage 20]   ANALYTICS
        Breach analytics, flow metrics, bottleneck patterns
        Department capacity, response compliance, quality reports
```

---

## Stage Definitions

### Pre-Dispatch Tier (Stages 1–4)

| Stage | ID | Description | Roles | Status |
|-------|----|-------------|-------|--------|
| Emergency Event | emergency_event | Incident occurs — patient or bystander initiates response | — | ✅ Journey tracked |
| 911 Call | call_received | Call taker receives call, identifies location and complaint | Dispatcher | ✅ DispatchIntakeService |
| Dispatcher Triage | dispatcher_triage | Telephone triage, call priority assigned (Echo–Alpha) | Dispatcher | ✅ DispatchIntakeService |
| CAD Dispatch | ems_dispatched | EMS unit assigned, acknowledged, en route | Dispatcher, EMS Coordinator | ✅ DispatchIntakeService |

### Prehospital Tier (Stages 5–9)

| Stage | ID | Description | Roles | Status |
|-------|----|-------------|-------|--------|
| EMS En Route | ems_en_route | Unit traveling to scene, caller still on line if applicable | Paramedic, EMS Coordinator | ✅ Type: DispatchAssignment |
| Scene Arrival | ems_on_scene | EMS crew on scene, patient contact made | Paramedic | ✅ Type: PrehospitalAssessment |
| Prehospital Assessment | prehospital_assessment | Field vitals, mechanism, interventions, crew alerts | Paramedic | ✅ Type: PrehospitalAssessment |
| Pre-Arrival Notification | hospital_pre_notification | MIST/SBAR transmitted to ED | Paramedic, EMS Coordinator | ✅ preArrivalNotification service |
| ED Readiness | ed_readiness_activated | Bay prep, team notifications, equipment checklist | Charge Nurse, EMS Coordinator | ✅ EDReadinessService |

### Arrival and Intake Tier (Stages 10–11)

| Stage | ID | Description | Roles | Status |
|-------|----|-------------|-------|--------|
| Patient Arrival | patient_arrival | Ambulance offload, handoff checklist signed | Charge Nurse, Paramedic | ✅ ambulanceHandoffChecklist |
| Rapid Intake | rapid_intake | Registration, demographics, complaint capture | Registration Clerk, Triage Nurse | ✅ SmartIntake / Reception |

### Clinical Tier (Stages 12–17)

| Stage | ID | Description | Roles | Status |
|-------|----|-------------|-------|--------|
| Triage | triage_assigned | CTAS/ESI acuity, vitals, flags, 3-minute timer starts | Triage Nurse | ✅ triageAssist service |
| AI Chief Review | ai_chief_reviewed | 16 intent handlers, clinician review required | All clinical roles | ✅ careDroidAI.ts |
| Clinical Action | clinical_action | Physician assessment, orders, notes | Emergency Physician, NP | ✅ emergencyStore actions |
| Diagnostics | diagnostics_ordered | Labs, imaging, results | Physician, Lab/Radiology Tech | ✅ Orders system |
| Treatment | treatment_in_progress | Medications, procedures, observation | RN, Physician | ✅ Whiteboard + notes |
| Disposition | disposition_decided | Admit / discharge / transfer | Emergency Physician | ✅ Referral + discharge |

### Post-Visit Tier (Stages 18–20)

| Stage | ID | Description | Roles | Status |
|-------|----|-------------|-------|--------|
| Handoff | handoff_complete | SBAR handoff, inpatient or transfer | All clinical roles | ✅ handoffSummary intent |
| Outcome | outcome_recorded | CareOutcome record, LOS, breach flags | Charge Nurse, Admin | ✅ Type: CareOutcome |
| Analytics | analytics_fed | Metrics, breach rate, bottleneck patterns | Admin, QSO | ✅ EmergencyAnalytics |

---

## Data Models by Stage

| Model | Stage | File | Status |
|-------|-------|------|--------|
| `EmergencyCall` | Call received | `src/types/emergency.ts` | ✅ New (2026-06-28) |
| `DispatcherAssessment` | Dispatcher triage | `src/types/emergency.ts` | ✅ New |
| `DispatchAssignment` | CAD dispatch | `src/types/emergency.ts` | ✅ New |
| `PrehospitalAssessment` | Scene/field | `src/types/emergency.ts` | ✅ New |
| `PrehospitalVitals` | Field vitals | `src/types/emergency.ts` | ✅ New |
| `EmsCrewUpdate` | Field updates | `src/types/emergency.ts` | ✅ New |
| `PreArrivalNotification` | Pre-alert | `src/types/emergency.ts` | ✅ Existed |
| `EMSArrival` | Handoff | `src/types/emergency.ts` | ✅ Existed |
| `AmbulanceHandoffChecklist` | Handoff | `src/types/emergency.ts` | ✅ Existed |
| `EDReadinessPlan` | ED prep | `src/types/emergency.ts` | ✅ New |
| `Patient` | All clinical | `src/types/emergency.ts` | ✅ Existed |
| `TriageAcuity` | Triage | `src/types/emergency.ts` | ✅ Existed |
| `Alert` | All | `src/types/emergency.ts` | ✅ Existed |
| `CareOutcome` | Outcome | `src/types/emergency.ts` | ✅ New |

---

## 3-Minute Response Across the Journey

The 3-minute timer may now start from multiple trigger points:

| Trigger | Source | Engine Action |
|---------|--------|---------------|
| CTAS 1 or 2 at triage | Triage acuity assignment | Timer auto-starts on Critical alert dispatch |
| EMS Echo pre-arrival notification | Prehospital pre-alert | Critical alert fired by arrivalControlLayer |
| Critical vitals deterioration in waiting room | VitalsAlerts engine | Critical alert → timer starts |
| Staff-triggered escalation | Any licensed role | Manual critical alert → timer starts |
| Reassessment breach on CTAS 1-2 | ReassessmentEngine | Critical alert → timer starts |

Escalation chain (unchanged):
- 0:30 → Awareness to charge nurse
- 2:00 → L1 escalation: charge nurse becomes owner
- 3:00 → BREACH: physician escalation, breach recorded
- 5:00 → Admin notification, extended breach

---

## Roles Across the Journey

| Role | Journey Coverage |
|------|-----------------|
| Dispatcher | Stages 1–4: call intake, triage, dispatch |
| EMS Coordinator | Stages 4–9: unit management, pre-arrival relay, ED readiness |
| Paramedic | Stages 5–10: scene assessment, prehospital care, handoff |
| Registration Clerk | Stage 11: intake and registration |
| Triage Nurse | Stages 12–15: acuity, vitals, flags, reassessment |
| Charge Nurse | Stages 9–18: ED readiness, oversight, escalation owner |
| Registered Nurse | Stages 14–18: treatment, monitoring, handoff |
| Emergency Physician | Stages 13–17: assessment, orders, disposition |
| AI Chief (CareDroid) | Stages 12–18: decision support reviewed by clinicians |
| Patient Flow Coordinator | Stages 16–19: bed management, disposition, capacity |
| Hospital Admin | Stages 17–20: capacity, breach alerts, outcomes |
| Quality Safety Officer | Stage 20: audit, breach review, compliance |

---

## AI Chief Coverage by Stage

| Stage | Intent | Notes |
|-------|--------|-------|
| 911 call | `emergency_call_risk_summary` | Risk from complaint/status — dispatcher reviews |
| Pre-arrival | `ems_prearrival_risk_summary` | Charge nurse ED prep recommendations |
| Triage | `triage_recommendation` | CTAS suggestion — nurse must confirm |
| Critical alert | `critical_alert_assessment` | Red flag detection, owner suggestion |
| 3-min response | `three_minute_response_plan` | Phase-aware escalation plan |
| Patient summary | `patient_summary` | One-line summary at any stage |
| Department routing | `department_routing` | Disposition support |
| Wait time | `wait_time_prediction` | Queue estimate for flow management |
| Staff insight | `staff_resource_insight` | Staffing pressure advisory |
| Command insight | `hospital_command_insight` | ED status at a glance |
| Bottleneck | `service_bottleneck_analysis` | Active service failures |
| Workflow delay | `workflow_delay_analysis` | Process delays, owner routing |
| Risk projection | `three_minute_risk_projection` | Breach risk from bottleneck state |
| Root cause | `operational_root_cause_summary` | Cross-department bottleneck root cause |
| Escalation | `escalation_recommendation` | Escalation decision, owner, reason |
| Handoff | `handoff_summary` | SBAR handoff — clinician reviews |

**Total: 16 ED intents + 2 pre-hospital intents = 18 intents**  
**AI is decision support only at every stage.**
