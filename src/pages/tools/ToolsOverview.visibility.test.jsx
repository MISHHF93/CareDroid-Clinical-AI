import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolsOverview from './ToolsOverview';
import {
  getUserFacingToolRegistryProjection,
  TOOL_SURFACES,
} from '../../data/toolInventory';
import { phantomToolReferences } from '../../data/sourceCodeToolDiscovery';
import {
  mockConversationValue,
  mockToolPreferencesValue,
  mockWorkspaceValue,
} from '../../test/testRenderUtils';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={['/tools']}>
      <ToolsOverview />
    </MemoryRouter>
  );
}

function showAllTools() {
  fireEvent.change(screen.getByRole('combobox', { name: /filter tools by type/i }), {
    target: { value: 'all' },
  });
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

function expectedFilterBase() {
  return getUserFacingToolRegistryProjection();
}

function expectedFilterIds(filter) {
  return expectedFilterBase(filter)
    .filter((record) => {
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
            `${record.name} ${record.description}`
          )
        );
      }
      if (filter === 'operations') {
        return (
          ['Fleet', 'IoT', 'Hospital Operations'].includes(record.category) ||
          ['fleet-page', 'iot-dashboard', 'hospital-operations'].includes(record.surface) ||
          /fleet|operations|dispatch|device|hospital map|live map|digital twin/i.test(
            `${record.name} ${record.description}`
          )
        );
      }
      return true;
    })
    .map((record) => record.id);
}

describe('ToolsOverview complete visibility, search, filters, and launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceValue.workspaces = [{ id: 'all', name: 'All Tools', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'all';
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
      node.getAttribute('data-tool-id')
    );

    expect(renderedIds).toHaveLength(userFacing.length);
    expect(new Set(renderedIds).size).toBe(renderedIds.length);
    for (const record of userFacing) {
      expect(renderedIds, record.id).toContain(record.id);
      const card = toolCard(container, record.id);
      expect(card?.querySelector('h3')?.textContent?.trim().length, record.id).toBeGreaterThan(0);
      expect(card?.querySelector('.tool-description')?.textContent?.trim().length, record.id).toBeGreaterThan(0);
      expect(card?.querySelector('.btn-open-tool')?.textContent?.trim().length, record.id).toBeGreaterThan(0);
    }
    for (const phantom of phantomToolReferences) {
      expect(renderedIds, phantom.id).not.toContain(phantom.id);
    }
  }, 30_000);

  it('labels the library as the active workspace operating console', () => {
    mockWorkspaceValue.workspaces = [{ id: 'medical-iot', name: 'Medical IoT', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'medical-iot';
    mockWorkspaceValue.activeWorkspace = { id: 'medical-iot', name: 'Medical IoT' };

    renderOverview();

    expect(screen.getByRole('heading', { level: 1, name: /medical iot tool console/i })).toBeInTheDocument();
    expect(screen.getByText(/medical iot os/i)).toBeInTheDocument();
    expect(screen.getByText(/device telemetry mode is active/i)).toBeInTheDocument();
  });

  it.each([
    ['pe-score', 'wells-pe'],
    ['bleeding risk', 'has-bled'],
    ['early warning score', 'news2'],
    ['kidney disease staging', 'ckd-staging'],
  ])('finds %s by alias or clinical phrase', (query, expectedId) => {
    const { container } = renderOverview();
    showAllTools();

    fireEvent.change(screen.getByRole('searchbox', { name: /search all tools/i }), {
      target: { value: query },
    });

    expect(toolCard(container, expectedId)).toBeTruthy();
    expect(container.querySelectorAll('[data-tool-id]').length).toBeGreaterThan(0);
  }, 10000);

  it.each([
    ['calculator', 'Calculators'],
    ['ai-workflows', 'AI Workflows'],
    ['operations', 'Operations'],
  ])('filters visible cards by %s without hiding all tools', (filter) => {
    const { container } = renderOverview();

    fireEvent.change(screen.getByRole('combobox', { name: /filter tools by type/i }), {
      target: { value: filter },
    });

    const renderedIds = [...container.querySelectorAll('[data-tool-id]')].map((node) =>
      node.getAttribute('data-tool-id')
    );
    const expectedIds = expectedFilterIds(filter);

    expect(renderedIds.length).toBeGreaterThan(0);
    expect(renderedIds.sort()).toEqual(expectedIds.sort());
  });

  it('shows a resettable empty state for unmatched search', () => {
    renderOverview();
    const input = screen.getByRole('searchbox', { name: /search all tools/i });

    fireEvent.change(input, { target: { value: 'zzz-no-visible-tool' } });
    expect(screen.getByRole('status')).toHaveTextContent(/no matching tools/i);
    fireEvent.click(screen.getByRole('button', { name: /clear search and filters/i }));

    expect(input.value).toBe('');
    expect(screen.getAllByText(/^(open|start with chat)/i).length).toBeGreaterThan(0);
  }, 10000);

  it('launches representative calculator, clinical-page, fleet, hub, and chat-assisted tools', () => {
    const { container } = renderOverview();
    showAllTools();

    openTool(container, 'qsofa');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/tools/calculators/qsofa', search: '' },
      expect.objectContaining({ replace: true })
    );

    openTool(container, 'drug-check');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/tools/drug-checker', search: '' },
      expect.objectContaining({ replace: true })
    );

    openTool(container, 'fleet-command');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/fleet/command', search: '' },
      expect.objectContaining({ replace: true })
    );

    openTool(container, 'calculators');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/tools/calculators', search: '' },
      expect.objectContaining({ replace: true })
    );

    openTool(container, 'wells-dvt-calculator');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(expect.stringMatching(/wells/i), 'user');
    expect(mockConversationValue.selectTool).toHaveBeenCalledWith('wells-dvt-calculator');
    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('wells-dvt-calculator');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/assistant', search: '' },
      expect.objectContaining({ replace: true })
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
      'user'
    );
    expect(navigateMock).toHaveBeenLastCalledWith('/assistant');
  }, 10000);
});
