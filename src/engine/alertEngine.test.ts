import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { dispatchAlert } from './alertEngine';

const mocks = vi.hoisted(() => {
  const addAlert = vi.fn();
  const selectPatient = vi.fn();
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
  });

  return {
    addAlert,
    selectPatient,
    toastFn,
    getState: vi.fn(() => ({ addAlert, selectPatient })),
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
    mocks.addAlert.mockClear();
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
    expect(mocks.addAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        severity: 'Critical',
        title: 'Critical vitals',
        message: 'SpO2 88%',
        patientId: 'p1',
        dismissed: false,
        createdAt: '2026-06-13T19:00:00.000Z',
      }),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Critical vitals',
      expect.objectContaining({
        description: 'SpO2 88%',
        duration: Infinity,
        action: expect.objectContaining({ label: 'View Patient' }),
      }),
    );

    const action = mocks.toastFn.error.mock.calls[0][1].action;
    action.onClick();
    expect(mocks.selectPatient).toHaveBeenCalledWith('p1');
  });

  it('uses warning and default toast durations by severity', () => {
    dispatchAlert({
      severity: 'Warning',
      title: 'Capacity Orange',
      message: 'Score 58',
    });
    dispatchAlert({
      severity: 'Info',
      title: 'Saved',
      message: 'Preferences saved',
    });

    expect(toast.warning).toHaveBeenCalledWith(
      'Capacity Orange',
      expect.objectContaining({ description: 'Score 58', duration: 10000 }),
    );
    expect(toast).toHaveBeenCalledWith(
      'Saved',
      expect.objectContaining({ description: 'Preferences saved', duration: 5000 }),
    );
  });
});
