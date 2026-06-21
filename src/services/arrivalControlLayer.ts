import type { Patient, PatientState, PatientFlag, Priority, Encounter } from '../types/emergency';
import { PatientState as PatientStateEnum, PatientFlag as PatientFlagEnum, Priority as PriorityEnum } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { WHITEBOARD_QUEUE_FILTER, enterTriageQueue } from './queueAssignment';
import { ensureEncounterAfterIntake, type IntakeEncounterSource } from './intakeEncounter';

/**
 * Arrival mode enumeration – supports all primary patient entry paths.
 * Maps to operational context and triage priority hints.
 */
export const ArrivalMode = Object.freeze({
  WalkIn: 'walk-in',
  EMS: 'ems',
  Referral: 'referral',
  Police: 'police',
  Transfer: 'transfer',
  Kiosk: 'kiosk',
  Telehealth: 'telehealth',
  Unknown: 'unknown',
} as const);

export type ArrivalModeType = (typeof ArrivalMode)[keyof typeof ArrivalMode];

/**
 * Quick safety flags evaluated at arrival – informs immediate triage and resource allocation.
 */
export const QuickSafetyFlag = Object.freeze({
  Altered: 'altered-consciousness',
  Chest: 'chest-pain',
  Respiratory: 'respiratory-distress',
  Trauma: 'trauma',
  Neuro: 'neuro-deficit',
  Sepsis: 'sepsis-risk',
  Allergy: 'allergy-alert',
  Isolation: 'isolation-required',
  Violence: 'violence-risk',
} as const);

export type QuickSafetyFlagType = (typeof QuickSafetyFlag)[keyof typeof QuickSafetyFlag];

/**
 * Arrival registration status – tracks identity and verification progress.
 */
export enum RegistrationStatus {
  Unknown = 'unknown',
  PartialIdentity = 'partial-identity',
  IdentityVerified = 'identity-verified',
  IdentityPending = 'identity-pending',
}

/**
 * Triage pending status – indicates when triage nurse assessment is ready or needed.
 */
export enum TriagePendingStatus {
  AwaitingTriage = 'awaiting-triage',
  TriageInProgress = 'triage-in-progress',
  TriageComplete = 'triage-complete',
}

/**
 * Core arrival context – captured at first contact.
 * Normalizes all arrival entry points into unified control flow.
 */
export interface ArrivalContext {
  // Arrival metadata
  arrivalTimestamp: string; // ISO 8601
  arrivalMode: ArrivalModeType;
  firstContactTimestamp: string; // ISO 8601

  // Patient identification
  presentingComplaint: string;
  complaintCategory?: string;

  // Safety and triage hints
  quickSafetyFlags: QuickSafetyFlagType[];
  estimatedPriority?: Priority | string;

  // Registration state
  registrationStatus: RegistrationStatus;
  identityVerified?: boolean;

  // Triage readiness
  triagePendingStatus: TriagePendingStatus;

  // Operational routing
  queueDestination: string; // 'triage' | 'waiting' | 'assessment' etc.

  // Source tracking
  intakeSource?: IntakeEncounterSource;
  sessionId?: string;
  actorName?: string;

  // Additional metadata
  notes?: string;
  emsArrivalId?: string;
  referralId?: string;
}

/**
 * Arrival arrival state – the minimal operational snapshot for a new arrival.
 * Synchronized across triage queue, waiting room, whiteboard, and dashboard.
 */
export interface ArrivalSnapshot {
  patientId: string;
  arrivalContext: ArrivalContext;
  patientState: PatientState;
  encounterId: string | null;
  createdEncounter: boolean;
  queueAssignment: string;
  triageAssistGeneratedAt?: string;
  handoffSyncPending: boolean;
  operationallyVisible: boolean;
}

export type ArrivalControlStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'patients'
  | 'addPatient'
  | 'updatePatient'
  | 'selectPatient'
  | 'movePatientToState'
  | 'recordWorkflowAction'
  | 'emergencySettings'
  | 'dispatchWebSocketEvent'
>;

/**
 * Map arrival mode to encounter source for downstream tracking.
 */
const ARRIVAL_MODE_TO_ENCOUNTER_SOURCE: Record<ArrivalModeType, IntakeEncounterSource> = {
  [ArrivalMode.WalkIn]: 'walk-in',
  [ArrivalMode.EMS]: 'ems',
  [ArrivalMode.Referral]: 'referral',
  [ArrivalMode.Police]: 'walk-in',
  [ArrivalMode.Transfer]: 'transfer',
  [ArrivalMode.Kiosk]: 'walk-in',
  [ArrivalMode.Telehealth]: 'walk-in',
  [ArrivalMode.Unknown]: 'walk-in',
};

/**
 * Map quick safety flags to Emergency OS patient flags for visibility and alerts.
 */
const SAFETY_FLAG_TO_PATIENT_FLAG: Record<QuickSafetyFlagType, PatientFlag | null> = {
  [QuickSafetyFlag.Altered]: PatientFlagEnum.DeteriorationRisk,
  [QuickSafetyFlag.Chest]: null, // Handled in complaint routing
  [QuickSafetyFlag.Respiratory]: PatientFlagEnum.DeteriorationRisk,
  [QuickSafetyFlag.Trauma]: null, // Handled in complaint routing
  [QuickSafetyFlag.Neuro]: PatientFlagEnum.DeterioratingNeuro,
  [QuickSafetyFlag.Sepsis]: PatientFlagEnum.SepsisAlert,
  [QuickSafetyFlag.Allergy]: null, // Handled in allergies array
  [QuickSafetyFlag.Isolation]: PatientFlagEnum.Isolation,
  [QuickSafetyFlag.Violence]: null, // Handled via alert system
};

/**
 * Resolve priority from quick safety flags and complaint category.
 * Rapid triage estimation at arrival.
 */
export function estimateArrivalPriority(
  safetyFlags: QuickSafetyFlagType[],
  complaintCategory?: string,
): Priority {
  // Critical flags override all
  if (
    safetyFlags.includes(QuickSafetyFlag.Altered) ||
    safetyFlags.includes(QuickSafetyFlag.Chest) ||
    safetyFlags.includes(QuickSafetyFlag.Respiratory)
  ) {
    return PriorityEnum.P2;
  }

  // Urgent flags
  if (safetyFlags.includes(QuickSafetyFlag.Trauma)) {
    return PriorityEnum.P2;
  }

  if (
    safetyFlags.includes(QuickSafetyFlag.Neuro) ||
    safetyFlags.includes(QuickSafetyFlag.Sepsis)
  ) {
    return PriorityEnum.P3;
  }

  // Category-based estimation
  const urgent = ['chest pain', 'trauma', 'stroke', 'sepsis', 'mental health crisis'];
  if (complaintCategory && urgent.some((c) => complaintCategory.toLowerCase().includes(c))) {
    return PriorityEnum.P3;
  }

  return PriorityEnum.P4;
}

/**
 * Create or update arrival flags on patient based on safety flags.
 */
function applyArrivalSafetyFlags(
  patient: Patient,
  safetyFlags: QuickSafetyFlagType[],
): PatientFlag[] {
  const flags = [...(patient.flags || [])];
  const uniqueFlags = new Set(flags.filter((f) => typeof f === 'string'));

  for (const safetyFlag of safetyFlags) {
    const patientFlag = SAFETY_FLAG_TO_PATIENT_FLAG[safetyFlag];
    if (patientFlag) {
      uniqueFlags.add(patientFlag);
    }
  }

  return Array.from(uniqueFlags);
}

/**
 * Register arrival context on patient journey.
 * Core operation: capture all arrival-specific metadata.
 */
export function registerArrival(
  store: ArrivalControlStore,
  patientId: string,
  context: ArrivalContext,
): {
  ok: boolean;
  reason?: string;
  patient?: Patient;
} {
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) {
    return { ok: false, reason: 'patient_not_found' };
  }

  const updatedFlags = applyArrivalSafetyFlags(patient, context.quickSafetyFlags);
  const priority = context.estimatedPriority || estimateArrivalPriority(context.quickSafetyFlags, context.complaintCategory);

  store.updatePatient(patientId, {
    arrivalTime: context.arrivalTimestamp,
    chiefComplaint: context.presentingComplaint,
    complaint: context.presentingComplaint,
    complaintCategory: context.complaintCategory || 'Other',
    priority,
    flags: updatedFlags,
    source: context.arrivalMode === ArrivalMode.EMS ? 'EMS' : 'WalkIn',
  });

  store.recordWorkflowAction({
    type: 'patient_created',
    title: 'Patient arrival registered',
    summary: `Arrival registered: ${context.arrivalMode} | ${context.presentingComplaint} | Safety flags: ${context.quickSafetyFlags.join(', ') || 'None'}`,
    patientId,
    source: 'arrival-control-layer',
    severity: context.quickSafetyFlags.length > 0 ? 'Warning' : 'Info',
    metadata: {
      arrivalMode: context.arrivalMode,
      presentingComplaint: context.presentingComplaint,
      quickSafetyFlags: context.quickSafetyFlags,
      estimatedPriority: priority,
      registrationStatus: context.registrationStatus,
      triagePendingStatus: context.triagePendingStatus,
    },
  });

  return { ok: true, patient: store.patients.find((p) => p.id === patientId) };
}

/**
 * Complete arrival-to-triage handoff.
 * Canonical operation: move patient from arrival through verification into triage queue.
 */
export function completeArrivalToTriageHandoff(
  store: ArrivalControlStore,
  patientId: string,
  context: ArrivalContext,
  options: {
    actorName?: string;
    sessionId?: string;
  } = {},
): ArrivalSnapshot {
  const patient = store.patients.find((p) => p.id === patientId);

  if (!patient) {
    return {
      patientId,
      arrivalContext: context,
      patientState: PatientStateEnum.Arrival,
      encounterId: null,
      createdEncounter: false,
      queueAssignment: WHITEBOARD_QUEUE_FILTER.triage,
      handoffSyncPending: false,
      operationallyVisible: false,
    };
  }

  // Register arrival metadata
  registerArrival(store, patientId, context);

  // Assign to triage queue
  const queueResult = enterTriageQueue(store, {
    patientId,
    source: context.intakeSource || ARRIVAL_MODE_TO_ENCOUNTER_SOURCE[context.arrivalMode],
    actorName: options.actorName,
    actorId: 'arrival-control',
    note: `Arrival to triage: ${context.arrivalMode} | ${context.presentingComplaint}`,
    recordWorkflow: true,
  });

  // Create encounter
  const encounterResult = ensureEncounterAfterIntake(store, {
    patientId,
    source: ARRIVAL_MODE_TO_ENCOUNTER_SOURCE[context.arrivalMode],
    sessionId: options.sessionId,
    actorName: options.actorName,
    queue: queueResult.queue || WHITEBOARD_QUEUE_FILTER.triage,
  });

  // Sync operational surfaces
  store.dispatchWebSocketEvent?.({
    type: 'arrival_handoff_complete',
    payload: {
      patientId,
      arrivalMode: context.arrivalMode,
      presentingComplaint: context.presentingComplaint,
      quickSafetyFlags: context.quickSafetyFlags,
      encounterId: encounterResult.encounterId,
      queue: queueResult.queue || WHITEBOARD_QUEUE_FILTER.triage,
      surfaces: ['triage-queue', 'whiteboard', 'operational-snapshot'],
      generatedAt: new Date().toISOString(),
    },
  });

  return {
    patientId,
    arrivalContext: context,
    patientState: patient.state || PatientStateEnum.Triage,
    encounterId: encounterResult.encounterId,
    createdEncounter: encounterResult.created,
    queueAssignment: queueResult.queue || WHITEBOARD_QUEUE_FILTER.triage,
    handoffSyncPending: false,
    operationallyVisible: true,
  };
}

/**
 * Snapshot current arrival state for operational surface display.
 * Used by triage queue, waiting room, whiteboard, and dashboard.
 */
export function getArrivalSnapshot(
  store: ArrivalControlStore,
  patientId: string,
  context: ArrivalContext,
): ArrivalSnapshot {
  const patient = store.patients.find((p) => p.id === patientId);

  return {
    patientId,
    arrivalContext: context,
    patientState: patient?.state || PatientStateEnum.Arrival,
    encounterId:
      patient?.timeline?.find((e) => e.type === 'EncounterCreated')?.metadata?.encounterId || null,
    createdEncounter: patient?.timeline?.some((e) => e.type === 'EncounterCreated') || false,
    queueAssignment: patient?.state === PatientStateEnum.Triage ? WHITEBOARD_QUEUE_FILTER.triage : 'arrival',
    triageAssistGeneratedAt: patient?.triageAssistGeneratedAt,
    handoffSyncPending: patient?.handoffSyncPending || false,
    operationallyVisible: Boolean(patient),
  };
}

/**
 * Resolve queue destination from arrival context and business rules.
 */
export function resolveQueueDestination(context: ArrivalContext): string {
  // High-priority safety flags → immediate triage
  if (
    context.quickSafetyFlags.includes(QuickSafetyFlag.Altered) ||
    context.quickSafetyFlags.includes(QuickSafetyFlag.Chest) ||
    context.quickSafetyFlags.includes(QuickSafetyFlag.Respiratory) ||
    context.quickSafetyFlags.includes(QuickSafetyFlag.Trauma)
  ) {
    return WHITEBOARD_QUEUE_FILTER.triage;
  }

  // EMS arrivals → triage queue
  if (context.arrivalMode === ArrivalMode.EMS) {
    return WHITEBOARD_QUEUE_FILTER.triage;
  }

  // Referrals → triage queue
  if (context.arrivalMode === ArrivalMode.Referral) {
    return WHITEBOARD_QUEUE_FILTER.triage;
  }

  // Default: triage
  return WHITEBOARD_QUEUE_FILTER.triage;
}

/**
 * Validate arrival context completeness.
 * Ensures required fields are present before registration.
 */
export function validateArrivalContext(context: Partial<ArrivalContext>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!context.arrivalTimestamp) errors.push('arrivalTimestamp is required');
  if (!context.arrivalMode) errors.push('arrivalMode is required');
  if (!context.firstContactTimestamp) errors.push('firstContactTimestamp is required');
  if (!context.presentingComplaint) errors.push('presentingComplaint is required');
  if (context.registrationStatus === undefined) errors.push('registrationStatus is required');
  if (context.triagePendingStatus === undefined) errors.push('triagePendingStatus is required');

  return {
    valid: errors.length === 0,
    errors,
  };
}
