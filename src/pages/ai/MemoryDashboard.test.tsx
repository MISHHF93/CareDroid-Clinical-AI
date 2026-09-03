import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MemoryDashboard from './MemoryDashboard';
import { fetchMemoryDashboard } from '../../services/memoryApi';

vi.mock('../../services/memoryApi', () => ({
  fetchMemoryDashboard: vi.fn(),
}));

// Regression coverage for the 2026-08-27 fix: the real GET /memory/dashboard
// response shapes each activity item as { title, occurredAt } and each saved
// workflow as a raw LongMemoryEntry ({ title }, no status field) --
// MemoryDashboard.tsx only ever read label/detail/time/status, field names
// that exist ONLY on the local demo fallback data. Every real (non-demo)
// load rendered a blank bold line and the generic "Recent session" subtitle.
describe('MemoryDashboard real API data', () => {
  it('renders the real title/occurredAt fields for recent activity, not a blank label', async () => {
    vi.mocked(fetchMemoryDashboard).mockResolvedValue({
      ok: true,
      data: {
        recentActivity: [
          {
            id: 'short-term:evt-1',
            source: 'short-term',
            type: 'tool-session',
            title: 'Real API activity title',
            occurredAt: '2026-08-27T10:00:00.000Z',
            metadata: {},
          },
        ],
        savedWorkflows: [
          { id: 'wf-1', title: 'Real API saved workflow title', tags: ['workflow'] },
        ],
      },
    } as never);

    render(
      <MemoryRouter>
        <MemoryDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Real API activity title')).toBeInTheDocument());
    expect(screen.getByText('Real API saved workflow title')).toBeInTheDocument();
    // The subtitle must show a real derived value (a formatted timestamp),
    // not fall through to the generic placeholder while real data exists.
    expect(screen.queryByText('Recent session')).not.toBeInTheDocument();
  });

  it('still renders the demo fallback data correctly when the API returns nothing', async () => {
    vi.mocked(fetchMemoryDashboard).mockResolvedValue({
      ok: false,
      data: { recentActivity: [], savedWorkflows: [] },
    } as never);

    render(
      <MemoryRouter>
        <MemoryDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('qSOFA calculator session')).toBeInTheDocument());
    expect(screen.getByText('Sepsis risk context')).toBeInTheDocument();
    expect(screen.getByText('saved')).toBeInTheDocument();
  });
});
