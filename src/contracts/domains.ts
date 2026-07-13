/**
 * CareDroid Canonical Domain Types
 *
 * These types define the single source of truth for all domain entities.
 * All other modules should import from here rather than defining their own versions.
 */

// ============================================================================
// Patient Domain
// ============================================================================

export type PatientId = string & { readonly __brand: 'PatientId' };
export type RoomId = string & { readonly __brand: 'RoomId' };
export type StaffId = string & { readonly __brand: 'StaffId' };

export enum PatientStatus {
  WAITING = 'waiting',
  IN_TRIAGE = 'in_triage',
  IN_TREATMENT = 'in_treatment',
  PENDING_DISPOSITION = 'pending_disposition',
  ADMITTED = 'admitted',
  DISCHARGED = 'discharged',
  LEFT_WITHOUT_BEING_SEEN = 'lwbs',
  TRANSFERRED = 'transferred',
}

export enum TriageAcuity {
  IMMEDIATE = 1,
  EMERGENT = 2,
  URGENT = 3,
  LESS_URGENT = 4,
  NON_URGENT = 5,
}

export interface Patient {
  id: PatientId;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  arrivalTime: string;
  status: PatientStatus;
  triageAcuity: TriageAcuity;
  chiefComplaint: string;
  roomId?: RoomId;
  assignedStaffId?: StaffId;
  // Clinical data
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  // Workflow state
  workflowStage: WorkflowStage;
  lastUpdated: string;
}

export enum WorkflowStage {
  ARRIVAL = 'arrival',
  TRIAGE = 'triage',
  ASSESSMENT = 'assessment',
  TREATMENT = 'treatment',
  DISPOSITION = 'disposition',
  HANDOFF = 'handoff',
  DEPARTURE = 'departure',
}

// ============================================================================
// Staff Domain
// ============================================================================

export enum StaffRole {
  RECEPTIONIST = 'receptionist',
  TRIAGE_NURSE = 'triage_nurse',
  CHARGE_NURSE = 'charge_nurse',
  BEDSIDE_NURSE = 'bedside_nurse',
  PHYSICIAN = 'physician',
  RESIDENT = 'resident',
  EMS_PROVIDER = 'ems_provider',
  TECHNICIAN = 'technician',
  SOCIAL_WORKER = 'social_worker',
  RESPIRATORY_THERAPIST = 'respiratory_therapist',
}

export interface Staff {
  id: StaffId;
  name: string;
  role: StaffRole;
  department: string;
  shift: string;
  isAvailable: boolean;
  currentPatientIds: PatientId[];
  maxPatients: number;
}

// ============================================================================
// Alert Domain
// ============================================================================

export type AlertId = string & { readonly __brand: 'AlertId' };

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum AlertCategory {
  CLINICAL = 'clinical',
  OPERATIONAL = 'operational',
  SAFETY = 'safety',
  COMPLIANCE = 'compliance',
  SYSTEM = 'system',
}

export interface Alert {
  id: AlertId;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  patientId?: PatientId;
  staffId?: StaffId;
  roomId?: RoomId;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: StaffId;
  resolvedBy?: StaffId;
  escalationRole?: StaffRole;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Room Domain
// ============================================================================

export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
  RESERVED = 'reserved',
}

export enum RoomType {
  EXAM_ROOM = 'exam_room',
  TRAUMA_BAY = 'trauma_bay',
  RESUSCITATION = 'resuscitation',
  OBSERVATION = 'observation',
  WAITING_AREA = 'waiting_area',
  ISOLATION = 'isolation',
  PROCEDURE_ROOM = 'procedure_room',
}

export interface Room {
  id: RoomId;
  name: string;
  type: RoomType;
  status: RoomStatus;
  zone: string;
  capacity: number;
  currentOccupancy: number;
  assignedPatientIds: PatientId[];
}

// ============================================================================
// EMS Domain
// ============================================================================

export type UnitId = string & { readonly __brand: 'UnitId' };

export enum UnitStatus {
  AVAILABLE = 'available',
  EN_ROUTE = 'en_route',
  ON_SCENE = 'on_scene',
  TRANSPORTING = 'transporting',
  AT_HOSPITAL = 'at_hospital',
  RETURNING = 'returning',
  OUT_OF_SERVICE = 'out_of_service',
}

export interface EMSUnit {
  id: UnitId;
  callSign: string;
  type: 'als' | 'bls' | 'critical_care';
  status: UnitStatus;
  currentLocation?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  etaMinutes?: number;
  assignedPatientId?: PatientId;
}

// ============================================================================
// Workflow Domain
// ============================================================================

export enum WorkflowAction {
  CREATE = 'create',
  UPDATE = 'update',
  ASSIGN = 'assign',
  ESCALATE = 'escalate',
  RESOLVE = 'resolve',
  DISMISS = 'dismiss',
}

export interface WorkflowEvent {
  id: string;
  action: WorkflowAction;
  entityType: 'patient' | 'alert' | 'room' | 'staff';
  entityId: string;
  actorId: StaffId;
  actorRole: StaffRole;
  timestamp: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AI Domain
// ============================================================================

export type AIRecommendationId = string & { readonly __brand: 'AIRecommendationId' };

export enum AIRecommendationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  OVERRIDDEN = 'overridden',
  EXPIRED = 'expired',
}

export interface AIRecommendation {
  id: AIRecommendationId;
  patientId?: PatientId;
  alertId?: AlertId;
  recommendation: string;
  confidence: number;
  status: AIRecommendationStatus;
  createdAt: string;
  expiresAt?: string;
  reviewedBy?: StaffId;
  reviewedAt?: string;
  overrideReason?: string;
  evidence?: string[];
  warnings?: string[];
}

// ============================================================================
// Capacity Domain
// ============================================================================

export interface CapacitySnapshot {
  timestamp: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  waitingPatients: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
  patientsInTreatment: number;
  patientsPendingDisposition: number;
  boardingPatients: number;
  occupancyPercent: number;
  zones: ZoneCapacity[];
}

export interface ZoneCapacity {
  zone: string;
  total: number;
  occupied: number;
  available: number;
  occupancyPercent: number;
}

// ============================================================================
// Navigation Domain
// ============================================================================

export type NavigationId = string & { readonly __brand: 'NavigationId' };

export enum NavigationGroup {
  COMMAND = 'Command',
  EMERGENCY = 'Emergency',
  PATIENTS = 'Patients',
  OPERATIONS = 'Operations',
  CLINICAL = 'Clinical',
  INTELLIGENCE = 'Intelligence',
  ANALYTICS = 'Analytics',
  ADMINISTRATION = 'Administration',
  HELP = 'Help',
}

export interface NavigationItem {
  id: NavigationId;
  label: string;
  path: string;
  icon: string;
  group: NavigationGroup;
  allowedRoles: StaffRole[];
  permissions?: string[];
  isPilotOnly?: boolean;
  children?: NavigationItem[];
}

// ============================================================================
// Screen Mode Domain
// ============================================================================

export enum ScreenMode {
  TRIAGE = 'triage',
  CHARGE_NURSE = 'chargeNurse',
  PHYSICIAN = 'physician',
  EMS = 'ems',
  COMMAND_CENTER = 'commandCenter',
  RECEPTION = 'reception',
  WALL = 'wall',
  KIOSK = 'kiosk',
}

export interface ScreenModeConfig {
  mode: ScreenMode;
  showSidebar: boolean;
  showHeader: boolean;
  showCopilot: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  allowedPHIAccess: boolean;
  features: string[];
}
