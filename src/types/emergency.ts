export enum PatientState {
  Arrival='Arrival', Registration='Registration',
  Triage='Triage', Waiting='Waiting',
  Assessment='Assessment', Orders='Orders',
  Results='Results', Disposition='Disposition',
  Admission='Admission', Discharge='Discharge'
}

export enum Priority { P1='P1',P2='P2',P3='P3',P4='P4',P5='P5' }

export enum PatientFlag {
  ReassessmentDue='ReassessmentDue',
  DeteriorationRisk='DeteriorationRisk',
  ScoreReassessmentRecommended='ScoreReassessmentRecommended',
  LongWait='LongWait', HighRisk='HighRisk',
  PendingAdmission='PendingAdmission',
  EMSArrival='EMSArrival', SepsisAlert='SepsisAlert'
}

export type LegacyPriority = Priority | 'Immediate' | 'Emergent' | 'Urgent' | 'LessUrgent' | 'NonUrgent' | number;

export function normalizePriority(value: LegacyPriority | null | undefined): Priority {
  if (value === Priority.P1 || value === 1 || value === 'Immediate') return Priority.P1;
  if (value === Priority.P2 || value === 2 || value === 'Emergent') return Priority.P2;
  if (value === Priority.P3 || value === 3 || value === 'Urgent') return Priority.P3;
  if (value === Priority.P4 || value === 4 || value === 'LessUrgent') return Priority.P4;
  return Priority.P5;
}

export interface Vitals {
  hr?: number; sbp?: number; dbp?: number
  spo2?: number; temp?: number; rr?: number
  gcs?: number; pain?: number
  recordedAt: string; recordedBy: string
}

export interface Patient {
  id: string; mrn: string
  firstName: string; lastName: string
  dob: string; age: number; sex: 'M'|'F'|'Other'
  arrivalTime: string; triageTime?: string
  chiefComplaint: string; complaintCategory: string
  state: PatientState; priority: Priority
  vitals: Vitals[]; flags: PatientFlag[]
  assignedStaffId?: string; roomId?: string
  notes: Note[]; timeline: JourneyEvent[]
  referral?: Referral
  reassessmentReminders?: ReassessmentReminder[]
  source?: 'EMS' | 'WalkIn' | 'Transfer' | 'Referral' | string
  emsUnitId?: string
}

export interface Staff {
  id: string; name: string
  role: 'MD'|'RN'|'PA'|'Tech'|'Charge'
  active: boolean
}

export interface Room {
  id: string; name: string
  type: 'Treatment'|'Resus'|'Isolation'|'Waiting'
  status: 'Available'|'Occupied'|'Blocked'
  patientId?: string
}

export interface Note {
  id: string
  text?: string
  body?: string
  authorId?: string
  authorStaffId?: string
  patientId?: string
  type?: 'Clinical' | 'Score' | 'Disposition' | 'System' | string
  timestamp?: string
  createdAt?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
}

export interface JourneyEvent {
  id: string; from?: PatientState; to: PatientState
  timestamp: string; staffId: string; note?: string
  type?:
    | 'Intake'
    | 'StateChange'
    | 'Triage'
    | 'QueueMovement'
    | 'RoomAssignment'
    | 'StaffAssignment'
    | 'VitalsUpdated'
    | 'FlagAdded'
    | 'FlagRemoved'
    | 'AlertCreated'
    | 'ReferralCreated'
    | 'DispositionUpdated'
  summary?: string
  actorStaffId?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
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
  metadata: Record<string, string | number | boolean | null | undefined>;
}

export interface Alert {
  id: string; severity: 'Info'|'Warning'|'Critical'
  title: string; message: string
  patientId?: string; createdAt: string
  dismissed: boolean
  source?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
}

export interface CapacitySnapshot {
  score: number
  band: 'Green'|'Yellow'|'Orange'|'Red'
  label?: string
  riskLevel?: 'Green'|'Yellow'|'Orange'|'Red'
  totalPatients: number; occupiedRooms: number
  boardingCount: number; reassessmentDue: number
  updatedAt: string
}

export interface ActiveShift {
  id: string
  label: string
  startTime: string
  status: 'Open' | 'Closed'
  chargeStaffId: string
}

export interface EmsUnit {
  id: string
  unitNumber: string
  etaMinutes?: number
  status: 'Inbound' | 'Arrived' | 'Available' | 'Offload'
  patientId?: string
  acuity?: Priority
}

export interface Referral {
  id: string
  patientId: string
  requestingStaffId?: string
  service: string
  targetDepartment?: string
  urgency?: 'Routine' | 'Urgent' | 'Stat' | string
  reason?: string
  clinicalSummary?: string
  workflow?: string
  status: 'Draft' | 'Sent' | 'Accepted' | 'Delayed' | 'Closed' | string
  requestedAt?: string
  respondedAt?: string
  responseNote?: string
  createdAt: string
  updatedAt?: string
  summary?: string
}

export interface ReassessmentReminder {
  id: string
  patientId: string
  scheduledBy: string
  dueAt: string
  note?: string
  status: 'pending' | 'completed'
  completedBy?: string
  completedAt?: string
}

export interface EmergencyFeatureFlags {
  whiteboard: boolean
  ems: boolean
  referrals: boolean
  capacity: boolean
  tools: boolean
  shift: boolean
  settings: boolean
  copilot: boolean
}
