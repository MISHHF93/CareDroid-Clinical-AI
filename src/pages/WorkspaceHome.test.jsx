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
    expect(screen.getByText(/ED flow model/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /workspace subpages/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace data status/i)).toHaveTextContent(/Emergency Flow Intelligence Platform/i);
    expect(screen.getAllByText(/demo\/local fallback/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /emergency command center/i })).toBeInTheDocument();
    expect(screen.getByText(/under 60 seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/complete Emergency Department Operating System/i)).toBeInTheDocument();
    expect(screen.getByText(/standalone SaaS solution/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency operating system summary/i)).toHaveTextContent(/SaaS modules/i);
    [
      /Waiting Room/i,
      /EMS Arrivals/i,
      /High Risk Queue/i,
      /Boarding Pressure/i,
      /Referral Queue/i,
      /Capacity Score/i,
      /Resource Availability/i,
      /Automation Status/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole('button', { name: /open ems arrivals/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/ems');
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

  it('renders the ED director hero screen at the command center route', () => {
    renderWorkspace('/workspace/emergency/command-center');

    expect(screen.getByRole('heading', { name: /emergency command center/i })).toBeInTheDocument();
    expect(screen.getByText(/Leadership can scan department status in under 60 seconds/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Door-to-Direction/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /open door-to-direction/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Automation Status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Boarding Pressure/i).length).toBeGreaterThan(0);
  });

  it('renders dedicated ED director and charge nurse views', () => {
    const director = renderWorkspace('/workspace/emergency/director');
    expect(screen.getByRole('heading', { name: /ed director view/i })).toBeInTheDocument();
    expect(screen.getByText(/throughput, boarding, EMS offload, staffing pressure, adoption analytics, and automation ROI/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Patient Path/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Automation ROI/i).length).toBeGreaterThan(0);
    director.unmount();

    renderWorkspace('/workspace/emergency/charge-nurse');
    expect(screen.getByRole('heading', { name: /charge nurse view/i })).toBeInTheDocument();
    expect(screen.getByText(/Room availability, waiting patients, reassessment queue, critical alerts, device availability/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Reassessment Queue/i).length).toBeGreaterThan(0);
  });

  it('renders the ED digital whiteboard with demo patient cards', () => {
    renderWorkspace('/workspace/emergency/whiteboard');

    expect(screen.getByRole('heading', { name: /emergency digital whiteboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Staff can track patient flow visually/i)).toBeInTheDocument();
    ['Arrival', 'Triage', 'Waiting', 'Assessment', 'Orders', 'Results', 'Disposition'].forEach((column) => {
      expect(screen.getAllByText(column).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Sample patient DEMO-ED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Demo data/i).length).toBeGreaterThan(0);
  });

  it('renders the ED Patient Path with Door-to-Direction metrics', () => {
    renderWorkspace('/workspace/emergency/patient-path');

    expect(screen.getByRole('heading', { name: /emergency patient path/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Door-to-Direction/i).length).toBeGreaterThan(0);
    [
      /Arrival Signal/i,
      /Patient Known/i,
      /Risk Known/i,
      /Queue Known/i,
      /Next Action Known/i,
      /Destination Known/i,
      /Throughput Measured/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Sample patient DEMO-ED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Next action:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Demo data/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /explain patient flow blockers/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Explain ED patient flow blockers'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('renders frozen workspaces as Coming Later roadmap modules', () => {
    mockWorkspaceValue.activeWorkspaceId = 'emergency';
    const fleet = renderWorkspace('/workspace/fleet');

    expect(screen.getByRole('heading', { name: /fleet workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fleet is coming later/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Emergency Department Operating System/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/hidden from active workspace selection/i)).toBeInTheDocument();
    expect(mockWorkspaceValue.switchWorkspace).not.toHaveBeenCalledWith('fleet');
    fleet.unmount();

    const research = renderWorkspace('/workspace/research');
    expect(screen.getByRole('heading', { name: /research is coming later/i })).toBeInTheDocument();
    expect(mockWorkspaceValue.switchWorkspace).not.toHaveBeenCalledWith('research');
    research.unmount();

    renderWorkspace('/workspace/education');
    expect(screen.getByRole('heading', { name: /education is coming later/i })).toBeInTheDocument();
    expect(mockWorkspaceValue.switchWorkspace).not.toHaveBeenCalledWith('education');
  });

  it('routes workspace management through profile and launches assistant with context', async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('link', { name: /manage workspaces/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/workspaces');
  });

  it('launches assistant with workspace context', () => {
    renderWorkspace();

    fireEvent.click(screen.getAllByRole('button', { name: /^ask assistant$/i })[0]);
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('ED flow bottlenecks'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('preserves frozen workspace subpage deep links without rendering the old module', () => {
    renderWorkspace('/workspace/laboratory/results');

    expect(screen.getByRole('heading', { name: /laboratory workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /laboratory is coming later/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^results$/i })).not.toBeInTheDocument();
  });

  it('renders workspace automation hub and previews automations through Assistant', () => {
    renderWorkspace('/workspace/emergency/automations');

    expect(screen.getByRole('heading', { name: /ed automation marketplace/i })).toBeInTheDocument();
    [
      /Triage/i,
      /Referral/i,
      /Documentation/i,
      /EMS/i,
      /Capacity/i,
      /Boarding/i,
      /Equipment/i,
      /Discharge/i,
      /Simulation/i,
      /Analytics/i,
    ].forEach((category) => {
      expect(screen.getAllByText(category).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/enabled/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Visibility:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Save|Reduce|Improve|Recover|Prepare/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: /emergency flow intelligence platform/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Emergency Flow Starter MVP/i)).toBeInTheDocument();
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
    expect(screen.getAllByText(/Automated Triage Matrix/i).length).toBeGreaterThan(0);
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

  it('renders the search-first ED knowledge layer', () => {
    renderWorkspace('/workspace/emergency/knowledge');

    expect(screen.getByRole('heading', { name: /emergency knowledge layer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/search emergency knowledge/i)).toBeInTheDocument();
    expect(screen.getByText(/Protocols, calculators, pathways, simulations, evidence, and workflows/i)).toBeInTheDocument();
    expect(screen.getByText(/Chest Pain \/ ACS Guidance/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search emergency knowledge/i), { target: { value: 'sepsis' } });
    expect(screen.getByText(/Sepsis Workflow Guidance/i)).toBeInTheDocument();
    expect(screen.queryByText(/Chest Pain \/ ACS Guidance/i)).not.toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText(/complaint text/i), { target: { value: 'trauma activation' } });
    expect(screen.getAllByText(/Trauma/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Trauma Pathway/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/trauma bay team simulation/i).length).toBeGreaterThan(0);
  });

  it('renders ReferralHub so referral delays are measurable', () => {
    renderWorkspace('/workspace/emergency/referrals');

    expect(screen.getByRole('heading', { name: /referral intelligence network/i })).toBeInTheDocument();
    expect(screen.getByText(/delays become measurable/i)).toBeInTheDocument();
    [
      /Request/i,
      /Classification/i,
      /Department Queue/i,
      /Review/i,
      /Accepted/i,
      /Closed/i,
      /Cardiology/i,
      /Neurology/i,
      /Psychiatry/i,
      /Internal Medicine/i,
      /Surgery/i,
      /ICU/i,
      /Laboratory/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Referral Routing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/delay/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /ask assistant to prioritize referral delays/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Prioritize ReferralHub delays'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('renders the ED analytics MVP route with ROI and adoption metrics', () => {
    renderWorkspace('/workspace/emergency/analytics');

    expect(screen.getByRole('heading', { name: /roi and adoption dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/provide measurable value/i)).toBeInTheDocument();
    [
      /Assessments completed/i,
      /Calculators used/i,
      /Protocol retrievals/i,
      /Workflow launches/i,
      /AI requests/i,
      /Simulation completion/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { name: /demonstrate ROI and adoption/i })).toBeInTheDocument();
    expect(screen.getByText(/time saved/i)).toBeInTheDocument();
    expect(screen.getByText(/do not score autonomous clinical quality/i)).toBeInTheDocument();
  });

  it('renders the Emergency Automation ROI route with measurable value signals', () => {
    renderWorkspace('/workspace/emergency/automation-roi');

    expect(screen.getByRole('heading', { name: /emergency automation roi/i })).toBeInTheDocument();
    expect(screen.getByText(/time saved, clicks reduced, queue impact, throughput impact, and adoption/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Time saved/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clicks reduced/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Queue impact/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Adoption/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/workflow value only/i)).toBeInTheDocument();
  });

  it('renders the ED onboarding walkthrough and launches walkthrough targets', () => {
    renderWorkspace('/workspace/emergency/onboarding');

    expect(screen.getByRole('heading', { name: /emergency workspace onboarding/i })).toBeInTheDocument();
    expect(screen.getByText(/understand the Emergency Workspace in 10 minutes/i)).toBeInTheDocument();
    [
      /Emergency Workspace overview/i,
      /Calculators/i,
      /Protocols/i,
      /AI Copilot/i,
      /Workflows/i,
      /Analytics/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { name: /run the first hospital demo/i })).toBeInTheDocument();
    expect(screen.getByText(/Open the Emergency Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Close with analytics/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open analytics/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/analytics');
  });

  it('renders Emergency Demo Mode with sample data clearly labeled as demo-only', () => {
    renderWorkspace('/workspace/emergency/demo');

    expect(screen.getByRole('heading', { name: /caredroid emergency demo hospital/i })).toBeInTheDocument();
    expect(screen.getByText(/No live EHR, ADT, telemetry, protocol, or analytics integration/i)).toBeInTheDocument();
    [
      /Sample patients/i,
      /Sample alerts/i,
      /Sample workflows/i,
      /Sample protocols/i,
      /Sample analytics/i,
    ].forEach((heading) => {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Demo data/i).length).toBeGreaterThan(10);
    expect(screen.getAllByText(/Demo tenant/i).length).toBeGreaterThan(10);
    expect(screen.getAllByText(/No live integration/i).length).toBeGreaterThan(10);
    expect(screen.getByText(/Demo Patient A/i)).toBeInTheDocument();
    expect(screen.getByText(/Stroke window review/i)).toBeInTheDocument();
    expect(screen.getByText(/ACS\/chest pain pathway/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /open sample/i })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/evidence');
  });

  it('renders the ED ROI estimator for sales and onboarding discovery', () => {
    renderWorkspace('/workspace/emergency/roi');

    expect(screen.getByRole('heading', { name: /ed roi estimator/i })).toBeInTheDocument();
    expect(screen.getByText(/sales discovery, onboarding/i)).toBeInTheDocument();
    const annualVolumeInput = screen.getByLabelText(/annual ed volume/i);
    const physicianInput = screen.getByLabelText(/physician count/i);
    const nursingInput = screen.getByLabelText(/nursing count/i);
    const assessmentsInput = screen.getByLabelText(/average assessments\/day/i);

    expect(annualVolumeInput).toHaveValue(42000);
    expect(physicianInput).toHaveValue(32);
    expect(nursingInput).toHaveValue(88);
    expect(assessmentsInput).toHaveValue(115);
    expect(screen.getByText(/Estimated time saved/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/Adoption potential/i)).toBeInTheDocument();
    expect(screen.getByText(/planning estimate/i)).toBeInTheDocument();

    fireEvent.change(annualVolumeInput, { target: { value: '60000' } });
    fireEvent.change(assessmentsInput, { target: { value: '150' } });

    expect(annualVolumeInput).toHaveValue(60000);
    expect(assessmentsInput).toHaveValue(150);
    expect(screen.getByText(/hours\/year/i)).toBeInTheDocument();
  });

  it('renders the first customer deployment blueprint with low-risk phases', () => {
    renderWorkspace('/workspace/emergency/deployment');

    expect(screen.getByRole('heading', { name: /first customer deployment blueprint/i })).toBeInTheDocument();
    expect(screen.getAllByText(/minimal operational risk/i).length).toBeGreaterThan(0);
    [
      /Standalone Emergency Workspace/i,
      /Protocol Library/i,
      /AI Copilot/i,
      /Analytics/i,
      /Optional Integrations/i,
    ].forEach((phase) => {
      expect(screen.getAllByText(phase).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/No integrations required/i)).toBeInTheDocument();
    expect(screen.getByText(/No live writeback/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum sellable Emergency OS/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient Journey Engine, Queue Intelligence, ED Copilot, Referral Intelligence, EMS Intelligence, Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/30-day pilot plan/i)).toBeInTheDocument();
    expect(screen.getByText(/60-day rollout plan/i)).toBeInTheDocument();
    expect(screen.getByText(/90-day expansion plan/i)).toBeInTheDocument();
    expect(screen.getByText(/without requiring a full hospital-wide deployment/i)).toBeInTheDocument();
  });

  it('renders the Emergency OS implementation summary write-up in the application', () => {
    renderWorkspace('/workspace/emergency/implementation');

    expect(screen.getByRole('heading', { name: /emergency os mvp implementation summary/i })).toBeInTheDocument();
    expect(screen.getByText(/docs\/emergency-os-mvp-implementation-summary\.md/i)).toBeInTheDocument();
    expect(screen.getByText(/Every ED OS plan has an application surface/i)).toBeInTheDocument();
    expect(screen.getByText(/Door-to-Doctor Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Waiting Room Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency KPI Layer/i)).toBeInTheDocument();
    expect(screen.getByText(/First Customer Path/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient Journey Engine, Queue Intelligence, ED Copilot, Referral Intelligence, EMS Intelligence, Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/9 files/i)).toBeInTheDocument();
    expect(screen.getByText(/69 focused tests passing/i)).toBeInTheDocument();
    expect(screen.getByText(/Research Workspace, Education Workspace, Governance Workspace, Fleet Workspace, Medical IoT Workspace, Laboratory Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/No live EHR or ADT ingestion in the MVP/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /open capability/i })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/throughput');
  });

  it('renders the Emergency Flow Intelligence platform as an end-to-end solution', () => {
    renderWorkspace('/workspace/emergency/flow');

    expect(screen.getAllByRole('heading', { name: /emergency flow intelligence platform/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reduce ED bottlenecks/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hospitals pay for flow/i })).toBeInTheDocument();
    expect(screen.getByText(/Too many patients/i)).toBeInTheDocument();
    expect(screen.getByText(/Too much cognitive load/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /throughput, capacity, coordination, and cognitive load/i })).toBeInTheDocument();
    expect(screen.getByText(/arrival-to-triage time/i)).toBeInTheDocument();
    expect(screen.getAllByText(/boarding delay/i).length).toBeGreaterThan(0);
    [
      /Arrival/i,
      /Triage/i,
      /Assessment/i,
      /Orders/i,
      /Results/i,
      /Disposition/i,
      /Admission\/Discharge/i,
    ].forEach((stage) => {
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
    });
    [
      /Pre-Hospital Intelligence/i,
      /EMS-to-ED Handoff/i,
      /Dynamic Triage/i,
      /Bed Flow Intelligence/i,
      /Referral Automation/i,
      /Discharge Acceleration/i,
      /Equipment Intelligence/i,
      /Surge Prediction/i,
      /ED Copilot/i,
      /ED Command Center/i,
    ].forEach((solution) => {
      expect(screen.getAllByText(solution).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Automation registry/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow registry/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics model/i)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard model/i)).toBeInTheDocument();
    expect(screen.getByText(/AI model/i)).toBeInTheDocument();
    expect(screen.getByText(/SaaS packages/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Flow Enterprise/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Flow Starter can be demonstrated and piloted/i)).toBeInTheDocument();
    expect(screen.getByText(/without ADT, EHR, EMS CAD/i)).toBeInTheDocument();
    expect(screen.getByText(/without hospital-wide deployment/i)).toBeInTheDocument();
    expect(screen.getByText(/never makes autonomous/i)).toBeInTheDocument();
  });

  it('renders Emergency Queue Intelligence with early bottleneck warnings', () => {
    renderWorkspace('/workspace/emergency/queues');

    expect(screen.getByRole('heading', { name: /emergency queue intelligence/i })).toBeInTheDocument();
    expect(screen.getByText(/before staff notice bottlenecks/i)).toBeInTheDocument();
    [
      /Waiting Room/i,
      /Triage Queue/i,
      /Provider Queue/i,
      /Results Queue/i,
      /Referral Queue/i,
      /Admission Queue/i,
      /Discharge Queue/i,
      /EMS Pre-Arrival Queue/i,
    ].forEach((queueLabel) => {
      expect(screen.getAllByText(queueLabel).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Oldest patient/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Throughput/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Early warning/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /ask assistant to prioritize queue bottlenecks/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Prioritize Emergency Queue Intelligence bottlenecks'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('renders the new ED OS MVP dashboards', () => {
    const throughput = renderWorkspace('/workspace/emergency/throughput');
    expect(screen.getByRole('heading', { name: /emergency throughput/i })).toBeInTheDocument();
    expect(screen.getByText(/Door-to-Doctor Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/EmergencyKPILayer/i)).toBeInTheDocument();
    throughput.unmount();

    const waitingRoom = renderWorkspace('/workspace/emergency/waiting-room');
    expect(screen.getByRole('heading', { name: /waiting room health/i })).toBeInTheDocument();
    expect(screen.getByText(/Waiting Room Health Score/i)).toBeInTheDocument();
    expect(screen.getByText(/ReassessmentQueue/i)).toBeInTheDocument();
    waitingRoom.unmount();

    const ems = renderWorkspace('/workspace/emergency/ems');
    expect(screen.getByRole('heading', { name: /ems pressure/i })).toBeInTheDocument();
    expect(screen.getAllByText(/waiting handoffs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/longest offload/i).length).toBeGreaterThan(0);
    ems.unmount();

    const resources = renderWorkspace('/workspace/emergency/resources');
    expect(screen.getByRole('heading', { name: /operational resources/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Rooms/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Infusion Pumps/i).length).toBeGreaterThan(0);
    resources.unmount();

    const escalations = renderWorkspace('/workspace/emergency/escalations');
    expect(screen.getByRole('heading', { name: /operational risk/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Capacity overload/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Critical device outage/i).length).toBeGreaterThan(0);
    escalations.unmount();

    renderWorkspace('/workspace/emergency/simulations');
    expect(screen.getByRole('heading', { name: /operational training/i })).toBeInTheDocument();
    expect(screen.getByText(/Mass Casualty/i)).toBeInTheDocument();
    expect(screen.getByText(/Boarding Crisis/i)).toBeInTheDocument();
  });

  it('renders EMS pre-arrival context before the patient arrives', () => {
    renderWorkspace('/workspace/emergency/pre-arrival');

    expect(screen.getByRole('heading', { name: /ems pre-arrival workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/Patient journey context starts before arrival/i)).toBeInTheDocument();
    [
      /EMS Assessment/i,
      /Complaint/i,
      /Vitals/i,
      /Risk Profile/i,
      /ED Notification/i,
      /Arrival/i,
    ].forEach((step) => {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Inbound EMS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Risk score bundle/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Handoff summary/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ETA/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /ask assistant to prepare ed handoff/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Prepare ED for incoming EMS patients'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('renders Emergency Capacity Intelligence for instant department pressure awareness', () => {
    renderWorkspace('/workspace/emergency/capacity');

    expect(screen.getByRole('heading', { name: /emergency capacity intelligence/i })).toBeInTheDocument();
    expect(screen.getByText(/understand department pressure instantly/i)).toBeInTheDocument();
    expect(screen.getByText(/Capacity Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk Level/i)).toBeInTheDocument();
    [
      /Current census/i,
      /Occupied spaces/i,
      /Available spaces/i,
      /Pending admissions/i,
      /Boarding patients/i,
      /EMS arrivals/i,
      /Discharge candidates/i,
    ].forEach((signal) => {
      expect(screen.getAllByText(signal).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Escalate boarding relief/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ask assistant to summarize capacity pressure/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Summarize ED capacity pressure'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('renders Boarding Intelligence so admitted bed waits are measurable', () => {
    renderWorkspace('/workspace/emergency/boarding');

    expect(screen.getByRole('heading', { name: /boarding intelligence engine/i })).toBeInTheDocument();
    expect(screen.getByText(/admitted patients waiting for beds/i)).toBeInTheDocument();
    expect(screen.getByText(/Boarding Risk Score/i)).toBeInTheDocument();
    expect(screen.getAllByText(/boarding patients/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/boarding time/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pending beds/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Review longest boarders/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ask assistant to summarize boarding pressure/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Summarize ED boarding pressure'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('redirects invalid workspace subpages to the normalized hero subpage', async () => {
    renderWorkspace('/workspace/emergency/not-real');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/command-center');
    });
  });

  it('keeps frozen Medical IoT and Governance routes as roadmap placeholders', () => {
    const { unmount } = renderWorkspace('/workspace/medical-iot/devices');
    expect(screen.getByRole('heading', { name: /medical iot workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /medical iot is coming later/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^devices$/i })).not.toBeInTheDocument();
    unmount();

    renderWorkspace('/workspace/governance/security');
    expect(screen.getByRole('heading', { name: /governance workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /governance is coming later/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^security$/i })).not.toBeInTheDocument();
  });
});
