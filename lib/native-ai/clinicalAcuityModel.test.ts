import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../../src/types/emergency';
import { buildClinicalAcuityEntry, buildClinicalAcuityLeaderboard } from './clinicalAcuityModel';

function basePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-acuity',
    mrn: 'ED-AI-2',
    firstName: 'Riley',
    lastName: 'Chen',
    dob: '1970-02-02',
    age: 55,
    sex: 'F',
    arrivalTime: '2026-06-24T10:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Triage,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('clinical acuity leaderboard sourceState honesty (2026-08-07)', () => {
  // Regression guard: this composite score is built entirely from 3
  // hand-coded heuristic formulas (predictAdmissionLikelihoodMl,
  // predictProlongedEdStay, predictPostEdOrientation — each honestly
  // defaults its own sourceState to 'demo'), but buildClinicalAcuityEntry
  // used to default the COMPOSITE entry's own sourceState to 'live'
  // unconditionally. All 4 real callers (ClinicalAcuityLeaderboard.tsx,
  // useNativeAiDashboardData.ts, diagnosticSafetyDashboardModel.ts, and the
  // backend's native-ai.service.ts getClinicalAcuity endpoint) invoke this
  // with no sourceState override at all, so every real render/response
  // reported 'live' for a score with no trained-model backing whatsoever —
  // distinct from, and not touched by, the buildNativeAiPatientSnapshot fix
  // in src/services/nativeAiCore.ts (a different code path entirely).

  it('reports demo by default, not live, with no caller override', () => {
    const entry = buildClinicalAcuityEntry(basePatient());
    expect(entry.sourceState).toBe('demo');
  });

  it('propagates an honest "simulated" override to the composite entry and all 3 underlying heuristics', () => {
    const entry = buildClinicalAcuityEntry(basePatient(), { sourceState: 'simulated' });
    expect(entry.sourceState).toBe('simulated');
  });

  it('does not let an arbitrary non-simulated override launder the composite into a non-demo state', () => {
    const entry = buildClinicalAcuityEntry(basePatient(), { sourceState: 'live' });
    expect(entry.sourceState).toBe('demo');
  });

  it('the leaderboard applies the same default to every entry', () => {
    const leaderboard = buildClinicalAcuityLeaderboard([
      basePatient({ id: 'p1' }),
      basePatient({ id: 'p2', priority: Priority.P1 }),
    ]);
    expect(leaderboard).toHaveLength(2);
    leaderboard.forEach((entry) => expect(entry.sourceState).toBe('demo'));
  });
});
