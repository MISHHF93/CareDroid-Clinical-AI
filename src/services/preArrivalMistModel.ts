import type { useEmergencyStore } from '../store/emergencyStore';
import {
  EMSSeverity,
  Priority,
  type EMSArrival,
  type MISTNotification,
  type Patient,
  type PreArrivalNotification,
  type PreArrivalNotificationFramework,
  type SBARNotification,
  type Sex,
} from '../types/emergency';
import {
  emptyMISTNotification,
  emptySBARNotification,
  mergePreArrivalNotificationPatch,
} from './preArrivalNotification';
import { registerEmsPreArrivalPlaceholder } from './preArrivalWorkflow';

export type PreArrivalFormInput = {
  unitId: string;
  unitName?: string;
  etaMinutes: number;
  patientAge: number;
  patientSex: Sex;
  severity: EMSSeverity;
  framework: PreArrivalNotificationFramework;
  mist: MISTNotification;
  sbar: SBARNotification;
  notificationSource?: PreArrivalNotification['source'];
};

export type PreArrivalFormValidation = {
  ok: boolean;
  errors: Partial<Record<keyof PreArrivalFormInput | 'complaint', string>>;
};

export type PreArrivalIntakeResult = {
  arrival: EMSArrival;
  patient: Patient;
};

export type PreArrivalIntakeStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  'addEMSArrival'
>;

const ETA_PRESETS = [5, 10, 15, 20] as const;

export const PRE_ARRIVAL_ETA_PRESETS = ETA_PRESETS;

export function emptyPreArrivalFormInput(): PreArrivalFormInput {
  return {
    unitId: '',
    unitName: '',
    etaMinutes: 10,
    patientAge: 40,
    patientSex: 'Unknown',
    severity: 'Moderate',
    framework: 'mist',
    mist: emptyMISTNotification(),
    sbar: emptySBARNotification(),
    notificationSource: 'staff',
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function minutesFromNow(minutes: number, base = Date.now()): string {
  return new Date(base + minutes * 60_000).toISOString();
}

export function severityToPriority(severity: EMSSeverity): Priority {
  switch (severity) {
    case 'Critical':
      return Priority.P1;
    case 'High':
      return Priority.P2;
    case 'Moderate':
      return Priority.P3;
    case 'Low':
    default:
      return Priority.P4;
  }
}

export function resolveChiefComplaintFromNotification(
  notification: PreArrivalNotification,
): string {
  if (notification.framework === 'sbar') {
    return (
      notification.sbar?.situation?.trim() ||
      notification.sbar?.assessment?.trim() ||
      'EMS pre-arrival'
    );
  }

  return (
    notification.mist?.injuries?.trim() ||
    notification.mist?.mechanism?.trim() ||
    notification.mist?.signs?.trim() ||
    'EMS pre-arrival'
  );
}

export function buildPreArrivalNotificationFromForm(
  input: PreArrivalFormInput,
  actor?: { staffName?: string },
): PreArrivalNotification {
  return mergePreArrivalNotificationPatch(
    {
      framework: input.framework,
      mist: input.mist,
      sbar: input.sbar,
      source: input.notificationSource || 'staff',
    },
    {
      framework: input.framework,
      mist: input.mist,
      sbar: input.sbar,
      source: input.notificationSource || 'staff',
    },
    actor,
  );
}

export function validatePreArrivalForm(input: PreArrivalFormInput): PreArrivalFormValidation {
  const errors: PreArrivalFormValidation['errors'] = {};
  const unitId = input.unitId.trim();

  if (!unitId) {
    errors.unitId = 'Unit ID is required';
  }

  if (!Number.isFinite(input.etaMinutes) || input.etaMinutes < 1 || input.etaMinutes > 180) {
    errors.etaMinutes = 'ETA must be between 1 and 180 minutes';
  }

  if (!Number.isFinite(input.patientAge) || input.patientAge < 0 || input.patientAge > 120) {
    errors.patientAge = 'Age must be between 0 and 120';
  }

  const notification = buildPreArrivalNotificationFromForm(input);
  const complaint = resolveChiefComplaintFromNotification(notification);
  if (!complaint || complaint === 'EMS pre-arrival') {
    const hasMistField = Object.values(input.mist).some((value) => String(value || '').trim());
    const hasSbarField = Object.values(input.sbar).some((value) => String(value || '').trim());
    if (!hasMistField && !hasSbarField) {
      errors.complaint = 'Enter at least one MIST or SBAR field';
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildEmsArrivalFromPreArrivalForm(
  input: PreArrivalFormInput,
  actor?: { staffName?: string },
  timestamp = nowIso(),
): EMSArrival {
  const unitId = input.unitId.trim();
  const unitName = input.unitName?.trim() || unitId;
  const notification = buildPreArrivalNotificationFromForm(input, actor);
  const chiefComplaint = resolveChiefComplaintFromNotification(notification);
  const mechanism =
    input.framework === 'mist'
      ? input.mist.mechanism?.trim() || undefined
      : input.sbar.background?.trim() || undefined;

  return {
    id: createId('ems-pre'),
    unitId,
    unitName,
    crewNames: [],
    patientAge: Math.round(input.patientAge),
    patientSex: input.patientSex,
    chiefComplaint,
    prearrivalComplaint: chiefComplaint,
    mechanismOfInjury: mechanism,
    eta: Math.round(input.etaMinutes),
    severity: input.severity,
    dispatchTime: timestamp,
    estimatedArrivalTime: minutesFromNow(input.etaMinutes, Date.parse(timestamp)),
    notes:
      input.framework === 'mist'
        ? input.mist.treatments?.trim() || ''
        : input.sbar.recommendation?.trim() || '',
    status: 'Inbound',
    priority: severityToPriority(input.severity),
    preArrivalNotification: notification,
    handoffSummary: [
      `${unitName} inbound`,
      chiefComplaint,
      input.framework === 'mist' && input.mist.signs ? `Signs: ${input.mist.signs}` : null,
      input.framework === 'sbar' && input.sbar.assessment
        ? `Assessment: ${input.sbar.assessment}`
        : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

export function submitPreArrivalIntake(
  store: PreArrivalIntakeStore,
  input: PreArrivalFormInput,
  actor?: { staffName?: string },
): PreArrivalIntakeResult {
  const validation = validatePreArrivalForm(input);
  if (!validation.ok) {
    throw new Error(Object.values(validation.errors).filter(Boolean).join('; '));
  }

  const arrival = buildEmsArrivalFromPreArrivalForm(input, actor);
  store.addEMSArrival(arrival);

  const patient = registerEmsPreArrivalPlaceholder(arrival.id);
  if (!patient) {
    throw new Error('Failed to register EMS pre-arrival placeholder on the whiteboard');
  }

  return { arrival, patient };
}
