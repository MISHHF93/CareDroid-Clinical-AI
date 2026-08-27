import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FullJourneyOperatingPage from './FullJourneyOperatingPage';
import { renderPageWithRouter } from '../../test/testRenderUtils';
import { createReadinessPlan } from '../../services/edReadinessService';
import * as careOperationsApi from '../../services/careOperationsApi';

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

describe('FullJourneyOperatingPage handoffs view — Care Operations Inbox', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a fetched task and claims it through the real transition API', async () => {
    const task = {
      id: 'care-task-1',
      taskType: 'reassessment_due' as const,
      status: 'OPEN' as const,
      priority: 'Warning' as const,
      ownerRole: 'triage_nurse',
      reason: 'Reassessment due for Jane Doe',
      sourceEvent: 'reassessment.due.scan',
      deepLink: '/emergency/reassessment?patient=patient-1',
      isOverdue: true,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    };

    const fetchSpy = vi
      .spyOn(careOperationsApi, 'fetchCareOperationsInbox')
      .mockResolvedValueOnce({ ok: true, tasks: [task], message: '' })
      .mockResolvedValue({
        ok: true,
        tasks: [{ ...task, status: 'ACKNOWLEDGED', ownerUserId: 'user-1' }],
        message: '',
      });
    const transitionSpy = vi
      .spyOn(careOperationsApi, 'transitionCareTask')
      .mockResolvedValue({ ok: true, task: { ...task, status: 'ACKNOWLEDGED' }, message: '' });

    renderPageWithRouter(<FullJourneyOperatingPage view="handoffs" />);

    expect(await screen.findByText(/reassessment due for jane doe/i)).toBeInTheDocument();
    expect(screen.getByText(/1 item overdue/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /claim/i }));

    await waitFor(() => expect(transitionSpy).toHaveBeenCalledWith('care-task-1', 'ACKNOWLEDGED'));
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('shows an empty-inbox message when there is no outstanding work', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [],
      message: '',
    });

    renderPageWithRouter(<FullJourneyOperatingPage view="handoffs" />);

    expect(await screen.findByText(/inbox clear/i)).toBeInTheDocument();
  });
});

/**
 * Diagnostics Board honesty: diagnosticsCoordinationService.createDiagnosticOrder is real,
 * exported code, but nothing in the app ever calls it -- there is no clinician-facing way to
 * place a lab/imaging/ECG/pharmacy order, so this board can never show real data in
 * production. The empty state used to read "Orders appear here when created via the patient
 * care workflow", implying such a workflow exists -- it doesn't. Pinned here so this stays
 * honest rather than silently reverting to an implied-but-nonexistent workflow.
 */
describe('FullJourneyOperatingPage diagnostics view — Diagnostics Board honesty', () => {
  it('marks the board Planned and states plainly that order placement is not built, not that orders are simply absent', () => {
    renderPageWithRouter(<FullJourneyOperatingPage view="diagnostics" />);

    expect(screen.getByText(/diagnostics board/i)).toBeInTheDocument();
    expect(screen.getByText(/planned/i)).toBeInTheDocument();
    expect(
      screen.getByText(/order-based diagnostics tracking is not yet built/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/orders appear here when created via the patient care workflow/i)).not.toBeInTheDocument();
  });
});
