import { describe, expect, it } from 'vitest';
import {
  applyPreArrivalCheckIn,
  buildPreArrivalPlaceholderPatient,
  isPreArrivalPlaceholder,
} from './preArrivalWorkflow';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

const sampleArrival = {
  id: 'ems-1',
  unitId: 'unit-1',
  unitName: 'Medic 12',
  crewNames: ['A', 'B'],
  patientAge: 54,
  patientSex: 'Male' as const,
  chiefComplaint: 'Chest pain',
  eta: 8,
  severity: 'High' as const,
  dispatchTime: new Date().toISOString(),
  estimatedArrivalTime: new Date().toISOString(),
  notes: '',
  status: 'Inbound' as const,
  prearrivalComplaint: 'Chest pain',
  priority: Priority.P2,
};

describe('preArrivalWorkflow', () => {
  it('builds inbound placeholder patients for the whiteboard', () => {
    const patient = buildPreArrivalPlaceholderPatient(sampleArrival);
    expect(patient.state).toBe(PatientState.Arrival);
    expect(patient.flags).toContain(PatientFlag.IdentityPending);
    expect(isPreArrivalPlaceholder(patient)).toBe(true);
  });

  it('completes arrival check-in without changing patient id', () => {
    const patient = buildPreArrivalPlaceholderPatient(sampleArrival);
    const updated = applyPreArrivalCheckIn(patient, {
      firstName: 'Alex',
      lastName: 'Morgan',
      dob: '1970-04-12',
    });

    expect(updated.id).toBe(patient.id);
    expect(updated.firstName).toBe('Alex');
    expect(updated.registrationStatus).toBe('complete');
    expect(updated.emsArrival?.status).toBe('Arrived');
    expect(isPreArrivalPlaceholder(updated)).toBe(false);
  });
});