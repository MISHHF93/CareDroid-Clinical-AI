import { beforeEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  acknowledgeResponseTimer,
  acknowledgeTimerForPatient,
  getActiveTimerForPatient,
  getAllActiveTimers,
  getTimerState,
  startResponseTimer,
  startTimerEngine,
  __resetEngineStateForTests,
} from './threeMinuteTimerEngine';

describe('threeMinuteTimerEngine & store persistence', () => {
  beforeEach(() => {
    __resetEngineStateForTests();
    useEmergencyStore.setState({
      responseTimers: [],
      alerts: [],
      patients: [],
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('starts a new response timer and persists it to emergencyStore and localStorage', () => {
    const timerId = startResponseTimer('patient-test-1', 'alert-test-1', 'triage_nurse');

    expect(timerId).toBe('tmr_patient-test-1_alert-test-1');
    const timer = getTimerState(timerId);
    expect(timer).toBeDefined();
    expect(timer?.phase).toBe('running');
    expect(timer?.ownerRole).toBe('triage_nurse');

    // Verify it synced to useEmergencyStore
    const storeTimers = useEmergencyStore.getState().responseTimers;
    expect(storeTimers.some((t) => t.timerId === timerId)).toBe(true);

    // Verify it persisted to localStorage
    const rawLocal = localStorage.getItem('caredroid-response-timers');
    expect(rawLocal).toBeTruthy();
    const parsedLocal = JSON.parse(rawLocal!);
    expect(parsedLocal.some((t: any) => t.timerId === timerId)).toBe(true);
  });

  it('deduplicates startResponseTimer and preserves original startedAt timestamp', () => {
    const originalStartedAt = '2026-06-28T12:00:00.000Z';
    const timerId = startResponseTimer(
      'patient-test-2',
      'alert-test-2',
      'triage_nurse',
      originalStartedAt,
    );

    const firstTimer = getTimerState(timerId);
    expect(firstTimer?.startedAt).toBe(originalStartedAt);

    // Attempt to start again
    const secondTimerId = startResponseTimer('patient-test-2', 'alert-test-2', 'charge_nurse');
    expect(secondTimerId).toBe(timerId);
    expect(getTimerState(timerId)?.startedAt).toBe(originalStartedAt);
  });

  it('acknowledges response timer, resolves phase, and updates store', () => {
    const timerId = startResponseTimer('patient-test-3', 'alert-test-3', 'triage_nurse');
    expect(getAllActiveTimers().some((t) => t.timerId === timerId)).toBe(true);

    const ackResult = acknowledgeResponseTimer(timerId, 'nurse-sarah');
    expect(ackResult).toBe(true);

    const timer = getTimerState(timerId);
    expect(timer?.acknowledgedAt).toBeTruthy();
    expect(timer?.acknowledgedBy).toBe('nurse-sarah');
    expect(timer?.phase).toBe('acknowledged');

    // Should no longer appear in getAllActiveTimers
    expect(getAllActiveTimers().some((t) => t.timerId === timerId)).toBe(false);

    // Should be updated in useEmergencyStore
    const storeTimer = useEmergencyStore
      .getState()
      .responseTimers.find((t) => t.timerId === timerId);
    expect(storeTimer?.acknowledgedBy).toBe('nurse-sarah');
    expect(storeTimer?.phase).toBe('acknowledged');
  });

  it('acknowledges timer by patientId correctly', () => {
    startResponseTimer('patient-test-4', 'alert-test-4', 'triage_nurse');
    expect(getActiveTimerForPatient('patient-test-4')).toBeDefined();

    const ackResult = acknowledgeTimerForPatient('patient-test-4', 'dr-chen');
    expect(ackResult).toBe(true);
    expect(getActiveTimerForPatient('patient-test-4')).toBeUndefined();
  });

  it('hydrates active timers from emergencyStore upon engine restart', () => {
    const simulatedSavedTimer = {
      timerId: 'tmr_patient-persisted_alert-1',
      patientId: 'patient-persisted',
      triggerAlertId: 'alert-1',
      startedAt: new Date(Date.now() - 60000).toISOString(),
      phase: 'running' as const,
      ownerRole: 'charge_nurse',
      escalationHistory: [],
    };

    useEmergencyStore.setState({
      responseTimers: [simulatedSavedTimer],
    });

    // Start engine
    const stop = startTimerEngine();
    try {
      const timer = getTimerState('tmr_patient-persisted_alert-1');
      expect(timer).toBeDefined();
      expect(timer?.patientId).toBe('patient-persisted');
      expect(timer?.ownerRole).toBe('charge_nurse');
    } finally {
      stop();
    }
  });
});
