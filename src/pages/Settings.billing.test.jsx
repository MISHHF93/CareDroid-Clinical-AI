import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  fetchCurrentSubscription,
  fetchSubscriptionPlans,
} from '../services/subscriptionApi';
import { createMockUserValue } from '../test/testRenderUtils';

let mockUserState;

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    preference: 'system',
    resolvedTheme: 'dark',
    setPreference: vi.fn(),
  }),
}));

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserState,
  };
});

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../services/complianceApi', () => ({
  requestComplianceDataExport: vi.fn(),
  requestComplianceAccountDeletion: vi.fn(),
}));

vi.mock('../services/subscriptionApi', () => ({
  fetchCurrentSubscription: vi.fn(),
  fetchSubscriptionPlans: vi.fn(),
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  );
}

describe('Settings Billing card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState = createMockUserValue({
      user: { email: 'clinician@example.com' },
      authToken: 'test-token',
      isAuthenticated: true,
      isLoading: false,
    });
    fetchCurrentSubscription.mockResolvedValue({
      ok: true,
      data: {
        tier: 'professional',
        status: 'past_due',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
    });
    fetchSubscriptionPlans.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'professional',
          name: 'Professional',
          price: 49,
          features: ['Backend feature A'],
        },
      ],
    });
    createCheckoutSession.mockResolvedValue({ ok: true, data: {} });
    createCustomerPortalSession.mockResolvedValue({ ok: true, data: {} });
  });

  it('renders backend-returned plan, status, payment state, and plan details', async () => {
    renderSettings();

    expect(await screen.findByText('professional')).toBeInTheDocument();
    expect(screen.getByText('past_due')).toBeInTheDocument();
    expect(screen.getByText(/payment is past due/i)).toBeInTheDocument();
    expect(screen.getByText(/backend price value: 49/i)).toBeInTheDocument();
    expect(screen.getByText('Backend feature A')).toBeInTheDocument();
  });

  it('starts checkout with a backend-returned plan id', async () => {
    renderSettings();

    const checkout = await screen.findByRole('button', { name: /start checkout/i });
    fireEvent.click(checkout);

    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ tier: 'professional' })
      );
    });
    expect(await screen.findByText(/backend did not return a billing url/i)).toBeInTheDocument();
  });

  it('opens the customer portal through the backend route', async () => {
    renderSettings();

    const portal = await screen.findByRole('button', { name: /open customer portal/i });
    fireEvent.click(portal);

    await waitFor(() => {
      expect(createCustomerPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({ returnUrl: expect.any(String) })
      );
    });
  });

  it('shows auth-required empty state without calling protected billing routes', async () => {
    mockUserState = createMockUserValue({
      user: null,
      authToken: '',
      isAuthenticated: false,
      isLoading: false,
    });

    renderSettings();

    expect(await screen.findByText(/sign in to view current plan/i)).toBeInTheDocument();
    expect(fetchCurrentSubscription).not.toHaveBeenCalled();
    expect(fetchSubscriptionPlans).not.toHaveBeenCalled();
  });
});
