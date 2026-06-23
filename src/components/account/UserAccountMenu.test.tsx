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
    refreshIdentity: vi.fn(),
  })),
}));

vi.mock('../../hooks/useEffectiveUserProfile', () => ({
  default: vi.fn(() => ({ accessSummary: null })),
}));

import { useUser } from '../../contexts/UserContext';

describe('UserAccountMenu', () => {
  it('shows demo mode sign-in action for open-access sessions', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Demo User' },
      signOut: vi.fn(),
      isRealSession: false,
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menuitem', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows sign out for authenticated sessions', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'user-1', name: 'Dr. Patel', role: 'physician' },
      signOut: vi.fn(),
      isRealSession: true,
    });

    render(
      <MemoryRouter>
        <UserAccountMenu />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });
});
