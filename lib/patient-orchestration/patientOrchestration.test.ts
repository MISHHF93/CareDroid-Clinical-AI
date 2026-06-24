import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../../src/types/emergency';
import { buildPatientCardOrchestrationContext } from './recommendTools';
import { resolveOperationalStage } from './resolveOperationalStage';

function basePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Patient',
    dob: '1980-01-01',
    age: 45,
    sex: 'M',
    arrivalTime: new Date(Date.now() - 45 * 60_000).toISOString(),
    chiefComplaint: 'Chest pain',
    complaintCategory: 'cardiac',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [{ hr: 88, sbp: 130, dbp: 80, spo2: 98, rr: 18, temp: 37, recordedAt: new Date().toISOString() }],
    flags: [],
    notes: [],
    timeline: [],
    complaint: 'Chest pain',
    ...overrides,
  };
}

describe('resolveOperationalStage', () => {
  it('maps triage state to triage_handoff', () => {
    const result = resolveOperationalStage(basePatient({ state: PatientState.Triage }));
    expect(result.primary).toBe('triage_handoff');
  });

  it('adds deterioration overlay for sepsis flag', () => {
    const result = resolveOperationalStage(
      basePatient({ flags: [PatientFlag.SepsisAlert], state: PatientState.Assessment }),
    );
    expect(result.overlays).toContain('deterioration_concern');
  });
});

describe('buildPatientCardOrchestrationContext', () => {
  it('recommends HEART for chest pain at triage', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient(),
      role: 'triage_nurse',
    });
    expect(context.complaintRoute?.complaint).toBe('Chest Pain');
    expect(context.prioritizedRecommendations.some((rec) => rec.toolId === 'heart-score')).toBe(true);
    expect(context.promptContext).toContain('Human review required');
  });

  it('blocks clinical tools when identity is pending for triage nurse', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient({ flags: [PatientFlag.IdentityPending] }),
      role: 'triage_nurse',
    });
    expect(context.blockedReasons['heart-score']).toBeTruthy();
    expect(context.prioritizedRecommendations.find((rec) => rec.toolId === 'heart-score')).toBeUndefined();
  });

  it('surfaces sepsis bundle when sepsis alert is active', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient({
        flags: [PatientFlag.SepsisAlert],
        chiefComplaint: 'Fever and hypotension',
        complaint: 'Fever and hypotension',
        state: PatientState.Assessment,
      }),
      role: 'physician',
    });
    expect(context.prioritizedRecommendations.some((rec) => rec.toolId === 'sepsis-bundle')).toBe(true);
  });
});