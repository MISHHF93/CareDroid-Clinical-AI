import type {
  Encounter,
  EncounterSource,
  JourneyEvent,
  Patient,
  PatientState,
} from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';

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
  const timelineEvent: JourneyEvent = {
    id: `evt-${patient.id}-encounter-${Date.now()}`,
    patientId: patient.id,
    type: 'EncounterCreated',
    timestamp,
    to: patient.state,
    summary: `Encounter ${encounterId} created from ${source}.`,
    metadata: {
      encounterId,
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
    metadata,
  };

  return { encounterId, encounter, timelineEvent };
}

export function ensureEncounterAfterIntake(
  store: IntakeEncounterStore,
  options: {
    patientId: string;
    source: IntakeEncounterSource;
    sessionId?: string;
    actorName?: string;
  },
): { encounterId: string | null; created: boolean } {
  if (!isAutoCreateEncounterEnabled(store.emergencySettings)) {
    return { encounterId: null, created: false };
  }

  const patient = store.patients.find((entry) => entry.id === options.patientId);
  if (!patient) {
    return { encounterId: null, created: false };
  }

  const existingEncounterId = getExistingEncounterId(patient);
  if (existingEncounterId) {
    return { encounterId: existingEncounterId, created: false };
  }

  const { encounterId, timelineEvent } = buildEncounterArtifacts(patient, options.source, {
    sessionId: options.sessionId,
    intakeSource: options.source,
  });

  store.updatePatient(patient.id, {
    timeline: [...(patient.timeline || []), timelineEvent],
  });
  store.recordWorkflowAction({
    type: 'encounter_created',
    summary: `Encounter ${encounterId} opened after ${options.source} intake.`,
    patientId: patient.id,
    actorName: options.actorName,
    source: 'intake-encounter',
    metadata: {
      encounterId,
      intakeSource: options.source,
      sessionId: options.sessionId,
    },
  });

  return { encounterId, created: true };
}
