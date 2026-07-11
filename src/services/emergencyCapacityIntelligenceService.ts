export const CAPACITY_RISK_LEVELS = Object.freeze({
  GREEN: 'Green',
  YELLOW: 'Yellow',
  ORANGE: 'Orange',
  RED: 'Red',
});

export const CAPACITY_ENGINE_INPUTS = Object.freeze([
  'occupancy',
  'boarding',
  'pending admissions',
  'discharge candidates',
  'EMS arrivals',
]);

export interface EmergencyCapacityStateInput {
  currentCensus: number;
  occupiedSpaces: number;
  availableSpaces: number;
  pendingAdmissions: number;
  boardingPatients: number;
  emsArrivals: number;
  dischargeCandidates: number;
}

export const DEFAULT_EMERGENCY_CAPACITY_STATE: EmergencyCapacityStateInput = Object.freeze({
  currentCensus: 67,
  occupiedSpaces: 58,
  availableSpaces: 7,
  pendingAdmissions: 11,
  boardingPatients: 8,
  emsArrivals: 4,
  dischargeCandidates: 9,
});

export const CAPACITY_SIGNAL_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'currentCensus',
    label: 'Current census',
    helper: 'Patients currently inside the ED operating model.',
  }),
  Object.freeze({
    id: 'occupiedSpaces',
    label: 'Occupied spaces',
    helper: 'Treatment, hallway, observation, and boarding spaces in use.',
  }),
  Object.freeze({
    id: 'availableSpaces',
    label: 'Available spaces',
    helper: 'Ready capacity for incoming or waiting patients.',
  }),
  Object.freeze({
    id: 'pendingAdmissions',
    label: 'Pending admissions',
    helper: 'Patients waiting for inpatient handoff or beds.',
  }),
  Object.freeze({
    id: 'boardingPatients',
    label: 'Boarding patients',
    helper: 'Admitted patients still consuming ED space.',
  }),
  Object.freeze({
    id: 'emsArrivals',
    label: 'EMS arrivals',
    helper: 'Inbound EMS patients expected soon.',
  }),
  Object.freeze({
    id: 'dischargeCandidates',
    label: 'Discharge candidates',
    helper: 'Patients likely to release capacity after review.',
  }),
]);

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeCapacityState(state: any = DEFAULT_EMERGENCY_CAPACITY_STATE): any {
  return Object.freeze({
    currentCensus: Number(state.currentCensus || 0),
    occupiedSpaces: Number(state.occupiedSpaces || 0),
    availableSpaces: Number(state.availableSpaces || 0),
    pendingAdmissions: Number(state.pendingAdmissions || 0),
    boardingPatients: Number(state.boardingPatients || 0),
    emsArrivals: Number(state.emsArrivals || 0),
    dischargeCandidates: Number(state.dischargeCandidates || 0),
  });
}

function calculateOccupancyPercent(state) {
  const totalSpaces = state.occupiedSpaces + state.availableSpaces;
  if (!totalSpaces) return 0;
  return Math.round((state.occupiedSpaces / totalSpaces) * 100);
}

export function getCapacityScore(capacityState = DEFAULT_EMERGENCY_CAPACITY_STATE) {
  const state = normalizeCapacityState(capacityState);
  const occupancyPercent = calculateOccupancyPercent(state);
  const admissionPressure = state.pendingAdmissions * 2.2;
  const boardingPressure = state.boardingPatients * 2.8;
  const emsPressure = state.emsArrivals * 3;
  const censusPressure = Math.max(0, state.currentCensus - state.occupiedSpaces) * 1.2;
  const dischargeRelief = state.dischargeCandidates * 1.5;

  return clampScore(occupancyPercent * 0.55 + admissionPressure + boardingPressure + emsPressure + censusPressure - dischargeRelief);
}

export function getCapacityRiskLevel(scoreOrState: any = DEFAULT_EMERGENCY_CAPACITY_STATE) {
  const score = typeof scoreOrState === 'number' ? scoreOrState : getCapacityScore(scoreOrState);
  if (score >= 85) return CAPACITY_RISK_LEVELS.RED;
  if (score >= 70) return CAPACITY_RISK_LEVELS.ORANGE;
  if (score >= 45) return CAPACITY_RISK_LEVELS.YELLOW;
  return CAPACITY_RISK_LEVELS.GREEN;
}

export function getCapacitySignals(capacityState = DEFAULT_EMERGENCY_CAPACITY_STATE) {
  const state = normalizeCapacityState(capacityState);
  return Object.freeze(
    CAPACITY_SIGNAL_DEFINITIONS.map((definition) =>
      Object.freeze({
        ...definition,
        value: state[definition.id],
      })
    )
  );
}

export function getCapacityRecommendations(capacityState = DEFAULT_EMERGENCY_CAPACITY_STATE) {
  const state = normalizeCapacityState(capacityState);
  const score = getCapacityScore(state);
  const riskLevel = getCapacityRiskLevel(score);
  const occupancyPercent = calculateOccupancyPercent(state);
  const recommendations = [] as any[];

  if (occupancyPercent >= 85 || state.availableSpaces <= 5) {
    recommendations.push(
      Object.freeze({
        id: 'overloaded-queues',
        title: 'Review overloaded queues',
        category: 'overloaded queues',
        priority: riskLevel,
        rationale: `${occupancyPercent}% occupancy with ${state.availableSpaces} available spaces indicates constrained ED throughput.`,
        action: 'Review waiting, triage, admission, discharge, and EMS queues for immediate human-owned decompression steps.',
      })
    );
  }

  if (state.boardingPatients >= 5) {
    recommendations.push(
      Object.freeze({
        id: 'boarding-relief',
        title: 'Escalate boarding relief',
        category: 'bottlenecks',
        priority: riskLevel,
        rationale: `${state.boardingPatients} boarding patients are consuming ED capacity.`,
        action: 'Coordinate inpatient bed placement, charge nurse review, and operations escalation.',
      })
    );
  }

  if (state.pendingAdmissions >= 8) {
    recommendations.push(
      Object.freeze({
        id: 'admission-handoff',
        title: 'Prioritize admission handoffs',
        category: 'bottlenecks',
        priority: riskLevel,
        rationale: `${state.pendingAdmissions} pending admissions are delaying capacity recovery.`,
        action: 'Review admission queue blockers and prepare handoff summaries for receiving units.',
      })
    );
  }

  if (state.emsArrivals >= 3) {
    recommendations.push(
      Object.freeze({
        id: 'ems-arrival-readiness',
        title: 'Prepare for EMS arrivals',
        category: 'bottlenecks',
        priority: riskLevel,
        rationale: `${state.emsArrivals} EMS arrivals may increase near-term demand.`,
        action: 'Review pre-arrival handoffs, open treatment spaces, and alert triage leadership.',
      })
    );
  }

  if (state.dischargeCandidates >= 4) {
    recommendations.push(
      Object.freeze({
        id: 'discharge-acceleration',
        title: 'Accelerate discharge candidates',
        category: 'discharge opportunities',
        priority: 'Yellow',
        rationale: `${state.dischargeCandidates} discharge candidates can release capacity after review.`,
        action: 'Prioritize discharge summaries, follow-up instructions, and final clinician review.',
      })
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      Object.freeze({
        id: 'capacity-watch',
        title: 'Maintain capacity watch',
        category: 'bottlenecks',
        priority: riskLevel,
        rationale: 'Capacity posture is stable.',
        action: 'Continue monitoring census, spaces, admissions, EMS arrivals, and discharge candidates.',
      })
    );
  }

  return Object.freeze(recommendations);
}

export function getCapacityDashboard(capacityState = DEFAULT_EMERGENCY_CAPACITY_STATE) {
  const state = normalizeCapacityState(capacityState);
  const score = getCapacityScore(state);
  const riskLevel = getCapacityRiskLevel(score);
  const occupancyPercent = calculateOccupancyPercent(state);
  const recommendations = getCapacityRecommendations(state);

  return Object.freeze({
    engineId: 'capacity-engine',
    title: 'Capacity Engine',
    inputSchema: CAPACITY_ENGINE_INPUTS,
    output: 'Capacity Score',
    score,
    riskLevel,
    occupancyPercent,
    state,
    signals: getCapacitySignals(state),
    recommendations,
    recommendationCategories: Object.freeze({
      dischargeOpportunities: Object.freeze(recommendations.filter((item) => item.category === 'discharge opportunities')),
      bottlenecks: Object.freeze(recommendations.filter((item) => item.category === 'bottlenecks')),
      overloadedQueues: Object.freeze(recommendations.filter((item) => item.category === 'overloaded queues')),
    }),
    summary:
      `${riskLevel} capacity posture with ${state.currentCensus} current census, ` +
      `${state.boardingPatients} boarding patients, ${state.pendingAdmissions} pending admissions, ` +
      `${state.emsArrivals} EMS arrivals, and ${state.dischargeCandidates} discharge candidates.`,
  });
}

export const EmergencyCapacityIntelligenceService = Object.freeze({
  getCapacityScore,
  getCapacityRiskLevel,
  getCapacitySignals,
  getCapacityRecommendations,
  getCapacityDashboard,
});

export default EmergencyCapacityIntelligenceService;
