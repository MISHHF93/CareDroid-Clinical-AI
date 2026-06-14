import { PatientFlag, PatientState, Priority, type Alert, type Patient, type Referral } from '../types/emergency';
import type { EmergencyStoreState } from '../store/emergencyStore';

export const CARE_DROID_CENTRAL_NODE_ID = 'CareDroidCentralNode';

export const CARE_DROID_SCREEN_MODES = Object.freeze({
  triage: 'TRIAGE_SCREEN',
  registration: 'REGISTRATION_SCREEN',
  chargeNurse: 'CHARGE_NURSE_SCREEN',
  physician: 'PHYSICIAN_SCREEN',
  ems: 'EMS_SCREEN',
  waitingRoom: 'WAITING_ROOM_DISPLAY',
  commandCenter: 'COMMAND_CENTER_DISPLAY',
  admin: 'ADMIN_SCREEN',
  readOnly: 'READ_ONLY_DISPLAY',
} as const);

export type CareDroidScreenMode =
  (typeof CARE_DROID_SCREEN_MODES)[keyof typeof CARE_DROID_SCREEN_MODES];

export type CareDroidPressure = 'normal' | 'watch' | 'strained' | 'critical';

export const CARE_DROID_SCREEN_MODE_OPTIONS: CareDroidScreenMode[] = Object.values(
  CARE_DROID_SCREEN_MODES,
);

export const CARE_DROID_SCREEN_MODE_CONFIG: Record<
  CareDroidScreenMode,
  {
    label: string;
    visibleWidgets: string[];
    availableActions: string[];
    density: 'comfortable' | 'compact' | 'wall';
    readOnly: boolean;
    publicDisplay: boolean;
    defaultFocus: string;
    alertVisibility: 'all' | 'critical' | 'operational' | 'redacted';
  }
> = {
  TRIAGE_SCREEN: {
    label: 'Triage screen',
    visibleWidgets: ['whiteboard', 'smart-intake', 'queues', 'reassessment', 'alerts'],
    availableActions: ['create-patient', 'triage', 'record-vitals', 'flag-reassessment'],
    density: 'compact',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'smart-intake',
    alertVisibility: 'all',
  },
  REGISTRATION_SCREEN: {
    label: 'Registration screen',
    visibleWidgets: ['smart-intake', 'patient-lookup', 'queues'],
    availableActions: ['create-patient', 'verify-identity'],
    density: 'comfortable',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'patient-lookup',
    alertVisibility: 'operational',
  },
  CHARGE_NURSE_SCREEN: {
    label: 'Charge nurse screen',
    visibleWidgets: ['whiteboard', 'capacity', 'ems', 'reassessment', 'boarding', 'alerts'],
    availableActions: ['create-patient', 'prepare-ems-bay', 'move-patient', 'staffing-request'],
    density: 'compact',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'critical-patients',
    alertVisibility: 'all',
  },
  PHYSICIAN_SCREEN: {
    label: 'Physician screen',
    visibleWidgets: ['whiteboard', 'patient-detail', 'referrals', 'reassessment', 'copilot'],
    availableActions: ['review-patient', 'write-note', 'refer', 'discharge-with-review'],
    density: 'comfortable',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'patient-detail',
    alertVisibility: 'all',
  },
  EMS_SCREEN: {
    label: 'EMS screen',
    visibleWidgets: ['ems', 'capacity', 'whiteboard', 'alerts'],
    availableActions: ['prepare-ems-bay', 'convert-arrival', 'complete-handoff'],
    density: 'compact',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'ems-inbound',
    alertVisibility: 'critical',
  },
  WAITING_ROOM_DISPLAY: {
    label: 'Waiting room display',
    visibleWidgets: ['queue-health', 'capacity-status'],
    availableActions: [],
    density: 'wall',
    readOnly: true,
    publicDisplay: true,
    defaultFocus: 'queue-health',
    alertVisibility: 'redacted',
  },
  COMMAND_CENTER_DISPLAY: {
    label: 'Command center display',
    visibleWidgets: ['whiteboard', 'queues', 'ems', 'capacity', 'boarding', 'analytics', 'alerts'],
    availableActions: ['central-review', 'open-command-palette'],
    density: 'wall',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'department-status',
    alertVisibility: 'all',
  },
  ADMIN_SCREEN: {
    label: 'Admin screen',
    visibleWidgets: ['settings', 'analytics', 'audit', 'integrations'],
    availableActions: ['manage-settings', 'review-audit', 'configure-modules'],
    density: 'comfortable',
    readOnly: false,
    publicDisplay: false,
    defaultFocus: 'settings',
    alertVisibility: 'operational',
  },
  READ_ONLY_DISPLAY: {
    label: 'Read-only display',
    visibleWidgets: ['whiteboard', 'queues', 'capacity', 'alerts'],
    availableActions: [],
    density: 'wall',
    readOnly: true,
    publicDisplay: true,
    defaultFocus: 'department-status',
    alertVisibility: 'redacted',
  },
};

export type CareDroidCentralNodeSource = Pick<
  EmergencyStoreState,
  | 'patients'
  | 'capacity'
  | 'alerts'
  | 'emsArrivals'
  | 'emsIncomingPatients'
  | 'emsUnits'
  | 'referrals'
  | 'workflowLogs'
  | 'emergencySettings'
  | 'websocket'
  | 'copilotMessages'
  | 'integrationEvents'
  | 'selectedPatientId'
  | 'activeQueueFilter'
  | 'whiteboardSearchQuery'
  | 'loading'
  | 'backendAvailable'
>;

export type CareDroidCentralNodeRoleContext = {
  role: string;
  roleLabel: string;
  readOnly: boolean;
  allowedRoutes: string[];
  can?: (action: string) => boolean;
};

export type CareDroidPatientReference = {
  id: string;
  displayName: string;
  mrn?: string;
  state: string;
  priority: string | number;
  chiefComplaint?: string;
  waitMinutes: number;
  flags: string[];
  assignedStaffId?: string;
  roomId?: string;
};

export type CareDroidCentralNodeSnapshot = {
  node: typeof CARE_DROID_CENTRAL_NODE_ID;
  generatedAt: string;
  sync: {
    source: 'store' | 'backend-snapshot';
    status: string;
    mode: string;
    lastSyncedAt: string | null;
    stale: boolean;
    message: string;
  };
  currentDepartmentStatus: {
    patientsToday: number;
    activePatients: number;
    waitingPatients: number;
    longestWait: number;
    averageWait: number;
    capacityBand: string;
    activeAlerts: number;
  };
  activePatientFlow: {
    patients: CareDroidPatientReference[];
    criticalPatients: CareDroidPatientReference[];
  };
  queueHealth: Array<{
    id: string;
    label: string;
    count: number;
    oldestWaitMinutes: number;
    targetMinutes: number;
    breached: boolean;
  }>;
  emsPressure: {
    inbound: number;
    criticalInbound: number;
    status: CareDroidPressure;
  };
  capacityStatus: EmergencyStoreState['capacity'];
  boardingStatus: {
    boarders: number;
    risk: CareDroidPressure;
  };
  reassessmentStatus: {
    due: number;
    overdue: number;
  };
  referralStatus: {
    pending: number;
  };
  operationalAlerts: Alert[];
  screenContext: {
    mode: CareDroidScreenMode;
    config: (typeof CARE_DROID_SCREEN_MODE_CONFIG)[CareDroidScreenMode];
    sensitiveDataRedacted: boolean;
  };
  roleContext: Omit<CareDroidCentralNodeRoleContext, 'can'>;
  tenantSettings: {
    tenantName: string;
    defaultScreenMode: CareDroidScreenMode;
    enabledScreenModes: CareDroidScreenMode[];
    readOnlyDisplayMode: boolean;
    commandCenterMode: boolean;
    wallDisplayRefreshInterval: number;
  };
  aiCopilotContext: {
    enabled: boolean;
    humanReviewRequired: boolean;
    recentMessages: number;
    safetyRule: string;
  };
  moduleStatuses: Array<{ id: string; label: string; enabled: boolean }>;
  recentEvents: EmergencyStoreState['workflowLogs'];
  operationalSummary: {
    generatedAt: string;
    metrics: Array<{
      key:
        | 'patientsToday'
        | 'waiting'
        | 'longestWait'
        | 'emsInbound'
        | 'reassessmentsDue'
        | 'capacityScore'
        | 'boarders'
        | 'referralsPending';
      label: string;
      value: string | number;
      source: string;
      tone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
    }>;
  };
};

type BackendCentralNodePayload = {
  node?: unknown;
  generatedAt?: unknown;
  patientsToday?: unknown;
  activePatients?: unknown;
  waitingPatients?: unknown;
  longestWait?: unknown;
  averageWait?: unknown;
  emsInbound?: unknown;
  emsPressure?: unknown;
  reassessmentsDue?: unknown;
  capacityStatus?: unknown;
  boarders?: unknown;
  boardingRisk?: unknown;
  referralsPending?: unknown;
  operationalAlerts?: unknown;
  queueMetrics?: unknown;
  recentEvents?: unknown;
  tenantSettings?: unknown;
  enabledModules?: unknown;
};

type BackendCentralNodeEnvelope = {
  generatedAt?: unknown;
  data?: BackendCentralNodePayload;
};

function localDateKey(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function minutesSince(value?: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function formatWaitMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function patientDisplayName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn;
}

function patientFlags(patient: Patient): string[] {
  return (patient.flags || []).map((flag) => String(flag));
}

function isHighRisk(patient: Patient): boolean {
  const flags = patientFlags(patient);
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    flags.includes(PatientFlag.HighRisk) ||
    flags.includes(PatientFlag.DeteriorationRisk) ||
    flags.includes(PatientFlag.SepsisAlert)
  );
}

function isBoarding(patient: Patient): boolean {
  const flags = patientFlags(patient);
  return (
    patient.state === PatientState.Admission ||
    patient.state === PatientState.Disposition ||
    flags.includes(PatientFlag.PendingAdmission)
  );
}

function isReferralPending(referral: Referral): boolean {
  return !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(referral.status);
}

function activePatients(source: CareDroidCentralNodeSource): Patient[] {
  return source.patients.filter((patient) => patient.state !== PatientState.Discharge);
}

function toPatientReference(patient: Patient): CareDroidPatientReference {
  return {
    id: patient.id,
    displayName: patientDisplayName(patient),
    mrn: patient.mrn,
    state: String(patient.state),
    priority: patient.priority,
    chiefComplaint: patient.chiefComplaint || patient.complaint,
    waitMinutes: minutesSince(patient.arrivalTime),
    flags: patientFlags(patient),
    assignedStaffId: patient.assignedStaffId || undefined,
    roomId: patient.roomId || undefined,
  };
}

function pressureFromCount(count: number, critical = false): CareDroidPressure {
  if (critical || count >= 4) return 'critical';
  if (count >= 2) return 'strained';
  if (count === 1) return 'watch';
  return 'normal';
}

function resolveScreenMode(
  source: CareDroidCentralNodeSource,
  roleContext: CareDroidCentralNodeRoleContext,
  override?: CareDroidScreenMode,
): CareDroidScreenMode {
  const configured = override || source.emergencySettings.defaultScreenMode;
  if (configured && CARE_DROID_SCREEN_MODE_CONFIG[configured as CareDroidScreenMode]) {
    return configured as CareDroidScreenMode;
  }
  if (source.emergencySettings.readOnlyDisplayMode || roleContext.readOnly) return CARE_DROID_SCREEN_MODES.readOnly;
  return CARE_DROID_SCREEN_MODES.chargeNurse;
}

function buildQueueHealth(source: CareDroidCentralNodeSource) {
  const patients = activePatients(source);
  const states = [
    PatientState.Arrival,
    PatientState.Registration,
    PatientState.Triage,
    PatientState.Waiting,
    PatientState.Assessment,
    PatientState.Orders,
    PatientState.Results,
    PatientState.Disposition,
    PatientState.Admission,
  ];
  const targetByState: Record<string, number> = {
    Arrival: 5,
    Registration: 10,
    Triage: 10,
    Waiting: Number(source.emergencySettings.thresholds?.waitWarningMinutes || 45),
    Assessment: 45,
    Orders: 60,
    Results: 90,
    Disposition: 60,
    Admission: Number(source.emergencySettings.boardingThresholds?.escalationMinutes || 120),
  };

  return states.map((state) => {
    const rows = patients.filter((patient) => patient.state === state);
    const oldestWaitMinutes = rows.reduce(
      (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
      0,
    );
    const targetMinutes = targetByState[state] || 45;
    return {
      id: String(state).toLowerCase(),
      label: String(state),
      count: rows.length,
      oldestWaitMinutes,
      targetMinutes,
      breached: rows.length > 0 && oldestWaitMinutes > targetMinutes,
    };
  });
}

function buildOperationalSummary(snapshot: Omit<CareDroidCentralNodeSnapshot, 'operationalSummary'>) {
  return {
    generatedAt: snapshot.generatedAt,
    metrics: [
      {
        key: 'patientsToday' as const,
        label: 'Patients Today',
        value: snapshot.currentDepartmentStatus.patientsToday,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.currentDepartmentStatus`,
        tone: 'info' as const,
      },
      {
        key: 'waiting' as const,
        label: 'Waiting',
        value: snapshot.currentDepartmentStatus.waitingPatients,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.queueHealth`,
        tone: snapshot.currentDepartmentStatus.waitingPatients ? ('warning' as const) : ('success' as const),
      },
      {
        key: 'longestWait' as const,
        label: 'Longest Wait',
        value: formatWaitMinutes(snapshot.currentDepartmentStatus.longestWait),
        source: `${CARE_DROID_CENTRAL_NODE_ID}.currentDepartmentStatus`,
        tone:
          snapshot.currentDepartmentStatus.longestWait >= 60
            ? ('critical' as const)
            : snapshot.currentDepartmentStatus.longestWait >= 30
              ? ('warning' as const)
              : ('neutral' as const),
      },
      {
        key: 'emsInbound' as const,
        label: 'EMS Inbound',
        value: snapshot.emsPressure.inbound,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.emsPressure`,
        tone: snapshot.emsPressure.inbound ? ('warning' as const) : ('success' as const),
      },
      {
        key: 'reassessmentsDue' as const,
        label: 'Reassessments Due',
        value: snapshot.reassessmentStatus.due,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.reassessmentStatus`,
        tone: snapshot.reassessmentStatus.due ? ('critical' as const) : ('success' as const),
      },
      {
        key: 'capacityScore' as const,
        label: 'Capacity Score',
        value: `${snapshot.capacityStatus.score} ${snapshot.capacityStatus.band}`,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.capacityStatus`,
        tone:
          snapshot.capacityStatus.band === 'Red'
            ? ('critical' as const)
            : snapshot.capacityStatus.band === 'Orange' || snapshot.capacityStatus.band === 'Yellow'
              ? ('warning' as const)
              : ('success' as const),
      },
      {
        key: 'boarders' as const,
        label: 'Boarders',
        value: snapshot.boardingStatus.boarders,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.boardingStatus`,
        tone: snapshot.boardingStatus.boarders ? ('warning' as const) : ('success' as const),
      },
      {
        key: 'referralsPending' as const,
        label: 'Referrals Pending',
        value: snapshot.referralStatus.pending,
        source: `${CARE_DROID_CENTRAL_NODE_ID}.referralStatus`,
        tone: snapshot.referralStatus.pending ? ('warning' as const) : ('success' as const),
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function pressureOr(value: unknown, fallback: CareDroidPressure): CareDroidPressure {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'strained') return 'strained';
  if (normalized === 'watch') return 'watch';
  if (normalized === 'normal') return 'normal';
  return fallback;
}

function extractBackendCentralNodePayload(
  backendSnapshot: unknown,
): { payload: BackendCentralNodePayload; generatedAt: string } | null {
  if (!isRecord(backendSnapshot)) return null;
  const envelope = backendSnapshot as BackendCentralNodeEnvelope;
  const rawPayload = isRecord(envelope.data) ? envelope.data : backendSnapshot;
  if (!isRecord(rawPayload) || rawPayload.node !== CARE_DROID_CENTRAL_NODE_ID) return null;

  return {
    payload: rawPayload as BackendCentralNodePayload,
    generatedAt: stringOr(rawPayload.generatedAt ?? envelope.generatedAt, new Date().toISOString()),
  };
}

function normalizeBackendCapacity(
  value: unknown,
  fallback: EmergencyStoreState['capacity'],
  generatedAt: string,
): EmergencyStoreState['capacity'] {
  if (!isRecord(value)) return fallback;
  const band = ['Green', 'Yellow', 'Orange', 'Red'].includes(String(value.band))
    ? (String(value.band) as EmergencyStoreState['capacity']['band'])
    : fallback.band;

  return {
    ...fallback,
    ...(value as Partial<EmergencyStoreState['capacity']>),
    score: finiteNumber(value.score, fallback.score),
    band,
    totalPatients: finiteNumber(value.totalPatients, fallback.totalPatients),
    occupiedRooms: finiteNumber(value.occupiedRooms, fallback.occupiedRooms),
    boardingCount: finiteNumber(value.boardingCount, fallback.boardingCount),
    reassessmentDue: finiteNumber(value.reassessmentDue, fallback.reassessmentDue),
    updatedAt: stringOr(value.updatedAt, generatedAt),
  };
}

function normalizeBackendQueueMetrics(
  value: unknown,
  fallback: CareDroidCentralNodeSnapshot['queueHealth'],
): CareDroidCentralNodeSnapshot['queueHealth'] {
  if (!Array.isArray(value)) return fallback;
  const rows = value.filter(isRecord).map((metric, index) => {
    const label = stringOr(metric.label, `Queue ${index + 1}`);
    return {
      id: stringOr(metric.id, label.toLowerCase().replace(/\s+/g, '-')),
      label,
      count: finiteNumber(metric.count, 0),
      oldestWaitMinutes: finiteNumber(metric.oldestWaitMinutes, 0),
      targetMinutes: finiteNumber(metric.targetMinutes, 0),
      breached: Boolean(metric.breached),
    };
  });
  return rows.length ? rows : fallback;
}

function normalizeBackendAlerts(value: unknown, fallback: Alert[], generatedAt: string): Alert[] {
  if (!Array.isArray(value)) return fallback;
  const alerts = value.filter(isRecord).map((alert, index) => {
    const severity = ['Info', 'Warning', 'Critical'].includes(String(alert.severity))
      ? (String(alert.severity) as Alert['severity'])
      : 'Info';
    return {
      id: stringOr(alert.id, `backend-alert-${index + 1}`),
      type: stringOr(alert.type, 'System'),
      severity,
      title: stringOr(alert.title, 'Operational alert'),
      message: stringOr(alert.message, 'Backend central node alert.'),
      patientId: typeof alert.patientId === 'string' ? alert.patientId : undefined,
      createdAt: stringOr(alert.createdAt, generatedAt),
      dismissed: Boolean(alert.dismissed),
      source: stringOr(alert.source, 'emergency-os-backend'),
      metadata: isRecord(alert.metadata)
        ? (alert.metadata as Alert['metadata'])
        : undefined,
    };
  });
  return alerts.length ? alerts : fallback;
}

function normalizeBackendTenantSettings(
  value: unknown,
  fallback: CareDroidCentralNodeSnapshot['tenantSettings'],
): CareDroidCentralNodeSnapshot['tenantSettings'] {
  if (!isRecord(value)) return fallback;
  const defaultScreenMode = CARE_DROID_SCREEN_MODE_CONFIG[value.defaultScreenMode as CareDroidScreenMode]
    ? (value.defaultScreenMode as CareDroidScreenMode)
    : fallback.defaultScreenMode;
  const enabledScreenModes = Array.isArray(value.enabledScreenModes)
    ? value.enabledScreenModes.filter(
        (mode): mode is CareDroidScreenMode =>
          typeof mode === 'string' && Boolean(CARE_DROID_SCREEN_MODE_CONFIG[mode as CareDroidScreenMode]),
      )
    : fallback.enabledScreenModes;

  return {
    tenantName: stringOr(value.tenantName, fallback.tenantName),
    defaultScreenMode,
    enabledScreenModes: enabledScreenModes.length ? enabledScreenModes : fallback.enabledScreenModes,
    readOnlyDisplayMode:
      typeof value.readOnlyDisplayMode === 'boolean'
        ? value.readOnlyDisplayMode
        : fallback.readOnlyDisplayMode,
    commandCenterMode:
      typeof value.commandCenterMode === 'boolean'
        ? value.commandCenterMode
        : fallback.commandCenterMode,
    wallDisplayRefreshInterval: finiteNumber(
      value.wallDisplayRefreshInterval,
      fallback.wallDisplayRefreshInterval,
    ),
  };
}

function normalizeBackendModuleStatuses(
  payload: BackendCentralNodePayload,
  fallback: CareDroidCentralNodeSnapshot['moduleStatuses'],
): CareDroidCentralNodeSnapshot['moduleStatuses'] {
  const tenantSettings = isRecord(payload.tenantSettings) ? payload.tenantSettings : {};
  const backendModules = Array.isArray(tenantSettings.enabledModules)
    ? tenantSettings.enabledModules
    : [];
  const normalizedModules = backendModules.filter(isRecord).map((module, index) => {
    const id = stringOr(module.id, `backend-module-${index + 1}`);
    const fallbackModule = fallback.find((candidate) => candidate.id === id);
    return {
      id,
      label: stringOr(module.label, fallbackModule?.label || id),
      enabled: typeof module.enabled === 'boolean' ? module.enabled : Boolean(fallbackModule?.enabled),
    };
  });
  if (normalizedModules.length) return normalizedModules;

  const enabledIds = Array.isArray(payload.enabledModules)
    ? new Set(payload.enabledModules.map((id) => String(id)))
    : null;
  if (!enabledIds?.size) return fallback;
  return fallback.map((module) => ({ ...module, enabled: enabledIds.has(module.id) }));
}

function applyBackendCentralNodePayload(
  snapshot: Omit<CareDroidCentralNodeSnapshot, 'operationalSummary'>,
  backendSnapshot: unknown,
): Omit<CareDroidCentralNodeSnapshot, 'operationalSummary'> {
  const backend = extractBackendCentralNodePayload(backendSnapshot);
  if (!backend) return snapshot;

  const { payload, generatedAt } = backend;
  const capacityStatus = normalizeBackendCapacity(payload.capacityStatus, snapshot.capacityStatus, generatedAt);
  const operationalAlerts = normalizeBackendAlerts(payload.operationalAlerts, snapshot.operationalAlerts, generatedAt);
  const emsInbound = finiteNumber(payload.emsInbound, snapshot.emsPressure.inbound);
  const criticalInbound = finiteNumber(
    isRecord(payload.capacityStatus) ? payload.capacityStatus.criticalEmsInboundCount : undefined,
    snapshot.emsPressure.criticalInbound,
  );
  const boarders = finiteNumber(payload.boarders, snapshot.boardingStatus.boarders);

  return {
    ...snapshot,
    generatedAt,
    sync: {
      ...snapshot.sync,
      source: 'backend-snapshot',
      status: 'connected',
      mode: snapshot.sync.mode || 'polling',
      lastSyncedAt: generatedAt,
      stale: false,
      message: 'Central node backend snapshot active.',
    },
    currentDepartmentStatus: {
      ...snapshot.currentDepartmentStatus,
      patientsToday: finiteNumber(payload.patientsToday, snapshot.currentDepartmentStatus.patientsToday),
      activePatients: finiteNumber(payload.activePatients, snapshot.currentDepartmentStatus.activePatients),
      waitingPatients: finiteNumber(payload.waitingPatients, snapshot.currentDepartmentStatus.waitingPatients),
      longestWait: finiteNumber(payload.longestWait, snapshot.currentDepartmentStatus.longestWait),
      averageWait: finiteNumber(payload.averageWait, snapshot.currentDepartmentStatus.averageWait),
      capacityBand: String(capacityStatus.band),
      activeAlerts: operationalAlerts.filter((alert) => !alert.dismissed).length,
    },
    queueHealth: normalizeBackendQueueMetrics(payload.queueMetrics, snapshot.queueHealth),
    emsPressure: {
      inbound: emsInbound,
      criticalInbound,
      status: pressureOr(payload.emsPressure, pressureFromCount(emsInbound, criticalInbound > 0)),
    },
    capacityStatus,
    boardingStatus: {
      boarders,
      risk: pressureOr(payload.boardingRisk, pressureFromCount(boarders)),
    },
    reassessmentStatus: {
      ...snapshot.reassessmentStatus,
      due: finiteNumber(payload.reassessmentsDue, snapshot.reassessmentStatus.due),
    },
    referralStatus: {
      pending: finiteNumber(payload.referralsPending, snapshot.referralStatus.pending),
    },
    operationalAlerts,
    tenantSettings: normalizeBackendTenantSettings(payload.tenantSettings, snapshot.tenantSettings),
    moduleStatuses: normalizeBackendModuleStatuses(payload, snapshot.moduleStatuses),
    recentEvents: Array.isArray(payload.recentEvents)
      ? (payload.recentEvents.filter(isRecord) as unknown as EmergencyStoreState['workflowLogs'])
      : snapshot.recentEvents,
  };
}

export function buildCareDroidCentralNodeSnapshot(
  source: CareDroidCentralNodeSource,
  roleContext: CareDroidCentralNodeRoleContext,
  options: {
    screenMode?: CareDroidScreenMode;
    source?: 'store' | 'backend-snapshot';
    backendSnapshot?: unknown;
  } = {},
): CareDroidCentralNodeSnapshot {
  const generatedAt = new Date().toISOString();
  const active = activePatients(source);
  const waiting = active.filter((patient) => patient.state === PatientState.Waiting);
  const waits = active.map((patient) => minutesSince(patient.arrivalTime));
  const activeAlerts = source.alerts.filter((alert) => !alert.dismissed);
  const emsInbound =
    source.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length +
    source.emsIncomingPatients.length +
    source.emsUnits.filter((unit) => unit.status === 'Inbound').length +
    active.filter((patient) => patientFlags(patient).includes(PatientFlag.EMSArrival)).length;
  const criticalEms = active.filter(
    (patient) => patientFlags(patient).includes(PatientFlag.EMSArrival) && isHighRisk(patient),
  ).length;
  const boarders = active.filter(isBoarding).length;
  const reassessmentDue = active.filter((patient) =>
    patientFlags(patient).includes(PatientFlag.ReassessmentDue),
  ).length;
  const screenMode = resolveScreenMode(source, roleContext, options.screenMode);
  const screenConfig = CARE_DROID_SCREEN_MODE_CONFIG[screenMode];
  const enabledModes = source.emergencySettings.enabledScreenModes?.filter(
    (mode): mode is CareDroidScreenMode =>
      Boolean(CARE_DROID_SCREEN_MODE_CONFIG[mode as CareDroidScreenMode]),
  ) || CARE_DROID_SCREEN_MODE_OPTIONS;
  const lastSyncedAt = source.websocket.lastEventAt || source.websocket.updatedAt || null;
  const baseSnapshot: Omit<CareDroidCentralNodeSnapshot, 'operationalSummary'> = {
    node: CARE_DROID_CENTRAL_NODE_ID,
    generatedAt,
    sync: {
      source: options.source || 'store',
      status: source.websocket.status || (source.backendAvailable ? 'connected' : 'local'),
      mode: source.websocket.mode || 'polling',
      lastSyncedAt,
      stale: !lastSyncedAt || minutesSince(lastSyncedAt) > 2,
      message:
        source.websocket.message ||
        (source.backendAvailable ? 'Central node synced.' : 'Local snapshot active.'),
    },
    currentDepartmentStatus: {
      patientsToday: source.patients.filter((patient) => localDateKey(patient.arrivalTime) === localDateKey())
        .length,
      activePatients: active.length,
      waitingPatients: waiting.length,
      longestWait: waits.reduce((max, wait) => Math.max(max, wait), 0),
      averageWait: waits.length ? Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length) : 0,
      capacityBand: source.capacity.band,
      activeAlerts: activeAlerts.length,
    },
    activePatientFlow: {
      patients: active.map(toPatientReference),
      criticalPatients: active.filter(isHighRisk).map(toPatientReference),
    },
    queueHealth: buildQueueHealth(source),
    emsPressure: {
      inbound: emsInbound,
      criticalInbound: criticalEms,
      status: pressureFromCount(emsInbound, criticalEms > 0),
    },
    capacityStatus: source.capacity,
    boardingStatus: {
      boarders,
      risk: pressureFromCount(
        boarders,
        boarders >= Number(source.emergencySettings.boardingThresholds?.maxBoarders || 8),
      ),
    },
    reassessmentStatus: {
      due: reassessmentDue,
      overdue: active.filter(
        (patient) =>
          patientFlags(patient).includes(PatientFlag.ReassessmentDue) &&
          minutesSince(patient.arrivalTime) >
            Number(source.emergencySettings.thresholds?.reassessmentIntervals?.P3 || 60),
      ).length,
    },
    referralStatus: {
      pending: source.referrals.filter(isReferralPending).length,
    },
    operationalAlerts: activeAlerts,
    screenContext: {
      mode: screenMode,
      config: screenConfig,
      sensitiveDataRedacted: screenConfig.publicDisplay,
    },
    roleContext: {
      role: roleContext.role,
      roleLabel: roleContext.roleLabel,
      readOnly: roleContext.readOnly || screenConfig.readOnly,
      allowedRoutes: roleContext.allowedRoutes,
    },
    tenantSettings: {
      tenantName: source.emergencySettings.tenantName,
      defaultScreenMode:
        (CARE_DROID_SCREEN_MODE_CONFIG[
          source.emergencySettings.defaultScreenMode as CareDroidScreenMode
        ]
          ? (source.emergencySettings.defaultScreenMode as CareDroidScreenMode)
          : CARE_DROID_SCREEN_MODES.chargeNurse),
      enabledScreenModes: enabledModes,
      readOnlyDisplayMode: Boolean(source.emergencySettings.readOnlyDisplayMode),
      commandCenterMode: Boolean(source.emergencySettings.commandCenterMode),
      wallDisplayRefreshInterval: Number(source.emergencySettings.wallDisplayRefreshInterval || 30000),
    },
    aiCopilotContext: {
      enabled: Boolean(source.emergencySettings.aiSettings?.enabled),
      humanReviewRequired: source.emergencySettings.aiSettings?.humanReviewRequired !== false,
      recentMessages: source.copilotMessages.length,
      safetyRule: 'Human review is required for clinical decisions and actions.',
    },
    moduleStatuses: source.emergencySettings.enabledModules || [],
    recentEvents: source.workflowLogs.slice(0, 12),
  };

  const wiredSnapshot = applyBackendCentralNodePayload(baseSnapshot, options.backendSnapshot);
  const snapshot = {
    ...wiredSnapshot,
    operationalSummary: buildOperationalSummary(wiredSnapshot),
  };

  return snapshot.screenContext.sensitiveDataRedacted
    ? redactCentralNodeSnapshotForScreenMode(snapshot, screenMode)
    : snapshot;
}

export function redactCentralNodeSnapshotForScreenMode(
  snapshot: CareDroidCentralNodeSnapshot,
  screenMode: CareDroidScreenMode = snapshot.screenContext.mode,
): CareDroidCentralNodeSnapshot {
  const config = CARE_DROID_SCREEN_MODE_CONFIG[screenMode];
  if (!config.publicDisplay) return snapshot;

  const redactPatient = (patient: CareDroidPatientReference): CareDroidPatientReference => ({
    id: patient.id,
    displayName: `Patient ${patient.id.slice(-4).toUpperCase()}`,
    state: patient.state,
    priority: patient.priority,
    waitMinutes: patient.waitMinutes,
    flags: [],
  });

  return {
    ...snapshot,
    activePatientFlow: {
      patients: snapshot.activePatientFlow.patients.map(redactPatient),
      criticalPatients: snapshot.activePatientFlow.criticalPatients.map(redactPatient),
    },
    operationalAlerts: snapshot.operationalAlerts.map((alert) => ({
      id: alert.id,
      type: 'System',
      severity: alert.severity,
      title: 'Operational alert',
      message: 'Sensitive clinical details hidden for public display.',
      createdAt: alert.createdAt,
      dismissed: alert.dismissed,
      source: alert.source || 'central-node-redaction',
    })),
    recentEvents: [],
    screenContext: {
      mode: screenMode,
      config,
      sensitiveDataRedacted: true,
    },
    roleContext: {
      ...snapshot.roleContext,
      readOnly: true,
    },
  };
}
