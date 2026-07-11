import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformAnalyticsPage } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./OrganizationPages.css', () => ({}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-1', name: 'Demo Hospital' },
    platformContext: {
      availablePacks: [{ id: 'core-platform', name: 'Core Platform', assetIds: ['qsofa'] }],
    },
  }),
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    branding: {},
    integrations: [],
    subscription: {},
    tenant: {},
    supportedOrganizationTypes: [],
    refreshOrganizationEngine: vi.fn(),
    saveOrganizationSettings: vi.fn(),
  }),
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getOrganizationAnalytics: vi.fn(),
  },
}));

const analytics = {
  enabledPackCount: 1,
  aiSessionCount: 3,
  auditEventCount: 8,
  dashboards: {
    adoption: {
      enabledPackCount: 1,
      enabledAssetCount: 4,
      totalAssetCount: 10,
      adoptionScore: 40,
    },
    engagement: {
      totalUsageEvents: 15,
      aiUsageCount: 3,
      searchQueryCount: 4,
      simulationCompletionCount: 1,
      dashboardEngagementCount: 2,
      launchCount: 9,
      averageDurationSeconds: 120,
      repeatUsageCount: 2,
      abandonmentCount: 1,
      recommendationsAcceptedCount: 1,
      workflowCompletionCount: 1,
    },
    underusedAssets: [
      {
        id: 'news2',
        label: 'NEWS2',
        count: 3,
        metadata: { assetType: 'calculator', usefulnessScore: 8, decision: 'improve' },
      },
    ],
    unusedAssets: [{ id: 'unused-tool', label: 'Unused Tool', count: 0 }],
    mergeCandidates: [
      {
        id: 'news2',
        label: 'NEWS2',
        count: 3,
        metadata: {
          assetType: 'calculator',
          usefulnessScore: 8,
          decision: 'merge',
          mergeTargetLabel: 'qSOFA',
        },
      },
    ],
    topAssets: [
      {
        id: 'qsofa',
        label: 'qSOFA',
        count: 5,
        metadata: { assetType: 'calculator', usefulnessScore: 43, decision: 'monitor' },
      },
    ],
  },
  dimensions: {
    assetUsage: [{ id: 'qsofa', label: 'qSOFA', count: 5 }],
    assetIntelligence: [
      {
        id: 'qsofa',
        label: 'qSOFA',
        count: 5,
        metadata: { assetType: 'calculator', usefulnessScore: 43, decision: 'monitor' },
      },
    ],
    packUsage: [{ id: 'core-platform', label: 'Core Platform', count: 11 }],
    roleUsage: [{ id: 'clinician', label: 'clinician', count: 12 }],
    workspaceUsage: [{ id: 'emergency', label: 'emergency', count: 12 }],
    aiUsage: [{ id: 'agent-clinical', label: 'CareDroid', count: 3 }],
    searchQueries: [{ id: 'search', label: 'search', count: 4 }],
    simulationCompletion: [{ id: 'simulation-suite', label: 'Simulation Suite', count: 1 }],
    dashboardEngagement: [{ id: 'dashboard', label: 'Command Center', count: 2 }],
  },
};

describe('PlatformAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PlatformAssetsApi.getOrganizationAnalytics).mockResolvedValue(analytics);
  });

  it('renders adoption, engagement, underused asset, and top asset dashboards', async () => {
    render(<PlatformAnalyticsPage />);

    expect(await screen.findByRole('heading', { name: /platform analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^adoption$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^engagement$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^top assets$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^underused assets$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^unused assets$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^merge candidates$/i })).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Launches')).toBeInTheDocument();
    expect(screen.getByText('2m')).toBeInTheDocument();
    expect(screen.getAllByText('qSOFA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NEWS2').length).toBeGreaterThan(0);
    expect(screen.getByText('Unused Tool')).toBeInTheDocument();
    expect(screen.getByText('Merge into qSOFA')).toBeInTheDocument();
    expect(screen.getByText('CareDroid')).toBeInTheDocument();
    expect(screen.getByText('Simulation Suite')).toBeInTheDocument();
    expect(screen.getByText('Command Center')).toBeInTheDocument();
  });
});
