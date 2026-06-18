import { PatientFlag, PatientState } from '../../types/emergency';
import { filterPatientsBySearch } from '../../utils/patientSearch';

export const RECENT_ARRIVAL_MINUTES = 30;
export const RECEPTION_QUEUE_PREVIEW_LIMIT = 8;

export function patientLabel(patient) {
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim();
  return name || patient.name || patient.mrn || 'Unknown patient';
}

export function isEmsRegistrationPatient(patient) {
  return patient.flags?.some((flag) =>
    typeof flag === 'string' ? flag === PatientFlag.EMSArrival : flag?.type === PatientFlag.EMSArrival,
  );
}

export function minutesSince(isoTime) {
  if (!isoTime) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(isoTime).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

export function filterPatientsByQuery(patients, query = '') {
  return filterPatientsBySearch(patients, query);
}

function sortByArrivalDesc(left, right) {
  return new Date(right.arrivalTime).getTime() - new Date(left.arrivalTime).getTime();
}

export function selectReceptionQueues(patients = [], { limit = RECEPTION_QUEUE_PREVIEW_LIMIT } = {}) {
  const ems = patients
    .filter(
      (patient) =>
        isEmsRegistrationPatient(patient) &&
        (patient.state === PatientState.Registration || patient.state === PatientState.Arrival),
    )
    .sort(sortByArrivalDesc)
    .slice(0, limit);

  const verification = patients
    .filter(
      (patient) =>
        patient.state === PatientState.Registration && !isEmsRegistrationPatient(patient),
    )
    .sort(sortByArrivalDesc)
    .slice(0, limit);

  const pretriage = patients
    .filter((patient) => patient.state === PatientState.Triage)
    .sort(sortByArrivalDesc)
    .slice(0, limit);

  const recentArrivals = patients
    .filter((patient) => minutesSince(patient.arrivalTime) <= RECENT_ARRIVAL_MINUTES)
    .sort(sortByArrivalDesc)
    .slice(0, limit);

  const awaitingVerification = patients.filter(
    (patient) => patient.state === PatientState.Registration,
  ).length;
  const awaitingTriage = patients.filter((patient) => patient.state === PatientState.Triage).length;
  const waiting = patients.filter((patient) => patient.state === PatientState.Waiting).length;

  return {
    ems,
    verification,
    pretriage,
    recentArrivals,
    counts: {
      ems: ems.length,
      verification: verification.length,
      pretriage: pretriage.length,
      recentArrivals: recentArrivals.length,
      awaitingVerification,
      awaitingTriage,
      waiting,
    },
  };
}
