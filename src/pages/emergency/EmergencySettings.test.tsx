import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmergencySettings, {
  auditLogToCsv,
  patientAuditLabel,
  redactAuditLogForRole,
} from './EmergencySettings';
import {
  fetchEmergencyOsSettings,
  fetchOrganizationEmergencyOsSettings,
  saveEmergencyOsSettings,
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

const { saveEmergencySettings, setThreshold, resetThresholds, mockThresholds } = vi.hoisted(() => ({
  saveEmergencySettings: vi.fn(),
  setThreshold: vi.fn(),
  resetThresholds: vi.fn(),
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
}));

const mockSettings = {
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
};

vi.mock('../../../store/emergencyStore', () => ({
  useEmergencyStore: (selector) =>
    selector({
      emergencySettings: mockSettings,
      workflowLogs: [],
      auditLog: [],
      saveEmergencySettings,
      activeScenario: null,
      setActiveScenario: vi.fn(),
    }),
}));

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector) =>
    selector({
      emergencySettings: mockSettings,
      workflowLogs: [],
      auditLog: [],
      saveEmergencySettings,
      activeScenario: null,
      thresholds: mockThresholds,
      setThreshold,
      resetThresholds,
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

describe('EmergencySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchOrganizationEmergencyOsSettings).mockResolvedValue({ ok: false, data: null, message: '' });
    vi.mocked(fetchEmergencyOsSettings).mockResolvedValue({ ok: true, data: { data: mockSettings }, message: '' });
    vi.mocked(saveOrganizationEmergencyOsSettings).mockImplementation((patch: any) =>
      Promise.resolve({
        ok: true,
        data: {
          data: {
            ...mockSettings,
            ...patch,
            capacityThresholds: {
              ...mockSettings.capacityThresholds,
              ...patch.capacityThresholds,
            },
            thresholds: {
              ...mockSettings.thresholds,
              ...patch.thresholds,
            },
          },
        },
        message: '',
      }),
    );
    vi.mocked(fetchEmergencyWorkflowLogs).mockResolvedValue({
      data: {
        logs: [
          {
            id: 'workflow-audit-test',
            type: 'patient_created',
            title: 'Patient created',
            summary: 'Created patient Audit Render.',
            timestamp: '2026-06-13T13:00:00.000Z',
            patientId: 'patient-audit-render',
            source: 'test-backend',
            severity: 'Info',
            status: 'recorded',
            metadata: {},
          },
        ],
      },
    });
    vi.mocked(fetchIntegrationHub).mockResolvedValue({
      module: 'Integration Hub',
      source: 'fixture',
      data: {
        sources: [{ id: 'ehr', label: 'EHR', status: 'manual-review' }],
        reviewQueue: [{ id: 'integration-review', label: 'FHIR credential review' }],
      },
      remainingGaps: ['Live credentials are not connected.'],
    });
    vi.mocked(fetchProvincialHealth).mockResolvedValue({
      module: 'Provincial Health',
      source: 'fixture',
      data: {
        connectorStatus: 'Manual review',
        jurisdiction: 'Ontario',
        records: [{ id: 'record-1' }],
        disclaimer: 'External data requires manual review before use.',
      },
      remainingGaps: [],
    });
    vi.mocked(fetchEmergencyAiGovernanceRegistry).mockResolvedValue({
      services: {
        copilot: {
          name: 'ED Copilot',
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          requiresHumanReview: true,
          auditLevel: 'full',
          status: 'active',
        },
        deteriorationPrediction: {
          name: 'Deterioration Prediction',
          provider: 'local',
          model: 'deterioration-v3-deterministic',
          requiresHumanReview: true,
          auditLevel: 'full',
          status: 'future',
        },
        federatedEmsTriage: {
          name: 'Federated EMS Triage',
          provider: 'local',
          model: 'fed-ems-edge-v1',
          requiresHumanReview: true,
          auditLevel: 'basic',
          status: 'future',
        },
      },
      safetyRules: {
        requiredDisclaimers: ['Human review required'],
        disallowedAutonomousActions: ['diagnose', 'prescribe', 'disposition patients'],
      },
      storageMode: 'in-memory-audit-fixture',
      governanceFrameworks: ['NIST AI RMF', 'WHO AI healthcare guidance'],
    });
    vi.mocked(fetchEmergencyAiGovernanceCompliance).mockResolvedValue({
      totalInteractions: 2,
      humanReviewRate: 1,
      storageMode: 'in-memory-audit-fixture',
    });
    vi.mocked(validateEmergencyAiGovernancePrompts).mockResolvedValue({
      copilot: { valid: true, issues: [] },
    });
    vi.mocked(saveEmergencyOsSettings).mockImplementation((payload: any) =>
      Promise.resolve({
        ok: true,
        data: {
          data: {
            ...mockSettings,
            ...payload,
            capacityThresholds: {
              ...mockSettings.capacityThresholds,
              ...(payload.capacityThresholds || {}),
            },
            thresholds: {
              ...mockSettings.thresholds,
              ...(payload.thresholds || {}),
              capacityWarningPercent:
                payload.capacityThresholds?.warningPercent ??
                mockSettings.thresholds.capacityWarningPercent,
            },
          },
        },
        message: '',
      }),
    );
  });

  it('renders the complete required settings surface', async () => {
    render(
      <MemoryRouter>
        <EmergencySettings />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'CareDroid Settings' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Identity and Modules')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Integration Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Provincial Health Settings')).not.toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    expect(screen.getByText('Reassessment Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Capacity Thresholds')).toBeInTheDocument();
    expect(screen.getByText('EMS Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Boarding Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Alert Rules')).toBeInTheDocument();
    expect(screen.queryByText('Central Control Node')).not.toBeInTheDocument();
    expect(screen.queryByText('Screen Modes')).not.toBeInTheDocument();
    expect(screen.queryByText('Workflow Action Audit')).not.toBeInTheDocument();
    expect(screen.queryByText('governed AI services')).not.toBeInTheDocument();
  });

  it('hides workflow audit sections during practitioner pilot cleanup', async () => {
    render(
      <MemoryRouter>
        <EmergencySettings />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'CareDroid Settings' });
    expect(screen.queryByText('Workflow Action Audit')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
  });

  it('saves capacity thresholds through the settings API and local store', async () => {
    render(
      <MemoryRouter>
        <EmergencySettings />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'CareDroid Settings' });
    fireEvent.change(screen.getByLabelText('Capacity orange %'), { target: { value: '76' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Capacity' }));

    await waitFor(() => {
      expect(saveOrganizationEmergencyOsSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          capacityThresholds: expect.objectContaining({ warningPercent: 76 }),
          thresholds: expect.objectContaining({ waitWarningMinutes: 45, waitCriticalMinutes: 60 }),
        }),
      );
    });
    expect(saveEmergencySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        capacityThresholds: expect.objectContaining({ warningPercent: 76 }),
        thresholds: expect.objectContaining({ capacityOrangePercent: 76 }),
      }),
    );
  });

  it('serializes store action audit logs to CSV', () => {
    expect(
      auditLogToCsv([
        {
          timestamp: '2026-06-13T13:00:00.000Z',
          action: 'addVitals',
          patientId: 'p1',
          staffId: 's1',
          details: { news2: 4 },
        },
      ]),
    ).toContain(
      '"Time","Action","Patient","Staff","Details"\n"2026-06-13T13:00:00.000Z","addVitals","p1","s1","{""news2"":4}"',
    );
  });
});

describe('patientAuditLabel (HEAL-215)', () => {
  const patients = [{ id: 'patient-1', firstName: 'Sarah', lastName: 'Okafor', mrn: 'MRN-9001' }];

  it('returns the real name and MRN when the role can view patients', () => {
    expect(patientAuditLabel('patient-1', patients, true)).toBe('Sarah Okafor (MRN-9001)');
  });

  it('defaults to allowing patient visibility when canViewPatients is omitted (back-compat)', () => {
    expect(patientAuditLabel('patient-1', patients)).toBe('Sarah Okafor (MRN-9001)');
  });

  it('returns a generic restricted label instead of the real name when the role cannot view patients', () => {
    const label = patientAuditLabel('patient-1', patients, false);
    expect(label).toBe('Patient record (restricted)');
    expect(label).not.toContain('Sarah');
    expect(label).not.toContain('MRN-9001');
  });

  it('returns "Department" for entries with no patientId regardless of role', () => {
    expect(patientAuditLabel(null, patients, false)).toBe('Department');
  });
});

describe('redactAuditLogForRole (HEAL-215)', () => {
  const log = {
    id: 'workflow-audit-test',
    type: 'patient_created',
    title: 'Patient created',
    summary: 'Created patient Sarah Okafor at reception.',
    patientId: 'patient-1',
    timestamp: '2026-06-13T13:00:00.000Z',
  };

  it('replaces title and summary when the role cannot view patients and the log is patient-linked', () => {
    const redacted = redactAuditLogForRole(log, false);
    expect(redacted.title).toBe('Patient action');
    expect(redacted.summary).toBe('Details restricted for this role.');
    expect(redacted.summary).not.toContain('Sarah Okafor');
  });

  it('leaves the log untouched when the role can view patients', () => {
    expect(redactAuditLogForRole(log, true)).toBe(log);
  });

  it('leaves non-patient-linked logs untouched even when the role cannot view patients', () => {
    const departmentLog = { ...log, patientId: undefined };
    expect(redactAuditLogForRole(departmentLog, false)).toBe(departmentLog);
  });
});
