import type { CareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import type { Patient, Referral } from '../types/emergency';
import { summarizeWhatHappensNextBoard } from '../services/whatHappensNextGuidance';
import {
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
  OI_RULE_BASELINE_VERSION,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
  type OperationalIntelligenceSettings,
  type OperationalIntelligenceSnapshot,
} from './operationalIntelligence.types';
import { BLOCKED_AUTONOMOUS_OI_ACTIONS } from '../../lib/operational-intelligence/constants';

type BuildOperationalIntelligenceOptions = {
  centralSnapshot: CareDroidCentralNodeSnapshot;
  settings?: Partial<OperationalIntelligenceSettings> | Record<string, unknown>;
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

function buildDegradedOperationalIntelligenceSnapshot({
  centralSnapshot,
  settings,
  tenantId = 'CareDroid Emergency Department',
  patients = [],
  referrals = [],
  workflowLogs = [],
}: BuildOperationalIntelligenceOptions): OperationalIntelligenceSnapshot {
  const oiSettings = resolveOperationalIntelligenceSettings(settings);
  const generatedAt = new Date().toISOString();
  const syncAgeMinutes = centralSnapshot.sync.stale ? 999 : 0;
  const dataFreshnessStatus = centralSnapshot.sync.stale ? 'stale' : 'aging';

  return {
    layer: CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
    generatedAt,
    tenantId,
    mode: oiSettings.operationalIntelligenceMode,
    enabled: oiSettings.operationalIntelligenceEnabled,
    disclaimers: OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
    centralNodeLinked: true,
    centralNode: centralSnapshot,
    featureVector: {
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
      breachedQueues: centralSnapshot.queueHealth.filter((queue) => queue.breached).length,
      activeAlerts: centralSnapshot.currentDepartmentStatus.activeAlerts,
      syncStale: dataFreshnessStatus === 'stale',
    },
    scores: [],
    signals: [],
    predictions: [],
    anomalies: [],
    recommendations: [],
    alerts: [],
    modelHealth: {
      status: 'degraded',
      mode: oiSettings.operationalIntelligenceMode,
      models: [
        {
          modelOrRuleId: 'rule-operational-baseline-v1',
          version: OI_RULE_BASELINE_VERSION,
          status: 'unavailable',
          inputSchemaValid: false,
          missingValues: 0,
          dataFreshnessMinutes: syncAgeMinutes,
          errorRate: 0,
          latencyMs: 0,
          lastTrainedAt: null,
          lastEvaluatedAt: generatedAt,
          fallbackMode: true,
          driftDetected: false,
        },
      ],
      generatedAt,
    },
    dataDrift: {
      enabled: false,
      driftDetected: false,
      featureDistributionShift: false,
      predictionDistributionShift: false,
      confidenceDistributionShift: false,
      summary:
        'Backend operational intelligence unavailable. Displaying central-node context only.',
      generatedAt,
    },
    dataFreshness: {
      status: dataFreshnessStatus,
      lastSyncedAt: centralSnapshot.sync.lastSyncedAt,
      ageMinutes: syncAgeMinutes,
      visible: oiSettings.dataFreshnessVisible,
    },
    badges: [],
    blockedAutonomousActions: [...BLOCKED_AUTONOMOUS_OI_ACTIONS],
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
      breachedQueues: centralSnapshot.queueHealth.filter((queue) => queue.breached).length,
      activeAlerts: centralSnapshot.currentDepartmentStatus.activeAlerts,
      dataFreshnessStatus,
      humanReviewRequired: true,
      whatHappensNextReassessmentDue: summarizeWhatHappensNextBoard(patients, { referrals })[
        'reassessment-due'
      ],
      whatHappensNextTriageNeeded: summarizeWhatHappensNextBoard(patients, { referrals })[
        'triage-needed'
      ],
    },
  };
}

/**
 * Frontend projection of backend operational intelligence.
 * Rule evaluation runs only on the Nest backend — never duplicated in the browser.
 */
export function buildCareDroidOperationalIntelligenceSnapshot(
  options: BuildOperationalIntelligenceOptions,
): OperationalIntelligenceSnapshot {
  const { centralSnapshot, backendSnapshot = null } = options;

  if (backendSnapshot?.layer === CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER) {
    return {
      ...backendSnapshot,
      centralNode: centralSnapshot,
      centralNodeLinked: true,
    };
  }

  return buildDegradedOperationalIntelligenceSnapshot(options);
}
