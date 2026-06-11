import { createContext, useCallback, useMemo } from 'react';
import { PatientState, QueueType } from '../../types/emergency';
import { createPatientFlag, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import {
  getNextStates,
  movePatientToState as movePatientWithJourneyRules,
} from '../../engine/journeyEngine';

export const DAILY_TORONTO_URGENT_CARE_VOLUME = 100;

const STAFF_ROLE_LABELS = {
  Attending: 'Physician',
  Resident: 'Resident',
  Nurse: 'Nurse',
  TriageNurse: 'Triage RN',
  ChargeNurse: 'Charge RN',
  Paramedic: 'Paramedic',
  Technician: 'Technician',
  Clerk: 'Clerk',
  Consultant: 'Consultant',
  Administrator: 'Administrator',
};

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

export function getQueueForPatientState(state) {
  if (
    state === PatientState.Arrival ||
    state === PatientState.Registration ||
    state === PatientState.Triage
  ) {
    return QueueType.Triage;
  }
  if (state === PatientState.Assessment || state === PatientState.Orders) return QueueType.Provider;
  if (state === PatientState.Disposition) return QueueType.Referral;
  return QueueType[state] || state || QueueType.Waiting;
}

function patientDisplayName(patient) {
  return patient.name || `${patient.firstName} ${patient.lastName}`.trim();
}

function staffDisplayName(staff) {
  return staff.name || `${staff.firstName} ${staff.lastName}`.trim();
}

function transitionErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unable to move patient state.';
}

function patientLocation(patient, rooms) {
  return patient.location || rooms.find((room) => room.id === patient.roomId)?.name || 'Unassigned';
}

function legacyPatient(patient, rooms, staff) {
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);
  return {
    ...patient,
    name: patientDisplayName(patient),
    location: patientLocation(patient, rooms),
    complaint: patient.complaint || patient.chiefComplaint,
    assignedTo: assignedStaff ? staffDisplayName(assignedStaff) : patient.assignedTo || null,
    vitalsUpdatedAt: patient.vitalsUpdatedAt || patient.vitals?.recordedAt,
  };
}

function deriveQueueCounts(queues) {
  return Object.fromEntries(queues.map((queue) => [queue.type, queue.patientIds.length]));
}

function deriveReassessmentQueue(patients) {
  return patients
    .filter((patient) => hasPatientFlag(patient, 'ReassessmentDue'))
    .map((patient) => ({
      patientId: patient.id,
      patientName: patient.name,
      state: patient.state,
      priority: patient.priority,
      waitingMinutes: minutesSince(patient.arrivalTime),
      vitalsAgeMinutes: minutesSince(patient.vitalsUpdatedAt || patient.vitals?.recordedAt),
      reasons: patient.flags
        .filter((flag) => flag.type === 'ReassessmentDue')
        .map((flag) => flag.reason),
      flaggedAt:
        patient.flags.find((flag) => flag.type === 'ReassessmentDue')?.detectedAt ||
        new Date().toISOString(),
    }));
}

function minutesSince(timestamp) {
  const parsed = new Date(timestamp || '').getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

function deriveStaffWorkloads(staff, patients) {
  return staff.map((member) => ({
    ...member,
    name: staffDisplayName(member),
    role: STAFF_ROLE_LABELS[member.role] || member.role,
    activePatients: patients.filter(
      (patient) => patient.assignedStaffId === member.id && patient.state !== PatientState.Discharge
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
  const totalWait = patients.reduce((sum, patient) => sum + minutesSince(patient.arrivalTime), 0);

  return {
    patientsSeen: seenPatients.length,
    averageWaitMinutes: patients.length ? Math.round(totalWait / patients.length) : 0,
    dispositions: {
      [PatientState.Disposition]: patients.filter(
        (patient) => patient.state === PatientState.Disposition
      ).length,
      [PatientState.Admission]: patients.filter(
        (patient) => patient.state === PatientState.Admission
      ).length,
      [PatientState.Discharge]: patients.filter(
        (patient) => patient.state === PatientState.Discharge
      ).length,
    },
    flaggedEvents: reassessmentQueue.length,
  };
}

function buildAuditTrail(patients) {
  return Object.fromEntries(patients.map((patient) => [patient.id, patient.timeline || []]));
}

function fallbackContextAction(message) {
  return {
    ok: false,
    message,
  };
}

const DEFAULT_EMERGENCY_DEPARTMENT_CONTEXT = Object.freeze({
  dailyVolume: DAILY_TORONTO_URGENT_CARE_VOLUME,
  staffMembers: [],
  patients: [],
  journeyAuditTrail: {},
  whiteboardFilter: { queue: null, complaint: null },
  staffWorkloads: [],
  shiftSummary: {
    patientsSeen: 0,
    averageWaitMinutes: 0,
    dispositions: {},
    flaggedEvents: 0,
  },
  reassessmentQueue: [],
  queueCounts: {},
  capacitySnapshot: null,
  capacityScore: 0,
  addPatient: () => {},
  setWhiteboardFilter: () => {},
  clearWhiteboardFilter: () => {},
  flagPatientForReassessment: () => fallbackContextAction('Emergency OS store is not mounted.'),
  assignPatientToStaff: () => fallbackContextAction('Emergency OS store is not mounted.'),
  updatePatientState: () => fallbackContextAction('Emergency OS store is not mounted.'),
  movePatientToNextState: () => fallbackContextAction('Emergency OS store is not mounted.'),
  moveQueue: () => fallbackContextAction('Emergency OS store is not mounted.'),
});

const EmergencyDepartmentContext = createContext(DEFAULT_EMERGENCY_DEPARTMENT_CONTEXT);

export function EmergencyDepartmentProvider({ children }) {
  return (
    <EmergencyDepartmentContext.Provider value={DEFAULT_EMERGENCY_DEPARTMENT_CONTEXT}>
      {children}
    </EmergencyDepartmentContext.Provider>
  );
}

export function useEmergencyDepartment() {
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const queues = useEmergencyStore((state) => state.queues);
  const capacity = useEmergencyStore((state) => state.capacity);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const whiteboardSearchQuery = useEmergencyStore((state) => state.whiteboardSearchQuery);
  const addPatientToStore = useEmergencyStore((state) => state.addPatient);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const setWhiteboardSearchQuery = useEmergencyStore((state) => state.setWhiteboardSearchQuery);

  const legacyPatients = useMemo(
    () => patients.map((patient) => legacyPatient(patient, rooms, staff)),
    [patients, rooms, staff]
  );
  const staffMembers = useMemo(
    () => staff.map((member) => ({ ...member, name: staffDisplayName(member) })),
    [staff]
  );
  const reassessmentQueue = useMemo(
    () => deriveReassessmentQueue(legacyPatients),
    [legacyPatients]
  );
  const queueCounts = useMemo(() => deriveQueueCounts(queues), [queues]);
  const staffWorkloads = useMemo(
    () => deriveStaffWorkloads(staff, legacyPatients),
    [legacyPatients, staff]
  );
  const shiftSummary = useMemo(
    () => deriveShiftSummary(legacyPatients, reassessmentQueue),
    [legacyPatients, reassessmentQueue]
  );
  const journeyAuditTrail = useMemo(() => buildAuditTrail(legacyPatients), [legacyPatients]);

  const setWhiteboardFilter = useCallback(
    (filter = {}) => {
      if (Object.prototype.hasOwnProperty.call(filter, 'queue')) {
        setQueueFilter(filter.queue || null);
      }
      if (Object.prototype.hasOwnProperty.call(filter, 'complaint')) {
        setWhiteboardSearchQuery(filter.complaint || '');
      }
    },
    [setQueueFilter, setWhiteboardSearchQuery]
  );

  const clearWhiteboardFilter = useCallback(() => {
    setQueueFilter(null);
    setWhiteboardSearchQuery('');
  }, [setQueueFilter, setWhiteboardSearchQuery]);

  const flagPatientForReassessment = useCallback(
    (target, reason = 'ED Copilot manual reassessment flag') => {
      const normalizedTarget = String(target || '')
        .trim()
        .toLowerCase();
      const patient = legacyPatients.find((candidate) => {
        const fields = [
          candidate.id,
          candidate.name,
          candidate.location,
          candidate.location?.replace(/^bed\s*/i, ''),
        ];
        return fields.some(
          (field) =>
            String(field || '')
              .trim()
              .toLowerCase() === normalizedTarget
        );
      });

      if (!patient) {
        return {
          ok: false,
          message: `No patient matched ${target}.`,
        };
      }

      const flag = createPatientFlag('ReassessmentDue', { reason });
      addFlag(patient.id, flag);

      return {
        ok: true,
        patient,
        flag: {
          patientId: patient.id,
          patientName: patient.name,
          state: patient.state,
          priority: patient.priority,
          waitingMinutes: minutesSince(patient.arrivalTime),
          vitalsAgeMinutes: minutesSince(patient.vitalsUpdatedAt || patient.vitals?.recordedAt),
          reasons: [reason],
          flaggedAt: flag.detectedAt,
          manual: true,
        },
        message: `${patient.name} flagged for reassessment.`,
      };
    },
    [addFlag, legacyPatients]
  );

  const assignPatientToStaff = useCallback(
    (patientId, staffName) => {
      const staffMember = staffMembers.find((member) => member.name === staffName);
      if (!staffMember) {
        return {
          ok: false,
          message: `Unknown staff member: ${staffName}`,
        };
      }

      assignStaff(patientId, staffMember.id);
      return {
        ok: true,
        message: `Patient assigned to ${staffMember.name}.`,
      };
    },
    [assignStaff, staffMembers]
  );

  const updatePatientState = useCallback(
    (patientId, nextState) => {
      const patient = legacyPatients.find((candidate) => candidate.id === patientId);
      if (!patient) {
        return {
          ok: false,
          message: `Patient ${patientId} was not found.`,
        };
      }

      try {
        const result = movePatientWithJourneyRules(patientId, nextState, {
          staffId: patient.assignedStaffId || undefined,
          note: 'Moved from EmergencyDepartmentContext.',
        });
        return {
          ok: true,
          patient: { ...patient, state: result.to },
          auditEvent: result.timelineEvent,
          message: `${patient.name} moved from ${result.from} to ${result.to}.`,
        };
      } catch (error) {
        return {
          ok: false,
          patient,
          auditEvent: null,
          message: transitionErrorMessage(error),
        };
      }
    },
    [legacyPatients]
  );

  const movePatientToNextState = useCallback(
    (patientId) => {
      const patient = legacyPatients.find((candidate) => candidate.id === patientId);
      if (!patient) {
        return {
          ok: false,
          message: `Patient ${patientId} was not found.`,
        };
      }

      const nextState = getNextStates(patient.state)[0] || null;
      if (!nextState) {
        return {
          ok: false,
          patient,
          auditEvent: null,
          message: `${patient.name} is already at the end of the ED journey.`,
        };
      }

      return updatePatientState(patientId, nextState);
    },
    [legacyPatients, updatePatientState]
  );

  const moveQueue = useCallback(
    (patientId, nextQueue) => {
      const nextState = QUEUE_TARGET_STATE_MAP[nextQueue];
      if (!nextState) {
        return {
          ok: false,
          message: `Unknown queue type: ${nextQueue}`,
        };
      }
      return updatePatientState(patientId, nextState);
    },
    [updatePatientState]
  );

  return useMemo(
    () => ({
      dailyVolume: DAILY_TORONTO_URGENT_CARE_VOLUME,
      staffMembers,
      patients: legacyPatients,
      journeyAuditTrail,
      whiteboardFilter: {
        queue: activeQueueFilter,
        complaint: whiteboardSearchQuery || null,
      },
      reassessmentQueue,
      queueCounts,
      capacitySnapshot: capacity,
      capacityScore: capacity.score,
      staffWorkloads,
      shiftSummary,
      addPatient: addPatientToStore,
      setWhiteboardFilter,
      clearWhiteboardFilter,
      flagPatientForReassessment,
      assignPatientToStaff,
      updatePatientState,
      movePatientToNextState,
      moveQueue,
    }),
    [
      activeQueueFilter,
      addPatientToStore,
      assignPatientToStaff,
      capacity,
      clearWhiteboardFilter,
      flagPatientForReassessment,
      journeyAuditTrail,
      legacyPatients,
      movePatientToNextState,
      moveQueue,
      queueCounts,
      reassessmentQueue,
      setWhiteboardFilter,
      shiftSummary,
      staffMembers,
      staffWorkloads,
      updatePatientState,
      whiteboardSearchQuery,
    ]
  );
}

export default EmergencyDepartmentContext;
