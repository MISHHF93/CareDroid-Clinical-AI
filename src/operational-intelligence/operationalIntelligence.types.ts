import type { CareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import {
  BLOCKED_AUTONOMOUS_OI_ACTIONS,
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  OI_RULE_BASELINE_VERSION,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
} from '../../lib/operational-intelligence/constants';

export {
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  OI_RULE_BASELINE_VERSION,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
};

/** @deprecated Use `BLOCKED_AUTONOMOUS_OI_ACTIONS` from shared lib. */
export const BLOCKED_AUTONOMOUS_ACTIONS = BLOCKED_AUTONOMOUS_OI_ACTIONS;

export type OperationalIntelligenceMode = 'rule_based' | 'ml_assisted' | 'hybrid';

export type OperationalIntelligenceSettings = {
  operationalIntelligenceEnabled: boolean;
  operationalIntelligenceMode: OperationalIntelligenceMode;
  modelMonitoringEnabled: boolean;
  driftMonitoringEnabled: boolean;
  recommendationsEnabled: boolean;
  autoAlertingEnabled: boolean;
  humanReviewRequired: true;
  modelHealthVisibleToAdmins: boolean;
  dataFreshnessVisible: boolean;
  operationalIntelligencePollingInterval: number;
};

export type OperationalInputEvent = {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  tenantId: string;
  payload: Record<string, string | number | boolean | null>;
  humanReviewRequired: true;
};

export type OperationalSignal = {
  id: string;
  category: string;
  label: string;
  value: string | number;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
  sourceModule: string;
  timestamp: string;
};

export type OperationalFeatureVector = {
  activePatients: number;
  waitingPatients: number;
  longestWaitMinutes: number;
  averageWaitMinutes: number;
  emsInbound: number;
  reassessmentsDue: number;
  capacityScore: number;
  capacityBand: string;
  boarders: number;
  referralsPending: number;
  breachedQueues: number;
  activeAlerts: number;
  syncStale: boolean;
};

export type OperationalScore = {
  id: string;
  label: string;
  value: number;
  band: string;
  modelOrRuleId: string;
  version: string;
  confidence: number;
  reasonCodes: string[];
  timestamp: string;
  humanReviewRequired: true;
};

export type OperationalAnomaly = {
  id: string;
  category: string;
  severity: 'Info' | 'Warning' | 'Critical';
  title: string;
  message: string;
  reasonCodes: string[];
  detectedAt: string;
  humanReviewRequired: true;
};

export type OperationalRecommendation = {
  id: string;
  action: string;
  rationale: string;
  route?: string;
  patientId?: string;
  modelOrRuleId: string;
  version: string;
  confidence: number;
  reasonCodes: string[];
  timestamp: string;
  humanReviewRequired: true;
};

export type OperationalAlert = {
  id: string;
  severity: 'Info' | 'Warning' | 'Critical';
  title: string;
  message: string;
  createdAt: string;
  dismissed: boolean;
  source: 'operational-intelligence';
  category: string;
  reasonCodes: string[];
  humanReviewRequired: true;
  advisoryOnly: true;
  patientId?: string;
};

export type OperationalModelHealth = {
  status: 'healthy' | 'degraded' | 'fallback' | 'unavailable';
  mode: OperationalIntelligenceMode;
  models: Array<{
    modelOrRuleId: string;
    version: string;
    status: 'active' | 'fallback' | 'unavailable';
    inputSchemaValid: boolean;
    missingValues: number;
    dataFreshnessMinutes: number;
    errorRate: number;
    latencyMs: number;
    lastTrainedAt: string | null;
    lastEvaluatedAt: string;
    fallbackMode: boolean;
    driftDetected: boolean;
  }>;
  generatedAt: string;
};

export type OperationalIntelligenceSnapshot = {
  layer: typeof CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER;
  generatedAt: string;
  tenantId: string;
  mode: OperationalIntelligenceMode;
  enabled: boolean;
  disclaimers: {
    operational: string;
    clinical: string;
    externalData: string;
  };
  centralNodeLinked: boolean;
  centralNode?: CareDroidCentralNodeSnapshot;
  featureVector: OperationalFeatureVector;
  scores: OperationalScore[];
  signals: OperationalSignal[];
  predictions: unknown[];
  anomalies: OperationalAnomaly[];
  recommendations: OperationalRecommendation[];
  alerts: OperationalAlert[];
  modelHealth: OperationalModelHealth;
  dataDrift: {
    enabled: boolean;
    driftDetected: boolean;
    featureDistributionShift: boolean;
    predictionDistributionShift: boolean;
    confidenceDistributionShift: boolean;
    summary: string;
    generatedAt: string;
  };
  dataFreshness: {
    status: 'fresh' | 'aging' | 'stale';
    lastSyncedAt: string | null;
    ageMinutes: number;
    visible: boolean;
  };
  badges: Array<{
    id: string;
    label: string;
    tone: 'info' | 'warning' | 'critical';
    module: string;
  }>;
  blockedAutonomousActions: string[];
  recentAuditEvents: Array<{
    id: string;
    type: string;
    summary: string;
    timestamp: string;
    source: string;
    humanReviewRequired: true;
  }>;
  copilotContext: Record<string, string | number | boolean | null>;
};

export const DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS: OperationalIntelligenceSettings = {
  operationalIntelligenceEnabled: true,
  operationalIntelligenceMode: 'rule_based',
  modelMonitoringEnabled: true,
  driftMonitoringEnabled: false,
  recommendationsEnabled: true,
  autoAlertingEnabled: true,
  humanReviewRequired: true,
  modelHealthVisibleToAdmins: true,
  dataFreshnessVisible: true,
  operationalIntelligencePollingInterval: 30000,
};


