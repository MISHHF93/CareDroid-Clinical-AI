import { buildArrivalControlSnapshot } from './arrivalControlLayer';
import {
  collectHighRiskComplaintLabels,
  patientHasHighRiskComplaintFlags,
  patientNeedsRapidReview,
} from './highRiskComplaintFlags';
import { resolveAmbulanceHandoffChecklist } from './ambulanceHandoffChecklist';
import {
  buildReassessmentTimerSnapshot,
  deriveLastVitalsTime,
  reassessmentIntervalForPriority,
} from '../engine/reassessmentTimerEngine';
import {
  PatientFlag,
  PatientState,
  type Alert,
  type EMSArrival,
  type Patient,
} from '../types/emergency';
import { hasDueReassessmentReminder } from '../utils/reassessmentScheduler';

export type DeteriorationWatchLevel = 'none' | 'watch' | 'review-needed' | 'urgent-review';

export type DeteriorationWatchTone = 'neutral' | 'info' | 'watch' | 'critical';

export type DeteriorationWatchFactorId =
  | 'overdue-vitals'
  | 'reassessment-delays'
  | 'high-risk-complaint'
  | 'ems-intake-observation';

export type DeteriorationWatchFactor = {
  id: DeteriorationWatchFactorId;
  label: string;
  detail: string;
  tone: DeteriorationWatchTone;
};

export type DeteriorationWatchSnapshot = {
  patientId: string;
  watchActive: boolean;
  level: DeteriorationWatchLevel;
  label: string;
  shortLabel: string;
  tone: DeteriorationWatchTone;
  advisoryOnly: true;
  factors: DeteriorationWatchFactor[];
  staffDetail: string;
};

export type DeteriorationWatchContext = {
  now?: Date;
  vitalsStaleMinutes?: number;
  emsArrivals?: EMSArrival[];
};

const ADVISORY_LABEL = 'Advisory only — staff re-review required';

const LEVEL_META: Record<
  Exclude<DeteriorationWatchLevel, 'none'>,
  { label: string; shortLabel: string; tone: DeteriorationWatchTone }
> = {
  watch: { label: 'Deterioration watch', shortLabel: 'Watch', tone: 'info' },
  'review-needed': {
    label: 'Re-review needed',
    shortLabel: 'Re-review',
    tone: 'watch',
  },
  'urgent-review': {
    label: 'Urgent re-review',
    shortLabel: 'Urgent',
    tone: 'critical',
  },
};

function patientDisplayName(patient: Patient): string {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Unknown patient'
  );
}

function minutesSince(timestamp?: string | null, now = new Date()): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function resolveLinkedEmsArrival(
  patient: Patient,
  emsArrivals: EMSArrival[] = [],
): EMSArrival | null {
  if (patient.emsArrival) return patient.emsArrival;
  return emsArrivals.find((arrival) => arrival.patientId === patient.id) || null;
}

function countReassessmentDelaySignals(patient: Patient, now: Date): number {
  const timer = buildReassessmentTimerSnapshot(patient, { now });
  let count = timer.isOverdue ? 1 : 0;

  const overdueReminders = (patient.reassessmentReminders || []).filter((reminder) =>
    ['overdue', 'missed'].includes(String(reminder.status || '')),
  ).length;
  count = Math.max(count, overdueReminders);

  const timelineDelays = (patient.timeline || []).filter((event) =>
    /reassessment.*overdue|missed reassessment|reassessment delay/i.test(
      `${event.type || ''} ${event.summary || ''}`,
    ),
  ).length;

  return count + timelineDelays;
}

function detectOverdueVitals(
  patient: Patient,
  context: DeteriorationWatchContext,
  now: Date,
): DeteriorationWatchFactor | null {
  const staleThreshold = context.vitalsStaleMinutes ?? 30;
  const priorityThreshold = reassessmentIntervalForPriority(patient.priority);
  const vitalsReference = deriveLastVitalsTime(patient);
  const vitalsAgeMinutes = minutesSince(vitalsReference, now);

  if (vitalsAgeMinutes === null) {
    const waitMinutes = minutesSince(patient.triageTime || patient.arrivalTime, now) ?? 0;
    if (waitMinutes < priorityThreshold) return null;
    return {
      id: 'overdue-vitals',
      label: 'Overdue vitals',
      detail: `No vitals documented · waiting ${waitMinutes}m post-triage`,
      tone: waitMinutes >= priorityThreshold * 2 ? 'critical' : 'watch',
    };
  }

  const overdueThreshold = Math.min(staleThreshold, priorityThreshold);
  if (vitalsAgeMinutes < overdueThreshold) return null;

  return {
    id: 'overdue-vitals',
    label: 'Overdue vitals',
    detail: `Last vitals ${vitalsAgeMinutes}m ago · ${patient.priority} threshold ${overdueThreshold}m`,
    tone: vitalsAgeMinutes >= overdueThreshold * 2 ? 'critical' : 'watch',
  };
}

function detectReassessmentDelays(patient: Patient, now: Date): DeteriorationWatchFactor | null {
  const timer = buildReassessmentTimerSnapshot(patient, { now });
  const delaySignals = countReassessmentDelaySignals(patient, now);
  const repeated =
    delaySignals >= 2 ||
    (timer.isOverdue && hasDueReassessmentReminder(patient, now)) ||
    ((patient.reassessmentReminders || []).filter((reminder) =>
      ['overdue', 'missed'].includes(String(reminder.status || '')),
    ).length >= 2);

  if (!repeated && !timer.isOverdue && !hasDueReassessmentReminder(patient, now)) {
    return null;
  }

  return {
    id: 'reassessment-delays',
    label: repeated ? 'Repeated reassessment delays' : 'Reassessment delay',
    detail: repeated
      ? `${delaySignals} overdue reassessment signal${delaySignals === 1 ? '' : 's'}`
      : timer.isOverdue
        ? `Reassessment overdue · ${timer.overdueLabel || 'due now'}`
        : `Reassessment due · ${timer.dueInLabel}`,
    tone: repeated || timer.isOverdue ? 'critical' : 'watch',
  };
}

function detectHighRiskComplaint(patient: Patient): DeteriorationWatchFactor | null {
  if (!patientHasHighRiskComplaintFlags(patient) && !patientNeedsRapidReview(patient)) {
    return null;
  }

  const labels = collectHighRiskComplaintLabels(patient);
  return {
    id: 'high-risk-complaint',
    label: 'High-risk complaint category',
    detail: labels.length
      ? `${labels.join(', ')} · rapid review context`
      : 'High-risk complaint flags active',
    tone: patientNeedsRapidReview(patient) ? 'critical' : 'watch',
  };
}

function detectEmsIntakeObservation(
  patient: Patient,
  context: DeteriorationWatchContext,
): DeteriorationWatchFactor | null {
  const arrival = resolveLinkedEmsArrival(patient, context.emsArrivals || []);
  const arrivalControl = buildArrivalControlSnapshot(patient);
  const checklist = arrival ? resolveAmbulanceHandoffChecklist(arrival, { patient }) : null;

  const observations: string[] = [];

  if (arrival?.severity === 'Critical') {
    observations.push('EMS critical severity');
  } else if (arrival?.severity === 'High') {
    observations.push('EMS high severity');
  }

  if (arrivalControl.quickSafetyFlags.length) {
    observations.push(
      `Intake safety flags: ${arrivalControl.quickSafetyFlags.join(', ')}`,
    );
  }

  if (checklist?.criticalFlags.length) {
    observations.push(
      checklist.criticalFlags
        .slice(0, 3)
        .map((flag) => flag.label)
        .join(', '),
    );
  }

  if (checklist && !checklist.vitalsReceived && patient.state === PatientState.Waiting) {
    observations.push('EMS vitals not received at handoff');
  }

  if (arrival?.mechanismOfInjury?.trim()) {
    observations.push(`MOI: ${arrival.mechanismOfInjury.trim()}`);
  }

  if (!observations.length) return null;

  const tone: DeteriorationWatchTone =
    arrival?.severity === 'Critical' ||
    arrivalControl.quickSafetyFlags.some((flag) =>
      [PatientFlag.SepsisAlert, PatientFlag.StrokeCode, PatientFlag.DeterioratingNeuro].includes(flag),
    )
      ? 'critical'
      : 'watch';

  return {
    id: 'ems-intake-observation',
    label: 'Abnormal EMS / intake observation',
    detail: observations.join(' · '),
    tone,
  };
}

function resolveWatchLevel(factors: DeteriorationWatchFactor[]): DeteriorationWatchLevel {
  if (!factors.length) return 'none';

  const criticalFactors = factors.filter((factor) => factor.tone === 'critical').length;
  const hasOverdueVitals = factors.some((factor) => factor.id === 'overdue-vitals');
  const hasHighRisk = factors.some((factor) => factor.id === 'high-risk-complaint');
  const hasEms = factors.some((factor) => factor.id === 'ems-intake-observation');
  const hasReassessment = factors.some((factor) => factor.id === 'reassessment-delays');

  if (
    factors.length >= 3 ||
    (hasOverdueVitals && hasHighRisk) ||
    (hasEms && factors.length >= 2) ||
    (hasReassessment && hasOverdueVitals) ||
    criticalFactors >= 2
  ) {
    return 'urgent-review';
  }

  if (factors.length >= 2 || criticalFactors >= 1) {
    return 'review-needed';
  }

  return 'watch';
}

export function isDeteriorationWatchEligible(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return patient.state === PatientState.Waiting;
}

export function resolveDeteriorationWatch(
  patient: Patient,
  context: DeteriorationWatchContext = {},
): DeteriorationWatchSnapshot | null {
  if (!isDeteriorationWatchEligible(patient)) return null;

  const now = context.now || new Date();
  const factors = [
    detectOverdueVitals(patient, context, now),
    detectReassessmentDelays(patient, now),
    detectHighRiskComplaint(patient),
    detectEmsIntakeObservation(patient, context),
  ].filter((factor): factor is DeteriorationWatchFactor => Boolean(factor));

  const level = resolveWatchLevel(factors);
  if (level === 'none') return null;

  const meta = LEVEL_META[level];
  return {
    patientId: patient.id,
    watchActive: true,
    level,
    label: meta.label,
    shortLabel: meta.shortLabel,
    tone: meta.tone,
    advisoryOnly: true,
    factors,
    staffDetail: [
      ADVISORY_LABEL,
      factors.map((factor) => `${factor.label}: ${factor.detail}`).join(' · '),
    ].join(' — '),
  };
}

export function shouldSurfaceDeteriorationWatch(
  snapshot: DeteriorationWatchSnapshot | null | undefined,
): boolean {
  return Boolean(snapshot?.watchActive);
}

export function summarizeDeteriorationWatchBoard(
  patients: Patient[] = [],
  context: DeteriorationWatchContext = {},
): Record<Exclude<DeteriorationWatchLevel, 'none'>, number> {
  const counts = {
    watch: 0,
    'review-needed': 0,
    'urgent-review': 0,
  };

  patients.filter(isDeteriorationWatchEligible).forEach((patient) => {
    const snapshot = resolveDeteriorationWatch(patient, context);
    if (snapshot && snapshot.level !== 'none') {
      counts[snapshot.level] += 1;
    }
  });

  return counts;
}

export function buildDeteriorationWatchAlerts(
  patients: Patient[] = [],
  context: DeteriorationWatchContext = {},
): Alert[] {
  const now = context.now || new Date();

  return patients
    .filter(isDeteriorationWatchEligible)
    .map((patient) => ({
      patient,
      snapshot: resolveDeteriorationWatch(patient, { ...context, now }),
    }))
    .filter(
      (entry): entry is { patient: Patient; snapshot: DeteriorationWatchSnapshot } =>
        Boolean(
          entry.snapshot &&
            (entry.snapshot.level === 'review-needed' ||
              entry.snapshot.level === 'urgent-review'),
        ),
    )
    .sort((left, right) => {
      const rank = { 'urgent-review': 2, 'review-needed': 1, watch: 0, none: -1 };
      return rank[right.snapshot.level] - rank[left.snapshot.level];
    })
    .map(({ patient, snapshot }) => ({
      id: `deterioration-watch-${snapshot.level}-${patient.id}`,
      type: 'OperationalIntelligence' as const,
      severity: snapshot.level === 'urgent-review' ? ('Critical' as const) : ('Warning' as const),
      title: `${snapshot.label} — ${patientDisplayName(patient)}`,
      message: `${ADVISORY_LABEL}. ${snapshot.factors.map((factor) => factor.label).join(', ')}.`,
      patientId: patient.id,
      createdAt: patient.arrivalTime || now.toISOString(),
      dismissed: false,
      source: 'deterioration-watch-advisory',
      actionType: 'VIEW_PATIENT',
      actionLabel: 'Review patient',
      metadata: {
        advisoryOnly: true,
        deteriorationWatchLevel: snapshot.level as string,
        factors: snapshot.factors.map((factor) => factor.id).join(','),
      },
    }));
}

export type DeteriorationWatchAttentionRow = {
  patientId: string;
  displayName: string;
  level: Exclude<DeteriorationWatchLevel, 'none'>;
  label: string;
  tone: DeteriorationWatchTone;
  factorIds: DeteriorationWatchFactorId[];
};

export type DeteriorationWatchAttentionSnapshot = {
  activeCount: number;
  counts: Record<Exclude<DeteriorationWatchLevel, 'none'>, number>;
  reviewAndUrgentCount: number;
  rows: DeteriorationWatchAttentionRow[];
  previewRows: DeteriorationWatchAttentionRow[];
};

const LEVEL_RANK: Record<DeteriorationWatchLevel, number> = {
  none: -1,
  watch: 0,
  'review-needed': 1,
  'urgent-review': 2,
};

export function sortPatientsForDeteriorationWatchAttention(
  patients: Patient[] = [],
  context: DeteriorationWatchContext = {},
): Patient[] {
  return [...patients]
    .filter(isDeteriorationWatchEligible)
    .map((patient) => ({
      patient,
      snapshot: resolveDeteriorationWatch(patient, context),
    }))
    .filter(
      (entry): entry is { patient: Patient; snapshot: DeteriorationWatchSnapshot } =>
        Boolean(entry.snapshot && shouldSurfaceDeteriorationWatch(entry.snapshot)),
    )
    .sort(
      (left, right) =>
        LEVEL_RANK[right.snapshot.level] - LEVEL_RANK[left.snapshot.level] ||
        right.snapshot.factors.length - left.snapshot.factors.length,
    )
    .map((entry) => entry.patient);
}

export function buildDeteriorationWatchAttentionSnapshot(
  patients: Patient[] = [],
  context: DeteriorationWatchContext = {},
): DeteriorationWatchAttentionSnapshot {
  const counts = summarizeDeteriorationWatchBoard(patients, context);
  const rows = sortPatientsForDeteriorationWatchAttention(patients, context).map((patient) => {
    const snapshot = resolveDeteriorationWatch(patient, context)!;
    return {
      patientId: patient.id,
      displayName: patientDisplayName(patient),
      level: snapshot.level as Exclude<DeteriorationWatchLevel, 'none'>,
      label: snapshot.label,
      tone: snapshot.tone,
      factorIds: snapshot.factors.map((factor) => factor.id),
    };
  });

  return {
    activeCount: rows.length,
    counts,
    reviewAndUrgentCount: counts['review-needed'] + counts['urgent-review'],
    rows,
    previewRows: rows.slice(0, 4),
  };
}

