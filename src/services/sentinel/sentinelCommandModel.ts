/**
 * View-model helpers for Hospital Command Center + EMS surfaces.
 */

import type { HospitalCommandMetricId } from '../../config/hospitalCommandCenterRolePolicy';
import type { SentinelCommandSnapshot, SentinelUnitView } from '../../types/sentinel';
import type { HospitalCommandMetric, HospitalCommandTone } from '../hospitalCommandCenterModel';

function toneFromFreshness(freshness: string): HospitalCommandTone {
  if (freshness === 'offline') return 'critical';
  if (freshness === 'stale') return 'warning';
  return 'stable';
}

export function formatEtaRange(unit: SentinelUnitView): string {
  if (!unit.eta) return 'ETA n/a';
  const { etaLowMin, etaHighMin, etaPointMin, confidence, stale } = unit.eta;
  const confPct = Math.round(confidence * 100);
  const staleMark = stale ? ' (stale)' : '';
  return `${etaLowMin}–${etaHighMin} min (pt ${etaPointMin}, ${confPct}% conf)${staleMark}`;
}

/**
 * Map Sentinel snapshot into existing Hospital Command metric ids so role policy
 * and filtering continue to work without a parallel product surface.
 */
export function buildSentinelCommandMetrics(
  snapshot: SentinelCommandSnapshot | null | undefined,
): readonly HospitalCommandMetric[] {
  if (!snapshot) {
    return Object.freeze([
      Object.freeze({
        id: 'ems-arrivals' as HospitalCommandMetricId,
        label: 'EMS units',
        value: '—',
        detail: 'Sentinel snapshot unavailable',
        tone: 'watch' as HospitalCommandTone,
      }),
    ]);
  }

  const transporting = snapshot.units.filter((u) =>
    ['transporting', 'en_route_scene', 'at_hospital', 'handoff'].includes(u.status),
  ).length;
  const stale = snapshot.units.filter((u) => u.freshness !== 'fresh').length;
  const openCritical = snapshot.openAlarms.filter(
    (a) => String((a as { severity?: string }).severity || '') === 'critical',
  ).length;
  const pendingAi = snapshot.aiRecommendations.length;
  const inbound = snapshot.inboundPatients.length;

  const nearest = [...snapshot.units]
    .filter((u) => u.eta)
    .sort((a, b) => (a.eta!.etaPointMin || 999) - (b.eta!.etaPointMin || 999))[0];

  return Object.freeze([
    Object.freeze({
      id: 'ems-arrivals' as HospitalCommandMetricId,
      label: 'Inbound EMS',
      value: inbound,
      detail: `${transporting} units in motion · ${snapshot.units.length} tracked`,
      tone: (inbound > 0 ? 'warning' : 'stable') as HospitalCommandTone,
    }),
    Object.freeze({
      id: 'ambulance-eta' as HospitalCommandMetricId,
      label: 'Nearest ETA range',
      value: nearest ? `${nearest.eta!.etaLowMin}–${nearest.eta!.etaHighMin}m` : '—',
      detail: nearest
        ? `${nearest.label} · ${Math.round(nearest.eta!.confidence * 100)}% conf`
        : 'No active ETA',
      tone: nearest?.eta?.stale ? ('watch' as HospitalCommandTone) : ('stable' as HospitalCommandTone),
    }),
    Object.freeze({
      id: 'unresolved-alerts' as HospitalCommandMetricId,
      label: 'Sentinel alarms',
      value: snapshot.openAlarms.length,
      detail: openCritical > 0 ? `${openCritical} critical` : 'No critical open',
      tone: (openCritical > 0
        ? 'critical'
        : snapshot.openAlarms.length > 0
          ? 'warning'
          : 'stable') as HospitalCommandTone,
    }),
    Object.freeze({
      id: 'ai-recommendations' as HospitalCommandMetricId,
      label: 'AI pending review',
      value: pendingAi,
      detail: 'Human review required — not autonomous',
      tone: (pendingAi > 0 ? 'watch' : 'stable') as HospitalCommandTone,
    }),
    Object.freeze({
      id: 'service-bottlenecks' as HospitalCommandMetricId,
      label: 'Stale / offline units',
      value: stale,
      detail: `${snapshot.units.length} units tracked`,
      tone: toneFromFreshness(stale > 0 ? 'stale' : 'fresh'),
    }),
  ]);
}

export function buildSentinelLiveRegionText(snapshot: SentinelCommandSnapshot | null): string {
  if (!snapshot) return 'Sentinel data unavailable.';
  const parts = [
    `${snapshot.inboundPatients.length} inbound patients`,
    `${snapshot.units.length} units tracked`,
    `${snapshot.openAlarms.length} open alarms`,
    `${snapshot.aiRecommendations.length} AI recommendations awaiting human review`,
  ];
  return `Sentinel command update: ${parts.join('; ')}.`;
}
