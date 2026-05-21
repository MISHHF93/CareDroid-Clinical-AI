/**
 * Sidebar mobile drawer — render-level checks for compact layout props.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import {
  mockNotificationsValue,
  mockToolPreferencesValue,
  mockUserValue,
  mockWorkspaceValue,
} from '../test/testRenderUtils';

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationsValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspaceValue,
}));

const defaultProps = {
  conversations: [{ id: '1', title: 'Test chat', date: new Date().toISOString() }],
  activeConversation: '1',
  onSelectConversation: vi.fn(),
  onNewConversation: vi.fn(),
  onSignOut: vi.fn(),
  onToolSelect: vi.fn(),
  onOpenToolsOverview: vi.fn(),
  onOpenToolsCatalog: vi.fn(),
};

function renderSidebar(overrides = {}) {
  return render(
    <MemoryRouter>
      <Sidebar {...defaultProps} {...overrides} />
    </MemoryRouter>
  );
}

describe('Sidebar mobile render state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks compact closed drawer hidden from assistive tech', () => {
    const { container } = renderSidebar({
      layoutCompact: true,
      mobileNavOpen: false,
    });

    const aside = container.querySelector('aside.sidebar.sidebar--compact');
    expect(aside).toBeTruthy();
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.sidebar-toggle--mobile-close')).toBeTruthy();
  });

  it('exposes dialog semantics and close control when mobile drawer is open', () => {
    const { container } = renderSidebar({
      layoutCompact: true,
      mobileNavOpen: true,
      onCloseMobileNav: vi.fn(),
    });

    const aside = container.querySelector('aside.sidebar.sidebar--compact.sidebar--open');
    expect(aside).toHaveAttribute('role', 'dialog');
    expect(aside).toHaveAttribute('aria-label', 'Navigation menu');
    const closeButton = container.querySelector('.sidebar-toggle--mobile-close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAccessibleName(/close menu/i);
    expect(container.querySelector('nav.sidebar-nav')).toBeInTheDocument();
  });

  it('renders tool cards with accessible names in tools section', () => {
    const { container } = renderSidebar({ layoutCompact: false, sidebarCollapsed: false });

    expect(screen.getByText('Clinical Tools')).toBeInTheDocument();
    const toolCards = container.querySelectorAll('.sidebar-tool-card');
    expect(toolCards.length).toBeGreaterThan(0);
    expect(toolCards[0].querySelector('.sidebar-tool-card-name')?.textContent?.trim().length).toBeGreaterThan(
      0
    );
  });
});
