# CareDroid — Medical KPIs & Biomedical Informatics Reference

**Generated:** 2026-07-01  
**Source:** Live extraction from `lib/ai/config.ts`, `src/data/clinicalIntentToolCatalog.ts`, `src/lib/users/userTypes.ts`, `src/services/`, `backend/src/modules/`

> This document is the authoritative reference for all clinical decision thresholds, operational KPIs, biomedical data standards, and the complete calculator catalog implemented in the CareDroid platform.

---

## Contents

1. [Operational ED KPIs](#1-operational-ed-kpis)
2. [Clinical Scoring Systems & Thresholds](#2-clinical-scoring-systems--thresholds)
3. [Vital Signs Alert Thresholds](#3-vital-signs-alert-thresholds)
4. [AI/ML Clinical Risk Metrics](#4-aiml-clinical-risk-metrics)
5. [Biomedical Informatics & Data Standards](#5-biomedical-informatics--data-standards)
6. [Quality & Safety Governance Metrics](#6-quality--safety-governance-metrics)
7. [Complete Clinical Calculator Catalog](#7-complete-clinical-calculator-catalog)

---

## 1. Operational ED KPIs

### Deterioration Prediction Model Thresholds

| Risk Band | Score Threshold | Clinical Action |
|-----------|----------------|-----------------|
| **Moderate** | ≥ 0.38 | Flag for reassessment review |
| **High** | ≥ 0.62 | Escalate to charge nurse |
| **Critical** | ≥ 0.80 | Immediate physician notification |

### Discharge Readiness Bands

| Band | Score | Workflow Trigger |
|------|-------|-----------------|
| Monitor | ≥ 50 | Track discharge queue |
| Prepare Paperwork | ≥ 70 | Begin discharge documentation |
| Discharge Now | ≥ 85 | Issue discharge order |

### EMS Pre-Arrival Triage Thresholds

| Category | Confidence Threshold | Response |
|----------|---------------------|----------|
| **Immediate** | ≥ 0.78 | Activate trauma bay / resuscitation team |
| **Emergency** | ≥ 0.55 | Priority ED bed assignment |

### Edge Ambulance Vital Alert Thresholds

| Parameter | Threshold | Alert Level |
|-----------|-----------|------------|
| SpO2 | < 90% | Severe hypoxia |
| SpO2 | < 94% | Hypoxia |
| Systolic BP | < 90 mmHg | Hypotension |
| Ultrasound bleeding signal | ≥ 0.80 confidence | Internal haemorrhage flag |
| Fracture signal | ≥ 0.72 confidence | Skeletal injury flag |

### AI Service Rate Limits (per minute)

| Service | Requests/min | Tokens/min |
|---------|-------------|------------|
| ED Copilot | 30 | 60,000 |
| Triage Support | 30 | 30,000 |
| Smart Handover | 10 | 40,000 |
| Text Mining | 300 | 150,000 |
| Federated EMS Triage | 120 | — |

---

## 2. Clinical Scoring Systems & Thresholds

### qSOFA (quick Sequential Organ Failure Assessment)

**Purpose:** Bedside sepsis screening outside ICU  
**Score range:** 0–3 | **High risk:** ≥ 2

| Criterion | Value | Points |
|-----------|-------|--------|
| Respiratory Rate | ≥ 22 breaths/min | 1 |
| Systolic Blood Pressure | ≤ 100 mmHg | 1 |
| Altered mentation / GCS | < 15 | 1 |

> qSOFA ≥ 2 is a platform-level governance override — the AI cannot downgrade patient priority when this threshold is met.

---

### NEWS2 (National Early Warning Score 2)

**Purpose:** Adult early warning for clinical deterioration (Royal College of Physicians standard)  
**Score range:** 0–20 | **Resuscitation team threshold:** ≥ 7

| Parameter | 3 pts | 2 pts | 1 pt | 0 pts | 1 pt | 2 pts | 3 pts |
|-----------|-------|-------|------|-------|------|-------|-------|
| Respiration Rate (/min) | ≤ 8 | — | 9–11 | 12–20 | — | 21–24 | ≥ 25 |
| SpO2 Scale 1 (%) | ≤ 91 | 92–93 | 94–95 | ≥ 96 | — | — | — |
| Supplemental O2 | — | On O2 | — | Room air | — | — | — |
| Systolic BP (mmHg) | ≤ 90 | 91–100 | 101–110 | 111–219 | — | — | ≥ 220 |
| Heart Rate (/min) | ≤ 40 | — | 41–50 | 51–90 | 91–110 | 111–130 | ≥ 131 |
| Temperature (°C) | ≤ 35.0 | — | 35.1–36.0 | 36.1–38.0 | 38.1–39.0 | ≥ 39.1 | — |
| Consciousness | — | — | — | Alert | — | — | Confused/V/P/U |

**Risk bands:**

| Score | Band | Response |
|-------|------|----------|
| 0–4 | Low | Routine monitoring |
| 5–6 (or any single 3) | Medium | Urgent senior clinical review |
| ≥ 7 | High | Emergency clinical assessment — resuscitation team |

---

### HEART Score (Chest Pain Risk Stratification)

**Purpose:** 6-week MACE risk in chest pain presentation  
**Score range:** 0–10

| Component | 0 pts | 1 pt | 2 pts |
|-----------|-------|------|-------|
| History | Slightly suspicious | Moderately suspicious | Highly suspicious |
| ECG | Normal | Non-specific repolarisation | Significant ST deviation |
| Age | < 45 yr | 45–64 yr | ≥ 65 yr |
| Risk factors | None known | 1–2 risk factors | ≥ 3 risk factors or atherosclerotic disease |
| Troponin | ≤ ULN | 1–3× ULN | > 3× ULN |

**Risk bands:**

| Score | Risk | 6-week MACE |
|-------|------|-------------|
| 0–3 | Low | ~2% |
| 4–6 | Intermediate | ~12–17% |
| 7–10 | High | ~50–65% |

---

### NIHSS (NIH Stroke Scale)

**Purpose:** Stroke severity quantification  
**Score range:** 0–42

| Score | Severity |
|-------|----------|
| 0 | No stroke |
| 1–4 | Minor |
| 5–15 | Moderate |
| 16–20 | Moderate-severe |
| 21–42 | Severe |

---

### ABCD² Score (TIA Stroke Risk)

**Purpose:** 2-day and 7-day stroke risk after TIA  
**Score range:** 0–7

| Score | Risk Band | 2-day stroke risk |
|-------|-----------|------------------|
| 0–3 | Low | ~1% |
| 4–5 | Moderate | ~4% |
| 6–7 | High | ~8% |

---

### GRACE ACS 2.0 (Acute Coronary Syndrome)

**Purpose:** In-hospital and 6-month NSTEMI mortality  
**Input variables:** Age · Heart rate · Systolic BP · Serum creatinine · Killip class (I–IV) · Cardiac arrest at admission · ST-segment deviation · Elevated cardiac enzymes

---

### MELD Score (Chronic Liver Disease)

**Purpose:** Chronic liver disease severity and transplant urgency  
**Score range:** 6–40 | Higher = more severe

Calculated from: serum bilirubin, INR, serum creatinine (±sodium for MELD-Na)

---

### Child-Pugh Score (Cirrhosis)

**Purpose:** Cirrhosis severity classification

| Class | Score | Prognosis |
|-------|-------|-----------|
| A | 5–6 | Well-compensated cirrhosis |
| B | 7–9 | Significant functional compromise |
| C | 10–15 | Decompensated cirrhosis |

---

### Bishop Score (Cervical Favorability)

**Purpose:** Pre-induction cervical ripening assessment  
**Score range:** 0–13

| Score | Interpretation |
|-------|---------------|
| ≥ 8 | Favourable — induction likely successful |
| 6–7 | Intermediate |
| < 6 | Unfavourable — cervical ripening recommended |

---

### Morse Fall Scale

**Purpose:** Inpatient fall risk  
**Score range:** 0–125

| Score | Risk | Action |
|-------|------|--------|
| < 25 | Low | Standard precautions |
| 25–50 | Moderate | Fall prevention protocol |
| > 50 | High | High-risk fall protocol |

---

### Braden Scale (Pressure Injury Risk)

**Score range:** 6–23 | **Lower score = higher risk**  
**Domains:** sensory perception, moisture, activity, mobility, nutrition, friction/shear

---

### HAS-BLED Score (Anticoagulation Bleeding Risk)

**Purpose:** Major bleeding risk in anticoagulated AF patients  
**Score range:** 0–9 | **≥ 3 = higher bleeding risk** — reassess anticoagulation benefits

---

### Glasgow-Blatchford Score (Upper GI Bleeding)

**Purpose:** Pre-endoscopy triage — identifies patients who can be managed outpatient  
**Score range:** 0–23 | **0 = low risk** (can consider outpatient management)

---

### Apgar Score (Newborn Assessment)

**Purpose:** Newborn status at 1 and 5 minutes  
**Score range:** 0–10 (appearance, pulse, grimace, activity, respiration)

| Score | Interpretation |
|-------|---------------|
| 7–10 | Normal |
| 4–6 | Moderate concern — continue assessment |
| 0–3 | Severely depressed — immediate resuscitation |

---

## 3. Vital Signs Alert Thresholds

### Governance Override Thresholds

The following thresholds are hardcoded governance rules — the AI **cannot downgrade patient priority** when any of these are met:

| Parameter | Threshold | Override Rule |
|-----------|-----------|--------------|
| Heart rate | > 120 bpm | Priority lock |
| Blood pressure | < 90/60 mmHg | Priority lock |
| SpO2 | < 92% | Priority lock |
| Respiratory rate | > 24/min | Priority lock |
| Clinical conditions | stroke, sepsis, chest_pain | Priority lock |
| DPS score | 1 or 2 (highest deterioration) | Priority lock |

### NEWS2-Derived Clinical Alert Thresholds

| Parameter | Critical Low | Concern Low | Normal | Concern High | Critical High |
|-----------|-------------|-------------|--------|--------------|---------------|
| SpO2 (%) | < 92 | 92–93 | 94–100 | — | — |
| Resp Rate (/min) | < 8 | 9–11 | 12–20 | 21–24 | > 24 |
| Heart Rate (/min) | < 40 | 41–50 | 51–90 | 91–130 | > 130 |
| Systolic BP (mmHg) | < 90 | 91–110 | 111–219 | — | > 220 |
| Temperature (°C) | < 35.0 | 35.1–36.0 | 36.1–38.0 | 38.1–39.0 | > 39.1 |
| Consciousness | — | — | Alert | — | CVPU |

---

## 4. AI/ML Clinical Risk Metrics

### 17 AI Services — Risk & Governance Matrix

| Service | Provider | Risk Level | Regulatory Category | Human Review | Audit Level | Status |
|---------|----------|-----------|---------------------|-------------|-------------|--------|
| **copilot** | Anthropic | Medium | Informational | ✅ Required | Full (7 yr) | Active |
| **smartIntakeVerification** | Anthropic | Medium | Informational | ✅ Required | Full | Active |
| **referralSummarization** | Anthropic | Medium | Clinical Decision Support | ✅ Required | Full | Active |
| **analyticsExplanation** | Anthropic | Low | Informational | ✅ Required | Full | Active |
| **clinicalWorkflowLauncher** | Anthropic | Medium | Clinical Decision Support | ✅ Required | Full | Active |
| **calculatorExplanation** | Anthropic | Medium | Clinical Decision Support | ✅ Required | Full | Active |
| **smartHandover** | Anthropic | Medium | Clinical Decision Support | ✅ Required | Full | Legacy |
| **protocolTrigger** | Local | **High** | Clinical Decision Support | ❌ Deterministic | Full | Local |
| **deteriorationPrediction** | Local | **High** | Clinical Decision Support | ✅ Required | Full | Future |
| **dischargePrediction** | Local | Medium | Clinical Decision Support | ✅ Required | Basic | Future |
| **admissionPrediction** | Local | Medium | Clinical Decision Support | ✅ Required | Basic | Future |
| **triageSupport** | Anthropic | **High** | Clinical Decision Support | ✅ Required | Full | Legacy |
| **ambientDocumentation** | Azure OpenAI | Medium | Clinical Decision Support | ✅ Required | Full | Legacy |
| **textMining** | Local | Low | Informational | ❌ Deterministic | Basic | Local |
| **mohPatientMatching** | Local | **High** | Identity Resolution | ✅ Required | Full | Future |
| **federatedEmsTriage** | Local | **High** | Clinical Decision Support | ✅ Required | Basic | Future |
| **edgeAmbulance** | Local | **High** | Clinical Decision Support | ✅ Required | Basic | Future |

### NLU & Retrieval Configuration

| Parameter | Value |
|-----------|-------|
| NLU confidence threshold | 0.70 |
| NLU service timeout | 30,000 ms |
| NLU retries | 3 |
| Anomaly detection | Enabled |
| Vector database | Pinecone |
| RAG index | `caredroid-medical-knowledge` |
| Embedding dimension | 1,536 |
| Chunk size | 512 tokens |
| Chunk overlap | 50 tokens |
| Retrieval top-K | 5 |
| Minimum relevance score | 0.70 |
| Audit log retention | 2,555 days (7 years) |

---

## 5. Biomedical Informatics & Data Standards

### Integration Standards

| Standard | Implementation | Status |
|----------|---------------|--------|
| **FHIR R4** | Native connector — bundle ingestion, patient/encounter resources | Integrated |
| **SMART on FHIR** | OAuth 2.0 authorization framework | Integrated |
| **HL7 v2** | Legacy message parsing for lab/ADT feeds | Integrated |
| **FHIR Hub Normalization** | Arrival check-in and placeholder registration normalized to FHIR | Active |
| **Live CAD/FHIR EMS Feed** | Real-time EMS data via FHIR + CAD API | Integration-dependent |

### Canonical Data Model

#### Patient Record
```
patientId, organizationId, arrivalSource (walk-in / EMS / transfer / self-arrival)
chiefComplaint, acuityLevel (CTAS 1–5), status, assignedBed, assignedPhysician
vitals: { HR, BP, RR, SpO2, Temp, GCS, pain }
flags: string[], activeAlerts: AlertRecord[]
timers: { doorArrival, triageStart, physicianContact, disposition }
handoffs: HandoffRecord[]
```

#### Identity & Access Profile
```
organizationId, networkId, hospitalSiteId, departmentId, unitId
careTeamIds, role (23 variants), emergencyRoleId, saasRole, backendRole
permissions, assignedPatients, alertOwnershipScope, aiReviewScope, patientAccessScope
accessScope: unit | department | hospital | network
dataMinimizationLevel: standard | restricted | minimal
escalationLevel: 1–5
```

#### Alert Record
```
alertId, source (AI / manual / device), severity (critical / high / medium / low)
ownerRole, assignedUser, generatedAt, acknowledgedAt, escalatedAt, resolvedAt
requiresHumanReview: boolean, escalation: boolean
```

#### AI Interaction Record
```
queryText, intentClassified, toolInvoked, responseGenerated
userRole, patientContext, timestamp, modelUsed
requiresHumanReview, escalation, auditTrail
```

### Clinical Terminology & Coding Systems

| System | Usage in Platform |
|--------|------------------|
| **ICD-10-CM** | Chief complaint coding, diagnosis classification |
| **SNOMED CT** | Clinical concept normalization |
| **LOINC** | Lab and vital sign observation codes |
| **RxNorm** | Drug reference and interaction checking |
| **CPT** | Procedure ordering context |
| **DICOM** | Imaging study reference linkage |

---

## 6. Quality & Safety Governance Metrics

### AI Safety Rules (Hardcoded — Cannot Override)

1. **Human superiority** — Every AI output is a suggestion; clinicians always have final authority
2. **Confidence display** — All outputs carry a confidence score, model identifier, and evidence quality indicator
3. **Audit trail** — Every AI interaction logged with query, intent, tool, response, role, patient context, timestamp, model
4. **Critical escalation** — AI-detected critical patterns always generate a human-review alert; cannot be auto-acted
5. **Fallback behaviour** — When AI is unavailable or confidence < threshold, output: *"AI assistance is not available. Please refer to clinical protocols."*
6. **LLM security** — Every query passes prompt injection detection, jailbreak pattern matching, and role-appropriate response filtering

### Required Safety Disclaimers

All 8 registered AI prompts carry a `requiredDisclaimer` field. Platform-standard text:
- *"Human review required before any clinical action"*
- *"AI-generated content — verify before acting"*
- *"External data review disclaimer"*

### Service Rate Limits (Compliance)

| Service | Requests/min | Max Tokens/min |
|---------|-------------|----------------|
| ED Copilot | 30 | 60,000 |
| Triage Support | 30 | 30,000 |
| Smart Handover | 10 | 40,000 |
| Federated EMS Triage | 120 | — |
| Text Mining | 300 | 150,000 |

### Audit & Retention

| Setting | Value |
|---------|-------|
| Full audit retention | 2,555 days (7 years) |
| Audit includes | Query, intent, tool, response, model, role, patient context, timestamp |
| AI governance module | `backend/src/modules/governance/` + `backend/src/modules/platform-governance/` |
| Human review queue | `backend/src/modules/human-review/` (SLA-tracked) |
| AI evaluation | `backend/src/modules/evaluation/` (accuracy benchmarks, false positive/negative tracking) |

---

## 7. Complete Clinical Calculator Catalog

**219 NLU intent profiles · 100+ active calculators · Organized by clinical domain**

### Sepsis & Critical Care

| Calculator | Score Range | Key Threshold | Purpose |
|-----------|-------------|---------------|---------|
| SOFA | 0–24 | ≥ 2 organ failure | Sequential organ failure in sepsis/ICU |
| qSOFA | 0–3 | ≥ 2 = positive | Bedside sepsis screening |
| NEWS2 | 0–20 | ≥ 7 = resus team | Adult early warning |
| MEWS | 0–14 | ≥ 5 = urgent | Modified early warning |
| PEWS | 0–9 | ≥ 5 = concern | Pediatric early warning |
| APACHE-II | 0–71 | > 25 = high mortality | ICU severity scoring |

### Cardiovascular

| Calculator | Score Range | Key Threshold | Purpose |
|-----------|-------------|---------------|---------|
| HEART | 0–10 | ≥ 7 = high | Chest pain MACE risk |
| GRACE ACS 2.0 | Continuous | Model-based | NSTEMI in-hospital mortality |
| TIMI UA/NSTEMI | 0–7 | ≥ 5 = high | Unstable angina/NSTEMI risk |
| CHA₂DS₂-VASc | 0–9 | ≥ 2 (men), ≥ 3 (women) | Non-valvular AFib stroke risk |
| CHADS₂ | 0–6 | ≥ 2 = anticoagulate | AFib stroke risk (legacy) |
| Wells PE | 0–12.5 | > 4 = high prob | PE pre-test probability |
| Wells DVT | 0–8 | ≥ 2 = moderate | DVT pre-test probability |
| HAS-BLED | 0–9 | ≥ 3 = higher risk | Anticoagulation bleeding risk |
| ASCVD 10-yr (PCE) | 0–100% | ≥ 7.5% = consider statin | Primary prevention CVD risk |
| Shock Index | Continuous | > 1.0 = concern | HR/SBP ratio — circulatory status |
| Framingham 10-yr CHD | 0–100% | — | Alternative CVD risk |
| Duke Treadmill | Continuous | — | Exercise test prognosis |

### Neurology & Stroke

| Calculator | Score Range | Key Threshold | Purpose |
|-----------|-------------|---------------|---------|
| GCS | 3–15 | ≤ 8 = intubate consider | Consciousness level |
| NIHSS | 0–42 | ≥ 21 = severe | Stroke severity |
| ABCD² | 0–7 | ≥ 6 = high risk | TIA stroke risk at 2 days |
| Hunt-Hess | 1–5 | Grade 4–5 = surgical | SAH clinical grading |
| ICH Score | 0–6 | ≥ 4 = high mortality | Intracerebral haemorrhage |
| FOUR Score | 0–16 | — | Coma (replaces GCS for intubated) |
| Modified Rankin | 0–6 | ≥ 2 = disability | Stroke disability outcome |

### Pulmonary

| Calculator | Score Range | Key Threshold | Purpose |
|-----------|-------------|---------------|---------|
| CURB-65 | 0–5 | ≥ 3 = hospital | CAP severity and admission guidance |
| PSI | Classes I–V | Class IV–V = hospital | Pneumonia severity index |
| PaO₂/FiO₂ Ratio | Continuous | < 300 = ALI; < 200 = ARDS | Oxygenation adequacy |
| A-a Gradient | Continuous | Age-adjusted | Alveolar-arterial oxygen transfer |
| ROX Index | Continuous | < 4.88 at 2h = HFNC failure risk | High-flow oxygen monitoring |
| BODE Index | 0–10 | > 5 = poor prognosis | COPD 4-yr survival |
| COPD GOLD | A / B / E | — | COPD exacerbation risk grouping |
| STOP-Bang | 0–8 | ≥ 5 = high | OSA pre-operative screening |
| PERC | 0/1 | 0 = PE excluded | PE rule-out criteria |

### Renal

| Calculator | Output | Key Threshold | Purpose |
|-----------|--------|---------------|---------|
| eGFR CKD-EPI 2021 | mL/min/1.73m² | < 60 = CKD | Race-free creatinine-based GFR |
| CKD Staging (KDIGO) | G1–G5 × A1–A3 | G3b+ = nephrology | GFR + albuminuria prognosis grid |
| Creatinine Clearance (CG) | mL/min | Drug dosing guide | Cockcroft-Gault for dosing |
| KFRE | 2-yr & 5-yr % | — | Kidney failure risk equation |
| FeNa | % | < 1% = pre-renal | Fractional excretion sodium |
| FeUrea | % | < 35% = pre-renal | AKI differentiation (on diuretics) |
| BUN/Creatinine Ratio | — | > 20 = pre-renal | Volume/renal status |

### Hepatic

| Calculator | Score Range | Key Threshold | Purpose |
|-----------|-------------|---------------|---------|
| MELD | 6–40 | > 18 = consider transplant | Chronic liver disease severity |
| MELD-Na | 6–40 | — | Sodium-adjusted MELD |
| Child-Pugh | A / B / C | Class C = decompensated | Cirrhosis severity |
| FIB-4 | Continuous | > 3.25 = advanced fibrosis | Liver fibrosis screening |
| APRI | Continuous | > 1.0 = significant fibrosis | AST to platelet fibrosis ratio |
| Maddrey DF | Continuous | ≥ 32 = severe | Alcoholic hepatitis steroid eligibility |
| Glasgow-Blatchford | 0–23 | 0 = outpatient eligible | Upper GI bleed triage |
| Rockall | 0–11 | ≥ 5 = high re-bleed | Post-endoscopy GI bleed risk |
| Ranson Criteria | 0–11 | ≥ 3 = severe pancreatitis | Acute pancreatitis severity |
| BISAP | 0–5 | ≥ 3 = high mortality | Early pancreatitis mortality risk |

### Mental Health Screening

| Calculator | Score Range | Safety Flag | Purpose |
|-----------|-------------|-------------|---------|
| PHQ-9 | 0–27 | Item 9 ≥ 1 → suicide flag | Depression screening |
| GAD-7 | 0–21 | — | Generalised anxiety |
| AUDIT-C | 0–12 | — | Alcohol consumption screen |
| CAGE | 0–4 | ≥ 2 = concern | Alcohol use disorder |
| PCL-5 | 0–80 | — | PTSD symptom screen |
| Columbia Suicide Severity | Structured workflow | Active ideation → escalation | Suicide risk routing |
| MDQ | 0–13 | — | Bipolar-spectrum screen |
| MMSE | 0–30 | — | Cognitive screening |
| MoCA | 0–30 | — | Cognitive governance workflow |
| Epworth Sleepiness | 0–24 | ≥ 10 = daytime sleepiness | Sleep disorder screen |

### Musculoskeletal & Trauma

| Calculator | Output | Purpose |
|-----------|--------|---------|
| NEXUS C-Spine | Rule-in / Rule-out | Cervical spine imaging decision |
| Canadian C-Spine Rule | Rule-in / Rule-out | Alternative c-spine imaging rule |
| Ottawa Ankle Rules | Rule-in / Rule-out | Ankle/foot fracture assessment |
| PECARN Head CT | Low / Not-low risk | Paediatric head CT decision |
| Revised Trauma Score | 0–12 | Physiologic trauma severity |
| Braden Scale | 6–23 | Pressure injury risk |
| Morse Fall Scale | 0–125 | Inpatient fall risk |

### Obstetric & Neonatal

| Calculator | Output | Purpose |
|-----------|--------|---------|
| Pregnancy Due Date | EDD | LMP / conception / ultrasound dating |
| Gestational Age (ACOG) | Weeks + days | Dating estimate |
| Bishop Score | 0–13 | Cervical favourability pre-induction |
| Apgar Score | 0–10 | Newborn status at 1 & 5 min |
| Neonatal Bilirubin Risk | Risk zone | AAP 2022 nomogram workflow |
| Fenton Growth Chart | Percentile | Neonatal growth classification |
| Paediatric BP Percentile | Percentile band | Age/sex-adjusted BP screening |

### Electrolytes & Metabolic

| Calculator | Output | Purpose |
|-----------|--------|---------|
| Anion Gap | mEq/L (albumin-corrected) | Acid-base screening |
| Serum Osmolality | mOsm/kg | Calculated from Na/glucose/BUN/EtOH |
| Osmolal Gap | mOsm/kg | Toxic alcohol screening |
| Free Water Deficit | Litres | Hyponatremia correction estimate |
| Corrected Calcium | mg/dL | Albumin-adjusted total calcium |
| Corrected Sodium | mEq/L | Hyperglycaemia context |
| HOMA-IR | Index | Insulin resistance estimate |

### Operations & Resource Management

| Calculator | Output | Purpose |
|-----------|--------|---------|
| Bed Occupancy | Occupied/blocked/usable + % | Capacity management |
| Staffing Ratio | Patients per staff + coverage gaps | Nurse-to-patient compliance |
| Turnaround Time | Variance by phase | Request → assign → service → cleanup |
| Resource Utilisation Index | Composite signal | Beds + staff + devices + fleet |

### Specialty AI Assistants (NLU-routed)

| Assistant | Scope |
|-----------|-------|
| ED Copilot | Wait times, bottlenecks, capacity, EMS, boarding, queues |
| AI Triage Assistant | Acuity considerations; CTAS 1–2 always require human confirmation |
| Smart Intake Verification | AI field suggestions with staff override |
| Referral Summarisation | Referral context and urgency classification |
| Clinical Workflow Launcher | Workflow/checklist/calculator routing from NLU query |
| Calculator Explanation | Inputs, score bands, missing values, limitations |
| Smart Handover | SBAR-structured handover summary from patient data |
| Asthma Exacerbation Assistant | Severity, PEF, SpO2, work of breathing, bronchodilator response |
| Oxygen Escalation Helper | Device, work of breathing, ROX index, FiO₂ context |
| Ventilator Support Assistant | Mode, oxygenation, alarms, escalation triggers |
| Respiratory Telemetry Review | SpO2/RR/device/deterioration signals |
| Pulmonary Trends Summary | SpO2/RR/FiO₂/PaO₂ + ROX + spirometry |
| Paediatric Sepsis Assistant | Age-adjusted vitals, perfusion, sepsis criteria |
| Paediatric Dose Safety Checker | Weight-based emergency drug dosing |
| OB Triage Assistant | Maternal symptoms, fetal concerns, acuity routing |
| Neonatal Assessment Assistant | Apgar, feeding, temperature, bilirubin |
| Maternal Monitoring Dashboard | Vitals, symptoms, labs, fetal status |
| Substance Use Screening Assistant | AUDIT-C, CAGE, intoxication, withdrawal |
| Cognitive Screening Assistant | MMSE, MoCA, delirium flags |
| Suicide Risk Workflow | PHQ-9 item 9 + Columbia escalation routing |
| Crisis Escalation Audit Log | Crisis events and review status |
| Population Screening Dashboard | Panel completion, positive screens, data quality |

---

*Source files: `lib/ai/config.ts` · `src/data/clinicalIntentToolCatalog.ts` · `src/lib/users/userTypes.ts` · `src/services/integrationStatusRegistry.ts` · `docs/specs/data-model-spec.md`*
