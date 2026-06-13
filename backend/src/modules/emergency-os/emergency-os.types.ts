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
