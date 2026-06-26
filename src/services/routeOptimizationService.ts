/**
 * Route Optimization — deterministic sort engine (Tier A).
 * Future: pass `options.engine === 'graph'` and `options.graphProvider` for backend optimizer.
 */

export const ROUTE_ENGINE_SORT = 'sort';
export const ROUTE_ENGINE_GRAPH = 'graph';

export const PRIORITY_WEIGHT = Object.freeze({
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
});

export const TRAFFIC_MULTIPLIERS = Object.freeze({
  low: 1,
  moderate: 1.25,
  heavy: 1.6,
});

const DEFAULT_AVG_SPEED_KMH = 40;
const DEFAULT_LEG_DISTANCE_KM = 5;
/** Default depot departure when comparing HH:MM delivery windows (08:00). */
const DEFAULT_ROUTE_START_MINUTES = 8 * 60;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function parsePriority(value) {
  const key = String(value || 'medium').toLowerCase();
  return PRIORITY_WEIGHT[key] != null ? key : 'medium';
}

function parseWindowMinutes(value) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return clamp(value, 0, 24 * 60);

  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? clamp(asNumber, 0, 24 * 60) : null;
}

function compareDestinations(a, b) {
  const priorityDelta = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (priorityDelta !== 0) return priorityDelta;

  const windowA = a.windowStartMinutes ?? Number.MAX_SAFE_INTEGER;
  const windowB = b.windowStartMinutes ?? Number.MAX_SAFE_INTEGER;
  if (windowA !== windowB) return windowA - windowB;

  const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
  const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
  if (distanceA !== distanceB) return distanceA - distanceB;

  return a.label.localeCompare(b.label);
}

export function normalizeRouteOptimizationInput(input: any = {}) {
  const destinations = (input.destinations || []).map((dest, index) => ({
    id: dest.id || `stop-${index + 1}`,
    label: String(dest.label || '').trim(),
    priority: parsePriority(dest.priority),
    distanceKm:
      dest.distanceKm === '' || dest.distanceKm == null
        ? null
        : toNonNegativeNumber(dest.distanceKm, null as any),
    serviceMinutes: toNonNegativeNumber(dest.serviceMinutes, 15),
    windowStartMinutes: parseWindowMinutes(dest.windowStart ?? dest.windowStartMinutes),
    windowEndMinutes: parseWindowMinutes(dest.windowEnd ?? dest.windowEndMinutes),
  }));

  const trafficLevel = String(input.trafficConstraints?.level || 'moderate').toLowerCase();
  const trafficMultiplier =
    TRAFFIC_MULTIPLIERS[trafficLevel] ?? TRAFFIC_MULTIPLIERS.moderate;

  const labeledDestinations = destinations.filter((dest) => dest.label.length > 0);

  const routeStartMinutes =
    parseWindowMinutes(input.routeStart ?? input.routeStartMinutes) ??
    DEFAULT_ROUTE_START_MINUTES;

  return {
    depotLabel: String(input.depotLabel || 'Depot').trim() || 'Depot',
    routeStartMinutes,
    destinations: labeledDestinations,
    trafficConstraints: {
      level: TRAFFIC_MULTIPLIERS[trafficLevel] != null ? trafficLevel : 'moderate',
      multiplier: trafficMultiplier,
    },
    vehicleLimitations: {
      maxStops: toNonNegativeNumber(input.vehicleLimitations?.maxStops, 12) || 12,
      maxDistanceKm: toNonNegativeNumber(input.vehicleLimitations?.maxDistanceKm, 500) || 500,
      maxWeightKg: toNonNegativeNumber(input.vehicleLimitations?.maxWeightKg, 0),
    },
  };
}

export function hasMinimumRouteInput(normalized) {
  return normalized.destinations.some((dest) => dest.label.length > 0);
}

function legDistanceKm(destination, index) {
  if (destination.distanceKm != null) return destination.distanceKm;
  return index === 0 ? DEFAULT_LEG_DISTANCE_KM : DEFAULT_LEG_DISTANCE_KM;
}

function estimateLegMinutes(distanceKm, trafficMultiplier) {
  const hours = distanceKm / DEFAULT_AVG_SPEED_KMH;
  return Math.round(hours * 60 * trafficMultiplier);
}

function buildSequence(
  destinations,
  trafficMultiplier,
  { enforceLimits, vehicleLimitations, routeStartMinutes = DEFAULT_ROUTE_START_MINUTES },
) {
  const warnings = [] as any[];
  let cumulativeMinutes = 0;
  let totalDistanceKm = 0;
  const sequence = [] as any[];

  const limit = enforceLimits ? vehicleLimitations.maxStops : destinations.length;
  const selected = destinations.slice(0, limit);

  if (enforceLimits && destinations.length > limit) {
    warnings.push(
      `Vehicle max stops (${vehicleLimitations.maxStops}) exceeded — ${destinations.length - limit} stop(s) deferred.`
    );
  }

  selected.forEach((destination, index) => {
    const distanceKm = legDistanceKm(destination, index);
    const travelMinutes = estimateLegMinutes(distanceKm, trafficMultiplier);
    const arrivalClockMinutes = routeStartMinutes + cumulativeMinutes + travelMinutes;
    totalDistanceKm += distanceKm;

    let windowStatus = 'ok';
    if (
      destination.windowEndMinutes != null &&
      arrivalClockMinutes > destination.windowEndMinutes
    ) {
      windowStatus = 'late';
      warnings.push(`Stop "${destination.label}" may miss its time window.`);
    } else if (
      destination.windowStartMinutes != null &&
      arrivalClockMinutes < destination.windowStartMinutes
    ) {
      windowStatus = 'early';
    }

    cumulativeMinutes += travelMinutes + destination.serviceMinutes;

    sequence.push({
      stopNumber: index + 1,
      destination,
      legDistanceKm: Math.round(distanceKm * 10) / 10,
      travelMinutes,
      serviceMinutes: destination.serviceMinutes,
      cumulativeMinutes,
      arrivalClockMinutes,
      windowStatus,
    });
  });

  if (enforceLimits && totalDistanceKm > vehicleLimitations.maxDistanceKm) {
    warnings.push(
      `Estimated distance (${Math.round(totalDistanceKm)} km) exceeds vehicle range (${vehicleLimitations.maxDistanceKm} km).`
    );
  }

  return {
    sequence,
    totalMinutes: cumulativeMinutes,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    warnings,
  };
}

export function optimizeRouteBySort(normalized) {
  const sorted = [...normalized.destinations].sort(compareDestinations);
  const trafficMultiplier = normalized.trafficConstraints.multiplier;

  const sequenceOpts = {
    routeStartMinutes: normalized.routeStartMinutes,
    vehicleLimitations: normalized.vehicleLimitations,
  };

  const baseline = buildSequence(normalized.destinations, trafficMultiplier, {
    ...sequenceOpts,
    enforceLimits: false,
  });

  const optimized = buildSequence(sorted, trafficMultiplier, {
    ...sequenceOpts,
    enforceLimits: true,
  });

  const minutesSaved = Math.max(0, baseline.totalMinutes - optimized.totalMinutes);
  const distanceKmSaved = Math.max(
    0,
    Math.round((baseline.totalDistanceKm - optimized.totalDistanceKm) * 10) / 10
  );

  const percentImprovement =
    baseline.totalMinutes > 0
      ? Math.round((minutesSaved / baseline.totalMinutes) * 1000) / 10
      : 0;

  return {
    engine: ROUTE_ENGINE_SORT,
    depotLabel: normalized.depotLabel,
    baselineSequence: baseline.sequence,
    optimizedSequence: optimized.sequence,
    travelEstimates: {
      baselineMinutes: baseline.totalMinutes,
      optimizedMinutes: optimized.totalMinutes,
      baselineDistanceKm: baseline.totalDistanceKm,
      optimizedDistanceKm: optimized.totalDistanceKm,
      trafficLevel: normalized.trafficConstraints.level,
      avgSpeedKmh: DEFAULT_AVG_SPEED_KMH,
    },
    routeSavings: {
      minutesSaved,
      distanceKmSaved,
      percentImprovement,
    },
    warnings: [...new Set([...baseline.warnings, ...optimized.warnings])],
    optimizedAt: new Date().toISOString(),
  };
}

/**
 * @param {object} input
 * @param {{ engine?: string, graphProvider?: (normalized: object) => object }} [options]
 */
export function optimizeRoute(input, options: any = {}) {
  const normalized = normalizeRouteOptimizationInput(input);
  const engine = options.engine ?? ROUTE_ENGINE_SORT;

  if (engine === ROUTE_ENGINE_GRAPH) {
    if (typeof options.graphProvider === 'function') {
      return options.graphProvider(normalized);
    }
    return {
      ...optimizeRouteBySort(normalized),
      engine: ROUTE_ENGINE_GRAPH,
      graphPending: true,
      note: 'Graph engine requested but no provider configured; showing sort-based route.',
    };
  }

  return optimizeRouteBySort(normalized);
}
