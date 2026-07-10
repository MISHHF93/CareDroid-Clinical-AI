import { Injectable, Optional } from '@nestjs/common';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  BLOCKED_AUTONOMOUS_OI_ACTIONS,
  buildOperationalIntelligenceSnapshot,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
} from '../../../../lib/operational-intelligence';
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
  OperationalInputEvent,
  OperationalIntelligenceSnapshot,
} from './emergency-os.types';

function envelope<T>(module: string, data: T): EmergencyModuleEnvelope<T> {
  return {
    module,
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: 'active',
    data,
  };
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

  private getSettings() {
    return this.settingsService.getSettings().data.operationalIntelligenceSettings;
  }

  buildSnapshot(): OperationalIntelligenceSnapshot {
    const generatedAt = new Date().toISOString();
    const settings = this.getSettings();
    const central = this.centralNodeService.getSnapshot().data;
    const tenantId = this.settingsService.getSettings().data.tenantName;

    const driftReport = settings.driftMonitoringEnabled
      ? buildOperationalDriftReport(buildNativeAiDriftEvaluations())
      : null;

    const syncAgeMinutes = central.generatedAt
      ? Math.max(0, Math.round((Date.now() - new Date(central.generatedAt).getTime()) / 60000))
      : 999;

    const supplementalModels = listRegisteredModels().map((model) => ({
      modelOrRuleId: model.id,
      version: model.version,
      status: (model.status === 'deprecated' ? 'fallback' : 'active') as
        | 'active'
        | 'fallback'
        | 'unavailable',
      inputSchemaValid: true,
      missingValues: 0,
      dataFreshnessMinutes: syncAgeMinutes,
      errorRate: 0,
      latencyMs: 18,
      lastTrainedAt: model.deployedAt,
      lastEvaluatedAt: generatedAt,
      fallbackMode: model.maturity !== 'live',
      driftDetected: driftReport?.alerts.some((alert) => alert.modelId === model.id) ?? false,
    }));

    const snapshot = buildOperationalIntelligenceSnapshot({
      generatedAt,
      tenantId,
      settings,
      central,
      recentAuditEvents: this.workflowLogService.listLogs().slice(0, 8),
      disclaimers: OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
      driftReport: driftReport ?? null,
      supplementalModels,
    });

    this.lastEvaluatedAt = generatedAt;
    return snapshot as OperationalIntelligenceSnapshot;
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
      accepted.length > 0
        ? String(accepted[accepted.length - 1]?.type || 'operational_intelligence_updated')
        : 'operational_intelligence_evaluate';
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
      safetyNotice: OPERATIONAL_INTELLIGENCE_DISCLAIMERS.operational,
      blockedAutonomousActions: [...BLOCKED_AUTONOMOUS_OI_ACTIONS],
      lastEvaluatedAt: this.lastEvaluatedAt,
    });
  }
}
