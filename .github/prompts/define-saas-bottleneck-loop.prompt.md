# CareDroid SaaS Service Bottleneck Discovery + Response Loop

## Mission

CareDroid must detect not only patient risk, but also system and service bottlenecks that delay care. Every bottleneck event maps to a care delay, a 3-minute risk level, an owner role, and a fallback action. The bottleneck loop runs continuously and feeds clinical alerts, the AI Chief, and the command dashboard.

**IMPORTANT:** Read the current source code first. Discover all existing services, hooks, and types before creating anything new. The bottleneck registry and all supporting infrastructure already exist — audit before implementing.

---

## Current Architecture

### Core service: `src/services/bottleneckRegistry.ts`

This is the single source of truth for bottleneck detection. Do not move logic out of this file.

Key exports:
- `CURRENT_SERVICE_MAP` — 44-service inventory (read-only array of `CurrentServiceMapEntry`)
- `detectBottleneckEvents(input)` — derives `BottleneckEvent[]` from operational state
- `buildThreeMinuteRiskProjection(events)` — projects 3-minute target risk from events
- `buildBottleneckRegistrySnapshot(input)` — top-level entry point; returns `BottleneckRegistrySnapshot`
- `bottleneckEventsToAlerts(events, previousAlerts)` — converts high/critical events to `Alert[]`
- `adaptExistingServiceSignalsToBottlenecks(signals)` — adapts pre-existing service signals

### Core types (all in `bottleneckRegistry.ts`)

```ts
type BottleneckCategory = 'clinical_workflow' | 'operational' | 'saas_backend' | 'interoperability' | 'frontend';
type BottleneckSeverity = 'critical' | 'high' | 'medium' | 'low';

type BottleneckEvent = {
  id: string;
  category: BottleneckCategory;
  serviceName: string;
  severity: BottleneckSeverity;
  impactsThreeMinuteTarget: boolean;
  fallbackAction: string;
  ownerRole: string;         // HospitalRole
  responseDeadline?: string; // ISO timestamp
  status: 'active' | 'acknowledged' | 'mitigated' | 'resolved';
  // + title, description, affectedWorkflow, affectedPatientId, detectedAt, ...
};

type ServiceHealth = {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  errorRate?: number;
  fallbackAvailable: boolean;
  currentBottlenecks: BottleneckEvent[];
};

type ThreeMinuteRiskProjection = {
  status: 'on_track' | 'at_risk' | 'breach_likely';
  criticalBottlenecks: number;
  highRiskPatientsAffected: number;
  nextOwnerRole: string;
  fallbackAction: string;
  summary: string;
};
```

### Data flow

```
buildBottleneckRegistrySnapshot(input)
  → careDroidCentralNode.ts  (centralSnapshot.bottleneckRegistry)
  → useOperationalIntelligence  (30-second poll)
  → ClinicalAlertsPage  (bottleneck alerts merged into clinical alert list)
  → CommandDashboard  (BottleneckCommandPanel)
  → EmergencyAnalytics  (BottleneckList + ThreeMinuteRiskIndicator)
  → CopilotPanel  (system prompt context + quick actions)
```

### UI components: `src/components/bottlenecks/BottleneckPanels.tsx`

All bottleneck UI is colocated here. Exports:
- `BottleneckSeverityBadge` — severity chip
- `ThreeMinuteRiskIndicator` — risk status pill + summary
- `FallbackActionCard` — fallback action display for a single event
- `ServiceHealthCard` — per-service status card
- `BottleneckImpactCard` — full bottleneck event card
- `BottleneckList` — list of impact cards with empty state
- `RootCauseSummaryPanel` — AI Chief root cause summary + fallback
- `ServiceDependencyMap` — grid of service health cards
- `BottleneckCommandPanel` — full composed command panel

### AI Chief intents (all in `lib/ai/careDroidAI.ts`)

- `service_bottleneck_analysis` — analyze active SaaS/service bottlenecks
- `workflow_delay_analysis` — identify root causes of clinical workflow delays
- `fallback_recommendation` — recommend fallback actions for degraded/unavailable services
- `three_minute_risk_projection` — project 3-minute target risk given active bottlenecks
- `operational_root_cause_summary` — summarize operational root causes across all layers

Copilot quick actions that trigger these intents:
- `'Queue bottlenecks'`
- `'What is slowing care right now?'`
- `'Recommend bottleneck fallbacks'`
- `'Will we breach the 3-minute target?'`

---

## Bottleneck Detection Loop

The detection pipeline follows this signal chain:

```
Signal → Detection → Severity → 3-Minute Check → Owner → Fallback → Alert → Display → Ack → Resolution
```

1. **Signal** — queue health, capacity band, sync status, AI Chief availability, reassessment overdue count, unacknowledged critical alerts, service-specific signals
2. **Detection** — `detectBottleneckEvents(input)` produces `BottleneckEvent[]`
3. **Severity** — `critical | high | medium | low` (critical = breach likely, high = at risk)
4. **3-Minute Check** — `impactsThreeMinuteTarget: boolean` gates inclusion in `ThreeMinuteRiskProjection`
5. **Owner** — `ownerRole` maps to a `HospitalRole` responsible for response
6. **Fallback** — `fallbackAction` describes what staff should do if the service cannot recover automatically
7. **Alert** — `bottleneckEventsToAlerts()` converts high/critical events to `Alert[]` for `ClinicalAlertsPage`
8. **Display** — `BottleneckCommandPanel`, `BottleneckList`, `ThreeMinuteRiskIndicator` surface the snapshot
9. **Ack** — user acknowledges via `ClinicalAlertsPage`; audit metadata uses `profile.employeeId`
10. **Resolution** — event status transitions to `mitigated` or `resolved`

---

## Service Fallback Rules

| Service | Fallback on failure |
|---|---|
| AI Chief | Manual triage; require clinician review for all decisions |
| Central Node sync | Use local intake snapshot; persistent in-app critical banner; never block emergency read-only |
| Notification service | In-app persistent banner; manual call/page |
| Auth failure (admin) | Fail closed — block admin actions |
| Auth failure (emergency) | Preserve emergency read-only critical workflow |
| Queue service | Human queue owner; pull oldest/highest-risk patient forward; manual triage documentation |
| Referral/EHR sync | Local referral snapshot; call receiving service; mark external data unavailable |
| Capacity service | Command huddle; hallway/rapid-review contingency per site policy |

**Golden rule: Never allow a SaaS failure to crash the app or block emergency response.**

---

## Bottleneck Categories

| Category | Examples |
|---|---|
| `clinical_workflow` | Queue delay, reassessment overdue, unacknowledged critical alert |
| `operational` | Capacity pressure, boarding surge, resource shortage |
| `saas_backend` | Central node sync degraded, AI Chief unavailable, auth failure |
| `interoperability` | Referral backlog, EHR/FHIR sync delay, lab results delayed |
| `frontend` | UI crash, render error, offline mode |

---

## Implementation Rules

### What to add

Only add to this system when:
- A new service is discovered that has no entry in `CURRENT_SERVICE_MAP`
- A new detection signal is available (new queue, new status field, new integration)
- A new category of bottleneck is required (extend `BottleneckCategory` union)

### What NOT to do

- Do not duplicate bottleneck detection logic outside `bottleneckRegistry.ts`
- Do not create a separate service map — use `CURRENT_SERVICE_MAP`
- Do not create new alert types for bottlenecks — use `bottleneckEventsToAlerts()`
- Do not skip the `fallbackAction` field on any event — it is required for emergency safety
- Do not log `affectedPatientId` — log only `serviceName`, `category`, `severity`, `ownerRole`

### Security constraints

- Never log protected health information in bottleneck events. `affectedPatientId` is an opaque ID.
- Use `profile.employeeId` (not `fullName`, `email`, or `phone`) for `acknowledgedBy` in audit metadata.
- Never hardcode secrets or provider keys in bottleneck detection logic.
- If bottleneck registry build fails, callers must catch and return a safe empty snapshot — never propagate the error to the user UI.

---

## Testing

Tests live at `src/services/bottleneckRegistry.test.ts`.

Cover:
- `detectBottleneckEvents` — each detection trigger (breached queue, red capacity, stale sync, AI Chief off, reassessment overdue, unacknowledged critical alert, referral backlog)
- `buildThreeMinuteRiskProjection` — on_track (no events), at_risk (high events), breach_likely (critical events)
- `buildBottleneckRegistrySnapshot` — empty input returns safe snapshot; non-empty input includes analytics
- `bottleneckEventsToAlerts` — medium events excluded, high/critical events included; previous alert state preserved

---

## Definition of Done

- [ ] `CURRENT_SERVICE_MAP` reflects all frontend and backend services (44+ entries)
- [ ] `detectBottleneckEvents` covers all bottleneck categories
- [ ] `ThreeMinuteRiskProjection` accurately classifies on_track / at_risk / breach_likely
- [ ] `bottleneckEventsToAlerts` feeds high/critical events into `ClinicalAlertsPage`
- [ ] `BottleneckCommandPanel` renders in `CommandDashboard`
- [ ] `BottleneckList` + `ThreeMinuteRiskIndicator` visible in `EmergencyAnalytics`
- [ ] AI Chief copilot context includes active bottlenecks and risk projection
- [ ] `copilot-instructions.md` documents all 5 bottleneck AI intents
- [ ] Tests pass for core bottleneck registry functions
- [ ] TypeScript typecheck clean; Vite build succeeds
- [ ] No SaaS failure can crash the app or block emergency response
