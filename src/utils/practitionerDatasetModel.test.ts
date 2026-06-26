import { describe, expect, it } from 'vitest';
import {
  capPatientsForPractitionerView,
  dedupePatientsByMrn,
  shapePractitionerSeedPatients,
} from './practitionerDatasetModel';

describe('practitionerDatasetModel', () => {
  it('caps patients to a representative cross-queue sample', () => {
    const patients = Array.from({ length: 30 }, (_, index) => ({
      id: `pt-${index}`,
      mrn: `MRN-${index}`,
      state: ['Waiting', 'Triage', 'Assessment', 'Orders'][index % 4],
    }));

    const capped = capPatientsForPractitionerView(patients);
    expect(capped).toHaveLength(18);
    expect(new Set(capped.map((patient) => patient.state)).size).toBeGreaterThan(1);
  });

  it('dedupes patients by MRN', () => {
    const patients = [
      { id: 'a', mrn: 'ED-1' },
      { id: 'b', mrn: 'ED-1' },
      { id: 'c', mrn: 'ED-2' },
    ];
    expect(dedupePatientsByMrn(patients)).toHaveLength(2);
  });

  it('shapes seed patients by deduping then capping', () => {
    const patients = Array.from({ length: 24 }, (_, index) => ({
      id: `pt-${index}`,
      mrn: index % 6 === 0 ? 'ED-DUP' : `MRN-${index}`,
      state: ['Waiting', 'Triage', 'Assessment'][index % 3],
    }));

    const shaped = shapePractitionerSeedPatients(patients);
    expect(shaped).toHaveLength(18);
    expect(shaped.filter((patient) => patient.mrn === 'ED-DUP')).toHaveLength(1);
  });
});