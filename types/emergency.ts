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

export type PatientFlagType =
  | 'ReassessmentDue'
  | 'DeteriorationRisk'
  | 'LongWait'
  | 'HighRisk'
  | 'PendingAdmission'
  | 'EMSArrival'
  | 'Isolation';

export type PatientFlagSeverity = 'Info' | 'Warning' | 'Critical';

export interface PatientFlag {
  type: PatientFlagType;
  reason: string;
  detectedAt: ISODateString;
  severity: PatientFlagSeverity;
}

export type Sex = 'Female' | 'Male' | 'Intersex' | 'Unknown' | 'Unspecified';

export interface Vitals {
  hr: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  spo2: number | null;
  temp: number | null;
  rr: number | null;
  gcs: number | null;
  pain: number | null;
  recordedAt: ISODateString;
}

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
  dob: LocalDateString;
  age: number;
  sex: Sex;
  arrivalTime: ISODateString;
  triageTime: ISODateString | null;
  lastAssessedTime: ISODateString | null;
  chiefComplaint: string;
  complaintCategory: string;
  state: PatientState;
  priority: Priority;
  vitals: Vitals;
  assignedStaffId: EntityId | null;
  roomId: EntityId | null;
  flags: PatientFlag[];
  timeline: JourneyEvent[];
  referral?: Referral;
  emsArrival?: EMSArrival;
  notes: Note[];
}

export type QueueType =
  | 'Arrival'
  | 'Registration'
  | 'Triage'
  | 'Waiting'
  | 'Provider'
  | 'Assessment'
  | 'Orders'
  | 'Results'
  | 'Disposition'
  | 'Admission'
  | 'Discharge'
  | 'Reassessment'
  | 'Referral'
  | 'EMS'
  | 'HighRisk'
  | 'Boarding';

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

export type AlertType =
  | 'Reassessment'
  | 'Capacity'
  | 'EMS'
  | 'Referral'
  | 'Queue';

export interface Alert {
  id: EntityId;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientId?: EntityId;
  actionLabel?: string;
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
  role: StaffRole;
  status: StaffStatus;
  shiftId: EntityId | null;
  assignedPatientIds: EntityId[];
  currentRoomId?: EntityId;
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

export type CapacityRiskLevel = 'Green' | 'Yellow' | 'Orange' | 'Red';
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
}
