import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: () => 'Request failed',
}));

import { apiFetchJson } from './apiClient';
import { submitAiFeedback } from './aiFeedbackApi';

describe('aiFeedbackApi', () => {
  beforeEach(() => {
    vi.mocked(apiFetchJson).mockReset();
  });

  it('submits feedback with runId, rating, and an optional comment', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: { id: 'ai-feedback-1', createdAt: '2026-08-20T00:00:00.000Z' },
    });

    const result = await submitAiFeedback({
      runId: 'run-1',
      capabilityId: 'clinical-chat',
      rating: 'UNSAFE_CONCERN',
      comment: 'Suggested a dosage without checking allergies.',
    });

    expect(apiFetchJson).toHaveBeenCalledWith(
      '/api/ai-feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          runId: 'run-1',
          capabilityId: 'clinical-chat',
          rating: 'UNSAFE_CONCERN',
          comment: 'Suggested a dosage without checking allergies.',
        }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('degrades gracefully (does not throw) when the backend rejects the submission', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false } as Response,
      data: { error: 'Not authorized' },
    });

    const result = await submitAiFeedback({ runId: 'run-1', rating: 'HELPFUL' });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Not authorized');
  });
});
