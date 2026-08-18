import { describe, expect, it, vi, beforeEach } from 'vitest';
import BoardingApi from './boardingApi';
import { fetchBoardingSignalsForPatient, clearBoardingSignalsCache } from './boardingSignals';
import type { Patient } from '../types/emergency';

vi.mock('./boardingApi', () => ({
  default: {
    fetchBoardedPatients: vi.fn(),
  },
}));

function makePatient(id: string): Patient {
  return {
    id,
    state: 'Waiting',
    flags: [],
  } as unknown as Patient;
}

describe('fetchBoardingSignalsForPatient — shared-fetch dedup', () => {
  beforeEach(() => {
    clearBoardingSignalsCache();
    vi.mocked(BoardingApi.fetchBoardedPatients).mockReset();
  });

  it('calls BoardingApi.fetchBoardedPatients only once when many patient cards mount at the same time (N+1 fan-out fix)', async () => {
    // Every PatientCard on the Whiteboard independently calls this in its own
    // useEffect on mount. Before this fix, each one's cache miss (keyed per
    // patient, not per endpoint) triggered its own call to the same
    // /api/emergency/boarding/boarded endpoint -- confirmed live producing
    // ~70 near-simultaneous identical requests with a ~70-patient board.
    vi.mocked(BoardingApi.fetchBoardedPatients).mockResolvedValue({
      ok: true,
      data: [],
      message: '',
    });

    const patients = Array.from({ length: 25 }, (_, i) => makePatient(`patient-${i}`));
    await Promise.all(patients.map((patient) => fetchBoardingSignalsForPatient(patient)));

    expect(BoardingApi.fetchBoardedPatients).toHaveBeenCalledTimes(1);
  });

  it('still resolves the correct per-patient signal after sharing the underlying fetch', async () => {
    vi.mocked(BoardingApi.fetchBoardedPatients).mockResolvedValue({
      ok: true,
      data: [{ id: 'patient-boarded', boardingDurationMinutes: 42 }],
      message: '',
    });

    const [boarded, notBoarded] = await Promise.all([
      fetchBoardingSignalsForPatient(makePatient('patient-boarded')),
      fetchBoardingSignalsForPatient(makePatient('patient-other')),
    ]);

    expect(boarded).toEqual(
      expect.objectContaining({ isBoarded: true, source: 'live', boardingDurationMinutes: 42 }),
    );
    expect(notBoarded).toEqual(expect.objectContaining({ source: 'local' }));
    expect(BoardingApi.fetchBoardedPatients).toHaveBeenCalledTimes(1);
  });

  it('falls back to the local signal for every patient without extra calls when the endpoint is unavailable', async () => {
    vi.mocked(BoardingApi.fetchBoardedPatients).mockResolvedValue({
      ok: false,
      data: null,
      message: 'Backend boarding endpoint is not available yet.',
    });

    const patients = Array.from({ length: 10 }, (_, i) => makePatient(`patient-${i}`));
    const results = await Promise.all(
      patients.map((patient) => fetchBoardingSignalsForPatient(patient)),
    );

    expect(results.every((signal) => signal.source === 'local')).toBe(true);
    expect(BoardingApi.fetchBoardedPatients).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the shared cache is cleared', async () => {
    vi.mocked(BoardingApi.fetchBoardedPatients).mockResolvedValue({
      ok: true,
      data: [],
      message: '',
    });

    await fetchBoardingSignalsForPatient(makePatient('patient-1'));
    clearBoardingSignalsCache();
    await fetchBoardingSignalsForPatient(makePatient('patient-1'));

    expect(BoardingApi.fetchBoardedPatients).toHaveBeenCalledTimes(2);
  });
});
