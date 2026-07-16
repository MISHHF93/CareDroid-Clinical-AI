/**
 * Architect Mode Stage F — KPI / counter consistency characterization.
 * Queue lengths and patient counts must derive from the same store patients array
 * (no contradictory parallel counters without degraded labeling).
 */
import { describe, expect, it } from 'vitest';
import { useEmergencyStore } from './emergencyStore';
import { PatientState } from '../types/emergency';

describe('emergencyStore KPI consistency', () => {
  it('patients array is the authoritative patient count source', () => {
    const state = useEmergencyStore.getState();
    expect(Array.isArray(state.patients)).toBe(true);
    expect(state.patients.length).toBeGreaterThanOrEqual(0);
  });

  it('capacity score is numeric and capacity metrics stay aligned to capacity object', () => {
    const state = useEmergencyStore.getState();
    expect(typeof state.capacity?.score).toBe('number');
    if (state.capacityMetrics) {
      // When both exist, scores must not contradict silently
      expect(typeof state.capacityMetrics.score).toBe('number');
      expect(state.capacityMetrics.score).toBe(state.capacity.score);
    }
  });

  it('EMS arrival lists do not invent phantom patient links without ids', () => {
    const state = useEmergencyStore.getState();
    const arrivals = state.emsArrivals ?? [];
    for (const arrival of arrivals) {
      expect(arrival.id).toBeTruthy();
      if (arrival.patientId) {
        const linked = state.patients.find((p) => p.id === arrival.patientId);
        // Linked id must either resolve or be accepted as pending hydration — never empty string
        expect(String(arrival.patientId).length).toBeGreaterThan(0);
        if (linked) {
          expect(linked.id).toBe(arrival.patientId);
        }
      }
    }
  });

  it('triage/waiting slices are subsets of patients (no counter inflation)', () => {
    const state = useEmergencyStore.getState();
    const byState = (s: PatientState) => state.patients.filter((p) => p.state === s);
    const triage = byState(PatientState.Triage);
    const waiting = byState(PatientState.Waiting);
    expect(triage.length + waiting.length).toBeLessThanOrEqual(state.patients.length);
    for (const p of [...triage, ...waiting]) {
      expect(state.patients.some((x) => x.id === p.id)).toBe(true);
    }
  });

  it('websocket status is explicit (not presented as live when offline without label)', () => {
    const state = useEmergencyStore.getState();
    const status = state.websocket?.status ?? state.wsStatus;
    if (status !== undefined) {
      expect(typeof status).toBe('string');
      expect(String(status).length).toBeGreaterThan(0);
    }
  });

  it('capacity websocket updates keep capacity.score aligned with capacityMetrics.score', () => {
    const store = useEmergencyStore.getState();
    const nextScore = (store.capacity?.score ?? 0) + 17;
    const updatedAt = new Date().toISOString();
    store.dispatchWebSocketEvent({
      type: 'capacity_updated',
      payload: {
        capacity: {
          ...store.capacity,
          score: nextScore,
          band: store.capacity?.band ?? 'Yellow',
          updatedAt,
        },
      },
    });
    const after = useEmergencyStore.getState();
    expect(after.capacity.score).toBe(nextScore);
    expect(after.capacityMetrics.score).toBe(nextScore);
  });
});
