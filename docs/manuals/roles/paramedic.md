# Paramedic Manual

**Role ID:** `paramedic`  
**Landing page:** `/emergency/ems`  
**Mission:** Get patient data to the ED before the ambulance arrives. Complete a clean handoff every time.

---

## Role Purpose

The Paramedic manages the pre-arrival patient data pipeline: entering patient information while en route, tracking the unit through the EMS module, completing the structured handoff checklist on arrival, and converting the EMS record to a registered patient. Your pre-arrival data enables the triage nurse and charge nurse to prepare for the incoming patient before the ambulance arrives. A complete handoff prevents information loss at the most dangerous transition in emergency care.

---

## Dashboard View

**EMS** (`/emergency/ems`) — Your primary workspace. Shows:
- Your active unit and destination hospital
- Pre-arrival patient data entry form
- Inbound patient list at your destination ED
- Handoff checklist for arrival

**Reception handoff** — Visible on arrival when you convert the patient record.

**Alerts** — EMS alerts: handoff incomplete, critical patient inbound notification, offload delay.

---

## Allowed Actions

- Enter and update pre-arrival patient data (complaint, vitals, interventions)
- Track your unit en route
- Complete the EMS handoff checklist on arrival
- Convert EMS record to a registered patient (with reception clerk confirmation)
- Acknowledge EMS-specific alerts
- Access AI Chief `handoff_summary` for structured handoff preparation

## Restricted Actions

- Cannot assign ED triage acuity (ED triage nurse's licensed decision)
- Cannot access patient clinical records beyond your pre-arrival data entry
- Cannot access ED analytics or settings

---

## Daily Workflow

### How to Enter Pre-Arrival Data En Route

1. Open CareDroid on your mobile device and navigate to **EMS** (`/emergency/ems`).
2. Confirm your unit is tracked and the destination hospital is correct.
3. Click **Enter pre-arrival data** for the patient in care.
4. Enter vitals at time of contact:
   - Glasgow Coma Scale (GCS)
   - Blood pressure
   - Heart rate
   - Respiratory rate
   - SpO₂
   - Blood glucose if applicable
   - Temperature if applicable
5. Enter chief complaint in the patient's own words.
6. Select structured complaint code from the picker.
7. Document pertinent history:
   - Relevant medical history
   - Current medications and allergies
   - Mechanism of injury (for trauma)
   - Time of symptom onset
8. Document interventions performed en route:
   - IV access (site, gauge, time)
   - Oxygen delivery (method, flow rate)
   - Medications administered (drug, dose, time, route)
   - Airway management
   - Immobilization or hemorrhage control
9. Enter ETA to the ED.
10. Click **Send pre-arrival alert**. The ED charge nurse and triage nurse are notified with your patient data.

### How to Prepare the Handoff Checklist

The handoff checklist opens automatically on the EMS module when you arrive. It covers:
1. Patient identification confirmed (name, DOB, or patient identifier)
2. Chief complaint and mechanism confirmed
3. Vitals at time of transport AND vitals on arrival
4. All interventions confirmed (medications, procedures, timings)
5. Pertinent history confirmed
6. Contact information for the transporting crew
7. Signature: paramedic confirms, reception or triage nurse countersigns

### How to Convert an EMS Record to a Registered Patient

1. When the ambulance arrives, click **Convert to patient** in the EMS module.
2. Review all pre-arrival data with the receiving reception clerk or triage nurse.
3. Complete any missing fields.
4. Complete the handoff checklist with the receiving ED staff member.
5. Click **Complete conversion**. The patient is now registered in the ED system.
6. The pre-arrival data is preserved in the patient record.

### How to Handle an Offload Delay

If the ED cannot receive your patient immediately:
1. An offload delay alert appears in your EMS module.
2. Notify the charge nurse directly.
3. Continue monitoring and treating the patient in the ambulance bay.
4. Update vitals and interventions in real time through the pre-arrival data panel.
5. Document the delay: start time, reason, resolution time.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Handoff incomplete | Your handoff checklist is not completed within 15 minutes of arrival | Complete the checklist with receiving staff |
| Critical patient inbound notification | Another critical unit is arriving at the same ED — possible resource conflict | Coordinate with charge nurse on arrival sequence |
| Offload delay | ED is not able to accept the patient immediately | Continue care in ambulance bay; notify charge nurse |

---

## AI Features Available

| Intent | What it gives you |
|--------|------------------|
| `handoff_summary` | Structured handoff summary from your pre-arrival data. Review before arriving — it prepares the receiving team. |
| `fallback_recommendation` | Manual handoff procedure steps if CareDroid is unavailable |

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use your hospital's radio/phone EMS notification protocol.
2. Complete the paper EMS handoff form on arrival.
3. Verbally deliver all patient information to the triage nurse using SBAR format:
   - **Situation:** "I'm bringing in a 67-year-old male with crushing chest pain onset 45 minutes ago."
   - **Background:** "History of hypertension and prior MI. On aspirin and metoprolol."
   - **Assessment:** "Vitals: BP 90/60, HR 110, SpO₂ 94%. ECG showed ST elevation in leads II, III, aVF."
   - **Recommendation:** "Recommend immediate CTAS 1 assessment and cardiology notification."
4. After CareDroid recovery, enter the pre-arrival data into the patient record.

---

## Troubleshooting

**My unit is not showing at the correct destination hospital.** Open EMS module → Unit settings → Change destination hospital. If the destination was set at dispatch, confirm with your dispatch center.

**Pre-arrival data was entered for the wrong patient.** Notify the receiving ED charge nurse immediately. Open the EMS record and click **Clear pre-arrival data**. Re-enter for the correct patient. Both events are logged in the audit trail.

**The receiving ED says they didn't receive my pre-arrival alert.** Check your network connection. Resend the pre-arrival alert from the EMS module. If still not received, call the ED directly to give a verbal report.

**The handoff checklist won't complete — a field is flagged as required.** Review the flagged fields. Vitals on arrival and patient identification are always required. If you truly cannot obtain a field (e.g., unknown allergy), select "Unknown — unable to obtain" and document reason.
