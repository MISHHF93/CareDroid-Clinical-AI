import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CapabilityDiscovery from './CapabilityDiscovery';

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'user-1', role: 'cardiologist' } }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: { role: 'cardiologist', specialty: 'cardiology', department: 'cardiology' },
    preferences: {
      toolPreferences: {
        favoriteToolIds: [],
        pinnedToolIds: [],
        recentToolIds: ['heart-score'],
        hiddenToolIds: [],
      },
    },
    activeWorkspace: { id: 'cardiology' },
  }),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    favorites: [],
    pinned: [],
    recentTools: ['heart-score'],
    hiddenTools: [],
    profileSettings: { role: 'cardiologist', specialty: 'cardiology' },
  }),
}));

describe('CapabilityDiscovery', () => {
  it('renders profile-aware discovery sections and assistant copy', () => {
    render(
      <MemoryRouter>
        <CapabilityDiscovery />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /discover caredroid capabilities/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/discovery profile/i)).toHaveTextContent(/cardiologist/i);
    expect(screen.getByRole('heading', { name: /new tools/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recommended tools/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /underused tools/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /simulations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /workflows/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /protocols/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /did you know caredroid can also/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open capability/i }).length).toBeGreaterThan(0);
  });
});
