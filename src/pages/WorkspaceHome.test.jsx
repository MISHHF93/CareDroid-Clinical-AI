import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import WorkspaceHome from './WorkspaceHome';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../test/testRenderUtils';

vi.mock('./WorkspaceHome.css', () => ({}));

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/TenantContext', () => ({
  useTenantContext: () => ({ refreshTenantContext: vi.fn() }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({ refreshIdentity: vi.fn() }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    assistantContext: '',
    recommendations: [],
    shortcuts: [],
    switchWorkspace: vi.fn().mockResolvedValue({ ok: true }),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderWorkspace(route = '/workspace/emergency') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="/workspace/:workspaceId"
          element={
            <>
              <WorkspaceHome />
              <LocationProbe />
            </>
          }
        />
        <Route path="/assistant" element={<LocationProbe />} />
        <Route path="/profile/workspaces" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WorkspaceHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workspace context, routes, and recommended tools', () => {
    renderWorkspace();

    expect(screen.getByRole('heading', { name: /emergency workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/rapid response environment/i)).toBeInTheDocument();
    expect(screen.getByText(/prioritize triage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open qsofa/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open live map/i })).toBeInTheDocument();
  });

  it('renders Fleet as a distinct transport operating environment', () => {
    renderWorkspace('/workspace/fleet');

    expect(screen.getByRole('heading', { name: /fleet workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/transport logistics and dispatch environment/i)).toBeInTheDocument();
    expect(screen.getByText(/fleet map, dispatch readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/vehicle location and route state/i)).toBeInTheDocument();
  });

  it('routes workspace management through profile and launches assistant with context', async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('link', { name: /manage workspaces/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/workspaces');
  });

  it('launches assistant with workspace context', () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /ask assistant/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('emergency'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });
});
