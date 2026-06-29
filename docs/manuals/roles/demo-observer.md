# Demo Observer Manual

**Role ID:** `demo_observer`  
**Landing page:** `/emergency/whiteboard`  
**Mission:** Observe and understand the CareDroid platform without affecting any patient or system state.

---

## Role Purpose

The Demo Observer is a read-only demonstration and training role designed for stakeholders, trainees, evaluators, and visitors who need to see the CareDroid platform in action without access to real patient data or write actions. The demo environment uses realistic synthetic patient data that mirrors real ED workflows. Everything you see is simulated — no real patients, no real clinicians, and no real clinical decisions. You can navigate freely, observe all dashboards and workflows, and read the in-app manual.

---

## Dashboard View

As a Demo Observer, you have read-only access to all core ED surfaces:

**Whiteboard** (`/emergency/whiteboard`) — Department overview with simulated patients, acuity levels, room assignments, staff, and alert counts.

**Patients** (`/emergency/patients`) — Full patient list with simulated patient detail panels.

**Reception** (`/emergency/reception`) — Simulated registration queue and verification queue.

**EMS** (`/emergency/ems`) — Simulated inbound ambulance units.

**Queues** (`/emergency/queues`) — Flow queues with simulated patient data.

**Reassess** (`/emergency/reassessment`) — Reassessment timer board.

**Alerts** (`/emergency/alerts`) — Simulated alert feed with critical, high, medium, and low alerts.

**Capacity** (`/emergency/capacity`) — Department capacity grid.

**Analytics** (`/emergency/analytics`) — Demo analytics with simulated performance data.

**Help** (`/emergency/help`) — Full in-app user manual. Available to all roles.

**AI Chief** (Copilot panel) — Demo AI Chief showing simulated recommendations.

---

## Allowed Actions

- Read-only navigation across all core ED pages
- Open and read any patient record in the demo environment
- Open and read any alert (cannot acknowledge or resolve)
- View all analytics data
- Access the full Help/User Manual (`/emergency/help`)
- Follow the demo journey steps shown in the Help page
- Ask questions through the demo facilitation mode (if enabled)

## Restricted Actions

- Cannot register, update, or delete patients
- Cannot acknowledge, escalate, or resolve alerts
- Cannot assign staff or rooms
- Cannot perform triage or assign acuity
- Cannot change system settings
- Cannot override AI recommendations
- Cannot send or receive handoffs

---

## Demo Journey

The recommended demo journey follows the CareDroid core workflow:

**Step 1 — Hospital Command Center**  
Open the **Whiteboard** (`/emergency/whiteboard`). This is the operational view of the emergency department. Observe: patient acuity distribution, room occupancy, active alerts, EMS arrivals, and department pressure score.

**Step 2 — Patient Arrival**  
Open **Reception** (`/emergency/reception`). This is where walk-in patients are registered and EMS patients are converted. Observe: the verification queue and pretriage pipeline.

**Step 3 — EMS Pre-Arrival**  
Open **EMS** (`/emergency/ems`). Observe: inbound ambulance units with pre-arrival patient data. This is the data paramedics enter en route.

**Step 4 — Triage**  
Open **Queues** (`/emergency/queues`) and switch to the pretriage queue. Observe: patients waiting for triage assessment with their chief complaint and red flags.

**Step 5 — Critical Alerts**  
Open **Alerts** (`/emergency/alerts`). Observe: the alert lifecycle — how alerts are generated, prioritized, owned, and resolved. Note the 3-minute timer on critical alerts.

**Step 6 — AI Chief**  
Open the **Copilot panel** by clicking the Copilot button in the sidebar or pressing C. Observe: how AI Chief intent selection works and what a structured AI recommendation looks like. Remember: AI is decision support only — every recommendation requires clinician review.

**Step 7 — Department Capacity**  
Open **Capacity** (`/emergency/capacity`). Observe: department bed availability, boarding count, and surge score across the hospital.

**Step 8 — Analytics**  
Open **Analytics** (`/emergency/analytics`). Observe: throughput metrics, breach rates, AI review rates, and service health trends.

**Step 9 — Help/User Manual**  
Open **Help** (`/emergency/help`). This is the in-app user manual. It is organized by role and workflow. Every page in CareDroid has contextual help tied to it.

---

## Understanding What You See

**What is simulated:**  
All patient data, alert data, staff data, and AI recommendations in demo mode are synthetic. They are designed to represent realistic ED scenarios but do not correspond to any real individuals.

**What is real:**  
The application itself — navigation, layout, role filtering, alert timers, AI structure, and help content — is the real CareDroid platform. What you see is what clinicians see when using the system with real data.

**The AI Chief in demo mode:**  
AI recommendations in demo mode may use simplified responses for demonstration purposes. In production, AI Chief uses the full model with structured clinical reasoning, uncertainty reporting, and required reviewer role specification.

---

## Fallback Procedures

### If you cannot navigate to a page

1. Your role is read-only — if a page shows "Access restricted," it is correctly hidden from the demo observer role.
2. Open **Help** (`/emergency/help`) and search for the page you are trying to find.
3. Ask your demo facilitator to switch you to a different demo role if you need to see a restricted page.

### If the demo data looks incorrect or unrealistic

1. Demo data is periodically reset to a consistent baseline.
2. If the data appears stale or incorrect, ask your demo facilitator to reset the simulation.
3. Open **Settings** → Simulation (if visible in demo mode) → Reset demo data.

---

## Questions to Ask During a Demo

- "How does the 3-minute timer trigger an escalation if no one acknowledges a critical alert?"
- "Which roles receive which alerts — and why?"
- "What happens when the AI Chief recommends something a clinician disagrees with?"
- "What does the AI Chief's reasoning look like for a specific patient?"
- "What is the difference between a charge nurse's view and a physician's view?"
- "What happens to the audit trail when a clinician overrides an AI recommendation?"
- "What does CareDroid show when a service is degraded or offline?"
- "Can I see what the system looks like in a surge scenario?"
