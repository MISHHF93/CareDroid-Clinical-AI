import { describe, expect, it } from 'vitest';
import type { Patient } from '../types/emergency';
import {
  asPatientVitalsArray,
  hasPatientFlag,
  latestPatientVitals,
  normalizePatientVitals,
  normalizeWhiteboardPatient,
} from './patientVitals';

describe('patientVitals', () => {
  it('returns empty array for missing vitals', () => {
    expect(asPatientVitalsArray(undefined)).toEqual([]);
    expect(latestPatientVitals({ vitals: undefined } as Patient)).toBeUndefined();
  });

  it('wraps a single vitals object in an array', () => {
    const vitals = { hr: 88, sbp: 120, dbp: 80 };
    expect(asPatientVitalsArray(vitals)).toEqual([vitals]);
    expect(latestPatientVitals({ vitals } as Patient)).toEqual(vitals);
  });

  it('normalizes patient vitals to an array', () => {
    const patient = { id: 'p1', vitals: { hr: 72 } } as Patient;
    expect(normalizePatientVitals(patient).vitals).toEqual([{ hr: 72 }]);
  });

  it('normalizes missing flags to an empty array', () => {
    const patient = { id: 'p1', vitals: undefined } as Patient;
    expect(normalizeWhiteboardPatient(patient).flags).toEqual([]);
    expect(hasPatientFlag(patient, 'HighRisk')).toBe(false);
  });
});