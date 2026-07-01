import { getAlertClassificationTier } from '../engine/alertClassificationModel';
import { resolveOperationalAlertRoute } from '../config/operationalMetricsModel';
import { getPatientDisplayName } from '../utils/patientSearch';
import type { Alert, Patient } from '../types/emergency';

export type NotificationCenterAction = {
  key: string;
  label: string;
  disabled?: boolean;
  disabledLabel?: string;
  onSelect?: () => void;
};

export function normalizeAlertKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function alertSeverityTone(alert: Alert): 'info' | 'warning' | 'critical' {
  const tier = getAlertClassificationTier(alert);
  if (tier === 'critical' || tier === 'high') return 'critical';
  if (tier === 'medium' || alert.severity === 'Warning') return 'warning';
  return 'info';
}

export function formatClassificationLabel(alert: Alert): string {
  const tier = getAlertClassificationTier(alert);
  if (tier === 'critical') return 'Critical';
  if (tier === 'high') return 'High';
  if (tier === 'medium') return 'Medium';
  return 'Info';
}

export function formatAlertTime(timestamp?: string): string {
  if (!timestamp) return 'Time pending';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Time pending';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function describeAlertSource(alert: Alert): string {
  const source = alert.source || alert.type || 'CareDroid';
  return String(source)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function alertPatientLabel(alert: Alert, patientById: Map<string, Patient>): string | null {
  if (!alert.patientId) return null;
  const patient = patientById.get(alert.patientId);
  if (!patient) return `Patient target unavailable (${alert.patientId})`;
  return `${getPatientDisplayName(patient)} · ${patient.mrn}`;
}

export function alertRoute(alert: Alert): string | null {
  return resolveOperationalAlertRoute(alert);
}

export function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
}