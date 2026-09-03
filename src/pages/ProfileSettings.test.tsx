import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfileSettings from './ProfileSettings';
import { createMockUserValue } from '../test/testRenderUtils';

const mockSetUser = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSavePreferences = vi.fn();
let mockUser;
let mockAuthToken;
let mockAccount;
let mockProfessional;
let mockPreferences;

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
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

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: mockAccount,
    professional: mockProfessional,
    preferences: mockPreferences,
    updateProfile: mockUpdateProfile,
    savePreferences: mockSavePreferences,
    isLoading: false,
  }),
}));

function renderProfileSettings() {
  return render(
    <MemoryRouter>
      <ProfileSettings authToken={mockAuthToken} />
    </MemoryRouter>,
  );
}

describe('ProfileSettings operational profile save', () => {
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
    mockAccount = {
      userId: 'user-1',
      displayName: 'Dr. Avery Stone',
      email: 'clinician@example.com',
      organization: 'County General',
      specialty: 'Emergency Medicine',
      role: 'physician',
      country: 'US',
      timezone: 'America/New_York',
    };
    mockProfessional = {
      licenseNumber: 'MD-123',
      specialties: ['Emergency Medicine'],
    };
    mockPreferences = {
      theme: 'system',
      density: 'standard',
      compactMode: false,
      aiAssistantPreferences: {
        responseStyle: 'concise',
        citationLevel: 'standard',
        safetyTone: 'standard',
      },
      notificationSettings: {
        pushEnabled: true,
        emailEnabled: true,
        securityAlerts: true,
      },
    };
    mockUpdateProfile.mockResolvedValue({
      ok: true,
      data: {
        account: {
          ...mockAccount,
          organization: 'Metro Hospital',
        },
        professional: {
          ...mockProfessional,
        },
      },
    });
    mockSavePreferences.mockResolvedValue({ ok: true, data: mockPreferences, message: '' });
  });

  it('prefills operational profile fields and saves changes through the operational identity API', async () => {
    const user = userEvent.setup();
    renderProfileSettings();

    expect(screen.getByPlaceholderText('Display name')).toHaveValue('Dr. Avery Stone');
    await user.clear(screen.getByPlaceholderText('Institution'));
    await user.type(screen.getByPlaceholderText('Institution'), 'Metro Hospital');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Dr. Avery Stone',
          organization: 'Metro Hospital',
          specialty: 'Emergency Medicine',
          licenseNumber: 'MD-123',
          country: 'US',
          timezone: 'America/New_York',
        }),
      );
    });
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Dr. Avery Stone',
        institution: 'Metro Hospital',
        profile: expect.objectContaining({ institution: 'Metro Hospital' }),
      }),
    );
    expect(screen.getByText(/operational profile saved/i)).toBeInTheDocument();
  });

  it('shows permission or API errors without updating local profile state', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({
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
      'You do not have permission to access this resource.',
    );
  });
});
