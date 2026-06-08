import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePreferences from './ProfilePreferences';

const mocks = vi.hoisted(() => {
  const savePreferences = vi.fn(async () => ({ ok: true, data: {}, message: '' }));
  return {
    savePreferences,
    identity: {
      preferences: {
        theme: 'system',
        language: 'en',
        defaultDashboard: 'command',
        density: 'standard',
        compactMode: false,
        aiAssistantPreferences: {
          responseStyle: 'concise',
          citationLevel: 'standard',
          safetyTone: 'standard',
        },
      },
      aiPersonalization: {
        recommendedWorkflows: [
          {
            id: 'workflow-1',
            title: 'Open fleet readiness view',
            reason: 'Fleet workspaces can use live status as an operational check.',
          },
        ],
      },
      savePreferences,
      isLoading: false,
    },
  };
});

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => mocks.identity,
}));

describe('ProfilePreferences', () => {
  it('persists profile preference changes', async () => {
    render(<ProfilePreferences />);

    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: 'dark' } });
    fireEvent.change(screen.getByLabelText(/density/i), { target: { value: 'compact' } });
    fireEvent.change(screen.getByLabelText(/ai response style/i), { target: { value: 'teaching' } });
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(mocks.savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          density: 'compact',
          compactMode: true,
          aiAssistantPreferences: expect.objectContaining({ responseStyle: 'teaching' }),
        }),
      );
    });
    expect(screen.getByText(/open fleet readiness view/i)).toBeInTheDocument();
  });
});
