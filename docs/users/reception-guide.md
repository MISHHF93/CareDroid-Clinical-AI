# CareDroid: Reception Guide

**Role:** Registration Clerk (`registration_clerk`)  
**Version:** Pilot 2026

---

## Purpose

You are the first clinical touchpoint for every patient who enters the Emergency Department. CareDroid's reception-first design means your workflow is the foundation every other role builds on. Your job is to register patients, verify their identity, and hand them off to the triage nurse — as fast as possible.

**Target:** Every walk-in patient ready for triage within 3 minutes of arrival.

---

## Your Screens

| Screen | Route | Use |
|--------|-------|-----|
| Reception Workspace | `/emergency/reception` | **Your home screen** — start here |
| Smart Intake | Embedded in Reception | Patient registration form |

> **Note:** The whiteboard, EMS pipeline, and clinical screens are not available to your role. This is intentional — reception-first means you handle arrivals, not clinical decisions.

---

## Daily Workflow

### Start of Shift
1. Open **Reception Workspace** (`/emergency/reception`)
2. Check **EMS Pre-Arrival** rail — see any inbound ambulances
3. Check **Verification Queue** — any patients from prior shift needing ID verification
4. Check **Pretriage Queue** — any patients from prior shift not yet picked up by nurse

### During Shift
5. When a patient walks in → press **Register walk-in**
6. Complete **Smart Intake** (embedded in reception):
   - Chief complaint (primary reason for visit)
   - Patient name, date of birth, sex, phone number
   - AI suggests classification → you review
7. Patient moves to **Verification Queue**
8. Verify identity (ID scan or manual confirmation)
9. Patient moves to **Pretriage Queue**
10. Triage nurse picks up patient from Pretriage Queue
11. When EMS unit arrives → convert to patient record: press **Convert EMS**
    - Review EMS unit details
    - Complete verification → patient moves to Pretriage

### High-Priority Shortcut
If a patient presents with obvious red flags (severe distress, unresponsive, severe pain):
- Register immediately with chief complaint only
- Flag as **Escalate** during intake
- Triage nurse is notified immediately

### End of Shift
- Confirm Pretriage Queue is cleared or handed off
- Confirm no pending Verification Queue items

---

## You Can

- Register walk-in patients
- Complete Smart Intake
- Verify patient identity
- Convert EMS arrivals to patient records
- View and manage Verification Queue
- View and manage Pretriage Queue
- View inbound EMS pre-arrival information

## You Cannot

- Access the Department Whiteboard
- Assign triage acuity
- View clinical assessments or notes
- Access the EMS Pipeline screen
- Access clinical calculators
- Access the AI Copilot

---

## Smart Intake Steps

1. **Chief Complaint** — type what the patient says ("chest pain", "difficulty breathing")
2. **Demographics** — name, date of birth, sex, contact number
3. **AI Classification** — system shows suggested urgency → you review and confirm or override
4. **Submit** — patient appears in Verification Queue

> You are not assigning acuity. The AI classification is a suggestion for the triage nurse. Your job is to capture the information accurately.

---

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `N` | New patient registration |
| `?` | Open help guide |
| `Esc` | Close current drawer |

---

## EMS Conversion Workflow

When an ambulance arrives:

1. EMS Pre-Arrival rail shows the unit with **Arrived** status
2. Press **Convert EMS** on the unit card
3. Review pre-arrival data (unit ID, reported condition, crew)
4. Complete patient demographics (name, DOB)
5. Patient record created
6. Patient appears in Verification Queue
7. Verify and route to Pretriage as normal

---

## Tips for Fast Registration

- Use the **keyboard shortcut N** to open new registration instantly
- If patient cannot speak, enter name as "Unknown" and DOB as "00/00/0000" — complete after triage
- Abbreviate chief complaints when under pressure: "CP" for chest pain, "SOB" for shortness of breath
- For regular visitors (return patients), search by name or DOB first — record may already exist
- The AI classification appears automatically after typing the chief complaint — you don't need to wait for it

---

## Safety Rules

1. Never attempt to assign acuity — forward the patient to triage immediately
2. If a patient appears critical (not breathing, unconscious, severe distress) → call triage nurse immediately, register after
3. All patient data entered is visible to clinical staff — accuracy matters
4. Identity verification must be completed before the patient reaches clinical assessment
