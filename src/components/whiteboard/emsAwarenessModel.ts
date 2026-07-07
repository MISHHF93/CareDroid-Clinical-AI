import {
  etaTone,
  formatEta,
  isInboundEmsArrival,
  minutesRemaining,
} from '../../utils/emsArrivalDisplay';
import { calculateEMSPressureScore } from '../EMSPressureScore';
import { buildEmsOffloadTrackerSummary } from '../../services/emsOffloadTracker';

/** Existing EMS surfaces in the product. */
export const EMS_WORKFLOW_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'ems-pipeline',
    label: 'EMS pipeline route',
    surfaces: ['EMSPipeline', 'App'],
    mechanism: 'emergencyEms route',
  }),
  Object.freeze({
    id: 'pre-arrival-panel',
    label: 'Reception pre-arrival panel',
    surfaces: ['EmsPreArrivalPanel'],
    mechanism: 'emsArrivalDisplay ETA + severity',
  }),
  Object.freeze({
    id: 'pressure-score',
    label: 'EMS pressure score',
    surfaces: ['EMSPressureScore', 'ChatInterface'],
    mechanism: 'calculateEMSPressureScore',
  }),
  Object.freeze({
    id: 'whiteboard-mission',
    label: 'Whiteboard mission EMS card',
    surfaces: ['emergency/index'],
    mechanism: 'prepareEMSBay + convertEMSArrivalToPatient',
  }),
  Object.freeze({
    id: 'charge-strip',
    label: 'Charge nurse EMS metric',
    surfaces: ['ChargeNurseOperationalStrip'],
    mechanism: 'filter-ems',
  }),
]);

const HIGH_RISK_SEVERITY = new Set(['Critical', 'High']);
const HIGH_RISK_PRIORITY = new Set(['P1', 'P2']);

function activeEmsArrivals(emsArrivals = [] as any[]) {
  return emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status));
}

function offloadStartTime(arrival, nowMs) {
  const arrivedAt = arrival.arrivedAt ? new Date(arrival.arrivedAt).getTime() : NaN;
  if (Number.isFinite(arrivedAt)) return arrivedAt;

  const estimated = new Date(arrival.estimatedArrivalTime || 0).getTime();
  if (Number.isFinite(estimated) && estimated <= nowMs) return estimated;
  return null;
}

export function getArrivalOffloadMinutes(arrival, now = Date.now()) {
  if (!arrival || arrival.patientId) return null;
  const startedAt = offloadStartTime(arrival, now);
  if (startedAt === null) return null;
  return Math.max(0, Math.round((now - startedAt) / 60000));
}

export function isHighRiskEmsArrival(arrival) {
  if (!arrival) return false;
  return (
    HIGH_RISK_SEVERITY.has(String(arrival.severity)) ||
    HIGH_RISK_PRIORITY.has(String(arrival.priority))
  );
}

export function summarizeEmsAwareness(emsArrivals = [] as any[], now = Date.now(), context: any = {}) {
  const active = activeEmsArrivals(emsArrivals);
  const inbound = active
    .filter((arrival) => isInboundEmsArrival(arrival, now))
    .sort((left, right) => minutesRemaining(left, now) - minutesRemaining(right, now));
  const soonest = inbound[0] || null;
  const soonestMinutes = soonest ? minutesRemaining(soonest, now) : null;
  const pressure = calculateEMSPressureScore(emsArrivals, new Date(now));
  const offloadTracker = buildEmsOffloadTrackerSummary(emsArrivals, {
    patients: context.patients || [],
    staff: context.staff || [],
    rooms: context.rooms || [],
    now,
    offloadTargetMinutes: context.offloadTargetMinutes,
  });
  const riskArrivals = active.filter(isHighRiskEmsArrival);
  const awaitingOffload = active.filter((arrival) => getArrivalOffloadMinutes(arrival, now) !== null);

  return Object.freeze({
    activeCount: active.length,
    inboundCount: inbound.length,
    soonestArrival: soonest,
    soonestEtaMinutes: soonestMinutes,
    soonestEtaLabel: soonest
      ? formatEta(soonestMinutes ?? 0, soonest.status)
      : null,
    soonestEtaTone: soonest ? etaTone(soonestMinutes ?? 0, soonest.status) : 'stable',
    riskCount: riskArrivals.length,
    riskArrivals: Object.freeze([...riskArrivals]),
    inboundArrivals: Object.freeze([...inbound]),
    awaitingHandoff: offloadTracker.awaitingOffloadCount || pressure.awaitingHandoff,
    offloadMinutes: offloadTracker.averageOffloadMinutes || pressure.averageOffloadMinutes,
    longestOffloadMinutes: offloadTracker.longestOffloadMinutes,
    delayedOffloadCount: offloadTracker.delayedCount,
    offloadRows: Object.freeze([...offloadTracker.rows]),
    awaitingOffload: Object.freeze([...awaitingOffload]),
    pressureScore: pressure.score,
    pressureBand: pressure.band.id,
    totalSignals: active.length + (offloadTracker.awaitingOffloadCount || pressure.awaitingHandoff),
  });
}

export function shouldShowEmsAttentionStrip({ displayMode = false, summary = (undefined as any) }: any = {}) {
  if (displayMode || !summary) return false;
  return (
    summary.inboundCount > 0 ||
    summary.riskCount > 0 ||
    summary.awaitingHandoff > 0 ||
    summary.offloadMinutes > 0
  );
}

export function buildEmsAttentionStripMetrics(summary) {
  if (!summary) return [];

  const metrics = [] as any[];

  if (summary.inboundCount > 0 || summary.soonestEtaLabel) {
    metrics.push(
      Object.freeze({
        id: 'ems-eta',
        label: summary.inboundCount > 1 ? 'Inbound ETA' : 'Next ETA',
        hint: summary.soonestEtaLabel
          ? `Soonest arrival: ${summary.soonestEtaLabel}`
          : 'Inbound ambulance ETA',
        value:
          summary.inboundCount > 1
            ? summary.soonestEtaLabel || `${summary.inboundCount} units`
            : summary.soonestEtaLabel || '—',
        surface: 'ems',
        tone:
          summary.soonestEtaMinutes !== null && summary.soonestEtaMinutes <= 10
            ? 'critical'
            : summary.soonestEtaMinutes !== null && summary.soonestEtaMinutes <= 20
              ? 'warning'
              : 'info',
        whiteboardAction: 'filter-ems',
      }),
    );
  }

  if (summary.riskCount > 0) {
    metrics.push(
      Object.freeze({
        id: 'ems-risk',
        label: 'High risk',
        hint: 'Critical severity or P1/P2 inbound EMS',
        value: summary.riskCount,
        surface: 'ems',
        tone: 'critical',
        whiteboardAction: 'filter-ems-risk',
      }),
    );
  }

  if (summary.awaitingHandoff > 0 || summary.offloadMinutes > 0 || summary.delayedOffloadCount > 0) {
    metrics.push(
      Object.freeze({
        id: 'ems-offload',
        label: 'Offload',
        hint: `${summary.awaitingHandoff} unit${summary.awaitingHandoff === 1 ? '' : 's'} awaiting handoff`,
        value:
          summary.offloadMinutes > 0
            ? `${summary.offloadMinutes}m`
            : summary.awaitingHandoff,
        surface: 'ems',
        tone:
          summary.delayedOffloadCount > 0 || summary.offloadMinutes >= 15
            ? 'critical'
            : summary.offloadMinutes >= 10
              ? 'warning'
              : 'info',
        whiteboardAction: 'focus-ems-offload',
      }),
    );
  }

  return metrics;
}
