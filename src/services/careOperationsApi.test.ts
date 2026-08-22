import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: () => 'Request failed',
}));

import { apiFetchJson } from './apiClient';
import { fetchCareOperationsInbox, transitionCareTask } from './careOperationsApi';

describe('careOperationsApi', () => {
  beforeEach(() => {
    vi.mocked(apiFetchJson).mockReset();
  });

  it('fetchCareOperationsInbox returns the tasks array from the real envelope shape', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: {
        tasks: [
          {
            id: 'care-task-1',
            taskType: 'reassessment_due',
            status: 'OPEN',
            priority: 'Warning',
            reason: 'Reassessment due for Jane Doe',
            sourceEvent: 'reassessment.due.scan',
            isOverdue: true,
            createdAt: '2026-08-20T00:00:00.000Z',
            updatedAt: '2026-08-20T00:00:00.000Z',
          },
        ],
        generatedAt: '2026-08-20T00:00:00.000Z',
      },
    });

    const result = await fetchCareOperationsInbox();

    expect(apiFetchJson).toHaveBeenCalledWith('/api/emergency/care-operations/inbox', {});
    expect(result.ok).toBe(true);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe('care-task-1');
  });

  it('fetchCareOperationsInbox degrades to an empty list, not a throw, on a backend error', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false } as Response,
      data: { error: 'Not authorized' },
    });

    const result = await fetchCareOperationsInbox();

    expect(result.ok).toBe(false);
    expect(result.tasks).toEqual([]);
    expect(result.message).toBe('Not authorized');
  });

  it('fetchCareOperationsInbox degrades gracefully when apiFetchJson itself throws (network failure)', async () => {
    vi.mocked(apiFetchJson).mockRejectedValue(new Error('network down'));

    const result = await fetchCareOperationsInbox();

    expect(result.ok).toBe(false);
    expect(result.tasks).toEqual([]);
  });

  it('transitionCareTask PATCHes the correct path with the status body', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: { id: 'care-task-1', status: 'ACKNOWLEDGED' },
    });

    const result = await transitionCareTask('care-task-1', 'ACKNOWLEDGED');

    expect(apiFetchJson).toHaveBeenCalledWith(
      '/api/emergency/care-operations/inbox/care-task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACKNOWLEDGED' }),
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.task?.status).toBe('ACKNOWLEDGED');
  });
});
