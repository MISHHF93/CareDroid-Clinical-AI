/**
 * Alert lifecycle orchestrator — canonical entry point for all CareDroid alerts and notifications.
 *
 * Supports generation, ownership routing, acknowledgement, escalation, resolution, history, and audit.
 * Synchronizes backend clinical alerts, realtime websocket events, and notification stream payloads
 * into the unified emergency store without duplicate messages.
 */

import {
  resolveAlertLifecycle,
  type AlertLifecycleState,
} from '../config/alertLifecycleModel';
import {
  classifyOperationalAlert,
  shouldToastOperationalAlert,
} from '../engine/alertClassificationModel';
import {
  isDerivedAlertId,
  normalizeAlert,
  type AlertDispatchInput,
} from '../engine/alertEngineDerived';
import {
  type AlertScenario,
  getCanonicalAiRecommendationRoute,
  isAlertVisibleToCompiledProfile,
} from '../lib/users/aiChiefRouting';
import type { CompiledCareDroidAccessProfile } from '../lib/users/canonicalAccess';
import type { CareDroidUserProfile, HospitalRole } from '../lib/users/userTypes';
import { useEmergencyStore } from '../store/emergencyStore';
import type { Alert, AlertLifecycleStatus, WorkflowActionLog } from '../types/emergency';
import {
  acknowledgeClinicalAlertApi,
  dismissClinicalAlertApi,
  fetchClinicalAlerts,
} from './clinicalAlertsApi';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { postWaitingRoomEscalationNotify } from './emergencyOsApi';
import logger from '../utils/logger';
import { inferAlertScenario } from './aiChiefOrchestrator';

export const ALERT_LIFECYCLE_ORCHESTRATOR_VERSION = '2026.06.30';

export type AlertLifecycleAction =
  | 'created'
  | 'acknowledged'
  | 'dismissed'
  | 'resolved'
  | 'escalated'
  | 'expired'
  | 'synced';

export type AlertLifecycleAuditEvent = {
  id: string;
  alertId: string;
  action: AlertLifecycleAction;
  actorId?: string;
  actorRole?: string;
  timestamp: string;
  reason?: string;
  source: string;
  metadata?: Record<string, unknown>;
};

export type AlertActor = {
  actorId?: string;
  actorRole?: string;
  sourceScreen?: string;
};

const lifecycleAuditTrail: AlertLifecycleAuditEvent[] = [];
const ESCALATION_ACK_DEADLINE_MS = 3 * 60 * 1000;

function createAuditId(): string {
  return `alert-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recordLifecycleAudit(
  alertId: string,
  action: AlertLifecycleAction,
  source: string,
  actor: AlertActor = {},
  metadata?: Record<string, unknown>,
): AlertLifecycleAuditEvent {
  const event: AlertLifecycleAuditEvent = {
    id: createAuditId(),
    alertId,
    action,
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    timestamp: new Date().toISOString(),
    source,
    metadata,
  };
  lifecycleAuditTrail.unshift(event);
  if (lifecycleAuditTrail.length > 500) {
    lifecycleAuditTrail.length = 500;
  }
  // Dev-only diagnostics: the durable record is lifecycleAuditTrail above (and
  // the store's own audit log). An unconditional console.info here fired on
  // EVERY lifecycle action from updateAlerts' hot path — and browsers retain
  // every object passed to console, so a 24/7 wallboard deployment accumulated
  // thousands of un-collectable event objects per hour plus formatting cost.
  if (import.meta.env?.DEV && typeof console !== 'undefined') {
    console.info('[ALERT_LIFECYCLE]', event);
  }
  return event;
}

function inferScenarioFromAlert(alert: Alert): AlertScenario | undefined {
  const metadataScenario = alert.metadata?.alertScenario;
  if (typeof metadataScenario === 'string') {
    return metadataScenario as AlertScenario;
  }
  return inferAlertScenario(
    {
      chiefComplaint: alert.message,
      complaint: alert.title,
      alertSource: alert.source,
      category: alert.type,
      redFlags: alert.metadata?.redFlags,
    },
    undefined,
  );
}

function mapSeverityToTier(severity: Alert['severity']): string {
  if (severity === 'Critical') return 'critical';
  if (severity === 'Warning') return 'high';
  return 'informational';
}

function deriveLifecycleStatus(alert: Alert): AlertLifecycleStatus {
  if (alert.lifecycleStatus) return alert.lifecycleStatus;
  if (alert.dismissed) return 'dismissed';
  if (alert.resolvedAt) return 'resolved';
  if (alert.escalatedAt) return 'escalated';
  if (alert.acknowledged) return 'acknowledged';
  return 'open';
}

function buildWorkflowLog(
  alert: Alert,
  action: AlertLifecycleAction,
  actor: AlertActor,
  summary: string,
): WorkflowActionLog {
  return {
    id: createAuditId(),
    type: 'alert_lifecycle',
    title: `Alert ${action}`,
    summary,
    patientId: alert.patientId,
    timestamp: new Date().toISOString(),
    source: actor.sourceScreen || 'alert-lifecycle-orchestrator',
    severity: alert.severity,
    status: 'completed',
    metadata: {
      alertId: alert.id,
      action,
      actorId: actor.actorId || null,
      actorRole: actor.actorRole || null,
      orchestratorVersion: ALERT_LIFECYCLE_ORCHESTRATOR_VERSION,
    },
  };
}

export function prepareUnifiedAlert(input: AlertDispatchInput): Alert {
  const normalized = normalizeAlert(input);
  const tier = classifyOperationalAlert(normalized);
  const lifecycle = resolveAlertLifecycle(tier, {
    acknowledged: normalized.acknowledged,
    dismissed: normalized.dismissed,
    resolved: Boolean(normalized.resolvedAt),
  });
  const scenario = inferScenarioFromAlert(normalized);
  const routing = scenario ? getCanonicalAiRecommendationRoute(scenario) : undefined;

  return {
    ...normalized,
    lifecycleStatus: deriveLifecycleStatus(normalized),
    ownerRole: normalized.ownerRole || routing?.suggestedOwnerRole,
    escalationRole: normalized.escalationRole || routing?.escalationRole,
    recommendedAction:
      normalized.recommendedAction ||
      (typeof normalized.metadata?.recommendedAction === 'string'
        ? normalized.metadata.recommendedAction
        : routing
          ? `Review and assign to ${routing.suggestedOwnerRole}`
          : 'Review alert and take clinically appropriate action.'),
    metadata: {
      ...(normalized.metadata || {}),
      lifecycleState: lifecycle.state as AlertLifecycleState,
      classificationTier: tier,
      alertScenario: scenario || null,
      orchestratorVersion: ALERT_LIFECYCLE_ORCHESTRATOR_VERSION,
      visibleToRoles: routing ? routing.visibleToRoles.join(',') : null,
    },
  };
}

export function ingestRealtimeAlertPayload(payload: unknown): Alert | null {
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const nested = (record.payload || record.data || record.alert || record) as Record<string, unknown>;

  const title = String(nested.title || nested.headline || nested.subject || '').trim();
  const message = String(
    nested.message || nested.body || nested.summary || nested.description || title,
  ).trim();
  if (!title && !message) return null;

  return prepareUnifiedAlert({
    id: String(nested.id || nested.alertId || ''),
    type: String(nested.type || nested.alertType || nested.category || 'System'),
    severity:
      String(nested.severity || nested.priority || nested.level || 'Info')
        .toLowerCase()
        .includes('crit')
        ? 'Critical'
        : String(nested.severity || '').toLowerCase().includes('warn')
          ? 'Warning'
          : 'Info',
    title: title || 'CareDroid alert',
    message: message || title,
    patientId: String(nested.patientId || nested.patient_id || '') || undefined,
    createdAt: String(nested.createdAt || nested.timestamp || nested.receivedAt || '') || undefined,
    dismissed: Boolean(nested.dismissed),
    source: String(nested.source || 'emergency-realtime'),
    // Found 2026-08-27: dispatchOperationalAlert's realtime broadcast
    // (emergency-os.services.ts, type 'alert_created') carries the raw alert
    // object -- ownerRole included -- straight over the wire, but this
    // function never read it, so prepareUnifiedAlert's `normalized.ownerRole
    // || routing?.suggestedOwnerRole` (below) always fell through to a
    // keyword-guessed role instead of the real, deliberately-set one. Note:
    // ownerRole does NOT currently gate any production visibility filter --
    // filterAlertsForRole (below) reads it but has zero real callers today
    // (ClinicalAlertsPage.tsx uses filterAlertsForProfile instead, which is
    // scenario-keyword-based and ignores ownerRole entirely). The concrete,
    // current-day bug this closes is data consistency: the same escalation
    // alert showed a correct "Owner: physician" finding
    // (mapAlertToClinicalDisplay) when fetched via REST (already fixed,
    // normalizeOperationalAlert, commit 7f7ae82d) but a blank/guessed one the
    // instant it arrived live -- flickering between two different values for
    // the identical alert depending purely on which path delivered it first.
    // Same "durable field, dead read path" bug class as that fix; this was
    // its sibling ingestion path, not yet closed.
    ownerRole: String(nested.ownerRole || '') || undefined,
    escalationRole: String(nested.escalationRole || '') || undefined,
    metadata: (nested.metadata as Alert['metadata']) || undefined,
  });
}

export function ingestClinicalApiAlert(apiAlert: Record<string, unknown>): Alert {
  const severityRaw = String(apiAlert.severity || 'moderate').toLowerCase();
  const severity: Alert['severity'] =
    severityRaw === 'critical' ? 'Critical' : severityRaw === 'high' ? 'Warning' : 'Info';
  const status = String(apiAlert.status || 'unacknowledged');

  return prepareUnifiedAlert({
    id: String(apiAlert.id || `clinical-${Date.now()}`),
    type: 'System',
    severity,
    title: String(apiAlert.title || 'Clinical alert'),
    message: String(apiAlert.description || apiAlert.title || 'Clinical alert requires review.'),
    createdAt: String(apiAlert.timestamp || new Date().toISOString()),
    acknowledged: status === 'acknowledged',
    dismissed: status === 'dismissed',
    source: String(apiAlert.source || 'clinical-alerts-api'),
    metadata: {
      findings: Array.isArray(apiAlert.findings) ? apiAlert.findings.join(' | ') : null,
      patientContext:
        apiAlert.patientContext != null ? JSON.stringify(apiAlert.patientContext) : null,
      clinicalApiStatus: status,
    },
  });
}

export function ingestNotificationStreamEvent(notification: Record<string, unknown>): Alert | null {
  const title = String(notification.title || notification.subject || '').trim();
  const message = String(notification.body || notification.message || title).trim();
  if (!title && !message) return null;

  const severityRaw = String(notification.severity || notification.priority || notification.type || '')
    .toLowerCase();

  return prepareUnifiedAlert({
    id: String(notification.id || notification.notificationId || ''),
    type: String(notification.alertType || notification.category || 'System'),
    severity: severityRaw.includes('crit') || severityRaw === 'error'
      ? 'Critical'
      : severityRaw.includes('warn')
        ? 'Warning'
        : 'Info',
    title: title || 'Notification',
    message,
    patientId: String(notification.patientId || '') || undefined,
    dismissed: Boolean(notification.dismissed),
    source: 'notification-stream',
    metadata: {
      notificationType:
        notification.type != null ? String(notification.type) : null,
      streamEvent: true,
    },
  });
}

export function ingestUnifiedAlert(alert: Alert, actor: AlertActor = {}): string {
  const prepared = alert.metadata?.orchestratorVersion
    ? alert
    : prepareUnifiedAlert(alert);
  useEmergencyStore.getState().ingestPreparedAlert(prepared);
  recordLifecycleAudit(prepared.id, 'created', prepared.source || 'alert-lifecycle-orchestrator', actor, {
    severity: prepared.severity,
    ownerRole: prepared.ownerRole,
  });
  return prepared.id;
}

export function publishAlert(input: AlertDispatchInput, actor: AlertActor = {}): string {
  return ingestUnifiedAlert(prepareUnifiedAlert(input), actor);
}

export async function transitionAlertLifecycle(
  alertId: string,
  action: 'acknowledge' | 'dismiss' | 'resolve' | 'escalate',
  actor: AlertActor = {},
  options: { reason?: string; syncBackend?: boolean } = {},
): Promise<Alert | null> {
  const store = useEmergencyStore.getState();
  const existing = store.alerts.find((alert) => alert.id === alertId);
  if (!existing) return null;

  const timestamp = new Date().toISOString();
  let patch: Partial<Alert> = {};
  let auditAction: AlertLifecycleAction = 'acknowledged';
  let summary = '';

  switch (action) {
    case 'acknowledge':
      patch = {
        acknowledged: true,
        acknowledgedAt: timestamp,
        // actor was always available here but silently dropped before this
        // fix -- see the doc comment on Alert.acknowledgedByStaffId
        // (src/types/emergency.ts) for why this closes a real "can't tell who
        // actually acted" gap.
        acknowledgedByStaffId: actor.actorId,
        acknowledgedByRole: actor.actorRole,
        read: true,
        lifecycleStatus: 'acknowledged',
      };
      auditAction = 'acknowledged';
      summary = `${existing.title} acknowledged by ${actor.actorRole || actor.actorId || 'staff'}.`;
      if (options.syncBackend !== false && isBackendCapabilityEnabled('clinicalAlerts')) {
        // The result was previously discarded here: a failed backend
        // acknowledgement (network error, 401, 500) still fell through to the
        // unconditional local-state patch below, so the UI flipped the alert
        // to "acknowledged" even though nothing was persisted server-side --
        // a clinician had no way to know the acknowledgement didn't actually
        // take. Throwing on failure stops the false-positive local patch and
        // lets callers (e.g. ClinicalAlertsPage's handleAcknowledge) surface
        // a real error instead of silently succeeding.
        const ackResult = await acknowledgeClinicalAlertApi(alertId, {
          acknowledgedAt: timestamp,
          acknowledgedBy: actor.actorId,
          userRole: actor.actorRole,
        });
        if (!ackResult.ok) {
          throw new Error(ackResult.message || 'Failed to acknowledge alert on the server.');
        }
      }
      break;
    case 'dismiss':
      patch = {
        dismissed: true,
        dismissedAt: timestamp,
        dismissedByStaffId: actor.actorId,
        dismissedByRole: actor.actorRole,
        read: true,
        lifecycleStatus: 'dismissed',
      };
      auditAction = 'dismissed';
      summary = `${existing.title} dismissed${options.reason ? `: ${options.reason}` : '.'}`;
      if (options.syncBackend !== false && isBackendCapabilityEnabled('clinicalAlerts')) {
        // Same false-positive-success gap as the acknowledge branch above:
        // a failed backend dismissal must not be allowed to fall through to
        // the local-state patch as if it succeeded.
        const dismissResult = await dismissClinicalAlertApi(alertId, {
          dismissedAt: timestamp,
          dismissedBy: actor.actorId,
          reason: options.reason,
        });
        if (!dismissResult.ok) {
          throw new Error(dismissResult.message || 'Failed to dismiss alert on the server.');
        }
      }
      break;
    case 'resolve':
      patch = {
        resolvedAt: timestamp,
        resolutionReason: options.reason || 'Resolved by clinician review.',
        read: true,
        lifecycleStatus: 'resolved',
      };
      auditAction = 'resolved';
      summary = `${existing.title} resolved: ${patch.resolutionReason}`;
      break;
    case 'escalate':
      patch = {
        escalatedAt: timestamp,
        lifecycleStatus: 'escalated',
        severity: existing.severity === 'Info' ? 'Warning' : existing.severity,
      };
      auditAction = 'escalated';
      summary = `${existing.title} escalated to ${existing.escalationRole || 'charge_nurse'}.`;
      break;
    default:
      return existing;
  }

  const nextAlert: Alert = { ...existing, ...patch };
  useEmergencyStore.setState((state) => ({
    alerts: state.alerts.map((alert) => (alert.id === alertId ? nextAlert : alert)),
    workflowLogs: [
      buildWorkflowLog(nextAlert, auditAction, actor, summary),
      ...state.workflowLogs,
    ].slice(0, 200),
  }));

  recordLifecycleAudit(alertId, auditAction, actor.sourceScreen || 'alert-lifecycle-orchestrator', actor, {
    reason: options.reason,
    ownerRole: nextAlert.ownerRole,
    escalationRole: nextAlert.escalationRole,
  });

  return nextAlert;
}

export async function syncClinicalAlertsFromBackend(): Promise<{
  ingested: number;
  skipped: number;
  message: string;
}> {
  if (!isBackendCapabilityEnabled('clinicalAlerts')) {
    return {
      ingested: 0,
      skipped: 0,
      message: 'Clinical alerts backend capability disabled.',
    };
  }

  const result = await fetchClinicalAlerts();
  if (!result.ok) {
    return {
      ingested: 0,
      skipped: 0,
      message: result.message || 'Unable to sync clinical alerts.',
    };
  }

  const apiAlerts = Array.isArray((result as { data?: { alerts?: unknown[] } }).data?.alerts)
    ? (result as unknown as { data: { alerts: Record<string, unknown>[] } }).data.alerts
    : [];

  const store = useEmergencyStore.getState();
  let ingested = 0;
  let skipped = 0;

  for (const apiAlert of apiAlerts) {
    const unified = ingestClinicalApiAlert(apiAlert);
    const duplicate = store.alerts.some(
      (alert) =>
        alert.id === unified.id ||
        (alert.source === unified.source && alert.title === unified.title && !alert.dismissed),
    );
    if (duplicate) {
      skipped += 1;
      continue;
    }
    store.ingestPreparedAlert(unified);
    recordLifecycleAudit(unified.id, 'synced', 'clinical-alerts-api', {}, { backend: true });
    ingested += 1;
  }

  return {
    ingested,
    skipped,
    message: `Synced ${ingested} clinical alert${ingested === 1 ? '' : 's'} (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped).`,
  };
}

export function checkUnacknowledgedAlertEscalations(now = new Date()): string[] {
  const store = useEmergencyStore.getState();
  const escalatedIds: string[] = [];

  for (const alert of store.alerts) {
    if (alert.dismissed || alert.acknowledged || alert.lifecycleStatus === 'escalated') continue;
    if (alert.severity !== 'Critical') continue;

    const createdAt = new Date(alert.createdAt).getTime();
    if (!Number.isFinite(createdAt)) continue;
    if (now.getTime() - createdAt < ESCALATION_ACK_DEADLINE_MS) continue;

    void transitionAlertLifecycle(alert.id, 'escalate', {
      actorRole: alert.escalationRole || 'charge_nurse',
      sourceScreen: 'alert-escalation-timer',
    });
    escalatedIds.push(alert.id);

    // Real out-of-band notification (email) -- extends the in-app escalation above
    // past the browser tab. Fire-and-forget: the in-app transition already happened
    // and is the source of truth regardless of whether the network call succeeds.
    if (isBackendCapabilityEnabled('waitingRoomEscalationNotify')) {
      void postWaitingRoomEscalationNotify({
        patientId: alert.patientId,
        alertId: alert.id,
        title: `Unacknowledged critical alert escalated — ${alert.title || 'Waiting room safety'}`,
        message: alert.message || 'A critical alert went unacknowledged for 3 minutes and was auto-escalated.',
      }).catch((error) => {
        logger.warn('[alertLifecycleOrchestrator] Failed to send waiting-room escalation notification', error);
      });
    }
  }

  return escalatedIds;
}

export function filterAlertsForProfile(
  alerts: Alert[],
  profile: CareDroidUserProfile | CompiledCareDroidAccessProfile,
): Alert[] {
  return alerts.filter((alert) => {
    if (alert.dismissed) return false;
    const scenario = inferScenarioFromAlert(alert);
    if (!scenario) return true;
    return isAlertVisibleToCompiledProfile(scenario, profile);
  });
}

export function filterAlertsForRole(alerts: Alert[], role: HospitalRole): Alert[] {
  return alerts.filter((alert) => {
    if (alert.dismissed) return false;
    if (!alert.ownerRole) return true;
    return alert.ownerRole === role || alert.escalationRole === role;
  });
}

export function getActiveAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter(
    (alert) =>
      !alert.dismissed &&
      deriveLifecycleStatus(alert) !== 'resolved' &&
      deriveLifecycleStatus(alert) !== 'expired',
  );
}

export function getAlertLifecycleHistory(limit = 100): AlertLifecycleAuditEvent[] {
  return lifecycleAuditTrail.slice(0, limit);
}

export function shouldSurfaceAlertToast(alert: Alert): boolean {
  if (alert.metadata?.suppressToast === true) return false;
  return shouldToastOperationalAlert(alert);
}

/** Prepare derived operational alerts with lifecycle metadata without store side effects. */
export function prepareOperationalDerivedAlerts(alerts: Alert[]): Alert[] {
  return alerts.map((alert) =>
    alert.metadata?.orchestratorVersion ? alert : prepareUnifiedAlert(alert),
  );
}

/** Records lifecycle audit when derived alerts are created, synced, or expire between cycles. */
export function syncDerivedAlertsLifecycle(
  previousAlerts: Alert[],
  nextAlerts: Alert[],
  source = 'emergencyOperationalSync',
): void {
  const previousDerivedIds = new Set(
    previousAlerts.filter((alert) => isDerivedAlertId(alert.id)).map((alert) => alert.id),
  );
  const nextDerived = nextAlerts.filter((alert) => isDerivedAlertId(alert.id));

  for (const alert of nextDerived) {
    recordLifecycleAudit(
      alert.id,
      previousDerivedIds.has(alert.id) ? 'synced' : 'created',
      source,
      { sourceScreen: source },
      {
        derived: true,
        severity: alert.severity,
        ownerRole: alert.ownerRole,
        lifecycleStatus: alert.lifecycleStatus,
      },
    );
  }

  for (const id of previousDerivedIds) {
    if (!nextDerived.some((alert) => alert.id === id)) {
      recordLifecycleAudit(id, 'expired', source, { sourceScreen: source }, { derived: true });
    }
  }
}

export function mapAlertToClinicalDisplay(alert: Alert) {
  const tier = mapSeverityToTier(alert.severity);
  return {
    id: alert.id,
    timestamp: new Date(alert.createdAt),
    severity:
      tier === 'critical'
        ? ('critical' as const)
        : tier === 'high'
          ? ('high' as const)
          : tier === 'medium'
            ? ('moderate' as const)
            : ('low' as const),
    title: alert.title,
    description: alert.message,
    source: alert.source || 'CareDroid',
    status:
      alert.acknowledged || alert.lifecycleStatus === 'acknowledged'
        ? ('acknowledged' as const)
        : ('unacknowledged' as const),
    findings: [
      alert.ownerRole ? `Owner: ${alert.ownerRole}` : '',
      alert.escalationRole ? `Escalation: ${alert.escalationRole}` : '',
      alert.acknowledgedByRole ? `Acknowledged by: ${alert.acknowledgedByRole}` : '',
      alert.recommendedAction || '',
      typeof alert.metadata?.findings === 'string' ? alert.metadata.findings : '',
    ].filter(Boolean),
  };
}