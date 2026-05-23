import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolsOverview from './ToolsOverview';
import { getUserFacingToolInventory } from '../../data/toolInventory';
import {
  mockConversationValue,
  mockToolPreferencesValue,
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

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={['/tools']}>
      <ToolsOverview />
    </MemoryRouter>
  );
}

describe('ToolsOverview unified inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceValue.workspaces = [{ id: 'all', name: 'All Tools', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'all';
  });

  it('renders all user-facing launchable tools by default', () => {
    const { container } = renderOverview();
    const userFacing = getUserFacingToolInventory();
    const renderedCards = [...container.querySelectorAll('.tool-card-large h3')].map(
      (heading) => heading.textContent
    );

    expect(screen.getByRole('heading', { level: 1, name: /^tools$/i })).toBeInTheDocument();
    expect([...container.querySelectorAll('.stat-number')].map((node) => node.textContent)).toContain(
      String(userFacing.length)
    );
    expect(renderedCards).toHaveLength(userFacing.length);
    for (const record of userFacing) {
      expect(renderedCards, record.id).toContain(record.label);
    }
    expect(container.textContent).toMatch(/developer catalog \/ source audit/i);
    expect(screen.queryByText(/hidden APIs/i)).not.toBeInTheDocument();
  }, 10000);

  it('renders each chat-assisted tool only as a single catalog card', () => {
    const { container } = renderOverview();
    const chatAssistedCount = getUserFacingToolInventory().filter(
      (record) => record.surface === 'chat-assisted'
    ).length;

    expect(
      [...container.querySelectorAll('.btn-open-tool')].filter((button) =>
        /start with assistant/i.test(button.textContent || '')
      )
    ).toHaveLength(chatAssistedCount);
  });

  it('shows a non-blank empty state for empty custom workspaces', () => {
    mockWorkspaceValue.workspaces = [{ id: 'empty', name: 'Empty Workspace', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'empty';

    renderOverview();

    expect(screen.getByText(/no tools in this workspace/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show all tools/i }));
    expect(mockWorkspaceValue.setActiveWorkspaceId).toHaveBeenCalledWith('all');
  });
});
