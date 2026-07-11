/**
 * HL7 FHIR R4-oriented mapping for Sentinel pre-arrival / EMS interoperability.
 */

import type { SentinelNemsisInbound } from './nemsisMap';

export type FhirResourceBundle = Readonly<{
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: readonly Readonly<{
    fullUrl: string;
    resource: Readonly<Record<string, unknown>>;
  }>[];
}>;

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Build a minimal FHIR Bundle (Patient + Encounter + Observations) from NEMSIS-mapped inbound.
 * Intended for interoperability hub export / EHR pre-registration handoff — not full US Core.
 */
export function mapInboundToFhirBundle(
  inbound: SentinelNemsisInbound,
  options: Readonly<{
    organizationId?: string;
    encounterId?: string;
    patientId?: string;
  }> = {},
): FhirResourceBundle {
  const patientId = options.patientId || `sentinel-patient-${inbound.unitId}`;
  const encounterId = options.encounterId || `sentinel-encounter-${inbound.unitId}`;
  const timestamp = isoNow();

  const patient: Record<string, unknown> = {
    resourceType: 'Patient',
    id: patientId,
    meta: { tag: [{ system: 'https://caredroid.ai/tags', code: 'pre-arrival' }] },
    gender:
      inbound.patientSex?.toLowerCase() === 'm' || inbound.patientSex?.toLowerCase() === 'male'
        ? 'male'
        : inbound.patientSex?.toLowerCase() === 'f' ||
            inbound.patientSex?.toLowerCase() === 'female'
          ? 'female'
          : 'unknown',
    extension: inbound.patientAge
      ? [
          {
            url: 'https://caredroid.ai/fhir/StructureDefinition/reported-age',
            valueString: String(inbound.patientAge),
          },
        ]
      : [],
  };

  const encounter: Record<string, unknown> = {
    resourceType: 'Encounter',
    id: encounterId,
    status: 'planned',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER',
      display: 'emergency',
    },
    subject: { reference: `Patient/${patientId}` },
    reasonCode: [
      {
        text: inbound.chiefComplaint,
      },
    ],
    period: {
      start: inbound.times.enRouteAt || inbound.times.notifiedAt || timestamp,
    },
    hospitalization: {
      admitSource: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/admit-source',
            code: 'emd',
            display: 'From accident/emergency department',
          },
        ],
        text: `EMS unit ${inbound.unitLabel}`,
      },
    },
  };

  const observations: Array<Record<string, unknown>> = [];
  const pushObs = (id: string, code: string, display: string, value: number | null, unit: string) => {
    if (value == null) return;
    observations.push({
      resourceType: 'Observation',
      id,
      status: 'preliminary',
      code: {
        coding: [{ system: 'http://loinc.org', code, display }],
        text: display,
      },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      valueQuantity: { value, unit },
    });
  };

  pushObs('obs-hr', '8867-4', 'Heart rate', inbound.vitals.heartRate, '/min');
  pushObs('obs-spo2', '2708-6', 'Oxygen saturation', inbound.vitals.oxygenSaturation, '%');
  pushObs('obs-rr', '9279-1', 'Respiratory rate', inbound.vitals.respiratoryRate, '/min');

  if (inbound.vitals.bloodPressure) {
    const m = inbound.vitals.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      observations.push({
        resourceType: 'Observation',
        id: 'obs-bp',
        status: 'preliminary',
        code: {
          coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }],
          text: 'Blood pressure',
        },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        component: [
          {
            code: {
              coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic' }],
            },
            valueQuantity: { value: Number(m[1]), unit: 'mmHg' },
          },
          {
            code: {
              coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic' }],
            },
            valueQuantity: { value: Number(m[2]), unit: 'mmHg' },
          },
        ],
      });
    }
  }

  const entry = [
    { fullUrl: `urn:uuid:${patientId}`, resource: Object.freeze(patient) },
    { fullUrl: `urn:uuid:${encounterId}`, resource: Object.freeze(encounter) },
    ...observations.map((obs) => ({
      fullUrl: `urn:uuid:${String(obs.id)}`,
      resource: Object.freeze(obs),
    })),
  ];

  return Object.freeze({
    resourceType: 'Bundle' as const,
    type: 'collection' as const,
    timestamp,
    entry: Object.freeze(entry),
  });
}

/**
 * Extract a coarse patient snapshot from a FHIR Patient + optional Observations for pre-arrival.
 */
export function mapFhirPatientToPreArrivalSnapshot(
  resources: readonly Readonly<Record<string, unknown>>[],
): Readonly<{
  patientId: string | null;
  sex: string | null;
  chiefComplaint: string | null;
  vitals: Readonly<Record<string, number | string | null>>;
}> {
  let patientId: string | null = null;
  let sex: string | null = null;
  let chiefComplaint: string | null = null;
  const vitals: Record<string, number | string | null> = {};

  for (const resource of resources) {
    const type = String(resource.resourceType || '');
    if (type === 'Patient') {
      patientId = resource.id != null ? String(resource.id) : patientId;
      sex = resource.gender != null ? String(resource.gender) : sex;
    }
    if (type === 'Encounter') {
      const reasons = resource.reasonCode;
      if (Array.isArray(reasons) && reasons[0] && typeof reasons[0] === 'object') {
        const text = (reasons[0] as { text?: unknown }).text;
        if (text != null) chiefComplaint = String(text);
      }
    }
    if (type === 'Observation') {
      const codeObj = resource.code as { text?: string; coding?: Array<{ display?: string }> } | undefined;
      const label = codeObj?.text || codeObj?.coding?.[0]?.display || 'observation';
      const vq = resource.valueQuantity as { value?: number } | undefined;
      if (vq?.value != null) {
        vitals[label] = vq.value;
      }
    }
  }

  return Object.freeze({
    patientId,
    sex,
    chiefComplaint,
    vitals: Object.freeze(vitals),
  });
}
