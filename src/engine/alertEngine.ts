import { toast } from 'sonner';
import { useEmergencyStore } from '../store/emergencyStore';
import type { Alert, Patient } from '../types/emergency';
import { classifyOperationalAlert, shouldToastOperationalAlert } from './alertClassificationModel';

export {
  deriveAlerts,
  isDerivedAlertId,
  normalizeAlert,
  type AlertDispatchInput,
  type AlertEngineInputs,
} from './alertEngineDerived';

type AlertInput = Omit<Alert, 'id' | 'createdAt' | 'dismissed'> &
  Partial<Pick<Alert, 'id' | 'createdAt' | 'dismissed'>>;

function createId(): string {
  return `alt${Date.now()}`;
}

function resolveAction(alert: Alert) {
  if (alert.patientId) {
    return {
      label: 'View Patient',
      onClick: () => useEmergencyStore.getState().selectPatient(alert.patientId || null),
    };
  }

  if (alert.actionFn && alert.actionLabel) {
    return {
      label: alert.actionLabel,
      onClick: alert.actionFn,
    };
  }

  return undefined;
}

export function dispatchAlert(input: AlertInput): string {
  const alert: Alert = {
    ...input,
    id: input.id || createId(),
    createdAt: input.createdAt || new Date().toISOString(),
    dismissed: input.dismissed ?? false,
    source: input.source || 'alert-engine',
  };

  useEmergencyStore.getState().addAlert(alert);

  if (!shouldToastOperationalAlert(alert)) {
    return alert.id;
  }

  const tier = classifyOperationalAlert(alert);
  const action = resolveAction(alert);

  if (tier === 'critical' || alert.severity === 'Critical') {
    toast.error(alert.title, {
      description: alert.message,
      duration: 7000,
      action,
    });
    return alert.id;
  }

  toast(alert.title, {
    description: alert.message,
    duration: 4000,
    action,
  });

  return alert.id;
}

export const dispatch = dispatchAlert;

export function dispatchCriticalVitalsAlerts(patient: Patient): string[] {
  const latestVitals = Array.isArray(patient.vitals)
    ? patient.vitals.at(-1)
    : patient.vitals;
  if (!latestVitals) return [];

  const findings = [
    latestVitals.spo2 !== undefined && latestVitals.spo2 < 94 ? `SpO2 ${latestVitals.spo2}%` : null,
    latestVitals.hr !== undefined && (latestVitals.hr > 120 || latestVitals.hr < 50)
      ? `HR ${latestVitals.hr}`
      : null,
    latestVitals.sbp !== undefined && (latestVitals.sbp < 90 || latestVitals.sbp > 180)
      ? `SBP ${latestVitals.sbp}`
      : null,
  ].filter((finding): finding is string => Boolean(finding));

  if (!findings.length) return [];

  return [
    dispatchAlert({
      severity: 'Critical',
      title: 'Critical vitals',
      message: `${patient.firstName} ${patient.lastName}: ${findings.join(', ')}.`,
      patientId: patient.id,
      source: 'vitals-alert-engine',
      metadata: { findings: findings.join(', ') },
    }),
  ];
}

export function dispatchScoreAlert(input: {
  patient: Patient;
  scoreName: string;
  scoreValue: string | number;
  message: string;
}): string {
  return dispatchAlert({
    severity: 'Critical',
    title: `${input.scoreName} warning`,
    message: `${input.patient.firstName} ${input.patient.lastName}: ${input.message}`,
    patientId: input.patient.id,
    source: 'score-alert-engine',
    metadata: {
      scoreName: input.scoreName,
      scoreValue: input.scoreValue,
    },
  });
}
