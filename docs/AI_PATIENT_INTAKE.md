# CareDroid — AI Patient Intake Reference

**Generated:** 2026-07-01  
**Source:** `lib/ai/config.ts` · `lib/ai/promptRegistry.ts` · `lib/ai/toolRegistry.ts` · `src/pages/emergency/SmartIntake.tsx` · `src/pages/emergency/SelfArrivalCheckIn.tsx` · `src/config/intakeArtifactRegistry.ts` · `backend/src/services/smart-intake.service.ts` · `src/data/smartIntakeVerticalSlice.ts` · `src/utils/patientDuplicateDetection.ts` · `src/types/emergency.ts`

> All AI intake outputs are suggestions. No autonomous identity decisions, no auto-triage, no auto-import of external records. Every extracted field requires staff verification before the patient record is finalised.

---

## Contents

1. [Intake Channels](#1-intake-channels)
2. [Smart Intake AI Service](#2-smart-intake-ai-service)
3. [Document Capture & OCR Pipeline](#3-document-capture--ocr-pipeline)
4. [Extracted Field Reference](#4-extracted-field-reference)
5. [Patient Identity Matching](#5-patient-identity-matching)
6. [Field Verification Workflow](#6-field-verification-workflow)
7. [Session Lifecycle](#7-session-lifecycle)
8. [Auto-Triage Triggers](#8-auto-triage-triggers)
9. [Self-Arrival Check-In](#9-self-arrival-check-in)
10. [Reception Desk Intake](#10-reception-desk-intake)
11. [EMS Pre-Arrival AI](#11-ems-pre-arrival-ai)
12. [API Reference](#12-api-reference)
13. [Safety & Governance](#13-safety--governance)
14. [Data Model](#14-data-model)

---

## 1. Intake Channels

CareDroid supports six arrival modes. Each feeds into the same Smart Intake session and verification pipeline.

| Arrival Mode | Entry Point | AI Involvement | Queue Destination |
|-------------|-------------|----------------|------------------|
| `walk-in` | Reception desk or self-arrival kiosk | AI field assist + Red flag detection | Pretriage / triage-queue |
| `EMS` | EMS Pipeline pre-arrival card | Edge AI vitals + federated triage | ems-registration |
| `referral` | Smart Intake with referral letter | AI text extraction from referral doc | verification |
| `self-check-in` | Patient kiosk (SelfArrivalCheckIn) | AI triage preview + health record lookup | waiting-room / triage-queue |
| `police` | Reception desk | Manual + AI red flag detection | triage-queue |
| `transfer` | Smart Intake with discharge summary | AI text extraction from summary | verification |

---

## 2. Smart Intake AI Service

### Service Definition

**Service ID:** `smartIntakeVerification`  
**File:** `lib/ai/config.ts`

| Property | Value |
|----------|-------|
| Name | Smart Intake Verification |
| Provider | Anthropic (`claude-sonnet-4-6` default) |
| Override env | `AI_SMART_INTAKE_MODEL` → `AI_MODEL` |
| Risk level | Medium |
| Regulatory category | Informational |
| Requires human review | ✅ Yes — mandatory |
| Temperature | 0.1 (near-deterministic) |
| Max tokens | 1,000 |
| Rate limit | 20 req/min · 20,000 tokens/min |
| Audit level | Full (7-year retention) |
| Fallback enabled | Yes |
| Status | Active |

**Safety constraints (cannot be overridden):**
- Cannot auto-triage
- Cannot auto-link patient identity
- Cannot auto-import external health data
- Must include disclaimer: *"Human review required. This is not a replacement for clinical judgment."*

---

### Prompt Definition

**Prompt ID:** `smart-intake-assistant`  
**Request type:** `INTAKE_SUGGESTION`  
**File:** `lib/ai/promptRegistry.ts`

```
productRole:
  Smart Intake Assistant = extraction and verification helper

systemPrompt:
  Help staff verify intake information, identify missing fields,
  and suggest next verification steps. Do not auto-merge identities,
  auto-import outside records, or make triage decisions without
  human review.

requiredDisclaimer:
  "Human review required. This is not a replacement for clinical judgment."
```

**Behaviour in practice:**
- Responds with 2–3 concise next verification steps for front-desk staff
- Always appends the HUMAN_REVIEW_DISCLAIMER to every response
- Will not suggest triage acuity — triage belongs to the triage nurse

---

### Tools Available to Smart Intake AI

From `lib/ai/toolRegistry.ts`, the following tools are available within `INTAKE_SUGGESTION` requests. All mutating tools require human confirmation before applying.

| Tool | Type | Purpose |
|------|------|---------|
| `get_patient_details` | Read-only | Fetch full patient record for context |
| `launch_calculator` | Mutating (requires confirmation) | Propose opening a clinical calculator |

---

## 3. Document Capture & OCR Pipeline

### Supported Artifact Types

**File:** `src/config/intakeArtifactRegistry.ts`

#### Identity Documents

| Artifact | Capture Methods | Fields Extracted |
|----------|----------------|-----------------|
| Government ID | photo, upload, paste | firstName, lastName, dateOfBirth, sex, address, documentNumber, nationality, documentExpiry, bloodType |
| Health card | photo, upload | firstName, lastName, dateOfBirth, sex, healthCardNumber, address |
| Driver's licence | photo, upload | firstName, lastName, dateOfBirth, sex, address, documentNumber, documentExpiry |
| Passport | photo, upload | firstName, lastName, dateOfBirth, sex, documentNumber, nationality, documentExpiry |

#### Clinical Documents

| Artifact | Capture Methods | Fields Extracted |
|----------|----------------|-----------------|
| Medication list | photo, upload, paste | medicationName, dose, route, frequency |
| Allergy list / card | photo, upload, paste | substance, reaction, severity |
| Referral letter | upload, paste | demographics (may conflict with health card), chiefComplaint, clinicalContext |
| Discharge summary | upload, paste | demographics, diagnoses, medications, allergies |

#### Administrative Documents

| Artifact | Capture Methods | Fields Extracted |
|----------|----------------|-----------------|
| Insurance card | photo, upload | payerName, memberId, groupId, subscriberName |

### OCR Parser Assignment

| Parser | Handles |
|--------|---------|
| `identity` | Government ID, health card, driver's licence, passport |
| `insurance` | Insurance cards |
| `medication` | Medication lists |
| `allergy` | Allergy lists |
| `referral` | Referral letters |
| `discharge` | Discharge summaries |

### Confidence Scoring

Each OCR-extracted field carries a `confidence` value (0.0–1.0). Fields with low confidence are flagged for mandatory staff review.

| Confidence | Implication |
|-----------|-------------|
| ≥ 0.90 | High confidence — pre-approved for staff review |
| 0.65–0.89 | Moderate — staff prompted to verify |
| < 0.65 | Low — field highlighted; manual confirmation required |

**Source tag applied to every field:**

`manual_entry` · `ocr_result` · `ems_prearrival` · `referral_document` · `medication_list` · `allergy_list` · `id_document_scan`

---

## 4. Extracted Field Reference

All fields flow through staff verification before entering the patient record.

| Field | Required Critical | Sources | Notes |
|-------|:-----------------:|---------|-------|
| `firstName` | ✅ | Health card OCR, manual, referral | Name conflicts trigger duplicate review |
| `lastName` | ✅ | Health card OCR, manual, referral | Previous names captured (e.g. married/birth name) |
| `dateOfBirth` | ✅ | ID scan, health card OCR, manual | ISO format YYYY-MM-DD |
| `sex` | ✅ | Manual entry, ID document | Female · Male · Other · Unspecified |
| `phone` | — | Referral letter, manual entry | — |
| `healthCardNumber` | — | Health card OCR, manual | High match-weight in duplicate scoring |
| `address` | — | OCR result, manual entry | May conflict between documents |
| `allergy` | — | Allergy card, allergy list upload | Substance · reaction · severity |
| `medication` | — | Medication list, phone photo | Name · dose · route · frequency |
| `chiefComplaint` | — | EMS pre-arrival, manual entry, referral | Free text; categorised downstream |
| `mrn` | — | Existing record, manual entry | Highest match-weight in duplicate scoring |

**Required critical fields** (`firstName`, `lastName`, `dateOfBirth`, `sex`) must all be reviewed and approved before patient creation or record linking can proceed.

---

## 5. Patient Identity Matching

**File:** `src/utils/patientDuplicateDetection.ts`

### Scoring Algorithm

Each candidate patient is scored against the incoming intake snapshot:

| Field | Points | Notes |
|-------|--------|-------|
| `mrn` | 35 | Highest single-field weight |
| `healthCardNumber` | 35 | Equivalent to MRN |
| `lastName` | 16 | — |
| `firstName` | 12 | — |
| `phone` | 12 | — |
| `dateOfBirth` | 25 | — |
| `sex` | 5 | — |
| **Full name match bonus** | +37 | Applied when BOTH first AND last name match |

**Maximum possible score: 177 points**

### Match Decision Thresholds

| Score Band | Decision | Action |
|-----------|----------|--------|
| ≥ 85 | `link_after_staff_confirmation` | High-confidence duplicate — staff prompted to link |
| 65–84 | `possible_duplicate_review` | Possible duplicate — requires staff review |
| 35–64 | `manual_review` | Low confidence — manual review queue |
| < 35 | `create_new_patient` | No match — proceed to new patient creation |

### MOH Patient Matching AI Service

**Service ID:** `mohPatientMatching`  
**File:** `lib/ai/config.ts`

| Property | Value |
|----------|-------|
| Provider | Local (embedding-based) |
| Model | `local-deterministic-embedding` |
| Risk level | **High** |
| Regulatory category | Identity resolution |
| Requires human review | ✅ Yes |
| Max tokens | 8,191 |
| Temperature | 0 (fully deterministic) |
| Rate limit | 30 req/min · 245,000 tokens/min |
| Audit level | Full |
| Status | Future |

**Safety constraints:**
- Matches are probabilistic — staff verification always required
- No autonomous identity decisions permitted

### Unknown Patient Pathway

When identity cannot be established (e.g. unconscious EMS arrival):

1. Temporary patient record created with generated encounter ID
2. `identity_reconciled = false` flag set
3. Alert added: *"Unknown patient — reconciliation required"*
4. Reconciliation performed later via `reconcileUnknown()` — updates identity, sets `identity_reconciled = true`
5. Full audit trail maintained throughout

### Biometric Consent

When a tenant has biometrics enabled:

- **Dual gate:** Tenant approval AND patient consent both required
- Captured fields: modality (`fingerprint` · `iris` · `facial`), purpose statement, retention policy
- Consent recorded in audit trail

---

## 6. Field Verification Workflow

Each extracted field passes through a three-decision review by front-desk staff:

| Decision | Meaning | Outcome |
|----------|---------|---------|
| `approved` | Field value accepted as-is | Enters `verifiedSnapshot` |
| `edited` | Field accepted with manual correction | Corrected value enters `verifiedSnapshot` |
| `rejected` | Field dismissed | Excluded from patient record |

**Workflow rules:**
- All four required critical fields (`firstName`, `lastName`, `dateOfBirth`, `sex`) must reach `approved` or `edited` before patient creation or linking
- Staff override of an AI-extracted field is always permitted without justification
- Every decision is audit-logged with field name, decision, actor, and timestamp

---

## 7. Session Lifecycle

**File:** `backend/src/services/smart-intake.service.ts`

```
capturing_inputs
      │  Staff enters demographics; documents uploaded; EMS evidence added
      ▼
review_ocr
      │  OCR results ingested; fields extracted with confidence scores
      ▼
matching
      │  Patient duplicate search against local + MPI candidates
      ▼
verifying
      │  Staff approves / edits / rejects each extracted field
      ▼
completed ──► link_patient    (existing record)
          ──► create_patient  (new patient record)
          ──► continue_unknown (temporary ID; reconcile later)
```

### Session Actions

| Action | Method | Prerequisite |
|--------|--------|-------------|
| Create session | `createSession()` | — |
| Add manual entry | `addManualEntry()` | Session open |
| Upload document | `addDocument()` | Session open |
| Ingest OCR results | `ingestOcrResult()` | Document uploaded |
| Add EMS evidence | `addEMSEvidence()` | Session open |
| Run patient match | `match()` | At least one field present |
| Verify field | `verifyField()` | Session in `verifying` |
| Link to existing | `linkPatient()` | All critical fields reviewed |
| Create new patient | `createPatient()` | All critical fields reviewed |
| Register unknown | `continueUnknown()` | — |
| Reconcile unknown | `reconcileUnknown()` | Unknown session exists |
| Capture biometric consent | `captureBiometricConsent()` | Tenant biometrics enabled + patient consent |

---

## 8. Auto-Triage Triggers

When a patient is created from Smart Intake, the vertical slice (`src/data/smartIntakeVerticalSlice.ts`) evaluates vitals and complaint against clinical rules and flags the record automatically.

### Vital Sign Auto-Flags

| Parameter | Threshold | Flag Applied |
|-----------|-----------|-------------|
| Triage priority | P1 or P2 | `HighRisk` flag |
| Heart rate | < 50 or > 120 bpm | `ReassessmentNeeded` |
| Systolic BP | < 90 mmHg | `ReassessmentNeeded` |
| SpO2 | < 94% | `ReassessmentNeeded` |
| Temperature | > 38.5°C | `ReassessmentNeeded` |
| Pain score | ≥ 8/10 | `ReassessmentNeeded` |

### Journey Events Created at Intake Completion

| Event | Description |
|-------|-------------|
| `Arrival` | Patient added to the system |
| `EncounterCreated` | Encounter record established |
| `StateChange` | Arrival → Triage with priority assignment |
| `Triage` | Priority override recorded if staff overrode AI suggestion |

### Timeline Metadata Written

```typescript
{
  sessionId: string,                  // Smart Intake session ID
  source: 'smart-intake',
  arrivalReason: string,              // Chief complaint text
  complaintCategory: string,          // Categorised complaint
  queue: 'Triage',
  intakeSource: 'smart-intake',
  suggestedPriority: string,          // AI suggestion
  selectedPriority: string,           // Staff-confirmed priority
  confidence: number | null,          // AI confidence score
  ruleTriggered: string | null,       // Clinical rule if triggered
  override: boolean,                  // Staff override applied?
  reassessmentNeeded: boolean,
  verticalSlice: 'smart-intake-arrival-triage'
}
```

---

## 9. Self-Arrival Check-In

**File:** `src/pages/emergency/SelfArrivalCheckIn.tsx`  
**Component:** `src/components/reception/SelfCheckin.tsx`

### Patient-Facing Flow (4 steps)

| Step | Fields Collected | Notes |
|------|-----------------|-------|
| **1. Demographics** | firstName, lastName, dateOfBirth, sex, phone | Optional health record lookup triggered here |
| **2. Visit** | chiefComplaint (free text + common-reason chips) | Chips: chest pain, difficulty breathing, abdominal pain, and more |
| **3. Allergies** | Known allergies (quick-select chips + free text) | — |
| **4. Review** | Confirmation screen | Patient cannot self-assign acuity |

### AI Integration

| Feature | Function | Output |
|---------|----------|--------|
| Triage preview | `suggestSelfArrivalTriage()` | ESI label suggestion + care lane — for staff review only |
| Health record lookup | `lookupProvincialHealthRecord()` | Optional — fetches provincial health record with EXTERNAL_DATA_REVIEW_DISCLAIMER |

**Disclaimer shown to patient after submission:**
> "A nurse will review your information and call you for triage."

**Output type:** `SelfCheckinBuildResult` — contains patient record and triage preview for staff handoff.

---

## 10. Reception Desk Intake

**File:** `src/pages/emergency/ReceptionWorkspace.tsx`

### Intake Draft Data Structure (`ReceptionIntakeDraft`)

**Demographics:**
`firstName` · `lastName` · `dob` · `sex` · `estimatedAge`

**Arrival:**
`arrivalType` (`walk-in` · `EMS` · `referral` · `self-check-in` · `police` · `transfer`)

**Clinical observations:**
`chiefComplaint` · `consciousnessStatus` · `breathingStatus` · `visibleDistress` · `painLevel` (0–10)

**Red flag symptoms:**
`redFlagSymptoms[]` — auto-detected from complaint text (see below)

**Clinical data:**
`allergiesKnown` · `allergies[]` · `medicationsKnown` · `medications[]`

**Administrative:**
`contactCallback` · `insuranceStatus` · `consentStatus` · `documentStatus`

### Red Flag Detection

Reception AI (`runReceptionAiIntakeAssist()`) automatically flags the following high-risk symptom patterns from the chief complaint:

| Symptom | Action |
|---------|--------|
| Chest pain | Priority flag |
| Shortness of breath | Priority flag |
| Stroke symptoms | Priority flag |
| Syncope | Priority flag |
| Altered mental status | Priority flag |
| Severe abdominal pain | Priority flag |
| Severe bleeding | Priority flag |
| Sepsis concern | Priority flag |
| Anaphylaxis concern | Priority flag |
| Pregnancy emergency | Priority flag |

Detection generates an urgency suggestion for the reception clerk — the clerk still assigns queue destination.

### Queue Routing Logic

| Queue | Condition |
|-------|-----------|
| **EMS tab** | `arrivalMode = EMS` or `arrivalState = Arrival` |
| **Verification tab** | `registrationStatus = provisional` or `in-progress` or `IdentityPending` flag |
| **Pretriage tab** | `triagePending = true` or `state = Triage/Waiting` |

---

## 11. EMS Pre-Arrival AI

### Edge AI Ambulance

**Service ID:** `edgeAmbulance`  
**File:** `lib/ai/config.ts`

| Property | Value |
|----------|-------|
| Provider | Local (on-device) |
| Model | `edge-ambulance-vitals-v1` |
| Risk level | **High** |
| Regulatory category | Clinical Decision Support |
| Requires human review | ✅ Yes |
| Rate limit | 120 req/min |
| Status | Future |

**Vital alert thresholds (edge model):**

| Parameter | Threshold | Alert |
|-----------|-----------|-------|
| SpO2 | < 90% | Severe hypoxia |
| SpO2 | < 94% | Hypoxia |
| Systolic BP | < 90 mmHg | Hypotension |
| Ultrasound bleeding signal | ≥ 0.80 confidence | Internal haemorrhage flag |
| Fracture signal | ≥ 0.72 confidence | Skeletal injury flag |

**Safety constraints:**
- Pre-alert and stabilisation suggestions require human EMS review
- Image and vital models are deterministic demo support in current build

---

### Federated EMS Triage

**Service ID:** `federatedEmsTriage`  
**File:** `lib/ai/config.ts`

| Property | Value |
|----------|-------|
| Provider | Local (federated) |
| Model | `fed-ems-edge-v1` |
| Risk level | **High** |
| Requires human review | ✅ Yes (dispatcher or clinician) |
| Rate limit | 120 req/min |
| Status | Future |

**Safety constraints:**
- EMS recommendations require dispatcher or clinician confirmation before acting
- Federated model updates do not expose patient-level source data

### EMS Evidence Added to Smart Intake Session

```typescript
addEMSEvidence({
  emsUnitId?: string,        // e.g. "TPS Medic 501"
  temporaryId?: string,      // Assigned pre-arrival ID
  etaMinutes?: number,       // Estimated time of arrival
  chiefComplaint?: string,   // EMS-reported complaint
  riskFlags?: string[]       // e.g. ['STEMI', 'diaphoretic', 'BP 88/60']
})
```

### EMS Triage Confidence Thresholds

| Category | Confidence | ED Response |
|----------|-----------|-------------|
| Immediate | ≥ 0.78 | Activate trauma bay / resuscitation team |
| Emergency | ≥ 0.55 | Priority ED bed assignment |

---

## 12. API Reference

**Base path:** `/api/emergency/intake`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/sessions` | Create intake session |
| `POST` | `/:id/manual-entry` | Add staff-entered demographics |
| `POST` | `/:id/documents` | Upload identity/clinical document |
| `POST` | `/:id/ocr-results` | Ingest OCR extraction results |
| `POST` | `/:id/match` | Run patient duplicate matching |
| `POST` | `/:id/verify-field` | Record field verification decision |
| `POST` | `/:id/link-patient` | Link intake to existing patient record |
| `POST` | `/:id/create-patient` | Create new patient from verified snapshot |
| `POST` | `/:id/ems-evidence` | Attach EMS pre-arrival data |
| `GET` | `/:id/audit-log` | Retrieve full intake session audit trail |

---

## 13. Safety & Governance

### Disallowed Autonomous Actions (Hardcoded)

The Smart Intake AI **cannot** perform any of the following without human confirmation:

- Diagnose
- Prescribe or suggest medications
- Make triage acuity decisions
- Merge patient identity records
- Import external health records
- Make disposition decisions

### Required Disclaimers

| Disclaimer | Applied To |
|-----------|-----------|
| `HUMAN_REVIEW_DISCLAIMER` | All Smart Intake AI responses |
| `EXTERNAL_DATA_REVIEW_DISCLAIMER` | Any response using provincial/external health record data |

### Audit Trail

Every intake event is logged:

| Event | Logged Fields |
|-------|--------------|
| Session created | sessionId, actor, timestamp |
| Field added | field name, source, confidence, actor |
| OCR ingested | documentType, fieldCount, confidence range |
| Match run | candidateCount, topScore |
| Field verified | field, decision (approved/edited/rejected), oldValue, newValue, actor |
| Patient linked | existingPatientId, actor |
| Patient created | newPatientId, actor |
| Unknown registered | temporaryEncounterId, actor |
| Unknown reconciled | patientId, actor |
| Biometric consent | modality, purpose, retention, actor |

**Audit retention:** 2,555 days (7 years)

---

## 14. Data Model

### Patient Arrival Record

```typescript
interface PatientArrivalRecord {
  arrivalMode: 'walk-in' | 'EMS' | 'referral' | 'self-check-in' | 'police' | 'transfer';
  arrivalTimestamp: ISODateString;
  chiefComplaint: string;
  triageAcuity: TriageAcuity;           // CTAS 1–5
  waitingRoomStatus: WaitingRoomStatus;
  registrationStatus: 'pending' | 'in-progress' | 'complete' | 'provisional';
  queueDestination: QueueDestination;
  triagePending: boolean;
  firstContactAt?: ISODateString | null;
}
```

### Queue Destinations

```typescript
type QueueDestination =
  | 'triage-queue'
  | 'rapid-review'
  | 'waiting-room'
  | 'verification'
  | 'ems-registration'
  | 'whiteboard';
```

### Patient Created from Smart Intake

```typescript
{
  id: 'smart-intake-{timestamp}-{random}',
  mrn: string,                    // Health card number or MRN
  firstName: string,
  lastName: string,
  dob: string,                    // YYYY-MM-DD
  sex: 'Female' | 'Male' | 'Other' | 'Unspecified',
  age: number,
  complaintCategory: string,
  complaintText: string,
  vitals: {
    hr, bpSystolic, bpDiastolic,
    spo2, temp, rr, gcs, pain
  },
  source: 'Smart Intake',
  state: 'REGISTRATION',          // Initial journey state
  dpsScore: 4,                    // Default; updated by deterioration model
}
```

---

*Source files: `lib/ai/config.ts` · `lib/ai/promptRegistry.ts` · `lib/ai/toolRegistry.ts` · `src/pages/emergency/SmartIntake.tsx` · `src/pages/emergency/SelfArrivalCheckIn.tsx` · `src/components/reception/SelfCheckin.tsx` · `src/config/intakeArtifactRegistry.ts` · `src/services/intakeArtifactCapture.ts` · `backend/src/services/smart-intake.service.ts` · `src/data/smartIntakeVerticalSlice.ts` · `src/utils/patientDuplicateDetection.ts` · `src/types/emergency.ts` · `lib/ai/safetyPolicy.ts`*
