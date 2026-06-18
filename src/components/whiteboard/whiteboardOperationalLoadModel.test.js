import { describe, expect, it } from 'vitest';
import {
  WHITEBOARD_STRESS_SCENARIO,
  evaluateWhiteboardOperationalLoad,
  simulateWhiteboardStressScenario,
} from './whiteboardOperationalLoadModel';

describe('whiteboardOperationalLoadModel', () => {
  it('flags elevated load for the stress scenario', () => {
    const evaluation = evaluateWhiteboardOperationalLoad({
      waitingPatients: 40,
      emsArrivals: 5,
      reassessmentsDue: 10,
      referralsPending: 8,
      totalPatients: 63,
    });

    expect(evaluation.loadLevel).toBe('critical');
    expect(evaluation.prioritizeAwareness).toBe(true);
    expect(evaluation.compactChrome).toBe(true);
    expect(evaluation.maxVisibleCards).toBe(24);
    expect(evaluation.readabilityScore).toBeLessThan(55);
    expect(evaluation.issues.length).toBeGreaterThan(0);
    expect(evaluation.primaryFocus[0]?.id).toBe('reassess');
  });

  it('stays normal under light load', () => {
    const evaluation = evaluateWhiteboardOperationalLoad({
      waitingPatients: 6,
      emsArrivals: 1,
      reassessmentsDue: 1,
      referralsPending: 1,
      totalPatients: 12,
    });

    expect(evaluation.loadLevel).toBe('normal');
    expect(evaluation.prioritizeAwareness).toBe(false);
    expect(evaluation.maxVisibleCards).toBeNull();
  });

  it('simulates the requested department day', () => {
    const report = simulateWhiteboardStressScenario(WHITEBOARD_STRESS_SCENARIO);
    expect(report.scenario.waitingPatients).toBe(40);
    expect(report.scenario.emsArrivals).toBe(5);
    expect(report.scenario.reassessmentsDue).toBe(10);
    expect(report.scenario.referralsPending).toBe(8);
    expect(report.evaluation.prioritizeAwareness).toBe(true);
    expect(report.mitigations.length).toBeGreaterThan(0);
  });
});
