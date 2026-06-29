# Reception Clerk Manual

**Role ID:** `registration_clerk`  
**Landing page:** `/emergency/reception`  
**Mission:** Prepare every patient card before clinical teams take over.

---

## Role Purpose

The Reception Clerk is the first point of contact for every walk-in patient and the coordination point for EMS conversions. The clerk's job is to create a complete, accurate patient record — name, identity, chief complaint, red flags — and move the patient into the triage pipeline before clinical teams take over. The 3-minute clock starts the moment a high-risk patient arrives. The clerk's speed and accuracy directly determines how fast the clinical team can act.

---

## Dashboard View

At `/emergency/reception` you see three panels:

**Inbound EMS** (left panel) — All ambulance units currently en route. Shows unit ID, ETA, chief complaint, and pre-arrival acuity.

**Walk-in queue** (center panel) — All walk-ins awaiting registration.

**Verification queue** (right panel) — Patients registered and awaiting identity verification.

The **alert banner** at top shows critical flags from patients you have registered.

---

## Allowed Actions

- Register new walk-in patients
- Convert EMS units to registered patients
- Verify patient identity (ID, health card, next-of-kin)
- Search existing patient records to prevent duplicates
- Enter and update chief complaint and red flags
- Move patients from verification to pretriage queue

## Restricted Actions

- Cannot assign triage acuity (CTAS level) — that is the triage nurse's decision
- Cannot access clinical records beyond demographics and complaint
- Cannot acknowledge clinical alerts
- Cannot access Analytics or Settings

---

## Daily Workflow

### How to Start Your Shift

1. Log in — your landing page is Reception (`/emergency/reception`).
2. Review the **Inbound EMS** panel — note any high-acuity units en route.
3. Review the **Walk-in queue** — any patients from the previous shift not fully registered?
4. Review the **Verification queue** — any patients waiting for identity confirmation?
5. Check the alert banner — if a critical alert is showing, notify the triage nurse immediately.

### How to Register a Walk-In Patient

1. Click **Register walk-in** in the top-right of the reception workspace.
2. Search for existing record: enter name and DOB. If a record exists, click **Link to existing**.
3. If new patient: fill in all fields:
   - Legal name (or name as given — do not turn away patients who cannot provide full legal name)
   - Date of birth
   - Health card or MRN (if available — not required for emergency care)
   - Preferred language (flag for interpreter if needed)
4. Enter **Chief complaint** — what is the patient saying in their own words?
5. Select the structured complaint code from the complaint picker.
6. Check all **Red flag checkboxes** that apply:
   - ☐ Chest pain or pressure
   - ☐ Difficulty breathing or shortness of breath
   - ☐ Altered consciousness or confusion
   - ☐ Severe pain (8–10/10)
   - ☐ Uncontrolled bleeding
   - ☐ Neurological changes (facial droop, arm weakness, speech difficulty)
   - ☐ Pediatric distress (child under 12 with concerning presentation)
   - ☐ Sepsis risk (fever + altered vitals + suspected infection)
   - ☐ Trauma (fall, MVA, assault)
   - ☐ Obstetric concern (pregnancy with pain, bleeding, or distress)
7. Click **Save and send to verification queue**.
8. If **any red flag is checked**: notify the triage nurse verbally immediately after saving.

### How to Register a High-Risk Patient Fast

If the patient appears severely unwell:
1. Skip the full form — enter name, DOB, and chief complaint only.
2. Check all applicable red flags.
3. Click **Save and escalate** — creates the record AND sends an immediate critical alert to the triage nurse.
4. Call for the triage nurse verbally at the same time.
5. Complete the full registration record after the clinical team takes over.

### How to Convert an EMS Patient

1. In the **Inbound EMS** panel, find the arriving unit.
2. Click **Convert to patient** when the ambulance arrives.
3. Review the pre-arrival data from the paramedic: complaint, vitals, interventions.
4. Add or correct information based on the verbal handoff.
5. Complete the **Handoff checklist** (you and the paramedic both confirm it).
6. Click **Complete conversion**. Patient moves to the verification queue.

### How to Verify Identity

1. Open the **Verification queue**.
2. Click the patient's name.
3. Check government-issued ID, health card, or next-of-kin confirmation.
4. If confirmed: click **Identity verified**. Patient moves to pretriage automatically.
5. If ID cannot be confirmed:
   - Mark **Manual review — unable to verify** and document reason.
   - Patient still proceeds to triage — identity is never a barrier to emergency care.
   - Flag the record for follow-up with the patient registration office.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| EMS pre-arrival — critical | Critically ill patient inbound | Alert triage nurse immediately |
| Self-arrival flag | Kiosk check-in flagged high-risk complaint | Complete registration immediately |
| Verification overdue | Patient waiting >10 min for ID verification | Process now |
| Duplicate patient warning | System detected a possible duplicate record | Review both records, merge or confirm as separate |

---

## AI Features Available

- **Complaint classifier** — suggests a structured complaint code and highlights potential red flags as you type. Advisory only — your observation of the patient is the authority.
- **Duplicate patient detection** — flags possible duplicate records before you save.

You do NOT have access to AI Chief clinical intents (those require clinical role permissions).

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use your hospital's paper registration form.
2. Record: patient name, DOB, chief complaint, arrival time, and red flags on paper.
3. Verbally notify the triage nurse for all patients — especially high-risk.
4. After system recovery, back-enter all registrations in arrival order.

### If a patient is in crisis and the system is slow

1. Call for the triage nurse verbally immediately — do not wait for the system.
2. Ensure someone stays with the patient.
3. Complete the system registration after the patient is in clinical care.

---

## Troubleshooting

**Patient says they were here before but I can't find their record.**  
Search by name variations, maiden name, preferred name, DOB, and health card number. If still not found, create a new record and flag for patient registration office to merge later.

**The system won't let me save.**  
Required fields: name, DOB, chief complaint, arrival time. Everything else is optional.

**A patient refuses to give their name.**  
Register as "Unknown Patient" + arrival date/time. The ED cannot withhold emergency care for lack of identification. Notify your charge nurse.

**I accidentally sent a patient to the wrong queue.**  
Notify the triage nurse verbally. Open the patient record → click **Move to queue** to correct it.
