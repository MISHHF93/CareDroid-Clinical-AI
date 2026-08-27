import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmergencySettings from './EmergencySettings';
import {
  fetchEmergencyOsSettings,
  fetchOrganizationEmergencyOsSettings,
  saveOrganizationEmergencyOsSettings,
} from '../../services/emergencySettingsApi';
import {
  fetchEmergencyAiGovernanceCompliance,
  fetchEmergencyAiGovernanceRegistry,
  fetchEmergencyWorkflowLogs,
  fetchIntegrationHub,
  fetchProvincialHealth,
  validateEmergencyAiGovernancePrompts,
} from '../../services/emergencyOsApi';

/**
 * HEAL: EmergencySettings.tsx had three separate `.catch(() => {...})`
 * handlers (Integration Hub, Provincial Health, workflow audit logs) that
 * didn't even take an `error` parameter -- every rejection, whatever its
 * real cause (401, 500, timeout, backend not running), collapsed into one
 * of two fixed generic sentences. This suite forces the "enterprise"
 * sections that host those three panels into view (they're gated behind
 * practitioner-pilot visibility, off by default in tests) and proves the
 * real backend error text now reaches the screen instead.
 */

const { mockThresholds, mockSettings } = vi.hoisted(() => ({
  mockThresholds: {
    waitTimeWarningMin: 45,
    waitTimeCtiticalMin: 60,
    capacityWarningPct: 0.7,
    capacityOrangePct: 0.8,
    capacityRedPct: 0.9,
    emsOffloadTargetMin: 15,
    reassessP1Min: 0,
    reassessP2Min: 15,
    reassessP3Min: 30,
    reassessP4Min: 60,
    reassessP5Min: 120,
  },
  mockSettings: {
    tenantName: 'CareDroid ED',
    defaultWorkspace: 'emergency-whiteboard',
    enabledModules: [
      { id: 'whiteboard', label: 'Emergency Whiteboard', enabled: true },
      { id: 'ems', label: 'EMS Intake', enabled: true },
      { id: 'boarding', label: 'Boarding Intelligence', enabled: true },
    ],
    aiSettings: {
      enabled: true,
      provider: 'CareDroid demo router',
      model: 'clinical-command-preview',
      triageAssistEnabled: true,
      summarizationEnabled: true,
      humanReviewRequired: true,
    },
    integrationSettings: {
      ehrEnabled: false,
      fhirEndpoint: 'https://fhir.demo.local/R4',
      hl7InterfaceId: 'hl7-demo',
      deviceTelemetryEnabled: false,
    },
    provincialHealthSettings: {
      connectorEnabled: false,
      jurisdiction: 'Ontario',
      lookupMode: 'manual-review',
      healthCardValidation: true,
    },
    notificationSettings: {
      inAppEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      escalationMinutes: 10,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
    },
    reassessmentThresholds: {
      P1: 15,
      P2: 30,
      P3: 60,
      P4: 120,
      P5: 180,
      overdueGraceMinutes: 10,
    },
    capacityThresholds: {
      departmentCapacityTarget: 30,
      warningPercent: 80,
      criticalPercent: 90,
      maxWaitingPatients: 12,
    },
    emsThresholds: {
      offloadTargetMinutes: 15,
      criticalEtaMinutes: 8,
      autoCreateArrival: true,
    },
    boardingThresholds: {
      escalationMinutes: 180,
      criticalMinutes: 240,
      maxBoarders: 6,
      inpatientNotifyMinutes: 120,
    },
    thresholds: {
      waitWarningMinutes: 45,
      waitCriticalMinutes: 60,
      capacityWarningPercent: 80,
      emsOffloadTargetMinutes: 15,
      reassessmentIntervals: { P1: 15, P2: 30, P3: 60, P4: 120, P5: 180 },
    },
    departmentCapacityTarget: 30,
    alertRules: {
      Reassessment: { enabled: true, severity: 'Warning' },
      Capacity: { enabled: true, severity: 'Warning' },
    },
  },
}));

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector) =>
    selector({
      emergencySettings: mockSettings,
      workflowLogs: [],
      auditLog: [],
      saveEmergencySettings: vi.fn(),
      activeScenario: null,
      thresholds: mockThresholds,
      setThreshold: vi.fn(),
      resetThresholds: vi.fn(),
      setActiveScenario: vi.fn(),
      patients: [],
      capacity: { score: 0, band: 'Green', occupiedRooms: 0, boardingCount: 0, reassessmentDue: 0 },
      alerts: [],
      emsArrivals: [],
      emsIncomingPatients: [],
      emsUnits: [],
      referrals: [],
      staff: [],
      rooms: [],
      websocket: { status: 'disconnected' },
      copilotMessages: [],
      integrationEvents: [],
      selectedPatientId: null,
      activeQueueFilter: null,
      whiteboardSearchQuery: '',
      loading: false,
      backendAvailable: false,
    }),
  DEFAULT_EMERGENCY_THRESHOLDS: mockThresholds,
}));

vi.mock('../../services/emergencySettingsApi', () => ({
  fetchEmergencyOsSettings: vi.fn(),
  fetchOrganizationEmergencyOsSettings: vi.fn(),
  saveEmergencyOsSettings: vi.fn(),
  saveOrganizationEmergencyOsSettings: vi.fn(),
}));

vi.mock('../../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/emergencyOsApi')>();
  return {
    ...actual,
    fetchEmergencyAiGovernanceCompliance: vi.fn(),
    fetchEmergencyAiGovernanceRegistry: vi.fn(),
    fetchEmergencyWorkflowLogs: vi.fn(),
    fetchIntegrationHub: vi.fn(),
    fetchProvincialHealth: vi.fn(),
    validateEmergencyAiGovernancePrompts: vi.fn(),
  };
});

// Integration Hub / Provincial Health / workflow-audit status cards only
// render when practitioner-pilot cleanup would otherwise hide the
// "enterprise" settings sections -- forcing this off surfaces them for
// this suite the same way a non-practitioner-pilot deployment would see them.
vi.mock('../../config/practitionerCleanup.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/practitionerCleanup.config')>();
  return {
    ...actual,
    isPractitionerCleanupEnabled: () => false,
  };
});

const GENERIC_INTEGRATION_HUB_MESSAGE = 'Integration Hub status is temporarily unavailable.';
const GENERIC_PROVINCIAL_HEALTH_MESSAGE =
  'Provincial Health connector status is temporarily unavailable.';

describe('EmergencySettings error messages (HEAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchOrganizationEmergencyOsSettings).mockResolvedValue({ ok: false, data: null, message: '' });
    vi.mocked(fetchEmergencyOsSettings).mockResolvedValue({ ok: true, data: { data: mockSettings }, message: '' });
    vi.mocked(saveOrganizationEmergencyOsSettings).mockResolvedValue({ ok: true, data: { data: mockSettings }, message: '' });
    vi.mocked(fetchEmergencyWorkflowLogs).mockResolvedValue({ data: { logs: [] } });
    vi.mocked(fetchEmergencyAiGovernanceRegistry).mockResolvedValue({
      services: {},
      safetyRules: { requiredDisclaimers: [], disallowedAutonomousActions: [] },
      storageMode: 'in-memory-audit-fixture',
      governanceFrameworks: [],
    });
    vi.mocked(fetchEmergencyAiGovernanceCompliance).mockResolvedValue({
      totalInteractions: 0,
      humanReviewRate: 0,
      storageMode: 'in-memory-audit-fixture',
    });
    vi.mocked(validateEmergencyAiGovernancePrompts).mockResolvedValue({});
  });

  it('surfaces the real 401 message for the Integration Hub panel instead of the fixed generic sentence', async () => {
    vi.mocked(fetchIntegrationHub).mockRejectedValue(
      Object.assign(new Error('Sign in required to load this data.'), { status: 401 }),
    );
    vi.mocked(fetchProvincialHealth).mockResolvedValue({
      module: 'Provincial Health',
      source: 'fixture',
      data: { connectorStatus: 'Manual review', jurisdiction: 'Ontario', records: [] },
      remainingGaps: [],
    });

    render(
      <MemoryRouter>
        <EmergencySettings />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'CareDroid Settings' });
    await waitFor(() => {
      expect(screen.getByText('Sign in required to load this data.')).toBeInTheDocument();
    });
    expect(screen.queryByText(GENERIC_INTEGRATION_HUB_MESSAGE)).not.toBeInTheDocument();
  });

  it('surfaces a distinct real network-unreachable message for the Provincial Health panel', async () => {
    vi.mocked(fetchIntegrationHub).mockResolvedValue({
      module: 'Integration Hub',
      source: 'fixture',
      data: { sources: [], reviewQueue: [] },
      remainingGaps: [],
    });
    vi.mocked(fetchProvincialHealth).mockRejectedValue(
      new Error('Unable to reach the API. Start the backend with `npm run dev:api` or `npm run dev:fullstack`.'),
    );

    render(
      <MemoryRouter>
        <EmergencySettings />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'CareDroid Settings' });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Unable to reach the API. Start the backend with `npm run dev:api` or `npm run dev:fullstack`.',
        ),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(GENERIC_PROVINCIAL_HEALTH_MESSAGE)).not.toBeInTheDocument();
  });
});
