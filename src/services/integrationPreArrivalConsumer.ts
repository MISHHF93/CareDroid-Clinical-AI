import {
  Priority,
  PatientFlag,
  PatientState,
  type EMSArrival,
  type Patient,
  type PatientCareRecordFeed,
} from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildArrivalControlFields } from './arrivalControlLayer';
import { buildPreArrivalNotificationFromArrival } from './preArrivalNotification';
import { syncResourceActivationsForArrival } from './resourceActivation';

type IntegrationEvent = Record<string, unknown>;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isPreArrivalIntegrationEvent(event: IntegrationEvent): boolean {
  const kind = String(event.kind || event.normalizedKind || '').toLowerCase();
  const family = String(event.family || event.sourceFamily || '').toLowerCase();
  const status = String(event.status || event.payload?.status || '').toLowerCase();
  if (kind === 'encounter' && (status === 'planned' || status === 'in-progress')) return true;
  if (family === 'fhir' && kind === 'patient' && event.metadata?.preArrival === true) return true;
  if (family === 'hl7' && String(event.eventType || '').toUpperCase() === 'ADT') return true;
  return false;
}

export function parseEpcrFeedFromIntegration(event: IntegrationEvent): PatientCareRecordFeed | null {
  const payload = (event.payload || event.rawPayload || {}) as Record<string, unknown>;
  const vitals = payload.vitals as PatientCareRecordFeed['vitals'];
  const medications = Array.isArray(payload.medications)
    ? payload.medications.map((entry) => String(entry))
    : undefined;
  if (!vitals && !medications?.length && !payload.summary) return null;
  return {
    source: String(event.family || '').toLowerCase() === 'fhir' ? 'fhir' : 'hl7',
    receivedAt: new Date().toISOString(),
    summary: String(payload.summary || event.display || ''),
    vitals,
    medications,
  };
}

export function buildEmsArrivalFromIntegration(event: IntegrationEvent): EMSArrival | null {
  const payload = (event.payload || event.rawPayload || {}) as Record<string, unknown>;
  if (!payload.unitId && !payload.unitName) return null;
  const timestamp = new Date().toISOString();
  const arrival: EMSArrival = {
    id: createId('ems-intake'),
    unitId: String(payload.unitId || 'integration-unit'),
    unitName: String(payload.unitName || 'Integration EMS'),
    crewNames: Array.isArray(payload.crewNames) ? payload.crewNames.map((entry) => String(entry)) : [],
    patientAge: Number(payload.patientAge || 0),
    patientSex: (String(payload.patientSex || 'Unspecified') as EMSArrival['patientSex']),
    chiefComplaint: String(payload.chiefComplaint || payload.reason || 'Integration pre-arrival'),
    mechanismOfInjury: String(payload.mechanismOfInjury || ''),
    vitals: payload.vitals as EMSArrival['vitals'],
    eta: Number(payload.eta || 10),
    severity: (String(payload.severity || 'Moderate') as EMSArrival['severity']),
    dispatchTime: timestamp,
    estimatedArrivalTime: String(payload.estimatedArrivalTime || timestamp),
    notes: String(payload.notes || ''),
    status: 'Inbound',
    prearrivalComplaint: String(payload.prearrivalComplaint || payload.chiefComplaint || ''),
    priority: Priority.P3,
    medicationsEnRoute: Array.isArray(payload.medications)
      ? payload.medications.map((entry) => String(entry))
      : undefined,
    preArrivalNotification: buildPreArrivalNotificationFromArrival({
      id: 'temp',
      unitId: String(payload.unitId || 'integration-unit'),
      unitName: String(payload.unitName || 'Integration EMS'),
      crewNames: [],
      patientAge: Number(payload.patientAge || 0),
      patientSex: 'Unspecified',
      chiefComplaint: String(payload.chiefComplaint || ''),
      eta: Number(payload.eta || 10),
      severity: 'Moderate',
      dispatchTime: timestamp,
      estimatedArrivalTime: timestamp,
      notes: '',
      status: 'Inbound',
      prearrivalComplaint: String(payload.chiefComplaint || ''),
      priority: Priority.P3,
    }),
  };
  const epcr = parseEpcrFeedFromIntegration(event);
  if (epcr) arrival.epcrFeed = [epcr];
  return syncResourceActivationsForArrival(arrival);
}

export function buildPreArrivalPatientFromIntegration(event: IntegrationEvent): Patient {
  const payload = (event.payload || event.rawPayload || {}) as Record<string, unknown>;
  const demographics = (payload.demographics || payload.name || {}) as Record<string, unknown>;
  const timestamp = new Date().toISOString();
  const patientId = createId('patient-intake-pre');

  const firstName = String(demographics.firstName || demographics.given || 'Incoming');
  const lastName = String(demographics.lastName || demographics.family || 'Patient');
  const complaint = String(
    payload.chiefComplaint || payload.reason || event.display || 'Integration pre-arrival',
  );

  const emsArrival = buildEmsArrivalFromIntegration(event);

  return {
    id: patientId,
    mrn: String(payload.mrn || payload.identifier || `INT-${patientId.slice(-6)}`),
    firstName,
    lastName,
    dob: String(demographics.dob || demographics.birthDate || timestamp.slice(0, 10)),
    age: Number(demographics.age || 0),
    sex: (String(demographics.sex || 'Unspecified') as Patient['sex']),
    arrivalTime: timestamp,
    chiefComplaint: complaint,
    complaintCategory: 'Integration',
    state: PatientState.Arrival,
    priority: Priority.P3,
    vitals: [],
    flags: [PatientFlag.IdentityPending],
    notes: [],
    timeline: [],
    source: 'Integration',
    emsArrival: emsArrival ? { ...emsArrival, patientId } : undefined,
    ...buildArrivalControlFields({
      arrivalMode: 'transfer',
      state: PatientState.Arrival,
      presentingComplaint: complaint,
      registrationStatus: 'in-progress',
      queueDestination: 'verification',
    }),
  };
}

const ingestedEventIds = new Set<string>();

export function ingestIntegrationPreArrivalEvent(
  event: IntegrationEvent,
): { ok: boolean; patientId?: string; reason?: string } {
  const eventId = String(event.id || event.eventId || '');
  if (eventId && ingestedEventIds.has(eventId)) {
    return { ok: false, reason: 'already_ingested' };
  }
  if (!isPreArrivalIntegrationEvent(event)) {
    return { ok: false, reason: 'unsupported_event' };
  }

  const patient = buildPreArrivalPatientFromIntegration(event);
  const state = useEmergencyStore.getState();

  const duplicate = state.patients.find(
    (entry) =>
      entry.mrn === patient.mrn ||
      (entry.chiefComplaint === patient.chiefComplaint && entry.source === 'Integration'),
  );
  if (duplicate) {
    return { ok: true, patientId: duplicate.id, reason: 'existing_match' };
  }

  state.addPatient(patient, { syncToBackend: false });
  if (eventId) ingestedEventIds.add(eventId);

  state.recordWorkflowAction?.({
    type: 'integration_event_received',
    summary: `Pre-arrival placeholder created from ${String(event.family || 'integration')} feed.`,
    patientId: patient.id,
    source: 'integration-pre-arrival',
    metadata: {
      eventId: eventId || null,
      kind: event.kind || null,
    },
  });

  return { ok: true, patientId: patient.id };
}