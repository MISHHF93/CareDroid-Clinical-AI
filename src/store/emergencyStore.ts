import { create } from 'zustand';
import {
  Alert,
  CapacitySnapshot,
  JourneyEvent,
  Note,
  Patient,
  PatientFlag,
  PatientState,
  Priority,
  Room,
  Staff,
  Vitals,
} from '../types/emergency';

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

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    totalPatients: patients.length,
    occupiedRooms,
    boardingCount,
    reassessmentDue,
    updatedAt: new Date().toISOString(),
  };
}

interface EmergencyStoreState {
  patients: Patient[];
  staff: Staff[];
  rooms: Room[];
  capacity: CapacitySnapshot;
  selectedPatientId: string | null;
  copilotOpen: boolean;
  alerts: Alert[];

  addPatient: (patient: Patient) => void;
  updatePatient: (patientId: string, patch: Partial<Patient>) => void;
  movePatientToState: (patientId: string, to: PatientState, staffId?: string, note?: string) => void;
  assignStaff: (patientId: string, staffId: string) => void;
  assignRoom: (patientId: string, roomId: string) => void;
  addFlag: (patientId: string, flag: PatientFlag) => void;
  removeFlag: (patientId: string, flag: PatientFlag) => void;
  addVitals: (patientId: string, vitals: Vitals) => void;
  selectPatient: (patientId: string | null) => void;
  toggleCopilot: () => void;
  addAlert: (alert: Alert) => void;
  setCapacity: (capacity: CapacitySnapshot) => void;
}

const initialCapacity = buildCapacitySnapshot(SEED_PATIENTS, SEED_ROOMS);

export const useEmergencyStore = create<EmergencyStoreState>((set) => ({
  patients: SEED_PATIENTS,
  staff: SEED_STAFF,
  rooms: SEED_ROOMS,
  capacity: initialCapacity,
  selectedPatientId: null,
  copilotOpen: false,
  alerts: [
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
    const patients = [...state.patients, patient];
    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  updatePatient: (patientId, patch) => set((state) => {
    const patients = state.patients.map((patient) =>
      patient.id === patientId ? { ...patient, ...patch } : patient
    );
    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  movePatientToState: (patientId, to, staffId = 's3', note) => set((state) => {
    const patients = state.patients.map((patient) => {
      if (patient.id !== patientId) return patient;

      const event: JourneyEvent = {
        id: createId('journey'),
        from: patient.state,
        to,
        timestamp: new Date().toISOString(),
        staffId,
        note,
      };

      return { ...patient, state: to, timeline: [...patient.timeline, event] };
    });

    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  assignStaff: (patientId, staffId) => set((state) => ({
    patients: state.patients.map((patient) =>
      patient.id === patientId ? { ...patient, assignedStaffId: staffId } : patient
    ),
  })),

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
      patient.id === patientId ? { ...patient, roomId } : patient
    );

    return { rooms, patients, capacity: buildCapacitySnapshot(patients, rooms) };
  }),

  addFlag: (patientId, flag) => set((state) => {
    const patients = state.patients.map((patient) => {
      if (patient.id !== patientId || patient.flags.includes(flag)) return patient;
      return { ...patient, flags: [...patient.flags, flag] };
    });

    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  removeFlag: (patientId, flag) => set((state) => {
    const patients = state.patients.map((patient) =>
      patient.id === patientId
        ? { ...patient, flags: patient.flags.filter((existingFlag) => existingFlag !== flag) }
        : patient
    );

    return { patients, capacity: buildCapacitySnapshot(patients, state.rooms) };
  }),

  addVitals: (patientId, vitals) => set((state) => ({
    patients: state.patients.map((patient) =>
      patient.id === patientId ? { ...patient, vitals: [...patient.vitals, vitals] } : patient
    ),
  })),

  selectPatient: (patientId) => set({ selectedPatientId: patientId }),

  toggleCopilot: () => set((state) => ({ copilotOpen: !state.copilotOpen })),

  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),

  setCapacity: (capacity) => set({ capacity }),
}));

export type { EmergencyStoreState };
