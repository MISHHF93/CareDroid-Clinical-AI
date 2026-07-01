import type { CareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import type { Patient, Referral } from '../types/emergency';
import { summarizeWhatHappensNextBoard } from '../services/whatHappensNextGuidance';
import {
  BLOCKED_AUTONOMOUS_ACTIONS,
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
  OI_RULE_BASELINE_VERSION,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
  type OperationalAlert,
  type OperationalAnomaly,
  type OperationalIntelligenceSettings,
  type OperationalIntelligenceSnapshot,
  type OperationalRecommendation,
  type OperationalScore,
  type OperationalSignal,
} from './operationalIntelligence.types';

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

type BuildOperationalIntelligenceOptions = {
  centralSnapshot: CareDroidCentralNodeSnapshot;
  settings?: Partial<OperationalIntelligenceSettings>;
  tenantId?: string;
  patients?: Patient[];
  referrals?: Referral[];
  workflowLogs?: Array<{
    id: string;
    type: string;
    summary: string;
    timestamp: string;
    source: string;
  }>;
  backendSnapshot?: OperationalIntelligenceSnapshot | null;
};

export function resolveOperationalIntelligenceSettings(
  settings?: Partial<OperationalIntelligenceSettings> | Record<string, unknown>,
): OperationalIntelligenceSettings {
  const raw = (settings || {}) as Partial<OperationalIntelligenceSettings>;
  return {
    ...DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
    ...raw,
    humanReviewRequired: true,
  };
}

export function buildCareDroidOperationalIntelligenceSnapshot({
  centralSnapshot,
  settings,
  tenantId = 'CareDroid Emergency Department',
  patients = [] as any[],
  referrals = [] as any[],
  workflowLogs = [] as any[],
  backendSnapshot = null,
}: BuildOperationalIntelligenceOptions): OperationalIntelligenceSnapshot {
  if (backendSnapshot?.layer === CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER) {
    return {
      ...backendSnapshot,
      centralNode: centralSnapshot,
      centralNodeLinked: true,
    };
  }

  const oiSettings = resolveOperationalIntelligenceSettings(settings);
  const generatedAt = new Date().toISOString();
  const breachedQueues = centralSnapshot.queueHealth.filter((queue) => queue.breached);
  const syncAgeMinutes = minutesSince(centralSnapshot.sync.lastSyncedAt || centralSnapshot.generatedAt);
  const dataFreshnessStatus =
    centralSnapshot.sync.stale || syncAgeMinutes > 10
      ? 'stale'
      : syncAgeMinutes > 2
        ? 'aging'
        : 'fresh';

  const featureVector = {
    activePatients: centralSnapshot.currentDepartmentStatus.activePatients,
    waitingPatients: centralSnapshot.currentDepartmentStatus.waitingPatients,
    longestWaitMinutes: centralSnapshot.currentDepartmentStatus.longestWait,
    averageWaitMinutes: centralSnapshot.currentDepartmentStatus.averageWait,
    emsInbound: centralSnapshot.emsPressure.inbound,
    reassessmentsDue: centralSnapshot.reassessmentStatus.due,
    capacityScore: centralSnapshot.capacityStatus.score,
    capacityBand: centralSnapshot.capacityStatus.band,
    boarders: centralSnapshot.boardingStatus.boarders,
    referralsPending: centralSnapshot.referralStatus.pending,
    breachedQueues: breachedQueues.length,
    activeAlerts: centralSnapshot.currentDepartmentStatus.activeAlerts,
    syncStale: dataFreshnessStatus === 'stale',
  };

  const scores: OperationalScore[] = [
    {
      id: 'capacity-score',
      label: 'Capacity',
      value: centralSnapshot.capacityStatus.score,
      band: centralSnapshot.capacityStatus.band,
      modelOrRuleId: 'rule-capacity-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.92,
      reasonCodes: ['capacity_engine', 'occupancy', 'boarding_load'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    },
    {
      id: 'ems-pressure-score',
      label: 'EMS pressure',
      value: centralSnapshot.emsPressure.inbound,
      band: centralSnapshot.emsPressure.status,
      modelOrRuleId: 'rule-ems-pressure-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.88,
      reasonCodes: ['inbound_count', 'critical_arrivals'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    },
    {
      id: 'boarding-risk-score',
      label: 'Boarding risk',
      value: centralSnapshot.boardingStatus.boarders,
      band: centralSnapshot.boardingStatus.risk,
      modelOrRuleId: 'rule-boarding-risk-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.9,
      reasonCodes: ['boarder_count', 'boarding_thresholds'],
      timestamp: generatedAt,
      humanReviewRequired: true,
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
      humanReviewRequired: true,
    },
    {
      id: 'reassessment-priority-score',
      label: 'Reassessment priority',
      value: centralSnapshot.reassessmentStatus.due,
      band: scoreBand(centralSnapshot.reassessmentStatus.due, 1, 4),
      modelOrRuleId: 'rule-reassessment-priority-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.91,
      reasonCodes: ['reassessment_due_flags'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    },
  ];

  const signals: OperationalSignal[] = [
    {
      id: 'signal-capacity',
      category: 'capacity',
      label: 'Capacity band',
      value: `${centralSnapshot.capacityStatus.score} ${centralSnapshot.capacityStatus.band}`,
      tone:
        centralSnapshot.capacityStatus.band === 'Red'
          ? 'critical'
          : centralSnapshot.capacityStatus.band === 'Orange'
            ? 'warning'
            : 'info',
      sourceModule: 'capacity-intelligence',
      timestamp: generatedAt,
    },
    {
      id: 'signal-ems',
      category: 'ems',
      label: 'EMS inbound',
      value: centralSnapshot.emsPressure.inbound,
      tone: centralSnapshot.emsPressure.status === 'critical' ? 'critical' : 'info',
      sourceModule: 'ems-pipeline',
      timestamp: generatedAt,
    },
    {
      id: 'signal-queues',
      category: 'queues',
      label: 'Breached queues',
      value: breachedQueues.length,
      tone: breachedQueues.length > 0 ? 'warning' : 'success',
      sourceModule: 'queue-intelligence',
      timestamp: generatedAt,
    },
  ];

  const anomalies: OperationalAnomaly[] = [];
  if (dataFreshnessStatus === 'stale') {
    anomalies.push({
      id: 'anomaly-stale-data',
      category: 'data_freshness',
      severity: 'Warning',
      title: 'Operational data may be stale',
      message: `Central node sync is ${syncAgeMinutes} minutes old. Review sync before acting.`,
      reasonCodes: ['data_freshness_threshold'],
      detectedAt: generatedAt,
      humanReviewRequired: true,
    });
  }
  if (breachedQueues.length > 0) {
    anomalies.push({
      id: 'anomaly-queue-breach',
      category: 'queue_bottleneck',
      severity: breachedQueues.length >= 3 ? 'Critical' : 'Warning',
      title: 'Queue threshold breach',
      message: `${breachedQueues.length} queues exceed target wait thresholds.`,
      reasonCodes: ['queue_target_breach'],
      detectedAt: generatedAt,
      humanReviewRequired: true,
    });
  }
  if (centralSnapshot.capacityStatus.band === 'Red') {
    anomalies.push({
      id: 'anomaly-capacity-critical',
      category: 'capacity',
      severity: 'Critical',
      title: 'Capacity in critical band',
      message: `Department capacity score ${centralSnapshot.capacityStatus.score} is in Red band.`,
      reasonCodes: ['capacity_red_band'],
      detectedAt: generatedAt,
      humanReviewRequired: true,
    });
  }

  const recommendations: OperationalRecommendation[] = [];
  if (breachedQueues.length > 0) {
    const primaryQueue = [...breachedQueues].sort(
      (left, right) => (right.oldestWaitMinutes || 0) - (left.oldestWaitMinutes || 0),
    )[0];
    recommendations.push({
      id: 'rec-review-queues',
      action: `Open ${primaryQueue.label} queue`,
      rationale: `${breachedQueues.length} queue(s) breached; oldest wait ${primaryQueue.oldestWaitMinutes}m vs ${primaryQueue.targetMinutes}m target.`,
      route: '/emergency/queues',
      modelOrRuleId: 'rule-queue-bottleneck-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.94,
      reasonCodes: ['queue_target_breach'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    });
  }
  if (centralSnapshot.capacityStatus.band === 'Red' || centralSnapshot.capacityStatus.band === 'Orange') {
    recommendations.push({
      id: 'rec-review-capacity',
      action: 'Open capacity dashboard',
      rationale: `Capacity score ${centralSnapshot.capacityStatus.score} is in ${centralSnapshot.capacityStatus.band} band.`,
      route: '/emergency/capacity',
      modelOrRuleId: 'rule-capacity-pressure-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.91,
      reasonCodes: [`capacity_${centralSnapshot.capacityStatus.band.toLowerCase()}_band`],
      timestamp: generatedAt,
      humanReviewRequired: true,
    });
  }
  if (centralSnapshot.boardingStatus.boarders > 0) {
    recommendations.push({
      id: 'rec-review-boarders',
      action: 'Review boarders',
      rationale: `${centralSnapshot.boardingStatus.boarders} patients boarding · ${centralSnapshot.boardingStatus.risk} risk.`,
      route: '/emergency/boarding',
      modelOrRuleId: 'rule-boarding-risk-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.89,
      reasonCodes: ['boarding_pressure'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    });
  }
  if (centralSnapshot.reassessmentStatus.due > 0) {
    recommendations.push({
      id: 'rec-review-reassessment',
      action: 'Open reassessment queue',
      rationale: `${centralSnapshot.reassessmentStatus.due} due${centralSnapshot.reassessmentStatus.overdue ? ` · ${centralSnapshot.reassessmentStatus.overdue} overdue` : ''}.`,
      route: '/emergency/reassessment',
      modelOrRuleId: 'rule-reassessment-priority-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.93,
      reasonCodes: centralSnapshot.reassessmentStatus.overdue
        ? ['reassessment_overdue']
        : ['reassessment_due'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    });
  }
  if (centralSnapshot.emsPressure.inbound > 0) {
    recommendations.push({
      id: 'rec-check-ems',
      action: 'Check EMS inbound',
      rationale: `${centralSnapshot.emsPressure.inbound} inbound EMS patients require offload review.`,
      route: '/emergency/ems',
      modelOrRuleId: 'rule-ems-pressure-v1',
      version: OI_RULE_BASELINE_VERSION,
      confidence: 0.87,
      reasonCodes: ['ems_inbound'],
      timestamp: generatedAt,
      humanReviewRequired: true,
    });
  }

  const alerts: OperationalAlert[] = anomalies.map((anomaly) => ({
    id: `oi-alert-${anomaly.id}`,
    severity: anomaly.severity,
    title: anomaly.title,
    message: anomaly.message,
    createdAt: anomaly.detectedAt,
    dismissed: false,
    source: 'operational-intelligence',
    category: anomaly.category,
    reasonCodes: anomaly.reasonCodes,
    humanReviewRequired: true,
    advisoryOnly: true,
  }));

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
    centralSnapshot.reassessmentStatus.due > 0
      ? {
          id: 'badge-reassessment-risk',
          label: `${centralSnapshot.reassessmentStatus.due} reassess`,
          tone:
            centralSnapshot.reassessmentStatus.due >= 4
              ? ('critical' as const)
              : ('warning' as const),
          module: 'reassessment',
        }
      : null,
    centralSnapshot.capacityStatus.band === 'Red' || centralSnapshot.capacityStatus.band === 'Orange'
      ? {
          id: 'badge-capacity-risk',
          label: `Capacity ${centralSnapshot.capacityStatus.band}`,
          tone:
            centralSnapshot.capacityStatus.band === 'Red'
              ? ('critical' as const)
              : ('warning' as const),
          module: 'capacity',
        }
      : null,
  ].filter((badge): badge is NonNullable<typeof badge> => Boolean(badge));

  return {
    layer: CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
    generatedAt,
    tenantId,
    mode: oiSettings.operationalIntelligenceMode,
    enabled: oiSettings.operationalIntelligenceEnabled,
    disclaimers: OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
    centralNodeLinked: true,
    centralNode: centralSnapshot,
    featureVector,
    scores,
    signals,
    predictions: [],
    anomalies,
    recommendations: oiSettings.recommendationsEnabled ? recommendations : [],
    alerts: oiSettings.autoAlertingEnabled ? alerts : [],
    modelHealth: {
      status: oiSettings.modelMonitoringEnabled ? 'fallback' : 'healthy',
      mode: oiSettings.operationalIntelligenceMode,
      models: [
        {
          modelOrRuleId: 'rule-operational-baseline-v1',
          version: OI_RULE_BASELINE_VERSION,
          status: 'active',
          inputSchemaValid: true,
          missingValues: 0,
          dataFreshnessMinutes: syncAgeMinutes === Number.POSITIVE_INFINITY ? 0 : syncAgeMinutes,
          errorRate: 0,
          latencyMs: 8,
          lastTrainedAt: null,
          lastEvaluatedAt: generatedAt,
          fallbackMode: true,
          driftDetected: false,
        },
      ],
      generatedAt,
    },
    dataDrift: {
      enabled: oiSettings.driftMonitoringEnabled,
      driftDetected: false,
      featureDistributionShift: false,
      predictionDistributionShift: false,
      confidenceDistributionShift: false,
      summary: oiSettings.driftMonitoringEnabled
        ? 'Rule-based baseline active. ML drift monitoring reserved for future models.'
        : 'Drift monitoring disabled.',
      generatedAt,
    },
    dataFreshness: {
      status: dataFreshnessStatus,
      lastSyncedAt: centralSnapshot.sync.lastSyncedAt,
      ageMinutes: syncAgeMinutes === Number.POSITIVE_INFINITY ? 0 : syncAgeMinutes,
      visible: oiSettings.dataFreshnessVisible,
    },
    badges,
    blockedAutonomousActions: [...BLOCKED_AUTONOMOUS_ACTIONS],
    recentAuditEvents: workflowLogs.slice(0, 8).map((log) => ({
      id: log.id,
      type: log.type,
      summary: log.summary,
      timestamp: log.timestamp,
      source: log.source,
      humanReviewRequired: true as const,
    })),
    copilotContext: {
      operationalIntelligenceEnabled: oiSettings.operationalIntelligenceEnabled,
      mode: oiSettings.operationalIntelligenceMode,
      capacityScore: centralSnapshot.capacityStatus.score,
      capacityBand: centralSnapshot.capacityStatus.band,
      emsInbound: centralSnapshot.emsPressure.inbound,
      reassessmentsDue: centralSnapshot.reassessmentStatus.due,
      breachedQueues: breachedQueues.length,
      activeAlerts: centralSnapshot.currentDepartmentStatus.activeAlerts,
      dataFreshnessStatus,
      humanReviewRequired: true,
      whatHappensNextReassessmentDue: summarizeWhatHappensNextBoard(patients, {
        referrals,
      })['reassessment-due'],
      whatHappensNextTriageNeeded: summarizeWhatHappensNextBoard(patients, {
        referrals,
      })['triage-needed'],
    },
  };
}
