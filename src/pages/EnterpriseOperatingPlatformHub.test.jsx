import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import EnterpriseOperatingPlatformHub from './EnterpriseOperatingPlatformHub';

vi.mock('./EnterpriseOperatingPlatformHub.css', () => ({}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({ organization: { name: 'Demo Track Portfolio' } }),
}));

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({ tenantContext: { organizationName: 'Demo Track Portfolio' } }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { name: 'Demo Track Portfolio' },
    platformContext: {},
  }),
}));

describe('EnterpriseOperatingPlatformHub', () => {
  it('renders enterprise platform hub with 18 modules', () => {
    render(
      <MemoryRouter>
        <EnterpriseOperatingPlatformHub />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /demo track portfolio/i })).toBeInTheDocument();
    expect(screen.getByText(/prompts 99–116/i)).toBeInTheDocument();
    expect(screen.getAllByText(/operational benchmarking/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/franchise readiness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/architecture governance/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/enterprise platform modules/i)).toBeInTheDocument();
  });
});
