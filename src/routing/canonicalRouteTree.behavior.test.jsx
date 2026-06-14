import React, { Suspense } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { useEmergencyStore } from '../store/emergencyStore';
import { AppRoutes } from '../App';
import {
  NAVIGATION_ITEMS,
  getPilotCustomerNavigationItems,
} from '../config/unified-navigation.config';

const originalEmergencyState = useEmergencyStore.getState();
const ROUTE_LOAD_TIMEOUT = 15000;
const PILOT_VISIBLE_NAVIGATION_ITEMS = getPilotCustomerNavigationItems(NAVIGATION_ITEMS);

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: { response: 'AI generated handoff brief.' },
  }),
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
  fetchEmergencyOsSettings: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        tenantName: 'CareDroid ED',
        defaultWorkspace: 'emergency-whiteboard',
        enabledModules: [{ id: 'whiteboard', label: 'Emergency Whiteboard', enabled: true }],
      },
    },
  }),
  saveEmergencyOsSettings: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        tenantName: 'CareDroid ED',
        defaultWorkspace: 'emergency-whiteboard',
        enabledModules: [{ id: 'whiteboard', label: 'Emergency Whiteboard', enabled: true }],
      },
    },
  }),
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

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
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
                                <LocationProbe />
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

function findRouteHeading(name) {
  return screen.findByRole('heading', { name }, { timeout: ROUTE_LOAD_TIMEOUT });
}

describe('canonical route tree behavior', () => {
  afterEach(() => {
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/whiteboard renders the active Emergency OS whiteboard', async () => {
    renderRoute('/emergency/whiteboard');

    expect(await screen.findByRole('link', { name: 'Whiteboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });

  it('/emergency/patients renders the active patient whiteboard surface', async () => {
    renderRoute('/emergency/patients');

    expect(await screen.findByRole('heading', { name: 'Emergency Patients' })).toBeInTheDocument();
    expect(screen.getByText('Total patients')).toBeInTheDocument();
  });

  it('/emergency/patients consumes patientId context without another lookup', async () => {
    const patient = useEmergencyStore.getState().patients[0];

    renderRoute(`/emergency/patients?patientId=${encodeURIComponent(patient.id)}`);

    expect(await screen.findByRole('heading', { name: 'Emergency Patients' })).toBeInTheDocument();
    await waitFor(() => {
      expect(useEmergencyStore.getState().selectedPatientId).toBe(patient.id);
    });
  });

  it('/emergency/ems renders the active EMS summary route', async () => {
    renderRoute('/emergency/ems');

    expect(await screen.findByRole('link', { name: 'EMS' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/ems');
  });

  it('/emergency/intake renders Smart Intake inside the route tree', async () => {
    renderRoute('/emergency/intake');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/intake');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('/emergency/capacity renders capacity, rooms, boarding, and discharge pipeline from store', async () => {
    renderRoute('/emergency/capacity');

    expect(await screen.findByRole('heading', { name: 'Capacity' })).toBeInTheDocument();
    expect(screen.getByText('Capacity score')).toBeInTheDocument();
    expect(screen.getByText('Available rooms')).toBeInTheDocument();
    expect(screen.getByText('Boarding patients')).toBeInTheDocument();
  });

  it('/emergency/queues renders queue intelligence from store state', async () => {
    renderRoute('/emergency/queues');

    expect(
      (await screen.findAllByRole('heading', { name: 'Queues' })).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0);
    expect(screen.getByText('Triage')).toBeInTheDocument();
    expect(screen.getByText('Movement stage: Waiting')).toBeInTheDocument();
  });

  it('/emergency/queues consumes the active whiteboard queue filter', async () => {
    useEmergencyStore.setState({ activeQueueFilter: 'Waiting' });

    renderRoute('/emergency/queues');

    expect(
      await screen.findByText('Showing the Waiting queue requested from the whiteboard.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear queue filter' })).toBeEnabled();
  });

  it('/emergency/queues consumes queue filter search params', async () => {
    renderRoute('/emergency/queues?queue=Reassessment');

    expect(
      await screen.findByText('Showing the Reassessment queue requested from the whiteboard.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useEmergencyStore.getState().activeQueueFilter).toBe('Reassessment');
    });
  });

  it('/emergency/reassessment renders a dedicated reassessment queue surface', async () => {
    renderRoute('/emergency/reassessment');

    expect(await screen.findByRole('heading', { name: 'Reassessment' })).toBeInTheDocument();
  });

  it('/emergency/boarding renders boarding and discharge capacity detail', async () => {
    renderRoute('/emergency/boarding');

    expect(await screen.findByRole('heading', { name: 'Boarding' })).toBeInTheDocument();
  });

  it('/emergency/referrals renders referral candidates from the active patient list', async () => {
    renderRoute('/emergency/referrals');

    expect(await findRouteHeading('Referrals')).toBeInTheDocument();
  }, ROUTE_LOAD_TIMEOUT);

  it('/emergency/copilot renders the active Copilot route context', async () => {
    renderRoute('/emergency/copilot');

    expect(await findRouteHeading('AIIOS ED Copilot')).toBeInTheDocument();
    expect(screen.getByText(/Use the docked AIIOS ED Copilot/i)).toBeInTheDocument();
  });

  it.each(['/assistant', '/chat', '/ai', '/copilot'])(
    '%s redirects to the active Emergency Copilot route',
    async (aliasPath) => {
      renderRoute(aliasPath);

      expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/copilot');
      expect(await findRouteHeading('AIIOS ED Copilot')).toBeInTheDocument();
    },
  );

  it('/emergency/tools renders Medical Tools inside the active shell', async () => {
    renderRoute('/emergency/tools');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /^emergency os console$/i },
        { timeout: ROUTE_LOAD_TIMEOUT },
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/tools');
  }, ROUTE_LOAD_TIMEOUT);

  it('/emergency/pulse renders Department Pulse inside the active shell', async () => {
    renderRoute('/emergency/pulse');

    expect(await screen.findByRole('heading', { name: 'Department Pulse' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/pulse');
  }, ROUTE_LOAD_TIMEOUT);

  it('/emergency/shift renders Shift Summary inside the active shell', async () => {
    renderRoute('/emergency/shift');

    expect(await screen.findByRole('heading', { name: 'Emergency Shift Summary' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/shift');
  }, ROUTE_LOAD_TIMEOUT);

  it.each([
    ['/tools/catalog', '/emergency/tools?source=catalog&filter=all'],
    ['/tools/calculators/qsofa', '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa'],
    ['/tools/calculator/sofa', '/emergency/tools?source=calculators&filter=calculator&q=sofa&open=sofa'],
    ['/tools/lab-interpreter', '/emergency/tools?source=tools&filter=clinical-tools&q=lab-interp&open=lab-interp'],
    ['/calculators', '/emergency/tools?source=calculators&filter=calculator'],
    ['/fleet/map', '/emergency/tools?source=operations&filter=operations&q=fleet-live-map&open=fleet-live-map'],
    ['/fleet/command', '/emergency/tools?source=operations&filter=operations&q=fleet-command&open=fleet-command'],
    ['/operations/fleet-command', '/emergency/tools?source=operations&filter=operations&q=fleet-command&open=fleet-command'],
    ['/maps', '/emergency/tools?source=operations&filter=operations&q=live-tracking-map&open=live-tracking-map'],
    ['/workflows', '/emergency/tools?source=workflows&filter=ai-workflows'],
    ['/recommendations', '/emergency/tools?source=recommendations&filter=recommended'],
  ])('%s redirects to Medical Tools with intent preserved', async (legacyPath, expectedPath) => {
    renderRoute(legacyPath);

    expect(await screen.findByTestId('location')).toHaveTextContent(expectedPath);
    expect(await screen.findByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }, ROUTE_LOAD_TIMEOUT);

  it('/emergency/analytics renders the Emergency OS analytics route', async () => {
    renderRoute('/emergency/analytics');

    expect(await findRouteHeading('Emergency Analytics')).toBeInTheDocument();
  });

  it('/emergency/settings renders settings inside the primary Emergency OS route family', async () => {
    renderRoute('/emergency/settings');

    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/settings');
  });

  it('loads every operational sidebar destination without an access-denied surface', async () => {
    for (const item of PILOT_VISIBLE_NAVIGATION_ITEMS) {
      const { unmount } = render(<AppRouteHarness initialPath={item.path} />);

      expect(await screen.findByTestId('location')).toHaveTextContent(item.path);
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Operational command context')).toBeInTheDocument();
      expect(screen.queryByText('Access denied')).toBeNull();
      expect(screen.queryByText('Emergency OS page unavailable')).toBeNull();

      unmount();
    }
  });

  it('keeps primary shell controls and representative sidebar links exposed', async () => {
    renderRoute('/emergency/whiteboard');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/whiteboard');
    expect(
      await screen.findByRole('button', { name: /\+ Central Intake/i }, { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toBeEnabled();

    const desktopNavigation = screen.getByRole('navigation', {
      name: 'Emergency desktop navigation',
    });
    expect(within(desktopNavigation).queryByRole('link', { name: 'Analytics' })).toBeNull();
    expect(within(desktopNavigation).queryByRole('link', { name: 'Settings' })).toBeNull();

    for (const label of ['Whiteboard', 'Patients', 'Queues']) {
      const item = PILOT_VISIBLE_NAVIGATION_ITEMS.find((navItem) => navItem.label === label);
      expect(item, label).toBeTruthy();
      expect(within(desktopNavigation).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        item.path,
      );
    }
  }, ROUTE_LOAD_TIMEOUT);

  it('redirects retired platform roots to the Emergency OS whiteboard', async () => {
    renderRoute('/marketplace');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });

  it('redirects retired Emergency OS routes to the whiteboard', async () => {
    renderRoute('/emergency/simulation');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });
});
