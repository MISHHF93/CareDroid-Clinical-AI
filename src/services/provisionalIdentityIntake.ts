import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
} from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { completeIntakeHandoff } from './receptionHandoff';
import { registerArrivalControl } from './arrivalControlLayer';
import { buildPatientArrivalRecord, syncPatientFromArrival } from './patientArrivalModel';

export type ProvisionalIdentityKind = 'unknown' | 'temporary' | 'identity-pending';

export type ProvisionalIdentityProfile = {
  kind: ProvisionalIdentityKind;
  label: string;
  firstName: string;
  lastName: string;
  mrnPrefix: string;
  complaint: string;
  complaintCategory: string;
  priority: Priority;
  source: Patient['source'];
  timelineNote: string;
  extraFlags: PatientFlag[];
};

export const PROVISIONAL_IDENTITY_PROFILES: Record<ProvisionalIdentityKind, ProvisionalIdentityProfile> =
  {
    unknown: {
      kind: 'unknown',
      label: 'Unknown patient',
      firstName: 'Unknown',
      lastName: 'Patient',
      mrnPrefix: 'TEMP-UNK',
      complaint: 'Unknown identity — clinical care priority',
      complaintCategory: 'Unknown Intake',
      priority: Priority.P2,
      source: 'Unknown',
      timelineNote: 'Unknown patient registered with deferred identity reconciliation.',
      extraFlags: [PatientFlag.HighRisk],
    },
    temporary: {
      kind: 'temporary',
      label: 'Temporary patient',
      firstName: 'Temporary',
      lastName: 'Patient',
      mrnPrefix: 'TEMP',
      complaint: 'Temporary registration — identity to be reconciled',
      complaintCategory: 'EMS',
      priority: Priority.P2,
      source: 'EMS',
      timelineNote: 'Temporary patient shell created for EMS or walk-in arrival.',
      extraFlags: [PatientFlag.EMSArrival],
    },
    'identity-pending': {
      kind: 'identity-pending',
      label: 'Identity pending',
      firstName: 'Identity',
      lastName: 'Pending',
      mrnPrefix: 'TEMP-ID',
      complaint: 'Identity verification deferred — intake allowed',
      complaintCategory: 'Registration',
      priority: Priority.P3,
      source: 'WalkIn',
      timelineNote: 'Patient sent to triage while identity verification remains pending.',
      extraFlags: [],
    },
  };

type ProvisionalIntakeStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  'addPatient' | 'recordWorkflowAction' | 'patients' | 'emergencySettings' | 'updatePatient'
  | 'selectPatient' | 'setQueueFilter' | 'movePatientToState' | 'dispatchWebSocketEvent'
>;

function createPatientId(): string {
  return `patient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createTemporaryMrn(prefix: string): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function normalizeProvisionalArrivalMode(
  source: Patient['source'],
  kind: ProvisionalIdentityKind,
): import('../types/emergency').ArrivalMode {
  if (source === 'EMS' || kind === 'temporary') return 'EMS';
  if (source === 'Referral') return 'referral';
  if (source === 'Transfer') return 'transfer';
  return 'walk-in';
}

export function buildProvisionalPatient(
  kind: ProvisionalIdentityKind,
  overrides: Partial<Patient> = {},
): Patient {
  const profile = PROVISIONAL_IDENTITY_PROFILES[kind];
  const now = new Date().toISOString();
  const id = overrides.id || createPatientId();
  const flags = Array.from(
    new Set([PatientFlag.IdentityPending, ...profile.extraFlags, ...(overrides.flags || [])]),
  );

  const state = overrides.state || PatientState.Triage;
  const chiefComplaint = overrides.chiefComplaint || profile.complaint;
  const arrivalMode = normalizeProvisionalArrivalMode(profile.source, kind);
  const quickSafetyFlags = flags.filter((flag) =>
    ['HighRisk', 'StrokeCode', 'SepsisAlert', 'PsychAlert', 'Isolation', 'DeterioratingNeuro'].includes(flag),
  ) as import('../types/emergency').QuickSafetyFlag[];

  const arrival = buildPatientArrivalRecord({
    arrivalMode,
    arrivalTimestamp: overrides.arrivalTime || now,
    chiefComplaint,
    state,
    triageAcuity: {
      code: overrides.priority || profile.priority,
      status: 'suggested',
    },
    queueDestination: 'triage-queue',
    triagePending: true,
    waitingRoomStatus: 'waiting-for-triage',
    registrationStatus: 'provisional',
  });

  const base = syncPatientFromArrival(
    {
      id,
      mrn: overrides.mrn || createTemporaryMrn(profile.mrnPrefix),
      firstName: overrides.firstName || profile.firstName,
      lastName: overrides.lastName || profile.lastName,
      dob: overrides.dob || '',
      age: overrides.age ?? 0,
      sex: overrides.sex || 'Unspecified',
      state,
      triageTime: overrides.triageTime || now,
      complaintCategory: overrides.complaintCategory || profile.complaintCategory,
      vitals: overrides.vitals || [],
      flags,
      quickSafetyFlags,
      notes: overrides.notes || [
        {
          id: `note-${id}-provisional`,
          type: 'System',
          body: profile.timelineNote,
          authorId: 'provisional-intake',
          createdAt: now,
        },
      ],
      timeline: overrides.timeline || [
        {
          id: `evt-${id}-provisional-intake`,
          patientId: id,
          type: 'Intake',
          timestamp: now,
          to: PatientState.Triage,
          summary: profile.timelineNote,
          metadata: {
            provisionalIdentityKind: kind,
            identityStatus: 'pending',
            identityBlocking: false,
          },
        },
      ],
      source: overrides.source || profile.source,
    },
    arrival,
  );

  return {
    ...base,
    ...overrides,
    flags: overrides.flags ? flags : base.flags,
  } as Patient;
}

export function completeProvisionalIntake(
  store: ProvisionalIntakeStore,
  kind: ProvisionalIdentityKind,
  options: {
    patientOverrides?: Partial<Patient>;
    actorName?: string;
    sessionId?: string;
  } = {},
) {
  const profile = PROVISIONAL_IDENTITY_PROFILES[kind];
  const patient = buildProvisionalPatient(kind, options.patientOverrides);
  store.addPatient(patient);

  registerArrivalControl(store as unknown as Parameters<typeof registerArrivalControl>[0], patient.id, {
    source: 'provisional-intake',
    destination: 'triage-queue',
  });

  const handoff = completeIntakeHandoff(store as unknown as Parameters<typeof completeIntakeHandoff>[0], {
    patientId: patient.id,
    source: 'provisional-intake',
    actorName: options.actorName,
    sessionId: options.sessionId,
  });

  store.recordWorkflowAction({
    type: 'patient_created',
    summary: `${profile.label} sent to triage without blocking on identity verification.`,
    patientId: patient.id,
    actorName: options.actorName,
    source: 'provisional-intake',
    metadata: {
      provisionalIdentityKind: kind,
      identityStatus: 'pending',
      identityBlocking: false,
      encounterId: handoff.encounterId,
    },
  });

  return {
    patient,
    ...handoff,
    provisionalIdentityKind: kind,
  };
}

export function provisionalKindFromIntakeMode(mode?: string | null): ProvisionalIdentityKind | null {
  if (mode === 'unknown') return 'unknown';
  if (mode === 'temporary' || mode === 'ems-prearrival') return 'temporary';
  if (mode === 'identity-pending') return 'identity-pending';
  return null;
}
