/**
 * Predictive Maintenance scoring — correctness and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  hasMinimumScoringInput,
  isCriticalDiagnosticCode,
  normalizePredictiveMaintenanceInput,
  parseDiagnosticCodes,
  resolveRiskBand,
  scorePredictiveMaintenance,
  scorePredictiveMaintenanceRules,
  SCORING_ENGINE_AI,
} from './predictiveMaintenanceScoring';

describe('predictiveMaintenanceScoring', () => {
  it('returns low risk for empty normalized input', () => {
    const normalized = normalizePredictiveMaintenanceInput({});
    expect(hasMinimumScoringInput(normalized)).toBe(false);

    const result = scorePredictiveMaintenanceRules(normalized);
    expect(result.maintenanceRiskScore).toBe(0);
    expect(result.riskBand).toBe('low');
    expect(result.anomalyIndicators).toHaveLength(0);
    expect(result.suggestedInspectionWindows).toHaveLength(3);
  });

  it('scores high mileage and age toward critical band', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 22,
      mileage: 210_000,
      monthsSinceLastService: 20,
      servicesLast12Months: 0,
      diagnosticCodes: 'P0301, P0420',
      batteryHealthPercent: 35,
      telemetry: {
        engineTempSpikes: 10,
        harshBrakingEvents: 30,
        idleHoursPerWeek: 40,
        faultCodesLast30Days: 8,
      },
    });

    expect(result.maintenanceRiskScore).toBeGreaterThanOrEqual(75);
    expect(result.riskBand).toBe('critical');
    expect(result.anomalyIndicators.length).toBeGreaterThan(0);
    expect(result.suggestedInspectionWindows[0].label).toBe('Immediate');
  });

  it('applies moderate penalties for mid-life vehicle with delayed service', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 11,
      mileage: 120_000,
      monthsSinceLastService: 13,
      servicesLast12Months: 1,
      batteryHealthPercent: 72,
    });

    expect(result.maintenanceRiskScore).toBeGreaterThanOrEqual(25);
    expect(result.maintenanceRiskScore).toBeLessThan(75);
    expect(['moderate', 'high']).toContain(result.riskBand);
  });

  it('parses diagnostic codes and flags critical patterns', () => {
    expect(parseDiagnosticCodes('p0301; P0420\nBMS_CRITICAL')).toEqual([
      'P0301',
      'P0420',
      'BMS_CRITICAL',
    ]);
    expect(isCriticalDiagnosticCode('P0301')).toBe(true);
    expect(isCriticalDiagnosticCode('P4200')).toBe(false);
    expect(isCriticalDiagnosticCode('BMS_SEVERE')).toBe(true);
  });

  it('clamps invalid telemetry and negative numbers', () => {
    const normalized = normalizePredictiveMaintenanceInput({
      vehicleAgeYears: -5,
      mileage: 'not-a-number',
      servicesLast12Months: -3,
      telemetry: { harshBrakingEvents: -10 },
    });

    expect(normalized.vehicleAgeYears).toBe(-5);
    expect(normalized.mileage).toBeNull();
    expect(normalized.servicesLast12Months).toBe(0);
    expect(normalized.telemetry.harshBrakingEvents).toBe(0);
  });

  it('resolves risk bands at documented thresholds', () => {
    expect(resolveRiskBand(0)).toBe('low');
    expect(resolveRiskBand(24)).toBe('low');
    expect(resolveRiskBand(25)).toBe('moderate');
    expect(resolveRiskBand(49)).toBe('moderate');
    expect(resolveRiskBand(50)).toBe('high');
    expect(resolveRiskBand(74)).toBe('high');
    expect(resolveRiskBand(75)).toBe('critical');
    expect(resolveRiskBand(100)).toBe('critical');
  });

  it('falls back to rules when AI engine has no provider', () => {
    const result = scorePredictiveMaintenance(
      { vehicleAgeYears: 8, mileage: 90_000 },
      { engine: SCORING_ENGINE_AI }
    );

    expect(result.engine).toBe(SCORING_ENGINE_AI);
    expect(result.aiPending).toBe(true);
    expect(result.maintenanceRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.note).toMatch(/rule-based/i);
  });

  it('delegates to aiProvider when configured', () => {
    const result = scorePredictiveMaintenance(
      { vehicleAgeYears: 5 },
      {
        engine: SCORING_ENGINE_AI,
        aiProvider: () => ({
          maintenanceRiskScore: 42,
          riskBand: 'moderate',
          riskBandLabel: 'Moderate risk',
          suggestedInspectionWindows: [],
          anomalyIndicators: [],
          contributingFactors: [],
          engine: SCORING_ENGINE_AI,
        }),
      }
    );

    expect(result.maintenanceRiskScore).toBe(42);
    expect(result.engine).toBe(SCORING_ENGINE_AI);
  });
});
