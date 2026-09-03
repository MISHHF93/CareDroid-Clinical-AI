import {
  PatientState,
  type FitToWaitClassificationId,
  type FitToWaitClassificationRecord,
  type ISODateString,
  type Patient,
} from '../types/emergency';

export type FitToWaitTone = 'stable' | 'watch' | 'critical' | 'neutral';

export type FitToWaitClassificationDefinition = {
  id: FitToWaitClassificationId;
  label: string;
  shortLabel: string;
  tone: FitToWaitTone;
  description: string;
};

/** Canonical seating / waiting pathway options — staff-selected only. */
export const FIT_TO_WAIT_CLASSIFICATIONS: readonly FitToWaitClassificationDefinition[] =
  Object.freeze([
    {
      id: 'fit-to-sit',
      label: 'Fit to sit',
      shortLabel: 'Sit',
      tone: 'stable',
      description: 'Stable for waiting-room chair seating with routine reassessment.',
    },
    {
      id: 'monitored-chair',
      label: 'Monitored chair',
      shortLabel: 'Chair',
      tone: 'watch',
      description: 'Waiting-room chair with enhanced monitoring and reassessment cadence.',
    },
    {
      id: 'stretcher-needed',
      label: 'Stretcher needed',
      shortLabel: 'Stretcher',
      tone: 'watch',
      description: 'Requires stretcher or recliner — not appropriate for standard chair seating.',
    },
    {
      id: 'immediate-room-needed',
      label: 'Immediate room needed',
      shortLabel: 'Room now',
      tone: 'critical',
      description: 'Escalate for immediate treatment space — staff decision only.',
    },
    {
      id: 'reassessment-required',
      label: 'Waiting-room reassessment required',
      shortLabel: 'Reassess',
      tone: 'watch',
      description: 'Needs waiting-room reassessment before seating disposition is final.',
    },
  ]);

const DEFINITION_BY_ID = new Map(
  FIT_TO_WAIT_CLASSIFICATIONS.map((definition) => [definition.id, definition]),
);

function nowIso(): ISODateString {
  return new Date().toISOString();
}

export function fitToWaitClassificationLabel(id: FitToWaitClassificationId): string {
  return DEFINITION_BY_ID.get(id)?.label || id;
}

export function fitToWaitClassificationTone(id: FitToWaitClassificationId): FitToWaitTone {
  return DEFINITION_BY_ID.get(id)?.tone || 'neutral';
}

export function resolveFitToWaitClassification(
  patient: Patient | null | undefined,
): FitToWaitClassificationRecord | null {
  if (!patient?.fitToWaitClassification?.id) return null;
  const definition = DEFINITION_BY_ID.get(patient.fitToWaitClassification.id);
  if (!definition) return patient.fitToWaitClassification;
  return {
    ...patient.fitToWaitClassification,
    label: definition.label,
    staffConfirmed: true,
  };
}

/** Waiting patients eligible for manual fit-to-wait classification. */
export function canClassifyFitToWait(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return patient.state === PatientState.Waiting;
}

export function patientNeedsFitToWaitReview(patient: Patient | null | undefined): boolean {
  if (!canClassifyFitToWait(patient)) return false;
  return !resolveFitToWaitClassification(patient);
}

export function buildFitToWaitClassificationRecord(
  classificationId: FitToWaitClassificationId,
  actor?: { staffId?: string; staffName?: string },
  options: { notes?: string; timestamp?: ISODateString } = {},
): FitToWaitClassificationRecord {
  const definition = DEFINITION_BY_ID.get(classificationId);
  if (!definition) {
    throw new Error(`Unknown fit-to-wait classification: ${classificationId}`);
  }

  return {
    id: classificationId,
    label: definition.label,
    classifiedAt: options.timestamp || nowIso(),
    classifiedByStaffId: actor?.staffId,
    classifiedByStaffName: actor?.staffName,
    notes: options.notes?.trim() || undefined,
    staffConfirmed: true,
  };
}

/** Applies staff classification — never infers clinical disposition from vitals or complaints. */
export function buildFitToWaitClassificationPatch(
  classificationId: FitToWaitClassificationId,
  actor?: { staffId?: string; staffName?: string },
  options: { notes?: string; timestamp?: ISODateString } = {},
): Pick<Patient, 'fitToWaitClassification'> {
  return {
    fitToWaitClassification: buildFitToWaitClassificationRecord(classificationId, actor, options),
  };
}

export function summarizeFitToWaitBoardCounts(patients: Patient[] = []): {
  waitingCount: number;
  classifiedCount: number;
  unclassifiedCount: number;
  immediateRoomCount: number;
  reassessmentRequiredCount: number;
  stretcherNeededCount: number;
} {
  const waiting = patients.filter((patient) => patient.state === PatientState.Waiting);
  const classified = waiting.filter((patient) => resolveFitToWaitClassification(patient));
  return {
    waitingCount: waiting.length,
    classifiedCount: classified.length,
    unclassifiedCount: waiting.length - classified.length,
    immediateRoomCount: classified.filter(
      (patient) => patient.fitToWaitClassification?.id === 'immediate-room-needed',
    ).length,
    reassessmentRequiredCount: classified.filter(
      (patient) => patient.fitToWaitClassification?.id === 'reassessment-required',
    ).length,
    stretcherNeededCount: classified.filter(
      (patient) => patient.fitToWaitClassification?.id === 'stretcher-needed',
    ).length,
  };
}

const ATTENTION_PRIORITY: Record<FitToWaitClassificationId | 'unclassified', number> = {
  'immediate-room-needed': 0,
  'reassessment-required': 1,
  unclassified: 2,
  'stretcher-needed': 3,
  'monitored-chair': 4,
  'fit-to-sit': 5,
};

/** Waiting patients that should appear on operational attention surfaces. */
export function patientNeedsFitToWaitAttention(patient: Patient | null | undefined): boolean {
  if (!canClassifyFitToWait(patient)) return false;
  if (patientNeedsFitToWaitReview(patient)) return true;
  const id = resolveFitToWaitClassification(patient)?.id;
  return (
    id === 'immediate-room-needed' || id === 'reassessment-required' || id === 'stretcher-needed'
  );
}

export type FitToWaitAttentionRow = {
  patientId: string;
  displayName: string;
  classificationId: FitToWaitClassificationId | null;
  classificationLabel: string;
  tone: FitToWaitTone | 'review';
  sortPriority: number;
};

export type FitToWaitAttentionSnapshot = ReturnType<typeof summarizeFitToWaitBoardCounts> & {
  needsAttentionCount: number;
  rows: FitToWaitAttentionRow[];
  previewRows: FitToWaitAttentionRow[];
};

function fitToWaitPatientDisplayName(patient: Patient): string {
  return [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn;
}

export function sortPatientsForFitToWaitAttention(patients: Patient[] = []): Patient[] {
  return [...patients]
    .filter((patient) => patientNeedsFitToWaitAttention(patient))
    .sort((left, right) => {
      const leftId = resolveFitToWaitClassification(left)?.id || 'unclassified';
      const rightId = resolveFitToWaitClassification(right)?.id || 'unclassified';
      const priorityDelta =
        (ATTENTION_PRIORITY[leftId] ?? 99) - (ATTENTION_PRIORITY[rightId] ?? 99);
      if (priorityDelta !== 0) return priorityDelta;
      return fitToWaitPatientDisplayName(left).localeCompare(fitToWaitPatientDisplayName(right));
    });
}

export function buildFitToWaitAttentionRow(patient: Patient): FitToWaitAttentionRow {
  const classification = resolveFitToWaitClassification(patient);
  const classificationId = classification?.id || null;
  const sortKey = classificationId || 'unclassified';

  return {
    patientId: patient.id,
    displayName: fitToWaitPatientDisplayName(patient),
    classificationId,
    classificationLabel: classification?.label || 'Seating review pending',
    tone: classificationId ? fitToWaitClassificationTone(classificationId) : 'review',
    sortPriority: ATTENTION_PRIORITY[sortKey] ?? 99,
  };
}

/** Compact whiteboard / strip snapshot — staff review only, never auto-classified. */
export function buildFitToWaitAttentionSnapshot(
  patients: Patient[] = [],
): FitToWaitAttentionSnapshot {
  const counts = summarizeFitToWaitBoardCounts(patients);
  const rows = sortPatientsForFitToWaitAttention(patients).map(buildFitToWaitAttentionRow);

  return {
    ...counts,
    needsAttentionCount: rows.length,
    rows,
    previewRows: rows.slice(0, 4),
  };
}
