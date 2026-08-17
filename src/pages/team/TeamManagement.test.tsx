import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamManagement } from './TeamManagement';
import { RouteChromeProvider } from '../../contexts/RouteChromeContext';
import { apiFetch, apiFetchJson, getStoredAccessToken } from '../../services/apiClient';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';

vi.mock('../../services/apiClient', () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  getStoredAccessToken: vi.fn(() => 'token-1'),
}));

vi.mock('../../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => true),
  UNSUPPORTED_CAPABILITY_MESSAGE: 'Team management is not available on this server.',
}));

vi.mock('../../services/disabledBackendMocks', () => ({
  makeDisabledCapabilityResponse: () => ({ message: 'disabled', endpoint: '/api/team/users' }),
}));

vi.mock('../../services/apiErrorHandling', () => ({
  reportApiError: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RouteChromeProvider>
        <TeamManagement />
      </RouteChromeProvider>
    </MemoryRouter>,
  );
}

const sampleUser = { id: 'user-1', name: 'Sam Lee', email: 'sam@example.com', role: 'nurse' };

describe('TeamManagement handleDeleteUser in-flight guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(true);
    vi.mocked(getStoredAccessToken).mockReturnValue('token-1');
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as any,
      data: [sampleUser],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  // Regression coverage: the delete button's only guard was a feature-flag
  // check (actionsDisabled={!teamApiEnabled}), not an in-flight state -- the
  // DELETE request itself had no double-submit protection, unlike its
  // sibling contexts fixed elsewhere this batch.
  it('calls the delete endpoint exactly once even when confirmed twice rapidly', async () => {
    vi.mocked(apiFetch).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true } as any), 30)),
    );

    renderPage();

    const button = await screen.findByRole('button', { name: /remove sam lee/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /remove sam lee/i })).not.toBeInTheDocument();
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
