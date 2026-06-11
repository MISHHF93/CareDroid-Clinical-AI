import type { AIRequestType } from './client';
import type { PatientState, Priority } from '../../types/emergency';

export type CapacityBand = 'Green' | 'Yellow' | 'Orange' | 'Red';

export interface DepartmentContext {
  timestamp: string;
  shift: {
    startTime: string | null;
    duration: number;
    staffOnDuty: string[];
  };
  patients: {
    total: number;
    byState: Record<PatientState, number>;
    highRisk: number;
    ems: number;
    boarding: number;
    avgWaitMinutes: number;
    longestWaitMinutes: number;
    reassessmentDue: number;
  };
  capacity: {
    score: number;
    band: CapacityBand;
    roomOccupancy: string;
    boardingCount: number;
  };
  ems: {
    pressureScore: number;
    incomingUnits: number;
    criticalUnits: number;
    avgETA: number;
  };
  queues: {
    bottleneck: string | null;
    worst: { queue: string; avgWait: number } | null;
  };
  referrals: {
    pending: number;
    overdue: number;
  };
  alerts: {
    critical: number;
    warning: number;
  };
  patientSummaries: Array<{
    name: string;
    complaint: string;
    state: PatientState;
    priority: Priority;
    waitMinutes: number;
    flags: string[];
    scores: string[];
  }>;
}

type StoreReader = () => any;

const CACHE_TTL_MS = 10_000;
const PATIENT_STATES = [
  'Arrival',
  'Registration',
  'Triage',
  'Waiting',
  'Assessment',
  'Orders',
  'Results',
  'Disposition',
  'Admission',
  'Discharge',
  'Deceased',
] as PatientState[];

let storeReader: StoreReader | null = null;
let cachedContext: { value: DepartmentContext; expiresAt: number } | null = null;

export function setDepartmentContextStoreReader(reader: StoreReader | null) {
  storeReader = reader;
  clearDepartmentContextCache();
}

export function clearDepartmentContextCache() {
  cachedContext = null;
}

export function buildDepartmentContext(): DepartmentContext {
  const now = Date.now();
  if (cachedContext && cachedContext.expiresAt > now) {
    return cachedContext.value;
  }

  const state = readStoreState();
  const context = state ? buildContextFromState(state, new Date(now)) : emptyDepartmentContext(new Date(now));
  cachedContext = {
    value: context,
    expiresAt: now + CACHE_TTL_MS,
  };
  return context;
}

export function buildSystemPrompt(context: DepartmentContext, requestType: AIRequestType): string {
  const template = SYSTEM_PROMPTS[requestType] || SYSTEM_PROMPTS.COPILOT_CHAT;

  return [
    template,
    '',
    'Safety boundary: decision support only. Do not make autonomous diagnoses, orders, disposition decisions, staffing decisions, transfers, admissions, or discharges. Surface suggestions for qualified human review.',
    '',
    'Current department context:',
    JSON.stringify(context),
  ].join('\n');
}

function readStoreState(): any | null {
  try {
    const state = storeReader?.();
    if (state) return state;
  } catch (_error) {
    return null;
  }

  return null;
}

function buildContextFromState(state: any, now: Date): DepartmentContext {
  const patients = Array.isArray(state.patients) ? state.patients : [];
  const activePatients = patients.filter(isActivePatient);
  const capacity = state.capacity || {};
  const emsArrivals = Array.isArray(state.emsArrivals) ? state.emsArrivals : [];
  const queues = Array.isArray(state.queues) ? state.queues : [];
  const referrals = Array.isArray(state.referrals) ? state.referrals : [];
  const alerts = Array.isArray(state.alerts) ? state.alerts : [];
  const staff = Array.isArray(state.staff) ? state.staff : [];
  const shift = state.activeShift || {};
  const waits = activePatients.map((patient: any) => patientWaitMinutes(patient, now));
  const incomingEms = emsArrivals.filter((arrival: any) => arrival?.status === 'Inbound');
  const pressure = calculateEmsPressure(emsArrivals, now);
  const activeReferrals = referrals.filter(isPendingReferral);
  const activeAlerts = alerts.filter((alert: any) => !alert?.dismissedAt);

  return {
    timestamp: now.toISOString(),
    shift: {
      startTime: shift.startTime || null,
      duration: shiftDurationMinutes(shift, now),
      staffOnDuty: staffOnDuty(shift, staff),
    },
    patients: {
      total: activePatients.length,
      byState: countPatientsByState(patients),
      highRisk: activePatients.filter(isHighRiskPatient).length,
      ems: activePatients.filter(isEmsPatient).length,
      boarding: activePatients.filter(isBoardingPatient).length,
      avgWaitMinutes: average(waits),
      longestWaitMinutes: waits.length ? Math.max(...waits) : 0,
      reassessmentDue: activePatients.filter((patient: any) => hasFlag(patient, 'ReassessmentDue'))
        .length,
    },
    capacity: {
      score: numberOrZero(capacity.score),
      band: normalizeCapacityBand(capacity.riskLevel || capacity.capacityScore),
      roomOccupancy: formatRoomOccupancy(capacity),
      boardingCount: numberOrZero(capacity.boardingCount),
    },
    ems: {
      pressureScore: pressure,
      incomingUnits: incomingEms.length,
      criticalUnits: incomingEms.filter((arrival: any) => arrival?.severity === 'Critical').length,
      avgETA: average(incomingEms.map((arrival: any) => minutesUntilEmsArrival(arrival, now))),
    },
    queues: {
      bottleneck: state.bottleneckAlert?.queue || null,
      worst: worstQueue(queues),
    },
    referrals: {
      pending: activeReferrals.length,
      overdue: activeReferrals.filter((referral: any) => isOverdueReferral(referral, now)).length,
    },
    alerts: {
      critical: activeAlerts.filter((alert: any) => alert?.severity === 'Critical').length,
      warning: activeAlerts.filter((alert: any) => alert?.severity === 'Warning').length,
    },
    patientSummaries: activePatients.map((patient: any) => ({
      name: patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown',
      complaint: patient.complaint || patient.chiefComplaint || '',
      state: patient.state,
      priority: patient.priority,
      waitMinutes: patientWaitMinutes(patient, now),
      flags: (patient.flags || []).map((flag: any) => flag?.type || String(flag)).filter(Boolean),
      scores: recentScores(patient),
    })),
  };
}

function emptyDepartmentContext(now: Date): DepartmentContext {
  return {
    timestamp: now.toISOString(),
    shift: { startTime: null, duration: 0, staffOnDuty: [] },
    patients: {
      total: 0,
      byState: emptyStateCounts(),
      highRisk: 0,
      ems: 0,
      boarding: 0,
      avgWaitMinutes: 0,
      longestWaitMinutes: 0,
      reassessmentDue: 0,
    },
    capacity: { score: 0, band: 'Green', roomOccupancy: '0/0 (0%)', boardingCount: 0 },
    ems: { pressureScore: 0, incomingUnits: 0, criticalUnits: 0, avgETA: 0 },
    queues: { bottleneck: null, worst: null },
    referrals: { pending: 0, overdue: 0 },
    alerts: { critical: 0, warning: 0 },
    patientSummaries: [],
  };
}

function countPatientsByState(patients: any[]): Record<PatientState, number> {
  const counts = emptyStateCounts();
  for (const patient of patients) {
    if (patient?.state && patient.state in counts) {
      counts[patient.state as PatientState] += 1;
    }
  }
  return counts;
}

function emptyStateCounts(): Record<PatientState, number> {
  return PATIENT_STATES.reduce(
    (counts, state) => ({ ...counts, [state]: 0 }),
    {} as Record<PatientState, number>,
  );
}

function isActivePatient(patient: any): boolean {
  return patient?.state !== 'Discharge' && patient?.state !== 'Deceased';
}

function isHighRiskPatient(patient: any): boolean {
  return (
    patient?.priority === 'P1' ||
    patient?.priority === 'P2' ||
    hasFlag(patient, 'HighRisk') ||
    hasFlag(patient, 'DeteriorationRisk') ||
    (patient?.flags || []).some((flag: any) => flag?.severity === 'Critical')
  );
}

function isEmsPatient(patient: any): boolean {
  return Boolean(patient?.emsArrival || hasFlag(patient, 'EMSArrival'));
}

function isBoardingPatient(patient: any): boolean {
  return patient?.state === 'Admission' || hasFlag(patient, 'PendingAdmission');
}

function hasFlag(patient: any, type: string): boolean {
  return (patient?.flags || []).some((flag: any) => flag?.type === type || flag === type);
}

function patientWaitMinutes(patient: any, now: Date): number {
  if (Number.isFinite(Number(patient?.waitMinutes))) {
    return Math.max(0, Math.round(Number(patient.waitMinutes)));
  }
  return minutesSince(patient?.arrivalTime, now);
}

function minutesSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0;
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.round((now.getTime() - then) / 60000));
}

function average(values: number[]): number {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (!numeric.length) return 0;
  return Math.round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length);
}

function numberOrZero(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function shiftDurationMinutes(shift: any, now: Date): number {
  if (!shift?.startTime) return 0;
  const start = new Date(shift.startTime).getTime();
  if (!Number.isFinite(start)) return 0;
  const end = shift.endTime ? new Date(shift.endTime).getTime() : now.getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

function staffOnDuty(shift: any, staff: any[]): string[] {
  const shiftStaffIds = new Set(Array.isArray(shift?.staffIds) ? shift.staffIds : []);
  return staff
    .filter((member) => !shiftStaffIds.size || shiftStaffIds.has(member?.id))
    .filter((member) => member?.status === 'OnShift' || shiftStaffIds.has(member?.id))
    .map(
      (member) =>
        member?.displayName ||
        member?.name ||
        [member?.firstName, member?.lastName].filter(Boolean).join(' ') ||
        member?.id,
    )
    .filter(Boolean);
}

function normalizeCapacityBand(value: unknown): CapacityBand {
  if (value === 'Red' || value === 'Orange' || value === 'Yellow' || value === 'Green') {
    return value;
  }
  return 'Green';
}

function formatRoomOccupancy(capacity: any): string {
  const current = numberOrZero(capacity.currentOccupancy);
  const max = numberOrZero(capacity.maxCapacity);
  const percent =
    Number.isFinite(Number(capacity.occupancyPercent)) && capacity.occupancyPercent !== null
      ? numberOrZero(capacity.occupancyPercent)
      : max
        ? Math.round((current / max) * 100)
        : 0;
  return `${current}/${max} (${percent}%)`;
}

function calculateEmsPressure(emsArrivals: any[], now: Date): number {
  const activeArrivals = emsArrivals.filter(
    (arrival) => !['Complete', 'Cancelled'].includes(arrival?.status),
  );
  const incomingUnits = activeArrivals.filter(
    (arrival) =>
      arrival?.status === 'Inbound' && minutesUntilEmsArrival(arrival, now) > 0 && !arrival?.patientId,
  );
  const awaitingHandoff = activeArrivals.filter(
    (arrival) =>
      !arrival?.patientId &&
      (arrival?.status === 'Arrived' ||
        arrival?.status === 'Handoff' ||
        minutesUntilEmsArrival(arrival, now) <= 0),
  );
  const criticalPending = activeArrivals.filter(
    (arrival) => !arrival?.patientId && arrival?.severity === 'Critical',
  );
  const offloadDurations = awaitingHandoff
    .map((arrival) => offloadStartTime(arrival, now))
    .filter((timestamp): timestamp is number => timestamp !== null)
    .map((timestamp) => Math.max(0, Math.round((now.getTime() - timestamp) / 60000)));
  const averageOffloadMinutes = average(offloadDurations);

  return Math.min(
    100,
    Math.min(40, incomingUnits.length * 10) +
      Math.min(30, awaitingHandoff.length * 15) +
      Math.min(20, Math.round((averageOffloadMinutes / 15) * 20)) +
      criticalPending.length * 10,
  );
}

function minutesUntilEmsArrival(arrival: any, now: Date): number {
  const target = new Date(arrival?.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return numberOrZero(arrival?.eta);
  return Math.ceil((target - now.getTime()) / 60000);
}

function offloadStartTime(arrival: any, now: Date): number | null {
  const arrivedAt = arrival?.arrivedAt ? new Date(arrival.arrivedAt).getTime() : NaN;
  if (Number.isFinite(arrivedAt)) return arrivedAt;

  const estimated = new Date(arrival?.estimatedArrivalTime).getTime();
  if (Number.isFinite(estimated) && estimated <= now.getTime()) return estimated;
  return null;
}

function worstQueue(queues: any[]): { queue: string; avgWait: number } | null {
  const candidates = queues
    .filter((queue) => numberOrZero(queue?.averageWaitMinutes) > 0)
    .sort((a, b) => numberOrZero(b.averageWaitMinutes) - numberOrZero(a.averageWaitMinutes));
  if (!candidates.length) return null;
  return {
    queue: candidates[0].name || candidates[0].type || candidates[0].id,
    avgWait: numberOrZero(candidates[0].averageWaitMinutes),
  };
}

function isPendingReferral(referral: any): boolean {
  return Boolean(referral && !['Completed', 'Declined', 'PatientDeparted'].includes(referral.status));
}

function isOverdueReferral(referral: any, now: Date): boolean {
  const wait = minutesSince(referral?.requestedAt, now);
  const threshold = referral?.urgency === 'Emergent' ? 15 : referral?.urgency === 'Urgent' ? 30 : 120;
  return wait > threshold;
}

function recentScores(patient: any): string[] {
  return (patient?.timeline || [])
    .filter((event: any) => event?.type === 'SCORE' || event?.type === 'ClinicalScoreSaved')
    .slice(-5)
    .reverse()
    .map((event: any) => {
      const metadata = event.metadata || {};
      const label = metadata.scoreLabel || metadata.toolName || metadata.label || metadata.calculatorLabel || 'Score';
      const result = metadata.scoreTotal ?? metadata.result ?? metadata.total ?? metadata.value;
      const band = metadata.band || metadata.riskBand || metadata.interpretation || metadata.severity;
      return [label, result !== undefined ? result : null, band].filter(Boolean).join(': ');
    });
}

const SYSTEM_PROMPTS: Record<AIRequestType, string> = {
  COPILOT_CHAT:
    'You are the ED Copilot for a busy emergency department. Be concise, operationally aware, and clinically cautious.',
  CLINICAL_SUMMARY:
    'Generate a concise clinical summary for human review. Highlight active problems, risk signals, pending work, and limitations.',
  SCORE_ASSIST:
    'Assist with clinical scoring workflows. Explain inputs, missing data, score context, and review requirements without inventing values.',
  INTAKE_SUGGESTION:
    'Suggest intake workflow support from the department context. Focus on triage readiness, missing information, queue pressure, and safety flags.',
  HANDOFF_BRIEF:
    'Generate a print-ready handoff brief for clinical staff. Surface queue pressure, patient risks, pending referrals, reassessments, and watch items.',
  PROTOCOL_SUGGEST:
    'Suggest relevant protocols or guidelines for human review. Cite uncertainty, required verification, and patient-safety boundaries.',
  TRIAGE_ASSIST:
    'Assist triage prioritization by surfacing risk indicators, queue pressure, EMS pressure, and reassessment needs for clinician review.',
  SHIFT_SUMMARY:
    'Summarize the shift operationally and clinically. Include capacity, EMS, queues, referrals, alerts, and patients needing follow-up.',
};
