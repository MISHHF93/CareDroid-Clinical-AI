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
  | 'capacity_score_changed'
  | 'boarding_started'
  | 'referral_created'
  | 'copilot_used'
  | 'provincial_data_viewed'
  | 'integration_event_received';

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

export interface EmergencyPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: number;
  sex: 'M' | 'F' | 'Other';
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
  source: 'backend-fixture';
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

export type EmergencyOsSettingsPatch = {
  [Key in keyof EmergencyOsSettingsContract]?: EmergencyOsSettingsContract[Key] extends Array<unknown>
    ? EmergencyOsSettingsContract[Key]
    : EmergencyOsSettingsContract[Key] extends Record<string, unknown>
      ? Partial<EmergencyOsSettingsContract[Key]>
      : EmergencyOsSettingsContract[Key];
};
