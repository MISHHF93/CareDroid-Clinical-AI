import {
  DEMO_SIMULATION_OUTCOMES,
  SIMULATION_CATEGORIES,
  SIMULATION_SCENARIOS,
} from '../data/medicalSimulationCatalog';
import {
  DEMO_COMPETENCY_RECORDS,
  DEMO_CREDENTIAL_RECORDS,
} from '../data/competencyCredentialingCatalog';

export type SimulationChartDatum = Readonly<{ name: string; value: number }>;

export function buildScenarioCategoryChart(
  scenarios: readonly { category?: string }[] = SIMULATION_SCENARIOS,
): SimulationChartDatum[] {
  const counts = scenarios.reduce<Record<string, number>>((acc, row) => {
    const key = row.category || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export function buildScenarioDifficultyChart(
  scenarios: readonly { difficulty?: string }[] = SIMULATION_SCENARIOS,
): SimulationChartDatum[] {
  const order = ['Beginner', 'Intermediate', 'Advanced'];
  const counts = scenarios.reduce<Record<string, number>>((acc, row) => {
    const key = row.difficulty || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return order.filter((name) => counts[name]).map((name) => ({ name, value: counts[name] }));
}

export function buildOutcomesTrendChart(
  trends: readonly { label: string; completions: number }[] = DEMO_SIMULATION_OUTCOMES.trends,
): SimulationChartDatum[] {
  return trends.map((row) => ({ name: row.label, value: row.completions }));
}

export function buildSafetyTrendChart(
  trends: readonly { label: string; safetyScore: number }[] = DEMO_SIMULATION_OUTCOMES.trends,
): SimulationChartDatum[] {
  return trends.map((row) => ({ name: row.label, value: row.safetyScore }));
}

export function buildCompetencyCoverageChart(
  coverage: readonly {
    competency: string;
    coverage: number;
  }[] = DEMO_SIMULATION_OUTCOMES.competencyCoverage,
): SimulationChartDatum[] {
  return coverage.map((row) => ({ name: row.competency, value: row.coverage }));
}

export function buildCompetencyStatusChart(
  records: readonly { status?: string }[] = DEMO_COMPETENCY_RECORDS,
): SimulationChartDatum[] {
  const counts = records.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function buildCredentialStatusChart(
  records: readonly { status?: string }[] = DEMO_CREDENTIAL_RECORDS,
): SimulationChartDatum[] {
  const counts = records.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function competencyStatusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'completed' || status === 'active') return 'good';
  if (status === 'in-progress' || status === 'needs-practice' || status === 'renewal-due')
    return 'warning';
  return 'neutral';
}

export function credentialStatusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'active') return 'good';
  if (status === 'in-progress' || status === 'renewal-due') return 'warning';
  return 'neutral';
}

export const SIMULATION_CATEGORY_COUNT = SIMULATION_CATEGORIES.length;
