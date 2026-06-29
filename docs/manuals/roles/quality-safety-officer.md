# Quality & Safety Officer Manual

**Role ID:** `quality_safety_officer`  
**Landing page:** `/emergency/analytics`  
**Mission:** Find what went wrong before it happens again. Protect patients through data, patterns, and accountability.

---

## Role Purpose

The Quality & Safety Officer reviews safety trends, breach events, AI review patterns, and alert audit evidence. You do not take clinical action — you analyze what happened after the fact and produce findings that improve how the department operates. Your review feeds the quality improvement cycle: breach patterns → root cause → system change. You have read access to the full audit trail, all alert lifecycle data, and all AI override records.

---

## Dashboard View

**Analytics** (`/emergency/analytics`) — Primary workspace. Quality-focused views:
- Breach rate trends (3-minute, reassessment, CTAS time-to-physician)
- AI review rate and override rate
- Alert acknowledgement time distribution
- LWBS trends
- Service bottleneck frequency and duration

**Audit** (via Settings → Audit) — Full immutable audit trail. Filterable by event type, role, user, patient, and date range.

**Alerts** — Read access to all alert lifecycle events: creation, acknowledgement, escalation, resolution.

**Reports** — Quality, safety, AI governance, and compliance report generation.

---

## Allowed Actions

- View all analytics data (read-only)
- Review the full audit trail (read-only, exportable)
- Generate and export quality, safety, and compliance reports
- Review all alert lifecycle records
- Review AI Chief recommendation and override records
- Flag quality issues for follow-up in the report system

## Restricted Actions

- Cannot modify patient records or clinical data
- Cannot take clinical action on patients
- Cannot change user roles or system settings
- Cannot acknowledge or resolve active clinical alerts

---

## Daily Workflow

### How to Review the Quality Dashboard

1. Open **Analytics** (`/emergency/analytics`).
2. Set the date range to the period under review (today, last 7 days, last 30 days).
3. Navigate to the **Quality Review** tab.
4. Review the breach queue:
   - How many 3-minute SLA breaches occurred in the period?
   - What is the trend — improving or worsening?
   - Which patient types (CTAS level, complaint category) are associated with breaches?
5. Review the reassessment compliance rate.
6. Review LWBS rate.
7. Review AI override rate: are clinicians overriding AI at an unusual rate? Are the reasons documented?

### How to Investigate a Breach Event

1. In **Analytics** → Breach tab, click a specific breach event.
2. The breach timeline opens: signal time, triage time, alert creation time, acknowledgement time, escalation events, resolution time.
3. Review each step: who had ownership, when they received the alert, what they acknowledged, how long each step took.
4. Cross-reference with the audit trail: open **Settings** → Audit and search by patient MRN and date/time.
5. Identify the root cause:
   - Was the alert delivered but not acknowledged? (communication failure)
   - Was the alert not generated? (detection failure)
   - Was the alert acknowledged but action not taken? (follow-through failure)
   - Was the system unavailable at the time? (service failure)
6. Document the root cause finding in the quality report.

### How to Review AI Override Records

1. Open **Analytics** → AI Chief Review tab.
2. Set the date range.
3. Filter by intent type if reviewing a specific workflow (e.g., `triage_recommendation` overrides).
4. Review:
   - Total AI recommendations in the period
   - Acceptance rate
   - Modification rate (accept with changes)
   - Override rate (reject with documented reason)
   - Override reason text — look for patterns
5. High override rates on a specific intent may indicate:
   - AI quality issue (model is giving poor recommendations)
   - Clinician distrust (training or transparency needed)
   - Workflow mismatch (the intent is not applicable to how this team works)
6. Document your findings. Escalate to IT Admin or Medical Director if a quality intervention is needed.

### How to Generate a Quality Report

1. Open **Analytics** → Reports → **Quality & Safety Report**.
2. Set parameters: date range, department, metric type.
3. Click **Generate report**.
4. Review the report in the viewer.
5. Add your narrative commentary in the report notes field.
6. Click **Export PDF**. Share through your hospital's quality governance process.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Breach rate threshold exceeded | The 3-minute breach rate for the period has exceeded the SLA target | Review breach queue, investigate root cause |
| Unresolved critical alert — extended | A critical alert has been open beyond an extended threshold | Review alert lifecycle for quality issue |
| AI override trend | AI override rate has exceeded a significant threshold in a short period | Review override records; investigate for quality issue |
| Audit anomaly | An unusual pattern in the audit trail has been detected | Review the flagged audit events |

---

## AI Features Available

- Read access to AI Chief analytics (acceptance rate, override rate, override reasons by intent)
- `fallback_recommendation` — Procedure steps if CareDroid analytics are unavailable

You do NOT have access to clinical AI intents that take action on patient records.

---

## Fallback Procedures

### If CareDroid analytics are unavailable

1. Export available data from the audit trail before the outage if possible.
2. Use your hospital's manual quality review process.
3. After recovery, use the Analytics dashboard to reconstruct the period under review.
4. Events that occurred during downtime may be incomplete — flag them as "Downtime period — data may be incomplete" in your report.

---

## Troubleshooting

**Breach data looks wrong — the number seems too high or too low.** Check the date range filter. Confirm the department filter is set correctly. Check if a downtime event during the period may have caused incomplete data.

**I can't see audit records for a specific patient.** Confirm you have the correct MRN. Audit records may be filtered by department — ensure your filter includes the patient's department. Contact IT Admin if records appear to be missing.

**An AI override record doesn't have a documented reason.** This should not happen — the system requires an override reason. Flag this in the quality report. IT Admin can investigate whether the override reason field had a technical issue at that time.

**I found a safety event in the audit trail that no one reported.** Follow your hospital's incident reporting protocol. Document the event with the audit record as supporting evidence. Notify the appropriate clinical leadership and risk management.
