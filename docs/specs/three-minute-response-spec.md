# 3-Minute Response Spec

**Status:** Visual timer + auto-escalation engine both implemented (2026-06-28).  
**Engine:** `src/engine/threeMinuteTimerEngine.ts` + `src/hooks/useThreeMinuteTimerEngine.ts`  
**Gap:** Timer state is module-level only (resets on page reload). Zustand persistence is a follow-up task.

---

## Purpose

Ensure every critical or high-acuity patient has a named licensed clinical owner who has acknowledged responsibility within 3 minutes of the triggering signal.

---

## Current Implementation

`src/components/emergency/ThreeMinuteTimer.tsx` — visual countdown with color zones (unchanged):
- 0–120s: green
- 120–180s: amber
- 180s+: red

`src/engine/threeMinuteTimerEngine.ts` — auto-escalation engine (built 2026-06-28):
- Subscribes to new Critical alerts in `emergencyStore`
- Auto-starts a timer for each new Critical alert with a `patientId`
- Checks every 5 seconds: if a threshold has been crossed and not yet fired, dispatches via `dispatchAlert`
- Escalation chain: 30s awareness → 120s L1 escalation → 180s BREACH → 300s admin
- Deduplicates escalations — each threshold fires at most once per timer
- Mount: `ThreeMinuteTimerEngineMount` in `src/app/providers.tsx`

`src/services/bottleneckRegistry.ts` → `buildThreeMinuteRiskProjection()` — advisory risk projection, separate from the engine.

**Remaining gap:** Timer state is stored in module-level `Map` — resets on page reload. Acceptance criterion #6 (timer survives page reload) requires adding a `responseTimers` Zustand slice with localStorage persistence.

---

## Required Implementation

### Trigger Conditions

The 3-minute timer starts when any of these occur:
- Patient registered with one or more red flag complaints checked
- Triage assigns CTAS 1 or CTAS 2
- Critical alert created from vital deterioration flag
- Reassessment breach detected on a CTAS 1–2 patient
- EMS pre-arrival data indicates a CTAS 1–2 patient
- AI Chief flags `critical_alert_assessment` intent result

### Timer State Machine

```
IDLE
  ↓ trigger event
RUNNING (owner: initial assigned role)
  ↓ acknowledged before 2:00
ACKNOWLEDGED → resolved
  ↓ not acknowledged at 2:00
ESCALATED_L1 (escalate to charge nurse)
  ↓ not acknowledged at 3:00
BREACH (escalate to physician + patient flow coordinator)
  ↓ acknowledged after breach
BREACH_RESOLVED (analytics records breach duration)
```

### Escalation Chain

| Elapsed | Action | Target |
|---------|--------|--------|
| 0:00 | Timer starts | Alert sent to assigned owner (triage nurse or assigned nurse) |
| 0:30 | Notification | Alert sent to charge nurse for awareness |
| 2:00 | Escalation L1 | Alert escalated to charge nurse as new owner |
| 3:00 | BREACH + Escalation L2 | Alert sent to attending physician + patient flow coordinator |
| 5:00 | Extended breach | Alert sent to hospital administrator |

### Required Outputs

- `ResponseTimerState` object: `{ patientId, alertId, startedAt, phase, ownerId, ownerRole, escalationHistory }`
- On breach: `AlertBreach` record with `{ patientId, alertId, breachAt, ownerAtBreach, escalationChain, resolvedAt, breachDurationMs }`
- Breach analytics feed: contributes to breach rate metric in analytics dashboard

### Persistence

Timer state must survive:
- Page reload
- Browser tab switch
- Network interruption (cache locally, sync on reconnect)

Use `emergencyStore.ts` Zustand store with local storage persistence for timer state.

### Notification Channels

Each escalation fires:
1. In-app alert (CareDroid notification banner)
2. Push notification (if device supports it)
3. Fallback: pager or SMS (if notification service is configured)

Notification failure must trigger the bottleneck registry alert for the notification service.

### Implementation Files

- `src/engine/alertEngine.ts` — Add `ThreeMinuteTimerEngine` class
- `src/store/emergencyStore.ts` — Add `responseTimers` state slice
- `src/services/NotificationService.ts` — Wire escalation notifications
- `src/components/emergency/ThreeMinuteTimer.tsx` — Wire to store state (not just visual)
- Analytics feed via `src/services/analyticsService.ts`

---

## Inputs

- Patient complaint and red flags
- CTAS level from triage
- EMS pre-arrival acuity
- Reassessment breach events
- AI Chief risk signal
- Service bottleneck context (for impact-aware escalation)

## Outputs

- Response timer state (per patient)
- Owner role and owner user ID
- Alert acknowledgement record
- Escalation event log
- Handoff summary trigger (when timer resolves)
- Breach analytics contribution

## Failure Mode

If AI or notifications fail:
- Activate manual escalation channels immediately (phone, pager, overhead page)
- Log the notification failure in the bottleneck registry
- Do not block the clinical workflow for system failure

---

## Acceptance Criteria

1. Creating a CTAS 1 patient triggers a timer that starts immediately.
2. At 2:00 without acknowledgement, a charge nurse escalation alert fires.
3. At 3:00 without acknowledgement, a physician escalation alert fires and breach is recorded.
4. Acknowledging the alert at any point stops the timer and logs the acknowledgement.
5. Breach events appear in the analytics breach report.
6. Timer state survives a page reload.
