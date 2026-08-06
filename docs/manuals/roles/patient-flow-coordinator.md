# Patient Flow Coordinator Manual

> **Related:** [`docs/users/patient-flow-coordinator-guide.md`](../../users/patient-flow-coordinator-guide.md) covers the same role in a shorter guide format. Flagged as overlapping documentation in the [Documentation Center](../../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Role ID:** `patient_flow_coordinator`  
**Landing page:** `/emergency/queues`  
**Mission:** Keep every patient moving toward disposition. No patient stuck. No department at capacity without a plan.

---

## Role Purpose

The Patient Flow Coordinator is the operational nerve center for bed management, department routing, transfer coordination, and bottleneck recovery. You see the full picture across the emergency department and the hospital: which beds are available, which departments are at capacity, which patients are boarding, and which service bottlenecks are slowing care. When the 3-minute timer escalates past the charge nurse and physician, you are the next level. When AI detects a department routing conflict, your decision resolves it.

---

## Dashboard View

**Capacity** (`/emergency/capacity`) — Department capacity grid. Shows: beds available/occupied/cleaning, surge score, boarding count, and department status across the hospital.

**Queues** (`/emergency/queues`) — ED patient flow queues. Boarding queue, transfer queue, and admission queue are your primary focus.

**Analytics** (`/emergency/analytics`) — Throughput, LWBS, door-to-disposition time, and service bottleneck trends.

**Shift** (`/emergency/shift`) — Shift handoff summary. Shows open boarding patients, pending transfers, and unresolved bottlenecks.

**Alerts** — Capacity alerts, boarding pressure alerts, unresolved handoff alerts, service bottleneck alerts.

---

## Allowed Actions

- Route patients operationally (assign destination department, bed, or zone)
- Coordinate with receiving departments to confirm bed availability
- Escalate bottlenecks to IT Admin, charge nurse, or administrator
- Acknowledge capacity and bottleneck alerts
- Request AI Chief: `department_routing`, `staff_routing`, `service_bottleneck_analysis`, `hospital_command_insight`, `fallback_recommendation`
- Review full analytics and throughput data
- Document transfer arrangements

## Restricted Actions

- Cannot diagnose, prescribe, or provide clinical treatment
- Cannot assign CTAS acuity (clinical role's decision)
- Cannot modify clinical patient records (clinical read access only)

---

## Daily Workflow

### How to Start Your Shift

1. Open **Capacity** (`/emergency/capacity`).
2. Review the department grid: which departments are at capacity? Which are green?
3. Count boarding patients in the ED: patients waiting for inpatient beds.
4. Review the alert banner for any active capacity or bottleneck alerts.
5. Contact the charge nurse for a verbal brief on ED state.
6. Review the **Shift** summary from the previous shift coordinator.

### How to Inspect Stalled Patients

1. Open **Queues** (`/emergency/queues`).
2. Switch to the **Boarding** queue. These are patients with an inpatient admission order who are waiting for a bed.
3. For each stalled patient:
   - Review their destination department.
   - Click **Check availability** to see live bed status in the destination department.
   - If a bed is available: click **Confirm bed assignment**. Notify the destination department.
   - If no bed is available: click **AI Chief → department_routing** for alternative recommendations.
4. Document each action and the reason for routing decisions.

### How to Handle Department Capacity Pressure

When a department (ED or inpatient) reports high capacity:
1. Open **Capacity** (`/emergency/capacity`) and click the department.
2. Review: beds occupied, beds available, beds cleaning, expected discharges.
3. Use AI Chief `hospital_command_insight` for a full department summary and risk projection.
4. Options:
   - **Expedite inpatient discharges:** contact the ward charge nurse with a list of potential discharge patients.
   - **Open overflow capacity:** notify hospital administrator to activate surge protocol.
   - **Redirect transfers:** route incoming transfers to alternative departments with capacity.
   - **Ambulance diversion:** if ED capacity is critical, notify charge nurse and escalate to hospital administrator for diversion decision.
5. Document all decisions and who was notified.

### How to Coordinate a Transfer

When a patient is being transferred to another facility:
1. Open the patient record → **Transfer** tab.
2. Confirm the destination facility, receiving unit, and accepting physician.
3. Confirm transport has been arranged (ambulance, air transport).
4. Generate handoff summary: click **AI Chief → handoff_summary**. Review and complete it.
5. Click **Confirm transfer**. The patient record is updated. The destination facility receives the transfer notification.
6. Document transport departure time and expected arrival time.

### How to Respond to a Bottleneck Alert

1. Open the **Bottleneck alert** in the Alerts page.
2. Review: affected service, patient impact, risk level.
3. Use AI Chief `service_bottleneck_analysis` for a full analysis.
4. For patient-impacting bottlenecks:
   - Escalate to IT Admin immediately.
   - Activate the fallback procedure for the affected service.
   - Notify the charge nurse if clinical workflow is affected.
5. Document: start time, affected service, patient impact, actions taken.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Capacity critical — ED | ED is at or near threshold | Expedite discharges, open overflow, or escalate to admin |
| Boarding pressure — >N hours | Boarding patients waiting beyond threshold | Contact destination department; expedite bed assignment |
| Unowned handoff | A patient transfer has no confirmed receiving owner | Assign receiving owner now |
| Service bottleneck — patient impact | A degraded service is affecting patient flow | Activate fallback; notify IT Admin |
| 3-minute escalation — flow coordinator | A critical alert has escalated past charge nurse and physician | Take ownership and escalate to admin if needed |

---

## AI Features Available

| Intent | What it gives you |
|--------|------------------|
| `department_routing` | Recommended destination for a specific patient based on acuity, capacity, and specialization |
| `staff_routing` | Recommended staff role and individual for a specific patient |
| `service_bottleneck_analysis` | Current bottleneck report with patient impact and recovery steps |
| `hospital_command_insight` | Aggregate operational state of the full hospital |
| `fallback_recommendation` | Manual fallback steps for any degraded service or unavailable system |

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use your hospital's manual bed board.
2. Contact receiving departments directly by phone.
3. Maintain a paper log of all routing decisions, transfers, and escalations.
4. For critical boarding patients: escalate to hospital administrator on call.
5. After recovery, back-enter all capacity decisions and transfer arrangements.

---

## Troubleshooting

**A department is saying they have no beds but CareDroid shows beds available.** Call the department directly. The CareDroid bed board updates on staff input — if beds were made available but not updated in the system, there is a sync lag. Ask the receiving ward charge nurse to update CareDroid, then retry.

**AI routing is suggesting a department that's already at capacity.** The AI recommendation is advisory. Override it manually and route to the correct department. Document the override reason.

**A transfer was arranged but the transport unit didn't show.** Contact transport dispatch directly. Document the delay. If the patient's condition is time-critical, escalate to the charge nurse for interim management while you rearrange transport.

**Two patients are assigned to the same destination bed.** Open **Capacity** and click the bed. Identify both patients. Confirm which is actually assigned. Reassign the second patient to a different bed. Notify both nurses.
