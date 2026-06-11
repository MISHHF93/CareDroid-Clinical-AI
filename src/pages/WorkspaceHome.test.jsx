import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import WorkspaceHome from './WorkspaceHome';
import { EmergencyDepartmentProvider } from '../contexts/EmergencyDepartmentContext';
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
      <EmergencyDepartmentProvider>
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
      </EmergencyDepartmentProvider>
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

    expect(screen.getByRole('heading', { name: /^CareDroid Emergency OS$/i })).toBeInTheDocument();
    expect(screen.getByText(/AI-assisted patient flow for small emergency departments/i)).toBeInTheDocument();
    expect(screen.queryByText(/emergency department operating environment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ED flow model/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Context/i)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /workspace subpages/i })).toBeInTheDocument();
    expect(screen.queryByText(/Final compressed navigation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/9 core tabs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Emergency routes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Flattened ED tasks/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /scan ed status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Command Center$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/More ED actions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Clinical work/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pilot proof/i)).not.toBeInTheDocument();
    const primaryNavLabels = Array.from(
      screen.getByRole('navigation', { name: /workspace subpages/i }).querySelectorAll('a')
    ).map((link) => link.textContent);
    expect(primaryNavLabels).toEqual(['Whiteboard', 'Patients', 'EMS', 'Operations', 'Copilot']);
    primaryNavLabels.forEach((label) => {
      expect(screen.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /^Patients$/i })).toHaveAttribute('href', '/workspace/emergency/patients');
    expect(screen.queryByRole('link', { name: /^Analytics$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Automations$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Capacity$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/workspace data status/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Emergency Whiteboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/Primary workspace screen/i)).toBeInTheDocument();
    expect(screen.getByText(/Journey controls/i)).toBeInTheDocument();
    expect(screen.getByText(/Toronto urgent care flow/i)).toBeInTheDocument();
    expect(screen.getByText(/patients\/day across chest pain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency whiteboard summary/i)).toHaveTextContent(/active patients/i);
    expect(screen.getByLabelText(/emergency whiteboard summary/i)).toHaveTextContent(/Capacity score/i);
    expect(screen.getByLabelText(/queue counts/i)).toHaveTextContent(/Waiting/i);
    expect(screen.getByText(/Maya Chen/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /move to next state/i }).length).toBeGreaterThan(0);
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

  it('keeps detailed Emergency capabilities reachable by deep link instead of primary menus', () => {
    const root = renderWorkspace('/workspace/emergency');
    expect(screen.queryByRole('link', { name: /^Analytics$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Automations$/i })).not.toBeInTheDocument();
    root.unmount();

    renderWorkspace('/workspace/emergency/analytics');
    expect(screen.getByRole('heading', { name: /roi and adoption dashboard/i })).toBeInTheDocument();
  });

  it('renders Emergency Intake OS command center, patient context, and analytics routes', () => {
    const intakeRoute = renderWorkspace('/workspace/emergency/intake');

    expect(screen.getByRole('heading', { name: /emergency intake command center/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Smart Arrival$/i })).toBeInTheDocument();
    expect(screen.getByText(/embedded Emergency Workspace capability, not a separate intake app/i)).toBeInTheDocument();
    expect(screen.getByText(/Capture ID document/i)).toBeInTheDocument();
    expect(screen.getByText(/Medication list ingestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Allergy extraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient Snapshot contains:/i)).toBeInTheDocument();
    expect(screen.getByText(/patient confirmation or staff confirmation is required before finalizing/i)).toBeInTheDocument();
    expect(screen.getByText(/patient arrives inside Emergency OS already summarized/i)).toBeInTheDocument();
    expect(screen.getByText(/registration completion score/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create intake record/i })).toBeInTheDocument();
    expect(screen.getByText(/Only confirmed values are promoted/i)).toBeInTheDocument();
    expect(screen.getByText(/conflict highlighted/i)).toBeInTheDocument();
    expect(screen.getAllByText(/missing required value/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/documents become structured data/i)).toBeInTheDocument();
    expect(screen.getByText(/uploaded, scanned, photographed, integration-supplied/i)).toBeInTheDocument();
    expect(screen.getByText(/unresolved: groupId/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /referral document ingestion/i })).toBeInTheDocument();
    expect(screen.getByText(/source references stored/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pre-triage queue/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Queue position 1/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /voice assisted intake/i })).toBeInTheDocument();
    expect(screen.getByText(/speech-derived fields remain proposed/i)).toBeInTheDocument();
    expect(screen.getByText(/My name is Jordan Lee/i)).toBeInTheDocument();
    expect(screen.getByText(/requires staff confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/intake is packaged as a sellable/i)).toBeInTheDocument();
    expect(screen.getByText(/Core to Pro/i)).toBeInTheDocument();
    intakeRoute.unmount();

    const patientContextRoute = renderWorkspace('/workspace/emergency/patient-context');

    expect(screen.getByRole('heading', { name: /^Patient Snapshot$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /patient arrives summarized in emergency os/i })).toBeInTheDocument();
    expect(screen.getByText(/Demographics: Jordan Lee/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrival complaint: Chest Pain/i)).toBeInTheDocument();
    expect(screen.getByText(/Referral reason: ED assessment recommended/i)).toBeInTheDocument();
    expect(screen.getByText(/separate intake app created: no/i)).toBeInTheDocument();
    expect(screen.getByText(/Who is this patient\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Key medications\?/i)).toBeInTheDocument();
    expect(screen.getByText(/demographics freshness/i)).toBeInTheDocument();
    expect(screen.getByText(/medications freshness/i)).toBeInTheDocument();
    expect(screen.getByText(/Duplicates:/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence Score/i)).toBeInTheDocument();
    expect(screen.getByText(/MRN-204421/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolution workflow/i)).toBeInTheDocument();
    patientContextRoute.unmount();

    renderWorkspace('/workspace/emergency/intake-analytics');
    expect(screen.getByRole('heading', { name: /patient intake analytics/i })).toBeInTheDocument();
    expect(screen.getByText(/Average registration time/i)).toBeInTheDocument();
    expect(screen.getByText(/averageRegistrationTime/i)).toBeInTheDocument();
    expect(screen.getByText(/document-processing-volume trend/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /patient flow door to triage/i })).toBeInTheDocument();
    expect(screen.getByText(/T\+0m to T\+1m/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /first five minute experience/i })).toBeInTheDocument();
    expect(screen.getByText(/no autonomous triage decision/i)).toBeInTheDocument();
    expect(screen.getByText(/triage staff · measured/i)).toBeInTheDocument();
    expect(screen.getByText(/Unresolved: allergy confirmation incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/all intake automations feed emergency os/i)).toBeInTheDocument();
    expect(screen.getByText(/Consent and Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Intake Analytics:/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /markdown plans linked to implementation/i })).toBeInTheDocument();
    expect(screen.getByText(/19 plans/i)).toBeInTheDocument();
    expect(screen.getByText(/docs\/smart-patient-intake-engine.md/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /product surfaces connected/i })).toBeInTheDocument();
    expect(screen.getByText(/Document review workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency command center and Patient Journey Engine views/i)).toBeInTheDocument();
  });

  it('renders the ED director hero screen at the command center route', () => {
    renderWorkspace('/workspace/emergency/command-center');

    expect(screen.getByRole('heading', { name: /queue, alerts, risk, actions/i })).toBeInTheDocument();
    ['Queue', 'Alerts', 'High Risk Patients', 'Actions'].forEach((section) => {
      expect(screen.getAllByText(new RegExp(section, 'i')).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Visual noise reduction/i)).toBeInTheDocument();
    expect(screen.getAllByText(/36%/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Expand complaint pathways/i)).toBeInTheDocument();
    expect(screen.getByText(/Details: workflow sections/i)).toBeInTheDocument();
    expect(screen.getByText(/Drill-down: director metrics/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /command-to-action launcher/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stroke patient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show high-risk waiting patients/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fast, focused, operational/i })).toBeInTheDocument();
    expect(screen.getByText(/Clicks reduced/i)).toBeInTheDocument();
    expect(screen.getByText(/Tabs reduced/i)).toBeInTheDocument();
    expect(screen.getByText(/Duplicate actions removed/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /personalized dashboard, actions, and recommendations/i })).toBeInTheDocument();
    ['ED Physician', 'Charge Nurse', 'Triage Nurse', 'Resident', 'ED Director'].forEach((role) => {
      expect(screen.getByRole('tab', { name: new RegExp(role, 'i') })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Expand complaint pathways/i));
    expect(screen.getByRole('heading', { name: /start with the presentation/i })).toBeInTheDocument();
    ['Chest Pain', 'Stroke Symptoms', 'Shortness of Breath', 'Trauma', 'Abdominal Pain', 'Psychiatric Crisis', 'Sepsis Concern'].forEach((complaint) => {
      expect(screen.getByRole('button', { name: new RegExp(`start ${complaint}`, 'i') })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Referrals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Copilot/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Calculators/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Protocols/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(/Details: workflow sections/i));
    expect(screen.getByRole('heading', { name: /80% of ed activity starts here/i })).toBeInTheDocument();
    [
      /Current Queue/i,
      /High Risk Patients/i,
      /EMS Arrivals/i,
      /Alerts/i,
      /Referrals/i,
      /Capacity/i,
      /AI Recommendations/i,
    ].forEach((section) => {
      expect(screen.getAllByText(section).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Suggested Action/i).length).toBeGreaterThanOrEqual(7);
    [/Escalate/i, /Reassess/i, /Review/i, /Refer/i, /Complete/i].forEach((action) => {
      expect(screen.getAllByText(action).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText(/Drill-down: director metrics/i));
    expect(screen.getByRole('heading', { name: /emergency command center/i })).toBeInTheDocument();
    expect(screen.getByText(/Leadership can scan department status in under 60 seconds/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Door-to-Direction/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /open door-to-direction/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Automation Status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Boarding Pressure/i).length).toBeGreaterThan(0);
  });

  it('personalizes the ED command center by role without separate apps', () => {
    const chargeScenario = renderWorkspace('/workspace/emergency/command-center');

    expect(screen.getByRole('tab', { name: /ed physician/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/ED Physician personalized dashboard/i)).toHaveTextContent(/Clinical risk/i);
    expect(screen.getByText(/Start with high-risk patients/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /charge nurse/i }));
    expect(screen.getByRole('tab', { name: /charge nurse/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Charge Nurse personalized dashboard/i)).toHaveTextContent(/Rooms, flow/i);
    expect(screen.getByText(/Use the Whiteboard as the first operational surface/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Whiteboard/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open whiteboard/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /generate charge nurse action plan/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Charge Nurse'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency');
    chargeScenario.unmount();

    renderWorkspace('/workspace/emergency/command-center');
    fireEvent.click(screen.getByRole('tab', { name: /resident/i }));
    expect(screen.getByLabelText(/Resident personalized dashboard/i)).toHaveTextContent(/Learning-safe workflows/i);
    fireEvent.click(screen.getByRole('button', { name: /generate resident action plan/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('resident-safe ED teaching summary'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency');
  });

  it('launches Emergency Copilot text commands into workspace actions', () => {
    const strokeScenario = renderWorkspace('/workspace/emergency/command-center');
    fireEvent.change(screen.getAllByLabelText(/emergency copilot command/i)[0], {
      target: { value: 'Stroke patient' },
    });
    expect(screen.getByLabelText(/Resolved Emergency Copilot action/i)).toHaveTextContent(/Show stroke workflow/i);
    expect(screen.getByLabelText(/Resolved Emergency Copilot action/i)).toHaveTextContent(/NIHSS/i);
    fireEvent.click(screen.getByRole('button', { name: /launch command/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Open stroke workflow'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/evidence');
    strokeScenario.unmount();

    renderWorkspace('/workspace/emergency/command-center');
    fireEvent.click(screen.getByRole('button', { name: /show high-risk waiting patients/i }));
    fireEvent.click(screen.getByRole('button', { name: /launch command/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Show high-risk waiting patients'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/waiting-room');
  });

  it('embeds Emergency Copilot navigation across operational surfaces', () => {
    const submitCopilot = (label, command) => {
      const input = screen.getByLabelText(label);
      fireEvent.change(input, { target: { value: command } });
      fireEvent.submit(input.closest('form'));
    };

    const patientCards = renderWorkspace('/workspace/emergency/patient-path');
    expect(screen.getByRole('heading', { name: /navigate patient cards with copilot/i })).toBeInTheDocument();
    submitCopilot(/patient cards emergency copilot command/i, 'Find high-risk patients');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Find high-risk patients'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/patient-path');
    patientCards.unmount();

    const referrals = renderWorkspace('/workspace/emergency/referrals');
    expect(screen.getByRole('heading', { name: /navigate referrals with copilot/i })).toBeInTheDocument();
    submitCopilot(/referrals emergency copilot command/i, 'Open chest pain workflow');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Chest Pain pathway'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/evidence');
    referrals.unmount();

    const boarding = renderWorkspace('/workspace/emergency/boarding');
    expect(screen.getByRole('heading', { name: /navigate boarding with copilot/i })).toBeInTheDocument();
    submitCopilot(/boarding emergency copilot command/i, 'Show boarding bottlenecks');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Show boarding bottlenecks'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/boarding');
    boarding.unmount();

    const capacity = renderWorkspace('/workspace/emergency/capacity');
    expect(screen.getByRole('heading', { name: /navigate capacity with copilot/i })).toBeInTheDocument();
    submitCopilot(/capacity emergency copilot command/i, 'Show capacity pressure');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Show capacity pressure'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/capacity');
    capacity.unmount();

    renderWorkspace('/workspace/emergency/ems');
    expect(screen.getByRole('heading', { name: /navigate ems with copilot/i })).toBeInTheDocument();
    submitCopilot(/ems emergency copilot command/i, 'Show EMS handoffs');
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Show EMS handoffs'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/ems');
  });

  it('moves patients through the journey from the Whiteboard', () => {
    renderWorkspace('/workspace/emergency');

    const patientCard = screen.getByText(/Maya Chen/i).closest('article');
    expect(patientCard).toHaveTextContent(/Assessment/i);

    fireEvent.click(within(patientCard).getByRole('button', { name: /move to next state/i }));

    expect(patientCard).toHaveTextContent(/Orders/i);
    expect(patientCard).toHaveTextContent(/Last moved/i);
  });

  it('launches complaint pathways without routing through tools or calculators first', () => {
    renderWorkspace('/workspace/emergency/command-center');

    fireEvent.click(screen.getByText(/Expand complaint pathways/i));
    fireEvent.click(screen.getByRole('button', { name: /start chest pain/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Launch Chest Pain complaint-first pathway'),
      'user'
    );
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Complaint -> Workflow -> Calculators -> Protocols -> Referrals -> AI Copilot'),
      'user'
    );
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('ACS Workflow'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency');
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

  it('renders the primary ED whiteboard with demo patient cards and operating actions', async () => {
    renderWorkspace('/workspace/emergency');

    expect(screen.getByRole('heading', { name: /^Emergency Whiteboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/Journey controls/i)).toBeInTheDocument();
    expect(screen.getByText(/Toronto urgent care flow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/patients in ReassessmentQueue/i)).toHaveTextContent(/ReassessmentQueue/i);
    expect(screen.getByLabelText(/CapacityBanner/i)).toHaveTextContent(/Capacity Intelligence/i);
    expect(screen.getByLabelText(/CapacityBanner/i)).toHaveTextContent(/Occupancy/i);
    expect(screen.getByLabelText(/CapacityBanner/i)).toHaveTextContent(/Boarding/i);
    expect(screen.getByLabelText(/CapacityBanner/i)).toHaveTextContent(/Reassessment/i);
    expect(screen.getByLabelText(/shift summary view/i)).toHaveTextContent(/Patients seen/i);
    expect(screen.getByLabelText(/shift summary view/i)).toHaveTextContent(/Avg wait/i);
    expect(screen.getByLabelText(/shift summary view/i)).toHaveTextContent(/Dispositions/i);
    expect(screen.getByLabelText(/shift summary view/i)).toHaveTextContent(/Flagged events/i);
    expect(screen.getByLabelText(/emergency whiteboard summary/i)).toHaveTextContent(/Total patients/i);
    expect(screen.getByLabelText(/emergency whiteboard summary/i)).toHaveTextContent(/Capacity score/i);
    expect(screen.getByLabelText(/queue counts/i)).toHaveTextContent(/Triage/i);
    expect(screen.getByLabelText(/queue counts/i)).toHaveTextContent(/Provider/i);
    const queuePanel = screen.getByLabelText(/emergency queue panel/i);
    expect(within(queuePanel).getByRole('heading', { name: /queue panel/i })).toBeInTheDocument();
    ['Waiting', 'Triage', 'Provider', 'Results', 'Referral', 'Admission', 'Discharge', 'Reassessment'].forEach((queue) => {
      expect(within(queuePanel).getByRole('button', { name: new RegExp(queue, 'i') })).toBeInTheDocument();
    });
    expect(within(queuePanel).getAllByText(/avg wait/i).length).toBe(8);
    expect(screen.getByText(/Red = high risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Yellow = waiting too long/i)).toBeInTheDocument();
    expect(screen.getByText(/Green = stable/i)).toBeInTheDocument();
    expect(screen.getByText(/Maya Chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Chest pain after climbing stairs/i)).toBeInTheDocument();
    expect(screen.getByText(/Lucas Martin/i)).toBeInTheDocument();
    expect(screen.getByText(/Fever and cough after school outbreak/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Location$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/staff assignment panel/i)).toHaveTextContent(/Team of 5/i);
    expect(screen.getByLabelText(/staff assignment panel/i)).toHaveTextContent(/Dr\. Ahmed Khan/i);
    expect(screen.getByLabelText(/staff assignment panel/i)).toHaveTextContent(/RN Marcus Lee/i);
    expect(screen.getByLabelText(/staff workload per person/i)).toHaveTextContent(/Physician/i);
    fireEvent.change(screen.getByLabelText(/Assign Lucas Martin/i), {
      target: { value: 'Dr. Laura Singh' },
    });
    expect(screen.getByLabelText(/Assign Lucas Martin/i)).toHaveValue('Dr. Laura Singh');
    expect(screen.getAllByRole('button', { name: /move to next state/i }).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Capacity Alert:'),
        })
      )
    );
  });

  it('filters the ED whiteboard from the collapsible QueuePanel', () => {
    renderWorkspace('/workspace/emergency');

    const queuePanel = screen.getByLabelText(/emergency queue panel/i);
    fireEvent.click(within(queuePanel).getByRole('button', { name: /^Waiting/i }));

    expect(screen.getByText(/Showing 1 Waiting queue patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Lucas Martin/i)).toBeInTheDocument();
    expect(screen.queryByText(/Maya Chen/i)).not.toBeInTheDocument();

    fireEvent.click(within(queuePanel).getByRole('button', { name: /collapse/i }));
    expect(within(queuePanel).queryByRole('button', { name: /^Waiting/i })).not.toBeInTheDocument();

    fireEvent.click(within(queuePanel).getByRole('button', { name: /expand/i }));
    expect(within(queuePanel).getByRole('button', { name: /^Waiting/i })).toBeInTheDocument();

    fireEvent.click(within(queuePanel).getByRole('button', { name: /all active patients/i }));
    expect(screen.getByText(/Showing all active whiteboard patients/i)).toBeInTheDocument();
    expect(screen.getByText(/Maya Chen/i)).toBeInTheDocument();
  });

  it('adds a new triage patient from the whiteboard chat intake flow', () => {
    renderWorkspace('/workspace/emergency');

    fireEvent.click(screen.getByRole('button', { name: /new patient/i }));
    const chatPanel = screen.getByLabelText(/new patient chat panel/i);

    expect(within(chatPanel).getByRole('heading', { name: /step 1 of 4/i })).toBeInTheDocument();
    fireEvent.click(within(chatPanel).getByRole('button', { name: /chest pain/i }));
    fireEvent.click(within(chatPanel).getByRole('button', { name: /continue/i }));

    expect(within(chatPanel).getByRole('heading', { name: /step 2 of 4/i })).toBeInTheDocument();
    fireEvent.change(within(chatPanel).getByLabelText(/^HR$/i), { target: { value: '118' } });
    fireEvent.change(within(chatPanel).getByLabelText(/^BP$/i), { target: { value: '146/88' } });
    fireEvent.change(within(chatPanel).getByLabelText(/^SpO2$/i), { target: { value: '96' } });
    fireEvent.change(within(chatPanel).getByLabelText(/^Temp$/i), { target: { value: '36.9' } });
    fireEvent.change(within(chatPanel).getByLabelText(/^RR$/i), { target: { value: '22' } });
    fireEvent.click(within(chatPanel).getByRole('button', { name: /continue/i }));

    expect(within(chatPanel).getByRole('heading', { name: /step 3 of 4/i })).toBeInTheDocument();
    expect(within(chatPanel).getByText(/HEART Score/i)).toBeInTheDocument();
    fireEvent.click(within(chatPanel).getByRole('button', { name: /continue/i }));

    expect(within(chatPanel).getByRole('heading', { name: /step 4 of 4/i })).toBeInTheDocument();
    expect(within(chatPanel).getAllByText(/Triage/i).length).toBeGreaterThan(0);
    fireEvent.click(within(chatPanel).getByRole('button', { name: /confirm and add patient/i }));

    expect(screen.queryByLabelText(/new patient chat panel/i)).not.toBeInTheDocument();
    expect(screen.getByText(/New ED Patient 9/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing 3 Triage queue patients/i)).toBeInTheDocument();
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
    expect(screen.getAllByText(/Inbound EMS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ED Handoff Summary:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/EMS Pre-Arrival Queue/i).length).toBeGreaterThan(0);
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

  it('renders the commercial Patients surface at the primary Emergency OS route', () => {
    renderWorkspace('/workspace/emergency/patients');

    expect(screen.getByRole('heading', { name: /Patient Journey Engine/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /emergency patient path/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Patient operating queues/i).length).toBeGreaterThan(0);
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

  it('does not render generic workspace management chrome on Emergency', async () => {
    renderWorkspace();

    expect(screen.queryByRole('link', { name: /manage workspaces/i })).not.toBeInTheDocument();
  });

  it('does not render the generic header Assistant action on Emergency', () => {
    renderWorkspace();

    expect(screen.queryByRole('button', { name: /^ask assistant$/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: /single triage workflow/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vitals/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/patient age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/risk factors/i)).toBeInTheDocument();
    expect(screen.getByText(/Dynamic Risk Bundle Engine/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Emergency Risk Profile/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Risk Bundle/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/qSOFA, NEWS2/i)).toBeInTheDocument();
    expect(screen.getByText(/disconnected calculators hidden/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /qsofa/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Critical risk information/i)).toBeInTheDocument();
    expect(screen.getByText(/Warfarin reported/i)).toBeInTheDocument();
    expect(screen.getByText(/does not make autonomous/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/complaint/i), { target: { value: 'Chest Pain' } });
    expect(screen.getAllByText(/ACS Workflow/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /review emergency risk profile/i }));
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Review Dynamic Risk Bundle Engine output'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
    unmount();

    renderWorkspace('/workspace/emergency/evidence');
    expect(screen.getByRole('heading', { name: /complaint-driven workflow guidance/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/chief complaint/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chest Pain/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ACS Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cardiology Referral/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not diagnose ACS/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /launch surfaced HEART/i })).toBeInTheDocument();
    expect(screen.getAllByText(/ACS\/chest pain pathway/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ED AI Copilot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vitals/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Surfaced calculators/i).length).toBeGreaterThan(0);
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

    fireEvent.change(screen.getByLabelText(/complaint text/i), { target: { value: 'abdominal pain' } });
    expect(screen.getAllByText(/Abdominal Pain/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Abdominal Pain Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BISAP/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/complaint text/i), { target: { value: 'psychiatric crisis' } });
    expect(screen.getAllByText(/Psychiatric Crisis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Psychiatric Crisis Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/C-SSRS/i).length).toBeGreaterThan(0);
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
    expect(screen.getByRole('heading', { name: /next recommended action/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Emergency Flow Engine monitored stages/i)).toHaveTextContent(/Arrival/);
    expect(screen.getAllByText(/Next Recommended Action:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Delayed referrals/i)).toBeInTheDocument();
    expect(screen.getByText(/Delayed reassessments/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Reassessment Queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Reassessment Intelligence:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Needs Reassessment/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/abnormal vitals/i).length).toBeGreaterThan(0);
    fireEvent.change(screen.getAllByLabelText(/reassessment notes/i)[0], {
      target: { value: 'Vitals repeated and clinician notified.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /mark reassessment complete/i })[0]);
    expect(screen.getByText(/Reassessment complete:/i)).toBeInTheDocument();
    expect(screen.getByText(/Vitals repeated and clinician notified/i)).toBeInTheDocument();
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
    expect(screen.getByText(/EMS sends complaint, vitals, ETA, and risk indicators/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Incoming, En Route, Arriving, Arrived/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Risk indicators/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Risk score bundle/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ED Handoff Summary/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Journey attachment/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ETA/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /enter inbound EMS patient/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Patient name or unknown patient/i), {
      target: { value: 'Unknown EMS patient' },
    });
    fireEvent.change(screen.getByLabelText(/Chief complaint/i), { target: { value: 'Stroke symptoms' } });
    fireEvent.change(screen.getByLabelText(/^ETA$/i), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /add to ems incoming/i }));
    expect(screen.getByText(/Draft ED Handoff Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready to convert into active ED patient journey/i)).toBeInTheDocument();

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
    expect(screen.getByText(/Inputs:/i)).toBeInTheDocument();
    expect(screen.getByText(/occupancy, boarding, pending admissions, discharge candidates, EMS arrivals/i)).toBeInTheDocument();
    expect(screen.getByText(/States:/i)).toBeInTheDocument();
    expect(screen.getByText(/Green, Yellow, Orange, Red/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommendation categories:/i)).toBeInTheDocument();
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

  it('redirects invalid Emergency subpages to the Whiteboard default', async () => {
    renderWorkspace('/workspace/emergency/not-real');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency/whiteboard');
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
