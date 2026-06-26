export const BED_PRESSURE_LEVELS = Object.freeze({
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical',
});

export const DEFAULT_BOARDING_STATE = Object.freeze({
  pendingBeds: 9,
  bedPressure: BED_PRESSURE_LEVELS.HIGH,
  boarders: Object.freeze([
    Object.freeze({
      patientId: 'ED-BOARD-1001',
      patientLabel: 'ED-1001',
      admittedService: 'Internal Medicine',
      boardingMinutes: 382,
      pendingBedType: 'Telemetry',
      acuity: 'Sepsis pathway',
      location: 'ED bay 12',
    }),
    Object.freeze({
      patientId: 'ED-BOARD-1002',
      patientLabel: 'ED-1002',
      admittedService: 'Cardiology',
      boardingMinutes: 318,
      pendingBedType: 'Step-down',
      acuity: 'Chest pain observation',
      location: 'Hallway 3',
    }),
    Object.freeze({
      patientId: 'ED-BOARD-1003',
      patientLabel: 'ED-1003',
      admittedService: 'Psychiatry',
      boardingMinutes: 290,
      pendingBedType: 'Behavioral health',
      acuity: 'Safety watch',
      location: 'Observation 2',
    }),
    Object.freeze({
      patientId: 'ED-BOARD-1004',
      patientLabel: 'ED-1004',
      admittedService: 'Surgery',
      boardingMinutes: 176,
      pendingBedType: 'Surgical floor',
      acuity: 'Trauma review',
      location: 'ED bay 5',
    }),
    Object.freeze({
      patientId: 'ED-BOARD-1005',
      patientLabel: 'ED-1005',
      admittedService: 'Neurology',
      boardingMinutes: 142,
      pendingBedType: 'Neuro floor',
      acuity: 'Stroke pathway',
      location: 'ED bay 9',
    }),
  ]),
});

const BED_PRESSURE_WEIGHT = Object.freeze({
  [BED_PRESSURE_LEVELS.LOW]: 0,
  [BED_PRESSURE_LEVELS.MODERATE]: 12,
  [BED_PRESSURE_LEVELS.HIGH]: 24,
  [BED_PRESSURE_LEVELS.CRITICAL]: 36,
});

function normalizeBoarder(boarder: any = {}) {
  return Object.freeze({
    patientId: boarder.patientId || 'ED-BOARD-UNKNOWN',
    patientLabel: boarder.patientLabel || boarder.patientId || 'Unknown boarder',
    admittedService: boarder.admittedService || 'Internal Medicine',
    boardingMinutes: Number(boarder.boardingMinutes || 0),
    pendingBedType: boarder.pendingBedType || 'Inpatient bed',
    acuity: boarder.acuity || 'Admission pending',
    location: boarder.location || 'ED',
  });
}

function normalizeBoardingState(state = DEFAULT_BOARDING_STATE) {
  return Object.freeze({
    pendingBeds: Number(state.pendingBeds || 0),
    bedPressure: BED_PRESSURE_WEIGHT[state.bedPressure] !== undefined ? state.bedPressure : BED_PRESSURE_LEVELS.MODERATE,
    boarders: Object.freeze((state.boarders || []).map(normalizeBoarder)),
  });
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getLongestBoarders(state = DEFAULT_BOARDING_STATE, limit = 3) {
  return Object.freeze(
    [...normalizeBoardingState(state).boarders]
      .sort((a, b) => b.boardingMinutes - a.boardingMinutes)
      .slice(0, limit)
  );
}

export function getBoardingMetrics(state = DEFAULT_BOARDING_STATE) {
  const normalized = normalizeBoardingState(state);
  const boardingCount = normalized.boarders.length;
  const totalBoardingMinutes = normalized.boarders.reduce((sum, boarder) => sum + boarder.boardingMinutes, 0);
  const boardingTime = boardingCount ? Math.round(totalBoardingMinutes / boardingCount) : 0;
  const longestBoardingMinutes = boardingCount
    ? Math.max(...normalized.boarders.map((boarder) => boarder.boardingMinutes))
    : 0;

  return Object.freeze({
    boardingCount,
    boardingTime,
    longestBoardingMinutes,
    pendingBeds: normalized.pendingBeds,
    bedPressure: normalized.bedPressure,
  });
}

export function getBoardingRiskScore(state = DEFAULT_BOARDING_STATE) {
  const metrics = getBoardingMetrics(state);
  return clampScore(
    metrics.boardingCount * 5 +
      metrics.boardingTime * 0.08 +
      metrics.longestBoardingMinutes * 0.08 +
      metrics.pendingBeds * 3 +
      (BED_PRESSURE_WEIGHT[metrics.bedPressure] || 0)
  );
}

export function getBoardingRecommendations(state = DEFAULT_BOARDING_STATE) {
  const metrics = getBoardingMetrics(state);
  const longestBoarders = getLongestBoarders(state);
  const recommendations = [] as any[];

  if (metrics.boardingCount >= 4) {
    recommendations.push(
      Object.freeze({
        id: 'boarding-count-escalation',
        title: 'Escalate boarding count',
        priority: metrics.bedPressure,
        rationale: `${metrics.boardingCount} admitted patients are waiting for beds.`,
        action: 'Coordinate charge nurse, bed management, and inpatient service review.',
      })
    );
  }

  if (metrics.longestBoardingMinutes >= 240) {
    recommendations.push(
      Object.freeze({
        id: 'longest-boarder-review',
        title: 'Review longest boarders',
        priority: 'Critical',
        rationale: `${longestBoarders[0]?.patientLabel || 'A patient'} has boarded for ${metrics.longestBoardingMinutes} minutes.`,
        action: 'Prioritize bed assignment blockers for the longest waiting admitted patients.',
      })
    );
  }

  if (metrics.pendingBeds >= 5) {
    recommendations.push(
      Object.freeze({
        id: 'pending-bed-pressure',
        title: 'Resolve pending beds',
        priority: metrics.bedPressure,
        rationale: `${metrics.pendingBeds} inpatient beds are pending assignment.`,
        action: 'Review bed type demand, inpatient unit readiness, and discharge-dependent bed availability.',
      })
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      Object.freeze({
        id: 'boarding-watch',
        title: 'Maintain boarding watch',
        priority: metrics.bedPressure,
        rationale: 'Boarding pressure is currently controlled.',
        action: 'Continue monitoring admitted patients waiting for beds.',
      })
    );
  }

  return Object.freeze(recommendations);
}

export function getBoardingDashboard(state = DEFAULT_BOARDING_STATE) {
  const normalized = normalizeBoardingState(state);
  const metrics = getBoardingMetrics(normalized as any);

  return Object.freeze({
    score: getBoardingRiskScore(normalized as any),
    metrics,
    boarders: Object.freeze([...normalized.boarders].sort((a, b) => b.boardingMinutes - a.boardingMinutes)),
    longestBoarders: getLongestBoarders(normalized as any),
    recommendations: getBoardingRecommendations(normalized as any),
    safetyStatement:
      'Boarding Intelligence measures admitted-patient bed waits only. Bed assignment, transfer, and discharge decisions remain human-reviewed.',
  });
}

export const BoardingIntelligenceEngine = Object.freeze({
  getBoardingRiskScore,
  getBoardingMetrics,
  getLongestBoarders,
  getBoardingRecommendations,
  getBoardingDashboard,
});

export default BoardingIntelligenceEngine;
