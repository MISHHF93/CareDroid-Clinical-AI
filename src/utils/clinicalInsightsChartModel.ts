import { KNOWLEDGE_GRAPH_NODE_TYPES } from '../data/clinicalKnowledgeGraph';
import { getResearchHubSnapshot } from '../data/researchEvidenceHub';
import { LOCAL_COST_DASHBOARD } from '../services/aiCommandCenterApi';
import { LOCAL_EVALUATION_DASHBOARD } from '../services/evaluationApi';

export type InsightChartDatum = Readonly<{ name: string; value: number }>;

export function buildCdsSignalRiskChart(
  signals: readonly { risk?: string }[] = [],
): InsightChartDatum[] {
  const counts = signals.reduce<Record<string, number>>((acc, signal) => {
    const key = signal.risk || 'low';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function buildResearchSectionChart(snapshot = getResearchHubSnapshot()): InsightChartDatum[] {
  return [
    { name: 'Literature', value: snapshot.literatureCount },
    { name: 'Guidelines', value: snapshot.guidelineCount },
    { name: 'Summaries', value: snapshot.evidenceSummaryCount },
    { name: 'Studies', value: snapshot.trackedStudyCount },
    { name: 'Citations', value: snapshot.citationCount },
  ];
}

export function buildKnowledgeGraphTypeChart(
  counts: Record<string, number> = {},
): InsightChartDatum[] {
  return KNOWLEDGE_GRAPH_NODE_TYPES.map((type) => ({
    name: type,
    value: counts[type] || 0,
  })).filter((row) => row.value > 0);
}

export function buildCostRouteChart(
  routeCounts: Record<string, number> = LOCAL_COST_DASHBOARD.routeCounts,
): InsightChartDatum[] {
  return Object.entries(routeCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));
}

export function buildEvaluationQualityChart(
  trends: readonly { label: string; metrics: { modelQuality?: number } }[] = LOCAL_EVALUATION_DASHBOARD.trends,
): InsightChartDatum[] {
  return trends.map((row) => ({
    name: row.label,
    value: Math.round((row.metrics.modelQuality || 0) * 100),
  }));
}

export function buildEvaluationLatencyChart(
  trends: readonly { label: string; metrics: { latencyMs?: number } }[] = LOCAL_EVALUATION_DASHBOARD.trends,
): InsightChartDatum[] {
  return trends.map((row) => ({
    name: row.label,
    value: row.metrics.latencyMs || 0,
  }));
}

export function riskLevelTone(risk: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (risk === 'low') return 'good';
  if (risk === 'moderate') return 'warning';
  if (risk === 'high') return 'warning';
  if (risk === 'critical') return 'critical';
  return 'neutral';
}

export const DEMO_MEMORY_ACTIVITY = Object.freeze([
  { id: 'mem-1', label: 'qSOFA calculator session', detail: 'Sepsis risk context', time: '18m ago' },
  { id: 'mem-2', label: 'Lab interpreter prompt', detail: 'Critical potassium review', time: '42m ago' },
  { id: 'mem-3', label: 'Simulation debrief', detail: 'Sepsis deterioration scenario', time: '2h ago' },
  { id: 'mem-4', label: 'Protocol library search', detail: 'Stroke alert pathway', time: '4h ago' },
]);

export const DEMO_MEMORY_WORKFLOWS = Object.freeze([
  { id: 'wf-1', label: 'Chest pain risk stratification', status: 'saved' },
  { id: 'wf-2', label: 'Critical lab escalation checklist', status: 'pinned' },
]);