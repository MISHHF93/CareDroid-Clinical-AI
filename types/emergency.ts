export type EntityId = string;
export type ISODateString = string;
export type LocalDateString = string;

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

export type PatientFlagType =
  | 'ReassessmentDue'
  | 'DeteriorationRisk'
  | 'LongWait'
  | 'HighRisk'
  | 'PendingAdmission'
  | 'EMSArrival'
  | 'Isolation'
  | 'ScoreReassessmentRecommended';

export type PatientFlagSeverity = 'Info' | 'Warning' | 'Critical';

export interface PatientFlag {
  type: PatientFlagType;
  reason: string;
  detectedAt: ISODateString;
  severity: PatientFlagSeverity;
}

export type Sex = 'Female' | 'Male' | 'Intersex' | 'Unknown' | 'Unspecified';
export type VitalValue = string | number | null;

export interface Vitals {
  hr: VitalValue;
  bpSystolic: VitalValue;
  bpDiastolic: VitalValue;
  spo2: VitalValue;
  temp: VitalValue;
  rr: VitalValue;
  gcs: VitalValue;
  pain: VitalValue;
  recordedAt: ISODateString;
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
  | 'Registration'
  | 'Triage'
  | 'StateChange'
  | 'RoomAssignment'
  | 'StaffAssignment'
  | 'VitalsUpdated'
  | 'OrderPlaced'
  | 'ResultReceived'
  | 'ReferralCreated'
  | 'DispositionUpdated'
  | 'NoteAdded'
  | 'FlagAdded'
  | 'FlagRemoved'
  | 'ProtocolLaunched'
  | 'SCORE'
  | 'ClinicalScoreSaved';

export interface JourneyEvent {
  id: EntityId;
  patientId: EntityId;
  type: JourneyEventType;
  timestamp: ISODateString;
  from?: PatientState;
  to?: PatientState;
  fromState?: PatientState;
  toState?: PatientState;
  staffId?: EntityId;
  actorStaffId?: EntityId;
  note?: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type NoteType = 'Clinical' | 'Nursing' | 'Operational' | 'Handoff' | 'Referral' | 'System';

export interface Note {
  id: EntityId;
  patientId: EntityId;
  authorStaffId: EntityId;
  type: NoteType;
  body: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  isPinned?: boolean;
}

export type ReferralStatus =
  | 'Draft'
  | 'Sent'
  | 'Acknowledged'
  | 'Accepted'
  | 'TransferRequested'
  | 'TransportArranged'
  | 'PatientDeparted'
  | 'Declined'
  | 'Completed';

export type ReferralDepartment =
  | 'Cardiology'
  | 'Neurology'
  | 'Psychiatry'
  | 'Internal Medicine'
  | 'Surgery'
  | 'ICU'
  | 'Radiology'
  | 'Other';

export type ReferralUrgency = 'Routine' | 'Urgent' | 'Emergent';

export interface Referral {
  id: EntityId;
  patientId: EntityId;
  requestingStaffId: EntityId;
  targetDepartment: ReferralDepartment;
  urgency: ReferralUrgency;
  reason: string;
  clinicalSummary: string;
  status: ReferralStatus;
  requestedAt: ISODateString;
  respondedAt?: ISODateString;
  completedAt?: ISODateString;
  responseNote?: string;
  workflow?: 'Referral' | 'Transfer';
}

export type EMSArrivalStatus = 'Inbound' | 'Arrived' | 'Handoff' | 'Complete' | 'Cancelled';
export type EMSSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

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
  handoffCompletedAt?: ISODateString;
  status: EMSArrivalStatus;
  preparedRoomId?: EntityId;
  prearrivalComplaint: string;
  priority: Priority;
  handoffSummary?: string;
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
  triageTime: ISODateString | null;
  lastAssessedTime: ISODateString | null;
  chiefComplaint: string;
  complaint?: string;
  complaintCategory: string;
  state: PatientState;
  priority: Priority;
  vitals: Vitals;
  vitalsUpdatedAt?: ISODateString;
  assignedStaffId: EntityId | null;
  assignedTo?: string | null;
  roomId: EntityId | null;
  flags: PatientFlag[];
  timeline: JourneyEvent[];
  referral?: Referral;
  emsArrival?: EMSArrival;
  notes: Note[];
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

export type BottleneckSeverity = 'Yellow' | 'Red';

export interface BottleneckAlert {
  queue: QueueType;
  reason: string;
  severity: BottleneckSeverity;
  detectedAt: ISODateString;
}

export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export type AlertType = 'Reassessment' | 'Capacity' | 'EMS' | 'Referral' | 'Queue' | 'System';

export interface Alert {
  id: EntityId;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientId?: EntityId;
  actionLabel?: string;
  actionFn?: () => void;
  actionType?: string;
  createdAt: ISODateString;
  dismissedAt?: ISODateString;
  autoDismissAfter?: number;
}

export type StaffRole =
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
  firstName: string;
  lastName: string;
  name?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role: StaffRole;
  roleLabel?: string;
  status: StaffStatus;
  shiftId: EntityId | null;
  assignedPatientIds: EntityId[];
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

export type RoomType =
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
  currentPatientId: EntityId | null;
  isIsolationCapable: boolean;
}

export type ShiftStatus = 'Planned' | 'Active' | 'Handover' | 'Closed';

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

export type EMSUnitStatus = 'Available' | 'Dispatched' | 'Inbound' | 'AtHospital' | 'OutOfService';

export interface EMSUnit {
  id: EntityId;
  callSign: string;
  agency: string;
  status: EMSUnitStatus;
  crewStaffIds: EntityId[];
  activeArrivalId?: EntityId;
  lastKnownLocation?: string;
}

export const CapacityScore = Object.freeze({
  Green: 'Green',
  Yellow: 'Yellow',
  Orange: 'Orange',
  Red: 'Red',
} as const);

export type CapacityScore = (typeof CapacityScore)[keyof typeof CapacityScore];
export type CapacityRiskLevel = CapacityScore;
export type CapacityStatusLabel =
  | 'Capacity Normal'
  | 'Capacity Moderate'
  | 'Capacity Strained'
  | 'Capacity Critical';

export interface CapacityScoreDeduction {
  id: string;
  label: string;
  value: number;
}

export interface CapacitySnapshot {
  id: EntityId;
  generatedAt: ISODateString;
  totalActivePatients: number;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercent: number;
  occupancyOveragePatients: number;
  waitingCount: number;
  triageCount: number;
  assessmentCount: number;
  boardingCount: number;
  admissionPendingCount: number;
  dischargePendingCount: number;
  emsInboundCount: number;
  isolationRequiredCount: number;
  staffedRoomCount: number;
  availableRoomCount: number;
  reassessmentDueCount: number;
  incomingEMSCount: number;
  incomingEMSCriticalCount: number;
  dischargeReadyCount: number;
  dischargesPast60Minutes: number;
  hasRecentDischarge: boolean;
  longestWaitMinutes: number;
  averageWaitMinutes: number;
  riskLevel: CapacityRiskLevel;
  label: CapacityStatusLabel;
  deductions: CapacityScoreDeduction[];
  score: number;
  capacityScore?: CapacityScore;
  reassessmentQueueLength?: number;
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
