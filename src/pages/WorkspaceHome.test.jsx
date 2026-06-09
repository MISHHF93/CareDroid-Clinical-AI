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
      /Equipment Status/i,
      /Automation Status/i,
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole('button', { name: /open ems arrivals/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/pre-arrival');
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
    expect(screen.getAllByText(/Automation Status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Boarding Pressure/i).length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getAllByRole('button', { name: /^ask assistant$/i })[0]);
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('ED flow bottlenecks'),
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
    expect(screen.getByText(/without requiring a full hospital-wide deployment/i)).toBeInTheDocument();
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
