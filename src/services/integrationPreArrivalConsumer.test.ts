import { describe, expect, it } from 'vitest';
import {
  buildPreArrivalPatientFromIntegration,
  isPreArrivalIntegrationEvent,
} from './integrationPreArrivalConsumer';

describe('integrationPreArrivalConsumer', () => {
  it('recognizes planned FHIR encounter pre-arrival events', () => {
    expect(
      isPreArrivalIntegrationEvent({
        family: 'fhir',
        kind: 'encounter',
        status: 'planned',
      }),
    ).toBe(true);
  });

  it('builds whiteboard placeholder patients from integration payloads', () => {
    const patient = buildPreArrivalPatientFromIntegration({
      family: 'fhir',
      kind: 'encounter',
      status: 'planned',
      payload: {
        demographics: { firstName: 'Sam', lastName: 'Lee', dob: '1988-01-02' },
        chiefComplaint: 'Inbound transfer',
        mrn: 'FHIR-9981',
      },
    });

    expect(patient.firstName).toBe('Sam');
    expect(patient.lastName).toBe('Lee');
    expect(patient.source).toBe('Integration');
    expect(patient.chiefComplaint).toContain('Inbound transfer');
  });
});