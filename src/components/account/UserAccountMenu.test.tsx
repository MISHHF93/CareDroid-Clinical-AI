import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UserAccountMenu from './UserAccountMenu';

vi.mock('../../contexts/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: vi.fn(() => ({
    account: null,
  })),
}));

vi.mock('../../hooks/useEffectiveUserProfile', () => ({
  default: vi.fn(() => ({ accessSummary: null, profileCopy: null })),
}));

vi.mock('../../hooks/useProfileSwitcherVisibility', () => ({
  default: vi.fn(() => true),
  useProfileSwitcherVisibility: vi.fn(() => true),
}));

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  default: vi.fn(() => ({
    role: 'physician',
    switchDemoRole: vi.fn(),
  })),
}));

vi.mock('../../hooks/useProfileNavigate', () => ({
  default: vi.fn(() => ({
    profileNavigate: vi.fn(),
  })),
}));

vi.mock('../../contexts/SimulationModeContext', () => ({
  useSimulationMode: vi.fn(() => ({
    enabled: false,
    active: false,
    setActive: vi.fn(),
    toggle: vi.fn(),
  })),
}));

import { useUser } from '../../contexts/UserContext';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';
import { useSimulationMode } from '../../contexts/SimulationModeContext';

function openAccountMenu(name = 'Demo User') {
  return userEvent.click(screen.getByRole('button', { name: `Account menu for ${name}` }));
}

describe('UserAccountMenu', () => {
  it('shows profile destinations with overview as the primary account entry', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });
    vi.mocked(useProfileSwitcherVisibility).mockReturnValue(false);

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    // Trigger opens the menu only — it is not itself a profile link.
    const trigger = screen.getByRole('button', { name: 'Account menu for Demo User' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await openAccountMenu();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const accountLinks = screen.getByRole('navigation', { name: 'Account links' });
    const actions = within(accountLinks)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim());

    expect(actions[0]).toBe('Profile overview');
    expect(actions).toEqual(
      expect.arrayContaining(['Profile overview', 'Profile settings', 'Entry hub']),
    );
    expect(screen.getByRole('button', { name: 'Profile overview' })).toHaveClass(
      'account-menu__item--primary',
    );
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('places account destinations before session / demo controls', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });
    vi.mocked(useProfileSwitcherVisibility).mockReturnValue(true);
    vi.mocked(useSimulationMode).mockReturnValue({
      enabled: true,
      active: false,
      setActive: vi.fn(),
      toggle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu();

    const panel = screen.getByRole('region');
    const panelText = panel.textContent || '';
    const overviewIndex = panelText.indexOf('Profile overview');
    const sessionIndex = panelText.indexOf('Session');
    const trainingIndex = panelText.indexOf('Training scenario');

    expect(overviewIndex).toBeGreaterThanOrEqual(0);
    expect(sessionIndex).toBeGreaterThan(overviewIndex);
    expect(trainingIndex).toBeGreaterThan(sessionIndex);
  });

  it('shows workflow profile switcher when visibility hook allows it', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });
    vi.mocked(useProfileSwitcherVisibility).mockReturnValue(true);

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
  });

  it('hides workflow profile switcher when visibility hook denies it', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'prod-user', name: 'Prod User' },
    });
    vi.mocked(useProfileSwitcherVisibility).mockReturnValue(false);
    vi.mocked(useSimulationMode).mockReturnValue({
      enabled: false,
      active: false,
      setActive: vi.fn(),
      toggle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu('Prod User');
    expect(screen.queryByText('Session')).not.toBeInTheDocument();
    expect(screen.queryByText('Switch workflow profile')).not.toBeInTheDocument();
  });

  it('hides the training scenario toggle when simulation mode is not enabled', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });
    vi.mocked(useSimulationMode).mockReturnValue({
      enabled: false,
      active: false,
      setActive: vi.fn(),
      toggle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu();
    expect(screen.queryByRole('button', { name: /Training scenario:/i })).not.toBeInTheDocument();
  });

  it('shows and toggles the training scenario control when simulation mode is enabled', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });
    const toggle = vi.fn();
    vi.mocked(useSimulationMode).mockReturnValue({
      enabled: true,
      active: false,
      setActive: vi.fn(),
      toggle,
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu();
    const scenarioToggle = screen.getByRole('button', { name: 'Training scenario: Off' });
    expect(scenarioToggle).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(scenarioToggle);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('closes the menu when Escape is pressed', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu();
    expect(screen.getByRole('button', { name: 'Profile overview' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Profile overview' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account menu for Demo User' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('renders the account panel in a body portal so header overflow cannot clip it', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });
    vi.mocked(useProfileSwitcherVisibility).mockReturnValue(false);

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await openAccountMenu();

    const panel = screen.getByRole('region');
    expect(panel).toHaveClass('account-menu__panel--portal');
    expect(panel.parentElement).toBe(document.body);
    expect(within(panel).getByRole('button', { name: 'Profile overview' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Profile settings' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Entry hub' })).toBeInTheDocument();
  });
});
