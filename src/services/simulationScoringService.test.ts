import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIMULATION_SCENARIOS } from '../data/medicalSimulationCatalog';
import {
  SIMULATION_RUN_HISTORY_STORAGE_KEY,
  clearSimulationRunHistory,
  computeCompetencyCoverage,
  computeRecommendedPractice,
  computeSimulationOutcomesSummary,
  computeWeakAreas,
  computeWeeklyTrend,
  listSimulationRuns,
  recordSimulationRun,
  type CompletedSimulationRun,
} from './simulationScoringService';

const sepsis = SIMULATION_SCENARIOS.find((s) => s.id === 'sepsis-deterioration')!;
const chestPain = SIMULATION_SCENARIOS.find((s) => s.id === 'chest-pain-acs')!;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('simulationScoringService — no-prod-write guarantee', () => {
  it('never calls fetch/XHR while recording, listing, or clearing runs', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as never).mockImplementation(() => {
      throw new Error('recordSimulationRun must never reach the network');
    });

    recordSimulationRun(sepsis, ['Recognize possible septic shock']);
    recordSimulationRun(chestPain, []);
    listSimulationRuns();
    clearSimulationRunHistory();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('persists only to window.localStorage under its own namespaced key', () => {
    recordSimulationRun(sepsis, sepsis.criticalActions.slice(0, 2));
    const raw = window.localStorage.getItem(SIMULATION_RUN_HISTORY_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('degrades gracefully when storage is unavailable — never throws', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
      removeItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(() => recordSimulationRun(sepsis, [], undefined, brokenStorage)).not.toThrow();
    expect(listSimulationRuns(brokenStorage)).toEqual([]);
    expect(() => clearSimulationRunHistory(brokenStorage)).not.toThrow();
  });
});

describe('simulationScoringService — recording and listing', () => {
  it('records a run with scores derived from the real debrief scoring function', () => {
    const run = recordSimulationRun(sepsis, sepsis.criticalActions);
    expect(run.scenarioId).toBe('sepsis-deterioration');
    expect(run.correctActionCount).toBe(sepsis.criticalActions.length);
    expect(run.missedCriticalActions).toEqual([]);
    expect(run.safetyScore).toBe(100);
  });

  it('lists runs newest first', () => {
    const now = ['2026-07-01T00:00:00.000Z', '2026-07-02T00:00:00.000Z'];
    let call = 0;
    const clock = () => now[call++];
    recordSimulationRun(sepsis, [], undefined, undefined, clock);
    recordSimulationRun(chestPain, [], undefined, undefined, clock);
    const listed = listSimulationRuns();
    expect(listed.map((r) => r.scenarioId)).toEqual(['chest-pain-acs', 'sepsis-deterioration']);
  });

  it('clearSimulationRunHistory empties the store', () => {
    recordSimulationRun(sepsis, []);
    expect(listSimulationRuns()).toHaveLength(1);
    clearSimulationRunHistory();
    expect(listSimulationRuns()).toEqual([]);
  });
});

function run(overrides: Partial<CompletedSimulationRun>): CompletedSimulationRun {
  return {
    runId: 'r',
    scenarioId: 's',
    scenarioTitle: 'S',
    category: 'Emergency',
    specialty: 'Emergency Medicine',
    difficulty: 'Intermediate',
    completedAt: new Date().toISOString(),
    criticalActionCount: 4,
    correctActionCount: 4,
    missedCriticalActions: [],
    safetyScore: 100,
    communicationScore: 96,
    teamworkScore: 94,
    debriefQualityScore: 78,
    ...overrides,
  };
}

describe('simulationScoringService — aggregation', () => {
  it('computeSimulationOutcomesSummary reflects real runs, not fabricated cohort data', () => {
    const runs = [
      run({ scenarioId: 'a', safetyScore: 100, missedCriticalActions: [] }),
      run({ scenarioId: 'a', safetyScore: 60, missedCriticalActions: ['Check glucose'] }),
      run({ scenarioId: 'b', safetyScore: 80, missedCriticalActions: [] }),
    ];
    const summary = computeSimulationOutcomesSummary(runs, 10);
    expect(summary.totalRuns).toBe(3);
    expect(summary.scenariosPracticed).toBe(2);
    expect(summary.completionRate).toBe(20);
    expect(summary.averageSafetyScore).toBe(80);
    expect(summary.missedCriticalActions).toBe(1);
  });

  it('returns an honest zero state for an empty history rather than fabricated numbers', () => {
    const summary = computeSimulationOutcomesSummary([], SIMULATION_SCENARIOS.length);
    expect(summary).toEqual({
      completionRate: 0,
      averageSafetyScore: 0,
      missedCriticalActions: 0,
      communicationScore: 0,
      teamworkScore: 0,
      debriefQualityScore: 0,
      totalRuns: 0,
      scenariosPracticed: 0,
      scenariosInCatalog: SIMULATION_SCENARIOS.length,
    });
  });

  it('computeWeeklyTrend buckets runs into rolling weeks ending now', () => {
    const nowMs = Date.parse('2026-07-17T00:00:00.000Z');
    const runs = [
      run({ completedAt: new Date(nowMs - 1 * 24 * 60 * 60 * 1000).toISOString(), safetyScore: 90 }),
      run({ completedAt: new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString(), safetyScore: 70 }),
    ];
    const trend = computeWeeklyTrend(runs, 4, () => nowMs);
    expect(trend).toHaveLength(4);
    expect(trend[3].completions).toBe(1);
    expect(trend[3].safetyScore).toBe(90);
    expect(trend[2].completions).toBe(1);
    expect(trend[2].safetyScore).toBe(70);
    expect(trend[0].completions).toBe(0);
  });

  it('computeCompetencyCoverage averages safety score per category, worst last', () => {
    const runs = [
      run({ category: 'Emergency', safetyScore: 90 }),
      run({ category: 'Emergency', safetyScore: 70 }),
      run({ category: 'Trauma', safetyScore: 50 }),
    ];
    const coverage = computeCompetencyCoverage(runs);
    expect(coverage).toEqual([
      { competency: 'Emergency', coverage: 80 },
      { competency: 'Trauma', coverage: 50 },
    ]);
  });

  it('computeWeakAreas ranks the most frequently missed actions first', () => {
    const runs = [
      run({ missedCriticalActions: ['Check glucose', 'Escalate team response'] }),
      run({ missedCriticalActions: ['Check glucose'] }),
      run({ missedCriticalActions: ['Confirm last-known-well'] }),
    ];
    expect(computeWeakAreas(runs, 2)).toEqual(['Check glucose', 'Escalate team response']);
  });

  it('computeRecommendedPractice excludes attempted scenarios and favors weak categories', () => {
    const runs = [run({ scenarioId: 'sepsis-deterioration', category: 'Emergency', safetyScore: 40 })];
    const recommended = computeRecommendedPractice(SIMULATION_SCENARIOS, runs, 3);
    expect(recommended).not.toContain('sepsis-deterioration');
    expect(recommended.length).toBeGreaterThan(0);
    // Weakest-practiced category is Emergency (40) — its own next-recommended-eligible
    // sibling scenarios should rank ahead of an unrelated, never-touched category.
    const firstRecommended = SIMULATION_SCENARIOS.find((s) => s.id === recommended[0]);
    expect(firstRecommended?.category).toBe('Emergency');
  });
});
