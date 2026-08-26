import { isSimulationModeActive } from '../services/simulationModeService';
import { hasPatientFlag, useEmergencyStore } from '../store/emergencyStore';
import {
  getNextStates,
  movePatientToState as movePatientWithJourneyRules,
} from './journeyEngine';
import { runCapacityIntelligence } from './capacityEngine';
import { runEmergencyReassessment } from './reassessmentEngine';
import { dispatch as dispatchAlert } from './alertEngine';
import {
  PatientState,
  Priority,
  QueueType,
  type EMSArrival,
  type EmsUnit,
  type JourneyEvent,
  type Patient,
  type PatientFlagType,
  type QueueSummary,
  type Sex,
  type Vitals,
} from '../types/emergency';

const FLOW_INTERVAL_MS = 30_000;
const ARRIVAL_AND_SAFETY_INTERVAL_MS = 60_000;
const EMS_INTERVAL_MS = 180_000;
const ALERT_INTERVAL_MS = 300_000;

type TimerHandle = number;

interface SimulationEngine {
  start: () => void;
  stop: () => void;
  toggle: () => boolean;
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
  {
    firstName: 'Avery',
    lastName: 'Chen',
    age: 8,
    sex: 'Female',
    dob: '2018-09-08',
    chiefComplaint: 'Pediatric fever and cough after daycare exposure in North York',
    complaintCategory: 'Pediatric',
    priority: Priority.P4,
    vitals: {
      hr: 112,
      bpSystolic: 104,
      bpDiastolic: 66,
      spo2: 98,
      temp: 38.3,
      rr: 22,
      gcs: 15,
      pain: 2,
    },
  },
  {
    firstName: 'Owen',
    lastName: 'MacDonald',
    age: 73,
    sex: 'Male',
    dob: '1953-11-15',
    chiefComplaint: 'Intermittent chest tightness while walking near Union Station',
    complaintCategory: 'Chest Pain',
    priority: Priority.P3,
    vitals: {
      hr: 96,
      bpSystolic: 152,
      bpDiastolic: 88,
      spo2: 97,
      temp: 36.7,
      rr: 18,
      gcs: 15,
      pain: 3,
    },
  },
  {
    firstName: 'Priya',
    lastName: 'Shah',
    age: 31,
    sex: 'Female',
    dob: '1995-03-05',
    chiefComplaint: 'Right lower quadrant abdominal pain from Scarborough walk-in clinic',
    complaintCategory: 'Abdominal Pain',
    priority: Priority.P3,
    vitals: {
      hr: 100,
      bpSystolic: 118,
      bpDiastolic: 74,
      spo2: 99,
      temp: 37.4,
      rr: 18,
      gcs: 15,
      pain: 7,
    },
  },
  {
    firstName: 'Jamal',
    lastName: 'Brooks',
    age: 46,
    sex: 'Male',
    dob: '1980-07-19',
    chiefComplaint: 'Anxiety and palpitations after stressful commute on Line 1',
    complaintCategory: 'Psychiatric',
    priority: Priority.P4,
    vitals: {
      hr: 108,
      bpSystolic: 136,
      bpDiastolic: 84,
      spo2: 99,
      temp: 36.8,
      rr: 20,
      gcs: 15,
      pain: 0,
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
  {
    complaint: 'Crushing chest pain with diaphoresis near Queen Street West',
    category: 'Chest Pain',
    priority: Priority.P2,
    severity: 'Critical',
    vitals: {
      hr: 124,
      bpSystolic: 184,
      bpDiastolic: 102,
      spo2: 93,
      temp: 36.9,
      rr: 24,
      gcs: 15,
      pain: 9,
    },
  },
  {
    complaint: 'Possible stroke, facial droop and slurred speech in Etobicoke',
    category: 'Stroke',
    priority: Priority.P2,
    severity: 'Critical',
    vitals: {
      hr: 88,
      bpSystolic: 178,
      bpDiastolic: 96,
      spo2: 96,
      temp: 36.5,
      rr: 18,
      gcs: 14,
      pain: 0,
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
} as JourneyEvent);

const patientDisplayName = (patient: Patient): string => `${patient.firstName} ${patient.lastName}`;

const pickActivePatients = (patients: Patient[]): Patient[] =>
  patients.filter(
    (patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased
  );

const nextStateForPatient = (patient: Patient): PatientState | null => {
  const candidates = getNextStates(patient.state);
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

  try {
    movePatientWithJourneyRules(patient.id, nextState, {
      staffId: patient.assignedStaffId || 'simulation-engine',
      note: 'Advanced by emergency simulation flow tick.',
    });
  } catch {
    // Expected when a patient state changes between tick planning and execution — simulation must not crash the live whiteboard.
  }
};

const numericVital = (value: Vitals[keyof Vitals]): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const fluctuate = (
  value: Vitals[keyof Vitals],
  deltaMin: number,
  deltaMax: number,
  min: number,
  max: number,
  precision = 0
): number | null => {
  const numeric = numericVital(value);
  if (numeric === null) return null;
  const nextValue = clamp(numeric + randomInt(deltaMin, deltaMax) / 10 ** precision, min, max);
  return precision ? Number(nextValue.toFixed(precision)) : Math.round(nextValue);
};

const vitalNumber = (value: Vitals[keyof Vitals], fallback: number): number =>
  numericVital(value) ?? fallback;

const fluctuateNumber = (
  value: number,
  deltaMin: number,
  deltaMax: number,
  min: number,
  max: number,
  precision = 0
): number => fluctuate(value, deltaMin, deltaMax, min, max, precision) ?? value;

const createVitalsReading = (
  vitals: Omit<Vitals, 'recordedAt'>,
  recordedAt: string
): Vitals => ({
  ...vitals,
  recordedAt,
});

const latestVitalsForPatient = (patient: Patient): Vitals | null =>
  patient.currentVitals ?? patient.vitals.at(-1) ?? null;

const numericQueueValue = (value: QueueSummary[keyof QueueSummary]): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const addOccasionalAbnormalSignal = (vitals: Vitals): Vitals => {
  if (Math.random() > 0.14) return vitals;

  const abnormalPattern = randomItem(['tachycardia', 'hypoxia', 'fever', 'hypotension', 'hypertension']);
  if (abnormalPattern === 'tachycardia') return { ...vitals, hr: randomInt(122, 138) };
  if (abnormalPattern === 'hypoxia') return { ...vitals, spo2: randomInt(90, 93) };
  if (abnormalPattern === 'fever') return { ...vitals, temp: Number((randomInt(386, 394) / 10).toFixed(1)) };
  if (abnormalPattern === 'hypotension') return { ...vitals, bpSystolic: randomInt(82, 89) };
  return { ...vitals, bpSystolic: randomInt(181, 198) };
};

const varyVitals = (vitals: Vitals): Vitals => {
  const hr = vitalNumber(vitals.hr ?? vitals.heartRate, 88);
  const bpSystolic = vitalNumber(vitals.bpSystolic ?? vitals.sbp, 122);
  const bpDiastolic = vitalNumber(vitals.bpDiastolic ?? vitals.dbp, 76);
  const spo2 = vitalNumber(vitals.spo2 ?? vitals.oxygenSaturation, 98);
  const temp = vitalNumber(vitals.temp ?? vitals.temperature, 36.9);
  const rr = vitalNumber(vitals.rr ?? vitals.respiratoryRate, 16);
  const pain = vitalNumber(vitals.pain ?? vitals.painScore, 3);

  const nextBpSystolic = fluctuateNumber(bpSystolic, -6, 6, 80, 220);
  const nextBpDiastolic = fluctuateNumber(bpDiastolic, -4, 4, 40, 130);
  const nextSpo2 = fluctuateNumber(spo2, -1, 1, 88, 100);
  const nextTemp = fluctuateNumber(temp, -2, 2, 35.4, 40.5, 1);
  const nextRr = fluctuateNumber(rr, -2, 2, 10, 32);
  const nextPain = fluctuateNumber(pain, -1, 1, 0, 10);

  return addOccasionalAbnormalSignal({
    ...vitals,
    hr: fluctuateNumber(hr, -4, 5, 45, 150),
    bpSystolic: nextBpSystolic,
    bpDiastolic: nextBpDiastolic,
    sbp: nextBpSystolic,
    dbp: nextBpDiastolic,
    spo2: nextSpo2,
    oxygenSaturation: nextSpo2,
    temp: nextTemp,
    temperature: nextTemp,
    rr: nextRr,
    respiratoryRate: nextRr,
    gcs: vitals.gcs,
    pain: nextPain,
    painScore: nextPain,
    recordedAt: nowIso(),
  });
};

const updateRandomVitals = (): void => {
  const store = useEmergencyStore.getState();
  const candidates = pickActivePatients(store.patients);
  const selected = [...candidates].sort(() => Math.random() - 0.5).slice(0, 2);

  selected.forEach((patient) => {
    const latestVitals = latestVitalsForPatient(patient);
    if (latestVitals) {
      store.addVitals(patient.id, varyVitals(latestVitals));
    }
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
    vitals: [createVitalsReading(template.vitals, createdAt)],
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

const addFlagIfMissing = (patient: Patient, flag: PatientFlagType, _reason: string): void => {
  if (!hasPatientFlag(patient, flag)) {
    useEmergencyStore.getState().addFlag(patient.id, flag);
  }
};

const runSafetyAndCapacityChecks = (): void => {
  runEmergencyReassessment();
  runCapacityIntelligence();
  useEmergencyStore.getState().updateAlerts();
};

const createEMSPreArrival = (template: EMSPreArrivalTemplate): EMSArrival => {
  const id = `ems-arrival-sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const unitNumber = randomInt(100, 999);
  const unitId = `ems-unit-sim-${unitNumber}`;
  const etaMinutes = randomInt(5, 15);
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
    vitals: createVitalsReading(template.vitals, createdAt),
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
  const unit: EmsUnit = {
    id: arrival.unitId,
    unitNumber: arrival.unitName,
    etaMinutes: arrival.eta,
    status: 'Inbound',
    acuity: arrival.priority,
  };

  useEmergencyStore.setState((state) => ({
    emsUnits: [...state.emsUnits, unit],
  }));
  useEmergencyStore.getState().addEMSArrival(arrival);
};

const triggerBottleneckAlert = (): void => {
  const store = useEmergencyStore.getState();
  const queues = store.queues.filter((queue) => Number(queue.patientCount ?? queue.count ?? 0) > 0);
  const queue = queues.length
    ? [...queues].sort(
        (a, b) =>
          (numericQueueValue(b.oldestWaitMinutes) ?? 0) -
          (numericQueueValue(a.oldestWaitMinutes) ?? 0)
      )[0]
    : null;
  const queueType = queue?.type ?? QueueType.Waiting;
  const patientCount =
    numericQueueValue(queue?.patientCount) ?? numericQueueValue(queue?.count) ?? randomInt(4, 8);
  const averageWait = Math.max(
    numericQueueValue(queue?.oldestWaitMinutes) ?? 0,
    randomInt(32, 58)
  );

  dispatchAlert({
    id: `alert-simulation-bottleneck-${queueType}`,
    type: 'Queue',
    severity: averageWait >= 45 ? 'Critical' : 'Warning',
    title: 'Demo bottleneck developing',
    message: `${queue?.name ?? queueType} queue has ${patientCount} patients with an average wait of ${averageWait} minutes.`,
    actionLabel: 'Review Queue',
    actionType: 'OPEN_QUEUE',
    autoDismissAfter: 5,
  });
};

const triggerReferralUnacknowledgedAlert = (): void => {
  const store = useEmergencyStore.getState();
  const patient = randomItem(pickActivePatients(store.patients));
  if (!patient) return;
  const elapsed = randomInt(16, 42);

  dispatchAlert({
    id: `alert-simulation-referral-${patient.id}`,
    type: 'Referral',
    severity: elapsed >= 30 ? 'Critical' : 'Warning',
    title: 'Demo referral unacknowledged',
    message: `${patientDisplayName(patient)} has an Internal Medicine referral with no acknowledgement after ${elapsed}m.`,
    patientId: patient.id,
    actionLabel: 'View Referral',
    actionType: 'OPEN_REFERRALS',
    autoDismissAfter: elapsed >= 30 ? undefined : 5,
  });
};

const triggerDeteriorationSignalAlert = (): void => {
  const store = useEmergencyStore.getState();
  const patient = randomItem(pickActivePatients(store.patients));
  if (!patient) return;
  const latestVitals = latestVitalsForPatient(patient);
  if (!latestVitals) return;

  const abnormalVitals = {
    ...varyVitals(latestVitals),
    hr: randomInt(124, 136),
    spo2: randomInt(90, 93),
    recordedAt: nowIso(),
  };

  store.addVitals(patient.id, abnormalVitals);
  addFlagIfMissing(patient, 'DeteriorationRisk', 'Simulation deterioration signal');
  dispatchAlert({
    id: `alert-simulation-deterioration-${patient.id}`,
    type: 'Reassessment',
    severity: 'Critical',
    title: 'Demo deterioration signal',
    message: `${patientDisplayName(patient)} has new abnormal vitals in the demo stream.`,
    patientId: patient.id,
    actionLabel: 'View Patient',
    actionType: 'VIEW_PATIENT',
  });
};

const triggerRandomDemoAlert = (): void => {
  randomItem([triggerBottleneckAlert, triggerReferralUnacknowledgedAlert, triggerDeteriorationSignalAlert])();
};

const runFlowTick = (): void => {
  advanceRandomPatient();
  updateRandomVitals();
};

const runArrivalAndSafetyTick = (): void => {
  addRandomArrival();
  runSafetyAndCapacityChecks();
};

export const isEmergencySimulationAvailable = (): boolean => {
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV;
  const viteEnv = import.meta.env;
  if (viteEnv.MODE === 'test') return false;
  if (isSimulationModeActive()) return true;
  const isSimulationMode = viteEnv.VITE_SIMULATION_MODE === 'true';
  const isDemoMode = viteEnv.VITE_DEMO_MODE === 'true';
  if (!isSimulationMode && !isDemoMode) return false;
  if (nodeEnv) return nodeEnv !== 'production' || isDemoMode || isSimulationMode;
  return !viteEnv.PROD || isDemoMode || isSimulationMode;
};

const createSimulationEngine = (): SimulationEngine => {
  let flowTimer: TimerHandle | null = null;
  let arrivalAndSafetyTimer: TimerHandle | null = null;
  let emsTimer: TimerHandle | null = null;
  let alertTimer: TimerHandle | null = null;

  const stop = (): void => {
    if (flowTimer) window.clearInterval(flowTimer);
    if (arrivalAndSafetyTimer) window.clearInterval(arrivalAndSafetyTimer);
    if (emsTimer) window.clearInterval(emsTimer);
    if (alertTimer) window.clearInterval(alertTimer);
    flowTimer = null;
    arrivalAndSafetyTimer = null;
    emsTimer = null;
    alertTimer = null;
  };

  const start = (): void => {
    if (flowTimer || typeof window === 'undefined' || !isEmergencySimulationAvailable()) return;

    flowTimer = window.setInterval(runFlowTick, FLOW_INTERVAL_MS);
    arrivalAndSafetyTimer = window.setInterval(
      runArrivalAndSafetyTick,
      ARRIVAL_AND_SAFETY_INTERVAL_MS
    );
    emsTimer = window.setInterval(addEMSPreArrivalNotification, EMS_INTERVAL_MS);
    alertTimer = window.setInterval(triggerRandomDemoAlert, ALERT_INTERVAL_MS);
    runSafetyAndCapacityChecks();
  };

  const toggle = (): boolean => {
    if (flowTimer) {
      stop();
      return false;
    }
    start();
    return Boolean(flowTimer);
  };

  return {
    start,
    stop,
    toggle,
    isRunning: () => Boolean(flowTimer),
  };
};

export const emergencySimulationEngine: SimulationEngine = createSimulationEngine();

export const startEmergencySimulation = (): void => emergencySimulationEngine.start();

export const stopEmergencySimulation = (): void => emergencySimulationEngine.stop();

// Simulation auto-start is owned by AppShell when platform simulation mode is active.

/** AppShell compatibility — delegates to the full emergency simulation engine. */
export function startSimulation(): number[] {
  startEmergencySimulation();
  return [];
}

export function stopSimulation(): void {
  stopEmergencySimulation();
}

export type { SimulationEngine };
