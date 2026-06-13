import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmergencySettings from './EmergencySettings';
import { fetchEmergencyOsSettings, saveEmergencyOsSettings } from '../../services/emergencySettingsApi';

const saveEmergencySettings = vi.fn();

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
      saveEmergencySettings,
    }),
}));

vi.mock('../../services/emergencySettingsApi', () => ({
  fetchEmergencyOsSettings: vi.fn(),
  saveEmergencyOsSettings: vi.fn(),
}));

describe('EmergencySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchEmergencyOsSettings.mockResolvedValue({ ok: true, data: { data: mockSettings } });
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
                payload.capacityThresholds?.warningPercent ?? mockSettings.thresholds.capacityWarningPercent,
            },
          },
        },
      })
    );
  });

  it('renders the complete required settings surface', async () => {
    render(<EmergencySettings />);

    expect(await screen.findByRole('heading', { name: 'Emergency OS Settings' })).toBeInTheDocument();
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
  });

  it('saves capacity thresholds through the settings API and local store', async () => {
    render(<EmergencySettings />);

    await screen.findByRole('heading', { name: 'Emergency OS Settings' });
    fireEvent.change(screen.getByLabelText('Capacity warning %'), { target: { value: '76' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Capacity' }));

    await waitFor(() => {
      expect(saveEmergencyOsSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          capacityThresholds: expect.objectContaining({ warningPercent: 76 }),
          thresholds: expect.objectContaining({ waitWarningMinutes: 45, waitCriticalMinutes: 60 }),
        })
      );
    });
    expect(saveEmergencySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholds: expect.objectContaining({ capacityWarningPercent: 76 }),
      })
    );
  });
});
