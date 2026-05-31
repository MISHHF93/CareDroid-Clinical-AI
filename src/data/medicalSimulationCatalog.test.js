import { describe, expect, it } from 'vitest';
import {
  SIMULATION_CATEGORIES,
  SIMULATION_SCENARIOS,
  SIMULATION_SCENARIO_TYPES,
  buildScenarioDebrief,
  getRecommendedSimulationScenarios,
  getSimulationScenarioById,
} from './medicalSimulationCatalog';

describe('medical simulation catalog', () => {
  it('defines the requested taxonomy, scenario types, and seeded scenarios', () => {
    expect(SIMULATION_CATEGORIES).toContain('Emergency');
    expect(SIMULATION_CATEGORIES).toContain('Medical IoT / Device Failure');
    expect(SIMULATION_CATEGORIES).toContain('OSCE / Student Training');
    expect(SIMULATION_SCENARIO_TYPES).toContain('disaster-mass-casualty-scenario');
    expect(SIMULATION_SCENARIOS).toHaveLength(16);
    expect(SIMULATION_SCENARIOS.map((scenario) => scenario.id)).toEqual(
      expect.arrayContaining([
        'sepsis-deterioration',
        'stroke-alert',
        'abnormal-lab-escalation',
        'device-alarm-failure',
        'mass-casualty-incident',
      ])
    );
  });

  it('returns role-based scenario recommendations from profile context', () => {
    expect(getRecommendedSimulationScenarios({ role: 'emergency physician' }).map((item) => item.id)).toEqual([
      'sepsis-deterioration',
      'chest-pain-acs',
      'stroke-alert',
      'trauma-triage',
    ]);
    expect(getRecommendedSimulationScenarios({ role: 'biomedical engineer' }).map((item) => item.id)).toContain(
      'device-alarm-failure'
    );
  });

  it('builds a debrief with missed actions and next recommended scenarios', () => {
    const scenario = getSimulationScenarioById('sepsis-deterioration');
    const debrief = buildScenarioDebrief(scenario, [scenario.criticalActions[0]]);
    expect(debrief.summary).toMatch(/sepsis deterioration completed/i);
    expect(debrief.missedCriticalActions.length).toBeGreaterThan(0);
    expect(debrief.nextRecommendedScenarios.map((item) => item.id)).toContain('respiratory-failure');
  });
});
