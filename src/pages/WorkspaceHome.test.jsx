import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: /open qsofa/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open live map/i })).toBeInTheDocument();
  });

  it('switches workspaces and launches assistant with context', async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /^fleet$/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/workspace/fleet');
    });

    fireEvent.click(screen.getByRole('button', { name: /ask in context/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('logistics'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });
});
