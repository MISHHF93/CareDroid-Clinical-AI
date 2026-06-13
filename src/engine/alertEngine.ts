import { useEmergencyStore } from '../store/emergencyStore';
import type { Alert, Patient } from '../types/emergency';

type AlertInput = Omit<Alert, 'id' | 'createdAt' | 'dismissed'> &
  Partial<Pick<Alert, 'id' | 'createdAt' | 'dismissed'>>;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dispatchAlert(input: AlertInput): Alert {
  const alert: Alert = {
    ...input,
    id: input.id || createId('alert'),
    createdAt: input.createdAt || new Date().toISOString(),
    dismissed: input.dismissed ?? false,
    source: input.source || 'alert-engine',
  };
  useEmergencyStore.getState().addAlert(alert);
  return alert;
}

export const dispatch = dispatchAlert;

export function dispatchCriticalVitalsAlerts(patient: Patient): Alert[] {
  const latestVitals = patient.vitals.at(-1);
  if (!latestVitals) return [];

  const findings = [
    latestVitals.spo2 !== undefined && latestVitals.spo2 < 94 ? `SpO2 ${latestVitals.spo2}%` : null,
    latestVitals.hr !== undefined && (latestVitals.hr > 120 || latestVitals.hr < 50) ? `HR ${latestVitals.hr}` : null,
    latestVitals.sbp !== undefined && (latestVitals.sbp < 90 || latestVitals.sbp > 180) ? `SBP ${latestVitals.sbp}` : null,
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
}): Alert {
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
