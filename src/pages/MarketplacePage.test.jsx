import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MarketplacePage from './MarketplacePage';

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({
    tenantContext: {
      organizationId: 'org-marketplace',
      organizationName: 'North Memorial',
    },
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    platformContext: {
      organization: { id: 'org-marketplace', name: 'North Memorial' },
    },
  }),
}));

describe('MarketplacePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders required marketplace categories', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Marketplace' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asset Packs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Workflows' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Simulations' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Protocols' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AI Agents' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Integrations' })).toBeInTheDocument();
  });

  it('supports install, disable, and enable actions', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/search marketplace/i), {
      target: { value: 'clinical copilot' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0);
  });
});
