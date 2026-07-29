import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsentHistory } from './ConsentHistory';

/**
 * Regression coverage for a real crash found by rendering /legal/consent-history
 * (roadmap item #22): whenever fetching consent status fails or the backend
 * capability is disabled, ConsentHistory rendered EmptyState with
 * `action={{ label, onClick }}` — a plain object, not a React element.
 * EmptyState renders `action` directly as a child (`{action}`), and React
 * throws "Objects are not valid as a React child" for a plain object,
 * crashing to the app's ErrorBoundary. It also passed `message` instead of
 * EmptyState's real `description` prop, so even ignoring the crash the
 * actual error text was silently dropped. This file had zero prior test
 * coverage, which is exactly why the crash shipped unnoticed.
 */

vi.mock('../../services/complianceApi', () => ({
  fetchConsentStatus: vi.fn(),
}));
vi.mock('../../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(),
}));

import { fetchConsentStatus } from '../../services/complianceApi';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';

function renderConsentHistory() {
  return render(
    <MemoryRouter>
      <ConsentHistory />
    </MemoryRouter>,
  );
}

describe('ConsentHistory', () => {
  it('renders the error state without crashing when the compliance capability is disabled', async () => {
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(false);

    renderConsentHistory();

    await waitFor(() => {
      expect(screen.getByText('Error Loading Consent History')).toBeInTheDocument();
    });
    expect(screen.getByText('Consent status API is not available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders the error state without crashing when the fetch itself fails', async () => {
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(true);
    vi.mocked(fetchConsentStatus).mockResolvedValue({ ok: false, message: 'Network unreachable' } as any);

    renderConsentHistory();

    await waitFor(() => {
      expect(screen.getByText('Error Loading Consent History')).toBeInTheDocument();
    });
    expect(screen.getByText('Network unreachable')).toBeInTheDocument();
  });

  it('renders real consent records without crashing on a successful fetch', async () => {
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(true);
    vi.mocked(fetchConsentStatus).mockResolvedValue({
      ok: true,
      status: {
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dataProcessingConsent: false,
        marketingConsent: false,
        thirdPartySharingConsent: false,
        lastUpdated: '2026-01-15T10:00:00Z',
      },
    } as any);

    renderConsentHistory();

    await waitFor(() => {
      expect(screen.getByText('Consent History')).toBeInTheDocument();
    });
    // 5 rows: terms, privacy policy, data processing, marketing, and
    // third-party sharing (Cycle 227 -- previously omitted from the backend
    // response entirely despite having a real, tracked consent column).
    expect(screen.getAllByText('Consent Event')).toHaveLength(5);
  });
});
