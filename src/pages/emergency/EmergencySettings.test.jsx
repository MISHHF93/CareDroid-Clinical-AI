import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmergencySettings, { auditLogToCsv } from './EmergencySettings';
import {
  fetchEmergencyOsSettings,
  saveEmergencyOsSettings,
} from '../../services/emergencySettingsApi';
import {
  fetchEmergencyAiGovernanceCompliance,
  fetchEmergencyAiGovernanceRegistry,
  fetchEmergencyWorkflowLogs,
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
    }),
  DEFAULT_EMERGENCY_THRESHOLDS: mockThresholds,
}));

vi.mock('../../services/emergencySettingsApi', () => ({
  fetchEmergencyOsSettings: vi.fn(),
  saveEmergencyOsSettings: vi.fn(),
}));

vi.mock('../../services/emergencyOsApi', () => ({
  fetchEmergencyAiGovernanceCompliance: vi.fn(),
  fetchEmergencyAiGovernanceRegistry: vi.fn(),
  fetchEmergencyWorkflowLogs: vi.fn(),
  validateEmergencyAiGovernancePrompts: vi.fn(),
}));

describe('EmergencySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchEmergencyOsSettings.mockResolvedValue({ ok: true, data: { data: mockSettings } });
    fetchEmergencyWorkflowLogs.mockResolvedValue({
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
    fetchEmergencyAiGovernanceRegistry.mockResolvedValue({
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
    fetchEmergencyAiGovernanceCompliance.mockResolvedValue({
      totalInteractions: 2,
      humanReviewRate: 1,
      storageMode: 'in-memory-audit-fixture',
    });
    validateEmergencyAiGovernancePrompts.mockResolvedValue({
      copilot: { valid: true, issues: [] },
    });
    saveEmergencyOsSettings.mockImplementation((payload) =>
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
      }),
    );
  });

  it('renders the complete required settings surface', async () => {
    render(<EmergencySettings />);

    expect(
      await screen.findByRole('heading', { name: 'Emergency OS Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Identity and Modules')).toBeInTheDocument();
    expect(screen.getByText('AI Settings')).toBeInTheDocument();
    expect(screen.getByText('Integration Settings')).toBeInTheDocument();
    expect(screen.getByText('Provincial Health Settings')).toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    expect(screen.getByText('Reassessment Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Capacity Thresholds')).toBeInTheDocument();
    expect(screen.getByText('EMS Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Boarding Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Alert Rules')).toBeInTheDocument();
    expect(screen.getByText('Central Control Node')).toBeInTheDocument();
    expect(screen.getByLabelText('Central control enabled')).toBeChecked();
    expect(screen.getByLabelText('Dashboard authority')).toHaveValue('central-node');
    expect(screen.getByLabelText('User input mode')).toHaveValue('central-escalation-input');
    expect(screen.getByText('department operating mode')).toBeInTheDocument();
    expect(screen.getByText('patient intake')).toBeInTheDocument();
    expect(await screen.findByText('governed AI services')).toBeInTheDocument();
    expect(screen.getByText('Human review coverage')).toBeInTheDocument();
    expect(screen.getByText('Blocked autonomous actions')).toBeInTheDocument();
    expect(screen.getByText('Copilot runtime config')).toBeInTheDocument();
  });

  it('renders fetched workflow action audit logs', async () => {
    render(<EmergencySettings />);

    expect(await screen.findByText('Workflow Action Audit')).toBeInTheDocument();
    expect(await screen.findByText('Created patient Audit Render.')).toBeInTheDocument();
    expect(screen.getByText(/Workflow audit loaded/i)).toBeInTheDocument();
  });

  it('saves capacity thresholds through the settings API and local store', async () => {
    render(<EmergencySettings />);

    await screen.findByRole('heading', { name: 'Emergency OS Settings' });
    fireEvent.change(screen.getByLabelText('Capacity orange %'), { target: { value: '76' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Capacity' }));

    await waitFor(() => {
      expect(saveEmergencyOsSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          capacityThresholds: expect.objectContaining({ warningPercent: 76 }),
          thresholds: expect.objectContaining({ waitWarningMinutes: 45, waitCriticalMinutes: 60 }),
        }),
      );
    });
    expect(saveEmergencySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholds: expect.objectContaining({ capacityWarningPercent: 76 }),
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
