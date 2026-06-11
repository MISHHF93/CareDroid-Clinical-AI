import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PatientState, QueueType } from '../types';
import CapacityIntelligence from '../services/CapacityIntelligence';
import PatientJourneyEngine from '../services/PatientJourneyEngine';
import ReassessmentEngine from '../services/ReassessmentEngine';

/** @typedef {import('../types').Patient} Patient */
/** @typedef {import('../types').PatientVitals} PatientVitals */

export const DAILY_TORONTO_URGENT_CARE_VOLUME = 100;

export const URGENT_CARE_STAFF = Object.freeze([
  Object.freeze({ id: 'staff-ahmed-khan', name: 'Dr. Ahmed Khan', role: 'Physician' }),
  Object.freeze({ id: 'staff-laura-singh', name: 'Dr. Laura Singh', role: 'Physician' }),
  Object.freeze({ id: 'staff-priya-shah', name: 'NP Priya Shah', role: 'Nurse Practitioner' }),
  Object.freeze({ id: 'staff-olivia-thompson', name: 'RN Olivia Thompson', role: 'Triage RN' }),
  Object.freeze({ id: 'staff-marcus-lee', name: 'RN Marcus Lee', role: 'Flow RN' }),
]);

const QUEUE_STATE_MAP = Object.freeze({
  [PatientState.Arrival]: QueueType.Triage,
  [PatientState.Registration]: QueueType.Triage,
  [PatientState.Triage]: QueueType.Triage,
  [PatientState.Waiting]: QueueType.Waiting,
  [PatientState.Assessment]: QueueType.Provider,
  [PatientState.Orders]: QueueType.Provider,
  [PatientState.Results]: QueueType.Results,
  [PatientState.Disposition]: QueueType.Referral,
  [PatientState.Admission]: QueueType.Admission,
  [PatientState.Discharge]: QueueType.Discharge,
});

const QUEUE_TARGET_STATE_MAP = Object.freeze({
  [QueueType.Waiting]: PatientState.Waiting,
  [QueueType.Triage]: PatientState.Triage,
  [QueueType.Provider]: PatientState.Assessment,
  [QueueType.Results]: PatientState.Results,
  [QueueType.Referral]: PatientState.Disposition,
  [QueueType.Admission]: PatientState.Admission,
  [QueueType.Discharge]: PatientState.Discharge,
  [QueueType.Reassessment]: PatientState.Assessment,
});

export const TORONTO_URGENT_CARE_PATIENTS = Object.freeze([
  Object.freeze({
    id: 'tor-uc-001',
    name: 'Maya Chen',
    location: 'Bed 1',
    arrivalTime: '2026-06-10T20:02:00-04:00',
    complaint: 'Chest pain after climbing stairs',
    state: PatientState.Assessment,
    priority: 'CTAS 2',
    vitals: Object.freeze({
      temperature: 36.8,
      heartRate: 112,
      respiratoryRate: 22,
      bloodPressure: '148/92',
      oxygenSaturation: 96,
      painScore: 7,
    }),
    vitalsUpdatedAt: '2026-06-10T21:30:00-04:00',
    assignedTo: 'Dr. Ahmed Khan',
  }),
  Object.freeze({
    id: 'tor-uc-002',
    name: 'Lucas Martin',
    location: 'Waiting Chair 2',
    arrivalTime: '2026-06-10T19:55:00-04:00',
    complaint: 'Fever and cough after school outbreak',
    state: PatientState.Waiting,
    priority: 'CTAS 4',
    vitals: Object.freeze({
      temperature: 38.6,
      heartRate: 104,
      respiratoryRate: 20,
      bloodPressure: '112/70',
      oxygenSaturation: 98,
      painScore: 2,
    }),
    vitalsUpdatedAt: '2026-06-10T20:54:00-04:00',
    assignedTo: null,
  }),
  Object.freeze({
    id: 'tor-uc-003',
    name: 'Sofia Rossi',
    location: 'Procedure Bay 3',
    arrivalTime: '2026-06-10T20:38:00-04:00',
    complaint: 'Hand laceration from kitchen knife',
    state: PatientState.Orders,
    priority: 'CTAS 3',
    vitals: Object.freeze({
      temperature: 36.9,
      heartRate: 88,
      respiratoryRate: 16,
      bloodPressure: '126/78',
      oxygenSaturation: 99,
      painScore: 5,
    }),
    vitalsUpdatedAt: '2026-06-10T21:18:00-04:00',
    assignedTo: 'NP Priya Shah',
  }),
  Object.freeze({
    id: 'tor-uc-004',
    name: 'Noah Williams',
    location: 'Bed 4',
    arrivalTime: '2026-06-10T20:14:00-04:00',
    complaint: 'Right lower abdominal pain and nausea',
    state: PatientState.Results,
    priority: 'CTAS 3',
    vitals: Object.freeze({
      temperature: 37.8,
      heartRate: 96,
      respiratoryRate: 18,
      bloodPressure: '118/76',
      oxygenSaturation: 98,
      painScore: 8,
    }),
    vitalsUpdatedAt: '2026-06-10T20:58:00-04:00',
    assignedTo: 'Dr. Laura Singh',
  }),
  Object.freeze({
    id: 'tor-uc-005',
    name: 'Aisha Patel',
    location: 'Triage 1',
    arrivalTime: '2026-06-10T21:06:00-04:00',
    complaint: 'Chest tightness with anxiety history',
    state: PatientState.Triage,
    priority: 'CTAS 2',
    vitals: Object.freeze({
      temperature: 36.7,
      heartRate: 118,
      respiratoryRate: 24,
      bloodPressure: '136/84',
      oxygenSaturation: 97,
      painScore: 6,
    }),
    vitalsUpdatedAt: '2026-06-10T21:08:00-04:00',
    assignedTo: 'RN Olivia Thompson',
  }),
  Object.freeze({
    id: 'tor-uc-006',
    name: 'Ethan Brown',
    location: 'Registration 2',
    arrivalTime: '2026-06-10T20:20:00-04:00',
    complaint: 'Forearm laceration from construction site',
    state: PatientState.Registration,
    priority: 'CTAS 4',
    vitals: Object.freeze({
      temperature: 36.5,
      heartRate: 82,
      respiratoryRate: 16,
      bloodPressure: '124/80',
      oxygenSaturation: 99,
      painScore: 4,
    }),
    vitalsUpdatedAt: '2026-06-10T21:20:00-04:00',
    assignedTo: 'RN Marcus Lee',
  }),
  Object.freeze({
    id: 'tor-uc-007',
    name: 'Grace Kim',
    location: 'Bed 7',
    arrivalTime: '2026-06-10T20:46:00-04:00',
    complaint: 'Fever, chills, and urinary symptoms',
    state: PatientState.Disposition,
    priority: 'CTAS 3',
    vitals: Object.freeze({
      temperature: 39.1,
      heartRate: 108,
      respiratoryRate: 19,
      bloodPressure: '104/68',
      oxygenSaturation: 97,
      painScore: 5,
    }),
    vitalsUpdatedAt: '2026-06-10T21:10:00-04:00',
    assignedTo: 'Dr. Ahmed Khan',
  }),
  Object.freeze({
    id: 'tor-uc-008',
    name: 'Daniel Nguyen',
    location: 'Discharge Chair 8',
    arrivalTime: '2026-06-10T19:42:00-04:00',
    complaint: 'Severe abdominal pain after restaurant meal',
    state: PatientState.Discharge,
    priority: 'CTAS 4',
    vitals: Object.freeze({
      temperature: 37.2,
      heartRate: 90,
      respiratoryRate: 17,
      bloodPressure: '122/74',
      oxygenSaturation: 99,
      painScore: 3,
    }),
    vitalsUpdatedAt: '2026-06-10T20:22:00-04:00',
    assignedTo: 'NP Priya Shah',
  }),
]);

export function getQueueForPatientState(state) {
  return QUEUE_STATE_MAP[state] || QueueType.Waiting;
}

export function deriveQueueCounts(patients) {
  const counts = Object.values(QueueType).reduce(
    (acc, queueType) => ({
      ...acc,
      [queueType]: 0,
    }),
    {}
  );

  patients.forEach((patient) => {
    const queue = getQueueForPatientState(patient.state);
    counts[queue] += 1;
  });

  return counts;
}

export function deriveCapacityScore(patients) {
  return CapacityIntelligence.getCapacitySnapshot({
    patients,
    reassessmentQueueLength: ReassessmentEngine.getReassessmentQueue(patients).length,
  }).score;
}

function minutesSinceArrival(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function deriveStaffWorkloads(patients) {
  return URGENT_CARE_STAFF.map((staffMember) => ({
    ...staffMember,
    activePatients: patients.filter(
      (patient) => patient.assignedTo === staffMember.name && patient.state !== PatientState.Discharge
    ).length,
  }));
}

function deriveShiftSummary(patients, reassessmentQueue) {
  const seenStates = new Set([
    PatientState.Assessment,
    PatientState.Orders,
    PatientState.Results,
    PatientState.Disposition,
    PatientState.Admission,
    PatientState.Discharge,
  ]);
  const seenPatients = patients.filter((patient) => seenStates.has(patient.state));
  const totalWait = patients.reduce((sum, patient) => sum + minutesSinceArrival(patient.arrivalTime), 0);
  const dispositions = {
    [PatientState.Disposition]: patients.filter((patient) => patient.state === PatientState.Disposition).length,
    [PatientState.Admission]: patients.filter((patient) => patient.state === PatientState.Admission).length,
    [PatientState.Discharge]: patients.filter((patient) => patient.state === PatientState.Discharge).length,
  };

  return {
    patientsSeen: seenPatients.length,
    averageWaitMinutes: patients.length ? Math.round(totalWait / patients.length) : 0,
    dispositions,
    flaggedEvents: reassessmentQueue.length,
  };
}

const DEFAULT_REASSESSMENT_QUEUE = ReassessmentEngine.getReassessmentQueue(TORONTO_URGENT_CARE_PATIENTS);
const DEFAULT_CAPACITY_SNAPSHOT = CapacityIntelligence.getCapacitySnapshot({
  patients: TORONTO_URGENT_CARE_PATIENTS,
  reassessmentQueueLength: DEFAULT_REASSESSMENT_QUEUE.length,
});

const DEFAULT_EMERGENCY_DEPARTMENT_CONTEXT = Object.freeze({
  dailyVolume: DAILY_TORONTO_URGENT_CARE_VOLUME,
  staffMembers: URGENT_CARE_STAFF,
  patients: TORONTO_URGENT_CARE_PATIENTS.map((patient) => ({ ...patient })),
  journeyAuditTrail: {},
  whiteboardFilter: { queue: null, complaint: null },
  staffWorkloads: [],
  shiftSummary: {
    patientsSeen: 0,
    averageWaitMinutes: 0,
    dispositions: {},
    flaggedEvents: 0,
  },
  reassessmentQueue: DEFAULT_REASSESSMENT_QUEUE,
  queueCounts: deriveQueueCounts(TORONTO_URGENT_CARE_PATIENTS),
  capacitySnapshot: DEFAULT_CAPACITY_SNAPSHOT,
  capacityScore: DEFAULT_CAPACITY_SNAPSHOT.score,
  addPatient: () => {},
  setWhiteboardFilter: () => {},
  clearWhiteboardFilter: () => {},
  flagPatientForReassessment: () => ({ ok: false, message: 'Emergency Department store is not mounted.' }),
  assignPatientToStaff: () => ({ ok: false, message: 'Emergency Department store is not mounted.' }),
  updatePatientState: () => {},
  movePatientToNextState: () => ({ ok: false, message: 'Emergency Department store is not mounted.' }),
  moveQueue: () => {},
});

const EmergencyDepartmentContext = createContext(DEFAULT_EMERGENCY_DEPARTMENT_CONTEXT);

export function EmergencyDepartmentProvider({ children }) {
  const [patients, setPatients] = useState(() => TORONTO_URGENT_CARE_PATIENTS.map((patient) => ({ ...patient })));
  const [journeyAuditTrail, setJourneyAuditTrail] = useState({});
  const [whiteboardFilter, setWhiteboardFilterState] = useState({ queue: null, complaint: null });
  const [manualReassessmentFlags, setManualReassessmentFlags] = useState([]);
  const [reassessmentQueue, setReassessmentQueue] = useState(() =>
    ReassessmentEngine.getReassessmentQueue(TORONTO_URGENT_CARE_PATIENTS)
  );

  const appendAuditEvent = useCallback((auditEvent) => {
    if (!auditEvent?.patientId) return;

    setJourneyAuditTrail((currentTrail) => ({
      ...currentTrail,
      [auditEvent.patientId]: [...(currentTrail[auditEvent.patientId] || []), auditEvent],
    }));
  }, []);

  const addPatient = useCallback((patient) => {
    setPatients((currentPatients) => [...currentPatients, patient]);
  }, []);

  const setWhiteboardFilter = useCallback((filter = {}) => {
    setWhiteboardFilterState((currentFilter) => ({
      queue: Object.prototype.hasOwnProperty.call(filter, 'queue') ? filter.queue : currentFilter.queue,
      complaint: Object.prototype.hasOwnProperty.call(filter, 'complaint') ? filter.complaint : currentFilter.complaint,
    }));
  }, []);

  const clearWhiteboardFilter = useCallback(() => {
    setWhiteboardFilterState({ queue: null, complaint: null });
  }, []);

  const flagPatientForReassessment = useCallback((target, reason = 'ED Copilot manual reassessment flag') => {
    const normalizedTarget = String(target || '').trim().toLowerCase();
    const patient = patients.find((currentPatient) => {
      const fields = [
        currentPatient.id,
        currentPatient.name,
        currentPatient.location,
        currentPatient.location?.replace(/^bed\s*/i, ''),
      ];
      return fields.some((field) => String(field || '').trim().toLowerCase() === normalizedTarget);
    });

    if (!patient) {
      return {
        ok: false,
        message: `No patient matched ${target}.`,
      };
    }

    const manualFlag = Object.freeze({
      patientId: patient.id,
      patientName: patient.name,
      state: patient.state,
      priority: patient.priority,
      waitingMinutes: 0,
      vitalsAgeMinutes: 0,
      reasons: Object.freeze([reason]),
      flaggedAt: new Date().toISOString(),
      manual: true,
    });

    setManualReassessmentFlags((currentFlags) => [
      manualFlag,
      ...currentFlags.filter((flag) => flag.patientId !== patient.id),
    ]);

    return {
      ok: true,
      patient,
      flag: manualFlag,
      message: `${patient.name} flagged for reassessment.`,
    };
  }, [patients]);

  const assignPatientToStaff = useCallback((patientId, staffName) => {
    const staffMember = URGENT_CARE_STAFF.find((member) => member.name === staffName);
    if (!staffMember) {
      return {
        ok: false,
        message: `Unknown staff member: ${staffName}`,
      };
    }

    setPatients((currentPatients) =>
      currentPatients.map((patient) =>
        patient.id === patientId ? { ...patient, assignedTo: staffMember.name } : patient
      )
    );

    return {
      ok: true,
      message: `Patient assigned to ${staffMember.name}.`,
    };
  }, []);

  const updatePatientState = useCallback((patientId, nextState, options = {}) => {
    const patient = patients.find((currentPatient) => currentPatient.id === patientId);

    if (!patient) {
      return {
        ok: false,
        message: `Patient ${patientId} was not found.`,
      };
    }

    const transitionResult = PatientJourneyEngine.transitionPatient(patient, nextState, options);

    if (!transitionResult.ok) {
      return transitionResult;
    }

    setPatients((currentPatients) =>
      currentPatients.map((currentPatient) =>
        currentPatient.id === patientId ? transitionResult.patient : currentPatient
      )
    );

    appendAuditEvent(transitionResult.auditEvent);

    return transitionResult;
  }, [appendAuditEvent, patients]);

  const movePatientToNextState = useCallback((patientId, options = {}) => {
    const patient = patients.find((currentPatient) => currentPatient.id === patientId);

    if (!patient) {
      return {
        ok: false,
        message: `Patient ${patientId} was not found.`,
      };
    }

    const transitionResult = PatientJourneyEngine.transitionPatientToNextState(patient, options);

    if (!transitionResult.ok) {
      return transitionResult;
    }

    setPatients((currentPatients) =>
      currentPatients.map((currentPatient) =>
        currentPatient.id === patientId ? transitionResult.patient : currentPatient
      )
    );

    appendAuditEvent(transitionResult.auditEvent);

    return transitionResult;
  }, [appendAuditEvent, patients]);

  const moveQueue = useCallback((patientId, nextQueue) => {
    const nextState = QUEUE_TARGET_STATE_MAP[nextQueue];
    if (!nextState) {
      return {
        ok: false,
        message: `Unknown queue type: ${nextQueue}`,
      };
    }
    return updatePatientState(patientId, nextState, { reason: `Moved to ${nextQueue} queue` });
  }, [updatePatientState]);

  useEffect(() => {
    const runReassessmentEngine = () => {
      const engineQueue = ReassessmentEngine.getReassessmentQueue(patients);
      const enginePatientIds = new Set(engineQueue.map((item) => item.patientId));
      setReassessmentQueue([
        ...manualReassessmentFlags.filter((flag) => !enginePatientIds.has(flag.patientId)),
        ...engineQueue,
      ]);
    };

    runReassessmentEngine();
    const intervalId = window.setInterval(runReassessmentEngine, ReassessmentEngine.intervalMs);

    return () => window.clearInterval(intervalId);
  }, [manualReassessmentFlags, patients]);

  const queueCounts = useMemo(() => deriveQueueCounts(patients), [patients]);
  const capacitySnapshot = useMemo(
    () =>
      CapacityIntelligence.getCapacitySnapshot({
        patients,
        reassessmentQueueLength: reassessmentQueue.length,
      }),
    [patients, reassessmentQueue.length]
  );
  const capacityScore = capacitySnapshot.score;
  const staffWorkloads = useMemo(() => deriveStaffWorkloads(patients), [patients]);
  const shiftSummary = useMemo(
    () => deriveShiftSummary(patients, reassessmentQueue),
    [patients, reassessmentQueue]
  );

  const value = useMemo(
    () => ({
      dailyVolume: DAILY_TORONTO_URGENT_CARE_VOLUME,
      staffMembers: URGENT_CARE_STAFF,
      patients,
      journeyAuditTrail,
      whiteboardFilter,
      reassessmentQueue,
      queueCounts,
      capacitySnapshot,
      capacityScore,
      staffWorkloads,
      shiftSummary,
      addPatient,
      setWhiteboardFilter,
      clearWhiteboardFilter,
      flagPatientForReassessment,
      assignPatientToStaff,
      updatePatientState,
      movePatientToNextState,
      moveQueue,
    }),
    [
      addPatient,
      assignPatientToStaff,
      capacitySnapshot,
      capacityScore,
      clearWhiteboardFilter,
      flagPatientForReassessment,
      journeyAuditTrail,
      movePatientToNextState,
      moveQueue,
      patients,
      queueCounts,
      reassessmentQueue,
      setWhiteboardFilter,
      shiftSummary,
      staffWorkloads,
      updatePatientState,
      whiteboardFilter,
    ]
  );

  return (
    <EmergencyDepartmentContext.Provider value={value}>
      {children}
    </EmergencyDepartmentContext.Provider>
  );
}

export function useEmergencyDepartment() {
  const context = useContext(EmergencyDepartmentContext);
  return context;
}

export default EmergencyDepartmentContext;
