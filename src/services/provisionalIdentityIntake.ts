import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
} from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { completeIntakeHandoff } from './receptionHandoff';

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

  const base = {
    id,
    mrn: overrides.mrn || createTemporaryMrn(profile.mrnPrefix),
    firstName: overrides.firstName || profile.firstName,
    lastName: overrides.lastName || profile.lastName,
    dob: overrides.dob || '',
    age: overrides.age ?? 0,
    sex: overrides.sex || 'Unspecified',
    arrivalTime: overrides.arrivalTime || now,
    triageTime: overrides.triageTime || now,
    chiefComplaint: overrides.chiefComplaint || profile.complaint,
    complaintCategory: overrides.complaintCategory || profile.complaintCategory,
    state: overrides.state || PatientState.Triage,
    priority: overrides.priority || profile.priority,
    vitals: overrides.vitals || [],
    flags,
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
  };

  return {
    ...base,
    ...overrides,
    flags: overrides.flags ? flags : base.flags,
  };
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

  const handoff = completeIntakeHandoff(store, {
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
