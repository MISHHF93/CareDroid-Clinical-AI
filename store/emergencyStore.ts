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
  type ReassessmentReminder,
  type VitalsAlert,
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
import { evaluateVitalsAlerts } from '../src/utils/vitalsAlertPipeline';
import { isCriticalEMSArrival, resolveCriticalChecklistConfig } from '../config/criticalChecklists';
import {
  LONG_WAIT_PHASE_RANK,
  isLongWaitRescueReason,
  longWaitSeverityForPhase,
  longWaitStatus,
} from '../src/utils/longWaitRescue';

type PatientPatch = Partial<Omit<Patient, 'id'>>;
type PatientFlagDetails = Partial<Pick<PatientFlag, 'reason' | 'detectedAt' | 'severity'>>;
type PatientFlagInput = PatientFlag | PatientFlagType;
type EscalationInput = {
  staffId: string;
  staffName: string;
  timestamp?: string;
};
type CrisisStaffingRequest = {
  id: string;
  requestedAt: string;
  requestedByStaffId: string;
  reason: string;
  capacityScore: number;
  capacityRiskLevel: CapacityRiskLevel;
  status: 'Open' | 'Acknowledged' | 'Closed';
};
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
    CAPACITY_CRISIS: { enabled: true, severity: 'Critical' },
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
type StaffAssignmentOptions = {
  actorStaffId?: string;
  actorName?: string;
  fromStaffName?: string;
  toStaffName?: string;
  reason?: string;
};
type ReassessmentReminderInput = {
  scheduledBy: string;
  dueAt: string;
  note?: string;
};
type ReassessmentReminderCompletionInput = {
  completedBy: string;
  timestamp?: string;
};
type CriticalChecklistCheckInput = {
  itemId: string;
  label: string;
  checked: boolean;
  staffId: string;
  staffName: string;
  timestamp?: string;
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
  staffingRequests: CrisisStaffingRequest[];
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
  isHydrating: boolean;
  hasHydrated: boolean;
  ensureHydrated: () => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, patch: PatientPatch) => void;
  dischargePatient: (id: string, options?: MovePatientStateOptions) => void;
  movePatientToState: (id: string, state: PatientState, options?: MovePatientStateOptions) => void;
  assignStaff: (patientId: string, staffId: string, options?: StaffAssignmentOptions) => void;
  assignRoom: (patientId: string, roomId: string) => void;
  addFlag: (patientId: string, flag: PatientFlagInput, details?: PatientFlagDetails) => void;
  removeFlag: (patientId: string, flag: PatientFlagType) => void;
  escalatePatient: (patientId: string, input: EscalationInput) => void;
  cancelEscalation: (patientId: string, input: EscalationInput) => void;
  scheduleReassessmentReminder: (
    patientId: string,
    input: ReassessmentReminderInput
  ) => ReassessmentReminder | null;
  snoozeReassessmentReminder: (patientId: string, reminderId: string, minutes?: number) => void;
  completeReassessmentReminder: (
    patientId: string,
    reminderId: string,
    input: ReassessmentReminderCompletionInput
  ) => void;
  addVitals: (patientId: string, vitals: Vitals) => void;
  acknowledgeVitalsAlert: (patientId: string, alertId: string, acknowledgedBy: string) => void;
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
  requestAdditionalStaff: (input: {
    requestedByStaffId: string;
    reason: string;
    capacityScore?: number;
    capacityRiskLevel?: CapacityRiskLevel;
  }) => CrisisStaffingRequest;
  createReferral: (input: ReferralCreateInput) => void;
  updateReferralStatus: (referralId: string, status: ReferralStatus, responseNote?: string) => void;
  addEMSArrival: (arrival: EMSArrival) => void;
  updateEMSArrival: (id: string, patch: Partial<EMSArrival>) => void;
  updateEMSUnit: (id: string, patch: Partial<EMSUnit>) => void;
  prepareEMSBay: (arrivalId: string) => void;
  checkCriticalEMSChecklistItem: (arrivalId: string, input: CriticalChecklistCheckInput) => void;
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

const ACTIVE_REASSESSMENT_REMINDER_STATUSES = new Set(['pending', 'snoozed']);

const hasDueReassessmentReminder = (patient: Patient, now = new Date()): boolean =>
  (patient.reassessmentReminders || []).some((reminder) => {
    if (!ACTIVE_REASSESSMENT_REMINDER_STATUSES.has(reminder.status)) return false;
    const dueAt = new Date(reminder.dueAt).getTime();
    return Number.isFinite(dueAt) && now.getTime() >= dueAt;
  });

const ensureReminderReassessmentFlags = (patients: Patient[], now = new Date()): Patient[] => {
  let changed = false;
  const nextPatients = patients.map((patient) => {
    if (!hasDueReassessmentReminder(patient, now) || hasPatientFlag(patient, 'ReassessmentDue')) {
      return patient;
    }
    changed = true;
    const flag = createPatientFlag('ReassessmentDue', {
      reason: 'Scheduled recheck reminder due',
      severity: 'Warning',
      detectedAt: now.toISOString(),
    });
    return {
      ...patient,
      flags: [...patient.flags, flag],
      timeline: [
        ...patient.timeline,
        makeEvent(
          patient.id,
          'FlagAdded',
          'Scheduled recheck reminder moved patient to reassessment queue.',
          now.toISOString(),
          {
            metadata: {
              flagType: 'ReassessmentDue',
              reason: 'Scheduled recheck reminder due',
            },
          }
        ),
      ],
    };
  });
  return changed ? nextPatients : patients;
};

const isGeneratedLongWaitFlag = (flag: PatientFlag): boolean =>
  (getPatientFlagType(flag) === 'LongWait' || getPatientFlagType(flag) === 'ReassessmentDue') &&
  isLongWaitRescueReason(typeof flag === 'string' ? '' : flag.reason);

const ensureLongWaitRescueFlags = (patients: Patient[], now = new Date()): Patient[] => {
  let changed = false;
  const nextPatients = patients.map((patient) => {
    const status = longWaitStatus(patient, now);
    const existingGenerated = patient.flags.filter(isGeneratedLongWaitFlag);
    if (status.phase === 'none') {
      if (!existingGenerated.length) return patient;
      changed = true;
      return {
        ...patient,
        flags: patient.flags.filter((flag) => !isGeneratedLongWaitFlag(flag)),
      };
    }

    const severity = longWaitSeverityForPhase(status.phase);
    const expectedFlags = [
      createPatientFlag('LongWait', {
        reason: status.reason,
        detectedAt: now.toISOString(),
        severity,
      }),
      createPatientFlag('ReassessmentDue', {
        reason: status.reason,
        detectedAt: now.toISOString(),
        severity,
      }),
    ];
    const currentManagedFlags = patient.flags.filter(isGeneratedLongWaitFlag);
    const isCurrent =
      currentManagedFlags.length === expectedFlags.length &&
      expectedFlags.every((expected) =>
        currentManagedFlags.some(
          (flag) =>
            getPatientFlagType(flag) === expected.type &&
            flag.reason === expected.reason &&
            flag.severity === expected.severity
        )
      );
    if (isCurrent) return patient;

    changed = true;
    return {
      ...patient,
      flags: [...patient.flags.filter((flag) => !isGeneratedLongWaitFlag(flag)), ...expectedFlags],
    };
  });
  return changed ? nextPatients : patients;
};

const isScheduledReminderFlag = (flag: PatientFlag): boolean =>
  getPatientFlagType(flag) === 'ReassessmentDue' &&
  (typeof flag === 'string' ? false : flag.reason === 'Scheduled recheck reminder due');

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
  DeterioratingNeuro: 'Critical',
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
  DeterioratingNeuro: 'Deteriorating neuro status',
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

const CRITICAL_ROOM_PRIORITY: Room['type'][] = [
  'Resuscitation',
  'Assessment',
  'Triage',
  'Observation',
  'Isolation',
  'Waiting',
];

function findHighestPriorityAvailableRoom(rooms: Room[]): Room | undefined {
  for (const roomType of CRITICAL_ROOM_PRIORITY) {
    const room = rooms.find((candidate) => candidate.status === 'Available' && candidate.type === roomType);
    if (room) return room;
  }
  return rooms.find((candidate) => candidate.status === 'Available');
}

function ensureCriticalEMSPreparedState(
  emsArrivals: EMSArrival[],
  rooms: Room[],
  arrivalId?: string
): { emsArrivals: EMSArrival[]; rooms: Room[] } {
  let nextRooms = rooms;
  const nextArrivals = emsArrivals.map((arrival) => {
    if (arrivalId && arrival.id !== arrivalId) return arrival;
    if (arrival.patientId || ['Complete', 'Cancelled'].includes(arrival.status)) return arrival;
    if (!isCriticalEMSArrival(arrival)) return arrival;

    const checklistConfig = resolveCriticalChecklistConfig(arrival);
    if (!checklistConfig) return arrival;

    const existingRoom = arrival.preparedRoomId
      ? nextRooms.find((room) => room.id === arrival.preparedRoomId)
      : undefined;
    const assignedRoom = existingRoom || findHighestPriorityAvailableRoom(nextRooms);
    if (assignedRoom && !existingRoom) {
      nextRooms = nextRooms.map((room): Room =>
        room.id === assignedRoom.id ? { ...room, status: 'Reserved' } : room
      );
    }

    return {
      ...arrival,
      preparedRoomId: assignedRoom?.id || arrival.preparedRoomId,
      criticalChecklist: {
        type: checklistConfig.type,
        title: checklistConfig.title,
        triggeredAt: arrival.criticalChecklist?.triggeredAt || new Date().toISOString(),
        assignedRoomId: assignedRoom?.id || arrival.criticalChecklist?.assignedRoomId,
        assignedRoomName: assignedRoom?.name || arrival.criticalChecklist?.assignedRoomName,
        completions: arrival.criticalChecklist?.completions || [],
      },
    };
  });

  return { emsArrivals: nextArrivals, rooms: nextRooms };
}

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
  staffingRequests: [],
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
  isHydrating: false,
  hasHydrated: true,

  ensureHydrated: () => {
    const state = get();
    if (state.patients.length > 0) {
      if (!state.hasHydrated || state.isHydrating) {
        set({ hasHydrated: true, isHydrating: false });
      }
      return;
    }

    set({ isHydrating: true });
    const referrals = syncReferralsFromPatients(mockPatients, []);
    const derived = deriveOperationalState(
      mockPatients,
      mockRooms,
      referrals,
      mockEMSArrivals,
      DEFAULT_EMERGENCY_SETTINGS
    );
    const alerts = deriveAlerts({
      patients: mockPatients,
      capacity: derived.capacity,
      emsArrivals: mockEMSArrivals,
      referrals,
      queues: derived.queues,
      bottleneckAlert: null,
    });

    set({
      patients: mockPatients,
      staff: mockStaff,
      rooms: mockRooms,
      queues: derived.queues,
      capacity: derived.capacity,
      activeShift: mockActiveShift,
      emsUnits: mockEMSUnits,
      emsArrivals: mockEMSArrivals,
      referrals,
      alerts,
      selectedPatientId: mockPatients[0]?.id || null,
      activeQueueFilter: null,
      whiteboardSearchQuery: '',
      bottleneckAlert: null,
      emergencySettings: DEFAULT_EMERGENCY_SETTINGS,
      isHydrating: false,
      hasHydrated: true,
    });
  },

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

  assignStaff: (patientId, staffId, options = {}) =>
    set((state) => {
      const previousStaffId =
        state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ?? null;
      const fromStaffName =
        options.fromStaffName ||
        state.staff.find((member) => member.id === previousStaffId)?.displayName ||
        previousStaffId ||
        'Unassigned';
      const toStaffName =
        options.toStaffName ||
        state.staff.find((member) => member.id === staffId)?.displayName ||
        staffId;
      const summary =
        previousStaffId && previousStaffId !== staffId
          ? `Reassigned from ${fromStaffName} to ${toStaffName}.`
          : `Assigned to ${toStaffName}.`;
      const patients = updatePatients(state.patients, patientId, (patient) => ({
        ...patient,
        assignedStaffId: staffId,
        timeline: [
          ...patient.timeline,
          actionEvent(patient.id, 'StaffAssignment', summary, {
            actorStaffId: options.actorStaffId || staffId,
            metadata: {
              fromStaffId: previousStaffId,
              toStaffId: staffId,
              fromStaffName,
              toStaffName,
              actorName: options.actorName,
              reason: options.reason || 'Workload rebalance',
            },
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

  escalatePatient: (patientId, input) =>
    set((state) => {
      const timestamp = input.timestamp || new Date().toISOString();
      const patient = state.patients.find((candidate) => candidate.id === patientId);
      if (!patient) return state;
      const staffName = input.staffName || input.staffId || 'staff';
      const reason = `Manual escalation by ${staffName}`;
      const roomName =
        patient.location ||
        state.rooms.find((room) => room.id === patient.roomId)?.name ||
        patient.roomId ||
        'No bed';
      const bedLabel =
        /^bed\b/i.test(String(roomName)) || roomName === 'No bed' ? roomName : `Bed ${roomName}`;
      const patientLabel = patient.name || `${patient.firstName} ${patient.lastName}`;
      const nextFlags = [
        createPatientFlag('HighRisk', { reason, severity: 'Critical', detectedAt: timestamp }),
        createPatientFlag('DeteriorationRisk', { reason, severity: 'Critical', detectedAt: timestamp }),
        createPatientFlag('ReassessmentDue', { reason, severity: 'Critical', detectedAt: timestamp }),
      ];
      const nextAlert = normalizeAlert(
        {
          id: `alert-escalation-${patient.id}`,
          type: 'System',
          severity: 'Critical',
          title: `ESCALATION — ${patientLabel}`,
          message: `Bed ${roomName} · ${patient.chiefComplaint || patient.complaintCategory} · Escalated by ${staffName}`,
          patientId: patient.id,
          actionLabel: 'View Patient',
          actionType: 'VIEW_PATIENT',
        },
        new Date(timestamp)
      );
      const patients = updatePatients(state.patients, patientId, (current) => {
        const existingTypes = new Set(current.flags.map((flag) => getPatientFlagType(flag)));
        return {
          ...current,
          flags: [
            ...current.flags.filter((flag) => !['HighRisk', 'DeteriorationRisk', 'ReassessmentDue'].includes(getPatientFlagType(flag))),
            ...nextFlags.filter((flag) => !existingTypes.has(flag.type) || ['HighRisk', 'DeteriorationRisk', 'ReassessmentDue'].includes(flag.type)),
          ],
          timeline: [
            ...current.timeline,
            makeEvent(current.id, 'ESCALATION', `Manual escalation by ${staffName}.`, timestamp, {
              id: `evt-${current.id}-escalation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              by: input.staffId,
              actorStaffId: input.staffId,
              staffId: input.staffId,
              reason: 'Manual',
              metadata: {
                reason: 'Manual',
                staffName,
              },
            }),
          ],
        };
      });
      const alerts = [
        nextAlert,
        ...state.alerts.filter((alert) => alert.id !== nextAlert.id),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        patients,
        alerts,
        activeQueueFilter: 'Reassessment',
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  cancelEscalation: (patientId, input) =>
    set((state) => {
      const timestamp = input.timestamp || new Date().toISOString();
      const patient = state.patients.find((candidate) => candidate.id === patientId);
      if (!patient) return state;
      const latestEscalation = [...patient.timeline]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find((event) => event.type === 'ESCALATION');
      const cancellingStaff = state.staff.find((member) => member.id === input.staffId);
      const isCharge =
        input.staffId === state.activeShift.chargeStaffId ||
        /charge/i.test(String(cancellingStaff?.role || cancellingStaff?.roleLabel || ''));
      const escalatedBy = latestEscalation?.by || latestEscalation?.staffId || latestEscalation?.actorStaffId;
      if (!latestEscalation || (escalatedBy !== input.staffId && !isCharge)) return state;
      const staffName = input.staffName || input.staffId || 'staff';
      const patients = updatePatients(state.patients, patientId, (current) => ({
        ...current,
        flags: current.flags.filter(
          (flag) => !['HighRisk', 'DeteriorationRisk', 'ReassessmentDue'].includes(getPatientFlagType(flag))
        ),
        timeline: [
          ...current.timeline,
          makeEvent(current.id, 'ESCALATION_CANCELLED', `Escalation cancelled by ${staffName}.`, timestamp, {
            id: `evt-${current.id}-escalation-cancelled-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            by: input.staffId,
            actorStaffId: input.staffId,
            staffId: input.staffId,
            reason: 'Manual cancellation',
            metadata: {
              reason: 'Manual cancellation',
              staffName,
            },
          }),
        ],
      }));
      const alerts = state.alerts.map((alert) =>
        alert.id === `alert-escalation-${patientId}` && !alert.dismissedAt
          ? { ...alert, dismissedAt: timestamp }
          : alert
      );

      return {
        patients,
        alerts,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  scheduleReassessmentReminder: (patientId, input) => {
    const reminder: ReassessmentReminder = {
      id: `recheck-${patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      patientId,
      scheduledBy: input.scheduledBy,
      scheduledAt: new Date().toISOString(),
      dueAt: input.dueAt,
      note: input.note?.trim() || undefined,
      status: 'pending',
    };
    let created = false;
    set((state) => {
      const patients = updatePatients(state.patients, patientId, (patient) => {
        created = true;
        return {
          ...patient,
          reassessmentReminders: [...(patient.reassessmentReminders || []), reminder],
          timeline: [
            ...patient.timeline,
            makeEvent(
              patient.id,
              'ReassessmentReminderScheduled',
              `Scheduled recheck for ${new Date(reminder.dueAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}${reminder.note ? `: ${reminder.note}` : '.'}`,
              reminder.scheduledAt,
              {
                actorStaffId: input.scheduledBy,
                metadata: {
                  reminderId: reminder.id,
                  dueAt: reminder.dueAt,
                  note: reminder.note || null,
                },
              }
            ),
          ],
        };
      });
      return { patients };
    });
    return created ? reminder : null;
  },

  snoozeReassessmentReminder: (patientId, reminderId, minutes = 10) =>
    set((state) => {
      const now = new Date();
      const dueAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
      const alerts = state.alerts.map((alert) =>
        alert.reminderId === reminderId && !alert.dismissedAt
          ? { ...alert, dismissedAt: now.toISOString() }
          : alert
      );
      const patients = updatePatients(state.patients, patientId, (patient) => {
        const reassessmentReminders = (patient.reassessmentReminders || []).map((reminder) =>
          reminder.id === reminderId
            ? { ...reminder, status: 'snoozed', dueAt, snoozedUntil: dueAt }
            : reminder
        );
        const hasOtherDueReminder = hasDueReassessmentReminder(
          { ...patient, reassessmentReminders },
          now
        );
        return {
          ...patient,
          reassessmentReminders,
          flags: hasOtherDueReminder ? patient.flags : patient.flags.filter((flag) => !isScheduledReminderFlag(flag)),
          timeline: [
            ...patient.timeline,
            makeEvent(
              patient.id,
              'ReassessmentReminderSnoozed',
              `Snoozed recheck reminder ${minutes} minutes.`,
              now.toISOString(),
              {
                metadata: {
                  reminderId,
                  snoozedMinutes: minutes,
                  dueAt,
                },
              }
            ),
          ],
        };
      });
      return {
        patients,
        alerts,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  completeReassessmentReminder: (patientId, reminderId, input) =>
    set((state) => {
      const timestamp = input.timestamp || new Date().toISOString();
      const alerts = state.alerts.map((alert) =>
        alert.reminderId === reminderId && !alert.dismissedAt
          ? { ...alert, dismissedAt: timestamp }
          : alert
      );
      const patients = updatePatients(state.patients, patientId, (patient) => {
        const reminders = patient.reassessmentReminders || [];
        if (!reminders.some((reminder) => reminder.id === reminderId)) return patient;
        const reassessmentReminders = reminders.map((reminder) =>
          reminder.id === reminderId
            ? { ...reminder, status: 'completed', completedAt: timestamp }
            : reminder
        );
        const hasOtherDueReminder = hasDueReassessmentReminder(
          { ...patient, reassessmentReminders },
          new Date(timestamp)
        );
        return {
          ...patient,
          reassessmentReminders,
          flags: hasOtherDueReminder ? patient.flags : patient.flags.filter((flag) => !isScheduledReminderFlag(flag)),
          timeline: [
            ...patient.timeline,
            makeEvent(
              patient.id,
              'ReassessmentReminderCompleted',
              'Completed scheduled recheck reminder.',
              timestamp,
              {
                actorStaffId: input.completedBy,
                metadata: {
                  reminderId,
                  completedAt: timestamp,
                },
              }
            ),
          ],
        };
      });
      return {
        patients,
        alerts,
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  addVitals: (patientId, nextVitals) =>
    set((state) => {
      const timestamp = nextVitals.recordedAt || new Date().toISOString();
      const patient = state.patients.find((candidate) => candidate.id === patientId);
      if (!patient) return state;
      const triggeredAlerts = evaluateVitalsAlerts(nextVitals, patient.vitals);
      const patientLabel = patient.name || `${patient.firstName} ${patient.lastName}`;
      const roomName =
        patient.location ||
        state.rooms.find((room) => room.id === patient.roomId)?.name ||
        patient.roomId ||
        'No bed';
      const bedLabel =
        /^bed\b/i.test(String(roomName)) || roomName === 'No bed' ? roomName : `Bed ${roomName}`;
      const vitalsAlerts: VitalsAlert[] = triggeredAlerts.map((alert, index) => ({
        id: `vitals-alert-${patientId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        patientId,
        severity: alert.severity,
        status: 'active',
        vital: alert.vital,
        value: alert.value,
        unit: alert.unit,
        reason: alert.reason,
        recordedAt: timestamp,
      }));
      const criticalAlerts = vitalsAlerts.filter((alert) => alert.severity === 'critical');
      const warningAlerts = vitalsAlerts.filter((alert) => alert.severity === 'warning');
      const criticalSummary = criticalAlerts.map((alert) => `${alert.vital} ${alert.value}${alert.unit}`).join(', ');
      const warningSummary = warningAlerts.map((alert) => `${alert.vital} ${alert.value}${alert.unit}`).join(', ');
      const criticalReason = criticalSummary ? `Critical vitals: ${criticalSummary}` : 'Critical vitals';
      const warningReason = warningSummary ? `Abnormal vitals: ${warningSummary}` : 'Abnormal vitals';
      const nextAlertRecords = [
        ...criticalAlerts.map((alert) =>
          normalizeAlert(
            {
              id: `alert-vitals-critical-${alert.id}`,
              type: 'System',
              severity: 'Critical',
              title: `CRITICAL: ${alert.vital} ${alert.value}${alert.unit} - ${patientLabel} ${bedLabel}`,
              message: `${patientLabel} requires immediate reassessment. ${criticalReason}`,
              patientId,
              actionLabel: 'Go to Patient',
              actionType: 'VITALS_CRITICAL',
              autoDismissAfter: undefined,
            },
            new Date(timestamp)
          )
        ),
        ...warningAlerts.map((alert) =>
          normalizeAlert(
            {
              id: `alert-vitals-warning-${alert.id}`,
              type: 'Reassessment',
              severity: 'Warning',
              title: `Vitals warning - ${patientLabel}`,
              message: `${warningReason}. Assigned clinician notified.`,
              patientId,
              actionLabel: 'Go to Patient',
              actionType: 'VITALS_WARNING',
              autoDismissAfter: 30,
            },
            new Date(timestamp)
          )
        ),
      ];
      const patients = updatePatients(state.patients, patientId, (current) => {
        const existingFlagTypes = new Set(current.flags.map((flag) => getPatientFlagType(flag)));
        const pipelineFlags: PatientFlag[] = [];
        if (criticalAlerts.length) {
          if (!existingFlagTypes.has('HighRisk')) {
            pipelineFlags.push(createPatientFlag('HighRisk', { reason: criticalReason, severity: 'Critical', detectedAt: timestamp }));
          }
          if (!existingFlagTypes.has('DeteriorationRisk')) {
            pipelineFlags.push(createPatientFlag('DeteriorationRisk', { reason: criticalReason, severity: 'Critical', detectedAt: timestamp }));
          }
          if (!existingFlagTypes.has('ReassessmentDue')) {
            pipelineFlags.push(createPatientFlag('ReassessmentDue', { reason: criticalReason, severity: 'Critical', detectedAt: timestamp }));
          }
          if (criticalAlerts.some((alert) => alert.vital === 'GCS') && !existingFlagTypes.has('DeterioratingNeuro')) {
            pipelineFlags.push(createPatientFlag('DeterioratingNeuro', { reason: 'GCS drop of 2+ points', severity: 'Critical', detectedAt: timestamp }));
          }
        } else if (warningAlerts.length && !existingFlagTypes.has('ReassessmentDue')) {
          pipelineFlags.push(createPatientFlag('ReassessmentDue', { reason: warningReason, severity: 'Warning', detectedAt: timestamp }));
        }

        return {
          ...current,
          vitals: nextVitals,
          vitalsUpdatedAt: timestamp,
          lastAssessedTime: timestamp,
          flags: [...current.flags, ...pipelineFlags],
          vitalsAlerts: [...(current.vitalsAlerts || []), ...vitalsAlerts],
          timeline: [
            ...current.timeline,
            actionEvent(current.id, 'VitalsUpdated', 'Updated patient vitals.', {
              metadata: {
                previousHr: current.vitals.hr,
                previousBpSystolic: current.vitals.bpSystolic,
                previousBpDiastolic: current.vitals.bpDiastolic,
                previousSpo2: current.vitals.spo2,
                previousTemp: current.vitals.temp,
                previousRr: current.vitals.rr,
                previousGcs: current.vitals.gcs,
                previousPain: current.vitals.pain,
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
            ...vitalsAlerts.map((alert) =>
              makeEvent(
                current.id,
                'VitalsAlertFired',
                `${alert.severity.toUpperCase()} vitals alert: ${alert.reason}.`,
                timestamp,
                {
                  metadata: {
                    alertId: alert.id,
                    severity: alert.severity,
                    vital: alert.vital,
                    value: alert.value,
                    unit: alert.unit,
                  },
                }
              )
            ),
          ],
        };
      });
      const alerts = [...nextAlertRecords, ...state.alerts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        patients,
        alerts,
        ...(criticalAlerts.length || warningAlerts.length ? { activeQueueFilter: 'Reassessment' as QueueType } : {}),
        ...deriveOperationalState(patients, state.rooms, state.referrals, state.emsArrivals, state.emergencySettings),
      };
    }),

  acknowledgeVitalsAlert: (patientId, alertId, acknowledgedBy) =>
    set((state) => {
      const timestamp = new Date().toISOString();
      const patients = updatePatients(state.patients, patientId, (patient) => ({
        ...patient,
        vitalsAlerts: (patient.vitalsAlerts || []).map((alert) =>
          alert.id === alertId
            ? { ...alert, status: 'addressed', acknowledgedAt: timestamp, acknowledgedBy }
            : alert
        ),
        timeline: [
          ...patient.timeline,
          makeEvent(patient.id, 'VitalsAlertAddressed', 'Vitals alert marked addressed.', timestamp, {
            actorStaffId: acknowledgedBy,
            metadata: {
              alertId,
            },
          }),
        ],
      }));
      const alerts = state.alerts.map((alert) =>
        alert.id.includes(alertId) && !alert.dismissedAt ? { ...alert, dismissedAt: timestamp } : alert
      );
      return { patients, alerts };
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
      const now = new Date();
      const patients = ensureLongWaitRescueFlags(
        ensureReminderReassessmentFlags(state.patients, now),
        now
      );
      const operational =
        patients === state.patients
          ? null
          : deriveOperationalState(
              patients,
              state.rooms,
              state.referrals,
              state.emsArrivals,
              state.emergencySettings
            );
      const derivedAlerts = deriveAlerts(
        {
          patients,
          capacity: operational?.capacity || state.capacity,
          emsArrivals: state.emsArrivals,
          referrals: state.referrals,
          queues: operational?.queues || state.queues,
          bottleneckAlert: state.bottleneckAlert,
        },
        state.alerts
      );
      const derivedIds = new Set(derivedAlerts.map((alert) => alert.id));
      const manualAlerts = state.alerts.filter(
        (alert) => !derivedIds.has(alert.id) && !isDerivedAlertId(alert.id)
      );

      return {
        ...(patients === state.patients ? {} : { patients }),
        ...(operational || {}),
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

  requestAdditionalStaff: (input) => {
    const state = get();
    const request: CrisisStaffingRequest = {
      id: `staffing-request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      requestedAt: new Date().toISOString(),
      requestedByStaffId: input.requestedByStaffId,
      reason: input.reason,
      capacityScore: input.capacityScore ?? state.capacity.score,
      capacityRiskLevel: input.capacityRiskLevel ?? state.capacity.riskLevel,
      status: 'Open',
    };
    set((current) => ({
      staffingRequests: [request, ...current.staffingRequests],
    }));
    return request;
  },

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
      const operational = deriveOperationalState(
        patients,
        state.rooms,
        referrals,
        state.emsArrivals,
        state.emergencySettings
      );
      const derivedAlerts = deriveAlerts(
        {
          patients,
          capacity: operational.capacity,
          emsArrivals: state.emsArrivals,
          referrals,
          queues: operational.queues,
          bottleneckAlert: state.bottleneckAlert,
        },
        state.alerts
      );
      const derivedIds = new Set(derivedAlerts.map((alert) => alert.id));
      const manualAlerts = state.alerts.filter(
        (alert) => !derivedIds.has(alert.id) && !isDerivedAlertId(alert.id)
      );

      return {
        patients,
        referrals,
        ...operational,
        alerts: [...derivedAlerts, ...manualAlerts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
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
        ['Acknowledged', 'Accepted', 'Declined', 'InfoRequested', 'TransportArranged', 'PatientDeparted'].includes(
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
      const operational = deriveOperationalState(
        patients,
        state.rooms,
        referrals,
        state.emsArrivals,
        state.emergencySettings
      );
      const derivedAlerts = deriveAlerts(
        {
          patients,
          capacity: operational.capacity,
          emsArrivals: state.emsArrivals,
          referrals,
          queues: operational.queues,
          bottleneckAlert: state.bottleneckAlert,
        },
        state.alerts
      );
      const derivedIds = new Set(derivedAlerts.map((alert) => alert.id));
      const manualAlerts = state.alerts.filter(
        (alert) => !derivedIds.has(alert.id) && !isDerivedAlertId(alert.id)
      );

      return {
        patients,
        referrals,
        ...operational,
        alerts: [...derivedAlerts, ...manualAlerts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      };
    }),

  addEMSArrival: (arrival) =>
    set((state) => {
      const prepared = ensureCriticalEMSPreparedState([...state.emsArrivals, arrival], state.rooms, arrival.id);
      const emsArrivals = prepared.emsArrivals;
      return {
        emsArrivals,
        rooms: prepared.rooms,
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
        ...deriveOperationalState(state.patients, prepared.rooms, state.referrals, emsArrivals, state.emergencySettings),
      };
    }),

  updateEMSArrival: (id, patch) =>
    set((state) => {
      const patchedArrivals = state.emsArrivals.map((arrival) =>
        arrival.id === id ? { ...arrival, ...patch } : arrival
      );
      const prepared = ensureCriticalEMSPreparedState(patchedArrivals, state.rooms, id);
      return {
        emsArrivals: prepared.emsArrivals,
        rooms: prepared.rooms,
        ...deriveOperationalState(
          state.patients,
          prepared.rooms,
          state.referrals,
          prepared.emsArrivals,
          state.emergencySettings
        ),
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
        ).map((candidate) =>
          candidate.id === arrivalId && candidate.criticalChecklist
            ? {
                ...candidate,
                criticalChecklist: {
                  ...candidate.criticalChecklist,
                  assignedRoomId: preferredRoom.id,
                  assignedRoomName: preferredRoom.name,
                },
              }
            : candidate
        ),
      };
    }),

  checkCriticalEMSChecklistItem: (arrivalId, input) =>
    set((state) => ({
      emsArrivals: state.emsArrivals.map((arrival) => {
        if (arrival.id !== arrivalId || !arrival.criticalChecklist) return arrival;
        const completions = arrival.criticalChecklist.completions.filter(
          (completion) => completion.itemId !== input.itemId
        );
        if (input.checked) {
          completions.push({
            itemId: input.itemId,
            label: input.label,
            checkedByStaffId: input.staffId,
            checkedByStaffName: input.staffName,
            checkedAt: input.timestamp || new Date().toISOString(),
          });
        }
        return {
          ...arrival,
          criticalChecklist: {
            ...arrival.criticalChecklist,
            completions,
          },
        };
      }),
    })),

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
      const criticalChecklist = arrival.criticalChecklist
        ? {
            ...arrival.criticalChecklist,
            savedToPatientAt: now,
          }
        : undefined;
      const checklistConfig = arrival.criticalChecklist
        ? resolveCriticalChecklistConfig(arrival)
        : null;
      const checklistTotal = checklistConfig?.items.length || 0;
      const checklistComplete = criticalChecklist?.completions.length || 0;
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
          ...(criticalChecklist
            ? [
                actionEvent(
                  patientId,
                  'EMSCriticalChecklistSaved',
                  `Critical EMS checklist saved: ${checklistComplete}/${checklistTotal} complete.`,
                  {
                    metadata: {
                      emsArrivalId: arrival.id,
                      checklistType: criticalChecklist.type,
                      completedItems: checklistComplete,
                      totalItems: checklistTotal,
                    },
                  }
                ),
              ]
            : []),
        ],
        emsArrival: {
          ...arrival,
          patientId,
          status: 'Handoff',
          arrivedAt: arrival.arrivedAt || now,
          criticalChecklist,
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
        criticalChecklist,
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
          ? {
              ...candidate,
              patientId,
              status: 'Handoff',
              arrivedAt: candidate.arrivedAt || now,
              criticalChecklist,
            }
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

const isHighRiskPatient = (patient: Patient): boolean =>
  hasPatientFlag(patient, 'HighRisk') ||
  hasPatientFlag(patient, 'DeteriorationRisk') ||
  patient.priority === Priority.P1 ||
  patient.priority === Priority.P2;

const patientMatchesWhiteboardFilter = (patient: Patient, filterType: QueueType | null): boolean => {
  if (!filterType) return true;
  if (filterType === 'Provider') {
    return patient.state === PatientState.Assessment || patient.state === PatientState.Orders;
  }
  if (filterType === 'Assessment') {
    return [PatientState.Assessment, PatientState.Orders, PatientState.Results].includes(patient.state);
  }
  if (filterType === 'Referral') return Boolean(patient.referral);
  if (filterType === 'Reassessment') {
    return hasPatientFlag(patient, 'ReassessmentDue') || hasPatientFlag(patient, 'ScoreReassessmentRecommended');
  }
  if (filterType === 'HighRisk') return isHighRiskPatient(patient);
  if (filterType === 'EMS') return hasPatientFlag(patient, 'EMSArrival') || Boolean(patient.emsArrival);
  if (filterType === 'Boarding') return patient.state === PatientState.Admission || hasPatientFlag(patient, 'PendingAdmission');
  return patient.state === filterType;
};

const queueHealthForWait = (averageWaitMinutes: number): 'green' | 'yellow' | 'red' => {
  if (averageWaitMinutes > 40) return 'red';
  if (averageWaitMinutes >= 20) return 'yellow';
  return 'green';
};

let activePatientsInput: Patient[] | null = null;
let activePatientsOutput: Patient[] = [];
export const selectActivePatients = (state: EmergencyStoreState): Patient[] => {
  if (state.patients === activePatientsInput) return activePatientsOutput;
  activePatientsInput = state.patients;
  activePatientsOutput = state.patients.filter(isActivePatient);
  return activePatientsOutput;
};

export const selectSelectedPatient = (state: EmergencyStoreState): Patient | null =>
  state.selectedPatientId
    ? state.patients.find((patient) => patient.id === state.selectedPatientId) || null
    : null;

let filteredPatientsInputs: {
  patients: Patient[] | null;
  activeQueueFilter: QueueType | null;
  whiteboardSearchQuery: string;
  backendQuery: string;
  backendResults: PatientBackendSearchState['results'] | null;
} = {
  patients: null,
  activeQueueFilter: null,
  whiteboardSearchQuery: '',
  backendQuery: '',
  backendResults: null,
};
let filteredPatientsOutput: Patient[] = [];
export const selectFilteredPatients = (state: EmergencyStoreState): Patient[] => {
  if (
    state.patients === filteredPatientsInputs.patients &&
    state.activeQueueFilter === filteredPatientsInputs.activeQueueFilter &&
    state.whiteboardSearchQuery === filteredPatientsInputs.whiteboardSearchQuery &&
    state.patientBackendSearch.query === filteredPatientsInputs.backendQuery &&
    state.patientBackendSearch.results === filteredPatientsInputs.backendResults
  ) {
    return filteredPatientsOutput;
  }

  filteredPatientsInputs = {
    patients: state.patients,
    activeQueueFilter: state.activeQueueFilter,
    whiteboardSearchQuery: state.whiteboardSearchQuery,
    backendQuery: state.patientBackendSearch.query,
    backendResults: state.patientBackendSearch.results,
  };

  const query = state.whiteboardSearchQuery.trim().toLowerCase();
  const backendMatchedPatientIds =
    state.patientBackendSearch.query === state.whiteboardSearchQuery.trim()
      ? new Set((state.patientBackendSearch.results || []).map((result) => result.patientId))
      : new Set<string>();

  filteredPatientsOutput = state.patients
    .filter((patient) => isActivePatient(patient))
    .filter((patient) => patientMatchesWhiteboardFilter(patient, state.activeQueueFilter))
    .filter((patient) => {
    if (!query) return true;
    const name = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    return (
      backendMatchedPatientIds.has(patient.id) ||
      name.includes(query) ||
      patient.mrn.toLowerCase().includes(query) ||
      patient.chiefComplaint.toLowerCase().includes(query) ||
      patient.complaintCategory.toLowerCase().includes(query)
    );
    })
    .sort((a, b) => {
      if (state.activeQueueFilter === 'Waiting') {
        const priorityRank: Record<Priority, number> = {
          [Priority.P1]: 0,
          [Priority.P2]: 1,
          [Priority.P3]: 2,
          [Priority.P4]: 3,
          [Priority.P5]: 4,
        };
        const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
        if (priorityDelta !== 0) return priorityDelta;
        const aStatus = longWaitStatus(a);
        const bStatus = longWaitStatus(b);
        const longWaitPhaseDelta =
          (LONG_WAIT_PHASE_RANK[bStatus.phase] || 0) - (LONG_WAIT_PHASE_RANK[aStatus.phase] || 0);
        return longWaitPhaseDelta || bStatus.waitMinutes - aStatus.waitMinutes;
      }
      const p1Delta = Number(b.priority === Priority.P1) - Number(a.priority === Priority.P1);
      if (p1Delta !== 0) return p1Delta;
      return minutesSince(b.arrivalTime) - minutesSince(a.arrivalTime);
    });
  return filteredPatientsOutput;
};

let whiteboardFilterCountsInput: Patient[] | null = null;
let whiteboardFilterCountsOutput: Record<string, number> = {};
export const selectWhiteboardFilterCounts = (state: EmergencyStoreState): Record<string, number> => {
  if (state.patients === whiteboardFilterCountsInput) return whiteboardFilterCountsOutput;
  whiteboardFilterCountsInput = state.patients;
  const activePatients = selectActivePatients(state);
  whiteboardFilterCountsOutput = {
    All: activePatients.length,
    Waiting: activePatients.filter((patient) => patientMatchesWhiteboardFilter(patient, 'Waiting')).length,
    Assessment: activePatients.filter((patient) => patientMatchesWhiteboardFilter(patient, 'Assessment')).length,
    HighRisk: activePatients.filter((patient) => patientMatchesWhiteboardFilter(patient, 'HighRisk')).length,
    EMS: activePatients.filter((patient) => patientMatchesWhiteboardFilter(patient, 'EMS')).length,
    Boarding: activePatients.filter((patient) => patientMatchesWhiteboardFilter(patient, 'Boarding')).length,
  };
  return whiteboardFilterCountsOutput;
};

let whiteboardStatsInputs: { patients: Patient[] | null; capacity: CapacitySnapshot | null } = {
  patients: null,
  capacity: null,
};
let whiteboardStatsOutput: Array<{ label: string; value: string | number }> = [];
export const selectWhiteboardStats = (state: EmergencyStoreState): Array<{ label: string; value: string | number }> => {
  if (state.patients === whiteboardStatsInputs.patients && state.capacity === whiteboardStatsInputs.capacity) {
    return whiteboardStatsOutput;
  }
  whiteboardStatsInputs = { patients: state.patients, capacity: state.capacity };
  const activePatients = selectActivePatients(state);
  whiteboardStatsOutput = [
    { label: 'Total Active', value: activePatients.length },
    { label: 'Avg Wait', value: `${state.capacity.averageWaitMinutes}m` },
    { label: 'High Risk', value: activePatients.filter(isHighRiskPatient).length },
    {
      label: 'Boarding',
      value: activePatients.filter((patient) => patientMatchesWhiteboardFilter(patient, 'Boarding')).length,
    },
    { label: 'Capacity', value: `${state.capacity.occupancyPercent}%` },
  ];
  return whiteboardStatsOutput;
};

let queueCountsInput: Queue[] | null = null;
let queueCountsOutput: Record<string, number> = {};
export const selectQueueCounts = (state: EmergencyStoreState): Record<string, number> => {
  if (state.queues === queueCountsInput) return queueCountsOutput;
  queueCountsInput = state.queues;
  queueCountsOutput = Object.fromEntries(state.queues.map((queue) => [queue.type, queue.patientIds.length]));
  return queueCountsOutput;
};

let queuePanelRowsInput: Queue[] | null = null;
let queuePanelRowsOutput: Array<{
  type: QueueType;
  name: string;
  count: number;
  averageWaitMinutes: number;
  oldestWaitMinutes: number;
  updatedAt?: string;
  health: 'green' | 'yellow' | 'red';
}> = [];
export const selectQueuePanelRows = (
  state: EmergencyStoreState
): Array<{
  type: QueueType;
  name: string;
  count: number;
  averageWaitMinutes: number;
  oldestWaitMinutes: number;
  updatedAt?: string;
  health: 'green' | 'yellow' | 'red';
}> =>
  {
  if (state.queues === queuePanelRowsInput) return queuePanelRowsOutput;
  queuePanelRowsInput = state.queues;
  queuePanelRowsOutput = state.queues.map((queue) => ({
    type: queue.type,
    name: queue.name,
    count: queue.patientIds.length,
    averageWaitMinutes: queue.averageWaitMinutes,
    oldestWaitMinutes: queue.longestWaitMinutes,
    updatedAt: queue.updatedAt,
    health: queueHealthForWait(queue.averageWaitMinutes),
  }));
  return queuePanelRowsOutput;
};

export const selectQueueOverallHealthScore = (state: EmergencyStoreState): number => {
  const queueRows = selectQueuePanelRows(state);
  const overallAverage = queueRows.length
    ? Math.round(queueRows.reduce((sum, queue) => sum + queue.averageWaitMinutes, 0) / queueRows.length)
    : 0;
  return Math.max(
    0,
    Math.min(
      100,
      100 -
        queueRows.reduce((sum, queue) => {
          if (queue.health === 'red') return sum + 12;
          if (queue.health === 'yellow') return sum + 6;
          return sum;
        }, 0) -
        Math.max(0, overallAverage - 20)
    )
  );
};

let queueBottleneckInputs: {
  queues: Queue[] | null;
  bottleneckAlert: BottleneckAlert | null;
} = {
  queues: null,
  bottleneckAlert: null,
};
let queueBottleneckOutput: BottleneckAlert | null = null;
export const selectQueueBottleneckAlert = (state: EmergencyStoreState): BottleneckAlert | null => {
  if (
    state.queues === queueBottleneckInputs.queues &&
    state.bottleneckAlert === queueBottleneckInputs.bottleneckAlert
  ) {
    return queueBottleneckOutput;
  }
  queueBottleneckInputs = {
    queues: state.queues,
    bottleneckAlert: state.bottleneckAlert,
  };

  const queueRows = selectQueuePanelRows(state);
  const activeQueues = queueRows.filter((queue) => queue.count > 0);
  if (!activeQueues.length) {
    queueBottleneckOutput = null;
    return queueBottleneckOutput;
  }

  const highestCount = Math.max(...activeQueues.map((queue) => queue.count));
  const longestWait = Math.max(...activeQueues.map((queue) => queue.oldestWaitMinutes));
  const queue = activeQueues.find(
    (candidate) => candidate.count === highestCount && candidate.oldestWaitMinutes === longestWait
  );
  if (!queue || queue.count < 2 || queue.oldestWaitMinutes < 20) {
    queueBottleneckOutput = null;
    return queueBottleneckOutput;
  }

  const downstreamByQueue: Partial<Record<QueueType, QueueType>> = {
    Waiting: 'Triage',
    Triage: 'Provider',
    Provider: 'Results',
    Results: 'Referral',
    Referral: 'Admission',
    Admission: 'Discharge',
    Reassessment: 'Provider',
  };
  const downstreamType = downstreamByQueue[queue.type];
  if (!downstreamType) {
    queueBottleneckOutput = null;
    return queueBottleneckOutput;
  }

  const downstreamQueue = queueRows.find((candidate) => candidate.type === downstreamType);
  if (!downstreamQueue || downstreamQueue.count > 0) {
    queueBottleneckOutput = null;
    return queueBottleneckOutput;
  }

  const nextAlert: BottleneckAlert = {
    queue: queue.type,
    reason: `${queue.count} patients, avg ${queue.averageWaitMinutes}min`,
    severity: queue.averageWaitMinutes > 40 || queue.count >= 4 ? 'Red' : 'Yellow',
    detectedAt: new Date().toISOString(),
  };
  if (
    state.bottleneckAlert?.queue === nextAlert.queue &&
    state.bottleneckAlert.reason === nextAlert.reason &&
    state.bottleneckAlert.severity === nextAlert.severity
  ) {
    queueBottleneckOutput = state.bottleneckAlert;
    return queueBottleneckOutput;
  }
  queueBottleneckOutput = nextAlert;
  return queueBottleneckOutput;
};

let reassessmentQueueInput: Patient[] | null = null;
let reassessmentQueueOutput: Array<{
  patientId: string;
  patientName: string;
  state: PatientState;
  priority: Priority;
  waitingMinutes: number;
  vitalsAgeMinutes: number;
  reasons: string[];
  flaggedAt: string;
}> = [];
export const selectReassessmentQueue = (
  state: EmergencyStoreState
): Array<{
  patientId: string;
  patientName: string;
  state: PatientState;
  priority: Priority;
  waitingMinutes: number;
  vitalsAgeMinutes: number;
  reasons: string[];
  flaggedAt: string;
}> =>
  {
  if (state.patients === reassessmentQueueInput) return reassessmentQueueOutput;
  reassessmentQueueInput = state.patients;
  reassessmentQueueOutput = selectActivePatients(state)
    .filter((patient) => hasPatientFlag(patient, 'ReassessmentDue'))
    .map((patient) => {
      const reassessmentFlags = patient.flags.filter((flag) => flag.type === 'ReassessmentDue');
      const longWait = longWaitStatus(patient);
      return {
        patientId: patient.id,
        patientName: patient.name || `${patient.firstName} ${patient.lastName}`,
        state: patient.state,
        priority: patient.priority,
        waitingMinutes: longWait.waitMinutes || minutesSince(patient.arrivalTime),
        vitalsAgeMinutes: minutesSince(patient.vitalsUpdatedAt || patient.vitals?.recordedAt || null),
        reasons: reassessmentFlags.map((flag) => flag.reason),
        flaggedAt: reassessmentFlags[0]?.detectedAt || new Date().toISOString(),
        longWaitPhase: longWait.phase,
      };
    })
    .sort(
      (a, b) =>
        (LONG_WAIT_PHASE_RANK[b.longWaitPhase] || 0) - (LONG_WAIT_PHASE_RANK[a.longWaitPhase] || 0) ||
        new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()
    );
  return reassessmentQueueOutput;
};

export const selectReassessmentCount = (state: EmergencyStoreState): number =>
  selectActivePatients(state).filter(
    (patient) =>
      hasPatientFlag(patient, 'ReassessmentDue') || hasPatientFlag(patient, 'ScoreReassessmentRecommended')
  ).length;

let activeAlertsInput: Alert[] | null = null;
let activeAlertsOutput: Alert[] = [];
export const selectActiveAlerts = (state: EmergencyStoreState): Alert[] => {
  if (state.alerts === activeAlertsInput) return activeAlertsOutput;
  activeAlertsInput = state.alerts;
  activeAlertsOutput = state.alerts.filter((alert) => !alert.dismissedAt);
  return activeAlertsOutput;
};

let edQueueHealthInput: Queue[] | null = null;
let edQueueHealthOutput: Array<{
  queueType: QueueType;
  count: number;
  averageWait: number;
  health: 'green' | 'yellow' | 'red';
}> = [];
export const selectEdQueueHealth = (
  state: EmergencyStoreState
): Array<{ queueType: QueueType; count: number; averageWait: number; health: 'green' | 'yellow' | 'red' }> =>
  {
  if (state.queues === edQueueHealthInput) return edQueueHealthOutput;
  edQueueHealthInput = state.queues;
  edQueueHealthOutput = selectQueuePanelRows(state).map((queue) => ({
    queueType: queue.type,
    count: queue.count,
    averageWait: queue.averageWaitMinutes,
    health: queueHealthForWait(queue.averageWaitMinutes),
  }));
  return edQueueHealthOutput;
};

export type { EmergencyStoreState, PatientPatch };
