/**
 * Predictive Maintenance result widgets — ops warning helper.
 */

import { describe, it, expect } from 'vitest';
import {
  getMaintenanceOpsWarningItems,
  shouldShowMaintenanceOpsWarning,
} from './PredictiveMaintenanceWidgets';
import { scorePredictiveMaintenance } from '../../services/predictiveMaintenanceScoring';

describe('shouldShowMaintenanceOpsWarning', () => {
  it('returns false when result is null', () => {
    expect(shouldShowMaintenanceOpsWarning(null)).toBe(false);
  });

  it('returns true for critical risk band', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 22,
      mileage: 210_000,
      monthsSinceLastService: 20,
      diagnosticCodes: 'P0301',
      batteryHealthPercent: 35,
    });
    expect(result.riskBand).toBe('critical');
    expect(shouldShowMaintenanceOpsWarning(result)).toBe(true);
  });

  it('returns false for low risk band without critical anomalies', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 2,
      mileage: 15_000,
      monthsSinceLastService: 3,
      batteryHealthPercent: 95,
    });
    expect(shouldShowMaintenanceOpsWarning(result)).toBe(false);
  });
});

describe('getMaintenanceOpsWarningItems', () => {
  it('lists risk band and urgent items for critical scores', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 22,
      mileage: 210_000,
      monthsSinceLastService: 20,
      diagnosticCodes: 'P0301',
      batteryHealthPercent: 35,
    });
    const items = getMaintenanceOpsWarningItems(result);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => /risk band/i.test(item))).toBe(true);
  });
});
