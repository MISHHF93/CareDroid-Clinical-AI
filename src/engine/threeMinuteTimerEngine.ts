import { dispatchAlert } from './alertEngine';
import { useEmergencyStore } from '../store/emergencyStore';
import type { ResponseTimerPhase, EscalationEvent, ResponseTimerState } from '../types/emergency';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ResponseTimerPhase, EscalationEvent, ResponseTimerState };

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
    title: '2-Minute Alert: Escalating to charge nurse',
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
  initialStartedAt?: string,
): string {
  const timerId = makeTimerId(patientId, triggerAlertId);
  const existing = activeTimers.get(timerId);
  if (existing) return timerId;

  const store = useEmergencyStore.getState();
  const existingInStore = store.responseTimers.find((t) => t.timerId === timerId);
  if (existingInStore) {
    activeTimers.set(timerId, existingInStore);
    return timerId;
  }

  const newTimer: ResponseTimerState = {
    timerId,
    patientId,
    triggerAlertId,
    startedAt: initialStartedAt ?? new Date().toISOString(),
    phase: 'running',
    ownerRole,
    escalationHistory: [],
  };

  activeTimers.set(timerId, newTimer);
  store.upsertResponseTimer(newTimer);

  void import('../services/threeMinuteMissionService')
    .then(({ syncThreeMinuteMissionsFromEngine }) => syncThreeMinuteMissionsFromEngine())
    .catch((error) => {
      console.error(
        '[ThreeMinuteTimerEngine] syncThreeMinuteMissionsFromEngine (startTimer) failed:',
        error,
      );
    });

  return timerId;
}

export function acknowledgeResponseTimer(timerId: string, acknowledgedBy: string): boolean {
  const timer =
    activeTimers.get(timerId) ??
    useEmergencyStore.getState().responseTimers.find((t) => t.timerId === timerId);
  if (!timer || timer.acknowledgedAt) return false;

  const elapsed = elapsedSeconds(timer.startedAt);
  const updatedTimer: ResponseTimerState = {
    ...timer,
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy,
    phase: elapsed >= 180 ? 'breach_resolved' : 'acknowledged',
  };

  activeTimers.set(timerId, updatedTimer);
  useEmergencyStore.getState().upsertResponseTimer(updatedTimer);

  void import('../services/threeMinuteMissionService')
    .then(({ syncThreeMinuteMissionsFromEngine }) => syncThreeMinuteMissionsFromEngine())
    .catch((error) => {
      console.error(
        '[ThreeMinuteTimerEngine] syncThreeMinuteMissionsFromEngine (acknowledge) failed:',
        error,
      );
    });

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
        void import('../services/emergencyCareJourneyOrchestrator')
          .then(({ onThreeMinuteBreachForPatient }) =>
            onThreeMinuteBreachForPatient(timer.patientId),
          )
          .catch((error) => {
            console.error('[ThreeMinuteTimerEngine] onThreeMinuteBreachForPatient failed:', error);
          });
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
      useEmergencyStore.getState().upsertResponseTimer(current);
    }
  }

  void import('../services/threeMinuteMissionService')
    .then(({ syncThreeMinuteMissionsFromEngine }) => syncThreeMinuteMissionsFromEngine())
    .catch((error) => {
      console.error(
        '[ThreeMinuteTimerEngine] syncThreeMinuteMissionsFromEngine (checkEscalations) failed:',
        error,
      );
    });
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
      void import('../services/threeMinuteMissionService')
        .then(({ evaluateThreeMinuteTriggers }) => evaluateThreeMinuteTriggers())
        .catch((error) => {
          console.error('[ThreeMinuteTimerEngine] evaluateThreeMinuteTriggers failed:', error);
        });
    }
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export function startTimerEngine(): () => void {
  if (engineInterval) return stopTimerEngine;

  // Hydrate activeTimers from emergencyStore (which loaded from localStorage)
  for (const storedTimer of useEmergencyStore.getState().responseTimers) {
    if (!storedTimer.acknowledgedAt && !activeTimers.has(storedTimer.timerId)) {
      activeTimers.set(storedTimer.timerId, storedTimer);
    }
  }

  void import('../services/threeMinuteMissionService')
    .then(({ hydrateThreeMinuteMissionsFromStore, evaluateThreeMinuteTriggers }) => {
      hydrateThreeMinuteMissionsFromStore();
      evaluateThreeMinuteTriggers();
    })
    .catch((error) => {
      console.error('[ThreeMinuteTimerEngine] hydrateThreeMinuteMissionsFromStore failed:', error);
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

/** Test-only helper to reset singleton engine state between test cases. */
export function __resetEngineStateForTests(): void {
  activeTimers.clear();
  stopTimerEngine();
}
