import { buildOperationalIntelligenceSnapshot } from '../../lib/operational-intelligence';
import { OPERATIONAL_INTELLIGENCE_DISCLAIMERS } from '../../lib/operational-intelligence/constants';

describe('buildOperationalIntelligenceSnapshot', () => {
  it('derives queue bottleneck recommendations from central node metrics', () => {
    const generatedAt = '2026-07-04T12:00:00.000Z';
    const snapshot = buildOperationalIntelligenceSnapshot({
      generatedAt,
      tenantId: 'Test ED',
      settings: {
        operationalIntelligenceEnabled: true,
        operationalIntelligenceMode: 'rule_based',
        modelMonitoringEnabled: false,
        driftMonitoringEnabled: false,
        recommendationsEnabled: true,
        autoAlertingEnabled: true,
        humanReviewRequired: true,
        modelHealthVisibleToAdmins: true,
        dataFreshnessVisible: true,
        operationalIntelligencePollingInterval: 30000,
      },
      central: {
        generatedAt,
        activePatients: 12,
        waitingPatients: 4,
        longestWait: 55,
        averageWait: 18,
        emsInbound: 2,
        reassessmentsDue: 1,
        boarders: 0,
        referralsPending: 0,
        emsPressure: 'warning',
        boardingRisk: 'normal',
        capacityStatus: { score: 78, band: 'Orange' },
        queueMetrics: [{ breached: true }, { breached: false }],
        operationalAlerts: [{ id: 'alert-1' }],
      },
      recentAuditEvents: [],
      disclaimers: OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
    });

    expect(snapshot.layer).toBe('CareDroidOperationalIntelligence');
    expect(snapshot.featureVector.breachedQueues).toBe(1);
    expect(snapshot.recommendations.some((rec) => rec.id === 'rec-review-queues')).toBe(true);
    expect(snapshot.anomalies.some((anomaly) => anomaly.category === 'queue_bottleneck')).toBe(
      true,
    );
    expect(snapshot.alerts.every((alert) => alert.humanReviewRequired)).toBe(true);
  });
});
