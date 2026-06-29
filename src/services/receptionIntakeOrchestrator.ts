import { CANONICAL_ROUTES } from '../config/routes.config';
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
import { calculateAgeFromDob } from './receptionQuickIntakeService';
import { buildPatientArrivalRecord, syncPatientFromArrival } from './patientArrivalModel';
import { completeReceptionHandoff } from './receptionHandoff';
import { buildClientTriageAssist } from './triageAssist';

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
};

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

export function validateReceptionMinimumCriticalData(draft: ReceptionIntakeDraft): string[] {
  const missing: string[] = [];
  if (!String(draft.chiefComplaint || '').trim()) missing.push('chief complaint');
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
  const missingCriticalFields = validateReceptionMinimumCriticalData(draft);
  const suggestedPriority = resolvePriority(redFlags, draft);
  const urgencySuggestion =
    suggestedPriority === Priority.P1 ? 'critical' : suggestedPriority === Priority.P2 ? 'high' : 'standard';
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
      ? 'AI Intake Assist is unavailable. Manual intake fallback is active; clinical staff must review.'
      : 'AI is decision support only. Reception cannot assign final triage level or override clinical escalation.',
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
    `Allergies: ${draft.allergiesKnown || 'unknown'}${draft.allergies ? ` - ${draft.allergies}` : ''}.`,
    `Medications: ${draft.medicationsKnown || 'unknown'}${draft.medications ? ` - ${draft.medications}` : ''}.`,
    `Admin: insurance ${draft.insuranceStatus || 'unknown'}, consent ${draft.consentStatus || 'unknown'}, documents ${draft.documentStatus || 'unknown'}.`,
    draft.notes ? `Notes: ${draft.notes}` : '',
    `AI Intake Assist: ${aiAssist.nextAction}`,
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

  store.addPatient(enrichedPatient, { syncToBackend: true });

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

  return {
    patient: {
      ...enrichedPatient,
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
    nextRoute: handoff.receptionPath,
    profileRoute: `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(enrichedPatient.id)}`,
    missingCriticalFields: aiAssist.missingCriticalFields,
    redFlags: aiAssist.redFlags,
    clinicalOverrideBlocked: !canReceptionPerformClinicalOverride(EMERGENCY_ROLE_IDS.registrationClerk),
  };
}
