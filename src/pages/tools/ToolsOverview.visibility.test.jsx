import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolsOverview from './ToolsOverview';
import {
  getUserFacingToolInventory,
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

function toolCard(container, id) {
  return container.querySelector(`[data-tool-id="${id}"]`);
}

function openTool(container, id) {
  const card = toolCard(container, id);
  expect(card, id).toBeTruthy();
  fireEvent.click(within(card).getByRole('button', { name: /open tool|start guided chat/i }));
}

describe('ToolsOverview complete visibility, search, filters, and launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceValue.workspaces = [{ id: 'all', name: 'All Tools', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'all';
    mockToolPreferencesValue.favorites = [];
    mockToolPreferencesValue.pinned = [];
    mockToolPreferencesValue.recentTools = [];
  });

  it('renders one card per user-facing canonical tool and excludes phantom audit rows', () => {
    const { container } = renderOverview();
    const userFacing = getUserFacingToolInventory();
    const renderedIds = [...container.querySelectorAll('[data-tool-id]')].map((node) =>
      node.getAttribute('data-tool-id')
    );

    expect(renderedIds).toHaveLength(userFacing.length);
    expect(new Set(renderedIds).size).toBe(renderedIds.length);
    for (const record of userFacing) {
      expect(renderedIds, record.id).toContain(record.id);
    }
    for (const phantom of phantomToolReferences) {
      expect(renderedIds, phantom.id).not.toContain(phantom.id);
    }
  });

  it.each([
    ['pe-score', 'wells-pe'],
    ['bleeding risk', 'has-bled'],
    ['early warning score', 'news2'],
    ['kidney disease staging', 'ckd-staging'],
  ])('finds %s by alias or clinical phrase', (query, expectedId) => {
    const { container } = renderOverview();

    fireEvent.change(screen.getByRole('searchbox', { name: /search all tools/i }), {
      target: { value: query },
    });

    expect(toolCard(container, expectedId)).toBeTruthy();
    expect(container.querySelectorAll('[data-tool-id]').length).toBeGreaterThan(0);
  });

  it.each([
    ['calculator', TOOL_SURFACES.CALCULATOR_FORM],
    ['chat-assisted', TOOL_SURFACES.CHAT_ASSISTED],
    ['fleet', TOOL_SURFACES.FLEET_PAGE],
  ])('filters visible cards by %s without hiding all tools', (filter, surface) => {
    const { container } = renderOverview();

    fireEvent.change(screen.getByRole('combobox', { name: /filter tools by type/i }), {
      target: { value: filter },
    });

    const renderedIds = [...container.querySelectorAll('[data-tool-id]')].map((node) =>
      node.getAttribute('data-tool-id')
    );
    const expectedIds = getUserFacingToolInventory()
      .filter(
        (record) =>
          record.surface === surface ||
          (filter === 'calculator' && record.category === 'calculator') ||
          (filter === 'fleet' && record.category === 'fleet')
      )
      .map((record) => record.id);

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
    expect(screen.getAllByText(/open tool|start guided chat/i).length).toBeGreaterThan(0);
  });

  it('launches representative calculator, clinical-page, fleet, hub, and chat-assisted tools', () => {
    const { container } = renderOverview();

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

    openTool(container, 'wells-pe');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(expect.stringMatching(/wells/i), 'user');
    expect(mockConversationValue.selectTool).toHaveBeenCalledWith('wells-pe');
    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('wells-pe');
    expect(navigateMock).toHaveBeenLastCalledWith(
      { pathname: '/dashboard', search: '' },
      expect.objectContaining({ replace: true })
    );
  });
});
