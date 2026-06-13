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
  LongWait='LongWait', HighRisk='HighRisk',
  PendingAdmission='PendingAdmission',
  EMSArrival='EMSArrival', SepsisAlert='SepsisAlert'
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
  id: string; text: string
  authorId: string; timestamp: string
}

export interface JourneyEvent {
  id: string; from?: PatientState; to: PatientState
  timestamp: string; staffId: string; note?: string
}

export interface Alert {
  id: string; severity: 'Info'|'Warning'|'Critical'
  title: string; message: string
  patientId?: string; createdAt: string
  dismissed: boolean
}

export interface CapacitySnapshot {
  score: number
  band: 'Green'|'Yellow'|'Orange'|'Red'
  totalPatients: number; occupiedRooms: number
  boardingCount: number; reassessmentDue: number
  updatedAt: string
}
