# Charge Nurse Manual

> **Related:** [`docs/users/charge-nurse-guide.md`](../../users/charge-nurse-guide.md) covers the same role in a shorter guide format. Flagged as overlapping documentation in the [Documentation Center](../../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Role ID:** `charge_nurse`  
**Landing page:** `/emergency/whiteboard`  
**Mission:** Run ED flow. Every patient has an owner. Every critical alert is acknowledged. No one falls through the cracks.

---

## Role Purpose

The Charge Nurse is the operational commander of the emergency department shift. You own the whiteboard, staff assignments, room decisions, queue surge, and escalation authority. When the 3-minute timer breaches, the system escalates to you at 2 minutes. When a critical alert has no owner, it is your responsibility. You are the human backbone of the 3-minute response loop.

---

## Dashboard View

**Whiteboard** (`/emergency/whiteboard`) — Full department patient board. Sorted by acuity, wait time, and risk flags. At a glance: who is in what room, who is assigned, which patients are overdue, which alerts are open.

**Queues** (`/emergency/queues`) — Patient queues: pretriage, triage, waiting room, treatment, boarding. Shows bottlenecks by queue section.

**Reassessment** (`/emergency/reassessment`) — Reassessment timer board. Red = overdue.

**Capacity** (`/emergency/capacity`) — Department capacity, boarding count, bed availability, surge score.

**Alerts** (`/emergency/alerts`) — All active critical and high-priority alerts. Unowned alerts appear at the top.

**Shift** (`/emergency/shift`) — Shift handoff summary. Use at end of shift.

---

## Allowed Actions

- Assign staff (nurses and physicians) to patients
- Assign or reassign rooms
- Move patients between queues and zones
- Acknowledge any alert within your ED scope
- Escalate alerts to physician, patient flow coordinator, or administrator
- Override room and queue assignments
- Request AI Chief: `staff_routing`, `department_routing`, `three_minute_response_plan`, `hospital_command_insight`
- View all patients, all rooms, all staff
- Document shift handoff

## Restricted Actions

- Cannot perform clinical diagnosis, prescription, or treatment
- Cannot discharge patients (physician must document disposition)
- Front-desk registration workflows (unless no clerk is available and you cover)

---

## Daily Workflow

### How to Start Your Shift

1. Open the **Whiteboard** (`/emergency/whiteboard`).
2. Review the incoming shift handoff document from the outgoing charge nurse (`/emergency/shift`).
3. Walk the board:
   - Which patients are CTAS 1–2? Are they owned and progressing?
   - Which alerts are active? Any unacknowledged?
   - Are there reassessment overdue patients?
   - Which rooms are occupied, available, cleaning?
4. Count staff present. Confirm each nurse and physician knows their assigned patients.
5. Check capacity: is boarding pressure high? Is surge mode needed?
6. Clear any critical alerts from the incoming shift that were not acknowledged.
7. Brief the clinical team on the department state in 5 minutes or less.

### How to Run the Whiteboard

1. Scan for CTAS 1–2 patients without a physician assigned. Assign immediately.
2. Scan for patients whose **wait timer is red** — they have exceeded their CTAS time-to-physician target. Escalate or room now.
3. Scan for **unowned alerts** (flagged ⚠) — assign yourself or route to the correct owner.
4. Review the **AI Chief** recommendation for the department state using intent `hospital_command_insight`.
5. Use the **Staff Assignment** panel to drag-assign nurses and physicians to patients.
6. After each assignment, the assigned staff member receives an in-app notification.

### How to Handle a 3-Minute Escalation

At 2:00 minutes without acknowledgement, the system escalates to you:

1. Open the alert immediately.
2. Review: patient name, CTAS, complaint, timer elapsed, original owner.
3. If the original owner is reachable: call or page them immediately. Do not wait.
4. If the original owner is not reachable:
   - Click **Take ownership**.
   - Assign yourself and the on-call physician.
   - Enter escalation reason.
   - Click **Acknowledge and escalate**.
5. Physically go to the patient if needed. The timer is a patient safety measure.

### How to Manage Queue Surge

1. Open **Queues** (`/emergency/queues`). Surge score shown at top.
2. If surge score is critical:
   - Request AI Chief `three_minute_response_plan` for the department.
   - Activate fast-track if available.
   - Request additional staff from the patient flow coordinator.
   - Brief the attending physician.
   - Consider offloading low-acuity patients to waiting room with extended reassessment.
3. Document surge activation in the shift log.

### How to Hand Off at End of Shift

1. Open **Shift** (`/emergency/shift`).
2. Review the generated shift summary: patients, alerts, pending actions.
3. Add anything missing: verbal agreements, family concerns, known risks.
4. Walk the board with the incoming charge nurse — do not rely on the document alone.
5. For every critical patient (CTAS 1–2): verbal handoff is required.
6. Click **Complete handoff**. The incoming charge nurse receives the shift summary.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| 3-minute breach — escalation to charge | A critical alert has not been acknowledged by original owner at 2 minutes | Take ownership immediately |
| Unowned patient — CTAS 1–2 | A critical patient has no assigned owner | Assign physician immediately |
| Reassessment breach | Multiple patients overdue for reassessment | Direct nurses to reassess; room if needed |
| Capacity critical | Department is at or near capacity threshold | Contact patient flow coordinator |
| Service bottleneck | A monitored service has degraded | Activate fallback; notify IT Admin |

---

## AI Features Available

| Intent | What it gives you |
|--------|------------------|
| `staff_routing` | Recommends which nurse and physician to assign based on load and acuity |
| `department_routing` | Recommends which zone or department for a specific patient |
| `three_minute_response_plan` | Generates a full 3-minute response plan for a critical patient |
| `hospital_command_insight` | Department-level operational summary: queue state, risks, bottlenecks |
| `fallback_recommendation` | What to do when a service or AI is unavailable |

All AI output is advisory. You own every assignment and escalation decision.

---

## Fallback Procedures

### If CareDroid is unavailable

1. Use your hospital's manual huddle board.
2. Phone or page each nurse and physician directly.
3. Use the downtime handoff sheet for shift transition.
4. For critical patients: use overhead page and direct bedside escalation.
5. Document all decisions on paper with timestamp. Back-enter after recovery.

---

## Troubleshooting

**An alert is showing as unowned but I can't find who should own it.** Open the alert, review the alert source (clinical? operational? bottleneck?). Assign the alert owner based on the source: clinical alert → attending physician; operational alert → patient flow coordinator; bottleneck alert → IT Admin.

**A nurse says they were assigned a patient they don't know about.** Open the patient record and confirm the assignment timestamp. If the nurse was assigned after their shift started, they may have missed the notification. Brief them verbally.

**The AI Chief department insight is flagging risks I don't agree with.** Review the flagged items. If you assess the risk differently, document your clinical reasoning and proceed. The AI insight is advisory.

**Two nurses are assigned to the same patient.** Open the patient record → Staff tab → Remove the incorrect assignment. Ensure the remaining nurse is notified they are the sole owner.
