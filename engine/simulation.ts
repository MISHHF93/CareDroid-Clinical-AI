import { hasPatientFlag, useEmergencyStore } from '../store/emergencyStore';
import {
  PatientState,
  Priority,
  type EMSArrival,
  type EMSUnit,
  type JourneyEvent,
  type Patient,
  type PatientFlagType,
  type Sex,
  type Vitals,
} from '../types/emergency';

const FLOW_INTERVAL_MS = 30_000;
const SAFETY_INTERVAL_MS = 120_000;
const EMS_INTERVAL_MS = 300_000;

type TimerHandle = number;

interface SimulationEngine {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

interface ArrivalTemplate {
  firstName: string;
  lastName: string;
  age: number;
  sex: Sex;
  dob: string;
  chiefComplaint: string;
  complaintCategory: string;
  priority: Priority.P3 | Priority.P4 | Priority.P5;
  vitals: Omit<Vitals, 'recordedAt'>;
}

interface EMSPreArrivalTemplate {
  complaint: string;
  category: string;
  priority: Priority.P2 | Priority.P3;
  severity: EMSArrival['severity'];
  vitals: Omit<Vitals, 'recordedAt'>;
}

const VALID_STATE_FLOW: Partial<Record<PatientState, PatientState[]>> = {
  [PatientState.Arrival]: [PatientState.Registration],
  [PatientState.Registration]: [PatientState.Triage],
  [PatientState.Triage]: [PatientState.Waiting, PatientState.Assessment],
  [PatientState.Waiting]: [PatientState.Assessment],
  [PatientState.Assessment]: [PatientState.Orders, PatientState.Results, PatientState.Disposition],
  [PatientState.Orders]: [PatientState.Results],
  [PatientState.Results]: [PatientState.Disposition],
  [PatientState.Disposition]: [PatientState.Admission, PatientState.Discharge],
  [PatientState.Admission]: [PatientState.Discharge],
};

const ARRIVAL_TEMPLATES: ArrivalTemplate[] = [
  {
    firstName: 'Nadia',
    lastName: 'Farah',
    age: 34,
    sex: 'Female',
    dob: '1992-02-18',
    chiefComplaint: 'Sore throat and fever after shift near Yonge and Dundas',
    complaintCategory: 'ENT',
    priority: Priority.P4,
    vitals: {
      hr: 94,
      bpSystolic: 122,
      bpDiastolic: 76,
      spo2: 99,
      temp: 38.1,
      rr: 16,
      gcs: 15,
      pain: 4,
    },
  },
  {
    firstName: 'Caleb',
    lastName: 'Reid',
    age: 29,
    sex: 'Male',
    dob: '1997-06-03',
    chiefComplaint: 'Laceration from kitchen knife in Leslieville',
    complaintCategory: 'Laceration',
    priority: Priority.P4,
    vitals: {
      hr: 86,
      bpSystolic: 128,
      bpDiastolic: 78,
      spo2: 100,
      temp: 36.6,
      rr: 14,
      gcs: 15,
      pain: 5,
    },
  },
  {
    firstName: 'Amelia',
    lastName: 'Rosen',
    age: 67,
    sex: 'Female',
    dob: '1959-01-24',
    chiefComplaint: 'Urinary symptoms and weakness from midtown condo',
    complaintCategory: 'Genitourinary',
    priority: Priority.P3,
    vitals: {
      hr: 102,
      bpSystolic: 134,
      bpDiastolic: 72,
      spo2: 97,
      temp: 37.9,
      rr: 18,
      gcs: 15,
      pain: 3,
    },
  },
  {
    firstName: 'Lucas',
    lastName: 'Moreno',
    age: 42,
    sex: 'Male',
    dob: '1984-10-12',
    chiefComplaint: 'Back strain after delivery route near Parkdale',
    complaintCategory: 'Musculoskeletal',
    priority: Priority.P5,
    vitals: {
      hr: 78,
      bpSystolic: 126,
      bpDiastolic: 80,
      spo2: 99,
      temp: 36.7,
      rr: 15,
      gcs: 15,
      pain: 6,
    },
  },
  {
    firstName: 'Mina',
    lastName: 'Sato',
    age: 55,
    sex: 'Female',
    dob: '1971-04-29',
    chiefComplaint: 'Mild shortness of breath while visiting Harbourfront',
    complaintCategory: 'Respiratory',
    priority: Priority.P3,
    vitals: {
      hr: 98,
      bpSystolic: 142,
      bpDiastolic: 84,
      spo2: 96,
      temp: 36.9,
      rr: 20,
      gcs: 15,
      pain: 2,
    },
  },
];

const EMS_TEMPLATES: EMSPreArrivalTemplate[] = [
  {
    complaint: 'Syncope at St. Lawrence Market, awake now',
    category: 'Syncope',
    priority: Priority.P2,
    severity: 'High',
    vitals: {
      hr: 58,
      bpSystolic: 96,
      bpDiastolic: 54,
      spo2: 98,
      temp: 36.4,
      rr: 16,
      gcs: 15,
      pain: 0,
    },
  },
  {
    complaint: 'Cyclist struck near Bloor and Spadina, shoulder pain',
    category: 'Trauma',
    priority: Priority.P3,
    severity: 'Moderate',
    vitals: {
      hr: 104,
      bpSystolic: 138,
      bpDiastolic: 82,
      spo2: 99,
      temp: 36.6,
      rr: 18,
      gcs: 15,
      pain: 7,
    },
  },
  {
    complaint: 'Older adult with fever and confusion from long-term care',
    category: 'Infectious',
    priority: Priority.P2,
    severity: 'High',
    vitals: {
      hr: 112,
      bpSystolic: 108,
      bpDiastolic: 62,
      spo2: 94,
      temp: 38.8,
      rr: 24,
      gcs: 13,
      pain: 2,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const nowIso = (): string => new Date().toISOString();

const minutesFromNow = (minutes: number): string =>
  new Date(Date.now() + minutes * 60_000).toISOString();

const minutesSince = (timestamp: string | null): number => {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((Date.now() - parsed) / 60_000));
};

const createJourneyEvent = (
  patientId: string,
  type: JourneyEvent['type'],
  summary: string,
  extra: Partial<JourneyEvent> = {}
): JourneyEvent => ({
  id: `sim-event-${patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  patientId,
  type,
  timestamp: nowIso(),
  summary,
  ...extra,
});

const patientDisplayName = (patient: Patient): string => `${patient.firstName} ${patient.lastName}`;

const pickActivePatients = (patients: Patient[]): Patient[] =>
  patients.filter(
    (patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased
  );

const nextStateForPatient = (patient: Patient): PatientState | null => {
  const candidates = VALID_STATE_FLOW[patient.state] ?? [];
  if (!candidates.length) return null;

  if (patient.priority === Priority.P1 || patient.priority === Priority.P2) {
    const assessment = candidates.find((state) => state === PatientState.Assessment);
    if (assessment) return assessment;
  }

  return randomItem(candidates);
};

const advanceRandomPatient = (): void => {
  const store = useEmergencyStore.getState();
  const candidates = pickActivePatients(store.patients).filter((patient) =>
    nextStateForPatient(patient)
  );
  if (!candidates.length) return;

  const patient = randomItem(candidates);
  const nextState = nextStateForPatient(patient);
  if (!nextState) return;

  store.movePatientToState(patient.id, nextState);
};

const varyVitals = (vitals: Vitals): Vitals => ({
  hr: vitals.hr === null ? null : clamp(vitals.hr + randomInt(-4, 5), 45, 150),
  bpSystolic:
    vitals.bpSystolic === null ? null : clamp(vitals.bpSystolic + randomInt(-6, 6), 80, 220),
  bpDiastolic:
    vitals.bpDiastolic === null ? null : clamp(vitals.bpDiastolic + randomInt(-4, 4), 40, 130),
  spo2: vitals.spo2 === null ? null : clamp(vitals.spo2 + randomInt(-1, 1), 88, 100),
  temp:
    vitals.temp === null
      ? null
      : Number(clamp(vitals.temp + randomInt(-2, 2) / 10, 35.4, 40.5).toFixed(1)),
  rr: vitals.rr === null ? null : clamp(vitals.rr + randomInt(-2, 2), 10, 32),
  gcs: vitals.gcs,
  pain: vitals.pain === null ? null : clamp(vitals.pain + randomInt(-1, 1), 0, 10),
  recordedAt: nowIso(),
});

const updateRandomVitals = (): void => {
  const store = useEmergencyStore.getState();
  const candidates = pickActivePatients(store.patients);
  const selected = [...candidates].sort(() => Math.random() - 0.5).slice(0, 2);

  selected.forEach((patient) => {
    store.addVitals(patient.id, varyVitals(patient.vitals));
  });
};

const createArrivalPatient = (template: ArrivalTemplate): Patient => {
  const id = `sim-arrival-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = nowIso();

  return {
    id,
    mrn: `MRN-SIM-${randomInt(100000, 999999)}`,
    firstName: template.firstName,
    lastName: template.lastName,
    dob: template.dob,
    age: template.age,
    sex: template.sex,
    arrivalTime: createdAt,
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: template.chiefComplaint,
    complaintCategory: template.complaintCategory,
    state: PatientState.Arrival,
    priority: template.priority,
    vitals: { ...template.vitals, recordedAt: createdAt },
    assignedStaffId: null,
    roomId: null,
    flags: [],
    timeline: [
      createJourneyEvent(
        id,
        'Arrival',
        `${template.firstName} ${template.lastName} arrived for urgent care.`
      ),
    ],
    notes: [],
  };
};

const addRandomArrival = (): void => {
  const template = randomItem(ARRIVAL_TEMPLATES);
  useEmergencyStore.getState().addPatient(createArrivalPatient(template));
};

const addFlagIfMissing = (patient: Patient, flag: PatientFlagType, reason: string): void => {
  if (!hasPatientFlag(patient, flag)) {
    useEmergencyStore.getState().addFlag(patient.id, flag, { reason });
  }
};

const runSafetyAndCapacityChecks = (): void => {
  const store = useEmergencyStore.getState();

  pickActivePatients(store.patients).forEach((patient) => {
    if (patient.state === PatientState.Waiting && minutesSince(patient.arrivalTime) > 45) {
      addFlagIfMissing(patient, 'ReassessmentDue', 'Extended wait');
    }

    if (
      (patient.priority === Priority.P1 || patient.priority === Priority.P2) &&
      patient.state !== PatientState.Assessment
    ) {
      addFlagIfMissing(patient, 'HighRisk', 'High priority not yet assessed');
    }
  });

  useEmergencyStore.getState().updateCapacity();
};

const createEMSPreArrival = (template: EMSPreArrivalTemplate): EMSArrival => {
  const id = `ems-arrival-sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const unitNumber = randomInt(100, 999);
  const unitId = `ems-unit-sim-${unitNumber}`;
  const etaMinutes = randomInt(7, 18);
  const estimatedArrivalTime = minutesFromNow(etaMinutes);
  const createdAt = nowIso();

  return {
    id,
    unitId,
    unitName: `TPS Medic ${unitNumber}`,
    crewNames: randomItem([
      ['Alex Morgan', 'Rina Patel'],
      ['Chris Wong', 'Maya Grant'],
      ['Sam Ali', 'Jordan Bell'],
    ]),
    patientAge: randomInt(28, 86),
    patientSex: randomItem(['Female', 'Male', 'Unknown']),
    chiefComplaint: template.complaint,
    mechanismOfInjury: template.category === 'Trauma' ? 'Reported traumatic mechanism' : undefined,
    vitals: { ...template.vitals, recordedAt: createdAt },
    eta: etaMinutes,
    severity: template.severity,
    dispatchTime: new Date(Date.now() - randomInt(4, 14) * 60_000).toISOString(),
    estimatedArrivalTime,
    status: 'Inbound',
    prearrivalComplaint: template.complaint,
    priority: template.priority,
    notes: `Pre-arrival notification from Toronto Paramedic Services. ETA ${new Date(
      estimatedArrivalTime
    ).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}. Basic vitals received en route.`,
    handoffSummary: `Pre-arrival notification: ${template.complaint}.`,
  };
};

const addEMSPreArrivalNotification = (): void => {
  const template = randomItem(EMS_TEMPLATES);
  const arrival = createEMSPreArrival(template);
  const unit: EMSUnit = {
    id: arrival.unitId,
    callSign: arrival.unitName,
    agency: 'Toronto Paramedic Services',
    status: 'Inbound',
    crewStaffIds: [],
    activeArrivalId: arrival.id,
    lastKnownLocation: randomItem([
      'Gardiner Expressway eastbound',
      'Bloor Street West approaching Spadina',
      'Danforth Avenue near Broadview',
      'University Avenue southbound',
    ]),
  };

  useEmergencyStore.setState((state) => ({
    emsUnits: [...state.emsUnits, unit],
  }));
  useEmergencyStore.getState().addEMSArrival(arrival);
};

const runFlowTick = (): void => {
  advanceRandomPatient();
  updateRandomVitals();
  addRandomArrival();
};

const createSimulationEngine = (): SimulationEngine => {
  let flowTimer: TimerHandle | null = null;
  let safetyTimer: TimerHandle | null = null;
  let emsTimer: TimerHandle | null = null;

  const stop = (): void => {
    if (flowTimer) window.clearInterval(flowTimer);
    if (safetyTimer) window.clearInterval(safetyTimer);
    if (emsTimer) window.clearInterval(emsTimer);
    flowTimer = null;
    safetyTimer = null;
    emsTimer = null;
  };

  const start = (): void => {
    if (flowTimer || typeof window === 'undefined') return;

    flowTimer = window.setInterval(runFlowTick, FLOW_INTERVAL_MS);
    safetyTimer = window.setInterval(runSafetyAndCapacityChecks, SAFETY_INTERVAL_MS);
    emsTimer = window.setInterval(addEMSPreArrivalNotification, EMS_INTERVAL_MS);
    runSafetyAndCapacityChecks();
  };

  return {
    start,
    stop,
    isRunning: () => Boolean(flowTimer),
  };
};

export const emergencySimulationEngine: SimulationEngine = createSimulationEngine();

export const startEmergencySimulation = (): void => emergencySimulationEngine.start();

export const stopEmergencySimulation = (): void => emergencySimulationEngine.stop();

export type { SimulationEngine };
