import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfileSettings from './ProfileSettings';
import { updateUserProfile } from '../services/profileApi';
import { createMockUserValue } from '../test/testRenderUtils';

const mockSetUser = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
let mockUser;
let mockAuthToken;

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () =>
      createMockUserValue({
        user: mockUser,
        authToken: mockAuthToken,
        setUser: mockSetUser,
      }),
  };
});

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    success: mockSuccess,
    error: mockError,
  }),
}));

vi.mock('../services/profileApi', () => ({
  updateUserProfile: vi.fn(),
}));

vi.mock('../components/TwoFactorSettings', () => ({
  default: () => <section aria-label="two factor settings">Two-factor settings</section>,
}));

function renderProfileSettings() {
  return render(
    <MemoryRouter>
      <ProfileSettings />
    </MemoryRouter>
  );
}

describe('ProfileSettings backend profile save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthToken = 'test-token';
    mockUser = {
      id: 'user-1',
      email: 'clinician@example.com',
      role: 'physician',
      profile: {
        fullName: 'Dr. Avery Stone',
        institution: 'County General',
        specialty: 'Emergency Medicine',
        licenseNumber: 'MD-123',
        country: 'US',
        timezone: 'America/New_York',
      },
    };
    updateUserProfile.mockResolvedValue({
      ok: true,
      data: {
        fullName: 'Dr. Avery Stone',
        institution: 'Metro Hospital',
        specialty: 'Emergency Medicine',
        licenseNumber: 'MD-123',
        country: 'US',
        timezone: 'America/New_York',
      },
    });
  });

  it('prefills backend profile fields and saves changes through PATCH profile API', async () => {
    const user = userEvent.setup();
    renderProfileSettings();

    expect(screen.getByPlaceholderText('Display name')).toHaveValue('Dr. Avery Stone');
    await user.clear(screen.getByPlaceholderText('Institution'));
    await user.type(screen.getByPlaceholderText('Institution'), 'Metro Hospital');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Dr. Avery Stone',
          institution: 'Metro Hospital',
          specialty: 'Emergency Medicine',
          licenseNumber: 'MD-123',
          country: 'US',
          timezone: 'America/New_York',
        })
      );
    });
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Dr. Avery Stone',
        institution: 'Metro Hospital',
        profile: expect.objectContaining({ institution: 'Metro Hospital' }),
      })
    );
    expect(screen.getByText(/profile saved to the backend/i)).toBeInTheDocument();
  });

  it('shows permission or API errors without updating local profile state', async () => {
    const user = userEvent.setup();
    updateUserProfile.mockResolvedValue({
      ok: false,
      message: 'You do not have permission to access this resource.',
    });
    renderProfileSettings();

    await user.clear(screen.getByPlaceholderText('Institution'));
    await user.type(screen.getByPlaceholderText('Institution'), 'Blocked Hospital');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText(/you do not have permission/i)).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(
      'Profile save failed',
      'You do not have permission to access this resource.'
    );
  });
});
