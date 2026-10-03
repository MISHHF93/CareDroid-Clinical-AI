import { describe, expect, it } from 'vitest';
import { CareDroidFhirTransformer } from './fhirTransformer';
import { DicomWebAdapter } from './dicomAdapter';

describe('CareDroidFhirTransformer', () => {
  it('converts CareDroid patient record to compliant FHIR R4 Bundle', () => {
    const bundle = CareDroidFhirTransformer.toFhirBundle(
      {
        id: 'pt-10492',
        mrn: 'MRN-99014',
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1975-04-12',
        phone: '416-555-0199',
        chiefComplaint: 'Acute chest pain radiating to left arm',
        triageAcuity: 'ESI-2',
        vitals: {
          heartRateBpm: 104,
          spO2Percent: 96,
        },
      },
      'enc-8812',
    );

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
    expect(bundle.entry.length).toBeGreaterThanOrEqual(4);

    const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
    expect(patientEntry).toBeDefined();

    const encounterEntry = bundle.entry.find((e) => e.resource.resourceType === 'Encounter');
    expect(encounterEntry).toBeDefined();

    const obsHeartRate = bundle.entry.find(
      (e) =>
        e.resource.resourceType === 'Observation' &&
        (e.resource as { id: string }).id.includes('hr'),
    );
    expect(obsHeartRate).toBeDefined();
  });

  it('parses incoming FHIR R4 Bundle into CareDroid patient model', () => {
    const bundle = CareDroidFhirTransformer.toFhirBundle({
      id: 'pt-imported-1',
      mrn: 'MRN-77312',
      firstName: 'Sarah',
      lastName: 'Connor',
      gender: 'female',
      birthDate: '1984-11-20',
      vitals: {
        heartRateBpm: 78,
        spO2Percent: 99,
      },
    });

    const parsed = CareDroidFhirTransformer.fromFhirBundle(bundle);
    expect(parsed.id).toBe('pt-imported-1');
    expect(parsed.firstName).toBe('Sarah');
    expect(parsed.lastName).toBe('Connor');
    expect(parsed.gender).toBe('female');
    expect(parsed.vitals?.heartRateBpm).toBe(78);
    expect(parsed.vitals?.spO2Percent).toBe(99);
  });
});

describe('DicomWebAdapter', () => {
  it('queries imaging studies with QIDO-RS simulation', () => {
    const adapter = new DicomWebAdapter();
    const studies = adapter.queryStudies({ modality: 'CT' });
    expect(studies.length).toBeGreaterThanOrEqual(1);

    const study = studies[0];
    expect(study.modality).toBe('CT');
    expect(study.studyDescription).toContain('CT Head');
    expect(study.numberOfInstances).toBe(144);
  });

  it('retrieves specific study metadata by StudyInstanceUID', () => {
    const adapter = new DicomWebAdapter();
    const uid = '1.2.840.113619.2.55.3.109283741.884';
    const study = adapter.retrieveStudyMetadata(uid);

    expect(study).toBeDefined();
    expect(study?.patientId).toBe('pt-10492');
  });

  it('parses standard DICOM PS3.18 tag dictionary object', () => {
    const adapter = new DicomWebAdapter();
    const parsed = adapter.parseDicomTagDictionary({
      '0020000D': { vr: 'UI', Value: ['1.2.3.4.5.6.7'] },
      '00080060': { vr: 'CS', Value: ['MR'] },
      '00100020': { vr: 'LO', Value: ['pt-brain-01'] },
      '00081030': { vr: 'LO', Value: ['MRI Brain without Contrast'] },
    });

    expect(parsed.studyInstanceUid).toBe('1.2.3.4.5.6.7');
    expect(parsed.modality).toBe('MR');
    expect(parsed.patientId).toBe('pt-brain-01');
    expect(parsed.studyDescription).toBe('MRI Brain without Contrast');
  });
});
