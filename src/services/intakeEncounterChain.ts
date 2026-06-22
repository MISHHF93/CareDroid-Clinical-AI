import type { JourneyEvent, Patient } from '../types/emergency';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import { buildArrivalControlSnapshot } from './arrivalControlLayer';

export type IntakeEncounterChain = {
  patientId: string;
  encounterId: string | null;
  arrivalReason: string;
  complaintCategory: string;
  queue: string;
  connected: boolean;
  arrivalControl?: import('../types/emergency').ArrivalControlSnapshot;
};

export function getArrivalReasonFromPatient(patient?: Patient | null): string {
  if (!patient) return 'Unspecified arrival reason';
  return (
    patient.chiefComplaint?.trim() ||
    patient.complaint?.trim() ||
    patient.complaintCategory?.trim() ||
    'Unspecified arrival reason'
  );
}

export function buildEncounterLinkageMetadata(
  patient: Patient,
  options: {
    encounterId: string;
    intakeSource: string;
    queue?: string;
    sessionId?: string;
  },
) {
  return {
    patientId: patient.id,
    encounterId: options.encounterId,
    arrivalReason: getArrivalReasonFromPatient(patient),
    complaintCategory: patient.complaintCategory || 'Other',
    queue: options.queue || WHITEBOARD_QUEUE_FILTER.triage,
    intakeSource: options.intakeSource,
    sessionId: options.sessionId,
  };
}

export function enrichEncounterTimeline(
  timeline: JourneyEvent[] = [],
  encounterId: string,
  linkage: Record<string, string | number | boolean | null | undefined>,
): JourneyEvent[] {
  let updated = false;
  const nextTimeline = timeline.map((event) => {
    if (event.type !== 'EncounterCreated') return event;
    const eventEncounterId = event.metadata?.encounterId;
    if (eventEncounterId !== encounterId) return event;
    updated = true;
    return {
      ...event,
      metadata: {
        ...event.metadata,
        ...linkage,
      },
    };
  });

  if (updated) return nextTimeline;
  return timeline;
}

export function applyIntakeArrivalContext(
  store: { patients: Patient[]; updatePatient: (id: string, patch: Partial<Patient>) => void },
  patientId: string,
  context: { arrivalReason?: string; complaintCategory?: string },
) {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) return;
  const arrivalReason = context.arrivalReason?.trim();
  if (!arrivalReason) return;

  store.updatePatient(patientId, {
    chiefComplaint: arrivalReason,
    complaint: arrivalReason,
    complaintCategory: context.complaintCategory || patient.complaintCategory || 'Other',
  });
}

export function readIntakeEncounterChain(
  patient?: Patient | null,
  encounterId?: string | null,
  queue = WHITEBOARD_QUEUE_FILTER.triage,
): IntakeEncounterChain {
  const resolvedEncounterId =
    encounterId ||
    (patient?.timeline?.find((event) => event.type === 'EncounterCreated')?.metadata
      ?.encounterId as string | undefined) ||
    null;

  const encounterEvent = patient?.timeline?.find(
    (event) =>
      event.type === 'EncounterCreated' &&
      (!resolvedEncounterId || event.metadata?.encounterId === resolvedEncounterId),
  );

  const arrivalReason =
    (typeof encounterEvent?.metadata?.arrivalReason === 'string'
      ? encounterEvent.metadata.arrivalReason
      : null) || getArrivalReasonFromPatient(patient);

  const linkedQueue =
    (typeof encounterEvent?.metadata?.queue === 'string' ? encounterEvent.metadata.queue : null) ||
    queue;

  return {
    patientId: patient?.id || '',
    encounterId: resolvedEncounterId,
    arrivalReason,
    complaintCategory: patient?.complaintCategory || 'Other',
    queue: linkedQueue,
    connected: Boolean(
      patient?.id &&
        resolvedEncounterId &&
        arrivalReason &&
        linkedQueue &&
        encounterEvent?.metadata?.patientId === patient.id,
    ),
    arrivalControl: patient ? buildArrivalControlSnapshot(patient) : undefined,
  };
}
