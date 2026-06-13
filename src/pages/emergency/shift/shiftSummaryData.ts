import {
  PatientFlag,
  PatientState,
  Priority,
  type ActiveShift,
  type Alert,
  type CapacityBand,
  type CapacityHistoryEntry,
  type CapacitySnapshot,
  type EmsUnit,
  type Patient,
  type Referral,
  type Staff,
  type WorkflowActionLog,
} from '../../../types/emergency';
import { ctasTargetMinutes } from '../../../utils/ctasTargets';
import { longWaitShiftMetrics } from '../../../utils/longWaitRescue';

const MINUTE_MS = 60_000;
const CAPACITY_BANDS: CapacityBand[] = ['Green', 'Yellow', 'Orange', 'Red'];
const SENT_REFERRAL_STATUSES = new Set(['Sent', 'Acknowledged', 'Accepted', 'InfoRequested', 'TransferRequested', 'TransportArranged', 'PatientDeparted', 'Declined', 'Delayed', 'Closed', 'Completed']);
const ACCEPTED_REFERRAL_STATUSES = new Set(['Accepted', 'TransferRequested', 'TransportArranged', 'PatientDeparted', 'Completed']);
const DECLINED_REFERRAL_STATUSES = new Set(['Declined']);
const ACTIVE_STATES: Set<PatientState> = new Set(
  Object.values(PatientState).filter(
    (state): state is PatientState => state !== PatientState.Discharge && state !== PatientState.Deceased,
  ),
);

export type ShiftSummaryInput = {
  patients: Patient[];
  staff: Staff[];
  activeShift: ActiveShift;
  referrals: Referral[];
  alerts: Alert[];
  capacity: CapacitySnapshot;
  capacityHistory?: CapacityHistoryEntry[];
  workflowLogs?: WorkflowActionLog[];
  emsUnits?: EmsUnit[];
  emsArrivals?: unknown[];
  emsIncomingPatients?: unknown[];
  emergencySettings?: Parameters<typeof ctasTargetMinutes>[1];
  now?: Date | string | number;
};

export type ShiftSummary = ReturnType<typeof buildShiftSummary>;

export function toMs(value: unknown): number | null {
  if (!value) return null;
  const ms = new Date(value as string | number | Date).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function minutesBetween(start: unknown, end: unknown): number | null {
  const startMs = toMs(start);
  const endMs = toMs(end);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return Math.round((endMs - startMs) / MINUTE_MS);
}

export function formatMinutes(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value as number)} min`;
}

export function formatHHMM(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatClock(value: unknown): string {
  const ms = toMs(value);
  if (ms === null) return '--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

export function patientName(patient: Patient): string {
  return patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || patient.id;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isAfterOrEqual(value: unknown, floorMs: number): boolean {
  const ms = toMs(value);
  return ms !== null && ms >= floorMs;
}

function timestampFromPatientTimeline(patient: Patient, predicate: (event: Patient['timeline'][number]) => boolean): string | null {
  const matches = (patient.timeline || [])
    .filter(predicate)
    .filter((event) => toMs(event.timestamp) !== null)
    .sort((a, b) => (toMs(a.timestamp) ?? 0) - (toMs(b.timestamp) ?? 0));
  return matches[0]?.timestamp || null;
}

function latestTimestampFromPatientTimeline(patient: Patient, predicate: (event: Patient['timeline'][number]) => boolean): string | null {
  const matches = (patient.timeline || [])
    .filter(predicate)
    .filter((event) => toMs(event.timestamp) !== null)
    .sort((a, b) => (toMs(b.timestamp) ?? 0) - (toMs(a.timestamp) ?? 0));
  return matches[0]?.timestamp || null;
}

function patientAddedThisShift(patient: Patient, shiftStartMs: number): boolean {
  if (isAfterOrEqual(patient.arrivalTime, shiftStartMs)) return true;
  return Boolean(
    timestampFromPatientTimeline(
      patient,
      (event) => ['Arrival', 'EncounterCreated', 'Registration', 'Intake'].includes(String(event.type)) && isAfterOrEqual(event.timestamp, shiftStartMs),
    ),
  );
}

function eventToState(patient: Patient, state: PatientState): string | null {
  return timestampFromPatientTimeline(
    patient,
    (event) => event.to === state || event.toState === state || String(event.type) === state,
  );
}

function latestEventToState(patient: Patient, state: PatientState): string | null {
  return latestTimestampFromPatientTimeline(
    patient,
    (event) => event.to === state || event.toState === state || String(event.type) === state,
  );
}

function triageTimestamp(patient: Patient): string | null {
  return patient.triageTime || eventToState(patient, PatientState.Triage) || timestampFromPatientTimeline(patient, (event) => event.type === 'Triage');
}

function providerTimestamp(patient: Patient): string | null {
  return eventToState(patient, PatientState.Assessment) || patient.lastAssessedTime || null;
}

function dischargeTimestamp(patient: Patient): string | null {
  return latestEventToState(patient, PatientState.Discharge) || timestampFromPatientTimeline(patient, (event) => event.type === 'DispositionUpdated' && event.to === PatientState.Discharge);
}

function stateEnteredTimestamp(patient: Patient): string {
  return latestEventToState(patient, patient.state) || patient.arrivalTime;
}

function patientText(patient: Patient): string {
  const notes = (patient.notes || []).map((note) => `${note.text || ''} ${note.body || ''} ${note.type || ''}`);
  const timeline = (patient.timeline || []).map((event) => `${event.type || ''} ${event.note || ''} ${event.summary || ''} ${JSON.stringify(event.metadata || {})}`);
  return [patient.chiefComplaint, patient.complaint, patient.complaintCategory, ...notes, ...timeline].join(' ');
}

function hasFlag(patient: Patient, flag: PatientFlag | string): boolean {
  return (patient.flags as unknown[]).some((candidate) => {
    if (typeof candidate === 'string') return candidate === flag;
    if (candidate && typeof candidate === 'object' && 'type' in candidate) {
      return String((candidate as { type?: unknown }).type) === flag;
    }
    return false;
  });
}

function isGone(patient: Patient): boolean {
  return patient.state === PatientState.Discharge || patient.state === PatientState.Deceased;
}

function isLwbsPatient(patient: Patient): boolean {
  const text = patientText(patient);
  const hasLwbsRisk = hasFlag(patient, 'LWBSRisk') || /\blwbs\s*risk\b|left without being seen risk/i.test(text);
  const hasGoneSignal = isGone(patient) || /\blwbs\b|left without being seen|left before (being )?(seen|treatment)|eloped/i.test(text);
  return hasLwbsRisk && hasGoneSignal;
}

function shiftTimeMetrics(patients: Patient[], now: Date, shiftStartMs: number) {
  const shiftPatients = patients.filter((patient) => patientAddedThisShift(patient, shiftStartMs));
  const doorToTriage = shiftPatients
    .map((patient) => minutesBetween(patient.arrivalTime, triageTimestamp(patient)))
    .filter((value): value is number => Number.isFinite(value));
  const doorToProvider = shiftPatients
    .map((patient) => minutesBetween(patient.arrivalTime, providerTimestamp(patient)))
    .filter((value): value is number => Number.isFinite(value));
  const lengthOfStay = shiftPatients
    .filter((patient) => patient.state === PatientState.Discharge)
    .map((patient) => minutesBetween(patient.arrivalTime, dischargeTimestamp(patient)))
    .filter((value): value is number => Number.isFinite(value));
  const activeWaits = shiftPatients
    .filter((patient) => ACTIVE_STATES.has(patient.state))
    .map((patient) => minutesBetween(patient.arrivalTime, now))
    .filter((value): value is number => Number.isFinite(value));

  return {
    avgDoorToTriageMinutes: average(doorToTriage),
    avgDoorToProviderMinutes: average(doorToProvider),
    avgLengthOfStayMinutes: average(lengthOfStay),
    longestWaitMinutes: activeWaits.length ? Math.max(...activeWaits) : 0,
  };
}

function queuePerformance(patients: Patient[], now: Date, emergencySettings?: Parameters<typeof ctasTargetMinutes>[1]) {
  const activePatients = patients.filter((patient) => ACTIVE_STATES.has(patient.state));
  const queueMap = activePatients.reduce<Map<string, Patient[]>>((map, patient) => {
    const queue = patient.state || PatientState.Waiting;
    map.set(queue, [...(map.get(queue) || []), patient]);
    return map;
  }, new Map());

  return [...queueMap.entries()]
    .map(([queue, queuePatients]) => {
      const waits = queuePatients
        .map((patient) => minutesBetween(stateEnteredTimestamp(patient), now))
        .filter((value): value is number => Number.isFinite(value));
      const breaches = queuePatients.filter((patient) => {
        const wait = minutesBetween(stateEnteredTimestamp(patient), now) || 0;
        return wait > ctasTargetMinutes(patient.priority, emergencySettings);
      }).length;
      return {
        queue,
        patients: queuePatients.length,
        avgWaitMinutes: average(waits) || 0,
        maxWaitMinutes: waits.length ? Math.max(...waits) : 0,
        breaches,
      };
    })
    .sort((a, b) => b.patients - a.patients || b.maxWaitMinutes - a.maxWaitMinutes);
}

function buildCapacityHistory(input: {
  history?: CapacityHistoryEntry[];
  capacity: CapacitySnapshot;
  workflowLogs?: WorkflowActionLog[];
  now: Date;
}) {
  const seededLimitations: string[] = [];
  const explicitHistory = (input.history || []).filter((entry) => toMs(entry.timestamp) !== null);
  let history = explicitHistory;

  if (!history.length) {
    seededLimitations.push('Capacity history was not available; the timeline is seeded from the current capacity snapshot.');
    history = [
      {
        id: 'capacity-history-current',
        timestamp: input.capacity.updatedAt || input.now.toISOString(),
        band: input.capacity.band,
        score: input.capacity.score,
        source: 'current-capacity-seed',
      },
    ];
  }

  const sorted = [...history].sort((a, b) => (toMs(a.timestamp) ?? 0) - (toMs(b.timestamp) ?? 0));
  const events = sorted
    .map((entry, index) => {
      const previous = sorted[index - 1];
      const fromBand = entry.fromBand || previous?.band;
      if (!fromBand || fromBand === entry.band) return null;
      return {
        id: entry.id,
        time: entry.timestamp,
        fromBand,
        toBand: entry.toBand || entry.band,
        durationMinutes: previous ? minutesBetween(previous.timestamp, entry.timestamp) : null,
        score: entry.score,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  const totals = CAPACITY_BANDS.map((band) => ({ band, minutes: 0 }));
  sorted.forEach((entry, index) => {
    const next = sorted[index + 1];
    const duration = minutesBetween(entry.timestamp, next?.timestamp || input.now) || 0;
    const target = totals.find((candidate) => candidate.band === entry.band);
    if (target) target.minutes += duration;
  });
  const totalMinutes = totals.reduce((sum, item) => sum + item.minutes, 0);

  if (sorted.length === 1 && sorted[0].source === 'current-capacity-seed') {
    seededLimitations.push('Only the current capacity band is known for this session until capacity changes occur.');
  }

  return {
    events,
    totals: totals.map((item) => ({
      ...item,
      percent: totalMinutes ? Math.round((item.minutes / totalMinutes) * 100) : 0,
    })),
    limitations: seededLimitations,
  };
}

function clinicalScoreCounts(patients: Patient[]) {
  const definitions = [
    { label: 'HEART', pattern: /\bheart\b/gi },
    { label: 'qSOFA', pattern: /\bqsofa\b/gi },
    { label: 'NIHSS', pattern: /\bnihss\b/gi },
    { label: 'NEWS2', pattern: /\bnews\s*2\b|\bnews2\b/gi },
    { label: 'CIWA-Ar', pattern: /\bciwa(?:-?ar)?\b/gi },
    { label: 'C-SSRS', pattern: /\bc-?ssrs\b|\bcolumbia suicide severity rating\b/gi },
    { label: 'TIMI', pattern: /\btimi\b/gi },
    { label: 'Wells', pattern: /\bwells\b/gi },
    { label: 'PERC', pattern: /\bperc\b/gi },
  ];
  const corpus = patients.map(patientText).join('\n');
  return definitions
    .map(({ label, pattern }) => ({ type: label, count: corpus.match(pattern)?.length || 0 }))
    .filter((score) => score.count > 0);
}

function protocolCounts(patients: Patient[], alerts: Alert[], shiftStartMs: number) {
  const alertText = alerts
    .filter((alert) => isAfterOrEqual(alert.createdAt, shiftStartMs))
    .map((alert) => `${alert.title} ${alert.message} ${alert.type || ''}`)
    .join(' ');

  const patientCorpus = patients.map(patientText);
  return {
    stemi: patientCorpus.filter((text) => /\bstemi\b|code stemi|cath lab/i.test(text)).length + (alertText.match(/\bstemi\b|code stemi|cath lab/gi)?.length || 0),
    sepsis:
      patients.filter((patient) => hasFlag(patient, PatientFlag.SepsisAlert) || /sepsis|sep-?1/i.test(patientText(patient))).length +
      (alertText.match(/sepsis|sep-?1/gi)?.length || 0),
    stroke:
      patients.filter((patient) => hasFlag(patient, PatientFlag.StrokeCode) || hasFlag(patient, PatientFlag.DeterioratingNeuro) || /stroke|nihss|code stroke/i.test(patientText(patient))).length +
      (alertText.match(/stroke|nihss|code stroke/gi)?.length || 0),
  };
}

function referralMetrics(referrals: Referral[], shiftStartMs: number) {
  const shiftReferrals = referrals.filter((referral) =>
    isAfterOrEqual(referral.requestedAt || referral.createdAt || referral.updatedAt, shiftStartMs),
  );
  return {
    sent: shiftReferrals.filter((referral) => SENT_REFERRAL_STATUSES.has(referral.status)).length,
    accepted: shiftReferrals.filter((referral) => ACCEPTED_REFERRAL_STATUSES.has(referral.status)).length,
    declined: shiftReferrals.filter((referral) => DECLINED_REFERRAL_STATUSES.has(referral.status)).length,
  };
}

function reassessmentMetrics(patients: Patient[], workflowLogs: WorkflowActionLog[], shiftStartMs: number) {
  const flaggedIds = new Set<string>();
  const completedKeys = new Set<string>();

  patients.forEach((patient) => {
    if (hasFlag(patient, PatientFlag.ReassessmentDue)) flaggedIds.add(patient.id);
    (patient.reassessmentReminders || []).forEach((reminder) => {
      if (isAfterOrEqual(reminder.scheduledAt || reminder.dueAt, shiftStartMs)) flaggedIds.add(reminder.id || patient.id);
      if (reminder.status === 'completed' && isAfterOrEqual(reminder.completedAt, shiftStartMs)) completedKeys.add(reminder.id || patient.id);
    });
    (patient.timeline || []).forEach((event) => {
      if (event.type === 'ReassessmentReminderScheduled' && isAfterOrEqual(event.timestamp, shiftStartMs)) flaggedIds.add(event.id || patient.id);
      if (event.type === 'ReassessmentReminderCompleted' && isAfterOrEqual(event.timestamp, shiftStartMs)) completedKeys.add(event.id || patient.id);
    });
  });

  workflowLogs.forEach((log) => {
    if (!isAfterOrEqual(log.timestamp, shiftStartMs)) return;
    if (log.type === 'reassessment_created') flaggedIds.add(log.patientId || log.id);
    if (log.type === 'reassessment_completed') completedKeys.add(log.patientId || log.id);
  });

  return { flagged: flaggedIds.size, completed: completedKeys.size };
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function recordTime(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (toMs(value) !== null) return String(value);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function emsMetrics(input: ShiftSummaryInput, now: Date, shiftStartMs: number) {
  const arrivals = (input.emsArrivals || []).filter(isRecord);
  const units = input.emsUnits || [];
  const emsPatients = input.patients.filter(
    (patient) => patientAddedThisShift(patient, shiftStartMs) && (hasFlag(patient, PatientFlag.EMSArrival) || patient.source === 'EMS' || patient.emsUnitId),
  );
  const receivedArrivals = arrivals.filter((arrival) => {
    const time = recordTime(arrival, ['arrivedAt', 'handoffCompletedAt', 'estimatedArrivalTime', 'dispatchTime']);
    const status = readString(arrival, ['status']);
    return isAfterOrEqual(time, shiftStartMs) && (!status || !/cancel/i.test(status));
  });
  const offloadSamples = receivedArrivals
    .map((arrival) => {
      const explicit = readNumber(arrival, ['offloadMinutes', 'offloadTimeMinutes', 'offloadDelayMinutes']);
      if (explicit !== null) return explicit;
      return minutesBetween(recordTime(arrival, ['arrivedAt']), recordTime(arrival, ['handoffCompletedAt']));
    })
    .filter((value): value is number => Number.isFinite(value));
  const criticalArrivals = receivedArrivals.filter((arrival) => {
    const severity = readString(arrival, ['severity', 'acuity', 'priority']);
    return /critical|p1|resuscitation/i.test(severity || '');
  });
  const fallbackCriticalPatients = emsPatients.filter((patient) => patient.priority === Priority.P1 || patient.priority === Priority.P2);
  const activeInbound = units.filter((unit) => /inbound|arrived|offload/i.test(String(unit.status))).length;
  const activeCritical = units.filter((unit) => unit.acuity === Priority.P1 || unit.acuity === Priority.P2).length + criticalArrivals.length;
  const waitingHandoffs = receivedArrivals.filter((arrival) => !recordTime(arrival, ['handoffCompletedAt'])).length;
  const pressureScore = Math.min(100, activeInbound * 10 + activeCritical * 18 + waitingHandoffs * 12 + Math.max(0, (average(offloadSamples) || 0) - 15));
  const limitations: string[] = [];

  if (!offloadSamples.length) {
    limitations.push('EMS offload time uses arrivedAt to handoffCompletedAt when present; no completed offload samples are currently available.');
  }
  if (!receivedArrivals.length && emsPatients.length) {
    limitations.push('EMS units received falls back to EMS-linked patients because EMS arrival history is not populated.');
  }

  return {
    unitsReceived: receivedArrivals.length || emsPatients.length,
    avgOffloadMinutes: average(offloadSamples),
    criticalArrivals: criticalArrivals.length || fallbackCriticalPatients.length,
    pressurePeak: {
      score: Math.round(pressureScore),
      time: now.toISOString(),
      source: 'current EMS unit pressure fallback',
    },
    limitations,
  };
}

export function buildShiftSummary(input: ShiftSummaryInput) {
  const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
  const shiftStartMs = toMs(input.activeShift.startTime) ?? 0;
  const patientsThisShift = input.patients.filter((patient) => patientAddedThisShift(patient, shiftStartMs));
  const dischargedThisShift = input.patients.filter((patient) => patient.state === PatientState.Discharge && isAfterOrEqual(dischargeTimestamp(patient) || patient.arrivalTime, shiftStartMs));
  const admittedThisShift = input.patients.filter((patient) => {
    if (isAfterOrEqual(latestEventToState(patient, PatientState.Admission), shiftStartMs)) return true;
    return (patient.state === PatientState.Admission || hasFlag(patient, PatientFlag.PendingAdmission)) && patientAddedThisShift(patient, shiftStartMs);
  });
  const activePatients = input.patients.filter((patient) => ACTIVE_STATES.has(patient.state));
  const onShiftIds = new Set(input.activeShift.staffIds || []);
  const staffOnDuty = input.staff.filter((member) => {
    if (onShiftIds.size) return onShiftIds.has(member.id);
    return member.status === 'OnShift' || member.active;
  });
  const timeMetrics = shiftTimeMetrics(input.patients, now, shiftStartMs);
  const capacity = buildCapacityHistory({
    history: input.capacityHistory,
    capacity: input.capacity,
    workflowLogs: input.workflowLogs,
    now,
  });
  const clinicalScores = clinicalScoreCounts(patientsThisShift);
  const protocols = protocolCounts(patientsThisShift, input.alerts, shiftStartMs);
  const referrals = referralMetrics(input.referrals, shiftStartMs);
  const reassessments = reassessmentMetrics(input.patients, input.workflowLogs || [], shiftStartMs);
  const ems = emsMetrics(input, now, shiftStartMs);
  const longWait = longWaitShiftMetrics(activePatients, now, input.emergencySettings || {});
  const limitations = [
    ...capacity.limitations,
    ...ems.limitations,
  ];

  if (!input.patients.some((patient) => isLwbsPatient(patient))) {
    limitations.push('LWBS count requires a visible LWBSRisk or LWBS note/timeline signal; removed-patient history is not available in the current store.');
  }

  return {
    generatedAt: now.toISOString(),
    shift: {
      id: input.activeShift.id,
      label: input.activeShift.label,
      startTime: input.activeShift.startTime,
      durationMinutes: minutesBetween(input.activeShift.startTime, now) || 0,
      staffOnDuty: staffOnDuty.map((member) => member.displayName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.id),
    },
    volume: {
      patientsSeen: patientsThisShift.length,
      discharged: dischargedThisShift.length,
      admitted: admittedThisShift.length,
      active: activePatients.length,
      lwbs: input.patients.filter(isLwbsPatient).length,
    },
    timeMetrics,
    queues: queuePerformance(input.patients, now, input.emergencySettings),
    longWait,
    capacity,
    clinical: {
      p1Seen: patientsThisShift.filter((patient) => patient.priority === Priority.P1).length,
      p2Seen: patientsThisShift.filter((patient) => patient.priority === Priority.P2).length,
      scores: clinicalScores,
      protocols,
      referrals,
      reassessments,
    },
    ems,
    limitations,
  };
}
