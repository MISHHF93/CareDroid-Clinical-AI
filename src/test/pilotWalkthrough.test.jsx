import React, { Suspense } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ConversationProvider } from '../contexts/ConversationContext';
import { ToolPreferencesProvider } from '../contexts/ToolPreferencesContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { OrganizationContextProvider } from '../contexts/OrganizationContext';
import { WhiteLabelProvider } from '../contexts/WhiteLabelContext';
import { UserIdentityProvider } from '../contexts/UserIdentityContext';
import { CostTrackingProvider } from '../contexts/CostTrackingContext';
import { SystemConfigProvider } from '../contexts/SystemConfigContext';
import { TenantContextProvider } from '../contexts/TenantContext';
import { useUser } from '../contexts/UserContext';
import { AppRoutes } from '../App';
import { PatientState, Priority } from '../../types/emergency';
import { getPatientFlagType, useEmergencyStore } from '../../store/emergencyStore';

vi.mock('recharts', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const noop = () => null;
  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    Bar: noop,
    CartesianGrid: noop,
    Cell: noop,
    Line: noop,
    LineChart: passthrough,
    Pie: passthrough,
    PieChart: passthrough,
    Tooltip: noop,
    XAxis: noop,
    YAxis: noop,
  };
});

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: { response: 'Pilot demo assistant response.' },
  }),
  mapChatResponseToAssistantMessage: vi.fn(),
}));

vi.mock('../services/emergencyTransportApi', () => ({
  fetchEmsFleetSnapshot: vi.fn().mockResolvedValue({
    ok: true,
    data: { units: [], sourceLabel: 'pilot test EMS fixture' },
  }),
  fetchEmergencyDiversionStatus: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'Open' },
    message: 'Pilot test diversion fixture.',
  }),
  persistEmergencyReferral: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Referral persisted in pilot test.',
  }),
  updateEmergencyTransferWorkflow: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Transfer workflow synced in pilot test.',
  }),
}));

vi.mock('../services/emergencySettingsApi', () => ({
  fetchSettingsFeatureFlags: vi.fn().mockResolvedValue({ ok: false, message: 'Local pilot flags.' }),
  subscribeToSettingsFeatureChanges: vi.fn(() => () => {}),
  updateSettingsFeatureFlag: vi.fn().mockResolvedValue({ ok: true }),
  fetchIntegrationStatuses: vi.fn().mockResolvedValue({}),
  fetchProtocolsAdmin: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  saveAlertRuleSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveDepartmentSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveStaffSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveThresholdSettings: vi.fn().mockResolvedValue({ ok: true }),
  testIntegrationConnection: vi.fn().mockResolvedValue({ ok: true }),
  updateProtocolAdmin: vi.fn().mockResolvedValue({ ok: true }),
}));

const originalEmergencyState = useEmergencyStore.getState();

function DemoAccessRole() {
  const { setUser } = useUser();

  React.useEffect(() => {
    setUser({
      id: 'pilot-demo-admin',
      email: 'pilot-demo-admin@caredroid.local',
      name: 'Pilot Demo Admin',
      fullName: 'Pilot Demo Admin',
      role: 'admin',
      authMode: 'open-access',
      isEmailVerified: true,
    });
  }, [setUser]);

  return null;
}

function AppRouteHarness({ initialPath = '/emergency/whiteboard' }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <UserProvider>
          <NotificationProvider>
            <WorkspaceProvider>
              <CostTrackingProvider>
                <ToolPreferencesProvider>
                  <TenantContextProvider>
                    <UserIdentityProvider>
                      <OrganizationContextProvider>
                        <WhiteLabelProvider>
                          <ConversationProvider>
                            <SystemConfigProvider>
                              <Suspense fallback={<div>Loading route</div>}>
                                <DemoAccessRole />
                                <AppRoutes />
                              </Suspense>
                            </SystemConfigProvider>
                          </ConversationProvider>
                        </WhiteLabelProvider>
                      </OrganizationContextProvider>
                    </UserIdentityProvider>
                  </TenantContextProvider>
                </ToolPreferencesProvider>
              </CostTrackingProvider>
            </WorkspaceProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

function findNewPatient(beforeIds) {
  return useEmergencyStore
    .getState()
    .patients.find((patient) => patient.id.startsWith('smart-intake-') && !beforeIds.has(patient.id));
}

async function waitForNewPatient(beforeIds) {
  let patient;
  await waitFor(() => {
    patient = findNewPatient(beforeIds);
    expect(patient).toBeTruthy();
  });
  return patient;
}

async function waitForPatient(patientId, predicate) {
  let patient;
  await waitFor(() => {
    patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);
    expect(patient).toBeTruthy();
    expect(predicate(patient)).toBe(true);
  });
  return patient;
}

function getPatientCard(patientId) {
  const card = document.querySelector(`[data-patient-card-id="${patientId}"]`);
  expect(card).toBeTruthy();
  return card;
}

function flagTypes(patient) {
  return patient.flags.map(getPatientFlagType);
}

function referralForPatient(patientId) {
  return useEmergencyStore.getState().referrals.find((referral) => referral.patientId === patientId);
}

describe('pilot walkthrough', () => {
  beforeEach(() => {
    useEmergencyStore.setState(originalEmergencyState, true);
    vi.clearAllMocks();
    global.fetch?.mockRejectedValue?.(new Error('Pilot test uses local Emergency OS fixtures.'));
  });

  afterEach(() => {
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('drives the Emergency OS pilot from demo access through discharge and analytics', async () => {
    const user = userEvent.setup();
    const beforePatientIds = new Set(useEmergencyStore.getState().patients.map((patient) => patient.id));

    render(<AppRouteHarness />);

    expect(await screen.findByText('Emergency OS')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Emergency Whiteboard' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('Smart Intake'));
    expect(await screen.findByRole('heading', { name: 'Smart Intake Identity Review' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Start Intake/i }));
    for (const approveButton of screen.getAllByRole('button', { name: 'Approve' })) {
      await user.click(approveButton);
    }
    await user.click(screen.getByRole('button', { name: /Send to Triage/i }));

    const createdPatient = await waitForNewPatient(beforePatientIds);
    expect(createdPatient.state).toBe(PatientState.Triage);

    await user.click(screen.getByLabelText('Emergency Whiteboard'));
    expect(await screen.findByRole('heading', { name: 'Emergency Whiteboard' })).toBeInTheDocument();
    await waitFor(() => expect(getPatientCard(createdPatient.id)).toBeInTheDocument());

    await user.click(getPatientCard(createdPatient.id));
    expect(await screen.findByRole('heading', { name: `${createdPatient.firstName} ${createdPatient.lastName}` })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Set CTAS P2' }));
    await waitForPatient(createdPatient.id, (patient) => patient.priority === Priority.P2);

    await user.click(screen.getByRole('button', { name: 'Move to Waiting' }));
    await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Waiting);

    await user.click(screen.getByRole('button', { name: 'Trigger Reassessment' }));
    await waitForPatient(createdPatient.id, (patient) => flagTypes(patient).includes('ReassessmentDue'));

    await user.click(screen.getByRole('button', { name: 'Complete Reassessment' }));
    await waitForPatient(createdPatient.id, (patient) => !flagTypes(patient).includes('ReassessmentDue'));

    await user.click(screen.getByRole('button', { name: 'Move to Assessment' }));
    await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Assessment);

    await user.click(screen.getByLabelText('Referrals'));
    expect(await screen.findByRole('heading', { name: 'Referrals' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /New Referral/i }));

    await user.type(screen.getByPlaceholderText(/Search active patients/i), createdPatient.mrn);
    const searchResults = screen.getByLabelText('Active patient search results');
    const patientResult = within(searchResults)
      .getAllByRole('button')
      .find((button) => button.textContent.includes(createdPatient.mrn));
    expect(patientResult).toBeTruthy();
    await user.click(patientResult);

    await user.type(screen.getByPlaceholderText('Clinical reason for referral'), 'Pilot cardiology referral');
    await user.click(screen.getByRole('button', { name: /Send Referral/i }));
    await waitFor(() => expect(referralForPatient(createdPatient.id)?.status).toBe('Sent'));
    expect(await screen.findByText('Pilot cardiology referral')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Emergency Whiteboard'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Disposition' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Mark Disposition' }));
    await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Disposition);

    await user.click(screen.getByRole('button', { name: 'Discharge Patient' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Discharge' }));
    await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Discharge);

    await user.click(screen.getByLabelText('Analytics'));
    expect(await screen.findByRole('heading', { name: 'Emergency Analytics' })).toBeInTheDocument();
    await waitFor(() => expect(useEmergencyStore.getState().emergencyAnalytics.status).toBe('ready'));

    const analytics = useEmergencyStore.getState().emergencyAnalytics.data;
    expect(analytics.shift.dischargeCount).toBeGreaterThan(0);
    expect(analytics.operationalCommand.topComplaints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: createdPatient.complaintCategory,
        }),
      ])
    );

    const analyticsKpis = screen.getByLabelText('Emergency analytics KPIs');
    expect(within(analyticsKpis).getByText('Discharges')).toBeInTheDocument();
    expect(within(analyticsKpis).getByText(String(analytics.shift.dischargeCount))).toBeInTheDocument();
  });
});
