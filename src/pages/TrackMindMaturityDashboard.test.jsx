import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TrackMindMaturityDashboard from './TrackMindMaturityDashboard';

vi.mock('./TrackMindMaturityDashboard.css', () => ({}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({ organization: { name: 'Demo Track' } }),
}));

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({ tenantContext: { organizationName: 'Demo Track' } }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { name: 'Demo Track' },
    platformContext: {},
  }),
}));

describe('TrackMindMaturityDashboard', () => {
  it('renders TrackMind maturity framework with nine domains', () => {
    render(
      <MemoryRouter>
        <TrackMindMaturityDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /demo track/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/trackmind maturity framework/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Operations$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Equine welfare$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^AI governance$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Data quality$/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/maturity radar chart/i)).toBeInTheDocument();
  });
});
