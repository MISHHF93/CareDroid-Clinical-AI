import React, { Suspense } from 'react';
import { render, screen, within } from '@testing-library/react';
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
import { FEATURE_REGISTRY } from '../../lib/features/featureRegistry';
import { useFeatureStore } from '../../store/featureStore';
import {
  selectFilteredPatients,
  useEmergencyStore,
} from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';
import { AppRoutes } from '../App';

const sendClinicalChatMessage = vi.fn();
const originalEmergencyState = useEmergencyStore.getState();
const originalFeatureState = useFeatureStore.getState();

vi.mock('../components/ChatInterface', () => ({
  default: () => <div data-testid="copilot-chat">Copilot chat ready</div>,
}));

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: (...args) => sendClinicalChatMessage(...args),
  mapChatResponseToAssistantMessage: vi.fn(),
}));

vi.mock('../services/emergencyTransportApi', () => ({
  fetchEmsFleetSnapshot: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      units: [{ id: 'unit-1', callSign: 'TPS Medic 501', status: 'Inbound' }],
      sourceLabel: 'seeded EMS fleet',
    },
  }),
  fetchEmergencyDiversionStatus: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'Open' },
    message: 'Diversion status seeded.',
  }),
  persistEmergencyReferral: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Referral persisted.',
  }),
  updateEmergencyTransferWorkflow: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Transfer synced.',
  }),
}));

vi.mock('../services/emergencySettingsApi', () => ({
  fetchSettingsFeatureFlags: vi.fn().mockResolvedValue({ ok: false, message: 'Local test flags.' }),
  subscribeToSettingsFeatureChanges: vi.fn(() => () => {}),
  updateSettingsFeatureFlag: vi.fn().mockResolvedValue({ ok: true }),
  fetchIntegrationStatuses: vi.fn().mockResolvedValue({
    fhir: { ok: true, data: { data: [{ id: 'fhir-main', status: 'connected' }] } },
    hl7: { ok: true, data: { data: [{ id: 'hl7-adt', status: 'connected' }] } },
  }),
  fetchProtocolsAdmin: vi.fn().mockResolvedValue({
    ok: true,
    data: [{ id: 'sepsis', name: 'Sepsis pathway', status: 'enabled' }],
  }),
  saveAlertRuleSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveDepartmentSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveStaffSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveThresholdSettings: vi.fn().mockResolvedValue({ ok: true }),
  testIntegrationConnection: vi.fn().mockResolvedValue({ ok: true }),
  updateProtocolAdmin: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../pages/tools/Calculators', async () => {
  const actual = await vi.importActual('../pages/tools/Calculators');
  return {
    ...actual,
    CalculatorInterface: ({ onResultChange }) => (
      <button
        type="button"
        onClick={() =>
          onResultChange({
            score: 3,
            interpretation: 'Low risk',
            recommendation: 'Continue clinical observation.',
          })
        }
      >
        Mock Calculator Result
      </button>
    ),
  };
});

function enableCanonicalFeatures() {
  useFeatureStore.setState({
    ...originalFeatureState,
    tier: 'enterprise',
    flags: Object.fromEntries(FEATURE_REGISTRY.map((feature) => [feature.id, true])),
    overrides: Object.fromEntries(FEATURE_REGISTRY.map((feature) => [feature.id, true])),
    loading: false,
  }, true);
}

function AppRouteHarness({ initialPath }) {
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

function renderRoute(initialPath) {
  return render(<AppRouteHarness initialPath={initialPath} />);
}

function firstVisiblePatient() {
  return selectFilteredPatients(useEmergencyStore.getState())[0];
}

describe('canonical route tree behavior', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    useEmergencyStore.setState({ ...originalEmergencyState, activeQueueFilter: null, whiteboardSearchQuery: '' }, true);
    enableCanonicalFeatures();
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      status: 200,
      data: { response: 'AI generated handoff brief.' },
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const message = String(args[0] || '');
      if (message.includes('not wrapped in act')) return;
      throw new Error(`Unexpected console.error: ${message}`);
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    useEmergencyStore.setState(originalEmergencyState, true);
    useFeatureStore.setState(originalFeatureState, true);
  });

  it('/emergency/whiteboard renders store patients, stats, filters, intake, and patient detail', async () => {
    const user = userEvent.setup();
    const patient = firstVisiblePatient();
    const patientButtonName = `Open details for ${patient.firstName} ${patient.lastName}`;

    renderRoute('/emergency/whiteboard');

    expect(await screen.findByRole('heading', { name: 'Emergency Whiteboard' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: patientButtonName })).toBeInTheDocument();
    expect(screen.getByText('Total Active')).toBeInTheDocument();
    expect(screen.getByText('Avg Wait')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /New Patient/i }));
    expect(await screen.findByRole('heading', { name: 'Add walk-in to Triage' })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Close quick intake/i));

    await user.click(await screen.findByRole('button', { name: patientButtonName }));
    expect(await screen.findByRole('complementary', { name: /Patient detail panel/i })).toBeInTheDocument();

    await user.click(within(screen.getByLabelText(/Whiteboard filters/i)).getByRole('button', { name: /Waiting/i }));
    expect(useEmergencyStore.getState().activeQueueFilter).toBe('Waiting');
  }, 15_000);

  it('/emergency/ems renders EMS units, live ETA, Prepare Bay action, and pressure score', async () => {
    const user = userEvent.setup();
    const preparedBefore = useEmergencyStore
      .getState()
      .emsArrivals.filter((arrival) => arrival.preparedRoomId).length;

    renderRoute('/emergency/ems');

    expect(await screen.findByRole('heading', { name: 'EMS Pipeline' })).toBeInTheDocument();
    expect((await screen.findAllByText(/TPS Medic 501/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/min|Arrived/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('status', { name: /EMS pressure score/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Prepare Bay/i })[0]);
    const preparedAfter = useEmergencyStore
      .getState()
      .emsArrivals.filter((arrival) => arrival.preparedRoomId).length;
    expect(preparedAfter).toBeGreaterThan(preparedBefore);
  });

  it('/emergency/referrals groups referrals and creates a new store referral from the form', async () => {
    const user = userEvent.setup();
    const initialCount = useEmergencyStore.getState().referrals.length;

    renderRoute('/emergency/referrals');

    expect(await screen.findByRole('heading', { name: 'Referrals' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sent' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accepted' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /New Referral/i }));
    expect(await screen.findByRole('heading', { name: 'Consult Request' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /MRN-/i })[0]);
    await user.type(screen.getByPlaceholderText(/Clinical reason for referral/i), 'Cardiology review');
    await user.click(screen.getByRole('button', { name: /Send Referral/i }));

    expect(useEmergencyStore.getState().referrals.length).toBe(initialCount + 1);
  });

  it('/emergency/capacity renders capacity, rooms, boarding, and discharge pipeline from store', async () => {
    renderRoute('/emergency/capacity');

    expect(await screen.findByRole('heading', { name: 'Capacity Detail' })).toBeInTheDocument();
    expect(screen.getByText('Capacity Score')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Room grid/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Boarding patients/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Discharge pipeline/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Disposition|No disposition patients/i).length).toBeGreaterThan(0);
  });

  it('/emergency/queues renders queue intelligence from store state', async () => {
    renderRoute('/emergency/queues');

    expect((await screen.findAllByRole('heading', { name: 'Queue Intelligence' })).length).toBeGreaterThan(0);
    expect(screen.getByText(/Live waiting, triage, provider, referral/i)).toBeInTheDocument();
  });

  it('/emergency/reassessment keeps reassessment workflow inside the whiteboard shell', async () => {
    renderRoute('/emergency/reassessment');

    expect(await screen.findByRole('heading', { name: 'Emergency Whiteboard' })).toBeInTheDocument();
  });

  it('/emergency/boarding renders boarding and discharge capacity detail', async () => {
    renderRoute('/emergency/boarding');

    expect(await screen.findByRole('heading', { name: 'Capacity Detail' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Boarding patients/i })).toBeInTheDocument();
  });

  it('/emergency/analytics renders the Emergency OS analytics route', async () => {
    renderRoute('/emergency/analytics');

    expect(await screen.findByRole('heading', { name: 'Emergency Analytics' })).toBeInTheDocument();
  });

  it('/emergency/settings renders settings inside the primary Emergency OS route family', async () => {
    renderRoute('/emergency/settings');

    expect((await screen.findAllByRole('heading', { name: 'Settings' })).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: /Settings tabs/i })).toBeInTheDocument();
    const featuresTab = screen.getByRole('link', { name: 'Features' });
    expect(featuresTab).toHaveAttribute('href', '/emergency/settings#features');
  });
});
