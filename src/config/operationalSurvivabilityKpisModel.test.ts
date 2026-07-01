import { describe, expect, it } from 'vitest';
import {
  OPERATIONAL_SURVIVABILITY_KPIS,
  evaluateChargeNurseStatusKpi,
  evaluateDirectorThroughputKpi,
  evaluateOperationalSurvivabilityKpis,
  evaluateReceptionRegistrationKpi,
} from './operationalSurvivabilityKpisModel';

describe('operationalSurvivabilityKpisModel', () => {
  it('defines the three pilot outcome targets', () => {
    expect(OPERATIONAL_SURVIVABILITY_KPIS.receptionRegistrationSeconds).toBe(60);
    expect(OPERATIONAL_SURVIVABILITY_KPIS.chargeNurseStatusSeconds).toBe(30);
    expect(OPERATIONAL_SURVIVABILITY_KPIS.directorThroughputSeconds).toBe(120);
  });

  it('passes reception walk-in registration under 60 seconds', () => {
    const kpi = evaluateReceptionRegistrationKpi();
    expect(kpi.expressWalkInSeconds).toBeLessThanOrEqual(60);
    expect(kpi.passes).toBe(true);
  });

  it('passes charge nurse status comprehension under 30 seconds', () => {
    const kpi = evaluateChargeNurseStatusKpi();
    expect(kpi.passes).toBe(true);
    expect(kpi.estimatedReadSeconds).toBeLessThanOrEqual(30);
  });

  it('passes director throughput read under 2 minutes', () => {
    const kpi = evaluateDirectorThroughputKpi();
    expect(kpi.passes).toBe(true);
    expect(kpi.estimatedReadSeconds).toBeLessThanOrEqual(120);
  });

  it('reports pilot readiness when at least two KPIs pass', () => {
    const evaluation = evaluateOperationalSurvivabilityKpis();
    expect(evaluation.passesAll).toBe(true);
    expect(evaluation.pilotReady).toBe(true);
  });
});
