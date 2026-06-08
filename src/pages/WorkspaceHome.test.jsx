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
    expect(screen.getByText(/emergency department operating environment/i)).toBeInTheDocument();
    expect(screen.getByText(/canonical ED journey/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /workspace subpages/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace data status/i)).toHaveTextContent(/Emergency Department Operating System/i);
    expect(screen.getAllByText(/demo\/local fallback/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /emergency command center/i })).toBeInTheDocument();
    [
      /Waiting Patients/i,
      /High Risk Queue/i,
      /Critical Alerts/i,
      /Recent Assessments/i,
      /Recommended Actions/i,
      /Protocol Guidance/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('button', { name: /start triage review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retrieve complaint protocol/i })).toBeInTheDocument();
  });

  it('launches ED command center actions from the dashboard', () => {
    const { unmount } = renderWorkspace('/workspace/emergency/dashboard');

    fireEvent.click(screen.getByRole('button', { name: /start triage review/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/triage');
    unmount();

    renderWorkspace('/workspace/emergency/dashboard');
    fireEvent.click(screen.getByRole('button', { name: /ask assistant for queue priorities/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Prioritize waiting ED patients'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
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

    fireEvent.click(screen.getByRole('button', { name: /^ask assistant$/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('ED patient journey'),
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

    expect(screen.getAllByRole('heading', { name: /emergency department solution/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Emergency Core MVP/i)).toBeInTheDocument();
    expect(screen.getByText(/30-60 day pilot/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not required for MVP pilot/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/required for every clinical output/i)).toBeInTheDocument();
    expect(screen.getAllByText(/qSOFA/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/high-value sepsis screening calculator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/standalone\/manual input/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/NEWS2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Protocol Retrieval/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /optional add-ons/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Prior Authorization/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/enterprise roadmap expansion/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Triage Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Automation analytics/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Readiness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ready to sell/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/manual-intake triage calculator/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /preview run/i })[0]);
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringMatching(/Review Automated Triage Matrix/i),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('renders the ED triage orchestrator and evidence context', () => {
    const { unmount } = renderWorkspace('/workspace/emergency/triage');
    expect(screen.getByRole('heading', { name: /triage orchestrator/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /qsofa/i })).toBeInTheDocument();
    expect(screen.getByText(/does not make autonomous/i)).toBeInTheDocument();
    unmount();

    renderWorkspace('/workspace/emergency/evidence');
    expect(screen.getByRole('heading', { name: /complaint-driven workflow guidance/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/chief complaint/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chest Pain/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ACS Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cardiology Referral/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not diagnose ACS/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open HEART/i })).toBeInTheDocument();
    expect(screen.getAllByText(/ACS\/chest pain pathway/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ED AI Copilot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vitals/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Recommended tools/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Next workflow step/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Escalation suggestions/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reasoning/i)).toBeInTheDocument();
    expect(screen.getByText(/Chest Pain matched a supported ED route/i)).toBeInTheDocument();
    expect(screen.getByText(/No autonomous diagnosis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask assistant with copilot context/i })).toBeInTheDocument();
  });

  it('routes alternate ED chief complaints to workflow guidance', () => {
    renderWorkspace('/workspace/emergency/evidence');

    fireEvent.change(screen.getByLabelText(/complaint text/i), { target: { value: 'possible sepsis' } });
    expect(screen.getAllByText(/Sepsis Concern/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/qSOFA, NEWS2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sepsis Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not diagnose sepsis/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/complaint text/i), { target: { value: 'dyspnea' } });
    expect(screen.getAllByText(/Shortness of Breath/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wells PE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Respiratory Protocol/i).length).toBeGreaterThan(0);
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
