import { useEmergencyStore } from '../store/emergencyStore';
import type { Alert, Patient } from '../types/emergency';
import {
  prepareUnifiedAlert,
  publishAlert,
  shouldSurfaceAlertToast,
} from '../services/alertLifecycleOrchestrator';
import { raiseOperationalAlarm } from '../services/operationalAlarmPolicy';

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

  const alert =
    useEmergencyStore.getState().alerts.find((entry) => entry.id === alertId) ||
    prepareUnifiedAlert({
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
