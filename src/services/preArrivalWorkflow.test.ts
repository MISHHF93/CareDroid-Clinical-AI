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

  it('HEAL-277: keeps the top-level arrivalTime synced with arrival.arrivalTimestamp on check-in, matching syncPatientFromArrival', () => {
    // WhoNextPanel/ReassessmentDrawer read patient.arrivalTime directly;
    // the main whiteboard reads arrival.arrivalTimestamp first. If the
    // real EMS arrival time only updated one of the two, the same patient
    // would show two different wait times on the same screen.
    const patient = buildPreArrivalPlaceholderPatient(sampleArrival);
    const placeholderTimestamp = patient.arrivalTime;

    const updated = applyPreArrivalCheckIn(
      patient,
      { firstName: 'Alex', lastName: 'Morgan' },
      '2026-08-16T14:22:00.000Z',
    );

    expect(updated.emsArrival?.arrivedAt).toBe('2026-08-16T14:22:00.000Z');
    expect(updated.arrival?.arrivalTimestamp).toBe('2026-08-16T14:22:00.000Z');
    expect(updated.arrivalTime).toBe('2026-08-16T14:22:00.000Z');
    expect(updated.arrivalTime).not.toBe(placeholderTimestamp);
    expect(updated.arrivalTime).toBe(updated.arrival?.arrivalTimestamp);
  });
});
