import {
  PatientFlag,
  PatientState,
  type EMSArrival,
  type Patient,
} from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildPatientArrivalRecord, syncPatientFromArrival } from './patientArrivalModel';
import { buildPreArrivalNotificationFromArrival } from './preArrivalNotification';
import { syncResourceActivationsForArrival } from './resourceActivation';

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isPreArrivalPlaceholder(patient: Patient): boolean {
  return Boolean(
    patient.emsArrival?.status === 'Inbound' &&
      patient.registrationStatus !== 'complete' &&
      (patient.source === 'EMS' || patient.flags.includes(PatientFlag.EMSArrival)),
  );
}

export function buildPreArrivalPlaceholderPatient(arrival: EMSArrival, timestamp = nowIso()): Patient {
  const enrichedArrival = syncResourceActivationsForArrival({
    ...arrival,
    preArrivalNotification:
      arrival.preArrivalNotification || buildPreArrivalNotificationFromArrival(arrival),
  });
  const patientId = enrichedArrival.patientId || createId('patient-ems-pre');
  const complaint = arrival.prearrivalComplaint || arrival.chiefComplaint || 'EMS pre-arrival';
  const flags = [PatientFlag.EMSArrival, PatientFlag.IdentityPending];
  const arrivalRecord = buildPatientArrivalRecord({
    arrivalMode: 'EMS',
    arrivalTimestamp: timestamp,
    chiefComplaint: complaint,
    state: PatientState.Arrival,
    triageAcuity: { code: arrival.priority, status: 'unassigned' },
    queueDestination: 'ems-registration',
    waitingRoomStatus: 'registered',
    registrationStatus: 'in-progress',
  });

  return syncPatientFromArrival(
    {
      id: patientId,
      mrn: `EMS-PRE-${arrival.id.toUpperCase()}`,
      firstName: 'EMS',
      lastName: `Pre-Arrival ${arrival.patientAge}`,
      dob: new Date(timestamp).toISOString().slice(0, 10),
      age: arrival.patientAge,
      sex: arrival.patientSex,
      state: PatientState.Arrival,
      triageTime: null,
      complaintCategory: 'EMS',
      vitals: arrival.vitals ? [arrival.vitals] : [],
      flags,
      roomId: arrival.preparedRoomId,
      notes: [],
      timeline: [],
      emsUnitId: arrival.unitId,
      emsArrival: { ...enrichedArrival, patientId, status: 'Inbound' },
    },
    arrivalRecord,
  ) as Patient;
}

export type PreArrivalCheckInPatch = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  healthCardNumber?: string;
  phone?: string;
};

export function applyPreArrivalCheckIn(
  patient: Patient,
  patch: PreArrivalCheckInPatch,
  timestamp = nowIso(),
): Patient {
  const nextFirst = patch.firstName?.trim() || patient.firstName;
  const nextLast = patch.lastName?.trim() || patient.lastName;
  const arrival = patient.emsArrival
    ? {
        ...patient.emsArrival,
        status: 'Arrived' as const,
        arrivedAt: patient.emsArrival.arrivedAt || timestamp,
        patientId: patient.id,
      }
    : patient.emsArrival;

  return {
    ...patient,
    firstName: nextFirst,
    lastName: nextLast,
    dob: patch.dob || patient.dob,
    healthCardNumber: patch.healthCardNumber || patient.healthCardNumber,
    phone: patch.phone || patient.phone,
    emsArrival: arrival,
    registrationStatus: 'complete',
    arrival: patient.arrival
      ? {
          ...patient.arrival,
          arrivalTimestamp: arrival?.arrivedAt || patient.arrival.arrivalTimestamp,
          registrationStatus: 'complete',
        }
      : patient.arrival,
  };
}

export function registerEmsPreArrivalPlaceholder(arrivalId: string): Patient | null {
  const store = useEmergencyStore.getState();
  const arrival = store.emsArrivals.find((entry) => entry.id === arrivalId);
  if (!arrival || arrival.patientId) return null;

  const placeholder = buildPreArrivalPlaceholderPatient(arrival);
  store.addPatient(placeholder);
  store.updateEMSArrival(arrivalId, { patientId: placeholder.id, status: 'Inbound' });
  store.registerArrivalControl?.(placeholder.id, {
    source: 'ems-prearrival',
    destination: 'ems-registration',
  });
  return placeholder;
}