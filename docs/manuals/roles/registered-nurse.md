# Registered Nurse Manual

**Role ID:** `registered_nurse`  
**Landing page:** `/emergency/whiteboard`  
**Mission:** Keep every assigned patient safe, documented, and progressing through the care pathway.

---

## Role Purpose

The Registered Nurse manages assigned patients through their emergency department stay. You update patient status, perform scheduled and triggered reassessments, document clinical findings, acknowledge alerts for your assigned patients, and escalate deterioration to the charge nurse and physician. You are the continuous clinical presence at the bedside — the system surfaces the right patients and the right timers to you.

---

## Dashboard View

**Whiteboard** (filtered to your assigned patients) — Shows only your assigned patients with CTAS level, wait time, room, alerts, and reassessment timers.

**Patients** (`/emergency/patients`) — Full searchable patient list for your department. Use it to find a patient that hasn't been assigned to you but you are covering.

**Reassessment** (`/emergency/reassessment`) — Reassessment board showing all overdue and upcoming reassessments for your assigned patients.

**Alerts** (filtered to your scope) — Alerts for your assigned patients only.

---

## Allowed Actions

- Update assigned patient status and documentation
- Record vitals and clinical observations
- Complete scheduled and triggered reassessments
- Acknowledge alerts for your assigned patients
- Escalate alerts to charge nurse or physician
- Request AI Chief `patient_summary` for decision support
- Document clinical notes and follow-up actions

## Restricted Actions

- Cannot assign or change CTAS acuity (triage nurse and physician can do this)
- Cannot discharge patients
- Cannot assign staff to other patients
- Cannot access Analytics or Settings
- Cannot override AI recommendations (physician or charge nurse can)

---

## Daily Workflow

### How to Start Your Shift

1. Log in — your landing page is the Whiteboard filtered to your assigned patients.
2. Review your assigned patient list. Note:
   - Which patients are CTAS 1–2? Prioritize these.
   - Are any reassessments overdue from the incoming shift?
   - Are any alerts open for your patients?
3. Review the shift handoff document from the previous nurse for each of your patients.
4. Go to each patient bedside and perform a quick visual assessment.

### How to Update a Patient Record

1. Click the patient's name on the Whiteboard.
2. The patient detail panel opens on the right.
3. Navigate to the relevant section: **Status**, **Vitals**, **Notes**, **Alerts**, **Reassessment**.
4. Update the relevant field.
5. For status updates: select the new status (e.g., "Awaiting physician assessment", "Labs pending", "Imaging ordered").
6. Add a clinical note if anything significant has changed.
7. Click **Save**. The update is timestamped and logged.

### How to Complete a Reassessment

1. Open **Reassess** (`/emergency/reassessment`) or click the reassessment badge on the patient card.
2. Review the time since last assessment and the patient's current status.
3. Go to the bedside or review current vitals.
4. Enter updated vitals into the reassessment panel.
5. Document clinical changes: "Patient reports pain improved from 8/10 to 5/10. Vitals stable. Alert and oriented."
6. If the patient has deteriorated:
   - Upgrade CTAS if warranted (requires physician notification for upgrade to CTAS 1–2)
   - Flag the patient for immediate physician review
   - Click **Escalate** if the physician is not immediately available
7. Click **Complete reassessment**. Timer resets for the next interval.

### How to Escalate a Deteriorating Patient

If your patient's condition is worsening:
1. Assess the severity: is this urgent or emergent?
2. For urgent: click **Escalate** on the patient card. Notify the charge nurse and physician via the alert.
3. For emergent: activate the overhead page or call button. Notify the charge nurse and physician verbally. Then document in CareDroid.
4. Stay with the patient. Do not leave a deteriorating patient to document — call for backup.
5. After the immediate situation is stabilized, document: what happened, what time, who was notified, what they said.

### How to Document a Clinical Note

1. Open the patient detail panel.
2. Click the **Notes** tab.
3. Click **Add note**.
4. Select note type: Clinical observation, Reassessment, Medication note, Family communication, or Other.
5. Type your note. Use structured language: "Time [hh:mm] — Finding — Action — Response."
6. Click **Save note**. The note is timestamped and attached to your name and role.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Reassessment overdue — your patient | Your patient has passed their reassessment timer | Complete reassessment immediately |
| Patient deterioration flag | Vital pattern or triage upgrade has been flagged | Review patient immediately; escalate if needed |
| Lab critical value | A critical lab result has returned for your patient | Notify physician immediately |
| Medication alert | A potential medication issue has been flagged | Do not administer. Notify pharmacist and physician. |
| Handoff received | Another nurse or physician has sent you a handoff | Review and accept the handoff |

---

## AI Features Available

| Intent | Access | What it gives you |
|--------|--------|------------------|
| `patient_summary` | Patient detail panel → AI Chief tab | One-line clinical summary with risk flags and missing information |
| `fallback_recommendation` | Help page or patient panel when other AI is unavailable | Manual procedure steps for the current workflow |

You do NOT have authority to override AI recommendations — that requires physician or charge nurse.

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use bedside assessment directly.
2. Notify charge nurse verbally of all patient updates, reassessments, and escalations.
3. Document on paper with time, patient name, and your initials.
4. After recovery, back-enter all events in the patient record.

### If you need to escalate and the charge nurse is unavailable

1. Escalate directly to the attending physician.
2. Use the overhead page or call button for urgent/emergent situations.
3. Document in the patient record who you notified, when, and what they said.

---

## Troubleshooting

**A patient was assigned to me but I can't find them on my board.** Open **Patients** (`/emergency/patients`) and search by name or MRN. They may be in a different zone.

**I need to complete a reassessment but the patient was moved to radiology.** Document: "Patient in radiology — reassessment pending. Notified [technician name]." Complete the reassessment when the patient returns.

**A patient has a medication alert but I'm not sure what it means.** Do NOT administer the medication. Contact the pharmacist directly. Document the hold and the reason.

**I am covering a patient that isn't assigned to me.** Any nurse can view and update any patient in the department. Open the patient record from **Patients** and document your assessment. Notify the charge nurse that you covered this patient.
