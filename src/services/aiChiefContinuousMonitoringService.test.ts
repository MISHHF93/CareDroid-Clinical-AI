import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { buildAiChiefOrchestrationSnapshot } from './aiChiefContinuousMonitoringService';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    name: 'Test Patient',
    mrn: 'MRN-1',
    age: 55,
    sex: 'M',
    priority: Priority.P1,
    state: PatientState.Triage,
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain',
    flags: [],
    ...overrides,
  } as Patient;
}

describe('aiChiefContinuousMonitoringService', () => {
  it('builds explainable recommendations and operational risks from live store slices', () => {
    const snapshot = buildAiChiefOrchestrationSnapshot({
      pathname: '/emergency/command-center',
      patients: [makePatient()],
      alerts: [
        {
          id: 'alert-1',
          title: 'Critical vitals',
          message: 'Hypotension detected',
          severity: 'Critical',
          acknowledged: false,
          dismissed: false,
          createdAt: new Date().toISOString(),
        } as any,
      ],
    });

    expect(snapshot.domainStatuses).toHaveLength(10);
    expect(snapshot.recommendations.length).toBeGreaterThan(0);
    expect(snapshot.recommendations.every((rec) => rec.humanReviewRequired)).toBe(true);
    expect(snapshot.recommendations.every((rec) => rec.advisoryOnly)).toBe(true);
    expect(snapshot.risks.some((risk) => risk.domain === 'alerts')).toBe(true);
    expect(snapshot.patientContexts[0]?.phaseLabel).toBeTruthy();
    expect(snapshot.safety.replacesClinicianJudgment).toBe(false);
  });

  it('summarizes patient context for prioritization without removing clinician responsibility', () => {
    const snapshot = buildAiChiefOrchestrationSnapshot({
      patients: [
        makePatient({ id: 'p1', priority: Priority.P1 }),
        makePatient({ id: 'p2', priority: Priority.P4, state: PatientState.Waiting }),
      ],
      selectedPatientId: 'p2',
    });

    expect(snapshot.patientContexts[0]?.patientId).toBe('p2');
    expect(snapshot.metrics.p1p2Patients).toBe(1);
    expect(snapshot.patientContexts.every((context) => context.humanReviewRequired)).toBe(true);
  });
});
