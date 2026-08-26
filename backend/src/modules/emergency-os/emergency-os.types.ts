export type EmergencyPatientState =
  | 'Arrival'
  | 'Registration'
  | 'Triage'
  | 'Waiting'
  | 'Assessment'
  | 'Orders'
  | 'Results'
  | 'Disposition'
  | 'Admission'
  | 'Discharge';

export type EmergencyPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type CapacityBand = 'Green' | 'Yellow' | 'Orange' | 'Red';
export type CareDroidScreenMode =
  | 'TRIAGE_SCREEN'
  | 'REGISTRATION_SCREEN'
  | 'CHARGE_NURSE_SCREEN'
  | 'PHYSICIAN_SCREEN'
  | 'EMS_SCREEN'
  | 'WAITING_ROOM_DISPLAY'
  | 'COMMAND_CENTER_DISPLAY'
  | 'ADMIN_SCREEN'
  | 'READ_ONLY_DISPLAY';

export interface EmergencyVitals {
  hr?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  temp?: number;
  rr?: number;
  gcs?: number;
  pain?: number;
  recordedAt: string;
  recordedBy: string;
}

export interface JourneyEvent {
  id: string;
  from?: EmergencyPatientState;
  to: EmergencyPatientState;
  timestamp: string;
  staffId: string;
  note?: string;
}

export type WorkflowActionType =
  | 'patient_created'
  | 'journey_state_changed'
  | 'clinician_assigned'
  | 'reassessment_created'
  | 'reassessment_completed'
  | 'ems_arrival_created'
  | 'ems_converted_to_patient'
  | 'ems_transport_request_created'
  | 'capacity_score_changed'
  | 'boarding_started'
  | 'referral_created'
  | 'copilot_used'
  | 'provincial_data_viewed'
  | 'integration_event_received'
  | 'upgrade_harness_used'
  | 'administrative_automation_reviewed'
  | 'staff_assigned'
  | 'patient_note_added'
  | 'operational_alert_dispatched'
  | 'patient_escalated'
  | 'patient_duplicate_flagged'
  | 'care_task_transitioned';

export type WorkflowActionSeverity = 'Info' | 'Warning' | 'Critical';
export type WorkflowActionStatus = 'recorded' | 'pending' | 'completed' | 'failed';

export interface WorkflowActionLog {
  id: string;
  type: WorkflowActionType;
  action?: WorkflowActionType;
  title: string;
  summary: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  actorStaffId?: string;
  actorName?: string;
  patientId?: string;
  encounterId?: string;
  module?: string;
  purpose?: string;
  result?: WorkflowActionStatus;
  error?: string;
  source: string;
  severity: WorkflowActionSeverity;
  status: WorkflowActionStatus;
  metadata: Record<string, string | number | boolean | null>;
}

export interface EmergencyEncounter {
  id: string;
  patientId: string;
  status: 'created' | 'active';
  source: 'smart-intake';
  createdAt: string;
  currentState: EmergencyPatientState;
  timelineEventIds: string[];
}

export type ArrivalMode = 'walk-in' | 'EMS' | 'referral' | 'self-check-in' | 'police' | 'transfer';

export type TriageAcuityStatus = 'unassigned' | 'suggested' | 'confirmed';
export type TriageAcuitySystem = 'CTAS' | 'ESI' | 'PRIORITY';

export interface TriageAcuity {
  code: string;
  system: TriageAcuitySystem;
  level: 1 | 2 | 3 | 4 | 5;
  status: TriageAcuityStatus;
  assignedAt?: string | null;
  assignedByStaffId?: string | null;
  suggestedAt?: string | null;
  suggestionSource?: 'rules' | 'triage-assist' | 'self-arrival' | 'staff';
}

export type WaitingRoomStatus =
  | 'registered'
  | 'waiting-for-triage'
  | 'waiting-for-clinician'
  | 'tests-in-progress'
  | 'waiting-for-results'
  | 'waiting-for-specialist-review'
  | 'preparing-discharge'
  | 'awaiting-admission-bed';

export type RegistrationStatus = 'pending' | 'in-progress' | 'complete' | 'provisional';

export type QueueDestination =
  | 'triage-queue'
  | 'rapid-review'
  | 'waiting-room'
  | 'verification'
  | 'ems-registration'
  | 'whiteboard';

/** Canonical normalized arrival record for reception → whiteboard handoff. */
export interface PatientArrivalRecord {
  arrivalMode: ArrivalMode;
  arrivalTimestamp: string;
  chiefComplaint: string;
  triageAcuity: TriageAcuity;
  waitingRoomStatus: WaitingRoomStatus;
  registrationStatus: RegistrationStatus;
  queueDestination: QueueDestination;
  triagePending: boolean;
  firstContactAt?: string | null;
}

export interface EmergencyPatient {
  id: string;
  /** Absent on legacy/pre-migration rows -- see patient.entity.ts's doc comment. */
  organizationId?: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: number;
  sex: 'M' | 'F' | 'Other';
  /** @deprecated Prefer `patient.arrival.arrivalTimestamp`. Retained for API compatibility. */
  arrivalTime: string;
  triageTime?: string;
  chiefComplaint: string;
  complaintCategory: string;
  state: EmergencyPatientState;
  priority: EmergencyPriority;
  vitals: EmergencyVitals[];
  flags: string[];
  assignedStaffId?: string;
  roomId?: string;
  notes: Array<{ id: string; text: string; authorId: string; timestamp: string }>;
  timeline: JourneyEvent[];
  triageAssist?: import('../../../../lib/patient-orchestration').TriageAssistEnvelope | null;
  triageAssistGeneratedAt?: string | null;
  /** @deprecated Prefer `patient.arrival.arrivalMode`. */
  arrivalMode?: ArrivalMode;
  registrationStatus?: RegistrationStatus;
  triagePending?: boolean;
  firstContactAt?: string | null;
  queueDestination?: QueueDestination;
  /** Normalized arrival block — preferred source for whiteboard and reception surfaces. */
  arrival?: PatientArrivalRecord;
  quickSafetyFlags?: string[];
  highRiskComplaintFlags?: Array<{
    id: string;
    label: string;
    detectedAt: string;
    source: 'complaint-text' | 'complaint-category' | 'staff-selected';
  }>;
}

export interface EmergencyRoom {
  id: string;
  name: string;
  type: 'Treatment' | 'Resus' | 'Isolation' | 'Waiting';
  status: 'Available' | 'Occupied' | 'Blocked';
  patientId?: string;
}

export interface EmergencyStaff {
  id: string;
  name: string;
  role: 'MD' | 'RN' | 'PA' | 'Tech' | 'Charge';
  active: boolean;
}

export interface EmergencyAlert {
  id: string;
  severity: 'Info' | 'Warning' | 'Critical';
  title: string;
  message: string;
  patientId?: string;
  organizationId?: string;
  createdAt: string;
  dismissed: boolean;
}

export interface CapacitySnapshot {
  score: number;
  band: CapacityBand;
  totalPatients: number;
  occupiedRooms: number;
  boardingCount: number;
  reassessmentDue: number;
  updatedAt: string;
  totalRooms?: number;
  occupancyPercent?: number;
  waitingCount?: number;
  dischargeReadyCount?: number;
  criticalEmsInboundCount?: number;
  deductions?: Array<{ id: string; label: string; value: number }>;
  units?: Record<string, string>;
  errors?: string[];
}

export interface EmergencyModuleEnvelope<T> {
  module: string;
  generatedAt: string;
  source: 'backend-fixture' | 'clinical-decision-support';
  status: 'active' | 'placeholder';
  data: T;
  events?: Array<{ type: string; summary: string; affectedModules: string[]; timestamp: string }>;
  remainingGaps?: string[];
}

export type CompleteImplementationRequirementClassification =
  | 'ALREADY_IMPLEMENTED_COMPATIBLE'
  | 'SAFE_TO_IMPLEMENT_NOW'
  | 'PARTIALLY_IMPLEMENTED_NEEDS_EXTENSION'
  | 'CONFLICTS_WITH_ACTIVE_SPINE'
  | 'REQUIRES_MANUAL_APPROVAL'
  | 'DEMO_FACADE_ONLY';

export interface CompleteImplementationRequirement {
  id: string;
  requirement: string;
  classification: CompleteImplementationRequirementClassification;
  activeSpineDecision: string;
  implementationState: string;
  evidence: string[];
  safeNextStep: string;
  approvalsRequired?: string[];
}

export interface CompleteImplementationReadinessContract {
  activeSpine: {
    frontendRoot: string;
    appEntry: string;
    appShell: string;
    backendModule: string;
    apiBase: string;
    pilotRouteCount: number;
  };
  generatedBy: string;
  clinicalSafetyNotice: string;
  summary: Record<CompleteImplementationRequirementClassification, number>;
  requirements: CompleteImplementationRequirement[];
}

export interface EmergencyOsModuleSetting {
  id: string;
  label: string;
  enabled: boolean;
}

export interface EmergencyOsSettingsContract {
  tenantName: string;
  defaultWorkspace: string;
  defaultScreenMode: CareDroidScreenMode;
  enabledScreenModes: CareDroidScreenMode[];
  readOnlyDisplayMode: boolean;
  commandCenterMode: boolean;
  wallDisplayRefreshInterval: number;
  enabledModules: EmergencyOsModuleSetting[];
  aiSettings: {
    enabled: boolean;
    provider: string;
    model: string;
    triageAssistEnabled: boolean;
    summarizationEnabled: boolean;
    humanReviewRequired: boolean;
  };
  integrationSettings: {
    ehrEnabled: boolean;
    fhirEndpoint: string;
    hl7InterfaceId: string;
    deviceTelemetryEnabled: boolean;
  };
  provincialHealthSettings: {
    connectorEnabled: boolean;
    jurisdiction: string;
    lookupMode: string;
    healthCardValidation: boolean;
  };
  notificationSettings: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    escalationMinutes: number;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  reassessmentThresholds: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
    P5: number;
    overdueGraceMinutes: number;
  };
  capacityThresholds: {
    departmentCapacityTarget: number;
    warningPercent: number;
    criticalPercent: number;
    maxWaitingPatients: number;
  };
  emsThresholds: {
    offloadTargetMinutes: number;
    criticalEtaMinutes: number;
    autoCreateArrival: boolean;
  };
  boardingThresholds: {
    escalationMinutes: number;
    criticalMinutes: number;
    maxBoarders: number;
    inpatientNotifyMinutes: number;
  };
  thresholds: {
    waitWarningMinutes: number;
    waitCriticalMinutes: number;
    capacityWarningPercent: number;
    emsOffloadTargetMinutes: number;
    reassessmentIntervals: Record<string, number>;
  };
  departmentCapacityTarget: number;
  alertRules: Record<string, { enabled: boolean; severity: string }>;
  operationalIntelligenceSettings: OperationalIntelligenceSettings;
  updatedAt: string;
}

export interface CareDroidCentralNodeSnapshot {
  node: 'CareDroidCentralNode';
  generatedAt: string;
  patientsToday: number;
  activePatients: number;
  waitingPatients: number;
  longestWait: number;
  averageWait: number;
  emsInbound: number;
  emsPressure: 'normal' | 'watch' | 'strained' | 'critical';
  reassessmentsDue: number;
  capacityStatus: CapacitySnapshot;
  boarders: number;
  boardingRisk: 'normal' | 'watch' | 'strained' | 'critical';
  referralsPending: number;
  operationalAlerts: EmergencyAlert[];
  whiteboardColumns: Array<{
    id: EmergencyPatientState | 'Reassessment' | 'EMS';
    label: string;
    patientIds: string[];
    count: number;
  }>;
  queueMetrics: Array<{
    id: string;
    label: string;
    count: number;
    oldestWaitMinutes: number;
    targetMinutes: number;
    breached: boolean;
  }>;
  recentEvents: WorkflowActionLog[];
  tenantSettings: EmergencyOsSettingsContract;
  enabledModules: string[];
}

export type UpgradeHarnessCapability =
  | 'real_time_simulation_adaptive_policy'
  | 'brag_forecast_10h'
  | 'multimodal_cdss'
  | 'modular_mixed_pathology_units'
  | 'virtual_visit_track'
  | 'nurse_led_split_flow'
  | 'wearable_iomt_processing'
  | 'federated_learning_harness'
  | 'telephone_triage_diversion'
  | 'immutable_audit_abstraction';

export type UpgradeHarnessSafetyStatus =
  | 'review_required'
  | 'autonomous_action_blocked'
  | 'pilot_only';

export interface UpgradeHarnessProvenance {
  generatedBy: 'EmergencyOsUpgradeHarnessService';
  provider: string;
  sourceSystems: string[];
  inputSignals: string[];
  evidenceWindow: string;
  limitations: string[];
}

export interface UpgradeHarnessSafety {
  status: UpgradeHarnessSafetyStatus;
  humanReviewMessage: string;
  policyVersion: string;
  autonomousActionsBlocked: string[];
}

export interface UpgradeHarnessAuditMetadata {
  eventId: string;
  generatedAt: string;
  actor: 'system-pilot-harness';
  source: 'emergency-os-upgrade-harness';
  immutableLedgerHash: string;
  previousHash: string;
  retentionLabel: 'pilot-audit-review';
  reviewRequired: true;
}

export interface UpgradeHarnessSignal<TData = Record<string, unknown>> {
  id: string;
  capability: UpgradeHarnessCapability;
  label: string;
  confidence: number;
  provenance: UpgradeHarnessProvenance;
  safety: UpgradeHarnessSafety;
  audit: UpgradeHarnessAuditMetadata;
  data: TData;
}

export interface AdvancedEmergencyOsUpgradeHarness {
  harnessId: 'advanced-emergency-os-upgrade-harness';
  mode: 'deterministic-pilot-harness';
  apiBase: '/api/emergency';
  generatedAt: string;
  safetyNotice: string;
  blockedAutonomousActions: string[];
  capacityAndForecasting: Array<UpgradeHarnessSignal<Record<string, unknown>>>;
  patientFlow: Array<UpgradeHarnessSignal<Record<string, unknown>>>;
  clinicalDecisionSupport: Array<UpgradeHarnessSignal<Record<string, unknown>>>;
  governance: Array<UpgradeHarnessSignal<Record<string, unknown>>>;
  pilotReadiness: {
    totalCapabilities: number;
    reviewRequired: number;
    externalDependenciesConnected: false;
    canonicalEndpoints: string[];
  };
}

export type OperationalIntelligenceMode = 'rule_based' | 'ml_assisted' | 'hybrid';

export interface OperationalIntelligenceSettings {
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
}

export type OperationalInputEventType =
  | 'patient_journey'
  | 'queue'
  | 'ems'
  | 'offload'
  | 'reassessment'
  | 'capacity'
  | 'boarding'
  | 'referral'
  | 'intake'
  | 'provincial_external'
  | 'iot_device'
  | 'notification'
  | 'user_action'
  | 'audit'
  | 'frontend_health'
  | 'api_health'
  | 'model_prediction'
  | 'data_artifact';

export interface OperationalInputEvent {
  id: string;
  type: OperationalInputEventType;
  source: string;
  timestamp: string;
  tenantId: string;
  payload: Record<string, string | number | boolean | null>;
  humanReviewRequired: true;
}

export interface OperationalSignal {
  id: string;
  category: string;
  label: string;
  value: string | number;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
  sourceModule: string;
  timestamp: string;
}

export interface OperationalFeatureVector {
  activePatients: number;
  waitingPatients: number;
  longestWaitMinutes: number;
  averageWaitMinutes: number;
  emsInbound: number;
  reassessmentsDue: number;
  capacityScore: number;
  capacityBand: CapacityBand;
  boarders: number;
  referralsPending: number;
  breachedQueues: number;
  activeAlerts: number;
  syncStale: boolean;
}

export interface OperationalScore {
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
}

export interface OperationalPrediction {
  id: string;
  modelOrRuleId: string;
  version: string;
  inputSummary: string;
  output: string;
  confidence: number;
  reasonCodes: string[];
  timestamp: string;
  tenantId: string;
  sourceModules: string[];
  humanReviewRequired: true;
}

export interface OperationalAnomaly {
  id: string;
  category: string;
  severity: 'Info' | 'Warning' | 'Critical';
  title: string;
  message: string;
  reasonCodes: string[];
  detectedAt: string;
  humanReviewRequired: true;
}

export interface OperationalRecommendation {
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
}

export interface OperationalAlert extends EmergencyAlert {
  source: 'operational-intelligence';
  category: string;
  reasonCodes: string[];
  humanReviewRequired: true;
  advisoryOnly: true;
}

export interface OperationalModelHealth {
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
}

export interface OperationalDataDriftReport {
  enabled: boolean;
  driftDetected: boolean;
  featureDistributionShift: boolean;
  predictionDistributionShift: boolean;
  confidenceDistributionShift: boolean;
  summary: string;
  generatedAt: string;
}

export interface OperationalAuditEvent {
  id: string;
  type: string;
  summary: string;
  timestamp: string;
  source: string;
  humanReviewRequired: true;
}

export interface OperationalIntelligenceSnapshot {
  layer: 'CareDroidOperationalIntelligence';
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
  featureVector: OperationalFeatureVector;
  scores: OperationalScore[];
  signals: OperationalSignal[];
  predictions: OperationalPrediction[];
  anomalies: OperationalAnomaly[];
  recommendations: OperationalRecommendation[];
  alerts: OperationalAlert[];
  modelHealth: OperationalModelHealth;
  dataDrift: OperationalDataDriftReport;
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
  recentAuditEvents: OperationalAuditEvent[];
  copilotContext: Record<string, string | number | boolean | null>;
}

export type EmergencyOsSettingsPatch = {
  [Key in keyof EmergencyOsSettingsContract]?: EmergencyOsSettingsContract[Key] extends Array<unknown>
    ? EmergencyOsSettingsContract[Key]
    : EmergencyOsSettingsContract[Key] extends Record<string, unknown>
      ? Partial<EmergencyOsSettingsContract[Key]>
      : EmergencyOsSettingsContract[Key];
};
