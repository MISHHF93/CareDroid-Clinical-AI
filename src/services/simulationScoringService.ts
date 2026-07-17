/**
 * Simulation mode scoring (IX15) — records completed scenario runs and
 * aggregates real training metrics from them.
 *
 * This module deliberately imports NO api client, NO http transport, and NO
 * backend service of any kind — every function here only ever touches
 * `window.localStorage`. That is the "training score without prod writes"
 * guarantee: there is no code path in this file that can reach a network
 * request, so a completed simulation can never write to any patient record
 * or production store, by construction rather than by runtime check.
 */

import {
  buildScenarioDebrief,
  type SIMULATION_SCENARIOS,
} from '../data/medicalSimulationCatalog';

type SimulationScenario = (typeof SIMULATION_SCENARIOS)[number];
type ScenarioDebrief = ReturnType<typeof buildScenarioDebrief>;

export type CompletedSimulationRun = {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  category: string;
  specialty: string;
  difficulty: string;
  completedAt: string;
  criticalActionCount: number;
  correctActionCount: number;
  missedCriticalActions: string[];
  safetyScore: number;
  communicationScore: number;
  teamworkScore: number;
  debriefQualityScore: number;
};

export type SimulationOutcomesSummary = {
  completionRate: number;
  averageSafetyScore: number;
  missedCriticalActions: number;
  communicationScore: number;
  teamworkScore: number;
  debriefQualityScore: number;
  totalRuns: number;
  scenariosPracticed: number;
  scenariosInCatalog: number;
};

export type WeeklyTrendPoint = { label: string; completions: number; safetyScore: number };
export type CompetencyCoveragePoint = { competency: string; coverage: number };

export const SIMULATION_RUN_HISTORY_STORAGE_KEY = 'caredroid.simulation.runHistory.v1';
const MAX_STORED_RUNS = 200;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRuns(storage: StorageLike | null): CompletedSimulationRun[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(SIMULATION_RUN_HISTORY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as CompletedSimulationRun[]) : [];
  } catch {
    return [];
  }
}

function writeRuns(runs: CompletedSimulationRun[], storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(SIMULATION_RUN_HISTORY_STORAGE_KEY, JSON.stringify(runs.slice(-MAX_STORED_RUNS)));
  } catch {
    // Storage can be disabled/full — training history degrades to session-only, never throws.
  }
}

/**
 * Records one completed scenario attempt to local-only history. No network
 * call is made and nothing here is scoped to an organization/patient —
 * `scenario.dataMode` is already "Demo training simulation" upstream.
 */
export function recordSimulationRun(
  scenario: SimulationScenario,
  selectedActionIds: string[],
  debrief: ScenarioDebrief = buildScenarioDebrief(scenario, selectedActionIds),
  storage: StorageLike | null = getBrowserStorage(),
  now: () => string = () => new Date().toISOString(),
): CompletedSimulationRun {
  const run: CompletedSimulationRun = {
    runId: `sim-run-${scenario.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    category: scenario.category,
    specialty: scenario.specialty,
    difficulty: scenario.difficulty,
    completedAt: now(),
    criticalActionCount: scenario.criticalActions.length,
    correctActionCount: debrief.correctActions.length,
    missedCriticalActions: debrief.missedCriticalActions,
    safetyScore: debrief.scores.safetyScore,
    communicationScore: debrief.scores.communicationScore,
    teamworkScore: debrief.scores.teamworkScore,
    debriefQualityScore: debrief.scores.debriefQualityScore,
  };

  writeRuns([...readRuns(storage), run], storage);
  return run;
}

export function listSimulationRuns(
  storage: StorageLike | null = getBrowserStorage(),
): CompletedSimulationRun[] {
  return readRuns(storage).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}

/** Clears local practice history only — there is nothing server-side to clear. */
export function clearSimulationRunHistory(storage: StorageLike | null = getBrowserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(SIMULATION_RUN_HISTORY_STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function computeSimulationOutcomesSummary(
  runs: CompletedSimulationRun[],
  catalogSize: number,
): SimulationOutcomesSummary {
  const scenariosPracticed = new Set(runs.map((r) => r.scenarioId)).size;
  return {
    completionRate: catalogSize > 0 ? Math.round((scenariosPracticed / catalogSize) * 100) : 0,
    averageSafetyScore: average(runs.map((r) => r.safetyScore)),
    missedCriticalActions: runs.reduce((sum, r) => sum + r.missedCriticalActions.length, 0),
    communicationScore: average(runs.map((r) => r.communicationScore)),
    teamworkScore: average(runs.map((r) => r.teamworkScore)),
    debriefQualityScore: average(runs.map((r) => r.debriefQualityScore)),
    totalRuns: runs.length,
    scenariosPracticed,
    scenariosInCatalog: catalogSize,
  };
}

/** Groups runs into rolling 7-day buckets ending today, oldest first. */
export function computeWeeklyTrend(
  runs: CompletedSimulationRun[],
  weekCount = 4,
  now: () => number = Date.now,
): WeeklyTrendPoint[] {
  const nowMs = now();
  const buckets: WeeklyTrendPoint[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const bucketStart = nowMs - (i + 1) * WEEK_MS;
    const bucketEnd = nowMs - i * WEEK_MS;
    const inBucket = runs.filter((r) => {
      const t = Date.parse(r.completedAt);
      return t > bucketStart && t <= bucketEnd;
    });
    buckets.push({
      label: `Week ${weekCount - i}`,
      completions: inBucket.length,
      safetyScore: average(inBucket.map((r) => r.safetyScore)),
    });
  }
  return buckets;
}

/** Average safety score per category, reframed as a 0–100 "coverage" figure. */
export function computeCompetencyCoverage(runs: CompletedSimulationRun[]): CompetencyCoveragePoint[] {
  const byCategory = new Map<string, number[]>();
  for (const run of runs) {
    const scores = byCategory.get(run.category) || [];
    scores.push(run.safetyScore);
    byCategory.set(run.category, scores);
  }
  return [...byCategory.entries()]
    .map(([competency, scores]) => ({ competency, coverage: average(scores) }))
    .sort((a, b) => b.coverage - a.coverage);
}

/** Most frequently missed critical actions across all recorded runs, worst first. */
export function computeWeakAreas(runs: CompletedSimulationRun[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const run of runs) {
    for (const action of run.missedCriticalActions) {
      counts.set(action, (counts.get(action) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([action]) => action);
}

/** Scenario ids not yet attempted, worst-performing categories first. */
export function computeRecommendedPractice(
  allScenarios: readonly SimulationScenario[],
  runs: CompletedSimulationRun[],
  limit = 3,
): string[] {
  const attempted = new Set(runs.map((r) => r.scenarioId));
  const coverage = computeCompetencyCoverage(runs);
  const weakestCategoriesFirst = coverage.length
    ? [...coverage].sort((a, b) => a.coverage - b.coverage).map((c) => c.competency)
    : [];

  const unattempted = allScenarios.filter((s) => !attempted.has(s.id));
  const ranked = [...unattempted].sort((a, b) => {
    const rankA = weakestCategoriesFirst.indexOf(a.category);
    const rankB = weakestCategoriesFirst.indexOf(b.category);
    const normalizedA = rankA === -1 ? weakestCategoriesFirst.length : rankA;
    const normalizedB = rankB === -1 ? weakestCategoriesFirst.length : rankB;
    return normalizedA - normalizedB;
  });
  return ranked.slice(0, limit).map((s) => s.id);
}
