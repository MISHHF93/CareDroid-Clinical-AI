/**
 * Tenant-local ADTA (Anticipated Decision to Admit) calibration weights.
 * Hospitals can tune thresholds without code changes via emergency settings overlay.
 */

export type AdtaCalibrationProfile = {
  id: string;
  label: string;
  alertThreshold: number;
  weights: {
    admissionState: number;
    pendingAdmissionFlag: number;
    highAcuity: number;
    sepsisAlert: number;
    highRiskFlag: number;
    admissionComplaint: number;
    age75Plus: number;
    hypoxia: number;
    abnormalLabs: number;
    pendingOrders: number;
    consultPending: number;
    boardingDecisionTracked: number;
  };
};

export const DEFAULT_ADTA_CALIBRATION: AdtaCalibrationProfile = {
  id: 'caredroid-default',
  label: 'CareDroid default ADTA',
  alertThreshold: 65,
  weights: {
    admissionState: 35,
    pendingAdmissionFlag: 20,
    highAcuity: 20,
    sepsisAlert: 15,
    highRiskFlag: 10,
    admissionComplaint: 10,
    age75Plus: 8,
    hypoxia: 12,
    abnormalLabs: 10,
    pendingOrders: 6,
    consultPending: 8,
    boardingDecisionTracked: 25,
  },
};

export function resolveAdtaCalibration(
  override?: Partial<AdtaCalibrationProfile> | null,
): AdtaCalibrationProfile {
  if (!override) return DEFAULT_ADTA_CALIBRATION;
  return {
    ...DEFAULT_ADTA_CALIBRATION,
    ...override,
    weights: {
      ...DEFAULT_ADTA_CALIBRATION.weights,
      ...(override.weights || {}),
    },
  };
}