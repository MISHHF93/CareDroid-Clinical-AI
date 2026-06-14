import { create, type StoreApi, type UseBoundStore } from 'zustand';
import {
  Alert,
  ActiveShift,
  BoardingStatus,
  CapacityHistoryEntry,
  CapacitySnapshot,
  CriticalChecklistRecord,
  EmsUnit,
  EMSArrival,
  EmergencyFeatureFlags,
  JourneyEvent,
  Note,
  Patient,
  PatientFlag,
  PatientFlagRecord,
  PatientState,
  Priority,
  QueueSummary,
  ReassessmentReminder,
  Referral,
  Room,
  Staff,
  StaffingRequest,
  Vitals,
  WorkflowActionLog,
  WorkflowActionType,
} from '../types/emergency';
import { resolveCriticalChecklistConfig } from '../config/criticalChecklists';
import {
  ED_SCENARIO_DEMO_MODES,
  buildSrcEmergencyScenarioState,
  getInitialEdScenarioId,
  persistEdScenarioId,
} from '../data/edScenarioFixtures';
import {
  FEATURE_REGISTRY,
  FEATURE_REGISTRY_BY_ID,
  type Feature,
  type FeatureTier,
} from '../../lib/features/featureRegistry';
import {
  fetchSettingsFeatureFlags,
  subscribeToSettingsFeatureChanges,
  updateSettingsFeatureFlag,
} from '../services/emergencySettingsApi';
import {
  fetchBoardingStatus,
  fetchCapacityStatus,
  fetchEMSIntake,
  fetchEmergencyAnalytics,
  fetchEmergencyQueues,
  fetchEmergencyWhiteboard,
  fetchEmergencyWorkflowLogs,
  fetchReassessmentQueue,
  fetchReferrals,
} from '../services/emergencyOsApi';
import {
  DEFAULT_CENTRAL_CONTROL_SETTINGS,
  DEFAULT_EMERGENCY_ALERT_RULES,
  DEFAULT_EMERGENCY_CTAS_TARGETS,
  DEFAULT_EMERGENCY_MODULES,
  buildEmergencySettingsPatchFromThresholds,
} from '../config/emergencySettings.config';
import { syncEmergencyAuditEvent } from '../services/emergencyStaffingApi';
import { calculateNews2FromVitals } from '../utils/news2';
import { calculateEmergencyOsCapacity } from '../../lib/emergency-os/logic';

export function tMinus(mins: number): string {
  return new Date(Date.now() - mins * 60000).toISOString();
}

const SEED_PATIENTS: Patient[] = [
  {
    id: 'p1',
    mrn: 'ED-001234',
    firstName: 'Marcus',
    lastName: 'Chen',
    dob: '1965-03-14',
    age: 59,
    sex: 'M',
    arrivalTime: tMinus(95),
    chiefComplaint: 'Chest pain radiating to left arm',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [
      {
        hr: 102,
        sbp: 148,
        dbp: 92,
        spo2: 96,
        temp: 36.8,
        rr: 18,
        gcs: 15,
        pain: 7,
        recordedAt: tMinus(80),
        recordedBy: 's1',
      },
    ],
    flags: [PatientFlag.HighRisk],
    assignedStaffId: 's1',
    roomId: 'r3',
    notes: [],
    timeline: [],
  },

  {
    id: 'p2',
    mrn: 'ED-001235',
    firstName: 'Sarah',
    lastName: 'Okafor',
    dob: '1989-07-22',
    age: 35,
    sex: 'F',
    arrivalTime: tMinus(45),
    chiefComplaint: 'Shortness of breath, wheezing',
    complaintCategory: 'Respiratory',
    state: PatientState.Orders,
    priority: Priority.P3,
    vitals: [
      {
        hr: 115,
        sbp: 118,
        dbp: 76,
        spo2: 93,
        temp: 37.1,
        rr: 24,
        gcs: 15,
        pain: 5,
        recordedAt: tMinus(35),
        recordedBy: 's2',
      },
    ],
    flags: [],
    assignedStaffId: 's2',
    roomId: 'r7',
    notes: [],
    timeline: [],
  },

  {
    id: 'p3',
    mrn: 'ED-001236',
    firstName: 'Dorothy',
    lastName: 'Walsh',
    dob: '1948-11-03',
    age: 76,
    sex: 'F',
    arrivalTime: tMinus(180),
    chiefComplaint: 'Confusion, fever',
    complaintCategory: 'Sepsis',
    state: PatientState.Results,
    priority: Priority.P2,
    vitals: [
      {
        hr: 118,
        sbp: 88,
        dbp: 54,
        spo2: 94,
        temp: 38.9,
        rr: 22,
        gcs: 13,
        pain: 3,
        recordedAt: tMinus(30),
        recordedBy: 's1',
      },
    ],
    flags: [PatientFlag.DeteriorationRisk, PatientFlag.SepsisAlert],
    assignedStaffId: 's1',
    roomId: 'r2',
    notes: [],
    timeline: [],
  },

  {
    id: 'p4',
    mrn: 'ED-001237',
    firstName: 'James',
    lastName: 'Tremblay',
    dob: '1978-05-19',
    age: 46,
    sex: 'M',
    arrivalTime: tMinus(62),
    chiefComplaint: 'Abdominal pain right lower quadrant',
    complaintCategory: 'Abdominal',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [
      {
        hr: 96,
        sbp: 124,
        dbp: 80,
        spo2: 98,
        temp: 37.9,
        rr: 16,
        gcs: 15,
        pain: 8,
        recordedAt: tMinus(55),
        recordedBy: 's3',
      },
    ],
    flags: [PatientFlag.ReassessmentDue],
    assignedStaffId: 's3',
    notes: [],
    timeline: [],
  },

  {
    id: 'p5',
    mrn: 'ED-001238',
    firstName: 'Amara',
    lastName: 'Singh',
    dob: '2018-02-14',
    age: 6,
    sex: 'F',
    arrivalTime: tMinus(28),
    chiefComplaint: 'Fever 39.8C, difficulty breathing',
    complaintCategory: 'Pediatric',
    state: PatientState.Triage,
    priority: Priority.P2,
    vitals: [
      {
        hr: 142,
        sbp: 98,
        dbp: 62,
        spo2: 95,
        temp: 39.8,
        rr: 34,
        gcs: 15,
        pain: 6,
        recordedAt: tMinus(20),
        recordedBy: 's3',
      },
    ],
    flags: [],
    assignedStaffId: 's2',
    notes: [],
    timeline: [],
  },

  {
    id: 'p6',
    mrn: 'ED-001239',
    firstName: 'Evan',
    lastName: 'MacDonald',
    dob: '1996-09-08',
    age: 28,
    sex: 'M',
    arrivalTime: tMinus(38),
    chiefComplaint: 'Deep forearm laceration from kitchen knife',
    complaintCategory: 'Trauma',
    state: PatientState.Waiting,
    priority: Priority.P4,
    vitals: [
      {
        hr: 84,
        sbp: 126,
        dbp: 78,
        spo2: 99,
        temp: 36.7,
        rr: 14,
        gcs: 15,
        pain: 6,
        recordedAt: tMinus(30),
        recordedBy: 's2',
      },
    ],
    flags: [],
    assignedStaffId: 's2',
    notes: [],
    timeline: [],
  },

  {
    id: 'p7',
    mrn: 'ED-001240',
    firstName: 'Nadia',
    lastName: 'Farah',
    dob: '2002-12-01',
    age: 22,
    sex: 'F',
    arrivalTime: tMinus(74),
    chiefComplaint: 'Twisted ankle playing soccer, unable to bear weight',
    complaintCategory: 'Orthopedic',
    state: PatientState.Orders,
    priority: Priority.P4,
    vitals: [
      {
        hr: 78,
        sbp: 112,
        dbp: 70,
        spo2: 100,
        temp: 36.6,
        rr: 14,
        gcs: 15,
        pain: 7,
        recordedAt: tMinus(68),
        recordedBy: 's3',
      },
    ],
    flags: [PatientFlag.LongWait],
    assignedStaffId: 's3',
    roomId: 'r11',
    notes: [],
    timeline: [],
  },

  {
    id: 'p8',
    mrn: 'ED-001241',
    firstName: 'Helen',
    lastName: 'Kowalski',
    dob: '1954-04-27',
    age: 70,
    sex: 'F',
    arrivalTime: tMinus(120),
    chiefComplaint: 'Burning urination, fever, flank discomfort',
    complaintCategory: 'Infection',
    state: PatientState.Results,
    priority: Priority.P3,
    vitals: [
      {
        hr: 104,
        sbp: 132,
        dbp: 74,
        spo2: 97,
        temp: 38.2,
        rr: 18,
        gcs: 15,
        pain: 5,
        recordedAt: tMinus(50),
        recordedBy: 's1',
      },
    ],
    flags: [PatientFlag.ReassessmentDue],
    assignedStaffId: 's1',
    roomId: 'r8',
    notes: [],
    timeline: [],
  },

  {
    id: 'p9',
    mrn: 'ED-001242',
    firstName: 'Luis',
    lastName: 'Martinez',
    dob: '1983-01-30',
    age: 41,
    sex: 'M',
    arrivalTime: tMinus(52),
    chiefComplaint: 'Acute low back pain after lifting at work',
    complaintCategory: 'Musculoskeletal',
    state: PatientState.Waiting,
    priority: Priority.P4,
    vitals: [
      {
        hr: 82,
        sbp: 136,
        dbp: 84,
        spo2: 98,
        temp: 36.9,
        rr: 16,
        gcs: 15,
        pain: 8,
        recordedAt: tMinus(45),
        recordedBy: 's2',
      },
    ],
    flags: [],
    assignedStaffId: 's2',
    notes: [],
    timeline: [],
  },

  {
    id: 'p10',
    mrn: 'ED-001243',
    firstName: 'Mei',
    lastName: 'Li',
    dob: '1991-06-18',
    age: 33,
    sex: 'F',
    arrivalTime: tMinus(18),
    chiefComplaint: 'Diffuse itchy rash after new antibiotic',
    complaintCategory: 'Allergy',
    state: PatientState.Registration,
    priority: Priority.P4,
    vitals: [
      {
        hr: 88,
        sbp: 118,
        dbp: 72,
        spo2: 99,
        temp: 36.8,
        rr: 16,
        gcs: 15,
        pain: 2,
        recordedAt: tMinus(12),
        recordedBy: 's3',
      },
    ],
    flags: [],
    notes: [],
    timeline: [],
  },

  {
    id: 'p11',
    mrn: 'ED-001244',
    firstName: 'Robert',
    lastName: 'Baptiste',
    dob: '1960-10-09',
    age: 64,
    sex: 'M',
    arrivalTime: tMinus(83),
    chiefComplaint: 'Severe headache with blood pressure 204/112',
    complaintCategory: 'Hypertension',
    state: PatientState.Assessment,
    priority: Priority.P3,
    vitals: [
      {
        hr: 92,
        sbp: 204,
        dbp: 112,
        spo2: 97,
        temp: 36.5,
        rr: 18,
        gcs: 15,
        pain: 6,
        recordedAt: tMinus(70),
        recordedBy: 's1',
      },
    ],
    flags: [PatientFlag.HighRisk],
    assignedStaffId: 's1',
    roomId: 'r4',
    notes: [],
    timeline: [],
  },

  {
    id: 'p12',
    mrn: 'ED-001245',
    firstName: 'Alyssa',
    lastName: 'Green',
    dob: '1999-08-11',
    age: 25,
    sex: 'F',
    arrivalTime: tMinus(210),
    chiefComplaint: 'Psychiatric hold, suicidal ideation, medically stable',
    complaintCategory: 'Mental Health',
    state: PatientState.Disposition,
    priority: Priority.P3,
    vitals: [
      {
        hr: 90,
        sbp: 122,
        dbp: 78,
        spo2: 99,
        temp: 36.7,
        rr: 16,
        gcs: 15,
        pain: 0,
        recordedAt: tMinus(60),
        recordedBy: 's2',
      },
    ],
    flags: [PatientFlag.PendingAdmission, PatientFlag.LongWait],
    assignedStaffId: 's2',
    roomId: 'r12',
    notes: [],
    timeline: [],
  },
];

const SEED_STAFF: Staff[] = [
  { id: 's1', name: 'Dr. Priya Nair', role: 'MD', active: true },
  { id: 's2', name: 'Maya Thompson', role: 'RN', active: true },
  { id: 's3', name: 'Owen Clarke', role: 'Charge', active: true },
];

const SEED_ROOMS: Room[] = [
  { id: 'r1', name: 'Resus 1', type: 'Resus', status: 'Available' },
  { id: 'r2', name: 'Resus 2', type: 'Resus', status: 'Occupied', patientId: 'p3' },
  { id: 'r3', name: 'Treatment 3', type: 'Treatment', status: 'Occupied', patientId: 'p1' },
  { id: 'r4', name: 'Treatment 4', type: 'Treatment', status: 'Occupied', patientId: 'p11' },
  { id: 'r5', name: 'Treatment 5', type: 'Treatment', status: 'Available' },
  { id: 'r6', name: 'Treatment 6', type: 'Treatment', status: 'Available' },
  { id: 'r7', name: 'Treatment 7', type: 'Treatment', status: 'Occupied', patientId: 'p2' },
  { id: 'r8', name: 'Treatment 8', type: 'Treatment', status: 'Occupied', patientId: 'p8' },
  { id: 'r9', name: 'Treatment 9', type: 'Treatment', status: 'Available' },
  { id: 'r10', name: 'Treatment 10', type: 'Treatment', status: 'Blocked' },
  { id: 'r11', name: 'Fast Track 1', type: 'Treatment', status: 'Occupied', patientId: 'p7' },
  {
    id: 'r12',
    name: 'Mental Health Hold',
    type: 'Isolation',
    status: 'Occupied',
    patientId: 'p12',
  },
  { id: 'r13', name: 'Isolation 1', type: 'Isolation', status: 'Available' },
  { id: 'r14', name: 'Waiting Area A', type: 'Waiting', status: 'Occupied' },
  { id: 'r15', name: 'Waiting Area B', type: 'Waiting', status: 'Available' },
];

const SEED_SHIFT: ActiveShift = {
  id: 'shift-day-ed',
  label: 'ED Day Shift',
  startTime: tMinus(180),
  status: 'Open',
  chargeStaffId: 's3',
};

const SEED_EMS_UNITS: EmsUnit[] = [
  { id: 'ems-12', unitNumber: 'EMS 12', etaMinutes: 7, status: 'Inbound', acuity: Priority.P2 },
  { id: 'ems-18', unitNumber: 'EMS 18', etaMinutes: 14, status: 'Inbound', acuity: Priority.P3 },
];

const SEED_REFERRALS: Referral[] = [
  {
    id: 'ref-p12-psych',
    patientId: 'p12',
    service: 'Mental Health',
    status: 'Delayed',
    createdAt: tMinus(110),
    summary: 'Awaiting inpatient psychiatric disposition review.',
  },
];

const DEFAULT_FEATURES: EmergencyFeatureFlags = {
  whiteboard: true,
  ems: true,
  referrals: true,
  capacity: true,
  tools: true,
  shift: true,
  settings: true,
  copilot: true,
};

type FeatureFlags = Record<string, boolean>;
type FeatureOverrides = Record<string, boolean>;
type FeaturePersistenceMode = 'backend' | 'local';

export type EmergencyThresholds = {
  waitTimeWarningMin: number;
  waitTimeCtiticalMin: number;
  capacityWarningPct: number;
  capacityOrangePct: number;
  capacityRedPct: number;
  emsOffloadTargetMin: number;
  reassessP1Min: number;
  reassessP2Min: number;
  reassessP3Min: number;
  reassessP4Min: number;
  reassessP5Min: number;
};

export type EmergencyThresholdKey = keyof EmergencyThresholds;

export type EmergencyAuditLogEntry = {
  id: string;
  action: string;
  patientId?: string;
  staffId: string;
  timestamp: string;
  details: Record<string, unknown>;
};

export const DEFAULT_EMERGENCY_THRESHOLDS: EmergencyThresholds = {
  waitTimeWarningMin: 45,
  waitTimeCtiticalMin: 60,
  capacityWarningPct: 0.7,
  capacityOrangePct: 0.8,
  capacityRedPct: 0.9,
  emsOffloadTargetMin: 15,
  reassessP1Min: 0,
  reassessP2Min: 15,
  reassessP3Min: 30,
  reassessP4Min: 60,
  reassessP5Min: 120,
};

export type EmergencyCapacityColor = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export type EmergencyWebSocketConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';
export type CopilotSafetyStatus = 'safe' | 'caution' | 'unsafe' | 'blocked' | 'unknown';

export type EmergencyRecord = Record<string, unknown> & { id: string };
export type EmsIncomingPatient = Partial<EMSArrival> & EmergencyRecord;
export type EmergencyBoardingPatient = Partial<Patient> &
  EmergencyRecord & {
  boardingMinutes?: number;
  boardTimeMinutes?: number;
  boardingStatus?: BoardingStatus;
};

export type EmergencyRecommendation = {
  id?: string;
  title?: string;
  message?: string;
  action?: string;
  priority?: string;
} & Record<string, unknown>;

export type EmergencyCapacityMetrics = {
  score: number;
  color: EmergencyCapacityColor;
  triggers: string[];
  recommendations: EmergencyRecommendation[];
  updatedAt: string | null;
  raw: unknown;
};

export type EmergencyBoardingMetrics = {
  medianBoardTimeMinutes: number;
  patientsBoarding: EmergencyBoardingPatient[];
  exceedingThresholds: EmergencyBoardingPatient[];
  updatedAt: string | null;
  raw: unknown;
};

export type EmergencySurgeStatus = {
  active: boolean;
  event: EmergencyRecord | null;
  activatedAt: string | null;
  updatedAt: string | null;
};

export type EmergencyCopilotMessage = {
  id: string;
  query: string;
  response: string;
  safetyStatus: CopilotSafetyStatus;
  createdAt: string;
  raw?: unknown;
};

export type EmergencyUiState = {
  loading: boolean;
  error: string | null;
  selectedPatientId: string | null;
};

export type EmergencyWebSocketStatus = {
  connected: boolean;
  status: EmergencyWebSocketConnectionState;
  mode?: 'websocket' | 'sse' | 'polling' | string;
  url: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastEventAt: string | null;
  updatedAt?: string | null;
  message?: string;
  error: string | null;
};

export type EmergencyIntegrationEvent = {
  id: string;
  type: string;
  payload: unknown;
  receivedAt: string;
};

export type EmergencyRealtimeEvent = {
  type?: string;
  event?: string;
  name?: string;
  topic?: string;
  payload?: unknown;
  data?: unknown;
  record?: unknown;
} & Record<string, unknown>;

export type EmergencyDashboardRefreshResult = {
  whiteboard?: unknown;
  capacity?: unknown;
  boarding?: unknown;
  ems?: unknown;
  queues?: unknown;
  reassessment?: unknown;
  referrals?: unknown;
  workflowLogs?: unknown;
  errors: Record<string, string>;
};

export type ActivateSurgePayload = {
  type?: string;
  estimatedPatientCount?: number;
  reason?: string;
  activatedBy?: string;
} & Record<string, unknown>;

export type CopilotQueryOptions = {
  userRole?: string;
  context?: Record<string, unknown>;
} & Record<string, unknown>;

const FEATURE_STORE_STORAGE_KEY = 'caredroid.emergency.featureStore.v1';
const PULSE_LAST_VIEW_STORAGE_KEY = 'caredroid.ed.departmentPulse.lastView.v1';
const DEFAULT_TIER: FeatureTier = 'professional';
const COPILOT_STORAGE_LIMIT = 50;
const INTEGRATION_EVENT_LIMIT = 100;
const DEFAULT_BOARDING_THRESHOLD_MINUTES = 240;
const TIER_RANK: Record<FeatureTier, number> = {
  core: 0,
  professional: 1,
  enterprise: 2,
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const nowIso = () => new Date().toISOString();

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const AUDIT_LOG_LIMIT = 200;

const asRecord = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asEntityList = <T = unknown>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (isObject(value)) return [value as T];
  return [];
};

const stringFrom = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const numberFrom = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pctFrom = (value: unknown, fallback: number): number => {
  const parsed = numberFrom(value, Number.NaN);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed > 1 ? parsed / 100 : parsed;
};

function thresholdsFromSettings(
  settings: unknown,
  base: EmergencyThresholds = DEFAULT_EMERGENCY_THRESHOLDS,
): EmergencyThresholds {
  const record = asRecord(settings);
  const thresholds = asRecord(record.thresholds);
  const capacityThresholds = asRecord(record.capacityThresholds);
  const reassessmentThresholds = asRecord(record.reassessmentThresholds);
  const reassessmentIntervals = asRecord(thresholds.reassessmentIntervals);
  const emsThresholds = asRecord(record.emsThresholds);

  return {
    waitTimeWarningMin: numberFrom(
      thresholds.waitWarningMinutes ?? record.waitTimeWarningMin,
      base.waitTimeWarningMin,
    ),
    waitTimeCtiticalMin: numberFrom(
      thresholds.waitCriticalMinutes ?? record.waitTimeCtiticalMin,
      base.waitTimeCtiticalMin,
    ),
    capacityWarningPct: pctFrom(
      thresholds.capacityWarningPercent ?? record.capacityWarningPct,
      base.capacityWarningPct,
    ),
    capacityOrangePct: pctFrom(
      thresholds.capacityOrangePercent ??
        capacityThresholds.warningPercent ??
        record.capacityOrangePct,
      base.capacityOrangePct,
    ),
    capacityRedPct: pctFrom(
      thresholds.capacityRedPercent ?? capacityThresholds.criticalPercent ?? record.capacityRedPct,
      base.capacityRedPct,
    ),
    emsOffloadTargetMin: numberFrom(
      thresholds.emsOffloadTargetMinutes ??
        emsThresholds.offloadTargetMinutes ??
        record.emsOffloadTargetMin,
      base.emsOffloadTargetMin,
    ),
    reassessP1Min: numberFrom(
      reassessmentIntervals.P1 ?? reassessmentThresholds.P1 ?? record.reassessP1Min,
      base.reassessP1Min,
    ),
    reassessP2Min: numberFrom(
      reassessmentIntervals.P2 ?? reassessmentThresholds.P2 ?? record.reassessP2Min,
      base.reassessP2Min,
    ),
    reassessP3Min: numberFrom(
      reassessmentIntervals.P3 ?? reassessmentThresholds.P3 ?? record.reassessP3Min,
      base.reassessP3Min,
    ),
    reassessP4Min: numberFrom(
      reassessmentIntervals.P4 ?? reassessmentThresholds.P4 ?? record.reassessP4Min,
      base.reassessP4Min,
    ),
    reassessP5Min: numberFrom(
      reassessmentIntervals.P5 ?? reassessmentThresholds.P5 ?? record.reassessP5Min,
      base.reassessP5Min,
    ),
  };
}

function settingsPatchFromThresholds(
  thresholds: EmergencyThresholds,
): Partial<EmergencyOsSettings> {
  return buildEmergencySettingsPatchFromThresholds(thresholds) as Partial<EmergencyOsSettings>;
}

function createAuditLogEntry(input: {
  action: string;
  patientId?: string;
  staffId?: string | null;
  details?: Record<string, unknown>;
}): EmergencyAuditLogEntry {
  return {
    id: createId(`audit-${input.action}`),
    action: input.action,
    patientId: input.patientId,
    staffId: input.staffId || 'system',
    timestamp: nowIso(),
    details: input.details || {},
  };
}

function appendAuditLog(
  existing: EmergencyAuditLogEntry[],
  input: Parameters<typeof createAuditLogEntry>[0] | null | undefined,
): EmergencyAuditLogEntry[] {
  if (!input) return existing;
  return [createAuditLogEntry(input), ...existing].slice(0, AUDIT_LOG_LIMIT);
}

const getNested = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => asRecord(current)[key], source);

const firstValue = (source: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const unwrapData = (value: unknown): unknown => {
  const record = asRecord(value);
  return record.data ?? record.result ?? record.payload ?? value;
};

const stableId = (prefix: string, source: unknown, index = 0): string => {
  const record = asRecord(source);
  const candidate =
    record.id ??
    record.patientId ??
    record.patient_id ??
    record.mrn ??
    record.unitId ??
    record.unit_id ??
    record.eventId;
  return stringFrom(candidate) || `${prefix}-${Date.now()}-${index}`;
};

const normalizeStringList = (value: unknown): string[] =>
  asArray(value)
    .map(
      (item) =>
        stringFrom(item) || stringFrom(asRecord(item).label) || stringFrom(asRecord(item).title),
    )
    .filter((item): item is string => Boolean(item));

const normalizeRecommendation = (value: unknown, index: number): EmergencyRecommendation => {
  if (isObject(value)) return { id: stringFrom(value.id) || `recommendation-${index}`, ...value };
  return {
    id: `recommendation-${index}`,
    message: stringFrom(value) || 'Review Emergency OS recommendation.',
  };
};

const normalizeCapacityColor = (value: unknown, score = 0): EmergencyCapacityColor => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('red') || normalized.includes('critical')) return 'red';
  if (normalized.includes('orange') || normalized.includes('high')) return 'orange';
  if (normalized.includes('yellow') || normalized.includes('moderate')) return 'yellow';
  if (normalized.includes('green') || normalized.includes('normal') || normalized.includes('low'))
    return 'green';
  if (score >= 85) return 'red';
  if (score >= 70) return 'orange';
  if (score >= 45) return 'yellow';
  if (score > 0) return 'green';
  return 'unknown';
};

const normalizeCapacityMetrics = (raw: unknown): EmergencyCapacityMetrics => {
  const data = unwrapData(raw);
  const source = firstValue(data, ['capacity', 'capacityMetrics', 'capacityEngine']) ?? data;
  const score = numberFrom(firstValue(source, ['score', 'capacityScore', 'capacityPressure']), 0);
  return {
    score,
    color: normalizeCapacityColor(
      firstValue(source, ['color', 'riskLevel', 'band', 'label']),
      score,
    ),
    triggers: normalizeStringList(
      firstValue(source, ['triggers', 'thresholdSignals', 'signals', 'deductions']) ??
        firstValue(data, ['triggers', 'signals']),
    ),
    recommendations: asArray(firstValue(source, ['recommendations', 'nextRecommendedActions'])).map(
      normalizeRecommendation,
    ),
    updatedAt: stringFrom(firstValue(source, ['updatedAt', 'generatedAt'])) || nowIso(),
    raw,
  };
};

const normalizeBoardingPatient = (value: unknown, index = 0): EmergencyBoardingPatient => ({
  ...asRecord(value),
  id: stableId('boarding-patient', value, index),
  boardingMinutes: numberFrom(
    firstValue(value, ['boardingMinutes', 'boardTimeMinutes', 'boardingTime', 'waitMinutes']),
    0,
  ),
});

const normalizeBoardingMetrics = (raw: unknown): EmergencyBoardingMetrics => {
  const data = unwrapData(raw);
  const source = firstValue(data, ['boarding', 'boardingMetrics', 'metrics']) ?? data;
  const patients = asArray(
    firstValue(data, ['patientsBoarding', 'boardingPatients', 'boardedPatients', 'boarders']) ??
      firstValue(source, ['patientsBoarding', 'boardingPatients', 'boardedPatients', 'boarders']),
  ).map(normalizeBoardingPatient);
  const explicitExceeding = asArray(
    firstValue(data, ['exceedingThresholds', 'thresholdBreaches']) ??
      firstValue(source, ['exceedingThresholds', 'thresholdBreaches']),
  ).map(normalizeBoardingPatient);
  return {
    medianBoardTimeMinutes: numberFrom(
      firstValue(source, [
        'medianBoardTimeMinutes',
        'medianBoardTime',
        'medianBoardingMinutes',
        'boardingTime',
        'averageBoardTime',
      ]),
      0,
    ),
    patientsBoarding: patients,
    exceedingThresholds: explicitExceeding.length
      ? explicitExceeding
      : patients.filter(
          (patient) =>
            numberFrom(patient.boardingMinutes ?? patient.boardTimeMinutes, 0) >=
            DEFAULT_BOARDING_THRESHOLD_MINUTES,
        ),
    updatedAt: stringFrom(firstValue(source, ['updatedAt', 'generatedAt'])) || nowIso(),
    raw,
  };
};

const normalizeEmsIncomingPatient = (value: unknown, index = 0): EmsIncomingPatient => ({
  ...asRecord(value),
  id: stableId('ems', value, index),
});

const extractEmsIncomingPatients = (raw: unknown): EmsIncomingPatient[] => {
  const data = unwrapData(raw);
  const candidate =
    (Array.isArray(data) && data) ||
    firstValue(data, [
      'incomingPatients',
      'emsIncomingPatients',
      'emsArrivals',
      'arrivals',
      'patients',
      'queue.incomingPatients',
    ]);
  return asArray(candidate).map(normalizeEmsIncomingPatient);
};

const extractQueueSummaries = (raw: unknown): EmergencyQueueSummary[] => {
  const data = unwrapData(raw);
  const queues = asArray(firstValue(data, ['queues', 'queueRows', 'queueMetrics']));
  return queues
    .map((queue, index) => {
      const record = asRecord(queue);
      const label = stringFrom(firstValue(record, ['label', 'name', 'type'])) || `Queue ${index + 1}`;
      return {
        ...record,
        id: stringFrom(record.id) || `queue-${label.toLowerCase().replace(/\s+/g, '-')}`,
        label,
        count: numberFrom(
          firstValue(record, ['count', 'patientCount']) ?? asArray(record.patients).length,
          0,
        ),
      } as EmergencyQueueSummary;
    })
    .filter((queue) => Boolean(queue.label));
};

const normalizeReferralStatus = (status: unknown): Referral['status'] => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('accepted')) return 'Accepted';
  if (normalized.includes('complete') || normalized.includes('closed')) return 'Completed';
  if (normalized.includes('declined')) return 'Declined';
  if (normalized.includes('delay')) return 'Delayed';
  if (normalized.includes('info')) return 'InfoRequested';
  if (normalized.includes('draft')) return 'Draft';
  return 'Sent';
};

const extractReferrals = (raw: unknown): Referral[] => {
  const data = unwrapData(raw);
  const candidates = firstValue(data, ['referrals']) ?? firstValue(data, ['referral']);
  return asEntityList(candidates).map((referral, index) => {
    const record = asRecord(referral);
    const patient = asRecord(record.patient);
    const patientId =
      stringFrom(record.patientId) || stringFrom(patient.id) || `backend-referral-patient-${index + 1}`;
    const elapsedMinutes = numberFrom(record.elapsedMinutes, 0);
    const priority = stringFrom(patient.priority);
    const requestedAt =
      stringFrom(firstValue(record, ['requestedAt', 'createdAt'])) ||
      new Date(Date.now() - Math.max(0, elapsedMinutes) * 60000).toISOString();
    const targetDepartment =
      stringFrom(firstValue(record, ['targetDepartment', 'specialty', 'department', 'service'])) ||
      'Other';

    return {
      id: stringFrom(record.id) || `backend-referral-${patientId}`,
      patientId,
      targetDepartment,
      service: stringFrom(record.service) || targetDepartment,
      urgency:
        stringFrom(record.urgency) ||
        (priority === Priority.P1 || priority === Priority.P2 ? 'Emergent' : 'Urgent'),
      reason:
        stringFrom(record.reason) ||
        stringFrom(patient.chiefComplaint) ||
        'Specialty review requested.',
      clinicalSummary:
        stringFrom(record.clinicalSummary) ||
        stringFrom(record.summary) ||
        `${stringFrom(patient.firstName) || 'Unknown'} ${stringFrom(patient.lastName) || 'patient'}: ${
          stringFrom(patient.chiefComplaint) || 'review requested'
        }`,
      workflow: stringFrom(record.workflow) || 'Referral',
      status: normalizeReferralStatus(record.status),
      requestedAt,
      respondedAt: stringFrom(record.respondedAt) || undefined,
      responseNote: stringFrom(record.responseNote) || undefined,
      summary:
        stringFrom(record.summary) ||
        stringFrom(record.reason) ||
        stringFrom(patient.chiefComplaint) ||
        'Referral requested.',
    };
  });
};

const normalizeAlertSeverity = (
  value: unknown,
  fallback: Alert['severity'] = 'Info',
): Alert['severity'] => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical') || normalized.includes('red')) return 'Critical';
  if (
    normalized.includes('warning') ||
    normalized.includes('orange') ||
    normalized.includes('yellow') ||
    normalized.includes('strained')
  ) {
    return 'Warning';
  }
  return fallback;
};

const normalizeAlertType = (value: unknown, fallback: Alert['type'] = 'System'): Alert['type'] => {
  const text = stringFrom(value);
  return text || fallback;
};

const normalizeOperationalAlert = (
  value: unknown,
  index: number,
  source: string,
  generatedAt = nowIso(),
): Alert | null => {
  const record = asRecord(value);
  const title =
    stringFrom(firstValue(record, ['title', 'label', 'name'])) || 'Operational alert';
  const message =
    stringFrom(firstValue(record, ['message', 'summary', 'reason', 'description'])) ||
    'Emergency OS operational alert requires review.';
  if (!title && !message) return null;

  return {
    id: stringFrom(record.id) || `${source}-alert-${index + 1}`,
    type: normalizeAlertType(record.type, 'System'),
    severity: normalizeAlertSeverity(record.severity),
    title,
    message,
    patientId: stringFrom(record.patientId) || undefined,
    reminderId: stringFrom(record.reminderId) || undefined,
    actionLabel: stringFrom(record.actionLabel) || undefined,
    actionFn: typeof (value as { actionFn?: unknown }).actionFn === 'function'
      ? (value as { actionFn: () => void }).actionFn
      : undefined,
    actionType: stringFrom(record.actionType) || undefined,
    createdAt: stringFrom(firstValue(record, ['createdAt', 'detectedAt', 'timestamp'])) || generatedAt,
    read: Boolean(record.read),
    acknowledged: Boolean(record.acknowledged),
    acknowledgedAt: stringFrom(record.acknowledgedAt) || undefined,
    dismissed: Boolean(record.dismissed),
    dismissedAt: stringFrom(record.dismissedAt) || undefined,
    autoDismissAfter: Number.isFinite(Number(record.autoDismissAfter))
      ? Number(record.autoDismissAfter)
      : undefined,
    source: stringFrom(record.source) || source,
    metadata: isObject(record.metadata) ? (record.metadata as Alert['metadata']) : undefined,
  };
};

const extractOperationalAlerts = (raw: unknown, source: string): Alert[] => {
  const data = unwrapData(raw);
  const generatedAt =
    stringFrom(firstValue(raw, ['generatedAt'])) ||
    stringFrom(firstValue(data, ['generatedAt'])) ||
    nowIso();
  const candidates =
    firstValue(data, ['alerts', 'operationalAlerts', 'reviewQueue', 'notifications']) ??
    firstValue(raw, ['alerts', 'operationalAlerts']);
  return asArray(candidates)
    .map((alert, index) => normalizeOperationalAlert(alert, index, source, generatedAt))
    .filter((alert): alert is Alert => Boolean(alert));
};

const alertIdentity = (alert: Alert): string =>
  [
    alert.id,
    alert.source,
    alert.type,
    alert.patientId || '',
    alert.title,
    alert.metadata?.dedupeBucket ?? '',
    alert.metadata?.status ?? '',
    alert.metadata?.band ?? '',
  ].join('|');

const mergeEmergencyAlerts = (...groups: Array<Alert[] | undefined>): Alert[] => {
  const merged: Alert[] = [];
  const seen = new Set<string>();
  for (const alert of groups.flatMap((group) => group || [])) {
    const normalized = normalizeOperationalAlert(alert, merged.length, alert.source || 'emergency-store');
    if (!normalized) continue;
    const identity = alertIdentity(normalized);
    if (seen.has(identity)) continue;
    seen.add(identity);
    merged.push(normalized);
  }
  return merged
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 200);
};

const buildCapacityAlert = (raw: unknown): Alert | null => {
  const data = unwrapData(raw);
  const capacity = asRecord(firstValue(data, ['capacity', 'capacityStatus']) ?? data);
  const band = stringFrom(capacity.band || capacity.riskLevel);
  const score = numberFrom(capacity.score, 0);
  if (!(band && ['Orange', 'Red'].includes(band)) && score < 80) return null;

  return {
    id: `capacity-${band || score}`,
    type: 'Capacity',
    severity: band === 'Red' || score >= 90 ? 'Critical' : 'Warning',
    title: band ? `Capacity ${band}` : 'Capacity pressure',
    message: `Score ${score}. Boarding ${numberFrom(capacity.boardingCount, 0)}, reassessment due ${numberFrom(capacity.reassessmentDue ?? capacity.reassessmentDueCount, 0)}.`,
    createdAt: stringFrom(capacity.updatedAt) || nowIso(),
    dismissed: false,
    source: 'capacity-intelligence',
    metadata: { score, band },
  };
};

const buildBoardingAlert = (raw: unknown): Alert | null => {
  const data = unwrapData(raw);
  const patients = asArray(firstValue(data, ['patients', 'boarders', 'boardingPatients']));
  const longestBoardingMinutes = numberFrom(firstValue(data, ['longestBoardingMinutes']), 0);
  if (!patients.length && longestBoardingMinutes <= 0) return null;

  return {
    id: 'boarding-escalation-active',
    type: 'Boarding',
    severity: longestBoardingMinutes >= DEFAULT_BOARDING_THRESHOLD_MINUTES ? 'Critical' : 'Warning',
    title: 'Boarding escalation active',
    message: `${patients.length} boarding patient${patients.length === 1 ? '' : 's'}; longest boarding ${longestBoardingMinutes}min.`,
    createdAt: nowIso(),
    dismissed: false,
    source: 'boarding-intelligence',
    metadata: { boardingCount: patients.length, longestBoardingMinutes },
  };
};

const buildEmsAlert = (raw: unknown): Alert | null => {
  const arrivals = extractEmsIncomingPatients(raw);
  if (!arrivals.length) return null;
  const critical = arrivals.filter((arrival) =>
    /critical|high|p1|resus|stroke|stemi|trauma/i.test(
      [
        arrival.severity,
        arrival.priority,
        arrival.acuity,
        arrival.offloadRisk,
        arrival.chiefComplaint,
        arrival.prearrivalComplaint,
        arrival.complaint,
      ].join(' '),
    ),
  );
  const focused = critical[0] || arrivals[0];
  return {
    id: critical.length ? 'ems-critical-inbound' : 'ems-inbound-active',
    type: 'EMS',
    severity: critical.length ? 'Critical' : 'Warning',
    title: critical.length ? 'Critical EMS inbound' : 'EMS inbound',
    message: `${arrivals.length} inbound EMS signal${arrivals.length === 1 ? '' : 's'}; ${stringFrom(firstValue(focused, ['chiefComplaint', 'prearrivalComplaint', 'complaint'])) || 'complaint pending'}.`,
    patientId: stringFrom(firstValue(focused, ['patientId'])) || undefined,
    createdAt: nowIso(),
    dismissed: false,
    source: 'ems-intake',
    metadata: { inboundCount: arrivals.length, criticalCount: critical.length },
  };
};

const buildReassessmentAlert = (raw: unknown): Alert | null => {
  const data = unwrapData(raw);
  const patients = asArray(firstValue(data, ['patients', 'reassessmentPatients']));
  const overdueCount = numberFrom(firstValue(data, ['overdueCount', 'overdue']), 0);
  if (!patients.length && !overdueCount) return null;

  return {
    id: overdueCount ? 'reassessment-overdue' : 'reassessment-due',
    type: 'Reassessment',
    severity: overdueCount ? 'Critical' : 'Warning',
    title: overdueCount ? 'Reassessment overdue' : 'Reassessment due',
    message: `${patients.length} patient${patients.length === 1 ? '' : 's'} need reassessment${overdueCount ? `; ${overdueCount} overdue` : ''}.`,
    createdAt: nowIso(),
    dismissed: false,
    source: 'reassessment-engine',
    metadata: { patientCount: patients.length, overdueCount },
  };
};

const buildReferralAlert = (referrals: Referral[]): Alert | null => {
  const active = referrals.filter(isPendingReferral);
  if (!active.length) return null;
  const emergent = active.filter((referral) => /emergent|stat/i.test(String(referral.urgency)));
  const transfer = active.filter((referral) => referral.workflow === 'Transfer');
  return {
    id: emergent.length ? 'referrals-emergent-active' : 'referrals-active',
    type: 'Referral',
    severity: emergent.length ? 'Critical' : 'Warning',
    title: emergent.length ? 'Emergent referral pending' : 'Referral queue active',
    message: `${active.length} active referral${active.length === 1 ? '' : 's'}; ${emergent.length} emergent, ${transfer.length} transfer.`,
    patientId: active[0]?.patientId,
    createdAt: nowIso(),
    dismissed: false,
    source: 'referral-intelligence',
    metadata: { activeCount: active.length, emergentCount: emergent.length, transferCount: transfer.length },
  };
};

const buildQueueAlert = (raw: unknown): Alert | null => {
  const queues = extractQueueSummaries(raw);
  const breached = queues.filter((queue) => {
    const record = queue as Record<string, unknown>;
    return Boolean(record.breached) || numberFrom(record.oldestWaitMinutes, 0) > numberFrom(record.targetMinutes, Infinity);
  });
  if (!breached.length) return null;
  const queue = breached[0] as Record<string, unknown>;
  const label = stringFrom(queue.label || queue.name || queue.type) || 'Queue';
  return {
    id: `queue-breach-${label.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'Queue',
    severity: 'Warning',
    title: `${label} queue threshold breached`,
    message: `${numberFrom(queue.count, 0)} patients; oldest wait ${numberFrom(queue.oldestWaitMinutes, 0)}min.`,
    createdAt: nowIso(),
    dismissed: false,
    source: 'queue-intelligence',
    metadata: { queue: label },
  };
};

const extractOperationalAlertsFromEmergencyModules = (payload: EmergencyDashboardRefreshResult): Alert[] => {
  const referrals = extractReferrals(payload.referrals);
  return mergeEmergencyAlerts(
    extractOperationalAlerts(payload.whiteboard, 'emergency-whiteboard'),
    extractOperationalAlerts(payload.capacity, 'capacity-intelligence'),
    extractOperationalAlerts(payload.boarding, 'boarding-intelligence'),
    extractOperationalAlerts(payload.ems, 'ems-intake'),
    extractOperationalAlerts(payload.queues, 'queue-intelligence'),
    extractOperationalAlerts(payload.reassessment, 'reassessment-engine'),
    extractOperationalAlerts(payload.referrals, 'referral-intelligence'),
    [buildCapacityAlert(payload.capacity)].filter((alert): alert is Alert => Boolean(alert)),
    [buildBoardingAlert(payload.boarding)].filter((alert): alert is Alert => Boolean(alert)),
    [buildEmsAlert(payload.ems)].filter((alert): alert is Alert => Boolean(alert)),
    [buildQueueAlert(payload.queues)].filter((alert): alert is Alert => Boolean(alert)),
    [buildReassessmentAlert(payload.reassessment)].filter((alert): alert is Alert => Boolean(alert)),
    [buildReferralAlert(referrals)].filter((alert): alert is Alert => Boolean(alert)),
  );
};

const normalizeRealtimeAlert = (value: unknown, index = 0): Alert => {
  const record = asRecord(value);
  const title =
    stringFrom(firstValue(record, ['title', 'headline', 'subject'])) || 'Emergency OS alert';
  const message =
    stringFrom(firstValue(record, ['message', 'body', 'summary', 'description'])) ||
    title;
  return {
    id: stringFrom(record.id) || stableId('alert-realtime', value, index),
    type: stringFrom(firstValue(record, ['type', 'alertType', 'category'])) || 'System',
    severity: normalizeAlertSeverity(firstValue(record, ['severity', 'priority', 'level', 'type'])),
    title,
    message,
    patientId: stringFrom(firstValue(record, ['patientId', 'patient.id'])) || undefined,
    reminderId: stringFrom(record.reminderId) || undefined,
    actionLabel: stringFrom(record.actionLabel) || undefined,
    actionType: stringFrom(record.actionType) || undefined,
    createdAt:
      stringFrom(firstValue(record, ['createdAt', 'timestamp', 'receivedAt'])) || nowIso(),
    dismissed: Boolean(record.dismissed),
    dismissedAt: stringFrom(record.dismissedAt) || undefined,
    autoDismissAfter: Number.isFinite(Number(record.autoDismissAfter))
      ? Number(record.autoDismissAfter)
      : undefined,
    source: stringFrom(record.source) || 'emergency-realtime',
    metadata: asRecord(record.metadata) as Alert['metadata'],
  };
};

const extractRealtimeAlerts = (raw: unknown): Alert[] => {
  const data = unwrapData(raw);
  const alerts = firstValue(data, ['alerts', 'operationalAlerts', 'notifications']);
  return asArray(alerts).map(normalizeRealtimeAlert);
};

const normalizeWorkflowActionType = (value: unknown): WorkflowActionType => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.:/-]+/g, '_');
  return (normalized && normalized in workflowTitles
    ? normalized
    : 'integration_event_received') as WorkflowActionType;
};

const normalizeWorkflowLog = (value: unknown, index = 0): WorkflowActionLog => {
  const record = asRecord(value);
  const type = normalizeWorkflowActionType(firstValue(record, ['type', 'event', 'name', 'topic']));
  const title = stringFrom(record.title) || workflowTitles[type];
  const summary =
    stringFrom(firstValue(record, ['summary', 'message', 'description'])) ||
    `${title} received from Emergency OS realtime.`;
  return createWorkflowLog({
    id: stringFrom(record.id) || stableId('workflow-realtime', value, index),
    type,
    title,
    summary,
    timestamp:
      stringFrom(firstValue(record, ['timestamp', 'createdAt', 'receivedAt'])) || nowIso(),
    actorStaffId: stringFrom(record.actorStaffId) || undefined,
    actorName: stringFrom(record.actorName) || undefined,
    patientId:
      stringFrom(firstValue(record, ['patientId', 'patient.id', 'referral.patientId'])) ||
      undefined,
    source: stringFrom(record.source) || 'emergency-realtime',
    severity: normalizeAlertSeverity(record.severity),
    status: (stringFrom(record.status) as WorkflowActionLog['status']) || 'recorded',
    metadata: asRecord(record.metadata) as WorkflowActionLog['metadata'],
  });
};

const extractRealtimeWorkflowLogs = (raw: unknown): WorkflowActionLog[] => {
  const data = unwrapData(raw);
  const logs = firstValue(data, ['workflowLogs', 'workflow_logs', 'recentEvents', 'logs']);
  return asArray(logs).map(normalizeWorkflowLog);
};

const buildRealtimeHydrationPayload = (
  raw: unknown,
): Parameters<EmergencyStoreState['hydrateFromApi']>[0] => {
  const data = unwrapData(raw);
  const record = asRecord(data);
  const whiteboard = asRecord(firstValue(record, ['whiteboard', 'emergencyWhiteboard']) ?? record);
  const patients = asEntityList<Patient>(
    firstValue(whiteboard, ['patients']) ?? firstValue(whiteboard, ['patient']),
  );
  const staff = asArray<Staff>(firstValue(whiteboard, ['staff']));
  const rooms = asArray<Room>(firstValue(whiteboard, ['rooms']));
  const alerts = extractRealtimeAlerts(whiteboard);
  const workflowLogs = extractRealtimeWorkflowLogs(whiteboard);
  const referrals = extractReferrals(whiteboard);
  const queues = extractQueueSummaries(whiteboard);
  const emsArrivals = extractEmsIncomingPatients(whiteboard) as unknown as EMSArrival[];
  const capacity = firstValue(whiteboard, ['capacity', 'capacityStatus']) as
    | CapacitySnapshot
    | undefined;
  const emergencySettings = firstValue(whiteboard, [
    'emergencySettings',
    'settings',
    'tenantSettings',
  ]) as Partial<EmergencyOsSettings> | undefined;

  return {
    patients: patients.length ? patients : undefined,
    staff: staff.length ? staff : undefined,
    rooms: rooms.length ? rooms : undefined,
    alerts: alerts.length ? alerts : undefined,
    workflowLogs: workflowLogs.length ? workflowLogs : undefined,
    capacity,
    referrals: referrals.length ? referrals : undefined,
    queues: queues.length ? queues : undefined,
    emsArrivals: emsArrivals.length ? emsArrivals : undefined,
    emergencySettings,
  };
};

const mergeById = <T extends { id: string }>(incoming: T[] | undefined, existing: T[]): T[] => {
  if (!incoming?.length) return existing;
  const incomingIds = new Set(incoming.map((item) => item.id));
  return [...incoming, ...existing.filter((item) => !incomingIds.has(item.id))];
};

const mergeWorkflowLogs = (
  incoming: WorkflowActionLog[] | undefined,
  existing: WorkflowActionLog[],
): WorkflowActionLog[] => {
  if (!incoming?.length) return existing;
  return mergeById(incoming, existing).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

const emptyCapacityMetrics = (): EmergencyCapacityMetrics => ({
  score: 0,
  color: 'unknown',
  triggers: [],
  recommendations: [],
  updatedAt: null,
  raw: null,
});

const emptyBoardingMetrics = (): EmergencyBoardingMetrics => ({
  medianBoardTimeMinutes: 0,
  patientsBoarding: [],
  exceedingThresholds: [],
  updatedAt: null,
  raw: null,
});

const emptySurgeStatus = (): EmergencySurgeStatus => ({
  active: false,
  event: null,
  activatedAt: null,
  updatedAt: null,
});

const emptyUiState = (): EmergencyUiState => ({
  loading: false,
  error: null,
  selectedPatientId: null,
});

const emptyWebSocketStatus = (): EmergencyWebSocketStatus => ({
  connected: false,
  status: 'idle',
  url: null,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  lastEventAt: null,
  updatedAt: null,
  message: '',
  error: null,
});

const capCopilotMessages = (messages: EmergencyCopilotMessage[]): EmergencyCopilotMessage[] =>
  messages.slice(-COPILOT_STORAGE_LIMIT);

function isFeatureAvailableForTier(feature: Feature, tier: FeatureTier): boolean {
  return TIER_RANK[feature.tier] <= TIER_RANK[tier];
}

const isDevelopmentMode = () =>
  Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

function defaultEnabledForFeature(feature: Feature, tier: FeatureTier): boolean {
  if (feature.tier === 'core') return true;
  if (!isFeatureAvailableForTier(feature, tier)) return false;
  if (feature.id === 'simulation_engine') return isDevelopmentMode();
  if (feature.tier === 'professional' && isDevelopmentMode()) return true;
  return feature.defaultEnabled;
}

export function buildDefaultFlags(tier: FeatureTier = DEFAULT_TIER): FeatureFlags {
  return Object.fromEntries(
    FEATURE_REGISTRY.map((feature) => [feature.id, defaultEnabledForFeature(feature, tier)]),
  );
}

function resolveEffectiveFlag(
  featureId: string,
  flags: FeatureFlags,
  overrides: FeatureOverrides,
  tier: FeatureTier,
  visited = new Set<string>(),
): boolean {
  const feature = FEATURE_REGISTRY_BY_ID[featureId];
  if (!feature || visited.has(featureId)) return false;
  if (!isFeatureAvailableForTier(feature, tier)) return false;
  visited.add(featureId);
  const dependenciesEnabled = feature.dependencies.every((dependencyId) =>
    resolveEffectiveFlag(dependencyId, flags, overrides, tier, new Set(visited)),
  );
  if (!dependenciesEnabled) return false;
  if (feature.tier === 'core') return true;
  return Object.prototype.hasOwnProperty.call(overrides, featureId)
    ? Boolean(overrides[featureId])
    : Boolean(flags[featureId]);
}

function dependentEnabledFeatures(
  featureId: string,
  flags: FeatureFlags,
  overrides: FeatureOverrides,
  tier: FeatureTier,
): Feature[] {
  return FEATURE_REGISTRY.filter(
    (feature) =>
      feature.dependencies.includes(featureId) &&
      resolveEffectiveFlag(feature.id, flags, overrides, tier),
  );
}

function normalizeTier(value: unknown, fallback: FeatureTier = DEFAULT_TIER): FeatureTier {
  return value === 'core' || value === 'professional' || value === 'enterprise' ? value : fallback;
}

function normalizeBackendFlags(payload: unknown): FeatureOverrides {
  const record = asRecord(payload);
  const flagsRecord = asRecord(record.flags);
  if (record.flags && isObject(record.flags)) {
    return Object.fromEntries(
      Object.entries(flagsRecord)
        .filter(([featureId]) => FEATURE_REGISTRY_BY_ID[String(featureId)])
        .map(([featureId, enabled]) => [String(featureId), Boolean(enabled)]),
    );
  }

  return asArray(record.flags)
    .filter(
      (flag) => FEATURE_REGISTRY_BY_ID[String(asRecord(flag).id || asRecord(flag).featureId || '')],
    )
    .reduce<FeatureOverrides>((acc, flag) => {
      const row = asRecord(flag);
      const featureId = String(row.id || row.featureId);
      const state = String(row.state || '').toLowerCase();
      acc[featureId] =
        typeof row.enabled === 'boolean' ? row.enabled : state !== 'disabled' && state !== 'false';
      return acc;
    }, {});
}

function normalizeSyncPayload(payload: unknown) {
  const wrapper = asRecord(payload);
  const row = asRecord(wrapper.new ?? wrapper.record ?? wrapper.data ?? payload);
  const featureId = String(
    row.featureId || row.feature_id || row.flagId || row.flag_id || '',
  ).trim();
  if (!FEATURE_REGISTRY_BY_ID[featureId]) return null;
  return {
    featureId,
    enabled:
      typeof row.enabled === 'boolean'
        ? row.enabled
        : String(row.state || row.enabled || '').toLowerCase() === 'enabled',
    changedBy:
      stringFrom(row.changedByName) ||
      stringFrom(row.changed_by_name) ||
      stringFrom(row.staffName) ||
      stringFrom(row.staff_name) ||
      stringFrom(row.changedBy) ||
      stringFrom(row.changed_by) ||
      undefined,
    tier: normalizeTier(row.tier, DEFAULT_TIER),
  };
}

type FeatureSnapshot = {
  flags: FeatureFlags;
  overrides: FeatureOverrides;
  tier: FeatureTier;
  lastSynced: Date | null;
};

function readLocalFeatureSnapshot(): Partial<FeatureSnapshot> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(FEATURE_STORE_STORAGE_KEY) || '{}');
    return {
      flags: isObject(parsed.flags) ? (parsed.flags as FeatureFlags) : undefined,
      overrides: isObject(parsed.overrides) ? (parsed.overrides as FeatureOverrides) : undefined,
      tier: parsed.tier && parsed.tier in TIER_RANK ? parsed.tier : undefined,
      lastSynced: parsed.lastSynced ? new Date(parsed.lastSynced) : null,
    };
  } catch (_error) {
    return {};
  }
}

function writeLocalFeatureSnapshot(state: FeatureSnapshot) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    FEATURE_STORE_STORAGE_KEY,
    JSON.stringify({
      flags: state.flags,
      overrides: state.overrides,
      tier: state.tier,
      lastSynced: state.lastSynced?.toISOString() || null,
    }),
  );
}

function readLastPulseViewTimestamp(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PULSE_LAST_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const candidate =
      typeof parsed === 'number'
        ? parsed
        : numberFrom(parsed?.timestamp ?? parsed?.lastVisitedAt, Number.NaN);
    if (Number.isFinite(candidate)) return candidate;
    const viewedAt = stringFrom(parsed?.viewedAt);
    const parsedDate = viewedAt ? Date.parse(viewedAt) : Number.NaN;
    return Number.isFinite(parsedDate) ? parsedDate : null;
  } catch (_error) {
    const raw = localStorage.getItem(PULSE_LAST_VIEW_STORAGE_KEY);
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric;
    const parsedDate = raw ? Date.parse(raw) : Number.NaN;
    return Number.isFinite(parsedDate) ? parsedDate : null;
  }
}

function writeLastPulseViewTimestamp(timestamp: number) {
  if (typeof localStorage === 'undefined' || !Number.isFinite(timestamp)) return;
  localStorage.setItem(
    PULSE_LAST_VIEW_STORAGE_KEY,
    JSON.stringify({
      timestamp,
      viewedAt: new Date(timestamp).toISOString(),
    }),
  );
}

function persistFeatureOverride(featureId: string, enabled: boolean, changedBy?: string) {
  return updateSettingsFeatureFlag({
    featureId,
    enabled,
    changedBy: changedBy || 'current-user',
    timestamp: nowIso(),
  });
}

function auditFeatureToggle(
  featureId: string,
  enabled: boolean,
  metadata: Record<string, unknown> = {},
) {
  void syncEmergencyAuditEvent({
    action: 'feature_toggle',
    resourceType: 'feature',
    resourceId: featureId,
    timestamp: nowIso(),
    metadata: {
      enabled,
      ...metadata,
    },
  });
}

function createPatientTimelineEvent(
  patient: Patient,
  type: NonNullable<JourneyEvent['type']>,
  summary: string,
  options: Partial<JourneyEvent> = {},
): JourneyEvent {
  const staffId = options.staffId || patient.assignedStaffId || 'system';
  return {
    id: options.id || createId('journey'),
    type,
    from: options.from,
    to: options.to || patient.state,
    timestamp: options.timestamp || new Date().toISOString(),
    staffId,
    actorStaffId: options.actorStaffId || staffId,
    note: options.note || summary,
    summary,
    metadata: options.metadata,
  };
}

const workflowTitles: Record<WorkflowActionType, string> = {
  patient_created: 'Patient created',
  journey_state_changed: 'Journey state changed',
  clinician_assigned: 'Clinician assigned',
  reassessment_created: 'Reassessment created',
  reassessment_completed: 'Reassessment completed',
  ems_arrival_created: 'EMS arrival created',
  ems_converted_to_patient: 'EMS converted to patient',
  capacity_score_changed: 'Capacity score changed',
  boarding_started: 'Boarding started',
  staffing_request_created: 'Staffing request created',
  referral_created: 'Referral created',
  copilot_used: 'Copilot used',
  provincial_data_viewed: 'Provincial data viewed',
  integration_event_received: 'Integration event received',
};

type WorkflowActionInput = Omit<
  WorkflowActionLog,
  'id' | 'timestamp' | 'title' | 'severity' | 'status' | 'source' | 'metadata'
> &
  Partial<
    Pick<
      WorkflowActionLog,
      'id' | 'timestamp' | 'title' | 'severity' | 'status' | 'source' | 'metadata'
    >
  >;

function createWorkflowLog(input: WorkflowActionInput): WorkflowActionLog {
  const timestamp = input.timestamp || new Date().toISOString();
  return {
    id: input.id || createId(`workflow-${input.type}`),
    type: input.type,
    title: input.title || workflowTitles[input.type],
    summary: input.summary,
    timestamp,
    actorStaffId: input.actorStaffId,
    actorName: input.actorName,
    patientId: input.patientId,
    source: input.source || 'emergency-os-ui',
    severity: input.severity || 'Info',
    status: input.status || 'recorded',
    metadata: input.metadata || {},
  };
}

function appendWorkflowLogs(
  existingLogs: WorkflowActionLog[],
  inputs: Array<WorkflowActionInput | null | undefined>,
): WorkflowActionLog[] {
  const logs = inputs
    .filter(Boolean)
    .map((input) => createWorkflowLog(input as WorkflowActionInput));
  return [...logs, ...existingLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function workflowLogFromJourneyEvent(
  event: JourneyEvent,
  patient: Patient,
  staff: Staff[] = [],
): WorkflowActionLog {
  const actor = staff.find((member) => member.id === event.staffId);
  return createWorkflowLog({
    id: `workflow-from-${event.id}`,
    type: 'journey_state_changed',
    title: 'Journey state changed',
    summary: event.note || `Moved patient from ${event.from || 'previous state'} to ${event.to}.`,
    timestamp: event.timestamp,
    patientId: patient.id,
    actorStaffId: event.staffId,
    actorName: actor?.name,
    source: 'patient-timeline',
    metadata: {
      journeyEventId: event.id,
      fromState: event.from || null,
      toState: event.to,
    },
  });
}

function buildCapacitySnapshot(patients: Patient[], rooms: Room[]): CapacitySnapshot {
  const occupiedRooms = rooms.filter((room) => room.status === 'Occupied').length;
  const boardingCount = patients.filter((patient) =>
    [PatientState.Admission, PatientState.Disposition].includes(patient.state),
  ).length;
  const reassessmentDue = patients.filter((patient) =>
    patient.flags.includes(PatientFlag.ReassessmentDue),
  ).length;
  const waitingCount = patients.filter((patient) => patient.state === PatientState.Waiting).length;
  const dischargeReadyCount = patients.filter((patient) => patient.state === PatientState.Disposition).length;
  const criticalEmsInboundCount = patients.filter(
    (patient) =>
      patient.flags.includes(PatientFlag.EMSArrival) &&
      (patient.priority === Priority.P1 || patient.priority === Priority.P2),
  ).length;
  const result = calculateEmergencyOsCapacity({
    totalPatients: patients.length,
    occupiedRooms,
    totalRooms: rooms.length,
    boardingCount,
    reassessmentDue,
    waitingCount,
    dischargeReadyCount,
    criticalEmsInboundCount,
  });
  const { score, band } = result;

  return {
    score,
    band,
    label: `${band} capacity`,
    riskLevel: band,
    totalPatients: patients.length,
    occupiedRooms,
    boardingCount,
    reassessmentDue,
    currentOccupancy: occupiedRooms,
    maxCapacity: rooms.length,
    occupancyPercent: result.occupancyPercent,
    waitingCount,
    dischargeReadyCount,
    incomingEMSCriticalCount: criticalEmsInboundCount,
    deductions: result.factors.map((factor) => ({
      id: factor.id,
      label: factor.label,
      value: factor.points,
    })),
    updatedAt: result.updatedAt,
  };
}

function selectEMSPreparationRoom(rooms: Room[]): Room | undefined {
  return (
    rooms.find((room) => room.status === 'Available' && ['Resus', 'Resuscitation'].includes(room.type)) ||
    rooms.find((room) => room.status === 'Available' && room.type === 'Treatment') ||
    rooms.find((room) => room.status === 'Available')
  );
}

function roomLabel(rooms: Room[], roomId?: string): string | undefined {
  if (!roomId) return undefined;
  return rooms.find((room) => room.id === roomId)?.name;
}

function prepareCriticalChecklist(
  arrival: EMSArrival,
  rooms: Room[],
  timestamp = nowIso(),
): { arrival: EMSArrival; rooms: Room[]; reservedRoom?: Room } {
  const checklistConfig = resolveCriticalChecklistConfig(arrival);
  if (!checklistConfig || arrival.criticalChecklist) {
    return { arrival, rooms };
  }

  const reservedRoom = selectEMSPreparationRoom(rooms);
  const assignedRoomId = reservedRoom?.id || arrival.preparedRoomId;
  const criticalChecklist: CriticalChecklistRecord = {
    type: checklistConfig.type,
    title: checklistConfig.title,
    triggeredAt: timestamp,
    assignedRoomId,
    assignedRoomName: roomLabel(rooms, assignedRoomId),
    completions: [],
  };

  return {
    arrival: {
      ...arrival,
      preparedRoomId: assignedRoomId || arrival.preparedRoomId,
      criticalChecklist,
    },
    rooms: reservedRoom
      ? rooms.map((room) =>
          room.id === reservedRoom.id
            ? { ...room, status: 'Reserved' as const, currentPatientId: null }
            : room,
        )
      : rooms,
    reservedRoom,
  };
}

function emsArrivalToPatient(arrival: EMSArrival, timestamp = nowIso()): Patient {
  const patientId = arrival.patientId || createId('patient-ems');
  const savedChecklist = arrival.criticalChecklist?.completedAt
    ? { ...arrival.criticalChecklist, savedToPatientAt: timestamp }
    : arrival.criticalChecklist;
  const vitals = arrival.vitals
    ? [
        {
          ...arrival.vitals,
          recordedAt: arrival.vitals.recordedAt || timestamp,
          recordedBy: arrival.unitName,
        },
      ]
    : [];

  const patient: Patient = {
    id: patientId,
    mrn: `EMS-${arrival.id.toUpperCase()}`,
    firstName: 'EMS',
    lastName: `Patient ${arrival.patientAge}`,
    dob: new Date(timestamp).toISOString().slice(0, 10),
    age: arrival.patientAge,
    sex: arrival.patientSex,
    arrivalTime: timestamp,
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: arrival.chiefComplaint || arrival.prearrivalComplaint,
    complaint: arrival.prearrivalComplaint,
    complaintCategory: 'EMS',
    state: PatientState.Arrival,
    priority: arrival.priority,
    vitals,
    flags: [
      PatientFlag.EMSArrival,
      ...(arrival.priority === Priority.P1 || arrival.priority === Priority.P2
        ? [PatientFlag.HighRisk]
        : []),
    ],
    assignedStaffId: null,
    roomId: arrival.preparedRoomId,
    notes: [
      {
        id: createId('ems-note'),
        type: 'System',
        body: `${arrival.unitName} handoff created from EMS pipeline. ${arrival.notes || ''}`.trim(),
        authorId: 'ems',
        createdAt: timestamp,
      },
    ],
    timeline: [],
    source: 'EMS',
    emsUnitId: arrival.unitId,
    emsArrival: arrival,
    criticalChecklist: savedChecklist,
  };

  patient.timeline = [
    createPatientTimelineEvent(patient, 'Arrival', `EMS arrival from ${arrival.unitName}.`, {
      timestamp,
      metadata: { emsArrivalId: arrival.id, unitId: arrival.unitId },
    }),
    savedChecklist?.completedAt
      ? createPatientTimelineEvent(
          patient,
          'EMSCriticalChecklistSaved',
          `${savedChecklist.title} saved to patient record.`,
          {
            timestamp,
            metadata: {
              emsArrivalId: arrival.id,
              checklistType: savedChecklist.type,
              completedAt: savedChecklist.completedAt,
            },
          },
        )
      : null,
  ].filter(Boolean) as JourneyEvent[];

  return patient;
}

function buildLocalEmergencyAnalytics(
  state: Pick<EmergencyStoreState, 'patients' | 'capacity' | 'activeShift'>,
) {
  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 86_400_000;
  const patientArrivalMs = (patient: Patient) => {
    const arrivalMs = new Date(patient.arrivalTime).getTime();
    return Number.isFinite(arrivalMs) ? arrivalMs : nowMs;
  };
  const waitMinutes = state.patients.map((patient) =>
    Math.max(0, Math.round((nowMs - patientArrivalMs(patient)) / 60000)),
  );
  const averageWaitMinutes = waitMinutes.length
    ? Math.round(waitMinutes.reduce((sum, wait) => sum + wait, 0) / waitMinutes.length)
    : 0;
  const complaintCounts = new Map<string, number>();

  state.patients.forEach((patient) => {
    const complaint = patient.complaintCategory || patient.chiefComplaint || 'Other';
    complaintCounts.set(complaint, (complaintCounts.get(complaint) || 0) + 1);
  });

  const dailyVolume = Array.from({ length: 7 }, (_, index) => {
    const dayStart = nowMs - (6 - index) * dayMs;
    const dayEnd = dayStart + dayMs;
    return {
      date: new Date(dayStart).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      count: state.patients.filter((patient) => {
        const arrival = patientArrivalMs(patient);
        return arrival >= dayStart && arrival < dayEnd;
      }).length,
    };
  });
  const hourlyArrivals = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    count: state.patients.filter((patient) => new Date(patientArrivalMs(patient)).getHours() === hour)
      .length,
  }));
  const waitTrend = dailyVolume.map((point, index) => ({
    date: point.date,
    avgWaitMinutes: Math.max(0, averageWaitMinutes + index - 3),
  }));
  const topComplaints = [...complaintCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const highRiskPatients = state.patients.filter(
    (patient) =>
      patient.priority === Priority.P1 ||
      patient.priority === Priority.P2 ||
      hasPatientFlag(patient, PatientFlag.HighRisk) ||
      hasPatientFlag(patient, PatientFlag.DeteriorationRisk) ||
      hasPatientFlag(patient, PatientFlag.SepsisAlert),
  );

  return {
    shift: {
      id: state.activeShift.id,
      label: state.activeShift.label,
      patientsSeen: state.patients.filter((patient) => patient.state !== PatientState.Registration)
        .length,
      dischargeCount: state.patients.filter((patient) => patient.state === PatientState.Discharge)
        .length,
      waitingCount: state.patients.filter((patient) => patient.state === PatientState.Waiting).length,
      highRiskCount: highRiskPatients.length,
      boardingCount: state.capacity.boardingCount,
      reassessmentDueCount: state.patients.filter((patient) =>
        hasPatientFlag(patient, PatientFlag.ReassessmentDue),
      ).length,
      averageWaitMinutes,
      capacityScore: state.capacity.score,
    },
    operationalCommand: {
      dailyVolume,
      hourlyArrivals,
      waitTrend,
      topComplaints,
      capacity: state.capacity,
    },
  };
}

function buildBackendEmergencyAnalytics(
  state: Pick<EmergencyStoreState, 'patients' | 'capacity' | 'activeShift'>,
  backendData: Record<string, unknown>,
) {
  const local = buildLocalEmergencyAnalytics(state);
  const capacity = (backendData.capacity as CapacitySnapshot | undefined) || state.capacity;
  const backendOperational =
    backendData.operationalCommand && typeof backendData.operationalCommand === 'object'
      ? (backendData.operationalCommand as Record<string, unknown>)
      : {};
  return {
    ...local,
    shift: {
      ...local.shift,
      patientsSeen: Number(backendData.activeCensus ?? local.shift.patientsSeen),
      waitingCount: Number(backendData.waiting ?? 0),
      highRiskCount: Number(backendData.highRisk ?? 0),
      boardingCount: Number(backendData.boarding ?? capacity.boardingCount ?? 0),
      reassessmentDueCount: Number(backendData.reassessmentDue ?? local.shift.reassessmentDueCount),
      averageWaitMinutes: Number(backendData.averageWaitMinutes ?? 0),
      capacityScore: capacity.score ?? local.shift.capacityScore,
    },
    operationalCommand: {
      ...local.operationalCommand,
      ...backendOperational,
      capacity,
      backendSummary: {
        activeCensus: Number(backendData.activeCensus ?? local.shift.patientsSeen),
        waiting: Number(backendData.waiting ?? 0),
        highRisk: Number(backendData.highRisk ?? 0),
        boarding: Number(backendData.boarding ?? capacity.boardingCount ?? 0),
        reassessmentDue: Number(backendData.reassessmentDue ?? local.shift.reassessmentDueCount),
        averageWaitMinutes: Number(backendData.averageWaitMinutes ?? 0),
      },
    },
  };
}

type EmergencyAnalyticsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  source: string;
  loadedAt: string | null;
  message: string;
  data?: ReturnType<typeof buildLocalEmergencyAnalytics>;
};

type EmergencyScenarioSummary = {
  id: string;
  label: string;
  description?: string;
};

type EmergencyQueueSummary = QueueSummary;

type EmergencyScenarioData = Record<string, unknown> & {
  copilotContext: Record<string, number>;
  boarding: Record<string, unknown> & { patients: unknown[] };
};

type EmergencyCtasThresholds = Record<Priority, number>;

type EmergencyOsSettings = {
  tenantName: string;
  defaultWorkspace: string;
  defaultScreenMode: string;
  enabledScreenModes: string[];
  readOnlyDisplayMode: boolean;
  commandCenterMode: boolean;
  wallDisplayRefreshInterval: number;
  enabledModules: Array<{ id: string; label: string; enabled: boolean }>;
  aiSettings: Record<string, string | boolean>;
  integrationSettings: Record<string, string | boolean>;
  provincialHealthSettings: Record<string, string | boolean>;
  notificationSettings: Record<string, string | number | boolean>;
  reassessmentThresholds: Record<string, number>;
  capacityThresholds: Record<string, number>;
  emsThresholds: Record<string, number | boolean>;
  boardingThresholds: Record<string, number>;
  ctasThresholds: EmergencyCtasThresholds;
  thresholds: Record<string, unknown> & {
    waitWarningMinutes: number;
    waitCriticalMinutes: number;
    capacityWarningPercent: number;
    emsOffloadTargetMinutes: number;
    reassessmentIntervals: Record<string, number>;
    ctasTargets: EmergencyCtasThresholds;
  };
  departmentCapacityTarget: number;
  alertRules: Record<string, { enabled: boolean; severity: Alert['severity'] }>;
  centralControl: typeof DEFAULT_CENTRAL_CONTROL_SETTINGS;
  demoMode?: unknown;
};

interface EmergencyStoreState {
  patients: Patient[];
  staff: Staff[];
  rooms: Room[];
  capacity: CapacitySnapshot;
  capacityHistory: CapacityHistoryEntry[];
  activeShift: ActiveShift;
  emsUnits: EmsUnit[];
  emsArrivals: EMSArrival[];
  referrals: Referral[];
  capacityMetrics: EmergencyCapacityMetrics;
  boardingMetrics: EmergencyBoardingMetrics;
  surgeStatus: EmergencySurgeStatus;
  copilotMessages: EmergencyCopilotMessage[];
  emsIncomingPatients: EmsIncomingPatient[];
  ui: EmergencyUiState;
  websocket: EmergencyWebSocketStatus;
  integrationEvents: EmergencyIntegrationEvent[];
  emergencyAnalytics: EmergencyAnalyticsState;
  activeScenarioId: string;
  activeScenario: EmergencyScenarioSummary;
  availableScenarios: EmergencyScenarioSummary[];
  scenarioData: EmergencyScenarioData;
  queues: EmergencyQueueSummary[];
  selectedPatientId: string | null;
  copilotOpen: boolean;
  activeQueueFilter: string | null;
  whiteboardSearchQuery: string;
  loading: boolean;
  features: EmergencyFeatureFlags;
  flags: FeatureFlags;
  overrides: FeatureOverrides;
  tier: FeatureTier;
  lastSynced: Date | null;
  backendAvailable: boolean;
  persistenceMode: FeaturePersistenceMode;
  alerts: Alert[];
  workflowLogs: WorkflowActionLog[];
  staffingRequests: StaffingRequest[];
  auditLog: EmergencyAuditLogEntry[];
  thresholds: EmergencyThresholds;
  emergencySettings: EmergencyOsSettings;
  lastPulseView: number | null;

  addPatient: (patient: Patient, options?: { syncToBackend?: boolean }) => void;
  setThreshold: (key: EmergencyThresholdKey, value: number) => void;
  resetThresholds: () => void;
  saveEmergencySettings: (patch: Partial<EmergencyOsSettings>) => void;
  setPatients: (patients: Patient[]) => void;
  removePatient: (patientId: string) => void;
  updatePatient: (patientId: string, patch: Partial<Patient>) => void;
  movePatientToState: (
    patientId: string,
    to: PatientState,
    staffIdOrOptions?: string | { staffId?: string; note?: string; timelineEvent?: JourneyEvent },
    note?: string,
  ) => void;
  dischargePatient: (patientId: string, options?: { staffId?: string; note?: string }) => void;
  assignStaff: (patientId: string, staffId: string) => void;
  assignRoom: (patientId: string, roomId: string) => void;
  addFlag: (patientId: string, flag: PatientFlag | string | PatientFlagRecord, options?: Partial<Alert>) => void;
  removeFlag: (patientId: string, flag: PatientFlag) => void;
  addVitals: (patientId: string, vitals: Vitals) => void;
  addNote: (patientId: string, note: Note | string, staffId?: string) => void;
  scheduleReassessmentReminder: (
    patientId: string,
    reminder: Omit<ReassessmentReminder, 'id' | 'patientId' | 'status'>,
  ) => ReassessmentReminder;
  completeReassessmentReminder: (
    patientId: string,
    reminderId: string,
    options?: { completedBy?: string; completedAt?: string },
  ) => void;
  selectPatient: (patientId: string | null) => void;
  clearPatientSelection: () => void;
  setActiveQueueFilter: (filter: string | null) => void;
  setQueueFilter: (filter: string | null) => void;
  setWhiteboardSearchQuery: (query: string) => void;
  setLastPulseView: (timestamp: number) => void;
  setLoading: (loading: boolean) => void;
  toggleCopilot: () => void;
  clearError: () => void;
  initializeFromBackend: () => Promise<EmergencyDashboardRefreshResult>;
  refreshAllData: () => Promise<EmergencyDashboardRefreshResult>;
  activateSurge: (payload?: ActivateSurgePayload) => Promise<EmergencySurgeStatus>;
  sendCopilotQuery: (
    query: string,
    options?: CopilotQueryOptions,
  ) => Promise<EmergencyCopilotMessage>;
  setWebSocketStatus: (status: Partial<EmergencyWebSocketStatus>) => void;
  dispatchWebSocketEvent: (event: EmergencyRealtimeEvent | unknown) => void;
  appendCopilotMessage: (message: EmergencyCopilotMessage) => void;
  upsertEmsIncomingPatient: (patient: EmsIncomingPatient) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (alertId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  setCapacity: (capacity: CapacitySnapshot) => void;
  addEMSArrival: (arrival: EMSArrival) => void;
  prepareEMSBay: (arrivalId: string) => void;
  updateEMSArrival: (arrivalId: string, patch: Partial<EMSArrival>) => void;
  checkCriticalEMSChecklistItem: (
    arrivalId: string,
    input: {
      itemId: string;
      label: string;
      checked: boolean;
      staffId: string;
      staffName: string;
      timestamp?: string;
    },
  ) => void;
  completeCriticalEMSChecklist: (
    arrivalId: string,
    input: { staffId: string; staffName: string; timestamp?: string },
  ) => void;
  convertEMSArrivalToPatient: (arrivalId: string) => void;
  initializeFlags: () => Promise<void>;
  toggleFeature: (
    featureId: string,
    enabled: boolean,
    metadata?: { changedBy?: string },
  ) => Promise<boolean>;
  setTier: (tier: FeatureTier) => void;
  isEnabled: (featureId: string) => boolean;
  getEnabledFeatures: () => Feature[];
  getDependencyWarning: (featureId: string) => string | null;
  syncFeatureFlag: (
    payload: unknown,
  ) => { featureId: string; enabled: boolean; changedBy?: string } | null;
  setActiveScenario: (scenarioId: string) => void;
  createReferral: (input: Partial<Referral> & { patientId: string }) => Referral;
  updateReferralStatus: (
    referralId: string,
    status: Referral['status'],
    responseNote?: string,
  ) => void;
  loadEmergencyAnalytics: (options?: { force?: boolean }) => Promise<EmergencyAnalyticsState>;
  recordWorkflowAction: (input: WorkflowActionInput) => WorkflowActionLog;
  requestAdditionalStaff: (
    input?: Partial<Omit<StaffingRequest, 'id' | 'requestedAt' | 'status'>>,
  ) => StaffingRequest;
  hydrateFromApi: (
    payload: Partial<{
      patients: Patient[];
      staff: Staff[];
      rooms: Room[];
      alerts: Alert[];
      capacity: CapacitySnapshot;
      capacityHistory: CapacityHistoryEntry[];
      workflowLogs: WorkflowActionLog[];
      activeShift: ActiveShift;
      emsUnits: EmsUnit[];
      emsArrivals: EMSArrival[];
      referrals: Referral[];
      queues: EmergencyQueueSummary[];
      activeQueueFilter: string | null;
      whiteboardSearchQuery: string;
      loading: boolean;
      emergencySettings: Partial<EmergencyOsSettings>;
      features: EmergencyFeatureFlags;
      flags: FeatureFlags;
      overrides: FeatureOverrides;
      tier: FeatureTier;
    }>,
  ) => void;
}

const initialScenarioState = buildSrcEmergencyScenarioState(getInitialEdScenarioId());
const initialCapacity =
  initialScenarioState.capacity || buildCapacitySnapshot(SEED_PATIENTS, SEED_ROOMS);
const initialFeatureState = readLocalFeatureSnapshot();
const initialTier = initialFeatureState.tier || DEFAULT_TIER;
const initialFlags = {
  ...buildDefaultFlags(initialTier),
  ...(initialFeatureState.flags || {}),
};

const DEFAULT_CTAS_TARGETS: EmergencyCtasThresholds = {
  ...(DEFAULT_EMERGENCY_CTAS_TARGETS as EmergencyCtasThresholds),
};

const DEFAULT_EMERGENCY_SETTINGS: EmergencyOsSettings = {
  tenantName: 'CareDroid Emergency Department',
  defaultWorkspace: 'emergency-whiteboard',
  defaultScreenMode: 'CHARGE_NURSE_SCREEN',
  enabledScreenModes: [
    'TRIAGE_SCREEN',
    'REGISTRATION_SCREEN',
    'CHARGE_NURSE_SCREEN',
    'PHYSICIAN_SCREEN',
    'EMS_SCREEN',
    'WAITING_ROOM_DISPLAY',
    'COMMAND_CENTER_DISPLAY',
    'ADMIN_SCREEN',
    'READ_ONLY_DISPLAY',
  ],
  readOnlyDisplayMode: false,
  commandCenterMode: true,
  wallDisplayRefreshInterval: 30000,
  enabledModules: DEFAULT_EMERGENCY_MODULES.map((module) => ({ ...module })),
  aiSettings: {
    enabled: true,
    provider: 'configured',
    model: 'default',
    triageAssistEnabled: true,
    summarizationEnabled: true,
    humanReviewRequired: true,
  },
  integrationSettings: {
    ehrEnabled: false,
    fhirEndpoint: '',
    hl7InterfaceId: '',
    deviceTelemetryEnabled: false,
  },
  provincialHealthSettings: {
    connectorEnabled: false,
    jurisdiction: '',
    lookupMode: 'manual-review',
    healthCardValidation: false,
  },
  notificationSettings: {
    inAppEnabled: true,
    emailEnabled: false,
    smsEnabled: false,
    escalationMinutes: 10,
    quietHoursStart: '00:00',
    quietHoursEnd: '00:00',
  },
  reassessmentThresholds: {
    P1: 5,
    P2: 15,
    P3: 30,
    P4: 60,
    P5: 120,
    overdueGraceMinutes: 10,
  },
  capacityThresholds: {
    departmentCapacityTarget: 85,
    warningPercent: 75,
    criticalPercent: 90,
    maxWaitingPatients: 12,
  },
  emsThresholds: {
    offloadTargetMinutes: 15,
    criticalEtaMinutes: 10,
    autoCreateArrival: true,
  },
  boardingThresholds: {
    escalationMinutes: 120,
    criticalMinutes: 240,
    maxBoarders: 8,
    inpatientNotifyMinutes: 60,
  },
  ctasThresholds: DEFAULT_CTAS_TARGETS,
  thresholds: {
    waitWarningMinutes: 45,
    waitCriticalMinutes: 60,
    capacityWarningPercent: 75,
    emsOffloadTargetMinutes: 15,
    reassessmentIntervals: {
      P1: 5,
      P2: 15,
      P3: 30,
      P4: 60,
      P5: 120,
    },
    ctasTargets: DEFAULT_CTAS_TARGETS,
  },
  departmentCapacityTarget: 85,
  alertRules: Object.fromEntries(
    Object.entries(DEFAULT_EMERGENCY_ALERT_RULES).map(([rule, config]) => [rule, { ...config }]),
  ),
  centralControl: DEFAULT_CENTRAL_CONTROL_SETTINGS,
};

function mergeCtasThresholds(
  base: EmergencyCtasThresholds,
  patch?: Partial<Record<Priority | string, unknown>>,
): EmergencyCtasThresholds {
  return Object.fromEntries(
    Object.values(Priority).map((priority) => {
      const configured = Number(patch?.[priority]);
      return [
        priority,
        Number.isFinite(configured) && configured >= 0 ? configured : base[priority],
      ];
    }),
  ) as EmergencyCtasThresholds;
}

function mergeEmergencyOsSettings(
  base: EmergencyOsSettings,
  patch: Partial<EmergencyOsSettings> = {},
): EmergencyOsSettings {
  const baseThresholds = {
    ...DEFAULT_EMERGENCY_SETTINGS.thresholds,
    ...(base.thresholds || {}),
    reassessmentIntervals: {
      ...DEFAULT_EMERGENCY_SETTINGS.thresholds.reassessmentIntervals,
      ...(base.thresholds?.reassessmentIntervals || {}),
    },
  };
  const baseCtas = base.ctasThresholds || baseThresholds.ctasTargets || DEFAULT_CTAS_TARGETS;
  const patchCtas =
    patch.ctasThresholds ||
    (patch.thresholds?.ctasTargets as Partial<Record<Priority, number>> | undefined);
  const ctasThresholds = mergeCtasThresholds(baseCtas, patchCtas);

  return {
    ...base,
    ...patch,
    enabledModules: patch.enabledModules || base.enabledModules,
    aiSettings: { ...base.aiSettings, ...(patch.aiSettings || {}) },
    integrationSettings: { ...base.integrationSettings, ...(patch.integrationSettings || {}) },
    provincialHealthSettings: {
      ...base.provincialHealthSettings,
      ...(patch.provincialHealthSettings || {}),
    },
    notificationSettings: { ...base.notificationSettings, ...(patch.notificationSettings || {}) },
    reassessmentThresholds: {
      ...base.reassessmentThresholds,
      ...(patch.reassessmentThresholds || {}),
    },
    capacityThresholds: { ...base.capacityThresholds, ...(patch.capacityThresholds || {}) },
    emsThresholds: { ...base.emsThresholds, ...(patch.emsThresholds || {}) },
    boardingThresholds: { ...base.boardingThresholds, ...(patch.boardingThresholds || {}) },
    ctasThresholds,
    thresholds: {
      ...baseThresholds,
      ...(patch.thresholds || {}),
      reassessmentIntervals: {
        ...baseThresholds.reassessmentIntervals,
        ...(patch.thresholds?.reassessmentIntervals || {}),
      },
      ctasTargets: ctasThresholds,
    },
    alertRules: { ...base.alertRules, ...(patch.alertRules || {}) },
    centralControl: { ...base.centralControl, ...(patch.centralControl || {}) },
  };
}

function seedCapacityHistory(capacity: CapacitySnapshot): CapacityHistoryEntry[] {
  return [
    {
      id: 'capacity-history-initial',
      timestamp: capacity.updatedAt || new Date().toISOString(),
      band: capacity.band,
      score: capacity.score,
      source: 'current-capacity-seed',
      reason:
        'Initial capacity history is seeded from the current snapshot when no prior history is available.',
    },
  ];
}

function appendCapacityBandChange(
  history: CapacityHistoryEntry[],
  previousCapacity: CapacitySnapshot,
  nextCapacity: CapacitySnapshot,
  reason: string,
): CapacityHistoryEntry[] {
  if (previousCapacity.band === nextCapacity.band) return history;
  const timestamp = nextCapacity.updatedAt || new Date().toISOString();
  const lastEntry = history[history.length - 1];
  if (lastEntry?.timestamp === timestamp && lastEntry.band === nextCapacity.band) return history;
  return [
    ...history,
    {
      id: createId('capacity-history'),
      timestamp,
      band: nextCapacity.band,
      score: nextCapacity.score,
      fromBand: previousCapacity.band,
      toBand: nextCapacity.band,
      source: 'capacity-engine',
      reason,
    },
  ].slice(-200);
}

const initialEmergencySettingsPatch = (initialScenarioState.emergencySettings ||
  {}) as Partial<EmergencyOsSettings>;
const initialThresholds = thresholdsFromSettings(
  initialEmergencySettingsPatch,
  DEFAULT_EMERGENCY_THRESHOLDS,
);
const initialEmergencySettings = mergeEmergencyOsSettings(
  mergeEmergencyOsSettings(DEFAULT_EMERGENCY_SETTINGS, initialEmergencySettingsPatch),
  settingsPatchFromThresholds(initialThresholds),
);

export const useEmergencyStore: UseBoundStore<StoreApi<EmergencyStoreState>> =
  create<EmergencyStoreState>((set, get) => ({
    patients: initialScenarioState.patients || SEED_PATIENTS,
    staff: initialScenarioState.staff || SEED_STAFF,
    rooms: initialScenarioState.rooms || SEED_ROOMS,
    capacity: initialCapacity,
    capacityHistory: seedCapacityHistory(initialCapacity),
    activeShift: initialScenarioState.activeShift || SEED_SHIFT,
    emsUnits: initialScenarioState.emsUnits || SEED_EMS_UNITS,
    emsArrivals: initialScenarioState.emsArrivals || [],
    referrals: initialScenarioState.referrals || SEED_REFERRALS,
    capacityMetrics: emptyCapacityMetrics(),
    boardingMetrics: emptyBoardingMetrics(),
    surgeStatus: emptySurgeStatus(),
    copilotMessages: [],
    emsIncomingPatients: [],
    ui: emptyUiState(),
    websocket: emptyWebSocketStatus(),
    integrationEvents: [],
    emergencyAnalytics: {
      status: 'idle',
      source: 'local',
      loadedAt: null,
      message: '',
    },
    activeScenarioId: initialScenarioState.activeScenarioId,
    activeScenario: initialScenarioState.activeScenario,
    availableScenarios: ED_SCENARIO_DEMO_MODES,
    scenarioData: initialScenarioState.scenarioData,
    queues: initialScenarioState.queues || [],
    selectedPatientId: null,
    copilotOpen: false,
    activeQueueFilter: null,
    whiteboardSearchQuery: '',
    loading: false,
    features: DEFAULT_FEATURES,
    flags: initialFlags,
    overrides: initialFeatureState.overrides || {},
    tier: initialTier,
    lastSynced: initialFeatureState.lastSynced || null,
    backendAvailable: false,
    persistenceMode: 'local',
    workflowLogs: [],
    staffingRequests: [],
    auditLog: [],
    thresholds: initialThresholds,
    emergencySettings: initialEmergencySettings,
    lastPulseView: readLastPulseViewTimestamp(),
    alerts: initialScenarioState.alerts || [
      {
        id: 'a1',
        severity: 'Critical',
        title: 'Sepsis criteria met',
        message: 'Dorothy Walsh has hypotension, fever, tachycardia, and altered mentation.',
        patientId: 'p3',
        createdAt: tMinus(24),
        dismissed: false,
      },
      {
        id: 'a2',
        severity: 'Warning',
        title: 'Reassessment due',
        message: 'James Tremblay is waiting with persistent right lower quadrant pain.',
        patientId: 'p4',
        createdAt: tMinus(12),
        dismissed: false,
      },
    ],

    addPatient: (patient) =>
      set((state) => {
        const patientWithTimeline: Patient = {
          ...patient,
          timeline: patient.timeline.length
            ? patient.timeline
            : [
                createPatientTimelineEvent(
                  patient,
                  'Intake',
                  `Created patient ${patient.firstName} ${patient.lastName}.`,
                  {
                    to: patient.state,
                    timestamp: patient.arrivalTime,
                    staffId: patient.assignedStaffId || 'intake',
                    metadata: {
                      mrn: patient.mrn,
                      priority: patient.priority,
                      complaintCategory: patient.complaintCategory,
                    },
                  },
                ),
              ],
        };
        const patients = [...state.patients, patientWithTimeline];
        const capacity = buildCapacitySnapshot(patients, state.rooms);
        return {
          patients,
          capacity,
          auditLog: appendAuditLog(state.auditLog, {
            action: 'addPatient',
            patientId: patientWithTimeline.id,
            staffId: patientWithTimeline.assignedStaffId || 'intake',
            details: {
              mrn: patientWithTimeline.mrn,
              state: patientWithTimeline.state,
              priority: patientWithTimeline.priority,
            },
          }),
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            {
              type: 'patient_created',
              title: 'Patient created',
              summary: `Created patient ${patientWithTimeline.firstName} ${patientWithTimeline.lastName}.`,
              patientId: patientWithTimeline.id,
              actorStaffId: patientWithTimeline.assignedStaffId || undefined,
              source: 'local-emergency-store',
              metadata: {
                mrn: patientWithTimeline.mrn,
                state: patientWithTimeline.state,
                priority: patientWithTimeline.priority,
              },
            },
            capacity.score !== state.capacity.score
              ? {
                  type: 'capacity_score_changed',
                  title: 'Capacity score changed',
                  summary: `Capacity score changed from ${state.capacity.score} to ${capacity.score}.`,
                  source: 'capacity-engine',
                  severity: capacity.band === 'Red' ? 'Critical' : 'Warning',
                  metadata: {
                    fromScore: state.capacity.score,
                    toScore: capacity.score,
                    band: capacity.band,
                    reason: 'patient_created',
                  },
                }
              : null,
          ]),
        };
      }),

    setThreshold: (key, value) =>
      set((state) => {
        const thresholds = { ...state.thresholds, [key]: value };
        return {
          thresholds,
          emergencySettings: mergeEmergencyOsSettings(
            state.emergencySettings,
            settingsPatchFromThresholds(thresholds),
          ),
        };
      }),

    resetThresholds: () =>
      set((state) => ({
        thresholds: DEFAULT_EMERGENCY_THRESHOLDS,
        emergencySettings: mergeEmergencyOsSettings(
          state.emergencySettings,
          settingsPatchFromThresholds(DEFAULT_EMERGENCY_THRESHOLDS),
        ),
      })),

    saveEmergencySettings: (patch) =>
      set((state) => {
        const emergencySettings = mergeEmergencyOsSettings(state.emergencySettings, patch);
        return {
          emergencySettings,
          thresholds: thresholdsFromSettings(emergencySettings, state.thresholds),
        };
      }),

    setPatients: (patients) =>
      set((state) => ({
        patients,
        capacity: buildCapacitySnapshot(patients, state.rooms),
        auditLog: appendAuditLog(state.auditLog, {
          action: 'setPatients',
          staffId: 'system',
          details: { count: patients.length },
        }),
      })),

    removePatient: (patientId) =>
      set((state) => {
        const patients = state.patients.filter((patient) => patient.id !== patientId);
        const rooms = state.rooms.map((room) =>
          room.patientId === patientId
            ? { ...room, patientId: undefined, status: 'Available' as const }
            : room,
        );
        return {
          patients,
          rooms,
          capacity: buildCapacitySnapshot(patients, rooms),
          auditLog: appendAuditLog(state.auditLog, {
            action: 'removePatient',
            patientId,
            staffId: 'system',
            details: { clearedRoom: state.rooms.some((room) => room.patientId === patientId) },
          }),
          selectedPatientId: state.selectedPatientId === patientId ? null : state.selectedPatientId,
          ui: {
            ...state.ui,
            selectedPatientId:
              state.ui.selectedPatientId === patientId ? null : state.ui.selectedPatientId,
          },
        };
      }),

    updatePatient: (patientId, patch) =>
      set((state) => {
        const patients = state.patients.map((patient) =>
          patient.id === patientId ? { ...patient, ...patch } : patient,
        );
        const capacity = buildCapacitySnapshot(patients, state.rooms);
        return {
          patients,
          capacity,
          auditLog: appendAuditLog(state.auditLog, {
            action: 'updatePatient',
            patientId,
            staffId:
              state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
              'system',
            details: { fields: Object.keys(patch) },
          }),
        };
      }),

    movePatientToState: (patientId, to, staffIdOrOptions = 's3', note) =>
      set((state) => {
        const options =
          typeof staffIdOrOptions === 'string'
            ? { staffId: staffIdOrOptions, note }
            : staffIdOrOptions;
        const staffId = options.staffId || 's3';
        const beforePatient = state.patients.find((patient) => patient.id === patientId);
        const patients = state.patients.map((patient) => {
          if (patient.id !== patientId) return patient;

          const event: JourneyEvent =
            options.timelineEvent ||
            createPatientTimelineEvent(
              patient,
              to === PatientState.Discharge
                ? 'DispositionUpdated'
                : to === PatientState.Triage
                  ? 'Triage'
                  : 'StateChange',
              options.note || `Moved patient from ${patient.state} to ${to}.`,
              {
                from: patient.state,
                to,
                staffId,
                metadata: {
                  fromState: patient.state,
                  toState: to,
                },
              },
            );

          return { ...patient, state: to, timeline: [...patient.timeline, event] };
        });

        const capacity = buildCapacitySnapshot(patients, state.rooms);
        return {
          patients,
          capacity,
          auditLog: appendAuditLog(
            state.auditLog,
            beforePatient
              ? {
                  action: 'movePatientToState',
                  patientId,
                  staffId,
                  details: { fromState: beforePatient.state, toState: to },
                }
              : null,
          ),
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            beforePatient
              ? {
                  type: 'journey_state_changed',
                  title: 'Journey state changed',
                  summary: `Moved patient from ${beforePatient.state} to ${to}.`,
                  patientId,
                  actorStaffId: staffId,
                  source: 'patient-journey-engine',
                  metadata: {
                    fromState: beforePatient.state,
                    toState: to,
                  },
                }
              : null,
            beforePatient &&
            to === PatientState.Admission &&
            beforePatient.state !== PatientState.Admission
              ? {
                  type: 'boarding_started',
                  title: 'Boarding started',
                  summary: 'Patient moved to Admission boarding state.',
                  patientId,
                  actorStaffId: staffId,
                  source: 'boarding-intelligence',
                  severity: 'Warning',
                  metadata: {
                    fromState: beforePatient.state,
                    toState: to,
                  },
                }
              : null,
            capacity.score !== state.capacity.score
              ? {
                  type: 'capacity_score_changed',
                  title: 'Capacity score changed',
                  summary: `Capacity score changed from ${state.capacity.score} to ${capacity.score}.`,
                  source: 'capacity-engine',
                  severity: capacity.band === 'Red' ? 'Critical' : 'Warning',
                  metadata: {
                    fromScore: state.capacity.score,
                    toScore: capacity.score,
                    band: capacity.band,
                    reason: 'journey_state_changed',
                  },
                }
              : null,
          ]),
        };
      }),

    dischargePatient: (patientId, options = {}) =>
      set((state) => {
        const staffId = options.staffId || 's3';
        const patients = state.patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                state: PatientState.Discharge,
                timeline: [
                  ...patient.timeline,
                  createPatientTimelineEvent(
                    patient,
                    'DispositionUpdated',
                    options.note || 'Patient discharged from Emergency OS.',
                    { from: patient.state, to: PatientState.Discharge, staffId },
                  ),
                ],
              }
            : patient,
        );
        return {
          patients,
          capacity: buildCapacitySnapshot(patients, state.rooms),
          auditLog: appendAuditLog(state.auditLog, {
            action: 'dischargePatient',
            patientId,
            staffId,
            details: { toState: PatientState.Discharge, note: options.note || null },
          }),
        };
      }),

    assignStaff: (patientId, staffId) =>
      set((state) => {
        const staffName = state.staff.find((member) => member.id === staffId)?.name || staffId;
        return {
          patients: state.patients.map((patient) =>
            patient.id === patientId
              ? {
                  ...patient,
                  assignedStaffId: staffId,
                  timeline: [
                    ...patient.timeline,
                    createPatientTimelineEvent(
                      patient,
                      'StaffAssignment',
                      `Assigned clinician ${staffName}.`,
                      {
                        staffId,
                        metadata: {
                          fromStaffId: patient.assignedStaffId || null,
                          toStaffId: staffId,
                        },
                      },
                    ),
                  ],
                }
              : patient,
          ),
          auditLog: appendAuditLog(state.auditLog, {
            action: 'assignStaff',
            patientId,
            staffId,
            details: { toStaffId: staffId, staffName },
          }),
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            {
              type: 'clinician_assigned',
              title: 'Clinician assigned',
              summary: `Assigned clinician ${staffName}.`,
              patientId,
              actorStaffId: staffId,
              source: 'staff-assignment',
              metadata: {
                toStaffId: staffId,
              },
            },
          ]),
        };
      }),

    assignRoom: (patientId, roomId) =>
      set((state) => {
        const rooms = state.rooms.map((room) => {
          if (room.patientId === patientId) {
            return { ...room, patientId: undefined, status: 'Available' as const };
          }

          if (room.id === roomId) {
            return { ...room, patientId, status: 'Occupied' as const };
          }

          return room;
        });
        const patients = state.patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                roomId,
                timeline: [
                  ...patient.timeline,
                  createPatientTimelineEvent(
                    patient,
                    'RoomAssignment',
                    `Assigned room ${roomId}.`,
                    {
                      metadata: {
                        fromRoomId: patient.roomId || null,
                        toRoomId: roomId,
                      },
                    },
                  ),
                ],
              }
            : patient,
        );

        return {
          rooms,
          patients,
          capacity: buildCapacitySnapshot(patients, rooms),
          auditLog: appendAuditLog(state.auditLog, {
            action: 'assignRoom',
            patientId,
            staffId:
              state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
              'system',
            details: { roomId },
          }),
        };
      }),

    addFlag: (patientId, flag) =>
      set((state) => {
        const normalizedFlag = getPatientFlagType(flag);
        const flaggedPatient = state.patients.find((patient) => patient.id === patientId);
        const flagAlreadyPresent = Boolean(flaggedPatient?.flags.includes(normalizedFlag));
        const flagAlert: Alert | null =
          flaggedPatient && !flagAlreadyPresent
            ? {
                id: `flag-${normalizedFlag}-${patientId}`,
                type:
                  normalizedFlag === PatientFlag.ReassessmentDue
                    ? 'Reassessment'
                    : normalizedFlag === PatientFlag.PendingAdmission
                      ? 'Boarding'
                      : 'System',
                severity:
                  normalizedFlag === PatientFlag.DeteriorationRisk ||
                  normalizedFlag === PatientFlag.SepsisAlert
                    ? 'Critical'
                    : 'Warning',
                title:
                  normalizedFlag === PatientFlag.ReassessmentDue
                    ? 'Reassessment due'
                    : normalizedFlag === PatientFlag.PendingAdmission
                      ? 'Boarding escalation'
                      : `Patient flag: ${normalizedFlag}`,
                message: `${[flaggedPatient.firstName, flaggedPatient.lastName].filter(Boolean).join(' ') || flaggedPatient.mrn} flagged for ${normalizedFlag}.`,
                patientId,
                createdAt: nowIso(),
                dismissed: false,
                source:
                  normalizedFlag === PatientFlag.ReassessmentDue
                    ? 'reassessment-engine'
                    : normalizedFlag === PatientFlag.PendingAdmission
                      ? 'boarding-intelligence'
                      : 'patient-risk-flags',
                metadata: { flag: normalizedFlag },
              }
            : null;
        const patients = state.patients.map((patient) => {
          if (patient.id !== patientId || patient.flags.includes(normalizedFlag)) return patient;
          return {
            ...patient,
            flags: [...patient.flags, normalizedFlag],
            timeline: [
              ...patient.timeline,
              createPatientTimelineEvent(patient, 'FlagAdded', `Added ${normalizedFlag} flag.`, {
                metadata: {
                  flag: normalizedFlag,
                },
              }),
            ],
          };
        });

        return {
          patients,
          capacity: buildCapacitySnapshot(patients, state.rooms),
          alerts: flagAlert ? mergeEmergencyAlerts([flagAlert], state.alerts) : state.alerts,
          auditLog: appendAuditLog(state.auditLog, {
            action: 'addFlag',
            patientId,
            staffId:
              state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
              'system',
            details: { flag: normalizedFlag },
          }),
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            normalizedFlag === PatientFlag.ReassessmentDue
              ? {
                  type: 'reassessment_created',
                  title: 'Reassessment created',
                  summary: 'Patient flagged for reassessment.',
                  patientId,
                  source: 'reassessment-engine',
                  severity: 'Warning',
                  metadata: { flag: normalizedFlag },
                }
              : null,
            normalizedFlag === PatientFlag.PendingAdmission
              ? {
                  type: 'boarding_started',
                  title: 'Boarding started',
                  summary: 'Patient flagged as pending admission.',
                  patientId,
                  source: 'boarding-intelligence',
                  severity: 'Warning',
                  metadata: { flag: normalizedFlag },
                }
              : null,
            normalizedFlag === PatientFlag.HighRisk ||
            normalizedFlag === PatientFlag.DeteriorationRisk ||
            normalizedFlag === PatientFlag.SepsisAlert
              ? {
                  type: 'copilot_used',
                  title: 'Copilot used',
                  summary: `Patient risk signal ${normalizedFlag} added for human review.`,
                  patientId,
                  source: 'ed-copilot',
                  severity: normalizedFlag === PatientFlag.HighRisk ? 'Warning' : 'Critical',
                  metadata: { flag: normalizedFlag },
                }
              : null,
          ]),
        };
      }),

    removeFlag: (patientId, flag) =>
      set((state) => {
        const patients = state.patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                flags: patient.flags.filter((existingFlag) => existingFlag !== flag),
                timeline: patient.flags.includes(flag)
                  ? [
                      ...patient.timeline,
                      createPatientTimelineEvent(patient, 'FlagRemoved', `Removed ${flag} flag.`, {
                        metadata: {
                          flag,
                        },
                      }),
                    ]
                  : patient.timeline,
              }
            : patient,
        );

        return {
          patients,
          capacity: buildCapacitySnapshot(patients, state.rooms),
          auditLog: appendAuditLog(state.auditLog, {
            action: 'removeFlag',
            patientId,
            staffId:
              state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
              'system',
            details: { flag },
          }),
        };
      }),

    addVitals: (patientId, vitals) =>
      set((state) => {
        const news2 = calculateNews2FromVitals(vitals);
        const shouldFlagForReassessment = news2.total >= 5;
        const news2Alert: Alert | null = news2.response.alertSeverity
          ? {
              id: createId('alert'),
              type: 'Reassessment',
              severity: news2.response.alertSeverity,
              title: `NEWS2 ${news2.response.band} deterioration risk`,
              message: `NEWS2 ${news2.total}: ${news2.response.recommendation}`,
              patientId,
              createdAt: vitals.recordedAt || new Date().toISOString(),
              dismissed: false,
              source: 'news2-auto-score',
              metadata: {
                score: news2.total,
                band: news2.response.band,
                hasSingleRed: news2.hasSingleRed,
              },
            }
          : null;
        const patients = state.patients.map((patient) => {
          if (patient.id !== patientId) return patient;
          const flags =
            shouldFlagForReassessment && !patient.flags.includes(PatientFlag.ReassessmentDue)
              ? [...patient.flags, PatientFlag.ReassessmentDue]
              : patient.flags;
          return {
            ...patient,
            flags,
            vitals: [...patient.vitals, vitals],
            timeline: [
              ...patient.timeline,
              createPatientTimelineEvent(
                patient,
                'VitalsUpdated',
                'Vitals reassessment recorded.',
                {
                  timestamp: vitals.recordedAt,
                  staffId: vitals.recordedBy,
                  metadata: {
                    hr: vitals.hr,
                    sbp: vitals.sbp,
                    dbp: vitals.dbp,
                    spo2: vitals.spo2,
                    temp: vitals.temp,
                    rr: vitals.rr,
                    gcs: vitals.gcs,
                    pain: vitals.pain,
                    news2: news2.total,
                  },
                },
              ),
            ],
          };
        });
        return {
          patients,
          capacity: buildCapacitySnapshot(patients, state.rooms),
          alerts: news2Alert ? mergeEmergencyAlerts([news2Alert], state.alerts) : state.alerts,
          auditLog: appendAuditLog(state.auditLog, {
            action: 'addVitals',
            patientId,
            staffId:
              vitals.recordedBy ||
              state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
              'system',
            details: {
              recordedAt: vitals.recordedAt || null,
              news2: news2.total,
              reassessmentFlagAdded: shouldFlagForReassessment,
            },
          }),
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            {
              type: 'reassessment_completed',
              title: 'Reassessment completed',
              summary: 'Vitals reassessment recorded.',
              patientId,
              actorStaffId: vitals.recordedBy,
              timestamp: vitals.recordedAt,
              source: 'reassessment-engine',
              metadata: {
                hr: vitals.hr ?? null,
                spo2: vitals.spo2 ?? null,
                news2: news2.total,
              },
            },
          ]),
        };
      }),

    addNote: (patientId, note, staffId) =>
      set((state) => ({
        patients: state.patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                notes: [
                  ...patient.notes,
                  typeof note === 'string'
                    ? {
                        id: createId('note'),
                        patientId,
                        text: note,
                        body: note,
                        authorId: staffId || patient.assignedStaffId || 'system',
                        authorStaffId: staffId || patient.assignedStaffId || 'system',
                        type: 'Score',
                        timestamp: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                      }
                    : {
                        ...note,
                        id: note.id || createId('note'),
                        patientId,
                        timestamp: note.timestamp || note.createdAt || new Date().toISOString(),
                      },
                ],
              }
            : patient,
        ),
        auditLog: appendAuditLog(state.auditLog, {
          action: 'addNote',
          patientId,
          staffId:
            staffId ||
            state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
            'system',
          details: { noteType: typeof note === 'string' ? 'text' : note.type || 'note' },
        }),
      })),

    scheduleReassessmentReminder: (patientId, reminder) => {
      const nextReminder: ReassessmentReminder = {
        ...reminder,
        id: createId('reassessment'),
        patientId,
        status: 'pending',
      };

      set((state) => ({
        patients: state.patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                reassessmentReminders: [...(patient.reassessmentReminders || []), nextReminder],
              }
            : patient,
        ),
        auditLog: appendAuditLog(state.auditLog, {
          action: 'scheduleReassessmentReminder',
          patientId,
          staffId: reminder.scheduledBy,
          details: { reminderId: nextReminder.id, dueAt: reminder.dueAt },
        }),
        workflowLogs: appendWorkflowLogs(state.workflowLogs, [
          {
            type: 'reassessment_created',
            title: 'Reassessment created',
            summary: reminder.note || 'Reassessment reminder scheduled.',
            patientId,
            actorStaffId: reminder.scheduledBy,
            source: 'reassessment-engine',
            severity: 'Warning',
            metadata: { dueAt: reminder.dueAt },
          },
        ]),
      }));

      return nextReminder;
    },

    completeReassessmentReminder: (patientId, reminderId, options = {}) =>
      set((state) => ({
        patients: state.patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                reassessmentReminders: (patient.reassessmentReminders || []).map((reminder) =>
                  reminder.id === reminderId
                    ? {
                        ...reminder,
                        status: 'completed',
                        completedBy: options.completedBy,
                        completedAt: options.completedAt || new Date().toISOString(),
                      }
                    : reminder,
                ),
              }
            : patient,
        ),
        auditLog: appendAuditLog(state.auditLog, {
          action: 'completeReassessmentReminder',
          patientId,
          staffId:
            options.completedBy ||
            state.patients.find((patient) => patient.id === patientId)?.assignedStaffId ||
            'system',
          details: { reminderId, completedAt: options.completedAt || null },
        }),
      })),

    selectPatient: (patientId) =>
      set((state) => ({
        selectedPatientId: patientId,
        ui: { ...state.ui, selectedPatientId: patientId },
      })),

    clearPatientSelection: () =>
      set((state) => ({
        selectedPatientId: null,
        ui: { ...state.ui, selectedPatientId: null },
      })),

    setActiveQueueFilter: (filter) => set({ activeQueueFilter: filter }),

    setQueueFilter: (filter) => set({ activeQueueFilter: filter }),

    setWhiteboardSearchQuery: (query) => set({ whiteboardSearchQuery: query }),

    setLastPulseView: (timestamp) => {
      writeLastPulseViewTimestamp(timestamp);
      set({ lastPulseView: timestamp });
    },

    setLoading: (loading) => set((state) => ({ loading, ui: { ...state.ui, loading } })),

    toggleCopilot: () => set((state) => ({ copilotOpen: !state.copilotOpen })),

    clearError: () => set((state) => ({ ui: { ...state.ui, error: null } })),

    initializeFromBackend: async () => {
      set((state) => ({ loading: true, ui: { ...state.ui, loading: true, error: null } }));

      await get().initializeFlags();

      try {
        const result = await get().refreshAllData();
        const whiteboardData = asRecord(unwrapData(result.whiteboard));
        const whiteboardPayload = asRecord(
          firstValue(whiteboardData, ['whiteboard', 'emergencyWhiteboard']) ?? whiteboardData,
        );
        const patients = asArray<Patient>(firstValue(whiteboardPayload, ['patients']));
        const staff = asArray<Staff>(firstValue(whiteboardPayload, ['staff']));
        const rooms = asArray<Room>(firstValue(whiteboardPayload, ['rooms']));
        const alerts = asArray<Alert>(firstValue(whiteboardPayload, ['alerts']));
        const workflowLogs = asArray<WorkflowActionLog>(
          firstValue(whiteboardPayload, ['workflowLogs', 'workflow_logs']),
        );
        const activeShift = firstValue(whiteboardPayload, ['activeShift', 'shift']) as
          | ActiveShift
          | undefined;
        const capacityData = asRecord(unwrapData(result.capacity));
        const capacity = (firstValue(whiteboardPayload, ['capacity']) ||
          firstValue(capacityData, ['capacity'])) as
          | CapacitySnapshot
          | undefined;
        const emsArrivals = extractEmsIncomingPatients(result.ems) as unknown as EMSArrival[];
        const referrals = extractReferrals(result.referrals);
        const queues = extractQueueSummaries(result.queues);
        const reassessmentPatients = asArray<Patient>(
          firstValue(unwrapData(result.reassessment), ['patients']),
        );
        const backendWorkflowLogs = asArray<WorkflowActionLog>(
          firstValue(unwrapData(result.workflowLogs), ['logs', 'workflowLogs']),
        );
        const operationalAlerts = mergeEmergencyAlerts(
          alerts,
          extractOperationalAlertsFromEmergencyModules(result),
        );
        const hasBackendErrors = Object.keys(result.errors).length > 0;

        if (
          patients.length ||
          staff.length ||
          rooms.length ||
          alerts.length ||
          workflowLogs.length ||
          backendWorkflowLogs.length ||
          activeShift ||
          capacity ||
          emsArrivals.length ||
          referrals.length ||
          queues.length ||
          reassessmentPatients.length
        ) {
          get().hydrateFromApi({
            patients: patients.length ? patients : undefined,
            staff: staff.length ? staff : undefined,
            rooms: rooms.length ? rooms : undefined,
            alerts: operationalAlerts.length ? operationalAlerts : undefined,
            workflowLogs: backendWorkflowLogs.length ? backendWorkflowLogs : workflowLogs.length ? workflowLogs : undefined,
            activeShift,
            capacity,
            emsArrivals: emsArrivals.length ? emsArrivals : undefined,
            referrals: referrals.length ? referrals : undefined,
            queues: queues.length ? queues : undefined,
          });
        }

        set((state) => ({
          backendAvailable: !hasBackendErrors,
          loading: false,
          ui: {
            ...state.ui,
            loading: false,
            error: null,
          },
        }));

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Emergency OS backend unavailable.';
        set((state) => ({
          backendAvailable: false,
          persistenceMode: 'local',
          loading: false,
          ui: {
            ...state.ui,
            loading: false,
            error: null,
          },
        }));

        return {
          errors: { backend: message },
        };
      }
    },

    refreshAllData: async () => {
      set((state) => ({ loading: true, ui: { ...state.ui, loading: true, error: null } }));
      const loadDataset = async (
        label: string,
        fetcher: () => Promise<unknown>,
      ): Promise<{ data?: unknown; error?: string }> => {
        try {
          return { data: await fetcher() };
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : `Unable to load Emergency OS ${label} data.`,
          };
        }
      };

      const [whiteboard, capacity, boarding, ems, queues, reassessment, referrals, workflowLogs] = await Promise.all([
        loadDataset('whiteboard', fetchEmergencyWhiteboard),
        loadDataset('capacity', fetchCapacityStatus),
        loadDataset('boarding', fetchBoardingStatus),
        loadDataset('EMS', fetchEMSIntake),
        loadDataset('queues', fetchEmergencyQueues),
        loadDataset('reassessment', fetchReassessmentQueue),
        loadDataset('referrals', fetchReferrals),
        loadDataset('workflow logs', fetchEmergencyWorkflowLogs),
      ]);
      const errors = Object.fromEntries(
        Object.entries({ whiteboard, capacity, boarding, ems, queues, reassessment, referrals, workflowLogs })
          .filter(([, result]) => result.error)
          .map(([key, result]) => [key, result.error as string]),
      );
      const operationalAlerts = extractOperationalAlertsFromEmergencyModules({
        whiteboard: whiteboard.data,
        capacity: capacity.data,
        boarding: boarding.data,
        ems: ems.data,
        queues: queues.data,
        reassessment: reassessment.data,
        referrals: referrals.data,
        workflowLogs: workflowLogs.data,
        errors,
      });

      set((state) => ({
        capacityMetrics: capacity.data
          ? normalizeCapacityMetrics(capacity.data)
          : state.capacityMetrics,
        boardingMetrics: boarding.data
          ? normalizeBoardingMetrics(boarding.data)
          : state.boardingMetrics,
        emsIncomingPatients: ems.data
          ? extractEmsIncomingPatients(ems.data)
          : state.emsIncomingPatients,
        queues: queues.data ? extractQueueSummaries(queues.data) : state.queues,
        alerts: operationalAlerts.length
          ? mergeEmergencyAlerts(operationalAlerts, state.alerts)
          : state.alerts,
        loading: false,
        ui: {
          ...state.ui,
          loading: false,
          error: Object.values(errors)[0] ?? null,
        },
      }));

      return {
        whiteboard: whiteboard.data,
        capacity: capacity.data,
        boarding: boarding.data,
        ems: ems.data,
        queues: queues.data,
        reassessment: reassessment.data,
        referrals: referrals.data,
        workflowLogs: workflowLogs.data,
        errors,
      };
    },

    activateSurge: async (payload = {}) => {
      set((state) => ({ ui: { ...state.ui, error: null } }));
      try {
        const response = await fetch('/api/emergency/surge/activate', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(
            stringFrom(firstValue(data, ['message', 'error', 'detail'])) ||
              `Emergency OS request failed with status ${response.status}.`,
          );
        }
        const event = {
          ...payload,
          ...asRecord(firstValue(data, ['event', 'surgeEvent']) ?? data),
        };
        const surgeStatus: EmergencySurgeStatus = {
          active: Boolean(firstValue(data, ['active']) ?? true),
          event: { ...event, id: stableId('surge', event) },
          activatedAt:
            stringFrom(firstValue(event, ['activatedAt', 'activationTime', 'timestamp'])) ||
            nowIso(),
          updatedAt: nowIso(),
        };
        set({ surgeStatus });
        return surgeStatus;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to activate surge mode.';
        set((state) => ({ ui: { ...state.ui, error: message } }));
        throw error;
      }
    },

    sendCopilotQuery: async (query, options = {}) => {
      const cleanQuery = query.trim();
      if (!cleanQuery) throw new Error('Copilot query is required.');
      set((state) => ({ ui: { ...state.ui, error: null } }));
      try {
        const response = await fetch('/api/emergency/copilot/query', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: cleanQuery,
            user_role: options.userRole,
            context: options.context,
            ...options,
          }),
        });
        const text = await response.text();
        const raw = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(
            stringFrom(firstValue(raw, ['message', 'error', 'detail'])) ||
              `Emergency OS request failed with status ${response.status}.`,
          );
        }
        const data = unwrapData(raw);
        const message: EmergencyCopilotMessage = {
          id: stringFrom(firstValue(data, ['id', 'messageId'])) || createId('copilot'),
          query: cleanQuery,
          response:
            stringFrom(firstValue(data, ['response', 'answer', 'message', 'content', 'text'])) ||
            'Emergency Copilot returned no response text.',
          safetyStatus: String(
            firstValue(data, ['safetyStatus', 'safety_status', 'safety.status']) || 'unknown',
          )
            .toLowerCase()
            .includes('unsafe')
            ? 'unsafe'
            : 'unknown',
          createdAt: stringFrom(firstValue(data, ['createdAt', 'timestamp'])) || nowIso(),
          raw,
        };
        get().appendCopilotMessage(message);
        return message;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to send Copilot query.';
        set((state) => ({ ui: { ...state.ui, error: message } }));
        throw error;
      }
    },

    setWebSocketStatus: (status) =>
      set((state) => ({
        websocket: { ...state.websocket, ...status },
      })),

    dispatchWebSocketEvent: (event) => {
      const record = asRecord(event);
      const type = String(record.type ?? record.event ?? record.name ?? record.topic ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s.:/-]+/g, '_');
      const payload = record.payload ?? record.data ?? record.record ?? event;
      get().setWebSocketStatus({ lastEventAt: nowIso() });

      if (
        [
          'emergency_snapshot',
          'emergency_state',
          'whiteboard_snapshot',
          'whiteboard_updated',
          'central_node_snapshot',
          'central_node_updated',
        ].includes(type)
      ) {
        get().hydrateFromApi(buildRealtimeHydrationPayload(payload));
        return;
      }

      if (['alert_created', 'alert_updated', 'emergency_alert', 'notification'].includes(type)) {
        get().addAlert(normalizeRealtimeAlert(payload));
        return;
      }

      if (
        ['settings_updated', 'thresholds_updated', 'emergency_settings_updated'].includes(type)
      ) {
        const data = unwrapData(payload);
        const settings =
          firstValue(data, ['emergencySettings', 'settings', 'tenantSettings']) ?? data;
        get().saveEmergencySettings(asRecord(settings) as Partial<EmergencyOsSettings>);
        set((state) => ({
          workflowLogs: mergeWorkflowLogs(
            [
              normalizeWorkflowLog({
                ...asRecord(payload),
                type: 'integration_event_received',
                title: 'Settings updated',
                summary: 'Emergency OS settings updated from realtime event.',
                source: 'emergency-realtime',
              }),
            ],
            state.workflowLogs,
          ),
        }));
        return;
      }

      if (
        [
          'workflow_log',
          'workflow_log_created',
          'workflow_event',
          'audit_event',
          'patient_created',
          'journey_state_changed',
          'reassessment_created',
          'reassessment_completed',
          'referral_created',
        ].includes(type)
      ) {
        const workflowLog = normalizeWorkflowLog({ ...asRecord(payload), type });
        const hydrationPayload = buildRealtimeHydrationPayload(payload);
        if (
          hydrationPayload.patients ||
          hydrationPayload.rooms ||
          hydrationPayload.staff ||
          hydrationPayload.alerts ||
          hydrationPayload.capacity ||
          hydrationPayload.emsArrivals ||
          hydrationPayload.referrals ||
          hydrationPayload.queues ||
          hydrationPayload.emergencySettings
        ) {
          get().hydrateFromApi({
            ...hydrationPayload,
            workflowLogs: [workflowLog, ...(hydrationPayload.workflowLogs || [])],
          });
        } else {
          set((state) => ({
            workflowLogs: mergeWorkflowLogs([workflowLog], state.workflowLogs),
          }));
        }
        return;
      }

      if (['capacity_updated', 'capacity_changed', 'capacity_score_changed'].includes(type)) {
        const capacity = firstValue(unwrapData(payload), ['capacity', 'capacityStatus']) || payload;
        const capacityRecord = asRecord(capacity);
        const capacityAlert = buildCapacityAlert(payload);
        const hasCapacitySnapshot =
          capacityRecord.score !== undefined &&
          capacityRecord.band !== undefined &&
          capacityRecord.updatedAt !== undefined;
        set((state) => ({
          capacityMetrics: normalizeCapacityMetrics(payload),
          alerts: capacityAlert ? mergeEmergencyAlerts([capacityAlert], state.alerts) : state.alerts,
          ...(hasCapacitySnapshot
            ? {
                capacity: capacity as CapacitySnapshot,
                capacityHistory: appendCapacityBandChange(
                  state.capacityHistory,
                  state.capacity,
                  capacity as CapacitySnapshot,
                  type,
                ),
              }
            : {}),
        }));
        return;
      }
      if (['boarding_updated', 'boarding_changed', 'boarding_started'].includes(type)) {
        const boardingAlert = buildBoardingAlert(payload);
        set((state) => ({
          boardingMetrics: normalizeBoardingMetrics(payload),
          alerts: boardingAlert ? mergeEmergencyAlerts([boardingAlert], state.alerts) : state.alerts,
        }));
        return;
      }
      if (['ems_arrival', 'ems_arrival_created', 'ems_incoming', 'ems_updated'].includes(type)) {
        const arrival = firstValue(payload, ['arrival', 'patient']) ?? payload;
        get().upsertEmsIncomingPatient(normalizeEmsIncomingPatient(arrival));
        get().addEMSArrival(normalizeEmsIncomingPatient(arrival) as unknown as EMSArrival);
        return;
      }
      if (['queue_updated', 'queue_changed', 'queues_updated'].includes(type)) {
        const queueAlert = buildQueueAlert(payload);
        set((state) => ({
          queues: extractQueueSummaries(payload),
          alerts: queueAlert ? mergeEmergencyAlerts([queueAlert], state.alerts) : state.alerts,
        }));
        return;
      }
      if (['referral_updated', 'referrals_updated'].includes(type)) {
        const referrals = extractReferrals(payload);
        if (referrals.length) {
          set((state) => {
            const nextReferrals = mergeById(referrals, state.referrals);
            const referralAlert = buildReferralAlert(nextReferrals);
            return {
              referrals: nextReferrals,
              alerts: referralAlert ? mergeEmergencyAlerts([referralAlert], state.alerts) : state.alerts,
            };
          });
        }
        return;
      }
      if (['copilot_message', 'copilot_response', 'copilot_query_completed'].includes(type)) {
        const data = asRecord(payload);
        get().appendCopilotMessage({
          id: stringFrom(firstValue(data, ['id', 'messageId'])) || createId('copilot'),
          query: stringFrom(firstValue(data, ['query', 'prompt'])) || '',
          response:
            stringFrom(firstValue(data, ['response', 'answer', 'message', 'content'])) || '',
          safetyStatus: 'unknown',
          createdAt: stringFrom(firstValue(data, ['createdAt', 'timestamp'])) || nowIso(),
          raw: payload,
        });
        return;
      }
      if (
        ['integration_event', 'integration_event_received', 'integration_updated'].includes(type)
      ) {
        set((state) => ({
          integrationEvents: [
            { id: stableId('integration-event', payload), type, payload, receivedAt: nowIso() },
            ...state.integrationEvents,
          ].slice(0, INTEGRATION_EVENT_LIMIT),
        }));
      }
    },

    appendCopilotMessage: (message) =>
      set((state) => ({
        copilotMessages: capCopilotMessages([...state.copilotMessages, message]),
      })),

    upsertEmsIncomingPatient: (patient) =>
      set((state) => ({
        emsIncomingPatients: [
          normalizeEmsIncomingPatient(patient),
          ...state.emsIncomingPatients.filter((candidate) => candidate.id !== patient.id),
        ],
      })),

    addAlert: (alert) =>
      set((state) => ({
        alerts: mergeEmergencyAlerts([alert], state.alerts),
        workflowLogs: appendWorkflowLogs(state.workflowLogs, [
          alert.patientId
            ? {
                type: /ems/i.test(`${alert.title} ${alert.message}`)
                  ? 'ems_arrival_created'
                  : 'copilot_used',
                title: /ems/i.test(`${alert.title} ${alert.message}`)
                  ? 'EMS arrival created'
                  : 'Copilot used',
                summary: `${alert.title}: ${alert.message}`,
                patientId: alert.patientId,
                timestamp: alert.createdAt,
                source: 'alert-center',
                severity: alert.severity,
                metadata: {
                  alertId: alert.id,
                },
              }
            : null,
        ]),
      })),

    markAlertRead: (alertId) =>
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, read: true } : alert,
        ),
      })),

    acknowledgeAlert: (alertId) =>
      set((state) => {
        const acknowledgedAt = nowIso();
        return {
          alerts: state.alerts.map((alert) =>
            alert.id === alertId
              ? { ...alert, read: true, acknowledged: true, acknowledgedAt }
              : alert,
          ),
        };
      }),

    dismissAlert: (alertId) =>
      set((state) => {
        const dismissedAt = nowIso();
        return {
          alerts: state.alerts.map((alert) =>
            alert.id === alertId
              ? { ...alert, read: true, dismissed: true, dismissedAt }
              : alert,
          ),
        };
      }),

    setCapacity: (capacity) =>
      set((state) => ({
        capacity,
        capacityHistory: appendCapacityBandChange(
          state.capacityHistory,
          state.capacity,
          capacity,
          'set_capacity',
        ),
        workflowLogs:
          capacity.score !== state.capacity.score
            ? appendWorkflowLogs(state.workflowLogs, [
                {
                  type: 'capacity_score_changed',
                  title: 'Capacity score changed',
                  summary: `Capacity score changed from ${state.capacity.score} to ${capacity.score}.`,
                  source: 'capacity-engine',
                  severity: capacity.band === 'Red' ? 'Critical' : 'Warning',
                  metadata: {
                    fromScore: state.capacity.score,
                    toScore: capacity.score,
                    fromBand: state.capacity.band,
                    band: capacity.band,
                    reason: 'set_capacity',
                  },
                },
              ])
            : state.workflowLogs,
      })),

    addEMSArrival: (arrival) =>
      set((state) => {
        const timestamp = nowIso();
        const prepared = prepareCriticalChecklist(arrival, state.rooms, timestamp);
        const nextArrivals = [
          prepared.arrival,
          ...state.emsArrivals.filter((candidate) => candidate.id !== arrival.id),
        ];
        const arrivalAlert = buildEmsAlert({
          data: { arrivals: [prepared.arrival] },
        });

        return {
          rooms: prepared.rooms,
          emsArrivals: nextArrivals,
          alerts: arrivalAlert ? mergeEmergencyAlerts([arrivalAlert], state.alerts) : state.alerts,
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            {
              type: 'ems_arrival_created',
              title: 'EMS arrival created',
              summary: `${arrival.unitName} inbound: ${arrival.chiefComplaint}.`,
              timestamp,
              source: 'ems-pipeline',
              severity: arrival.severity === 'Critical' ? 'Critical' : 'Info',
              metadata: {
                arrivalId: arrival.id,
                unitId: arrival.unitId,
                criticalChecklistType: prepared.arrival.criticalChecklist?.type || null,
                preparedRoomId: prepared.arrival.preparedRoomId || null,
              },
            },
          ]),
        };
      }),

    prepareEMSBay: (arrivalId) =>
      set((state) => {
        const arrival = state.emsArrivals.find((candidate) => candidate.id === arrivalId);
        if (!arrival?.id || arrival.preparedRoomId) return {};

        const room = selectEMSPreparationRoom(state.rooms);
        if (!room) return {};

        return {
          rooms: state.rooms.map((candidate) =>
            candidate.id === room.id
              ? { ...candidate, status: 'Reserved' as const, currentPatientId: null }
              : candidate,
          ),
          emsArrivals: state.emsArrivals.map((candidate) =>
            candidate.id === arrivalId
              ? {
                  ...candidate,
                  preparedRoomId: room.id,
                  criticalChecklist: candidate.criticalChecklist
                    ? {
                        ...candidate.criticalChecklist,
                        assignedRoomId: room.id,
                        assignedRoomName: room.name,
                      }
                    : candidate.criticalChecklist,
                }
              : candidate,
          ),
        };
      }),

    updateEMSArrival: (arrivalId, patch) =>
      set((state) => ({
        emsArrivals: state.emsArrivals.map((arrival) =>
          arrival.id === arrivalId ? { ...arrival, ...patch } : arrival,
        ),
      })),

    checkCriticalEMSChecklistItem: (arrivalId, input) =>
      set((state) => ({
        emsArrivals: state.emsArrivals.map((arrival) => {
          if (arrival.id !== arrivalId || !arrival.criticalChecklist) return arrival;
          const completions = arrival.criticalChecklist.completions.filter(
            (completion) => completion.itemId !== input.itemId,
          );

          return {
            ...arrival,
            criticalChecklist: {
              ...arrival.criticalChecklist,
              completions: input.checked
                ? [
                    ...completions,
                    {
                      itemId: input.itemId,
                      label: input.label,
                      checkedByStaffId: input.staffId,
                      checkedByStaffName: input.staffName,
                      checkedAt: input.timestamp || nowIso(),
                    },
                  ]
                : completions,
            },
          };
        }),
      })),

    completeCriticalEMSChecklist: (arrivalId, input) =>
      set((state) => ({
        emsArrivals: state.emsArrivals.map((arrival) =>
          arrival.id === arrivalId && arrival.criticalChecklist
            ? {
                ...arrival,
                criticalChecklist: {
                  ...arrival.criticalChecklist,
                  completedAt: input.timestamp || nowIso(),
                  completedByStaffId: input.staffId,
                  completedByStaffName: input.staffName,
                },
              }
            : arrival,
        ),
      })),

    convertEMSArrivalToPatient: (arrivalId) =>
      set((state) => {
        const arrival = state.emsArrivals.find((candidate) => candidate.id === arrivalId);
        if (!arrival || arrival.patientId) return {};

        const timestamp = nowIso();
        const patient = emsArrivalToPatient(
          {
            ...arrival,
            status: 'Handoff',
            arrivedAt: arrival.arrivedAt || timestamp,
          },
          timestamp,
        );
        const convertedArrival = {
          ...arrival,
          status: 'Handoff' as const,
          patientId: patient.id,
          arrivedAt: arrival.arrivedAt || timestamp,
        };
        const patients = [patient, ...state.patients.filter((candidate) => candidate.id !== patient.id)];
        const rooms = state.rooms.map((room) =>
          room.id === patient.roomId
            ? {
                ...room,
                status: 'Occupied' as const,
                patientId: patient.id,
                currentPatientId: patient.id,
              }
            : room,
        );

        return {
          patients,
          rooms,
          capacity: buildCapacitySnapshot(patients, rooms),
          emsArrivals: state.emsArrivals.map((candidate) =>
            candidate.id === arrivalId ? convertedArrival : candidate,
          ),
          workflowLogs: appendWorkflowLogs(state.workflowLogs, [
            {
              type: 'ems_converted_to_patient',
              title: 'EMS converted to patient',
              summary: `${arrival.unitName} converted to whiteboard patient.`,
              patientId: patient.id,
              timestamp,
              source: 'ems-pipeline',
              severity: arrival.severity === 'Critical' ? 'Critical' : 'Info',
              metadata: {
                arrivalId: arrival.id,
                unitId: arrival.unitId,
                roomId: patient.roomId || null,
              },
            },
          ]),
        };
      }),

    initializeFlags: async () => {
      const tier = get().tier || DEFAULT_TIER;
      const defaults = buildDefaultFlags(tier);
      set((state) => ({ loading: true, flags: { ...defaults, ...state.flags } }));

      try {
        const result = await fetchSettingsFeatureFlags();
        if (!result?.ok) {
          throw new Error(result?.message || 'Feature settings endpoint unavailable.');
        }

        const backendTier = normalizeTier(result.data?.tier, tier);
        const backendDefaults = buildDefaultFlags(backendTier);
        const backendOverrides = normalizeBackendFlags(result.data);
        const nextState = {
          flags: { ...backendDefaults, ...backendOverrides },
          features: { ...DEFAULT_FEATURES, ...backendDefaults, ...backendOverrides },
          overrides: backendOverrides,
          tier: backendTier,
          loading: false,
          lastSynced: new Date(),
          backendAvailable: true,
          persistenceMode: 'backend' as FeaturePersistenceMode,
        };
        set(nextState);
        writeLocalFeatureSnapshot(nextState);
      } catch (_error) {
        const state = get();
        const localTier = state.tier || DEFAULT_TIER;
        const localDefaults = buildDefaultFlags(localTier);
        const nextState = {
          flags: { ...localDefaults, ...state.flags },
          features: { ...DEFAULT_FEATURES, ...localDefaults, ...state.flags },
          overrides: state.overrides,
          tier: localTier,
          loading: false,
          lastSynced: state.lastSynced,
          backendAvailable: false,
          persistenceMode: 'local' as FeaturePersistenceMode,
        };
        set(nextState);
        writeLocalFeatureSnapshot(nextState);
      }
    },

    toggleFeature: async (featureId, enabled, metadata = {}) => {
      const feature = FEATURE_REGISTRY_BY_ID[featureId];
      if (!feature) return false;
      const state = get();
      if (feature.tier === 'core' && !enabled) return false;
      if (enabled && !isFeatureAvailableForTier(feature, state.tier)) return false;
      if (enabled) {
        const unmetDependency = feature.dependencies.find(
          (dependencyId) => !state.isEnabled(dependencyId),
        );
        if (unmetDependency) return false;
      }

      const nextFlags = { ...state.flags, [featureId]: enabled };
      const nextOverrides = { ...state.overrides, [featureId]: enabled };
      const nextState = {
        flags: nextFlags,
        features: { ...state.features, ...nextFlags },
        overrides: nextOverrides,
        tier: state.tier,
        loading: false,
        lastSynced: state.lastSynced,
        backendAvailable: state.backendAvailable,
        persistenceMode: state.persistenceMode,
      };
      set(nextState);
      writeLocalFeatureSnapshot(nextState);

      const result =
        state.persistenceMode === 'local'
          ? { ok: true, localFallback: true, message: '' }
          : await persistFeatureOverride(featureId, enabled, metadata.changedBy).catch(
              (error: unknown) => ({
                ok: false,
                message: error instanceof Error ? error.message : String(error),
              }),
            );

      if (!result?.ok) {
        const rollbackState = {
          flags: state.flags,
          features: state.features,
          overrides: state.overrides,
          tier: state.tier,
          loading: false,
          lastSynced: state.lastSynced,
          backendAvailable: state.backendAvailable,
          persistenceMode: state.persistenceMode,
        };
        set(rollbackState);
        writeLocalFeatureSnapshot(rollbackState);
        throw new Error(result?.message || 'Unable to persist feature toggle.');
      }

      const lastSynced = new Date();
      set({ lastSynced });
      writeLocalFeatureSnapshot({ ...nextState, lastSynced });

      if (state.persistenceMode === 'local') {
        auditFeatureToggle(featureId, enabled, {
          tier: state.tier,
          backendPersisted: false,
          warning: !enabled ? get().getDependencyWarning(featureId) : null,
        });
      }
      return true;
    },

    setTier: (tier) => {
      const state = get();
      const flags = buildDefaultFlags(tier);
      const nextState = {
        flags,
        features: { ...DEFAULT_FEATURES, ...flags },
        overrides: {},
        tier,
        loading: false,
        lastSynced: state.lastSynced,
        backendAvailable: state.backendAvailable,
        persistenceMode: state.persistenceMode,
      };
      set(nextState);
      writeLocalFeatureSnapshot(nextState);
    },

    isEnabled: (featureId) => {
      const state = get();
      return resolveEffectiveFlag(featureId, state.flags, state.overrides, state.tier);
    },

    getEnabledFeatures: () => FEATURE_REGISTRY.filter((feature) => get().isEnabled(feature.id)),

    getDependencyWarning: (featureId) => {
      const state = get();
      const dependents = dependentEnabledFeatures(
        featureId,
        state.flags,
        state.overrides,
        state.tier,
      );
      if (!dependents.length) return null;
      const labels = dependents
        .map((feature) => feature.label)
        .slice(0, 4)
        .join(', ');
      const suffix = dependents.length > 4 ? ` and ${dependents.length - 4} more` : '';
      return `Disabling this feature will also disable dependent features: ${labels}${suffix}.`;
    },

    syncFeatureFlag: (payload) => {
      const change = normalizeSyncPayload(payload);
      if (!change) return null;
      const state = get();
      const nextState = {
        flags: { ...state.flags, [change.featureId]: change.enabled },
        features: { ...state.features, [change.featureId]: change.enabled },
        overrides: { ...state.overrides, [change.featureId]: change.enabled },
        tier: state.tier,
        loading: false,
        lastSynced: new Date(),
        backendAvailable: true,
        persistenceMode: 'backend' as FeaturePersistenceMode,
      };
      set(nextState);
      writeLocalFeatureSnapshot(nextState);
      return {
        featureId: change.featureId,
        enabled: change.enabled,
        changedBy: change.changedBy,
      };
    },

    recordWorkflowAction: (input) => {
      const log = createWorkflowLog(input);
      set((state) => ({
        workflowLogs: [
          log,
          ...state.workflowLogs.filter((candidate) => candidate.id !== log.id),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      }));
      return log;
    },

    requestAdditionalStaff: (input = {}) => {
      const state = get();
      const requestedAt = new Date().toISOString();
      const request: StaffingRequest = {
        id: createId('staffing-request'),
        requestedAt,
        requestedByStaffId:
          input.requestedByStaffId || state.activeShift.chargeStaffId || 'charge-nurse',
        requestedByName: input.requestedByName,
        reason:
          input.reason || `Capacity crisis ${state.capacity.band} at ${state.capacity.score}/100`,
        capacityScore: input.capacityScore ?? state.capacity.score,
        capacityBand: input.capacityBand || state.capacity.band,
        status: 'Requested',
        source: input.source || 'capacity-crisis-mode',
        metadata: input.metadata || {},
      };
      const log = createWorkflowLog({
        type: 'staffing_request_created',
        title: 'Staffing request created',
        summary: request.reason,
        actorStaffId: request.requestedByStaffId,
        timestamp: requestedAt,
        source: request.source,
        severity: 'Critical',
        metadata: {
          requestId: request.id,
          capacityScore: request.capacityScore,
          capacityBand: request.capacityBand,
          ...request.metadata,
        },
      });

      set((current) => ({
        staffingRequests: [request, ...current.staffingRequests],
        workflowLogs: [log, ...current.workflowLogs],
      }));

      return request;
    },

    setActiveScenario: (scenarioId) =>
      set(() => {
        const scenarioState = buildSrcEmergencyScenarioState(scenarioId);
        persistEdScenarioId(scenarioState.activeScenarioId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ed:scenario-selected', {
              detail: { scenarioId: scenarioState.activeScenarioId },
            }),
          );
        }
        return {
          patients: scenarioState.patients,
          staff: scenarioState.staff,
          rooms: scenarioState.rooms,
          capacity: scenarioState.capacity,
          capacityHistory: seedCapacityHistory(scenarioState.capacity),
          alerts: scenarioState.alerts,
          activeShift: scenarioState.activeShift || SEED_SHIFT,
          emsUnits: scenarioState.emsUnits || SEED_EMS_UNITS,
          emsArrivals: scenarioState.emsArrivals || scenarioState.emsUnits || SEED_EMS_UNITS,
          referrals: scenarioState.referrals || SEED_REFERRALS,
          activeScenarioId: scenarioState.activeScenarioId,
          activeScenario: scenarioState.activeScenario,
          scenarioData: scenarioState.scenarioData,
          queues: scenarioState.queues || [],
          selectedPatientId: null,
        };
      }),

    createReferral: (input) => {
      const now = new Date().toISOString();
      const referral: Referral = {
        id: input.id || createId('referral'),
        patientId: input.patientId,
        requestingStaffId: input.requestingStaffId || 's3',
        targetDepartment: input.targetDepartment || input.service || 'Other',
        urgency: input.urgency || 'Routine',
        reason: input.reason || input.summary || 'Referral requested.',
        clinicalSummary: input.clinicalSummary || input.summary || '',
        status: input.status || 'Draft',
        workflow: input.workflow || 'Referral',
        requestedAt: input.requestedAt || input.createdAt || now,
        createdAt: input.createdAt || now,
        respondedAt: input.respondedAt,
        responseNote: input.responseNote,
        summary: input.summary || input.reason || 'Referral requested.',
        service: input.service || input.targetDepartment || 'Other',
      } as Referral;

      set((state) => {
        const referrals = [referral, ...state.referrals];
        const referralAlert = buildReferralAlert([referral]);
        return {
        referrals,
        patients: state.patients.map((patient) =>
          patient.id === referral.patientId
            ? {
                ...patient,
                referral,
                timeline: [
                  ...patient.timeline,
                  createPatientTimelineEvent(
                    patient,
                    'ReferralCreated',
                    `Referral created for ${referral.targetDepartment}.`,
                    {
                      metadata: {
                        referralId: referral.id,
                        targetDepartment: referral.targetDepartment,
                        urgency: referral.urgency,
                      },
                    },
                  ),
                ],
              }
            : patient,
        ),
        auditLog: appendAuditLog(state.auditLog, {
          action: 'createReferral',
          patientId: referral.patientId,
          staffId: referral.requestingStaffId,
          details: {
            referralId: referral.id,
            targetDepartment: referral.targetDepartment,
            urgency: referral.urgency,
          },
        }),
        workflowLogs: appendWorkflowLogs(state.workflowLogs, [
          {
            type: 'referral_created',
            title: 'Referral created',
            summary: `${referral.targetDepartment} referral created.`,
            patientId: referral.patientId,
            actorStaffId: referral.requestingStaffId,
            source: 'referral-workflow',
            metadata: {
              referralId: referral.id,
              status: referral.status,
              urgency: referral.urgency,
            },
          },
        ]),
        alerts: referralAlert ? mergeEmergencyAlerts([referralAlert], state.alerts) : state.alerts,
      };
      });

      return referral;
    },

    updateReferralStatus: (referralId, status, responseNote) =>
      set((state) => {
        const now = new Date().toISOString();
        const referral = state.referrals.find((candidate) => candidate.id === referralId);
        const referrals = state.referrals.map((referral) =>
          referral.id === referralId
            ? {
                ...referral,
                status,
                responseNote: responseNote || referral.responseNote,
                respondedAt: status === 'Sent' || status === 'Draft' ? referral.respondedAt : now,
              }
            : referral,
        );
        const referralAlert = buildReferralAlert(referrals);
        return {
          referrals,
          alerts: referralAlert ? mergeEmergencyAlerts([referralAlert], state.alerts) : state.alerts,
          auditLog: appendAuditLog(
            state.auditLog,
            referral
              ? {
                  action: 'updateReferralStatus',
                  patientId: referral.patientId,
                  staffId: referral.requestingStaffId || 'system',
                  details: { referralId, status, hasResponseNote: Boolean(responseNote) },
                }
              : null,
          ),
        };
      }),

    loadEmergencyAnalytics: async () => {
      set((state) => ({
        emergencyAnalytics: {
          ...state.emergencyAnalytics,
          status: 'loading',
          message: '',
        },
      }));
      const state = get();
      try {
        const envelope = await fetchEmergencyAnalytics();
        const backendData = (envelope?.data || envelope || {}) as Record<string, unknown>;
        const nextState: EmergencyAnalyticsState = {
          status: 'ready',
          source: 'backend',
          loadedAt: new Date().toISOString(),
          message: envelope?.remainingGaps?.length
            ? envelope.remainingGaps.join(' ')
            : 'Using Emergency OS backend analytics.',
          data: buildBackendEmergencyAnalytics(state, backendData),
        };
        set({ emergencyAnalytics: nextState });
        return nextState;
      } catch (error) {
        const nextState: EmergencyAnalyticsState = {
          status: 'ready',
          source: 'client-fallback',
          loadedAt: new Date().toISOString(),
          message:
            error instanceof Error
              ? `Backend analytics unavailable: ${error.message}`
              : 'Using local Emergency OS operational state.',
          data: buildLocalEmergencyAnalytics(state),
        };
        set({ emergencyAnalytics: nextState });
        return nextState;
      }
    },

    hydrateFromApi: (payload) =>
      set((state) => {
        const patients = payload.patients
          ? [
              ...payload.patients,
              ...state.patients.filter(
                (patient) =>
                  !payload.patients!.some((payloadPatient) => payloadPatient.id === patient.id),
              ),
            ]
          : state.patients;
        const rooms = payload.rooms || state.rooms;
        const referrals = payload.referrals
          ? [
              ...payload.referrals,
              ...state.referrals.filter(
                (referral) =>
                  !payload.referrals!.some((payloadReferral) => payloadReferral.id === referral.id),
              ),
            ]
          : state.referrals;
        const capacity = payload.capacity || buildCapacitySnapshot(patients, rooms);
        const alerts = mergeEmergencyAlerts(payload.alerts, state.alerts);
        const workflowLogs = mergeWorkflowLogs(payload.workflowLogs, state.workflowLogs);
        const emergencySettings = payload.emergencySettings
          ? mergeEmergencyOsSettings(state.emergencySettings, payload.emergencySettings)
          : state.emergencySettings;
        return {
          patients,
          rooms,
          staff: payload.staff || state.staff,
          alerts,
          capacity,
          capacityHistory:
            payload.capacityHistory ||
            appendCapacityBandChange(
              state.capacityHistory,
              state.capacity,
              capacity,
              'hydrate_from_api',
            ),
          workflowLogs,
          activeShift: payload.activeShift || state.activeShift,
          emsUnits: payload.emsUnits || state.emsUnits,
          emsArrivals: payload.emsArrivals || state.emsArrivals,
          referrals,
          queues: payload.queues || state.queues,
          activeQueueFilter: payload.activeQueueFilter ?? state.activeQueueFilter,
          whiteboardSearchQuery: payload.whiteboardSearchQuery ?? state.whiteboardSearchQuery,
          loading: payload.loading ?? state.loading,
          emergencySettings,
          thresholds: payload.emergencySettings
            ? thresholdsFromSettings(emergencySettings, state.thresholds)
            : state.thresholds,
          features: payload.features || payload.flags || state.features,
          flags: payload.flags || payload.features || state.flags,
          overrides: payload.overrides || state.overrides,
          tier: payload.tier || state.tier,
        };
      }),
  }));

export type { EmergencyStoreState, FeatureFlags, FeatureOverrides, FeaturePersistenceMode };

export const useFeatureStore = useEmergencyStore;

export function subscribeToFeatureFlagSync(
  onExternalToggle?: (change: { featureId: string; enabled: boolean; changedBy?: string }) => void,
) {
  return subscribeToSettingsFeatureChanges((payload: unknown) => {
    const change = useEmergencyStore.getState().syncFeatureFlag(payload);
    if (change && typeof onExternalToggle === 'function') {
      onExternalToggle(change);
    }
  });
}

export function getPatientFlagType(
  flag: PatientFlag | string | { type?: PatientFlag | string },
): PatientFlag {
  const candidate = typeof flag === 'object' ? flag.type : flag;
  return Object.values(PatientFlag).includes(candidate as PatientFlag)
    ? (candidate as PatientFlag)
    : PatientFlag.HighRisk;
}

export function createPatientFlag(
  flag: PatientFlag | string | { type?: PatientFlag | string },
  options: Partial<PatientFlagRecord> = {},
): PatientFlagRecord {
  const type = getPatientFlagType(flag);
  const severity =
    options.severity ||
    (type === PatientFlag.HighRisk ||
    type === PatientFlag.DeteriorationRisk ||
    type === PatientFlag.SepsisAlert
      ? 'Critical'
      : 'Warning');

  return {
    type,
    reason: options.reason || 'Flagged for human review.',
    detectedAt: options.detectedAt || nowIso(),
    severity,
  };
}

export function hasPatientFlag(patient: Patient, flag: PatientFlag | string): boolean {
  return patient.flags.map(getPatientFlagType).includes(getPatientFlagType(flag));
}

export const selectActivePatients = (state: EmergencyStoreState): Patient[] =>
  state.patients.filter((patient) => patient.state !== PatientState.Discharge);

export const selectSelectedPatient = (state: EmergencyStoreState): Patient | null =>
  state.patients.find((patient) => patient.id === state.selectedPatientId) || null;

export const selectActiveAlerts = (state: EmergencyStoreState): Alert[] =>
  state.alerts.filter((alert) => !alert.dismissed);

export const selectReassessmentCount = (state: EmergencyStoreState): number =>
  state.patients.filter((patient) => hasPatientFlag(patient, PatientFlag.ReassessmentDue)).length;

export const selectReassessmentQueue = (state: EmergencyStoreState): Patient[] =>
  state.patients.filter((patient) => hasPatientFlag(patient, PatientFlag.ReassessmentDue));

export const selectQueueCounts = (state: EmergencyStoreState): Record<string, number> =>
  state.patients.reduce<Record<string, number>>((counts, patient) => {
    counts[patient.state] = (counts[patient.state] || 0) + 1;
    return counts;
  }, {});

export const selectQueuePanelRows = (state: EmergencyStoreState): Array<Record<string, any>> => {
  if (Array.isArray(state.queues) && state.queues.length) {
    return state.queues.map((queue) => {
      const queueRecord = queue as Record<string, any>;
      const averageWaitMinutes = Number(queueRecord.averageWaitMinutes || 0);
      const oldestWaitMinutes = Number(queueRecord.oldestWaitMinutes || queueRecord.longestWaitMinutes || 0);
      const targetWaitMinutes = Number(queueRecord.targetWaitMinutes || 30);
      return {
        ...queueRecord,
        type: queueRecord.type || queueRecord.label,
        name: queueRecord.name || queueRecord.label || queueRecord.type,
        count: Number(queueRecord.count ?? queueRecord.patientIds?.length ?? 0),
        averageWaitMinutes,
        oldestWaitMinutes,
        health:
          averageWaitMinutes > targetWaitMinutes || oldestWaitMinutes > targetWaitMinutes * 1.5
            ? 'red'
            : averageWaitMinutes > targetWaitMinutes * 0.8
              ? 'yellow'
              : 'green',
      };
    });
  }

  const counts = selectQueueCounts(state);
  return Object.entries(counts).map(([type, count]) => ({
    id: `queue-${type.toLowerCase()}`,
    type,
    name: type,
    count,
    averageWaitMinutes: 0,
    oldestWaitMinutes: 0,
    health: 'green',
    updatedAt: nowIso(),
  }));
};

export const selectEdQueueHealth = (state: EmergencyStoreState): Array<Record<string, any>> =>
  selectQueuePanelRows(state);

export const selectQueueOverallHealthScore = (state: EmergencyStoreState): number => {
  const rows = selectQueuePanelRows(state);
  if (!rows.length) return 100;
  const penalty = rows.reduce((sum, row) => {
    if (row.health === 'red') return sum + 18;
    if (row.health === 'yellow') return sum + 8;
    return sum;
  }, 0);
  return Math.max(0, 100 - penalty);
};

export const selectQueueBottleneckAlert = (state: EmergencyStoreState): Alert | null => {
  const explicitAlert =
    selectActiveAlerts(state).find((alert) =>
      /capacity|queue|wait|boarding/i.test(`${alert.title} ${alert.message}`),
    ) || null;
  if (explicitAlert) return explicitAlert;

  const bottleneck = selectQueuePanelRows(state)
    .filter((queue) => queue.count > 0)
    .sort(
      (a, b) =>
        Number(b.averageWaitMinutes || 0) - Number(a.averageWaitMinutes || 0) ||
        Number(b.oldestWaitMinutes || 0) - Number(a.oldestWaitMinutes || 0),
    )[0];

  if (!bottleneck || Number(bottleneck.averageWaitMinutes || 0) <= 0) return null;

  return {
    id: `queue-bottleneck-${bottleneck.type}`,
    type: 'Capacity',
    severity: bottleneck.health === 'red' ? 'Red' : 'Warning',
    title: `Bottleneck: ${bottleneck.type}`,
    message: `${bottleneck.count} patients, avg ${bottleneck.averageWaitMinutes}min`,
    queue: bottleneck.type,
    reason: `${bottleneck.count} patients, avg ${bottleneck.averageWaitMinutes}min`,
    createdAt: nowIso(),
    dismissed: false,
  } as Alert & { queue: string; reason: string };
};

export type EmergencyOperationalMetricKey =
  | 'patientsToday'
  | 'waiting'
  | 'longestWait'
  | 'averageWait'
  | 'emsInbound'
  | 'reassessmentsDue'
  | 'capacityScore'
  | 'boarders'
  | 'referralsPending';

export type EmergencyOperationalMetric = {
  key: EmergencyOperationalMetricKey;
  label: string;
  value: string | number;
  source: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
};

export type EmergencyOperationalSummary = {
  generatedAt: string;
  metrics: EmergencyOperationalMetric[];
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

function isBoardingPatient(patient: Patient): boolean {
  return (
    patient.state === PatientState.Admission ||
    patient.state === PatientState.Disposition ||
    hasPatientFlag(patient, PatientFlag.PendingAdmission)
  );
}

function isPendingReferral(referral: Referral): boolean {
  return !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(referral.status);
}

export const selectEmergencyOperationalSummary = (
  state: EmergencyStoreState,
): EmergencyOperationalSummary => {
  const today = localDateKey();
  const patientsToday = state.patients.filter(
    (patient) => localDateKey(patient.arrivalTime) === today,
  ).length;
  const waitingPatients = state.patients.filter((patient) => patient.state === PatientState.Waiting);
  const longestWaitMinutes =
    state.capacity.longestWaitMinutes ??
    waitingPatients.reduce(
      (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
      0,
    );
  const activePatients = selectActivePatients(state);
  const activeWaitMinutes = activePatients.map((patient) => minutesSince(patient.arrivalTime));
  const averageWaitMinutes = activeWaitMinutes.length
    ? Math.round(activeWaitMinutes.reduce((sum, wait) => sum + wait, 0) / activeWaitMinutes.length)
    : 0;
  const emsInbound =
    state.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length +
    state.emsIncomingPatients.length +
    state.emsUnits.filter((unit) => unit.status === 'Inbound').length;
  const reassessmentDue =
    state.capacity.reassessmentDueCount ??
    state.capacity.reassessmentDue ??
    selectReassessmentCount(state);
  const boarders = state.capacity.boardingCount ?? state.patients.filter(isBoardingPatient).length;
  const referralsPending = state.referrals.filter(isPendingReferral).length;

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        key: 'patientsToday',
        label: 'Patients Today',
        value: patientsToday,
        source: 'store.patients arrivalTime',
        tone: 'info',
      },
      {
        key: 'waiting',
        label: 'Waiting',
        value: waitingPatients.length,
        source: 'store.patients state',
        tone: waitingPatients.length ? 'warning' : 'success',
      },
      {
        key: 'longestWait',
        label: 'Longest Wait',
        value: formatWaitMinutes(longestWaitMinutes),
        source: 'capacity.longestWaitMinutes or waiting patient arrivalTime',
        tone: longestWaitMinutes >= 60 ? 'critical' : longestWaitMinutes >= 30 ? 'warning' : 'neutral',
      },
      {
        key: 'averageWait',
        label: 'Average Wait',
        value: formatWaitMinutes(averageWaitMinutes),
        source: 'active patient arrivalTime',
        tone: averageWaitMinutes >= 60 ? 'critical' : averageWaitMinutes >= 30 ? 'warning' : 'neutral',
      },
      {
        key: 'emsInbound',
        label: 'EMS Inbound',
        value: emsInbound,
        source: 'store.emsArrivals, emsIncomingPatients, emsUnits',
        tone: emsInbound ? 'warning' : 'success',
      },
      {
        key: 'reassessmentsDue',
        label: 'Reassessments Due',
        value: reassessmentDue,
        source: 'capacity reassessment count or ReassessmentDue flags',
        tone: reassessmentDue ? 'critical' : 'success',
      },
      {
        key: 'capacityScore',
        label: 'Capacity Score',
        value: `${state.capacity.score} ${state.capacity.band}`,
        source: 'store.capacity',
        tone:
          state.capacity.band === 'Red'
            ? 'critical'
            : state.capacity.band === 'Orange' || state.capacity.band === 'Yellow'
              ? 'warning'
              : 'success',
      },
      {
        key: 'boarders',
        label: 'Boarders',
        value: boarders,
        source: 'capacity.boardingCount or patient boarding state',
        tone: boarders ? 'warning' : 'success',
      },
      {
        key: 'referralsPending',
        label: 'Referrals Pending',
        value: referralsPending,
        source: 'store.referrals active statuses',
        tone: referralsPending ? 'warning' : 'success',
      },
    ],
  };
};
