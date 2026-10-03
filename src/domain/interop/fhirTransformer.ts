/**
 * CareDroid HL7 FHIR R4 Transformer
 * Bidirectional transformer converting between CareDroid clinical entities
 * and HL7 FHIR R4 standard resources and bundles.
 */

import {
  FhirBundleResource,
  FhirEncounterResource,
  FhirObservationResource,
  FhirPatientResource,
} from './fhirTypes';

export interface CareDroidPatientRecord {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  phone?: string;
  chiefComplaint?: string;
  triageAcuity?: 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4' | 'ESI-5';
  vitals?: {
    heartRateBpm?: number;
    spO2Percent?: number;
    systolicBpMmHg?: number;
    temperatureCelsius?: number;
  };
}

export class CareDroidFhirTransformer {
  public static toFhirBundle(
    patient: CareDroidPatientRecord,
    encounterId?: string,
  ): FhirBundleResource {
    const encId = encounterId || `enc-${patient.id}`;
    const patientResource: FhirPatientResource = {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        {
          system: 'urn:caredroid:mrn',
          value: patient.mrn,
          use: 'official',
        },
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
        },
      ],
      gender: patient.gender,
      birthDate: patient.birthDate,
      telecom: patient.phone ? [{ system: 'phone', value: patient.phone, use: 'mobile' }] : [],
    };

    const encounterResource: FhirEncounterResource = {
      resourceType: 'Encounter',
      id: encId,
      status: 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'EMER',
        display: 'Emergency Department',
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: `${patient.lastName}, ${patient.firstName}`,
      },
      period: {
        start: new Date().toISOString(),
      },
      reasonCode: patient.chiefComplaint
        ? [
            {
              text: patient.chiefComplaint,
            },
          ]
        : undefined,
    };

    const observations: FhirObservationResource[] = [];

    if (patient.vitals?.heartRateBpm) {
      observations.push({
        resourceType: 'Observation',
        id: `obs-hr-${patient.id}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }],
          text: 'Heart rate',
        },
        subject: { reference: `Patient/${patient.id}` },
        encounter: { reference: `Encounter/${encId}` },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: {
          value: patient.vitals.heartRateBpm,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min',
        },
      });
    }

    if (patient.vitals?.spO2Percent) {
      observations.push({
        resourceType: 'Observation',
        id: `obs-spo2-${patient.id}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '2708-6',
              display: 'Oxygen saturation in Arterial blood',
            },
          ],
          text: 'SpO2',
        },
        subject: { reference: `Patient/${patient.id}` },
        encounter: { reference: `Encounter/${encId}` },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: {
          value: patient.vitals.spO2Percent,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%',
        },
      });
    }

    return {
      resourceType: 'Bundle',
      id: `bundle-${patient.id}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        { fullUrl: `urn:uuid:${patient.id}`, resource: patientResource },
        { fullUrl: `urn:uuid:${encId}`, resource: encounterResource },
        ...observations.map((obs) => ({ fullUrl: `urn:uuid:${obs.id}`, resource: obs })),
      ],
    };
  }

  public static fromFhirBundle(bundle: FhirBundleResource): CareDroidPatientRecord {
    const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
    if (!patientEntry) {
      throw new Error('FHIR Bundle contains no Patient resource.');
    }

    const patient = patientEntry.resource as FhirPatientResource;
    const name = patient.name?.[0] || { family: 'Unknown', given: ['Unknown'] };
    const mrn = patient.identifier?.find((i) => i.system?.includes('mrn'))?.value || patient.id;

    const vitals: CareDroidPatientRecord['vitals'] = {};
    for (const entry of bundle.entry) {
      if (entry.resource.resourceType === 'Observation') {
        const obs = entry.resource as FhirObservationResource;
        const code = obs.code.coding?.[0]?.code;
        if (code === '8867-4' && obs.valueQuantity) {
          vitals.heartRateBpm = obs.valueQuantity.value;
        } else if (code === '2708-6' && obs.valueQuantity) {
          vitals.spO2Percent = obs.valueQuantity.value;
        }
      }
    }

    return {
      id: patient.id,
      mrn,
      firstName: name.given?.[0] || 'Unknown',
      lastName: name.family,
      gender: patient.gender,
      birthDate: patient.birthDate || '1980-01-01',
      phone: patient.telecom?.find((t) => t.system === 'phone')?.value,
      vitals,
    };
  }
}
