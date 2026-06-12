import { PatientState, Priority } from '../../types/emergency';

export const LONG_WAIT_THRESHOLDS_BY_PRIORITY = {
  [Priority.P1]: 0,
  [Priority.P2]: 15,
  [Priority.P3]: 30,
  [Priority.P4]: 60,
  [Priority.P5]: 120,
};

export const LONG_WAIT_PHASE_RANK = {
  none: 0,
  warning: 1,
  critical: 2,
  lwbs: 3,
};

export const LONG_WAIT_REASSESSMENT_REASON = 'Wait time approaching limit';
export const LONG_WAIT_CRITICAL_REASON = 'Critical wait time breach';
export const LONG_WAIT_LWBS_REASON = 'LWBS risk from extended wait';

function patientName(patient) {
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Unknown patient';
}

export function waitMinutesForPatient(patient, now = new Date()) {
  const arrivedAt = new Date(patient?.arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((now.getTime() - arrivedAt) / 60000));
}

export function longWaitThresholdForPriority(priority) {
  return LONG_WAIT_THRESHOLDS_BY_PRIORITY[priority] ?? LONG_WAIT_THRESHOLDS_BY_PRIORITY[Priority.P5];
}

export function longWaitStatus(patient, now = new Date()) {
  if (!patient || patient.state !== PatientState.Waiting) {
    return {
      phase: 'none',
      waitMinutes: waitMinutesForPatient(patient, now),
      thresholdMinutes: longWaitThresholdForPriority(patient?.priority),
      criticalMinutes: Infinity,
      lwbsMinutes: Infinity,
      reason: '',
    };
  }

  const thresholdMinutes = longWaitThresholdForPriority(patient.priority);
  const waitMinutes = waitMinutesForPatient(patient, now);
  const criticalMinutes = thresholdMinutes === 0 ? 0 : Math.ceil(thresholdMinutes * 1.5);
  const lwbsMinutes = thresholdMinutes === 0 ? 1 : thresholdMinutes * 2;
  let phase = 'none';
  if (waitMinutes >= thresholdMinutes) phase = 'warning';
  if (waitMinutes >= criticalMinutes) phase = 'critical';
  if (waitMinutes >= lwbsMinutes) phase = 'lwbs';

  const reason =
    phase === 'lwbs'
      ? LONG_WAIT_LWBS_REASON
      : phase === 'critical'
        ? LONG_WAIT_CRITICAL_REASON
        : phase === 'warning'
          ? LONG_WAIT_REASSESSMENT_REASON
          : '';

  return {
    phase,
    waitMinutes,
    thresholdMinutes,
    criticalMinutes,
    lwbsMinutes,
    reason,
  };
}

export function isLongWaitRescueReason(reason = '') {
  return [LONG_WAIT_REASSESSMENT_REASON, LONG_WAIT_CRITICAL_REASON, LONG_WAIT_LWBS_REASON].includes(reason);
}

export function longWaitSeverityForPhase(phase) {
  if (phase === 'critical' || phase === 'lwbs') return 'Critical';
  if (phase === 'warning') return 'Warning';
  return 'Info';
}

export function longWaitSortWeight(patient, now = new Date()) {
  const status = longWaitStatus(patient, now);
  return LONG_WAIT_PHASE_RANK[status.phase] || 0;
}

export function getLongWaitPatients(patients = [], now = new Date()) {
  return patients
    .map((patient) => ({ patient, status: longWaitStatus(patient, now) }))
    .filter((entry) => entry.status.phase !== 'none')
    .sort(
      (a, b) =>
        (LONG_WAIT_PHASE_RANK[b.status.phase] || 0) - (LONG_WAIT_PHASE_RANK[a.status.phase] || 0) ||
        b.status.waitMinutes - a.status.waitMinutes
    );
}

export function getLongestWaitingPatient(patients = [], now = new Date()) {
  return getLongWaitPatients(patients, now)[0] || null;
}

export function formatLongWaitForCopilot(patients = [], now = new Date()) {
  return getLongWaitPatients(patients, now)
    .filter((entry) => entry.status.phase === 'critical' || entry.status.phase === 'lwbs')
    .map(
      ({ patient, status }) =>
        `WAIT ALERT: ${patientName(patient)} has been waiting ${status.waitMinutes}min (${patient.priority} limit: ${status.thresholdMinutes}min)`
    );
}

export function formatLongestWaitBroadcast(patients = [], now = new Date()) {
  const longest = getLongestWaitingPatient(patients, now);
  if (!longest) return '';
  const { patient, status } = longest;
  return `Longest waiting patient: ${patientName(patient)} ${status.waitMinutes} min · ${patient.priority} · ${patient.chiefComplaint || patient.complaintCategory}`;
}

export function longWaitShiftMetrics(patients = [], now = new Date()) {
  const entries = patients.map((patient) => ({ patient, status: longWaitStatus(patient, now) }));
  return {
    longestWaitMinutes: entries.length
      ? Math.max(...entries.map((entry) => entry.status.waitMinutes || 0))
      : 0,
    exceededTargetCount: entries.filter((entry) => entry.status.phase !== 'none').length,
    nearLwbsCount: entries.filter((entry) => entry.status.phase === 'lwbs').length,
  };
}
