/**
 * Unified CareDroid alert lifecycle — one taxonomy for frontend and backend surfaces.
 * Pair with alertClassificationModel tiers and alertEngine dispatch.
 */
import type { SemanticColorRole } from './semanticColorSystem';
import { resolveSemanticColorRole } from './semanticColorSystem';

export const ALERT_LIFECYCLE_STATES = Object.freeze([
  'information',
  'notice',
  'warning',
  'urgent',
  'critical',
  'resolved',
  'dismissed',
  'expired',
  'escalated',
  'acknowledged',
] as const);

export type AlertLifecycleState = (typeof ALERT_LIFECYCLE_STATES)[number];

/** Required fields for every operational alert record. */
export const ALERT_RECORD_CONTRACT = Object.freeze({
  severity: 'information | notice | warning | urgent | critical',
  priority: 'numeric rank — lower is higher priority',
  owner: 'role or staff id responsible for next action',
  patientId: 'optional — when alert is patient-scoped',
  department: 'ED | EMS | Capacity | Referral | System',
  timestamp: 'ISO-8601 createdAt',
  source: 'engine id or API origin',
  recommendedAction: 'single primary next step',
  aiExplanation: 'optional — when AI-generated',
  acknowledgedBy: 'optional staff id',
  resolutionStatus: 'open | acknowledged | resolved | dismissed | expired | escalated',
});

/** Maps classification tiers (alertClassificationModel) to lifecycle + primary surface. */
export const ALERT_TIER_TO_LIFECYCLE: Readonly<
  Record<string, { state: AlertLifecycleState; semantic: SemanticColorRole; primarySurface: string }>
> = Object.freeze({
  critical: Object.freeze({
    state: 'critical',
    semantic: 'critical',
    primarySurface: 'header-bell',
  }),
  high: Object.freeze({
    state: 'urgent',
    semantic: 'urgent',
    primarySurface: 'operational-strip',
  }),
  medium: Object.freeze({
    state: 'warning',
    semantic: 'attention',
    primarySurface: 'operational-strip',
  }),
  informational: Object.freeze({
    state: 'information',
    semantic: 'information',
    primarySurface: 'drawer',
  }),
});

export type AlertLifecycleEnvelope = {
  state: AlertLifecycleState;
  semantic: SemanticColorRole;
  primarySurface: string;
  showToast: boolean;
  showPersistentBanner: boolean;
  showInHistory: boolean;
};

export function resolveAlertLifecycle(
  classificationTier: string,
  options: { acknowledged?: boolean; resolved?: boolean; dismissed?: boolean } = {},
): AlertLifecycleEnvelope {
  if (options.resolved) {
    return Object.freeze({
      state: 'resolved',
      semantic: 'healthy',
      primarySurface: 'history',
      showToast: false,
      showPersistentBanner: false,
      showInHistory: true,
    });
  }
  if (options.dismissed) {
    return Object.freeze({
      state: 'dismissed',
      semantic: 'inactive',
      primarySurface: 'history',
      showToast: false,
      showPersistentBanner: false,
      showInHistory: true,
    });
  }
  if (options.acknowledged) {
    return Object.freeze({
      state: 'acknowledged',
      semantic: resolveSemanticColorRole(classificationTier, 'information'),
      primarySurface: 'history',
      showToast: false,
      showPersistentBanner: false,
      showInHistory: true,
    });
  }

  const mapping = ALERT_TIER_TO_LIFECYCLE[classificationTier] || ALERT_TIER_TO_LIFECYCLE.informational;
  return Object.freeze({
    state: mapping.state,
    semantic: mapping.semantic,
    primarySurface: mapping.primarySurface,
    showToast: classificationTier === 'critical',
    showPersistentBanner: classificationTier === 'critical' || classificationTier === 'high',
    showInHistory: true,
  });
}