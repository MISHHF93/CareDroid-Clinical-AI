import { isEmsRegistrationPatient } from '../components/reception/receptionQueueModel';
import {
  classifyReferralBucket,
  isClosedReferralStatus,
} from '../components/whiteboard/referralAwarenessModel';
import { deriveQueueDestination, deriveTriagePending } from './arrivalControlLayer';
import {
  PatientFlag,
  PatientState,
  type Patient,
  type PatientExperienceStatusId,
  type PatientExperienceStatusSnapshot,
  type PatientExperienceTone,
  type PublicPatientExperienceStatusView,
  type QueueDestination,
  type Referral,
} from '../types/emergency';

export type PatientExperienceStatusDefinition = {
  id: PatientExperienceStatusId;
  label: string;
  shortLabel: string;
  tone: PatientExperienceTone;
};

export const PATIENT_EXPERIENCE_STATUS_DEFINITIONS: readonly PatientExperienceStatusDefinition[] =
  Object.freeze([
    {
      id: 'registered',
      label: 'Registered',
      shortLabel: 'Registered',
      tone: 'neutral',
    },
    {
      id: 'waiting-for-triage',
      label: 'Waiting for triage',
      shortLabel: 'Triage queue',
      tone: 'watch',
    },
    {
      id: 'waiting-for-clinician',
      label: 'Waiting for clinician',
      shortLabel: 'Clinician',
      tone: 'watch',
    },
    {
      id: 'tests-in-progress',
      label: 'Tests in progress',
      shortLabel: 'Tests',
      tone: 'info',
    },
    {
      id: 'waiting-for-results',
      label: 'Waiting for results',
      shortLabel: 'Results',
      tone: 'watch',
    },
    {
      id: 'waiting-for-specialist-review',
      label: 'Waiting for specialist review',
      shortLabel: 'Specialist',
      tone: 'watch',
    },
    {
      id: 'preparing-discharge',
      label: 'Preparing discharge',
      shortLabel: 'Discharge',
      tone: 'stable',
    },
    {
      id: 'awaiting-admission-bed',
      label: 'Awaiting admission bed',
      shortLabel: 'Admission bed',
      tone: 'watch',
    },
  ]);

const DEFINITION_BY_ID = new Map(
  PATIENT_EXPERIENCE_STATUS_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export type PatientExperienceContext = {
  referrals?: Referral[];
};

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string'
      ? entry === flag
      : (entry as unknown as { type: string })?.type === flag,
  );
}

function activeReferralForPatient(patient: Patient, referrals: Referral[] = []): Referral | null {
  const patientReferrals = referrals.filter((referral) => referral.patientId === patient.id);
  const priority = ['delayed', 'pending', 'accepted'] as const;

  for (const bucket of priority) {
    const referral = patientReferrals.find((entry) => classifyReferralBucket(entry) === bucket);
    if (referral) return referral;
  }

  if (patient.referral && !isClosedReferralStatus(patient.referral.status)) {
    return patient.referral;
  }

  return null;
}

function pendingTestCount(patient: Patient): number {
  const timeline = patient.timeline || [];
  const orders = timeline.filter((event) => event.type === 'OrderPlaced').length;
  const results = timeline.filter((event) => event.type === 'ResultReceived').length;
  return Math.max(0, orders - results);
}

function buildSnapshot(
  id: PatientExperienceStatusId,
  patient: Patient,
  staffDetail: string,
  queueDestination?: QueueDestination,
): PatientExperienceStatusSnapshot {
  const definition = DEFINITION_BY_ID.get(id)!;
  return {
    id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    tone: definition.tone,
    internalState: patient.state,
    queueDestination,
    staffDetail,
  };
}

/** Maps internal journey and queue state to a patient-understandable status — staff visibility only. */
export function resolvePatientExperienceStatus(
  patient: Patient,
  context: PatientExperienceContext = {},
): PatientExperienceStatusSnapshot {
  const referrals = context.referrals || [];
  const queueDestination = patient.arrival?.queueDestination ?? deriveQueueDestination(patient);
  const triagePending =
    typeof patient.arrival?.triagePending === 'boolean'
      ? patient.arrival.triagePending
      : deriveTriagePending(patient);

  if (patient.arrival?.waitingRoomStatus) {
    return buildSnapshot(
      patient.arrival.waitingRoomStatus,
      patient,
      `Arrival status · ${patient.arrival.waitingRoomStatus}`,
      queueDestination,
    );
  }

  const referral = activeReferralForPatient(patient, referrals);

  if (patient.state === PatientState.Admission || hasFlag(patient, PatientFlag.PendingAdmission)) {
    return buildSnapshot(
      'awaiting-admission-bed',
      patient,
      `Internal ${patient.state} · pending inpatient bed`,
      queueDestination,
    );
  }

  if (patient.state === PatientState.Disposition || patient.state === PatientState.Discharge) {
    return buildSnapshot(
      'preparing-discharge',
      patient,
      `Internal ${patient.state} · discharge planning`,
      queueDestination,
    );
  }

  if (referral) {
    return buildSnapshot(
      'waiting-for-specialist-review',
      patient,
      `Referral ${referral.status}${referral.service || referral.targetDepartment ? ` · ${referral.service || referral.targetDepartment}` : ''}`,
      queueDestination,
    );
  }

  if (patient.state === PatientState.Results) {
    return buildSnapshot(
      'waiting-for-results',
      patient,
      'Internal Results · awaiting clinician review of completed tests',
      queueDestination,
    );
  }

  if (patient.state === PatientState.Orders || pendingTestCount(patient) > 0) {
    return buildSnapshot(
      'tests-in-progress',
      patient,
      `Internal Orders · ${Math.max(pendingTestCount(patient), 1)} test pathway active`,
      queueDestination,
    );
  }

  if (patient.state === PatientState.Waiting || queueDestination === 'waiting-room') {
    return buildSnapshot(
      'waiting-for-clinician',
      patient,
      `Internal Waiting · ${queueDestination || 'whiteboard queue'}`,
      queueDestination,
    );
  }

  if (
    patient.state === PatientState.Triage ||
    triagePending ||
    queueDestination === 'triage-queue' ||
    queueDestination === 'rapid-review'
  ) {
    return buildSnapshot(
      'waiting-for-triage',
      patient,
      `Internal Triage · ${queueDestination}`,
      queueDestination,
    );
  }

  if (
    patient.state === PatientState.Arrival ||
    patient.state === PatientState.Registration ||
    queueDestination === 'verification' ||
    queueDestination === 'ems-registration' ||
    isEmsRegistrationPatient(patient)
  ) {
    return buildSnapshot(
      'registered',
      patient,
      `Internal ${patient.state} · registration in progress`,
      queueDestination,
    );
  }

  if (patient.state === PatientState.Assessment) {
    return buildSnapshot(
      'waiting-for-clinician',
      patient,
      'Internal Assessment · active clinician encounter',
      queueDestination,
    );
  }

  return buildSnapshot(
    'registered',
    patient,
    `Internal ${patient.state} · default mapping`,
    queueDestination,
  );
}

export function toPublicPatientExperienceStatusView(
  snapshot: PatientExperienceStatusSnapshot,
): PublicPatientExperienceStatusView {
  return {
    id: snapshot.id,
    label: snapshot.label,
  };
}

export function summarizePatientExperienceStatuses(
  patients: Patient[] = [],
  context: PatientExperienceContext = {},
): Record<PatientExperienceStatusId, number> {
  const counts = Object.fromEntries(
    PATIENT_EXPERIENCE_STATUS_DEFINITIONS.map((definition) => [definition.id, 0]),
  ) as Record<PatientExperienceStatusId, number>;

  patients.forEach((patient) => {
    const statusId =
      patient.arrival?.waitingRoomStatus ?? resolvePatientExperienceStatus(patient, context).id;
    counts[statusId] += 1;
  });

  return counts;
}

export function patientExperienceStatusLabel(id: PatientExperienceStatusId): string {
  return DEFINITION_BY_ID.get(id)?.label || id;
}

/** Documents how internal journey and queue signals map to experience statuses. */
export const PATIENT_EXPERIENCE_JOURNEY_MAPPING = Object.freeze([
  {
    experienceStatusId: 'awaiting-admission-bed' as const,
    journeyStates: [PatientState.Admission],
    queueDestinations: [] as QueueDestination[],
    flags: [PatientFlag.PendingAdmission],
  },
  {
    experienceStatusId: 'preparing-discharge' as const,
    journeyStates: [PatientState.Disposition, PatientState.Discharge],
    queueDestinations: [] as QueueDestination[],
    flags: [] as PatientFlag[],
  },
  {
    experienceStatusId: 'waiting-for-specialist-review' as const,
    journeyStates: [] as PatientState[],
    queueDestinations: [] as QueueDestination[],
    flags: [] as PatientFlag[],
    requiresActiveReferral: true,
  },
  {
    experienceStatusId: 'waiting-for-results' as const,
    journeyStates: [PatientState.Results],
    queueDestinations: [] as QueueDestination[],
    flags: [] as PatientFlag[],
  },
  {
    experienceStatusId: 'tests-in-progress' as const,
    journeyStates: [PatientState.Orders],
    queueDestinations: [] as QueueDestination[],
    flags: [] as PatientFlag[],
  },
  {
    experienceStatusId: 'waiting-for-clinician' as const,
    journeyStates: [PatientState.Waiting, PatientState.Assessment],
    queueDestinations: ['waiting-room'] as QueueDestination[],
    flags: [] as PatientFlag[],
  },
  {
    experienceStatusId: 'waiting-for-triage' as const,
    journeyStates: [PatientState.Triage],
    queueDestinations: ['triage-queue', 'rapid-review'] as QueueDestination[],
    flags: [] as PatientFlag[],
    triagePending: true,
  },
  {
    experienceStatusId: 'registered' as const,
    journeyStates: [PatientState.Arrival, PatientState.Registration],
    queueDestinations: ['verification', 'ems-registration'] as QueueDestination[],
    flags: [PatientFlag.EMSArrival],
  },
]);

export type PatientExperienceBoardLine = {
  id: PatientExperienceStatusId;
  label: string;
  shortLabel: string;
  tone: PatientExperienceTone;
  count: number;
};

export type PatientExperienceBoardSummary = {
  activeCount: number;
  statusLines: PatientExperienceBoardLine[];
};

export function buildPatientExperienceBoardSummary(
  patients: Patient[] = [],
  context: PatientExperienceContext = {},
): PatientExperienceBoardSummary {
  const counts = summarizePatientExperienceStatuses(patients, context);
  const statusLines = PATIENT_EXPERIENCE_STATUS_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    tone: definition.tone,
    count: counts[definition.id],
  })).filter((line) => line.count > 0);

  return {
    activeCount: patients.length,
    statusLines,
  };
}

const PUBLIC_PHI_PATTERN =
  /\b(mrn|dob|ssn|@[a-z0-9.-]+\.[a-z]{2,})\b|(?:\b\d{3}-\d{2}-\d{4}\b)|(?:\b\d{2}\/\d{2}\/\d{4}\b)/i;

/** Resolves a PHI-safe public view — id and generic label only. */
export function resolvePublicPatientExperienceStatus(
  patient: Patient,
  context: PatientExperienceContext = {},
): PublicPatientExperienceStatusView {
  return toPublicPatientExperienceStatusView(resolvePatientExperienceStatus(patient, context));
}

export function assertPublicPatientExperienceViewIsPhiSafe(
  view: PublicPatientExperienceStatusView,
): boolean {
  const serialized = JSON.stringify(view);
  if (PUBLIC_PHI_PATTERN.test(serialized)) return false;
  return Object.keys(view).every((key) => key === 'id' || key === 'label');
}
