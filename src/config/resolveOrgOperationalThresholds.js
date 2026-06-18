import { DEFAULT_EMERGENCY_THRESHOLDS } from '../store/emergencyStore';
import { DEFAULT_EMERGENCY_CTAS_TARGETS } from './emergencySettings.config';

/**
 * Deep-merge organization.settings.emergencyOs.thresholds over code defaults.
 */
export function resolveOrgOperationalThresholds(emergencyOsSettings = {}) {
  const orgThresholds = emergencyOsSettings?.thresholds || {};
  const orgReassessment = emergencyOsSettings?.reassessmentThresholds || {};
  const reassessmentIntervals = Object.freeze({
    P1:
      orgReassessment.P1 ??
      orgThresholds.reassessmentIntervals?.P1 ??
      DEFAULT_EMERGENCY_THRESHOLDS.reassessP1Min,
    P2:
      orgReassessment.P2 ??
      orgThresholds.reassessmentIntervals?.P2 ??
      DEFAULT_EMERGENCY_THRESHOLDS.reassessP2Min,
    P3:
      orgReassessment.P3 ??
      orgThresholds.reassessmentIntervals?.P3 ??
      DEFAULT_EMERGENCY_THRESHOLDS.reassessP3Min,
    P4:
      orgReassessment.P4 ??
      orgThresholds.reassessmentIntervals?.P4 ??
      DEFAULT_EMERGENCY_THRESHOLDS.reassessP4Min,
    P5:
      orgReassessment.P5 ??
      orgThresholds.reassessmentIntervals?.P5 ??
      DEFAULT_EMERGENCY_THRESHOLDS.reassessP5Min,
  });
  const ctasTargets = Object.freeze({
    ...DEFAULT_EMERGENCY_CTAS_TARGETS,
    ...(orgThresholds.ctasTargets || {}),
  });

  return Object.freeze({
    waitWarningMinutes:
      orgThresholds.waitWarningMinutes ?? DEFAULT_EMERGENCY_THRESHOLDS.waitTimeWarningMin,
    waitCriticalMinutes:
      orgThresholds.waitCriticalMinutes ?? DEFAULT_EMERGENCY_THRESHOLDS.waitTimeCtiticalMin,
    capacityWarningPercent:
      orgThresholds.capacityWarningPercent ??
      Math.round(DEFAULT_EMERGENCY_THRESHOLDS.capacityWarningPct * 100),
    capacityOrangePercent:
      orgThresholds.capacityOrangePercent ??
      Math.round(DEFAULT_EMERGENCY_THRESHOLDS.capacityOrangePct * 100),
    capacityRedPercent:
      orgThresholds.capacityRedPercent ??
      Math.round(DEFAULT_EMERGENCY_THRESHOLDS.capacityRedPct * 100),
    emsOffloadTargetMinutes:
      orgThresholds.emsOffloadTargetMinutes ?? DEFAULT_EMERGENCY_THRESHOLDS.emsOffloadTargetMin,
    reassessmentIntervals,
    ctasTargets,
  });
}
