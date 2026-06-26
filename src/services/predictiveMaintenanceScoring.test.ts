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
      mileage: -1000,
      monthsSinceLastService: -2,
      servicesLast12Months: -3,
      telemetry: { harshBrakingEvents: -10 },
    });

    expect(normalized.vehicleAgeYears).toBeNull();
    expect(normalized.mileage).toBeNull();
    expect(normalized.monthsSinceLastService).toBeNull();
    expect(normalized.servicesLast12Months).toBe(0);
    expect(normalized.telemetry.harshBrakingEvents).toBe(0);
  });

  it('scores healthy young vehicle in low band with quarterly windows', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 3,
      mileage: 25_000,
      monthsSinceLastService: 4,
      servicesLast12Months: 3,
      batteryHealthPercent: 92,
    });

    expect(result.maintenanceRiskScore).toBeLessThan(25);
    expect(result.riskBand).toBe('low');
    expect(result.anomalyIndicators).toHaveLength(0);
    expect(result.suggestedInspectionWindows[0].daysFromNow).toBe(90);
  });

  it('caps maintenance risk score at 100', () => {
    const result = scorePredictiveMaintenance({
      vehicleAgeYears: 25,
      mileage: 300_000,
      monthsSinceLastService: 24,
      servicesLast12Months: 0,
      diagnosticCodes: 'P0301, P0420, P0171, BMS_CRITICAL',
      batteryHealthPercent: 20,
      telemetry: {
        engineTempSpikes: 20,
        harshBrakingEvents: 50,
        idleHoursPerWeek: 50,
        faultCodesLast30Days: 12,
      },
    });

    expect(result.maintenanceRiskScore).toBe(100);
    expect(result.riskBand).toBe('critical');
  });

  it('accepts diagnostic codes alone as minimum input', () => {
    const normalized = normalizePredictiveMaintenanceInput({ diagnosticCodes: 'P0301' });
    expect(hasMinimumScoringInput(normalized)).toBe(true);
    const result = scorePredictiveMaintenance({ diagnosticCodes: 'P0301' });
    expect(result.maintenanceRiskScore).toBeGreaterThan(0);
  });

  it('is deterministic for identical inputs', () => {
    const input = {
      vehicleAgeYears: 12,
      mileage: 140_000,
      monthsSinceLastService: 11,
      batteryHealthPercent: 68,
    };
    const a = scorePredictiveMaintenance(input);
    const b = scorePredictiveMaintenance(input);
    expect(a.maintenanceRiskScore).toBe(b.maintenanceRiskScore);
    expect(a.riskBand).toBe(b.riskBand);
    expect(a.anomalyIndicators.map((x) => x.id)).toEqual(b.anomalyIndicators.map((x) => x.id));
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
