# CareDroid: Executive Guide

**Roles:** `ed_director`, `hospital_admin`, `super_admin`  
**Version:** Pilot 2026

---

## What CareDroid Does for Your Department

CareDroid is your real-time operational intelligence layer for the Emergency Department. It:

1. **Reduces time from arrival to clinician action** — the system's core purpose
2. **Shows you the department's pulse** in real time, not in daily reports
3. **Prevents bottlenecks before they become crises** — alerting before capacity reaches critical
4. **Documents AI-assisted decisions** — audit-ready, compliance-ready
5. **Gives every role the information they need** — without overwhelming anyone

---

## Your Command Center View

Open the whiteboard in **Command Center mode** to see the full operational picture:

`/emergency/whiteboard?mode=command`

### What You See in Command Center Mode

| KPI | Meaning | Target |
|-----|---------|--------|
| Triage Awaiting | Patients in pretriage | < 3 |
| Longest Untriaged Wait | Time in pretriage of longest patient | < 15 min |
| Provider Awaiting | Patients waiting for physician | Acuity-dependent |
| Avg Wait (Triage) | Average time from registration to triage | < 10 min |
| Avg Wait (Provider) | Average time from triage to physician | < 30 min (P3) |
| EMS Inbound | Ambulances en route | Situational |
| EMS Offload Delays | Units exceeding offload target | = 0 |
| Boarding Duration | Average ED boarding time for admitted patients | < 2 hrs |
| Capacity Score | 0–100 operational load | < 75 (Yellow) |
| LWBS Risk | Left-Without-Being-Seen predictor | Low |

---

## Key Reports

| Report | Route | Frequency |
|--------|-------|-----------|
| Daily throughput | `/emergency/analytics` | Daily |
| Shift summary | `/emergency/shift` | Per shift |
| Department pulse | `/emergency/pulse` | Real-time |
| Audit trail | `/admin/audit-trail` | Weekly/on demand |
| AI governance | `/ai-governance` | Monthly |

---

## What the 3-Minute Principle Means Operationally

CareDroid is built around the principle that **the first 3 minutes of care can save a life**. This translates to:

- **Critical alerts must be acknowledged within 3 minutes** — banner appears on whiteboard, visible to charge nurse and physician
- **EMS offload target is 15 minutes** — tracked live, breach triggers alert
- **Reassessment breaches are surfaced immediately** — no patient's condition change goes undetected
- **Triage is time-constrained** — longest untriaged wait is a primary KPI

---

## How to Read the Capacity Band

| Band | Score | What It Means | Action |
|------|-------|---------------|--------|
| Green | 0–60 | Normal operations | Monitor |
| Yellow | 60–75 | Elevated load | Begin contingency review |
| Orange | 75–90 | High load | Activate surge preparation |
| Red | 90–100 | Crisis | Activate surge protocol, escalate to C-suite |

When the band reaches **Red**, the whiteboard automatically switches to **Capacity Crisis Mode** — showing only the most urgent operational information.

---

## Performance Benchmarks

| Metric | Industry Standard | CareDroid Target |
|--------|------------------|-----------------|
| Door-to-triage | ≤ 15 min | < 3 min (registration) + < 10 min (triage) |
| Door-to-physician | ≤ 60 min (P3) | ≤ 30 min |
| EMS offload | ≤ 30 min | ≤ 15 min |
| Left Without Being Seen | < 2% | Minimize via queue intelligence |
| Boarding duration | ≤ 4 hrs | ≤ 2 hrs |

---

## AI Governance Summary

Every AI decision in CareDroid is:
- **Logged** with model, reasoning, and confidence score
- **Human-reviewed** before any clinical action
- **Auditable** — full AI audit trail available to you
- **Never autonomous** — AI assists, clinicians decide

You can review AI performance at `/ai-governance`.
