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
  title: string;
  summary: string;
  timestamp: string;
  actorStaffId?: string;
  actorName?: string;
  patientId?: string;
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

export interface EmergencyOsModuleSetting {
  id: string;
  label: string;
  enabled: boolean;
}

export interface EmergencyOsSettingsContract {
  tenantName: string;
  defaultWorkspace: string;
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

export type EmergencyOsSettingsPatch = {
  [Key in keyof EmergencyOsSettingsContract]?: EmergencyOsSettingsContract[Key] extends Array<unknown>
    ? EmergencyOsSettingsContract[Key]
    : EmergencyOsSettingsContract[Key] extends Record<string, unknown>
      ? Partial<EmergencyOsSettingsContract[Key]>
      : EmergencyOsSettingsContract[Key];
};
