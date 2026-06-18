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
  const emsAll = patients.filter(
    (patient) =>
      isEmsRegistrationPatient(patient) &&
      (patient.state === PatientState.Registration || patient.state === PatientState.Arrival),
  );
  const verificationAll = patients.filter(
    (patient) =>
      patient.state === PatientState.Registration && !isEmsRegistrationPatient(patient),
  );
  const pretriageAll = patients.filter((patient) => patient.state === PatientState.Triage);
  const recentAll = patients.filter(
    (patient) => minutesSince(patient.arrivalTime) <= RECENT_ARRIVAL_MINUTES,
  );

  const ems = [...emsAll].sort(sortByArrivalDesc).slice(0, limit);
  const verification = [...verificationAll].sort(sortByArrivalDesc).slice(0, limit);
  const pretriage = [...pretriageAll].sort(sortByArrivalDesc).slice(0, limit);
  const recentArrivals = [...recentAll].sort(sortByArrivalDesc).slice(0, limit);

  const awaitingVerification = patients.filter(
    (patient) => patient.state === PatientState.Registration,
  ).length;
  const awaitingTriage = pretriageAll.length;
  const waiting = patients.filter((patient) => patient.state === PatientState.Waiting).length;
  const queueTotal = awaitingVerification + awaitingTriage;

  return {
    ems,
    verification,
    pretriage,
    recentArrivals,
    counts: {
      ems: emsAll.length,
      verification: verificationAll.length,
      pretriage: pretriageAll.length,
      recentArrivals: recentAll.length,
      awaitingVerification,
      awaitingTriage,
      waiting,
      queueTotal,
    },
  };
}

export function selectEmsInboundCount(state) {
  return (
    (state.emsArrivals ?? []).filter((arrival) => arrival.status === 'Inbound').length +
    (state.emsIncomingPatients ?? []).length +
    (state.emsUnits ?? []).filter((unit) => unit.status === 'Inbound').length
  );
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Maps reception strip metric ids to canonical operational metric keys. */
export const RECEPTION_STRIP_TO_OPERATIONAL_KEY = Object.freeze({
  'arrivals-today': 'patientsToday',
  'awaiting-verification': null,
  'awaiting-triage': 'waiting',
  'ems-inbound': 'emsInbound',
  'queue-size': null,
});

export function selectReceptionOperationalStripMetrics(patients = [], emsInbound = 0) {
  const { counts } = selectReceptionQueues(patients);
  const today = localDateKey();
  const arrivalsToday = patients.filter(
    (patient) => localDateKey(patient.arrivalTime) === today,
  ).length;

  return [
    {
      id: 'arrivals-today',
      label: 'Arrivals today',
      value: arrivalsToday,
      queueTab: null,
    },
    {
      id: 'awaiting-verification',
      label: 'Waiting verification',
      value: counts.awaitingVerification,
      queueTab: 'verification',
    },
    {
      id: 'awaiting-triage',
      label: 'Waiting triage',
      value: counts.awaitingTriage,
      queueTab: 'pretriage',
    },
    {
      id: 'ems-inbound',
      label: 'EMS inbound',
      value: emsInbound,
      queueTab: 'ems',
    },
    {
      id: 'queue-size',
      label: 'Queue size',
      value: counts.queueTotal,
      queueTab: 'verification',
    },
  ];
}

/** Normalized arrival dashboard metrics from store patients + EMS inbound feed. */
export function selectArrivalDashboardMetrics(patients = [], emsInbound = 0) {
  const queues = selectReceptionQueues(patients);
  const { counts } = queues;

  return {
    queues,
    metrics: [
      {
        id: 'recent-arrivals',
        label: 'Recent arrivals',
        hint: 'Last 30 minutes',
        value: counts.recentArrivals,
        queueTab: null,
      },
      {
        id: 'awaiting-verification',
        label: 'Awaiting verification',
        hint: 'Registration queue',
        value: counts.awaitingVerification,
        queueTab: 'verification',
      },
      {
        id: 'awaiting-triage',
        label: 'Awaiting triage',
        hint: 'Pre-triage queue',
        value: counts.awaitingTriage,
        queueTab: 'pretriage',
      },
      {
        id: 'ems-arrivals',
        label: 'EMS arrivals',
        hint: `${counts.ems} registered · ${emsInbound} inbound`,
        value: counts.ems + emsInbound,
        queueTab: 'ems',
      },
      {
        id: 'queue-total',
        label: 'Queue total',
        hint: 'Verification + triage',
        value: counts.queueTotal,
        queueTab: 'verification',
      },
    ],
  };
}
