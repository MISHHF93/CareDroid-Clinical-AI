# CareDroid: Administrator Guide

> **Related:** [`docs/manuals/roles/hospital-administrator.md`](../manuals/roles/hospital-administrator.md) covers the hospital administrator role in fuller "mission-framed" detail. Flagged as overlapping documentation in the [Documentation Center](../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Roles:** `hospital_admin`, `ed_director`, `super_admin`  
**Version:** Pilot 2026

---

## Purpose

You configure and govern CareDroid for your hospital. This includes managing staff, configuring workflows, setting thresholds, and reviewing compliance and performance data.

---

## Your Screens

| Screen | Route | Use |
|--------|-------|-----|
| Admin Console | `/admin` | All admin operations |
| Team Management | `/admin/team` | Staff accounts, roles, permissions |
| ED Workflow Admin | `/admin/staff-workflows` | Configure ED workflow rules |
| System Health | `/admin/system-health` | Monitor service health |
| Audit Trail | `/admin/audit-trail` | Review automation and AI audit logs |
| Platform Governance | `/audit`, `/security`, `/regulatory`, `/ai-governance` | Compliance workspace |
| Analytics | `/emergency/analytics` | Operational performance |
| Department Whiteboard | `/emergency/whiteboard` | Full ED overview |
| Settings | `/emergency/settings` | ED settings (thresholds, display modes) |

---

## Daily Workflow

### Operational Review (Daily)
1. Open **Analytics** → review yesterday's throughput, wait times, LWBS rate
2. Check **System Health** → confirm all services green
3. Review **Department Pulse** → any persistent bottlenecks from overnight?
4. Review **Audit Trail** → any automated decisions requiring review?

### Weekly Review
5. Export **Analytics** report for leadership
6. Review **Team Management** → inactive accounts, role changes needed
7. Review **Compliance workspace** → any flagged PHI access events

---

## You Can

- Full access to all ED screens
- Create, modify, and deactivate user accounts
- Assign and modify user roles
- Configure ED thresholds (reassessment intervals, EMS offload targets)
- Configure display modes (wall display, kiosk settings)
- Review all audit logs
- Access platform governance workspace
- Review AI governance and evaluation reports

---

## Staff Management (Team Management)

### Add a New Staff Member
1. Go to `/admin/team`
2. Press **Invite staff**
3. Enter name, email, and role
4. Staff receives email invitation
5. Staff creates account and logs in

### Roles Available for Assignment
| Role | Primary Screen |
|------|---------------|
| Registration Clerk | Reception |
| Triage Nurse | Queues, Reception |
| Charge Nurse | Whiteboard, Capacity, EMS |
| Emergency Physician | Whiteboard, Copilot, Tools |
| ED Director | All screens |
| Paramedic | EMS, Copilot |
| Patient Flow Coordinator | Whiteboard, Capacity, Reception |
| Quality Safety Officer | Analytics, Audit |
| IT Administrator | System Health, Settings |
| Demo Observer | Read-only view |

---

## ED Settings Configuration

Access: `/emergency/settings`

| Setting | Purpose |
|---------|---------|
| Reassessment intervals | Time targets per acuity level |
| EMS offload target | Offload breach threshold (default: 15 min) |
| Wall display refresh | Auto-refresh interval for wall-mount displays |
| Display privacy | PHI redaction level for public/wall displays |
| Capacity thresholds | Band transition points (Green/Yellow/Orange/Red) |
| Central intake | Whether whiteboard allows central patient creation |
| Reception-first mode | Forces intake through reception for clerks |
| Screen mode KPI visibility | Which KPIs appear per screen mode |

---

## Compliance & Governance

### Audit Log Access
All actions in CareDroid are logged:
- Patient registration and record access
- Clinical assessments and notes
- AI decisions and recommendations
- Administrative actions

Access: `/admin/audit-trail` or `/audit` (Platform Governance)

### PHI Audit
Review which staff accessed which patient records — audit log is HMAC-hashed (tamper-evident).

### AI Governance
Track AI decisions and review flagged outputs:
- Access: `/ai-governance`
- Review AI decisions requiring human confirmation
- Monitor AI confidence scores and override rates

---

## Safety Rules

1. Never deactivate an account mid-shift — wait until shift end
2. Role changes take effect immediately — confirm with staff before changing
3. PHI audit log is read-only — it cannot be deleted or modified
4. Contact IT before modifying system health settings
