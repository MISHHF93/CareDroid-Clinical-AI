# Radiology Technician Manual

**Role ID:** `radiology_technician`  
**Landing page:** `/emergency/alerts`  
**Mission:** Deliver every urgent image on time. Notify the clinical team of imaging availability and delays.

---

## Role Purpose

The Radiology Technician manages imaging readiness, imaging workflow alerts, and turnaround time tracking within the ED context. CareDroid surfaces imaging alerts to you: urgent imaging requests, imaging delays, and modality downtime. Your role is to confirm readiness, prioritize urgent cases, coordinate patient transport, and escalate delays before they become patient safety events.

---

## Dashboard View

**Alerts** (`/emergency/alerts`) — Filtered to radiology alerts: urgent imaging requests, imaging delays, PACS/modality issues.

**Help** (`/emergency/help`) — Radiology workflow procedures and fallback steps.

You have read access to patient name, MRN, and location for coordination purposes.

---

## Allowed Actions

- View imaging workflow alerts
- Acknowledge imaging alerts after completing the action
- Escalate imaging delays to the ordering clinician and charge nurse
- Document imaging completion and delay reasons
- Coordinate patient transport to imaging and back

## Restricted Actions

- Cannot modify patient clinical records
- Cannot write radiology reports (that is the radiologist's role)
- Cannot modify ED triage, acuity, or clinical orders
- Cannot access full analytics or system settings

---

## Daily Workflow

### How to Start Your Shift

1. Log in — your landing page is the Alerts page filtered to radiology alerts.
2. Review any open imaging requests from the previous shift.
3. Confirm equipment status: all modalities operational? PACS accessible?
4. Alert IT Admin if any equipment is down.

### How to Handle an Urgent Imaging Request

1. The imaging request alert appears in the Alerts page.
2. Open the alert. Review: patient name, MRN, room, imaging type, ordering physician, clinical priority (STAT vs. routine).
3. For STAT requests: begin immediately. Coordinate with the ED nurse to prepare the patient.
4. Confirm modality readiness (no other exam in progress, equipment operational).
5. Arrange or confirm patient transport to the imaging suite.
6. Perform the exam.
7. Notify the ordering physician or reading radiologist that the exam is complete: "Imaging complete for [patient name, MRN]. Images are available in PACS."
8. In CareDroid, click **Acknowledge** on the imaging alert and document: "Exam completed at [time]. Images sent to PACS. Radiologist [name] notified."

### How to Report an Imaging Delay

If an imaging exam cannot be completed on time:
1. Identify the reason: patient not transport-ready, equipment issue, room occupied.
2. Notify the ordering physician directly: "Imaging for [patient name] will be delayed by approximately [time] due to [reason]."
3. In CareDroid, open the alert → **Document delay**:
   - Delay reason
   - Expected completion time
   - Clinician notified
4. If the delay is due to equipment failure: click **Escalate — service bottleneck**. Notify your supervisor and IT Admin.
5. Click **Save delay record**.

### How to Handle Modality Downtime

If a modality (CT, X-ray, MRI, ultrasound) is unavailable:
1. Notify your supervisor and IT Admin immediately.
2. In CareDroid, click **Report equipment downtime** in the Alerts page.
3. Review all pending imaging requests for the affected modality.
4. Contact the ordering physicians for each affected patient:
   - "CT scanner is temporarily unavailable. Your patient [name] is affected. Options: [describe alternatives — portable X-ray, transfer to another site, delay]."
5. For critical patients (CTAS 1–2): escalate to charge nurse and attend physician immediately.
6. Document the outage: start time, affected modality, patients impacted, and steps taken.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Urgent imaging request — STAT | CTAS 1–2 patient or physician-marked STAT order | Begin immediately. No delay. |
| Imaging delay threshold | An imaging exam has been waiting beyond its expected turnaround | Investigate and notify ordering physician |
| Modality downtime | A modality is not available | Report bottleneck, notify clinicians, arrange alternatives |
| Imaging transport needed | Patient needs transport to imaging | Coordinate with ED nurse |

---

## AI Features Available

- `fallback_recommendation` — Manual imaging workflow steps when CareDroid is unavailable.

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use your radiology information system (RIS) or paper imaging request forms.
2. Communicate directly with the ED charge nurse for prioritization.
3. Notify the ordering physician by phone when imaging is complete.
4. After CareDroid recovery, document completion in the patient alert.

---

## Troubleshooting

**Patient transport hasn't arrived after I confirmed readiness.** Call the ED nurse assigned to the patient. If patient is CTAS 1–2, call the charge nurse directly. Document the transport delay.

**The radiologist says images haven't arrived in PACS.** Confirm your PACS send was successful. Check network connectivity. Resend images. Notify your supervisor if the PACS send is failing for multiple patients.

**An imaging request was cancelled but the alert is still open.** Open the alert → click **Mark as cancelled — reason**. The ordering physician's cancellation should also be confirmed in your RIS.
