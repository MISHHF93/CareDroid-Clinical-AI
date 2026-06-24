import { suggestSelfArrivalTriage } from '../engine/selfArrivalTriageEngine';
import { CARE_STREAMING_LANES } from '../config/edOperationalStandards';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import {
  PatientState,
  type Note,
  type Patient,
  type Sex,
} from '../types/emergency';
import { buildPatientArrivalRecord, syncPatientFromArrival } from './patientArrivalModel';
import { calculateAgeFromDob } from './receptionQuickIntakeService';

export const SELF_CHECKIN_STEPS = ['demographics', 'visit', 'allergies', 'review'] as const;
export type SelfCheckinStep = (typeof SELF_CHECKIN_STEPS)[number];

export type SelfCheckinFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  phone: string;
  complaint: string;
  noKnownAllergies: boolean;
  allergyDetails: string;
};

export type ProvincialHealthLookupResult =
  | { status: 'unavailable'; message: string }
  | { status: 'matched'; recordId: string; message: string };

export type SelfCheckinBuildResult = {
  patient: Patient;
  triagePreview: ReturnType<typeof suggestSelfArrivalTriage>;
  laneLabel: string;
  disclaimer: string;
};

export const SELF_CHECKIN_COMPLAINT_CHIPS = [
  'Chest pain',
  'Breathing difficulty',
  'Abdominal pain',
  'Injury or fall',
  'Fever or infection',
  'Headache',
  'Feeling unwell',
] as const;

export const SELF_CHECKIN_ALLERGY_CHIPS = [
  'Penicillin',
  'Latex',
  'Shellfish',
  'Peanuts',
  'Iodine contrast',
] as const;

export function createSelfCheckinPatientId(): string {
  return `self-arrival-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createEmptySelfCheckinForm(): SelfCheckinFormData {
  return {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    sex: 'Unspecified',
    phone: '',
    complaint: '',
    noKnownAllergies: false,
    allergyDetails: '',
  };
}

export function validateSelfCheckinStep(
  step: SelfCheckinStep,
  form: SelfCheckinFormData,
): string | null {
  if (step === 'demographics') {
    if (!form.firstName.trim() && !form.lastName.trim()) {
      return 'Enter at least a first or last name.';
    }
    return null;
  }

  if (step === 'visit') {
    if (!form.complaint.trim()) {
      return 'Tell us your main reason for visiting today.';
    }
    return null;
  }

  if (step === 'allergies') {
    if (!form.noKnownAllergies && !form.allergyDetails.trim()) {
      return 'Select "No known allergies" or list your allergies.';
    }
    return null;
  }

  return null;
}

function createNote(body: string, metadata: Record<string, string>): Note {
  const now = new Date().toISOString();
  return {
    id: `self-checkin-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'Intake',
    body,
    authorId: 'self-arrival',
    createdAt: now,
    metadata: {
      source: 'self-check-in',
      ...metadata,
    },
  };
}

function buildAllergyNote(form: SelfCheckinFormData): Note {
  if (form.noKnownAllergies) {
    return createNote('No known drug allergies reported at self check-in.', {
      artifact: 'allergy_list',
      allergyStatus: 'none-reported',
    });
  }

  return createNote(`Allergies reported at self check-in: ${form.allergyDetails.trim()}`, {
    artifact: 'allergy_list',
    allergyStatus: 'patient-reported',
    requiresStaffConfirmation: 'true',
  });
}

/** Placeholder for provincial / EHR lookup — tenant integration not wired in kiosk MVP. */
export async function lookupProvincialHealthRecord(
  _input: Pick<SelfCheckinFormData, 'firstName' | 'lastName' | 'dateOfBirth'>,
): Promise<ProvincialHealthLookupResult> {
  return {
    status: 'unavailable',
    message: 'Live health record lookup is not connected on this kiosk yet. Staff will verify your identity at triage.',
  };
}

export function buildSelfCheckinPatient(
  form: SelfCheckinFormData,
  options: { now?: string; patientId?: string } = {},
): SelfCheckinBuildResult {
  const timestamp = options.now || new Date().toISOString();
  const patientId = options.patientId || createSelfCheckinPatientId();
  const complaintText = form.complaint.trim() || 'Self-arrival check-in';
  const dob = form.dateOfBirth || timestamp.slice(0, 10);
  const age = form.dateOfBirth ? calculateAgeFromDob(form.dateOfBirth) : 0;

  const triagePreview = suggestSelfArrivalTriage({
    firstName: form.firstName,
    lastName: form.lastName,
    dateOfBirth: form.dateOfBirth,
    phone: form.phone,
    complaintText,
    complaintCategory: 'Self-arrival',
  });

  const arrival = buildPatientArrivalRecord({
    arrivalMode: 'self-check-in',
    arrivalTimestamp: timestamp,
    chiefComplaint: complaintText,
    state: PatientState.Triage,
    triagePending: true,
    waitingRoomStatus: 'waiting-for-triage',
    queueDestination: 'triage-queue',
    registrationStatus: 'complete',
    triageAcuity: {
      code: triagePreview.suggestedPriority,
      status: 'suggested',
      suggestedAt: timestamp,
      suggestionSource: 'self-arrival',
    },
  });

  const patient = syncPatientFromArrival(
    {
      id: patientId,
      mrn: `SA-${Date.now()}`,
      firstName: form.firstName.trim() || 'Self',
      lastName: form.lastName.trim() || 'Arrival',
      dob,
      age,
      sex: form.sex,
      state: PatientState.Triage,
      complaintCategory: 'Self-arrival',
      vitals: [],
      flags: [],
      notes: [buildAllergyNote(form)],
      timeline: [],
      phone: form.phone.trim() || undefined,
      triageAssist: {
        suggestedPriority: triagePreview.suggestedPriority,
        suggestedQueue: triagePreview.streamingLane,
        rationale: triagePreview.envelope.rationale,
        confidence: triagePreview.confidence,
        ruleTriggered: 'self-arrival-triage',
        disclaimers: [HUMAN_REVIEW_DISCLAIMER],
        requiresHumanReview: true,
        generatedAt: timestamp,
        source: 'rules',
      },
    },
    arrival,
  ) as Patient;

  const laneLabel =
    CARE_STREAMING_LANES.find((lane) => lane.id === triagePreview.streamingLane)?.label ||
    triagePreview.streamingLane;

  return {
    patient,
    triagePreview,
    laneLabel,
    disclaimer: HUMAN_REVIEW_DISCLAIMER,
  };
}