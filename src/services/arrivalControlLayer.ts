import {
  PatientFlag,
  PatientState,
  type ArrivalControlSnapshot,
  type ArrivalMode,
  type Patient,
  type QueueDestination,
  type QuickSafetyFlag,
  type RegistrationStatus,
} from '../types/emergency';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import { getArrivalReasonFromPatient } from './intakeEncounterChain';
import {
  deriveQueueDestination,
  deriveRegistrationStatus,
  deriveTriagePending,
  normalizeArrivalMode,
} from './arrivalDerivations';
import { arrivalRecordToControlSnapshot } from './patientArrivalModel';
import {
  buildHighRiskComplaintPatch,
  collectHighRiskComplaintLabels,
  patientNeedsRapidReview,
} from './highRiskComplaintFlags';

export {
  deriveQueueDestination,
  deriveRegistrationStatus,
  deriveTriagePending,
  normalizeArrivalMode,
} from './arrivalDerivations';
export {
  assertPatientArrivalContract,
  ensurePatientArrivalBlock,
  hydratePatientFromBackendApi,
  patientArrivalContractViolations,
  serializePatientForBackendApi,
} from './patientArrivalBackendSync';

export const ARRIVAL_MODES: readonly ArrivalMode[] = [
  'walk-in',
  'EMS',
  'referral',
  'self-check-in',
  'police',
  'transfer',
] as const;

export const QUICK_SAFETY_FLAG_TYPES: readonly QuickSafetyFlag[] = [
  PatientFlag.HighRisk,
  PatientFlag.StrokeCode,
  PatientFlag.SepsisAlert,
  PatientFlag.PsychAlert,
  PatientFlag.Isolation,
  PatientFlag.DeterioratingNeuro,
] as const;

const QUICK_SAFETY_FLAG_SET = new Set<string>(QUICK_SAFETY_FLAG_TYPES);

export type ArrivalControlSummary = {
  recentArrivals: number;
  awaitingRegistration: number;
  triagePending: number;
  rapidReview: number;
  inWaitingRoom: number;
  byMode: Record<ArrivalMode, number>;
  snapshots: ArrivalControlSnapshot[];
};

export type ArrivalControlStore = {
  patients: Patient[];
  updatePatient: (patientId: string, patch: Partial<Patient>) => void;
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
  recordWorkflowAction?: (input: {
    type: string;
    summary: string;
    patientId?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }) => void;
};

export type RegisterArrivalControlOptions = {
  source?: string;
  route?: boolean;
  destination?: QueueDestination;
  recordFirstContact?: boolean;
  actorName?: string;
};

/** Adapts emergency store slices to the arrival control layer contract. */
export function toArrivalControlStore(
  store: ArrivalControlStore & {
    recordWorkflowAction?: ArrivalControlStore['recordWorkflowAction'];
  },
): ArrivalControlStore {
  return {
    patients: store.patients,
    updatePatient: store.updatePatient.bind(store),
    dispatchWebSocketEvent: store.dispatchWebSocketEvent?.bind(store),
    recordWorkflowAction: store.recordWorkflowAction?.bind(store),
  };
}

type PatientFlagEntry = PatientFlag | string | { type?: PatientFlag };

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return ((patient.flags || []) as PatientFlagEntry[]).some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

export {
  buildPatientArrivalRecord,
  mergePatientWithArrival,
  normalizePatientArrival,
  stampPatientArrivalAtHandoff,
  syncPatientFromArrival,
  priorityToTriageAcuity,
  triageAcuityToPriority,
  deriveWaitingRoomStatus,
} from './patientArrivalModel';

function extractQuickSafetyFlags(patient: Patient): QuickSafetyFlag[] {
  const stored = patient.quickSafetyFlags?.filter((flag): flag is QuickSafetyFlag =>
    QUICK_SAFETY_FLAG_SET.has(flag),
  );
  if (stored?.length) return stored;

  return ((patient.flags || []) as PatientFlagEntry[])
    .map((entry) => (typeof entry === 'string' ? entry : entry?.type))
    .filter((flag): flag is QuickSafetyFlag => Boolean(flag && QUICK_SAFETY_FLAG_SET.has(flag)));
}

export function buildArrivalControlSnapshot(patient: Patient): ArrivalControlSnapshot {
  return arrivalRecordToControlSnapshot(patient);
}

export type BuildArrivalControlFieldsOptions = {
  arrivalMode?: ArrivalMode | string;
  presentingComplaint?: string;
  quickSafetyFlags?: QuickSafetyFlag[];
  state?: PatientState;
  flags?: PatientFlag[];
  arrivalTime?: string;
  queueDestination?: QueueDestination;
  firstContactAt?: string | null;
};

export function buildArrivalControlFields(
  options: BuildArrivalControlFieldsOptions = {},
): Partial<Patient> {
  const arrivalMode = normalizeArrivalMode(options.arrivalMode);
  const flags = options.flags || [];
  const quickSafetyFlags = Array.from(
    new Set([
      ...(options.quickSafetyFlags || []),
      ...flags.filter((flag): flag is QuickSafetyFlag => QUICK_SAFETY_FLAG_SET.has(flag)),
    ]),
  );
  const state = options.state || PatientState.Registration;
  const registrationStatus: RegistrationStatus =
    hasFlag({ flags } as Patient, PatientFlag.IdentityPending)
      ? 'provisional'
      : state === PatientState.Arrival
        ? 'pending'
        : state === PatientState.Registration
          ? 'in-progress'
          : 'complete';

  const queueDestination =
    options.queueDestination ||
    (state === PatientState.Triage
      ? 'triage-queue'
      : state === PatientState.Waiting
        ? 'waiting-room'
        : arrivalMode === 'EMS'
          ? 'ems-registration'
          : 'verification');

  return {
    arrivalMode,
    registrationStatus,
    triagePending: state === PatientState.Triage,
    queueDestination,
    quickSafetyFlags,
    firstContactAt: options.firstContactAt ?? null,
  };
}

export function stampArrivalControlLayer(
  store: ArrivalControlStore,
  patientId: string,
  patch: Partial<Patient> & BuildArrivalControlFieldsOptions,
): ArrivalControlSnapshot | null {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) return null;

  const controlFields = buildArrivalControlFields({
    arrivalMode: patch.arrivalMode ?? patient.arrivalMode,
    presentingComplaint: patch.presentingComplaint ?? patch.chiefComplaint ?? patient.chiefComplaint,
    quickSafetyFlags: patch.quickSafetyFlags,
    state: patch.state ?? patient.state,
    flags: patch.flags ?? patient.flags,
    queueDestination: patch.queueDestination,
    firstContactAt: patch.firstContactAt ?? patient.firstContactAt,
  });

  store.updatePatient(patientId, {
    ...patch,
    ...controlFields,
    ...(patch.chiefComplaint ? { chiefComplaint: patch.chiefComplaint } : {}),
    ...(patch.complaint ? { complaint: patch.complaint } : {}),
  });

  const updated = { ...patient, ...patch, ...controlFields };
  return buildArrivalControlSnapshot(updated);
}

export function recordFirstContact(
  store: ArrivalControlStore,
  patientId: string,
  options: { actorName?: string; source?: string; note?: string } = {},
): void {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient || patient.firstContactAt) return;

  const timestamp = new Date().toISOString();
  store.updatePatient(patientId, {
    firstContactAt: timestamp,
    registrationStatus:
      patient.state === PatientState.Registration ? 'in-progress' : patient.registrationStatus,
  });

  store.recordWorkflowAction?.({
    type: 'journey_state_changed',
    summary: options.note || 'First staff contact recorded at arrival.',
    patientId,
    source: options.source || 'arrival-control',
    metadata: {
      firstContactAt: timestamp,
      actorName: options.actorName,
    },
  });
}

export function routeArrivalToDestination(
  store: ArrivalControlStore,
  patientId: string,
  destination: QueueDestination,
  options: { source?: string; actorName?: string } = {},
): ArrivalControlSnapshot | null {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) return null;

  const patch: Partial<Patient> = { queueDestination: destination };

  if (destination === 'triage-queue') {
    patch.state = PatientState.Triage;
    patch.triagePending = true;
    patch.registrationStatus = 'complete';
  } else if (destination === 'rapid-review') {
    patch.state = PatientState.Triage;
    patch.triagePending = true;
    patch.registrationStatus = 'complete';
    patch.queueDestination = 'rapid-review';
  } else if (destination === 'waiting-room') {
    patch.state = PatientState.Waiting;
    patch.triagePending = false;
    patch.registrationStatus = 'complete';
  } else if (destination === 'verification') {
    patch.state = PatientState.Registration;
    patch.triagePending = false;
    patch.registrationStatus = 'in-progress';
  } else if (destination === 'ems-registration') {
    patch.state = PatientState.Registration;
    patch.triagePending = false;
    patch.registrationStatus = 'in-progress';
  }

  const snapshot = stampArrivalControlLayer(store, patientId, patch);
  syncArrivalOperationalSurfaces(store, patientId, {
    destination,
    source: options.source,
    snapshot,
  });

  return snapshot;
}

export function syncArrivalOperationalSurfaces(
  store: ArrivalControlStore,
  patientId: string,
  options: {
    destination?: QueueDestination;
    source?: string;
    snapshot?: ArrivalControlSnapshot | null;
  } = {},
): void {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) return;

  const snapshot = options.snapshot || buildArrivalControlSnapshot(patient);
  const destination = options.destination || snapshot.queueDestination;

  store.dispatchWebSocketEvent?.({
    type: 'arrival_control_sync',
    payload: {
      patientId,
      destination,
      source: options.source || 'arrival-control',
      snapshot,
      surfaces: ['triage-queue', 'waiting-room', 'whiteboard', 'operational-snapshot'],
      generatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Canonical post-persist hook: stamp control fields, route high-risk arrivals,
 * and sync triage queue, waiting room, whiteboard, and operational snapshot surfaces.
 */
export function registerArrivalControl(
  store: ArrivalControlStore,
  patientId: string,
  options: RegisterArrivalControlOptions = {},
): ArrivalControlSnapshot | null {
  const snapshot = registerNewArrival(store, patientId, {
    source: options.source,
    route: options.route,
  });

  if (!snapshot) return null;

  if (options.recordFirstContact) {
    recordFirstContact(store, patientId, {
      actorName: options.actorName,
      source: options.source || 'arrival-control',
    });
  }

  if (options.destination && options.destination !== snapshot.queueDestination) {
    return routeArrivalToDestination(store, patientId, options.destination, {
      source: options.source,
      actorName: options.actorName,
    });
  }

  return snapshot;
}

/** @deprecated Use registerArrivalControl */
export function registerNewArrival(
  store: ArrivalControlStore,
  patientId: string,
  options: { source?: string; route?: boolean } = {},
): ArrivalControlSnapshot | null {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) return null;

  const complaintPatch = buildHighRiskComplaintPatch(patient);
  if (Object.keys(complaintPatch).length) {
    store.updatePatient(patientId, complaintPatch);
  }

  let workingPatient: Patient = {
    ...patient,
    ...complaintPatch,
  };

  let snapshot: ArrivalControlSnapshot | null = null;
  if (patientNeedsRapidReview(workingPatient) && options.route !== false) {
    snapshot = routeArrivalToDestination(store, patientId, 'rapid-review', {
      source: options.source || 'high-risk-complaint-flags',
    });
    if (snapshot) {
      workingPatient = {
        ...workingPatient,
        state: PatientState.Triage,
        triagePending: true,
        queueDestination: 'rapid-review',
        registrationStatus: 'complete',
      };
    }
  }

  if (!snapshot) {
    snapshot = stampArrivalControlLayer(store, patientId, {
      arrivalMode: workingPatient.arrivalMode,
      state: workingPatient.state,
      flags: workingPatient.flags,
      queueDestination: workingPatient.queueDestination,
      triagePending: workingPatient.triagePending,
    });
  }

  syncArrivalOperationalSurfaces(store, patientId, {
    source: options.source || 'arrival-register',
    snapshot,
  });

  if (complaintPatch.highRiskComplaintFlags?.length) {
    store.recordWorkflowAction?.({
      type: 'high_risk_complaint_flagged',
      summary: `High-risk complaint flags: ${collectHighRiskComplaintLabels(workingPatient).join(', ')}. Rapid review queue — staff triage required.`,
      patientId,
      source: options.source || 'high-risk-complaint-flags',
      metadata: {
        flagIds: complaintPatch.highRiskComplaintFlags.map((record) => record.id),
        advisoryOnly: true,
      },
    });
  }

  return snapshot;
}

export function buildArrivalControlSummary(
  patients: Patient[] = [],
  { recentMinutes = 30 }: { recentMinutes?: number } = {},
): ArrivalControlSummary {
  const active = patients.filter(
    (patient) =>
      patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );
  const snapshots = active.map(buildArrivalControlSnapshot);
  const cutoff = Date.now() - recentMinutes * 60_000;

  const byMode = ARRIVAL_MODES.reduce(
    (accumulator, mode) => {
      accumulator[mode] = snapshots.filter((entry) => entry.arrivalMode === mode).length;
      return accumulator;
    },
    {} as Record<ArrivalMode, number>,
  );

  return {
    recentArrivals: snapshots.filter(
      (entry) => new Date(entry.arrivalTimestamp).getTime() >= cutoff,
    ).length,
    awaitingRegistration: snapshots.filter(
      (entry) =>
        entry.registrationStatus === 'pending' || entry.registrationStatus === 'in-progress',
    ).length,
    triagePending: snapshots.filter((entry) => entry.triagePending).length,
    rapidReview: snapshots.filter((entry) => entry.queueDestination === 'rapid-review').length,
    inWaitingRoom: snapshots.filter((entry) => entry.queueDestination === 'waiting-room').length,
    byMode,
    snapshots,
  };
}

export function queueDestinationToWhiteboardFilter(
  destination: QueueDestination,
): string | null {
  if (destination === 'triage-queue' || destination === 'rapid-review') {
    return WHITEBOARD_QUEUE_FILTER.triage;
  }
  if (destination === 'waiting-room') return WHITEBOARD_QUEUE_FILTER.waiting;
  if (destination === 'ems-registration') return WHITEBOARD_QUEUE_FILTER.ems;
  return null;
}

export function arrivalModeLabel(mode: ArrivalMode): string {
  const labels: Record<ArrivalMode, string> = {
    'walk-in': 'Walk-in',
    EMS: 'EMS',
    referral: 'Referral',
    'self-check-in': 'Self check-in',
    police: 'Police',
    transfer: 'Transfer',
  };
  return labels[mode] || mode;
}

export function registrationStatusLabel(status: RegistrationStatus): string {
  const labels: Record<RegistrationStatus, string> = {
    pending: 'Pending',
    'in-progress': 'Registering',
    complete: 'Registered',
    provisional: 'Provisional',
  };
  return labels[status] || status;
}
