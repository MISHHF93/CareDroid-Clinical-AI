import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PlatformIntelligenceHub from './PlatformIntelligenceHub';

vi.mock('./PlatformIntelligenceHub.css', () => ({}));

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

describe('PlatformIntelligenceHub', () => {
  it('renders platform intelligence hub with convergence banner', () => {
    render(
      <MemoryRouter>
        <PlatformIntelligenceHub />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /demo track portfolio/i })).toBeInTheDocument();
    expect(screen.getByText(/prompts 117–136/i)).toBeInTheDocument();
    expect(screen.getByText(/platform convergence \(p136\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/unified artifact registry/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/platform intelligence modules/i)).toBeInTheDocument();
  });
});
