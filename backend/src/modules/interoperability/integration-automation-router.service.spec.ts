import { IntegrationAutomationRouter } from './integration-automation-router.service';
import { IntegrationEventRegistry } from './integration-event-registry.service';

describe('IntegrationAutomationRouter', () => {
  let router: IntegrationAutomationRouter;

  beforeEach(() => {
    router = new IntegrationAutomationRouter(new IntegrationEventRegistry());
  });

  it('normalizes FHIR observation events', () => {
    const normalized = router.normalizeIntegrationEvent({
      id: 'fhir-obs-1',
      family: 'fhir',
      eventType: 'Observation',
      sourceSystem: 'ehr-sandbox',
      organizationId: 'org-alpha',
      workspaceId: 'icu-workspace',
      receivedAt: '2026-06-06T15:00:00.000Z',
      payload: {
        resourceType: 'Observation',
        status: 'final',
        subject: { reference: 'Patient/patient-123' },
        encounter: { reference: 'Encounter/enc-456' },
        code: {
          coding: [{ system: 'http://loinc.org', code: '6299-2', display: 'Urea nitrogen' }],
        },
        valueQuantity: { value: 42, unit: 'mg/dL' },
        interpretation: { coding: [{ code: 'H', display: 'High' }] },
        effectiveDateTime: '2026-06-06T14:55:00.000Z',
      },
    });

    expect(normalized).toMatchObject({
      kind: 'observation',
      sourceFamily: 'fhir',
      sourceEventType: 'Observation',
      parserStatus: 'normalized',
      organizationId: 'org-alpha',
      workspaceId: 'icu-workspace',
      patientId: 'patient-123',
      encounterId: 'enc-456',
      code: '6299-2',
      value: 42,
      unit: 'mg/dL',
      interpretation: 'H',
      severity: 'high',
      occurredAt: '2026-06-06T14:55:00.000Z',
    });
  });

  it('normalizes HL7 ORU placeholder events', () => {
    const normalized = router.normalizeIntegrationEvent({
      id: 'hl7-oru-1',
      family: 'hl7',
      eventType: 'ORU',
      sourceSystem: 'interface-engine',
      payload: {
        messageType: 'ORU^R01',
        patientId: 'patient-789',
        visitId: 'visit-001',
        observationIdentifier: 'K',
        observationText: 'Potassium',
        observationValue: 6.2,
        units: 'mmol/L',
        abnormalFlag: 'HH',
        resultStatus: 'F',
        observedAt: '2026-06-06T14:45:00.000Z',
      },
    });

    expect(normalized).toMatchObject({
      kind: 'lab_result',
      sourceFamily: 'hl7',
      sourceEventType: 'ORU',
      parserStatus: 'placeholder',
      patientId: 'patient-789',
      encounterId: 'visit-001',
      code: 'K',
      value: 6.2,
      unit: 'mmol/L',
      interpretation: 'HH',
      severity: 'critical',
    });
    expect(normalized.provenance.labels).toEqual(
      expect.arrayContaining(['HL7 ORU', 'parser_status:placeholder']),
    );
  });

  it('normalizes telemetry events', () => {
    const normalized = router.normalizeIntegrationEvent({
      id: 'telemetry-1',
      family: 'device_telemetry',
      eventType: 'telemetry',
      sourceSystem: 'device-gateway',
      organizationId: 'org-beta',
      payload: {
        deviceId: 'pump-17',
        metric: 'battery',
        metricLabel: 'Battery level',
        value: 12,
        unit: '%',
        status: 'warning',
        severity: 'high',
        location: 'ICU-12',
        observedAt: '2026-06-06T14:50:00.000Z',
      },
    });

    expect(normalized).toMatchObject({
      kind: 'device_telemetry',
      sourceFamily: 'device_telemetry',
      parserStatus: 'normalized',
      organizationId: 'org-beta',
      deviceId: 'pump-17',
      code: 'battery',
      display: 'Battery level',
      value: 12,
      unit: '%',
      status: 'warning',
      severity: 'high',
      locationRef: 'ICU-12',
    });
  });

  it('routes normalized events into safe automation actions', () => {
    const result = router.routeIntegrationEvent({
      id: 'critical-obs-1',
      family: 'fhir',
      eventType: 'Observation',
      sourceSystem: 'ehr-sandbox',
      payload: {
        resourceType: 'Observation',
        status: 'final',
        subject: { reference: 'Patient/patient-123' },
        code: { coding: [{ code: 'LP29708-2', display: 'Potassium' }] },
        valueQuantity: { value: 6.8, unit: 'mmol/L' },
        interpretation: { coding: [{ code: 'HH', display: 'Critical high' }] },
      },
    });

    expect(result.status).toBe('routed');
    expect(result.trigger).toMatchObject({
      fired: true,
      type: 'observation_review',
      reviewRequired: true,
      severity: 'critical',
    });
    expect(result.safeAction).toMatchObject({
      type: 'escalate_for_review',
      requiresHumanReview: true,
      blocked: false,
    });
    expect(result.safeAction.prohibitedSideEffects).toEqual(
      expect.arrayContaining(['clinical_writeback', 'medication_ordering', 'device_control']),
    );
  });

  it('clearly labels unsupported integrations', () => {
    const result = router.routeIntegrationEvent({
      id: 'unsupported-1',
      family: 'fhir',
      eventType: 'AllergyIntolerance',
      sourceSystem: 'ehr-sandbox',
      payload: { resourceType: 'AllergyIntolerance', id: 'allergy-1' },
    });

    expect(result.status).toBe('unsupported');
    expect(result.labels).toEqual(
      expect.arrayContaining([
        'unsupported_integration',
        'source_family:fhir',
        'event_type:AllergyIntolerance',
      ]),
    );
    expect(result.normalizedEvent).toMatchObject({
      kind: 'unsupported',
      parserStatus: 'unsupported',
      sourceEventType: 'AllergyIntolerance',
    });
    expect(result.safeAction).toMatchObject({
      type: 'label_unsupported_integration',
      blocked: true,
      requiresHumanReview: true,
    });
  });
});
