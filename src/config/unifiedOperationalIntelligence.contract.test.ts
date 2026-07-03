import { describe, expect, it } from 'vitest';
import { EMERGENCY_PLATFORM_CONTRACT } from './emergencyPlatform.config';
import {
  UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT,
  UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS,
} from './unifiedOperationalIntelligenceModel';
import { buildUnifiedOperationalIntelligenceSnapshot } from '../services/unifiedOperationalIntelligenceService';
import {
  handleUnifiedOperationalIntelligenceBackendEvent,
  scheduleUnifiedOperationalIntelligenceRefresh,
} from '../engine/unifiedOperationalIntelligenceEngine';
import { UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS } from './unifiedOperationalIntelligenceModel';

describe('unifiedOperationalIntelligence contract', () => {
  it('registers unified operational intelligence in the emergency platform contract', () => {
    expect(EMERGENCY_PLATFORM_CONTRACT.operationalIntelligenceEngine).toBe(
      'unified-operational-intelligence',
    );
  });

  it('covers all seven operational domains with signal sources', () => {
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS).toHaveLength(7);
    for (const domain of UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS) {
      expect(domain.signalSources.length).toBeGreaterThan(0);
      expect(domain.triggerEvents.length).toBeGreaterThan(0);
    }
  });

  it('requires human oversight on every unified insight', () => {
    const snapshot = buildUnifiedOperationalIntelligenceSnapshot();
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT.humanOversightRequired).toBe(true);
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT.backendAuthoritative).toBe(true);
    expect(snapshot.insights.every((insight) => insight.humanReviewRequired)).toBe(true);
  });

  it('routes backend realtime events through the unified operational intelligence engine', () => {
    for (const eventType of [
      'operational_intelligence_updated',
      'bottleneck_detected',
      'congestion_predicted',
      'journey_state_changed',
      'patient_flow_updated',
    ] as const) {
      expect(UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS).toContain(eventType);
      handleUnifiedOperationalIntelligenceBackendEvent(eventType, { tenantId: 'CareDroid Emergency Department' });
      scheduleUnifiedOperationalIntelligenceRefresh(eventType);
    }
  });

  it('maps backend anomalies and recommendations without frontend-only duplication when backend snapshot is present', () => {
    const snapshot = buildUnifiedOperationalIntelligenceSnapshot({
      source: 'backend_evaluate',
      backendSnapshot: {
        layer: 'CareDroidOperationalIntelligence',
        generatedAt: '2026-07-03T12:00:00.000Z',
        tenantId: 'CareDroid Emergency Department',
        mode: 'rule_based',
        enabled: true,
        disclaimers: {
          operational: 'Advisory.',
          clinical: 'Human review required.',
          externalData: 'Review external data.',
        },
        centralNodeLinked: true,
        featureVector: {
          activePatients: 10,
          waitingPatients: 3,
          longestWaitMinutes: 40,
          averageWaitMinutes: 15,
          emsInbound: 1,
          reassessmentsDue: 0,
          capacityScore: 80,
          capacityBand: 'Orange',
          boarders: 1,
          referralsPending: 0,
          breachedQueues: 1,
          activeAlerts: 1,
          syncStale: false,
        },
        scores: [],
        signals: [],
        predictions: [],
        anomalies: [
          {
            id: 'anomaly-queue',
            category: 'queue_bottleneck',
            severity: 'Warning',
            title: 'Queue breach',
            message: 'Triage queue exceeded target.',
            reasonCodes: ['queue_breach'],
            detectedAt: '2026-07-03T12:00:00.000Z',
            humanReviewRequired: true,
          },
        ],
        recommendations: [
          {
            id: 'rec-queue',
            action: 'Review triage queue',
            rationale: 'Backend recommends queue review.',
            route: '/emergency/queues',
            modelOrRuleId: 'rule-queue-v1',
            version: '1.0.0',
            confidence: 0.9,
            reasonCodes: ['queue_breach'],
            timestamp: '2026-07-03T12:00:00.000Z',
            humanReviewRequired: true,
          },
        ],
        alerts: [],
        modelHealth: {
          status: 'healthy',
          mode: 'rule_based',
          models: [],
          generatedAt: '2026-07-03T12:00:00.000Z',
        },
        dataDrift: {
          enabled: false,
          driftDetected: false,
          featureDistributionShift: false,
          predictionDistributionShift: false,
          confidenceDistributionShift: false,
          summary: 'Disabled',
          generatedAt: '2026-07-03T12:00:00.000Z',
          alerts: [],
        },
        dataFreshness: {
          status: 'fresh',
          lastSyncedAt: '2026-07-03T12:00:00.000Z',
          ageMinutes: 0,
          visible: true,
        },
        badges: [],
        blockedAutonomousActions: [],
        recentAuditEvents: [],
        copilotContext: {
          operationalIntelligenceEnabled: true,
          mode: 'rule_based',
          capacityScore: 80,
          capacityBand: 'Orange',
          emsInbound: 1,
          reassessmentsDue: 0,
          breachedQueues: 1,
          activeAlerts: 1,
          dataFreshnessStatus: 'fresh',
          humanReviewRequired: true,
        },
      },
    });

    expect(snapshot.source).toBe('backend_evaluate');
    expect(snapshot.insights.some((insight) => insight.type === 'bottleneck')).toBe(true);
    expect(snapshot.insights.some((insight) => insight.type === 'intervention')).toBe(true);
    expect(snapshot.insights.every((insight) => insight.source === 'backend_evaluate')).toBe(true);
  });
});