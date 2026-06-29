# Triage Nurse Manual

**Role ID:** `triage_nurse`  
**Landing page:** `/emergency/reception` (pretriage queue)  
**Mission:** Assign the correct acuity, start the right timers, and get every patient moving to the right care pathway.

---

## Role Purpose

The Triage Nurse is the clinical gatekeeper of the emergency department. You receive patients from the reception pretriage queue, assess them clinically, assign a CTAS acuity level, record vitals, capture complaint detail, and route each patient to the appropriate care pathway. Your CTAS assignment is the most consequential clinical decision in the first minutes of every patient's ED visit — it drives reassessment timers, alert routing, and escalation chains. AI provides a triage suggestion. You own the CTAS assignment.

---

## Dashboard View

**Pretriage queue** — All patients awaiting your triage assessment, sorted by wait time. Red border = wait time exceeded.

**Vitals entry panel** (opens on patient click) — Structured vitals form: BP, HR, RR, SpO₂, temperature, GCS, pain score, blood glucose if indicated.

**Complaint and history panel** — Chief complaint and red flags from reception, history of present illness, relevant medical history.

**AI triage suggestion** (sidebar) — Advisory CTAS recommendation from the AI Chief based on vitals and complaint. Advisory only — you own the decision.

You also have access to **Whiteboard** and **Reassessment** in the sidebar for monitoring your patients after triage.

---

## Allowed Actions

- Record vitals, complaint, history, and red flags
- Assign CTAS acuity (1–5) — your licensed decision
- Override AI triage suggestion with documented reason
- Route patient to waiting room, treatment room, fast track, or resuscitation bay
- Start and reset reassessment timers
- Acknowledge alerts assigned to triage nurse role
- Escalate alerts you cannot resolve
- Request AI Chief `triage_recommendation` for decision support

## Restricted Actions

- Cannot register or create new patient records (reception clerk's role)
- Cannot discharge patients
- Cannot order labs, imaging, or medications
- Cannot configure system settings

---

## Daily Workflow

### How to Start Your Shift

1. Log in — landing page is Reception pretriage.
2. Review the pretriage queue. Note patients who have been waiting. Red borders = overdue.
3. Check the alert banner for any critical alerts.
4. Review the Whiteboard briefly — how many rooms are available? How many patients in the waiting room? This informs routing decisions.
5. Begin triaging in order of arrival unless a patient appears immediately unstable.

### How to Triage a Patient (Standard)

1. Call the patient from the pretriage queue. Open their record.
2. Enter vitals into the vitals entry panel:
   - Blood pressure (systolic/diastolic)
   - Heart rate
   - Respiratory rate
   - SpO₂ (oxygen saturation)
   - Temperature
   - Pain score (0–10, confirmed verbally with patient)
   - GCS if any alteration in mental status
   - Blood glucose if diabetic or altered consciousness
3. Expand the complaint from reception with clinical detail:
   - Onset, duration, character, radiation, associated symptoms
   - Relevant history: cardiac, respiratory, diabetes, medications, allergies, pregnancy status
4. Update and confirm all red flag checkboxes.
5. Review the AI triage suggestion. Consider it — do not depend on it.
6. Select CTAS level based on your clinical assessment:
   - CTAS 1: Resuscitation — immediate life threat
   - CTAS 2: Emergent — high risk, see within 15 min
   - CTAS 3: Urgent — potentially serious, see within 30 min
   - CTAS 4: Less Urgent — see within 60 min
   - CTAS 5: Non-Urgent — see within 120 min
7. Select patient destination: waiting room, fast track, treatment room, or resuscitation bay.
8. Click **Complete triage**. Reassessment timer starts automatically.
9. Patient moves to the Whiteboard in the assigned zone.

### How to Triage a CTAS 1 Patient

If the patient is in immediate danger:
1. Call for help immediately.
2. Activate overhead or call button for attending physician and charge nurse.
3. Enter vitals rapidly — get what you can.
4. Click **CTAS 1 — Resuscitation**. Do not delay documentation.
5. Direct the patient to the resuscitation bay.
6. The system generates an immediate critical alert to the attending physician and charge nurse.
7. Complete full triage documentation while the clinical team takes over.

### How to Override an AI Triage Recommendation

1. Review the AI suggestion in the triage sidebar.
2. If your clinical assessment differs, select your CTAS level.
3. Enter an override reason (required):
   - Example: "Patient appears more distressed than vitals suggest. Diaphoretic and clutching chest. Upgrading to CTAS 2."
4. Click **Complete triage with override**. Your name, role, timestamp, AI suggestion, your selection, and reason are all logged.

### How to Manage Reassessments

1. Open **Reassess** (`/emergency/reassessment`).
2. Patients listed by reassessment due time. Red = overdue.
3. Click a patient, record new vitals, document any clinical change.
4. Update CTAS if the patient's condition has changed (notify physician for upgrades to CTAS 1–2).
5. Click **Complete reassessment**. Timer resets for the next interval.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Reassessment overdue | A patient has passed their reassessment timer | Reassess immediately |
| High-risk complaint from reception | Clerk registered a patient with red flags | Review and expedite triage |
| 3-minute escalation | Critical patient unacknowledged at 2 minutes | Acknowledge and route immediately |
| AI triage confidence low | AI cannot make a confident suggestion | Your assessment is the sole clinical basis |

---

## AI Features Available

| Feature | Access | What it gives you |
|---------|--------|------------------|
| `triage_recommendation` | Auto-shown in triage sidebar when vitals are entered | Advisory CTAS level with reasoning |
| Complaint red flag detection | Active as you type complaint text | Highlights high-risk patterns in real time |

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use your hospital's paper triage form.
2. Record: patient name, arrival time, vitals, CTAS level, destination, reassessment due time.
3. Notify charge nurse verbally for all CTAS 1–2 patients.
4. After recovery, back-enter all triage assessments in order.

### If vitals monitor is unavailable

1. Assess vitals manually (manual BP, palpated pulse, visual RR).
2. Document as "Manual — monitor unavailable" in vitals notes.
3. Repeat vitals as soon as equipment is available.

---

## Troubleshooting

**I assigned the wrong CTAS level.** Open patient record → Triage tab → **Correct triage**. Enter corrected CTAS and reason. Corrections are logged separately from overrides.

**A patient's vitals changed significantly.** Open **Reassess**, perform full reassessment, update CTAS. If upgrading to CTAS 1–2, notify charge nurse and attending physician immediately.

**AI shows a different CTAS than my assessment.** Your clinical assessment is the authority. Select your CTAS, enter your reason, proceed. Do not be pressured by AI output.

**Patient refuses vitals.** Document "Patient declined vitals" in vitals notes. Proceed with your clinical observation. Do not delay triage for vitals refusal.
