import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchJson = vi.hoisted(() => vi.fn());
const capabilityStatus = vi.hoisted(() => vi.fn(() => 'real'));
const fetchEvaluationDashboard = vi.hoisted(() => vi.fn());
const fetchMemoryDashboard = vi.hoisted(() => vi.fn());
const fetchMyAuditLogs = vi.hoisted(() => vi.fn());

const evaluationDashboard = vi.hoisted(() => ({
  aggregateMetrics: {
    hallucinationRate: 0.03,
    accuracy: 0.93,
    latencyMs: 780,
    retrievalPrecision: 0.89,
    toolExecutionSuccess: 0.99,
    userSatisfaction: 4.6,
    costUsd: 11.5,
  },
  benchmarks: [
    { id: 'accuracy', passed: true },
    { id: 'hallucinationRate', passed: true },
  ],
  trends: [
    {
      label: 'Run 1',
      metrics: {
        hallucinationRate: 0.04,
        accuracy: 0.91,
        retrievalPrecision: 0.86,
        latencyMs: 840,
        costUsd: 12.25,
      },
    },
    {
      label: 'Run 2',
      metrics: {
        hallucinationRate: 0.03,
        accuracy: 0.93,
        retrievalPrecision: 0.89,
        latencyMs: 780,
        costUsd: 11.5,
      },
    },
  ],
}));

vi.mock('../config/backendApiCapabilities', () => ({
  BACKEND_CAPABILITY_STATUS: {
    REAL: 'real',
    DEMO: 'demo',
    DISABLED: 'disabled',
  },
  getBackendCapabilityStatus: (capability) => capabilityStatus(capability),
}));

vi.mock('./apiClient', () => ({
  apiFetchJson: (...args) => apiFetchJson(...args),
  getApiErrorMessage: () => 'API error',
}));

vi.mock('./evaluationApi', () => ({
  EVALUATION_METRICS: [
    { id: 'hallucinationRate', unit: 'percent', benchmarkLabel: '<= 5%' },
    { id: 'accuracy', unit: 'percent' },
    { id: 'latencyMs', unit: 'milliseconds' },
    { id: 'retrievalPrecision', unit: 'percent' },
    { id: 'toolExecutionSuccess', unit: 'percent' },
    { id: 'userSatisfaction', unit: 'score' },
    { id: 'costUsd', unit: 'usd' },
  ],
  LOCAL_EVALUATION_DASHBOARD: evaluationDashboard,
  fetchEvaluationDashboard: (...args) => fetchEvaluationDashboard(...args),
}));

vi.mock('./memoryApi', () => ({
  LOCAL_MEMORY_DASHBOARD: {
    recentActivity: [],
    savedWorkflows: [],
    aiContext: {
      shortTerm: {},
      longTerm: { preferences: [], history: [], savedTools: [] },
      clinical: { findings: [], summaries: [], scores: [] },
    },
  },
  fetchMemoryDashboard: (...args) => fetchMemoryDashboard(...args),
}));

vi.mock('./auditApi', () => ({
  fetchMyAuditLogs: (...args) => fetchMyAuditLogs(...args),
}));

const { fetchAiCommandCenterSnapshot, LOCAL_COST_DASHBOARD } = await import('./aiCommandCenterApi');

describe('aiCommandCenterApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityStatus.mockReturnValue('real');
    fetchEvaluationDashboard.mockResolvedValue({ ok: true, data: evaluationDashboard });
    fetchMemoryDashboard.mockResolvedValue({
      ok: true,
      data: {
        recentActivity: [{ id: 'activity-1' }],
        savedWorkflows: [{ id: 'workflow-1' }],
        aiContext: {
          shortTerm: {
            activeConversation: 'conv-1',
            activeCalculator: null,
            activeDashboard: 'ai',
          },
          longTerm: { preferences: ['compact'], history: ['rag'], savedTools: ['sofa'] },
          clinical: { findings: ['finding'], summaries: [], scores: ['score'] },
        },
      },
    });
    fetchMyAuditLogs.mockResolvedValue({
      ok: true,
      logs: [{ id: 'audit-1', action: 'AI_EVALUATION_VIEWED' }],
      total: 1,
    });
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: {
        totalRequests: 12,
        requestCost: { totalUsd: 4.25, averageUsd: 0.08 },
        tokenCost: { totalUsd: 2.15 },
        cache: { hitRate: 0.5 },
        routeCounts: { lightweight_model: 4, rag: 6, expert_model: 2 },
        complexityCounts: { simple: 4, medium: 6, complex: 2 },
      },
    });
  });

  it('composes evaluation, memory, cost, and audit data into a command snapshot', async () => {
    const snapshot = await fetchAiCommandCenterSnapshot();

    expect(apiFetchJson).toHaveBeenCalledWith('/cost-optimizer/dashboard');
    expect(fetchMyAuditLogs).toHaveBeenCalledWith(6);
    expect(snapshot.health.label).toBe('Healthy');
    expect(snapshot.experts.length).toBeGreaterThan(0);
    expect(snapshot.ragMetrics.retrievalLabel).toBe('89%');
    expect(snapshot.memoryUsage.total).toBe(7);
    expect(snapshot.toolUsage.totalRequests).toBe(12);
    expect(snapshot.sourceStatus).toMatchObject({
      evaluation: 'live',
      memory: 'live',
      cost: 'live',
      audit: 'live',
    });
    expect(snapshot.auditLogs).toHaveLength(1);
  });

  it('falls back to local cost data when cost optimization is disabled', async () => {
    capabilityStatus.mockImplementation((capability) =>
      capability === 'costOptimization' ? 'disabled' : 'real'
    );

    const snapshot = await fetchAiCommandCenterSnapshot();

    expect(apiFetchJson).not.toHaveBeenCalled();
    expect(snapshot.costMetrics.totalUsd).toBe(LOCAL_COST_DASHBOARD.requestCost.totalUsd);
    expect(snapshot.warnings).toContain('Cost optimizer API is disabled.');
  });
});
