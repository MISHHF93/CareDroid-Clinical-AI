import { create } from 'zustand';
import { setDepartmentContextStoreReader } from '../lib/ai/contextEngine';
import { setToolRegistryStoreReader } from '../lib/ai/toolRegistry';
import {
  deriveAlerts,
  isDerivedAlertId,
  normalizeAlert,
  registerAlertDispatcher,
  type AlertDispatchInput,
} from '../engine/alertEngine';
import {
  PatientState,
  Priority,
  type Alert,
  type BottleneckAlert,
  type CapacityRiskLevel,
  type CapacityScoreDeduction,
  type CapacitySnapshot,
  type EMSArrival,
  type EMSUnit,
  type JourneyEvent,
  type Note,
  type Patient,
  type PatientFlag,
  type PatientFlagSeverity,
  type PatientFlagType,
  type Queue,
  type QueueType,
  type Referral,
  type ReferralStatus,
  type Room,
  type Sex,
  type Shift,
  type Staff,
  type Vitals,
} from '../types/emergency';
import {
  fetchPatientManagementBundle,
  searchPatientsFromBackend,
} from '../src/services/patientManagementApi';
import {
  fetchOperationalStaffProfile,
  recordEmergencyActivity,
  syncEmergencyAuditEvent,
} from '../src/services/emergencyStaffingApi';
import { startEmergencyRealtime } from '../src/services/emergencyRealtimeService';
import {
  buildLocalEmergencyAnalytics,
  fetchEmergencyOperationalAnalytics,
} from '../src/services/emergencyAnalyticsApi';

type PatientPatch = Partial<Omit<Patient, 'id'>>;
type PatientFlagDetails = Partial<Pick<PatientFlag, 'reason' | 'detectedAt' | 'severity'>>;
type PatientFlagInput = PatientFlag | PatientFlagType;
type PatientBackendDetailStatus = 'idle' | 'loading' | 'ready' | 'error';
type PatientBackendDetailsEntry = {
  patientId: string;
  status: PatientBackendDetailStatus;
  loadedAt?: string;
  error?: string;
  partial?: boolean;
  data?: any;
};
type PatientBackendSearchState = {
  query: string;
  status: PatientBackendDetailStatus;
  results: any[];
  message?: string;
  backendSearchAvailable?: boolean;
};
type RealtimeConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
type RealtimeConnectionState = {
  status: RealtimeConnectionStatus;
  mode: 'none' | 'sse' | 'websocket' | 'polling';
  message: string;
  updatedAt?: string;
};
type RealtimeEventEnvelope = {
  type: string;
  payload?: any;
  receivedAt?: string;
};
type EmergencyAnalyticsState = {
  status: PatientBackendDetailStatus;
  source: 'backend' | 'client-fallback';
  loadedAt?: string;
  message?: string;
  data?: any;
};
type EmergencySettingsState = {
  departmentCapacityTarget: number;
  thresholds: {
    waitWarningMinutes: number;
    waitCriticalMinutes: number;
    capacityWarningPercent: number;
    emsOffloadTargetMinutes: number;
    reassessmentIntervals: Record<string, number>;
  };
  alertRules: Record<string, { enabled: boolean; severity: PatientFlagSeverity | Alert['severity'] }>;
  featureFlags: Record<string, boolean>;
};

const DEFAULT_EMERGENCY_SETTINGS: EmergencySettingsState = {
  departmentCapacityTarget: 30,
  thresholds: {
    waitWarningMinutes: 45,
    waitCriticalMinutes: 60,
    capacityWarningPercent: 80,
    emsOffloadTargetMinutes: 15,
    reassessmentIntervals: {
      P1: 15,
      P2: 30,
      P3: 60,
      P4: 120,
      P5: 180,
    },
  },
  alertRules: {
    Reassessment: { enabled: true, severity: 'Warning' },
    Capacity: { enabled: true, severity: 'Warning' },
    EMS: { enabled: true, severity: 'Warning' },
    Referral: { enabled: true, severity: 'Warning' },
    Queue: { enabled: true, severity: 'Warning' },
    System: { enabled: true, severity: 'Info' },
  },
  featureFlags: {
    simulationMode: false,
    emsModule: true,
    referralModule: true,
    analytics: true,
  },
};
type ShiftStartInput = {
  startTime: string;
  endTime?: string;
  staffIds: string[];
  chargeStaffId?: string;
  name?: string;
};
type MovePatientStateOptions = {
  flags?: PatientFlag[];
  timelineEvent?: JourneyEvent;
};
type ReferralCreateInput = Pick<
  Referral,
  'patientId' | 'requestingStaffId' | 'targetDepartment' | 'urgency' | 'reason' | 'clinicalSummary'
> & {
  status?: Extract<ReferralStatus, 'Draft' | 'Sent' | 'TransferRequested'>;
  workflow?: Referral['workflow'];
};

interface EmergencyStoreState {
  patients: Patient[];
  staff: Staff[];
  rooms: Room[];
  queues: Queue[];
  capacity: CapacitySnapshot;
  activeShift: Shift;
  emsUnits: EMSUnit[];
  emsArrivals: EMSArrival[];
  referrals: Referral[];
  alerts: Alert[];
  selectedPatientId: string | null;
  copilotOpen: boolean;
  activeQueueFilter: QueueType | null;
  whiteboardSearchQuery: string;
  bottleneckAlert: BottleneckAlert | null;
  patientBackendDetails: Record<string, PatientBackendDetailsEntry>;
  patientBackendSearch: PatientBackendSearchState;
  realtimeConnection: RealtimeConnectionState;
  emergencyAnalytics: EmergencyAnalyticsState;
  emergencySettings: EmergencySettingsState;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, patch: PatientPatch) => void;
  dischargePatient: (id: string, options?: MovePatientStateOptions) => void;
  movePatientToState: (id: string, state: PatientState, options?: MovePatientStateOptions) => void;
  assignStaff: (patientId: string, staffId: string) => void;
  assignRoom: (patientId: string, roomId: string) => void;
  addFlag: (patientId: string, flag: PatientFlagInput, details?: PatientFlagDetails) => void;
  removeFlag: (patientId: string, flag: PatientFlagType) => void;
  addVitals: (patientId: string, vitals: Vitals) => void;
  addNote: (patientId: string, note: Note) => void;
  updateCapacity: () => void;
  selectPatient: (id: string | null) => void;
  toggleCopilot: () => void;
  setCopilotOpen: (open: boolean) => void;
  setQueueFilter: (type: QueueType | null) => void;
  setWhiteboardSearchQuery: (query: string) => void;
  loadPatientBackendDetails: (
    patientId: string,
    options?: { force?: boolean }
  ) => Promise<PatientBackendDetailsEntry | null>;
  searchBackendPatients: (query: string) => Promise<PatientBackendSearchState>;
  clearBackendPatientSearch: () => void;
  loadBackendStaffProfile: () => Promise<void>;
  startShift: (input: ShiftStartInput) => void;
  endShift: (endedAt?: string) => void;
  setBottleneckAlert: (alert: BottleneckAlert | null) => void;
  dispatchAlert: (alert: AlertDispatchInput) => Alert;
  updateAlerts: () => void;
  dismissAlert: (alertId: string) => void;
  createReferral: (input: ReferralCreateInput) => void;
  updateReferralStatus: (referralId: string, status: ReferralStatus, responseNote?: string) => void;
  addEMSArrival: (arrival: EMSArrival) => void;
  updateEMSArrival: (id: string, patch: Partial<EMSArrival>) => void;
  updateEMSUnit: (id: string, patch: Partial<EMSUnit>) => void;
  prepareEMSBay: (arrivalId: string) => void;
  convertEMSArrivalToPatient: (arrivalId: string) => void;
  setRealtimeConnection: (status: Partial<RealtimeConnectionState>) => void;
  handleRealtimeEvent: (event: RealtimeEventEnvelope) => void;
  pollRealtimeFallback: () => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
  loadEmergencyAnalytics: (options?: { force?: boolean }) => Promise<EmergencyAnalyticsState>;
  saveEmergencySettings: (patch: Partial<EmergencySettingsState>) => void;
  upsertRoom: (room: Partial<Room> & { id?: string }) => void;
  deactivateRoom: (roomId: string) => void;
  upsertStaffMember: (staff: Partial<Staff> & { id?: string }) => void;
}

const MOCK_NOW = '2026-06-10T18:15:00-04:00';
const ACTIVE_SHIFT_ID = 'shift-evening-2026-06-10';

const QUEUE_TYPES: QueueType[] = [
  'Arrival',
  'Registration',
  'Triage',
  'Waiting',
  'Provider',
  'Assessment',
  'Orders',
  'Results',
  'Disposition',
  'Admission',
  'Discharge',
  'Reassessment',
  'Referral',
  'EMS',
  'HighRisk',
  'Boarding',
];

const QUEUE_TARGET_WAIT_MINUTES: Record<QueueType, number> = {
  Arrival: 5,
  Registration: 10,
  Triage: 15,
  Waiting: 45,
  Provider: 30,
  Assessment: 30,
  Orders: 45,
  Results: 60,
  Disposition: 30,
  Admission: 45,
  Discharge: 20,
  Reassessment: 30,
  Referral: 60,
  EMS: 5,
  HighRisk: 10,
  Boarding: 45,
};

const QUEUE_LABELS: Record<QueueType, string> = {
  Arrival: 'Arrival',
  Registration: 'Registration',
  Triage: 'Triage',
  Waiting: 'Waiting Room',
  Provider: 'Provider',
  Assessment: 'Assessment',
  Orders: 'Orders',
  Results: 'Results',
  Disposition: 'Disposition',
  Admission: 'Admission',
  Discharge: 'Discharge',
  Reassessment: 'Reassessment',
  Referral: 'Referral',
  EMS: 'EMS Arrivals',
  HighRisk: 'High Risk',
  Boarding: 'Boarding',
};

const isOpenReferral = (referral?: Referral): boolean =>
  Boolean(referral && !['Completed', 'Declined'].includes(referral.status));

const isActivePatient = (patient: Patient): boolean =>
  patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased;

const minutesSince = (timestamp: string | null, now = new Date()): number => {
  if (!timestamp) return 0;
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.round((now.getTime() - then) / 60000));
};

const makeEvent = (
  patientId: string,
  type: JourneyEvent['type'],
  summary: string,
  timestamp: string,
  extra: Partial<JourneyEvent> = {}
): JourneyEvent => ({
  id: `evt-${patientId}-${type}-${timestamp}`,
  patientId,
  type,
  timestamp,
  summary,
  ...extra,
});

const actionEvent = (
  patientId: string,
  type: JourneyEvent['type'],
  summary: string,
  extra: Partial<JourneyEvent> = {}
): JourneyEvent =>
  makeEvent(patientId, type, summary, new Date().toISOString(), {
    id: `evt-${patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...extra,
  });

const DEFAULT_FLAG_SEVERITY: Record<PatientFlagType, PatientFlagSeverity> = {
  ReassessmentDue: 'Warning',
  DeteriorationRisk: 'Critical',
  LongWait: 'Warning',
  HighRisk: 'Critical',
  PendingAdmission: 'Info',
  EMSArrival: 'Info',
  Isolation: 'Warning',
  ScoreReassessmentRecommended: 'Warning',
};

const DEFAULT_FLAG_REASON: Record<PatientFlagType, string> = {
  ReassessmentDue: 'Requires reassessment',
  DeteriorationRisk: 'Clinical deterioration risk',
  LongWait: 'Extended wait',
  HighRisk: 'High priority risk',
  PendingAdmission: 'Admission pending',
  EMSArrival: 'EMS arrival',
  Isolation: 'Isolation precautions',
  ScoreReassessmentRecommended: 'Score reassessment recommended',
};

export const getPatientFlagType = (flag: PatientFlagInput): PatientFlagType =>
  typeof flag === 'string' ? flag : flag.type;

export const createPatientFlag = (
  flag: PatientFlagInput,
  details: PatientFlagDetails = {}
): PatientFlag => {
  const type = getPatientFlagType(flag);

  return {
    type,
    reason: details.reason ?? (typeof flag === 'string' ? DEFAULT_FLAG_REASON[type] : flag.reason),
    detectedAt:
      details.detectedAt ?? (typeof flag === 'string' ? new Date().toISOString() : flag.detectedAt),
    severity:
      details.severity ?? (typeof flag === 'string' ? DEFAULT_FLAG_SEVERITY[type] : flag.severity),
  };
};

export const hasPatientFlag = (
  patient: Pick<Patient, 'flags'>,
  flagType: PatientFlagType
): boolean => patient.flags.some((flag) => getPatientFlagType(flag) === flagType);

const seedFlag = (type: PatientFlagType, reason?: string): PatientFlag =>
  createPatientFlag(type, {
    reason,
    detectedAt: MOCK_NOW,
  });

const patientMatchesQueue = (patient: Patient, type: QueueType): boolean => {
  if (type === 'Reassessment') {
    return (
      hasPatientFlag(patient, 'ReassessmentDue') ||
      hasPatientFlag(patient, 'ScoreReassessmentRecommended')
    );
  }
  if (type === 'Provider') {
    return patient.state === PatientState.Assessment || patient.state === PatientState.Orders;
  }
  if (type === 'EMS')
    return Boolean(patient.emsArrival && patient.emsArrival.status !== 'Complete');
  if (type === 'HighRisk') {
    return (
      hasPatientFlag(patient, 'HighRisk') ||
      hasPatientFlag(patient, 'DeteriorationRisk') ||
      patient.priority === Priority.P1 ||
      patient.priority === Priority.P2
    );
  }
  if (type === 'Boarding') {
    return patient.state === PatientState.Admission || hasPatientFlag(patient, 'PendingAdmission');
  }
  return patient.state === type;
};

const criticalLabSummary = (data: any): string => {
  const criticalLabs = Array.isArray(data?.labs)
    ? data.labs.filter((lab: any) => lab?.isCritical)
    : [];
  return criticalLabs
    .slice(0, 3)
    .map((lab: any) =>
      [lab.name, lab.value, lab.unit]
        .filter((item) => item !== undefined && item !== null && item !== '')
        .join(' ')
    )
    .filter(Boolean)
    .join(', ');
};

const staffRoleFromBackend = (role?: string): Staff['role'] => {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('admin')) return 'Administrator';
  if (normalized.includes('nurse')) return 'Nurse';
  if (normalized.includes('tech')) return 'Technician';
  if (normalized.includes('paramedic')) return 'Paramedic';
  if (normalized.includes('resident')) return 'Resident';
  if (normalized.includes('consult')) return 'Consultant';
  if (normalized.includes('physician') || normalized.includes('doctor') || normalized.includes('md')) {
    return 'Attending';
  }
  return 'Attending';
};

const staffFromOperationalProfile = (profile: any, activeShift: Shift): Staff | null => {
  const account = profile?.account || {};
  if (!profile?.userId && !account.userId) return null;
  const displayName = account.displayName || account.email || 'Backend Staff';
  const [firstName = displayName, ...rest] = String(displayName).split(/\s+/);
  const lastName = rest.join(' ');
  return {
    id: `backend-${profile.userId || account.userId}`,
    firstName,
    lastName,
    name: displayName,
    displayName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    role: staffRoleFromBackend(account.role || account.saasRole || account.profession),
    roleLabel: account.saasRole || account.role,
    status: 'OnShift',
    shiftId: activeShift.id,
    assignedPatientIds: [],
    currentRoomId: undefined,
  };
};

const upsertStaff = (staff: Staff[], nextStaff: Staff | null): Staff[] => {
  if (!nextStaff) return staff;
  if (staff.some((member) => member.id === nextStaff.id)) {
    return staff.map((member) => (member.id === nextStaff.id ? { ...member, ...nextStaff } : member));
  }
  return [...staff, nextStaff];
};

const syncJourneyAuditEvent = (event: JourneyEvent): void => {
  void syncEmergencyAuditEvent({
    action: 'clinical_data_access',
    resourceType: 'journey-event',
    resourceId: event.id,
    timestamp: event.timestamp,
  });
};

const syncJourneyAuditEvents = (events: JourneyEvent[] = []): void => {
  events.forEach(syncJourneyAuditEvent);
};

const newTimelineEvents = (before: Patient | undefined, after: Patient | undefined): JourneyEvent[] => {
  if (!before || !after) return [];
  const beforeIds = new Set(before.timeline.map((event) => event.id));
  return after.timeline.filter((event) => !beforeIds.has(event.id));
};

const computeQueues = (
  patients: Patient[],
  referrals: Referral[] = [],
  settings: EmergencySettingsState = DEFAULT_EMERGENCY_SETTINGS
): Queue[] => {
  const now = new Date();
  const targetWait = settings.thresholds.waitWarningMinutes || 45;

  return QUEUE_TYPES.map((type) => {
    if (type === 'Referral') {
      const activeReferrals = referrals.filter(isOpenReferral);
      const patientById = new Map(patients.map((patient) => [patient.id, patient]));
      const waits = activeReferrals.map((referral) => minutesSince(referral.requestedAt, now));
      const totalWait = waits.reduce((sum, wait) => sum + wait, 0);

      return {
        id: `queue-${type.toLowerCase()}`,
        type,
        name: QUEUE_LABELS[type],
        patientIds: activeReferrals.map((referral) => referral.patientId),
        targetWaitMinutes: type === 'Waiting' ? targetWait : QUEUE_TARGET_WAIT_MINUTES[type],
        averageWaitMinutes: activeReferrals.length
          ? Math.round(totalWait / activeReferrals.length)
          : 0,
        longestWaitMinutes: waits.length ? Math.max(...waits) : 0,
        criticalCount: activeReferrals.filter(
          (referral) => patientById.get(referral.patientId)?.priority === Priority.P1
        ).length,
        updatedAt: now.toISOString(),
      };
    }

    const queuedPatients = patients.filter((patient) => patientMatchesQueue(patient, type));
    const waits = queuedPatients.map((patient) => minutesSince(patient.arrivalTime, now));
    const totalWait = waits.reduce((sum, wait) => sum + wait, 0);

    return {
      id: `queue-${type.toLowerCase()}`,
      type,
      name: QUEUE_LABELS[type],
      patientIds: queuedPatients.map((patient) => patient.id),
      targetWaitMinutes: type === 'Waiting' ? targetWait : QUEUE_TARGET_WAIT_MINUTES[type],
      averageWaitMinutes: queuedPatients.length ? Math.round(totalWait / queuedPatients.length) : 0,
      longestWaitMinutes: waits.length ? Math.max(...waits) : 0,
      criticalCount: queuedPatients.filter((patient) => patient.priority === Priority.P1).length,
      updatedAt: now.toISOString(),
    };
  });
};

const capacityBandForScore = (
  score: number,
  settings: EmergencySettingsState = DEFAULT_EMERGENCY_SETTINGS
): { riskLevel: CapacityRiskLevel; label: CapacitySnapshot['label'] } => {
  const warningScore = Math.max(1, Math.min(99, settings.thresholds.capacityWarningPercent || 80));
  if (score >= warningScore) return { riskLevel: 'Green', label: 'Capacity Normal' };
  if (score >= 60) return { riskLevel: 'Yellow', label: 'Capacity Moderate' };
  if (score >= 40) return { riskLevel: 'Orange', label: 'Capacity Strained' };
  return { riskLevel: 'Red', label: 'Capacity Critical' };
};

const hasDischargeEventInPast60Minutes = (patient: Patient, now: Date): boolean =>
  patient.timeline.some((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    if (!Number.isFinite(eventTime)) return false;
    if (now.getTime() - eventTime > 60 * 60_000) return false;
    return (
      event.toState === PatientState.Discharge ||
      event.to === PatientState.Discharge ||
      event.summary.toLowerCase().includes('discharged')
    );
  });

const computeCapacity = (
  patients: Patient[],
  rooms: Room[],
  emsArrivals: EMSArrival[] = [],
  settings: EmergencySettingsState = DEFAULT_EMERGENCY_SETTINGS
): CapacitySnapshot => {
  const now = new Date();
  const activePatients = patients.filter(isActivePatient);
  const totalActivePatients = activePatients.length;
  const maxCapacity = settings.departmentCapacityTarget || rooms.length;
  const occupiedRoomCount = rooms.filter(
    (room) => room.status === 'Occupied' || room.currentPatientId !== null
  ).length;
  const occupancyPercent = maxCapacity ? Math.round((occupiedRoomCount / maxCapacity) * 100) : 0;
  const occupancyThreshold = Math.floor(
    maxCapacity * ((settings.thresholds.capacityWarningPercent || 80) / 100)
  );
  const occupancyOveragePatients = Math.max(0, occupiedRoomCount - occupancyThreshold);
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
  const boardingPatients = patients.filter((patient) => patient.state === PatientState.Admission);
  const reassessmentQueue = patients.filter((patient) =>
    hasPatientFlag(patient, 'ReassessmentDue')
  );
  const incomingEMS = emsArrivals.filter((arrival) => arrival.status === 'Inbound');
  const incomingEMSCriticalCount = incomingEMS.filter(
    (arrival) => arrival.severity === 'Critical'
  ).length;
  const dischargeReadyCount = patients.filter(
    (patient) => patient.state === PatientState.Disposition
  ).length;
  const dischargesPast60Minutes = patients.filter((patient) =>
    hasDischargeEventInPast60Minutes(patient, now)
  ).length;
  const deductions: CapacityScoreDeduction[] = [];

  if (occupancyOveragePatients > 0) {
    deductions.push({
      id: 'room-occupancy-over-80',
      label: `${occupancyOveragePatients} patient${occupancyOveragePatients === 1 ? '' : 's'} over ${settings.thresholds.capacityWarningPercent}% room occupancy`,
      value: occupancyOveragePatients * 5,
    });
  }

  if (boardingPatients.length > 0) {
    deductions.push({
      id: 'boarding-patients',
      label: `${boardingPatients.length} boarding patient${boardingPatients.length === 1 ? '' : 's'}`,
      value: boardingPatients.length * 8,
    });
  }

  if (reassessmentQueue.length > 3) {
    deductions.push({
      id: 'reassessment-queue',
      label: 'Reassessment queue over 3 patients',
      value: 10,
    });
  }

  if (incomingEMSCriticalCount > 0) {
    deductions.push({
      id: 'incoming-critical-ems',
      label: `${incomingEMSCriticalCount} incoming critical EMS case${incomingEMSCriticalCount === 1 ? '' : 's'}`,
      value: incomingEMSCriticalCount * 5,
    });
  }

  if (dischargesPast60Minutes === 0) {
    deductions.push({
      id: 'no-recent-discharges',
      label: 'No discharges in past 60 minutes',
      value: 10,
    });
  }

  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.value, 0);
  const score = Math.max(0, Math.min(100, 100 - totalDeductions));
  const band = capacityBandForScore(score, settings);
  const longestWaitMinutes = Math.max(
    0,
    ...waitingPatients.map((patient) => minutesSince(patient.arrivalTime, now))
  );
  const averageWaitMinutes = waitingPatients.length
    ? Math.round(
        waitingPatients.reduce((sum, patient) => sum + minutesSince(patient.arrivalTime, now), 0) /
          waitingPatients.length
      )
    : 0;

  return {
    id: 'capacity-current',
    generatedAt: now.toISOString(),
    totalActivePatients,
    currentOccupancy: occupiedRoomCount,
    maxCapacity,
    occupancyPercent,
    occupancyOveragePatients,
    waitingCount: waitingPatients.length,
    triageCount: patients.filter((patient) => patient.state === PatientState.Triage).length,
    assessmentCount: patients.filter((patient) => patient.state === PatientState.Assessment).length,
    boardingCount: boardingPatients.length,
    admissionPendingCount: patients.filter((patient) => hasPatientFlag(patient, 'PendingAdmission'))
      .length,
    dischargePendingCount: dischargeReadyCount,
    emsInboundCount: incomingEMS.length,
    isolationRequiredCount: patients.filter((patient) => hasPatientFlag(patient, 'Isolation'))
      .length,
    staffedRoomCount: occupiedRoomCount,
    availableRoomCount: rooms.filter((room) => room.status === 'Available').length,
    reassessmentDueCount: reassessmentQueue.length,
    incomingEMSCount: incomingEMS.length,
    incomingEMSCriticalCount,
    dischargeReadyCount,
    dischargesPast60Minutes,
    hasRecentDischarge: dischargesPast60Minutes > 0,
    longestWaitMinutes,
    averageWaitMinutes,
    riskLevel: band.riskLevel,
    label: band.label,
    deductions,
    score,
  };
};

const deriveOperationalState = (
  patients: Patient[],
  rooms: Room[],
  referrals: Referral[] = [],
  emsArrivals: EMSArrival[] = [],
  settings: EmergencySettingsState = DEFAULT_EMERGENCY_SETTINGS
): Pick<EmergencyStoreState, 'queues' | 'capacity'> => ({
  queues: computeQueues(patients, referrals, settings),
  capacity: computeCapacity(patients, rooms, emsArrivals, settings),
});

let operationalRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let emergencyRealtimeUnsubscribe: (() => void) | null = null;

const updatePatients = (
  patients: Patient[],
  patientId: string,
  updater: (patient: Patient) => Patient
): Patient[] =>
  patients.map((patient) => {
    if (patient.id !== patientId) return patient;
    const updated = updater(patient);
    syncJourneyAuditEvents(newTimelineEvents(patient, updated));
    return updated;
  });

const syncReferralsFromPatients = (patients: Patient[], referrals: Referral[]): Referral[] => {
  const byId = new Map(referrals.map((referral) => [referral.id, referral]));
  patients.forEach((patient) => {
    if (patient.referral) {
      byId.set(patient.referral.id, patient.referral);
    }
  });
  return [...byId.values()];
};

const realtimeEventType = (type?: string): string =>
  String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.-]+/g, '_');

const realtimePatientId = (payload: any): string =>
  payload?.patientId || payload?.patient_id || payload?.id || payload?.patient?.id || '';

const realtimeVitals = (payload: any): Vitals | null => {
  const source = payload?.vitals || payload?.observations || payload;
  if (!source || typeof source !== 'object') return null;
  return {
    hr: source.hr ?? source.heartRate ?? source.heart_rate ?? null,
    bpSystolic: source.bpSystolic ?? source.systolic ?? source.bp_systolic ?? null,
    bpDiastolic: source.bpDiastolic ?? source.diastolic ?? source.bp_diastolic ?? null,
    spo2: source.spo2 ?? source.oxygenSaturation ?? source.oxygen_saturation ?? null,
    temp: source.temp ?? source.temperature ?? null,
    rr: source.rr ?? source.respiratoryRate ?? source.respiratory_rate ?? null,
    gcs: source.gcs ?? null,
    pain: source.pain ?? source.painScore ?? source.pain_score ?? null,
    recordedAt: source.recordedAt || source.effectiveDateTime || source.timestamp || new Date().toISOString(),
  };
};

const realtimePatientPatch = (payload: any): PatientPatch => {
  const source = payload?.patient || payload?.patch || payload?.data || payload || {};
  const blockedKeys = new Set(['id', 'patientId', 'patient_id', 'vitals']);
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => !blockedKeys.has(key) && value !== undefined)
  ) as PatientPatch;
};

const mockStaff: Staff[] = [
  {
    id: 'staff-priya-nair',
    firstName: 'Priya',
    lastName: 'Nair',
    role: 'Attending',
    status: 'OnShift',
    shiftId: ACTIVE_SHIFT_ID,
    assignedPatientIds: ['pt-001', 'pt-005', 'pt-008', 'pt-011'],
    currentRoomId: 'room-assessment-1',
  },
  {
    id: 'staff-michael-chen',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'ChargeNurse',
    status: 'OnShift',
    shiftId: ACTIVE_SHIFT_ID,
    assignedPatientIds: ['pt-002', 'pt-004', 'pt-007', 'pt-010'],
    currentRoomId: 'room-triage-1',
  },
  {
    id: 'staff-aisha-thompson',
    firstName: 'Aisha',
    lastName: 'Thompson',
    role: 'TriageNurse',
    status: 'OnShift',
    shiftId: ACTIVE_SHIFT_ID,
    assignedPatientIds: ['pt-003', 'pt-006', 'pt-009', 'pt-012'],
    currentRoomId: 'room-triage-2',
  },
];

const mockRooms: Room[] = [
  {
    id: 'room-triage-1',
    name: 'Triage 1',
    type: 'Triage',
    status: 'Occupied',
    currentPatientId: 'pt-002',
    isIsolationCapable: false,
  },
  {
    id: 'room-triage-2',
    name: 'Triage 2',
    type: 'Triage',
    status: 'Occupied',
    currentPatientId: 'pt-003',
    isIsolationCapable: false,
  },
  {
    id: 'room-fast-1',
    name: 'Fast Track 1',
    type: 'Assessment',
    status: 'Occupied',
    currentPatientId: 'pt-004',
    isIsolationCapable: false,
  },
  {
    id: 'room-fast-2',
    name: 'Fast Track 2',
    type: 'Assessment',
    status: 'Occupied',
    currentPatientId: 'pt-005',
    isIsolationCapable: false,
  },
  {
    id: 'room-fast-3',
    name: 'Fast Track 3',
    type: 'Assessment',
    status: 'Occupied',
    currentPatientId: 'pt-006',
    isIsolationCapable: false,
  },
  {
    id: 'room-fast-4',
    name: 'Fast Track 4',
    type: 'Assessment',
    status: 'Available',
    currentPatientId: null,
    isIsolationCapable: false,
  },
  {
    id: 'room-fast-5',
    name: 'Fast Track 5',
    type: 'Assessment',
    status: 'Available',
    currentPatientId: null,
    isIsolationCapable: false,
  },
  {
    id: 'room-fast-6',
    name: 'Fast Track 6',
    type: 'Assessment',
    status: 'Cleaning',
    currentPatientId: null,
    isIsolationCapable: false,
  },
  {
    id: 'room-assessment-1',
    name: 'Assessment 1',
    type: 'Assessment',
    status: 'Occupied',
    currentPatientId: 'pt-007',
    isIsolationCapable: false,
  },
  {
    id: 'room-assessment-2',
    name: 'Assessment 2',
    type: 'Assessment',
    status: 'Occupied',
    currentPatientId: 'pt-008',
    isIsolationCapable: false,
  },
  {
    id: 'room-assessment-3',
    name: 'Assessment 3',
    type: 'Assessment',
    status: 'Occupied',
    currentPatientId: 'pt-009',
    isIsolationCapable: false,
  },
  {
    id: 'room-assessment-4',
    name: 'Assessment 4',
    type: 'Assessment',
    status: 'Reserved',
    currentPatientId: null,
    isIsolationCapable: false,
  },
  {
    id: 'room-observation-1',
    name: 'Observation 1',
    type: 'Observation',
    status: 'Occupied',
    currentPatientId: 'pt-010',
    isIsolationCapable: false,
  },
  {
    id: 'room-observation-2',
    name: 'Observation 2',
    type: 'Observation',
    status: 'Occupied',
    currentPatientId: 'pt-011',
    isIsolationCapable: false,
  },
  {
    id: 'room-isolation-1',
    name: 'Isolation 1',
    type: 'Isolation',
    status: 'Occupied',
    currentPatientId: 'pt-012',
    isIsolationCapable: true,
  },
];

const referralPt008: Referral = {
  id: 'ref-pt-008',
  patientId: 'pt-008',
  requestingStaffId: 'staff-priya-nair',
  targetDepartment: 'Surgery',
  urgency: 'Urgent',
  reason: 'Distal radius fracture review after fall near Queen Station.',
  clinicalSummary:
    '40F with wrist deformity after fall. Vitals stable, pain 6/10, X-ray reviewed and splinted. Orthopedic review requested.',
  status: 'Sent',
  requestedAt: '2026-06-10T16:45:00-04:00',
};

const referralPt011: Referral = {
  id: 'ref-pt-011',
  patientId: 'pt-011',
  requestingStaffId: 'staff-priya-nair',
  targetDepartment: 'Internal Medicine',
  urgency: 'Urgent',
  reason: 'Admission request for persistent COPD exacerbation requiring oxygen.',
  clinicalSummary:
    '66M with COPD exacerbation, SpO2 91%, RR 26, persistent oxygen requirement after EMS nebulizer. Admission requested for ongoing respiratory care.',
  status: 'Accepted',
  requestedAt: '2026-06-10T15:25:00-04:00',
  respondedAt: '2026-06-10T17:05:00-04:00',
  responseNote: 'Accepted to General Internal Medicine when monitored bed is available.',
};

const note = (
  id: string,
  patientId: string,
  authorStaffId: string,
  body: string,
  createdAt: string,
  type: Note['type'] = 'Clinical'
): Note => ({
  id,
  patientId,
  authorStaffId,
  type,
  body,
  createdAt,
});

const vitals = (
  recordedAt: string,
  hr: number | null,
  bpSystolic: number | null,
  bpDiastolic: number | null,
  spo2: number | null,
  temp: number | null,
  rr: number | null,
  gcs: number | null,
  pain: number | null
): Vitals => ({
  hr,
  bpSystolic,
  bpDiastolic,
  spo2,
  temp,
  rr,
  gcs,
  pain,
  recordedAt,
});

const minutesFromNow = (minutes: number): string =>
  new Date(Date.now() + minutes * 60_000).toISOString();

const dobFromAge = (age: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return date.toISOString().slice(0, 10);
};

const priorityForEMSSeverity = (severity: EMSArrival['severity']): Priority => {
  if (severity === 'Critical') return Priority.P1;
  if (severity === 'High') return Priority.P2;
  if (severity === 'Moderate') return Priority.P3;
  return Priority.P4;
};

const emsArrival = (arrival: {
  id: string;
  unitId: string;
  unitName: string;
  crewNames: string[];
  patientAge: number;
  patientSex: Sex;
  chiefComplaint: string;
  mechanismOfInjury?: string;
  vitals: Vitals;
  etaMinutes: number;
  severity: EMSArrival['severity'];
  dispatchMinutesAgo: number;
  notes: string;
  status?: EMSArrival['status'];
  preparedRoomId?: string;
}): EMSArrival => {
  const estimatedArrivalTime = minutesFromNow(arrival.etaMinutes);
  return {
    id: arrival.id,
    unitId: arrival.unitId,
    unitName: arrival.unitName,
    crewNames: arrival.crewNames,
    patientAge: arrival.patientAge,
    patientSex: arrival.patientSex,
    chiefComplaint: arrival.chiefComplaint,
    mechanismOfInjury: arrival.mechanismOfInjury,
    vitals: arrival.vitals,
    eta: arrival.etaMinutes,
    severity: arrival.severity,
    dispatchTime: new Date(Date.now() - arrival.dispatchMinutesAgo * 60_000).toISOString(),
    estimatedArrivalTime,
    notes: arrival.notes,
    status: arrival.status || 'Inbound',
    preparedRoomId: arrival.preparedRoomId,
    prearrivalComplaint: arrival.chiefComplaint,
    priority: priorityForEMSSeverity(arrival.severity),
    handoffSummary: `${arrival.unitName} inbound: ${arrival.chiefComplaint}. ${arrival.notes}`,
  };
};

const mockPatients: Patient[] = [
  {
    id: 'pt-001',
    mrn: 'MRN-884201',
    firstName: 'Sofia',
    lastName: 'Martinez',
    dob: '1988-03-14',
    age: 38,
    sex: 'Female',
    arrivalTime: '2026-06-10T18:08:00-04:00',
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: 'New chest tightness after climbing stairs at Union Station',
    complaintCategory: 'Chest Pain',
    state: PatientState.Arrival,
    priority: Priority.P2,
    vitals: vitals('2026-06-10T18:09:00-04:00', 104, 148, 88, 97, 36.8, 20, 15, 5),
    assignedStaffId: 'staff-priya-nair',
    roomId: null,
    flags: [seedFlag('HighRisk', 'High priority not yet assessed')],
    timeline: [
      makeEvent(
        'pt-001',
        'Arrival',
        'Walk-in arrival from downtown Toronto office district.',
        '2026-06-10T18:08:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-001-1',
        'pt-001',
        'staff-priya-nair',
        'ECG requested immediately due to exertional chest symptoms.',
        '2026-06-10T18:10:00-04:00'
      ),
    ],
  },
  {
    id: 'pt-002',
    mrn: 'MRN-884202',
    firstName: 'Ethan',
    lastName: 'Nguyen',
    dob: '2017-09-21',
    age: 8,
    sex: 'Male',
    arrivalTime: '2026-06-10T17:58:00-04:00',
    triageTime: '2026-06-10T18:04:00-04:00',
    lastAssessedTime: '2026-06-10T18:04:00-04:00',
    chiefComplaint: 'Fever and barking cough after school in North York',
    complaintCategory: 'Respiratory',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T18:04:00-04:00', 118, 102, 66, 98, 38.6, 24, 15, 3),
    assignedStaffId: 'staff-michael-chen',
    roomId: 'room-triage-1',
    flags: [],
    timeline: [
      makeEvent(
        'pt-002',
        'Triage',
        'Triage underway with parent present.',
        '2026-06-10T18:04:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-002-1',
        'pt-002',
        'staff-michael-chen',
        'No stridor at rest; oral intake reduced today.',
        '2026-06-10T18:06:00-04:00',
        'Nursing'
      ),
    ],
  },
  {
    id: 'pt-003',
    mrn: 'MRN-884203',
    firstName: 'Marina',
    lastName: 'Kowalski',
    dob: '1953-11-02',
    age: 72,
    sex: 'Female',
    arrivalTime: '2026-06-10T17:45:00-04:00',
    triageTime: '2026-06-10T17:53:00-04:00',
    lastAssessedTime: '2026-06-10T17:53:00-04:00',
    chiefComplaint: 'Dizziness while shopping near Dufferin Mall',
    complaintCategory: 'Neurologic',
    state: PatientState.Registration,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T17:53:00-04:00', 92, 164, 92, 96, 36.7, 18, 15, 2),
    assignedStaffId: 'staff-aisha-thompson',
    roomId: 'room-triage-2',
    flags: [seedFlag('ReassessmentDue', 'Extended wait')],
    timeline: [
      makeEvent(
        'pt-003',
        'Registration',
        'Registration completing after triage vitals.',
        '2026-06-10T18:00:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-003-1',
        'pt-003',
        'staff-aisha-thompson',
        'Reports missed lunch and new lightheadedness; reassess if wait exceeds 30 minutes.',
        '2026-06-10T18:02:00-04:00'
      ),
    ],
  },
  {
    id: 'pt-004',
    mrn: 'MRN-884204',
    firstName: 'Jayden',
    lastName: 'Brooks',
    dob: '2001-06-08',
    age: 25,
    sex: 'Male',
    arrivalTime: '2026-06-10T16:55:00-04:00',
    triageTime: '2026-06-10T17:08:00-04:00',
    lastAssessedTime: '2026-06-10T17:50:00-04:00',
    chiefComplaint: 'Ankle injury from pickup basketball at Regent Park',
    complaintCategory: 'Musculoskeletal',
    state: PatientState.Waiting,
    priority: Priority.P4,
    vitals: vitals('2026-06-10T17:08:00-04:00', 82, 126, 74, 99, 36.5, 16, 15, 7),
    assignedStaffId: 'staff-michael-chen',
    roomId: 'room-fast-1',
    flags: [seedFlag('LongWait', 'Extended wait')],
    timeline: [
      makeEvent(
        'pt-004',
        'Triage',
        'Ankle swelling, able to bear partial weight.',
        '2026-06-10T17:08:00-04:00'
      ),
    ],
    notes: [],
  },
  {
    id: 'pt-005',
    mrn: 'MRN-884205',
    firstName: 'Aarav',
    lastName: 'Patel',
    dob: '1979-01-17',
    age: 47,
    sex: 'Male',
    arrivalTime: '2026-06-10T16:40:00-04:00',
    triageTime: '2026-06-10T16:48:00-04:00',
    lastAssessedTime: '2026-06-10T17:42:00-04:00',
    chiefComplaint: 'Abdominal pain after lunch near Liberty Village',
    complaintCategory: 'Abdominal Pain',
    state: PatientState.Assessment,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T17:42:00-04:00', 96, 138, 82, 98, 37.4, 18, 15, 6),
    assignedStaffId: 'staff-priya-nair',
    roomId: 'room-fast-2',
    flags: [],
    timeline: [
      makeEvent(
        'pt-005',
        'RoomAssignment',
        'Moved to Fast Track 2 for abdominal exam.',
        '2026-06-10T17:30:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-005-1',
        'pt-005',
        'staff-priya-nair',
        'Pain localizing to RUQ; labs ordered.',
        '2026-06-10T17:45:00-04:00'
      ),
    ],
  },
  {
    id: 'pt-006',
    mrn: 'MRN-884206',
    firstName: 'Grace',
    lastName: 'Osei',
    dob: '1994-05-30',
    age: 32,
    sex: 'Female',
    arrivalTime: '2026-06-10T16:22:00-04:00',
    triageTime: '2026-06-10T16:31:00-04:00',
    lastAssessedTime: '2026-06-10T17:20:00-04:00',
    chiefComplaint: 'Migraine with vomiting after TTC commute',
    complaintCategory: 'Headache',
    state: PatientState.Orders,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T17:20:00-04:00', 88, 118, 72, 99, 36.6, 16, 15, 8),
    assignedStaffId: 'staff-aisha-thompson',
    roomId: 'room-fast-3',
    flags: [seedFlag('ReassessmentDue', 'Vitals overdue')],
    timeline: [
      makeEvent(
        'pt-006',
        'OrderPlaced',
        'Medication and fluids ordered; reassessment due after treatment.',
        '2026-06-10T17:22:00-04:00'
      ),
    ],
    notes: [],
  },
  {
    id: 'pt-007',
    mrn: 'MRN-884207',
    firstName: 'Noah',
    lastName: 'Levy',
    dob: '1961-12-09',
    age: 64,
    sex: 'Male',
    arrivalTime: '2026-06-10T15:50:00-04:00',
    triageTime: '2026-06-10T15:58:00-04:00',
    lastAssessedTime: '2026-06-10T17:35:00-04:00',
    chiefComplaint: 'Shortness of breath walking from Kensington Market',
    complaintCategory: 'Respiratory',
    state: PatientState.Results,
    priority: Priority.P2,
    vitals: vitals('2026-06-10T17:35:00-04:00', 110, 152, 86, 93, 37.2, 24, 15, 4),
    assignedStaffId: 'staff-michael-chen',
    roomId: 'room-assessment-1',
    flags: [
      seedFlag('DeteriorationRisk', 'Abnormal vitals'),
      seedFlag('HighRisk', 'High priority patient'),
    ],
    timeline: [
      makeEvent(
        'pt-007',
        'ResultReceived',
        'Chest X-ray completed; labs pending.',
        '2026-06-10T17:55:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-007-1',
        'pt-007',
        'staff-priya-nair',
        'Monitor SpO2 trend; reassess work of breathing.',
        '2026-06-10T17:58:00-04:00'
      ),
    ],
  },
  {
    id: 'pt-008',
    mrn: 'MRN-884208',
    firstName: 'Lina',
    lastName: 'Haddad',
    dob: '1985-08-12',
    age: 40,
    sex: 'Female',
    arrivalTime: '2026-06-10T15:12:00-04:00',
    triageTime: '2026-06-10T15:19:00-04:00',
    lastAssessedTime: '2026-06-10T16:40:00-04:00',
    chiefComplaint: 'Wrist deformity after fall near Queen Station',
    complaintCategory: 'Orthopedic',
    state: PatientState.Disposition,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T16:40:00-04:00', 84, 132, 78, 99, 36.4, 16, 15, 6),
    assignedStaffId: 'staff-priya-nair',
    roomId: 'room-assessment-2',
    flags: [],
    timeline: [
      makeEvent(
        'pt-008',
        'ReferralCreated',
        'Orthopedic referral placed after imaging.',
        '2026-06-10T16:45:00-04:00'
      ),
    ],
    referral: referralPt008,
    notes: [],
  },
  {
    id: 'pt-009',
    mrn: 'MRN-884209',
    firstName: 'Benjamin',
    lastName: 'Singh',
    dob: '1948-04-04',
    age: 78,
    sex: 'Male',
    arrivalTime: '2026-06-10T14:58:00-04:00',
    triageTime: '2026-06-10T15:06:00-04:00',
    lastAssessedTime: '2026-06-10T17:25:00-04:00',
    chiefComplaint: 'Weakness and reduced intake from Scarborough home',
    complaintCategory: 'General Weakness',
    state: PatientState.Admission,
    priority: Priority.P2,
    vitals: vitals('2026-06-10T17:25:00-04:00', 102, 104, 58, 95, 37.8, 22, 14, 3),
    assignedStaffId: 'staff-aisha-thompson',
    roomId: 'room-assessment-3',
    flags: [
      seedFlag('PendingAdmission', 'Admission pending'),
      seedFlag('HighRisk', 'High priority patient'),
    ],
    timeline: [
      makeEvent(
        'pt-009',
        'DispositionUpdated',
        'Admission requested for dehydration and functional decline.',
        '2026-06-10T17:30:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-009-1',
        'pt-009',
        'staff-priya-nair',
        'Family contacted; awaiting inpatient bed assignment.',
        '2026-06-10T17:40:00-04:00',
        'Handoff'
      ),
    ],
  },
  {
    id: 'pt-010',
    mrn: 'MRN-884210',
    firstName: 'Chloe',
    lastName: 'Tremblay',
    dob: '2006-02-19',
    age: 20,
    sex: 'Female',
    arrivalTime: '2026-06-10T14:35:00-04:00',
    triageTime: '2026-06-10T14:45:00-04:00',
    lastAssessedTime: '2026-06-10T17:10:00-04:00',
    chiefComplaint: 'Allergic reaction after meal near the waterfront',
    complaintCategory: 'Allergy',
    state: PatientState.Discharge,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T17:10:00-04:00', 78, 116, 70, 100, 36.5, 14, 15, 0),
    assignedStaffId: 'staff-michael-chen',
    roomId: 'room-observation-1',
    flags: [],
    timeline: [
      makeEvent(
        'pt-010',
        'DispositionUpdated',
        'Observed without recurrence; discharge instructions prepared.',
        '2026-06-10T17:20:00-04:00'
      ),
    ],
    notes: [
      note(
        'note-pt-010-1',
        'pt-010',
        'staff-michael-chen',
        'Symptoms resolved; reviewed return precautions.',
        '2026-06-10T17:18:00-04:00'
      ),
    ],
  },
  {
    id: 'pt-011',
    mrn: 'MRN-884211',
    firstName: 'Robert',
    lastName: 'Campbell',
    dob: '1959-10-27',
    age: 66,
    sex: 'Male',
    arrivalTime: '2026-06-10T13:42:00-04:00',
    triageTime: '2026-06-10T13:48:00-04:00',
    lastAssessedTime: '2026-06-10T17:00:00-04:00',
    chiefComplaint: 'COPD flare brought by Toronto Paramedic Services',
    complaintCategory: 'Respiratory',
    state: PatientState.Admission,
    priority: Priority.P2,
    vitals: vitals('2026-06-10T17:00:00-04:00', 108, 146, 82, 91, 37.1, 26, 15, 4),
    assignedStaffId: 'staff-priya-nair',
    roomId: 'room-observation-2',
    flags: [
      seedFlag('PendingAdmission', 'Admission pending'),
      seedFlag('EMSArrival', 'EMS arrival'),
      seedFlag('DeteriorationRisk', 'Abnormal vitals'),
    ],
    timeline: [
      makeEvent(
        'pt-011',
        'Arrival',
        'EMS handoff completed from TPS Unit 42.',
        '2026-06-10T13:42:00-04:00'
      ),
    ],
    referral: referralPt011,
    emsArrival: {
      id: 'ems-arrival-pt-011',
      patientId: 'pt-011',
      unitId: 'ems-unit-42',
      unitName: 'TPS Medic 42',
      crewNames: ['Oliver Grant', 'Samira Hossain'],
      patientAge: 66,
      patientSex: 'Male',
      chiefComplaint: 'Shortness of breath, known COPD.',
      vitals: vitals('2026-06-10T13:36:00-04:00', 108, 146, 82, 91, 37.1, 26, 15, 4),
      eta: 0,
      severity: 'High',
      dispatchTime: '2026-06-10T13:20:00-04:00',
      estimatedArrivalTime: '2026-06-10T13:36:00-04:00',
      arrivedAt: '2026-06-10T13:42:00-04:00',
      handoffCompletedAt: '2026-06-10T13:50:00-04:00',
      status: 'Complete',
      prearrivalComplaint: 'Shortness of breath, known COPD.',
      priority: Priority.P2,
      notes: 'Nebulizer given en route; oxygen applied.',
      handoffSummary: 'Nebulizer given en route; oxygen applied.',
    },
    notes: [],
  },
  {
    id: 'pt-012',
    mrn: 'MRN-884212',
    firstName: 'Mei',
    lastName: 'Wong',
    dob: '1974-07-06',
    age: 51,
    sex: 'Female',
    arrivalTime: '2026-06-10T18:02:00-04:00',
    triageTime: '2026-06-10T18:07:00-04:00',
    lastAssessedTime: '2026-06-10T18:07:00-04:00',
    chiefComplaint: 'Fever, cough, and recent travel through Pearson',
    complaintCategory: 'Infectious Respiratory',
    state: PatientState.Assessment,
    priority: Priority.P3,
    vitals: vitals('2026-06-10T18:07:00-04:00', 101, 124, 76, 96, 38.3, 20, 15, 3),
    assignedStaffId: 'staff-aisha-thompson',
    roomId: 'room-isolation-1',
    flags: [seedFlag('Isolation', 'Isolation precautions')],
    timeline: [
      makeEvent(
        'pt-012',
        'RoomAssignment',
        'Placed in isolation room for respiratory precautions.',
        '2026-06-10T18:08:00-04:00'
      ),
    ],
    emsArrival: {
      id: 'ems-arrival-pt-012',
      patientId: 'pt-012',
      unitId: 'ems-unit-17',
      unitName: 'TPS Medic 17',
      crewNames: ['Jordan Iqbal', 'Nina Park'],
      patientAge: 51,
      patientSex: 'Female',
      chiefComplaint: 'Fever and cough, mask applied.',
      vitals: vitals('2026-06-10T17:58:00-04:00', 101, 124, 76, 96, 38.3, 20, 15, 3),
      eta: 0,
      severity: 'Moderate',
      dispatchTime: '2026-06-10T17:44:00-04:00',
      estimatedArrivalTime: '2026-06-10T17:58:00-04:00',
      arrivedAt: '2026-06-10T18:02:00-04:00',
      status: 'Handoff',
      prearrivalComplaint: 'Fever and cough, mask applied.',
      priority: Priority.P3,
      notes: 'Fever and cough, respiratory precautions started.',
    },
    notes: [
      note(
        'note-pt-012-1',
        'pt-012',
        'staff-aisha-thompson',
        'Isolation signage posted; swabs pending.',
        '2026-06-10T18:10:00-04:00',
        'Nursing'
      ),
    ],
  },
];

const mockEMSArrivals: EMSArrival[] = [
  emsArrival({
    id: 'ems-arrival-inbound-501',
    unitId: 'ems-unit-501',
    unitName: 'TPS Medic 501',
    crewNames: ['Maya Singh', 'Theo Campbell'],
    patientAge: 58,
    patientSex: 'Male',
    chiefComplaint: 'Crushing chest pain with diaphoresis',
    vitals: vitals(new Date().toISOString(), 118, 164, 94, 95, null, 24, 15, 8),
    etaMinutes: 12,
    severity: 'High',
    dispatchMinutesAgo: 8,
    notes: 'Aspirin given by crew. ECG transmitted, concerning anterior changes.',
  }),
  emsArrival({
    id: 'ems-arrival-inbound-214',
    unitId: 'ems-unit-214',
    unitName: 'TPS Medic 214',
    crewNames: ['Ella Martin', 'David Ko'],
    patientAge: 81,
    patientSex: 'Female',
    chiefComplaint: 'Fall on anticoagulants with head strike',
    mechanismOfInjury: 'Ground-level fall at home',
    vitals: vitals(new Date().toISOString(), 92, 138, 78, 97, null, 18, 14, 4),
    etaMinutes: 7,
    severity: 'Moderate',
    dispatchMinutesAgo: 11,
    notes: 'Awake, repetitive questions, cervical collar applied.',
  }),
  emsArrival({
    id: 'ems-arrival-inbound-733',
    unitId: 'ems-unit-733',
    unitName: 'TPS Medic 733',
    crewNames: ['Andre Lewis', 'Priyanka Shah'],
    patientAge: 43,
    patientSex: 'Unknown',
    chiefComplaint: 'Suspected opioid overdose, ventilated with BVM',
    vitals: vitals(new Date().toISOString(), 44, 92, 54, 88, null, 8, 8, 0),
    etaMinutes: 4,
    severity: 'Critical',
    dispatchMinutesAgo: 6,
    notes: 'Naloxone administered. Airway support ongoing.',
  }),
];

const mockEMSUnits: EMSUnit[] = [
  {
    id: 'ems-unit-501',
    callSign: 'TPS Medic 501',
    agency: 'Toronto Paramedic Services',
    status: 'Inbound',
    crewStaffIds: [],
    activeArrivalId: 'ems-arrival-inbound-501',
    lastKnownLocation: 'Gardiner Expressway approaching York Street',
  },
  {
    id: 'ems-unit-214',
    callSign: 'TPS Medic 214',
    agency: 'Toronto Paramedic Services',
    status: 'Inbound',
    crewStaffIds: [],
    activeArrivalId: 'ems-arrival-inbound-214',
    lastKnownLocation: 'Bloor Street West near Spadina',
  },
  {
    id: 'ems-unit-733',
    callSign: 'TPS Medic 733',
    agency: 'Toronto Paramedic Services',
    status: 'Inbound',
    crewStaffIds: [],
    activeArrivalId: 'ems-arrival-inbound-733',
    lastKnownLocation: 'University Avenue southbound',
  },
  {
    id: 'ems-unit-17',
    callSign: 'TPS Medic 17',
    agency: 'Toronto Paramedic Services',
    status: 'AtHospital',
    crewStaffIds: [],
    activeArrivalId: 'ems-arrival-pt-012',
    lastKnownLocation: 'Emergency bay, Bay Street entrance',
  },
  {
    id: 'ems-unit-42',
    callSign: 'TPS Medic 42',
    agency: 'Toronto Paramedic Services',
    status: 'Available',
    crewStaffIds: [],
    lastKnownLocation: 'Returning north on University Avenue',
  },
];

const mockActiveShift: Shift = {
  id: ACTIVE_SHIFT_ID,
  name: 'Evening urgent care shift',
  startTime: '2026-06-10T15:00:00-04:00',
  endTime: '2026-06-10T23:00:00-04:00',
  status: 'Active',
  chargeStaffId: 'staff-michael-chen',
  staffIds: mockStaff.map((staff) => staff.id),
  handoffNotes: [],
};

const mockReferrals = syncReferralsFromPatients(mockPatients, []);
const initialDerived = deriveOperationalState(
  mockPatients,
  mockRooms,
  mockReferrals,
  mockEMSArrivals,
  DEFAULT_EMERGENCY_SETTINGS
);
const initialAlerts = deriveAlerts({
  patients: mockPatients,
  capacity: initialDerived.capacity,
  emsArrivals: mockEMSArrivals,
  referrals: mockReferrals,
  queues: initialDerived.queues,
  bottleneckAlert: null,
});

export const useEmergencyStore = create<EmergencyStoreState>((set, get) => ({
  patients: mockPatients,
  staff: mockStaff,
  rooms: mockRooms,
  queues: initialDerived.queues,
  capacity: initialDerived.capacity,
  activeShift: mockActiveShift,
  emsUnits: mockEMSUnits,
  emsArrivals: mockEMSArrivals,
  referrals: mockReferrals,
  alerts: initialAlerts,
  selectedPatientId: 'pt-001',
  copilotOpen: true,
  activeQueueFilter: null,
  whiteboardSearchQuery: '',
  bottleneckAlert: null,
  patientBackendDetails: {},
  patientBackendSearch: {
    query: '',
    status: 'idle',
    results: [],
    message: '',
    backendSearchAvailable: false,
  },
  realtimeConnection: {
    status: 'disconnected',
    mode: 'none',
    message: 'Real-time disconnected.',
    updatedAt: undefined,
  },
  emergencyAnalytics: {
    status: 'idle',
    source: 'client-fallback',
    message: '',
    data: undefined,
  },
  emergencySettings: DEFAULT_EMERGENCY_SETTINGS,

  addPatient: (patient) =>
    set((state) => {
      const patients = [...state.patients, patient];
      const referrals = syncReferralsFromPatients(patients, state.referrals);
      return {
        patients,
        referrals,
        ...deriveOperationalState(patients, state.rooms, referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  updatePatient: (id, patch) =>
    set((state) => {
      const patients = updatePatients(state.patients, id, (patient) => ({ ...patient, ...patch }));
      const referrals = syncReferralsFromPatients(patients, state.referrals);
      return {
        patients,
        referrals,
        ...deriveOperationalState(patients, state.rooms, referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  dischargePatient: (id, options = {}) =>
    set((state) => {
      const patient = state.patients.find((candidate) => candidate.id === id);
      const previousRoomId = patient?.roomId ?? null;
      const previousStaffId = patient?.assignedStaffId ?? null;
      const patients = updatePatients(state.patients, id, (current) => ({
        ...current,
        state: PatientState.Discharge,
        roomId: null,
        assignedStaffId: null,
        flags: options.flags ?? [],
        timeline: [
          ...current.timeline,
          options.timelineEvent ??
            actionEvent(current.id, 'DispositionUpdated', 'Patient discharged from Emergency OS.', {
              from: current.state,
              to: PatientState.Discharge,
              fromState: current.state,
              toState: PatientState.Discharge,
            }),
        ],
      }));
      const rooms: Room[] = state.rooms.map(
        (room): Room =>
          room.id === previousRoomId
            ? { ...room, currentPatientId: null, status: 'Cleaning' }
            : room
      );
      const staff = state.staff.map((member) =>
        member.id === previousStaffId
          ? {
              ...member,
              assignedPatientIds: member.assignedPatientIds.filter((patientId) => patientId !== id),
            }
          : member
      );

      const referrals = syncReferralsFromPatients(patients, state.referrals);

      return {
        patients,
        rooms,
        staff,
        selectedPatientId: state.selectedPatientId === id ? null : state.selectedPatientId,
        referrals,
        ...deriveOperationalState(patients, rooms, referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  movePatientToState: (id, nextState, options = {}) =>
    set((state) => {
      const patients = updatePatients(state.patients, id, (patient) => ({
        ...patient,
        state: nextState,
        flags: options.flags ?? patient.flags,
        timeline: [
          ...patient.timeline,
          options.timelineEvent ??
            actionEvent(patient.id, 'StateChange', `Moved patient to ${nextState}.`, {
              from: patient.state,
              to: nextState,
              fromState: patient.state,
              toState: nextState,
            }),
        ],
      }));
      return {
        patients,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  assignStaff: (patientId, staffId) =>
    set((state) => {
      const previousStaffId =
        state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ?? null;
      const patients = updatePatients(state.patients, patientId, (patient) => ({
        ...patient,
        assignedStaffId: staffId,
        timeline: [
          ...patient.timeline,
          actionEvent(patient.id, 'StaffAssignment', `Assigned staff ${staffId}.`, {
            actorStaffId: staffId,
          }),
        ],
      }));
      const staff = state.staff.map((member) => {
        if (member.id === previousStaffId) {
          return {
            ...member,
            assignedPatientIds: member.assignedPatientIds.filter((id) => id !== patientId),
          };
        }
        if (member.id === staffId && !member.assignedPatientIds.includes(patientId)) {
          return { ...member, assignedPatientIds: [...member.assignedPatientIds, patientId] };
        }
        return member;
      });

      return {
        patients,
        staff,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  assignRoom: (patientId, roomId) =>
    set((state) => {
      const previousRoomId =
        state.patients.find((patient) => patient.id === patientId)?.roomId ?? null;
      const patients = updatePatients(state.patients, patientId, (patient) => ({
        ...patient,
        roomId,
        timeline: [
          ...patient.timeline,
          actionEvent(patient.id, 'RoomAssignment', `Assigned room ${roomId}.`),
        ],
      }));
      const rooms: Room[] = state.rooms.map((room): Room => {
        if (room.id === previousRoomId) {
          return { ...room, currentPatientId: null, status: 'Available' };
        }
        if (room.id === roomId) {
          return { ...room, currentPatientId: patientId, status: 'Occupied' };
        }
        return room;
      });

      return {
        patients,
        rooms,
        ...deriveOperationalState(patients, rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  addFlag: (patientId, flag, details) =>
    set((state) => {
      const nextFlag = createPatientFlag(flag, details);
      const patients = updatePatients(state.patients, patientId, (patient) => {
        if (hasPatientFlag(patient, nextFlag.type)) return patient;
        return {
          ...patient,
          flags: [...patient.flags, nextFlag],
          timeline: [
            ...patient.timeline,
            actionEvent(patient.id, 'FlagAdded', `Added ${nextFlag.type} flag.`, {
              metadata: {
                flagType: nextFlag.type,
                reason: nextFlag.reason,
                severity: nextFlag.severity,
              },
            }),
          ],
        };
      });
      return {
        patients,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  removeFlag: (patientId, flag) =>
    set((state) => {
      const patients = updatePatients(state.patients, patientId, (patient) => {
        if (!hasPatientFlag(patient, flag)) return patient;
        return {
          ...patient,
          flags: patient.flags.filter((item) => getPatientFlagType(item) !== flag),
          timeline: [
            ...patient.timeline,
            actionEvent(patient.id, 'FlagRemoved', `Removed ${flag} flag.`, {
              metadata: {
                flagType: flag,
              },
            }),
          ],
        };
      });
      return {
        patients,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  addVitals: (patientId, nextVitals) =>
    set((state) => {
      const patients = updatePatients(state.patients, patientId, (patient) => ({
        ...patient,
        vitals: nextVitals,
        lastAssessedTime: nextVitals.recordedAt,
        timeline: [
          ...patient.timeline,
          actionEvent(patient.id, 'VitalsUpdated', 'Updated patient vitals.', {
            metadata: {
              previousHr: patient.vitals.hr,
              previousBpSystolic: patient.vitals.bpSystolic,
              previousBpDiastolic: patient.vitals.bpDiastolic,
              previousSpo2: patient.vitals.spo2,
              previousTemp: patient.vitals.temp,
              previousRr: patient.vitals.rr,
              previousGcs: patient.vitals.gcs,
              previousPain: patient.vitals.pain,
              hr: nextVitals.hr,
              bpSystolic: nextVitals.bpSystolic,
              bpDiastolic: nextVitals.bpDiastolic,
              spo2: nextVitals.spo2,
              temp: nextVitals.temp,
              rr: nextVitals.rr,
              gcs: nextVitals.gcs,
              pain: nextVitals.pain,
            },
          }),
        ],
      }));
      return {
        patients,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  addNote: (patientId, noteToAdd) =>
    set((state) => {
      const patients = updatePatients(state.patients, patientId, (patient) => ({
        ...patient,
        notes: [...patient.notes, noteToAdd],
        timeline: [
          ...patient.timeline,
          actionEvent(patient.id, 'NoteAdded', `Added ${noteToAdd.type.toLowerCase()} note.`, {
            actorStaffId: noteToAdd.authorStaffId,
          }),
        ],
      }));
      return {
        patients,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  updateCapacity: () =>
    set((state) => {
      if (operationalRefreshTimer) {
        clearTimeout(operationalRefreshTimer);
      }

      operationalRefreshTimer = setTimeout(() => {
        useEmergencyStore.setState((latestState) => ({
          capacity: computeCapacity(
            latestState.patients,
            latestState.rooms,
            latestState.emsArrivals,
            latestState.emergencySettings
          ),
          queues: computeQueues(
            latestState.patients,
            latestState.referrals,
            latestState.emergencySettings
          ),
        }));
        operationalRefreshTimer = null;
      }, 100);

      return state;
    }),

  selectPatient: (id) => set({ selectedPatientId: id }),

  toggleCopilot: () => set((state) => ({ copilotOpen: !state.copilotOpen })),

  setCopilotOpen: (open) => set({ copilotOpen: open }),

  setQueueFilter: (type) => set({ activeQueueFilter: type }),

  setWhiteboardSearchQuery: (query) => set({ whiteboardSearchQuery: query }),

  loadPatientBackendDetails: async (patientId, options = {}) => {
    if (!patientId) return null;
    const existing = get().patientBackendDetails[patientId];
    if (!options.force && (existing?.status === 'ready' || existing?.status === 'loading')) {
      return existing;
    }

    const loadingEntry: PatientBackendDetailsEntry = {
      patientId,
      status: 'loading',
      data: existing?.data,
      loadedAt: existing?.loadedAt,
    };
    set((state) => ({
      patientBackendDetails: {
        ...state.patientBackendDetails,
        [patientId]: loadingEntry,
      },
    }));

    const result = await fetchPatientManagementBundle(patientId);
    const nextEntry: PatientBackendDetailsEntry = result.ok
      ? {
          patientId,
          status: 'ready',
          loadedAt: new Date().toISOString(),
          partial: result.partial,
          error: result.partial ? result.error : '',
          data: result.data,
        }
      : {
          patientId,
          status: 'error',
          loadedAt: new Date().toISOString(),
          error: result.error || 'Unable to load patient backend details.',
          data: existing?.data,
        };

    set((state) => ({
      patientBackendDetails: {
        ...state.patientBackendDetails,
        [patientId]: nextEntry,
      },
    }));

    if (result.ok) {
      const labSummary = criticalLabSummary(result.data);
      if (labSummary) {
        get().addFlag(patientId, 'DeteriorationRisk', {
          reason: `Critical lab result from backend: ${labSummary}`,
          severity: 'Critical',
        });
      }
    }
    return nextEntry;
  },

  searchBackendPatients: async (query) => {
    const trimmed = query.trim();
    const loadingState: PatientBackendSearchState = {
      query: trimmed,
      status: trimmed ? 'loading' : 'idle',
      results: [],
      message: '',
      backendSearchAvailable: false,
    };
    set({ patientBackendSearch: loadingState });

    if (!trimmed) {
      return loadingState;
    }

    const result = await searchPatientsFromBackend(trimmed, { localPatients: get().patients });
    const nextSearch: PatientBackendSearchState = {
      query: trimmed,
      status: result.ok ? 'ready' : 'error',
      results: result.results || [],
      message: result.message || result.error || '',
      backendSearchAvailable: Boolean(result.backendSearchAvailable),
    };

    const detailEntries = Object.fromEntries(
      nextSearch.results
        .filter((item) => item.backendDetail)
        .map((item) => [
          item.patientId,
          {
            patientId: item.patientId,
            status: 'ready',
            loadedAt: new Date().toISOString(),
            error: item.error || '',
            data: item.backendDetail,
          } satisfies PatientBackendDetailsEntry,
        ])
    );

    set((state) => ({
      patientBackendSearch: nextSearch,
      patientBackendDetails: {
        ...state.patientBackendDetails,
        ...detailEntries,
      },
    }));
    return nextSearch;
  },

  clearBackendPatientSearch: () =>
    set({
      patientBackendSearch: {
        query: '',
        status: 'idle',
        results: [],
        message: '',
        backendSearchAvailable: false,
      },
    }),

  loadBackendStaffProfile: async () => {
    const result = await fetchOperationalStaffProfile();
    if (!result.ok || !result.data) return;
    set((state) => {
      const backendStaff = staffFromOperationalProfile(result.data, state.activeShift);
      const staff = upsertStaff(state.staff, backendStaff);
      const staffIds = backendStaff
        ? Array.from(new Set([...state.activeShift.staffIds, backendStaff.id]))
        : state.activeShift.staffIds;
      return {
        staff,
        activeShift: {
          ...state.activeShift,
          staffIds,
          chargeStaffId: state.activeShift.chargeStaffId || backendStaff?.id || state.activeShift.chargeStaffId,
        },
      };
    });
  },

  startShift: (input) =>
    set((state) => {
      const now = new Date().toISOString();
      const shift: Shift = {
        id: `shift-${Date.now()}`,
        name: input.name || `ED shift ${new Date(input.startTime || now).toLocaleString()}`,
        startTime: input.startTime || now,
        endTime: input.endTime || new Date(new Date(input.startTime || now).getTime() + 8 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        chargeStaffId: input.chargeStaffId || input.staffIds[0] || state.activeShift.chargeStaffId,
        staffIds: input.staffIds.length ? input.staffIds : state.staff.map((member) => member.id),
        handoffNotes: [],
      };
      void recordEmergencyActivity({
        category: 'workspace',
        label: 'Emergency shift started',
        route: '/emergency',
        metadata: {
          shiftId: shift.id,
          startTime: shift.startTime,
          staffIds: shift.staffIds,
          backendPersistence: 'activity-log',
        },
      });
      void syncEmergencyAuditEvent({
        action: 'security_event',
        resourceType: 'shift',
        resourceId: shift.id,
        timestamp: shift.startTime,
      });
      return {
        activeShift: shift,
        staff: state.staff.map((member) => ({
          ...member,
          status: shift.staffIds.includes(member.id) ? 'OnShift' : 'OffShift',
          shiftId: shift.staffIds.includes(member.id) ? shift.id : member.shiftId,
        })),
      };
    }),

  endShift: (endedAt) =>
    set((state) => {
      const timestamp = endedAt || new Date().toISOString();
      const shift: Shift = {
        ...state.activeShift,
        endTime: timestamp,
        status: 'Closed',
      };
      void recordEmergencyActivity({
        category: 'workspace',
        label: 'Emergency shift ended',
        route: '/emergency/shift',
        metadata: {
          shiftId: shift.id,
          endTime: timestamp,
          backendPersistence: 'activity-log',
        },
      });
      void syncEmergencyAuditEvent({
        action: 'security_event',
        resourceType: 'shift',
        resourceId: shift.id,
        timestamp,
      });
      return { activeShift: shift };
    }),

  setBottleneckAlert: (alert) => set({ bottleneckAlert: alert }),

  dispatchAlert: (alert) => {
    let dispatchedAlert = normalizeAlert(alert);
    set((state) => {
      const existing = state.alerts.find((candidate) => candidate.id === dispatchedAlert.id);
      dispatchedAlert = existing
        ? {
            ...existing,
            ...dispatchedAlert,
            createdAt: existing.createdAt || dispatchedAlert.createdAt,
            dismissedAt: undefined,
          }
        : dispatchedAlert;

      const alerts = existing
        ? state.alerts.map((candidate) =>
            candidate.id === dispatchedAlert.id ? dispatchedAlert : candidate
          )
        : [dispatchedAlert, ...state.alerts];

      return {
        alerts: alerts.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      };
    });
    return dispatchedAlert;
  },

  updateAlerts: () =>
    set((state) => {
      const derivedAlerts = deriveAlerts(
        {
          patients: state.patients,
          capacity: state.capacity,
          emsArrivals: state.emsArrivals,
          referrals: state.referrals,
          queues: state.queues,
          bottleneckAlert: state.bottleneckAlert,
        },
        state.alerts
      );
      const derivedIds = new Set(derivedAlerts.map((alert) => alert.id));
      const manualAlerts = state.alerts.filter(
        (alert) => !derivedIds.has(alert.id) && !isDerivedAlertId(alert.id)
      );

      return {
        alerts: [...derivedAlerts, ...manualAlerts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      };
    }),

  dismissAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId && !alert.dismissedAt
          ? { ...alert, dismissedAt: new Date().toISOString() }
          : alert
      ),
    })),

  createReferral: (input) =>
    set((state) => {
      const now = new Date().toISOString();
      const referral: Referral = {
        id: `ref-${input.patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        patientId: input.patientId,
        requestingStaffId: input.requestingStaffId,
        targetDepartment: input.targetDepartment,
        urgency: input.urgency,
        reason: input.reason,
        clinicalSummary: input.clinicalSummary,
        status: input.status || 'Sent',
        requestedAt: now,
        workflow: input.workflow || 'Referral',
      };
      const referrals = [...state.referrals, referral];
      const patients = updatePatients(state.patients, input.patientId, (patient) => ({
        ...patient,
        referral,
        timeline: [
          ...patient.timeline,
          actionEvent(
            patient.id,
            'ReferralCreated',
            `${referral.status === 'Draft' ? 'Drafted' : 'Sent'} ${referral.targetDepartment} referral.`,
            {
              actorStaffId: referral.requestingStaffId,
              metadata: {
                referralId: referral.id,
                targetDepartment: referral.targetDepartment,
                urgency: referral.urgency,
                status: referral.status,
              },
            }
          ),
        ],
      }));

      return {
        patients,
        referrals,
        ...deriveOperationalState(patients, state.rooms, referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  updateReferralStatus: (referralId, nextStatus, responseNote) =>
    set((state) => {
      const existing = state.referrals.find((referral) => referral.id === referralId);
      if (!existing) return state;

      const now = new Date().toISOString();
      const timestampPatch: Partial<Referral> = {};
      if (nextStatus === 'Sent' || nextStatus === 'TransferRequested') timestampPatch.requestedAt = now;
      if (
        ['Acknowledged', 'Accepted', 'Declined', 'TransportArranged', 'PatientDeparted'].includes(
          nextStatus
        )
      ) {
        timestampPatch.respondedAt = existing.respondedAt || now;
      }
      if (nextStatus === 'Completed' || nextStatus === 'PatientDeparted') timestampPatch.completedAt = now;

      const referrals = state.referrals.map((referral) =>
        referral.id === referralId
          ? {
              ...referral,
              ...timestampPatch,
              status: nextStatus,
              responseNote: responseNote?.trim() || referral.responseNote,
            }
          : referral
      );
      const nextReferral = referrals.find((referral) => referral.id === referralId) || existing;
      const patients = updatePatients(state.patients, existing.patientId, (patient) => ({
        ...patient,
        referral: patient.referral?.id === referralId ? nextReferral : patient.referral,
        timeline: [
          ...patient.timeline,
          actionEvent(
            patient.id,
            'ReferralCreated',
            `Referral ${referralId} moved to ${nextStatus}.`,
            {
              metadata: {
                referralId,
                status: nextStatus,
                responseNote: responseNote?.trim() || null,
              },
            }
          ),
        ],
      }));

      return {
        patients,
        referrals,
        ...deriveOperationalState(patients, state.rooms, referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  addEMSArrival: (arrival) =>
    set((state) => {
      const emsArrivals = [...state.emsArrivals, arrival];
      return {
        emsArrivals,
        emsUnits: state.emsUnits.some((unit) => unit.id === arrival.unitId)
          ? state.emsUnits.map((unit) =>
              unit.id === arrival.unitId
                ? { ...unit, status: 'Inbound', activeArrivalId: arrival.id }
                : unit
            )
          : [
              ...state.emsUnits,
              {
                id: arrival.unitId,
                callSign: arrival.unitName,
                agency: 'Toronto Paramedic Services',
                status: 'Inbound',
                crewStaffIds: [],
                activeArrivalId: arrival.id,
              },
            ],
        ...deriveOperationalState(state.patients, state.rooms, state.referrals, emsArrivals, state.emergencySettings),
      };
    }),

  updateEMSArrival: (id, patch) =>
    set((state) => {
      const emsArrivals = state.emsArrivals.map((arrival) =>
        arrival.id === id ? { ...arrival, ...patch } : arrival
      );
      return {
        emsArrivals,
        ...deriveOperationalState(state.patients, state.rooms, state.referrals, emsArrivals, state.emergencySettings),
      };
    }),

  updateEMSUnit: (id, patch) =>
    set((state) => ({
      emsUnits: state.emsUnits.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)),
    })),

  prepareEMSBay: (arrivalId) =>
    set((state) => {
      const arrival = state.emsArrivals.find((candidate) => candidate.id === arrivalId);
      if (!arrival || arrival.preparedRoomId) return state;

      const preferredRoom =
        state.rooms.find((room) => room.status === 'Available' && room.type === 'Resuscitation') ||
        state.rooms.find((room) => room.status === 'Available' && room.type === 'Assessment') ||
        state.rooms.find((room) => room.status === 'Available');

      if (!preferredRoom) return state;

      return {
        rooms: state.rooms.map(
          (room): Room => (room.id === preferredRoom.id ? { ...room, status: 'Reserved' } : room)
        ),
        emsArrivals: state.emsArrivals.map((candidate) =>
          candidate.id === arrivalId
            ? { ...candidate, preparedRoomId: preferredRoom.id }
            : candidate
        ),
      };
    }),

  convertEMSArrivalToPatient: (arrivalId) =>
    set((state) => {
      const arrival = state.emsArrivals.find((candidate) => candidate.id === arrivalId);
      if (!arrival) return state;
      if (arrival.patientId && state.patients.some((patient) => patient.id === arrival.patientId)) {
        return { selectedPatientId: arrival.patientId };
      }

      const now = new Date().toISOString();
      const patientId = `ems-patient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const patientVitals =
        arrival.vitals || vitals(now, null, null, null, null, null, null, null, null);
      const patient: Patient = {
        id: patientId,
        mrn: `MRN-EMS-${Math.floor(100000 + Math.random() * 900000)}`,
        firstName: 'EMS',
        lastName: `Arrival ${arrival.unitName.replace(/\D/g, '').slice(-3) || arrival.unitId}`,
        dob: dobFromAge(arrival.patientAge),
        age: arrival.patientAge,
        sex: arrival.patientSex,
        arrivalTime: now,
        triageTime: null,
        lastAssessedTime: null,
        chiefComplaint: arrival.chiefComplaint,
        complaintCategory: arrival.mechanismOfInjury ? 'Trauma' : arrival.chiefComplaint,
        state: PatientState.Arrival,
        priority: arrival.priority,
        vitals: { ...patientVitals, recordedAt: patientVitals.recordedAt || now },
        assignedStaffId: null,
        roomId: arrival.preparedRoomId || null,
        flags: [createPatientFlag('EMSArrival', { reason: 'EMS arrival', detectedAt: now })],
        timeline: [
          actionEvent(
            patientId,
            'Arrival',
            `${arrival.unitName} arrived: ${arrival.chiefComplaint}.`,
            {
              metadata: {
                emsArrivalId: arrival.id,
                unitId: arrival.unitId,
                severity: arrival.severity,
              },
            }
          ),
        ],
        emsArrival: {
          ...arrival,
          patientId,
          status: 'Handoff',
          arrivedAt: arrival.arrivedAt || now,
        },
        notes: [
          {
            id: `note-${patientId}-ems`,
            patientId,
            authorStaffId: 'system-ems',
            type: 'Operational',
            body: `${arrival.unitName} handoff pending. Crew: ${arrival.crewNames.join(', ')}. ${arrival.notes}`,
            createdAt: now,
          },
        ],
      };
      const patients = [...state.patients, patient];
      const rooms: Room[] = state.rooms.map((room): Room => {
        if (room.id === arrival.preparedRoomId) {
          return { ...room, status: 'Occupied', currentPatientId: patientId };
        }
        return room;
      });
      const emsArrivals = state.emsArrivals.map((candidate) =>
        candidate.id === arrivalId
          ? { ...candidate, patientId, status: 'Handoff', arrivedAt: candidate.arrivedAt || now }
          : candidate
      );
      const emsUnits = state.emsUnits.map((unit) =>
        unit.id === arrival.unitId ? { ...unit, status: 'AtHospital' } : unit
      );
      const referrals = syncReferralsFromPatients(patients, state.referrals);

      return {
        patients,
        rooms,
        emsArrivals,
        emsUnits,
        referrals,
        selectedPatientId: patientId,
        activeQueueFilter: null,
        ...deriveOperationalState(patients, rooms, referrals, emsArrivals, state.emergencySettings),
      };
    }),

  setRealtimeConnection: (status) =>
    set((state) => ({
      realtimeConnection: {
        ...state.realtimeConnection,
        ...status,
        updatedAt: status.updatedAt || new Date().toISOString(),
      },
    })),

  handleRealtimeEvent: (event) => {
    const type = realtimeEventType(event?.type);
    const payload = event?.payload || {};
    const state = get();

    if (['patient_updated', 'patient_update', 'patient_changed'].includes(type)) {
      const patientId = realtimePatientId(payload);
      if (patientId) state.updatePatient(patientId, realtimePatientPatch(payload));
      return;
    }

    if (['new_arrival', 'patient_created', 'patient_arrived'].includes(type)) {
      const patient = payload.patient || payload;
      if (patient?.id && !state.patients.some((candidate) => candidate.id === patient.id)) {
        state.addPatient(patient as Patient);
      } else if (patient?.id) {
        state.updatePatient(patient.id, realtimePatientPatch(patient));
      }
      return;
    }

    if (['vitals_updated', 'vital_signs_updated', 'observation_created'].includes(type)) {
      const patientId = realtimePatientId(payload);
      const nextVitals = realtimeVitals(payload);
      if (patientId && nextVitals) state.addVitals(patientId, nextVitals);
      return;
    }

    if (['alert_fired', 'alert_triggered', 'clinical_alert'].includes(type)) {
      state.dispatchAlert(payload.alert || payload);
      return;
    }

    if (['ems_update', 'ems_unit_updated'].includes(type)) {
      const unit = payload.unit || payload.emsUnit || payload;
      const unitId = unit.id || unit.unitId;
      if (unitId) state.updateEMSUnit(unitId, unit);
      return;
    }

    if (['ems_arrival', 'ems_arrival_updated', 'ems_notification'].includes(type)) {
      const arrival = payload.arrival || payload;
      if (!arrival?.id) return;
      if (state.emsArrivals.some((candidate) => candidate.id === arrival.id)) {
        state.updateEMSArrival(arrival.id, arrival);
      } else {
        state.addEMSArrival(arrival as EMSArrival);
      }
      return;
    }

    if (['lab_result', 'lab_resulted', 'result_received'].includes(type)) {
      const patientId = realtimePatientId(payload);
      if (patientId) void state.loadPatientBackendDetails(patientId, { force: true });
    }
  },

  pollRealtimeFallback: async () => {
    const state = get();
    const activePatientIds = state.patients
      .filter((patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased)
      .slice(0, 12)
      .map((patient) => patient.id);
    await Promise.all(
      activePatientIds.map((patientId) =>
        state.loadPatientBackendDetails(patientId, { force: true }).catch(() => null)
      )
    );
    state.updateAlerts();
  },

  startRealtime: () => {
    if (emergencyRealtimeUnsubscribe) return;
    emergencyRealtimeUnsubscribe = startEmergencyRealtime({
      onStatus: (status: RealtimeConnectionState) => get().setRealtimeConnection(status),
      onEvent: (event: RealtimeEventEnvelope) => get().handleRealtimeEvent(event),
      onPoll: () => get().pollRealtimeFallback(),
    });
  },

  stopRealtime: () => {
    emergencyRealtimeUnsubscribe?.();
    emergencyRealtimeUnsubscribe = null;
    set({
      realtimeConnection: {
        status: 'disconnected',
        mode: 'none',
        message: 'Real-time disconnected.',
        updatedAt: new Date().toISOString(),
      },
    });
  },

  loadEmergencyAnalytics: async (options = {}) => {
    const current = get().emergencyAnalytics;
    if (!options.force && current.status === 'ready' && current.loadedAt) return current;

    set((state) => ({
      emergencyAnalytics: {
        ...state.emergencyAnalytics,
        status: 'loading',
        message: '',
      },
    }));

    const backend = await fetchEmergencyOperationalAnalytics();
    if (backend.ok && backend.data) {
      const nextState: EmergencyAnalyticsState = {
        status: 'ready',
        source: 'backend',
        loadedAt: new Date().toISOString(),
        message: '',
        data: backend.data,
      };
      set({ emergencyAnalytics: nextState });
      return nextState;
    }

    const state = get();
    const nextState: EmergencyAnalyticsState = {
      status: 'ready',
      source: 'client-fallback',
      loadedAt: new Date().toISOString(),
      message: backend.message || 'Backend ED analytics endpoint not available; using local operational state.',
      data: buildLocalEmergencyAnalytics({
        patients: state.patients,
        queues: state.queues,
        capacity: state.capacity,
        activeShift: state.activeShift,
      }),
    };
    set({ emergencyAnalytics: nextState });
    return nextState;
  },

  saveEmergencySettings: (patch) =>
    set((state) => {
      const emergencySettings: EmergencySettingsState = {
        ...state.emergencySettings,
        ...patch,
        thresholds: {
          ...state.emergencySettings.thresholds,
          ...(patch.thresholds || {}),
          reassessmentIntervals: {
            ...state.emergencySettings.thresholds.reassessmentIntervals,
            ...(patch.thresholds?.reassessmentIntervals || {}),
          },
        },
        alertRules: {
          ...state.emergencySettings.alertRules,
          ...(patch.alertRules || {}),
        },
        featureFlags: {
          ...state.emergencySettings.featureFlags,
          ...(patch.featureFlags || {}),
        },
      };
      return {
        emergencySettings,
        ...deriveOperationalState(
          state.patients,
          state.rooms,
          state.referrals,
          state.emsArrivals,
          emergencySettings
        ),
      };
    }),

  upsertRoom: (room) =>
    set((state) => {
      const id = room.id || `room-${Date.now()}`;
      const nextRoom: Room = {
        id,
        name: room.name || `Room ${state.rooms.length + 1}`,
        type: room.type || 'Assessment',
        status: room.status || 'Available',
        currentPatientId: room.currentPatientId ?? null,
        isIsolationCapable: Boolean(room.isIsolationCapable),
      };
      const rooms = state.rooms.some((candidate) => candidate.id === id)
        ? state.rooms.map((candidate) => (candidate.id === id ? { ...candidate, ...nextRoom } : candidate))
        : [...state.rooms, nextRoom];
      return {
        rooms,
        ...deriveOperationalState(
          state.patients,
          rooms,
          state.referrals,
          state.emsArrivals,
          state.emergencySettings
        ),
      };
    }),

  deactivateRoom: (roomId) =>
    set((state) => {
      const rooms = state.rooms.map((room) =>
        room.id === roomId ? { ...room, status: 'Blocked' as const, currentPatientId: null } : room
      );
      return {
        rooms,
        ...deriveOperationalState(
          state.patients,
          rooms,
          state.referrals,
          state.emsArrivals,
          state.emergencySettings
        ),
      };
    }),

  upsertStaffMember: (staffInput) =>
    set((state) => {
      const id = staffInput.id || `staff-${Date.now()}`;
      const [firstName = 'New', ...rest] = String(staffInput.name || '').split(' ').filter(Boolean);
      const nextStaff: Staff = {
        id,
        firstName: staffInput.firstName || firstName || 'New',
        lastName: staffInput.lastName || rest.join(' ') || 'Staff',
        name: staffInput.name,
        displayName: staffInput.displayName || staffInput.name,
        email: staffInput.email,
        avatarUrl: staffInput.avatarUrl,
        role: staffInput.role || 'Nurse',
        roleLabel: staffInput.roleLabel,
        status: staffInput.status || 'OffShift',
        shiftId: staffInput.shiftId ?? null,
        assignedPatientIds: staffInput.assignedPatientIds || [],
        activePatients: staffInput.activePatients,
        currentRoomId: staffInput.currentRoomId,
      };
      return {
        staff: state.staff.some((candidate) => candidate.id === id)
          ? state.staff.map((candidate) => (candidate.id === id ? { ...candidate, ...nextStaff } : candidate))
          : [...state.staff, nextStaff],
      };
    }),
}));

registerAlertDispatcher((alert) => useEmergencyStore.getState().dispatchAlert(alert));
setDepartmentContextStoreReader(() => useEmergencyStore.getState());
setToolRegistryStoreReader(() => useEmergencyStore.getState());

export const emergencyStoreApi = useEmergencyStore;

export const selectFilteredPatients = (state: EmergencyStoreState): Patient[] => {
  const query = state.whiteboardSearchQuery.trim().toLowerCase();
  const queue = state.activeQueueFilter
    ? state.queues.find((candidate) => candidate.type === state.activeQueueFilter)
    : null;
  return state.patients.filter((patient) => {
    if (queue && !queue.patientIds.includes(patient.id)) return false;
    if (!query) return true;
    const name = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    return (
      name.includes(query) ||
      patient.mrn.toLowerCase().includes(query) ||
      patient.chiefComplaint.toLowerCase().includes(query) ||
      patient.complaintCategory.toLowerCase().includes(query)
    );
  });
};

export type { EmergencyStoreState, PatientPatch };
