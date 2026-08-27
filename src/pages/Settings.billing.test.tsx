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
import { fetchIdentityProviderRegistry } from '../services/enterpriseIdentityApi';
import { fetchTenantDataIsolationAudit } from '../services/tenantIsolationApi';
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
  const actual = await importOriginal() as any;
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

vi.mock('../services/enterpriseIdentityApi', () => ({
  fetchIdentityProviderRegistry: vi.fn(),
}));

vi.mock('../services/tenantIsolationApi', () => ({
  fetchTenantDataIsolationAudit: vi.fn(),
}));

vi.mock('../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({
    settings: {
      showPlatformStrip: true,
      showEnterpriseSections: true,
      showNestedSubtitles: true,
      showAuditSections: true,
      showGovernanceSections: true,
      showScreenModes: true,
      showWalkthroughDetail: true,
    },
  }),
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
    vi.mocked(fetchCurrentSubscription).mockResolvedValue({
      ok: true,
      data: {
        tier: 'professional',
        status: 'past_due',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
      message: '',
    });
    vi.mocked(fetchSubscriptionPlans).mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'professional',
          name: 'Professional',
          price: 49,
          features: ['Backend feature A'],
        },
      ],
      message: '',
    });
    vi.mocked(createCheckoutSession).mockResolvedValue({ ok: true, data: {}, message: '' });
    vi.mocked(createCustomerPortalSession).mockResolvedValue({ ok: true, data: {}, message: '' });
    vi.mocked(fetchIdentityProviderRegistry).mockResolvedValue({
      ok: true,
      data: {
        summary: { supported: 1, planned: 5, unavailable: 0 },
        providers: [
          {
            id: 'google-workspace',
            name: 'Google Workspace',
            status: 'supported',
            protocol: 'oauth2',
            entryPath: '/api/auth/google',
            notes: 'Google OAuth is configured.',
          },
        ],
      },
      message: '',
    });
    vi.mocked(fetchTenantDataIsolationAudit).mockResolvedValue({
      ok: true,
      data: {
        status: 'tenant_isolated',
        summary: {
          auditedDomains: 6,
          crossTenantReadAllowed: false,
        },
        domains: [
          {
            id: 'audit-logs',
            name: 'Audit Logs',
            status: 'enforced',
            tenantBoundary: 'organizationId',
            residualRisk: 'Integrity verification remains global.',
          },
        ],
      },
      message: '',
    });
  });

  it('renders backend-returned plan, status, payment state, and plan details', async () => {
    renderSettings();

    expect(await screen.findByText('professional')).toBeInTheDocument();
    expect(screen.getByText('past_due')).toBeInTheDocument();
    expect(screen.getByText(/payment is past due/i)).toBeInTheDocument();
    expect(screen.getByText(/backend price value: 49/i)).toBeInTheDocument();
    expect(screen.getByText('Backend feature A')).toBeInTheDocument();
  });

  // Regression coverage for the 2026-08-27 fix: canceledAt/trialEnd are real,
  // persisted columns set from live Stripe webhooks (SubscriptionsService.
  // handleSubscriptionUpdated/Deleted) and already returned by
  // GET /subscriptions/current -- this page never read them, so a canceled
  // or trialing subscription showed no cancellation/trial-expiry date at all.
  it('shows the real cancellation date for a canceled subscription', async () => {
    vi.mocked(fetchCurrentSubscription).mockResolvedValue({
      ok: true,
      data: {
        tier: 'professional',
        status: 'canceled',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        canceledAt: '2026-05-15T00:00:00.000Z',
      },
      message: '',
    });

    renderSettings();

    expect(await screen.findByText(/canceled on/i)).toBeInTheDocument();
  });

  it('shows the real trial-end date for a trialing subscription with no cancellation', async () => {
    vi.mocked(fetchCurrentSubscription).mockResolvedValue({
      ok: true,
      data: {
        tier: 'professional',
        status: 'trialing',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        trialStart: '2026-05-01T00:00:00.000Z',
        trialEnd: '2026-05-15T00:00:00.000Z',
      },
      message: '',
    });

    renderSettings();

    expect(await screen.findByText(/trial ends/i)).toBeInTheDocument();
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

    expect(
      await screen.findByText(/billing data loads when the backend subscription api is available/i),
    ).toBeInTheDocument();
    expect(fetchCurrentSubscription).not.toHaveBeenCalled();
    expect(fetchSubscriptionPlans).not.toHaveBeenCalled();
  });

  it('renders enterprise identity provider registry readiness', async () => {
    renderSettings();

    expect(await screen.findByRole('heading', { name: /enterprise identity/i })).toBeInTheDocument();
    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
    expect(screen.getByText(/supported · oauth2 · \/api\/auth\/google/i)).toBeInTheDocument();
  });

  it('renders tenant data isolation audit readiness', async () => {
    renderSettings();

    expect(
      await screen.findByRole('heading', { name: /tenant data isolation audit/i })
    ).toBeInTheDocument();
    expect(screen.getByText('tenant_isolated')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText(/enforced · organizationId/i)).toBeInTheDocument();
  });
});
