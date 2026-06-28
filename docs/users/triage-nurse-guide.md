# CareDroid: Triage Nurse Guide

**Role:** Triage Nurse (`triage_nurse`)  
**Version:** Pilot 2026

---

## Purpose

You assign the clinical priority that determines how fast every patient is seen. CareDroid surfaces the patients who need you most, provides AI-assisted classification support, and tracks every reassessment timer so nothing is missed.

---

## Your Screens

| Screen | Route | Use |
|--------|-------|-----|
| Department Whiteboard | `/emergency/whiteboard` | Overview, high-risk patients |
| Triage Queues | `/emergency/queues` | **Your primary work queue** |
| Reception Workspace | `/emergency/reception` | Review arrivals, assist with intake |
| Reassessment | `/emergency/reassessment` | Patients with overdue timers |
| AI Copilot | `/emergency/copilot` | Clinical support for triage decisions |

---

## Daily Workflow

### Start of Shift
1. Open **Triage Queues** (`/emergency/queues?queue=pretriage`)
2. Review the Pretriage Queue — patients ready from reception
3. Check **Department Whiteboard** for patients with `ReassessmentDue` flags

### During Shift
4. Pick the **first patient** from Pretriage Queue
5. Open patient card → complete assessment:
   - **Vital signs**: HR, BP, RR, SpO2, Temperature, GCS
   - **Primary complaint detail**: expand chief complaint with specifics
   - **Acuity assignment**: P1 (Resuscitation) → P5 (Non-Urgent)
6. **AI Triage Assist Panel** appears alongside — review AI suggestions:
   - Relevant clinical scores (NEWS2, qSOFA, MEWS)
   - Red flag warnings from chief complaint analysis
   - Recommended next steps
   - (AI cannot assign acuity — you decide)
7. Patient moves to **Triage → Waiting** state
8. Patient card appears on whiteboard with your assigned priority badge
9. If P1/P2 is assigned: `CriticalAlertBanner` fires — charge nurse and physicians are notified
10. Monitor **ReassessmentAttentionStrip** — act on overdue patients
11. Complete reassessments in **Reassessment screen** or via drawer (press `R`)

### Reassessment Intervals
| Acuity | Target Interval |
|--------|----------------|
| P1 | Continuous |
| P2 | Every 15 minutes |
| P3 | Every 30 minutes |
| P4 | Every 60 minutes |
| P5 | Every 120 minutes |

### End of Shift
- Ensure all patients in Pretriage Queue are assessed or handed off
- Confirm all `ReassessmentDue` flags are addressed
- Verify no patients have been waiting more than 2× their target interval

---

## You Can

- View all active patients on the whiteboard
- Assign acuity (P1–P5) to patients
- Record vital signs and assessment findings
- Monitor and complete patient reassessments
- View reception workspace and assist with intake
- Use AI Triage Assist Panel for classification support
- Use AI Copilot for clinical questions
- View patient queue status

## You Cannot

- Access EMS Pipeline screen (charge nurse responsibility)
- Create specialist referrals
- Access capacity and boarding management
- Assign rooms (charge nurse responsibility)
- Access analytics and settings

---

## AI Triage Assist Panel

The AI Triage Assist Panel appears when you open a patient for triage assessment. It provides:

| AI Output | Purpose | Your Action |
|-----------|---------|-------------|
| NEWS2 score | Calculates score from entered vitals | Review — adjust acuity if needed |
| qSOFA flags | Sepsis screening (if RR ≥ 22, AMS, SBP ≤ 100) | Review — escalate if ≥ 2 |
| Red flags | Chief complaint warning patterns | Review each flag |
| Score recommendations | Suggests most relevant calculators | Open and run if relevant |

**Important:** The AI cannot assign acuity. It supports your decision. You decide.

---

## Acuity Reference

| Level | Name | Target Time to Physician |
|-------|------|-------------------------|
| P1 | Resuscitation | Immediately |
| P2 | Emergent | ≤ 15 minutes |
| P3 | Urgent | ≤ 30 minutes |
| P4 | Semi-Urgent | ≤ 60 minutes |
| P5 | Non-Urgent | ≤ 120 minutes |

---

## Red Flags That Require P1 or P2

- Altered mental status (GCS < 14)
- Respiratory distress (SpO2 < 92%, RR > 30)
- Hemodynamic instability (SBP < 90 or HR > 120)
- Chest pain with diaphoresis or radiation
- Stroke symptoms (facial droop, arm weakness, speech difficulty)
- Severe pain (10/10)
- Pediatric: PEWS ≥ 4

---

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `?` | Open help guide |
| `R` | Open reassessment drawer |
| `Cmd+K` | Command palette |

---

## Safety Rules

1. Never delay P1/P2 triage for intake documentation — assess vitals first
2. Trust clinical judgment over AI suggestions — AI is support only
3. When in doubt, assign a higher acuity (err toward caution)
4. Every reassessment timer breach requires action — never ignore
5. Sepsis screening: check qSOFA on every adult with infection complaint
