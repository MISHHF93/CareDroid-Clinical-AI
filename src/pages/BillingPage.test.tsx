import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BillingPage from './BillingPage';
import { createCheckoutSession, createCustomerPortalSession, fetchBillingOverview } from '../services/subscriptionApi';

vi.mock('../services/subscriptionApi', () => ({
  fetchBillingOverview: vi.fn(),
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({ tenantContext: { organizationName: 'CareDroid Hospital' } }),
}));

const mockBilling = {
  currentPlan: { name: 'Growth', description: 'Growth plan', priceMonthly: 299, limits: [] },
  status: 'active',
  plans: [
    { id: 'growth', name: 'Growth', description: 'Growth plan', priceMonthly: 299, features: [] },
    { id: 'enterprise', name: 'Enterprise', description: 'Enterprise plan', priceMonthly: null, features: [] },
  ],
};

// Regression coverage: openPortal/startCheckout both create a real billing
// session (Stripe checkout/portal) and redirect via window.location.assign,
// but had no in-flight guard -- a rapid double-click (or a slow network)
// could fire two concurrent session-creation requests before the redirect
// took effect.
describe('BillingPage', () => {
  const originalLocation = window.location;
  const assignSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    assignSpy.mockClear();
    vi.mocked(fetchBillingOverview).mockResolvedValue({ ok: true, data: mockBilling } as any);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('calls createCustomerPortalSession exactly once even when "Open billing portal" is clicked twice rapidly', async () => {
    vi.mocked(createCustomerPortalSession).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, data: { url: 'https://billing.example/portal' } } as any), 30)),
    );

    render(<BillingPage />);

    const button = await screen.findByRole('button', { name: /open billing portal/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('https://billing.example/portal');
    });
    expect(createCustomerPortalSession).toHaveBeenCalledTimes(1);
  });

  it('calls createCheckoutSession exactly once for a tier even when "Select" is clicked twice rapidly, and blocks switching tiers mid-flight', async () => {
    vi.mocked(createCheckoutSession).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, data: { url: 'https://billing.example/checkout' } } as any), 30)),
    );

    render(<BillingPage />);

    const growthButton = await screen.findByRole('button', { name: /select growth/i });
    const enterpriseButton = screen.getByRole('button', { name: /select enterprise/i });

    fireEvent.click(growthButton);
    fireEvent.click(growthButton);
    fireEvent.click(enterpriseButton);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('https://billing.example/checkout');
    });
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ tier: 'growth' }));
  });
});
