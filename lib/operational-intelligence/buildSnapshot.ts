import {
  BLOCKED_AUTONOMOUS_OI_ACTIONS,
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  OI_RULE_BASELINE_VERSION,
} from './constants';
import type {
  BuildOperationalIntelligenceSnapshotInput,
  OperationalIntelligenceSnapshotOutput,
} from './types';

function minutesSince(timestamp: string | null | undefined): number {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

function scoreBand(value: number, warning: number, critical: number): string {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'warning';
  return 'normal';
}

/** Canonical operational intelligence rule engine — single implementation for all runtimes. */
export function buildOperationalIntelligenceSnapshot(
  input: BuildOperationalIntelligenceSnapshotInput,
): OperationalIntelligenceSnapshotOutput {
  const { generatedAt, tenantId, settings, central, recentAuditEvents, disclaimers } = input;
  const breachedQueues = (central.queueMetrics || []).filter((queue) => queue.breached);
  const syncAgeMinutes = minutesSince(central.generatedAt);
  const dataFreshnessStatus =
    syncAgeMinutes <= 2 ? 'fresh' : syncAgeMinutes <= 10 ? 'aging' : 'stale';

  const featureVector = {
    activePatients: central.activePatients,
    waitingPatients: central.waitingPatients,
    longestWaitMinutes: central.longestWait,
    averageWaitMinutes: central.averageWait,
    emsInbound: central.emsInbound,
    reassessmentsDue: central.reassessmentsDue,
    capacityScore: central.capacityStatus.score,
    capacityBand: central.capacityStatus.band,
    boarders: central.boarders,
    referralsPending: central.referralsPending,
    breachedQueues: breachedQueues.length,
    activeAlerts: central.operationalAlerts.length,
    syncStale: dataFreshnessStatus === 'stale',
  };

  const scores = [
    {
      id: 'capacity-score',
      label: 'Capacity',
      value: central.capacityStatus.score,
      band: central.capacityStatus.band,
      modelOrRuleId: 'rule-capacity-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.92,
      reasonCodes: ['capacity_engine', 'occupancy', 'boarding_load'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    },
    {
      id: 'ems-pressure-score',
      label: 'EMS pressure',
      value: central.emsInbound,
      band: central.emsPressure,
      modelOrRuleId: 'rule-ems-pressure-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.88,
      reasonCodes: ['inbound_count', 'critical_arrivals'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    },
    {
      id: 'boarding-risk-score',
      label: 'Boarding risk',
      value: central.boarders,
      band: central.boardingRisk,
      modelOrRuleId: 'rule-boarding-risk-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.9,
      reasonCodes: ['boarder_count', 'boarding_thresholds'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    },
    {
      id: 'queue-bottleneck-score',
      label: 'Queue bottlenecks',
      value: breachedQueues.length,
      band: scoreBand(breachedQueues.length, 1, 3),
      modelOrRuleId: 'rule-queue-bottleneck-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.86,
      reasonCodes: ['queue_target_breach'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    },
    {
      id: 'reassessment-priority-score',
      label: 'Reassessment priority',
      value: central.reassessmentsDue,
      band: scoreBand(central.reassessmentsDue, 1, 4),
      modelOrRuleId: 'rule-reassessment-priority-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.91,
      reasonCodes: ['reassessment_due_flags'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    },
  ];

  const signals = [
    {
      id: 'signal-capacity',
      category: 'capacity',
      label: 'Capacity band',
      value: `${central.capacityStatus.score} ${central.capacityStatus.band}`,
      tone:
        central.capacityStatus.band === 'Red'
          ? ('critical' as const)
          : central.capacityStatus.band === 'Orange'
            ? ('warning' as const)
            : ('info' as const),
      sourceModule: 'capacity-intelligence',
      timestamp: generatedAt,
    },
    {
      id: 'signal-ems',
      category: 'ems',
      label: 'EMS inbound',
      value: central.emsInbound,
      tone: central.emsPressure === 'critical' ? ('critical' as const) : ('info' as const),
      sourceModule: 'ems-pipeline',
      timestamp: generatedAt,
    },
    {
      id: 'signal-queues',
      category: 'queues',
      label: 'Breached queues',
      value: breachedQueues.length,
      tone: breachedQueues.length > 0 ? ('warning' as const) : ('success' as const),
      sourceModule: 'queue-intelligence',
      timestamp: generatedAt,
    },
  ];

  const anomalies: OperationalIntelligenceSnapshotOutput['anomalies'] = [];
  if (dataFreshnessStatus === 'stale') {
    anomalies.push({
      id: 'anomaly-stale-data',
      category: 'data_freshness',
      severity: 'Warning' as const,
      title: 'Operational data may be stale',
      message: `Central node snapshot is ${syncAgeMinutes} minutes old. Review sync before acting.`,
      reasonCodes: ['data_freshness_threshold'],
      detectedAt: generatedAt,
      humanReviewRequired: true as const,
    });
  }
  if (breachedQueues.length > 0) {
    anomalies.push({
      id: 'anomaly-queue-breach',
      category: 'queue_bottleneck',
      severity: (breachedQueues.length >= 3 ? 'Critical' : 'Warning') as 'Critical' | 'Warning',
      title: 'Queue threshold breach',
      message: `${breachedQueues.length} queues exceed target wait thresholds.`,
      reasonCodes: ['queue_target_breach'],
      detectedAt: generatedAt,
      humanReviewRequired: true as const,
    });
  }
  if (central.capacityStatus.band === 'Red') {
    anomalies.push({
      id: 'anomaly-capacity-critical',
      category: 'capacity',
      severity: 'Critical' as const,
      title: 'Capacity in critical band',
      message: `Department capacity score ${central.capacityStatus.score} is in Red band.`,
      reasonCodes: ['capacity_red_band'],
      detectedAt: generatedAt,
      humanReviewRequired: true as const,
    });
  }

  const recommendations: OperationalIntelligenceSnapshotOutput['recommendations'] = [];
  if (central.reassessmentsDue > 0) {
    recommendations.push({
      id: 'rec-review-reassessment',
      action: 'Review reassessment queue',
      rationale: `${central.reassessmentsDue} patients have reassessment due flags.`,
      route: '/emergency/reassessment',
      modelOrRuleId: 'rule-reassessment-priority-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.93,
      reasonCodes: ['reassessment_due'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    });
  }
  if (central.emsInbound > 0) {
    recommendations.push({
      id: 'rec-check-ems',
      action: 'Check EMS inbound',
      rationale: `${central.emsInbound} inbound EMS patients require offload review.`,
      route: '/emergency/ems',
      modelOrRuleId: 'rule-ems-pressure-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.87,
      reasonCodes: ['ems_inbound'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    });
  }
  if (central.boarders > 0) {
    recommendations.push({
      id: 'rec-review-boarders',
      action: 'Review boarders',
      rationale: `${central.boarders} patients are boarding. Review escalation status.`,
      route: '/emergency/boarding',
      modelOrRuleId: 'rule-boarding-risk-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.89,
      reasonCodes: ['boarding_pressure'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    });
  }
  if (breachedQueues.length > 0) {
    recommendations.push({
      id: 'rec-review-queues',
      action: 'Review queue bottlenecks',
      rationale: `${breachedQueues.length} queues breached wait targets.`,
      route: '/emergency/queues',
      modelOrRuleId: 'rule-queue-bottleneck-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.9,
      reasonCodes: ['queue_breach'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    });
  }
  if (dataFreshnessStatus !== 'fresh') {
    recommendations.push({
      id: 'rec-review-stale-data',
      action: 'Review stale operational data',
      rationale: 'Operational snapshot freshness is degraded. Confirm sync before decisions.',
      route: '/emergency/settings',
      modelOrRuleId: 'rule-data-freshness-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.95,
      reasonCodes: ['data_freshness'],
      timestamp: generatedAt,
      humanReviewRequired: true as const,
    });
  }

  const alerts = anomalies.map((anomaly) => ({
    id: `oi-alert-${anomaly.id}`,
    severity: anomaly.severity,
    title: anomaly.title,
    message: anomaly.message,
    createdAt: anomaly.detectedAt,
    dismissed: false,
    source: 'operational-intelligence' as const,
    category: anomaly.category,
    reasonCodes: anomaly.reasonCodes,
    humanReviewRequired: true as const,
    advisoryOnly: true as const,
  }));

  const driftReport = input.driftReport ?? null;
  const modelHealthStatus = settings.modelMonitoringEnabled
    ? driftReport?.driftDetected
      ? 'degraded'
      : 'fallback'
    : 'healthy';

  const modelHealth = {
    status: modelHealthStatus as 'healthy' | 'degraded' | 'fallback' | 'unavailable',
    mode: settings.operationalIntelligenceMode,
    models: [
      {
        modelOrRuleId: 'rule-operational-baseline-v1',
        version: OI_RULE_BASELINE_VERSION,
        status: 'active' as const,
        inputSchemaValid: true,
        missingValues: 0,
        dataFreshnessMinutes: syncAgeMinutes === Number.POSITIVE_INFINITY ? 999 : syncAgeMinutes,
        errorRate: 0,
        latencyMs: 12,
        lastTrainedAt: null,
        lastEvaluatedAt: generatedAt,
        fallbackMode: true,
        driftDetected: false,
      },
      ...(input.supplementalModels || []),
    ],
    generatedAt,
  };

  const badges = [
    breachedQueues.length > 0
      ? {
          id: 'badge-queue-bottleneck',
          label: `${breachedQueues.length} queue breach`,
          tone: 'warning' as const,
          module: 'queues',
        }
      : null,
    dataFreshnessStatus === 'stale'
      ? {
          id: 'badge-stale-data',
          label: 'Stale data',
          tone: 'warning' as const,
          module: 'sync',
        }
      : null,
    central.reassessmentsDue > 0
      ? {
          id: 'badge-reassessment-risk',
          label: `${central.reassessmentsDue} reassess`,
          tone: central.reassessmentsDue >= 4 ? ('critical' as const) : ('warning' as const),
          module: 'reassessment',
        }
      : null,
    central.capacityStatus.band === 'Red' || central.capacityStatus.band === 'Orange'
      ? {
          id: 'badge-capacity-risk',
          label: `Capacity ${central.capacityStatus.band}`,
          tone: central.capacityStatus.band === 'Red' ? ('critical' as const) : ('warning' as const),
          module: 'capacity',
        }
      : null,
  ].filter((badge): badge is NonNullable<typeof badge> => Boolean(badge));

  return {
    layer: CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
    generatedAt,
    tenantId,
    mode: settings.operationalIntelligenceMode,
    enabled: settings.operationalIntelligenceEnabled,
    disclaimers,
    centralNodeLinked: true,
    featureVector,
    scores,
    signals,
    predictions: [],
    anomalies,
    recommendations: settings.recommendationsEnabled ? recommendations : [],
    alerts: settings.autoAlertingEnabled ? alerts : [],
    modelHealth,
    dataDrift: driftReport ?? {
      enabled: false,
      driftDetected: false,
      featureDistributionShift: false,
      predictionDistributionShift: false,
      confidenceDistributionShift: false,
      summary: 'Drift monitoring disabled.',
      generatedAt,
    },
    dataFreshness: {
      status: dataFreshnessStatus,
      lastSyncedAt: central.generatedAt,
      ageMinutes: syncAgeMinutes === Number.POSITIVE_INFINITY ? 0 : syncAgeMinutes,
      visible: settings.dataFreshnessVisible,
    },
    badges,
    blockedAutonomousActions: [...BLOCKED_AUTONOMOUS_OI_ACTIONS],
    recentAuditEvents: recentAuditEvents.map((log) => ({
      id: log.id,
      type: log.type,
      summary: log.summary,
      timestamp: log.timestamp,
      source: log.source,
      humanReviewRequired: true as const,
    })),
    copilotContext: {
      operationalIntelligenceEnabled: settings.operationalIntelligenceEnabled,
      mode: settings.operationalIntelligenceMode,
      capacityScore: central.capacityStatus.score,
      capacityBand: central.capacityStatus.band,
      emsInbound: central.emsInbound,
      reassessmentsDue: central.reassessmentsDue,
      breachedQueues: breachedQueues.length,
      activeAlerts: central.operationalAlerts.length,
      dataFreshnessStatus,
      humanReviewRequired: true,
    },
  };
}