import {
  PatientState,
  type CapacitySnapshot,
  type Patient,
  type Referral,
} from '../../types/emergency';
import { buildArrivalControlSummary } from '../../services/arrivalControlLayer';
import {
  buildWaitingRoomStatusMessagingSnapshot,
  PUBLIC_WAITING_ESCALATION_MESSAGE,
  type WaitingRoomStatusMessagingSnapshot,
} from '../../services/waitingRoomStatusMessaging';

export { PUBLIC_WAITING_ESCALATION_MESSAGE } from '../../services/waitingRoomStatusMessaging';

export const PUBLIC_WAITING_GUIDANCE_MESSAGES = Object.freeze([
  'Please remain in the waiting area until you are called.',
  'Wait times vary — patients with the most urgent needs are seen first.',
  'You may be asked to move to a different chair or room for care.',
  'Ask staff if you need help with restrooms, water, or comfort items.',
]);

export type PublicWaitingTone = 'stable' | 'info' | 'watch' | 'warning' | 'critical';

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
  waitRange: { label: string; value: string; detail: string };
  crowdLevel: PublicWaitingCrowdLevel;
  triageWait: { label: string; value: string; detail: string; available: boolean };
  careStages: PublicWaitingCareStage[];
  statusMessaging: WaitingRoomStatusMessagingSnapshot;
  guidanceMessages: readonly string[];
  escalationMessage: string;
  summaryLine: string;
  updatedAt: string | null;
};

function minutesSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function formatPublicWaitDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatPublicWaitRange(avgMinutes: number, longestMinutes: number): string {
  if (!avgMinutes && !longestMinutes) return 'Updating';
  const avg = avgMinutes || longestMinutes;
  const longest = longestMinutes || avgMinutes;
  if (longest <= avg + 5) return `About ${formatPublicWaitDuration(avg)}`;
  return `${formatPublicWaitDuration(avg)} – ${formatPublicWaitDuration(longest)}`;
}

export function derivePublicCrowdLevel(
  waitingCount: number,
  capacityBand?: string,
): PublicWaitingCrowdLevel {
  const band = capacityBand || 'Green';
  if (band === 'Red' || waitingCount >= 20) {
    return {
      label: 'Very busy',
      tone: 'critical',
      detail: 'The department is under high demand right now.',
    };
  }
  if (band === 'Orange' || waitingCount >= 12) {
    return {
      label: 'Busy',
      tone: 'warning',
      detail: 'More patients than usual are waiting.',
    };
  }
  if (band === 'Yellow' || waitingCount >= 6) {
    return {
      label: 'Moderate',
      tone: 'watch',
      detail: 'Typical waiting-room activity.',
    };
  }
  return {
    label: 'Calm',
    tone: 'stable',
    detail: 'Lower-than-usual waiting room activity.',
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
    now?: Date;
    updatedAt?: string | null;
  } = {},
): PublicWaitingDisplaySnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const capacity = input.capacity;
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
  const waitingCount = capacity?.waitingCount ?? waitingPatients.length;

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

  const waitRange = {
    label: 'Estimated average wait range',
    value: formatPublicWaitRange(avgWait, longestWait),
    detail: 'Typical wait to see a clinician — varies by patient needs',
  };

  const crowdLevel = derivePublicCrowdLevel(waitingCount, capacity?.band);

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

  const summaryLine = triageWaitAvailable
    ? `${crowdLevel.label} waiting room · ${waitRange.value} estimated clinician wait`
    : `${crowdLevel.label} waiting room · care teams are actively moving patients forward`;

  return {
    waitRange,
    crowdLevel,
    triageWait: {
      label: 'Average wait to triage',
      value: triageWaitAvailable ? formatPublicWaitDuration(avgTriageWait!) : 'Not available',
      detail: triageWaitAvailable
        ? 'Typical time until triage nurse assessment'
        : 'No triage queue estimate at this time',
      available: triageWaitAvailable,
    },
    careStages,
    statusMessaging,
    guidanceMessages: PUBLIC_WAITING_GUIDANCE_MESSAGES,
    escalationMessage: statusMessaging.escalationMessage,
    summaryLine,
    updatedAt: input.updatedAt ?? capacity?.updatedAt ?? null,
  };
}
