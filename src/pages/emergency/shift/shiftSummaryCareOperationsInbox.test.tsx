import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import EmergencyShiftSummaryPage from './index';
import { renderPageWithRouter } from '../../../test/testRenderUtils';
import * as careOperationsApi from '../../../services/careOperationsApi';

/**
 * Item 5 (shift/handover continuity): the Shift Summary handover page now
 * reuses the same Care Operations Inbox the outgoing shift is working from
 * (src/components/emergency/CareOperationsInboxPanel.tsx), rather than a
 * separately maintained handover note. Proves it actually renders here, not
 * just on the Handoffs page.
 */
describe('EmergencyShiftSummaryPage — Care Operations Inbox handover section', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces the outstanding-work-for-handover panel with a real fetched task', async () => {
    vi.spyOn(careOperationsApi, 'fetchCareOperationsInbox').mockResolvedValue({
      ok: true,
      tasks: [
        {
          id: 'care-task-handover-1',
          taskType: 'ems_handoff_pending',
          status: 'OPEN',
          priority: 'Warning',
          ownerRole: 'triage_nurse',
          reason: 'EMS handoff pending -- Unit 12',
          sourceEvent: 'ems.handoff.pending.scan',
          deepLink: '/emergency/ems',
          isOverdue: false,
          createdAt: '2026-08-20T00:00:00.000Z',
          updatedAt: '2026-08-20T00:00:00.000Z',
        },
      ],
      message: '',
    });

    renderPageWithRouter(<EmergencyShiftSummaryPage />);

    expect(await screen.findByText(/outstanding work for handover/i)).toBeInTheDocument();
    expect(await screen.findByText(/ems handoff pending -- unit 12/i)).toBeInTheDocument();
  });
});
