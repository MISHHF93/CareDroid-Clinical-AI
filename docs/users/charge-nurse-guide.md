# CareDroid: Charge Nurse Guide

> **Related:** [`docs/manuals/roles/charge-nurse.md`](../manuals/roles/charge-nurse.md) covers the same role in fuller "mission-framed" detail. Flagged as overlapping documentation in the [Documentation Center](../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Role:** Charge Nurse (`charge_nurse`)  
**Version:** Pilot 2026

---

## Purpose

You are the operational lead of the Emergency Department. CareDroid gives you a live picture of every patient, every queue, every bottleneck, and every alert — so you can make decisions without hunting for information.

---

## Your Screens

| Screen | Route | Use |
|--------|-------|-----|
| Department Whiteboard | `/emergency/whiteboard` | Primary — start every shift here |
| Capacity & Boarding | `/emergency/capacity` | Bed management + boarding |
| EMS Pipeline | `/emergency/ems` | Ambulance coordination |
| Triage Queues | `/emergency/queues` | Queue oversight |
| Reassessment | `/emergency/reassessment` | Overdue reassessments |
| Referrals | `/emergency/referrals` | Referral tracking |
| Department Pulse | `/emergency/pulse` | Operational health at-a-glance |
| Shift Summary | `/emergency/shift` | End-of-shift handoff |
| Analytics | `/emergency/analytics` | Performance review |
| AI Copilot | `/emergency/copilot` | Clinical decision support |

---

## Daily Workflow

### Start of Shift
1. Open **Department Whiteboard** → review active patient count + capacity band
2. Scan **attention strips**: EMS inbound, reassessments due, pending referrals
3. Open **Shift Summary** to review handoff from outgoing shift
4. Review **EMS Pipeline** for inbound units and expected arrivals

### During Shift
5. Monitor whiteboard in **Charge Nurse screen mode** (`?mode=charge`)
6. Watch **Operational Strip** for: waiting count, boarding count, EMS offload delays
7. Assign rooms and staff from patient cards as patients progress
8. Act on **Critical Alert Banner** when it appears — target < 3 minutes
9. Monitor **Capacity band** — if Orange, start boarding review; if Red, activate surge protocol
10. Review **Reassessment attention strip** — escalate overdue patients
11. Check **Referral panel** for delayed referrals

### End of Shift
12. Open **Shift Summary** and review all outstanding items
13. Confirm handoff with incoming Charge Nurse
14. All critical alerts acknowledged
15. Boarding patients documented

---

## You Can

- View all active patients on the whiteboard
- Assign rooms and staff to patients
- Create new patients (emergency intake)
- Monitor all queue states
- Manage EMS arrivals and bay preparation
- Approve and track referrals
- View and configure settings
- Access capacity and boarding management
- View analytics and shift summary
- Use AI Copilot for clinical support
- Activate surge protocols
- Switch screen modes (charge nurse, command center)

## You Cannot

- Assign acuity (triage nurse responsibility)
- Create specialist referrals (physician responsibility in most configs)
- Access admin console without admin role

---

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `?` | Open help guide |
| `N` | New patient registration |
| `R` | Open reassessment drawer |
| `Cmd+K` | Open command palette |
| `Esc` | Close active drawer/panel |

---

## AI Features Available

- **AI Copilot** — clinical questions, patient summaries, guideline lookup
- **AI Triage Assist** — (via Reception) AI suggestions for chief complaint classification
- **Bottleneck Registry** — AI-detected operational bottlenecks
- **BRAG Forecast** — 10-hour crowding forecast (native AI)
- **Clinical Acuity Dashboard** — acuity distribution across board

---

## Alerts & Response

| Alert | Source | Action |
|-------|--------|--------|
| Critical Alert Banner | Patient flags: SepsisAlert, StrokeCode, High Risk | Respond in < 3 minutes |
| EMS Attention Strip | EMS unit ETA < 5 min or offload > 15 min | Prepare bay, monitor offload |
| Reassessment Strip | ReassessmentDue flags | Open reassessment drawer or route to /reassessment |
| Referral Strip | Delayed referrals | Contact specialist or escalate |
| Capacity crisis | Band = Red | Activate boarding protocols |

---

## Screen Modes

| Mode | How to activate | What you see |
|------|-----------------|--------------|
| Charge Nurse | Role-default | Operational strip: waiting, EMS, reassess, referral KPIs |
| Command Center | `?mode=command` URL | Full throughput KPI dashboard |
| Physician | `?mode=physician` URL | Provider-focused patient view |
| Read-only wall | `?mode=wall` URL | Department status for hallway monitor |

---

## Safety Rules

1. All AI suggestions require your review before clinical action
2. Acuity is assigned only by triage nurse
3. Critical alerts must be acknowledged — they don't auto-clear
4. AI Copilot advice is never a substitute for clinical judgment
