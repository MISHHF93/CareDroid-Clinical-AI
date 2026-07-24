import {
  DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  DUPLICATE_MANUAL_REVIEW_THRESHOLD,
  DUPLICATE_REVIEW_THRESHOLD,
  findPatientDuplicateCandidates,
  scorePatientDuplicate,
} from './patient-duplicate-detection';

type MinimalPatient = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: 'M' | 'F' | 'Other';
  mrn: string;
};

function makePatient(overrides: Partial<MinimalPatient> = {}): MinimalPatient {
  return {
    id: 'patient-1',
    firstName: 'Marcus',
    lastName: 'Chen',
    dob: '1965-03-14',
    sex: 'M',
    mrn: 'ED-100001',
    ...overrides,
  };
}

describe('scorePatientDuplicate', () => {
  it('returns null when nothing overlaps', () => {
    const result = scorePatientDuplicate(makePatient(), {
      firstName: 'Nobody',
      lastName: 'Nowhere',
    });
    expect(result).toBeNull();
  });

  it('scores an exact full-name + DOB + MRN match at or above the high-confidence threshold', () => {
    const patient = makePatient();
    const result = scorePatientDuplicate(patient, {
      firstName: 'Marcus',
      lastName: 'Chen',
      dob: '1965-03-14',
      mrn: 'ED-100001',
    });
    expect(result).not.toBeNull();
    expect(result!.matchScore).toBeGreaterThanOrEqual(DUPLICATE_HIGH_CONFIDENCE_THRESHOLD);
    expect(result!.recommendedAction).toBe('link_after_staff_confirmation');
    expect(result!.matchedFields).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'dob', 'mrn', 'fullName']),
    );
  });

  it('is case- and whitespace-insensitive when comparing string fields', () => {
    const result = scorePatientDuplicate(makePatient(), {
      firstName: '  MARCUS ',
      lastName: 'chen',
      dob: '1965-03-14',
    });
    expect(result!.matchedFields).toEqual(expect.arrayContaining(['firstName', 'lastName', 'dob']));
  });

  it('penalizes conflicting fields rather than just ignoring them', () => {
    const withoutConflict = scorePatientDuplicate(makePatient(), {
      firstName: 'Marcus',
      lastName: 'Chen',
    });
    const withConflict = scorePatientDuplicate(makePatient(), {
      firstName: 'Marcus',
      lastName: 'Chen',
      sex: 'F',
    });
    expect(withConflict!.conflictingFields).toContain('sex');
    expect(withConflict!.matchScore).toBeLessThan(withoutConflict!.matchScore);
  });

  it('does not treat two missing values as a match (both blank fields are simply skipped)', () => {
    const result = scorePatientDuplicate(makePatient({ mrn: '' }), {
      firstName: 'Marcus',
      lastName: 'Chen',
    });
    expect(result!.matchedFields).not.toContain('mrn');
    expect(result!.conflictingFields).not.toContain('mrn');
  });

  it('bounds the score at 100 even when every weighted field matches', () => {
    const result = scorePatientDuplicate(makePatient(), {
      firstName: 'Marcus',
      lastName: 'Chen',
      dob: '1965-03-14',
      sex: 'M',
      mrn: 'ED-100001',
    });
    expect(result!.matchScore).toBeLessThanOrEqual(100);
  });

  it('a first-name-only match (12 points) is too weak for even manual review', () => {
    const result = scorePatientDuplicate(makePatient(), { firstName: 'Marcus' });
    expect(result!.matchScore).toBe(12);
    expect(result!.recommendedAction).toBe('create_new_patient');
  });

  it('a matching MRN alone (35 points) lands exactly at the manual-review floor', () => {
    const result = scorePatientDuplicate(makePatient(), { mrn: 'ED-100001' });
    expect(result!.matchScore).toBe(DUPLICATE_MANUAL_REVIEW_THRESHOLD);
    expect(result!.recommendedAction).toBe('manual_review');
  });
});

describe('findPatientDuplicateCandidates', () => {
  const patients = [
    makePatient({
      id: 'p1',
      firstName: 'Marcus',
      lastName: 'Chen',
      dob: '1965-03-14',
      mrn: 'ED-100001',
    }),
    makePatient({
      id: 'p2',
      firstName: 'Dorothy',
      lastName: 'Walsh',
      dob: '1948-11-03',
      mrn: 'ED-100002',
    }),
    makePatient({
      id: 'p3',
      firstName: 'James',
      lastName: 'Tremblay',
      dob: '1978-05-19',
      mrn: 'ED-100003',
    }),
  ];

  it('returns only candidates at/above minScore, sorted highest match first', () => {
    const results = findPatientDuplicateCandidates(
      patients,
      { firstName: 'Marcus', lastName: 'Chen', dob: '1965-03-14' },
      { minScore: DUPLICATE_REVIEW_THRESHOLD },
    );
    expect(results).toHaveLength(1);
    expect(results[0].patientId).toBe('p1');
  });

  it('returns an empty array when no patient clears minScore', () => {
    const results = findPatientDuplicateCandidates(
      patients,
      { firstName: 'Zzyzx' },
      { minScore: DUPLICATE_REVIEW_THRESHOLD },
    );
    expect(results).toEqual([]);
  });

  it('respects the limit option', () => {
    const manyPatients = Array.from({ length: 8 }, (_, i) =>
      makePatient({ id: `dup-${i}`, mrn: `ED-100001` }),
    );
    const results = findPatientDuplicateCandidates(
      manyPatients,
      { mrn: 'ED-100001' },
      { minScore: 1, limit: 3 },
    );
    expect(results).toHaveLength(3);
  });
});
