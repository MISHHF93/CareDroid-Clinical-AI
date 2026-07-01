import {
  PatientState,
  type Alert,
  type ISODateString,
  type Patient,
  type QueueDestination,
} from '../types/emergency';

/** Canonical high-risk complaint fast-flag identifiers — staff alert only, no auto-triage. */
export type HighRiskComplaintFlagId =
  | 'chest-pain'
  | 'shortness-of-breath'
  | 'stroke-symptoms'
  | 'syncope'
  | 'altered-mental-status'
  | 'severe-abdominal-pain'
  | 'severe-bleeding'
  | 'sepsis-concern'
  | 'anaphylaxis-concern'
  | 'pregnancy-emergency';

export type HighRiskComplaintFlagSource =
  | 'complaint-text'
  | 'complaint-category'
  | 'staff-selected';

export interface HighRiskComplaintFlagRecord {
  id: HighRiskComplaintFlagId;
  label: string;
  detectedAt: ISODateString;
  source: HighRiskComplaintFlagSource;
}

export type HighRiskComplaintFlagDefinition = {
  id: HighRiskComplaintFlagId;
  label: string;
  keywords: RegExp[];
  categories: string[];
};

export const HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS: readonly HighRiskComplaintFlagDefinition[] =
  Object.freeze([
    {
      id: 'chest-pain',
      label: 'Chest pain',
      keywords: [
        /\bchest pain\b/,
        /\bchest pressure\b/,
        /\bchest tightness\b/,
        /\bacs\b/,
        /\bangina\b/,
        /\bstemi\b/,
        /\bnstemi\b/,
        /\bmyocardial infarction\b/,
        /\bheart attack\b/,
      ],
      categories: ['Chest pain', 'Cardiac'],
    },
    {
      id: 'shortness-of-breath',
      label: 'Shortness of breath',
      keywords: [
        /\bshortness of breath\b/,
        /\bshort of breath\b/,
        /\bsob\b/,
        /\bdyspnea\b/,
        /\bdyspnoea\b/,
        /\bbreathing difficulty\b/,
        /\bcan't breathe\b/,
        /\bcannot breathe\b/,
        /\brespiratory distress\b/,
        /\bhypox/i,
      ],
      categories: ['Breathing', 'Respiratory'],
    },
    {
      id: 'stroke-symptoms',
      label: 'Stroke symptoms',
      keywords: [
        /\bstroke\b/,
        /\btia\b/,
        /\bfacial droop\b/,
        /\bslurred speech\b/,
        /\baphasia\b/,
        /\bhemiparesis\b/,
        /\bweakness on one side\b/,
        /\bneurologic deficit\b/,
        /\bneurological deficit\b/,
        /\bsudden vision loss\b/,
        /\bfast positive\b/,
      ],
      categories: ['Neuro/Stroke', 'Neurology'],
    },
    {
      id: 'syncope',
      label: 'Syncope',
      keywords: [
        /\bsyncope\b/,
        /\bfainted\b/,
        /\bfainting\b/,
        /\bpassed out\b/,
        /\blost consciousness\b/,
        /\bblackout\b/,
        /\bcollapsed\b/,
        /\bunresponsive episode\b/,
      ],
      categories: [],
    },
    {
      id: 'altered-mental-status',
      label: 'Altered mental status',
      keywords: [
        /\baltered mental status\b/,
        /\bconfusion\b/,
        /\bconfused\b/,
        /\bdelirium\b/,
        /\bagitated\b/,
        /\bunresponsive\b/,
        /\bdecreased consciousness\b/,
        /\baltered level of consciousness\b/,
        /\bams\b/,
        /\bdisoriented\b/,
      ],
      categories: [],
    },
    {
      id: 'severe-abdominal-pain',
      label: 'Severe abdominal pain',
      keywords: [
        /\bsevere abdominal pain\b/,
        /\babdominal pain\b.*\b(severe|worst|10\/10|9\/10|8\/10)\b/,
        /\b(severe|worst|10\/10|9\/10|8\/10)\b.*\babdominal pain\b/,
        /\bruptured\b.*\b(append|aortic|ectopic)\b/,
        /\bperiton/i,
        /\bacute abdomen\b/,
      ],
      categories: ['Abdominal'],
    },
    {
      id: 'severe-bleeding',
      label: 'Severe bleeding',
      keywords: [
        /\bsevere bleeding\b/,
        /\bheavy bleeding\b/,
        /\bhemorrhage\b/,
        /\bhaemorrhage\b/,
        /\buncontrolled bleed/i,
        /\bvomiting blood\b/,
        /\bhematemesis\b/,
        /\bblood in stool\b/,
        /\brectal bleed/i,
        /\bgi bleed/i,
        /\bpost.?partum bleed/i,
      ],
      categories: ['Trauma'],
    },
    {
      id: 'sepsis-concern',
      label: 'Sepsis concern',
      keywords: [
        /\bsepsis\b/,
        /\bseptic\b/,
        /\bseptic shock\b/,
        /\binfection concern\b/,
        /\bfevers?\b.*\b(hypotension|tachycardia|tachypnea|confusion)\b/,
        /\b(hypotension|tachycardia|tachypnea|confusion)\b.*\bfevers?\b/,
      ],
      categories: ['Sepsis', 'Infection'],
    },
    {
      id: 'anaphylaxis-concern',
      label: 'Anaphylaxis concern',
      keywords: [
        /\banaphylaxis\b/,
        /\banaphylactic\b/,
        /\bthroat closing\b/,
        /\bangioedema\b/,
        /\bepipen\b/,
        /\bepi pen\b/,
        /\ballergic reaction\b.*\b(severe|swelling|breathing|wheez)/,
      ],
      categories: ['Anaphylaxis'],
    },
    {
      id: 'pregnancy-emergency',
      label: 'Pregnancy emergency',
      keywords: [
        /\bpregnancy emergency\b/,
        /\bectopic\b/,
        /\bplacental abruption\b/,
        /\bheavy vaginal bleeding\b.*\bpregnan/,
        /\bpregnan.*\b(bleeding|pain|contractions|water broke|rupture)\b/,
        /\blabor\b.*\b(distress|bleeding|pain)\b/,
        /\bpostpartum\b.*\b(bleed|hemorrh|seizure|headache|bp)\b/,
        /\bpreeclampsia\b/,
        /\beclampsia\b/,
      ],
      categories: ['OB/Gyn', 'OB', 'Gyn', 'Obstetric'],
    },
  ]);

const FLAG_DEFINITION_BY_ID = new Map(
  HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function normalizeCategory(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeComplaint(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function highRiskComplaintFlagLabel(id: HighRiskComplaintFlagId): string {
  return FLAG_DEFINITION_BY_ID.get(id)?.label || id;
}

export function detectHighRiskComplaintFlags(input: {
  complaint?: string | null;
  complaintCategory?: string | null;
  selectedFlagIds?: HighRiskComplaintFlagId[];
  detectedAt?: ISODateString;
}): HighRiskComplaintFlagRecord[] {
  const complaint = normalizeComplaint(input.complaint);
  const category = normalizeCategory(input.complaintCategory);
  const detectedAt = input.detectedAt || new Date().toISOString();
  const matches = new Map<HighRiskComplaintFlagId, HighRiskComplaintFlagRecord>();

  for (const definition of HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS) {
    const categoryMatch = definition.categories.some(
      (entry) => normalizeCategory(entry) === category,
    );
    const keywordMatch = definition.keywords.some((pattern) => pattern.test(complaint));

    if (categoryMatch || keywordMatch) {
      matches.set(definition.id, {
        id: definition.id,
        label: definition.label,
        detectedAt,
        source: categoryMatch ? 'complaint-category' : 'complaint-text',
      });
    }
  }

  for (const flagId of input.selectedFlagIds || []) {
    const definition = FLAG_DEFINITION_BY_ID.get(flagId);
    if (!definition) continue;
    matches.set(flagId, {
      id: flagId,
      label: definition.label,
      detectedAt,
      source: 'staff-selected',
    });
  }

  return Array.from(matches.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function mergeHighRiskComplaintFlags(
  existing: HighRiskComplaintFlagRecord[] = [],
  incoming: HighRiskComplaintFlagRecord[] = [],
): HighRiskComplaintFlagRecord[] {
  const merged = new Map<HighRiskComplaintFlagId, HighRiskComplaintFlagRecord>();
  for (const record of [...existing, ...incoming]) {
    merged.set(record.id, record);
  }
  return Array.from(merged.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function patientHasHighRiskComplaintFlags(patient: Patient): boolean {
  return Boolean(patient.highRiskComplaintFlags?.length);
}

export function patientNeedsRapidReview(patient: Patient): boolean {
  if (!patientHasHighRiskComplaintFlags(patient)) return false;
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) {
    return false;
  }
  if (patient.triageTime && patient.state === PatientState.Waiting) {
    return false;
  }
  return Boolean(patient.triagePending || !patient.triageTime);
}

export function deriveHighRiskComplaintQueueDestination(
  patient: Patient,
): QueueDestination | null {
  if (!patientNeedsRapidReview(patient)) return null;
  if (patient.state === PatientState.Registration || patient.state === PatientState.Arrival) {
    return 'rapid-review';
  }
  if (patient.state === PatientState.Triage) return 'rapid-review';
  return null;
}

/** Applies fast flags and operational routing — never changes clinical priority / CTAS. */
export function buildHighRiskComplaintPatch(
  patient: Partial<Patient> & {
    chiefComplaint?: string;
    complaint?: string;
    complaintCategory?: string;
  },
  options: {
    selectedFlagIds?: HighRiskComplaintFlagId[];
    detectedAt?: ISODateString;
  } = {},
): Partial<Patient> {
  const complaint = patient.chiefComplaint || patient.complaint || '';
  const detected = detectHighRiskComplaintFlags({
    complaint,
    complaintCategory: patient.complaintCategory,
    selectedFlagIds: options.selectedFlagIds,
    detectedAt: options.detectedAt,
  });

  if (!detected.length) return {};

  const highRiskComplaintFlags = mergeHighRiskComplaintFlags(
    patient.highRiskComplaintFlags,
    detected,
  );

  const patch: Partial<Patient> = { highRiskComplaintFlags };

  const needsReview = patientNeedsRapidReview({ ...patient, highRiskComplaintFlags } as Patient);
  if (needsReview) {
    patch.queueDestination = 'rapid-review';
    patch.triagePending = true;
  }

  return patch;
}

export function collectHighRiskComplaintLabels(patient: Patient): string[] {
  if (patient.highRiskComplaintFlags?.length) {
    return patient.highRiskComplaintFlags.map((record) => record.label);
  }

  return detectHighRiskComplaintFlags({
    complaint: patient.chiefComplaint || patient.complaint,
    complaintCategory: patient.complaintCategory,
  }).map((record) => record.label);
}

export function buildHighRiskComplaintAlerts(
  patients: Patient[] = [],
  now = new Date(),
): Alert[] {
  return patients
    .filter((patient) => patientHasHighRiskComplaintFlags(patient))
    .filter(
      (patient) =>
        patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
    )
    .map((patient) => {
      const labels = collectHighRiskComplaintLabels(patient);
      const displayName =
        [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
        patient.name ||
        patient.mrn ||
        'Unknown patient';
      const needsReview = patientNeedsRapidReview(patient);

      return {
        id: `high-risk-complaint-${patient.id}`,
        type: 'Clinical',
        severity: (needsReview ? 'Critical' : 'Warning') as import('../types/emergency').AlertSeverity,
        title: needsReview
          ? `Rapid review needed — ${displayName}`
          : `High-risk complaint — ${displayName}`,
        message: `${labels.join(', ')}. Staff review required — fast flags do not assign triage level.`,
        patientId: patient.id,
        createdAt: patient.arrivalTime || now.toISOString(),
        dismissed: false,
        source: 'high-risk-complaint-flags',
        actionType: 'triage',
        metadata: {
          flagIds: (patient.highRiskComplaintFlags?.map((record) => record.id) || []).join(','),
          labels: labels.join(','),
          needsRapidReview: needsReview,
          advisoryOnly: true,
        },
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function sortPatientsForRapidReview<T extends Patient>(patients: T[] = []): T[] {
  return [...patients].sort((left, right) => {
    const leftReview = patientNeedsRapidReview(left) ? 1 : 0;
    const rightReview = patientNeedsRapidReview(right) ? 1 : 0;
    if (leftReview !== rightReview) return rightReview - leftReview;
    return new Date(right.arrivalTime).getTime() - new Date(left.arrivalTime).getTime();
  });
}

export type HighRiskComplaintBoardSummary = {
  flaggedCount: number;
  rapidReviewCount: number;
  byFlagId: Record<HighRiskComplaintFlagId, number>;
  patients: Patient[];
};

/** Reception and waiting-room operational counts for fast flags. */
export function buildHighRiskComplaintBoardSummary(
  patients: Patient[] = [],
): HighRiskComplaintBoardSummary {
  const active = patients.filter(
    (patient) =>
      patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );
  const flagged = active.filter((patient) => patientHasHighRiskComplaintFlags(patient));
  const byFlagId = HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS.reduce(
    (accumulator, definition) => {
      accumulator[definition.id] = flagged.filter((patient) =>
        patient.highRiskComplaintFlags?.some((record) => record.id === definition.id),
      ).length;
      return accumulator;
    },
    {} as Record<HighRiskComplaintFlagId, number>,
  );

  return {
    flaggedCount: flagged.length,
    rapidReviewCount: flagged.filter((patient) => patientNeedsRapidReview(patient)).length,
    byFlagId,
    patients: sortPatientsForRapidReview(flagged),
  };
}

export type ApplyHighRiskComplaintFlagsOptions = {
  selectedFlagIds?: HighRiskComplaintFlagId[];
  complaint?: string;
  complaintCategory?: string;
  source?: string;
  actorName?: string;
};

export type HighRiskComplaintFlagStore = {
  patients: Patient[];
  updatePatient: (patientId: string, patch: Partial<Patient>) => void;
  recordWorkflowAction?: (input: {
    type: string;
    summary: string;
    patientId?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

/**
 * Applies staff-selected and text-detected fast flags.
 * Operational routing only — never changes clinical priority / CTAS.
 */
export function applyHighRiskComplaintFlags(
  store: HighRiskComplaintFlagStore,
  patientId: string,
  options: ApplyHighRiskComplaintFlagsOptions = {},
): HighRiskComplaintFlagRecord[] {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) return [];

  const patch = buildHighRiskComplaintPatch(
    {
      ...patient,
      chiefComplaint: options.complaint ?? patient.chiefComplaint,
      complaint: options.complaint ?? patient.complaint,
      complaintCategory: options.complaintCategory ?? patient.complaintCategory,
    },
    { selectedFlagIds: options.selectedFlagIds },
  );

  if (!patch.highRiskComplaintFlags?.length) return patient.highRiskComplaintFlags || [];

  store.updatePatient(patientId, patch);

  const labels = patch.highRiskComplaintFlags.map((record) => record.label);
  store.recordWorkflowAction?.({
    type: 'high_risk_complaint_flagged',
    summary: `High-risk complaint flags: ${labels.join(', ')}. Staff review required — fast flags do not assign triage level.`,
    patientId,
    source: options.source || 'high-risk-complaint-flags',
    metadata: {
      flagIds: patch.highRiskComplaintFlags.map((record) => record.id),
      needsRapidReview: patientNeedsRapidReview({ ...patient, ...patch } as Patient),
      advisoryOnly: true,
      actorName: options.actorName,
    },
  });

  store.dispatchWebSocketEvent?.({
    type: 'high_risk_complaint_sync',
    payload: {
      patientId,
      flagIds: patch.highRiskComplaintFlags.map((record) => record.id),
      labels,
      queueDestination: patch.queueDestination || patient.queueDestination,
      needsRapidReview: patientNeedsRapidReview({ ...patient, ...patch } as Patient),
      source: options.source || 'high-risk-complaint-flags',
      advisoryOnly: true,
      surfaces: ['reception', 'whiteboard', 'notification-center', 'waiting-room-safety-board'],
      generatedAt: new Date().toISOString(),
    },
  });

  return patch.highRiskComplaintFlags;
}
