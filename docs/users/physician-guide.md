# CareDroid: Emergency Physician Guide

**Roles:** `emergency_physician`, `attending_physician`, `resident_physician`  
**Version:** Pilot 2026

---

## Purpose

CareDroid gives you a live patient picture and AI clinical decision support so you can focus on assessment and treatment, not administrative overhead. The AI Chief (Copilot) is your on-call clinical intelligence assistant.

---

## Your Screens

| Screen | Route | Use |
|--------|-------|-----|
| Department Whiteboard | `/emergency/whiteboard` | Overview of all active patients |
| AI Copilot (AI Chief) | `/emergency/copilot` | Clinical decision support |
| Reassessment | `/emergency/reassessment` | Patients awaiting your review |
| Referrals | `/emergency/referrals` | Create and manage specialist referrals |
| Analytics | `/emergency/analytics` | Performance and outcome review |
| Clinical Documentation | `/emergency/documentation` | AI-assisted note generation |
| Medical Tools | `/emergency/tools` | 242 clinical calculators and AI tools |

---

## Daily Workflow

### Start of Shift
1. Open **Department Whiteboard** in Physician screen mode (`?mode=physician`)
2. Review high-acuity patients (P1/P2 — red and orange cards)
3. Check **Reassessment** for patients awaiting physician review
4. Open **AI Copilot** and review any flagged patients from overnight

### During Shift
5. Use whiteboard filter **High Risk** to prioritize assessments
6. Open patient card → review vitals, timeline, flags, AI summary
7. Ask **AI Copilot** for:
   - Patient summary ("Summarize this patient")
   - Differential ("What are the differentials for this presentation?")
   - Score calculation ("Calculate HEART score for this patient")
   - Guideline reference ("What is the sepsis protocol?")
8. Use **Medical Tools** for clinical calculators directly
9. Create **Referrals** when specialist consult is needed
10. Document assessments using **Clinical Documentation Assistant**

### End of Shift
11. Ensure all active patients have updated notes
12. Confirm all referrals are tracked
13. Complete any outstanding reassessments
14. Review shift analytics

---

## You Can

- View all active patients on the whiteboard
- Open and review patient cards, vitals, timeline, clinical notes
- Use AI Copilot for full clinical support
- Access all 242 clinical tools (calculators, protocols, AI analysis)
- Create specialist referrals
- Record assessments and dispositions
- Use Clinical Documentation Assistant
- View analytics

## You Cannot

- Access Reception workflow (registration is reception's responsibility)
- Access EMS Pipeline (coordination is charge nurse's responsibility)
- Access settings and admin console
- Independently discharge without proper disposition

---

## AI Copilot — Your Clinical Partner

The AI Chief is available 24/7 in the Copilot panel (sidebar) or at `/emergency/copilot`.

### What to Ask

| Clinical Need | Example Query |
|---------------|--------------|
| Patient summary | "Give me a summary of patient [X]" |
| Differential diagnosis | "What are the top differentials for acute chest pain with diaphoresis?" |
| Score calculation | "Calculate qSOFA for HR 110, RR 24, altered mentation" |
| Guideline lookup | "What is the threshold for CT in suspected PE?" |
| Drug check | "Check for interactions between warfarin and amoxicillin" |
| Lab interpretation | "Interpret these ABG results: pH 7.28, pCO2 50, pO2 68, HCO3 22" |
| Protocol reference | "Sepsis Bundle 3-hour protocol" |
| Antibiotic guide | "Community-acquired pneumonia antibiotic recommendation" |

### Safety Reminders
- AI suggestions are clinical support, not orders
- Always apply your own judgment
- Confidence score is shown on every AI response
- All AI interactions are logged for audit

---

## Clinical Tools Quick Reference

### Emergency Scores
- NEWS2 (`/tools/calculators/news2`) — Early warning
- qSOFA (`/tools/calculators/qsofa`) — Sepsis screening
- GCS (`/tools/calculators/gcs`) — Consciousness level
- SOFA (`/tools/calculators/sofa`) — Organ dysfunction

### Cardiovascular
- HEART Score (`/tools/calculators/heart-score`)
- Wells PE (`/tools/calculators/wells-pe`)
- CHA₂DS₂-VASc (`/tools/calculators/chads2vasc`)

### Neurology
- NIHSS (`/tools/calculators/nihss-summary-view`)
- GCS (`/tools/calculators/gcs`)
- ICH Score (`/tools/calculators/ich-score`)

### Respiratory
- CURB-65 (`/tools/calculators/curb-65`)
- PaO₂/FiO₂ (`/tools/calculators/pao2-fio2-ratio`)
- ROX Index (`/tools/calculators/rox-index`)

---

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `?` | Open help guide |
| `Cmd+K` | Command palette (search tools, jump to patient) |
| `R` | Open reassessment drawer |

---

## Best Practices

1. **Check AI before manually calculating scores** — Copilot can run NEWS2, qSOFA, HEART against the patient's existing vitals
2. **Use the patient timeline** — See the full clinical journey without reading through notes manually
3. **Create referrals early** — Early referral prevents boarding delays
4. **Document with AI assist** — Clinical Documentation Assistant reduces note-writing time by ~40%
5. **Acknowledge critical alerts** — Unacknowledged critical alerts are visible to the whole team
