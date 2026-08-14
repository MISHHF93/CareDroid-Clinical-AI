# CareDroid Master User Manual

**Version:** 2.0 — Rebuilt around process and procedure  
**Mission:** It takes 3 minutes to save someone's life.  
**Classification:** Operational reference — distribute to all CareDroid users

---

## Table of Contents

1. [Product Mission and Safety Principles](#1-product-mission-and-safety-principles)
2. [User Roles and Responsibilities](#2-user-roles-and-responsibilities)
3. [Permissions and Access Control](#3-permissions-and-access-control)
4. [Daily Workflow](#4-daily-workflow)
5. [Emergency Workflow](#5-emergency-workflow)
6. [3-Minute Response Procedure](#6-3-minute-response-procedure)
7. [Patient Intake Procedure](#7-patient-intake-procedure)
8. [Triage Procedure](#8-triage-procedure)
9. [Critical Alert Procedure](#9-critical-alert-procedure)
10. [AI Chief Review Procedure](#10-ai-chief-review-procedure)
11. [Staff Routing Procedure](#11-staff-routing-procedure)
12. [Escalation Procedure](#12-escalation-procedure)
13. [Patient Handoff Procedure](#13-patient-handoff-procedure)
14. [Department Routing Procedure](#14-department-routing-procedure)
15. [Service Bottleneck Procedure](#15-service-bottleneck-procedure)
16. [Analytics and Reports Procedure](#16-analytics-and-reports-procedure)
17. [Downtime and Fallback Procedure](#17-downtime-and-fallback-procedure)
18. [Troubleshooting](#18-troubleshooting)
19. [Glossary](#19-glossary)

---

## 1. Product Mission and Safety Principles

### Mission

CareDroid is the AI Chief of Staff for the Emergency Department and hospital operations. It exists to close the gap between the moment a patient arrives and the moment a licensed clinician takes ownership of that patient's care.

**"It takes 3 minutes to save someone's life."**

Every workflow in CareDroid is designed to ensure that within 3 minutes of a critical signal, a named human owner has acknowledged responsibility for a patient or operational event.

### What CareDroid Does

- Captures patient signals from reception, EMS, self-arrival, and clinical escalation.
- Detects risk from triage data, complaint flags, vital patterns, and reassessment timers.
- Assigns priority and routes the right staff to the right patient at the right time.
- Provides AI decision support through the AI Chief node — structured, explainable, and clinician-reviewed.
- Tracks service bottlenecks and feeds them to the dashboard, alerts, and analytics.
- Maintains a complete audit trail of every alert, acknowledgement, override, and handoff.

### What CareDroid Does NOT Do

- CareDroid does not diagnose.
- CareDroid does not prescribe.
- CareDroid does not write EHR orders without clinician review.
- CareDroid does not replace licensed clinical judgment.
- AI output is decision support only. Every AI recommendation must be reviewed by the appropriate licensed clinician before any clinical action is taken.

### Safety Principles

1. **Clinician ownership is non-negotiable.** Every patient and every critical alert must have a named licensed clinician as the accountable owner. AI cannot be the owner.

2. **AI is decision support only.** The AI Chief provides structured recommendations with reasoning, uncertainty levels, and a required human reviewer role. Staff must review, accept, modify, or override before acting.

3. **Critical alerts require acknowledgement and an audit trail.** An alert that is not acknowledged is not closed. Acknowledgement records who acted, when, and why.

4. **The 3-minute clock is a patient safety measure.** When the 3-minute timer expires without acknowledgement, the system escalates automatically. Do not silence the timer — resolve the underlying issue.

5. **Downtime procedures always take priority over automation.** If CareDroid systems are unavailable, follow standard hospital protocol immediately. Do not wait for the system to recover.

6. **Least-privilege access is enforced at runtime.** Navigation, actions, and AI features are controlled by the compiled CareDroid access profile. Do not attempt to access routes or perform actions outside your role.

7. **Override authority requires documentation.** If you override an AI recommendation, system alert, or triage assignment, document the reason. Override data feeds the quality review loop.

---

## 2. User Roles and Responsibilities

CareDroid recognizes 23 user roles across the emergency department and hospital network. Each role controls what the user sees in navigation, what actions they can take, what alerts they receive, and which AI features they can access.

### Clinical Roles

#### Reception Clerk (`registration_clerk`)
Registers patient arrivals, verifies identity, captures chief complaint and red flags, and hands off to triage.  
**Landing page:** `/emergency/reception`  
**Scope:** Walk-in registration, EMS conversion, identity verification, pretriage queue handoff.

#### Triage Nurse (`triage_nurse`)
Assigns acuity, records vitals, captures complaint detail, starts reassessment timers, and routes to waiting, room, provider, or emergency escalation.  
**Landing page:** `/emergency/reception` (triage queue view)  
**Scope:** Acuity assignment, vitals, reassessment, queue movement.

#### Charge Nurse (`charge_nurse`)
Runs shift flow: rooms patients, assigns staff, manages queue surge, owns escalation, and monitors the operational dashboard.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** All patient flow decisions, staff assignment, escalation authority.

#### Registered Nurse (`registered_nurse`)
Manages assigned patients: updates status, records assessments, reassesses per timer, documents, and escalates when needed.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** Assigned patients only. Cannot room, discharge, or configure settings.

#### Emergency Physician (`emergency_physician`)
Diagnoses, treats, documents, orders, disposes, and clinically reviews AI Chief recommendations.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** All clinical decisions. Full AI Chief access including override authority.

#### Attending Physician (`attending_physician`)
Senior physician role with the same full clinical decision authority as Emergency Physician.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** All clinical decisions. Same permission tier as Emergency Physician (shared `physician` role mapping).

#### Resident Physician (`resident_physician`)
Physician-in-training role with the same clinical decision authority as Emergency Physician.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** All clinical decisions. Same permission tier as Emergency Physician (shared `physician` role mapping).

#### Specialist (`specialist`)
Receives consult requests, reviews case summaries, documents specialist recommendations, and sends handoff confirmation.  
**Landing page:** `/emergency/patients`  
**Scope:** Consult queue patients. AI Chief review for consult context.

#### Paramedic (`paramedic`)
Manages EMS pre-arrival patient data, converts EMS units to registered patients on arrival, documents handoff checklist.  
**Landing page:** `/emergency/ems`  
**Scope:** EMS module. Pre-arrival data entry. Handoff to reception.

### Operational Roles

#### Dispatcher (`dispatcher`)
Emergency call taker and CAD dispatch operator. Receives 911 calls, performs telephone triage, assigns EMS units, and notifies the ED of inbound critical patients.  
**Landing page:** `/emergency/dispatch`  
**Scope:** Dispatch module. Operational data-minimization tier — no direct clinical patient access.

#### EMS Coordinator (`ems_coordinator`)
EMS operations coordinator who manages unit deployment, prehospital data relay, pre-arrival notifications, and ED readiness handoffs.  
**Landing page:** `/emergency/ems`  
**Scope:** EMS coordination. Operational data-minimization tier — no direct clinical patient access.

#### Social Worker (`social_worker`)
Read-only clinical role supporting discharge planning and patient-support coordination.  
**Landing page:** `/emergency/patients`  
**Scope:** Read-only. Clinical data-minimization tier — sees patient context, no write access.

#### Security Officer (`security_officer`)
Read-only role for physical-security and incident awareness via department alerts.  
**Landing page:** `/emergency/alerts`  
**Scope:** Read-only. Metadata-only data-minimization tier — no clinical patient content.

#### Patient Flow Coordinator (`patient_flow_coordinator`)
Coordinates beds across departments, manages transfers, resolves bottlenecks, owns the capacity dashboard.  
**Landing page:** `/emergency/capacity`  
**Scope:** Capacity management, department routing, bed assignment, transfer coordination.

#### Lab Technician (`lab_technician`)
Handles lab workflow alerts, critical value notifications, and turnaround tracking.  
**Landing page:** `/emergency/alerts`  
**Scope:** Lab-sourced alerts. No clinical patient access.

#### Radiology Technician (`radiology_technician`)
Handles imaging readiness, imaging workflow alerts, and turnaround tracking.  
**Landing page:** `/emergency/alerts`  
**Scope:** Radiology-sourced alerts. No clinical patient access.

#### Pharmacist (`pharmacist`)
Reviews medication risk alerts, medication order alerts, and drug interaction notifications.  
**Landing page:** `/emergency/alerts`  
**Scope:** Pharmacy-sourced alerts. Medication workflow only.

### Administrative Roles

#### Site Super Admin (`super_admin`)
Full platform administration with no data-minimization restriction — the highest-privilege role in the system.  
**Landing page:** `/emergency/settings`  
**Scope:** Unrestricted admin access across every module.

#### ED Director (`ed_director`)
Combines physician-level clinical authority with department management oversight.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** Clinical and administrative. Same operational permissions as ED Manager plus physician-level clinical access.

#### Hospital Administrator (`hospital_admin`)
Reviews operational reports, sets hospital-level settings, monitors aggregate performance.  
**Landing page:** `/emergency/analytics`  
**Scope:** Read-only clinical. Full analytics and settings access.

#### IT Administrator (`it_admin`)
Manages identity, integrations, audit trail, downtime coordination, and system health.  
**Landing page:** `/emergency/settings`  
**Scope:** System configuration. Audit access. No clinical patient access.

#### Quality & Safety Officer (`quality_safety_officer`)
Reviews compliance, breach reports, AI override patterns, alert resolution quality, and safety analytics.  
**Landing page:** `/emergency/analytics`  
**Scope:** Full analytics read. Alert and AI audit read. No clinical write access.

#### Demo Observer (`demo_observer`)
Read-only demonstration and training view. Sees full ED simulation with realistic data.  
**Landing page:** `/emergency/whiteboard`  
**Scope:** Read-only. No write actions. Full navigation in demo mode.

---

## 3. Permissions and Access Control

### How Access Works

CareDroid uses a **compiled access profile** to control every user's experience at runtime. When you log in, the system compiles your `CompiledCareDroidAccessProfile` from your role, organization, and feature flags. This profile controls:

- Which navigation items appear in your sidebar
- Which routes you can access
- Which actions (buttons) are available
- Which alerts you receive
- Which AI Chief intents you can invoke
- Which staff and patients are in your scope

The canonical permission source is `src/lib/users/permissions.ts`. Runtime access compiles through `src/lib/users/canonicalAccess.ts`.

### Permission Families

| Family | Permissions |
|--------|-------------|
| `patient:*` | `view`, `create`, `update`, `assign`, `discharge` |
| `triage:*` | `read`, `create`, `update`, `override`, `escalate` |
| `ai:*` | `read`, `request`, `review`, `override`, `configure` |
| `alert:*` | `read`, `acknowledge`, `escalate`, `resolve`, `configure` |
| `staff:*` | `read`, `update`, `assign`, `schedule` |
| `analytics:*` | `read`, `export` |
| `reports:*` | `read`, `generate`, `export` |
| `settings:*` | `read`, `update`, `configure` |
| `users:*` | `read`, `create`, `update`, `deactivate` |
| `audit:*` | `read`, `export` |

### Role-to-Permission Matrix (Core)

| Permission | Clerk | Triage Nurse | Charge Nurse | RN | Physician | Admin |
|------------|-------|-------------|-------------|-----|-----------|-------|
| `patient:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `patient:create` | ✓ | — | — | — | — | — |
| `patient:update` | — | ✓ | ✓ | ✓ | ✓ | — |
| `patient:discharge` | — | — | ✓ | — | ✓ | — |
| `triage:create` | — | ✓ | ✓ | — | ✓ | — |
| `triage:override` | — | — | ✓ | — | ✓ | — |
| `ai:request` | — | ✓ | ✓ | ✓ | ✓ | — |
| `ai:override` | — | — | ✓ | — | ✓ | — |
| `alert:acknowledge` | — | ✓ | ✓ | ✓ | ✓ | — |
| `alert:configure` | — | — | — | — | — | ✓ |
| `analytics:read` | — | — | ✓ | — | ✓ | ✓ |
| `settings:configure` | — | — | — | — | — | ✓ |

### How to Register a New User

1. Navigate to **Settings → User Management** (`/emergency/settings` → Users tab).
2. Click **Add User**.
3. Enter name, email, and select role from the role dropdown.
4. Assign to department if required.
5. System compiles the access profile immediately on save.
6. New user receives an activation email.

### How to Change a User's Role

1. Open **Settings → User Management**.
2. Find the user by name or email.
3. Select the new role from the role dropdown.
4. Confirm the role change — the access profile recompiles on next login.
5. Audit log records the change with who made it and when.

---

## 4. Daily Workflow

### How to Start Your Shift

1. Open CareDroid and confirm you are logged in as your correct role. Check the bottom-left **DEMO USER** chip or your profile name.
2. Review the **Help/User Manual** quick guide for your landing page (`/emergency/help`).
3. Open your role's landing page (the sidebar will navigate you there automatically based on your compiled profile).
4. Check critical alerts in the alert banner at the top of any page.
5. Review your active patient queue or department dashboard.
6. Confirm service health — if any service is degraded, a banner will appear. Follow the bottleneck procedure.
7. Begin working your assigned queue.

### How to Navigate Between Pages

The sidebar lists all pages available to your role. Use it to move between:
- **Whiteboard** — Department overview and patient board.
- **Patients** — Full patient list with search and filter.
- **Reception** — Walk-in and EMS arrivals.
- **EMS** — Ambulance pre-arrival and conversion.
- **Queues** — Structured triage and flow queues.
- **Reassess** — Reassessment timer board.
- **Alerts** — Critical alerts center.
- **Capacity** — Department capacity and bed management.
- **Referrals** — Consult and transfer queue.
- **Copilot (AI Chief)** — AI decision support panel.
- **Analytics** — Throughput, wait time, and breach reports.
- **Settings** — System and user configuration.
- **Help** — In-app user manual and role quick guides.

Mobile users: use the bottom navigation bar and the **More** drawer.

### How to End Your Shift

1. Review all patients assigned to you. Confirm each has a documented status, next action, and owner.
2. Check for unacknowledged alerts assigned to you. Acknowledge or escalate each one.
3. Review open reassessment timers. Document or hand off each overdue timer.
4. Open **Shift Summary** (`/emergency/shift`) to see unresolved items.
5. Complete a verbal and written handoff with your relief for any critical patients.
6. Log out.

---

## 5. Emergency Workflow

The core ED workflow follows a closed loop:

```
Signal Capture
  → Risk Detection
  → Priority Assignment
  → AI Chief Recommendation
  → Staff Routing
  → 3-Minute Timer
  → Acknowledgement
  → Escalation (if needed)
  → Handoff
  → Outcome Tracking
  → Analytics Feedback
```

Each step has an owner role and a CareDroid surface.

### How the Loop Works in Practice

**Step 1 — Signal Capture**  
A patient arrives. The source is one of:
- Walk-in to reception (clerk registers via `/emergency/reception`)
- EMS pre-arrival (paramedic enters via `/emergency/ems`)
- Self-arrival check-in (patient uses kiosk `/emergency/intake`)
- Staff escalation (any clinical user from their active patient view)

**Step 2 — Risk Detection**  
The system evaluates the complaint, vitals, red flags, arrival mode, and history. High-risk signals generate a critical alert immediately. The alert engine runs in real-time.

**Step 3 — Priority Assignment**  
Triage nurse assigns acuity (Canadian Triage and Acuity Scale or CTAS level 1–5). This is a licensed clinician decision. AI can suggest; triage nurse owns the assignment.

**Step 4 — AI Chief Recommendation**  
If the signal is critical, the AI Chief generates a structured recommendation covering: what to do now, who should own it, what department, what next action, and what the fallback is if AI is unavailable.

**Step 5 — Staff Routing**  
Charge nurse or the system routes the patient to the right nurse and physician. Alert ownership is assigned to a named individual.

**Step 6 — 3-Minute Timer**  
For critical and high-acuity patients, the timer starts at signal capture. The timer tracks: 0–30s complaint capture, 30s–1min triage notification, 1–2min department recommendation, 2–3min escalation. After 3 minutes without acknowledgement, the system escalates automatically.

**Step 7 — Acknowledgement**  
The assigned owner acknowledges the alert. This records who acknowledged, when, and what action they committed to. Only users with `alert:acknowledge` permission for the alert's scope can acknowledge.

**Step 8 — Escalation**  
If unacknowledged at 3 minutes, the system escalates to the next level: charge nurse → physician → patient flow coordinator → administrator on call. Each escalation is documented.

**Step 9 — Handoff**  
When a patient moves between care stages (triage → room → provider → disposition), a handoff is documented with: patient, acuity, current risk, destination, owner, and next action.

**Step 10 — Outcome Tracking**  
Disposition, time-to-decision, and breach events are recorded. AI override decisions are logged separately.

**Step 11 — Analytics Feedback**  
All events feed the analytics dashboard: throughput, wait times, alert response times, breach rates, AI review rates, and service bottleneck impacts.

---

## 6. 3-Minute Response Procedure

### Purpose

Ensure every critical or high-acuity patient has a named licensed clinical owner who has acknowledged responsibility within 3 minutes of the triggering signal.

### When It Triggers

The 3-minute timer starts when any of the following occur:
- Patient is registered with a high-risk complaint flag.
- Triage assigns CTAS 1 or CTAS 2 acuity.
- A critical alert is generated from vital deterioration.
- A reassessment timer breach is detected.
- EMS pre-arrival data indicates a critically ill patient.
- AI Chief flags a `critical_alert_assessment` intent.

### Timer Phases

| Phase | Time | What Happens | Who Acts |
|-------|------|-------------|----------|
| Capture | 0:00–0:30 | Complaint and red flags are recorded. Patient record is created. | Reception Clerk, Triage Nurse, Paramedic |
| Notify | 0:30–1:00 | Triage priority is suggested. Alert is sent to the assigned owner. | Alert engine notifies owner via in-app and fallback channel |
| Route | 1:00–2:00 | Department is recommended. Handoff is prepared. | Charge Nurse, Patient Flow Coordinator |
| Escalate | 2:00–3:00 | If not acknowledged, escalation message is sent to backup owner. | System + Charge Nurse |
| Breach | After 3:00 | Breach is recorded. Escalation continues up the chain. Analytics records the event. | Physician, Patient Flow Coordinator, Admin on call |

### How to Register a Critical Patient (0:00–0:30)

1. Open Reception (`/emergency/reception`) or EMS module (`/emergency/ems`).
2. Click **Register walk-in** or **Convert EMS unit**.
3. In the complaint field, enter the chief complaint and select all red flag checkboxes that apply.
4. The system highlights high-risk complaint patterns immediately.
5. Select **High priority** if the clinical presentation warrants it.
6. Click **Save patient record**. The record is created and the timer starts.
7. The system generates a critical alert and routes it to the triage nurse.

### How to Acknowledge a Critical Alert (at any phase)

1. Open the **Alerts** page (`/emergency/alerts`) or click the alert in the top banner.
2. Review the alert: patient, severity, source, timer, owner assignment, and AI recommendation.
3. Click **Acknowledge** — only available to users with `alert:acknowledge` for this alert's scope.
4. Confirm your acknowledgement action: what you are doing, who is responsible, and what the next step is.
5. The timer stops. The acknowledgement is logged with your name, role, timestamp, and action statement.

### How to Escalate After 3 Minutes

1. If you receive an escalation notification after 3 minutes, open the alert immediately.
2. Review the breach details: original signal time, original owner, escalation reason.
3. Assign yourself as owner by clicking **Take ownership**.
4. Document what you are doing: who you are notifying, what clinical action you are taking.
5. Click **Acknowledge and escalate**. This acknowledges the alert while also notifying the next escalation level.
6. Update the patient record with your assessment immediately.

### Failure Mode

If CareDroid AI, notifications, or the backend are unavailable:
- Use your hospital's manual escalation protocol immediately (phone, pager, overhead page, radio).
- Do not wait for the system to recover.
- After recovery, back-enter the timeline of events into the patient record.

---

## 7. Patient Intake Procedure

### Purpose

Create a complete and accurate patient record from the moment of arrival so that every downstream clinical team has the information they need.

### Intake Sources

| Source | Who enters | Where | Result |
|--------|-----------|-------|--------|
| Walk-in | Reception Clerk | `/emergency/reception` | Patient record created |
| EMS pre-arrival | Paramedic | `/emergency/ems` | Pre-arrival unit tracked; converted on arrival |
| Self-arrival kiosk | Patient | `/emergency/intake` | Preliminary record; clerk verifies |
| Staff escalation | Any clinical staff | Patient detail panel | Escalation alert created |

### How to Register a Walk-In Patient

1. Open Reception (`/emergency/reception`).
2. Click **Register walk-in** in the top-right of the workspace.
3. Enter **Patient name** and **Date of birth**. Search for existing records to avoid duplicates.
4. If an existing record is found, click **Link to existing**. If new, continue with new registration.
5. Enter **MRN** if available. If not, system generates a temporary MRN.
6. Enter **Chief complaint** — type or select from the structured complaint list.
7. Select all **Red flag checkboxes** that apply: chest pain, difficulty breathing, altered consciousness, severe pain, bleeding, neurological changes, pediatric concern, sepsis risk, trauma.
8. Enter **Arrival time** (auto-filled), **Arrival mode** (walk-in, EMS, transfer, self-arrival).
9. Click **Save and send to verification queue**.
10. Patient appears in the verification queue. Proceed to identity verification.

### How to Register an EMS Patient

1. Open EMS (`/emergency/ems`).
2. Review the **Inbound units** panel for the incoming ambulance.
3. When the unit arrives, click **Convert to patient**.
4. EMS handoff data pre-fills the patient record: complaint, vitals, interventions.
5. Complete the **Handoff checklist** with the paramedic.
6. Click **Complete conversion**. Patient moves to verification queue.

### How to Verify Identity

1. Open the **Verification queue** in Reception.
2. Select the patient to verify.
3. Check government-issued ID, health card, or next-of-kin confirmation.
4. If ID is confirmed: click **Verified** and proceed to pretriage.
5. If ID cannot be confirmed: mark **Manual review** and document reason. Patient still proceeds to triage — identification is not a barrier to emergency care.

### How to Complete Pretriage

1. Patient moves from verification queue to **Pretriage queue** automatically after identity step.
2. Triage nurse takes over. Capture vitals: BP, HR, SpO₂, temperature, pain score.
3. Add or refine complaint details. Select structured complaint code if available.
4. Click **Ready for triage**. Patient is now in the triage nurse's queue.

### How to Handle a Self-Arrival

1. Patient completes self-check-in at the kiosk (`/emergency/intake`).
2. A preliminary record is created with name, DOB, complaint, and pain score.
3. The record appears in Reception with a **Self-arrival** tag.
4. Clerk reviews the preliminary record and completes identity verification.
5. Proceed to the pretriage queue.

---

## 8. Triage Procedure

### Purpose

Assign the correct acuity level, record vitals, capture clinical complaint, start reassessment timers, and move the patient into the appropriate care queue.

### Acuity Scale

CareDroid uses the Canadian Triage and Acuity Scale (CTAS):

| Level | Label | Target to physician | Timer |
|-------|-------|--------------------|----|
| CTAS 1 | Resuscitation | Immediate | Real-time monitoring |
| CTAS 2 | Emergent | ≤ 15 minutes | Continuous |
| CTAS 3 | Urgent | ≤ 30 minutes | 30-minute reassessment |
| CTAS 4 | Less Urgent | ≤ 60 minutes | 60-minute reassessment |
| CTAS 5 | Non-Urgent | ≤ 120 minutes | 120-minute reassessment |

### How to Triage a Patient

1. Open the **Pretriage queue** in Reception (`/emergency/reception?queue=pretriage`) or the **Queues** page (`/emergency/queues`).
2. Click on the patient to open the triage workspace.
3. Record vitals: BP, HR, respiratory rate, SpO₂, temperature, GCS if altered, blood glucose if indicated, pain score (0–10).
4. Review and expand the complaint: add clinical history, onset, duration, associated symptoms.
5. Select or confirm red flags. High-risk flags will be highlighted by the system.
6. Review the AI Chief triage suggestion (if displayed). This is decision support — your clinical assessment is the authority.
7. Select the **CTAS level** using the acuity selector.
8. Select patient destination: **Waiting room**, **Treatment room** (if available), or **Immediate care**.
9. Click **Complete triage**. The reassessment timer starts automatically based on CTAS level.
10. Patient moves to the Whiteboard in the appropriate zone.

### How to Override an AI Triage Recommendation

1. Review the AI suggestion in the triage workspace.
2. If your clinical assessment differs, select your assessed CTAS level instead.
3. Enter an override reason in the **Override reason** field (required).
4. Click **Complete triage with override**. The system logs: your role, timestamp, original AI suggestion, your selection, and your reason.
5. The override is available in the AI audit report for quality review.

### How to Reassess a Patient

1. Open the **Reassess** page (`/emergency/reassessment`) or find the patient on the Whiteboard with an orange/red timer badge.
2. Click the patient card to open the reassessment panel.
3. Record new vitals and any clinical change.
4. Update acuity if indicated (triage upgrade or downgrade).
5. Document findings and next action.
6. Click **Complete reassessment**. Timer resets for the next interval.

---

## 9. Critical Alert Procedure

### Purpose

Ensure that every high-risk signal is acknowledged by a named owner, acted on, and documented before the 3-minute threshold.

### Alert Severity Levels

| Severity | Color | Source | Response Required |
|---------|-------|--------|------------------|
| Critical | Red | CTAS 1/2, vital deterioration, breach | Immediate — within 3 minutes |
| High | Orange | CTAS 3 with risk flags, reassessment due | Within 15 minutes |
| Medium | Yellow | CTAS 4 with flags, operational issue | Within 60 minutes |
| Low | Blue | Informational, non-urgent | Review at next available opportunity |

### Alert Sources

- **Clinical signal:** vitals, triage, reassessment breach, diagnostic flags.
- **Operational signal:** capacity threshold exceeded, staff shortage, queue breach.
- **Service bottleneck:** degraded service affecting patient flow or safety.
- **AI Chief:** AI detects pattern risk from aggregated signals.
- **Manual escalation:** staff escalates directly from a patient record.

### How to Acknowledge a Critical Alert

1. Open Critical Alerts (`/emergency/alerts`) — or click the red badge in the top navigation.
2. Sort by **Most urgent** to see CTAS-1 and critical alerts first.
3. Click the alert card.
4. Review: **patient name**, **severity**, **source signal**, **time elapsed**, **current owner assignment**, and the **AI Chief recommendation** if present.
5. If you are the correct owner:
   - Click **Acknowledge**.
   - Enter your action statement: what you are doing right now.
   - Click **Confirm acknowledgement**.
6. If you are NOT the correct owner:
   - Click **Reassign** to route to the correct role.
   - Or click **Escalate** if the correct owner is unavailable.

### How to Escalate an Unacknowledged Alert

1. Open the alert. Check the timer — if elapsed time is approaching or past 3 minutes:
2. Click **Escalate**.
3. Select escalation target: charge nurse, physician, patient flow coordinator, or admin on call.
4. Enter escalation reason.
5. Click **Send escalation**. The system notifies the escalation target immediately.
6. The original owner also receives a notification that the alert has been escalated.

### How to Resolve an Alert

1. Open the acknowledged alert.
2. Confirm the underlying clinical or operational issue is closed.
3. Click **Resolve**.
4. Enter resolution reason: what was done, what the outcome is, and whether it was within the SLA.
5. Click **Confirm resolution**. Alert is closed and enters the analytics audit.

### How to Configure Alerts (IT Admin / Hospital Admin only)

1. Open Settings (`/emergency/settings`) → Alerts tab.
2. Set thresholds for each severity level.
3. Configure fallback channels: in-app → push → SMS → pager.
4. Set escalation chains for each department and role.
5. Click **Save configuration**. Changes apply to new alerts immediately.

---

## 10. AI Chief Review Procedure

### Purpose

Use AI decision support to get structured, explainable recommendations for complex clinical and operational decisions — while maintaining licensed clinician authority over every action.

### AI Chief Intents

The AI Chief supports 11 intents:

| Intent | What it does | Who can use it |
|--------|-------------|----------------|
| `critical_alert_assessment` | Assesses a critical alert and recommends immediate action | Physician, Charge Nurse, Patient Flow Coordinator |
| `three_minute_response_plan` | Generates a full 3-minute response plan for a critical patient | Physician, Charge Nurse |
| `patient_intake_assist` | Suggests complaint classification and red flag review | Triage Nurse, Charge Nurse |
| `triage_recommendation` | Recommends CTAS level based on vitals and complaint | Triage Nurse (advisory only — nurse owns the decision) |
| `patient_summary` | Summarizes patient history, risk, and current status | Physician, Registered Nurse, Specialist |
| `department_routing` | Recommends which ED zone or department the patient should go to | Charge Nurse, Patient Flow Coordinator |
| `staff_routing` | Recommends which staff role and available individual should own this patient | Charge Nurse |
| `handoff_summary` | Generates a handoff document for patient transfer | Physician, Charge Nurse, Registered Nurse |
| `hospital_command_insight` | Provides aggregate operational insight for the current department state | Hospital Admin, Quality & Safety Officer, Charge Nurse |
| `service_bottleneck_analysis` | Analyzes current service degradations and their patient impact | IT Admin, Patient Flow Coordinator |
| `fallback_recommendation` | Provides manual fallback procedure when services are unavailable | All roles |

### How to Use the AI Chief

1. Open the **Copilot panel** by clicking the Copilot button in the sidebar or pressing **C** on desktop.
2. The AI Chief panel opens on the right side of the screen.
3. Select the **intent** from the intent selector, or type your question in natural language.
4. If a patient context is needed, the active patient (from the Whiteboard selection) is pre-loaded. You can change the context using the patient selector.
5. Click **Ask AI Chief**.
6. Review the AI response, which includes:
   - **Recommendation** — the specific suggested action.
   - **Rationale** — why the AI is suggesting this.
   - **Uncertainty** — confidence level and what the AI does not know.
   - **Required reviewer role** — which licensed role must review before acting.
   - **Suggested owner** — who the AI recommends should take ownership.
   - **Fallback action** — what to do if AI recommendations cannot be followed.
7. Choose one of three actions:
   - **Accept** — proceed with the AI recommendation.
   - **Modify** — accept with changes. Document what you changed and why.
   - **Override** — reject the recommendation. Document your clinical reason. This is your right as the licensed clinician.
8. Document your review decision before taking any clinical action.

### How to Override an AI Recommendation

1. Review the AI Chief recommendation fully.
2. Click **Override**.
3. Enter your clinical reason in the override reason field. Be specific: what does your assessment show that differs from the AI?
4. Click **Confirm override**.
5. Take your clinical action based on your judgment.
6. The override is logged: your role, timestamp, AI intent, AI recommendation, your override reason, and your action. This feeds the AI quality review report.

### When AI Is Unavailable

If the AI Chief is unavailable (network issue, service degradation, model error):
- A banner will indicate AI is unavailable.
- Continue with your standard clinical workflow — AI is decision support, not a dependency.
- Use the **Fallback procedure** for the relevant workflow (see Section 17).
- After AI recovers, you can re-run the intent if still clinically relevant.

---

## 11. Staff Routing Procedure

### Purpose

Ensure every patient and every critical alert has a named, available, qualified human owner at all times.

### How to Assign Staff to a Patient

1. Open the patient card on the **Whiteboard** (`/emergency/whiteboard`).
2. Click the **Staff** tab or the staff assignment chip.
3. Review available staff: the system shows role, current patient load, and availability.
4. Select the appropriate nurse and physician.
5. Click **Assign**. Both staff members receive an in-app notification.
6. The patient card updates to show the assigned owner names.

### How to Route a Patient to the Right Staff (AI Chief Assist)

1. Open the AI Chief panel.
2. Select intent: `staff_routing`.
3. Review the AI recommendation: which role, which individual, and why.
4. If you agree, click **Assign** directly from the AI panel — this routes the assignment with the AI recommendation logged.
5. If you disagree, dismiss the AI suggestion and assign manually. Document override.

### How to Handle Staff Unavailability

1. If an assigned staff member becomes unavailable (off shift, patient care conflict, emergency):
2. Open the patient card → Staff tab.
3. Click **Reassign**.
4. Select the replacement staff member.
5. Document the reason for reassignment.
6. Notify the original staff member if time permits.
7. If no staff are available for a critical patient, escalate to the charge nurse immediately.

### How to Escalate Unowned Work

1. If a patient has no owner, the Whiteboard shows a **⚠ Unowned** indicator.
2. The charge nurse is notified automatically.
3. Charge nurse must assign an owner within the 3-minute window for critical patients.
4. If charge nurse is unavailable, escalate to the physician on duty.
5. Document the gap: time unowned, reason, and resolution.

---

## 12. Escalation Procedure

### When to Escalate

Escalate immediately if any of the following are true:
- Patient is unstable and the assigned owner has not acknowledged within the 3-minute window.
- A critical alert has no owner.
- Triage indicates CTAS 1 or 2 and the patient has not reached a licensed clinician.
- A service bottleneck is directly impacting patient safety.
- AI Chief has flagged a high-risk pattern and no staff have responded.
- You are unable to reach the assigned owner through any channel.

### Escalation Chain

| Level | Who receives escalation | When |
|-------|------------------------|------|
| 1 | Assigned owner | Immediately on alert creation |
| 2 | Charge nurse / backup owner | At 2:00 minutes without acknowledgement |
| 3 | Emergency physician on duty | At 3:00 minutes (breach) |
| 4 | Patient flow coordinator | If physician is also unavailable |
| 5 | Administrator on call | Sustained breach — patient safety risk |

### How to Escalate in CareDroid

1. Open the patient or alert.
2. Click **Escalate**.
3. Select the escalation target from the list (the next level is pre-suggested based on the chain).
4. Enter escalation reason — be specific: what is the clinical risk, who has been notified, what has not been resolved.
5. Click **Send escalation**. The target receives an in-app alert, push notification, and fallback channel notification.
6. Stay available — the escalation target may reach out with questions.

### How to Document an Escalation

Every escalation must include:
- Time of original signal.
- Time of escalation action.
- Who escalated (role and name).
- Who was escalated to (role and name).
- Clinical reason for escalation.
- What happened next.

This is captured automatically by the system when you use the Escalate button, but you must add the clinical reason manually.

---

## 13. Patient Handoff Procedure

### Purpose

Transfer accountable clinical ownership of a patient from one provider to another without any loss of information, priority, or risk visibility.

### Required Handoff Elements

Every handoff must include:
1. **Patient** — name, DOB, MRN, arrival time.
2. **Acuity** — current CTAS level and any changes since triage.
3. **Current risk** — active risk flags, vital status, alerts open.
4. **Destination** — where the patient is going next (room, department, discharge, transfer).
5. **Owner** — receiving clinician name and role.
6. **Next action** — what the receiving clinician must do first.
7. **AI Chief recommendation** — included only as reviewed decision support. The AI recommendation must have been reviewed before the handoff document is generated.

### How to Generate a Handoff Summary

1. Open the patient's detail panel.
2. Click **Handoff** in the action toolbar.
3. The AI Chief generates a `handoff_summary` — review it.
4. Add any information the AI missed: new orders, verbal agreements, family communications, concerns.
5. Confirm the receiving clinician from the staff selector.
6. Click **Send handoff**. The receiving clinician gets an in-app notification with the handoff document.
7. The handoff is logged with sender, receiver, timestamp, and handoff content.

### How to Accept a Handoff

1. You receive a handoff notification.
2. Open the notification. Review the handoff document completely.
3. If you accept: click **Accept handoff**. You are now the accountable owner. The sender is notified.
4. If you have questions: click **Request clarification** and send a message. The handoff stays open until both parties confirm.
5. If you cannot accept (insufficient capacity): click **Cannot accept** and explain. This triggers an escalation to the charge nurse.

### Verbal Handoff Documentation

For urgent bedside handoffs:
1. Do the verbal handoff first.
2. Immediately after, open the patient record.
3. Click **Document verbal handoff**.
4. Enter: who you handed off to, what was said, what the receiver confirmed.
5. Click **Save**. Both parties receive a shared record of the verbal handoff.

---

## 14. Department Routing Procedure

### Purpose

Move the patient to the right department, zone, or service — with a clear owner, documented reason, and confirmed destination availability.

### Routing Destinations

| Destination | When to route | Who confirms |
|-------------|--------------|-------------|
| ED treatment room | Active care ongoing | Charge Nurse |
| ED fast track | Lower acuity, quick disposition | Charge Nurse |
| Resuscitation bay | CTAS 1 — immediate | Physician |
| Lab | Specimens ordered | Lab Technician notified |
| Radiology | Imaging ordered | Radiology Technician notified |
| Pharmacy | Medication needed | Pharmacist notified |
| Specialist consult | Clinical complexity requires specialist | Specialist assigned |
| Inpatient admission | Disposition: admit | Patient Flow Coordinator + bed management |
| Transfer | Another facility | Patient Flow Coordinator + transport |
| Discharge | Disposition: discharge | Physician documents, Clerk processes |

### How to Route a Patient to a Department

1. Open the patient card on the Whiteboard.
2. Click **Route** in the action toolbar.
3. Review the current patient status, acuity, open orders, and bottlenecks.
4. Select destination from the routing menu.
5. The AI Chief `department_routing` intent is automatically consulted if enabled. Review the suggestion.
6. Confirm or change the destination.
7. Assign the department owner (the receiving staff member).
8. Click **Confirm routing**. The destination department receives a notification. The patient card updates to show the new destination.

### How to Handle a Routing Conflict

If the destination department is at capacity:
1. The system shows a **Capacity warning** with the destination department's current load.
2. Contact the **Patient Flow Coordinator** (`/emergency/capacity`).
3. Use the AI Chief `hospital_command_insight` intent to get a department capacity summary.
4. Route to the next best available option, or hold in the current zone with escalated priority.
5. Document the routing conflict and the decision reason.

---

## 15. Service Bottleneck Procedure

### Purpose

Identify service degradations early, document their patient impact, continue manual workflow, and restore service as fast as possible.

### Tracked Services

CareDroid monitors the following services for bottlenecks:

| Service | What it tracks |
|---------|---------------|
| AI | AI Chief latency, error rate, model availability |
| Auth | Login failures, token errors, session degradation |
| Patient service | Patient record create/read/update errors |
| Triage service | Triage assignment failures, timer errors |
| Alert service | Alert creation, delivery, and acknowledgement failures |
| Notification service | Push, SMS, and pager delivery failures |
| Database | Query latency, connection errors, write failures |
| Labs | Critical value delivery delays, integration errors |
| Radiology | Imaging readiness delays, PACS integration errors |
| Pharmacy | Medication order errors, drug check failures |
| Analytics | Data pipeline latency, reporting failures |
| Reporting | Report generation and export errors |
| EHR/FHIR | EHR sync errors, FHIR integration failures |
| Frontend | JavaScript errors, crash reports, performance degradation |

### How to Identify a Bottleneck

1. A **Service degraded** banner appears at the top of the page.
2. Open Settings (`/emergency/settings`) → System Health tab to see detailed bottleneck status.
3. Alternatively, open Analytics (`/emergency/analytics`) → Service Health section.
4. The AI Chief `service_bottleneck_analysis` intent generates a current bottleneck report on demand.

### How to Respond to a Service Bottleneck

1. Identify the affected service (from the banner or Settings).
2. Determine patient impact: are any patients affected by the degraded service?
3. For critical patient impact: escalate immediately using the manual escalation channel.
4. Activate the **manual fallback procedure** for the affected service (see Section 17).
5. Notify the IT Administrator via in-app or phone.
6. Document the bottleneck: start time, affected service, patient impact, manual actions taken.
7. When service recovers: click **Acknowledge recovery** in Settings. Back-enter any events that occurred during the outage.

### How to Continue When AI Is Degraded

- Use your clinical judgment and standard protocols.
- Access the **Fallback procedure** for the relevant workflow from the Help page (`/emergency/help`).
- All clinical workflows must continue without AI — AI is decision support, not a dependency.
- Document all decisions made during AI degradation with a note indicating AI was unavailable.

---

## 16. Analytics and Reports Procedure

### Purpose

Track operational performance, patient flow quality, alert response rates, AI review patterns, and safety outcomes to continuously improve emergency department performance.

### Key Metrics

| Metric | Definition | SLA Target |
|--------|-----------|-----------|
| Door-to-triage time | Arrival to CTAS assignment | < 10 minutes |
| Door-to-provider time | Arrival to physician assessment | CTAS 1: immediate; CTAS 2: < 15 min; CTAS 3: < 30 min |
| Alert response time | Alert creation to acknowledgement | Critical: < 3 minutes |
| Breach rate | Alerts exceeding SLA / total alerts | < 5% |
| AI review rate | AI recommendations reviewed / total recommendations | > 90% |
| AI override rate | AI overrides / total AI recommendations | Baseline tracking |
| Reassessment compliance | Reassessments completed on time / total due | > 95% |
| Left without being seen (LWBS) | Patients who left before triage or provider | < 2% |

### How to View the Analytics Dashboard

1. Open Analytics (`/emergency/analytics`).
2. Set the date range (today, last 7 days, last 30 days, custom).
3. Select the department filter if applicable.
4. Review the KPI summary at the top: door-to-triage, door-to-provider, alert response, breach rate.
5. Scroll down to see trend charts, bottleneck events, AI review summary, and LWBS tracking.

### How to Generate a Report

1. Open Analytics (`/emergency/analytics`) → Reports tab.
2. Select report type: throughput, alert response, AI review, bottleneck, quality review, or custom.
3. Set parameters: date range, department, role filter.
4. Click **Generate report**.
5. Review the report in the viewer.
6. Click **Export** to download as PDF or CSV.

### How to Review AI Quality Data

1. Open Analytics → AI Chief Review tab.
2. Filter by intent, date range, and override status.
3. Review: total AI requests, acceptance rate, modification rate, override rate, and override reasons.
4. This data feeds the quarterly AI quality review for the Quality & Safety Officer.

---

## 17. Downtime and Fallback Procedure

### When to Activate Downtime Procedure

Activate immediately when any of the following occur:
- CareDroid is inaccessible from all workstations.
- The backend is unreachable and the banner confirms connectivity failure.
- A critical service is degraded and patient safety is at risk.
- IT Administrator confirms a planned or unplanned outage.

### During Downtime

1. **Do not wait for the system.** Begin manual workflow immediately.
2. Use your hospital's approved downtime forms for patient registration, triage, and orders.
3. Use phone, pager, overhead page, and radio for all urgent communications.
4. Charge nurse maintains a paper-based patient board during downtime.
5. Document all clinical decisions and events on paper with time stamps.
6. Critical alerts: use your hospital's manual escalation chain without delay.

### After Recovery

1. IT Administrator announces recovery through your hospital's communication channel.
2. Log into CareDroid and confirm your patient list is complete and accurate.
3. Back-enter all events that occurred during downtime:
   - Patient registrations
   - Triage assignments and acuity changes
   - Alert acknowledgements and escalations
   - Clinical decisions and orders
   - Handoffs and dispositions
4. Enter only verified facts from your downtime documentation.
5. Do not guess or reconstruct — if an event is not documented, mark it as **Unrecorded during downtime**.
6. Notify Quality & Safety Officer that a downtime event occurred.

### Fallback by Service

| Service Degraded | Fallback Action |
|----------------|----------------|
| AI Chief unavailable | Use clinical judgment. Standard protocols only. No AI recommendations. |
| Notifications failed | Use phone/pager directly. Log manual notifications in patient record. |
| Alert service down | Charge nurse manually monitors patient board and escalates verbally. |
| EHR/FHIR sync down | Document in CareDroid only. Do not send to EHR until sync recovers. |
| Analytics down | Continue operations. Analytics will reconstruct from event log on recovery. |
| Auth service down | Contact IT Admin immediately. Use read-only downtime access if available. |

---

## 18. Troubleshooting

### I can't see a page I expect

1. Check your role — open your **Profile** to confirm your current role.
2. Open **Help** (`/emergency/help`) and search for the page name.
3. If your role should have access but the page is missing, contact IT Admin.
4. IT Admin checks `src/lib/users/canonicalAccess.ts` and the `unified-navigation.config.ts` for the route.

### A patient is missing from my list

1. Search **Patients** (`/emergency/patients`) by name, MRN, or complaint.
2. Check **Reception** — the patient may be in the verification or pretriage queue.
3. Check **EMS** — if an EMS arrival, the patient may still be in pre-arrival status.
4. If the patient was registered verbally, they may not be in the system. Register manually.
5. If you believe the patient record was deleted in error, contact IT Admin — records are audited and recoverable.

### The AI Chief gives an unexpected recommendation

1. This is expected — AI can be wrong. Your clinical judgment takes priority.
2. Override the recommendation and document your reason.
3. If the AI is consistently giving dangerous or incorrect recommendations, report this to your IT Admin or Quality & Safety Officer immediately.
4. Do not suppress the AI — override it. Override data improves the system.

### An alert is not delivered to me

1. Check your profile → Notifications — confirm your notification preferences are set correctly.
2. Check if another staff member already acknowledged the alert.
3. If you believe you missed a critical alert that should have reached you, notify your charge nurse.
4. IT Admin reviews the notification delivery log in Settings → System Health.

### The service health banner is showing degradation

1. Open Settings → System Health to see which service is degraded.
2. Review the patient impact level: is this affecting active critical patients?
3. If critical patient impact: escalate immediately using manual channels.
4. Activate the fallback procedure for the affected service.
5. Contact IT Admin.

---

## 19. Glossary

**AI Chief** — CareDroid's decision-support node. Provides structured, explainable recommendations for 11 clinical and operational intents. AI Chief never diagnoses, prescribes, or takes clinical action without licensed clinician review.

**Acuity** — Clinical urgency level assigned by triage. CareDroid uses CTAS 1–5.

**Alert** — A signal generated by a clinical, operational, or system source that requires acknowledgement, action, or escalation.

**Acknowledgement** — A logged record that a named authorized user has received and accepted ownership of an alert or event.

**Bottleneck** — A degraded service or workflow delay that affects patient flow, care delivery, or system reliability.

**Breach** — The failure to meet a time-based SLA. A 3-minute breach is recorded when a critical alert is not acknowledged within 3 minutes.

**CTAS** — Canadian Triage and Acuity Scale. Five levels of urgency from 1 (resuscitation) to 5 (non-urgent).

**Compiled profile** — The runtime identity object assembled from a user's role, organization, and feature flags. Controls navigation, actions, AI access, alert scope, and staff scope.

**Critical alert** — A high-severity alert requiring acknowledgement within 3 minutes and escalation if unacknowledged.

**Demo Observer** — A read-only demonstration role showing realistic ED simulation data without write access.

**Disposition** — The clinical decision about where a patient goes next: admit, transfer, or discharge.

**EMS** — Emergency Medical Services. Paramedic-staffed ambulance units managed through the EMS module.

**Escalation** — The act of routing an unresolved issue to a higher authority because the current owner cannot resolve it within SLA.

**Handoff** — The documented transfer of accountable clinical ownership from one provider to another.

**LWBS** — Left Without Being Seen. A patient who left the ED before receiving triage or provider assessment.

**Override** — A clinician's documented decision to reject an AI recommendation. Overrides are logged and reviewed by Quality & Safety.

**Pilot mode** — A feature gate that limits the visible navigation to core ED workflows, hiding advanced platform modules.

**Reassessment** — A scheduled re-evaluation of a waiting patient. Missed reassessments generate alerts.

**Role** — A named clinical or administrative identity that defines a user's scope within CareDroid.

**3-minute timer** — The SLA clock that starts when a critical or high-acuity patient signal is captured. A named owner must acknowledge within 3 minutes or the system escalates automatically.

**Triage** — The clinical process of assigning acuity level, recording vitals, capturing complaint, and routing the patient to the appropriate care pathway.
