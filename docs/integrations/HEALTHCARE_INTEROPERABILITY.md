# CareDroid — Healthcare Interoperability & Standards Specification

**Document Version:** 2.2.0  
**Status:** Living Interoperability Specification  
**Lead Authors:** Healthcare Informatics Architect, Chief Technology Officer  
**Core Standards:** HL7 FHIR R4, HL7 v2.5.1, DICOM, NEMSIS v3, SNOMED CT, LOINC  

---

## 1. Interoperability Principles

CareDroid is designed as a vendor-neutral, provider-neutral healthcare intelligence platform. It seamlessly connects with existing Hospital Information Systems (HIS), Electronic Health Records (Epic, Cerner, MEDITECH), and regional pre-hospital EMS dispatch centers without vendor lock-in.

---

## 2. HL7 FHIR R4 Core Mapping Matrix

CareDroid’s domain entities map bi-directionally to HL7 FHIR Release 4 standard resources:

| CareDroid Domain Entity | FHIR R4 Resource | Key Fields & Terminology Bindings |
| :--- | :--- | :--- |
| **Patient Profile** | `Patient` | `identifier` (MRN, Provincial Health Number), `name`, `telecom`, `birthDate`, `gender`. |
| **Active ED Encounter** | `Encounter` | `status` (triaged, in-progress, finished), `class` (EMER), `period` (start, end), `priority` (CTAS level). |
| **Vital Signs Stream** | `Observation` | `code` (LOINC 8867-4 HR, 8480-6 SysBP, 2708-6 SpO2), `valueQuantity`, `effectiveDateTime`. |
| **Acuity Assessment** | `Observation` | `code` (LOINC 75636-1 Triage Acuity Assessment), `valueCodeableConcept` (SNOMED CT CTAS tier). |
| **Diagnostic & Med Orders** | `ServiceRequest` / `MedicationRequest` | `intent` (order), `code` (RxNorm / Canadian DIN), `dosageInstruction`, `requester` (Practitioner). |
| **Disposition & Discharge** | `Condition` / `Encounter` | `hospitalization.dischargeDisposition`, `reasonCode` (ICD-10-CA). |

---

## 3. Pre-Hospital EMS Telemetry & NEMSIS v3

Inbound ambulance data conforms to National Emergency Medical Services Information System (NEMSIS v3.5) standards:
- **eTimes:** Call dispatch, en-route, on-scene, hospital ETA countdown.
- **eVitals:** Streaming serial vitals recorded en-route (ECG rhythm, heart rate, blood pressure, oxygenation).
- **eSituation:** Primary field impression, trauma triage criteria, suspected STEMI or Stroke activation flags.
- **eDisposition:** Destination hospital facility code and receiving nurse verification handshake.

---

## 4. Standardized Clinical Vocabularies

| Domain | Standard Nomenclature | Example Code | Clinical Meaning |
| :--- | :--- | :--- | :--- |
| **Chief Complaints** | SNOMED CT | `267036007` | Dyspnea / Shortness of breath |
| **Lab Tests** | LOINC | `4544-3` | Hematocrit in Blood |
| **Medications** | RxNorm / Canadian DIN | `02242084` | Amoxicillin 250mg/5mL oral suspension |
| **Diagnoses / Disposition** | ICD-10-CA | `I21.0` | Acute transmural myocardial infarction of anterior wall |
| **Triage Acuity** | CTAS (Canadian Triage) | `CTAS-1` | Resuscitation (immediate life threat) |

---

