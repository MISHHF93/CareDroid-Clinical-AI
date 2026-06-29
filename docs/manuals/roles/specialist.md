# Specialist Manual

**Role ID:** `specialist`  
**Landing page:** `/emergency/patients`  
**Mission:** Review the consult request thoroughly, document a clear recommendation, and close the handoff loop.

---

## Role Purpose

The Specialist receives consult requests from the emergency department, reviews the patient's clinical context, provides a specialist recommendation, and confirms the handoff loop is closed. You work from the referrals queue and the patient detail panel. Your recommendation feeds the ED physician's disposition decision. AI provides a case summary and evidence context — you own the specialist recommendation.

---

## Dashboard View

**Patients** (`/emergency/patients`) — Filtered to show your consult patients and patients within your specialty scope.

**Referrals** (`/emergency/referrals`) — Your active consult queue. Incoming consult requests appear here with patient, reason, urgency, and requesting physician.

**Alerts** — Alerts for consult requests assigned to your specialty. Urgent consult alerts appear in the banner.

**AI Chief** (Copilot panel) — Patient summary, handoff summary, evidence context for your consult.

**Tools** (`/emergency/tools`) — Clinical calculators, guideline RAG, drug interaction checker, and specialty assistant tools.

---

## Allowed Actions

- Review consult request patients (clinical read access)
- Add specialist recommendations and notes
- Accept or decline consult requests (with documented reason)
- Acknowledge alerts assigned to your specialty
- Request AI Chief: `patient_summary`, `handoff_summary`
- Access clinical tools and calculators
- Send handoff confirmation to the requesting physician

## Restricted Actions

- Cannot register patients or modify ED workflow
- Cannot assign ED staff
- Cannot modify ED settings
- Cannot perform ED triage or acuity assignment

---

## Daily Workflow

### How to Start Your Shift

1. Log in — your landing page is Patients.
2. Open **Referrals** (`/emergency/referrals`). Review all incoming consult requests.
3. Sort by urgency. Urgent consults (CTAS 1–2 patients) must be reviewed first.
4. Check the alert banner — any urgent specialty alerts?
5. For active inpatient consults you are already managing, check their patient status on the Patients list.

### How to Accept and Respond to a Consult Request

1. Open **Referrals** (`/emergency/referrals`).
2. Click the consult request to open the referral detail panel.
3. Review the request: patient name, CTAS, chief complaint, ED physician requesting, reason for consult, urgency, and supporting data (labs, imaging, vitals).
4. Open the **patient detail panel** to review full patient context.
5. Click **AI Chief → patient_summary** to get a one-line AI summary with risk flags. Review it — do not depend on it.
6. Perform your clinical assessment (bedside or review-based per your scope).
7. Document your **specialist recommendation** in the Referrals panel:
   - Clinical assessment findings
   - Recommended next steps
   - Orders you are placing (via your own system) or requesting
   - Disposition recommendation (admit to your service, consult done and return to ED, follow-up in clinic)
   - Timeframe for next specialty review
8. Click **Send recommendation**. The requesting ED physician receives your recommendation as an in-app notification.
9. Click **Accept consult** to formally take ownership of the specialty component. This closes the ED referral loop.

### How to Decline a Consult Request

If a consult is outside your specialty or scope:
1. Open the consult request.
2. Click **Decline consult**.
3. Enter the decline reason: "Outside my specialty — recommend [specialty name]." Or: "Insufficient information — please provide [specific data]."
4. Click **Send decline with reason**. The requesting ED physician is notified and can redirect the consult.

### How to Generate a Handoff Summary

When your consult is complete and the patient is moving:
1. Open the patient detail panel.
2. Click **AI Chief → handoff_summary**.
3. Review the generated handoff document. Add:
   - Any information the AI missed
   - Specialist orders placed
   - Follow-up instructions
4. Select the receiving provider.
5. Click **Send handoff**. The receiving provider gets the document.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Urgent consult request | ED has requested urgent specialty review | Review immediately — CTAS 1–2 patient |
| Consult overdue response | Your consult has not been responded to within SLA | Respond or escalate to your colleague |
| Delayed referral | A referral to your service has been waiting beyond expected time | Review and prioritize |
| Critical lab value — consult patient | A critical lab result on your consult patient | Review immediately and notify ED physician |

---

## AI Features Available

| Intent | What it gives you |
|--------|------------------|
| `patient_summary` | One-line clinical summary, risk flags, missing information |
| `handoff_summary` | Structured handoff document for specialty-to-next-provider |

All AI output is advisory. Your specialist recommendation is a licensed clinical decision.

---

## Fallback Procedures

### If CareDroid is unavailable

1. Contact the requesting ED physician directly by phone.
2. Perform your consult per your hospital's standard procedure.
3. Document your recommendation in the hospital's paper or EHR system.
4. After CareDroid recovery, add your consult note to the patient record.

### If the consult is urgent and you cannot respond in time

1. Contact your specialty backup or colleague directly.
2. Notify the requesting ED physician that you are arranging coverage.
3. Document the coverage arrangement.

---

## Troubleshooting

**I received a consult for a patient outside my specialty.** Decline with a clear redirect note: "This consult is best addressed by [specialty]. Recommending re-route." This ensures the ED physician can act without delay.

**The patient summary AI is missing key clinical information.** Use the full patient detail panel and your own clinical review. AI summary is not a substitute for reading the patient's chart.

**The referring ED physician is not responding to my recommendation.** Send a follow-up alert via the Referrals panel and call them directly. Document the follow-up attempt.

**I placed orders in my own system but they're not showing in CareDroid.** CareDroid does not automatically pull orders from external EHR systems. Document your orders and recommendations in the CareDroid consult note so the ED team sees them.
