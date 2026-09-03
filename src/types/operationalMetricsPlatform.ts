export type OperationalMetricTone = 'stable' | 'watch' | 'warning' | 'critical';
export type OperationalMetricTrendDirection = 'up' | 'down' | 'flat';
export type OperationalMetricSource =
  | 'backend-event'
  | 'workflow-log'
  | 'realtime-event'
  | 'patient-flow-engine'
  | 'automation-orchestrator'
  | 'computed';

export type OperationalMetricTrendPoint = Readonly<{
  timestamp: string;
  value: number;
}>;

export type OperationalMetricCard = Readonly<{
  id: string;
  category:
    | 'workflow'
    | 'patient_flow'
    | 'staffing'
    | 'capacity'
    | 'service_health'
    | 'bottlenecks'
    | 'alerts'
    | 'response_times'
    | 'throughput'
    | 'ai_outcomes';
  label: string;
  value: string | number;
  detail: string;
  tone: OperationalMetricTone;
  trend: OperationalMetricTrendDirection;
  trendDelta?: number;
  source: OperationalMetricSource;
  route?: string;
  roles?: readonly string[];
}>;

export type OperationalMetricsDomainSnapshot = Readonly<{
  workflowEventsLastHour: number;
  journeyTransitionsLastHour: number;
  automationReviewsLastHour: number;
  patientFlowTracked: number;
  flowDetections: number;
  congestedDepartments: number;
  staffOnShift: number;
  staffAssigned: number;
  staffUtilizationPercent: number;
  departmentOccupancyPercent: number;
  capacityScore: number;
  capacityBand: string;
  degradedServices: number;
  activeBottlenecks: number;
  criticalBottlenecks: number;
  alertsLastHour: number;
  unresolvedCriticalAlerts: number;
  avgAlertResponseMinutes: number;
  throughputPatientsSeen: number;
  dischargeCount: number;
  boardingCount: number;
  aiRecommendationsPending: number;
  aiRecommendationsExecuted: number;
  aiRecommendationsOverridden: number;
}>;

export type OperationalMetricsPlatformSnapshot = Readonly<{
  engineId: 'operational-metrics-platform';
  generatedAt: string;
  source: 'backend' | 'live-store';
  eventBacked: boolean;
  domains: OperationalMetricsDomainSnapshot;
  cards: readonly OperationalMetricCard[];
  trends: Readonly<Record<string, readonly OperationalMetricTrendPoint[]>>;
  predictions: readonly Readonly<{
    id: string;
    label: string;
    detail: string;
    confidence: number;
    horizonMinutes: number;
  }>[];
  operationalAlerts: readonly Readonly<{
    id: string;
    title: string;
    message: string;
    severity: string;
    route?: string;
  }>[];
  recommendations: readonly Readonly<{
    id: string;
    action: string;
    rationale: string;
    route?: string;
  }>[];
  safetyStatement: string;
}>;
