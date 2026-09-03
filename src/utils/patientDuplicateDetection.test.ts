import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  findDuplicateCandidates,
  findDuplicateCandidatesFromQuery,
  scorePatientDuplicate,
} from './patientDuplicateDetection';

const existing: Patient = {
  id: 'p10',
  mrn: 'ED-001243',
  firstName: 'Mei',
  lastName: 'Li',
  dob: '1991-06-18',
  age: 33,
  sex: 'F',
  phone: '416-555-0177',
  healthCardNumber: 'HC-9922-441',
  arrivalTime: '2026-06-17T12:00:00.000Z',
  chiefComplaint: 'Rash',
  complaintCategory: 'Allergy',
  state: PatientState.Registration,
  priority: Priority.P4,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('patientDuplicateDetection', () => {
  it('scores high-confidence identity matches', () => {
    const candidate = scorePatientDuplicate(existing, {
      firstName: 'Mei',
      lastName: 'Li',
      dateOfBirth: '1991-06-18',
      mrn: 'ED-001243',
    });

    expect(candidate?.matchScore).toBeGreaterThanOrEqual(DUPLICATE_HIGH_CONFIDENCE_THRESHOLD);
    expect(candidate?.recommendedAction).toBe('link_after_staff_confirmation');
  });

  it('flags possible duplicates from health card digits', () => {
    const candidates = findDuplicateCandidates(
      [existing],
      { healthCardNumber: '9922441' },
      { minScore: 35 },
    );

    expect(candidates[0]?.patientId).toBe('p10');
    expect(candidates[0]?.matchedFields).toContain('healthCardNumber');
  });

  it('finds duplicates from reception search queries with strong identifiers', () => {
    expect(
      findDuplicateCandidatesFromQuery([existing], '1991-06-18', { minScore: 25 })[0]?.patientId,
    ).toBe('p10');
    expect(
      findDuplicateCandidatesFromQuery([existing], 'ED-001243', { minScore: 35 })[0]?.patientId,
    ).toBe('p10');
    expect(findDuplicateCandidatesFromQuery([existing], 'Mei Li')[0]?.patientId).toBe('p10');
    expect(
      findDuplicateCandidates([existing], {
        firstName: 'Mei',
        lastName: 'Li',
        dateOfBirth: '1991-06-18',
        healthCardNumber: 'HC-9922-441',
      })[0]?.patientId,
    ).toBe('p10');
  });
});
