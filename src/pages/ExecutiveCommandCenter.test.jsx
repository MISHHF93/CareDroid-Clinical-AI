import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExecutiveCommandCenter from './ExecutiveCommandCenter';

const mocks = vi.hoisted(() => ({
  getOrganizationAnalytics: vi.fn(),
  getCustomerSuccessDashboard: vi.fn(),
  getTenantAdministration: vi.fn(),
  fetchFleetCommandSnapshot: vi.fn(),
  fetchMedicalIotSnapshot: vi.fn(),
  fetchPlatformGovernanceSurface: vi.fn(),
}));

vi.mock('./ExecutiveCommandCenter.css', () => ({}));
vi.mock('../components/dashboard/DashboardVisualizations.css', () => ({}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    userId: 'exec-test-user',
    organization: {
      id: 'org-executive',
      name: 'Executive Test Hospital',
      organizationType: 'hospital',
      slug: 'executive-test-hospital',
    },
    entitledPackIds: ['core-platform', 'operations-command'],
    platformContext: {
      defaultAiAgentId: 'agent-executive',
      entitledPackIds: ['core-platform', 'operations-command'],
      availablePacks: [
        { id: 'core-platform', name: 'Core Platform', assetIds: ['assistant', 'qsofa'] },
        { id: 'operations-command', name: 'Operations Command', assetIds: ['fleet', 'iot'] },
      ],
      departments: ['Emergency', 'Operations'],
    },
  }),
}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    organization: {
      id: 'org-executive',
      name: 'Executive Test Hospital',
      organizationType: 'hospital',
      slug: 'executive-test-hospital',
    },
    tenant: { tenantId: 'exec-tenant' },
    subscription: { tier: 'enterprise' },
    integrations: [],
  }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    workspaces: [
      { id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa', 'triage'] },
      { id: 'operations', name: 'Operations', enabledToolIds: ['fleet', 'iot'] },
    ],
    activeWorkspaceId: 'operations',
  }),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: 'alert-1',
        title: 'Capacity warning',
        message: 'ICU capacity requires executive review.',
        type: 'warning',
        severity: 'medium',
      },
    ],
  }),
}));

vi.mock('../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getOrganizationAnalytics: (...args) => mocks.getOrganizationAnalytics(...args),
    getCustomerSuccessDashboard: (...args) => mocks.getCustomerSuccessDashboard(...args),
    getTenantAdministration: (...args) => mocks.getTenantAdministration(...args),
  },
}));

vi.mock('../services/fleetTelemetryService', () => ({
  fetchFleetCommandSnapshot: (...args) => mocks.fetchFleetCommandSnapshot(...args),
}));

vi.mock('../services/medicalIotService', () => ({
  fetchMedicalIotSnapshot: (...args) => mocks.fetchMedicalIotSnapshot(...args),
}));

vi.mock('../services/platformGovernanceApi', () => ({
  fetchPlatformGovernanceSurface: (...args) => mocks.fetchPlatformGovernanceSurface(...args),
}));

function renderExecutive() {
  return render(
    <MemoryRouter initialEntries={['/executive']}>
      <ExecutiveCommandCenter />
    </MemoryRouter>
  );
}

describe('ExecutiveCommandCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrganizationAnalytics.mockResolvedValue({
      enabledPackIds: ['core-platform', 'operations-command'],
      dashboards: {
        adoption: {
          enabledPackCount: 2,
          enabledAssetCount: 8,
          totalAssetCount: 10,
          adoptionScore: 82,
        },
        engagement: {
          aiUsageCount: 240,
          simulationCompletionCount: 36,
          dashboardEngagementCount: 60,
        },
      },
      dimensions: {
        workspaceUsage: [
          { id: 'emergency', label: 'Emergency', count: 42 },
          { id: 'operations', label: 'Operations', count: 58 },
        ],
        packUsage: [
          { id: 'core-platform', label: 'Core Platform', count: 80 },
          { id: 'operations-command', label: 'Operations Command', count: 65 },
        ],
        aiUsage: [{ id: 'clinical-assistant', label: 'Clinical Assistant', count: 240 }],
      },
    });
    mocks.getCustomerSuccessDashboard.mockResolvedValue({
      health: { score: 88, status: 'healthy', retentionRisk: 'low' },
      metrics: {
        activeUsers: { value: 120 },
        adoption: { value: 82, enabledPackCount: 2, enabledAssetCount: 8, totalAssetCount: 10 },
        aiUsage: { value: 240 },
        simulationsCompleted: { value: 36 },
        workflowsCompleted: { value: 50 },
        assetUsage: { value: 145 },
      },
    });
    mocks.getTenantAdministration.mockResolvedValue({
      profile: { id: 'org-executive', name: 'Executive Test Hospital', organizationType: 'hospital' },
      departments: ['Emergency', 'Operations', 'Nursing'],
      workspaces: [
        { id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa', 'triage'] },
        { id: 'operations', name: 'Operations', enabledToolIds: ['fleet', 'iot'] },
      ],
    });
    mocks.fetchFleetCommandSnapshot.mockResolvedValue({
      summary: {
        activeVehicles: 5,
        availableVehicles: 8,
        occupiedVehicles: 2,
        maintenanceCount: 1,
        totalVehicles: 10,
        averageUtilizationPercent: 68,
        lowEnergyCount: 1,
        source: 'mock-telemetry',
      },
      vehicles: [],
      visualizations: {
        statusDistribution: [
          { name: 'available', value: 8 },
          { name: 'occupied', value: 2 },
        ],
      },
    });
    mocks.fetchMedicalIotSnapshot.mockResolvedValue({
      ok: true,
      unsupported: true,
      message: 'Medical IoT backend endpoints are unavailable; showing demo telemetry.',
      snapshot: {
        source: 'demo-telemetry',
        sourceLabel: 'Demo telemetry',
        devices: [
          { id: 'device-1', name: 'Bedside Monitor', status: 'online', freshness: 'fresh' },
          { id: 'device-2', name: 'Infusion Pump', status: 'warning', freshness: 'fresh' },
          { id: 'device-3', name: 'Home BP Cuff', status: 'offline', freshness: 'offline' },
        ],
        alerts: [
          {
            id: 'iot-alert',
            title: 'Offline device warning',
            detail: 'Home BP cuff has not reported.',
            source: 'Medical IoT',
            severity: 'medium',
          },
        ],
      },
    });
    mocks.fetchPlatformGovernanceSurface.mockImplementation((surface) =>
      Promise.resolve({
        ok: true,
        sourceStatus: 'live',
        data: {
          status: surface === 'ai-security' ? 'secure' : 'ready',
          readiness: { blocked: false },
          counts: { evidence: 3, findings: surface === 'audit' ? 2 : 1 },
        },
        message: '',
      })
    );
  });

  it('renders all executive KPIs, widgets, source states, and operational alerts', async () => {
    renderExecutive();

    expect(
      screen.getByRole('heading', { level: 1, name: /executive command center/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/Active Users:/i)).toBeInTheDocument();
      expect(screen.getByText(/snapshot ready/i)).toBeInTheDocument();
    });

    for (const label of [
      /Active Departments:/i,
      /Adoption Score:/i,
      /Automation Utilization:/i,
      /Training Completion:/i,
      /Device Availability:/i,
      /Fleet Availability:/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }

    for (const heading of [
      /Organization Health/i,
      /Workspace Adoption/i,
      /Asset Pack Adoption/i,
      /AI Usage/i,
      /Simulation Completion/i,
      /Fleet Health/i,
      /Medical IoT Health/i,
      /Compliance Status/i,
      /Security Status/i,
      /Operational Alerts/i,
    ]) {
      expect(screen.getAllByRole('heading', { name: heading }).length).toBeGreaterThan(0);
    }

    const sourceStates = screen.getByLabelText(/executive source states/i);
    expect(within(sourceStates).getByText(/mock telemetry/i)).toBeInTheDocument();
    expect(within(sourceStates).getByText(/demo telemetry/i)).toBeInTheDocument();

    const alerts = screen.getByRole('heading', { name: /Operational Alerts/i }).closest('section');
    expect(within(alerts).getByText(/fleet maintenance pressure/i)).toBeInTheDocument();
    expect(within(alerts).getByText(/offline device warning/i)).toBeInTheDocument();
    expect(within(alerts).getByText(/capacity warning/i)).toBeInTheDocument();

    expect(mocks.getOrganizationAnalytics).toHaveBeenCalledWith('org-executive');
    expect(mocks.fetchPlatformGovernanceSurface).toHaveBeenCalledWith('ai-security', '/security');
  });

  it('surfaces degraded organization source errors without hiding the dashboard', async () => {
    mocks.getOrganizationAnalytics.mockRejectedValue(new Error('Organization analytics failed'));

    renderExecutive();

    expect(await screen.findByRole('alert')).toHaveTextContent(/organization analytics failed/i);
    expect(screen.getByRole('heading', { name: /Organization Health/i })).toBeInTheDocument();
  });
});
