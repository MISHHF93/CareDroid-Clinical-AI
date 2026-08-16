import { afterEach, describe, expect, it, vi } from 'vitest';

// HEAL-250: submitReceptionEscalation's durable backend POST swallowed a
// rejection completely silently (.catch(() => undefined)) -- unlike the
// adjacent escalatePatient action in the same file, which logs a sync
// failure via logger.warn. The local alert/UI already reports success
// before this POST resolves, so a dropped backend failure left zero trace
// that the escalation may not have durably persisted or reached other
// stations.

const postReceptionEscalation = vi.fn(() => Promise.resolve({ data: { ok: true } }));
const loggerWarn = vi.fn();

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    postReceptionEscalation: (...args: unknown[]) => postReceptionEscalation(...args),
  };
});

vi.mock('../utils/logger', () => ({
  default: { warn: (...args: unknown[]) => loggerWarn(...args), error: vi.fn(), info: vi.fn() },
}));

const { useEmergencyStore } = await import('./emergencyStore');

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('emergencyStore reception escalation durable sync', () => {
  it('logs a warning when the durable backend sync rejects, instead of discarding it silently', async () => {
    postReceptionEscalation.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    const store = useEmergencyStore.getState();
    const patient = store.patients[0];

    const record = store.submitReceptionEscalation({
      reasonId: 'collapse-distress',
      patientId: patient?.id,
      actorName: 'Test Nurse',
    });

    expect(record).toBeTruthy();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(postReceptionEscalation).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('reception escalation'),
      expect.any(Error),
    );
  });
});
