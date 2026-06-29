# Lab Technician Manual

**Role ID:** `lab_technician`  
**Landing page:** `/emergency/alerts`  
**Mission:** Deliver every critical lab value to the right clinician before it becomes a patient safety event.

---

## Role Purpose

The Lab Technician manages laboratory workflow in the context of the emergency department: tracking pending specimens, delivering critical values, acknowledging lab alerts, and escalating lab service bottlenecks. Your role in CareDroid is narrow but critical — when a critical value is generated, you are the first owner of the alert. The clinician cannot act until the value is delivered and acknowledged. Speed and accuracy of delivery is the primary performance measure.

---

## Dashboard View

**Alerts** (`/emergency/alerts`) — Filtered to lab-sourced alerts: critical values, specimen delays, lab service degradation.

**Help** (`/emergency/help`) — Lab-specific procedures and fallback workflows.

You have read access to patient demographic information (name, MRN, room) for the purpose of delivering critical values. You do not have access to full clinical records.

---

## Allowed Actions

- View lab-related alerts (critical values, specimen delays)
- Acknowledge lab-specific alerts after delivery
- Escalate lab alerts when the clinical owner cannot be reached
- View patient name, MRN, and location for critical value delivery
- Document critical value delivery (who you called, when, what you said)

## Restricted Actions

- Cannot edit patient clinical records
- Cannot modify triage, acuity, or clinical orders
- Cannot access full patient clinical history
- Cannot access analytics or system settings

---

## Daily Workflow

### How to Start Your Shift

1. Log in — your landing page is the Alerts page filtered to lab alerts.
2. Review any open critical value alerts from the previous shift.
3. Confirm your lab-to-ED communication channel is active (phone, in-app alert, pager backup).

### How to Deliver a Critical Value

Critical lab values require immediate notification. CareDroid generates an alert and assigns it to you as the primary owner.

1. The critical value alert appears in the Alerts page.
2. Open the alert. Review: patient name, room/zone, ordering clinician, test name, critical value, reference range.
3. Contact the ordering clinician immediately by phone. Do not wait for in-app response for critical values.
4. Deliver the critical value: "This is [your name] from the lab. I have a critical value for your patient [patient name, MRN]. [Test name]: [result value], which is critically [high/low]. Reference range is [range]."
5. Ask the clinician to confirm they received the value: "Can you repeat that back to me?"
6. In CareDroid, click **Acknowledge critical value**.
7. Document: "Critical value delivered at [time]. Spoken with [clinician name, role]. Value confirmed by read-back." Click **Save delivery record**.
8. The alert status updates to "Delivered and acknowledged."

### How to Escalate When the Clinician Cannot Be Reached

If you cannot reach the ordering clinician within 5 minutes:
1. Try the nurse assigned to the patient.
2. Try the charge nurse.
3. Try the attending physician by overhead page.
4. In CareDroid, click **Escalate** on the critical value alert. This notifies the charge nurse through the system as well.
5. Document every contact attempt with time and result: "Called Dr. [name] at [time] — no answer. Called charge nurse at [time] — in procedure. Paged attending at [time] — awaiting callback."

### How to Handle a Specimen Delay Alert

1. Open the specimen delay alert.
2. Review: patient name, test ordered, time ordered, expected turnaround time, current delay.
3. Identify the reason for the delay (specimen not received, processing issue, reagent issue, analyzer down).
4. If you can resolve: take action and click **Delay resolved — reason** in the alert.
5. If the delay is due to equipment failure: click **Escalate — service bottleneck**. Notify the lab supervisor. The IT Admin is notified through the bottleneck registry automatically.
6. Notify the ordering clinician of the delay and expected resolution time.
7. Document: delay reason, notification sent to clinician, expected resolution time.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Critical lab value | A result has come back in the critical range | Deliver immediately, document, acknowledge |
| Specimen delay | A specimen's turnaround time has exceeded threshold | Investigate, notify clinician, escalate if equipment issue |
| Lab service degradation | The lab integration or analyzer is down | Notify IT Admin; activate manual lab process |
| Unacknowledged critical value | A critical value alert has not been acknowledged within 10 minutes | Escalate to clinician and charge nurse |

---

## AI Features Available

- `fallback_recommendation` — Provides manual critical value delivery steps when CareDroid is unavailable.

---

## Fallback Procedures

### If CareDroid is unavailable

1. Phone critical values directly to the ordering clinician per your hospital's critical value policy.
2. Document the phone call in your lab information system (LIS) or on paper.
3. Follow the 2-attempt contact protocol and escalate to charge nurse if unreachable.
4. After CareDroid recovery, document the delivery in the patient record.

---

## Troubleshooting

**I can't find the patient's room to deliver a critical value.** Open the alert — patient location is shown. If the patient was moved, call the ED desk to confirm current location.

**The clinician is not responding after two attempts.** Escalate to the charge nurse using CareDroid Escalate or by phone immediately. A critical value with no clinician response is a patient safety event.

**A critical value is showing but I already called about it.** Check the alert status — if it shows "Delivered and acknowledged," it was already processed. If it is still open, confirm your earlier delivery was documented and click Acknowledge with your delivery note.

**The analyzer is down and tests are backed up.** Alert your supervisor and click **Escalate — service bottleneck** in CareDroid. This triggers the IT Admin notification and the bottleneck registry alert.
