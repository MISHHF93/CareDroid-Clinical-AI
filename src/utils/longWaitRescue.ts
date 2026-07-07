import { PatientFlag, PatientState, Priority } from '../types/emergency';

export const CTAS_TARGETS = {
  [Priority.P1]: 0,
  [Priority.P2]: 15,
  [Priority.P3]: 30,
  [Priority.P4]: 60,
  [Priority.P5]: 120,
};

export const LONG_WAIT_THRESHOLDS_BY_PRIORITY = CTAS_TARGETS;

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

function targetSource(settingsOrTargets: any = {}) {
  return settingsOrTargets.ctasThresholds ||
    settingsOrTargets.thresholds?.ctasTargets ||
    settingsOrTargets.thresholds?.ctasThresholds ||
    settingsOrTargets;
}

function patientFlags(patient) {
  return Array.isArray(patient?.flags) ? patient.flags : [];
}

function hasFlag(patient, flag) {
  return patientFlags(patient).includes(flag);
}

function roundedPercent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function resolveCtasTargets(settingsOrTargets: any = {}) {
  const source = targetSource(settingsOrTargets);
  return Object.fromEntries(
    Object.values(Priority).map((priority) => {
      const configured = Number(source?.[priority]);
      const fallback = CTAS_TARGETS[priority];
      return [priority, Number.isFinite(configured) && configured >= 0 ? configured : fallback];
    })
  );
}

export function waitMinutesExactForPatient(patient, now = new Date()) {
  const arrivedAt = new Date(patient?.arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, (now.getTime() - arrivedAt) / 60000);
}

export function waitMinutesForPatient(patient, now = new Date()) {
  return Math.round(waitMinutesExactForPatient(patient, now));
}

export function longWaitThresholdForPriority(priority, settingsOrTargets: any = {}) {
  const targets = resolveCtasTargets(settingsOrTargets);
  return targets[priority] ?? targets[Priority.P5];
}

export function longWaitStatus(patient, now = new Date(), settingsOrTargets: any = {}) {
  const thresholdMinutes = longWaitThresholdForPriority(patient?.priority, settingsOrTargets);
  const waitMinutesExact = waitMinutesExactForPatient(patient, now);
  const waitMinutes = Math.round(waitMinutesExact);
  const warningAt = thresholdMinutes;
  const criticalAt = thresholdMinutes * 1.5;
  const lwbsAt = thresholdMinutes * 2;

  if (!patient || patient.state !== PatientState.Waiting) {
    return {
      phase: 'none',
      waitMinutes,
      waitMinutesExact,
      thresholdMinutes,
      warningAt,
      criticalMinutes: Infinity,
      criticalAt: Infinity,
      lwbsMinutes: Infinity,
      lwbsAt: Infinity,
      reason: '',
    };
  }

  let phase = 'none';
  if (waitMinutesExact >= warningAt) phase = 'warning';
  if (waitMinutesExact >= criticalAt) phase = 'critical';
  if (waitMinutesExact >= lwbsAt) phase = 'lwbs';

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
    waitMinutesExact,
    thresholdMinutes,
    warningAt,
    criticalMinutes: criticalAt,
    criticalAt,
    lwbsMinutes: lwbsAt,
    lwbsAt,
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

export function longWaitSortWeight(patient, now = new Date(), settingsOrTargets: any = {}) {
  const status = longWaitStatus(patient, now, settingsOrTargets);
  return LONG_WAIT_PHASE_RANK[status.phase] || 0;
}

export function getLongWaitPatients(patients = [] as any[], now = new Date(), settingsOrTargets: any = {}) {
  return patients
    .map((patient) => ({ patient, status: longWaitStatus(patient, now, settingsOrTargets) }))
    .filter((entry) => entry.status.phase !== 'none')
    .sort(
      (a, b) =>
        (LONG_WAIT_PHASE_RANK[b.status.phase] || 0) - (LONG_WAIT_PHASE_RANK[a.status.phase] || 0) ||
        b.status.waitMinutes - a.status.waitMinutes
    );
}

export function getLongestWaitingPatient(patients = [] as any[], now = new Date(), settingsOrTargets: any = {}) {
  return getLongWaitPatients(patients, now, settingsOrTargets)[0] || null;
}

export function formatLongWaitForCopilot(patients = [] as any[], now = new Date(), settingsOrTargets: any = {}) {
  return getLongWaitPatients(patients, now, settingsOrTargets)
    .filter((entry) => entry.status.phase === 'critical' || entry.status.phase === 'lwbs')
    .map(
      ({ patient, status }) =>
        `WAIT ALERT: ${patientName(patient)} has been waiting ${status.waitMinutes}min (${patient.priority} limit: ${status.thresholdMinutes}min)`
    );
}

export function formatLongWaitAttentionForCopilot(patients = [] as any[], now = new Date(), settingsOrTargets: any = {}) {
  const longest = patients
    .filter((patient) => patient?.state !== PatientState.Discharge && hasFlag(patient, PatientFlag.LongWait))
    .map((patient) => ({ patient, status: longWaitStatus(patient, now, settingsOrTargets) }))
    .sort((a, b) => b.status.waitMinutes - a.status.waitMinutes)[0];
  if (!longest) return '';

  const { patient, status } = longest;
  return `ATTENTION: Longest waiting patient — ${patientName(patient)}, ${status.waitMinutes}min, ${patient.priority}, ${patient.chiefComplaint || patient.complaintCategory || 'Complaint pending'}`;
}

export function formatLongestWaitBroadcast(patients = [] as any[], now = new Date(), settingsOrTargets: any = {}) {
  const longest = getLongestWaitingPatient(patients, now, settingsOrTargets);
  if (!longest) return '';
  const { patient, status } = longest;
  return `Longest waiting patient: ${patientName(patient)} ${status.waitMinutes} min · ${patient.priority} · ${patient.chiefComplaint || patient.complaintCategory}`;
}

export function longWaitShiftMetrics(patients = [] as any[], now = new Date(), settingsOrTargets: any = {}) {
  const entries = patients.map((patient) => ({ patient, status: longWaitStatus(patient, now, settingsOrTargets) }));
  const waitingEntries = entries.filter((entry) => entry.patient?.state === PatientState.Waiting);
  const exceedingTargetCount = waitingEntries.filter((entry) => entry.status.waitMinutesExact >= entry.status.thresholdMinutes).length;
  const longWaitEvents = entries.filter(
    (entry) => hasFlag(entry.patient, PatientFlag.LongWait) || entry.status.phase !== 'none'
  ).length;
  const lwbsRiskEvents = entries.filter(
    (entry) => hasFlag(entry.patient, PatientFlag.LWBSRisk) || entry.status.phase === 'lwbs'
  ).length;

  return {
    longWaitEvents,
    lwbsRiskEvents,
    maxWaitMinutes: entries.length
      ? Math.max(...entries.map((entry) => entry.status.waitMinutes || 0))
      : 0,
    exceedingTargetCount,
    exceedingTargetPercent: roundedPercent(exceedingTargetCount, waitingEntries.length),
    longestWaitMinutes: entries.length
      ? Math.max(...entries.map((entry) => entry.status.waitMinutes || 0))
      : 0,
    exceededTargetCount: exceedingTargetCount,
    nearLwbsCount: lwbsRiskEvents,
  };
}
