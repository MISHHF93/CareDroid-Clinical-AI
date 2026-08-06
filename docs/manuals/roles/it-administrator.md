# IT Administrator Manual

> **Related:** [`docs/users/it-admin-guide.md`](../../users/it-admin-guide.md) covers the same role in a shorter guide format. Flagged as overlapping documentation in the [Documentation Center](../../DOCUMENTATION_CENTER.md#known-documentation-debt).

**Role ID:** `it_admin`  
**Landing page:** `/emergency/settings`  
**Mission:** Keep every service running. Respond to every degradation before it becomes a patient safety event.

---

## Role Purpose

The IT Administrator is responsible for the technical health of the CareDroid platform: identity management, service health monitoring, integration management, audit trail review, downtime coordination, and AI service configuration. When a service degrades, CareDroid's bottleneck registry alerts you. When the system goes down, you own the communication and recovery plan. You work in Settings and System Health — not in clinical workflows.

---

## Dashboard View

**Settings** (`/emergency/settings`) — Primary workspace. Tabs:
- **Users** — User accounts, roles, and access profiles
- **Integrations** — EHR/FHIR, lab, radiology, pharmacy, notification integrations
- **System Health** — Live service health with bottleneck details
- **AI Configuration** — AI service settings, model configuration, intent routing
- **Alerts** — Alert threshold and escalation chain configuration
- **Feature Flags** — Enable/disable features by role and organization
- **Audit** — Full audit trail viewer

**Help** (`/emergency/help`) — IT admin procedures and downtime workflows.

---

## Allowed Actions

- Manage user accounts, roles, and permissions
- Configure system settings (alert thresholds, escalation chains, feature flags)
- View and export the full audit trail
- Configure and test integrations (EHR/FHIR, lab, radiology, pharmacy)
- Configure AI service parameters
- Acknowledge system health and service bottleneck alerts
- Communicate downtime status to clinical staff
- Review and respond to all technical alerts

## Restricted Actions

- Cannot modify clinical patient records
- Cannot take clinical care actions
- Clinical AI configuration requires coordination with clinical leadership (Chief Medical Officer or Medical Director)

---

## Daily Workflow

### How to Monitor System Health

1. Open **Settings** (`/emergency/settings`) → System Health tab.
2. Review the service status grid:
   - Green: all services operational
   - Yellow: degraded — elevated latency or error rate
   - Red: service down or critical error rate
3. For each degraded service, click to expand:
   - Current error rate and latency
   - Time of first degradation
   - Patient impact estimate
   - Auto-generated recovery steps from the bottleneck registry
4. For red status services: take immediate action (see below).
5. Check the bottleneck registry alert feed for aggregated risk projections.

### How to Respond to a Service Degradation

**For yellow (degraded) status:**
1. Note the affected service and patient impact level.
2. Begin investigation: check integration logs, API error rates, network connectivity.
3. Send a brief status update to the charge nurse: "CareDroid [service name] is experiencing elevated latency. Clinical workflows are not yet affected. We are investigating."
4. Resolve the root cause. Mark the service as restored in System Health once confirmed.
5. Document in the audit trail: start time, root cause, resolution action, duration.

**For red (down) status:**
1. Immediately notify the charge nurse and hospital administrator.
2. Activate the downtime communication plan for the affected service.
3. Begin recovery procedures.
4. Every 15 minutes, send a status update to clinical leadership.
5. When service is restored: announce recovery through your hospital's communication channel. Mark the service as restored in System Health.
6. Document the outage with full timeline: detection time, impact, recovery steps, resolution time.

### How to Manage Users

**Add a user:**
1. Open **Settings** → Users → **Add User**.
2. Enter name, email, role. Select department if applicable.
3. Click **Save**. The user receives an activation email.
4. The access profile is compiled immediately based on the assigned role.

**Change a user's role:**
1. Open **Settings** → Users → find the user → **Edit**.
2. Change the role using the role selector.
3. Click **Save**. Changes take effect on the user's next login.
4. Log the role change reason in the audit entry.

**Deactivate a user (e.g., employee departure):**
1. Open **Settings** → Users → find the user → **Deactivate**.
2. Confirm deactivation.
3. The user cannot log in. Their audit record is preserved.
4. Do NOT delete user accounts — audit requirements mandate preservation.

### How to Manage Integrations

1. Open **Settings** → Integrations.
2. Review each integration status: EHR/FHIR, lab, radiology, pharmacy, notification.
3. For a failing integration:
   - Click the integration card to see the error details.
   - Check the integration endpoint URL, authentication token, and network path.
   - Run the **Test connection** action.
   - If the integration is on a third-party service: contact the service provider and document the case number.
4. After fixing: run **Test connection** again and confirm green status.
5. Document the issue and resolution in the audit trail.

### How to Configure AI Services

1. Open **Settings** → AI Configuration.
2. Review the configured model, temperature, and prompt registry.
3. To enable a new AI intent: confirm with clinical leadership that the intent is approved for your site.
4. To disable an AI intent: toggle the feature flag. Changes take effect immediately for new sessions.
5. Review AI error rate in System Health. High error rates on AI services should trigger investigation.

### How to Review the Audit Trail

1. Open **Settings** → Audit.
2. Set the date range and filter by:
   - Event type: login, role change, alert action, AI request, override, setting change
   - User: search by name or role
   - Patient: search by MRN
3. Export as CSV for compliance review or incident investigation.
4. The audit trail is immutable — you can read and export but not modify entries.

---

## Alerts You Receive

| Alert | Meaning | Your action |
|-------|---------|------------|
| Service degradation — [service name] | A monitored service has reached degraded or down status | Investigate, communicate to clinical staff, recover |
| Auth failure rate elevated | Login failures or token errors exceeding threshold | Check auth service, review failed login attempts |
| Notification delivery failure | Push, SMS, or pager messages are not being delivered | Check notification service; activate fallback channels |
| Integration downtime — [integration] | A third-party integration has failed | Contact service provider; activate manual fallback |
| AI error rate elevated | AI Chief is returning errors above threshold | Check AI service; disable AI intents if impacting patient care |
| Unusual login activity | Login from unexpected location or time | Review audit trail; deactivate account if suspicious |

---

## AI Features Available

- `service_bottleneck_analysis` — Current bottleneck analysis from the registry. Use it to understand which services are at risk before they fail.
- `fallback_recommendation` — Manual fallback procedure for any specific service when you need to communicate downtime steps to clinical staff.

You do NOT have access to clinical AI intents (patient summary, triage, etc.) — those are for clinical roles.

---

## Fallback Procedures

### If CareDroid itself goes down (total outage)

1. Activate your hospital's downtime protocol immediately.
2. Notify charge nurse, hospital administrator, and clinical leadership by phone.
3. Post downtime notifications on all department workstations.
4. Confirm downtime forms are available to clinical staff.
5. Begin diagnosis and recovery work.
6. Send updates every 15 minutes until service is restored.
7. Announce recovery and provide post-recovery instructions to clinical staff.

---

## Troubleshooting

**A user says their access profile changed unexpectedly.** Open Settings → Users → find the user → Review role change history. If a role was changed, the audit trail shows who changed it and when.

**The AI is giving incorrect responses.** Open Settings → AI Configuration → review the model and prompt settings. If a model configuration was changed, it may be causing unexpected output. Roll back to the last known good configuration.

**An integration is showing errors but the third-party service says it's up.** Check authentication tokens — they may have expired. Check firewall rules and allowed IP addresses. Check if the integration endpoint URL has changed. Run a manual test connection.

**A user forgot their password and is locked out.** Open Settings → Users → find the user → **Reset password**. The user receives a password reset email. If the email is not working, reset via the admin password reset function in your authentication service.
