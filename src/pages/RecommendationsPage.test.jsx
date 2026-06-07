import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecommendationsPage from './RecommendationsPage';

vi.mock('./RecommendationsPage.css', () => ({}));

const pageMocks = vi.hoisted(() => ({
  recordActivity: vi.fn(),
  recordToolAccess: vi.fn(),
  navigateMock: vi.fn(),
  applyRegistryToolLaunch: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => pageMocks.navigateMock,
  };
});

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'user-1', role: 'nurse' } }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: { role: 'nurse', specialty: 'Emergency Medicine' },
    preferences: {},
    activeWorkspace: { id: 'emergency', name: 'Emergency' },
    workspaceState: { activeWorkspaceId: 'emergency' },
    organization: { id: 'org-1', name: 'City Hospital' },
    platformContext: { entitledAssetIds: ['qsofa'] },
    roleProfile: { id: 'nurse', label: 'Nurse' },
    activity: {},
    memoryFabricContext: {},
    recordActivity: pageMocks.recordActivity,
  }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspace: { id: 'emergency', name: 'Emergency' },
    visibleAssetIds: ['qsofa'],
    recommendations: [],
  }),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    pinned: ['qsofa'],
    recentTools: ['qsofa'],
    hiddenTools: [],
    recordToolAccess: pageMocks.recordToolAccess,
  }),
}));

vi.mock('../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    listProductBuilder: vi.fn(async () => ({ products: [] })),
  },
}));

vi.mock('../services/roleIntelligenceTelemetry', () => ({
  trackRoleAiRequest: vi.fn(),
  trackRoleSearchBehavior: vi.fn(),
  trackRoleWorkflowLaunch: vi.fn(),
}));

vi.mock('../navigation/registryToolLaunch', () => ({
  applyRegistryToolLaunch: pageMocks.applyRegistryToolLaunch,
  getRegistryToolNavigation: vi.fn(() => ({ pathname: '/tools/calculators/qsofa', search: '' })),
}));

vi.mock('../data/recommendationEngine', () => ({
  RECOMMENDATION_GROUPS: [
    { id: 'tools', label: 'Tools' },
    { id: 'packs', label: 'Packs' },
    { id: 'products', label: 'Products' },
    { id: 'aiAgents', label: 'AI Agents' },
    { id: 'simulations', label: 'Simulations' },
    { id: 'protocols', label: 'Protocols' },
  ],
  buildRecommendationEngine: vi.fn(() => ({
    profile: { roleLabel: 'Nurse', workspaceLabel: 'Emergency' },
    summary: {
      total: 6,
      groups: { tools: 1, packs: 1, products: 1, aiAgents: 1, simulations: 1, protocols: 1 },
    },
    groups: {
      tools: [
        {
          id: 'tools-qsofa',
          type: 'tools',
          title: 'qSOFA',
          summary: 'Sepsis screening calculator',
          route: '/tools/calculators/qsofa',
          score: 92,
          reason: 'Nurse role fit',
          reasons: ['Nurse role fit'],
          sourceSignals: ['role', 'asset-usage'],
          item: { id: 'qsofa' },
        },
      ],
      packs: [
        {
          id: 'packs-sepsis',
          type: 'packs',
          title: 'Sepsis Pack',
          summary: 'Sepsis tools and workflows',
          route: '/asset-packs',
          score: 88,
          reason: 'Workspace fit',
          sourceSignals: ['organization'],
          item: { id: 'pack-sepsis', category: 'asset-packs' },
        },
      ],
      products: [
        {
          id: 'products-emergency',
          type: 'products',
          title: 'Emergency Suite',
          summary: 'Emergency product bundle',
          route: '/products/emergency-suite',
          score: 84,
          reason: 'Organization fit',
          sourceSignals: ['product'],
          item: { id: 'product-emergency' },
        },
      ],
      aiAgents: [
        {
          id: 'aiAgents-copilot',
          type: 'aiAgents',
          title: 'Clinical Copilot',
          summary: 'AI agent for clinical work',
          route: '/agents',
          score: 82,
          reason: 'AI usage fit',
          sourceSignals: ['ai-agents'],
          item: { id: 'agent-clinical' },
        },
      ],
      simulations: [
        {
          id: 'simulations-sepsis',
          type: 'simulations',
          title: 'Sepsis Simulation',
          summary: 'Deterioration scenario',
          route: '/simulation/sepsis',
          score: 80,
          reason: 'Training fit',
          sourceSignals: ['simulation'],
          item: { id: 'sepsis' },
        },
      ],
      protocols: [
        {
          id: 'protocols-sepsis',
          type: 'protocols',
          title: 'Sepsis Protocol',
          summary: 'Bundle pathway',
          route: '/protocols?protocol=sepsis',
          score: 78,
          reason: 'Protocol fit',
          sourceSignals: ['protocol'],
          item: { id: 'sepsis' },
        },
      ],
    },
  })),
}));

describe('RecommendationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders grouped recommendations for every output type', async () => {
    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /recommended capabilities/i })).toBeInTheDocument();
    expect(screen.getByText('qSOFA')).toBeVisible();
    expect(screen.getByText('Sepsis Pack')).toBeVisible();
    expect(screen.getByText('Emergency Suite')).toBeVisible();
    expect(screen.getByText('Clinical Copilot')).toBeVisible();
    expect(screen.getByText('Sepsis Simulation')).toBeVisible();
    expect(screen.getByText('Sepsis Protocol')).toBeVisible();

    await waitFor(() => expect(screen.getByLabelText(/recommendation filters/i)).toBeInTheDocument());
  });

  it('opens tool recommendations through registry launch plumbing', async () => {
    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('qSOFA')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: /open tool/i }));

    expect(pageMocks.applyRegistryToolLaunch).toHaveBeenCalledWith(
      'qsofa',
      expect.objectContaining({
        navigate: pageMocks.navigateMock,
        recordToolAccess: pageMocks.recordToolAccess,
        replace: false,
      }),
    );
    expect(pageMocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recommendation_opened',
        title: 'qSOFA',
      }),
    );
  });
});
