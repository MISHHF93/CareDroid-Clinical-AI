import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EnterpriseReadinessPage from './EnterpriseReadinessPage';

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({
    tenantContext: {
      organizationId: 'org-enterprise',
      organizationName: 'North Memorial',
      workspaceId: 'emergency',
      role: 'owner',
    },
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-enterprise', name: 'North Memorial' },
    platformContext: {
      organization: { id: 'org-enterprise', name: 'North Memorial' },
      roleProfile: { id: 'owner' },
      audit: { status: 'ready', retentionDays: 365 },
      governance: { releaseGates: true, humanReview: true },
      security: { mfaRequired: true, aiSecurityReview: true },
    },
  }),
}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    organization: { id: 'org-enterprise', name: 'North Memorial' },
    integrations: [
      { slug: 'identity-sso', status: 'enabled' },
      { slug: 'fhir', status: 'enabled' },
    ],
  }),
}));

describe('EnterpriseReadinessPage', () => {
  it('renders readiness score and all tracked dimensions', () => {
    render(
      <MemoryRouter>
        <EnterpriseReadinessPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/readiness score/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /north memorial/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sso readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rbac readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tenant isolation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /audit readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /governance readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /integration readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /security readiness/i })).toBeInTheDocument();
  });
});
