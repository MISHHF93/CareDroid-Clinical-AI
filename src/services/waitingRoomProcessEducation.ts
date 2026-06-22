/**
 * Waiting-room process education — simple, non-clinical visit steps for patients
 * and front-desk staff.
 */

export const WAITING_ROOM_PROCESS_STEP = Object.freeze({
  REGISTRATION: 'registration',
  TRIAGE: 'triage',
  WAITING: 'waiting',
  CLINICIAN_ASSESSMENT: 'clinician-assessment',
  TESTS_RESULTS: 'tests-results',
  TREATMENT_DISPOSITION: 'treatment-disposition',
  DISCHARGE_ADMISSION: 'discharge-admission',
} as const);

export type WaitingRoomProcessStepId =
  (typeof WAITING_ROOM_PROCESS_STEP)[keyof typeof WAITING_ROOM_PROCESS_STEP];

export type WaitingRoomProcessEducationAudience = 'patient' | 'staff';

export type WaitingRoomProcessEducationStep = Readonly<{
  id: WaitingRoomProcessStepId;
  order: number;
  label: string;
  description: string;
}>;

export type WaitingRoomProcessEducationSnapshot = Readonly<{
  title: string;
  intro: string;
  steps: readonly WaitingRoomProcessEducationStep[];
}>;

type StepDefinition = Readonly<{
  id: WaitingRoomProcessStepId;
  order: number;
  label: string;
  patientDescription: string;
  staffDescription: string;
}>;

export const WAITING_ROOM_PROCESS_EDUCATION_STEPS: readonly StepDefinition[] = Object.freeze([
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.REGISTRATION,
    order: 1,
    label: 'Registration',
    patientDescription: 'Check in at the front desk and share your name and reason for visiting.',
    staffDescription: 'Patient checks in and shares basic information.',
  }),
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.TRIAGE,
    order: 2,
    label: 'Triage',
    patientDescription: 'A nurse talks with you about your symptoms and how urgent your needs are.',
    staffDescription: 'A nurse reviews symptoms and urgency.',
  }),
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.WAITING,
    order: 3,
    label: 'Waiting',
    patientDescription: 'You may wait in the waiting area until the care team is ready for you.',
    staffDescription: 'Patient waits until the care team is ready.',
  }),
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.CLINICIAN_ASSESSMENT,
    order: 4,
    label: 'Clinician Assessment',
    patientDescription:
      'A doctor or nurse practitioner reviews your symptoms and discusses next steps.',
    staffDescription: 'A clinician reviews symptoms and next steps with the patient.',
  }),
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.TESTS_RESULTS,
    order: 5,
    label: 'Tests / Results',
    patientDescription: 'You may have tests. Staff review results when they are ready.',
    staffDescription: 'Tests may be done and results are reviewed when ready.',
  }),
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.TREATMENT_DISPOSITION,
    order: 6,
    label: 'Treatment / Disposition',
    patientDescription: 'The care team provides care and decides what happens next in your visit.',
    staffDescription: 'Care is provided and the team decides the next step.',
  }),
  Object.freeze({
    id: WAITING_ROOM_PROCESS_STEP.DISCHARGE_ADMISSION,
    order: 7,
    label: 'Discharge / Admission',
    patientDescription:
      'You go home with instructions, or stay in the hospital if you need more care.',
    staffDescription: 'Patient goes home with instructions or is admitted for more care.',
  }),
]);

const PATIENT_COPY = Object.freeze({
  title: 'Your emergency visit — what to expect',
  intro: 'Every visit is different. These are the usual steps, in order.',
});

const STAFF_COPY = Object.freeze({
  title: 'Emergency visit steps for patients',
  intro: 'Simple language you can use when explaining what happens next.',
});

export function buildWaitingRoomProcessEducationSnapshot(
  audience: WaitingRoomProcessEducationAudience = 'patient',
): WaitingRoomProcessEducationSnapshot {
  const copy = audience === 'staff' ? STAFF_COPY : PATIENT_COPY;
  const useStaffDescriptions = audience === 'staff';

  return Object.freeze({
    title: copy.title,
    intro: copy.intro,
    steps: Object.freeze(
      WAITING_ROOM_PROCESS_EDUCATION_STEPS.map((step) =>
        Object.freeze({
          id: step.id,
          order: step.order,
          label: step.label,
          description: useStaffDescriptions ? step.staffDescription : step.patientDescription,
        }),
      ),
    ),
  });
}
