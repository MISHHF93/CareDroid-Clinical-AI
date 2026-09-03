import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchAlert } from './alertEngine';

const mocks = vi.hoisted(() => {
  const ingestPreparedAlert = vi.fn();
  const selectPatient = vi.fn();
  const raiseOperationalAlarm = vi.fn();
  const alerts: Array<Record<string, unknown>> = [];

  return {
    ingestPreparedAlert,
    selectPatient,
    raiseOperationalAlarm,
    alerts,
    getState: vi.fn(() => ({ ingestPreparedAlert, selectPatient, alerts })),
  };
});

vi.mock('../services/notificationToastPolicy', () => ({
  raiseOperationalAlarm: mocks.raiseOperationalAlarm,
}));

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: {
    getState: mocks.getState,
  },
}));

describe('dispatchAlert', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.alerts.length = 0;
    mocks.ingestPreparedAlert.mockImplementation((alert) => {
      mocks.alerts.push(alert);
    });
    mocks.ingestPreparedAlert.mockClear();
    mocks.selectPatient.mockClear();
    mocks.raiseOperationalAlarm.mockClear();
    mocks.getState.mockClear();
  });

  it('stores critical alerts and pulses the notification center instead of toasting', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T19:00:00.000Z'));

    const id = dispatchAlert({
      severity: 'Critical',
      title: 'Critical vitals',
      message: 'SpO2 88%',
      patientId: 'p1',
    });

    expect(id).toBe('alt1781377200000');
    expect(mocks.ingestPreparedAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        severity: 'Critical',
        title: 'Critical vitals',
        message: 'SpO2 88%',
        patientId: 'p1',
        dismissed: false,
        lifecycleStatus: 'open',
      }),
    );
    expect(mocks.raiseOperationalAlarm).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        severity: 'Critical',
        title: 'Critical vitals',
        patientId: 'p1',
      }),
    );
  });

  it('stores warning and info alerts without redundant surface toasts', () => {
    dispatchAlert({
      severity: 'Warning',
      title: 'Referral unacknowledged',
      message: 'Cardiology - 20m unacknowledged.',
    });
    dispatchAlert({
      severity: 'Info',
      title: 'Saved',
      message: 'Preferences saved',
    });

    expect(mocks.ingestPreparedAlert).toHaveBeenCalledTimes(2);
    expect(mocks.raiseOperationalAlarm).not.toHaveBeenCalled();
  });
});
