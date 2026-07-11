import { describe, expect, it } from 'vitest';
import {
  buildCareDroidCentralNodeSnapshot,
  type CareDroidCentralNodeSource,
} from '../central-node/careDroidCentralNode';
import { buildCareDroidOperationalIntelligenceSnapshot } from './careDroidOperationalIntelligence';
import {
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
} from './operationalIntelligence.types';

const baseSource = {
  patients: [],
  capacity: {
    score: 72,
    band: 'Orange',
    totalPatients: 0,
    occupiedRooms: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    updatedAt: new Date().toISOString(),
  },
  alerts: [],
  emsArrivals: [],
  emsIncomingPatients: [],
  emsUnits: [],
  referrals: [],
  staff: [],
  rooms: [],
  workflowLogs: [],
  emergencySettings: {
    tenantName: 'Test ED',
    defaultScreenMode: 'COMMAND_CENTER_DISPLAY',
    enabledScreenModes: ['COMMAND_CENTER_DISPLAY'],
    readOnlyDisplayMode: false,
    commandCenterMode: true,
    wallDisplayRefreshInterval: 30000,
    aiSettings: { enabled: true, humanReviewRequired: true },
  },
  websocket: {
    status: 'connected',
    mode: 'polling',
    lastSyncedAt: new Date().toISOString(),
    message: 'ok',
  },
  copilotMessages: [],
  integrationEvents: [],
  selectedPatientId: null,
  activeQueueFilter: null,
  whiteboardSearchQuery: '',
  loading: false,
  backendAvailable: true,
} as const;

describe('CareDroidOperationalIntelligence', () => {
  it('builds an advisory snapshot linked to central node', () => {
    const centralSnapshot = buildCareDroidCentralNodeSnapshot(
      baseSource as unknown as CareDroidCentralNodeSource,
      {
        role: 'charge_nurse',
        roleLabel: 'Charge Nurse',
        readOnly: false,
        allowedRoutes: ['/emergency/whiteboard'],
      },
      { screenMode: 'COMMAND_CENTER_DISPLAY' as any, source: 'store' },
    );

    const backendSnapshot = buildCareDroidOperationalIntelligenceSnapshot({
      centralSnapshot,
      settings: DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
      tenantId: 'Test ED',
      workflowLogs: [],
      backendSnapshot: {
        layer: CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
        generatedAt: new Date().toISOString(),
        tenantId: 'Test ED',
        mode: 'rule_based',
        enabled: true,
        disclaimers: {
          operational: 'Operational intelligence is advisory. Human review required.',
          clinical: 'Human review required.',
          externalData: 'Review external data.',
        },
        centralNodeLinked: true,
        featureVector: {
          activePatients: 0,
          waitingPatients: 0,
          longestWaitMinutes: 0,
          averageWaitMinutes: 0,
          emsInbound: 0,
          reassessmentsDue: 0,
          capacityScore: 72,
          capacityBand: 'Orange',
          boarders: 0,
          referralsPending: 0,
          breachedQueues: 0,
          activeAlerts: 0,
          syncStale: false,
        },
        scores: [],
        signals: [],
        predictions: [],
        anomalies: [],
        recommendations: [
          {
            id: 'rec-test',
            action: 'Review reassessment queue',
            rationale: 'One patient has reassessment due.',
            route: '/emergency/reassessment',
            modelOrRuleId: 'rule-reassessment-priority-v1',
            version: '1.0.0-rule-baseline',
            confidence: 0.93,
            reasonCodes: ['reassessment_due'],
            timestamp: new Date().toISOString(),
            humanReviewRequired: true,
          },
        ],
        alerts: [],
        modelHealth: {
          status: 'healthy',
          mode: 'rule_based',
          models: [],
          generatedAt: new Date().toISOString(),
        },
        dataDrift: {
          enabled: false,
          driftDetected: false,
          featureDistributionShift: false,
          predictionDistributionShift: false,
          confidenceDistributionShift: false,
          summary: 'Drift monitoring disabled.',
          generatedAt: new Date().toISOString(),
        },
        dataFreshness: {
          status: 'fresh',
          lastSyncedAt: new Date().toISOString(),
          ageMinutes: 0,
          visible: true,
        },
        badges: [],
        blockedAutonomousActions: ['diagnose'],
        recentAuditEvents: [],
        copilotContext: {
          operationalIntelligenceEnabled: true,
          mode: 'rule_based',
          capacityScore: 72,
          capacityBand: 'Orange',
          emsInbound: 0,
          reassessmentsDue: 0,
          breachedQueues: 0,
          activeAlerts: 0,
          dataFreshnessStatus: 'fresh',
          humanReviewRequired: true,
        },
      },
    });

    expect(backendSnapshot.layer).toBe(CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER);
    expect(backendSnapshot.enabled).toBe(true);
    expect(backendSnapshot.centralNodeLinked).toBe(true);
    expect(backendSnapshot.centralNode).toBe(centralSnapshot);
    expect(backendSnapshot.recommendations.every((rec) => rec.humanReviewRequired)).toBe(true);
    expect(backendSnapshot.blockedAutonomousActions).toContain('diagnose');
    expect(backendSnapshot.disclaimers.operational).toMatch(/advisory/i);
  });

  it('returns a degraded snapshot without frontend rule duplication when backend data is absent', () => {
    const centralSnapshot = buildCareDroidCentralNodeSnapshot(
      baseSource as unknown as CareDroidCentralNodeSource,
      {
        role: 'charge_nurse',
        roleLabel: 'Charge Nurse',
        readOnly: false,
        allowedRoutes: ['/emergency/whiteboard'],
      },
      { screenMode: 'COMMAND_CENTER_DISPLAY' as any, source: 'store' },
    );

    const snapshot = buildCareDroidOperationalIntelligenceSnapshot({
      centralSnapshot,
      settings: DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
      tenantId: 'Test ED',
      workflowLogs: [],
    });

    expect(snapshot.recommendations).toEqual([]);
    expect(snapshot.anomalies).toEqual([]);
    expect(snapshot.modelHealth.status).toBe('degraded');
    expect(snapshot.dataDrift.summary).toMatch(/backend operational intelligence unavailable/i);
  });
});
