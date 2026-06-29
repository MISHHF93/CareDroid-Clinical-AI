# Service Bottleneck Spec

**Status:** Detection implemented in `src/services/bottleneckRegistry.ts`. Feed wiring to Dashboard, AI Chief, and Alerts is partial.

---

## Purpose

Identify service degradations early, surface patient impact, trigger fallback procedures, and feed the analytics loop.

---

## Tracked Services

| Service | Source | Patient Impact Level |
|---------|--------|---------------------|
| AI | `src/lib/ai/client.ts` error rate | Medium — advisory only; care continues |
| Auth | `src/lib/auth/currentUser.ts` + session errors | High — clinicians may be unable to log in |
| Patient service | Patient create/read/update API errors | Critical — patient records inaccessible |
| Triage service | Triage assignment + timer API errors | Critical — acuity assignment may be lost |
| Alert service | Alert creation + delivery failures | Critical — alerts may not reach owners |
| Notification service | Push/SMS/pager delivery failures | High — escalations may not be delivered |
| Database | Query latency + connection errors | Critical — all services affected |
| Labs | Lab integration delivery errors + critical value delays | High — critical values may not arrive |
| Radiology | PACS integration + imaging readiness errors | Medium — imaging availability reduced |
| Pharmacy | Drug check + medication order errors | High — medication safety review impaired |
| Analytics | Data pipeline latency + reporting failures | Low — retrospective data only |
| Reporting | Report generation failures | Low — retrospective data only |
| EHR/FHIR | Sync errors + FHIR integration failures | High — data may not sync to EHR |
| Frontend | JavaScript errors + crash reports + performance | High — users may be blocked |

---

## Current Implementation

`src/services/bottleneckRegistry.ts`:
- `CURRENT_SERVICE_MAP` — 684-line service map covering all tracked services
- `buildBottleneckRegistrySnapshot()` — point-in-time snapshot of all service states
- `buildThreeMinuteRiskProjection()` — projects 3-minute timer risk from current bottlenecks
- `impactsThreeMinuteTarget` — boolean on each bottleneck event
- `responseDeadline` — deadline calculated from bottleneck detection time

---

## Required Wiring (not yet implemented)

### 1. Dashboard Feed

The Hospital Command Center (`/emergency/whiteboard`) must show a **Service Health indicator** that:
- Shows current bottleneck count by severity (none / 1–2 degraded / critical)
- Expands to show which services are affected
- Links to Settings → System Health for detail

Implementation: `careDroidCentralNode.ts` → add `bottleneckSnapshot: BottleneckRegistrySnapshot` to the node output. Pass to whiteboard UI.

### 2. Alert Auto-Creation

When a service bottleneck crosses the **critical** threshold:
- Auto-create an alert in the alert system
- Severity: maps to service impact level (see table above)
- Owner: IT Admin for technical services; Patient Flow Coordinator for capacity services
- Alert must appear in `/emergency/alerts`
- Alert must feed the 3-minute risk projection if `impactsThreeMinuteTarget` is true

Implementation: `src/engine/alertEngine.ts` → add `BottleneckAlertTrigger` that calls `buildBottleneckRegistrySnapshot()` and creates alerts for critical services.

### 3. AI Chief Feed

`service_bottleneck_analysis` intent (not yet implemented) must use `buildBottleneckRegistrySnapshot()` as its primary input.

The `fallback_recommendation` intent must check bottleneck state to determine which services are unavailable and tailor its manual procedure guidance accordingly.

### 4. Analytics Feed

Every resolved bottleneck event must contribute:
- Service name
- Start time
- Duration
- Patient impact count (estimated from active patient count during the outage)
- Recovery action taken

This feeds the **Service Health** section in Analytics.

---

## Bottleneck Alert SLA

| Service Impact Level | Alert Created Within | Escalation If Unacknowledged |
|---------------------|--------------------|-----------------------------|
| Critical (patient safety risk) | 0 seconds — immediately | 5 minutes → Hospital Administrator |
| High (care workflow impaired) | 30 seconds | 15 minutes → Hospital Administrator |
| Medium (advisory degradation) | 2 minutes | 60 minutes → IT Admin |
| Low (retrospective data only) | 10 minutes | No escalation (informational) |

---

## Implementation Files

- `src/services/bottleneckRegistry.ts` — source (ready)
- `src/central-node/careDroidCentralNode.ts` — add bottleneck snapshot to output
- `src/engine/alertEngine.ts` — add `BottleneckAlertTrigger`
- `src/lib/ai/careDroidAI.ts` — `service_bottleneck_analysis` intent handler
- `src/services/analyticsService.ts` — add bottleneck event analytics feed
- `src/components/whiteboard/` — add Service Health indicator to Dashboard

---

## Failure Mode

If the bottleneck registry itself fails to compute:
- Log the failure and mark all services as UNKNOWN
- Show "Service health unknown" indicator on the dashboard
- Continue clinical workflow — the bottleneck registry is advisory infrastructure

If the notification service is unavailable when a bottleneck alert fires:
- Log the notification failure as a second bottleneck event
- The IT Admin can see the double failure in Settings → System Health
- Use alternate communication channels (overhead page, phone, email)
