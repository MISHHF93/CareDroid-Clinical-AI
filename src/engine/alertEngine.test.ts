import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { dispatchAlert } from './alertEngine';

const mocks = vi.hoisted(() => {
  const ingestPreparedAlert = vi.fn();
  const selectPatient = vi.fn();
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
  });
  const alerts: Array<Record<string, unknown>> = [];

  return {
    ingestPreparedAlert,
    selectPatient,
    toastFn,
    alerts,
    getState: vi.fn(() => ({ ingestPreparedAlert, selectPatient, alerts })),
  };
});

vi.mock('sonner', () => ({
  toast: mocks.toastFn,
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
    mocks.toastFn.mockClear();
    mocks.toastFn.error.mockClear();
    mocks.toastFn.warning.mockClear();
    mocks.getState.mockClear();
  });

  it('stores and toasts critical alerts with a patient action', () => {
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
    expect(toast.error).toHaveBeenCalledWith(
      'Critical vitals',
      expect.objectContaining({
        description: 'SpO2 88%',
        duration: 7000,
        action: expect.objectContaining({ label: 'View Patient' }),
      }),
    );

    const action = mocks.toastFn.error.mock.calls[0][1].action;
    action.onClick();
    expect(mocks.selectPatient).toHaveBeenCalledWith('p1');
  });

  it('stores warning and info alerts without redundant toasts', () => {
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
    expect(mocks.toastFn).not.toHaveBeenCalled();
    expect(mocks.toastFn.error).not.toHaveBeenCalled();
  });
});