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
}

export enum QueueType {
  Waiting = 'Waiting',
  Triage = 'Triage',
  Provider = 'Provider',
  Results = 'Results',
  Referral = 'Referral',
  Admission = 'Admission',
  Discharge = 'Discharge',
  Reassessment = 'Reassessment',
}

export enum CapacityScore {
  Green = 'Green',
  Yellow = 'Yellow',
  Orange = 'Orange',
  Red = 'Red',
}

export type PatientPriority = string | number;
export type VitalValue = string | number | null;

export interface PatientVitals {
  temperature?: VitalValue;
  heartRate?: VitalValue;
  respiratoryRate?: VitalValue;
  bloodPressure?: VitalValue;
  oxygenSaturation?: VitalValue;
  spo2?: VitalValue;
  painScore?: VitalValue;
  [key: string]: VitalValue | undefined;
}

export interface Patient {
  id: string;
  name: string;
  location?: string;
  arrivalTime: string;
  complaint: string;
  state: PatientState;
  priority: PatientPriority;
  vitals: PatientVitals;
  vitalsUpdatedAt?: string;
  assignedTo: string | null;
}

export interface ReassessmentQueueItem {
  patientId: string;
  patientName: string;
  state: PatientState;
  priority: PatientPriority;
  waitingMinutes: number;
  vitalsAgeMinutes: number;
  reasons: string[];
  flaggedAt: string;
}

export interface CapacitySnapshot {
  score: CapacityScore;
  maxCapacity: number;
  currentOccupancy: number;
  occupancyPercent: number;
  boardingCount: number;
  reassessmentQueueLength: number;
  generatedAt: string;
}

export interface WhiteboardFilter {
  queue?: QueueType | null;
  complaint?: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface StaffWorkload {
  staffId: string;
  name: string;
  role: string;
  activePatients: number;
}

export interface PatientJourneyAuditEvent {
  id: string;
  patientId: string;
  patientName: string;
  fromState: PatientState;
  toState: PatientState;
  transitionedAt: string;
  actor: string;
  reason: string;
}
