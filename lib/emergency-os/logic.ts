export type EmergencyOsCapacityBand = 'Green' | 'Yellow' | 'Orange' | 'Red';

/**
 * Canonical "is this patient boarding" predicate. Consolidates 6 previously
 * independent, disagreeing definitions across the backend and frontend
 * (found by a repository-wide domain-model audit, 2026-08-08) -- some
 * missing the Disposition state, some missing the PendingAdmission flag,
 * one checking a boardingStatus field that doesn't exist on the live
 * Patient type at all. This is the most complete of the 6: matches the
 * backend's own EmergencyOsController.isBoarding(), which is what the
 * always-on, real UI traffic path actually uses.
 *
 * Deliberately takes plain state/flags rather than importing either
 * stack's Patient type, since PatientState/PatientFlag enum members are
 * these exact string literals -- this works unchanged for both the
 * frontend's enum-based Patient and the backend's plain-string
 * EmergencyPatient without either stack importing the other's types.
 */
export function isEmergencyOsBoarding(patient: {
  state: string;
  flags?: readonly string[] | null;
}): boolean {
  return (
    patient.state === 'Admission' ||
    patient.state === 'Disposition' ||
    (patient.flags || []).includes('PendingAdmission')
  );
}

export interface EmergencyOsCapacityThresholds {
  warningPercent: number;
  orangePercent: number;
  criticalPercent: number;
  boardingWarningCount: number;
  boardingCriticalCount: number;
  reassessmentWarningCount: number;
  reassessmentCriticalCount: number;
  dischargeReadyWarningCount: number;
  criticalEmsWarningCount: number;
}

export interface EmergencyOsCapacityInput {
  totalPatients: number;
  occupiedRooms: number;
  totalRooms: number;
  boardingCount: number;
  reassessmentDue: number;
  waitingCount?: number;
  dischargeReadyCount?: number;
  criticalEmsInboundCount?: number;
  thresholds?: Partial<EmergencyOsCapacityThresholds>;
  now?: string;
}

export interface EmergencyOsLogicFactor {
  id: string;
  label: string;
  value: number;
  unit: string;
  points: number;
  threshold: number;
}

export interface EmergencyOsCapacityOutput {
  ok: boolean;
  errors: string[];
  score: number;
  band: EmergencyOsCapacityBand;
  totalPatients: number;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPercent: number;
  boardingCount: number;
  reassessmentDue: number;
  waitingCount: number;
  dischargeReadyCount: number;
  criticalEmsInboundCount: number;
  factors: EmergencyOsLogicFactor[];
  units: Record<string, string>;
  updatedAt: string;
}

export const EMERGENCY_OS_CAPACITY_INPUT_SCHEMA = Object.freeze({
  totalPatients: 'count of active CareDroid patients',
  occupiedRooms: 'count of occupied ED rooms',
  totalRooms: 'count of staffed/known ED rooms',
  boardingCount: 'count of patients boarding or pending admission',
  reassessmentDue: 'count of patients with reassessment due',
  waitingCount: 'count of waiting-room patients',
  dischargeReadyCount: 'count of disposition/discharge-ready patients',
  criticalEmsInboundCount: 'count of critical active EMS arrivals',
});

export const EMERGENCY_OS_CAPACITY_OUTPUT_SCHEMA = Object.freeze({
  score: '0-100 pressure score; higher means more operational pressure',
  band: 'Green, Yellow, Orange, or Red pressure band',
  factors: 'transparent point contribution by signal',
  errors: 'non-fatal validation issues returned safely',
});

export const EMERGENCY_OS_CAPACITY_UNITS = Object.freeze({
  totalPatients: 'patients',
  occupiedRooms: 'rooms',
  totalRooms: 'rooms',
  occupancyPercent: 'percent',
  boardingCount: 'patients',
  reassessmentDue: 'patients',
  waitingCount: 'patients',
  dischargeReadyCount: 'patients',
  criticalEmsInboundCount: 'EMS arrivals',
  score: 'points',
});

export const DEFAULT_EMERGENCY_OS_CAPACITY_THRESHOLDS: EmergencyOsCapacityThresholds =
  Object.freeze({
    warningPercent: 70,
    orangePercent: 80,
    criticalPercent: 90,
    boardingWarningCount: 2,
    boardingCriticalCount: 6,
    reassessmentWarningCount: 3,
    reassessmentCriticalCount: 8,
    dischargeReadyWarningCount: 2,
    criticalEmsWarningCount: 1,
  });

const BAND_RANK: Record<EmergencyOsCapacityBand, number> = {
  Green: 0,
  Yellow: 1,
  Orange: 2,
  Red: 3,
};

export function calculateEmergencyOsCapacity(
  input: EmergencyOsCapacityInput,
): EmergencyOsCapacityOutput {
  const thresholds = normalizeCapacityThresholds(input.thresholds);
  const totalRooms = integerAtLeast(input.totalRooms, 0);
  const occupiedRooms = Math.min(integerAtLeast(input.occupiedRooms, 0), Math.max(totalRooms, 0));
  const boardingCount = integerAtLeast(input.boardingCount, 0);
  const reassessmentDue = integerAtLeast(input.reassessmentDue, 0);
  const waitingCount = integerAtLeast(input.waitingCount, 0);
  const dischargeReadyCount = integerAtLeast(input.dischargeReadyCount, 0);
  const criticalEmsInboundCount = integerAtLeast(input.criticalEmsInboundCount, 0);
  const totalPatients = integerAtLeast(input.totalPatients, 0);
  const errors = validateCapacityInput(input);
  const occupancyPercent = totalRooms > 0 ? round((occupiedRooms / totalRooms) * 100, 1) : 0;
  const factors = [
    factor(
      'occupancy',
      'Room occupancy',
      occupancyPercent,
      'percent',
      Math.min(65, (occupancyPercent / 100) * 65),
      thresholds.warningPercent,
    ),
    factor(
      'boarding',
      'Boarding patients',
      boardingCount,
      'patients',
      boardingCount * 6,
      thresholds.boardingWarningCount,
    ),
    factor(
      'reassessment',
      'Reassessment due',
      reassessmentDue,
      'patients',
      reassessmentDue * 4,
      thresholds.reassessmentWarningCount,
    ),
    factor(
      'waiting',
      'Waiting-room load',
      waitingCount,
      'patients',
      waitingCount * 1.5,
      1,
    ),
    factor(
      'discharge',
      'Disposition backlog',
      dischargeReadyCount,
      'patients',
      dischargeReadyCount * 5,
      thresholds.dischargeReadyWarningCount,
    ),
    factor(
      'ems',
      'Critical EMS inbound',
      criticalEmsInboundCount,
      'EMS arrivals',
      criticalEmsInboundCount * 6,
      thresholds.criticalEmsWarningCount,
    ),
  ];
  const pressureScore = clamp(
    Math.round(factors.reduce((sum, item) => sum + item.points, 0)),
    0,
    100,
  );
  const band = highestBand([
    bandFromScore(pressureScore),
    bandFromOccupancy(occupancyPercent, thresholds),
    bandFromCount(boardingCount, thresholds.boardingWarningCount, thresholds.boardingCriticalCount),
    bandFromCount(
      reassessmentDue,
      thresholds.reassessmentWarningCount,
      thresholds.reassessmentCriticalCount,
    ),
  ]);

  return {
    ok: errors.length === 0,
    errors,
    score: pressureScore,
    band,
    totalPatients,
    occupiedRooms,
    totalRooms,
    occupancyPercent,
    boardingCount,
    reassessmentDue,
    waitingCount,
    dischargeReadyCount,
    criticalEmsInboundCount,
    factors,
    units: { ...EMERGENCY_OS_CAPACITY_UNITS },
    updatedAt: input.now || new Date().toISOString(),
  };
}

export function normalizeCapacityThresholds(
  thresholds: Partial<EmergencyOsCapacityThresholds> = {},
): EmergencyOsCapacityThresholds {
  return {
    ...DEFAULT_EMERGENCY_OS_CAPACITY_THRESHOLDS,
    ...Object.fromEntries(
      Object.entries(thresholds).filter(([, value]) => Number.isFinite(Number(value))),
    ),
  } as EmergencyOsCapacityThresholds;
}

function validateCapacityInput(input: EmergencyOsCapacityInput): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(Number(input.totalRooms)) || Number(input.totalRooms) < 0) {
    errors.push('totalRooms must be a non-negative number');
  }
  if (Number(input.occupiedRooms) > Number(input.totalRooms)) {
    errors.push('occupiedRooms exceeded totalRooms and was clamped');
  }
  for (const key of ['totalPatients', 'boardingCount', 'reassessmentDue'] as const) {
    if (!Number.isFinite(Number(input[key])) || Number(input[key]) < 0) {
      errors.push(`${key} must be a non-negative number`);
    }
  }
  return errors;
}

function factor(
  id: string,
  label: string,
  value: number,
  unit: string,
  points: number,
  threshold: number,
): EmergencyOsLogicFactor {
  return {
    id,
    label,
    value,
    unit,
    points: Math.max(0, Math.round(points)),
    threshold,
  };
}

function bandFromScore(score: number): EmergencyOsCapacityBand {
  if (score >= 85) return 'Red';
  if (score >= 70) return 'Orange';
  if (score >= 50) return 'Yellow';
  return 'Green';
}

function bandFromOccupancy(
  occupancyPercent: number,
  thresholds: EmergencyOsCapacityThresholds,
): EmergencyOsCapacityBand {
  if (occupancyPercent >= thresholds.criticalPercent) return 'Red';
  if (occupancyPercent >= thresholds.orangePercent) return 'Orange';
  if (occupancyPercent >= thresholds.warningPercent) return 'Yellow';
  return 'Green';
}

function bandFromCount(
  count: number,
  warningThreshold: number,
  criticalThreshold: number,
): EmergencyOsCapacityBand {
  if (criticalThreshold > 0 && count >= criticalThreshold) return 'Red';
  if (warningThreshold > 0 && count >= warningThreshold) return 'Yellow';
  return 'Green';
}

function highestBand(bands: EmergencyOsCapacityBand[]): EmergencyOsCapacityBand {
  return bands.reduce(
    (highest, band) => (BAND_RANK[band] > BAND_RANK[highest] ? band : highest),
    'Green',
  );
}

function integerAtLeast(value: unknown, min: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.round(parsed));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}
