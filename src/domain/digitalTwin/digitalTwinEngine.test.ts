import { describe, expect, it } from 'vitest';
import { DigitalTwinEngine } from './digitalTwinEngine';

describe('DigitalTwinEngine', () => {
  it('registers and retrieves digital twin nodes with default hierarchy', () => {
    const engine = new DigitalTwinEngine();
    const twins = engine.listTwins();
    expect(twins.length).toBeGreaterThanOrEqual(2);

    const ed = engine.getTwin('twin-ed-metro');
    expect(ed).toBeDefined();
    expect(ed?.type).toBe('emergency_department');
    expect(ed?.childTwinIds).toContain('twin-trauma-bay-1');
  });

  it('syncs physical telemetry and recalculates predictive metrics', () => {
    const engine = new DigitalTwinEngine();
    const twinId = 'twin-ed-metro';

    const updated = engine.syncPhysicalTelemetry(twinId, {
      currentOccupancy: 33,
      activeQueueDepth: 16,
    });
    expect(updated).toBe(true);

    const twin = engine.getTwin(twinId);
    expect(twin?.state.currentOccupancy).toBe(33);
    expect(twin?.predictions.surgeRiskScore).toBeGreaterThan(80);
    expect(twin?.predictions.recommendedMitigations.length).toBeGreaterThan(0);
  });

  it('simulates what-if surge scenario and predicts 3-minute target impact', () => {
    const engine = new DigitalTwinEngine();
    const twinId = 'twin-ed-metro';

    const result = engine.simulateWhatIfScenario({
      targetTwinId: twinId,
      additionalArrivalsPerHour: 12,
      staffAbsenceCount: 3,
      offlineEquipmentCount: 1,
      simulationDurationMinutes: 60,
    });

    expect(result.scenarioId).toBeDefined();
    expect(result.projectedPeakOccupancy).toBeGreaterThan(28);
    expect(result.projectedMetrics.surgeRiskScore).toBeGreaterThanOrEqual(
      result.baselineMetrics.surgeRiskScore,
    );
    expect(result.projectedMaxWaitMinutes).toBeGreaterThan(
      result.baselineMetrics.projectedWaitTimeMinutes,
    );
    expect(result.breachThreeMinuteResponseTarget).toBe(true);
    expect(
      result.recommendedActionPlan.some((plan) => plan.includes('3-MINUTE RESPONSE TARGET')),
    ).toBe(true);
  });
});
