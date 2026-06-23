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

import { useUser } from '../../contexts/UserContext';

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
});
