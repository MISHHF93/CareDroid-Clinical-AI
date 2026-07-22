import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AiCommandCenterDashboard from './AiCommandCenterDashboard';
import { fetchAiCommandCenterSnapshot } from '../../services/aiCommandCenterApi';

vi.mock('../../services/aiCommandCenterApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/aiCommandCenterApi')>();
  return {
    ...actual,
    fetchAiCommandCenterSnapshot: vi.fn(),
  };
});

const BASE_SNAPSHOT = {
  ok: true,
  generatedAt: new Date().toISOString(),
  warnings: [] as string[],
  sourceStatus: { evaluation: 'live', memory: 'live', cost: 'live', audit: 'live' },
  health: {
    status: 'healthy',
    label: 'Healthy',
    latencyMs: 812,
    accuracy: 0.93,
    activeExperts: 3,
    failedBenchmarks: 0,
  },
  experts: [],
  ragMetrics: {
    retrievalPrecision: 0.9,
    retrievalLabel: '90%',
    cacheHitRate: 0.5,
    groundedAnswers: 2,
  },
  memoryUsage: {
    shortTerm: 1,
    longTerm: 1,
    clinical: 1,
    recentActivity: 1,
    savedWorkflows: 1,
    total: 3,
  },
  toolUsage: {
    totalRequests: 4,
    routeCounts: {},
    complexityCounts: {},
    successRate: 1,
    successLabel: '100%',
  },
  costMetrics: { totalUsd: 1, averageUsd: 0.1, tokenTotalUsd: 0.5, cacheHitRate: 0.5 },
  hallucinationMetrics: { rate: 0.02, label: '2%', benchmark: '<= 5%' },
  retrievalQuality: { precision: 0.9, label: '90%', trend: [] },
  trends: [],
  auditLogs: [],
  unifiedNode: {
    ready: true,
    status: 'ready',
    nodeId: 'caredroid-unified-ai-node',
    nluLabel: '100%',
    artifactLabel: '94.5%',
    compositeLabel: '97.3%',
    singleNode: true,
    quarantine: 'none',
    source: 'live',
    embeddingModel: 'Xenova/all-mpnet-base-v2',
    registryModelId: 'mdl-unified-ai-node-v1',
  },
};

const mockedFetch = vi.mocked(fetchAiCommandCenterSnapshot);

describe('AiCommandCenterDashboard', () => {
  it('shows a loading shell before the snapshot resolves', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    render(<AiCommandCenterDashboard />);
    expect(screen.getByText(/Loading AI Command Center/)).toBeInTheDocument();
  });

  it('renders the Unified AI Node section once the snapshot loads', async () => {
    mockedFetch.mockResolvedValue(BASE_SNAPSHOT as any);
    render(<AiCommandCenterDashboard />);

    await waitFor(() => {
      expect(screen.getByText('CareDroid Unified AI Node')).toBeInTheDocument();
    });

    expect(screen.getByText('caredroid-unified-ai-node')).toBeInTheDocument();
    expect(screen.getByText('97.3%')).toBeInTheDocument();
  });

  it('surfaces a degraded-source warning banner when the snapshot reports one', async () => {
    mockedFetch.mockResolvedValue({
      ...BASE_SNAPSHOT,
      warnings: ['memory dashboard fell back to local data'],
    } as any);
    render(<AiCommandCenterDashboard />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('memory dashboard fell back to local data');
  });

  it('omits the Unified AI Node section when the snapshot has no node data', async () => {
    const { unifiedNode: _unifiedNode, ...withoutNode } = BASE_SNAPSHOT;
    mockedFetch.mockResolvedValue(withoutNode as any);
    render(<AiCommandCenterDashboard />);

    await waitFor(() => {
      expect(screen.getByText('AI Command Center')).toBeInTheDocument();
    });
    expect(screen.queryByText('CareDroid Unified AI Node')).not.toBeInTheDocument();
  });
});
