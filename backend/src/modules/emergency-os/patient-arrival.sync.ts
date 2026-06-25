import type {
  ArrivalMode,
  EmergencyPatient,
  EmergencyPatientState,
  EmergencyPriority,
  PatientArrivalRecord,
  QueueDestination,
  RegistrationStatus,
  TriageAcuity,
  WaitingRoomStatus,
} from './emergency-os.types';

const PRIORITY_LEVEL: Record<EmergencyPriority, 1 | 2 | 3 | 4 | 5> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
};

const LEVEL_PRIORITY: Record<1 | 2 | 3 | 4 | 5, EmergencyPriority> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
  5: 'P5',
};

function normalizeArrivalMode(
  input?: string | null,
  patient?: Partial<EmergencyPatient>,
): ArrivalMode {
  if (patient?.flags?.includes('EMSArrival')) return 'EMS';

  const normalized = String(input || patient?.arrivalMode || '')
    .trim()
    .toLowerCase();

  if (normalized === 'ems') return 'EMS';
  if (normalized === 'referral') return 'referral';
  if (normalized === 'police') return 'police';
  if (normalized === 'transfer') return 'transfer';
  if (
    normalized === 'self-check-in' ||
    normalized === 'self check-in' ||
    normalized === 'selfarrival' ||
    normalized === 'self-arrival'
  ) {
    return 'self-check-in';
  }
  if (normalized === 'walk-in' || normalized === 'walkin') return 'walk-in';

  return 'walk-in';
}

function priorityToTriageAcuity(
  priority: EmergencyPriority,
  options: Partial<
    Pick<
      TriageAcuity,
      'status' | 'assignedAt' | 'assignedByStaffId' | 'suggestedAt' | 'suggestionSource'
    >
  > = {},
): TriageAcuity {
  return {
    code: priority,
    system: 'PRIORITY',
    level: PRIORITY_LEVEL[priority],
    status: options.status ?? 'unassigned',
    assignedAt: options.assignedAt ?? null,
    assignedByStaffId: options.assignedByStaffId ?? null,
    suggestedAt: options.suggestedAt ?? null,
    suggestionSource: options.suggestionSource,
  };
}

function triageAcuityToPriority(acuity: TriageAcuity): EmergencyPriority {
  if (acuity.system === 'PRIORITY' && acuity.code in PRIORITY_LEVEL) {
    return acuity.code as EmergencyPriority;
  }

  return LEVEL_PRIORITY[acuity.level] ?? 'P5';
}

function deriveRegistrationStatus(patient: Partial<EmergencyPatient>): RegistrationStatus {
  if (patient.registrationStatus) return patient.registrationStatus;
  if (patient.flags?.includes('IdentityPending')) return 'provisional';
  if (patient.state === 'Arrival') return 'pending';
  if (patient.state === 'Registration') return 'in-progress';
  return 'complete';
}

function deriveTriagePending(patient: Partial<EmergencyPatient>): boolean {
  if (typeof patient.triagePending === 'boolean') return patient.triagePending;
  return patient.state === 'Triage';
}

function deriveQueueDestination(patient: Partial<EmergencyPatient>): QueueDestination {
  if (patient.queueDestination) return patient.queueDestination;
  if (patient.state === 'Waiting') return 'waiting-room';
  if (patient.state === 'Triage') return 'triage-queue';
  if (normalizeArrivalMode(patient.arrivalMode, patient) === 'EMS') return 'ems-registration';
  if (patient.state === 'Registration' || patient.state === 'Arrival') return 'verification';
  return 'whiteboard';
}

function deriveWaitingRoomStatus(patient: Partial<EmergencyPatient>): WaitingRoomStatus {
  if (patient.arrival?.waitingRoomStatus) return patient.arrival.waitingRoomStatus;

  const queueDestination = deriveQueueDestination(patient);
  const triagePending = deriveTriagePending(patient);

  if (patient.state === 'Admission' || patient.flags?.includes('PendingAdmission')) {
    return 'awaiting-admission-bed';
  }

  if (patient.state === 'Disposition' || patient.state === 'Discharge') {
    return 'preparing-discharge';
  }

  if (patient.state === 'Results') return 'waiting-for-results';
  if (patient.state === 'Orders') return 'tests-in-progress';
  if (patient.state === 'Waiting' || queueDestination === 'waiting-room') {
    return 'waiting-for-clinician';
  }

  if (
    patient.state === 'Triage' ||
    triagePending ||
    queueDestination === 'triage-queue' ||
    queueDestination === 'rapid-review'
  ) {
    return 'waiting-for-triage';
  }

  if (
    patient.state === 'Arrival' ||
    patient.state === 'Registration' ||
    queueDestination === 'verification' ||
    queueDestination === 'ems-registration'
  ) {
    return 'registered';
  }

  return 'waiting-for-clinician';
}

function resolveTriageAcuityStatus(patient: Partial<EmergencyPatient>): TriageAcuity['status'] {
  if (patient.triageTime) return 'confirmed';
  if (patient.triageAssist) return 'suggested';
  if (patient.arrival?.triageAcuity?.status) return patient.arrival.triageAcuity.status;
  return 'unassigned';
}

export function normalizePatientArrival(patient: Partial<EmergencyPatient>): PatientArrivalRecord {
  if (patient.arrival) {
    return {
      ...patient.arrival,
      chiefComplaint:
        (patient.arrival.chiefComplaint ?? '').trim() ||
        patient.chiefComplaint ||
        'Unspecified complaint',
      arrivalMode: normalizeArrivalMode(patient.arrival.arrivalMode, patient),
      arrivalTimestamp:
        patient.arrival.arrivalTimestamp || patient.arrivalTime || new Date().toISOString(),
    };
  }

  const priority = patient.priority || 'P3';
  const triageStatus = resolveTriageAcuityStatus(patient);

  return {
    arrivalMode: normalizeArrivalMode(patient.arrivalMode, patient),
    arrivalTimestamp: patient.arrivalTime || new Date().toISOString(),
    chiefComplaint: patient.chiefComplaint || 'Unspecified complaint',
    triageAcuity: priorityToTriageAcuity(priority, {
      status: triageStatus,
      assignedAt: patient.triageTime ?? null,
      suggestedAt: patient.triageAssistGeneratedAt ?? null,
      suggestionSource:
        normalizeArrivalMode(patient.arrivalMode, patient) === 'self-check-in'
          ? 'self-arrival'
          : patient.triageAssist
            ? 'triage-assist'
            : undefined,
    }),
    waitingRoomStatus: deriveWaitingRoomStatus(patient),
    registrationStatus: deriveRegistrationStatus(patient),
    queueDestination: deriveQueueDestination(patient),
    triagePending: deriveTriagePending(patient),
    firstContactAt: patient.firstContactAt ?? null,
  };
}

export function syncPatientFromArrival(
  patient: Partial<EmergencyPatient>,
  arrival: PatientArrivalRecord,
): Partial<EmergencyPatient> {
  const priority = triageAcuityToPriority(arrival.triageAcuity);

  return {
    ...patient,
    arrival,
    arrivalTime: arrival.arrivalTimestamp,
    arrivalMode: arrival.arrivalMode,
    chiefComplaint: arrival.chiefComplaint,
    priority,
    registrationStatus: arrival.registrationStatus,
    queueDestination: arrival.queueDestination,
    triagePending: arrival.triagePending,
    firstContactAt: arrival.firstContactAt ?? null,
  };
}

/** Ensures create/hydrate payloads carry a canonical arrival block with legacy dual-write fields. */
export function ensurePatientArrivalBlock(
  patient: Partial<EmergencyPatient>,
): Partial<EmergencyPatient> {
  const arrival = patient.arrival ?? normalizePatientArrival(patient);
  return syncPatientFromArrival(patient, arrival);
}

export function patientArrivalContractViolations(patient: Partial<EmergencyPatient>): string[] {
  const arrival = patient.arrival ?? normalizePatientArrival(patient);
  const violations: string[] = [];
  const required: Array<keyof PatientArrivalRecord> = [
    'arrivalMode',
    'arrivalTimestamp',
    'chiefComplaint',
    'triageAcuity',
    'waitingRoomStatus',
  ];

  for (const field of required) {
    const value = arrival[field];
    if (value === undefined || value === null || value === '') {
      violations.push(field);
    }
  }

  if (!arrival.triageAcuity?.code || !arrival.triageAcuity?.level) {
    violations.push('triageAcuity.code');
  }

  return violations;
}

export function defaultStateForArrivalMode(mode: ArrivalMode): EmergencyPatientState {
  if (mode === 'EMS') return 'Registration';
  return 'Triage';
}
