import {
  PatientFlag,
  PatientState,
  Priority,
  type ArrivalMode,
  type Note,
  type Patient,
  type QuickSafetyFlag,
  type HighRiskComplaintFlagId,
} from '../types/emergency';
import { buildArrivalControlFields } from './arrivalControlLayer';
import { buildHighRiskComplaintPatch } from './highRiskComplaintFlags';
import { createSmartIntakePatient } from './emergencyOsApi';

export type ReceptionQuickIntakeInput = {
  firstName: string;
  lastName: string;
  dob?: string;
  healthCard?: string;
  phone?: string;
  complaint: string;
  arrivalMode: ArrivalMode;
  quickSafetyFlags?: QuickSafetyFlag[];
  selectedComplaintFlags?: HighRiskComplaintFlagId[];
  quickNotes?: string;
  existingPatient?: Patient | null;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateAgeFromDob(dob: string): number {
  const dobTime = new Date(dob).getTime();
  if (!Number.isFinite(dobTime)) return 0;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

/** Split a single reception desk name field into first / last for chart storage. */
export function splitPatientName(value: string): { firstName: string; lastName: string } {
  const trimmed = value.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function createMrn(): string {
  return `ED-${Math.floor(100000 + Math.random() * 900000)}`;
}

function arrivalModeToSource(mode: ArrivalMode): Patient['source'] {
  if (mode === 'EMS') return 'EMS';
  if (mode === 'referral') return 'Referral';
  if (mode === 'transfer') return 'Transfer';
  return 'WalkIn';
}

function buildIntakeNote(body: string, authorId: string): Note {
  const now = new Date().toISOString();
  return {
    id: createId('reception-intake-note'),
    type: 'Intake',
    body: body.trim(),
    authorId,
    createdAt: now,
    metadata: { source: 'reception-quick-intake' },
  };
}

export function buildReceptionQuickIntakePatient(
  input: ReceptionQuickIntakeInput,
  options: { actorId?: string; now?: string } = {},
): Patient {
  const now = options.now || new Date().toISOString();
  const actorId = options.actorId || 'reception';
  const complaint = input.complaint.trim();
  const firstName = input.firstName.trim() || 'Unknown';
  const lastName = input.lastName.trim() || 'Patient';
  const dob = input.dob || new Date().toISOString().slice(0, 10);
  const age = input.dob ? calculateAgeFromDob(input.dob) : 0;
  const healthCard = input.healthCard?.trim() || '';
  const phone = input.phone?.trim() || '';
  const flags = Array.from(
    new Set([
      ...(input.existingPatient?.flags || []),
      ...(input.quickSafetyFlags || []),
      ...(input.arrivalMode === 'EMS' ? [PatientFlag.EMSArrival] : []),
    ]),
  );

  const notes = [...(input.existingPatient?.notes || [])];
  if (input.quickNotes?.trim()) {
    notes.push(buildIntakeNote(input.quickNotes, actorId));
  }

  const base: Partial<Patient> = {
    firstName,
    lastName,
    dob,
    age,
    sex: input.existingPatient?.sex || 'Other',
    arrivalTime: now,
    triageTime: undefined,
    chiefComplaint: complaint,
    complaint,
    complaintCategory: input.existingPatient?.complaintCategory || 'Other',
    state: PatientState.Registration,
    priority: input.existingPatient?.priority || Priority.P3,
    vitals: input.existingPatient?.vitals || [],
    flags,
    notes,
    timeline: input.existingPatient?.timeline || [],
    phone: phone || input.existingPatient?.phone,
    healthCardNumber: healthCard || input.existingPatient?.healthCardNumber,
    healthCard: healthCard || input.existingPatient?.healthCard,
    source: arrivalModeToSource(input.arrivalMode),
    ...buildArrivalControlFields({
      arrivalMode: input.arrivalMode,
      state: PatientState.Registration,
      presentingComplaint: complaint,
      flags,
      quickSafetyFlags: input.quickSafetyFlags,
    }),
    ...buildHighRiskComplaintPatch(
      {
        chiefComplaint: complaint,
        complaintCategory: input.existingPatient?.complaintCategory || 'Other',
        state: PatientState.Registration,
      },
      { selectedFlagIds: input.selectedComplaintFlags },
    ),
  };

  if (input.existingPatient) {
    return {
      ...input.existingPatient,
      ...base,
      id: input.existingPatient.id,
      mrn: input.existingPatient.mrn,
    };
  }

  return {
    id: createId('patient'),
    mrn: healthCard || createMrn(),
    ...base,
  } as Patient;
}

export type ReceptionQuickIntakeStore = {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
  updatePatient: (patientId: string, patch: Partial<Patient>) => void;
};

export type PersistReceptionQuickIntakeResult = {
  patient: Patient;
  persistedLocally?: boolean;
};

export async function persistReceptionQuickIntakePatient(
  store: ReceptionQuickIntakeStore,
  patient: Patient,
  options: { isNew: boolean },
): Promise<PersistReceptionQuickIntakeResult> {
  if (options.isNew) {
    try {
      const response = await createSmartIntakePatient(patient);
      const persistedPatient = response?.data?.patient || patient;
      store.addPatient(persistedPatient);
      return { patient: persistedPatient };
    } catch {
      store.addPatient(patient);
      return { patient, persistedLocally: true };
    }
  }

  store.updatePatient(patient.id, patient);
  return {
    patient: { ...store.patients.find((entry) => entry.id === patient.id), ...patient } as Patient,
  };
}
