import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import WorkspaceHome from './WorkspaceHome';
import {
  mockConversationValue,
  mockToolPreferencesValue,
  mockWorkspaceValue,
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
  useWorkspace: () => mockWorkspaceValue,
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
        <Route
          path="/workspace/:workspaceId/:subpage"
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
    mockWorkspaceValue.activeWorkspaceId = 'emergency';
    mockWorkspaceValue.assistantContext = '';
    mockWorkspaceValue.recommendations = [];
    mockWorkspaceValue.shortcuts = [];
    mockWorkspaceValue.switchWorkspace = vi.fn().mockResolvedValue({ ok: true });
  });

  it('renders workspace context, routes, and recommended tools', () => {
    renderWorkspace();

    expect(screen.getByRole('heading', { name: /emergency workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/rapid response environment/i)).toBeInTheDocument();
    expect(screen.getByText(/prioritize triage/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /workspace subpages/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace data status/i)).toHaveTextContent(/Emergency Rapid Triage Mode/i);
    expect(screen.getAllByText(/demo\/local fallback/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /open qsofa/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open live map/i })).toBeInTheDocument();
  });

  it('renders Fleet as a distinct transport operating environment', () => {
    mockWorkspaceValue.activeWorkspaceId = 'emergency';
    renderWorkspace('/workspace/fleet');

    expect(screen.getByRole('heading', { name: /fleet workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/transport logistics and dispatch environment/i)).toBeInTheDocument();
    expect(screen.getByText(/fleet map, dispatch readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/vehicle location and route state/i)).toBeInTheDocument();
    expect(mockWorkspaceValue.switchWorkspace).toHaveBeenCalledWith('fleet');
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

  it('renders workspace subpages without creating a blank route', () => {
    renderWorkspace('/workspace/laboratory/results');

    expect(screen.getByRole('heading', { name: /^results$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Laboratory Interpretation Mode/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/same workspace data pipeline/i)).toBeInTheDocument();
  });

  it('renders workspace automation hub and previews automations through Assistant', () => {
    renderWorkspace('/workspace/emergency/automations');

    expect(screen.getByRole('heading', { name: /emergency department solution/i })).toBeInTheDocument();
    expect(screen.getByText(/Sepsis Detection Workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Automation analytics/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /preview run/i })[0]);
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringMatching(/Review Sepsis Detection Workflow/i),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('redirects invalid workspace subpages to the normalized dashboard subpage', async () => {
    renderWorkspace('/workspace/emergency/not-real');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/dashboard');
    });
  });

  it('renders workspace-specific tool and alert assets by mode', () => {
    const { unmount } = renderWorkspace('/workspace/medical-iot/devices');
    expect(screen.getByRole('heading', { name: /^devices$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/offline device|telemetry gap|battery risk/i).length).toBeGreaterThan(0);
    unmount();

    renderWorkspace('/workspace/governance/security');
    expect(screen.getByRole('heading', { name: /^security$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/security event|audit gap|review overdue/i).length).toBeGreaterThan(0);
  });
});
