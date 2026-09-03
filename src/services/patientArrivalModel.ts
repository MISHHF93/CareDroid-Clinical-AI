import {
  PatientFlag,
  PatientState,
  Priority,
  normalizePriority,
  type ArrivalControlSnapshot,
  type ArrivalMode,
  type Patient,
  type PatientArrivalRecord,
  type QueueDestination,
  type QuickSafetyFlag,
  type RegistrationStatus,
  type TriageAcuity,
  type TriageAcuityStatus,
  type ISODateString,
  type WaitingRoomStatus,
} from '../types/emergency';
import {
  deriveQueueDestination,
  deriveRegistrationStatus,
  deriveTriagePending,
  normalizeArrivalMode,
} from './arrivalDerivations';
import { getArrivalReasonFromPatient } from './intakeEncounterChain';

const PRIORITY_LEVEL: Record<Priority, 1 | 2 | 3 | 4 | 5> = {
  [Priority.P1]: 1,
  [Priority.P2]: 2,
  [Priority.P3]: 3,
  [Priority.P4]: 4,
  [Priority.P5]: 5,
};

const QUICK_SAFETY_FLAG_TYPES: readonly QuickSafetyFlag[] = [
  PatientFlag.HighRisk,
  PatientFlag.StrokeCode,
  PatientFlag.SepsisAlert,
  PatientFlag.PsychAlert,
  PatientFlag.Isolation,
  PatientFlag.DeterioratingNeuro,
] as const;

const QUICK_SAFETY_FLAG_SET = new Set<string>(QUICK_SAFETY_FLAG_TYPES);

type PatientFlagEntry = PatientFlag | string | { type?: PatientFlag };

function extractQuickSafetyFlags(patient: Patient): QuickSafetyFlag[] {
  const stored = patient.quickSafetyFlags?.filter((flag): flag is QuickSafetyFlag =>
    QUICK_SAFETY_FLAG_SET.has(flag),
  );
  if (stored?.length) return stored;

  return ((patient.flags || []) as PatientFlagEntry[])
    .map((entry) => (typeof entry === 'string' ? entry : entry?.type))
    .filter((flag): flag is QuickSafetyFlag => Boolean(flag && QUICK_SAFETY_FLAG_SET.has(flag)));
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return ((patient.flags || []) as PatientFlagEntry[]).some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

function mapSuggestionSource(patient: Patient): TriageAcuity['suggestionSource'] | undefined {
  if (patient.source === 'Self-arrival' || patient.arrivalMode === 'self-check-in') {
    return 'self-arrival';
  }
  if (patient.triageAssist?.source) return 'triage-assist';
  return 'rules';
}

function resolveTriageAcuityStatus(patient: Patient): TriageAcuityStatus {
  if (patient.triageTime) return 'confirmed';
  if (patient.triageAssist) return 'suggested';
  if (patient.arrival?.triageAcuity?.status) return patient.arrival.triageAcuity.status;
  return 'unassigned';
}

export function priorityToTriageAcuity(
  priority: Priority | string,
  options: Partial<
    Pick<
      TriageAcuity,
      'status' | 'assignedAt' | 'assignedByStaffId' | 'suggestedAt' | 'suggestionSource'
    >
  > = {},
): TriageAcuity {
  const normalized = normalizePriority(priority);
  return {
    code: normalized,
    system: 'PRIORITY',
    level: PRIORITY_LEVEL[normalized],
    status: options.status ?? 'unassigned',
    assignedAt: options.assignedAt ?? null,
    assignedByStaffId: options.assignedByStaffId ?? null,
    suggestedAt: options.suggestedAt ?? null,
    suggestionSource: options.suggestionSource,
  };
}

export function triageAcuityToPriority(acuity: TriageAcuity): Priority {
  if (acuity.system === 'PRIORITY') {
    return normalizePriority(acuity.code);
  }

  const levelMatch = acuity.code.match(/(\d)$/);
  if (levelMatch) {
    return normalizePriority(Number(levelMatch[1]));
  }

  return Priority.P5;
}

/** Derives waiting-room status from journey state without importing patient experience services. */
export function deriveWaitingRoomStatus(patient: Patient): WaitingRoomStatus {
  if (patient.arrival?.waitingRoomStatus) {
    return patient.arrival.waitingRoomStatus;
  }

  const queueDestination = deriveQueueDestination(patient);
  const triagePending = deriveTriagePending(patient);

  if (patient.state === PatientState.Admission || hasFlag(patient, PatientFlag.PendingAdmission)) {
    return 'awaiting-admission-bed';
  }

  if (patient.state === PatientState.Disposition || patient.state === PatientState.Discharge) {
    return 'preparing-discharge';
  }

  if (
    patient.referral &&
    !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(patient.referral.status)
  ) {
    return 'waiting-for-specialist-review';
  }

  if (patient.state === PatientState.Results) {
    return 'waiting-for-results';
  }

  if (patient.state === PatientState.Orders) {
    return 'tests-in-progress';
  }

  if (patient.state === PatientState.Waiting || queueDestination === 'waiting-room') {
    return 'waiting-for-clinician';
  }

  if (
    patient.state === PatientState.Triage ||
    triagePending ||
    queueDestination === 'triage-queue' ||
    queueDestination === 'rapid-review'
  ) {
    return 'waiting-for-triage';
  }

  if (
    patient.state === PatientState.Arrival ||
    patient.state === PatientState.Registration ||
    queueDestination === 'verification' ||
    queueDestination === 'ems-registration'
  ) {
    return 'registered';
  }

  return 'waiting-for-clinician';
}

export function normalizePatientArrival(patient: Patient): PatientArrivalRecord {
  if (patient.arrival) {
    return {
      ...patient.arrival,
      chiefComplaint:
        (patient.arrival.chiefComplaint ?? '').trim() || getArrivalReasonFromPatient(patient),
      arrivalMode: normalizeArrivalMode(patient.arrival.arrivalMode, patient),
      arrivalTimestamp: patient.arrival.arrivalTimestamp || patient.arrivalTime,
    };
  }

  const triageStatus = resolveTriageAcuityStatus(patient);

  return {
    arrivalMode: normalizeArrivalMode(patient.arrivalMode, patient),
    arrivalTimestamp: patient.arrivalTime,
    chiefComplaint: getArrivalReasonFromPatient(patient),
    triageAcuity: priorityToTriageAcuity(patient.priority, {
      status: triageStatus,
      assignedAt: patient.triageTime ?? null,
      suggestedAt: patient.triageAssist?.generatedAt ?? null,
      suggestionSource: triageStatus === 'suggested' ? mapSuggestionSource(patient) : undefined,
    }),
    waitingRoomStatus: deriveWaitingRoomStatus(patient),
    registrationStatus: deriveRegistrationStatus(patient),
    queueDestination: deriveQueueDestination(patient),
    triagePending: deriveTriagePending(patient),
    firstContactAt: patient.firstContactAt ?? null,
  };
}

export type BuildPatientArrivalRecordInput = {
  arrivalMode: ArrivalMode;
  arrivalTimestamp?: ISODateString;
  chiefComplaint: string;
  triageAcuity?: Partial<TriageAcuity>;
  waitingRoomStatus?: WaitingRoomStatus;
  registrationStatus?: RegistrationStatus;
  queueDestination?: QueueDestination;
  triagePending?: boolean;
  firstContactAt?: string | null;
  state?: PatientState;
};

function defaultQueueDestination(
  arrivalMode: ArrivalMode,
  state: PatientState = PatientState.Registration,
): QueueDestination {
  if (state === PatientState.Triage) return 'triage-queue';
  if (state === PatientState.Waiting) return 'waiting-room';
  if (arrivalMode === 'EMS') return 'ems-registration';
  return 'verification';
}

function defaultRegistrationStatus(
  state: PatientState = PatientState.Registration,
): RegistrationStatus {
  if (state === PatientState.Arrival) return 'pending';
  if (state === PatientState.Registration) return 'in-progress';
  return 'complete';
}

export function buildPatientArrivalRecord(
  input: BuildPatientArrivalRecordInput,
): PatientArrivalRecord {
  const state = input.state ?? PatientState.Registration;
  const arrivalTimestamp = input.arrivalTimestamp ?? new Date().toISOString();
  const triageAcuity = input.triageAcuity?.code
    ? priorityToTriageAcuity(input.triageAcuity.code, {
        status: input.triageAcuity.status ?? 'unassigned',
        assignedAt: input.triageAcuity.assignedAt,
        assignedByStaffId: input.triageAcuity.assignedByStaffId,
        suggestedAt: input.triageAcuity.suggestedAt,
        suggestionSource: input.triageAcuity.suggestionSource,
      })
    : priorityToTriageAcuity(Priority.P3, { status: 'unassigned' });

  const queueDestination =
    input.queueDestination ?? defaultQueueDestination(input.arrivalMode, state);

  const waitingRoomStatus =
    input.waitingRoomStatus ??
    (state === PatientState.Triage || input.triagePending
      ? 'waiting-for-triage'
      : state === PatientState.Waiting
        ? 'waiting-for-clinician'
        : 'registered');

  return {
    arrivalMode: input.arrivalMode,
    arrivalTimestamp,
    chiefComplaint: (input.chiefComplaint ?? '').trim(),
    triageAcuity,
    waitingRoomStatus,
    registrationStatus: input.registrationStatus ?? defaultRegistrationStatus(state),
    queueDestination,
    triagePending: input.triagePending ?? state === PatientState.Triage,
    firstContactAt: input.firstContactAt ?? null,
  };
}

function arrivalModeToLegacySource(mode: ArrivalMode): Patient['source'] {
  if (mode === 'EMS') return 'EMS';
  if (mode === 'referral') return 'Referral';
  if (mode === 'transfer') return 'Transfer';
  if (mode === 'self-check-in') return 'Self-arrival';
  return 'WalkIn';
}

/** Dual-writes normalized arrival fields and legacy Patient fields during migration. */
/** Builds a canonical arrival record and dual-writes it onto a partial patient. */
export function mergePatientWithArrival(
  patient: Partial<Patient>,
  arrivalInput: BuildPatientArrivalRecordInput,
): Partial<Patient> {
  const { state } = arrivalInput;
  return syncPatientFromArrival(
    { ...patient, ...(state ? { state } : {}) },
    buildPatientArrivalRecord(arrivalInput),
  );
}

export function syncPatientFromArrival(
  patient: Partial<Patient>,
  arrival: PatientArrivalRecord,
): Partial<Patient> {
  const priority = triageAcuityToPriority(arrival.triageAcuity);

  return {
    ...patient,
    arrival,
    arrivalTime: arrival.arrivalTimestamp,
    arrivalMode: arrival.arrivalMode,
    chiefComplaint: arrival.chiefComplaint,
    complaint: arrival.chiefComplaint,
    priority,
    registrationStatus: arrival.registrationStatus,
    queueDestination: arrival.queueDestination,
    triagePending: arrival.triagePending,
    firstContactAt: arrival.firstContactAt ?? null,
    source: arrivalModeToLegacySource(arrival.arrivalMode),
  };
}

/** Stamps handoff queue state onto the normalized arrival block and legacy patient fields. */
export function stampPatientArrivalAtHandoff(
  patient: Patient,
  patch: Partial<PatientArrivalRecord> = {},
): Partial<Patient> {
  const normalized = normalizePatientArrival(patient);
  const nextArrival: PatientArrivalRecord = {
    ...normalized,
    ...patch,
    triagePending: patch.triagePending ?? true,
    registrationStatus: patch.registrationStatus ?? 'complete',
    queueDestination: patch.queueDestination ?? 'triage-queue',
    waitingRoomStatus: patch.waitingRoomStatus ?? 'waiting-for-triage',
  };

  return syncPatientFromArrival(
    {
      state: PatientState.Triage,
      triagePending: nextArrival.triagePending,
      registrationStatus: nextArrival.registrationStatus,
      queueDestination: nextArrival.queueDestination,
    },
    nextArrival,
  );
}

export function arrivalRecordToControlSnapshot(
  patient: Patient,
  arrival: PatientArrivalRecord = normalizePatientArrival(patient),
): ArrivalControlSnapshot {
  return {
    patientId: patient.id,
    arrivalTimestamp: arrival.arrivalTimestamp,
    arrivalMode: arrival.arrivalMode,
    presentingComplaint: arrival.chiefComplaint,
    quickSafetyFlags: extractQuickSafetyFlags(patient),
    highRiskComplaintFlags: patient.highRiskComplaintFlags || [],
    registrationStatus: arrival.registrationStatus,
    triagePending: arrival.triagePending,
    firstContactTimestamp: arrival.firstContactAt ?? null,
    queueDestination: arrival.queueDestination,
  };
}
