import type { TriageAssistEnvelope } from '../../lib/patient-orchestration/types';

export type EntityId = string;
export type ISODateString = string;
export type LocalDateString = string;

export type { TriageAssistEnvelope };

export enum PatientState {
  Arrival = 'Arrival',
  Registration = 'Registration',
  Triage = 'Triage',
  Waiting = 'Waiting',
  Assessment = 'Assessment',
  Orders = 'Orders',
  Results = 'Results',
  Disposition = 'Disposition',
  Admission = 'Admission',
  Discharge = 'Discharge',
  Deceased = 'Deceased',
}

export enum Priority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
  P5 = 'P5',
}

export const PriorityLabel: Record<Priority, string> = {
  [Priority.P1]: 'Resuscitation',
  [Priority.P2]: 'Emergent',
  [Priority.P3]: 'Urgent',
  [Priority.P4]: 'Semi-Urgent',
  [Priority.P5]: 'Non-Urgent',
};

export type PatientPriority = Priority | string | number;
export type LegacyPriority =
  | PatientPriority
  | 'Immediate'
  | 'Emergent'
  | 'Urgent'
  | 'LessUrgent'
  | 'NonUrgent'
  | null
  | undefined;

export function normalizePriority(value: LegacyPriority): Priority {
  if (value === Priority.P1 || value === 1 || value === '1' || value === 'Immediate') return Priority.P1;
  if (value === Priority.P2 || value === 2 || value === '2' || value === 'Emergent') return Priority.P2;
  if (value === Priority.P3 || value === 3 || value === '3' || value === 'Urgent') return Priority.P3;
  if (value === Priority.P4 || value === 4 || value === '4' || value === 'LessUrgent') return Priority.P4;
  return Priority.P5;
}

export function legacyPriorityToEnum(p: string): Priority {
  if (p === 'high') return Priority.P2;
  if (p === 'medium') return Priority.P3;
  return Priority.P4;
}

export enum PatientFlag {
  ReassessmentDue = 'ReassessmentDue',
  DeteriorationRisk = 'DeteriorationRisk',
  ScoreReassessmentRecommended = 'ScoreReassessmentRecommended',
  LongWait = 'LongWait',
  LWBSRisk = 'LWBSRisk',
  HighRisk = 'HighRisk',
  PendingAdmission = 'PendingAdmission',
  EMSArrival = 'EMSArrival',
  SepsisAlert = 'SepsisAlert',
  PsychAlert = 'PsychAlert',
  Isolation = 'Isolation',
  DeterioratingNeuro = 'DeterioratingNeuro',
  StrokeCode = 'StrokeCode',
  IdentityPending = 'IdentityPending',
}

export type PatientFlagType = `${PatientFlag}`;
export type PatientFlagSeverity = 'Info' | 'Warning' | 'Critical';

export interface PatientFlagRecord {
  type: PatientFlagType;
  reason: string;
  detectedAt: ISODateString;
  severity: PatientFlagSeverity;
}

export type Sex = 'M' | 'F' | 'Other' | 'Female' | 'Male' | 'Intersex' | 'Unknown' | 'Unspecified';
export type VitalValue = string | number | null;

export interface Vitals {
  hr?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  temp?: number;
  rr?: number;
  gcs?: number;
  pain?: number;
  recordedAt: ISODateString;
  recordedBy?: EntityId;
  bpSystolic?: VitalValue;
  bpDiastolic?: VitalValue;
  temperature?: VitalValue;
  heartRate?: VitalValue;
  respiratoryRate?: VitalValue;
  bloodPressure?: VitalValue;
  oxygenSaturation?: VitalValue;
  painScore?: VitalValue;
  [key: string]: VitalValue | ISODateString | undefined;
}

export type PatientVitals = Vitals;

export type JourneyEventType =
  | 'Arrival'
  | 'EncounterCreated'
  | 'Registration'
  | 'Triage'
  | 'Intake'
  | 'StateChange'
  | 'QueueMovement'
  | 'RoomAssignment'
  | 'StaffAssignment'
  | 'VitalsUpdated'
  | 'OrderPlaced'
  | 'ResultReceived'
  | 'FlagAdded'
  | 'FlagRemoved'
  | 'AlertCreated'
  | 'ReferralCreated'
  | 'DispositionUpdated'
  | 'NoteAdded'
  | 'ProtocolLaunched'
  | 'SCORE'
  | 'ClinicalScoreSaved'
  | 'ReassessmentReminderScheduled'
  | 'ReassessmentReminderSnoozed'
  | 'ReassessmentReminderCompleted'
  | 'VitalsAlertFired'
  | 'VitalsAlertAddressed'
  | 'EMSCriticalBroadcast'
  | 'EMSCriticalChecklistSaved'
  | 'ESCALATION'
  | 'ESCALATION_CANCELLED';

export interface JourneyEvent {
  id: EntityId;
  patientId?: EntityId;
  type?: JourneyEventType;
  timestamp: ISODateString;
  from?: PatientState;
  to: PatientState;
  fromState?: PatientState;
  toState?: PatientState;
  staffId?: EntityId;
  actorStaffId?: EntityId;
  by?: EntityId;
  reason?: string;
  note?: string;
  summary?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export type EncounterStatus = 'created' | 'active' | 'completed' | 'cancelled' | string;
export type EncounterSource = 'smart-intake' | 'ems' | 'walk-in' | 'transfer' | 'referral' | string;

export interface Encounter {
  id: EntityId;
  patientId: EntityId;
  status: EncounterStatus;
  source: EncounterSource;
  createdAt: ISODateString;
  currentState: PatientState;
  timelineEventIds: EntityId[];
  closedAt?: ISODateString;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export type NoteType = 'Clinical' | 'Nursing' | 'Operational' | 'Handoff' | 'Referral' | 'System' | 'Score' | 'Disposition' | string;

export interface Note {
  id: EntityId;
  text?: string;
  body?: string;
  authorId?: EntityId;
  authorStaffId?: EntityId;
  patientId?: EntityId;
  type?: NoteType;
  timestamp?: ISODateString;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  isPinned?: boolean;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export type ReferralStatus =
  | 'Draft'
  | 'Sent'
  | 'Acknowledged'
  | 'Accepted'
  | 'InfoRequested'
  | 'TransferRequested'
  | 'TransportArranged'
  | 'PatientDeparted'
  | 'Declined'
  | 'Delayed'
  | 'Closed'
  | 'Completed'
  | string;

export type ReferralDepartment =
  | 'Cardiology'
  | 'Neurology'
  | 'Psychiatry'
  | 'Internal Medicine'
  | 'Surgery'
  | 'ICU'
  | 'Radiology'
  | 'Other'
  | string;

export type ReferralUrgency = 'Routine' | 'Urgent' | 'Emergent' | 'Stat' | string;

export interface Referral {
  id: EntityId;
  patientId: EntityId;
  requestingStaffId?: EntityId;
  service?: string;
  targetDepartment?: ReferralDepartment;
  urgency?: ReferralUrgency;
  reason?: string;
  clinicalSummary?: string;
  workflow?: 'Referral' | 'Transfer' | string;
  status: ReferralStatus;
  requestedAt?: ISODateString;
  respondedAt?: ISODateString;
  completedAt?: ISODateString;
  responseNote?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  summary?: string;
}

export type EMSArrivalStatus = 'Inbound' | 'Arrived' | 'Handoff' | 'Complete' | 'Cancelled';
export type EMSSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

export type CriticalChecklistType =
  | 'stemi'
  | 'stroke'
  | 'trauma'
  | 'anaphylaxis'
  | 'ob'
  | 'pediatric-arrest'
  | 'respiratory-failure';

export interface CriticalChecklistCompletion {
  itemId: EntityId;
  label: string;
  checkedByStaffId: EntityId;
  checkedByStaffName: string;
  checkedAt: ISODateString;
}

export interface CriticalChecklistRecord {
  type: CriticalChecklistType;
  title: string;
  triggeredAt: ISODateString;
  assignedRoomId?: EntityId;
  assignedRoomName?: string;
  completions: CriticalChecklistCompletion[];
  completedAt?: ISODateString;
  completedByStaffId?: EntityId;
  completedByStaffName?: string;
  savedToPatientAt?: ISODateString;
}

/** Identity verification state captured at ambulance handoff. */
export type AmbulanceHandoffIdentityStatus =
  | 'unknown'
  | 'provisional'
  | 'verified'
  | 'mismatch';

/** Where the patient was moved after EMS handoff. */
export type AmbulanceHandoffDestination =
  | 'pending'
  | 'waiting'
  | 'room'
  | 'monitored-chair'
  | 'hallway'
  | 'offload-area';

export type AmbulanceHandoffCriticalFlagSource =
  | 'ems-severity'
  | 'patient-flag'
  | 'high-risk-complaint'
  | 'critical-checklist'
  | 'staff';

export interface AmbulanceHandoffCriticalFlag {
  id: string;
  label: string;
  source: AmbulanceHandoffCriticalFlagSource;
}

/** Structured ambulance handoff checklist — derived from EMS/intake data with staff confirmations. */
export interface AmbulanceHandoffChecklist {
  arrivalId: EntityId;
  patientId?: EntityId;
  identityStatus: AmbulanceHandoffIdentityStatus;
  complaintSummary: string;
  vitalsReceived: boolean;
  vitalsSnapshot?: Vitals;
  medicationsEnRoute: string[];
  criticalFlags: AmbulanceHandoffCriticalFlag[];
  handoffSummary?: string;
  handoffAccepted: boolean;
  handoffAcceptedAt?: ISODateString;
  handoffAcceptedByStaffId?: EntityId;
  handoffAcceptedByStaffName?: string;
  patientDestination: AmbulanceHandoffDestination;
  destinationLabel?: string;
  destinationRoomId?: EntityId;
  handoffNotes?: string;
  updatedAt: ISODateString;
}

export interface EMSArrival {
  id: EntityId;
  patientId?: EntityId;
  unitId: EntityId;
  unitName: string;
  crewNames: string[];
  patientAge: number;
  patientSex: Sex;
  chiefComplaint: string;
  mechanismOfInjury?: string;
  vitals?: Vitals;
  eta: number;
  severity: EMSSeverity;
  dispatchTime: ISODateString;
  estimatedArrivalTime: ISODateString;
  notes: string;
  arrivedAt?: ISODateString;
  handoffStartedAt?: ISODateString;
  handoffCompletedAt?: ISODateString;
  status: EMSArrivalStatus;
  preparedRoomId?: EntityId;
  prearrivalComplaint: string;
  priority: Priority;
  handoffSummary?: string;
  criticalChecklist?: CriticalChecklistRecord;
  /** Explicit medications documented by EMS crew (optional feed field). */
  medicationsEnRoute?: string[];
  /** Structured handoff checklist — synced to linked patient.emsArrival when present. */
  ambulanceHandoffChecklist?: AmbulanceHandoffChecklist;
}

export type EMSCase = EMSArrival;

/** Canonical arrival channel for reception / triage routing. */
export type ArrivalMode = 'walk-in' | 'EMS' | 'referral' | 'police' | 'transfer';

/** Registration progress through the arrival pipeline. */
export type RegistrationStatus = 'pending' | 'in-progress' | 'complete' | 'provisional';

/** Operational queue destination after arrival capture. */
export type QueueDestination =
  | 'triage-queue'
  | 'rapid-review'
  | 'waiting-room'
  | 'verification'
  | 'ems-registration'
  | 'whiteboard';

/** High-risk complaint fast flag — staff alert only; does not assign CTAS. */
export type HighRiskComplaintFlagId =
  | 'chest-pain'
  | 'shortness-of-breath'
  | 'stroke-symptoms'
  | 'syncope'
  | 'altered-mental-status'
  | 'severe-abdominal-pain'
  | 'severe-bleeding'
  | 'sepsis-concern'
  | 'anaphylaxis-concern'
  | 'pregnancy-emergency';

export interface HighRiskComplaintFlagRecord {
  id: HighRiskComplaintFlagId;
  label: string;
  detectedAt: ISODateString;
  source: 'complaint-text' | 'complaint-category' | 'staff-selected';
}

/** Quick safety flags captured at arrival (subset of PatientFlag). */
export type QuickSafetyFlag =
  | PatientFlag.HighRisk
  | PatientFlag.StrokeCode
  | PatientFlag.SepsisAlert
  | PatientFlag.PsychAlert
  | PatientFlag.Isolation
  | PatientFlag.DeterioratingNeuro;

/** Unified arrival-to-triage control snapshot for reception and operational surfaces. */
export interface ArrivalControlSnapshot {
  patientId: string;
  arrivalTimestamp: ISODateString;
  arrivalMode: ArrivalMode;
  presentingComplaint: string;
  quickSafetyFlags: QuickSafetyFlag[];
  highRiskComplaintFlags: HighRiskComplaintFlagRecord[];
  registrationStatus: RegistrationStatus;
  triagePending: boolean;
  firstContactTimestamp: ISODateString | null;
  queueDestination: QueueDestination;
}

export interface Patient {
  id: EntityId;
  mrn: string;
  firstName: string;
  lastName: string;
  name?: string;
  dob: LocalDateString;
  age: number;
  sex: Sex;
  location?: string;
  arrivalTime: ISODateString;
  triageTime?: ISODateString | null;
  lastAssessedTime?: ISODateString | null;
  chiefComplaint: string;
  complaint?: string;
  complaintCategory: string;
  state: PatientState;
  priority: Priority;
  vitals: Vitals[];
  currentVitals?: Vitals | null;
  vitalsUpdatedAt?: ISODateString;
  flags: PatientFlag[];
  assignedStaffId?: EntityId | null;
  assignedTo?: string | null;
  roomId?: EntityId | null;
  notes: Note[];
  timeline: JourneyEvent[];
  referral?: Referral;
  reassessmentReminders?: ReassessmentReminder[];
  vitalsAlerts?: VitalsAlert[];
  source?: 'EMS' | 'WalkIn' | 'Transfer' | 'Referral' | string;
  emsUnitId?: EntityId;
  emsArrival?: EMSArrival;
  criticalChecklist?: CriticalChecklistRecord;
  phone?: string;
  mobilePhone?: string;
  healthCardNumber?: string;
  healthCard?: string;
  phn?: string;
  triageAssist?: TriageAssistEnvelope | null;
  triageAssistGeneratedAt?: ISODateString | null;
  /** Arrival-to-triage control layer — optional on legacy records; derived when absent. */
  arrivalMode?: ArrivalMode;
  registrationStatus?: RegistrationStatus;
  triagePending?: boolean;
  firstContactAt?: ISODateString | null;
  queueDestination?: QueueDestination;
  quickSafetyFlags?: QuickSafetyFlag[];
  /** Reception / waiting-room fast flags — advisory only, no auto-triage. */
  highRiskComplaintFlags?: HighRiskComplaintFlagRecord[];
  /** Staff-confirmed fit-to-sit / fit-to-wait seating pathway — never auto-assigned. */
  fitToWaitClassification?: FitToWaitClassificationRecord | null;
}

/** Fit-to-sit / fit-to-wait seating classification — human review required. */
export type FitToWaitClassificationId =
  | 'fit-to-sit'
  | 'monitored-chair'
  | 'stretcher-needed'
  | 'immediate-room-needed'
  | 'reassessment-required';

export interface FitToWaitClassificationRecord {
  id: FitToWaitClassificationId;
  label: string;
  classifiedAt: ISODateString;
  classifiedByStaffId?: EntityId;
  classifiedByStaffName?: string;
  notes?: string;
  /** Always true — classifications require explicit staff action. */
  staffConfirmed: true;
}

/** Patient-facing experience status — derived from journey/queue state for staff visibility. */
export type PatientExperienceStatusId =
  | 'registered'
  | 'waiting-for-triage'
  | 'waiting-for-clinician'
  | 'tests-in-progress'
  | 'waiting-for-results'
  | 'waiting-for-specialist-review'
  | 'preparing-discharge'
  | 'awaiting-admission-bed';

export type PatientExperienceTone = 'neutral' | 'info' | 'watch' | 'stable';

export interface PatientExperienceStatusSnapshot {
  id: PatientExperienceStatusId;
  label: string;
  shortLabel: string;
  tone: PatientExperienceTone;
  internalState: PatientState;
  queueDestination?: QueueDestination;
  staffDetail: string;
}

/** PHI-safe status view for public or wall displays — no identifiers or clinical detail. */
export interface PublicPatientExperienceStatusView {
  id: PatientExperienceStatusId;
  label: string;
}

export type StaffRole =
  | 'MD'
  | 'RN'
  | 'PA'
  | 'Tech'
  | 'Charge'
  | 'Attending'
  | 'Resident'
  | 'Nurse'
  | 'TriageNurse'
  | 'ChargeNurse'
  | 'Paramedic'
  | 'Technician'
  | 'Clerk'
  | 'Consultant'
  | 'Administrator';

export type StaffStatus = 'OnShift' | 'Break' | 'Unavailable' | 'OffShift';

export interface Staff {
  id: EntityId;
  name: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role: StaffRole;
  roleLabel?: string;
  active: boolean;
  status?: StaffStatus;
  shiftId?: EntityId | null;
  assignedPatientIds?: EntityId[];
  activePatients?: number;
  currentRoomId?: EntityId;
}

export type StaffMember = Staff;

export interface StaffWorkload {
  staffId: EntityId;
  name: string;
  role: StaffRole | string;
  activePatients: number;
  assignedPatientIds?: EntityId[];
  workloadPercent?: number;
}

export type StaffingRequestStatus = 'Requested' | 'Acknowledged' | 'Fulfilled' | 'Cancelled';

export interface StaffingRequest {
  id: EntityId;
  requestedAt: ISODateString;
  requestedByStaffId?: EntityId;
  requestedByName?: string;
  reason: string;
  capacityScore: number;
  capacityBand: CapacityBand;
  status: StaffingRequestStatus;
  source: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export type RoomType =
  | 'Treatment'
  | 'Resus'
  | 'Triage'
  | 'Waiting'
  | 'Assessment'
  | 'Resuscitation'
  | 'Observation'
  | 'Isolation';
export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Blocked' | 'Reserved';

export interface Room {
  id: EntityId;
  name: string;
  type: RoomType;
  status: RoomStatus;
  patientId?: EntityId;
  currentPatientId?: EntityId | null;
  isIsolationCapable?: boolean;
}

export type ShiftStatus = 'Planned' | 'Active' | 'Open' | 'Handover' | 'Closed';

export interface ActiveShift {
  id: EntityId;
  label: string;
  startTime: ISODateString;
  status: ShiftStatus | 'Open' | 'Closed';
  chargeStaffId: EntityId;
  staffIds?: EntityId[];
  handoffNotes?: Note[];
}

export interface Shift {
  id: EntityId;
  name: string;
  startTime: ISODateString;
  endTime: ISODateString;
  status: ShiftStatus;
  chargeStaffId: EntityId;
  staffIds: EntityId[];
  handoffNotes: Note[];
}

export type EMSUnitStatus = 'Available' | 'Dispatched' | 'Inbound' | 'AtHospital' | 'OutOfService' | 'Arrived' | 'Offload';

export interface EmsUnit {
  id: EntityId;
  unitNumber: string;
  etaMinutes?: number;
  status: 'Inbound' | 'Arrived' | 'Available' | 'Offload';
  patientId?: EntityId;
  acuity?: Priority;
}

export interface EMSUnit {
  id: EntityId;
  callSign: string;
  agency: string;
  status: EMSUnitStatus;
  crewStaffIds: EntityId[];
  activeArrivalId?: EntityId;
  lastKnownLocation?: string;
}

export type WorkflowActionType =
  | 'patient_created'
  | 'encounter_created'
  | 'journey_state_changed'
  | 'clinician_assigned'
  | 'reassessment_created'
  | 'reassessment_completed'
  | 'ems_arrival_created'
  | 'ems_converted_to_patient'
  | 'capacity_score_changed'
  | 'boarding_started'
  | 'staffing_request_created'
  | 'referral_created'
  | 'referral_status_changed'
  | 'copilot_used'
  | 'provincial_data_viewed'
  | 'integration_event_received'
  | 'clinical_score_saved';

export interface ClinicalScoreSaveInput {
  patientId: string;
  scoreId: string;
  scoreLabel: string;
  scoreTotal: number | string;
  max?: number | string;
  band: string;
  recommendation?: string;
  fields?: Record<string, unknown>;
  staffId?: string;
  critical?: boolean;
}

export type WorkflowActionSeverity = 'Info' | 'Warning' | 'Critical';
export type WorkflowActionStatus = 'recorded' | 'pending' | 'completed' | 'failed';

export interface WorkflowActionLog {
  id: EntityId;
  type: WorkflowActionType;
  title: string;
  summary: string;
  timestamp: ISODateString;
  actorStaffId?: EntityId;
  actorName?: string;
  patientId?: EntityId;
  source: string;
  severity: WorkflowActionSeverity;
  status: WorkflowActionStatus;
  metadata: Record<string, string | number | boolean | null | undefined>;
}

export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export type AlertType =
  | 'Reassessment'
  | 'Capacity'
  | 'EMS'
  | 'Referral'
  | 'Queue'
  | 'System'
  | 'CAPACITY_CRISIS'
  | string;

export interface Alert {
  id: EntityId;
  type?: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientId?: EntityId;
  reminderId?: EntityId;
  actionLabel?: string;
  actionFn?: () => void;
  actionType?: string;
  createdAt: ISODateString;
  read?: boolean;
  acknowledged?: boolean;
  acknowledgedAt?: ISODateString;
  dismissed: boolean;
  dismissedAt?: ISODateString;
  autoDismissAfter?: number;
  source?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export const QueueType = Object.freeze({
  Arrival: 'Arrival',
  Registration: 'Registration',
  Triage: 'Triage',
  Waiting: 'Waiting',
  Provider: 'Provider',
  Assessment: 'Assessment',
  Orders: 'Orders',
  Results: 'Results',
  Disposition: 'Disposition',
  Admission: 'Admission',
  Discharge: 'Discharge',
  Reassessment: 'Reassessment',
  Referral: 'Referral',
  EMS: 'EMS',
  HighRisk: 'HighRisk',
  Boarding: 'Boarding',
} as const);

export type QueueType = (typeof QueueType)[keyof typeof QueueType];

export interface Queue {
  id: EntityId;
  type: QueueType;
  name: string;
  patientIds: EntityId[];
  targetWaitMinutes: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
  criticalCount: number;
  updatedAt: ISODateString;
}

export type QueueItem = Queue;

export interface QueueSummary {
  id: EntityId;
  label: string;
  count: number;
  type?: QueueType;
  name?: string;
  patientCount?: number;
  oldestWaitMinutes?: number;
  targetMinutes?: number;
  breached?: boolean;
  [key: string]: string | number | boolean | null | undefined;
}

export type BottleneckSeverity = 'Yellow' | 'Red';

export interface BottleneckAlert {
  queue: QueueType;
  reason: string;
  severity: BottleneckSeverity;
  detectedAt: ISODateString;
}

export const CapacityScore = Object.freeze({
  Green: 'Green',
  Yellow: 'Yellow',
  Orange: 'Orange',
  Red: 'Red',
} as const);

export type CapacityScore = (typeof CapacityScore)[keyof typeof CapacityScore];
export type CapacityRiskLevel = CapacityScore;
export type CapacityBand = 'Green' | 'Yellow' | 'Orange' | 'Red';
export type CapacityStatusLabel =
  | 'Capacity Normal'
  | 'Capacity Moderate'
  | 'Capacity Strained'
  | 'Capacity Critical'
  | string;

export interface CapacityScoreDeduction {
  id: EntityId;
  label: string;
  value: number;
}

export interface CapacitySnapshot {
  score: number;
  band: CapacityBand;
  label?: CapacityStatusLabel;
  riskLevel?: CapacityRiskLevel;
  totalPatients: number;
  occupiedRooms: number;
  boardingCount: number;
  reassessmentDue: number;
  updatedAt: ISODateString;
  id?: EntityId;
  generatedAt?: ISODateString;
  totalActivePatients?: number;
  currentOccupancy?: number;
  maxCapacity?: number;
  occupancyPercent?: number;
  occupancyOveragePatients?: number;
  waitingCount?: number;
  triageCount?: number;
  assessmentCount?: number;
  admissionPendingCount?: number;
  dischargePendingCount?: number;
  emsInboundCount?: number;
  isolationRequiredCount?: number;
  staffedRoomCount?: number;
  availableRoomCount?: number;
  reassessmentDueCount?: number;
  incomingEMSCount?: number;
  incomingEMSCriticalCount?: number;
  dischargeReadyCount?: number;
  dischargesPast60Minutes?: number;
  hasRecentDischarge?: boolean;
  longestWaitMinutes?: number;
  averageWaitMinutes?: number;
  deductions?: CapacityScoreDeduction[];
  capacityScore?: CapacityScore;
  reassessmentQueueLength?: number;
}

export type CapacityStatus = CapacitySnapshot;

export interface CapacityHistoryEntry {
  id: EntityId;
  timestamp: ISODateString;
  band: CapacityBand;
  score?: number;
  fromBand?: CapacityBand;
  toBand?: CapacityBand;
  source?: string;
  reason?: string;
}

export type BoardingStatus =
  | 'NotBoarded'
  | 'Boarding'
  | 'PendingAdmission'
  | 'BedAssigned'
  | 'Transferred';

export interface BoardingStatusSnapshot {
  boarders: number;
  risk: 'normal' | 'watch' | 'strained' | 'critical';
  longestBoardingMinutes?: number;
  updatedAt?: ISODateString;
}

export type ReassessmentReminderStatus = 'pending' | 'completed' | 'snoozed';

export interface ReassessmentReminder {
  id: EntityId;
  patientId: EntityId;
  scheduledBy: EntityId;
  scheduledAt?: ISODateString;
  dueAt: ISODateString;
  note?: string;
  status: ReassessmentReminderStatus;
  completedBy?: EntityId;
  completedAt?: ISODateString;
  snoozedUntil?: ISODateString;
  lastAlertStage?: 'upcoming' | 'due' | 'overdue';
}

export type VitalsAlertSeverity = 'critical' | 'warning' | 'watch';
export type VitalsAlertStatus = 'active' | 'addressed';

export interface VitalsAlert {
  id: EntityId;
  patientId: EntityId;
  severity: VitalsAlertSeverity;
  status: VitalsAlertStatus;
  vital: string;
  value: number;
  unit: string;
  reason: string;
  recordedAt: ISODateString;
  acknowledgedAt?: ISODateString;
  acknowledgedBy?: EntityId;
}

export interface ReassessmentQueueItem {
  patientId: EntityId;
  patientName: string;
  state: PatientState;
  priority: PatientPriority;
  waitingMinutes: number;
  vitalsAgeMinutes: number;
  reasons: string[];
  flaggedAt: ISODateString;
}

export interface WhiteboardFilter {
  queue?: QueueType | null;
  complaint?: string | null;
}

export interface PatientJourneyAuditEvent {
  id: EntityId;
  patientId: EntityId;
  patientName: string;
  fromState: PatientState;
  toState: PatientState;
  transitionedAt: ISODateString;
  actor: string;
  reason: string;
}

export type EmergencyFeatureFlags = Record<string, boolean>;
