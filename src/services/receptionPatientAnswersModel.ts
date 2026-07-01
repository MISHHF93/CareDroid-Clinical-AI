/**
 * Reception desk patient-answers model — consolidates public waiting display status,
 * crowd level, wait explanation, process education, and per-patient checkpoints so
 * front desk staff can answer common questions without repeating themselves.
 */
import { buildPublicWaitingDisplaySnapshot } from '../components/whiteboard/publicWaitingDisplayModel';
import { PUBLIC_WAIT_URGENCY_DISCLAIMER } from '../engine/safeWaitRangeMessaging';
import {
  buildPatientCommunicationStatus,
  formatCommunicationStatusTimestamp,
} from './patientCommunicationStatus';
import { resolvePatientExperienceStatus } from './patientExperienceStatus';
import { resolveWhatHappensNext } from './whatHappensNextGuidance';
import {
  buildWaitingRoomProcessEducationSnapshot,
  WAITING_ROOM_PROCESS_STEP,
  type WaitingRoomProcessStepId,
} from './waitingRoomProcessEducation';
import { resolvePatientWaitingRoomMessage } from './waitingRoomStatusMessaging';
import {
  PatientState,
  type CapacitySnapshot,
  type Patient,
  type PatientExperienceStatusId,
  type Referral,
  type Staff,
  type WorkflowActionLog,
} from '../types/emergency';

export type ReceptionPatientAnswersShareable = Readonly<{
  whereInProcess: string;
  whatHappensNext: string;
  whyWaitLong: string;
}>;

export type ReceptionDepartmentAnswers = Readonly<{
  publicStatusSummary: string;
  crowdLevelLabel: string;
  crowdLevelDetail: string;
  waitRangeLabel: string;
  waitRangeValue: string;
  waitDisclaimer: string;
  waitExplanation: string;
  statusLines: readonly { id: string; message: string; count: number }[];
}>;

export type ReceptionProcessStepAnswer = Readonly<{
  id: WaitingRoomProcessStepId;
  order: number;
  label: string;
  description: string;
  isCurrent: boolean;
}>;

export type ReceptionFocusedPatientAnswers = Readonly<{
  patientId: string;
  displayName: string;
  publicStatusMessage: string;
  processStageLabel: string;
  currentProcessStepId: WaitingRoomProcessStepId;
  whatHappensNextLabel: string;
  whatHappensNextDetail: string;
  nextCheckpointLabel: string;
  nextCheckpointAt: string | null;
  nextCheckpointDetail: string | null;
  communicationOverdue: boolean;
  shareable: ReceptionPatientAnswersShareable;
}>;

export type ReceptionPatientAnswersSnapshot = Readonly<{
  department: ReceptionDepartmentAnswers;
  processSteps: readonly ReceptionProcessStepAnswer[];
  focusedPatient: ReceptionFocusedPatientAnswers | null;
}>;

export type BuildReceptionPatientAnswersInput = {
  patients?: Patient[];
  capacity?: CapacitySnapshot | null;
  referrals?: Referral[];
  staff?: Staff[];
  workflowLogs?: WorkflowActionLog[];
  settings?: Record<string, unknown> | null;
  now?: Date;
  updatedAt?: string | null;
  focusedPatientId?: string | null;
};

const EXPERIENCE_TO_PROCESS_STEP: Partial<Record<PatientExperienceStatusId, WaitingRoomProcessStepId>> =
  {
    registered: WAITING_ROOM_PROCESS_STEP.REGISTRATION,
    'waiting-for-triage': WAITING_ROOM_PROCESS_STEP.TRIAGE,
    'waiting-for-clinician': WAITING_ROOM_PROCESS_STEP.WAITING,
    'tests-in-progress': WAITING_ROOM_PROCESS_STEP.TESTS_RESULTS,
    'waiting-for-results': WAITING_ROOM_PROCESS_STEP.TESTS_RESULTS,
    'waiting-for-specialist-review': WAITING_ROOM_PROCESS_STEP.TREATMENT_DISPOSITION,
    'preparing-discharge': WAITING_ROOM_PROCESS_STEP.DISCHARGE_ADMISSION,
    'awaiting-admission-bed': WAITING_ROOM_PROCESS_STEP.DISCHARGE_ADMISSION,
  };

function patientDisplayName(patient: Patient): string {
  const first = patient.firstName?.trim() || '';
  const last = patient.lastName?.trim() || '';
  const name = `${first} ${last}`.trim();
  return name || patient.mrn || patient.id;
}

function resolveCurrentProcessStepId(
  patient: Patient,
  experienceId: PatientExperienceStatusId,
): WaitingRoomProcessStepId {
  if (patient.state === PatientState.Assessment) {
    return WAITING_ROOM_PROCESS_STEP.CLINICIAN_ASSESSMENT;
  }
  if ((patient.state as string) === 'Treatment') {
    return WAITING_ROOM_PROCESS_STEP.TREATMENT_DISPOSITION;
  }
  if (patient.state === PatientState.Disposition || patient.state === PatientState.Discharge) {
    return WAITING_ROOM_PROCESS_STEP.DISCHARGE_ADMISSION;
  }
  return EXPERIENCE_TO_PROCESS_STEP[experienceId] || WAITING_ROOM_PROCESS_STEP.REGISTRATION;
}

function buildDepartmentWaitExplanation(input: {
  waitRangeValue: string;
  crowdLevelLabel: string;
  crowdLevelDetail: string;
  waitDisclaimer: string;
}): string {
  return [
    `Typical clinician wait right now is ${input.waitRangeValue}.`,
    `The waiting room is ${input.crowdLevelLabel.toLowerCase()} — ${input.crowdLevelDetail}`,
    input.waitDisclaimer,
  ].join(' ');
}

function buildFocusedPatientAnswers(
  patient: Patient,
  input: BuildReceptionPatientAnswersInput,
  departmentExplanation: string,
): ReceptionFocusedPatientAnswers {
  const now = input.now || new Date();
  const context = {
    referrals: input.referrals,
    staff: input.staff,
    workflowLogs: input.workflowLogs,
    settings: input.settings,
    now,
  };
  const experience = resolvePatientExperienceStatus(patient, { referrals: input.referrals });
  const nextStep = resolveWhatHappensNext(patient, {
    referrals: input.referrals,
    staff: input.staff,
    now,
  });
  const communication = buildPatientCommunicationStatus(patient, context);
  const publicStatusMessage =
    resolvePatientWaitingRoomMessage(patient, { referrals: input.referrals }, 'patient') ||
    experience.label;
  const currentProcessStepId = resolveCurrentProcessStepId(patient, experience.id);

  const whatHappensNextLabel = nextStep?.label || communication?.nextExpectedCheckpointLabel || 'Care team review';
  const whatHappensNextDetail =
    nextStep?.guidance || communication?.nextExpectedCheckpointDetail || experience.staffDetail;

  const nextCheckpointLabel = communication?.nextExpectedCheckpointLabel || whatHappensNextLabel;
  const nextCheckpointAt = communication?.nextExpectedCheckpointAt || null;
  const nextCheckpointDetail = communication?.nextExpectedCheckpointDetail || whatHappensNextDetail;

  const whereInProcess = `You are ${publicStatusMessage.toLowerCase()}.`;
  const whatHappensNext = `${whatHappensNextLabel}. ${whatHappensNextDetail}`;
  const whyWaitLong = departmentExplanation;

  return Object.freeze({
    patientId: patient.id,
    displayName: patientDisplayName(patient),
    publicStatusMessage,
    processStageLabel: experience.label,
    currentProcessStepId,
    whatHappensNextLabel,
    whatHappensNextDetail,
    nextCheckpointLabel,
    nextCheckpointAt,
    nextCheckpointDetail,
    communicationOverdue: communication?.communicationOverdue ?? false,
    shareable: Object.freeze({
      whereInProcess,
      whatHappensNext,
      whyWaitLong,
    }),
  });
}

export function buildReceptionPatientAnswersSnapshot(
  input: BuildReceptionPatientAnswersInput = {},
): ReceptionPatientAnswersSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const publicSnapshot = buildPublicWaitingDisplaySnapshot({
    patients,
    capacity: input.capacity || undefined,
    referrals: input.referrals,
    now,
    updatedAt: input.updatedAt ?? input.capacity?.updatedAt ?? null,
  });

  const waitExplanation = buildDepartmentWaitExplanation({
    waitRangeValue: publicSnapshot.waitRange.value,
    crowdLevelLabel: publicSnapshot.crowdLevel.label,
    crowdLevelDetail: publicSnapshot.crowdLevel.detail,
    waitDisclaimer: publicSnapshot.waitDisclaimer || PUBLIC_WAIT_URGENCY_DISCLAIMER,
  });

  const department = Object.freeze({
    publicStatusSummary: publicSnapshot.summaryLine,
    crowdLevelLabel: publicSnapshot.crowdLevel.label,
    crowdLevelDetail: publicSnapshot.crowdLevel.detail,
    waitRangeLabel: publicSnapshot.waitRange.label,
    waitRangeValue: publicSnapshot.waitRange.value,
    waitDisclaimer: publicSnapshot.waitDisclaimer,
    waitExplanation,
    statusLines: Object.freeze(
      publicSnapshot.statusMessaging.statusLines.map((line) =>
        Object.freeze({
          id: line.id,
          message: line.message,
          count: line.count,
        }),
      ),
    ),
  });

  const processEducation = buildWaitingRoomProcessEducationSnapshot('staff');
  const focusedPatient = input.focusedPatientId
    ? patients.find((patient) => patient.id === input.focusedPatientId) || null
    : null;
  const currentStepId = focusedPatient
    ? resolveCurrentProcessStepId(
        focusedPatient,
        resolvePatientExperienceStatus(focusedPatient, { referrals: input.referrals }).id,
      )
    : null;

  const processSteps = Object.freeze(
    processEducation.steps.map((step) =>
      Object.freeze({
        id: step.id,
        order: step.order,
        label: step.label,
        description: step.description,
        isCurrent: currentStepId === step.id,
      }),
    ),
  );

  const focusedPatientAnswers = focusedPatient
    ? buildFocusedPatientAnswers(focusedPatient, input, waitExplanation)
    : null;

  return Object.freeze({
    department,
    processSteps,
    focusedPatient: focusedPatientAnswers,
  });
}

export function formatReceptionCheckpointTime(
  timestamp: string | null | undefined,
  now: Date = undefined as any,
): string {
  return formatCommunicationStatusTimestamp(timestamp, now, { unknownLabel: 'Not scheduled' });
}
