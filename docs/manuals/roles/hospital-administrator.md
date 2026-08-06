# Hospital Administrator Manual

> **Related:** [`docs/users/administrator-guide.md`](../../users/administrator-guide.md) covers this and related admin roles (`hospital_admin`, `ed_director`, `super_admin`) in a shorter guide format. Flagged as overlapping documentation in the [Documentation Center](../../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Role ID:** `hospital_admin`  
**Landing page:** `/emergency/analytics`  
**Mission:** Maintain operational excellence. Know the numbers. Protect patient flow. Support your teams.

---

## Role Purpose

The Hospital Administrator has oversight of hospital operations, aggregate performance, staffing posture, and system configuration. You access the analytics dashboard for performance data, the capacity dashboard for department state, and settings for hospital-level configuration. You are not in the day-to-day clinical loop — you are responsible for the system and the staffing model that enables clinicians to operate safely. When escalations reach you, they are high-stakes operational events.

---

## Dashboard View

**Analytics** (`/emergency/analytics`) — Your primary dashboard. KPIs: door-to-triage, door-to-physician, alert response time, breach rate, AI review rate, throughput, LWBS.

**Capacity** (`/emergency/capacity`) — Hospital-wide bed map. Boarding count, department status, surge score.

**Shift** (`/emergency/shift`) — Shift handoff summary across all departments.

**Settings** (`/emergency/settings`) — User management, alert configuration, integration health, feature flags.

**Reports** — Generate and export performance, quality, and compliance reports.

---

## Allowed Actions

- View all analytics and reports
- Generate and export reports (PDF, CSV)
- Configure system settings (user management, alert thresholds, feature flags)
- Acknowledge operational escalation alerts
- Request AI Chief: `hospital_command_insight`, `service_bottleneck_analysis`, `fallback_recommendation`
- View capacity data across all departments

## Restricted Actions

- Cannot directly modify clinical patient records (unless also licensed as a clinician and separately provisioned)
- Clinical diagnosis, prescription, treatment, and acuity assignment require clinical licensure

---

## Daily Workflow

### How to Review the Daily Dashboard

1. Open **Analytics** (`/emergency/analytics`).
2. Set date range to today.
3. Review KPI summary at the top:
   - Door-to-triage time (target: <10 minutes)
   - Door-to-physician time (by CTAS level — see SLA targets)
   - Alert response time (critical alerts: <3 minutes)
   - Breach rate (critical alert SLA breaches per day — target <5%)
   - LWBS rate (left without being seen — target <2%)
4. Review the trend charts: are any metrics trending in the wrong direction?
5. Review the **Service Health** section: are any services degraded?
6. Review **AI Chief review rate** — are clinicians reviewing AI recommendations at an appropriate rate?
7. Use AI Chief `hospital_command_insight` for a natural language summary of the hospital state.

### How to Configure Users and Roles

1. Open **Settings** (`/emergency/settings`) → Users tab.
2. Review the active user list. Filter by role or department.
3. To add a user: click **Add User** → enter name, email, role → Save.
4. To change a role: find the user → click **Edit** → change role → Save. The user's access profile recompiles on next login.
5. To deactivate a user: click **Deactivate** → confirm. The user cannot log in but their audit record is preserved.
6. To review a user's permissions: click **View profile** → Permissions tab.

### How to Configure Alert Thresholds

1. Open **Settings** (`/emergency/settings`) → Alerts tab.
2. Review existing thresholds: which severity levels are set for which complaint types?
3. To adjust a threshold: select the alert type → change the threshold values → Save.
4. Changes apply to new alerts immediately. They do not retroactively change active alerts.
5. Document all threshold changes in the settings audit log (visible to Quality & Safety Officer).

### How to Respond to an Operational Escalation

When you receive an escalation (capacity critical, sustained breach, service outage):
1. Open the alert or escalation notification.
2. Review the situation summary.
3. Use AI Chief `hospital_command_insight` for a full picture.
4. Take executive action:
   - For capacity: activate surge protocol, authorize overflow beds, expedite discharges.
   - For staffing gap: authorize overtime or agency staffing.
   - For service outage: confirm IT Admin is engaged; authorize downtime protocol.
   - For safety event: activate incident command, notify risk management.
5. Document your actions and decisions with timestamp.

### How to Generate a Report

1. Open **Analytics** (`/emergency/analytics`) → Reports tab.
2. Select report type: throughput, quality, AI review, breach, bottleneck, or compliance.
3. Set parameters: date range, department, filter by role if needed.
4. Click **Generate report**.
5. Review in the viewer. Use the AI summary if available.
6. Click **Export** to download PDF or CSV.
7. Share through your hospital's governance process.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Capacity critical — hospital-wide | Multiple departments at or near capacity | Activate surge protocol |
| Breach trend threshold | Breach rate has exceeded acceptable threshold for the period | Review breach data, convene operational response |
| Service degradation — critical impact | A service outage is impacting patient safety | Confirm IT Admin is engaged; activate downtime if needed |
| Staffing gap escalation | A department is understaffed and escalation has reached administrator level | Authorize coverage |
| 5-minute escalation — admin level | A critical alert has not been resolved after all lower escalation levels | Take direct action |

---

## AI Features Available

| Intent | What it gives you |
|--------|------------------|
| `hospital_command_insight` | Aggregate operational state: queue depths, surge score, breach risk, bottlenecks, AI review posture |
| `service_bottleneck_analysis` | Which services are degraded, patient impact, and recovery steps |
| `fallback_recommendation` | Manual fallback procedure for any degraded service |

---

## Fallback Procedures

### If CareDroid is unavailable

1. Activate your hospital's incident command protocol.
2. Convene an emergency operations huddle with department heads.
3. Use your hospital's manual bed board and phone communication.
4. After recovery, review the analytics dashboard for what happened during the outage.

---

## Troubleshooting

**Analytics is showing data I don't recognize.** The analytics dashboard shows all ED events for the selected time range. Use the department and role filters to narrow scope. If you see data from other hospitals (multi-site), check the department filter.

**A user is reporting they can't access a page they should have access to.** Open Settings → Users → find the user → View profile → Permissions. Confirm their role is correct. If the role looks right, the user may need to log out and back in for the compiled profile to refresh.

**Reports aren't generating — they show a "service unavailable" error.** The analytics service may be degraded. Check Settings → System Health. Notify IT Admin.
