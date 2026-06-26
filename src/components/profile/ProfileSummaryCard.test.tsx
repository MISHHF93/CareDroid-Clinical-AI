import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileSummaryCard from './ProfileSummaryCard';

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: {
      displayName: 'Avery Clinician',
      specialty: 'Emergency Medicine',
      organization: 'CareDroid General',
      role: 'physician',
    },
    activeWorkspace: {
      type: 'hospital',
      name: 'Hospital Operations Workspace',
      branding: { displayName: 'Hospital Operations' },
    },
    isLoading: false,
  }),
}));

describe('ProfileSummaryCard', () => {
  it('renders profile identity and active workspace context', () => {
    render(
      <MemoryRouter>
        <ProfileSummaryCard />
      </MemoryRouter>,
    );

    expect(screen.getByText('Avery Clinician')).toBeInTheDocument();
    expect(screen.getByText('Emergency Medicine')).toBeInTheDocument();
    expect(screen.getByText('CareDroid General')).toBeInTheDocument();
    expect(screen.getByText('physician')).toBeInTheDocument();
    expect(screen.getByText('Hospital Operations')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /switch workspace/i })).toHaveAttribute(
      'href',
      '/profile/workspaces',
    );
  });
});
