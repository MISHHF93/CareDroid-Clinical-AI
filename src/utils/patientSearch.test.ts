import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  filterPatientsBySearch,
  parseDobQuery,
  patientMatchesSearch,
  rankPatientsBySearch,
  scorePatientSearch,
} from './patientSearch';

const basePatient: Patient = {
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

describe('patientSearch', () => {
  it('parses common DOB formats', () => {
    expect(parseDobQuery('1991-06-18')).toBe('1991-06-18');
    expect(parseDobQuery('06/18/1991')).toBe('1991-06-18');
    expect(parseDobQuery('06181991')).toBe('1991-06-18');
  });

  it('supports exact and partial name search', () => {
    expect(scorePatientSearch(basePatient, 'Mei Li')?.matchKind).toBe('exact-name');
    expect(patientMatchesSearch(basePatient, 'mei')).toBe(true);
    expect(patientMatchesSearch(basePatient, 'Li')).toBe(true);
  });

  it('supports exact MRN and digit-only MRN search', () => {
    expect(scorePatientSearch(basePatient, 'ED-001243')?.matchKind).toBe('exact-mrn');
    expect(patientMatchesSearch(basePatient, '001243')).toBe(true);
  });

  it('supports DOB search', () => {
    expect(scorePatientSearch(basePatient, '1991-06-18')?.matchKind).toBe('exact-dob');
    expect(patientMatchesSearch(basePatient, '06/18/1991')).toBe(true);
  });

  it('supports phone search when phone is present', () => {
    expect(scorePatientSearch(basePatient, '4165550177')?.matchKind).toBe('exact-phone');
    expect(patientMatchesSearch(basePatient, '555-0177')).toBe(true);
  });

  it('supports health card search when health card is present', () => {
    expect(scorePatientSearch(basePatient, 'HC-9922-441')?.matchKind).toBe('exact-health-card');
    expect(patientMatchesSearch(basePatient, '9922441')).toBe(true);
  });

  it('ranks exact matches ahead of partial matches', () => {
    const partial = { ...basePatient, id: 'p2', firstName: 'Meiling', lastName: 'Liu', mrn: 'ED-999' };
    const ranked = rankPatientsBySearch([partial, basePatient], 'Mei Li');
    expect(ranked[0]?.patient.id).toBe('p10');
  });

  it('filters reception queues with the same matcher', () => {
    expect(filterPatientsBySearch([basePatient], '06181991')).toHaveLength(1);
    expect(filterPatientsBySearch([basePatient], 'z')).toHaveLength(0);
  });
});
