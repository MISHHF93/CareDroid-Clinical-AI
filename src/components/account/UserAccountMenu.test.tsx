import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('UserAccountMenu', () => {
  it('shows profile and entry hub links for demo sessions', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menuitem', { name: 'Profile overview' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Entry hub' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument();
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

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Switch workflow profile')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitemradio').length).toBeGreaterThan(0);
  });

  it('hides workflow profile switcher when visibility hook denies it', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'prod-user', name: 'Prod User' },
    });
    vi.mocked(useProfileSwitcherVisibility).mockReturnValue(false);

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { expanded: false }));
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

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument();
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

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    const scenarioToggle = screen.getByRole('menuitemcheckbox', { name: 'Training scenario: Off' });
    expect(scenarioToggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(scenarioToggle);
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});