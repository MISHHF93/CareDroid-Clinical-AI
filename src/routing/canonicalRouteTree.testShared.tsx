import './_routeTestMocks';
import './_routeWorkflowTestMocks';
import React, { Suspense, useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeAll, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { ConversationProvider } from '../contexts/ConversationContext';
import { ToolPreferencesProvider } from '../contexts/ToolPreferencesContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { OrganizationContextProvider } from '../contexts/OrganizationContext';
import { WhiteLabelProvider } from '../contexts/WhiteLabelContext';
import { UserIdentityProvider } from '../contexts/UserIdentityContext';
import { SystemConfigProvider } from '../contexts/SystemConfigContext';
import { TenantContextProvider } from '../contexts/TenantContext';
import { mockUserValue } from '../test/testRenderUtils';

let appRoutesModulePromise: Promise<{ AppRoutes: React.ComponentType }> | null = null;

export function preloadAppRoutesForTests() {
  appRoutesModulePromise ??= import('../App');
  return appRoutesModulePromise;
}

function LazyAppRoutes() {
  const [AppRoutes, setAppRoutes] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    void preloadAppRoutesForTests().then((module) => {
      setAppRoutes(() => module.AppRoutes);
    });
  }, []);

  if (!AppRoutes) {
    return null;
  }

  return <AppRoutes />;
}

export const ROUTE_LOAD_TIMEOUT = 30000;
/** App module preload can exceed per-test timeouts under parallel vitest workers. */
export const ROUTE_PRELOAD_TIMEOUT = 120000;

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
  fetchOrganizationEmergencyOsSettings: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        tenantName: 'CareDroid ED',
        defaultWorkspace: 'emergency-whiteboard',
        enabledModules: [{ id: 'whiteboard', label: 'Emergency Whiteboard', enabled: true }],
      },
    },
  }),
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

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/UserIdentityContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
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

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../services/clinicalToolsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/clinicalToolsApi')>();
  return {
    ...actual,
    fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
    fetchToolExecutorCatalog: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        registeredExecutorToolIds: ['sofa-calculator', 'drug-interactions', 'lab-interpreter'],
        registryIdToExecutor: {},
        unsupportedTools: [],
      },
    }),
    fetchClinicalToolMetadata: vi.fn((toolId) =>
      Promise.resolve({
        ok: true,
        data: { id: toolId, name: toolId, parameters: [] },
      }),
    ),
    fetchToolStatistics: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        totalTools: 3,
        tools: [
          { id: 'drug-interactions', name: 'Drug interactions', category: 'diagnostic' },
          { id: 'lab-interpreter', name: 'Lab interpreter', category: 'diagnostic' },
          { id: 'sofa-calculator', name: 'SOFA calculator', category: 'calculator' },
        ],
      },
    }),
    validateClinicalTool: vi.fn().mockResolvedValue({
      ok: true,
      data: { valid: true, errors: [], warnings: [], resolvedToolId: 'test-tool' },
    }),
  };
});

vi.mock('../hooks/useTrackMindRolePermissions', async (importOriginal) => {
  const actual = await importOriginal() as any;
  const mockTrackMind = {
    role: 'clinical-lead',
    roleLabel: 'Clinical Lead',
    can: () => true,
    canMutate: () => true,
    canAccessRoute: () => true,
    nearestRoute: (path) => path || '/workspace',
    landingRoute: '/workspace',
    workspace: { id: 'clinical', label: 'Clinical' },
    allowedRoutes: [],
    allowedPermissions: [],
    demoRoles: [],
    permissionContext: {},
    kpis: [],
    quickActions: [],
    kpiPermissionKeys: [],
    notificationChannels: [],
    canViewPrivacyScope: () => true,
    canViewSensitivity: () => true,
    canViewAuditArtifact: () => true,
    canExportAudit: () => true,
    canEntity: () => true,
    summary: {},
    setDemoRole: vi.fn(),
  };
  return {
    ...actual,
    useTrackMindRolePermissions: () => mockTrackMind,
    default: () => mockTrackMind,
  };
});

vi.mock('../services/platformAssetsApi', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    PlatformAssetsApi: {
      ...actual.PlatformAssetsApi,
      getContext: vi.fn().mockResolvedValue({
        entitledPackIds: ['core-platform'],
        organization: { id: 'org-canonical-route', organizationType: 'hospital' },
      }),
    },
  };
});

vi.mock('../services/userIdentityApi', () => ({
  UserIdentityApi: {
    fetchOperationalProfile: vi.fn().mockResolvedValue({ ok: false }),
    switchWorkspace: vi.fn().mockResolvedValue({ ok: true }),
    updatePreferences: vi.fn().mockResolvedValue({ ok: true }),
    updateOperationalProfile: vi.fn().mockResolvedValue({ ok: true }),
    recordActivity: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock('../services/memoryApi', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    fetchMemoryFabricContext: vi.fn().mockResolvedValue({ ok: true, data: actual.LOCAL_MEMORY_FABRIC_CONTEXT }),
  };
});

vi.mock('../components/Sidebar', async () => {
  const React = await import('react');
  const { Link, useLocation } = await import('react-router-dom');
  const items = [
    { label: 'Whiteboard', path: '/emergency/whiteboard' },
    { label: 'EMS', path: '/emergency/ems' },
    { label: 'Medical Tools', path: '/emergency/tools' },
    { label: 'Analytics', path: '/emergency/analytics' },
    { label: 'Settings', path: '/emergency/settings' },
    { label: 'Patients', path: '/emergency/patients' },
    { label: 'Queues', path: '/emergency/queues' },
    { label: 'AI Chief', path: '/emergency/copilot' },
  ];

  function Sidebar() {
    const location = useLocation();
    return React.createElement(
      'nav',
      { 'aria-label': 'Emergency desktop navigation' },
      items.map((item) =>
        React.createElement(
          Link,
          {
            key: item.path,
            to: item.path,
            'aria-current': location.pathname === item.path ? 'page' : undefined,
          },
          item.label,
        ),
      ),
    );
  }

  return { Sidebar };
});

vi.mock('../pages/tools/ToolsOverview', () => ({
  default: () => (
    <section className="tools-overview" aria-labelledby="tools-overview-title">
      <h1 id="tools-overview-title">Medical Tools</h1>
    </section>
  ),
}));

vi.mock('../components/Header', () => ({
  Header: () => (
    <header>
      <button type="button">+ Central Intake</button>
      <div aria-label="Operational command context" />
    </header>
  ),
}));

vi.mock('../components/CopilotPanel', () => ({
  CopilotPanel: () => null,
}));

vi.mock('../components/CommandPalette', () => ({
  default: () => null,
}));

vi.mock('../components/PatientDetailPanel', () => ({
  default: () => null,
}));

vi.mock('../components/ReassessmentDrawer', () => ({
  default: () => null,
  isPatientFlaggedForReassessment: () => false,
}));

vi.mock('../components/EMSCriticalBroadcast', () => ({
  default: () => null,
}));

vi.mock('../components/EMSPipeline', () => ({
  default: () => <div data-testid="ems-pipeline-stub">EMS pipeline</div>,
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

vi.mock('../engine/reassessmentEngine', () => ({
  startReassessmentEngine: () => 0,
}));

vi.mock('../engine/continuousPatientFlowEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/continuousPatientFlowEngine')>();
  return {
    ...actual,
    startContinuousPatientFlowEngine: () => 0,
  };
});



vi.mock('../engine/simulation', () => ({
  startSimulation: vi.fn(),
  stopSimulation: vi.fn(),
}));

vi.mock('../services/emergencyRealtimeService', () => ({
  default: () => () => {},
}));

vi.mock('../services/aiPlatformBootstrap', () => ({
  bootstrapAiPlatformIntegrations: vi.fn(),
}));

vi.mock('../services/devBackendAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/devBackendAuth')>();
  return {
    ...actual,
    ensureDevBackendSession: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../services/backendReachability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/backendReachability')>();
  return {
    ...actual,
    probeBackendReachability: vi.fn().mockResolvedValue(false),
    isBackendKnownOffline: vi.fn().mockReturnValue(true),
  };
});

vi.mock('../services/platformGovernanceApi', () => ({
  fetchPlatformGovernanceSurface: vi.fn().mockResolvedValue({
    ok: true,
    sourceStatus: 'fallback',
    data: {
      status: 'local_fallback',
      readiness: { blocked: false },
      panels: {
        approvalWorkflow: { required: true, reasons: ['phi_access'] },
        riskClassification: { level: 'high', category: 'high_risk_cds' },
      },
    },
  }),
  evaluatePlatformGate: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../config/practitionerCleanup.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/practitionerCleanup.config')>();
  return {
    ...actual,
    isPractitionerCleanupEnabled: () => false,
  };
});

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    fetchIntegrationHub: vi.fn().mockResolvedValue({
      module: 'Integration Hub',
      source: 'fixture',
      data: {
        sources: [{ id: 'ehr', label: 'EHR', status: 'connected' }],
        reviewQueue: [],
      },
      remainingGaps: [],
    }),
  };
});

vi.mock('../services/interoperabilityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/interoperabilityApi')>();
  return {
    ...actual,
    fetchInteroperabilitySummary: vi.fn().mockResolvedValue({
      uiStates: { connectionState: 'connected' },
    }),
    fetchIntegrationEvents: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('../pages/PlatformNavigationPage', () => ({
  default: () => (
    <section className="platform-navigation-page" aria-labelledby="platform-navigation-title">
      <h1 id="platform-navigation-title">CareDroid App Map</h1>
    </section>
  ),
  resolvePlatformNavigationDestination: (item) => ({
    to: item?.path || '/workspace',
    direct: true,
    note: 'Mounted route',
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
  );
}

export function AppRouteHarness({ initialPath }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <UserProvider>
          <WorkspaceProvider>
            <ToolPreferencesProvider>
              <TenantContextProvider>
                <UserIdentityProvider>
                  <OrganizationContextProvider>
                    <WhiteLabelProvider>
                      <ConversationProvider>
                        <SystemConfigProvider>
                          <Suspense fallback={<div>Loading route</div>}>
                            <LazyAppRoutes />
                            <LocationProbe />
                          </Suspense>
                        </SystemConfigProvider>
                      </ConversationProvider>
                    </WhiteLabelProvider>
                  </OrganizationContextProvider>
                </UserIdentityProvider>
              </TenantContextProvider>
            </ToolPreferencesProvider>
          </WorkspaceProvider>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

export function renderRoute(initialPath) {
  return render(<AppRouteHarness initialPath={initialPath} />);
}

export function findRouteHeading(name) {
  return screen.findByRole('heading', { name }, { timeout: ROUTE_LOAD_TIMEOUT });
}

beforeAll(async () => {
  await preloadAppRoutesForTests();
}, ROUTE_PRELOAD_TIMEOUT);