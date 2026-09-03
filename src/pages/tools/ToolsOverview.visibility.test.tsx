import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolsOverview from './ToolsOverview';
import { PractitionerVisibilityProvider } from '../../contexts/PractitionerVisibilityContext';
import { getUserFacingToolRegistryProjection, TOOL_SURFACES } from '../../data/toolInventory';
import { phantomToolReferences } from '../../data/sourceCodeToolDiscovery';
import {
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
  mockWorkspaceValue,
} from '../../test/testRenderUtils';
import { setPlatformEntitlementContext } from '../../data/assetEntitlements';

const navigateMock = vi.fn();
const fetchToolExecutorCatalogMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('./ToolsOverview.css', () => ({}));

vi.mock('../../services/clinicalToolsApi', () => ({
  fetchToolExecutorCatalog: (...args) => fetchToolExecutorCatalogMock(...args),
}));

vi.mock('./Calculators', () => ({
  default: ({ initialCalculatorId, embedded }) => (
    <div data-testid="embedded-calculators">
      {initialCalculatorId}:{embedded ? 'embedded' : 'standalone'}
    </div>
  ),
}));

vi.mock('./LabInterpreter', () => ({
  default: ({ embedded }) => (
    <div data-testid="embedded-lab-interpreter">
      lab-interp:{embedded ? 'embedded' : 'standalone'}
    </div>
  ),
}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspaceValue,
}));

vi.mock('../../contexts/UserContext', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

const mockUserIdentityValue = {
  operationalProfile: null,
  account: null,
  preferences: null,
  workspaceState: null,
  activeWorkspace: null,
  workspaces: [],
  activity: null,
  aiPersonalization: null,
  security: null,
  audit: null,
  saasProfile: { role: 'admin', subscriptionEntitlements: ['core-platform', 'platform-admin'] },
  effectiveProfile: null,
  accessSummary: null,
  isLoading: false,
  error: '',
  refreshIdentity: vi.fn(),
  switchWorkspace: vi.fn(),
  savePreferences: vi.fn(),
  updateProfile: vi.fn(),
  recordActivity: vi.fn(),
  hasEffectivePermission: () => true,
  platformContext: null,
  refreshPlatformContext: vi.fn(),
  memoryFabricContext: null,
  refreshMemoryFabricContext: vi.fn(),
  organization: null,
  roleProfile: { id: 'admin' } as { id: string } | null,
  entitledAssetIds: [],
  entitledPackIds: ['core-platform', 'platform-admin'],
  allowedWorkspaces: [],
  enabledAssetPacks: [],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
};

vi.mock('../../contexts/UserIdentityContext', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useUserIdentity: () => mockUserIdentityValue,
  };
});

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({ role: 'physician' }),
}));

vi.mock('../../hooks/useRouteScreenMode', () => ({
  default: () => 'clinical_workstation',
}));

vi.mock('../../config/practitionerCleanup.config', async () => {
  const actual = await vi.importActual('../../config/practitionerCleanup.config');
  return {
    ...actual,
    isPractitionerCleanupEnabled: () => false,
  };
});

vi.mock('../../config/unified-navigation.config', async () => {
  const actual = (await vi.importActual('../../config/unified-navigation.config')) as any;
  return {
    ...actual,
    PILOT_CUSTOMER_MODE: Object.freeze({
      ...actual.PILOT_CUSTOMER_MODE,
      enabled: false,
    }),
  };
});

function renderOverview(route = '/tools') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <PractitionerVisibilityProvider>
        <ToolsOverview />
      </PractitionerVisibilityProvider>
    </MemoryRouter>,
  );
}

const FILTER_TAB_LABELS = Object.freeze({
  calculator: 'Calculators',
  'ai-workflows': 'AI Workflows',
  operations: 'Operations',
  all: 'All',
});

function showAllTools() {
  selectFilter('all');
}

function selectFilter(filter) {
  const combobox = screen.queryByRole('combobox', { name: /filter tools by type/i });
  if (combobox) {
    fireEvent.change(combobox, { target: { value: filter } });
    return;
  }
  const tabLabel = FILTER_TAB_LABELS[filter] || filter;
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${tabLabel}$`, 'i') }));
}

function toolCard(container, id) {
  return container.querySelector(`[data-tool-id="${id}"]`);
}

function openTool(container, id) {
  const card = toolCard(container, id);
  expect(card, id).toBeTruthy();
  const launchButton = card.querySelector('.btn-open-tool');
  expect(launchButton, id).toBeTruthy();
  fireEvent.click(launchButton);
}

function matchesToolFilter(record, filter) {
  if (filter === 'calculator') {
    return (
      record.surface !== 'hub' &&
      (record.category === 'Calculator' || record.surface === TOOL_SURFACES.CALCULATOR_FORM)
    );
  }
  if (filter === 'ai-workflows') {
    return (
      ['AI Tools', 'Diagnostic'].includes(record.category) ||
      record.launchType === 'chat-assisted' ||
      record.launchType === 'backend-backed' ||
      /ai|assistant|workflow|scribe|summary|order set|timeline/i.test(
        `${record.name} ${record.description}`,
      )
    );
  }
  if (filter === 'operations') {
    return (
      ['Fleet', 'IoT', 'Hospital Operations'].includes(record.category) ||
      ['fleet-page', 'iot-dashboard', 'hospital-operations'].includes(record.surface) ||
      /fleet|operations|dispatch|device|hospital map|live map|digital twin/i.test(
        `${record.name} ${record.description}`,
      )
    );
  }
  return true;
}

describe('ToolsOverview complete visibility, search, filters, and launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPlatformEntitlementContext(null);
    mockUserIdentityValue.roleProfile = { id: 'admin' };
    mockUserIdentityValue.saasProfile = {
      role: 'admin',
      subscriptionEntitlements: ['core-platform', 'platform-admin'],
    };
    fetchToolExecutorCatalogMock.mockResolvedValue({
      ok: true,
      data: {
        registeredExecutorToolIds: ['sofa-calculator', 'drug-interactions', 'lab-interpreter'],
        registryIdToExecutor: {
          'drug-check': 'drug-interactions',
          'lab-interp': 'lab-interpreter',
          'sofa-score': 'sofa-calculator',
        },
        unsupportedTools: [
          {
            nluToolId: 'qsofa',
            registryId: 'qsofa',
            surface: 'calculator-form',
            reason: 'Deterministic client-side calculator; no server executor.',
          },
        ],
      },
      error: null,
    });
    mockWorkspaceValue.workspaces = [{ id: 'all', name: 'All Tools', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'all';
    mockWorkspaceValue.activeWorkspace = { id: 'all', name: 'All Tools', toolIds: [] };
    mockWorkspaceValue.visibleAssetIds = [];
    mockToolPreferencesValue.favorites = [];
    mockToolPreferencesValue.pinned = [];
    mockToolPreferencesValue.recentTools = [];
    mockToolPreferencesValue.hiddenTools = [];
    mockToolPreferencesValue.profileSettings = { permissionLevel: 'admin' };
  });

  it('renders one card per user-facing canonical tool and excludes phantom audit rows', () => {
    const { container } = renderOverview();
    showAllTools();
    const userFacing = getUserFacingToolRegistryProjection();
    const renderedIds = [...container.querySelectorAll('[data-tool-id]')].map((node) =>
      node.getAttribute('data-tool-id'),
    );

    expect(renderedIds).toHaveLength(userFacing.length);
    expect(new Set(renderedIds).size).toBe(renderedIds.length);
    for (const record of userFacing) {
      expect(renderedIds, record.id).toContain(record.id);
      const card = toolCard(container, record.id);
      expect(card?.querySelector('h3')?.textContent?.trim().length, record.id).toBeGreaterThan(0);
      expect(
        card?.querySelector('.tool-description')?.textContent?.trim().length,
        record.id,
      ).toBeGreaterThan(0);
      expect(
        card?.querySelector('.btn-open-tool')?.textContent?.trim().length,
        record.id,
      ).toBeGreaterThan(0);
    }
    for (const phantom of phantomToolReferences) {
      expect(renderedIds, phantom.id).not.toContain(phantom.id);
    }
  }, 30_000);

  it('keeps core medical tools visible from the canonical Emergency OS tools route', () => {
    const { container } = renderOverview('/emergency/tools?source=tools');
    showAllTools();
    const renderedIds = new Set(
      [...container.querySelectorAll('[data-tool-id]')].map((node) =>
        node.getAttribute('data-tool-id'),
      ),
    );

    for (const id of [
      'qsofa',
      'news2',
      'heart-score',
      'lab-interp',
      'drug-check',
      'guideline-rag',
      'wells-dvt-calculator',
    ]) {
      expect(renderedIds.has(id), id).toBe(true);
      expect(toolCard(container, id)?.querySelector('.btn-open-tool'), id).toBeTruthy();
    }
  }, 30_000);

  it('labels the library as the active workspace operating console', () => {
    mockWorkspaceValue.workspaces = [{ id: 'medical-iot', name: 'Medical IoT', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'medical-iot';
    mockWorkspaceValue.activeWorkspace = { id: 'medical-iot', name: 'Medical IoT', toolIds: [] };
    mockUserIdentityValue.roleProfile = null;

    renderOverview();

    expect(
      screen.getByRole('heading', { level: 1, name: /medical iot tool console/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/medical iot os/i)).toBeInTheDocument();
    expect(screen.getByText(/device telemetry mode is active/i)).toBeInTheDocument();
  });

  it('keeps recommended cards scoped to the active workspace inventory', () => {
    mockWorkspaceValue.workspaces = [
      { id: 'emergency', name: 'Emergency', toolIds: ['qsofa'] },
    ] as any;
    mockWorkspaceValue.activeWorkspaceId = 'emergency';
    mockWorkspaceValue.activeWorkspace = {
      id: 'emergency',
      name: 'Emergency',
      toolIds: ['qsofa'],
    } as any;
    mockWorkspaceValue.visibleAssetIds = ['qsofa'] as any;

    const { container } = renderOverview();
    const renderedIds = [...container.querySelectorAll('[data-tool-id]')].map((node) =>
      node.getAttribute('data-tool-id'),
    );

    expect(
      renderedIds.every((id) => (mockWorkspaceValue.visibleAssetIds as any[]).includes(id)),
    ).toBe(true);
  });

  it('stitches tools into workflow and recommendation next actions', () => {
    renderOverview();

    expect(screen.getByRole('heading', { name: /continue into workflow/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /build workflow/i }));
    expect(navigateMock).toHaveBeenLastCalledWith(
      '/emergency/tools?source=workflows&filter=ai-workflows',
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: /recommended next action/i }));
    expect(navigateMock).toHaveBeenLastCalledWith(
      '/emergency/tools?source=recommendations&filter=recommended',
      expect.any(Object),
    );
  }, 30_000);

  it.each([
    ['pe-score', 'wells-pe'],
    ['bleeding risk', 'has-bled'],
    ['early warning score', 'news2'],
    ['kidney disease staging', 'ckd-staging'],
    ['lab interpreter', 'lab-interp'],
  ])(
    'finds %s by alias or clinical phrase',
    (query, expectedId) => {
      const { container } = renderOverview();
      showAllTools();

      fireEvent.change(screen.getByRole('searchbox', { name: /search all tools/i }), {
        target: { value: query },
      });

      expect(toolCard(container, expectedId)).toBeTruthy();
      expect(container.querySelectorAll('[data-tool-id]').length).toBeGreaterThan(0);
    },
    10000,
  );

  it.each([
    ['calculator', 'Calculators'],
    ['ai-workflows', 'AI Workflows'],
    ['operations', 'Operations'],
  ])('filters visible cards by %s without hiding all tools', (filter) => {
    const { container } = renderOverview();

    selectFilter(filter);

    const renderedIds = [...container.querySelectorAll('[data-tool-id]')].map((node) =>
      node.getAttribute('data-tool-id'),
    );
    const toolById = Object.fromEntries(
      getUserFacingToolRegistryProjection().map((record) => [record.id, record]),
    );

    expect(renderedIds.length).toBeGreaterThan(0);
    for (const id of renderedIds) {
      if (id === null) throw new Error('expected data-tool-id attribute to be present');
      const record = toolById[id];
      expect(record, id).toBeTruthy();
      expect(matchesToolFilter(record, filter), id).toBe(true);
    }
  });

  // Heavier than its siblings rather than broken: it renders the full catalog
  // like they do, then asserts across four execution modes and walks the registry
  // projection for a platform-executor example. It measures ~15s against the 10s
  // default. Looked for an inefficiency to remove first and did not find one --
  // toolCard() is a single querySelector, and the executorStatus check
  // short-circuits before it -- so this is a timeout that was too tight, stated
  // explicitly the way backendOrphanAudit.test.ts states its own.
  const FULL_CATALOG_RENDER_TIMEOUT_MS = 30_000;

  it(
    'labels execution modes from the executor catalog without promoting unsupported local tools',
    async () => {
      const { container } = renderOverview();
      showAllTools();

      const legend = screen.getByLabelText(/technical and medical execution modes/i);
      expect(within(legend).getByText(/how tools run/i)).toBeInTheDocument();
      expect(
        within(legend).getByText(/each mode connects the technical path/i),
      ).toBeInTheDocument();
      expect(within(legend).getByText(/runs in this browser/i)).toBeInTheDocument();
      expect(within(legend).getByText(/uses server validation/i)).toBeInTheDocument();
      expect(within(legend).getByText(/copilot-guided, human-reviewed/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(toolCard(container, 'drug-check')).toHaveTextContent(/uses server validation/i);
      });

      expect(toolCard(container, 'lab-interp')).toHaveTextContent(/uses server validation/i);
      expect(toolCard(container, 'qsofa')).toHaveTextContent(/runs in this browser/i);
      expect(toolCard(container, 'perc')).toHaveTextContent(/copilot-guided, human-reviewed/i);
      const platformTool = getUserFacingToolRegistryProjection().find(
        (tool) => tool.executorStatus === 'platform' && toolCard(container, tool.id),
      );
      if (platformTool) {
        expect(toolCard(container, platformTool.id)).toHaveTextContent(/platform service/i);
      }
    },
    FULL_CATALOG_RENDER_TIMEOUT_MS,
  );

  it('shows a resettable empty state for unmatched search', () => {
    renderOverview();
    const input = screen.getByRole('searchbox', { name: /search all tools/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'zzz-no-visible-tool' } });
    expect(screen.getByRole('status')).toHaveTextContent(/no matching tools/i);
    fireEvent.click(screen.getByRole('button', { name: /clear search and filters/i }));

    expect(input.value).toBe('');
    expect(screen.getAllByText(/^(open|start with chat)/i).length).toBeGreaterThan(0);
  }, 10000);

  it('renders the active calculator surface from a Medical Tools URL entry', async () => {
    renderOverview(
      '/emergency/tools?source=calculators&filter=calculator&q=heart&open=heart-score&patientId=patient-123',
    );

    const activeSurface = screen.getByRole('region', { name: /active medical tools surface/i });
    expect(activeSurface).toBeInTheDocument();
    expect(
      within(activeSurface).getByRole('heading', { name: /heart score/i }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('embedded-calculators')).toHaveTextContent(
      'heart-score:embedded',
    );
    expect(navigateMock).not.toHaveBeenCalled();
  }, 10000);

  it('renders a non-calculator active tool surface from a Medical Tools URL entry', async () => {
    renderOverview(
      '/emergency/tools?source=laboratory&filter=laboratory&q=lab-interp&open=lab-interp',
    );

    const activeSurface = screen.getByRole('region', { name: /active medical tools surface/i });
    expect(
      within(activeSurface).getByRole('heading', { name: /lab interpreter/i }),
    ).toBeInTheDocument();
    expect(within(activeSurface).queryByText(/local calculator/i)).toBeNull();
    expect(await screen.findByTestId('embedded-lab-interpreter')).toHaveTextContent(
      'lab-interp:embedded',
    );
    expect(screen.getByText(/continue into workflow/i)).toBeInTheDocument();
  }, 10000);

  it('launches a chat-assisted active surface from a Medical Tools URL entry', () => {
    renderOverview('/emergency/tools?source=tools&filter=ai-workflows&open=perc');

    const activeSurface = screen.getByRole('region', { name: /active medical tools surface/i });
    expect(within(activeSurface).getByRole('heading', { name: /perc/i })).toBeInTheDocument();
    expect(
      within(activeSurface).getByText(/^copilot-guided, human-reviewed$/i),
    ).toBeInTheDocument();

    fireEvent.click(within(activeSurface).getByRole('button', { name: /ask assistant/i }));

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('perc');
    expect(mockConversationValue.selectTool).toHaveBeenCalledWith('perc');
    expect(mockConversationValue.setActiveTool).toHaveBeenCalledWith('perc');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringMatching(/perc/i),
      'user',
    );
    expect(navigateMock).toHaveBeenLastCalledWith('/emergency/copilot', expect.any(Object));
  }, 10000);

  it('shows a clear not-found surface for unknown active tool links', () => {
    renderOverview(
      '/emergency/tools?source=tools&filter=clinical-tools&q=missing-tool&open=missing-tool',
    );

    const activeSurface = screen.getByRole('region', { name: /active medical tools surface/i });
    expect(
      within(activeSurface).getByRole('heading', { name: /tool not found/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('embedded-calculators')).toBeNull();
  });

  it('launches representative calculator, clinical-page, fleet, hub, and chat-assisted tools', () => {
    const { container } = renderOverview();
    showAllTools();

    openTool(container, 'qsofa');
    expect(navigateMock).toHaveBeenLastCalledWith(
      {
        pathname: '/emergency/tools',
        search: '?source=calculators&filter=calculator&q=qsofa&open=qsofa&calc=qsofa',
      },
      expect.objectContaining({ replace: true }),
    );

    openTool(container, 'drug-check');
    expect(navigateMock).toHaveBeenLastCalledWith(
      {
        pathname: '/emergency/tools',
        search: '?source=tools&filter=clinical-tools&q=drug-check&open=drug-check',
      },
      expect.objectContaining({ replace: true }),
    );

    openTool(container, 'fleet-command');
    expect(navigateMock).toHaveBeenLastCalledWith(
      {
        pathname: '/emergency/tools',
        search: '?source=operations&filter=operations&q=fleet-command&open=fleet-command',
      },
      expect.objectContaining({ replace: true }),
    );

    openTool(container, 'calculators');
    expect(navigateMock).toHaveBeenLastCalledWith(
      {
        pathname: '/emergency/tools',
        search: '?source=calculators&filter=calculator&q=calculators&open=calculators',
      },
      expect.objectContaining({ replace: true }),
    );

    openTool(container, 'perc');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringMatching(/perc/i),
      'user',
    );
    expect(mockConversationValue.selectTool).toHaveBeenCalledWith('perc');
    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('perc');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/emergency/copilot', search: '' },
      expect.objectContaining({ replace: true }),
    );
  }, 10000);

  it('opens Assistant from a tool card with the canonical launch seed', () => {
    const { container } = renderOverview();
    showAllTools();
    const card = toolCard(container, 'guideline-rag');
    expect(card).toBeTruthy();
    const assistantButton = card.querySelector('.btn-chat-tool');
    expect(assistantButton).toBeTruthy();

    fireEvent.click(assistantButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('guideline-rag');
    expect(mockConversationValue.selectTool).toHaveBeenCalledWith('guideline-rag');
    expect(mockConversationValue.setActiveTool).toHaveBeenCalledWith('guideline-rag');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringMatching(/clinical decision support/i),
      'user',
    );
    expect(navigateMock).toHaveBeenLastCalledWith('/emergency/copilot', expect.any(Object));
  }, 10000);
});
