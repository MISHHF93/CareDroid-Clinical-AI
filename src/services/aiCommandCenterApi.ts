import {
  getBackendCapabilityStatus,
  BACKEND_CAPABILITY_STATUS,
} from '../config/backendApiCapabilities';
import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { fetchMyAuditLogs } from './auditApi';
import {
  EVALUATION_METRICS,
  LOCAL_EVALUATION_DASHBOARD,
  fetchEvaluationDashboard,
} from './evaluationApi';
import { LOCAL_MEMORY_DASHBOARD, fetchMemoryDashboard } from './memoryApi';
import {
  LOCAL_UNIFIED_AI_NODE_HEALTH,
  fetchUnifiedAiNodeModelsHealth,
  type UnifiedAiNodeModelsHealth,
} from './unifiedAiNodeApi';

export const AI_COMMAND_CENTER_REFRESH_MS = 15000;

export const AI_EXPERTS = Object.freeze([
  { id: 'emergency', label: 'Emergency', specialty: 'Escalation aware', tone: 'critical' },
  { id: 'cardiology', label: 'Cardiology', specialty: 'ACS, ECG, HF', tone: 'good' },
  { id: 'pulmonology', label: 'Pulmonology', specialty: 'COPD, oxygen, ABG', tone: 'good' },
  { id: 'nephrology', label: 'Nephrology', specialty: 'AKI, CKD, electrolytes', tone: 'neutral' },
  { id: 'radiology', label: 'Radiology', specialty: 'Imaging review', tone: 'neutral' },
  { id: 'psychiatry', label: 'Psychiatry', specialty: 'Screening and safety', tone: 'warning' },
  { id: 'pharmacy', label: 'Pharmacy', specialty: 'Drug safety', tone: 'good' },
  { id: 'guidelines', label: 'Guidelines', specialty: 'RAG grounding', tone: 'good' },
]);

export const LOCAL_COST_DASHBOARD = Object.freeze({
  generatedAt: new Date().toISOString(),
  totalRequests: 42,
  requestCost: {
    lastUsd: 0.031,
    totalUsd: 12.48,
    averageUsd: 0.018,
  },
  tokenCost: {
    lastUsd: 0.014,
    totalUsd: 7.36,
    averageUsd: 0.011,
  },
  cache: {
    hits: 18,
    misses: 24,
    hitRate: 0.43,
  },
  routeCounts: {
    lightweight_model: 21,
    rag: 15,
    expert_model: 6,
  },
  complexityCounts: {
    simple: 21,
    medium: 15,
    complex: 6,
  },
});

function metricDefinition(metricId) {
  return EVALUATION_METRICS.find((metric) => metric.id === metricId);
}

export function formatCommandMetric(metricId, value) {
  const metric = metricDefinition(metricId);
  if (!metric) return String(value ?? '');
  if (metric.unit === 'percent') return `${Math.round(Number(value || 0) * 100)}%`;
  if (metric.unit === 'milliseconds') return `${Math.round(Number(value || 0))} ms`;
  if (metric.unit === 'usd') return `$${Number(value || 0).toFixed(2)}`;
  return `${Number(value || 0).toFixed(2)}/5`;
}

async function fetchCostDashboard() {
  if (getBackendCapabilityStatus('costOptimization') === BACKEND_CAPABILITY_STATUS.DISABLED) {
    return {
      ok: false,
      data: LOCAL_COST_DASHBOARD,
      message: 'Cost optimizer API is disabled.',
    };
  }

  let response;
  try {
    const result = await apiFetchJson('/cost-optimizer/dashboard');
    response = result.response;
    if (!response.ok) {
      return {
        ok: false,
        data: LOCAL_COST_DASHBOARD,
        message: getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data: result.data || LOCAL_COST_DASHBOARD, message: '' };
  } catch (error: any) {
    return {
      ok: false,
      data: LOCAL_COST_DASHBOARD,
      message: getApiErrorMessage(error, response),
    };
  }
}

function percent(value) {
  return Math.round(Number(value || 0) * 100);
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countObjectValues(value) {
  if (!value || typeof value !== 'object') return 0;
  return Object.values(value).filter(Boolean).length;
}

function sumCounts(value: any = {}) {
  return Object.values(value).reduce<number>((sum, count) => sum + Number(count || 0), 0);
}

function buildExpertRows(costDashboard, evaluationDashboard) {
  const routeTotal = Math.max(1, sumCounts(costDashboard.routeCounts));
  const accuracy = percent(evaluationDashboard.aggregateMetrics?.accuracy);
  const retrieval = percent(evaluationDashboard.aggregateMetrics?.retrievalPrecision);

  return AI_EXPERTS.map((expert, index) => {
    const active = index < 5 || expert.id === 'guidelines';
    const load = Math.min(99, Math.max(18, Math.round((routeTotal * (index + 2)) % 87)));
    const confidence = Math.max(
      70,
      Math.min(99, accuracy - index + (expert.id === 'guidelines' ? retrieval - 88 : 0))
    );

    return {
      ...expert,
      active,
      load,
      confidence,
    };
  });
}

function buildMemoryUsage(memoryDashboard) {
  const context = memoryDashboard.aiContext || LOCAL_MEMORY_DASHBOARD.aiContext;
  const shortTerm = countObjectValues(context.shortTerm);
  const longTerm =
    countArray(context.longTerm?.preferences) +
    countArray(context.longTerm?.history) +
    countArray(context.longTerm?.savedTools);
  const clinical =
    countArray(context.clinical?.findings) +
    countArray(context.clinical?.summaries) +
    countArray(context.clinical?.scores);

  return {
    shortTerm,
    longTerm,
    clinical,
    recentActivity: countArray(memoryDashboard.recentActivity),
    savedWorkflows: countArray(memoryDashboard.savedWorkflows),
    total: shortTerm + longTerm + clinical,
  };
}

function buildToolUsage(costDashboard, evaluationDashboard) {
  const totalRequests = Number(costDashboard.totalRequests || 0);
  const routeCounts = costDashboard.routeCounts || {};

  return {
    totalRequests,
    routeCounts,
    complexityCounts: costDashboard.complexityCounts || {},
    successRate: evaluationDashboard.aggregateMetrics?.toolExecutionSuccess || 0,
    successLabel: formatCommandMetric(
      'toolExecutionSuccess',
      evaluationDashboard.aggregateMetrics?.toolExecutionSuccess
    ),
  };
}

function buildToolCalls(costDashboard) {
  const routeCounts = costDashboard.routeCounts || {};
  const complexityCounts = costDashboard.complexityCounts || {};
  const generatedAt = costDashboard.generatedAt || new Date().toISOString();

  return Object.entries(routeCounts)
    .sort(([, a], [, b]) => Number(b as any || 0) - Number(a as any || 0))
    .map(([route, count], index) => {
      const complexity =
        Object.entries(complexityCounts).sort(([, a], [, b]) => Number(b as any || 0) - Number(a as any || 0))[
          index
        ]?.[0] || 'mixed';
      return {
        id: `tool-call-${route}`,
        route,
        label: route.replace(/_/g, ' '),
        count: Number(count || 0),
        complexity,
        status: Number(count || 0) > 0 ? 'active' : 'idle',
        updatedAt: generatedAt,
      };
    })
    .slice(0, 8);
}

function buildTrendRows(evaluationDashboard) {
  return (evaluationDashboard.trends || []).map((point) => ({
    label: point.label,
    accuracy: percent(point.metrics?.accuracy),
    hallucination: percent(point.metrics?.hallucinationRate),
    retrieval: percent(point.metrics?.retrievalPrecision),
    latency: Math.round(Number(point.metrics?.latencyMs || 0)),
    cost: Number(point.metrics?.costUsd || 0),
  }));
}

function buildWarnings(results) {
  return results
    .filter((result) => !result.ok && result.message)
    .map((result) => result.message)
    .slice(0, 3);
}

export async function fetchAiCommandCenterSnapshot() {
  const [evaluationResult, memoryResult, costResult, auditResult, unifiedNodeResult] =
    await Promise.all([
      fetchEvaluationDashboard(),
      fetchMemoryDashboard(),
      fetchCostDashboard(),
      fetchMyAuditLogs(6),
      fetchUnifiedAiNodeModelsHealth(),
    ]);

  const evaluationDashboard = (evaluationResult as any).data || LOCAL_EVALUATION_DASHBOARD;
  const memoryDashboard = (memoryResult as any).data || LOCAL_MEMORY_DASHBOARD;
  const costDashboard = (costResult as any).data || LOCAL_COST_DASHBOARD;
  const auditLogs = (auditResult as any).ok ? (auditResult as any).logs || [] : [];
  const unifiedNode: UnifiedAiNodeModelsHealth =
    (unifiedNodeResult as any).data || LOCAL_UNIFIED_AI_NODE_HEALTH;
  const metrics =
    evaluationDashboard.aggregateMetrics || LOCAL_EVALUATION_DASHBOARD.aggregateMetrics;
  const failedBenchmarks = (evaluationDashboard.benchmarks || []).filter(
    (benchmark) => !benchmark.passed
  );
  const warnings = buildWarnings([
    evaluationResult,
    memoryResult,
    costResult,
    auditResult,
    unifiedNodeResult,
  ]);

  const nodeComposite =
    unifiedNode.scores?.composite ??
    (typeof unifiedNode.scores?.nluAccuracy === 'number' &&
    typeof unifiedNode.scores?.artifactRouterAccuracy === 'number'
      ? (unifiedNode.scores.nluAccuracy + unifiedNode.scores.artifactRouterAccuracy) / 2
      : null);

  return {
    ok: warnings.length === 0,
    generatedAt: new Date().toISOString(),
    warnings,
    sourceStatus: {
      evaluation: evaluationResult.ok ? 'live' : 'fallback',
      memory: memoryResult.ok ? 'live' : 'fallback',
      cost: costResult.ok ? 'live' : 'fallback',
      audit: auditResult.ok ? 'live' : 'fallback',
      unifiedNode: unifiedNodeResult.ok ? 'live' : 'fallback',
    },
    /** CareDroid 1-node local ML backbone (NLU + artifact-router). */
    unifiedNode: {
      ...unifiedNode,
      composite: nodeComposite,
      nluLabel:
        typeof unifiedNode.scores?.nluAccuracy === 'number'
          ? `${Math.round(unifiedNode.scores.nluAccuracy * 1000) / 10}%`
          : '—',
      artifactLabel:
        typeof unifiedNode.scores?.artifactRouterAccuracy === 'number'
          ? `${Math.round(unifiedNode.scores.artifactRouterAccuracy * 1000) / 10}%`
          : '—',
      compositeLabel:
        typeof nodeComposite === 'number' ? `${Math.round(nodeComposite * 1000) / 10}%` : '—',
    },
    health: {
      status: failedBenchmarks.length
        ? 'review'
        : warnings.length || unifiedNode.status === 'degraded'
          ? 'degraded'
          : 'healthy',
      label: failedBenchmarks.length
        ? 'Review'
        : warnings.length || unifiedNode.status === 'degraded'
          ? 'Degraded'
          : 'Healthy',
      latencyMs: metrics.latencyMs || 0,
      accuracy: metrics.accuracy || 0,
      activeExperts: AI_EXPERTS.length,
      failedBenchmarks: failedBenchmarks.length,
      unifiedNodeReady: Boolean(unifiedNode.ready || unifiedNode.status === 'ready'),
      unifiedNodeId: unifiedNode.nodeId,
    },
    experts: buildExpertRows(costDashboard, evaluationDashboard),
    ragMetrics: {
      retrievalPrecision: metrics.retrievalPrecision || 0,
      retrievalLabel: formatCommandMetric('retrievalPrecision', metrics.retrievalPrecision),
      cacheHitRate: costDashboard.cache?.hitRate || 0,
      groundedAnswers: Math.max(
        0,
        sumCounts(costDashboard.routeCounts) -
          Number(costDashboard.routeCounts?.lightweight_model || 0)
      ),
    },
    memoryUsage: buildMemoryUsage(memoryDashboard),
    toolUsage: buildToolUsage(costDashboard, evaluationDashboard),
    toolCalls: buildToolCalls(costDashboard),
    costMetrics: {
      totalUsd: Number(costDashboard.requestCost?.totalUsd || 0),
      averageUsd: Number(costDashboard.requestCost?.averageUsd || 0),
      tokenTotalUsd: Number(costDashboard.tokenCost?.totalUsd || 0),
      cacheHitRate: costDashboard.cache?.hitRate || 0,
    },
    hallucinationMetrics: {
      rate: metrics.hallucinationRate || 0,
      label: formatCommandMetric('hallucinationRate', metrics.hallucinationRate),
      benchmark: metricDefinition('hallucinationRate')?.benchmarkLabel || '<= 5%',
    },
    retrievalQuality: {
      precision: metrics.retrievalPrecision || 0,
      label: formatCommandMetric('retrievalPrecision', metrics.retrievalPrecision),
      trend: buildTrendRows(evaluationDashboard).map((row) => ({
        label: row.label,
        value: row.retrieval,
      })),
    },
    trends: buildTrendRows(evaluationDashboard),
    auditLogs,
  };
}
