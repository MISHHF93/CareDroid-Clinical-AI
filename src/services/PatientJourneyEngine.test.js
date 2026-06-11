import { describe, expect, it } from 'vitest';
import PatientJourneyEngine from './PatientJourneyEngine';
import { PatientState } from '../../types/emergency';

const basePatient = Object.freeze({
  id: 'patient-001',
  name: 'Test Patient',
  arrivalTime: '2026-06-10T20:00:00-04:00',
  complaint: 'Chest pain',
  state: PatientState.Registration,
  priority: 'CTAS 2',
  vitals: Object.freeze({ heartRate: 104 }),
  assignedTo: 'RN Test',
});

describe('PatientJourneyEngine', () => {
  it('allows direct next-state movement and creates a timestamped audit event', () => {
    const result = PatientJourneyEngine.transitionPatient(basePatient, PatientState.Triage, {
      transitionedAt: '2026-06-11T01:30:00.000Z',
      actor: 'unit-test',
    });

    expect(result.ok).toBe(true);
    expect(result.patient.state).toBe(PatientState.Triage);
    expect(result.auditEvent).toEqual(
      expect.objectContaining({
        patientId: basePatient.id,
        patientName: basePatient.name,
        fromState: PatientState.Registration,
        toState: PatientState.Triage,
        transitionedAt: '2026-06-11T01:30:00.000Z',
        actor: 'unit-test',
      })
    );
  });

  it('rejects skipped states so triage happens before assessment', () => {
    const result = PatientJourneyEngine.transitionPatient(basePatient, PatientState.Assessment);

    expect(result.ok).toBe(false);
    expect(result.patient.state).toBe(PatientState.Registration);
    expect(result.auditEvent).toBeNull();
    expect(result.message).toMatch(/must move to Triage before Assessment/i);
  });

  it('resolves the next state for one-click whiteboard moves', () => {
    const result = PatientJourneyEngine.transitionPatientToNextState({
      ...basePatient,
      state: PatientState.Results,
    });

    expect(result.ok).toBe(true);
    expect(result.patient.state).toBe(PatientState.Disposition);
  });
});
