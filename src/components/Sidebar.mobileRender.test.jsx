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
    expect(within(nav).getByRole('button', { name: /^dashboard$/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^ai assistant$/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^hospital map$/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^fleet$/i })).toBeInTheDocument();
  });

  it('renders simplified primary items and hides developer links in Advanced by default', () => {
    renderSidebar({ layoutCompact: false, sidebarCollapsed: false });

    const nav = screen.getByRole('navigation', { name: /primary navigation/i });
    for (const name of [
      /^dashboard$/i,
      /^ai assistant$/i,
      /^tools$/i,
      /^calculators$/i,
      /^hospital map$/i,
      /^medical iot$/i,
      /^fleet$/i,
      /^profile$/i,
      /^settings$/i,
    ]) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }

    expect(screen.queryByRole('button', { name: /developer catalog/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }));
    expect(screen.getByRole('button', { name: /developer catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /system health/i })).toBeInTheDocument();
  });
});
