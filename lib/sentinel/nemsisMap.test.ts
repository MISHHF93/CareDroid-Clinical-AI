import { describe, expect, it } from 'vitest';
import { mapNemsisLikePayload, validateNemsisCore } from './nemsisMap';
import { mapInboundToFhirBundle } from './fhirMap';

describe('sentinel nemsis + fhir map', () => {
  it('maps core NEMSIS-like fields', () => {
    const inbound = mapNemsisLikePayload({
      unitId: 'Medic-12',
      'eSituation.11': 'Chest pain',
      hr: 110,
      sbp: 90,
      dbp: 60,
      spo2: 94,
      priority: 'CTAS2',
    });
    expect(inbound.unitId).toBe('Medic-12');
    expect(inbound.chiefComplaint).toBe('Chest pain');
    expect(inbound.vitals.heartRate).toBe(110);
    expect(inbound.vitals.bloodPressure).toBe('90/60');
    const validation = validateNemsisCore(inbound);
    expect(validation.valid).toBe(true);
  });

  it('builds FHIR bundle with patient and encounter', () => {
    const inbound = mapNemsisLikePayload({
      unitId: 'M4',
      chiefComplaint: 'Stroke symptoms',
      hr: 88,
    });
    const bundle = mapInboundToFhirBundle(inbound);
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry.length).toBeGreaterThanOrEqual(2);
    expect(bundle.entry.some((e) => e.resource.resourceType === 'Patient')).toBe(true);
    expect(bundle.entry.some((e) => e.resource.resourceType === 'Encounter')).toBe(true);
  });
});
