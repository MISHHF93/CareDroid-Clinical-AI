import type {
  Encounter,
  EncounterSource,
  JourneyEvent,
  Patient,
  PatientState,
} from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import {
  buildEncounterLinkageMetadata,
  enrichEncounterTimeline,
  getArrivalReasonFromPatient,
} from './intakeEncounterChain';

export type IntakeEncounterSource = EncounterSource;

export type IntakeEncounterSettings = {
  intakeSettings?: {
    autoCreateEncounter?: boolean;
  };
};

export type IntakeEncounterStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  'patients' | 'emergencySettings' | 'updatePatient' | 'recordWorkflowAction'
>;

export function isAutoCreateEncounterEnabled(
  settings?: IntakeEncounterSettings | null,
): boolean {
  return settings?.intakeSettings?.autoCreateEncounter !== false;
}

export function getExistingEncounterId(patient?: Patient | null): string | null {
  const event = patient?.timeline?.find((entry) => entry.type === 'EncounterCreated');
  const encounterId = event?.metadata?.encounterId;
  return typeof encounterId === 'string' ? encounterId : null;
}

export function buildEncounterArtifacts(
  patient: Patient,
  source: IntakeEncounterSource,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
) {
  const timestamp = new Date().toISOString();
  const encounterId = `encounter-${patient.id}`;
  const linkage = buildEncounterLinkageMetadata(patient, {
    encounterId,
    intakeSource: source,
    queue: String(metadata.queue || WHITEBOARD_QUEUE_FILTER.triage),
    sessionId: typeof metadata.sessionId === 'string' ? metadata.sessionId : undefined,
  });

  const timelineEvent: JourneyEvent = {
    id: `evt-${patient.id}-encounter-${Date.now()}`,
    patientId: patient.id,
    type: 'EncounterCreated',
    timestamp,
    to: patient.state,
    summary: `Encounter ${encounterId} created for ${linkage.arrivalReason}.`,
    metadata: {
      ...linkage,
      source,
      ...metadata,
    },
  };
  const encounter: Encounter = {
    id: encounterId,
    patientId: patient.id,
    status: 'active',
    source,
    createdAt: timestamp,
    currentState: patient.state as PatientState,
    timelineEventIds: [timelineEvent.id],
    metadata: {
      ...linkage,
      source,
      ...metadata,
    },
  };

  return { encounterId, encounter, timelineEvent, linkage };
}

export function ensureEncounterAfterIntake(
  store: IntakeEncounterStore,
  options: {
    patientId: string;
    source: IntakeEncounterSource;
    sessionId?: string;
    actorName?: string;
    queue?: string;
  },
): { encounterId: string | null; created: boolean } {
  if (!isAutoCreateEncounterEnabled(store.emergencySettings)) {
    return { encounterId: null, created: false };
  }

  const patient = store.patients.find((entry) => entry.id === options.patientId);
  if (!patient) {
    return { encounterId: null, created: false };
  }

  const queue = options.queue || WHITEBOARD_QUEUE_FILTER.triage;
  const existingEncounterId = getExistingEncounterId(patient);
  if (existingEncounterId) {
    const linkage = buildEncounterLinkageMetadata(patient, {
      encounterId: existingEncounterId,
      intakeSource: options.source,
      queue,
      sessionId: options.sessionId,
    });
    store.updatePatient(patient.id, {
      timeline: enrichEncounterTimeline(patient.timeline || [], existingEncounterId, linkage),
    });
    store.recordWorkflowAction({
      type: 'encounter_created',
      summary: `Encounter ${existingEncounterId} linked to ${getArrivalReasonFromPatient(patient)} (${queue}).`,
      patientId: patient.id,
      actorName: options.actorName,
      source: 'intake-encounter',
      metadata: linkage,
    });
    return { encounterId: existingEncounterId, created: false };
  }

  const { encounterId, timelineEvent, linkage } = buildEncounterArtifacts(patient, options.source, {
    sessionId: options.sessionId,
    intakeSource: options.source,
    queue,
  });

  store.updatePatient(patient.id, {
    timeline: [...(patient.timeline || []), timelineEvent],
  });
  store.recordWorkflowAction({
    type: 'encounter_created',
    summary: `Encounter ${encounterId} opened for ${linkage.arrivalReason} (${queue}).`,
    patientId: patient.id,
    actorName: options.actorName,
    source: 'intake-encounter',
    metadata: linkage,
  });

  return { encounterId, created: true };
}
