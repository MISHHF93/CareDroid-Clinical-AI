import { dispatchAlert } from './alertEngine';
import { useEmergencyStore } from '../store/emergencyStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResponseTimerPhase =
  | 'running'
  | 'escalated_l1'
  | 'breach'
  | 'acknowledged'
  | 'breach_resolved';

export type EscalationEvent = {
  firedAt: string;
  threshold: string;
  targetRole: string;
  dispatchedAlertId: string;
};

export type ResponseTimerState = {
  timerId: string;
  patientId: string;
  triggerAlertId: string;
  startedAt: string;
  phase: ResponseTimerPhase;
  ownerRole: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  breachAt?: string;
  escalationHistory: EscalationEvent[];
};

// ─── Escalation thresholds ────────────────────────────────────────────────────

const ESCALATION_THRESHOLDS = [
  {
    seconds: 30,
    key: 'awareness',
    targetRole: 'charge_nurse',
    title: 'Response Awareness: Critical patient unacknowledged',
    severity: 'Warning' as const,
    newOwnerRole: null as string | null,
  },
  {
    seconds: 120,
    key: 'escalation_l1',
    targetRole: 'charge_nurse',
    title: '3-Minute Alert: Escalating to charge nurse',
    severity: 'Critical' as const,
    newOwnerRole: 'charge_nurse',
  },
  {
    seconds: 180,
    key: 'breach',
    targetRole: 'emergency_physician',
    title: '3-MINUTE BREACH: Physician escalation required',
    severity: 'Critical' as const,
    newOwnerRole: 'emergency_physician',
  },
  {
    seconds: 300,
    key: 'breach_admin',
    targetRole: 'hospital_admin',
    title: '5-Minute Breach: Administrator notification',
    severity: 'Critical' as const,
    newOwnerRole: null,
  },
] as const;

// ─── Module-level engine state ─────────────────────────────────────────────────
// Intentionally outside React/Zustand — the engine is a singleton with its own
// lifecycle, started once at app load and cleaned up on unmount.

const activeTimers = new Map<string, ResponseTimerState>();
let engineInterval: ReturnType<typeof setInterval> | null = null;
let unsubscribeStore: (() => void) | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

function makeTimerId(patientId: string, alertId: string): string {
  return `tmr_${patientId}_${alertId}`;
}

export function startResponseTimer(
  patientId: string,
  triggerAlertId: string,
  ownerRole = 'triage_nurse',
): string {
  const timerId = makeTimerId(patientId, triggerAlertId);
  if (activeTimers.has(timerId)) return timerId;

  activeTimers.set(timerId, {
    timerId,
    patientId,
    triggerAlertId,
    startedAt: new Date().toISOString(),
    phase: 'running',
    ownerRole,
    escalationHistory: [],
  });

  void import('../services/threeMinuteMissionService').then(({ syncThreeMinuteMissionsFromEngine }) =>
    syncThreeMinuteMissionsFromEngine(),
  );

  return timerId;
}

export function acknowledgeResponseTimer(timerId: string, acknowledgedBy: string): boolean {
  const timer = activeTimers.get(timerId);
  if (!timer || timer.acknowledgedAt) return false;

  const elapsed = elapsedSeconds(timer.startedAt);
  activeTimers.set(timerId, {
    ...timer,
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy,
    phase: elapsed >= 180 ? 'breach_resolved' : 'acknowledged',
  });

  void import('../services/threeMinuteMissionService').then(({ syncThreeMinuteMissionsFromEngine }) =>
    syncThreeMinuteMissionsFromEngine(),
  );

  return true;
}

export function acknowledgeTimerForPatient(patientId: string, acknowledgedBy: string): boolean {
  const timer = getActiveTimerForPatient(patientId);
  if (!timer) return false;
  return acknowledgeResponseTimer(timer.timerId, acknowledgedBy);
}

export function getTimerState(timerId: string): ResponseTimerState | undefined {
  return activeTimers.get(timerId);
}

export function getActiveTimerForPatient(patientId: string): ResponseTimerState | undefined {
  for (const timer of activeTimers.values()) {
    if (timer.patientId === patientId && !timer.acknowledgedAt) {
      return timer;
    }
  }
  return undefined;
}

export function getAllActiveTimers(): ResponseTimerState[] {
  return Array.from(activeTimers.values()).filter((t) => !t.acknowledgedAt);
}

// ─── Engine internals ─────────────────────────────────────────────────────────

function elapsedSeconds(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function checkEscalations(): void {
  for (const [timerId, timer] of activeTimers) {
    if (timer.acknowledgedAt) continue;

    const elapsed = elapsedSeconds(timer.startedAt);
    const firedKeys = new Set(timer.escalationHistory.map((e) => e.threshold));

    let updated = false;
    let current = { ...timer, escalationHistory: [...timer.escalationHistory] };

    for (const threshold of ESCALATION_THRESHOLDS) {
      if (elapsed < threshold.seconds) break;
      if (firedKeys.has(threshold.key)) continue;

      const patients = useEmergencyStore.getState().patients;
      const patient = patients.find((p) => p.id === timer.patientId);
      const name = patient
        ? `${patient.firstName} ${patient.lastName}`
        : `Patient ${timer.patientId}`;

      const dispatchedAlertId = dispatchAlert({
        severity: threshold.severity,
        title: threshold.title,
        message: `${name}: ${elapsed}s elapsed without acknowledgement. Current owner: ${current.ownerRole}.`,
        patientId: timer.patientId,
        source: 'three-minute-timer-engine',
        metadata: {
          timerId,
          elapsed,
          threshold: threshold.key,
          targetRole: threshold.targetRole,
          triggerAlertId: timer.triggerAlertId,
        },
      });

      current.escalationHistory = [
        ...current.escalationHistory,
        {
          firedAt: new Date().toISOString(),
          threshold: threshold.key,
          targetRole: threshold.targetRole,
          dispatchedAlertId,
        },
      ];

      if (threshold.key === 'breach') {
        current.phase = 'breach';
        current.breachAt = current.breachAt ?? new Date().toISOString();
        void import('../services/emergencyCareJourneyOrchestrator').then(({ onThreeMinuteBreachForPatient }) =>
          onThreeMinuteBreachForPatient(timer.patientId),
        );
      } else if (threshold.key === 'escalation_l1') {
        current.phase = 'escalated_l1';
      }

      if (threshold.newOwnerRole) {
        current.ownerRole = threshold.newOwnerRole;
      }

      updated = true;
    }

    if (updated) {
      activeTimers.set(timerId, current);
    }
  }

  void import('../services/threeMinuteMissionService').then(({ syncThreeMinuteMissionsFromEngine }) =>
    syncThreeMinuteMissionsFromEngine(),
  );
}

function subscribeToMissionTriggers(): () => void {
  const seenAlertIds = new Set(useEmergencyStore.getState().alerts.map((alert) => alert.id));
  const seenEmsIds = new Set(useEmergencyStore.getState().emsArrivals.map((arrival) => arrival.id));
  const seenPatientIds = new Set<string>();

  return useEmergencyStore.subscribe((state) => {
    let changed = false;

    for (const alert of state.alerts) {
      if (seenAlertIds.has(alert.id)) continue;
      seenAlertIds.add(alert.id);
      changed = true;
    }

    for (const arrival of state.emsArrivals) {
      if (seenEmsIds.has(arrival.id)) continue;
      seenEmsIds.add(arrival.id);
      changed = true;
    }

    for (const patient of state.patients) {
      const signature = `${patient.id}:${patient.state}:${patient.priority}:${(patient.flags || []).join(',')}`;
      if (seenPatientIds.has(signature)) continue;
      seenPatientIds.add(signature);
      changed = true;
    }

    if (changed) {
      void import('../services/threeMinuteMissionService').then(({ evaluateThreeMinuteTriggers }) =>
        evaluateThreeMinuteTriggers(),
      );
    }
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export function startTimerEngine(): () => void {
  if (engineInterval) return stopTimerEngine;

  void import('../services/threeMinuteMissionService').then(({ hydrateThreeMinuteMissionsFromStore, evaluateThreeMinuteTriggers }) => {
    hydrateThreeMinuteMissionsFromStore();
    evaluateThreeMinuteTriggers();
  });

  unsubscribeStore = subscribeToMissionTriggers();
  checkEscalations();
  engineInterval = setInterval(checkEscalations, 5000);

  return stopTimerEngine;
}

function stopTimerEngine(): void {
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
}
