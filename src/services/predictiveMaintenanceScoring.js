/**
 * Predictive Maintenance — deterministic rule-based scoring (Tier A).
 * Tier C: pass `options.engine === 'ai'` and `options.aiProvider` when ML is available.
 */

export const SCORING_ENGINE_RULES = 'rules';
export const SCORING_ENGINE_AI = 'ai';

export const RISK_BAND_ORDER = Object.freeze(['low', 'moderate', 'high', 'critical']);

export const RISK_BAND_LABELS = Object.freeze({
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk',
  critical: 'Critical risk',
});

const DEFAULT_TELEMETRY = Object.freeze({
  engineTempSpikes: 0,
  harshBrakingEvents: 0,
  idleHoursPerWeek: 0,
  faultCodesLast30Days: 0,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function toOptionalNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseDiagnosticCodes(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[\n,;]+/)
    .map((segment) => segment.trim().toUpperCase())
    .filter(Boolean);
}

export function isCriticalDiagnosticCode(code) {
  if (!code) return false;
  return (
    /^P0\d{2}/.test(code) ||
    /^B0\d{2}/.test(code) ||
    /^C0\d{2}/.test(code) ||
    /(CRITICAL|SEVERE|IMMEDIATE)/.test(code)
  );
}

export function resolveRiskBand(score) {
  const s = clamp(score, 0, 100);
  if (s >= 75) return 'critical';
  if (s >= 50) return 'high';
  if (s >= 25) return 'moderate';
  return 'low';
}

export function normalizePredictiveMaintenanceInput(input = {}) {
  const telemetry = { ...DEFAULT_TELEMETRY, ...(input.telemetry || {}) };

  return {
    vehicleAgeYears: toOptionalNumber(input.vehicleAgeYears),
    mileage: toOptionalNumber(input.mileage),
    monthsSinceLastService: toOptionalNumber(input.monthsSinceLastService),
    servicesLast12Months:
      input.servicesLast12Months === '' || input.servicesLast12Months == null
        ? null
        : toNonNegativeInt(input.servicesLast12Months, 0),
    diagnosticCodes: parseDiagnosticCodes(input.diagnosticCodes),
    batteryHealthPercent: toOptionalNumber(input.batteryHealthPercent),
    telemetry: {
      engineTempSpikes: toNonNegativeInt(telemetry.engineTempSpikes),
      harshBrakingEvents: toNonNegativeInt(telemetry.harshBrakingEvents),
      idleHoursPerWeek: toNonNegativeInt(telemetry.idleHoursPerWeek),
      faultCodesLast30Days: toNonNegativeInt(telemetry.faultCodesLast30Days),
    },
  };
}

function buildInspectionWindows(riskBand, normalized) {
  const templates = {
    critical: [
      { daysFromNow: 0, priority: 'urgent', reason: 'Critical maintenance risk — schedule immediate inspection' },
      { daysFromNow: 3, priority: 'high', reason: 'Follow-up systems check after urgent service' },
      { daysFromNow: 14, priority: 'medium', reason: 'Verify corrective actions and clear diagnostic codes' },
    ],
    high: [
      { daysFromNow: 7, priority: 'high', reason: 'Elevated wear and fault indicators' },
      { daysFromNow: 21, priority: 'medium', reason: 'Mid-cycle component review' },
      { daysFromNow: 45, priority: 'medium', reason: 'Confirm telemetry trends normalized' },
    ],
    moderate: [
      { daysFromNow: 30, priority: 'medium', reason: 'Routine preventive inspection window' },
      { daysFromNow: 60, priority: 'low', reason: 'Fluid, brake, and battery health check' },
      { daysFromNow: 90, priority: 'low', reason: 'Quarterly maintenance alignment' },
    ],
    low: [
      { daysFromNow: 90, priority: 'low', reason: 'Standard quarterly inspection' },
      { daysFromNow: 180, priority: 'low', reason: 'Semi-annual comprehensive review' },
      { daysFromNow: 365, priority: 'low', reason: 'Annual fleet health audit' },
    ],
  };

  const base = templates[riskBand] || templates.low;
  const overdue =
    normalized.monthsSinceLastService != null && normalized.monthsSinceLastService > 12;

  return base.map((window, index) => ({
    id: `inspect-${riskBand}-${index}`,
    label:
      window.daysFromNow === 0
        ? 'Immediate'
        : window.daysFromNow <= 7
          ? `Within ${window.daysFromNow} day${window.daysFromNow === 1 ? '' : 's'}`
          : `Within ${window.daysFromNow} days`,
    daysFromNow: window.daysFromNow,
    priority: overdue && index === 0 ? 'urgent' : window.priority,
    reason: overdue && index === 0 ? `${window.reason} (service overdue)` : window.reason,
  }));
}

function pushAnomaly(anomalies, seen, payload) {
  if (seen.has(payload.id)) return;
  seen.add(payload.id);
  anomalies.push(payload);
}

export function scorePredictiveMaintenanceRules(normalized) {
  let score = 0;
  const contributingFactors = [];
  const anomalyIndicators = [];
  const seenAnomalyIds = new Set();

  const age = normalized.vehicleAgeYears;
  if (age != null) {
    if (age >= 20) {
      score += 35;
      contributingFactors.push('Vehicle age ≥ 20 years (+35)');
    } else if (age >= 15) {
      score += 25;
      contributingFactors.push('Vehicle age ≥ 15 years (+25)');
    } else if (age >= 10) {
      score += 15;
      contributingFactors.push('Vehicle age ≥ 10 years (+15)');
    } else if (age >= 7) {
      score += 8;
      contributingFactors.push('Vehicle age ≥ 7 years (+8)');
    }
  }

  const mileage = normalized.mileage;
  if (mileage != null) {
    if (mileage >= 200_000) {
      score += 30;
      contributingFactors.push('Mileage ≥ 200,000 (+30)');
    } else if (mileage >= 150_000) {
      score += 20;
      contributingFactors.push('Mileage ≥ 150,000 (+20)');
    } else if (mileage >= 100_000) {
      score += 10;
      contributingFactors.push('Mileage ≥ 100,000 (+10)');
    }
  }

  const monthsSince = normalized.monthsSinceLastService;
  if (monthsSince != null) {
    if (monthsSince > 18) {
      score += 30;
      contributingFactors.push('Last service > 18 months ago (+30)');
      pushAnomaly(anomalyIndicators, seenAnomalyIds, {
        id: 'service-overdue-severe',
        severity: 'high',
        label: 'Service severely overdue',
        detail: `No recorded service in ${monthsSince} months`,
      });
    } else if (monthsSince > 12) {
      score += 20;
      contributingFactors.push('Last service > 12 months ago (+20)');
      pushAnomaly(anomalyIndicators, seenAnomalyIds, {
        id: 'service-overdue',
        severity: 'medium',
        label: 'Service overdue',
        detail: `Last service ${monthsSince} months ago`,
      });
    } else if (monthsSince > 9) {
      score += 10;
      contributingFactors.push('Last service > 9 months ago (+10)');
    }
  }

  if (normalized.servicesLast12Months != null && normalized.servicesLast12Months < 2) {
    score += 15;
    contributingFactors.push('Fewer than 2 services in last 12 months (+15)');
  }

  const criticalCodes = normalized.diagnosticCodes.filter(isCriticalDiagnosticCode);
  const otherCodes = normalized.diagnosticCodes.length - criticalCodes.length;

  if (criticalCodes.length > 0) {
    const add = Math.min(40, criticalCodes.length * 15);
    score += add;
    contributingFactors.push(`${criticalCodes.length} critical diagnostic code(s) (+${add})`);
    pushAnomaly(anomalyIndicators, seenAnomalyIds, {
      id: 'critical-dtc',
      severity: 'critical',
      label: 'Critical diagnostic codes',
      detail: criticalCodes.join(', '),
    });
  }

  if (otherCodes > 0) {
    const add = Math.min(20, otherCodes * 5);
    score += add;
    contributingFactors.push(`${otherCodes} additional diagnostic code(s) (+${add})`);
  }

  const battery = normalized.batteryHealthPercent;
  if (battery != null) {
    if (battery < 40) {
      score += 25;
      contributingFactors.push('Battery health < 40% (+25)');
      pushAnomaly(anomalyIndicators, seenAnomalyIds, {
        id: 'battery-critical',
        severity: 'critical',
        label: 'Critical battery health',
        detail: `${battery}% state of health`,
      });
    } else if (battery < 60) {
      score += 15;
      contributingFactors.push('Battery health < 60% (+15)');
      pushAnomaly(anomalyIndicators, seenAnomalyIds, {
        id: 'battery-warning',
        severity: 'medium',
        label: 'Degraded battery health',
        detail: `${battery}% state of health`,
      });
    } else if (battery < 80) {
      score += 5;
      contributingFactors.push('Battery health < 80% (+5)');
    }
  }

  const { engineTempSpikes, harshBrakingEvents, idleHoursPerWeek, faultCodesLast30Days } =
    normalized.telemetry;

  if (engineTempSpikes >= 8) {
    score += 18;
    contributingFactors.push('Frequent engine temperature spikes (+18)');
    pushAnomaly(anomalyIndicators, seenAnomalyIds, {
      id: 'temp-spikes',
      severity: 'high',
      label: 'Engine temperature anomalies',
      detail: `${engineTempSpikes} spike events in recent telemetry`,
    });
  } else if (engineTempSpikes >= 4) {
    score += 10;
    contributingFactors.push('Engine temperature spikes (+10)');
  }

  if (harshBrakingEvents >= 25) {
    score += 15;
    contributingFactors.push('High harsh braking frequency (+15)');
    pushAnomaly(anomalyIndicators, seenAnomalyIds, {
      id: 'harsh-braking',
      severity: 'medium',
      label: 'Harsh braking pattern',
      detail: `${harshBrakingEvents} events in recent telemetry`,
    });
  } else if (harshBrakingEvents >= 12) {
    score += 8;
    contributingFactors.push('Elevated harsh braking (+8)');
  }

  if (idleHoursPerWeek >= 35) {
    score += 12;
    contributingFactors.push('Excessive idle hours (+12)');
    pushAnomaly(anomalyIndicators, seenAnomalyIds, {
      id: 'idle-hours',
      severity: 'low',
      label: 'High idle utilization',
      detail: `${idleHoursPerWeek} idle hours per week`,
    });
  } else if (idleHoursPerWeek >= 20) {
    score += 6;
    contributingFactors.push('Elevated idle hours (+6)');
  }

  if (faultCodesLast30Days >= 6) {
    score += 20;
    contributingFactors.push('Recurring fault codes (+20)');
    pushAnomaly(anomalyIndicators, seenAnomalyIds, {
      id: 'fault-codes',
      severity: 'high',
      label: 'Recurring telematics faults',
      detail: `${faultCodesLast30Days} fault codes in last 30 days`,
    });
  } else if (faultCodesLast30Days >= 3) {
    score += 10;
    contributingFactors.push('Multiple telematics fault codes (+10)');
  }

  const maintenanceRiskScore = clamp(score, 0, 100);
  const riskBand = resolveRiskBand(maintenanceRiskScore);

  return {
    maintenanceRiskScore,
    riskBand,
    riskBandLabel: RISK_BAND_LABELS[riskBand],
    suggestedInspectionWindows: buildInspectionWindows(riskBand, normalized),
    anomalyIndicators,
    contributingFactors,
    engine: SCORING_ENGINE_RULES,
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Score maintenance risk from raw form/API input.
 * @param {object} input
 * @param {{ engine?: string, aiProvider?: (normalized: object) => object }} [options]
 */
export function scorePredictiveMaintenance(input, options = {}) {
  const normalized = normalizePredictiveMaintenanceInput(input);
  const engine = options.engine ?? SCORING_ENGINE_RULES;

  if (engine === SCORING_ENGINE_AI) {
    if (typeof options.aiProvider === 'function') {
      return options.aiProvider(normalized);
    }
    return {
      ...scorePredictiveMaintenanceRules(normalized),
      engine: SCORING_ENGINE_AI,
      aiPending: true,
      note: 'AI engine requested but no provider configured; showing rule-based estimate.',
    };
  }

  return scorePredictiveMaintenanceRules(normalized);
}

export function hasMinimumScoringInput(normalized) {
  return (
    normalized.vehicleAgeYears != null ||
    normalized.mileage != null ||
    normalized.diagnosticCodes.length > 0 ||
    normalized.batteryHealthPercent != null ||
    normalized.monthsSinceLastService != null
  );
}
