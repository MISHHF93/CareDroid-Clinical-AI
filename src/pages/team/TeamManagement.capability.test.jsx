import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TeamManagement } from './TeamManagement';
import { apiFetch, apiFetchJson } from '../../services/apiClient';
import { UNSUPPORTED_CAPABILITY_MESSAGE } from '../../config/backendApiCapabilities';

vi.mock('./TeamManagement.css', () => ({}));

vi.mock('../../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => false),
  UNSUPPORTED_CAPABILITY_MESSAGE:
    'This feature is not available on the server yet. Use on-device export, chat, or try again after an update.',
}));

vi.mock('../../services/apiClient', () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  getStoredAccessToken: vi.fn(() => 'token'),
}));

describe('TeamManagement backend capability gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call missing team routes when teamManagement is disabled', async () => {
    render(<TeamManagement />);

    expect(await screen.findByText(UNSUPPORTED_CAPABILITY_MESSAGE)).toBeInTheDocument();
    expect(apiFetchJson).not.toHaveBeenCalled();

    const inviteButton = screen.getByRole('button', { name: /\+ invite member/i });
    expect(inviteButton).toBeDisabled();

    fireEvent.click(inviteButton);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
