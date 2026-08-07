import { afterEach, describe, expect, it } from 'vitest';
import { buildNativeAiPatientSnapshot } from './nativeAiCore';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { SIMULATION_MODE_STORAGE_KEY } from './simulationModeService';

const patient: Patient = {
  id: 'p1',
  mrn: 'ED-1',
  firstName: 'Sam',
  lastName: 'Lee',
  dob: '1980-01-01',
  age: 45,
  sex: 'M',
  arrivalTime: '2026-06-24T08:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Triage,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

afterEach(() => {
  window.localStorage.removeItem(SIMULATION_MODE_STORAGE_KEY);
});

describe('buildNativeAiPatientSnapshot sourceState honesty (2026-08-07)', () => {
  // Regression guard: orientation/prolongedStay/admissionMl/textFeatures are
  // hand-coded heuristic formulas (their own MODEL_VERSION strings admit it:
  // "*-xgboost-heuristic", "*-roberta-mha-cnn-heuristic") that each default
  // their own sourceState to 'demo' — an honest self-classification. Before
  // this fix, buildNativeAiPatientSnapshot passed the session-level
  // resolveSourceState() result straight through to every sub-prediction,
  // overriding that honest default with 'live' outside simulation mode —
  // mislabeling every one of these unvalidated heuristics as real live
  // inference everywhere the snapshot is consumed, most visibly in
  // AiTransparencyDashboard.

  it('reports demo for the 4 heuristic-labeled predictions outside simulation mode, even though the top-level/routing state is live', () => {
    const snapshot = buildNativeAiPatientSnapshot(patient);

    expect(snapshot.sourceState).toBe('live');
    expect(snapshot.routing.sourceState).toBe('live');
    expect(snapshot.orientation.sourceState).toBe('demo');
    expect(snapshot.prolongedStay.sourceState).toBe('demo');
    expect(snapshot.admissionMl.sourceState).toBe('demo');
    expect(snapshot.textFeatures.sourceState).toBe('demo');
  });

  it('propagates an honest "simulated" state to the heuristic predictions too (that disclosure is still accurate, unlike a blanket "live")', () => {
    const snapshot = buildNativeAiPatientSnapshot(patient, { sourceState: 'simulated' });

    expect(snapshot.sourceState).toBe('simulated');
    expect(snapshot.routing.sourceState).toBe('simulated');
    expect(snapshot.orientation.sourceState).toBe('simulated');
    expect(snapshot.prolongedStay.sourceState).toBe('simulated');
    expect(snapshot.admissionMl.sourceState).toBe('simulated');
    expect(snapshot.textFeatures.sourceState).toBe('simulated');
  });

  it('does not let an arbitrary caller-supplied override launder a heuristic prediction into a state other than demo/simulated (no real caller does this today, but the guard is deliberate)', () => {
    const snapshot = buildNativeAiPatientSnapshot(patient, { sourceState: 'shadow' });

    expect(snapshot.sourceState).toBe('shadow');
    expect(snapshot.orientation.sourceState).toBe('demo');
    expect(snapshot.prolongedStay.sourceState).toBe('demo');
    expect(snapshot.admissionMl.sourceState).toBe('demo');
    expect(snapshot.textFeatures.sourceState).toBe('demo');
  });
});
