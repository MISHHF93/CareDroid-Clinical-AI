import { create } from 'zustand';
import {
  Alert,
  ActiveShift,
  CapacitySnapshot,
  EmsUnit,
  EmergencyFeatureFlags,
  JourneyEvent,
  Note,
  Patient,
  PatientFlag,
  PatientState,
  Priority,
  ReassessmentReminder,
  Referral,
  Room,
  Staff,
  Vitals,
  WorkflowActionLog,
  WorkflowActionType,
} from '../types/emergency';
import {
  ED_SCENARIO_DEMO_MODES,
  buildSrcEmergencyScenarioState,
  getInitialEdScenarioId,
  persistEdScenarioId,
} from '../data/edScenarioFixtures';

export function tMinus(mins: number): string {
  return new Date(Date.now() - mins * 60000).toISOString();
}

const SEED_PATIENTS: Patient[] = [
  { id:'p1', mrn:'ED-001234', firstName:'Marcus', lastName:'Chen',
    dob:'1965-03-14', age:59, sex:'M', arrivalTime: tMinus(95),
    chiefComplaint:'Chest pain radiating to left arm',
    complaintCategory:'Cardiac', state:PatientState.Assessment,
    priority:Priority.P2, vitals:[{hr:102,sbp:148,dbp:92,
    spo2:96,temp:36.8,rr:18,gcs:15,pain:7,
    recordedAt:tMinus(80),recordedBy:'s1'}],
    flags:[PatientFlag.HighRisk], assignedStaffId:'s1',
    roomId:'r3', notes:[], timeline:[] },

  { id:'p2', mrn:'ED-001235', firstName:'Sarah', lastName:'Okafor',
    dob:'1989-07-22', age:35, sex:'F', arrivalTime:tMinus(45),
    chiefComplaint:'Shortness of breath, wheezing',
    complaintCategory:'Respiratory', state:PatientState.Orders,
    priority:Priority.P3, vitals:[{hr:115,sbp:118,dbp:76,
    spo2:93,temp:37.1,rr:24,gcs:15,pain:5,
    recordedAt:tMinus(35),recordedBy:'s2'}],
    flags:[], assignedStaffId:'s2', roomId:'r7',
    notes:[], timeline:[] },

  { id:'p3', mrn:'ED-001236', firstName:'Dorothy', lastName:'Walsh',
    dob:'1948-11-03', age:76, sex:'F', arrivalTime:tMinus(180),
    chiefComplaint:'Confusion, fever',
    complaintCategory:'Sepsis', state:PatientState.Results,
    priority:Priority.P2, vitals:[{hr:118,sbp:88,dbp:54,
    spo2:94,temp:38.9,rr:22,gcs:13,pain:3,
    recordedAt:tMinus(30),recordedBy:'s1'}],
    flags:[PatientFlag.DeteriorationRisk, PatientFlag.SepsisAlert],
    assignedStaffId:'s1', roomId:'r2', notes:[], timeline:[] },

  { id:'p4', mrn:'ED-001237', firstName:'James', lastName:'Tremblay',
    dob:'1978-05-19', age:46, sex:'M', arrivalTime:tMinus(62),
    chiefComplaint:'Abdominal pain right lower quadrant',
    complaintCategory:'Abdominal', state:PatientState.Waiting,
    priority:Priority.P3, vitals:[{hr:96,sbp:124,dbp:80,
    spo2:98,temp:37.9,rr:16,gcs:15,pain:8,
    recordedAt:tMinus(55),recordedBy:'s3'}],
    flags:[PatientFlag.ReassessmentDue],
    assignedStaffId:'s3', notes:[], timeline:[] },

  { id:'p5', mrn:'ED-001238', firstName:'Amara', lastName:'Singh',
    dob:'2018-02-14', age:6, sex:'F', arrivalTime:tMinus(28),
    chiefComplaint:'Fever 39.8C, difficulty breathing',
    complaintCategory:'Pediatric', state:PatientState.Triage,
    priority:Priority.P2, vitals:[{hr:142,sbp:98,dbp:62,
    spo2:95,temp:39.8,rr:34,gcs:15,pain:6,
    recordedAt:tMinus(20),recordedBy:'s3'}],
    flags:[], assignedStaffId:'s2', notes:[], timeline:[] },

  { id:'p6', mrn:'ED-001239', firstName:'Evan', lastName:'MacDonald',
    dob:'1996-09-08', age:28, sex:'M', arrivalTime:tMinus(38),
    chiefComplaint:'Deep forearm laceration from kitchen knife',
    complaintCategory:'Trauma', state:PatientState.Waiting,
    priority:Priority.P4, vitals:[{hr:84,sbp:126,dbp:78,
    spo2:99,temp:36.7,rr:14,gcs:15,pain:6,
    recordedAt:tMinus(30),recordedBy:'s2'}],
    flags:[], assignedStaffId:'s2', notes:[], timeline:[] },

  { id:'p7', mrn:'ED-001240', firstName:'Nadia', lastName:'Farah',
    dob:'2002-12-01', age:22, sex:'F', arrivalTime:tMinus(74),
    chiefComplaint:'Twisted ankle playing soccer, unable to bear weight',
    complaintCategory:'Orthopedic', state:PatientState.Orders,
    priority:Priority.P4, vitals:[{hr:78,sbp:112,dbp:70,
    spo2:100,temp:36.6,rr:14,gcs:15,pain:7,
    recordedAt:tMinus(68),recordedBy:'s3'}],
    flags:[PatientFlag.LongWait], assignedStaffId:'s3', roomId:'r11',
    notes:[], timeline:[] },

  { id:'p8', mrn:'ED-001241', firstName:'Helen', lastName:'Kowalski',
    dob:'1954-04-27', age:70, sex:'F', arrivalTime:tMinus(120),
    chiefComplaint:'Burning urination, fever, flank discomfort',
    complaintCategory:'Infection', state:PatientState.Results,
    priority:Priority.P3, vitals:[{hr:104,sbp:132,dbp:74,
    spo2:97,temp:38.2,rr:18,gcs:15,pain:5,
    recordedAt:tMinus(50),recordedBy:'s1'}],
    flags:[PatientFlag.ReassessmentDue], assignedStaffId:'s1',
    roomId:'r8', notes:[], timeline:[] },

  { id:'p9', mrn:'ED-001242', firstName:'Luis', lastName:'Martinez',
    dob:'1983-01-30', age:41, sex:'M', arrivalTime:tMinus(52),
    chiefComplaint:'Acute low back pain after lifting at work',
    complaintCategory:'Musculoskeletal', state:PatientState.Waiting,
    priority:Priority.P4, vitals:[{hr:82,sbp:136,dbp:84,
    spo2:98,temp:36.9,rr:16,gcs:15,pain:8,
    recordedAt:tMinus(45),recordedBy:'s2'}],
    flags:[], assignedStaffId:'s2', notes:[], timeline:[] },

  { id:'p10', mrn:'ED-001243', firstName:'Mei', lastName:'Li',
    dob:'1991-06-18', age:33, sex:'F', arrivalTime:tMinus(18),
    chiefComplaint:'Diffuse itchy rash after new antibiotic',
    complaintCategory:'Allergy', state:PatientState.Registration,
    priority:Priority.P4, vitals:[{hr:88,sbp:118,dbp:72,
    spo2:99,temp:36.8,rr:16,gcs:15,pain:2,
    recordedAt:tMinus(12),recordedBy:'s3'}],
    flags:[], notes:[], timeline:[] },

  { id:'p11', mrn:'ED-001244', firstName:'Robert', lastName:'Baptiste',
    dob:'1960-10-09', age:64, sex:'M', arrivalTime:tMinus(83),
    chiefComplaint:'Severe headache with blood pressure 204/112',
    complaintCategory:'Hypertension', state:PatientState.Assessment,
    priority:Priority.P3, vitals:[{hr:92,sbp:204,dbp:112,
    spo2:97,temp:36.5,rr:18,gcs:15,pain:6,
    recordedAt:tMinus(70),recordedBy:'s1'}],
    flags:[PatientFlag.HighRisk], assignedStaffId:'s1',
    roomId:'r4', notes:[], timeline:[] },

  { id:'p12', mrn:'ED-001245', firstName:'Alyssa', lastName:'Green',
    dob:'1999-08-11', age:25, sex:'F', arrivalTime:tMinus(210),
    chiefComplaint:'Psychiatric hold, suicidal ideation, medically stable',
    complaintCategory:'Mental Health', state:PatientState.Disposition,
    priority:Priority.P3, vitals:[{hr:90,sbp:122,dbp:78,
    spo2:99,temp:36.7,rr:16,gcs:15,pain:0,
    recordedAt:tMinus(60),recordedBy:'s2'}],
    flags:[PatientFlag.PendingAdmission, PatientFlag.LongWait],
    assignedStaffId:'s2', roomId:'r12', notes:[], timeline:[] },
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
  { id: 'r12', name: 'Mental Health Hold', type: 'Isolation', status: 'Occupied', patientId: 'p12' },
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

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createPatientTimelineEvent(
  patient: Patient,
  type: NonNullable<JourneyEvent['type']>,
  summary: string,
  options: Partial<JourneyEvent> = {}
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
  referral_created: 'Referral created',
  copilot_used: 'Copilot used',
  provincial_data_viewed: 'Provincial data viewed',
  integration_event_received: 'Integration event received',
};

type WorkflowActionInput = Omit<WorkflowActionLog, 'id' | 'timestamp' | 'title' | 'severity' | 'status' | 'source' | 'metadata'> &
  Partial<Pick<WorkflowActionLog, 'id' | 'timestamp' | 'title' | 'severity' | 'status' | 'source' | 'metadata'>>;

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
  inputs: Array<WorkflowActionInput | null | undefined>
): WorkflowActionLog[] {
  const logs = inputs.filter(Boolean).map((input) => createWorkflowLog(input as WorkflowActionInput));
  return [...logs, ...existingLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function workflowLogFromJourneyEvent(
  event: JourneyEvent,
  patient: Patient,
  staff: Staff[] = []
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
    [PatientState.Admission, PatientState.Disposition].includes(patient.state)
  ).length;
  const reassessmentDue = patients.filter((patient) =>
    patient.flags.includes(PatientFlag.ReassessmentDue)
  ).length;
  const score = Math.min(
    100,
    Math.round((occupiedRooms / rooms.length) * 65 + boardingCount * 6 + reassessmentDue * 4)
  );
  const band =
    score >= 85 ? 'Red' :
    score >= 70 ? 'Orange' :
    score >= 50 ? 'Yellow' :
    'Green';

  return {
    score,
    band,
    label: `${band} capacity`,
    riskLevel: band,
    totalPatients: patients.length,
    occupiedRooms,
    boardingCount,
    reassessmentDue,
    updatedAt: new Date().toISOString(),
  };
}

function buildLocalEmergencyAnalytics(state: Pick<EmergencyStoreState, 'patients' | 'capacity' | 'activeShift'>) {
  const today = new Date().toISOString().slice(0, 10);
  const complaintCounts = new Map<string, number>();

  state.patients.forEach((patient) => {
    const complaint = patient.complaintCategory || patient.chiefComplaint || 'Other';
    complaintCounts.set(complaint, (complaintCounts.get(complaint) || 0) + 1);
  });

  return {
    shift: {
      id: state.activeShift.id,
      label: state.activeShift.label,
      patientsSeen: state.patients.filter((patient) => patient.state !== PatientState.Registration).length,
      dischargeCount: state.patients.filter((patient) => patient.state === PatientState.Discharge).length,
      reassessmentDueCount: state.patients.filter((patient) => hasPatientFlag(patient, PatientFlag.ReassessmentDue)).length,
      capacityScore: state.capacity.score,
    },
    operationalCommand: {
      dailyVolume: [{ date: today, count: state.patients.length }],
      topComplaints: [...complaintCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      capacity: state.capacity,
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

interface EmergencyStoreState {
  patients: Patient[];
  staff: Staff[];
  rooms: Room[];
  capacity: CapacitySnapshot;
  activeShift: ActiveShift;
  emsUnits: EmsUnit[];
  emsArrivals: EmsUnit[];
  referrals: Referral[];
  emergencyAnalytics: EmergencyAnalyticsState;
  activeScenarioId: string;
  activeScenario: any;
  availableScenarios: any[];
  scenarioData: any;
  queues: any[];
  selectedPatientId: string | null;
  copilotOpen: boolean;
  activeQueueFilter: string;
  loading: boolean;
  features: EmergencyFeatureFlags;
  alerts: Alert[];
  workflowLogs: WorkflowActionLog[];

  addPatient: (patient: Patient, options?: { syncToBackend?: boolean }) => void;
  updatePatient: (patientId: string, patch: Partial<Patient>) => void;
  movePatientToState: (
    patientId: string,
    to: PatientState,
    staffIdOrOptions?: string | { staffId?: string; note?: string; timelineEvent?: JourneyEvent },
    note?: string
  ) => void;
  dischargePatient: (patientId: string, options?: { staffId?: string; note?: string }) => void;
  assignStaff: (patientId: string, staffId: string) => void;
  assignRoom: (patientId: string, roomId: string) => void;
  addFlag: (patientId: string, flag: PatientFlag | string, options?: Partial<Alert>) => void;
  removeFlag: (patientId: string, flag: PatientFlag) => void;
  addVitals: (patientId: string, vitals: Vitals) => void;
  addNote: (patientId: string, note: Note) => void;
  scheduleReassessmentReminder: (
    patientId: string,
    reminder: Omit<ReassessmentReminder, 'id' | 'patientId' | 'status'>
  ) => ReassessmentReminder;
  completeReassessmentReminder: (
    patientId: string,
    reminderId: string,
    options?: { completedBy?: string; completedAt?: string }
  ) => void;
  selectPatient: (patientId: string | null) => void;
  setActiveQueueFilter: (filter: string) => void;
  setLoading: (loading: boolean) => void;
  toggleCopilot: () => void;
  addAlert: (alert: Alert) => void;
  setCapacity: (capacity: CapacitySnapshot) => void;
  setActiveScenario: (scenarioId: string) => void;
  createReferral: (input: Partial<Referral> & { patientId: string }) => Referral;
  updateReferralStatus: (referralId: string, status: Referral['status'], responseNote?: string) => void;
  loadEmergencyAnalytics: (options?: { force?: boolean }) => Promise<EmergencyAnalyticsState>;
  recordWorkflowAction: (input: WorkflowActionInput) => WorkflowActionLog;
  hydrateFromApi: (payload: Partial<{
    patients: Patient[];
    staff: Staff[];
    rooms: Room[];
    alerts: Alert[];
    capacity: CapacitySnapshot;
    workflowLogs: WorkflowActionLog[];
    activeShift: ActiveShift;
    emsUnits: EmsUnit[];
    emsArrivals: EmsUnit[];
    referrals: Referral[];
    activeQueueFilter: string;
    loading: boolean;
    features: EmergencyFeatureFlags;
  }>) => void;
}

const initialScenarioState = buildSrcEmergencyScenarioState(getInitialEdScenarioId());
const initialCapacity = initialScenarioState.capacity || buildCapacitySnapshot(SEED_PATIENTS, SEED_ROOMS);

export const useEmergencyStore = create<EmergencyStoreState>((set) => ({
  patients: initialScenarioState.patients || SEED_PATIENTS,
  staff: initialScenarioState.staff || SEED_STAFF,
  rooms: initialScenarioState.rooms || SEED_ROOMS,
  capacity: initialCapacity,
  activeShift: initialScenarioState.activeShift || SEED_SHIFT,
  emsUnits: initialScenarioState.emsUnits || initialScenarioState.emsArrivals || SEED_EMS_UNITS,
  emsArrivals: initialScenarioState.emsArrivals || SEED_EMS_UNITS,
  referrals: initialScenarioState.referrals || SEED_REFERRALS,
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
  activeQueueFilter: 'All',
  loading: false,
  features: DEFAULT_FEATURES,
  workflowLogs: [],
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

  addPatient: (patient) => set((state) => {
    const patientWithTimeline: Patient = {
      ...patient,
      timeline: patient.timeline.length
        ? patient.timeline
        : [
            createPatientTimelineEvent(patient, 'Intake', `Created patient ${patient.firstName} ${patient.lastName}.`, {
              to: patient.state,
              timestamp: patient.arrivalTime,
              staffId: patient.assignedStaffId || 'intake',
              metadata: {
                mrn: patient.mrn,
                priority: patient.priority,
                complaintCategory: patient.complaintCategory,
              },
            }),
          ],
    };
    const patients = [...state.patients, patientWithTimeline];
    const capacity = buildCapacitySnapshot(patients, state.rooms);
    return {
      patients,
      capacity,
      workflowLogs: appendWorkflowLogs(state.workflowLogs, [
        {
          type: 'patient_created',
          title: 'Patient created',
          summary: `Created patient ${patientWithTimeline.firstName} ${patientWithTimeline.lastName}.`,
          patientId: patientWithTimeline.id,
          actorStaffId: patientWithTimeline.assignedStaffId,
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

  updatePatient: (patientId, patch) => set((state) => {
    const patients = state.patients.map((patient) =>
      patient.id === patientId ? { ...patient, ...patch } : patient
    );
    const capacity = buildCapacitySnapshot(patients, state.rooms);
    return { patients, capacity };
  }),

  movePatientToState: (patientId, to, staffIdOrOptions = 's3', note) => set((state) => {
    const options = typeof staffIdOrOptions === 'string' ? { staffId: staffIdOrOptions, note } : staffIdOrOptions;
    const staffId = options.staffId || 's3';
    const beforePatient = state.patients.find((patient) => patient.id === patientId);
    const patients = state.patients.map((patient) => {
      if (patient.id !== patientId) return patient;

      const event: JourneyEvent =
        options.timelineEvent ||
        createPatientTimelineEvent(
          patient,
          to === PatientState.Discharge ? 'DispositionUpdated' : to === PatientState.Triage ? 'Triage' : 'StateChange',
          options.note || `Moved patient from ${patient.state} to ${to}.`,
          {
            from: patient.state,
            to,
            staffId,
            metadata: {
              fromState: patient.state,
              toState: to,
            },
          }
        );

      return { ...patient, state: to, timeline: [...patient.timeline, event] };
    });

    const capacity = buildCapacitySnapshot(patients, state.rooms);
    return {
      patients,
      capacity,
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
        beforePatient && to === PatientState.Admission && beforePatient.state !== PatientState.Admission
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

  dischargePatient: (patientId, options = {}) => set((state) => {
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
        : patient
    );
    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  assignStaff: (patientId, staffId) => set((state) => {
    const staffName = state.staff.find((member) => member.id === staffId)?.name || staffId;
    return {
      patients: state.patients.map((patient) =>
        patient.id === patientId
          ? {
              ...patient,
              assignedStaffId: staffId,
              timeline: [
                ...patient.timeline,
                createPatientTimelineEvent(patient, 'StaffAssignment', `Assigned clinician ${staffName}.`, {
                  staffId,
                  metadata: {
                    fromStaffId: patient.assignedStaffId || null,
                    toStaffId: staffId,
                  },
                }),
              ],
            }
          : patient
      ),
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

  assignRoom: (patientId, roomId) => set((state) => {
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
              createPatientTimelineEvent(patient, 'RoomAssignment', `Assigned room ${roomId}.`, {
                metadata: {
                  fromRoomId: patient.roomId || null,
                  toRoomId: roomId,
                },
              }),
            ],
          }
        : patient
    );

    return { rooms, patients, capacity: buildCapacitySnapshot(patients, rooms) };
  }),

  addFlag: (patientId, flag) => set((state) => {
    const normalizedFlag = Object.values(PatientFlag).includes(flag as PatientFlag)
      ? flag as PatientFlag
      : PatientFlag.HighRisk;
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
        normalizedFlag === PatientFlag.HighRisk || normalizedFlag === PatientFlag.DeteriorationRisk || normalizedFlag === PatientFlag.SepsisAlert
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

  removeFlag: (patientId, flag) => set((state) => {
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
        : patient
    );

    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  addVitals: (patientId, vitals) => set((state) => ({
    patients: state.patients.map((patient) =>
      patient.id === patientId
        ? {
            ...patient,
            vitals: [...patient.vitals, vitals],
            timeline: [
              ...patient.timeline,
              createPatientTimelineEvent(patient, 'VitalsUpdated', 'Vitals reassessment recorded.', {
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
                },
              }),
            ],
          }
        : patient
    ),
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
        },
      },
    ]),
  })),

  addNote: (patientId, note) => set((state) => ({
    patients: state.patients.map((patient) =>
      patient.id === patientId
        ? {
            ...patient,
            notes: [
              ...patient.notes,
              {
                ...note,
                id: note.id || createId('note'),
                patientId,
                timestamp: note.timestamp || note.createdAt || new Date().toISOString(),
              },
            ],
          }
        : patient
    ),
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
          : patient
      ),
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

  completeReassessmentReminder: (patientId, reminderId, options = {}) => set((state) => ({
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
                : reminder
            ),
          }
        : patient
    ),
  })),

  selectPatient: (patientId) => set({ selectedPatientId: patientId }),

  setActiveQueueFilter: (filter) => set({ activeQueueFilter: filter }),

  setLoading: (loading) => set({ loading }),

  toggleCopilot: () => set((state) => ({ copilotOpen: !state.copilotOpen })),

  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts],
    workflowLogs: appendWorkflowLogs(state.workflowLogs, [
      alert.patientId
        ? {
            type: /ems/i.test(`${alert.title} ${alert.message}`) ? 'ems_arrival_created' : 'copilot_used',
            title: /ems/i.test(`${alert.title} ${alert.message}`) ? 'EMS arrival created' : 'Copilot used',
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

  setCapacity: (capacity) => set((state) => ({
    capacity,
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
                band: capacity.band,
                reason: 'set_capacity',
              },
            },
          ])
        : state.workflowLogs,
  })),

  recordWorkflowAction: (input) => {
    const log = createWorkflowLog(input);
    set((state) => ({
      workflowLogs: [log, ...state.workflowLogs.filter((candidate) => candidate.id !== log.id)].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }));
    return log;
  },

  setActiveScenario: (scenarioId) => set(() => {
    const scenarioState = buildSrcEmergencyScenarioState(scenarioId);
    persistEdScenarioId(scenarioState.activeScenarioId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ed:scenario-selected', {
          detail: { scenarioId: scenarioState.activeScenarioId },
        })
      );
    }
    return {
      patients: scenarioState.patients,
      staff: scenarioState.staff,
      rooms: scenarioState.rooms,
      capacity: scenarioState.capacity,
      alerts: scenarioState.alerts,
      activeShift: scenarioState.activeShift || SEED_SHIFT,
      emsUnits: scenarioState.emsUnits || scenarioState.emsArrivals || SEED_EMS_UNITS,
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

    set((state) => ({
      referrals: [referral, ...state.referrals],
      patients: state.patients.map((patient) =>
        patient.id === referral.patientId
          ? {
              ...patient,
              referral,
              timeline: [
                ...patient.timeline,
                createPatientTimelineEvent(patient, 'ReferralCreated', `Referral created for ${referral.targetDepartment}.`, {
                  metadata: {
                    referralId: referral.id,
                    targetDepartment: referral.targetDepartment,
                    urgency: referral.urgency,
                  },
                }),
              ],
            }
          : patient
      ),
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
    }));

    return referral;
  },

  updateReferralStatus: (referralId, status, responseNote) => set((state) => {
    const now = new Date().toISOString();
    return {
      referrals: state.referrals.map((referral) =>
        referral.id === referralId
          ? {
              ...referral,
              status,
              responseNote: responseNote || referral.responseNote,
              respondedAt: status === 'Sent' || status === 'Draft' ? referral.respondedAt : now,
            }
          : referral
      ),
    };
  }),

  loadEmergencyAnalytics: async () => {
    const state = useEmergencyStore.getState();
    const nextState: EmergencyAnalyticsState = {
      status: 'ready',
      source: 'client-fallback',
      loadedAt: new Date().toISOString(),
      message: 'Using local Emergency OS operational state.',
      data: buildLocalEmergencyAnalytics(state),
    };
    set({ emergencyAnalytics: nextState });
    return nextState;
  },

  hydrateFromApi: (payload) => set((state) => {
    const patients = payload.patients
      ? [
          ...payload.patients,
          ...state.patients.filter(
            (patient) => !payload.patients!.some((payloadPatient) => payloadPatient.id === patient.id)
          ),
        ]
      : state.patients;
    const rooms = payload.rooms || state.rooms;
    const referrals = payload.referrals
      ? [
          ...payload.referrals,
          ...state.referrals.filter(
            (referral) => !payload.referrals!.some((payloadReferral) => payloadReferral.id === referral.id)
          ),
        ]
      : state.referrals;
    return {
      patients,
      rooms,
      staff: payload.staff || state.staff,
      alerts: payload.alerts || state.alerts,
      capacity: payload.capacity || buildCapacitySnapshot(patients, rooms),
      workflowLogs: payload.workflowLogs || state.workflowLogs,
      activeShift: payload.activeShift || state.activeShift,
      emsUnits: payload.emsUnits || payload.emsArrivals || state.emsUnits,
      emsArrivals: payload.emsArrivals || payload.emsUnits || state.emsArrivals,
      referrals,
      activeQueueFilter: payload.activeQueueFilter || state.activeQueueFilter,
      loading: payload.loading ?? state.loading,
      features: payload.features || state.features,
    };
  }),
}));

export type { EmergencyStoreState };

export function getPatientFlagType(flag: PatientFlag | string | { type?: PatientFlag | string }): PatientFlag {
  const candidate = typeof flag === 'object' ? flag.type : flag;
  return Object.values(PatientFlag).includes(candidate as PatientFlag)
    ? candidate as PatientFlag
    : PatientFlag.HighRisk;
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

export const selectQueueBottleneckAlert = (state: EmergencyStoreState): Alert | null =>
  selectActiveAlerts(state).find((alert) => /capacity|queue|wait|boarding/i.test(`${alert.title} ${alert.message}`)) || null;
