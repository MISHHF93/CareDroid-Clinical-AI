/**
 * Crowd Level Engine — unified LOW ? CRITICAL classification from queue,
 * capacity, EMS, and wait-time signals.
 */
import {
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
} from '../types/emergency';
import { summarizeEmsAwareness } from '../components/whiteboard/emsAwarenessModel';
import { summarizeTriageBreachBoard } from '../services/triageBreachTimer';

export const CROWD_LEVEL = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  BUSY: 'BUSY',
  VERY_BUSY: 'VERY_BUSY',
  CRITICAL: 'CRITICAL',
} as const);

export type CrowdLevelId = (typeof CROWD_LEVEL)[keyof typeof CROWD_LEVEL];

export type CrowdLevelTone = 'stable' | 'info' | 'watch' | 'warning' | 'critical';

export type CrowdLevelAudience = 'public' | 'staff';

export type CrowdLevelSignals = Readonly<{
  waitingCount: number;
  triagePending: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
  capacityBand: string;
  capacityScore: number | null;
  emsInbound: number;
  emsOffloadDelays: number;
  queueBreaches: number;
  pressureScore: number;
}>;

export type CrowdLevelSnapshot = Readonly<{
  id: CrowdLevelId;
  label: string;
  staffLabel: string;
  tone: CrowdLevelTone;
  detail: string;
  signals: CrowdLevelSignals;
}>;

export type CrowdLevelInput = {
  patients?: Patient[];
  capacity?: CapacitySnapshot | null;
  emsArrivals?: EMSArrival[];
  emsInbound?: number;
  emsOffloadDelays?: number;
  queueBreaches?: number;
  settings?: Record<string, unknown> | null;
  now?: Date;
  audience?: CrowdLevelAudience;
};

const LEVEL_ORDER: CrowdLevelId[] = [
  CROWD_LEVEL.LOW,
  CROWD_LEVEL.MODERATE,
  CROWD_LEVEL.BUSY,
  CROWD_LEVEL.VERY_BUSY,
  CROWD_LEVEL.CRITICAL,
];

const PUBLIC_LABELS: Record<CrowdLevelId, string> = {
  [CROWD_LEVEL.LOW]: 'Low',
  [CROWD_LEVEL.MODERATE]: 'Moderate',
  [CROWD_LEVEL.BUSY]: 'Busy',
  [CROWD_LEVEL.VERY_BUSY]: 'Very busy',
  [CROWD_LEVEL.CRITICAL]: 'Critical',
};

const STAFF_LABELS: Record<CrowdLevelId, string> = {
  [CROWD_LEVEL.LOW]: 'LOW',
  [CROWD_LEVEL.MODERATE]: 'MODERATE',
  [CROWD_LEVEL.BUSY]: 'BUSY',
  [CROWD_LEVEL.VERY_BUSY]: 'VERY_BUSY',
  [CROWD_LEVEL.CRITICAL]: 'CRITICAL',
};

const LEVEL_TONES: Record<CrowdLevelId, CrowdLevelTone> = {
  [CROWD_LEVEL.LOW]: 'stable',
  [CROWD_LEVEL.MODERATE]: 'watch',
  [CROWD_LEVEL.BUSY]: 'warning',
  [CROWD_LEVEL.VERY_BUSY]: 'critical',
  [CROWD_LEVEL.CRITICAL]: 'critical',
};

const PUBLIC_DETAILS: Record<CrowdLevelId, string> = {
  [CROWD_LEVEL.LOW]: 'Lower-than-usual waiting room activity.',
  [CROWD_LEVEL.MODERATE]: 'Typical waiting-room activity.',
  [CROWD_LEVEL.BUSY]: 'More patients than usual are waiting.',
  [CROWD_LEVEL.VERY_BUSY]: 'The department is under high demand right now.',
  [CROWD_LEVEL.CRITICAL]: 'Extremely high demand — care teams are prioritizing urgent needs.',
};

const STAFF_DETAILS: Record<CrowdLevelId, string> = {
  [CROWD_LEVEL.LOW]: 'Queue, capacity, and EMS pressure are within normal range.',
  [CROWD_LEVEL.MODERATE]: 'Moderate queue and wait-time pressure — monitor intake pace.',
  [CROWD_LEVEL.BUSY]: 'Elevated waiting room and throughput pressure.',
  [CROWD_LEVEL.VERY_BUSY]: 'Sustained crowding — expect delays across intake and treatment.',
  [CROWD_LEVEL.CRITICAL]: 'Critical crowding — activate surge coordination and flow controls.',
};

function minutesSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function maxLevel(current: CrowdLevelId, candidate: CrowdLevelId): CrowdLevelId {
  return LEVEL_ORDER.indexOf(candidate) > LEVEL_ORDER.indexOf(current) ? candidate : current;
}

function scoreToLevel(score: number): CrowdLevelId {
  if (score >= 80) return CROWD_LEVEL.CRITICAL;
  if (score >= 60) return CROWD_LEVEL.VERY_BUSY;
  if (score >= 40) return CROWD_LEVEL.BUSY;
  if (score >= 20) return CROWD_LEVEL.MODERATE;
  return CROWD_LEVEL.LOW;
}

function levelFromCapacityBand(band: string | undefined): CrowdLevelId | null {
  if (band === 'Red') return CROWD_LEVEL.CRITICAL;
  if (band === 'Orange') return CROWD_LEVEL.VERY_BUSY;
  if (band === 'Yellow') return CROWD_LEVEL.MODERATE;
  if (band === 'Green') return CROWD_LEVEL.LOW;
  return null;
}

function levelFromWaitingCount(waitingCount: number): CrowdLevelId {
  if (waitingCount >= 20) return CROWD_LEVEL.CRITICAL;
  if (waitingCount >= 12) return CROWD_LEVEL.VERY_BUSY;
  if (waitingCount >= 6) return CROWD_LEVEL.BUSY;
  if (waitingCount >= 3) return CROWD_LEVEL.MODERATE;
  return CROWD_LEVEL.LOW;
}

function levelFromWaitMinutes(avgWait: number, longestWait: number): CrowdLevelId {
  let level: CrowdLevelId = CROWD_LEVEL.LOW;
  if (avgWait >= 120 || longestWait >= 180) level = maxLevel(level, CROWD_LEVEL.CRITICAL);
  else if (avgWait >= 90 || longestWait >= 120) level = maxLevel(level, CROWD_LEVEL.VERY_BUSY);
  else if (avgWait >= 60 || longestWait >= 90) level = maxLevel(level, CROWD_LEVEL.BUSY);
  else if (avgWait >= 30 || longestWait >= 45) level = maxLevel(level, CROWD_LEVEL.MODERATE);
  return level;
}

function levelFromEmsPressure(emsInbound: number, offloadDelays: number): CrowdLevelId {
  let level: CrowdLevelId = CROWD_LEVEL.LOW;
  if (offloadDelays >= 3 || emsInbound >= 5) level = maxLevel(level, CROWD_LEVEL.CRITICAL);
  else if (offloadDelays >= 2 || emsInbound >= 3) level = maxLevel(level, CROWD_LEVEL.VERY_BUSY);
  else if (offloadDelays >= 1 || emsInbound >= 2) level = maxLevel(level, CROWD_LEVEL.BUSY);
  else if (emsInbound >= 1) level = maxLevel(level, CROWD_LEVEL.MODERATE);
  return level;
}

function computePressureScore(signals: Omit<CrowdLevelSignals, 'pressureScore'>): number {
  let score = 0;

  if (signals.waitingCount >= 20) score += 28;
  else if (signals.waitingCount >= 12) score += 20;
  else if (signals.waitingCount >= 6) score += 12;
  else if (signals.waitingCount >= 3) score += 5;

  if (signals.capacityBand === 'Red') score += 24;
  else if (signals.capacityBand === 'Orange') score += 18;
  else if (signals.capacityBand === 'Yellow') score += 10;

  if (signals.capacityScore != null) {
    if (signals.capacityScore >= 85) score += 14;
    else if (signals.capacityScore >= 70) score += 10;
    else if (signals.capacityScore >= 55) score += 6;
  }

  if (signals.averageWaitMinutes >= 120) score += 16;
  else if (signals.averageWaitMinutes >= 90) score += 12;
  else if (signals.averageWaitMinutes >= 60) score += 8;
  else if (signals.averageWaitMinutes >= 30) score += 4;

  if (signals.longestWaitMinutes >= 180) score += 10;
  else if (signals.longestWaitMinutes >= 120) score += 6;

  if (signals.triagePending >= 8) score += 8;
  else if (signals.triagePending >= 4) score += 4;

  if (signals.emsOffloadDelays >= 2) score += 8;
  else if (signals.emsOffloadDelays >= 1) score += 4;

  if (signals.emsInbound >= 4) score += 8;
  else if (signals.emsInbound >= 2) score += 4;
  else if (signals.emsInbound >= 1) score += 2;

  if (signals.queueBreaches >= 2) score += 8;
  else if (signals.queueBreaches >= 1) score += 4;

  return Math.min(100, score);
}

export function buildCrowdLevelSnapshot(input: CrowdLevelInput = {}): CrowdLevelSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const capacity = input.capacity || null;
  const emsArrivals = input.emsArrivals || [];
  const audience = input.audience || 'staff';

  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
  const waitingCount = capacity?.waitingCount ?? waitingPatients.length;

  const triageSummary = summarizeTriageBreachBoard(patients, {
    settings: input.settings || undefined,
    now,
  });
  const triagePending =
    capacity?.triageCount ??
    Math.max(
      triageSummary.awaitingTriageCount,
      patients.filter(
        (patient) =>
          patient.state === PatientState.Triage ||
          patient.state === PatientState.Arrival ||
          patient.state === PatientState.Registration,
      ).length,
    );

  const averageWaitMinutes =
    capacity?.averageWaitMinutes ??
    (waitingPatients.length
      ? Math.round(
          waitingPatients.reduce(
            (sum, patient) =>
              sum + minutesSince(patient.triageTime || patient.arrivalTime, now),
            0,
          ) / waitingPatients.length,
        )
      : 0);

  const longestWaitMinutes =
    capacity?.longestWaitMinutes ??
    waitingPatients.reduce(
      (max, patient) =>
        Math.max(max, minutesSince(patient.triageTime || patient.arrivalTime, now)),
      0,
    );

  const emsAwareness = summarizeEmsAwareness(emsArrivals, now.getTime(), { patients });
  const emsInbound =
    input.emsInbound ??
    capacity?.emsInboundCount ??
    capacity?.incomingEMSCount ??
    emsAwareness.inboundCount ??
    0;
  const emsOffloadDelays =
    input.emsOffloadDelays ??
    emsAwareness.delayedOffloadCount ??
    emsAwareness.awaitingHandoff ??
    0;

  const capacityBand = capacity?.band || 'Green';
  const capacityScore = capacity?.score ?? null;
  const queueBreaches = input.queueBreaches ?? 0;

  const signalBase = {
    waitingCount,
    triagePending,
    averageWaitMinutes,
    longestWaitMinutes,
    capacityBand,
    capacityScore,
    emsInbound,
    emsOffloadDelays,
    queueBreaches,
  };

  const pressureScore = computePressureScore(signalBase);

  let level = scoreToLevel(pressureScore);
  const bandLevel = levelFromCapacityBand(capacityBand);
  if (bandLevel) level = maxLevel(level, bandLevel);
  level = maxLevel(level, levelFromWaitingCount(waitingCount));
  level = maxLevel(level, levelFromWaitMinutes(averageWaitMinutes, longestWaitMinutes));
  level = maxLevel(level, levelFromEmsPressure(emsInbound, emsOffloadDelays));
  if (queueBreaches >= 2) level = maxLevel(level, CROWD_LEVEL.VERY_BUSY);
  if (queueBreaches >= 1) level = maxLevel(level, CROWD_LEVEL.BUSY);

  const labels = audience === 'public' ? PUBLIC_LABELS : STAFF_LABELS;
  const details = audience === 'public' ? PUBLIC_DETAILS : STAFF_DETAILS;

  return Object.freeze({
    id: level,
    label: labels[level],
    staffLabel: STAFF_LABELS[level],
    tone: LEVEL_TONES[level],
    detail: details[level],
    signals: Object.freeze({
      ...signalBase,
      pressureScore,
    }),
  });
}

/** @deprecated Use buildCrowdLevelSnapshot — kept for public waiting display compatibility */
export function derivePublicCrowdLevelFromEngine(
  waitingCount: number,
  capacityBand?: string,
  extra: Omit<CrowdLevelInput, 'capacity' | 'patients'> & {
    averageWaitMinutes?: number;
    longestWaitMinutes?: number;
  } = {},
): Pick<CrowdLevelSnapshot, 'label' | 'tone' | 'detail' | 'id' | 'staffLabel'> {
  const snapshot = buildCrowdLevelSnapshot({
    ...extra,
    audience: 'public',
    capacity: {
      waitingCount,
      band: (capacityBand as CapacitySnapshot['band']) || 'Green',
      averageWaitMinutes: extra.averageWaitMinutes,
      longestWaitMinutes: extra.longestWaitMinutes,
      score: 0,
      updatedAt: new Date().toISOString(),
      totalPatients: waitingCount,
      occupiedRooms: 0,
      boardingCount: 0,
      reassessmentDue: 0,
    },
    patients: [],
  });
  return {
    id: snapshot.id,
    label: snapshot.label,
    staffLabel: snapshot.staffLabel,
    tone: snapshot.tone,
    detail: snapshot.detail,
  };
}

export function crowdLevelToneToOperationalTone(tone: CrowdLevelTone): string {
  if (tone === 'stable') return 'neutral';
  if (tone === 'info') return 'info';
  if (tone === 'watch') return 'warning';
  if (tone === 'warning') return 'warning';
  return 'critical';
}
