import {
  PatientState,
  type CapacitySnapshot,
  type Patient,
  type Referral,
} from '../../types/emergency';
import { buildArrivalControlSummary } from '../../services/arrivalControlLayer';
import {
  buildWaitingRoomStatusMessagingSnapshot,
  type WaitingRoomStatusMessagingSnapshot,
} from '../../services/waitingRoomStatusMessaging';
import { buildCrowdLevelSnapshot, type CrowdLevelTone } from '../../engine/crowdLevelEngine';
import {
  buildWaitingRoomProcessEducationSnapshot,
  type WaitingRoomProcessEducationSnapshot,
} from '../../services/waitingRoomProcessEducation';
import {
  PUBLIC_WAIT_URGENCY_DISCLAIMER,
  buildSafeWaitRangeMessage,
} from '../../engine/safeWaitRangeMessaging';
import {
  buildPublicEmsCrowdingImpact,
  type PublicEmsCrowdingImpact,
} from '../../services/emsOffloadVisibilityModel';
import {
  assertDisplayPayloadIsPhiSafe,
  collectDisplayPhiTokens,
} from '../../config/displayPhiRedaction';
import type { EMSArrival } from '../../types/emergency';

export {
  PUBLIC_WAIT_URGENCY_DISCLAIMER,
  formatPublicWaitDuration,
  formatPublicWaitRange,
} from '../../engine/safeWaitRangeMessaging';

export { PUBLIC_WAITING_ESCALATION_MESSAGE } from '../../services/waitingRoomStatusMessaging';

export const PUBLIC_WAITING_GUIDANCE_MESSAGES = Object.freeze([
  'Please remain in the waiting area until you are called.',
  'Wait times vary — patients with the most urgent needs are seen first.',
  'This screen shows general department information only, not your personal care status.',
  'If your symptoms worsen, tell staff immediately or ask for help at the desk.',
  'You may be asked to move to a different chair or room for care.',
  'Ask staff if you need help with restrooms, water, or comfort items.',
]);

export type PublicWaitingTone = CrowdLevelTone;

export type PublicWaitingCrowdLevel = {
  label: string;
  tone: PublicWaitingTone;
  detail: string;
};

export type PublicWaitingCareStage = {
  id: string;
  label: string;
  count: number;
};

export type PublicWaitingDisplaySnapshot = {
  waitRange: { label: string; value: string; detail: string; disclaimer: string };
  crowdLevel: PublicWaitingCrowdLevel;
  triageWait: { label: string; value: string; detail: string; available: boolean; disclaimer: string };
  careStages: PublicWaitingCareStage[];
  processEducation: WaitingRoomProcessEducationSnapshot;
  statusMessaging: WaitingRoomStatusMessagingSnapshot;
  guidanceMessages: readonly string[];
  escalationMessage: string;
  waitDisclaimer: string;
  emsCrowdingImpact: PublicEmsCrowdingImpact;
  summaryLine: string;
  updatedAt: string | null;
};

function minutesSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function derivePublicCrowdLevel(
  waitingCount: number,
  capacityBand?: string,
): PublicWaitingCrowdLevel {
  const crowd = buildCrowdLevelSnapshot({
    audience: 'public',
    patients: [],
    capacity: {
      waitingCount,
      band: (capacityBand as CapacitySnapshot['band']) || 'Green',
      score: 0,
      updatedAt: new Date().toISOString(),
      totalPatients: waitingCount,
      occupiedRooms: 0,
      boardingCount: 0,
      reassessmentDue: 0,
    },
  });
  return {
    label: crowd.label,
    tone: crowd.tone,
    detail: crowd.detail,
  };
}

function isTriageQueuePatient(patient: Patient): boolean {
  return (
    patient.state === PatientState.Triage ||
    patient.state === PatientState.Arrival ||
    patient.state === PatientState.Registration
  );
}

function computeAverageTriageWaitMinutes(patients: Patient[], now: Date): number | null {
  const triageCandidates = patients.filter(isTriageQueuePatient);
  if (!triageCandidates.length) return null;
  const waits = triageCandidates.map((patient) => minutesSince(patient.arrivalTime, now));
  return Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length);
}

export function buildPublicWaitingDisplaySnapshot(
  input: {
    patients?: Patient[];
    capacity?: CapacitySnapshot;
    referrals?: Referral[];
    emsArrivals?: EMSArrival[];
    showEmsCrowdingImpact?: boolean;
    offloadTargetMinutes?: number;
    now?: Date;
    updatedAt?: string | null;
  } = {},
): PublicWaitingDisplaySnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const capacity = input.capacity;
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);

  const avgWait =
    capacity?.averageWaitMinutes ??
    (waitingPatients.length
      ? Math.round(
          waitingPatients.reduce(
            (sum, patient) =>
              sum + minutesSince(patient.triageTime || patient.arrivalTime, now),
            0,
          ) / waitingPatients.length,
        )
      : 0);

  const longestWait =
    capacity?.longestWaitMinutes ??
    waitingPatients.reduce(
      (max, patient) =>
        Math.max(max, minutesSince(patient.triageTime || patient.arrivalTime, now)),
      0,
    );

  const clinicianWait = buildSafeWaitRangeMessage({
    avgMinutes: avgWait,
    longestMinutes: longestWait,
  });
  const waitRange = {
    label: 'Estimated wait range',
    value: clinicianWait.value,
    detail: clinicianWait.detail,
    disclaimer: clinicianWait.disclaimer,
  };

  const crowdSnapshot = buildCrowdLevelSnapshot({
    audience: 'public',
    patients,
    capacity,
    now,
  });
  const crowdLevel = {
    label: crowdSnapshot.label,
    tone: crowdSnapshot.tone,
    detail: crowdSnapshot.detail,
  };

  const arrivalControl = buildArrivalControlSummary(patients);
  const triagePendingCount = Math.max(
    patients.filter((patient) => patient.state === PatientState.Triage).length,
    Number(arrivalControl.triagePending) || 0,
  );
  const avgTriageWait = computeAverageTriageWaitMinutes(patients, now);
  const triageWaitAvailable =
    triagePendingCount > 0 && avgTriageWait !== null && avgTriageWait > 0;

  const statusMessaging = buildWaitingRoomStatusMessagingSnapshot({
    patients,
    referrals: input.referrals,
    capacity,
    now,
    updatedAt: input.updatedAt ?? capacity?.updatedAt ?? null,
    audience: 'patient',
  });
  const careStages = statusMessaging.statusLines.map((line) => ({
    id: line.id,
    label: line.message,
    count: line.count,
  }));

  const processEducation = buildWaitingRoomProcessEducationSnapshot('patient');

  const emsCrowdingImpact = buildPublicEmsCrowdingImpact(input.emsArrivals || [], {
    enabled: input.showEmsCrowdingImpact !== false,
    patients,
    now,
    offloadTargetMinutes: input.offloadTargetMinutes ?? 15,
  });

  const triageWaitMessage = triageWaitAvailable
    ? buildSafeWaitRangeMessage({ minutes: avgTriageWait! })
    : null;

  const summaryLine = triageWaitAvailable
    ? `${crowdLevel.label} waiting room · typical clinician wait ${waitRange.value}`
    : `${crowdLevel.label} waiting room · care teams are actively moving patients forward`;

  return {
    waitRange,
    crowdLevel,
    triageWait: {
      label: 'Estimated wait to triage',
      value: triageWaitMessage?.value ?? 'Not available',
      detail: triageWaitMessage?.detail ?? 'No triage queue estimate at this time',
      disclaimer: triageWaitMessage?.disclaimer ?? PUBLIC_WAIT_URGENCY_DISCLAIMER,
      available: triageWaitAvailable,
    },
    careStages,
    processEducation,
    statusMessaging,
    guidanceMessages: PUBLIC_WAITING_GUIDANCE_MESSAGES,
    escalationMessage: statusMessaging.escalationMessage,
    waitDisclaimer: PUBLIC_WAIT_URGENCY_DISCLAIMER,
    emsCrowdingImpact,
    summaryLine,
    updatedAt: input.updatedAt ?? capacity?.updatedAt ?? null,
  };
}

/** Validates that a public waiting display snapshot contains no patient PHI. */
export function assertPublicWaitingDisplaySnapshotIsPhiSafe(
  snapshot: PublicWaitingDisplaySnapshot,
  sourcePatients: Patient[] = [],
): boolean {
  return assertDisplayPayloadIsPhiSafe(snapshot, collectDisplayPhiTokens(sourcePatients));
}
