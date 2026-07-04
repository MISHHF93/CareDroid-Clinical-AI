import type { CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER } from './constants';

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

export type OperationalCentralQueueMetric = {
  breached?: boolean;
};

export type OperationalCentralNodeInput = {
  generatedAt: string;
  activePatients: number;
  waitingPatients: number;
  longestWait: number;
  averageWait: number;
  emsInbound: number;
  reassessmentsDue: number;
  boarders: number;
  referralsPending: number;
  emsPressure: string;
  boardingRisk: string;
  capacityStatus: { score: number; band: string };
  queueMetrics?: readonly OperationalCentralQueueMetric[];
  operationalAlerts: readonly unknown[];
};

export type OperationalAuditEventInput = {
  id: string;
  type: string;
  summary: string;
  timestamp: string;
  source: string;
};

export type OperationalModelHealthEntry = {
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
};

export type OperationalDataDriftInput = {
  enabled: boolean;
  driftDetected: boolean;
  featureDistributionShift: boolean;
  predictionDistributionShift: boolean;
  confidenceDistributionShift: boolean;
  summary: string;
  generatedAt: string;
  alerts?: readonly unknown[];
};

export type BuildOperationalIntelligenceSnapshotInput = {
  generatedAt: string;
  tenantId: string;
  settings: OperationalIntelligenceSettings;
  central: OperationalCentralNodeInput;
  recentAuditEvents: readonly OperationalAuditEventInput[];
  disclaimers: {
    operational: string;
    clinical: string;
    externalData: string;
  };
  driftReport?: OperationalDataDriftInput | null;
  supplementalModels?: readonly OperationalModelHealthEntry[];
};

export type OperationalIntelligenceSnapshotOutput = {
  layer: typeof CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER;
  generatedAt: string;
  tenantId: string;
  mode: OperationalIntelligenceMode;
  enabled: boolean;
  disclaimers: BuildOperationalIntelligenceSnapshotInput['disclaimers'];
  centralNodeLinked: true;
  featureVector: {
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
  scores: Array<{
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
  }>;
  signals: Array<{
    id: string;
    category: string;
    label: string;
    value: string | number;
    tone: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
    sourceModule: string;
    timestamp: string;
  }>;
  predictions: [];
  anomalies: Array<{
    id: string;
    category: string;
    severity: 'Info' | 'Warning' | 'Critical';
    title: string;
    message: string;
    reasonCodes: string[];
    detectedAt: string;
    humanReviewRequired: true;
  }>;
  recommendations: Array<{
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
  }>;
  alerts: Array<{
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
  }>;
  modelHealth: {
    status: 'healthy' | 'degraded' | 'fallback' | 'unavailable';
    mode: OperationalIntelligenceMode;
    models: OperationalModelHealthEntry[];
    generatedAt: string;
  };
  dataDrift: OperationalDataDriftInput;
  dataFreshness: {
    status: 'fresh' | 'aging' | 'stale';
    lastSyncedAt: string;
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