import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolsOverview from './ToolsOverview';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';
import { buildProfileToolGraph, buildUserToolProfile } from '../../data/profileToolSegmentation';
import {
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
  mockWorkspaceValue,
} from '../../test/testRenderUtils';

vi.mock('./ToolsOverview.css', () => ({}));

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
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

function renderOverview(initialEntry = '/tools') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToolsOverview />
    </MemoryRouter>
  );
}

describe('ToolsOverview unified inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceValue.workspaces = [{ id: 'all', name: 'All Tools', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'all';
    mockToolPreferencesValue.favorites = [];
    mockToolPreferencesValue.pinned = [];
    mockToolPreferencesValue.recentTools = [];
    mockToolPreferencesValue.hiddenTools = [];
    mockToolPreferencesValue.profileSettings = {};
  });

  it('renders recommended tools by default and keeps all allowed tools reachable', () => {
    const { container } = renderOverview();
    const profile = buildUserToolProfile({
      user: mockUserValue.user,
      toolPreferences: mockToolPreferencesValue,
    });
    const graph = buildProfileToolGraph({ tools: getUserFacingToolRegistryProjection(), profile });
    const renderedCards = [...container.querySelectorAll('.tool-card-large h3')].map(
      (heading) => heading.textContent
    );
    const renderedIds = [...container.querySelectorAll('.tool-card-large')].map((card) =>
      card.getAttribute('data-tool-id')
    );

    expect(screen.getByRole('heading', { level: 1, name: /^workspace tool console$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^recommended$/i })).toHaveAttribute('aria-selected', 'true');
    expect(
      [...container.querySelectorAll('.stat-number')].map((node) => node.textContent)
    ).toContain(String(graph.counts.visible));
    expect(renderedCards.length).toBe(graph.recommendedTools.length);
    expect(new Set(renderedIds).size).toBe(renderedIds.length);

    fireEvent.click(screen.getByRole('tab', { name: /^all$/i }));
    const allRenderedIds = [...container.querySelectorAll('.tool-card-large')].map((card) =>
      card.getAttribute('data-tool-id')
    );
    expect(allRenderedIds.length).toBeGreaterThanOrEqual(graph.visibleTools.length);
    expect(container.textContent).not.toMatch(/developer catalog \/ source audit/i);
    expect(screen.queryByText(/hidden APIs/i)).not.toBeInTheDocument();
  }, 10000);

  it('shows map tools in /tools search results', () => {
    mockToolPreferencesValue.profileSettings = { role: 'administrator' };
    const { container } = renderOverview();
    fireEvent.click(screen.getByRole('tab', { name: /^all$/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /search all tools/i }), {
      target: { value: 'map' },
    });

    const renderedCards = [...container.querySelectorAll('.tool-card-large h3')].map(
      (heading) => heading.textContent
    );
    expect(renderedCards).toContain('Live Tracking Map');
    expect(renderedCards).toContain('Fleet Live Map');
    expect(renderedCards).toContain('Hospital Map');

    fireEvent.change(screen.getByRole('searchbox', { name: /search all tools/i }), {
      target: { value: 'medical iot' },
    });
    const iotCards = [...container.querySelectorAll('.tool-card-large h3')].map(
      (heading) => heading.textContent
    );
    expect(iotCards).toContain('Medical IoT Dashboard');
  });

  it('renders each chat-assisted tool only as a single catalog card', () => {
    const { container } = renderOverview();
    fireEvent.click(screen.getByRole('tab', { name: /^all$/i }));
    const chatAssistedCount = [...container.querySelectorAll('.tool-card-large')].filter((card) =>
      /start guided chat/i.test(card.textContent || '')
    ).length;

    expect(
      [...container.querySelectorAll('.btn-open-tool')].filter((button) =>
        /start guided chat/i.test(button.textContent || '')
      )
    ).toHaveLength(chatAssistedCount);
    expect(container.textContent).not.toMatch(/open in assistant/i);
  }, 10000);

  it('keeps calculators searchable from the unified all view', () => {
    const { container } = renderOverview();

    fireEvent.click(screen.getByRole('tab', { name: /^all$/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /search all tools/i }), {
      target: { value: 'qsofa' },
    });

    const renderedIds = [...container.querySelectorAll('.tool-card-large')].map((card) =>
      card.getAttribute('data-tool-id')
    );
    expect(renderedIds.length).toBeGreaterThan(0);
    expect(renderedIds).toContain('qsofa');
  });

  it('exposes only the requested merged Tools discovery tabs', () => {
    renderOverview();
    const filter = screen.getByLabelText(/filter tools by type/i);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);

    const expectedLabels = [
      'Recommended',
      'All',
      'Calculators',
      'AI Workflows',
      'Operations',
    ];
    const fullSelectLabels = [
      'Clinical Tools',
      'Simulations',
      'Laboratory',
      'Maps & IoT',
      'Governance',
      'Favorites',
      'Recent',
    ];

    expect(tabs).toEqual(expectedLabels);
    for (const label of [...expectedLabels, ...fullSelectLabels]) {
      expect(filter).toHaveTextContent(label);
    }
  }, 10000);

  it('keeps /tools compact and free of duplicate developer catalog links', () => {
    const { container } = renderOverview();
    expect(container.querySelector('.tools-discovery-controls')).toBeTruthy();
    expect(container.querySelectorAll('.tool-card-large').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/developer catalog \/ source audit/i);
  }, 10000);

  it('shows a non-blank empty state for empty custom workspaces', () => {
    mockWorkspaceValue.workspaces = [{ id: 'empty', name: 'Empty Workspace', toolIds: ['unknown-tool'] }];
    mockWorkspaceValue.activeWorkspaceId = 'empty';

    renderOverview();

    expect(screen.getByText(/no tools in this workspace/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show all tools/i }));
    expect(mockWorkspaceValue.setActiveWorkspaceId).toHaveBeenCalledWith('all');
  });

  it('opens the recommended view by default and keeps source-backed tools reachable through all', () => {
    renderOverview();

    expect(screen.getByRole('tab', { name: /^recommended$/i })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /^all$/i }));
    expect(screen.getByRole('tab', { name: /^all$/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens /tools/calculators directly to the calculator-filtered library with search preserved', () => {
    const { container } = renderOverview('/tools/calculators?q=meld');

    expect(screen.getByRole('tab', { name: /^calculators$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('searchbox', { name: /search all tools/i })).toHaveValue('meld');
    expect(
      [...container.querySelectorAll('.tool-card-large')].map((card) =>
        card.getAttribute('data-tool-id')
      )
    ).toContain('meld');
  });

  it('filters to Recommended and hides user-hidden tools', () => {
    const hiddenTool = getUserFacingToolRegistryProjection().find(
      (tool) => tool.category === 'Calculator'
    );
    mockToolPreferencesValue.hiddenTools = [hiddenTool.id];
    const { container } = renderOverview();

    fireEvent.click(screen.getByRole('tab', { name: /^recommended$/i }));
    expect(screen.getByRole('tab', { name: /^recommended$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      [...container.querySelectorAll('.tool-card-large')].map((card) =>
        card.getAttribute('data-tool-id')
      )
    ).not.toContain(hiddenTool.id);
  });

  it('explains hidden tools in empty filtered views', () => {
    const allVisibleIds = getUserFacingToolRegistryProjection().map((tool) => tool.id);
    mockToolPreferencesValue.hiddenTools = allVisibleIds;

    renderOverview();

    expect(screen.getByText(/some tools are hidden by your preferences/i)).toBeInTheDocument();
  });
});
