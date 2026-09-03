import { describe, expect, it } from 'vitest';
import { PatientState } from '../types/emergency';
import {
  buildSelfCheckinPatient,
  createEmptySelfCheckinForm,
  lookupProvincialHealthRecord,
  validateSelfCheckinStep,
} from './selfCheckinService';
import { patientArrivalContractViolations } from './patientArrivalBackendSync';

describe('selfCheckinService', () => {
  it('validates required fields per step', () => {
    const empty = createEmptySelfCheckinForm();
    expect(validateSelfCheckinStep('demographics', empty)).toMatch(/name/i);
    expect(validateSelfCheckinStep('visit', empty)).toMatch(/reason/i);
    expect(validateSelfCheckinStep('allergies', empty)).toMatch(/allerg/i);
  });

  it('builds a normalized self-check-in patient with allergy note', () => {
    const result = buildSelfCheckinPatient(
      {
        ...createEmptySelfCheckinForm(),
        firstName: 'Alex',
        lastName: 'Kim',
        dateOfBirth: '1990-01-01',
        sex: 'Female',
        phone: '555-0100',
        complaint: 'Chest pain',
        noKnownAllergies: false,
        allergyDetails: 'Penicillin - rash',
      },
      { now: '2026-06-20T12:00:00.000Z', patientId: 'self-test-1' },
    );

    expect(result.patient.arrival).toMatchObject({
      arrivalMode: 'self-check-in',
      chiefComplaint: 'Chest pain',
      waitingRoomStatus: 'waiting-for-triage',
      queueDestination: 'triage-queue',
    });
    expect(result.patient.state).toBe(PatientState.Triage);
    expect(result.patient.source).toBe('Self-arrival');
    expect(result.patient.notes[0]?.body).toContain('Penicillin');
    expect(patientArrivalContractViolations(result.patient)).toEqual([]);
  });

  it('populates the structured allergies field from free text (HEAL-188)', () => {
    const result = buildSelfCheckinPatient({
      ...createEmptySelfCheckinForm(),
      firstName: 'Alex',
      lastName: 'Kim',
      complaint: 'Chest pain',
      noKnownAllergies: false,
      allergyDetails: 'Penicillin, Latex ; Shellfish',
    });

    expect(result.patient.allergies).toEqual(['Penicillin', 'Latex', 'Shellfish']);
  });

  it('records no-known-allergies when selected', () => {
    const result = buildSelfCheckinPatient({
      ...createEmptySelfCheckinForm(),
      firstName: 'Sam',
      lastName: 'Lee',
      complaint: 'Sore throat',
      noKnownAllergies: true,
      allergyDetails: '',
    });

    expect(result.patient.notes[0]?.body).toMatch(/no known drug allergies/i);
    expect(result.patient.allergies).toEqual([]);
  });

  it('returns unavailable provincial lookup placeholder', async () => {
    const lookup = await lookupProvincialHealthRecord({
      firstName: 'Alex',
      lastName: 'Kim',
      dateOfBirth: '1990-01-01',
    });

    expect(lookup.status).toBe('unavailable');
  });
});
