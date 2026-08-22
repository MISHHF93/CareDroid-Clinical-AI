import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../test/testRenderUtils';
import CareOperationsInboxPanel from './CareOperationsInboxPanel';
import * as careOperationsApi from '../../services/careOperationsApi';
import * as surfaceViewsApi from '../../services/surfaceViewsApi';
import type { CareTask } from '../../services/careOperationsApi';

function task(overrides: Partial<CareTask> = {}): CareTask {
  return {
    id: 'care-task-1',
    taskType: 'ems_handoff_pending',
    status: 'OPEN',
    priority: 'Warning',
    reason: 'EMS handoff pending -- Unit 12',
    sourceEvent: 'ems.handoff.pending.scan',
    isOverdue: false,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * Item 6 -- change-since-last-view, applied to the Care Operations Inbox
 * (the panel already reused on both Handoffs and Shift Summary). Proves the
 * panel actually marks tasks created after the caller's own previous visit
 * as new, rather than just recording the visit with nothing consuming it.
 */
describe('CareOperationsInboxPanel — change since last view', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks a task created after the previous visit as NEW and shows a count banner', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [task({ createdAt: '2026-08-20T12:30:00.000Z' })],
      message: '',
    });
    vi.spyOn(surfaceViewsApi, 'touchSurfaceView').mockResolvedValue({
      ok: true,
      previousViewedAt: '2026-08-20T12:00:00.000Z',
    });

    renderWithRouter(<CareOperationsInboxPanel />);

    expect(await screen.findByText('NEW')).toBeInTheDocument();
    expect(await screen.findByText(/1 new since you last checked/i)).toBeInTheDocument();
  });

  it('does not mark a task created before the previous visit as NEW', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [task({ createdAt: '2026-08-20T11:00:00.000Z' })],
      message: '',
    });
    vi.spyOn(surfaceViewsApi, 'touchSurfaceView').mockResolvedValue({
      ok: true,
      previousViewedAt: '2026-08-20T12:00:00.000Z',
    });

    renderWithRouter(<CareOperationsInboxPanel />);

    await screen.findByText(/unit 12/i);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('shows nothing as NEW on a user’s very first visit (previousViewedAt is null)', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [task()],
      message: '',
    });
    vi.spyOn(surfaceViewsApi, 'touchSurfaceView').mockResolvedValue({
      ok: true,
      previousViewedAt: null,
    });

    renderWithRouter(<CareOperationsInboxPanel />);

    await screen.findByText(/unit 12/i);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('shows nothing as NEW if the view-tracking call itself fails (degrades safely)', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [task({ createdAt: '2026-08-20T12:59:00.000Z' })],
      message: '',
    });
    vi.spyOn(surfaceViewsApi, 'touchSurfaceView').mockResolvedValue({
      ok: false,
      previousViewedAt: null,
    });

    renderWithRouter(<CareOperationsInboxPanel />);

    await screen.findByText(/unit 12/i);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('records the view exactly once per mount, against the panel’s surfaceKey', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [],
      message: '',
    });
    const touchSpy = vi
      .spyOn(surfaceViewsApi, 'touchSurfaceView')
      .mockResolvedValue({ ok: true, previousViewedAt: null });

    renderWithRouter(<CareOperationsInboxPanel surfaceKey="shift-summary-handover" />);

    await screen.findByText(/inbox clear/i);
    expect(touchSpy).toHaveBeenCalledTimes(1);
    expect(touchSpy).toHaveBeenCalledWith('shift-summary-handover');
  });
});
