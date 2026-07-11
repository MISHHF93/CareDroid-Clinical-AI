import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BillingPage from './BillingPage';
import UsagePage from './UsagePage';
import {
  fetchBillingOverview,
  fetchUsageMeteringFramework,
  fetchUsageSummary,
} from '../services/subscriptionApi';

vi.mock('./commercial/CommercialPages.css', () => ({}));

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({
    tenantContext: {
      organizationId: 'org-1',
      organizationName: 'Demo Hospital',
      workspaceId: 'workspace-1',
      role: 'admin',
      subscriptionPlan: 'professional',
    },
  }),
}));

vi.mock('../services/subscriptionApi', () => ({
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
  fetchBillingOverview: vi.fn(),
  fetchUsageMeteringFramework: vi.fn(),
  fetchUsageSummary: vi.fn(),
}));

describe('Billing and usage pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchBillingOverview).mockResolvedValue({
      ok: true,
      data: {
        status: 'active',
        currentPlan: {
          id: 'professional',
          name: 'Professional',
          description: 'Operational departments.',
          priceMonthly: 399,
          limits: [{ eventType: 'ai_call', label: 'AI calls', limit: 10000, unit: 'call' }],
        },
        plans: [
          {
            id: 'starter',
            name: 'Starter',
            description: 'Small teams.',
            priceMonthly: 99,
            features: ['Core clinical tools'],
          },
          {
            id: 'professional',
            name: 'Professional',
            description: 'Operational departments.',
            priceMonthly: 399,
            features: ['Advanced tools'],
          },
        ],
      },
    } as any);
    vi.mocked(fetchUsageSummary).mockResolvedValue({
      ok: true,
      data: {
        totals: [
          { eventType: 'ai_call', label: 'AI calls', used: 12, limit: 10000, remaining: 9988, unit: 'call' },
          {
            eventType: 'calculator_launch',
            label: 'Calculator launches',
            used: 4,
            limit: 10000,
            remaining: 9996,
            unit: 'launch',
          },
        ],
        breakdowns: {
          byWorkspace: [{ key: 'workspace-1', quantity: 16, events: 8 }],
          byAsset: [{ key: 'qsofa', quantity: 4, events: 4 }],
          byRole: [{ key: 'physician', quantity: 12, events: 6 }],
          byEventType: [{ key: 'ai_call', quantity: 12, events: 6 }],
        },
      },
    } as any);
    vi.mocked(fetchUsageMeteringFramework).mockResolvedValue({
      ok: true,
      data: {
        storage: { billingSeparated: true },
        meters: [
          {
            id: 'active-users',
            label: 'Active users',
            value: 7,
            unit: 'user',
            events: 7,
            billingReadiness: 'future-billing-candidate',
          },
          {
            id: 'integrations',
            label: 'Integrations',
            value: 3,
            unit: 'event',
            events: 3,
            billingReadiness: 'future-billing-candidate',
          },
        ],
        breakdowns: {
          byIntegration: [{ key: 'fhir', quantity: 3, events: 3 }],
        },
      },
    } as any);
  });

  it('renders billing overview with current plan and plan limits', async () => {
    render(<BillingPage />);

    expect(await screen.findByRole('heading', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /current plan/i })).toBeInTheDocument();
    expect(screen.getAllByText(/professional/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/AI calls: 10,000 call/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select starter/i })).toBeInTheDocument();
  });

  it('renders usage totals and required breakdowns', async () => {
    render(<UsagePage />);

    await waitFor(() => expect(fetchUsageSummary).toHaveBeenCalledWith({ period: 'month' }));
    await waitFor(() =>
      expect(fetchUsageMeteringFramework).toHaveBeenCalledWith({ period: 'month' })
    );
    expect(screen.getByRole('heading', { name: /^usage$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /usage metering framework/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /active users/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ai calls/i })).toBeInTheDocument();
    expect(screen.getByText(/workspace-1: 16 usage units/i)).toBeInTheDocument();
    expect(screen.getByText(/qsofa: 4 usage units/i)).toBeInTheDocument();
    expect(screen.getByText(/physician: 12 usage units/i)).toBeInTheDocument();
    expect(screen.getByText(/fhir: 3 usage units/i)).toBeInTheDocument();
  });
});
