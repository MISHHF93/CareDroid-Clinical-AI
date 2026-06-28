export type HospitalRole =
  | 'super_admin'
  | 'hospital_admin'
  | 'ed_director'
  | 'charge_nurse'
  | 'triage_nurse'
  | 'registered_nurse'
  | 'emergency_physician'
  | 'attending_physician'
  | 'resident_physician'
  | 'specialist'
  | 'paramedic'
  | 'registration_clerk'
  | 'patient_flow_coordinator'
  | 'lab_technician'
  | 'radiology_technician'
  | 'pharmacist'
  | 'social_worker'
  | 'security_officer'
  | 'it_admin'
  | 'quality_safety_officer'
  | 'demo_observer';

export type ShiftStatus = 'on_shift' | 'off_shift' | 'on_call' | 'break' | 'handoff';
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable' | 'on_call';
export type EscalationLevel = 'none' | 'operational' | 'clinical' | 'critical';

export type CareDroidUserProfile = Readonly<{
  id: string;
  employeeId: string;
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: HospitalRole;
  title: string;
  department: string;
  hospitalSite: string;
  cityZone: string;
  shiftStatus: ShiftStatus;
  shiftStart: string | null;
  shiftEnd: string | null;
  licenseNumber: string | null;
  specialties: readonly string[];
  permissions: readonly string[];
  assignedPatients: readonly string[];
  currentLoad: number;
  availabilityStatus: AvailabilityStatus;
  escalationLevel: EscalationLevel;
  canReceiveCriticalAlerts: boolean;
  canUseAIChief: boolean;
  lastActiveAt: string;
}>;

export type AuditMetadata = {
  createdBy: string;
  updatedBy: string;
  acknowledgedBy?: string;
  reviewedBy?: string;
  escalatedBy?: string;
  timestamp: string;
  userRole: HospitalRole;
};
