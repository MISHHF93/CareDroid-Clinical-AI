/**
 * Lightweight Smart Intake session telemetry for click and transition measurement.
 */

let activeSession: any = null;

function nowIso() {
  return new Date().toISOString();
}

export function startSmartIntakeTelemetry(context: any = {}) {
  activeSession = {
    startedAt: nowIso(),
    context,
    clicks: [],
    transitions: [],
  };
  return activeSession;
}

export function recordSmartIntakeClick(action, metadata: any = {}) {
  if (!activeSession) startSmartIntakeTelemetry();
  activeSession.clicks.push({
    action,
    at: nowIso(),
    ...metadata,
  });
}

export function recordSmartIntakeTransition(fromStep, toStep, reason = 'manual') {
  if (!activeSession) startSmartIntakeTelemetry();
  activeSession.transitions.push({
    fromStep,
    toStep,
    reason,
    at: nowIso(),
  });
}

export function getSmartIntakeTelemetrySummary() {
  if (!activeSession) {
    return {
      clickCount: 0,
      transitionCount: 0,
      clicks: [],
      transitions: [],
    };
  }

  return {
    startedAt: activeSession.startedAt,
    clickCount: activeSession.clicks.length,
    transitionCount: activeSession.transitions.length,
    clicks: [...activeSession.clicks],
    transitions: [...activeSession.transitions],
    context: activeSession.context,
  };
}

export function resetSmartIntakeTelemetry() {
  activeSession = null;
}
