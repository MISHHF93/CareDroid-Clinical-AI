# Emergency Physician Manual

> **Related:** [`docs/users/physician-guide.md`](../../users/physician-guide.md) covers this and related physician roles (`attending_physician`, `resident_physician`) in a shorter guide format. Flagged as overlapping documentation in the [Documentation Center](../../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Role ID:** `emergency_physician`  
**Landing page:** `/emergency/whiteboard`  
**Mission:** Every patient gets a timely, safe clinical decision. AI supports you — you own every order, every diagnosis, every disposition.

---

## Role Purpose

The Emergency Physician is the clinical authority in the emergency department. You diagnose, treat, order, document, dispose, and review AI Chief recommendations with override authority. Every AI recommendation made in CareDroid requires review by a licensed physician before it can be acted on. The 3-minute response loop culminates with your acknowledgement for CTAS 1–2 patients. Your AI override decisions feed the quality review cycle. The clinical record is yours to own.

---

## Dashboard View

**Whiteboard** (`/emergency/whiteboard`) — Your primary workspace. All patients in the department, filtered to show your assigned patients prominently. CTAS 1–2 patients with active alerts are at the top.

**Patients** (`/emergency/patients`) — Full patient list with detailed clinical panels. Use this for focused patient review.

**Referrals** (`/emergency/referrals`) — Your open consult requests to specialists and incoming specialist responses.

**Alerts** (`/emergency/alerts`) — All clinical alerts within your department scope. Critical alerts you are assigned to are highlighted.

**AI Chief** (Copilot panel) — Full access to all 11 AI Chief intents. Opens via the Copilot button or pressing C.

**Tools** (`/emergency/tools`) — Clinical calculators, guideline RAG, differential AI, order set AI, lab interpreter, procedure guides, ambient scribe, and specialty assistants.

**Documentation** (`/emergency/documentation`) — Clinical documentation AI assistant for notes, discharge summaries, and referral letters.

---

## Allowed Actions

- Full access to clinical patient records: view, update, document
- Prescribe, order, and disposition (via your hospital's EHR — CareDroid supports the workflow)
- Acknowledge, escalate, and resolve any clinical alert
- Override AI recommendations with documented reason
- Assign acuity (CTAS upgrade or downgrade)
- Request and review all 11 AI Chief intents
- Discharge, admit, or transfer patients
- Send specialist consult requests and receive responses
- Access all clinical tools and documentation assistants

## Restricted Actions

- Cannot configure system settings (IT Admin's role unless also serving as admin)
- Clinical decisions using AI must document the AI review before acting

---

## Daily Workflow

### How to Start Your Shift

1. Log in — your landing page is the Whiteboard.
2. Review the **Shift handoff** document from the outgoing physician (`/emergency/shift`).
3. Walk the Whiteboard:
   - CTAS 1–2 patients: who are they? Who is assigned? Are they progressing?
   - Unacknowledged critical alerts?
   - Patients overdue for physician assessment by CTAS target time?
4. Introduce yourself to the charge nurse and nursing staff.
5. Confirm your assigned patients and which rooms you own.
6. Start with CTAS 1–2 patients immediately if the incoming shift has not cleared them.

### How to Assess a Patient

1. Open the patient card on the Whiteboard or navigate to **Patients** → click the patient.
2. Review the patient detail panel:
   - Chief complaint, red flags, CTAS level
   - Vitals trend (current and previous assessments)
   - Triage nurse notes
   - Pending labs, imaging, medications
   - AI Chief summary (if generated)
3. Perform your bedside assessment.
4. Return to the patient panel and update the **Status** field.
5. Add a clinical note: "Time [hh:mm] — Assessment: [findings]. Plan: [orders]. Disposition: [current intent]."
6. Enter orders in your hospital's EHR system. Document that orders were placed in CareDroid's clinical note.

### How to Use the AI Chief

1. Open the **Copilot panel** (sidebar Copilot button or press C).
2. Select an intent from the intent selector. Recommended intents for physicians:

| Intent | When to use |
|--------|------------|
| `patient_summary` | Get a quick AI-generated summary of the patient's full history and risk |
| `triage_recommendation` | Confirm or challenge the triage acuity assignment |
| `critical_alert_assessment` | Get AI analysis of a specific critical alert |
| `three_minute_response_plan` | For a complex CTAS 1–2 patient — AI generates a full 3-minute response plan |
| `department_routing` | Complex disposition — where should this patient go? |
| `staff_routing` | Who is the right physician or specialist for this patient? |
| `handoff_summary` | Generate a structured handoff when transferring a patient |
| `hospital_command_insight` | Department-level situational awareness during a surge |
| `fallback_recommendation` | AI unavailable — what are the manual clinical procedures? |

3. Review the AI response:
   - **Recommendation** — the specific action suggested
   - **Rationale** — why the AI is suggesting this
   - **Uncertainty** — what the AI does not know
   - **Required reviewer** — which licensed role must review before acting
   - **Suggested owner** — who the AI recommends should own this
   - **Fallback** — what to do if AI is wrong or unavailable
4. Accept, modify, or override. Document before acting on any clinical recommendation.

### How to Override an AI Recommendation

1. Review the AI recommendation fully.
2. Click **Override**.
3. Enter your clinical reason: what does your assessment show that the AI missed or got wrong?
   - Example: "AI recommends CTAS 3. Patient appeared well on intake vitals but is now diaphoretic with guarding. Upgrading to CTAS 2."
4. Click **Confirm override**.
5. Take your clinical action.
6. The override is logged: your role, timestamp, AI intent, AI recommendation, override reason, and action.

### How to Respond to a 3-Minute Critical Alert

For CTAS 1–2 patients or any critical alert escalated to you:
1. Open the alert immediately (do not let it sit).
2. Review: patient, severity, complaint, timer, prior escalation chain.
3. Click **Take ownership** and **Acknowledge**.
4. Enter your action statement: "Assessing patient in Room 4. Activating CTAS 1 protocol."
5. Go to the patient immediately.
6. Update the patient record with your assessment after stabilization.

### How to Discharge a Patient

1. Complete your clinical assessment and documentation.
2. Open the patient card → click **Disposition**.
3. Select disposition: Discharge, Admit, or Transfer.
4. For discharge:
   - Enter discharge diagnosis.
   - Enter discharge instructions (or use the Documentation AI assistant for this).
   - Confirm follow-up plan.
   - Click **Complete discharge**.
5. Notify the nurse to complete the physical discharge process.
6. The patient record is closed and archived with full clinical documentation.

### How to Send a Specialist Consult

1. Open the patient detail panel → **Referrals** tab.
2. Click **New consult request**.
3. Select specialty, urgency (routine vs. urgent), and requesting reason.
4. The AI Chief can generate a `patient_summary` to include in the consult request — review it before attaching.
5. Click **Send consult**. The specialist receives an in-app notification.
6. Track the consult in **Referrals** (`/emergency/referrals`).

### How to Document with the AI Assistant

1. Open **Documentation** (`/emergency/documentation`).
2. Select document type: Clinical note, Discharge summary, Referral letter, Procedure note.
3. Enter your dictation or use the **Ambient Scribe** (Tools → Ambient Scribe) to transcribe your dictation.
4. Review the AI-generated draft. Modify any clinical detail that is inaccurate.
5. Sign the note when you are satisfied it accurately reflects your clinical assessment.
6. Click **Save to record**.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Critical alert — CTAS 1 | A patient requires immediate physician | Go now. Acknowledge within 3 minutes. |
| Critical alert — CTAS 2 escalation | CTAS 2 patient has exceeded time-to-physician target | Assess now |
| Specialist consult response | A specialist has returned their recommendation | Review and integrate into your plan |
| AI override pending review | An AI override was made without physician review | Review the override record |
| Diagnostic risk flag | A vital pattern or lab result flags a diagnostic risk | Review the patient |
| Reassessment breach — assigned patient | Your assigned patient has passed their reassessment timer | Review the patient |

---

## AI Features Available

Full access to all 11 AI Chief intents. See the intent table above. All AI recommendations require your clinical review and documented decision before any clinical action is taken.

---

## Fallback Procedures

### If AI Chief is unavailable

1. Continue with your standard clinical workflow.
2. AI is decision support — your clinical judgment is the primary driver.
3. Use the **Help** page → Fallback procedures for any workflow.
4. After AI recovery, you can re-run intents if still clinically relevant.

### If the system is fully unavailable

1. Continue clinical care without CareDroid.
2. Document on paper with time stamps.
3. Notify the charge nurse and patient flow coordinator.
4. Use phone, pager, and radio for all communications.
5. After recovery, back-enter all clinical notes, orders, and decisions.

---

## Troubleshooting

**I need to upgrade a patient's acuity from CTAS 3 to CTAS 2.** Open the patient record → Triage tab → **Correct triage** → select new CTAS level → enter clinical reason → save. The upgrade generates an alert to the charge nurse and updates the reassessment timer.

**The AI gave a recommendation I strongly disagree with.** Override it with your clinical reason. The override is logged but does not impede your workflow. If you find the AI is consistently wrong for a specific type of patient, report it to your IT Admin or Quality Officer — AI override patterns are reviewed.

**I sent a consult and the specialist hasn't responded in 30 minutes.** Open **Referrals** → click the consult → **Send reminder**. This sends an additional in-app notification. If still no response, call the specialist directly and document your call.

**A patient is requesting to leave against medical advice (AMA).** Follow your hospital's AMA protocol. Document the conversation and the patient's informed decision in CareDroid. Click **Disposition → AMA** and complete the AMA documentation. The patient record is closed with the AMA notation.
