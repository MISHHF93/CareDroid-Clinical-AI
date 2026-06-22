import { PatientFlag, PatientState } from '../../types/emergency';
import { filterPatientsBySearch } from '../../utils/patientSearch';
import { RECEPTION_COPY } from './receptionCopy';
import { summarizeDataQualityRisks } from '../../config/dataQualityModel';
import { auditReceptionQueues, summarizeQueueAudit } from '../../config/queueAuditModel';
import { buildArrivalControlSummary } from '../../services/arrivalControlLayer';
import { buildEmsOffloadTrackerSummary } from '../../services/emsOffloadTracker';
import { summarizeTriageBreachBoard } from '../../services/triageBreachTimer';
import {
  patientNeedsRapidReview,
  sortPatientsForRapidReview,
} from '../../services/highRiskComplaintFlags';

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
  const rapidReviewAll = patients.filter((patient) => patientNeedsRapidReview(patient));
  const recentAll = patients.filter(
    (patient) => minutesSince(patient.arrivalTime) <= RECENT_ARRIVAL_MINUTES,
  );

  const ems = [...emsAll].sort(sortByArrivalDesc).slice(0, limit);
  const verification = [...verificationAll].sort(sortByArrivalDesc).slice(0, limit);
  const pretriage = sortPatientsForRapidReview(pretriageAll).slice(0, limit);
  const rapidReview = sortPatientsForRapidReview(rapidReviewAll).slice(0, limit);
  const recentArrivals = sortPatientsForRapidReview(recentAll).slice(0, limit);

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
    rapidReview,
    recentArrivals,
    counts: {
      ems: emsAll.length,
      verification: verificationAll.length,
      pretriage: pretriageAll.length,
      rapidReview: rapidReviewAll.length,
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

export function selectReceptionOperationalStripMetrics(
  patients = [],
  emsInbound = 0,
  { metricIds = null, settings = null, emsArrivals = [] } = {},
) {
  const { counts } = selectReceptionQueues(patients);
  const today = localDateKey();
  const arrivalsToday = patients.filter(
    (patient) => localDateKey(patient.arrivalTime) === today,
  ).length;
  const dataQualitySummary = summarizeDataQualityRisks(patients);
  const receptionAudit = summarizeQueueAudit(auditReceptionQueues(patients, { emsInbound }));
  const arrivalControl = buildArrivalControlSummary(patients);
  const triageBreachSummary = summarizeTriageBreachBoard(patients, {
    settings: settings || undefined,
  });
  const offloadSummary = buildEmsOffloadTrackerSummary(emsArrivals, {
    patients,
    offloadTargetMinutes:
      Number(settings?.thresholds?.emsOffloadTargetMinutes ?? settings?.emsThresholds?.offloadTargetMinutes) ||
      15,
  });

  return [
    {
      id: 'arrivals-today',
      label: RECEPTION_COPY.metrics.arrivalsToday,
      value: arrivalsToday,
      queueTab: null,
    },
    {
      id: 'awaiting-verification',
      label: RECEPTION_COPY.metrics.awaitingVerification,
      value: counts.awaitingVerification,
      queueTab: 'verification',
    },
    {
      id: 'awaiting-triage',
      label: RECEPTION_COPY.metrics.awaitingTriage,
      value: arrivalControl.triagePending || counts.awaitingTriage,
      queueTab: 'pretriage',
    },
    {
      id: 'rapid-review',
      label: RECEPTION_COPY.metrics.rapidReview,
      value: arrivalControl.rapidReview || counts.rapidReview,
      queueTab: 'pretriage',
    },
    {
      id: 'ems-inbound',
      label: RECEPTION_COPY.metrics.emsInbound,
      value: emsInbound,
      queueTab: 'ems',
    },
    {
      id: 'queue-size',
      label: RECEPTION_COPY.metrics.queueSize,
      value: counts.queueTotal,
      queueTab: 'verification',
    },
    {
      id: 'data-quality-risks',
      label: RECEPTION_COPY.metrics.dataQualityRisks,
      value: dataQualitySummary.patientsWithRisks,
      queueTab: 'verification',
    },
    {
      id: 'queue-overdue',
      label: RECEPTION_COPY.metrics.queueOverdue,
      value: receptionAudit.totalOverdue,
      queueTab: 'verification',
      hint: receptionAudit.primaryBottleneck
        ? `Bottleneck: ${receptionAudit.primaryBottleneck.label}`
        : undefined,
    },
    {
      id: 'longest-wait',
      label: RECEPTION_COPY.metrics.longestWait,
      value: receptionAudit.longestWaitLabel,
      queueTab: 'pretriage',
    },
    {
      id: 'triage-breach-risk',
      label: RECEPTION_COPY.metrics.triageBreachRisk,
      value: triageBreachSummary.breachRiskCount,
      queueTab: 'pretriage',
      hint: `Target ${triageBreachSummary.targetMinutes}m`,
    },
    {
      id: 'triage-breached',
      label: RECEPTION_COPY.metrics.triageBreached,
      value: triageBreachSummary.breachedCount,
      queueTab: 'pretriage',
      hint: `Longest ${triageBreachSummary.longestElapsedLabel}`,
    },
    {
      id: 'door-to-triage',
      label: RECEPTION_COPY.metrics.doorToTriage,
      value: triageBreachSummary.longestElapsedLabel,
      queueTab: 'pretriage',
      hint: `Target ${triageBreachSummary.targetMinutes}m · ${triageBreachSummary.awaitingTriageCount} awaiting`,
    },
    {
      id: 'offload-delays',
      label: RECEPTION_COPY.metrics.offloadDelays,
      value: offloadSummary.delayedCount,
      queueTab: 'ems',
      hint: offloadSummary.longestOffloadMinutes
        ? `Longest ${offloadSummary.longestOffloadMinutes}m`
        : undefined,
    },
  ].filter((metric) => !metricIds?.length || metricIds.includes(metric.id));
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
