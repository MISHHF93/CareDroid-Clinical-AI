import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
import { AppRoutes } from '../App';
import { mockUserValue } from '../test/testRenderUtils';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: { response: 'AI generated handoff brief.' },
  }),
  mapChatResponseToAssistantMessage: vi.fn(),
}));

vi.mock('../engine/capacityEngine', () => ({
  startCapacityEngine: () => 0,
  calculateCapacity: () => ({
    score: 42,
    band: 'Green',
    label: 'Green capacity',
    riskLevel: 'Green',
    totalPatients: 0,
    occupiedRooms: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    currentOccupancy: 0,
    maxCapacity: 15,
    occupancyPercent: 0,
  }),
  deriveCapacityCrisisState: () => ({
    active: false,
    level: 'normal',
    headline: 'Capacity stable',
    occupancyPercent: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    triggerReasons: [],
  }),
}));

vi.mock('../components/CapacityCrisisMode', () => ({
  default: () => null,
}));

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/UserIdentityContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUserIdentity: () => ({
      operationalProfile: null,
      account: null,
      preferences: null,
      workspaceState: null,
      activeWorkspace: null,
      workspaces: [],
      activity: null,
      aiPersonalization: null,
      security: null,
      audit: null,
      saasProfile: { role: 'emergency-physician', subscriptionEntitlements: ['core-platform'] },
      effectiveProfile: null,
      accessSummary: null,
      isLoading: false,
      error: '',
      roleProfile: { id: 'emergency-physician' },
      platformContext: { entitledPackIds: ['core-platform'] },
      organization: {
        id: 'org-canonical-route',
        name: 'Canonical Route Hospital',
        organizationType: 'hospital',
      },
      entitledAssetIds: [],
      entitledPackIds: ['core-platform'],
      allowedWorkspaces: [],
      enabledAssetPacks: [],
      pinnedAssets: [],
      hiddenAssets: [],
      recentAssets: [],
      hasEffectivePermission: () => true,
      refreshIdentity: vi.fn(),
      switchWorkspace: vi.fn(),
      savePreferences: vi.fn(),
      updateProfile: vi.fn(),
      recordActivity: vi.fn(),
      refreshPlatformContext: vi.fn(),
      refreshMemoryFabricContext: vi.fn(),
      memoryFabricContext: null,
    }),
  };
});

vi.mock('../hooks/useEmergencyRolePermissions', async (importOriginal) => {
  const actual = await importOriginal();
  const mockEmergencyRole = {
    role: 'physician',
    roleLabel: 'Physician',
    roleDescription: 'Test physician',
    readOnly: false,
    landingRoute: '/emergency/whiteboard',
    defaultRoute: '/emergency/whiteboard',
    allowedRoutes: [],
    allowedActions: [],
    demoRoles: [],
    permissionContext: {
      screenMode: 'clinical_workstation',
      displayParam: null,
      readOnlyDisplayMode: false,
      roleReadOnly: false,
    },
    canAccessRoute: () => true,
    nearestRoute: (path) => path || '/emergency/whiteboard',
    can: () => true,
    canDisplay: () => true,
    canMutate: () => true,
    canMutateSurface: () => true,
    presentAction: () => ({ visible: true, enabled: true, state: 'enabled', readOnly: false }),
    actionState: () => 'enabled',
    actionVisible: () => true,
    actionEnabled: () => true,
    actionReadOnly: () => false,
    switchDemoRole: vi.fn(),
  };
  return {
    ...actual,
    useEmergencyRolePermissions: () => mockEmergencyRole,
    default: () => mockEmergencyRole,
  };
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
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

describe('canonical App routes deep links', () => {
  it('renders /emergency/ems inside the AppShell', async () => {
    render(<AppRouteHarness initialPath="/emergency/ems" />);

    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/ems');
  }, 20_000);

  it('redirects /settings/features to Feature Flags', async () => {
    render(<AppRouteHarness initialPath="/settings/features#feature-toolsShareResults" />);

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/feature-flags#feature-toolsShareResults',
      ),
    );
    expect(await screen.findByRole('main')).toBeInTheDocument();
  }, 20_000);

  it('redirects the retired assistant alias to the docked CareDroid Copilot experience', async () => {
    render(<AppRouteHarness initialPath="/assistant?agent=agent-emergency" />);

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/emergency/whiteboard?agent=agent-emergency',
      ),
    );
  }, 20_000);

  it('redirects legacy auth paths into the demo landing flow', async () => {
    render(<AppRouteHarness initialPath="/auth" />);

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).not.toBe('/auth');
    });
    expect(screen.queryByText('Access denied')).toBeNull();
  }, 20_000);

  it.each(['/auth-callback', '/account/login', '/welcome', '/create-account'])(
    'redirects %s away from the legacy auth surface',
    async (path) => {
      render(<AppRouteHarness initialPath={path} />);

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).not.toBe(path);
      });
    },
    20_000,
  );

  it('redirects /discover into Medical Tools', async () => {
    render(<AppRouteHarness initialPath="/discover" />);

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/emergency/tools'),
    );
  }, 20_000);

  it('mounts the AI command center route', async () => {
    render(<AppRouteHarness initialPath="/ai-command-center" />);

    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/ai-command-center');
  }, 20_000);

  it('mounts local shared tool sessions before wildcard redirects', async () => {
    render(<AppRouteHarness initialPath="/shared/tools/missing-share" />);

    expect(await screen.findByRole('heading', { name: /session not found/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/shared/tools/missing-share');
  }, 20_000);
});