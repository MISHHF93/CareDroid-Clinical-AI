import { describe, expect, it, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import FullJourneyOperatingPage from './FullJourneyOperatingPage';
import { renderPageWithRouter } from '../../test/testRenderUtils';
import { createReadinessPlan } from '../../services/edReadinessService';

/**
 * HEAL-182: snapshot (and the StickyActionBanner it feeds, mounted on all 5 views) only
 * recomputed when the Zustand store's patients/staff/emsArrivals/alerts/capacity changed --
 * readiness.overdueCount is time-based (expectedArrivalAt < now), so a plan could flip from
 * on-time to overdue with zero store mutation and sit stale indefinitely. The page now mirrors
 * EdReadinessView's own 5s refresh interval so the cross-view banner doesn't fall behind.
 */
describe('FullJourneyOperatingPage — readiness-overdue freshness (HEAL-182)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('picks up a plan going overdue purely from time passing, with no store mutation', () => {
    vi.useFakeTimers();
    const baseNow = new Date('2026-08-13T12:00:00.000Z');
    vi.setSystemTime(baseNow);

    createReadinessPlan({
      callId: 'call-heal-182',
      preparedBy: 'staff-1',
      expectedArrivalAt: new Date(baseNow.getTime() + 2000).toISOString(),
    });

    const { container } = renderPageWithRouter(<FullJourneyOperatingPage />);

    // Not overdue yet (expectedArrivalAt is 2s in the future).
    expect(container.textContent).not.toMatch(/readiness plan.*overdue/i);

    // Advance real "now" past expectedArrivalAt, but only tick the interval -- no store change.
    act(() => {
      vi.setSystemTime(new Date(baseNow.getTime() + 3000));
      vi.advanceTimersByTime(5000);
    });

    expect(container.textContent).toMatch(/readiness plan.*overdue/i);
  });
});
