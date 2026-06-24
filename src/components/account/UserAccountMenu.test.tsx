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

import { useUser } from '../../contexts/UserContext';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';

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
});