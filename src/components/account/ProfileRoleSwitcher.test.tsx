import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfileRoleSwitcher from './ProfileRoleSwitcher';
import { CURATED_DEMO_ROLE_VIEWS } from '../../config/demoPersonaModel';

const switchDemoRole = vi.fn();
const profileNavigate = vi.fn();

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  default: vi.fn(() => ({
    role: 'physician',
    switchDemoRole,
  })),
}));

vi.mock('../../hooks/useProfileNavigate', () => ({
  default: vi.fn(() => ({
    profileNavigate,
  })),
}));

describe('ProfileRoleSwitcher', () => {
  beforeEach(() => {
    switchDemoRole.mockClear();
    profileNavigate.mockClear();
  });

  it('renders compact select with curated roles', () => {
    render(
      <MemoryRouter>
        <ProfileRoleSwitcher variant="compact" />
      </MemoryRouter>,
    );

    const select = screen.getByLabelText('Switch workflow profile');
    expect(select).toHaveValue('physician');
    expect(select.querySelectorAll('option')).toHaveLength(CURATED_DEMO_ROLE_VIEWS.length);
  });

  it('switches role and navigates from compact select', async () => {
    render(
      <MemoryRouter>
        <ProfileRoleSwitcher variant="compact" />
      </MemoryRouter>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Switch workflow profile'), 'triage_nurse');

    expect(switchDemoRole).toHaveBeenCalledWith('triage_nurse');
    expect(profileNavigate).toHaveBeenCalled();
  });

  it('renders menu items and marks active role', async () => {
    render(
      <MemoryRouter>
        <ProfileRoleSwitcher variant="menu" />
      </MemoryRouter>,
    );

    const activeItem = screen.getByRole('radio', { name: /Provider rounds/i });
    expect(activeItem).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /Reception desk/i }));
    expect(switchDemoRole).toHaveBeenCalledWith('registration_clerk');
  });

  it('renders chips and switches on click', async () => {
    render(
      <MemoryRouter>
        <ProfileRoleSwitcher variant="chips" />
      </MemoryRouter>,
    );

    const chargeChip = screen.getByRole('button', { name: 'Charge / flow control' });
    expect(chargeChip).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(chargeChip);
    expect(switchDemoRole).toHaveBeenCalledWith('charge_nurse');
  });
});
