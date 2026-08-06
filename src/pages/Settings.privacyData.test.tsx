import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import {
  requestComplianceAccountDeletion,
  requestComplianceDataExport,
} from '../services/complianceApi';
import { createMockUserValue } from '../test/testRenderUtils';

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
    ...(actual as Record<string, unknown>),
    useUser: () =>
      createMockUserValue({
        user: { email: 'clinician@example.com' },
        authToken: 'test-token',
        isAuthenticated: true,
        isLoading: false,
      }),
  };
});

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../services/complianceApi', () => ({
  requestComplianceDataExport: vi.fn().mockResolvedValue({
    ok: true,
    data: { exportDate: '2026-05-21T00:00:00.000Z', user: { email: 'clinician@example.com' } },
  }),
  requestComplianceAccountDeletion: vi.fn().mockResolvedValue({
    ok: true,
    data: { success: true, message: 'User data has been permanently deleted' },
  }),
}));

vi.mock('../services/subscriptionApi', () => ({
  fetchCurrentSubscription: vi.fn().mockResolvedValue({ ok: true, data: null }),
  fetchSubscriptionPlans: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

vi.mock('../services/enterpriseIdentityApi', () => ({
  fetchIdentityProviderRegistry: vi.fn().mockResolvedValue({
    ok: true,
    data: { summary: { supported: 0, planned: 0, unavailable: 0 }, providers: [] },
  }),
}));

vi.mock('../services/tenantIsolationApi', () => ({
  fetchTenantDataIsolationAudit: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      status: 'tenant_isolated',
      summary: { auditedDomains: 6, crossTenantReadAllowed: false },
      domains: [],
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

describe('Settings Privacy & Data card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('requires acknowledgement before requesting a data export', async () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /request data export/i }));

    const generateButton = screen.getByRole('button', { name: /generate export/i });
    expect(generateButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(/i understand the export may contain sensitive data/i)
    );
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(requestComplianceDataExport).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/data export generated and downloaded/i)).toBeInTheDocument();
  });

  it('requires email and destructive phrase before deleting data', async () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /request data deletion/i }));

    const deleteButton = screen.getByRole('button', { name: /permanently delete data/i });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/confirm account email/i), {
      target: { value: 'clinician@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/type delete my data/i), {
      target: { value: 'DELETE MY DATA' },
    });

    expect(deleteButton).not.toBeDisabled();
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(requestComplianceAccountDeletion).toHaveBeenCalledWith('clinician@example.com');
    });
    expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument();
  });
});
