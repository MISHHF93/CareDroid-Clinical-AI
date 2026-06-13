import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
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
import { useEmergencyStore } from '../../store/emergencyStore';
import { AppRoutes } from '../App';
import { NAVIGATION_ITEMS } from '../config/unified-navigation.config';

const originalEmergencyState = useEmergencyStore.getState();

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
  return <output data-testid="location">{location.pathname}</output>;
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

describe('canonical route tree behavior', () => {
  afterEach(() => {
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/whiteboard renders the active Emergency OS whiteboard', async () => {
    renderRoute('/emergency/whiteboard');

    expect(await screen.findByRole('link', { name: 'Board' })).toHaveAttribute(
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

    expect(await screen.findByRole('heading', { name: 'Capacity Detail' })).toBeInTheDocument();
    expect(screen.getByText('Capacity score')).toBeInTheDocument();
    expect(screen.getByText('Available rooms')).toBeInTheDocument();
    expect(screen.getByText('Boarding patients')).toBeInTheDocument();
  });

  it('/emergency/queues renders queue intelligence from store state', async () => {
    renderRoute('/emergency/queues');

    expect(
      (await screen.findAllByRole('heading', { name: 'Queue Intelligence' })).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Triage')).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Referrals' })).toBeInTheDocument();
  });

  it('/emergency/copilot renders the active Copilot route context', async () => {
    renderRoute('/emergency/copilot');

    expect(await screen.findByRole('heading', { name: 'ED Copilot' })).toBeInTheDocument();
    expect(screen.getByText(/Use the docked ED Copilot/i)).toBeInTheDocument();
  });

  it('/emergency/analytics renders the Emergency OS analytics route', async () => {
    renderRoute('/emergency/analytics');

    expect(await screen.findByRole('heading', { name: 'Emergency Analytics' })).toBeInTheDocument();
  });

  it('/emergency/settings renders settings inside the primary Emergency OS route family', async () => {
    renderRoute('/emergency/settings');

    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/settings');
  });

  it('loads every operational sidebar destination without an access-denied surface', async () => {
    for (const item of NAVIGATION_ITEMS.filter((entry) => entry.id !== 'settings')) {
      const { unmount } = render(<AppRouteHarness initialPath={item.path} />);

      expect(await screen.findByTestId('location')).toHaveTextContent(item.path);
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.queryByText('Access denied')).toBeNull();
      expect(screen.queryByText('Emergency OS page unavailable')).toBeNull();

      unmount();
    }
  });

  it('redirects retired platform roots to the Emergency OS whiteboard', async () => {
    renderRoute('/marketplace');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });
});
