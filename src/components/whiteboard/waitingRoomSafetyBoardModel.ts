import {
  PatientFlag,
  PatientState,
  Priority,
  PriorityLabel,
  type Patient,
  type Staff,
} from '../../types/emergency';
import { longWaitStatus } from '../../utils/longWaitRescue';
import { getArrivalReasonFromPatient } from '../../services/intakeEncounterChain';
import { collectHighRiskComplaintLabels } from '../../services/highRiskComplaintFlags';
import {
  buildReassessmentTimerSnapshot,
  type ReassessmentTimerSnapshot,
} from '../../engine/reassessmentTimerEngine';
import {
  fitToWaitClassificationTone,
  resolveFitToWaitClassification,
  summarizeFitToWaitBoardCounts,
  type FitToWaitTone,
} from '../../services/fitToWaitPathway';
import {
  resolvePatientExperienceStatus,
  type PatientExperienceContext,
} from '../../services/patientExperienceStatus';
import { resolveQueueReason, type QueueReasonId } from '../../services/queueReasonVisibility';
import { resolveWhatHappensNext, type WhatHappensNextTone } from '../../services/whatHappensNextGuidance';
import { deriveProviderWaitingStatus } from '../../services/providerWaitingStatus';
import {
  resolveLwbsRisk,
  shouldSurfaceLwbsRisk,
  type LwbsRiskLevel,
  type LwbsRiskTone,
} from '../../services/lwbsRiskLayer';
import {
  resolveDeteriorationWatch,
  shouldSurfaceDeteriorationWatch,
  type DeteriorationWatchLevel,
  type DeteriorationWatchTone,
} from '../../services/waitingRoomDeteriorationWatch';
import { summarizeTriageBreachBoard } from '../../services/triageBreachTimer';
import { summarizeProviderWaitBreachBoard } from '../../services/providerWaitBreachTimer';
import {
  resolveCommunicationRecency,
  summarizeCommunicationBoard,
  type CommunicationRecencyTone,
  type WaitingRoomCommunicationKind,
} from '../../services/waitingRoomCommunicationLog';
import type {
  EMSArrival,
  PatientExperienceStatusId,
  PatientExperienceTone,
  Referral,
  WorkflowActionLog,
} from '../../types/emergency';

export const HIGH_RISK_COMPLAINT_CATEGORIES = Object.freeze([
  'Chest pain',
  'Breathing',
  'Neuro/Stroke',
  'Sepsis',
  'Trauma',
  'OB/Gyn',
]);

export const SAFETY_FLAG_LABELS: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.HighRisk]: 'High risk',
  [PatientFlag.StrokeCode]: 'Stroke',
  [PatientFlag.SepsisAlert]: 'Sepsis',
  [PatientFlag.PsychAlert]: 'Psych',
  [PatientFlag.Isolation]: 'Isolation',
  [PatientFlag.DeterioratingNeuro]: 'Neuro change',
  [PatientFlag.LWBSRisk]: 'LWBS risk',
  [PatientFlag.LongWait]: 'Long wait',
  [PatientFlag.ReassessmentDue]: 'Reassess due',
  [PatientFlag.DeteriorationRisk]: 'Deterioration',
};

export type WaitingRoomSafetyTone = 'stable' | 'watch' | 'critical';
export type WaitingRoomStatusTone = 'neutral' | 'info' | 'warning' | 'critical';

export type WaitingRoomSafetyRow = {
  patientId: string;
  displayName: string;
  arrivalTime: string;
  arrivalTimeLabel: string;
  triageLevel: string | null;
  presentingComplaint: string;
  waitingMinutes: number;
  waitingDurationLabel: string;
  vitalsAgeMinutes: number;
  vitalsAgeLabel: string;
  reassessmentAgeMinutes: number | null;
  reassessmentAgeLabel: string;
  reassessmentOverdue: boolean;
  reassessmentStage: 'overdue' | 'due' | 'upcoming' | null;
  highRiskFlags: string[];
  providerWaitingStatus: string;
  providerWaitingTone: WaitingRoomStatusTone;
  testWaitingStatus: string;
  testWaitingTone: WaitingRoomStatusTone;
  safetyTone: WaitingRoomSafetyTone;
  priority: Priority;
  timer: ReassessmentTimerSnapshot;
  fitToWaitLabel: string;
  fitToWaitTone: FitToWaitTone;
  fitToWaitNeedsReview: boolean;
  fitToWaitClassifiedBy: string | null;
  experienceStatusId: PatientExperienceStatusId;
  experienceStatusLabel: string;
  experienceStatusTone: PatientExperienceTone;
  experienceStaffDetail: string;
  queueReasonPrimaryId: QueueReasonId | null;
  queueReasonPrimaryLabel: string | null;
  queueReasonLabels: string[];
  queueReasonStaffDetail: string | null;
  nextStepLabel: string | null;
  nextStepShortLabel: string | null;
  nextStepTone: WhatHappensNextTone | null;
  nextStepGuidance: string | null;
  nextStepStaffDetail: string | null;
  lwbsRiskLevel: LwbsRiskLevel | null;
  lwbsRiskLabel: string | null;
  lwbsRiskShortLabel: string | null;
  lwbsRiskTone: LwbsRiskTone | null;
  lwbsRiskScore: number | null;
  lwbsRiskStaffDetail: string | null;
  deteriorationWatchLevel: DeteriorationWatchLevel | null;
  deteriorationWatchLabel: string | null;
  deteriorationWatchShortLabel: string | null;
  deteriorationWatchTone: DeteriorationWatchTone | null;
  deteriorationWatchStaffDetail: string | null;
  communicationRecencyLabel: string;
  communicationShortRecencyLabel: string;
  communicationRecencyTone: CommunicationRecencyTone;
  communicationLastKind: WaitingRoomCommunicationKind | null;
  communicationLastKindLabel: string | null;
  communicationMinutesSince: number | null;
  communicationStaffDetail: string;
};

export type WaitingRoomSafetySummary = {
  patientCount: number;
  overdueReassessment: number;
  staleVitals: number;
  criticalSafety: number;
  awaitingProvider: number;
  testsPending: number;
  fitToWaitUnclassified: number;
  fitToWaitImmediateRoom: number;
  fitToWaitReassessmentRequired: number;
  lwbsRiskElevated: number;
  lwbsRiskHigh: number;
  lwbsRiskMedium: number;
  deteriorationWatchUrgent: number;
  deteriorationWatchReview: number;
  deteriorationWatchActive: number;
  triageBreachRiskCount: number;
  triageBreachedCount: number;
  providerWaitApproachingCount: number;
  providerWaitBreachedCount: number;
  providerWaitHighRiskExceptionCount: number;
  communicationStaleCount: number;
  communicationOverdueCount: number;
  communicationNoContactCount: number;
};

function minutesSince(timestamp?: string | null, now = new Date()): number {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function formatDurationLabel(minutes: number, { unknownLabel = '—' }: any = {}): string {
  if (!Number.isFinite(minutes)) return unknownLabel;
  if (minutes === Number.POSITIVE_INFINITY) return unknownLabel;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatClockTime(isoTime?: string | null): string {
  if (!isoTime) return '—';
  const date = new Date(isoTime);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function patientDisplayName(patient: Patient): string {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Unknown patient'
  );
}

function patientFlags(patient: Patient): PatientFlag[] {
  return (patient.flags || []).map((flag) =>
    typeof flag === 'string' ? (flag as PatientFlag) : (flag as unknown as { type: PatientFlag }).type,
  );
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return patientFlags(patient).includes(flag);
}

export function deriveTriageLevelLabel(patient: Patient): string | null {
  if (!patient.triageTime || !patient.priority) return null;
  return `${patient.priority} · ${PriorityLabel[patient.priority]}`;
}

export function deriveHighRiskComplaintFlags(patient: Patient): string[] {
  const labels = new Set<string>(collectHighRiskComplaintLabels(patient));

  patientFlags(patient).forEach((flag) => {
    const label = SAFETY_FLAG_LABELS[flag];
    if (label) labels.add(label);
  });

  if (HIGH_RISK_COMPLAINT_CATEGORIES.includes(patient.complaintCategory)) {
    labels.add(patient.complaintCategory);
  }

  return Array.from(labels);
}

export function deriveTestWaitingStatus(patient: Patient): {
  label: string;
  tone: WaitingRoomStatusTone;
} {
  const timeline = patient.timeline || [];
  const orders = timeline.filter((event) => event.type === 'OrderPlaced');
  const results = timeline.filter((event) => event.type === 'ResultReceived');
  const pendingCount = Math.max(0, orders.length - results.length);

  if (patient.state === PatientState.Results) {
    return { label: 'Results pending review', tone: 'warning' };
  }

  if (patient.state === PatientState.Orders || pendingCount > 0) {
    return {
      label: `${Math.max(pendingCount, patient.state === PatientState.Orders ? 1 : 0)} test${
        pendingCount === 1 ? '' : 's'
      } pending`,
      tone: 'warning',
    };
  }

  if (orders.length > 0) {
    return { label: 'Results complete', tone: 'neutral' };
  }

  return { label: 'No tests ordered', tone: 'neutral' };
}

function resolveSafetyTone(input: {
  reassessmentOverdue: boolean;
  vitalsAgeMinutes: number;
  waitingPhase: string;
  highRiskFlags: string[];
}): WaitingRoomSafetyTone {
  if (
    input.reassessmentOverdue ||
    input.waitingPhase === 'critical' ||
    input.waitingPhase === 'lwbs' ||
    input.vitalsAgeMinutes >= 60
  ) {
    return 'critical';
  }

  if (
    input.waitingPhase === 'warning' ||
    input.vitalsAgeMinutes >= 30 ||
    input.highRiskFlags.length > 0
  ) {
    return 'watch';
  }

  return 'stable';
}

export function buildWaitingRoomSafetyRow(
  patient: Patient,
  options: {
    staff?: Staff[];
    now?: Date;
    vitalsStaleMinutes?: number;
    referrals?: Referral[];
    allPatients?: Patient[];
    emsArrivals?: EMSArrival[];
    workflowLogs?: WorkflowActionLog[];
  } = {},
): WaitingRoomSafetyRow {
  const now = options.now || new Date();
  const staff = options.staff || [];
  const vitalsStaleMinutes = options.vitalsStaleMinutes ?? 30;
  const timer = buildReassessmentTimerSnapshot(patient, { now });
  const wait = longWaitStatus(patient, now);
  const waitingMinutes =
    patient.state === PatientState.Waiting
      ? wait.waitMinutes
      : minutesSince(patient.triageTime || patient.arrivalTime, now);
  const highRiskFlags = deriveHighRiskComplaintFlags(patient);
  const provider = deriveProviderWaitingStatus(patient, staff);
  const tests = deriveTestWaitingStatus(patient);
  const fitToWait = resolveFitToWaitClassification(patient);
  const experienceContext: PatientExperienceContext = { referrals: options.referrals };
  const experience = resolvePatientExperienceStatus(patient, experienceContext);
  const queueReason = resolveQueueReason(patient, {
    referrals: options.referrals,
    staff: options.staff,
    now: options.now,
  });
  const nextStep = resolveWhatHappensNext(patient, {
    referrals: options.referrals,
    staff: options.staff,
    now: options.now,
  });
  const lwbsRisk = resolveLwbsRisk(patient, {
    now,
    waitingPatientCount: selectWaitingRoomSafetyPatients(
      options.allPatients || [patient],
    ).length,
    workflowLogs: options.workflowLogs,
    staff: options.staff,
  });
  const deteriorationWatch = resolveDeteriorationWatch(patient, {
    now,
    emsArrivals: options.emsArrivals,
    vitalsStaleMinutes,
  });
  const communication = resolveCommunicationRecency(patient, {
    now,
    workflowLogs: options.workflowLogs,
    staff,
  });

  return {
    patientId: patient.id,
    displayName: patientDisplayName(patient),
    arrivalTime: patient.arrivalTime,
    arrivalTimeLabel: formatClockTime(patient.arrivalTime),
    triageLevel: deriveTriageLevelLabel(patient),
    presentingComplaint: getArrivalReasonFromPatient(patient),
    waitingMinutes: Number.isFinite(waitingMinutes) ? waitingMinutes : 0,
    waitingDurationLabel: formatDurationLabel(waitingMinutes),
    vitalsAgeMinutes: timer.lastVitalsAgeMinutes ?? 0,
    vitalsAgeLabel: timer.lastVitalsAgeLabel,
    reassessmentAgeMinutes: timer.lastReassessmentAgeMinutes,
    reassessmentAgeLabel: timer.lastReassessmentAgeLabel,
    reassessmentOverdue: timer.isOverdue,
    reassessmentStage: timer.stage === 'none' ? null : timer.stage,
    highRiskFlags,
    providerWaitingStatus: provider.label,
    providerWaitingTone: provider.tone,
    testWaitingStatus: tests.label,
    testWaitingTone: tests.tone,
    safetyTone: resolveSafetyTone({
      reassessmentOverdue: timer.isOverdue,
      vitalsAgeMinutes: timer.lastVitalsAgeMinutes ?? 0,
      waitingPhase: wait.phase,
      highRiskFlags,
    }),
    priority: patient.priority,
    timer,
    fitToWaitLabel: fitToWait?.label || 'Seating review',
    fitToWaitTone: fitToWait ? fitToWaitClassificationTone(fitToWait.id) : 'watch',
    fitToWaitNeedsReview: !fitToWait,
    fitToWaitClassifiedBy: fitToWait?.classifiedByStaffName || null,
    experienceStatusId: experience.id,
    experienceStatusLabel: experience.label,
    experienceStatusTone: experience.tone,
    experienceStaffDetail: experience.staffDetail,
    queueReasonPrimaryId: queueReason?.primaryReason.id || null,
    queueReasonPrimaryLabel: queueReason?.primaryReason.label || null,
    queueReasonLabels: queueReason?.labels || [],
    queueReasonStaffDetail: queueReason?.staffDetail || null,
    nextStepLabel: nextStep?.label || null,
    nextStepShortLabel: nextStep?.shortLabel || null,
    nextStepTone: nextStep?.tone || null,
    nextStepGuidance: nextStep?.guidance || null,
    nextStepStaffDetail: nextStep?.staffDetail || null,
    lwbsRiskLevel: shouldSurfaceLwbsRisk(lwbsRisk) ? lwbsRisk?.level || null : null,
    lwbsRiskLabel: shouldSurfaceLwbsRisk(lwbsRisk) ? lwbsRisk?.label || null : null,
    lwbsRiskShortLabel: shouldSurfaceLwbsRisk(lwbsRisk) ? lwbsRisk?.shortLabel || null : null,
    lwbsRiskTone: shouldSurfaceLwbsRisk(lwbsRisk) ? lwbsRisk?.tone || null : null,
    lwbsRiskScore: shouldSurfaceLwbsRisk(lwbsRisk) ? lwbsRisk?.score || null : null,
    lwbsRiskStaffDetail: lwbsRisk?.staffDetail || null,
    deteriorationWatchLevel: shouldSurfaceDeteriorationWatch(deteriorationWatch)
      ? deteriorationWatch?.level || null
      : null,
    deteriorationWatchLabel: shouldSurfaceDeteriorationWatch(deteriorationWatch)
      ? deteriorationWatch?.label || null
      : null,
    deteriorationWatchShortLabel: shouldSurfaceDeteriorationWatch(deteriorationWatch)
      ? deteriorationWatch?.shortLabel || null
      : null,
    deteriorationWatchTone: shouldSurfaceDeteriorationWatch(deteriorationWatch)
      ? deteriorationWatch?.tone || null
      : null,
    deteriorationWatchStaffDetail: deteriorationWatch?.staffDetail || null,
    communicationRecencyLabel: communication.recencyLabel,
    communicationShortRecencyLabel: communication.shortRecencyLabel,
    communicationRecencyTone: communication.tone,
    communicationLastKind: communication.lastEventKind,
    communicationLastKindLabel: communication.lastEventLabel,
    communicationMinutesSince: communication.minutesSinceContact,
    communicationStaffDetail: communication.staffDetail,
  };
}

export function selectWaitingRoomSafetyPatients(patients: Patient[] = []): Patient[] {
  return patients.filter((patient) => patient.state === PatientState.Waiting);
}

const SAFETY_TONE_RANK: Record<WaitingRoomSafetyTone, number> = {
  critical: 3,
  watch: 2,
  stable: 1,
};

export function buildWaitingRoomSafetyBoard(
  patients: Patient[] = [],
  options: {
    staff?: Staff[];
    now?: Date;
    referrals?: Referral[];
    emsArrivals?: EMSArrival[];
    settings?: Record<string, unknown>;
    workflowLogs?: WorkflowActionLog[];
  } = {},
): { rows: WaitingRoomSafetyRow[]; summary: WaitingRoomSafetySummary } {
  const waitingPatients = selectWaitingRoomSafetyPatients(patients);
  const rows = waitingPatients
    .map((patient) =>
      buildWaitingRoomSafetyRow(patient, {
        ...options,
        allPatients: patients,
      }),
    )
    .sort((left, right) => {
      const toneDelta = SAFETY_TONE_RANK[right.safetyTone] - SAFETY_TONE_RANK[left.safetyTone];
      if (toneDelta !== 0) return toneDelta;
      if (right.reassessmentOverdue !== left.reassessmentOverdue) {
        return right.reassessmentOverdue ? 1 : -1;
      }
      return right.waitingMinutes - left.waitingMinutes;
    });

  const fitToWaitCounts = summarizeFitToWaitBoardCounts(patients);
  const triageBreachSummary = summarizeTriageBreachBoard(patients, {
    settings: options.settings,
    now: options.now,
  });
  const providerWaitBreachSummary = summarizeProviderWaitBreachBoard(patients, {
    settings: options.settings,
    now: options.now,
  });
  const communicationSummary = summarizeCommunicationBoard(waitingPatients, {
    now: options.now,
    workflowLogs: options.workflowLogs,
    staff: options.staff,
  });

  return {
    rows,
    summary: {
      patientCount: rows.length,
      overdueReassessment: rows.filter((row) => row.reassessmentOverdue).length,
      staleVitals: rows.filter((row) => row.vitalsAgeMinutes >= 30).length,
      criticalSafety: rows.filter((row) => row.safetyTone === 'critical').length,
      awaitingProvider: rows.filter((row) => row.providerWaitingTone === 'warning').length,
      testsPending: rows.filter((row) => row.testWaitingTone === 'warning').length,
      fitToWaitUnclassified: fitToWaitCounts.unclassifiedCount,
      fitToWaitImmediateRoom: fitToWaitCounts.immediateRoomCount,
      fitToWaitReassessmentRequired: fitToWaitCounts.reassessmentRequiredCount,
      lwbsRiskElevated: rows.filter((row) => row.lwbsRiskLevel === 'elevated').length,
      lwbsRiskHigh: rows.filter((row) => row.lwbsRiskLevel === 'high').length,
      lwbsRiskMedium: rows.filter((row) => row.lwbsRiskLevel === 'medium').length,
      deteriorationWatchUrgent: rows.filter((row) => row.deteriorationWatchLevel === 'urgent-review').length,
      deteriorationWatchReview: rows.filter((row) => row.deteriorationWatchLevel === 'review-needed').length,
      deteriorationWatchActive: rows.filter((row) => row.deteriorationWatchLevel).length,
      triageBreachRiskCount: triageBreachSummary.breachRiskCount,
      triageBreachedCount: triageBreachSummary.breachedCount,
      providerWaitApproachingCount: providerWaitBreachSummary.approachingThresholdCount,
      providerWaitBreachedCount: providerWaitBreachSummary.breachedCount,
      providerWaitHighRiskExceptionCount: providerWaitBreachSummary.highRiskExceptionCount,
      communicationStaleCount: communicationSummary.staleContactCount,
      communicationOverdueCount: communicationSummary.overdueContactCount,
      communicationNoContactCount: communicationSummary.noContactCount,
    },
  };
}

export function shouldShowWaitingRoomSafetyBoard({
  waitingPatientCount = 0,
  displayMode = false,
  activeQueueFilter = null,
}: {
  waitingPatientCount?: number;
  displayMode?: boolean;
  activeQueueFilter?: string | null;
} = {}): boolean {
  if (waitingPatientCount <= 0) return false;
  if (displayMode) return true;
  if (!activeQueueFilter) return true;
  return activeQueueFilter.trim().toLowerCase() === 'waiting';
}
