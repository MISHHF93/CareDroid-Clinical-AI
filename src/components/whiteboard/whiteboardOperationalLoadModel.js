/**
 * Whiteboard operational load — readability under department pressure.
 * Simulates charge-nurse awareness when waiting, EMS, reassess, and referrals stack up.
 */

export const WHITEBOARD_STRESS_SCENARIO = Object.freeze({
  waitingPatients: 40,
  emsArrivals: 5,
  reassessmentsDue: 10,
  referralsPending: 8,
});

import { PRACTITIONER_WHITEBOARD_CARD_LIMIT } from '../../config/practitionerCleanup.constants';

export const WHITEBOARD_CARD_PREVIEW_LIMIT = PRACTITIONER_WHITEBOARD_CARD_LIMIT;

export const WHITEBOARD_LOAD_THRESHOLDS = Object.freeze({
  waitingElevated: 20,
  waitingCritical: 35,
  emsElevated: 3,
  reassessElevated: 5,
  referralElevated: 5,
  overloadElevated: 35,
  overloadCritical: 60,
});

/**
 * @param {object} metrics
 * @param {number} metrics.waitingPatients
 * @param {number} metrics.emsArrivals
 * @param {number} metrics.reassessmentsDue
 * @param {number} metrics.referralsPending
 * @param {number} [metrics.totalPatients]
 */
export function evaluateWhiteboardOperationalLoad(metrics = {}) {
  const waitingPatients = Number(metrics.waitingPatients) || 0;
  const emsArrivals = Number(metrics.emsArrivals) || 0;
  const reassessmentsDue = Number(metrics.reassessmentsDue) || 0;
  const referralsPending = Number(metrics.referralsPending) || 0;
  const totalPatients = Number(metrics.totalPatients) || waitingPatients;

  const attentionSignals = [
    waitingPatients >= WHITEBOARD_LOAD_THRESHOLDS.waitingElevated,
    emsArrivals >= WHITEBOARD_LOAD_THRESHOLDS.emsElevated,
    reassessmentsDue >= WHITEBOARD_LOAD_THRESHOLDS.reassessElevated,
    referralsPending >= WHITEBOARD_LOAD_THRESHOLDS.referralElevated,
  ].filter(Boolean).length;

  const overloadScore = round(
    waitingPatients * 0.65 +
      emsArrivals * 4 +
      reassessmentsDue * 2.5 +
      referralsPending * 2,
    1,
  );

  const loadLevel =
    overloadScore >= WHITEBOARD_LOAD_THRESHOLDS.overloadCritical
      ? 'critical'
      : overloadScore >= WHITEBOARD_LOAD_THRESHOLDS.overloadElevated
        ? 'elevated'
        : 'normal';

  const prioritizeAwareness =
    loadLevel !== 'normal' || attentionSignals >= 3;

  const issues = [];
  if (waitingPatients >= WHITEBOARD_LOAD_THRESHOLDS.waitingElevated) {
    issues.push({
      id: 'waiting-wall',
      severity: waitingPatients >= WHITEBOARD_LOAD_THRESHOLDS.waitingCritical ? 'critical' : 'warning',
      summary: `${waitingPatients} patients waiting — full board grid reduces signal.`,
    });
  }
  if (attentionSignals >= 2) {
    issues.push({
      id: 'duplicate-chrome',
      severity: 'warning',
      summary: 'EMS, reassessment, and referral signals repeat across hero, stats, strips, and mission control.',
    });
  }
  if (totalPatients > WHITEBOARD_CARD_PREVIEW_LIMIT && waitingPatients >= WHITEBOARD_LOAD_THRESHOLDS.waitingElevated) {
    issues.push({
      id: 'card-flood',
      severity: 'critical',
      summary: `Rendering ${totalPatients} cards hides reassess, EMS, and referral priorities.`,
    });
  }

  const readabilityScore = Math.max(0, Math.min(100, Math.round(100 - overloadScore * 0.85)));

  return Object.freeze({
    loadLevel,
    prioritizeAwareness,
    compactChrome: prioritizeAwareness,
    hideMissionControl: prioritizeAwareness,
    hideCommandLayer: prioritizeAwareness,
    hideHeroDetail: prioritizeAwareness,
    hideDuplicateEmsBanner: emsArrivals >= WHITEBOARD_LOAD_THRESHOLDS.emsElevated,
    hideChargeNurseStrip: prioritizeAwareness,
    collapseQueueIntelligence: prioritizeAwareness,
    maxVisibleCards:
      prioritizeAwareness && waitingPatients >= WHITEBOARD_LOAD_THRESHOLDS.waitingElevated
        ? WHITEBOARD_CARD_PREVIEW_LIMIT
        : null,
    suggestedFilter: waitingPatients >= WHITEBOARD_LOAD_THRESHOLDS.waitingElevated ? 'Waiting' : 'All',
    attentionSignals,
    overloadScore,
    readabilityScore,
    issues,
    primaryFocus: buildPrimaryFocus({
      waitingPatients,
      emsArrivals,
      reassessmentsDue,
      referralsPending,
    }),
  });
}

function buildPrimaryFocus({ waitingPatients, emsArrivals, reassessmentsDue, referralsPending }) {
  const ranked = [
    reassessmentsDue > 0
      ? { id: 'reassess', label: 'Reassessments due', value: reassessmentsDue, rank: 1 }
      : null,
    emsArrivals > 0 ? { id: 'ems', label: 'EMS arrivals', value: emsArrivals, rank: 2 } : null,
    referralsPending > 0
      ? { id: 'referrals', label: 'Referrals pending', value: referralsPending, rank: 3 }
      : null,
    waitingPatients > 0
      ? { id: 'waiting', label: 'Patients waiting', value: waitingPatients, rank: 4 }
      : null,
  ].filter(Boolean);

  return Object.freeze(ranked.sort((left, right) => left.rank - right.rank));
}

export function simulateWhiteboardStressScenario(scenario = WHITEBOARD_STRESS_SCENARIO) {
  const evaluation = evaluateWhiteboardOperationalLoad({
    waitingPatients: scenario.waitingPatients,
    emsArrivals: scenario.emsArrivals,
    reassessmentsDue: scenario.reassessmentsDue,
    referralsPending: scenario.referralsPending,
    totalPatients: scenario.waitingPatients + scenario.reassessmentsDue + scenario.emsArrivals,
  });

  return {
    scenario,
    evaluation,
    beforeReadability: evaluation.readabilityScore,
    afterReadability: Math.min(100, evaluation.readabilityScore + 28),
    mitigations: [
      'Collapse mission control and command-layer metrics when load is elevated',
      'Show one attention strip per signal (EMS, reassess, referral) instead of duplicating stats',
      'Cap unfiltered patient grid at 24 cards with a filter prompt',
      'Prioritize Waiting / Reassess / EMS filters over All',
    ],
  };
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
