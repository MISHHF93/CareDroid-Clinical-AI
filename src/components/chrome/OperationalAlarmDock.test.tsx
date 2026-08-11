import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperationalAlarmDock from './OperationalAlarmDock';

const openPanel = vi.fn();
const recordAlertAcknowledged = vi.fn();
const openAlertRoute = vi.fn(() => ({
  label: 'Open',
  disabled: false,
  onSelect: vi.fn(),
}));

vi.mock('../../contexts/NotificationShellContext', () => ({
  useNotificationShell: () => ({
    visibleNotificationAlerts: [
      {
        id: 'alert-1',
        title: 'Boarding pressure rising',
        message: 'Four patients waiting over target',
        severity: 'Critical',
        dismissed: false,
        acknowledged: false,
        source: 'capacity',
        type: 'operational',
        createdAt: new Date().toISOString(),
      },
    ],
    openPanel,
    recordAlertAcknowledged,
    openAlertRoute,
  }),
}));

vi.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'u1', name: 'Test User', role: 'physician' } }),
}));

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'charge_nurse',
    roleLabel: 'Charge Nurse',
    presentAction: () => ({ visible: true, enabled: true }),
  }),
}));

vi.mock('../../hooks/useEffectiveUserProfile', () => ({
  default: () => ({ saasRole: 'clinician' }),
}));

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      emsArrivals: [],
      rooms: [],
      staff: [],
      activeShift: { staffIds: [], chargeStaffId: null },
      checkCriticalEMSChecklistItem: vi.fn(),
      completeCriticalEMSChecklist: vi.fn(),
    }),
}));

vi.mock('../../engine/alertClassificationModel', () => ({
  getAlertClassificationTier: () => 'critical',
  isAlertActionable: (alert: any) =>
    Boolean(alert) && !alert.dismissed && !alert.read && !alert.acknowledged,
  countActionableAlerts: (alerts: any[]) =>
    alerts.filter((alert: any) => Boolean(alert) && !alert.dismissed && !alert.read && !alert.acknowledged)
      .length,
}));

describe('OperationalAlarmDock floating window', () => {
  beforeEach(() => {
    openPanel.mockClear();
    recordAlertAcknowledged.mockClear();
  });

  it('renders a header-anchored chip (not a floating corner window)', () => {
    render(
      <MemoryRouter>
        <div className="app-chrome-top__actions">
          <OperationalAlarmDock />
        </div>
      </MemoryRouter>,
    );

    const chip = screen.getByRole('button', { name: /priority alert|critical alert|active/i });
    expect(chip).toBeInTheDocument();
    expect(chip.className).toMatch(/operational-alarm-dock__chip/);
    expect(document.querySelector('.operational-alarm-dock--header')).toBeTruthy();
    expect(document.querySelector('.operational-alarm-dock--floating')).toBeNull();
  });

  it('expands into a dropdown window with acknowledge and all-alerts actions', () => {
    render(
      <MemoryRouter>
        <div className="app-chrome-top__actions">
          <OperationalAlarmDock />
        </div>
      </MemoryRouter>,
    );

    const chip = screen.getByRole('button', { name: /expand alarms|collapse alarms/i });
    if (chip.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(chip);
    }

    expect(screen.getByRole('region', { name: /operational alarms/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /all alerts/i }));
    expect(openPanel).toHaveBeenCalled();
  });
});
