import { describe, expect, it } from 'vitest';
import { CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER } from '../operational-intelligence/operationalIntelligence.types';
import { buildUnifiedOperationalIntelligenceSnapshot } from './unifiedOperationalIntelligenceService';

const backendSnapshot = {
  layer: CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  generatedAt: '2026-07-02T12:00:00.000Z',
  tenantId: 'CareDroid Emergency Department',
  mode: 'rule_based' as const,
  enabled: true,
  disclaimers: {
    operational: 'Advisory.',
    clinical: 'Human review required.',
    externalData: 'Review external data.',
  },
  centralNodeLinked: true,
  featureVector: {
    activePatients: 12,
    waitingPatients: 4,
    longestWaitMinutes: 45,
    averageWaitMinutes: 18,
    emsInbound: 2,
    reassessmentsDue: 1,
    capacityScore: 72,
    capacityBand: 'Orange',
    boarders: 3,
    referralsPending: 1,
    breachedQueues: 1,
    activeAlerts: 2,
    syncStale: false,
  },
  scores: [
    {
      id: 'capacity-score',
      label: 'Capacity',
      value: 72,
      band: 'warning',
      modelOrRuleId: 'rule-capacity-v1',
      version: '1.0.0',
      confidence: 0.9,
      reasonCodes: ['capacity_engine'],
      timestamp: '2026-07-02T12:00:00.000Z',
      humanReviewRequired: true as const,
    },
  ],
  signals: [],
  predictions: [],
  anomalies: [
    {
      id: 'anomaly-1',
      category: 'queue_bottleneck',
      severity: 'Warning' as const,
      title: 'Triage queue backing up',
      message: 'Waiting patients exceed target threshold.',
      reasonCodes: ['queue_breach'],
      detectedAt: '2026-07-02T12:00:00.000Z',
      humanReviewRequired: true as const,
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      action: 'Open fast-track lane',
      rationale: 'Reduce triage wait for low-acuity arrivals.',
      route: '/emergency/queues',
      modelOrRuleId: 'rule-queue-v1',
      version: '1.0.0',
      confidence: 0.86,
      reasonCodes: ['queue_breach'],
      timestamp: '2026-07-02T12:00:00.000Z',
      humanReviewRequired: true as const,
    },
  ],
  alerts: [
    {
      id: 'alert-1',
      severity: 'Critical' as const,
      title: 'Unacknowledged critical alert',
      message: 'Charge nurse review required.',
      createdAt: '2026-07-02T12:00:00.000Z',
      dismissed: false,
      source: 'operational-intelligence' as const,
      category: 'alerts',
      reasonCodes: ['critical_alert'],
      humanReviewRequired: true as const,
      advisoryOnly: true as const,
    },
  ],
  modelHealth: {
    status: 'healthy' as const,
    mode: 'rule_based' as const,
    models: [],
    generatedAt: '2026-07-02T12:00:00.000Z',
  },
  dataDrift: {
    enabled: false,
    driftDetected: false,
    featureDistributionShift: false,
    predictionDistributionShift: false,
    confidenceDistributionShift: false,
    summary: 'No drift.',
    generatedAt: '2026-07-02T12:00:00.000Z',
  },
  dataFreshness: {
    status: 'fresh' as const,
    lastSyncedAt: '2026-07-02T12:00:00.000Z',
    ageMinutes: 1,
    visible: true,
  },
  badges: [],
  blockedAutonomousActions: [],
  recentAuditEvents: [],
  copilotContext: {},
};

describe('unifiedOperationalIntelligenceService', () => {
  it('builds insights from backend snapshot rather than frontend rules', () => {
    const snapshot = buildUnifiedOperationalIntelligenceSnapshot({
      backendSnapshot,
      source: 'backend',
      lastBackendEventType: 'journey_state_changed',
    });

    expect(snapshot.engineId).toBe('unified-operational-intelligence');
    expect(snapshot.source).toBe('backend');
    expect(snapshot.insights.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.insights.every((insight) => insight.humanReviewRequired)).toBe(true);
    expect(snapshot.insights.every((insight) => insight.source === 'backend')).toBe(true);
    expect(snapshot.metrics.waitingPatients).toBe(4);
    expect(snapshot.metrics.capacityBand).toBe('Orange');
  });

  it('surfaces bottleneck and congestion prediction insight types', () => {
    const snapshot = buildUnifiedOperationalIntelligenceSnapshot({
      backendSnapshot,
      source: 'backend_evaluate',
    });

    const types = snapshot.insights.map((insight) => insight.type);
    expect(types).toContain('bottleneck');
    expect(types).toContain('congestion_prediction');
    expect(types).toContain('intervention');
    expect(types).toContain('alert');
  });

  it('derives domain statuses from unified insights', () => {
    const snapshot = buildUnifiedOperationalIntelligenceSnapshot({
      backendSnapshot,
      source: 'backend',
    });

    expect(snapshot.domainStatuses).toHaveLength(7);
    expect(snapshot.domainStatuses.some((domain) => domain.status !== 'healthy')).toBe(true);
  });
});
