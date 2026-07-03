import { Injectable, Optional } from '@nestjs/common';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  HUMAN_REVIEW_DISCLAIMER,
  EXTERNAL_DATA_REVIEW_DISCLAIMER,
} from '../../../../lib/ai/safetyPolicy';
import {
  CareDroidCentralNodeService,
  EmergencyPatientService,
  EmergencySettingsService,
  WorkflowActionLogService,
} from './emergency-os.services';
import {
  buildNativeAiDriftEvaluations,
  buildOperationalDriftReport,
} from '../../../../lib/native-ai/driftMonitoring';
import { listRegisteredModels } from '../../../../lib/native-ai/modelRegistry';
import { recordBackendWorkflowTelemetry } from '../../common/observability/platform-telemetry-sink';
import type {
  EmergencyModuleEnvelope,
  OperationalAlert,
  OperationalAnomaly,
  OperationalAuditEvent,
  OperationalInputEvent,
  OperationalIntelligenceSettings,
  OperationalIntelligenceSnapshot,
  OperationalModelHealth,
  OperationalPrediction,
  OperationalRecommendation,
  OperationalScore,
  OperationalSignal,
} from './emergency-os.types';

const OI_LAYER = 'CareDroidOperationalIntelligence' as const;
const OI_VERSION = '1.0.0-rule-baseline';
const CLINICAL_DISCLAIMER =
  'Human review required. This is not a replacement for clinical judgment.';
const OPERATIONAL_DISCLAIMER = 'Operational intelligence is advisory. Human review required.';

const BLOCKED_AUTONOMOUS_ACTIONS = Object.freeze([
  'change_patient_journey_state',
  'assign_acuity',
  'diagnose',
  'prescribe',
  'discharge',
  'admit',
  'merge_patients',
  'import_external_data',
  'send_clinical_orders',
  'override_staff',
  'auto_triage',
  'auto_identify_patient',
]);

function envelope<T>(module: string, data: T): EmergencyModuleEnvelope<T> {
  return {
    module,
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: 'active',
    data,
  };
}

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

@Injectable()
export class OperationalIntelligenceService {
  private lastEvaluatedAt: string | null = null;

  constructor(
    private readonly centralNodeService: CareDroidCentralNodeService,
    private readonly patientService: EmergencyPatientService,
    private readonly settingsService: EmergencySettingsService,
    private readonly workflowLogService: WorkflowActionLogService,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  private getSettings(): OperationalIntelligenceSettings {
    return this.settingsService.getSettings().data.operationalIntelligenceSettings;
  }

  buildSnapshot(): OperationalIntelligenceSnapshot {
    const generatedAt = new Date().toISOString();
    const settings = this.getSettings();
    const centralEnvelope = this.centralNodeService.getSnapshot();
    const central = centralEnvelope.data;
    const tenantId = this.settingsService.getSettings().data.tenantName;
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

    const scores: OperationalScore[] = [
      {
        id: 'capacity-score',
        label: 'Capacity',
        value: central.capacityStatus.score,
        band: central.capacityStatus.band,
        modelOrRuleId: 'rule-capacity-v1',
        version: OI_VERSION,
        confidence: 0.92,
        reasonCodes: ['capacity_engine', 'occupancy', 'boarding_load'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      },
      {
        id: 'ems-pressure-score',
        label: 'EMS pressure',
        value: central.emsInbound,
        band: central.emsPressure,
        modelOrRuleId: 'rule-ems-pressure-v1',
        version: OI_VERSION,
        confidence: 0.88,
        reasonCodes: ['inbound_count', 'critical_arrivals'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      },
      {
        id: 'boarding-risk-score',
        label: 'Boarding risk',
        value: central.boarders,
        band: central.boardingRisk,
        modelOrRuleId: 'rule-boarding-risk-v1',
        version: OI_VERSION,
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
        version: OI_VERSION,
        confidence: 0.86,
        reasonCodes: ['queue_target_breach'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      },
      {
        id: 'reassessment-priority-score',
        label: 'Reassessment priority',
        value: central.reassessmentsDue,
        band: scoreBand(central.reassessmentsDue, 1, 4),
        modelOrRuleId: 'rule-reassessment-priority-v1',
        version: OI_VERSION,
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
        value: `${central.capacityStatus.score} ${central.capacityStatus.band}`,
        tone:
          central.capacityStatus.band === 'Red'
            ? 'critical'
            : central.capacityStatus.band === 'Orange'
              ? 'warning'
              : 'info',
        sourceModule: 'capacity-intelligence',
        timestamp: generatedAt,
      },
      {
        id: 'signal-ems',
        category: 'ems',
        label: 'EMS inbound',
        value: central.emsInbound,
        tone: central.emsPressure === 'critical' ? 'critical' : 'info',
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
        message: `Central node snapshot is ${syncAgeMinutes} minutes old. Review sync before acting.`,
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
    if (central.capacityStatus.band === 'Red') {
      anomalies.push({
        id: 'anomaly-capacity-critical',
        category: 'capacity',
        severity: 'Critical',
        title: 'Capacity in critical band',
        message: `Department capacity score ${central.capacityStatus.score} is in Red band.`,
        reasonCodes: ['capacity_red_band'],
        detectedAt: generatedAt,
        humanReviewRequired: true,
      });
    }

    const recommendations: OperationalRecommendation[] = [];
    if (central.reassessmentsDue > 0) {
      recommendations.push({
        id: 'rec-review-reassessment',
        action: 'Review reassessment queue',
        rationale: `${central.reassessmentsDue} patients have reassessment due flags.`,
        route: '/emergency/reassessment',
        modelOrRuleId: 'rule-reassessment-priority-v1',
        version: OI_VERSION,
        confidence: 0.93,
        reasonCodes: ['reassessment_due'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      });
    }
    if (central.emsInbound > 0) {
      recommendations.push({
        id: 'rec-check-ems',
        action: 'Check EMS inbound',
        rationale: `${central.emsInbound} inbound EMS patients require offload review.`,
        route: '/emergency/ems',
        modelOrRuleId: 'rule-ems-pressure-v1',
        version: OI_VERSION,
        confidence: 0.87,
        reasonCodes: ['ems_inbound'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      });
    }
    if (central.boarders > 0) {
      recommendations.push({
        id: 'rec-review-boarders',
        action: 'Review boarders',
        rationale: `${central.boarders} patients are boarding. Review escalation status.`,
        route: '/emergency/boarding',
        modelOrRuleId: 'rule-boarding-risk-v1',
        version: OI_VERSION,
        confidence: 0.89,
        reasonCodes: ['boarding_pressure'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      });
    }
    if (breachedQueues.length > 0) {
      recommendations.push({
        id: 'rec-review-queues',
        action: 'Review queue bottlenecks',
        rationale: `${breachedQueues.length} queues breached wait targets.`,
        route: '/emergency/queues',
        modelOrRuleId: 'rule-queue-bottleneck-v1',
        version: OI_VERSION,
        confidence: 0.9,
        reasonCodes: ['queue_breach'],
        timestamp: generatedAt,
        humanReviewRequired: true,
      });
    }
    if (dataFreshnessStatus !== 'fresh') {
      recommendations.push({
        id: 'rec-review-stale-data',
        action: 'Review stale operational data',
        rationale: 'Operational snapshot freshness is degraded. Confirm sync before decisions.',
        route: '/emergency/settings',
        modelOrRuleId: 'rule-data-freshness-v1',
        version: OI_VERSION,
        confidence: 0.95,
        reasonCodes: ['data_freshness'],
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

    const driftReport = settings.driftMonitoringEnabled
      ? buildOperationalDriftReport(buildNativeAiDriftEvaluations())
      : null;

    const nativeAiModels = listRegisteredModels().map((model) => ({
      modelOrRuleId: model.id,
      version: model.version,
      status: (model.status === 'deprecated' ? 'fallback' : 'active') as
        | 'active'
        | 'fallback'
        | 'unavailable',
      inputSchemaValid: true,
      missingValues: 0,
      dataFreshnessMinutes: syncAgeMinutes === Number.POSITIVE_INFINITY ? 999 : syncAgeMinutes,
      errorRate: 0,
      latencyMs: 18,
      lastTrainedAt: model.deployedAt,
      lastEvaluatedAt: generatedAt,
      fallbackMode: model.maturity !== 'live',
      driftDetected: driftReport?.alerts.some((alert) => alert.modelId === model.id) ?? false,
    }));

    const modelHealth: OperationalModelHealth = {
      status: settings.modelMonitoringEnabled
        ? driftReport?.driftDetected
          ? 'degraded'
          : 'fallback'
        : 'healthy',
      mode: settings.operationalIntelligenceMode,
      models: [
        {
          modelOrRuleId: 'rule-operational-baseline-v1',
          version: OI_VERSION,
          status: 'active',
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
        ...nativeAiModels,
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
            tone:
              central.capacityStatus.band === 'Red' ? ('critical' as const) : ('warning' as const),
            module: 'capacity',
          }
        : null,
    ].filter((badge): badge is NonNullable<typeof badge> => Boolean(badge));

    const recentAuditEvents: OperationalAuditEvent[] = this.workflowLogService
      .listLogs()
      .slice(0, 8)
      .map((log) => ({
        id: log.id,
        type: log.type,
        summary: log.summary,
        timestamp: log.timestamp,
        source: log.source,
        humanReviewRequired: true as const,
      }));

    this.lastEvaluatedAt = generatedAt;

    return {
      layer: OI_LAYER,
      generatedAt,
      tenantId,
      mode: settings.operationalIntelligenceMode,
      enabled: settings.operationalIntelligenceEnabled,
      disclaimers: {
        operational: OPERATIONAL_DISCLAIMER,
        clinical: CLINICAL_DISCLAIMER,
        externalData: EXTERNAL_DATA_REVIEW_DISCLAIMER,
      },
      centralNodeLinked: true,
      featureVector,
      scores,
      signals,
      predictions: [] as OperationalPrediction[],
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
        alerts: [],
      },
      dataFreshness: {
        status: dataFreshnessStatus,
        lastSyncedAt: central.generatedAt,
        ageMinutes: syncAgeMinutes === Number.POSITIVE_INFINITY ? 0 : syncAgeMinutes,
        visible: settings.dataFreshnessVisible,
      },
      badges,
      blockedAutonomousActions: [...BLOCKED_AUTONOMOUS_ACTIONS],
      recentAuditEvents,
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

  publishRealtimeSignals(trigger = 'operational_intelligence_updated'): void {
    if (!this.realtimeService) return;
    const settings = this.getSettings();
    if (!settings.operationalIntelligenceEnabled) return;

    const snapshot = this.buildSnapshot();
    const activeAlerts = snapshot.alerts.filter((alert) => !alert.dismissed).length;

    this.realtimeService.publish({
      type: 'operational_intelligence_updated',
      payload: {
        trigger,
        generatedAt: snapshot.generatedAt,
        tenantId: snapshot.tenantId,
        metrics: {
          anomalyCount: snapshot.anomalies.length,
          recommendationCount: snapshot.recommendations.length,
          activeAlerts,
          capacityBand: snapshot.featureVector.capacityBand,
          capacityScore: snapshot.featureVector.capacityScore,
          breachedQueues: snapshot.featureVector.breachedQueues,
          waitingPatients: snapshot.featureVector.waitingPatients,
          emsInbound: snapshot.featureVector.emsInbound,
        },
        humanReviewRequired: true,
        advisoryOnly: true,
      },
    });

    for (const anomaly of snapshot.anomalies) {
      const category = anomaly.category.toLowerCase();
      if (!category.includes('bottleneck') && !category.includes('queue')) continue;
      this.realtimeService.publish({
        type: 'bottleneck_detected',
        payload: {
          anomalyId: anomaly.id,
          title: anomaly.title,
          message: anomaly.message,
          severity: anomaly.severity,
          category: anomaly.category,
          reasonCodes: anomaly.reasonCodes,
          detectedAt: anomaly.detectedAt,
          humanReviewRequired: true,
        },
      });
    }

    for (const score of snapshot.scores) {
      const band = score.band.toLowerCase();
      if (band !== 'critical' && band !== 'warning') continue;
      if (
        !score.id.includes('capacity') &&
        !score.id.includes('boarding') &&
        !score.id.includes('ems') &&
        !score.id.includes('queue')
      ) {
        continue;
      }
      this.realtimeService.publish({
        type: 'congestion_predicted',
        payload: {
          scoreId: score.id,
          label: score.label,
          value: score.value,
          band: score.band,
          confidence: score.confidence,
          reasonCodes: score.reasonCodes,
          predictedAt: score.timestamp,
          humanReviewRequired: true,
        },
      });
    }

    if (snapshot.modelHealth.status !== 'healthy' || snapshot.dataFreshness.status === 'stale') {
      this.realtimeService.publish({
        type: 'service_health_updated',
        payload: {
          status: snapshot.modelHealth.status,
          dataFreshness: snapshot.dataFreshness.status,
          generatedAt: snapshot.generatedAt,
          humanReviewRequired: true,
        },
      });
    }
  }

  getSnapshotEnvelope() {
    return envelope('CareDroid Operational Intelligence', this.buildSnapshot());
  }

  getModelHealthEnvelope() {
    const snapshot = this.buildSnapshot();
    return envelope('Operational Model Health', snapshot.modelHealth);
  }

  getAlertsEnvelope() {
    const snapshot = this.buildSnapshot();
    return envelope('Operational Intelligence Alerts', snapshot.alerts);
  }

  evaluate(events: OperationalInputEvent[] = []) {
    const startedAt = Date.now();
    const snapshot = this.buildSnapshot();
    const accepted = events.filter((event) => event.humanReviewRequired);
    const trigger =
      accepted.length > 0 ? String(accepted[accepted.length - 1]?.type || 'operational_intelligence_updated') : 'operational_intelligence_evaluate';
    this.publishRealtimeSignals(trigger);
    recordBackendWorkflowTelemetry({
      workflowType: 'operational-intelligence-refresh',
      name: 'operational_intelligence.evaluate',
      message: `OI evaluate trigger=${trigger}`,
      durationMs: Date.now() - startedAt,
      metadata: {
        trigger,
        acceptedEvents: accepted.length,
        rejectedEvents: events.length - accepted.length,
        anomalyCount: snapshot.anomalies.length,
        recommendationCount: snapshot.recommendations.length,
        activeAlerts: snapshot.alerts.filter((alert) => !alert.dismissed).length,
        capacityBand: snapshot.featureVector.capacityBand,
      },
    });
    return envelope('Operational Intelligence Evaluation', {
      evaluatedAt: new Date().toISOString(),
      acceptedEvents: accepted.length,
      rejectedEvents: events.length - accepted.length,
      snapshot,
      safetyNotice: OPERATIONAL_DISCLAIMER,
      blockedAutonomousActions: BLOCKED_AUTONOMOUS_ACTIONS,
      lastEvaluatedAt: this.lastEvaluatedAt,
    });
  }
}
