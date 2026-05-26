import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiCommandCenterDashboard from './AiCommandCenterDashboard';

vi.mock('./AiCommandCenterDashboard.css', () => ({}));

const commandCenterApiMock = vi.hoisted(() => ({
  fetchAiCommandCenterSnapshot: vi.fn(),
}));

const snapshot = vi.hoisted(() => ({
  generatedAt: '2026-05-26T00:00:00.000Z',
  warnings: [],
  health: {
    status: 'healthy',
    label: 'Healthy',
    latencyMs: 780,
    accuracy: 0.93,
    activeExperts: 8,
    failedBenchmarks: 0,
  },
  experts: [
    {
      id: 'emergency',
      label: 'Emergency',
      specialty: 'Escalation aware',
      active: true,
      load: 42,
      confidence: 94,
    },
    {
      id: 'cardiology',
      label: 'Cardiology',
      specialty: 'ACS, ECG, HF',
      active: true,
      load: 36,
      confidence: 93,
    },
  ],
  ragMetrics: {
    retrievalPrecision: 0.89,
    retrievalLabel: '89%',
    cacheHitRate: 0.5,
    groundedAnswers: 8,
  },
  memoryUsage: {
    shortTerm: 2,
    longTerm: 3,
    clinical: 2,
    recentActivity: 1,
    savedWorkflows: 1,
    total: 7,
  },
  toolUsage: {
    totalRequests: 12,
    routeCounts: { lightweight_model: 4, rag: 6, expert_model: 2 },
    complexityCounts: { simple: 4, medium: 6, complex: 2 },
    successRate: 0.99,
    successLabel: '99%',
  },
  toolCalls: [
    {
      id: 'tool-call-rag',
      route: 'rag',
      label: 'rag',
      count: 6,
      complexity: 'medium',
      status: 'active',
    },
  ],
  costMetrics: {
    totalUsd: 4.25,
    averageUsd: 0.08,
    tokenTotalUsd: 2.15,
    cacheHitRate: 0.5,
  },
  hallucinationMetrics: {
    rate: 0.03,
    label: '3%',
    benchmark: '<= 5%',
  },
  retrievalQuality: {
    precision: 0.89,
    label: '89%',
    trend: [
      { label: 'Run 1', value: 86 },
      { label: 'Run 2', value: 89 },
    ],
  },
  trends: [
    { label: 'Run 1', accuracy: 91, hallucination: 4, retrieval: 86, latency: 840, cost: 12.25 },
    { label: 'Run 2', accuracy: 93, hallucination: 3, retrieval: 89, latency: 780, cost: 11.5 },
  ],
  auditLogs: [
    {
      id: 'audit-1',
      action: 'AI_EVALUATION_VIEWED',
      resource: 'evaluation dashboard',
      timestamp: '2026-05-26T00:00:00.000Z',
    },
  ],
}));

vi.mock('../services/aiCommandCenterApi', () => ({
  AI_COMMAND_CENTER_REFRESH_MS: 15000,
  fetchAiCommandCenterSnapshot: commandCenterApiMock.fetchAiCommandCenterSnapshot,
  formatCommandMetric: (metricId, value) => {
    if (metricId === 'accuracy') return `${Math.round(value * 100)}%`;
    if (metricId === 'latencyMs') return `${Math.round(value)} ms`;
    return String(value);
  },
}));

vi.mock('../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({
    isRagEnabled: true,
    availableTools: [{ id: 'tool-1' }, { id: 'tool-2' }],
    aiUsage: { remaining: 7 },
  }),
}));

describe('AiCommandCenterDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commandCenterApiMock.fetchAiCommandCenterSnapshot.mockResolvedValue(snapshot);
  });

  it('renders all AI command center panels and charts', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    render(<AiCommandCenterDashboard />);

    expect(screen.getByRole('heading', { level: 1, name: /ai command center/i })).toBeVisible();
    expect((await screen.findAllByText('Healthy')).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /ai health/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /active experts/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /retrieval metrics/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /memory usage/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /tool calls/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /cost metrics/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /hallucination monitoring/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /retrieval quality/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /audit logs/i })).toBeVisible();
    expect(screen.getByRole('img', { name: /ai accuracy trend/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /expert load chart/i })).toBeInTheDocument();
    expect(screen.getByText('medium complexity')).toBeVisible();
    expect(screen.getByText('AI_EVALUATION_VIEWED')).toBeVisible();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
    setIntervalSpy.mockRestore();
  });

  it('supports manual live refresh', async () => {
    const user = userEvent.setup();
    render(<AiCommandCenterDashboard />);

    await screen.findAllByText('Healthy');
    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(commandCenterApiMock.fetchAiCommandCenterSnapshot).toHaveBeenCalledTimes(2));
  });
});
