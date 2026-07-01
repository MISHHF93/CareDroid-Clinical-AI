import { useEmergencyStore } from '../store/emergencyStore';
import type { Alert, Patient } from '../types/emergency';
import {
  prepareUnifiedAlert,
  publishAlert,
  shouldSurfaceAlertToast,
} from '../services/alertLifecycleOrchestrator';
import { raiseOperationalAlarm } from '../services/notificationToastPolicy';

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

export function dispatchAlert(input: AlertInput): string {
  const alertId = publishAlert({
    ...input,
    id: input.id || createId(),
    createdAt: input.createdAt || new Date().toISOString(),
    dismissed: input.dismissed ?? false,
    source: input.source || 'alert-engine',
  });

  const alert = useEmergencyStore.getState().alerts.find((entry) => entry.id === alertId)
    || prepareUnifiedAlert({
      ...input,
      id: alertId,
      createdAt: input.createdAt || new Date().toISOString(),
      dismissed: input.dismissed ?? false,
      source: input.source || 'alert-engine',
    });

  if (shouldSurfaceAlertToast(alert)) {
    raiseOperationalAlarm(alert);
  }

  return alertId;
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
