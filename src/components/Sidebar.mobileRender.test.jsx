/**
 * Sidebar mobile drawer — render-level checks for compact layout props.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: {
      displayName: 'Test Clinician',
      specialty: 'Emergency Medicine',
      organization: 'CareDroid Demo',
    },
    activeWorkspace: { id: 'default', name: 'Default' },
    workspaces: [{ id: 'default', name: 'Default' }],
    workspaceState: { activeWorkspaceId: 'default' },
    switchWorkspace: vi.fn(),
  }),
}));

const defaultProps = {
  conversations: [{ id: '1', title: 'Test chat', date: new Date().toISOString() }],
  activeConversation: '1',
  onSelectConversation: vi.fn(),
  onNewConversation: vi.fn(),
  onSignOut: vi.fn(),
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
    const nav = container.querySelector('nav.sidebar-nav');
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^command center$/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^assistant$/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^tools$/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^operations$/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /^profile$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /^hospital map$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /^fleet map$/i })).not.toBeInTheDocument();
  });

  it('renders dashboard-first primary items and hides contextual links in More by default', () => {
    renderSidebar({ layoutCompact: false, sidebarCollapsed: false });

    const nav = screen.getByRole('navigation', { name: /primary navigation/i });
    for (const name of [
      /^command center$/i,
      /^assistant$/i,
      /^tools$/i,
      /^operations$/i,
    ]) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }

    expect(screen.getByLabelText(/org workspace/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^workspace$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /developer catalog/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^tool library$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }));
    expect(screen.queryByRole('button', { name: /^tool library$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^calculators$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^hospital map$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^products$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^asset packs$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /developer catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /system health/i })).toBeInTheDocument();
    const advancedNav = screen.getByRole('navigation', { name: /^advanced navigation$/i });
    expect(within(advancedNav).getByRole('button', { name: /^security$/i })).toBeInTheDocument();
  });
});
