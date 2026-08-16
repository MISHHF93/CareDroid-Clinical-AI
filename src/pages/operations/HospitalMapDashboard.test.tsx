import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HospitalMapDashboard from './HospitalMapDashboard';

// HEAL-278: load() had no staleness guard -- it's triggered both by a 60s
// setInterval and a manual "Refresh" button. If an interval tick fires
// while a previous call is still in flight and the older call resolves
// last (normal network jitter), its response overwrites the newer one,
// showing stale bed/capacity numbers.

const mocks = vi.hoisted(() => ({
  fetchEmergencyCapacityDashboard: vi.fn(),
  fetchEmergencyCapacityHistory: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  fetchHospitalMapSnapshot: vi.fn().mockResolvedValue({}),
  fetchEmergencySurgeStatus: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

vi.mock('../../services/emergencyAnalyticsApi', () => ({
  fetchEmergencyCapacityDashboard: () => mocks.fetchEmergencyCapacityDashboard(),
  fetchEmergencyCapacityHistory: () => mocks.fetchEmergencyCapacityHistory(),
}));
vi.mock('../../services/hospitalMapService', () => ({
  fetchHospitalMapSnapshot: () => mocks.fetchHospitalMapSnapshot(),
}));
vi.mock('../../services/surgeApi', () => ({
  fetchEmergencySurgeStatus: () => mocks.fetchEmergencySurgeStatus(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('HospitalMapDashboard refresh race (HEAL-278)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not let a slower, superseded load() (an overlapping 60s poll tick) overwrite fresher bed counts', async () => {
    const deferredMount = deferred<unknown>();
    mocks.fetchEmergencyCapacityDashboard.mockImplementationOnce(() => deferredMount.promise);

    render(
      <MemoryRouter>
        <HospitalMapDashboard />
      </MemoryRouter>,
    );

    // The mount-triggered load() call is now pending on deferredMount.
    // Advance past the 60s interval so a second, independent load() call
    // starts while the first is still in flight -- the interval doesn't
    // check `loading` before firing again.
    const deferredPoll = deferred<unknown>();
    mocks.fetchEmergencyCapacityDashboard.mockImplementationOnce(() => deferredPoll.promise);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    // The poll-tick call resolves first (fresh data).
    await act(async () => {
      deferredPoll.resolve({
        ok: true,
        data: { totalBeds: 42, occupiedBeds: 10, availableBeds: 32, boardingPatients: 0 },
      });
      await Promise.resolve();
    });
    expect(screen.getByText('42')).toBeInTheDocument();

    // The original, slower mount call resolves last, after the poll tick
    // already won -- its stale response must not overwrite the fresh one.
    await act(async () => {
      deferredMount.resolve({
        ok: true,
        data: { totalBeds: 999, occupiedBeds: 1, availableBeds: 998, boardingPatients: 0 },
      });
      await Promise.resolve();
    });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });
});
