import { isEmsRegistrationPatient } from '../components/reception/receptionQueueModel';
import {
  classifyReferralBucket,
  isClosedReferralStatus,
} from '../components/whiteboard/referralAwarenessModel';
import { deriveProviderWaitingStatus } from '../components/whiteboard/waitingRoomSafetyBoardModel';
import { buildReassessmentTimerSnapshot } from '../engine/reassessmentTimerEngine';
import { deriveQueueDestination, deriveTriagePending } from './arrivalControlLayer';
import {
  PatientFlag,
  PatientState,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';
import { hasDueReassessmentReminder } from '../utils/reassessmentScheduler';

export type WhatHappensNextStepId =
  | 'triage-needed'
  | 'reassessment-due'
  | 'provider-review-pending'
  | 'test-pending'
  | 'result-review-pending'
  | 'referral-pending'
  | 'admission-decision-pending'
  | 'discharge-workflow-pending';

export type WhatHappensNextTone = 'neutral' | 'info' | 'watch' | 'critical';

export type WhatHappensNextStepDefinition = {
  id: WhatHappensNextStepId;
  label: string;
  shortLabel: string;
  tone: WhatHappensNextTone;
  guidance: string;
};

export const WHAT_HAPPENS_NEXT_STEPS: readonly WhatHappensNextStepDefinition[] = Object.freeze([
  {
    id: 'triage-needed',
    label: 'Triage needed',
    shortLabel: 'Triage',
    tone: 'watch',
    guidance: 'Complete triage assessment, assign priority, and route to the next queue.',
  },
  {
    id: 'reassessment-due',
    label: 'Reassessment due',
    shortLabel: 'Reassess',
    tone: 'critical',
    guidance: 'Perform reassessment, refresh vitals, and document any change in condition.',
  },
  {
    id: 'provider-review-pending',
    label: 'Provider review pending',
    shortLabel: 'Provider',
    tone: 'watch',
    guidance: 'Assign or recall the responsible clinician for assessment and next orders.',
  },
  {
    id: 'test-pending',
    label: 'Test pending',
    shortLabel: 'Tests',
    tone: 'info',
    guidance: 'Track outstanding diagnostics and confirm collection or imaging progress.',
  },
  {
    id: 'result-review-pending',
    label: 'Result review pending',
    shortLabel: 'Results',
    tone: 'watch',
    guidance: 'Review returned results with the responsible clinician and update the plan.',
  },
  {
    id: 'referral-pending',
    label: 'Referral pending',
    shortLabel: 'Referral',
    tone: 'watch',
    guidance: 'Follow up on specialty referral status and document response timing.',
  },
  {
    id: 'admission-decision-pending',
    label: 'Admission decision pending',
    shortLabel: 'Admission',
    tone: 'watch',
    guidance: 'Confirm admission decision, bed request, and patient placement plan.',
  },
  {
    id: 'discharge-workflow-pending',
    label: 'Discharge workflow pending',
    shortLabel: 'Discharge',
    tone: 'info',
    guidance: 'Complete discharge instructions, prescriptions, and departure coordination.',
  },
]);

const STEP_BY_ID = new Map(WHAT_HAPPENS_NEXT_STEPS.map((step) => [step.id, step]));

const STEP_PRIORITY: Record<WhatHappensNextStepId, number> = {
  'triage-needed': 1,
  'reassessment-due': 2,
  'admission-decision-pending': 3,
  'discharge-workflow-pending': 4,
  'referral-pending': 5,
  'result-review-pending': 6,
  'test-pending': 7,
  'provider-review-pending': 8,
};

const ARRIVAL_WAITING_FLOW_STATES = new Set<PatientState>([
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
]);

export type WhatHappensNextContext = {
  referrals?: Referral[];
  staff?: Staff[];
  now?: Date;
};

export type WhatHappensNextSnapshot = {
  stepId: WhatHappensNextStepId;
  label: string;
  shortLabel: string;
  tone: WhatHappensNextTone;
  guidance: string;
  staffDetail: string;
  secondarySteps: Array<Pick<WhatHappensNextSnapshot, 'stepId' | 'label' | 'shortLabel'>>;
};

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as unknown as { type: string })?.type === flag,
  );
}

export function isInArrivalWaitingFlow(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return ARRIVAL_WAITING_FLOW_STATES.has(patient.state);
}

function activeReferral(patient: Patient, referrals: Referral[] = []): Referral | null {
  const match = referrals.find(
    (referral) =>
      referral.patientId === patient.id && classifyReferralBucket(referral) !== null,
  );
  if (match) return match;
  if (patient.referral && !isClosedReferralStatus(patient.referral.status)) {
    return patient.referral;
  }
  return null;
}

function pendingTestCount(patient: Patient): number {
  const timeline = patient.timeline || [];
  const orders = timeline.filter((event) => event.type === 'OrderPlaced').length;
  const results = timeline.filter((event) => event.type === 'ResultReceived').length;
  return Math.max(0, orders - results);
}

function detectSteps(
  patient: Patient,
  context: WhatHappensNextContext,
): Array<{ id: WhatHappensNextStepId; staffDetail: string }> {
  if (!isInArrivalWaitingFlow(patient)) return [];

  const now = context.now || new Date();
  const staff = context.staff || [];
  const referrals = context.referrals || [];
  const queueDestination = deriveQueueDestination(patient);
  const steps: Array<{ id: WhatHappensNextStepId; staffDetail: string }> = [];

  if (
    patient.state === PatientState.Triage ||
    deriveTriagePending(patient) ||
    ((queueDestination === 'triage-queue' || queueDestination === 'rapid-review') &&
      !patient.triageTime)
  ) {
    steps.push({
      id: 'triage-needed',
      staffDetail: `Internal ${patient.state} · ${queueDestination}`,
    });
  }

  const timer = buildReassessmentTimerSnapshot(patient, { now });
  if (
    hasFlag(patient, PatientFlag.ReassessmentDue) ||
    hasDueReassessmentReminder(patient, now) ||
    timer.isOverdue
  ) {
    steps.push({
      id: 'reassessment-due',
      staffDetail: timer.isOverdue
        ? `Reassessment overdue · last ${timer.lastReassessmentAgeLabel}`
        : `Reassessment due · ${timer.dueInLabel}`,
    });
  }

  if (
    patient.state === PatientState.Admission ||
    hasFlag(patient, PatientFlag.PendingAdmission)
  ) {
    steps.push({
      id: 'admission-decision-pending',
      staffDetail: `Internal ${patient.state} · bed placement workflow`,
    });
  }

  if (patient.state === PatientState.Disposition || patient.state === PatientState.Discharge) {
    steps.push({
      id: 'discharge-workflow-pending',
      staffDetail: `Internal ${patient.state} · departure planning`,
    });
  }

  const referral = activeReferral(patient, referrals);
  if (referral) {
    steps.push({
      id: 'referral-pending',
      staffDetail: `Referral ${referral.status}${referral.service || referral.targetDepartment ? ` · ${referral.service || referral.targetDepartment}` : ''}`,
    });
  }

  if (patient.state === PatientState.Results) {
    steps.push({
      id: 'result-review-pending',
      staffDetail: 'Results returned · clinician review outstanding',
    });
  }

  if (patient.state === PatientState.Orders || pendingTestCount(patient) > 0) {
    steps.push({
      id: 'test-pending',
      staffDetail: `${Math.max(pendingTestCount(patient), 1)} diagnostic step(s) outstanding`,
    });
  }

  const provider = deriveProviderWaitingStatus(patient, staff);
  if (
    patient.state === PatientState.Waiting &&
    (provider.label === 'Awaiting provider' ||
      provider.label.includes('not seen') ||
      provider.label.includes('Return'))
  ) {
    steps.push({
      id: 'provider-review-pending',
      staffDetail: provider.label,
    });
  } else if (patient.state === PatientState.Waiting && !patient.assignedStaffId) {
    steps.push({
      id: 'provider-review-pending',
      staffDetail: 'No assigned clinician',
    });
  }

  if (
    (patient.state === PatientState.Registration ||
      patient.state === PatientState.Arrival ||
      isEmsRegistrationPatient(patient)) &&
    !steps.some((step) => step.id === 'triage-needed')
  ) {
    steps.push({
      id: 'triage-needed',
      staffDetail: `Registration complete · route to triage (${queueDestination})`,
    });
  }

  return steps;
}

function sortSteps(steps: Array<{ id: WhatHappensNextStepId; staffDetail: string }>) {
  return [...steps].sort(
    (left, right) => (STEP_PRIORITY[left.id] ?? 99) - (STEP_PRIORITY[right.id] ?? 99),
  );
}

function toSnapshot(
  step: { id: WhatHappensNextStepId; staffDetail: string },
  secondarySteps: Array<{ id: WhatHappensNextStepId; staffDetail: string }>,
): WhatHappensNextSnapshot {
  const definition = STEP_BY_ID.get(step.id)!;
  return {
    stepId: step.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    tone: definition.tone,
    guidance: definition.guidance,
    staffDetail: step.staffDetail,
    secondarySteps: secondarySteps.map((entry) => ({
      stepId: entry.id,
      label: STEP_BY_ID.get(entry.id)?.label || entry.id,
      shortLabel: STEP_BY_ID.get(entry.id)?.shortLabel || entry.id,
    })),
  };
}

export function resolveWhatHappensNext(
  patient: Patient,
  context: WhatHappensNextContext = {},
): WhatHappensNextSnapshot | null {
  const detected = sortSteps(detectSteps(patient, context));
  if (!detected.length) return null;
  const [primary, ...secondary] = detected;
  return toSnapshot(primary, secondary);
}

export function summarizeWhatHappensNextBoard(
  patients: Patient[] = [],
  context: WhatHappensNextContext = {},
): Record<WhatHappensNextStepId, number> {
  const counts = Object.fromEntries(
    WHAT_HAPPENS_NEXT_STEPS.map((step) => [step.id, 0]),
  ) as Record<WhatHappensNextStepId, number>;

  patients.forEach((patient) => {
    if (!isInArrivalWaitingFlow(patient)) return;
    const snapshot = resolveWhatHappensNext(patient, context);
    if (snapshot) counts[snapshot.stepId] += 1;
  });

  return counts;
}

export function buildWhatHappensNextCopilotLines(
  patients: Patient[] = [],
  context: WhatHappensNextContext & { selectedPatientId?: string | null; limit?: number } = {},
): string[] {
  const limit = context.limit ?? 8;
  const selected = context.selectedPatientId
    ? patients.find((patient) => patient.id === context.selectedPatientId)
    : null;

  const lines: string[] = [];

  if (selected && isInArrivalWaitingFlow(selected)) {
    const snapshot = resolveWhatHappensNext(selected, context);
    if (snapshot) {
      lines.push(
        `Selected patient next step: ${snapshot.label} — ${snapshot.guidance} (${snapshot.staffDetail})`,
      );
      if (snapshot.secondarySteps.length) {
        lines.push(
          `Also watch: ${snapshot.secondarySteps.map((step) => step.label).join(', ')}`,
        );
      }
    }
  }

  const queue = patients
    .filter(isInArrivalWaitingFlow)
    .map((patient) => ({
      patient,
      snapshot: resolveWhatHappensNext(patient, context),
    }))
    .filter((entry): entry is { patient: Patient; snapshot: WhatHappensNextSnapshot } =>
      Boolean(entry.snapshot),
    )
    .sort((left, right) => {
      const toneRank = { critical: 0, watch: 1, info: 2, neutral: 3 };
      const leftRank = toneRank[left.snapshot.tone] ?? 9;
      const rightRank = toneRank[right.snapshot.tone] ?? 9;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.snapshot.label.localeCompare(right.snapshot.label);
    })
    .slice(0, limit);

  if (queue.length) {
    lines.push('What happens next queue (staff guidance, human review required):');
    queue.forEach(({ patient, snapshot }) => {
      lines.push(
        `- ${patient.firstName} ${patient.lastName} (${patient.state}): ${snapshot.label} — ${snapshot.guidance}`,
      );
    });
  }

  const summary = summarizeWhatHappensNextBoard(patients, context);
  const summaryLine = WHAT_HAPPENS_NEXT_STEPS.filter((step) => summary[step.id] > 0)
    .map((step) => `${step.shortLabel} ${summary[step.id]}`)
    .join(', ');
  if (summaryLine) {
    lines.push(`Next-step counts: ${summaryLine}`);
  }

  return lines;
}

export function formatWhatHappensNextForCopilot(
  patients: Patient[] = [],
  context: WhatHappensNextContext & { selectedPatientId?: string | null } = {},
): string {
  const lines = buildWhatHappensNextCopilotLines(patients, context);
  return lines.length ? lines.join('\n') : 'What happens next queue: none in arrival/waiting flow.';
}
