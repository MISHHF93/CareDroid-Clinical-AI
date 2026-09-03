import {
  UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT,
  listUnifiedOperationalIntelligenceBackendEndpoints,
  listUnifiedOperationalIntelligenceDomains,
  resolveDomainForAnomalyCategory,
  type UnifiedOperationalIntelligenceDomain,
  type UnifiedOperationalIntelligenceDomainStatus,
  type UnifiedOperationalIntelligenceInsight,
  type UnifiedOperationalIntelligenceSnapshot,
  type UnifiedOperationalInsightType,
} from '../config/unifiedOperationalIntelligenceModel';
import type { AiChiefOrchestrationSnapshot } from './aiChiefContinuousMonitoringService';
import type { ContinuousPatientFlowSnapshot } from '../engine/continuousPatientFlowEngine';
import type { OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import { CANONICAL_ROUTES } from '../config/routes.config';

export type BuildUnifiedOperationalIntelligenceInput = Readonly<{
  backendSnapshot?: OperationalIntelligenceSnapshot | null;
  patientFlowSnapshot?: ContinuousPatientFlowSnapshot | null;
  aiChiefSnapshot?: AiChiefOrchestrationSnapshot | null;
  source?: UnifiedOperationalIntelligenceSnapshot['source'];
  lastBackendEventType?: string;
  workflowPendingReview?: number;
  now?: Date;
}>;

const DOMAIN_LABELS = Object.freeze(
  Object.fromEntries(
    listUnifiedOperationalIntelligenceDomains().map((domain) => [domain.id, domain.label]),
  ),
) as Record<UnifiedOperationalIntelligenceDomain, string>;

function severityFromBand(band: string): UnifiedOperationalIntelligenceInsight['severity'] {
  const normalized = band.toLowerCase();
  if (normalized === 'critical' || normalized === 'red') return 'critical';
  if (normalized === 'warning' || normalized === 'orange' || normalized === 'yellow')
    return 'warning';
  return 'info';
}

function severityFromAnomaly(severity: string): UnifiedOperationalIntelligenceInsight['severity'] {
  if (severity === 'Critical' || severity === 'critical') return 'critical';
  if (severity === 'Warning' || severity === 'warning') return 'warning';
  return 'info';
}

function mapBackendAnomalies(
  snapshot: OperationalIntelligenceSnapshot,
  source: UnifiedOperationalIntelligenceSnapshot['source'],
  lastBackendEventType?: string,
): UnifiedOperationalIntelligenceInsight[] {
  return snapshot.anomalies.map((anomaly) => {
    const domain = resolveDomainForAnomalyCategory(anomaly.category);
    const type: UnifiedOperationalInsightType =
      anomaly.category.toLowerCase().includes('bottleneck') ||
      anomaly.category.toLowerCase().includes('congestion')
        ? 'bottleneck'
        : 'anomaly';

    return Object.freeze({
      id: `uoi-anomaly-${anomaly.id}`,
      domain,
      type,
      title: anomaly.title,
      summary: anomaly.message,
      severity: severityFromAnomaly(anomaly.severity),
      ownerRole:
        listUnifiedOperationalIntelligenceDomains().find((entry) => entry.id === domain)
          ?.ownerRole || 'ed_manager',
      reasonCodes: Object.freeze(anomaly.reasonCodes || []),
      confidence: 0.9,
      humanReviewRequired: true as const,
      advisoryOnly: true as const,
      source,
      sourceEventType: lastBackendEventType,
      updatedAt: anomaly.detectedAt,
    });
  });
}

function mapBackendRecommendations(
  snapshot: OperationalIntelligenceSnapshot,
  source: UnifiedOperationalIntelligenceSnapshot['source'],
  lastBackendEventType?: string,
): UnifiedOperationalIntelligenceInsight[] {
  return snapshot.recommendations.map((recommendation) =>
    Object.freeze({
      id: `uoi-rec-${recommendation.id}`,
      domain: 'ai_recommendations' as const,
      type: 'intervention' as const,
      title: recommendation.action,
      summary: recommendation.rationale,
      severity: recommendation.confidence >= 0.85 ? 'warning' : 'info',
      route: recommendation.route || CANONICAL_ROUTES.emergencyCopilot,
      patientId: recommendation.patientId,
      ownerRole: 'ed_manager',
      reasonCodes: Object.freeze(recommendation.reasonCodes || []),
      confidence: recommendation.confidence,
      humanReviewRequired: true as const,
      advisoryOnly: true as const,
      source,
      sourceEventType: lastBackendEventType,
      updatedAt: recommendation.timestamp,
    }),
  );
}

function mapBackendAlerts(
  snapshot: OperationalIntelligenceSnapshot,
  source: UnifiedOperationalIntelligenceSnapshot['source'],
  lastBackendEventType?: string,
): UnifiedOperationalIntelligenceInsight[] {
  return snapshot.alerts
    .filter((alert) => !alert.dismissed)
    .map((alert) =>
      Object.freeze({
        id: `uoi-alert-${alert.id}`,
        domain: 'alerts' as const,
        type: 'alert' as const,
        title: alert.title,
        summary: alert.message,
        severity: severityFromAnomaly(alert.severity),
        route: CANONICAL_ROUTES.emergencyAlerts,
        patientId: alert.patientId,
        ownerRole: 'charge_nurse',
        reasonCodes: Object.freeze(alert.reasonCodes || []),
        confidence: 0.95,
        humanReviewRequired: true as const,
        advisoryOnly: true as const,
        source,
        sourceEventType: lastBackendEventType,
        updatedAt: alert.createdAt,
      }),
    );
}

function mapBackendCongestionScores(
  snapshot: OperationalIntelligenceSnapshot,
  source: UnifiedOperationalIntelligenceSnapshot['source'],
  lastBackendEventType?: string,
): UnifiedOperationalIntelligenceInsight[] {
  const congestedScores = snapshot.scores.filter((score) => {
    const band = score.band.toLowerCase();
    return band === 'critical' || band === 'warning';
  });

  return congestedScores.map((score) => {
    const domain: UnifiedOperationalIntelligenceDomain =
      score.id.includes('capacity') || score.id.includes('boarding')
        ? 'capacity'
        : score.id.includes('ems')
          ? 'patient_flow'
          : 'patient_flow';

    return Object.freeze({
      id: `uoi-score-${score.id}`,
      domain,
      type: 'congestion_prediction' as const,
      title: `${score.label} elevated`,
      summary: `${score.label} is ${score.band} (${score.value}). Review capacity and routing before surge.`,
      severity: severityFromBand(score.band),
      route:
        domain === 'capacity'
          ? CANONICAL_ROUTES.emergencyCapacity
          : CANONICAL_ROUTES.emergencyCommandCenter,
      ownerRole: 'ed_manager',
      reasonCodes: Object.freeze(score.reasonCodes || []),
      confidence: score.confidence,
      humanReviewRequired: true as const,
      advisoryOnly: true as const,
      source,
      sourceEventType: lastBackendEventType,
      updatedAt: score.timestamp,
    });
  });
}

function mapDegradedPatientFlowInsights(
  patientFlowSnapshot: ContinuousPatientFlowSnapshot,
): UnifiedOperationalIntelligenceInsight[] {
  return patientFlowSnapshot.detections.map((detection) => {
    const type: UnifiedOperationalInsightType =
      detection.type === 'department_congestion' || detection.type === 'department_overload'
        ? 'congestion_prediction'
        : detection.type === 'delayed_handoff'
          ? 'bottleneck'
          : 'bottleneck';

    return Object.freeze({
      id: `uoi-flow-${detection.id}`,
      domain: 'patient_flow' as const,
      type,
      title: detection.title,
      summary: detection.message,
      severity:
        detection.severity === 'critical'
          ? 'critical'
          : detection.severity === 'warning'
            ? 'warning'
            : 'info',
      route: CANONICAL_ROUTES.emergencyCommandCenter,
      patientId: detection.patientId,
      ownerRole: detection.ownerRole,
      reasonCodes: Object.freeze([detection.type, detection.recommendedAction]),
      confidence: 0.75,
      humanReviewRequired: true as const,
      advisoryOnly: true as const,
      source: 'degraded' as const,
      updatedAt: new Date().toISOString(),
    });
  });
}

function mapAiChiefRecommendations(
  aiChiefSnapshot: AiChiefOrchestrationSnapshot,
  source: UnifiedOperationalIntelligenceSnapshot['source'],
): UnifiedOperationalIntelligenceInsight[] {
  if (source !== 'degraded') return [];

  return aiChiefSnapshot.recommendations
    .filter((recommendation) => recommendation.modelOrRuleId !== 'operational-workflow-v1')
    .slice(0, 8)
    .map((recommendation) => {
      const domain: UnifiedOperationalIntelligenceDomain =
        recommendation.domain === 'staffing'
          ? 'staffing'
          : recommendation.domain === 'department_capacity'
            ? 'capacity'
            : recommendation.domain === 'bottlenecks'
              ? 'patient_flow'
              : recommendation.domain === 'alerts'
                ? 'alerts'
                : recommendation.domain === 'service_health'
                  ? 'service_health'
                  : 'ai_recommendations';

      return Object.freeze({
        id: `uoi-aichief-${recommendation.id}`,
        domain,
        type: 'recommendation' as const,
        title: recommendation.action,
        summary: recommendation.rationale,
        severity:
          recommendation.tone === 'critical'
            ? 'critical'
            : recommendation.tone === 'warning'
              ? 'warning'
              : 'info',
        route: recommendation.route,
        patientId: recommendation.patientId,
        ownerRole: recommendation.ownerRole,
        reasonCodes: Object.freeze(recommendation.reasonCodes || []),
        confidence: recommendation.confidence,
        humanReviewRequired: true as const,
        advisoryOnly: true as const,
        source,
        updatedAt: new Date().toISOString(),
      });
    });
}

function deriveDomainStatuses(
  insights: readonly UnifiedOperationalIntelligenceInsight[],
): readonly UnifiedOperationalIntelligenceDomainStatus[] {
  return Object.freeze(
    listUnifiedOperationalIntelligenceDomains().map((domain) => {
      const domainInsights = insights.filter((insight) => insight.domain === domain.id);
      const bottleneckCount = domainInsights.filter(
        (insight) => insight.type === 'bottleneck' || insight.type === 'congestion_prediction',
      ).length;

      let status: UnifiedOperationalIntelligenceDomainStatus['status'] = 'healthy';
      if (domainInsights.some((insight) => insight.severity === 'critical')) status = 'critical';
      else if (domainInsights.length > 0) status = 'watch';

      return Object.freeze({
        id: domain.id,
        label: DOMAIN_LABELS[domain.id],
        status,
        insightCount: domainInsights.length,
        bottleneckCount,
        signalSources: domain.signalSources,
      });
    }),
  );
}

function insightPriority(insight: UnifiedOperationalIntelligenceInsight): number {
  const severityRank = { critical: 0, warning: 1, info: 2 };
  const typeRank = {
    bottleneck: 0,
    congestion_prediction: 1,
    alert: 2,
    intervention: 3,
    recommendation: 4,
    anomaly: 5,
  };
  return severityRank[insight.severity] * 10 + typeRank[insight.type];
}

function sortInsights(
  insights: UnifiedOperationalIntelligenceInsight[],
): UnifiedOperationalIntelligenceInsight[] {
  return [...insights].sort((left, right) => insightPriority(left) - insightPriority(right));
}

export function isAuthoritativeUnifiedOperationalSnapshot(
  snapshot: UnifiedOperationalIntelligenceSnapshot | null | undefined,
): snapshot is UnifiedOperationalIntelligenceSnapshot {
  return Boolean(snapshot && snapshot.source !== 'degraded');
}

export function buildUnifiedOperationalIntelligenceSnapshot(
  input: BuildUnifiedOperationalIntelligenceInput = {},
): UnifiedOperationalIntelligenceSnapshot {
  const source = input.source ?? (input.backendSnapshot ? 'backend' : 'degraded');
  const backendSnapshot = input.backendSnapshot ?? null;
  const generatedAt = (input.now ?? new Date()).toISOString();

  const backendInsights = backendSnapshot
    ? sortInsights([
        ...mapBackendAnomalies(backendSnapshot, source, input.lastBackendEventType),
        ...mapBackendRecommendations(backendSnapshot, source, input.lastBackendEventType),
        ...mapBackendAlerts(backendSnapshot, source, input.lastBackendEventType),
        ...mapBackendCongestionScores(backendSnapshot, source, input.lastBackendEventType),
      ])
    : [];

  const degradedInsights =
    source === 'degraded' && input.patientFlowSnapshot
      ? mapDegradedPatientFlowInsights(input.patientFlowSnapshot)
      : [];

  const aiChiefInsights = input.aiChiefSnapshot
    ? mapAiChiefRecommendations(input.aiChiefSnapshot, source)
    : [];

  const insights = Object.freeze(
    sortInsights([...backendInsights, ...degradedInsights, ...aiChiefInsights]),
  );

  const featureVector = backendSnapshot?.featureVector;
  const aiMetrics = input.aiChiefSnapshot?.metrics;

  const metrics = Object.freeze({
    activePatients: featureVector?.activePatients ?? aiMetrics?.activePatients ?? 0,
    waitingPatients: featureVector?.waitingPatients ?? 0,
    capacityScore: featureVector?.capacityScore ?? 0,
    capacityBand: featureVector?.capacityBand ?? aiMetrics?.capacityBand ?? 'unknown',
    inboundEms: featureVector?.emsInbound ?? aiMetrics?.inboundEms ?? 0,
    activeBottlenecks:
      insights.filter((insight) => insight.type === 'bottleneck').length ||
      aiMetrics?.activeBottlenecks ||
      0,
    unresolvedAlerts:
      backendSnapshot?.alerts.filter((alert) => !alert.dismissed).length ??
      aiMetrics?.unacknowledgedCriticalAlerts ??
      0,
    degradedServices: aiMetrics?.degradedServices ?? 0,
    workflowPendingReview: input.workflowPendingReview ?? 0,
    aiRecommendationCount: insights.filter(
      (insight) => insight.type === 'recommendation' || insight.type === 'intervention',
    ).length,
    congestionPredictions: insights.filter((insight) => insight.type === 'congestion_prediction')
      .length,
  });

  return Object.freeze({
    engineId: 'unified-operational-intelligence',
    generatedAt,
    source,
    lastBackendEventType: input.lastBackendEventType,
    domainStatuses: deriveDomainStatuses(insights),
    insights,
    metrics,
    safetyStatement: UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT.statement,
    backendEndpoints: listUnifiedOperationalIntelligenceBackendEndpoints(),
  });
}

export default {
  buildUnifiedOperationalIntelligenceSnapshot,
  isAuthoritativeUnifiedOperationalSnapshot,
};
