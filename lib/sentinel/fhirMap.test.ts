import { describe, expect, it } from 'vitest';
import { mapInboundToFhirBundle, mapFhirPatientToPreArrivalSnapshot } from './fhirMap';
import type { SentinelNemsisInbound } from './nemsisMap';

/**
 * lib/sentinel/fhirMap.ts is the only place in this repo that builds/parses
 * structurally real FHIR R4 resources (Bundle/Patient/Encounter/Observation
 * with LOINC codes) -- used for real Sentinel EMS pre-arrival export/import
 * (sentinel-inbound.service.ts). A prior smoke test in nemsisMap.test.ts only
 * checked resourceType/entry-count/Patient+Encounter presence for
 * mapInboundToFhirBundle; the reverse direction, mapFhirPatientToPreArrivalSnapshot,
 * had zero coverage, and the forward mapping's actual clinical content
 * (LOINC codes, blood-pressure component parsing, gender normalization) was
 * never asserted -- a silent mismapping here would produce malformed FHIR
 * data or lose real vitals with nothing to catch it.
 */

function buildInbound(overrides: Partial<SentinelNemsisInbound> = {}): SentinelNemsisInbound {
  return Object.freeze({
    unitId: 'Medic-7',
    unitLabel: 'Medic 7',
    patientAge: '54',
    patientSex: 'female',
    chiefComplaint: 'Chest pain',
    vitals: Object.freeze({
      heartRate: 118,
      bloodPressure: '96/58',
      oxygenSaturation: 91,
      respiratoryRate: 26,
    }),
    times: Object.freeze({
      notifiedAt: '2026-08-27T04:00:00.000Z',
      enRouteAt: '2026-08-27T04:02:00.000Z',
      onSceneAt: null,
      leftSceneAt: null,
      atHospitalAt: null,
    }),
    priority: 'CTAS2',
    narrative: null,
    nemsisMappedFields: [],
    unmappedKeys: [],
    ...overrides,
  });
}

describe('mapInboundToFhirBundle', () => {
  it('builds a Patient resource with correctly normalized gender and a reported-age extension', () => {
    const bundle = mapInboundToFhirBundle(buildInbound());
    const patient = bundle.entry.find((e) => e.resource.resourceType === 'Patient')!.resource;

    expect(patient.gender).toBe('female');
    expect(patient.extension).toEqual([
      {
        url: 'https://caredroid.ai/fhir/StructureDefinition/reported-age',
        valueString: '54',
      },
    ]);
  });

  it.each([
    ['m', 'male'],
    ['M', 'male'],
    ['male', 'male'],
    ['f', 'female'],
    ['female', 'female'],
    [null, 'unknown'],
    ['nonbinary', 'unknown'],
  ])('normalizes patientSex %s to FHIR gender %s', (patientSex, expectedGender) => {
    const bundle = mapInboundToFhirBundle(buildInbound({ patientSex }));
    const patient = bundle.entry.find((e) => e.resource.resourceType === 'Patient')!.resource;
    expect(patient.gender).toBe(expectedGender);
  });

  it('omits the reported-age extension when patientAge is not provided', () => {
    const bundle = mapInboundToFhirBundle(buildInbound({ patientAge: null }));
    const patient = bundle.entry.find((e) => e.resource.resourceType === 'Patient')!.resource;
    expect(patient.extension).toEqual([]);
  });

  it('builds an Encounter with class EMER, the chief complaint as reasonCode text, and the EMS unit in hospitalization.admitSource', () => {
    const bundle = mapInboundToFhirBundle(buildInbound());
    const encounter = bundle.entry.find((e) => e.resource.resourceType === 'Encounter')!.resource as any;

    expect(encounter.status).toBe('planned');
    expect(encounter.class).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER',
      display: 'emergency',
    });
    expect(encounter.reasonCode[0].text).toBe('Chest pain');
    expect(encounter.hospitalization.admitSource.text).toBe('EMS unit Medic 7');
    // Prefers enRouteAt over notifiedAt when both are present.
    expect(encounter.period.start).toBe('2026-08-27T04:02:00.000Z');
  });

  it('references the correct, real LOINC codes for heart rate, SpO2, and respiratory rate', () => {
    const bundle = mapInboundToFhirBundle(buildInbound());
    const observations = bundle.entry
      .map((e) => e.resource)
      .filter((r) => r.resourceType === 'Observation') as any[];

    const hr = observations.find((o) => o.id === 'obs-hr');
    expect(hr.code.coding[0]).toEqual({ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' });
    expect(hr.valueQuantity).toEqual({ value: 118, unit: '/min' });

    const spo2 = observations.find((o) => o.id === 'obs-spo2');
    expect(spo2.code.coding[0].code).toBe('2708-6');
    expect(spo2.valueQuantity).toEqual({ value: 91, unit: '%' });

    const rr = observations.find((o) => o.id === 'obs-rr');
    expect(rr.code.coding[0].code).toBe('9279-1');
    expect(rr.valueQuantity).toEqual({ value: 26, unit: '/min' });
  });

  it('parses "systolic/diastolic" blood pressure text into a real FHIR component panel with correct LOINC codes', () => {
    const bundle = mapInboundToFhirBundle(buildInbound({
      vitals: { heartRate: null, bloodPressure: '96/58', oxygenSaturation: null, respiratoryRate: null },
    }));
    const bp = bundle.entry
      .map((e) => e.resource)
      .find((r) => r.resourceType === 'Observation' && (r as any).id === 'obs-bp') as any;

    expect(bp.code.coding[0].code).toBe('85354-9');
    expect(bp.component).toEqual([
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic' }] },
        valueQuantity: { value: 96, unit: 'mmHg' },
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic' }] },
        valueQuantity: { value: 58, unit: 'mmHg' },
      },
    ]);
  });

  it('never fabricates a vitals Observation for a value that was never recorded', () => {
    const bundle = mapInboundToFhirBundle(buildInbound({
      vitals: { heartRate: null, bloodPressure: null, oxygenSaturation: null, respiratoryRate: null },
    }));
    const observations = bundle.entry.filter((e) => e.resource.resourceType === 'Observation');
    // Only Patient + Encounter -- zero Observations when nothing was recorded.
    expect(observations).toHaveLength(0);
    expect(bundle.entry).toHaveLength(2);
  });

  it('does not choke on an unparseable blood-pressure string -- omits the BP observation rather than emitting garbage values', () => {
    const bundle = mapInboundToFhirBundle(buildInbound({
      vitals: { heartRate: null, bloodPressure: 'unrecordable', oxygenSaturation: null, respiratoryRate: null },
    }));
    const bp = bundle.entry.find((e) => (e.resource as any).id === 'obs-bp');
    expect(bp).toBeUndefined();
  });

  it('is a real, wire-serializable FHIR Bundle -- round-trips through JSON with resourceType/type/timestamp/entry.fullUrl intact', () => {
    const bundle = mapInboundToFhirBundle(buildInbound());
    const roundTripped = JSON.parse(JSON.stringify(bundle));
    expect(roundTripped.resourceType).toBe('Bundle');
    expect(roundTripped.type).toBe('collection');
    expect(typeof roundTripped.timestamp).toBe('string');
    expect(roundTripped.entry.every((e: any) => typeof e.fullUrl === 'string' && e.fullUrl.startsWith('urn:uuid:'))).toBe(true);
  });
});

describe('mapFhirPatientToPreArrivalSnapshot', () => {
  it('extracts patientId and sex from a Patient resource', () => {
    const snapshot = mapFhirPatientToPreArrivalSnapshot([
      { resourceType: 'Patient', id: 'pt-42', gender: 'male' },
    ]);
    expect(snapshot.patientId).toBe('pt-42');
    expect(snapshot.sex).toBe('male');
  });

  it('extracts the chief complaint from an Encounter resource\'s reasonCode text', () => {
    const snapshot = mapFhirPatientToPreArrivalSnapshot([
      { resourceType: 'Encounter', reasonCode: [{ text: 'Shortness of breath' }] },
    ]);
    expect(snapshot.chiefComplaint).toBe('Shortness of breath');
  });

  it('extracts vitals from Observation resources, keyed by their code text or display label', () => {
    const snapshot = mapFhirPatientToPreArrivalSnapshot([
      {
        resourceType: 'Observation',
        code: { coding: [{ display: 'Heart rate' }] },
        valueQuantity: { value: 102 },
      },
      {
        resourceType: 'Observation',
        code: { text: 'Oxygen saturation' },
        valueQuantity: { value: 95 },
      },
    ]);
    expect(snapshot.vitals['Heart rate']).toBe(102);
    expect(snapshot.vitals['Oxygen saturation']).toBe(95);
  });

  it('is a real inverse of mapInboundToFhirBundle -- round-trips a full bundle back to a coherent snapshot', () => {
    const inbound = buildInbound();
    const bundle = mapInboundToFhirBundle(inbound);
    const snapshot = mapFhirPatientToPreArrivalSnapshot(bundle.entry.map((e) => e.resource));

    expect(snapshot.patientId).toBe(`sentinel-patient-${inbound.unitId}`);
    expect(snapshot.sex).toBe('female');
    expect(snapshot.chiefComplaint).toBe('Chest pain');
    expect(snapshot.vitals['Heart rate']).toBe(118);
    expect(snapshot.vitals['Oxygen saturation']).toBe(91);
    expect(snapshot.vitals['Respiratory rate']).toBe(26);
  });

  it('never fabricates a value for a field genuinely absent from the resource list -- returns null, not a guessed default', () => {
    const snapshot = mapFhirPatientToPreArrivalSnapshot([]);
    expect(snapshot.patientId).toBeNull();
    expect(snapshot.sex).toBeNull();
    expect(snapshot.chiefComplaint).toBeNull();
    expect(snapshot.vitals).toEqual({});
  });

  it('tolerates resources with missing/malformed fields without throwing', () => {
    expect(() =>
      mapFhirPatientToPreArrivalSnapshot([
        { resourceType: 'Observation' },
        { resourceType: 'Encounter', reasonCode: 'not-an-array' as any },
        { resourceType: 'Patient' },
      ]),
    ).not.toThrow();
  });
});
