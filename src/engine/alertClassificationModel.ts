/**
 * Four-tier operational alert taxonomy for CareDroid.
 * Maps canonical Alert records (Info | Warning | Critical) into clinician-facing tiers.
 * Lifecycle surfaces: see alertLifecycleModel.ts.
 */
import { resolveAlertLifecycle } from '../config/alertLifecycleModel';

export const ALERT_CLASSIFICATION_TIERS = Object.freeze([
  'critical',
  'high',
  'medium',
  'informational',
]);

export const ALERT_SOURCE_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'vitals-critical',
    domain: 'Patient',
    source: 'vitals-alert-engine',
    defaultTier: 'critical',
    surfaces: ['Header', 'alert drawer', 'PatientDetailPanel'],
  }),
  Object.freeze({
    id: 'deterioration-risk',
    domain: 'Patient',
    source: 'alert-reassessment-deterioration',
    defaultTier: 'critical',
    surfaces: ['Header', 'ReassessmentDrawer', 'OperationalHandoffDomainBar'],
  }),
  Object.freeze({
    id: 'reassessment-overdue',
    domain: 'Patient',
    source: 'alert-reassessment-reminder-overdue',
    defaultTier: 'critical',
    surfaces: ['Header', 'ReassessmentDrawer'],
  }),
  Object.freeze({
    id: 'reassessment-due',
    domain: 'Patient',
    source: 'alert-reassessment-reminder-due',
    defaultTier: 'high',
    surfaces: ['Header', 'ReassessmentDrawer'],
  }),
  Object.freeze({
    id: 'long-wait-lwbs',
    domain: 'Patient',
    source: 'alert-long-wait-lwbs',
    defaultTier: 'critical',
    surfaces: ['Header', 'QueueIntelligencePanel'],
  }),
  Object.freeze({
    id: 'lwbs-risk-advisory',
    domain: 'Patient',
    source: 'lwbs-risk-advisory',
    defaultTier: 'high',
    surfaces: ['Header', 'WaitingRoomSafetyBoard', 'PatientCard'],
  }),
  Object.freeze({
    id: 'deterioration-watch-advisory',
    domain: 'Patient',
    source: 'deterioration-watch-advisory',
    defaultTier: 'high',
    surfaces: ['Header', 'WaitingRoomSafetyBoard', 'PatientCard'],
  }),
  Object.freeze({
    id: 'long-wait-critical',
    domain: 'Patient',
    source: 'alert-long-wait-critical',
    defaultTier: 'critical',
    surfaces: ['Header', 'QueueIntelligencePanel'],
  }),
  Object.freeze({
    id: 'long-wait-warning',
    domain: 'Patient',
    source: 'alert-long-wait-warning',
    defaultTier: 'medium',
    surfaces: ['Header'],
  }),
  Object.freeze({
    id: 'capacity-red',
    domain: 'Capacity',
    source: 'alert-capacity-red',
    defaultTier: 'critical',
    surfaces: ['Header', 'CapacityCrisisMode', 'OperationalHandoffDomainBar'],
  }),
  Object.freeze({
    id: 'capacity-orange',
    domain: 'Capacity',
    source: 'alert-capacity-orange',
    defaultTier: 'high',
    surfaces: ['Header', 'CapacityCrisisMode'],
  }),
  Object.freeze({
    id: 'capacity-yellow',
    domain: 'Capacity',
    source: 'alert-capacity-yellow',
    defaultTier: 'informational',
    surfaces: ['Capacity page'],
    suppressGlobal: true,
  }),
  Object.freeze({
    id: 'ems-critical-inbound',
    domain: 'EMS',
    source: 'alert-ems-critical',
    defaultTier: 'critical',
    surfaces: ['Header', 'EMSCriticalBroadcast', 'OperationalHandoffDomainBar'],
  }),
  Object.freeze({
    id: 'referral-escalation',
    domain: 'Referral',
    source: 'alert-referral-critical-unacknowledged',
    defaultTier: 'critical',
    surfaces: ['Header', 'ReferralPanel', 'OperationalHandoffDomainBar'],
  }),
  Object.freeze({
    id: 'referral-emergent-pager',
    domain: 'Referral',
    source: 'alert-referral-emergent-pager',
    defaultTier: 'critical',
    surfaces: ['Header', 'ReferralPanel'],
  }),
  Object.freeze({
    id: 'referral-unacknowledged',
    domain: 'Referral',
    source: 'alert-referral-unacknowledged',
    defaultTier: 'high',
    surfaces: ['Header', 'ReferralPanel'],
  }),
  Object.freeze({
    id: 'referral-sent',
    domain: 'Referral',
    source: 'alert-referral-sent',
    defaultTier: 'informational',
    surfaces: ['ReferralPanel'],
    suppressGlobal: true,
  }),
  Object.freeze({
    id: 'queue-breach-critical',
    domain: 'Queue',
    source: 'alert-queue-breach',
    defaultTier: 'high',
    surfaces: ['Header', 'QueueIntelligencePanel'],
  }),
  Object.freeze({
    id: 'queue-bottleneck',
    domain: 'Queue',
    source: 'alert-bottleneck',
    defaultTier: 'high',
    surfaces: ['Header', 'QueueIntelligencePanel'],
  }),
  Object.freeze({
    id: 'manual-escalation',
    domain: 'Patient',
    source: 'alert-escalation',
    defaultTier: 'critical',
    surfaces: ['Header', 'PatientCard'],
  }),
  Object.freeze({
    id: 'reception-escalation',
    domain: 'Queue',
    source: 'reception-escalation-workflow',
    defaultTier: 'critical',
    surfaces: ['Header', 'ReceptionWorkspace', 'ChargeNurseOperationalStrip', 'ReceptionEscalationStrip'],
  }),
  Object.freeze({
    id: 'operational-intelligence',
    domain: 'System',
    source: 'operational-intelligence',
    defaultTier: 'informational',
    surfaces: ['Header'],
    suppressGlobal: true,
  }),
]);

const TIER_RANK = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  informational: 3,
});

function haystack(alert) {
  return `${alert.id || ''} ${alert.type || ''} ${alert.title || ''} ${alert.message || ''} ${alert.source || ''}`.toLowerCase();
}

export function classifyOperationalAlert(alert) {
  if (!alert) return 'informational';
  if (alert.metadata?.advisoryOnly) return 'informational';

  const text = haystack(alert);

  if (alert.severity === 'Critical') return 'critical';

  if (/alert-capacity-yellow|capacity.*yellow/.test(text)) return 'informational';
  if (/referral sent|alert-referral-sent/.test(text)) return 'informational';
  if (alert.severity === 'Info') return 'informational';

  if (
    /overdue|lwbs|escalation|deterioration|unacknowledged|critical long wait|critical ems|critical vitals/.test(
      text,
    )
  ) {
    return 'high';
  }

  if (/capacity.*orange|alert-capacity-orange|bottleneck|queue breach/.test(text)) {
    return 'high';
  }

  if (/recheck due now|emergent referral|wait time approaching|vitals warning/.test(text)) {
    return 'medium';
  }

  if (alert.severity === 'Warning') return 'medium';

  return 'informational';
}

export function shouldToastOperationalAlert(alert, classification = classifyOperationalAlert(alert)) {
  if (alert?.metadata?.advisoryOnly) return false;
  if (alert?.metadata?.suppressToast) return false;
  // Only critical-tier alerts pop a toast; high/warning stays in the alert rail
  return classification === 'critical';
}

export function shouldRetainDerivedAlert(alert, classification = classifyOperationalAlert(alert)) {
  const text = haystack(alert);
  if (/alert-capacity-yellow/.test(text) || (alert.type === 'Capacity' && alert.severity === 'Info')) {
    return false;
  }
  if (/alert-referral-sent/.test(text) && classification === 'informational') {
    return false;
  }
  if (/alert-reassessment-reminder-upcoming/.test(text)) {
    return false;
  }
  if (alert.type === 'Queue' && alert.severity === 'Warning' && !/bottleneck/.test(text)) {
    return false;
  }
  return true;
}

export function dedupeOperationalAlerts(alerts = [] as any[]) {
  const bestByBucket = new Map();

  for (const alert of alerts) {
    const classification = classifyOperationalAlert(alert);
    const bucket =
      alert.patientId && /reassessment|deterioration|long-wait/.test(haystack(alert))
        ? `patient-reassess-${alert.patientId}`
        : alert.patientId && alert.type === 'Referral'
          ? `patient-referral-${alert.patientId}`
          : alert.id;

    const existing = bestByBucket.get(bucket);
    if (!existing) {
      bestByBucket.set(bucket, { alert, classification });
      continue;
    }

    if (TIER_RANK[classification] < TIER_RANK[existing.classification]) {
      bestByBucket.set(bucket, { alert, classification });
    }
  }

  return [...bestByBucket.values()].map((entry) => entry.alert);
}

export function triageOperationalAlerts(alerts = [] as any[]) {
  const retained = dedupeOperationalAlerts(alerts.filter((alert) => shouldRetainDerivedAlert(alert as any)));
  const classified = retained.map((alert) => {
    const classification = classifyOperationalAlert(alert);
    return {
      ...alert,
      metadata: {
        ...(alert.metadata || {}),
        classification,
      },
    };
  });

  const visible = classified.filter(
    (alert) => classifyOperationalAlert(alert) !== 'informational' || alert.metadata?.forceVisible,
  );
  const suppressed = classified.filter((alert) => !visible.includes(alert));

  const counts = Object.fromEntries(ALERT_CLASSIFICATION_TIERS.map((tier) => [tier, 0]));
  for (const alert of classified) {
    const tier = classifyOperationalAlert(alert);
    counts[tier] += 1;
  }

  return Object.freeze({
    all: classified,
    visible: visible.sort(
      (a, b) =>
        TIER_RANK[classifyOperationalAlert(a)] - TIER_RANK[classifyOperationalAlert(b)] ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    suppressed,
    counts: Object.freeze(counts),
    actionableUnreadTier: new Set(['critical', 'high']),
  });
}

export function auditAlertInventory(alerts = [] as any[]) {
  const triage = triageOperationalAlerts(alerts);
  return Object.freeze({
    registryCount: ALERT_SOURCE_REGISTRY.length,
    inputCount: alerts.length,
    retainedCount: triage.all.length,
    visibleCount: triage.visible.length,
    suppressedCount: triage.suppressed.length,
    counts: triage.counts,
    suppressedIds: triage.suppressed.map((alert) => alert.id),
    recommendation:
      triage.suppressed.length > 0
        ? `Suppressed ${triage.suppressed.length} noisy alerts; critical/high remain in drawer and toasts.`
        : 'Alert volume is within triage thresholds.',
  });
}

export function getAlertClassificationTier(alert) {
  return alert?.metadata?.classification || classifyOperationalAlert(alert);
}

export function sortAlertsByClassification(alerts = [] as any[]) {
  return [...alerts].sort(
    (a, b) =>
      TIER_RANK[getAlertClassificationTier(a)] - TIER_RANK[getAlertClassificationTier(b)] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Unified lifecycle envelope for a single alert — toast, banner, and history routing. */
export function resolveOperationalAlertEnvelope(alert: any) {
  const tier = getAlertClassificationTier(alert);
  const resolution = String(alert?.resolutionStatus || alert?.metadata?.resolutionStatus || '');
  return resolveAlertLifecycle(tier, {
    acknowledged: Boolean(alert?.acknowledgedAt || alert?.metadata?.acknowledged),
    resolved: resolution === 'resolved',
    dismissed: resolution === 'dismissed',
  });
}

export { resolveAlertLifecycle } from '../config/alertLifecycleModel';
