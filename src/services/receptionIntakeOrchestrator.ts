import { CANONICAL_ROUTES } from '../config/routes.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { formatSyncRecoveryMessage } from '../config/errorRecoveryModel';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from '../config/emergencyRolePermissions';
import { startResponseTimer } from '../engine/threeMinuteTimerEngine';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Alert,
  type ArrivalMode,
  type HighRiskComplaintFlagRecord,
  type JourneyEvent,
  type Note,
  type Patient,
  type QuickSafetyFlag,
  type Sex,
} from '../types/emergency';
import {
  calculateAgeFromDob,
  type ReceptionQuickIntakeInput,
} from './receptionQuickIntakeService';
import { buildPatientArrivalRecord, syncPatientFromArrival } from './patientArrivalModel';
import { serializePatientForBackendApi } from './patientArrivalBackendSync';
import { completeReceptionHandoff } from './receptionHandoff';
import { buildClientTriageAssist } from './triageAssist';
import { createEmergencyPatient, createSmartIntakePatient } from './emergencyOsApi';
import {
  findDuplicateCandidates,
  type PatientDuplicateCandidate,
} from '../utils/patientDuplicateDetection';

export type ReceptionArrivalType =
  | 'walk-in'
  | 'ambulance-arrival'
  | 'ems-prearrival'
  | 'transfer'
  | 'referral'
  | 'staff-created-emergency';

export type ReceptionIntakeDraft = {
  id?: string;
  arrivalType: ReceptionArrivalType;
  chiefComplaint: string;
  estimatedAge?: string | number;
  dob?: string;
  sex?: Sex | '';
  consciousnessStatus?: 'alert' | 'confused' | 'drowsy' | 'unresponsive' | 'unknown' | '';
  breathingStatus?: 'normal' | 'short-of-breath' | 'labored' | 'not-breathing' | 'unknown' | '';
  visibleDistress?: 'none' | 'mild' | 'moderate' | 'severe' | 'unknown' | '';
  painLevel?: number | string | '';
  redFlagSymptoms?: string[];
  allergiesKnown?: 'yes' | 'no' | 'unknown';
  allergies?: string;
  medicationsKnown?: 'yes' | 'no' | 'unknown';
  medications?: string;
  firstName?: string;
  lastName?: string;
  contactCallback?: string;
  insuranceStatus?: 'captured' | 'missing' | 'deferred' | 'unknown';
  consentStatus?: 'captured' | 'deferred' | 'unable' | 'unknown';
  documentStatus?: 'captured' | 'missing' | 'deferred' | 'unknown';
  notes?: string;
  /** Preferred language for care (language_access skill). */
  preferredLanguage?: string;
  interpreterNeeded?: 'yes' | 'no' | 'unknown';
  nextOfKinName?: string;
  nextOfKinPhone?: string;
};

/** How hard we block create & route on incomplete safety fields. */
export type ReceptionRouteValidationMode = 'standard' | 'rapid' | 'crash';

export type ReceptionAiIntakeAssist = {
  generatedAt: string;
  missingCriticalFields: string[];
  redFlags: string[];
  suggestedQuestions: string[];
  urgencySuggestion: 'critical' | 'high' | 'standard';
  suggestedPriority: Priority;
  nextAction: string;
  confidence: number;
  safetyNotice: string;
  manualFallback: boolean;
};

export const UNIFIED_INTAKE_PHASE = Object.freeze({
  critical: 'critical',
  admin: 'admin',
} as const);

export type UnifiedIntakePhase = (typeof UNIFIED_INTAKE_PHASE)[keyof typeof UNIFIED_INTAKE_PHASE];

export type SmartIntakeFieldRow = {
  field: string;
  extracted?: string;
};

export type ReceptionBackendSyncStatus = 'synced' | 'pending' | 'skipped' | 'failed';

export type ReceptionRouteResult = {
  patient: Patient;
  patientId: string;
  aiAssist: ReceptionAiIntakeAssist;
  criticalAlertId?: string;
  responseTimerId?: string;
  queueName: string;
  nextRoute: string;
  profileRoute: string;
  missingCriticalFields: string[];
  redFlags: string[];
  clinicalOverrideBlocked: boolean;
  /** Backend create result for the reception intake patient. */
  backendSyncStatus: ReceptionBackendSyncStatus;
  backendSyncError?: string;
  backendPatientId?: string;
  /** Non-blocking duplicate matches from the local board before/after create. */
  duplicateCandidates: PatientDuplicateCandidate[];
};

/** OCR / verification field row accepted by mapSmartIntakeFieldsToDraft and apply helpers. */
export type IntakeFieldLike = {
  field?: string;
  name?: string;
  extracted?: string;
  value?: string;
  editedValue?: string;
  status?: string;
};

type OrchestratorOptions = {
  actorName?: string;
  actorStaffId?: string;
  aiUnavailable?: boolean;
  now?: string;
};

const HIGH_RISK_TERMS = [
  { term: 'chest pain', flag: 'Chest pain' },
  { term: 'pressure', flag: 'Chest pressure' },
  { term: 'shortness of breath', flag: 'Shortness of breath' },
  { term: 'breathing', flag: 'Breathing difficulty' },
  { term: 'stroke', flag: 'Stroke symptoms' },
  { term: 'face droop', flag: 'Stroke symptoms' },
  { term: 'weakness', flag: 'Focal weakness' },
  { term: 'syncope', flag: 'Syncope' },
  { term: 'collapse', flag: 'Collapse' },
  { term: 'unconscious', flag: 'Unconscious' },
  { term: 'seizure', flag: 'Seizure' },
  { term: 'bleeding', flag: 'Severe bleeding' },
  { term: 'anaphylaxis', flag: 'Anaphylaxis concern' },
  { term: 'allergic reaction', flag: 'Anaphylaxis concern' },
  { term: 'sepsis', flag: 'Sepsis concern' },
  { term: 'fever confusion', flag: 'Sepsis concern' },
  { term: 'pregnan', flag: 'Pregnancy emergency' },
  { term: 'suicid', flag: 'Self-harm risk' },
];

const FLAG_TO_PATIENT_FLAG: Record<string, PatientFlag> = {
  'Chest pain': PatientFlag.HighRisk,
  'Chest pressure': PatientFlag.HighRisk,
  'Shortness of breath': PatientFlag.HighRisk,
  'Breathing difficulty': PatientFlag.HighRisk,
  'Stroke symptoms': PatientFlag.StrokeCode,
  'Focal weakness': PatientFlag.StrokeCode,
  Syncope: PatientFlag.HighRisk,
  Collapse: PatientFlag.DeteriorationRisk,
  Unconscious: PatientFlag.DeteriorationRisk,
  'Altered mental status': PatientFlag.DeteriorationRisk,
  'Not breathing': PatientFlag.DeteriorationRisk,
  'Labored breathing': PatientFlag.HighRisk,
  'Severe visible distress': PatientFlag.DeteriorationRisk,
  'Severe pain': PatientFlag.HighRisk,
  'EMS arrival': PatientFlag.EMSArrival,
  Seizure: PatientFlag.DeteriorationRisk,
  'Severe bleeding': PatientFlag.HighRisk,
  'Anaphylaxis concern': PatientFlag.HighRisk,
  'Sepsis concern': PatientFlag.SepsisAlert,
  'Pregnancy emergency': PatientFlag.HighRisk,
  'Self-harm risk': PatientFlag.PsychAlert,
};

function createId(prefix: string, now = Date.now()): string {
  return `${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export function mapReceptionArrivalTypeToArrivalMode(arrivalType: ReceptionArrivalType): ArrivalMode {
  if (arrivalType === 'ambulance-arrival' || arrivalType === 'ems-prearrival') return 'EMS';
  if (arrivalType === 'transfer') return 'transfer';
  if (arrivalType === 'referral') return 'referral';
  return 'walk-in';
}

function normalizeAge(value: ReceptionIntakeDraft['estimatedAge']): number {
  const age = Number(value);
  return Number.isFinite(age) && age > 0 ? Math.round(age) : 0;
}

function getDraftAge(draft: ReceptionIntakeDraft): number {
  if (draft.dob) return calculateAgeFromDob(draft.dob);
  return normalizeAge(draft.estimatedAge);
}

function estimateDobFromAge(age: number, now: string): string {
  if (!age) return now.slice(0, 10);
  const date = new Date(now);
  date.setFullYear(date.getFullYear() - age, 0, 1);
  return date.toISOString().slice(0, 10);
}

function complaintCategoryFromFlags(redFlags: string[], complaint: string): string {
  const text = `${complaint} ${redFlags.join(' ')}`.toLowerCase();
  if (/chest|cardiac|pressure/.test(text)) return 'Cardiac';
  if (/breath|spo2|asthma|respir/.test(text)) return 'Respiratory';
  if (/stroke|weakness|neuro|seizure|confus/.test(text)) return 'Neurologic';
  if (/sepsis|fever|infection/.test(text)) return 'Sepsis';
  if (/trauma|bleed|injur/.test(text)) return 'Trauma';
  if (/pregnan|obstetric/.test(text)) return 'Obstetric';
  if (/suicid|psych|self-harm/.test(text)) return 'Mental Health';
  return 'General';
}

export function detectReceptionRedFlags(draft: ReceptionIntakeDraft): string[] {
  const complaint = String(draft.chiefComplaint || '').toLowerCase();
  const selected = draft.redFlagSymptoms || [];
  const detected = HIGH_RISK_TERMS
    .filter(({ term }) => complaint.includes(term))
    .map(({ flag }) => flag);

  if (draft.consciousnessStatus === 'unresponsive') detected.push('Unconscious');
  if (draft.consciousnessStatus === 'confused') detected.push('Altered mental status');
  if (draft.breathingStatus === 'not-breathing') detected.push('Not breathing');
  if (draft.breathingStatus === 'labored') detected.push('Labored breathing');
  if (draft.breathingStatus === 'short-of-breath') detected.push('Shortness of breath');
  if (draft.visibleDistress === 'severe') detected.push('Severe visible distress');
  if (Number(draft.painLevel) >= 8) detected.push('Severe pain');
  if (draft.arrivalType === 'ambulance-arrival' || draft.arrivalType === 'ems-prearrival') {
    detected.push('EMS arrival');
  }

  return unique([...selected, ...detected]);
}

/**
 * Resolve validation mode from draft + live urgency.
 * - standard: full critical set (quality registration)
 * - rapid: high urgency — identity optional, safety preferred not hard-blocked
 * - crash: critical red flags — complaint OR red flags only (identity provisional OK)
 */
export function resolveReceptionRouteValidationMode(
  draft: ReceptionIntakeDraft,
  options: { urgency?: 'critical' | 'high' | 'standard' | null } = {},
): ReceptionRouteValidationMode {
  const redFlags = detectReceptionRedFlags(draft);
  const urgency =
    options.urgency ||
    runReceptionAiIntakeAssist(draft).urgencySuggestion;
  if (urgency === 'critical' || redFlags.length >= 2) return 'crash';
  if (urgency === 'high' || redFlags.length >= 1) return 'rapid';
  return 'standard';
}

export function validateReceptionMinimumCriticalData(
  draft: ReceptionIntakeDraft,
  mode: ReceptionRouteValidationMode = 'standard',
): string[] {
  const missing: string[] = [];
  const hasComplaint = Boolean(String(draft.chiefComplaint || '').trim());
  const redFlags = detectReceptionRedFlags(draft);

  // Crash path: complaint OR observable red flags — never block on full safety matrix.
  if (mode === 'crash') {
    if (!hasComplaint && !redFlags.length) missing.push('chief complaint or critical red flag');
    return missing;
  }

  // Rapid path: need complaint; safety fields soft (not blocking).
  if (mode === 'rapid') {
    if (!hasComplaint) missing.push('chief complaint');
    return missing;
  }

  // Standard quality registration.
  if (!hasComplaint) missing.push('chief complaint');
  if (!draft.dob && !normalizeAge(draft.estimatedAge)) missing.push('estimated age or DOB');
  if (!draft.consciousnessStatus || draft.consciousnessStatus === 'unknown') {
    missing.push('consciousness status');
  }
  if (!draft.breathingStatus || draft.breathingStatus === 'unknown') {
    missing.push('breathing status');
  }
  if (!draft.visibleDistress || draft.visibleDistress === 'unknown') {
    missing.push('visible distress');
  }
  if (draft.painLevel === '' || draft.painLevel === undefined || draft.painLevel === null) {
    missing.push('pain level');
  }
  return missing;
}

/** Soft recommendations shown in UI — never hard-block rapid/crash route. */
export function listReceptionRecommendedSafetyFields(draft: ReceptionIntakeDraft): string[] {
  const recommended: string[] = [];
  if (!draft.consciousnessStatus || draft.consciousnessStatus === 'unknown') {
    recommended.push('consciousness');
  }
  if (!draft.breathingStatus || draft.breathingStatus === 'unknown') {
    recommended.push('breathing');
  }
  if (!draft.visibleDistress || draft.visibleDistress === 'unknown') {
    recommended.push('visible distress');
  }
  if (draft.painLevel === '' || draft.painLevel === undefined || draft.painLevel === null) {
    recommended.push('pain level');
  }
  return recommended;
}

function resolvePriority(redFlags: string[], draft: ReceptionIntakeDraft): Priority {
  const critical = redFlags.some((flag) =>
    /not breathing|unconscious|stroke|severe visible distress|collapse|severe bleeding|anaphylaxis/i.test(flag),
  );
  const severeChestPain =
    redFlags.some((flag) => /chest|pressure/i.test(flag)) && Number(draft.painLevel) >= 7;
  if (critical) return Priority.P1;
  if (severeChestPain) return Priority.P1;
  if (redFlags.length || draft.arrivalType === 'ambulance-arrival' || draft.arrivalType === 'ems-prearrival') {
    return Priority.P2;
  }
  return Priority.P3;
}

function suggestedQuestions(draft: ReceptionIntakeDraft, redFlags: string[], missing: string[]): string[] {
  const questions: string[] = [];
  if (redFlags.some((flag) => /chest|pressure/i.test(flag))) {
    questions.push('When did the chest pain start, and does it radiate to the arm, jaw, or back?');
  }
  if (redFlags.some((flag) => /breath|not breathing/i.test(flag))) {
    questions.push('Can the patient speak full sentences, and are lips or fingers blue?');
  }
  if (redFlags.some((flag) => /stroke|weakness|mental/i.test(flag))) {
    questions.push('What time was the patient last known well?');
  }
  if (redFlags.some((flag) => /sepsis|fever/i.test(flag))) {
    questions.push('Has there been fever, confusion, rash, or recent infection?');
  }
  if (missing.includes('allergies')) questions.push('Any known allergies?');
  if (!String(draft.contactCallback || '').trim()) questions.push('Is there a callback number or support person available?');
  if (!questions.length) questions.push('Any allergies, current medications, or recent deterioration while waiting?');
  return questions.slice(0, 4);
}

export function runReceptionAiIntakeAssist(
  draft: ReceptionIntakeDraft,
  options: { aiUnavailable?: boolean; now?: string } = {},
): ReceptionAiIntakeAssist {
  const now = options.now || new Date().toISOString();
  const redFlags = detectReceptionRedFlags(draft);
  const suggestedPriority = resolvePriority(redFlags, draft);
  const urgencySuggestion =
    suggestedPriority === Priority.P1 ? 'critical' : suggestedPriority === Priority.P2 ? 'high' : 'standard';
  const mode =
    urgencySuggestion === 'critical' || redFlags.length >= 2
      ? 'crash'
      : urgencySuggestion === 'high' || redFlags.length >= 1
        ? 'rapid'
        : 'standard';
  const missingCriticalFields = validateReceptionMinimumCriticalData(draft, mode);
  const nextAction =
    urgencySuggestion === 'critical'
      ? 'Start 3-minute response and route to priority triage.'
      : urgencySuggestion === 'high'
        ? 'Notify triage nurse and keep registration moving.'
        : 'Create patient and route to the standard triage queue.';

  return {
    generatedAt: now,
    missingCriticalFields,
    redFlags,
    suggestedQuestions: suggestedQuestions(draft, redFlags, missingCriticalFields),
    urgencySuggestion,
    suggestedPriority,
    nextAction,
    confidence: options.aiUnavailable ? 0.42 : Math.min(0.94, 0.72 + redFlags.length * 0.04),
    safetyNotice: options.aiUnavailable
      ? 'Desk assist is unavailable. Manual intake fallback is active; clinical staff must review.'
      : mode === 'standard'
        ? 'Desk assist is decision support only. Reception cannot assign final triage level.'
        : `Rapid route mode (${mode}): complete complaint and send — full safety fields preferred but not required.`,
    manualFallback: Boolean(options.aiUnavailable),
  };
}

function buildFlagRecords(redFlags: string[], now: string): HighRiskComplaintFlagRecord[] {
  return redFlags.map((flag) => ({
    id: flag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') as HighRiskComplaintFlagRecord['id'],
    label: flag,
    detectedAt: now,
    source: 'staff-selected',
  }));
}

function patientFlagsFromDraft(
  draft: ReceptionIntakeDraft,
  redFlags: string[],
): PatientFlag[] {
  const flags = redFlags
    .map((flag) => FLAG_TO_PATIENT_FLAG[flag] || (flag === 'Altered mental status' ? PatientFlag.DeteriorationRisk : null))
    .filter((flag): flag is PatientFlag => Boolean(flag));
  if (draft.arrivalType === 'ambulance-arrival' || draft.arrivalType === 'ems-prearrival') {
    flags.push(PatientFlag.EMSArrival);
  }
  if (!String(draft.firstName || '').trim() && !String(draft.lastName || '').trim()) {
    flags.push(PatientFlag.IdentityPending);
  }
  return [...new Set(flags)];
}

function quickSafetyFlags(flags: PatientFlag[]): QuickSafetyFlag[] {
  return flags.filter((flag): flag is QuickSafetyFlag =>
    [
      PatientFlag.HighRisk,
      PatientFlag.StrokeCode,
      PatientFlag.SepsisAlert,
      PatientFlag.PsychAlert,
      PatientFlag.Isolation,
      PatientFlag.DeterioratingNeuro,
    ].includes(flag),
  );
}

function buildReceptionIntakeNote(
  draft: ReceptionIntakeDraft,
  aiAssist: ReceptionAiIntakeAssist,
  actorName: string,
  now: string,
): Note {
  const body = [
    `Reception intake by ${actorName}.`,
    `Consciousness: ${draft.consciousnessStatus || 'unknown'}.`,
    `Breathing: ${draft.breathingStatus || 'unknown'}.`,
    `Distress: ${draft.visibleDistress || 'unknown'}.`,
    `Pain: ${draft.painLevel || 'unknown'}.`,
    `Language: ${draft.preferredLanguage || 'not captured'}; interpreter: ${draft.interpreterNeeded || 'unknown'}.`,
    draft.nextOfKinName || draft.nextOfKinPhone
      ? `Next of kin: ${draft.nextOfKinName || '—'} ${draft.nextOfKinPhone || ''}`.trim()
      : '',
    `Allergies: ${draft.allergiesKnown || 'unknown'}${draft.allergies ? ` - ${draft.allergies}` : ''}.`,
    `Medications: ${draft.medicationsKnown || 'unknown'}${draft.medications ? ` - ${draft.medications}` : ''}.`,
    `Admin: insurance ${draft.insuranceStatus || 'unknown'}, consent ${draft.consentStatus || 'unknown'}, documents ${draft.documentStatus || 'unknown'}.`,
    draft.notes ? `Notes: ${draft.notes}` : '',
    `Desk assist: ${aiAssist.nextAction}`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: createId('reception-intake-note'),
    type: 'Intake',
    body,
    text: body,
    authorId: 'reception',
    authorStaffId: 'reception',
    createdAt: now,
    timestamp: now,
    metadata: {
      source: 'reception-command-desk',
      aiConfidence: aiAssist.confidence,
      manualFallback: aiAssist.manualFallback,
      redFlags: aiAssist.redFlags.join(', '),
      preferredLanguage: draft.preferredLanguage || '',
      interpreterNeeded: draft.interpreterNeeded || 'unknown',
      nextOfKinName: draft.nextOfKinName || '',
      nextOfKinPhone: draft.nextOfKinPhone || '',
    },
  };
}

function buildReceptionPatient(
  draft: ReceptionIntakeDraft,
  aiAssist: ReceptionAiIntakeAssist,
  options: Required<Pick<OrchestratorOptions, 'actorName' | 'now'>>,
): Patient {
  const redFlags = aiAssist.redFlags;
  const now = options.now;
  const age = getDraftAge(draft);
  const dob = draft.dob || estimateDobFromAge(age, now);
  const firstName = String(draft.firstName || '').trim() || 'Unknown';
  const lastName =
    String(draft.lastName || '').trim() ||
    (firstName === 'Unknown' ? `Patient ${now.slice(11, 16).replace(':', '')}` : 'Patient');
  const arrivalMode = mapReceptionArrivalTypeToArrivalMode(draft.arrivalType);
  const priority = aiAssist.suggestedPriority;
  const flags = patientFlagsFromDraft(draft, redFlags);
  const complaint = String(draft.chiefComplaint || '').trim() || redFlags[0] || 'Emergency arrival';
  const complaintCategory = complaintCategoryFromFlags(redFlags, complaint);
  const arrival = buildPatientArrivalRecord({
    arrivalMode,
    arrivalTimestamp: now,
    chiefComplaint: complaint,
    state: PatientState.Registration,
    triageAcuity: {
      code: priority,
      status: 'suggested',
      suggestedAt: aiAssist.generatedAt,
      suggestionSource: 'triage-assist',
    },
    queueDestination: priority === Priority.P1 || priority === Priority.P2 ? 'rapid-review' : 'verification',
    triagePending: priority === Priority.P1 || priority === Priority.P2,
    registrationStatus:
      firstName === 'Unknown' || draft.documentStatus === 'missing' || draft.insuranceStatus === 'missing'
        ? 'provisional'
        : 'in-progress',
    waitingRoomStatus: 'registered',
    firstContactAt: now,
  });

  const base = syncPatientFromArrival(
    {
      id: createId('patient'),
      mrn: `ED-${Math.floor(100000 + Math.random() * 900000)}`,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      dob,
      age,
      sex: draft.sex || 'Unknown',
      complaintCategory,
      state: PatientState.Registration,
      priority,
      vitals: [],
      flags,
      notes: [buildReceptionIntakeNote(draft, aiAssist, options.actorName, now)],
      timeline: [],
      phone: String(draft.contactCallback || '').trim() || undefined,
      mobilePhone: String(draft.contactCallback || '').trim() || undefined,
      highRiskComplaintFlags: buildFlagRecords(redFlags, now),
      quickSafetyFlags: quickSafetyFlags(flags),
      updatedAt: now,
    },
    arrival,
  ) as Patient;

  const timeline: JourneyEvent[] = [
    {
      id: createId('timeline-reception-arrival'),
      patientId: base.id,
      type: 'Arrival',
      timestamp: now,
      to: PatientState.Registration,
      summary: `Reception arrival captured: ${complaint}.`,
      metadata: {
        arrivalType: draft.arrivalType,
        urgencySuggestion: aiAssist.urgencySuggestion,
        suggestedPriority: priority,
      },
    },
  ];

  return { ...base, timeline };
}

function buildCriticalAlert(
  patient: Patient,
  aiAssist: ReceptionAiIntakeAssist,
  now: string,
): Alert {
  const alertId = createId('reception-critical-alert');
  const responseTimerId = `tmr_${patient.id}_${alertId}`;
  return {
    id: alertId,
    type: 'Queue',
    severity: 'Critical',
    title: 'Critical reception arrival',
    message: `${patient.firstName} ${patient.lastName}: ${aiAssist.redFlags.join(', ')}. Notify triage nurse, charge nurse, and emergency physician.`,
    patientId: patient.id,
    createdAt: now,
    dismissed: false,
    read: false,
    acknowledged: false,
    source: 'reception-critical-intake',
    actionLabel: 'View Patient',
    actionType: 'VIEW_PATIENT',
    metadata: {
      redFlags: aiAssist.redFlags.join(', '),
      notifyRoles: 'triage_nurse,charge_nurse,emergency_physician',
      responseStartedAt: now,
      responseDeadlineAt: new Date(new Date(now).getTime() + 180000).toISOString(),
      responseTimerId,
      aiConfidence: aiAssist.confidence,
      nextAction: aiAssist.nextAction,
    },
  };
}

function notifyCriticalReceptionStaff(
  store: ReturnType<typeof useEmergencyStore.getState>,
  patient: Patient,
  alert: Alert,
  aiAssist: ReceptionAiIntakeAssist,
  options: OrchestratorOptions,
) {
  const actorName = options.actorName || 'Reception';
  store.recordWorkflowAction({
    type: 'integration_event_received',
    title: 'Critical reception notification',
    summary: `${patient.firstName} ${patient.lastName} routed as ${aiAssist.urgencySuggestion}; triage nurse, charge nurse, and emergency physician notified.`,
    patientId: patient.id,
    actorStaffId: options.actorStaffId,
    actorName,
    timestamp: alert.createdAt,
    source: 'reception-intake-orchestrator',
    severity: 'Critical',
    metadata: {
      alertId: alert.id,
      responseTimerId: String(alert.metadata?.responseTimerId || ''),
      notifyRoles: String(alert.metadata?.notifyRoles || ''),
      redFlags: aiAssist.redFlags.join(', '),
    },
  });

  store.dispatchWebSocketEvent?.({
    type: 'reception_critical_arrival',
    payload: {
      patientId: patient.id,
      alertId: alert.id,
      redFlags: aiAssist.redFlags,
      notifyRoles: ['triage_nurse', 'charge_nurse', 'emergency_physician'],
      generatedAt: alert.createdAt,
    },
  });
}

export function canReceptionPerformClinicalOverride(role: string | null | undefined): boolean {
  const normalized = normalizeEmergencyRole(role);
  return normalized !== EMERGENCY_ROLE_IDS.registrationClerk && normalized !== 'emergency_receptionist';
}

export function assertReceptionMutationAllowed(
  role: string | null | undefined,
  action: string,
): { allowed: boolean; reason?: string } {
  const normalized = normalizeEmergencyRole(role);
  if (
    normalized === EMERGENCY_ROLE_IDS.registrationClerk &&
    [EMERGENCY_ACTIONS.triage, EMERGENCY_ACTIONS.manageFlags, EMERGENCY_ACTIONS.dischargePatient].includes(action as any)
  ) {
    return {
      allowed: false,
      reason: 'Reception can capture intake and escalate, but cannot assign final triage, edit diagnosis, or resolve clinical alerts.',
    };
  }
  return { allowed: true };
}

/**
 * Persist a newly built reception patient to the emergency OS backend.
 * Awaits create so reception UI can surface success/failure (no silent fire-and-forget).
 * Local chart remains usable when the backend is down.
 */
export async function syncReceptionPatientToBackend(
  patient: Patient,
): Promise<{
  status: ReceptionBackendSyncStatus;
  backendPatientId?: string;
  error?: string;
}> {
  const canSyncSmartIntake = isBackendCapabilityEnabled('emergencySmartIntake');
  const canSyncPatients = isBackendCapabilityEnabled('emergencyPatients');
  if (!canSyncSmartIntake && !canSyncPatients) {
    return { status: 'skipped' };
  }

  try {
    const payload = serializePatientForBackendApi(patient);
    const response = canSyncSmartIntake
      ? await createSmartIntakePatient(payload)
      : await createEmergencyPatient(payload);
    const remotePatient =
      response?.data?.patient ||
      response?.patient ||
      (response?.data && response.data.id ? response.data : null) ||
      response;
    const backendPatientId =
      (remotePatient && typeof remotePatient === 'object' && remotePatient.id
        ? String(remotePatient.id)
        : undefined) || patient.id;
    return { status: 'synced', backendPatientId };
  } catch (error) {
    return {
      status: 'failed',
      error: formatSyncRecoveryMessage(error),
    };
  }
}

export async function createPatientAndRouteFromReception(
  intakeDraft: ReceptionIntakeDraft,
  options: OrchestratorOptions = {},
): Promise<ReceptionRouteResult> {
  const store = useEmergencyStore.getState();
  const now = options.now || new Date().toISOString();
  const actorName = options.actorName || 'Reception Desk';
  const aiAssist = runReceptionAiIntakeAssist(intakeDraft, {
    aiUnavailable: options.aiUnavailable,
    now,
  });

  if (!String(intakeDraft.chiefComplaint || '').trim() && !aiAssist.redFlags.length) {
    throw new Error('Capture a chief complaint or observable critical red flag before routing.');
  }

  const duplicateCandidates = findDuplicateCandidates(
    store.patients,
    {
      firstName: intakeDraft.firstName,
      lastName: intakeDraft.lastName,
      dateOfBirth: intakeDraft.dob,
      phone: intakeDraft.contactCallback,
      sex: intakeDraft.sex,
    },
    { minScore: 35, limit: 5 },
  );

  const patient = buildReceptionPatient(intakeDraft, aiAssist, { actorName, now });
  const triageAssist = buildClientTriageAssist(patient, store.patients, {
    arrivalReason: patient.chiefComplaint,
    complaintCategory: patient.complaintCategory,
    handoffSource: 'reception-command-desk',
  });
  const enrichedPatient: Patient = {
    ...patient,
    triageAssist,
    triageAssistGeneratedAt: triageAssist.generatedAt,
  };

  // Local-first create; backend sync is awaited explicitly below (not fire-and-forget).
  store.addPatient(enrichedPatient, { syncToBackend: false });

  const backendSync = await syncReceptionPatientToBackend(enrichedPatient);
  if (backendSync.status === 'synced') {
    useEmergencyStore.getState().updatePatient(
      enrichedPatient.id,
      {
        handoffSyncPending: false,
        handoffSyncError: undefined,
        ...(backendSync.backendPatientId && backendSync.backendPatientId !== enrichedPatient.id
          ? { backendPatientId: backendSync.backendPatientId }
          : {}),
      } as unknown as Partial<Patient>,
    );
  } else if (backendSync.status === 'failed') {
    useEmergencyStore.getState().updatePatient(
      enrichedPatient.id,
      {
        handoffSyncPending: true,
        handoffSyncError: backendSync.error,
      } as unknown as Partial<Patient>,
    );
  }

  const afterCreate = useEmergencyStore.getState();
  afterCreate.registerArrivalControl(enrichedPatient.id, { source: 'reception-command-desk' });
  afterCreate.recordWorkflowAction({
    type: 'patient_created',
    title: 'Reception intake draft created',
    summary: `${enrichedPatient.firstName} ${enrichedPatient.lastName} captured at reception and prepared for queue routing.`,
    patientId: enrichedPatient.id,
    actorStaffId: options.actorStaffId,
    actorName,
    timestamp: now,
    source: 'reception-intake-orchestrator',
    severity: aiAssist.urgencySuggestion === 'critical' ? 'Critical' : aiAssist.urgencySuggestion === 'high' ? 'Warning' : 'Info',
    metadata: {
      arrivalType: intakeDraft.arrivalType,
      missingCriticalFields: aiAssist.missingCriticalFields.join(', '),
      redFlags: aiAssist.redFlags.join(', '),
      aiConfidence: aiAssist.confidence,
      manualFallback: aiAssist.manualFallback,
      backendSyncStatus: backendSync.status,
      backendPatientId: backendSync.backendPatientId || '',
    },
  });

  const handoff = completeReceptionHandoff(useEmergencyStore.getState(), {
    patientId: enrichedPatient.id,
    source: 'reception',
    actorName,
  });

  if (enrichedPatient.registrationStatus === 'provisional') {
    const latestPatient = useEmergencyStore.getState().patients.find((entry) => entry.id === enrichedPatient.id);
    useEmergencyStore.getState().updatePatient(enrichedPatient.id, {
      registrationStatus: 'provisional',
      arrival: latestPatient?.arrival
        ? {
            ...latestPatient.arrival,
            registrationStatus: 'provisional',
          }
        : enrichedPatient.arrival,
    });
  }

  let criticalAlertId: string | undefined;
  let responseTimerId: string | undefined;
  if (aiAssist.urgencySuggestion === 'critical') {
    const criticalAlert = buildCriticalAlert(enrichedPatient, aiAssist, now);
    const latest = useEmergencyStore.getState();
    latest.addAlert(criticalAlert);
    responseTimerId = startResponseTimer(enrichedPatient.id, criticalAlert.id, 'triage_nurse');
    criticalAlertId = criticalAlert.id;
    notifyCriticalReceptionStaff(latest, enrichedPatient, criticalAlert, aiAssist, options);
  } else if (aiAssist.urgencySuggestion === 'high') {
    useEmergencyStore.getState().recordWorkflowAction({
      type: 'integration_event_received',
      title: 'High-risk reception route',
      summary: `${enrichedPatient.firstName} ${enrichedPatient.lastName} flagged for triage nurse review.`,
      patientId: enrichedPatient.id,
      actorStaffId: options.actorStaffId,
      actorName,
      timestamp: now,
      source: 'reception-intake-orchestrator',
      severity: 'Warning',
      metadata: {
        redFlags: aiAssist.redFlags.join(', '),
        notifyRoles: 'triage_nurse',
      },
    });
  }

  void import('./emergencyCareJourneyOrchestrator').then(({ onRapidIntakeCompleted }) =>
    onRapidIntakeCompleted(enrichedPatient, {
      criticalAlertId,
      actorName,
    }),
  ).catch((error) => {
    console.error('[ReceptionIntakeOrchestrator] onRapidIntakeCompleted failed:', error);
  });

  void import('../engine/unifiedWorkflowAutomationEngine').then(({ scheduleWorkflowAutomationRefresh }) =>
    scheduleWorkflowAutomationRefresh('patient_created'),
  ).catch((error) => {
    console.error('[ReceptionIntakeOrchestrator] scheduleWorkflowAutomationRefresh failed:', error);
  });

  const latestPatient =
    useEmergencyStore.getState().patients.find((entry) => entry.id === enrichedPatient.id) || enrichedPatient;

  return {
    patient: {
      ...latestPatient,
      state: PatientState.Triage,
      registrationStatus: enrichedPatient.registrationStatus === 'provisional' ? 'provisional' : 'complete',
      queueDestination: 'triage-queue',
      triagePending: true,
    },
    patientId: enrichedPatient.id,
    aiAssist,
    criticalAlertId,
    responseTimerId,
    queueName: handoff.queue || 'Triage',
    nextRoute: handoff.nextRoute,
    profileRoute: `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(enrichedPatient.id)}`,
    missingCriticalFields: aiAssist.missingCriticalFields,
    redFlags: aiAssist.redFlags,
    clinicalOverrideBlocked: !canReceptionPerformClinicalOverride(EMERGENCY_ROLE_IDS.registrationClerk),
    backendSyncStatus: backendSync.status,
    backendSyncError: backendSync.error,
    backendPatientId: backendSync.backendPatientId,
    duplicateCandidates,
  };
}

/** Live board duplicate scan for reception draft fields (non-mutating). */
export function scanReceptionDraftDuplicates(
  draft: ReceptionIntakeDraft,
  patients: Patient[] = useEmergencyStore.getState().patients,
): PatientDuplicateCandidate[] {
  if (!String(draft.firstName || '').trim() && !String(draft.lastName || '').trim() && !draft.dob) {
    return [];
  }
  return findDuplicateCandidates(
    patients,
    {
      firstName: draft.firstName,
      lastName: draft.lastName,
      dateOfBirth: draft.dob,
      phone: draft.contactCallback,
      sex: draft.sex,
    },
    { minScore: 35, limit: 5 },
  );
}

const ARRIVAL_MODE_TO_RECEPTION_TYPE: Record<ArrivalMode, ReceptionArrivalType> = {
  'walk-in': 'walk-in',
  EMS: 'ambulance-arrival',
  referral: 'referral',
  transfer: 'transfer',
  police: 'staff-created-emergency',
  'self-check-in': 'walk-in',
};

const COMPLAINT_FLAG_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  shortness_of_breath: 'Shortness of breath',
  stroke_symptoms: 'Stroke symptoms',
  severe_bleeding: 'Severe bleeding',
  sepsis_concern: 'Sepsis concern',
  anaphylaxis_concern: 'Anaphylaxis concern',
  altered_mental_status: 'Altered mental status',
  severe_pain: 'Severe pain',
  pregnancy_emergency: 'Pregnancy emergency',
  self_harm_risk: 'Self-harm risk',
};

function fieldValue(fields: SmartIntakeFieldRow[], fieldName: string, fallback = ''): string {
  return String(fields.find((field) => field.field === fieldName)?.extracted || fallback).trim();
}

/** Infer minimum critical defaults so compact intake surfaces can route in one click. */
export function enrichIntakeDraftCriticalDefaults(
  draft: ReceptionIntakeDraft,
  hints: { quickSafetyFlags?: QuickSafetyFlag[]; complaint?: string } = {},
): ReceptionIntakeDraft {
  const redFlags = detectReceptionRedFlags(draft);
  const safetyFlags = hints.quickSafetyFlags || [];
  const complaint = String(hints.complaint || draft.chiefComplaint || '').toLowerCase();

  const consciousnessStatus =
    draft.consciousnessStatus && draft.consciousnessStatus !== 'unknown'
      ? draft.consciousnessStatus
      : redFlags.some((flag) => /unconscious|altered mental/i.test(flag)) || safetyFlags.includes(PatientFlag.DeterioratingNeuro)
        ? 'confused'
        : 'alert';

  const breathingStatus =
    draft.breathingStatus && draft.breathingStatus !== 'unknown'
      ? draft.breathingStatus
      : redFlags.some((flag) => /not breathing|labored|shortness/i.test(flag)) || /breath|sob|dyspnea/.test(complaint)
        ? 'short-of-breath'
        : 'normal';

  const visibleDistress =
    draft.visibleDistress && draft.visibleDistress !== 'unknown'
      ? draft.visibleDistress
      : redFlags.some((flag) => /severe|collapse|unconscious/i.test(flag)) ||
          safetyFlags.includes(PatientFlag.HighRisk) ||
          safetyFlags.includes(PatientFlag.StrokeCode)
        ? 'severe'
        : safetyFlags.length
          ? 'moderate'
          : 'none';

  const painLevel =
    draft.painLevel === '' || draft.painLevel === undefined || draft.painLevel === null
      ? redFlags.some((flag) => /chest|severe pain/i.test(flag)) || /pain|pressure/.test(complaint)
        ? 8
        : 2
      : draft.painLevel;

  const estimatedAge =
    draft.dob || normalizeAge(draft.estimatedAge)
      ? draft.estimatedAge
      : draft.estimatedAge || 30;

  return {
    ...draft,
    consciousnessStatus,
    breathingStatus,
    visibleDistress,
    painLevel,
    estimatedAge,
  };
}

export function mapQuickIntakeInputToDraft(input: ReceptionQuickIntakeInput): ReceptionIntakeDraft {
  const redFlagSymptoms = (input.selectedComplaintFlags || [])
    .map((flagId) => COMPLAINT_FLAG_LABELS[flagId] || String(flagId).replace(/_/g, ' '))
    .filter(Boolean);

  return enrichIntakeDraftCriticalDefaults(
    {
      arrivalType: ARRIVAL_MODE_TO_RECEPTION_TYPE[input.arrivalMode] || 'walk-in',
      chiefComplaint: input.complaint.trim(),
      estimatedAge: input.dob ? '' : '',
      dob: input.dob || '',
      sex: input.existingPatient?.sex || '',
      consciousnessStatus: 'unknown',
      breathingStatus: 'unknown',
      visibleDistress: 'unknown',
      painLevel: '',
      redFlagSymptoms,
      allergiesKnown: 'unknown',
      medicationsKnown: 'unknown',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      contactCallback: input.phone?.trim() || '',
      insuranceStatus: 'unknown',
      consentStatus: 'unknown',
      documentStatus: input.healthCard?.trim() ? 'captured' : 'unknown',
      notes: input.quickNotes?.trim() || '',
    },
    { quickSafetyFlags: input.quickSafetyFlags, complaint: input.complaint },
  );
}

export function mapSmartIntakeFieldsToDraft(
  fields: SmartIntakeFieldRow[],
  options: {
    arrivalType?: ReceptionArrivalType;
    complaint?: string;
    sessionId?: string;
  } = {},
): ReceptionIntakeDraft {
  const chiefComplaint =
    options.complaint?.trim() ||
    fieldValue(fields, 'chiefComplaint') ||
    fieldValue(fields, 'complaint') ||
    'Smart Intake arrival';

  return enrichIntakeDraftCriticalDefaults({
    arrivalType: options.arrivalType || 'walk-in',
    chiefComplaint,
    estimatedAge: '',
    dob: fieldValue(fields, 'dateOfBirth'),
    sex: (fieldValue(fields, 'sex', '') as Sex) || '',
    consciousnessStatus: 'unknown',
    breathingStatus: 'unknown',
    visibleDistress: 'unknown',
    painLevel: '',
    redFlagSymptoms: [],
    allergiesKnown: fieldValue(fields, 'allergies') ? 'yes' : 'unknown',
    allergies: fieldValue(fields, 'allergies'),
    medicationsKnown: fieldValue(fields, 'medications') ? 'yes' : 'unknown',
    medications: fieldValue(fields, 'medications'),
    firstName: fieldValue(fields, 'firstName') || 'Unknown',
    lastName: fieldValue(fields, 'lastName') || 'Patient',
    contactCallback: fieldValue(fields, 'phone'),
    insuranceStatus: fieldValue(fields, 'healthCardNumber') ? 'captured' : 'deferred',
    consentStatus: 'deferred',
    documentStatus: 'captured',
    notes: options.sessionId ? `Smart Intake session ${options.sessionId}` : '',
  });
}

/** Canonical routing entry for compact intake surfaces (quick intake, express registration). */
export async function routeQuickIntakeThroughOrchestrator(
  input: ReceptionQuickIntakeInput,
  options: OrchestratorOptions = {},
): Promise<ReceptionRouteResult> {
  const draft = mapQuickIntakeInputToDraft(input);
  return createPatientAndRouteFromReception(draft, options);
}

/** Canonical routing entry after Smart Intake identity verification. */
export async function routeSmartIntakeThroughOrchestrator(
  fields: SmartIntakeFieldRow[],
  options: OrchestratorOptions & {
    arrivalType?: ReceptionArrivalType;
    complaint?: string;
    sessionId?: string;
  } = {},
): Promise<ReceptionRouteResult> {
  const draft = mapSmartIntakeFieldsToDraft(fields, {
    arrivalType: options.arrivalType,
    complaint: options.complaint,
    sessionId: options.sessionId,
  });
  return createPatientAndRouteFromReception(draft, options);
}

export function resolveUnifiedIntakePrimaryAction(
  draft: ReceptionIntakeDraft,
  aiAssist: ReceptionAiIntakeAssist | null,
): { label: string; startsThreeMinuteResponse: boolean; tone: 'critical' | 'primary' } {
  const urgency = aiAssist?.urgencySuggestion || runReceptionAiIntakeAssist(draft).urgencySuggestion;
  if (urgency === 'critical') {
    return {
      label: 'Start 3-minute response & route',
      startsThreeMinuteResponse: true,
      tone: 'critical',
    };
  }
  if (urgency === 'high') {
    return { label: 'Create & route to priority triage', startsThreeMinuteResponse: false, tone: 'primary' };
  }
  return { label: 'Create patient & route to triage', startsThreeMinuteResponse: false, tone: 'primary' };
}

function intakeFieldName(row: IntakeFieldLike): string {
  return String(row.field || row.name || '').trim();
}

function intakeFieldValue(row: IntakeFieldLike): string {
  if (row.status === 'rejected') return '';
  if (row.status === 'edited' && row.editedValue != null) return String(row.editedValue).trim();
  return String(row.editedValue || row.extracted || row.value || '').trim();
}

/** Normalize OCR / verification fields into SmartIntakeFieldRow for draft mapping. */
export function mapOcrOrExtractedFieldsToSmartIntakeRows(fields: IntakeFieldLike[] = []): SmartIntakeFieldRow[] {
  return fields
    .map((row) => ({
      field: intakeFieldName(row),
      extracted: intakeFieldValue(row),
    }))
    .filter((row) => row.field && row.extracted);
}

/**
 * Merge staff-accepted OCR / identity fields into a reception intake draft.
 * Does not auto-create a patient — caller still routes after human review.
 */
export function applyExtractedFieldsToReceptionDraft(
  draft: ReceptionIntakeDraft,
  fields: IntakeFieldLike[],
  options: { complaint?: string; arrivalType?: ReceptionArrivalType; sessionId?: string } = {},
): ReceptionIntakeDraft {
  const rows = mapOcrOrExtractedFieldsToSmartIntakeRows(fields);
  if (!rows.length) return draft;
  const mapped = mapSmartIntakeFieldsToDraft(rows, {
    arrivalType: options.arrivalType || draft.arrivalType,
    complaint: options.complaint || draft.chiefComplaint,
    sessionId: options.sessionId,
  });
  return {
    ...draft,
    firstName: mapped.firstName || draft.firstName,
    lastName: mapped.lastName || draft.lastName,
    dob: mapped.dob || draft.dob,
    sex: mapped.sex || draft.sex,
    contactCallback: mapped.contactCallback || draft.contactCallback,
    allergies: mapped.allergies || draft.allergies,
    allergiesKnown: mapped.allergies ? 'yes' : draft.allergiesKnown,
    medications: mapped.medications || draft.medications,
    medicationsKnown: mapped.medications ? 'yes' : draft.medicationsKnown,
    insuranceStatus:
      mapped.insuranceStatus && mapped.insuranceStatus !== 'unknown'
        ? mapped.insuranceStatus
        : draft.insuranceStatus,
    documentStatus: 'captured',
    chiefComplaint: String(draft.chiefComplaint || '').trim()
      ? draft.chiefComplaint
      : mapped.chiefComplaint,
    notes: [draft.notes, mapped.notes].filter(Boolean).join(' · ') || draft.notes,
  };
}
