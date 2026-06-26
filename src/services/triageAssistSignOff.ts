import type { TriageAssistEnvelope } from '../../lib/patient-orchestration/types';
import {
  CARE_STREAMING_LANES,
  priorityToEsiLabel,
  type CareStreamingLane,
} from '../config/edOperationalStandards';
import { PatientState, Priority, type Patient, type QueueDestination } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { enterWaitingQueue } from './queueAssignment';

type EmergencyStore = ReturnType<typeof useEmergencyStore.getState>;

export type TriageAssistOverride = {
  priority?: Priority;
  streamingLane?: CareStreamingLane | string;
};

export function isTriageAssistPendingReview(patient: Patient | null | undefined): boolean {
  if (!patient?.triageAssist) return false;
  if (patient.triageAssist.dismissedAt || patient.triageAssist.acceptedAt) return false;
  if (patient.state === PatientState.Triage) return true;
  if (patient.triagePending) return true;
  if (patient.source === 'Self-arrival') return true;
  return false;
}

export function mapStreamingLaneToQueueDestination(lane: string): QueueDestination {
  if (lane === 'resus' || lane === 'majors') return 'triage-queue';
  if (lane === 'fast-track' || lane === 'utc') return 'rapid-review';
  if (lane === 'minors') return 'waiting-room';
  if (lane === 'observation') return 'waiting-room';
  return 'triage-queue';
}

export function streamingLaneLabel(lane: string): string {
  return CARE_STREAMING_LANES.find((entry) => entry.id === lane)?.label || lane;
}

export function buildAcceptedTriageAssist(
  assist: TriageAssistEnvelope,
  override: TriageAssistOverride = {},
): TriageAssistEnvelope {
  const streamingLane = override.streamingLane || assist.suggestedQueue;
  return {
    ...assist,
    suggestedPriority: override.priority || assist.suggestedPriority,
    suggestedQueue: streamingLane,
    rationale: [
      ...assist.rationale,
      override.priority ? `Priority overridden to ${override.priority} by nurse review.` : '',
      override.streamingLane ? `Streaming lane set to ${streamingLaneLabel(String(streamingLane))}.` : '',
      `ESI mapping: ${priorityToEsiLabel(override.priority || assist.suggestedPriority)}`,
    ].filter(Boolean),
    acceptedAt: new Date().toISOString(),
    requiresHumanReview: true,
  };
}

export function acceptTriageAssistSuggestion(
  store: EmergencyStore,
  patient: Patient,
  assist: TriageAssistEnvelope,
  {
    actorName = 'Triage nurse',
    override = {},
    moveToWaiting = true,
  }: {
    actorName?: string;
    override?: TriageAssistOverride;
    moveToWaiting?: boolean;
  } = {},
): { ok: boolean; accepted: TriageAssistEnvelope } {
  const accepted = buildAcceptedTriageAssist(assist, override);
  const queueDestination = mapStreamingLaneToQueueDestination(String(accepted.suggestedQueue));

  store.updatePatient(patient.id, {
    priority: accepted.suggestedPriority,
    triagePending: false,
    triageAssist: accepted,
    queueDestination,
    state: patient.state === PatientState.Triage ? PatientState.Waiting : patient.state,
  });

  if (moveToWaiting) {
    enterWaitingQueue(store, {
      patientId: patient.id,
      actorName,
      note: `Triage assist accepted (${accepted.suggestedPriority}, ${streamingLaneLabel(String(accepted.suggestedQueue))}).`,
    });
  }

  store.recordWorkflowAction?.({
    type: 'journey_state_changed',
    summary: `Triage suggestion accepted for ${patient.firstName} ${patient.lastName}.`,
    patientId: patient.id,
    actorName,
    source: 'triage-assist-signoff',
    metadata: {
      suggestedPriority: accepted.suggestedPriority,
      suggestedQueue: accepted.suggestedQueue,
      esiLabel: priorityToEsiLabel(accepted.suggestedPriority),
      accepted: true,
    },
  });

  return { ok: true, accepted };
}

export function dismissTriageAssistSuggestion(
  store: EmergencyStore,
  patient: Patient,
  assist: TriageAssistEnvelope,
  actorName = 'Triage nurse',
): void {
  store.updatePatient(patient.id, {
    triageAssist: {
      ...assist,
      dismissedAt: new Date().toISOString(),
    },
  });
  store.recordWorkflowAction?.({
    type: 'integration_event_received',
    summary: `Triage suggestion dismissed for ${patient.firstName} ${patient.lastName}.`,
    patientId: patient.id,
    actorName,
    source: 'triage-assist-signoff',
    metadata: { dismissed: true },
  });
}