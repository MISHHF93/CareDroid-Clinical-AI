import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OrganizationOnboarding from './OrganizationOnboarding';
import { ProductCatalogApi } from '../../services/productCatalogApi';

vi.mock('./OrganizationPages.css', () => ({}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const refreshPlatformContext = vi.fn().mockResolvedValue(undefined);
vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({ refreshPlatformContext }),
}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    completeOnboarding: vi.fn(),
  },
}));

describe('OrganizationOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshPlatformContext.mockResolvedValue(undefined);
  });

  it('renders the onboarding form with required fields', () => {
    render(
      <MemoryRouter>
        <OrganizationOnboarding />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /organization onboarding/i })).toBeInTheDocument();
    expect(screen.getByText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByText(/url slug/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument();
  });

  it('auto-derives the slug from the organization name until the slug is edited directly', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <OrganizationOnboarding />
      </MemoryRouter>,
    );

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.type(nameInput, 'Riverside Walk-In Clinic');

    const slugInput = screen.getByLabelText(/url slug/i) as HTMLInputElement;
    expect(slugInput.value).toBe('riverside-walk-in-clinic');
  });

  it('submits the real onboarding contract and redirects to tenant admin on success', async () => {
    vi.mocked(ProductCatalogApi.completeOnboarding).mockResolvedValue({ id: 'org-new' } as any);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <OrganizationOnboarding />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/organization name/i), 'Riverside Walk-In Clinic');
    await user.click(screen.getByRole('button', { name: /create organization/i }));

    await waitFor(() => {
      expect(ProductCatalogApi.completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Riverside Walk-In Clinic',
          slug: 'riverside-walk-in-clinic',
          organizationType: 'hospital',
        }),
      );
    });
    await waitFor(() => expect(refreshPlatformContext).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/tenant-admin'));
  });

  it('shows the backend error message and does not navigate when onboarding fails', async () => {
    vi.mocked(ProductCatalogApi.completeOnboarding).mockRejectedValue(
      new Error('Onboarding failed (400)'),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <OrganizationOnboarding />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/organization name/i), 'Riverside Walk-In Clinic');
    await user.click(screen.getByRole('button', { name: /create organization/i }));

    expect(await screen.findByText(/onboarding failed \(400\)/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
