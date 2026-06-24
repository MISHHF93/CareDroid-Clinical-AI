import { isEmsRegistrationPatient } from '../components/reception/receptionQueueModel';
import {
  PatientFlag,
  PatientState,
  type ArrivalMode,
  type Patient,
  type QueueDestination,
  type RegistrationStatus,
} from '../types/emergency';
import { deriveHighRiskComplaintQueueDestination } from './highRiskComplaintFlags';

type PatientFlagEntry = PatientFlag | string | { type?: PatientFlag };

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return ((patient.flags || []) as PatientFlagEntry[]).some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

export function normalizeArrivalMode(
  input?: string | null,
  patient?: Patient | null,
): ArrivalMode {
  if (patient && (hasFlag(patient, PatientFlag.EMSArrival) || patient.source === 'EMS')) {
    return 'EMS';
  }

  const normalized = String(input || patient?.arrivalMode || patient?.source || '')
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

  if (patient?.source === 'Referral') return 'referral';
  if (patient?.source === 'Transfer') return 'transfer';
  if (patient?.source === 'Self-arrival') return 'self-check-in';

  return 'walk-in';
}

export function deriveRegistrationStatus(patient: Patient): RegistrationStatus {
  if (patient.registrationStatus) return patient.registrationStatus;
  if (hasFlag(patient, PatientFlag.IdentityPending)) return 'provisional';
  if (patient.state === PatientState.Arrival) return 'pending';
  if (patient.state === PatientState.Registration) return 'in-progress';
  return 'complete';
}

export function deriveTriagePending(patient: Patient): boolean {
  if (typeof patient.triagePending === 'boolean') return patient.triagePending;
  return patient.state === PatientState.Triage;
}

export function deriveQueueDestination(patient: Patient): QueueDestination {
  if (patient.queueDestination) return patient.queueDestination;

  const rapidReview = deriveHighRiskComplaintQueueDestination(patient);
  if (rapidReview) return rapidReview;

  if (patient.state === PatientState.Waiting) return 'waiting-room';
  if (patient.state === PatientState.Triage) return 'triage-queue';
  if (isEmsRegistrationPatient(patient)) return 'ems-registration';
  if (patient.state === PatientState.Registration || patient.state === PatientState.Arrival) {
    return 'verification';
  }
  return 'whiteboard';
}