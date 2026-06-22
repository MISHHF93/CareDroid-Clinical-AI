/**
 * Canonical throughput adapters for workspace pipeline — replaces disconnected
 * legacy dashboard services with PHI-safe aggregate summaries.
 */
import { summarizeTriageBreachBoard } from './triageBreachTimer';
import { summarizeLwbsRiskBoard } from './lwbsRiskLayer';
import { summarizeDeteriorationWatchBoard } from './waitingRoomDeteriorationWatch';
import { summarizeQueueReasonBoard } from './queueReasonVisibility';
import { buildEmsOffloadTrackerSummary } from './emsOffloadTracker';
import { buildWaitingPatientReassessmentTimers } from '../engine/reassessmentTimerEngine';

const EMPTY_PATIENTS = Object.freeze([]);

export function getCanonicalWaitingRoomThroughputDashboard(patients = EMPTY_PATIENTS) {
  const lwbs = summarizeLwbsRiskBoard(patients);
  const deterioration = summarizeDeteriorationWatchBoard(patients);
  const triageBreach = summarizeTriageBreachBoard(patients);

  return Object.freeze({
    id: 'waiting-room-throughput',
    label: 'Waiting room throughput',
    source: 'waitingRoomSafetyBoardModel',
    metrics: Object.freeze({
      lwbsElevated: lwbs.elevated + lwbs.high,
      deteriorationWatch: deterioration['review-needed'] + deterioration['urgent-review'],
      triageBreached: triageBreach.breachedCount,
      triageAtRisk: triageBreach.breachRiskCount,
    }),
    advisoryOnly: true,
  });
}

export function getCanonicalReassessmentThroughputDashboard(patients = EMPTY_PATIENTS) {
  const timers = buildWaitingPatientReassessmentTimers(patients);
  const overdue = timers.filter((timer) => timer.isOverdue).length;
  const dueSoon = timers.filter((timer) => timer.isDueSoon).length;

  return Object.freeze({
    id: 'reassessment-throughput',
    label: 'Reassessment control',
    source: 'reassessmentTimerEngine',
    metrics: Object.freeze({
      overdueTimers: overdue,
      dueSoonTimers: dueSoon,
      activeTimers: timers.length,
    }),
    advisoryOnly: true,
  });
}

export function getCanonicalEmsOffloadThroughputDashboard(
  emsArrivals = Object.freeze([]),
  patients = EMPTY_PATIENTS,
) {
  const summary = buildEmsOffloadTrackerSummary(emsArrivals, { patients });

  return Object.freeze({
    id: 'ems-offload-throughput',
    label: 'EMS offload throughput',
    source: 'emsOffloadTracker',
    metrics: Object.freeze({
      inboundCount: summary.inboundCount,
      awaitingHandoff: summary.awaitingOffloadCount,
      delayedOffloadCount: summary.delayedCount,
      longestOffloadMinutes: summary.longestOffloadMinutes,
    }),
    advisoryOnly: true,
  });
}

export function getCanonicalQueueReasonThroughputDashboard(patients = EMPTY_PATIENTS) {
  const counts = summarizeQueueReasonBoard(patients);
  const topReason = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])[0];

  return Object.freeze({
    id: 'queue-reason-throughput',
    label: 'Queue reason visibility',
    source: 'queueReasonVisibility',
    metrics: Object.freeze({
      dominantReason: topReason?.[0] || null,
      dominantCount: topReason?.[1] || 0,
      activeReasons: Object.values(counts).filter((count) => count > 0).length,
    }),
    advisoryOnly: true,
  });
}
