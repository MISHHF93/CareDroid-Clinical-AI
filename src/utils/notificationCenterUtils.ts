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

export function alertPatientLabel(
  alert: Alert,
  patientById: Map<string, Patient>,
  canViewPatients = true,
): string | null {
  if (!alert.patientId) return null;
  if (!canViewPatients) return 'Patient details restricted';
  const patient = patientById.get(alert.patientId);
  if (!patient) return `Patient target unavailable (${alert.patientId})`;
  return `${getPatientDisplayName(patient)} · ${patient.mrn}`;
}

/**
 * HEAL-215: alert.title/alert.message are free text and routinely embed a
 * real patient name (e.g. alertEngineDerived.ts's deterioration-risk and
 * reassessment-reminder alerts) -- SidebarNotificationPanel is mounted
 * globally for every non-kiosk role (AppShell.tsx), with zero role-based
 * filtering upstream, so a PHI-restricted role (it_admin, etc.) sees these
 * names any time they open the bell icon on any page. Mirrors the same
 * fail-closed pattern as redactBottleneckContentForRole (HEAL-209).
 */
export function redactAlertForRole(alert: Alert, canViewPatients: boolean): Alert {
  if (canViewPatients || !alert.patientId) return alert;
  return {
    ...alert,
    title: 'Patient alert',
    message: 'Details restricted for this role.',
  };
}

export function alertRoute(alert: Alert): string | null {
  return resolveOperationalAlertRoute(alert);
}

export function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
}
