import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmCareDroidAction,
  registerConfirmDialogHandler,
  showActionSuccess,
} from './careDroidInteractionFeedback';

vi.mock('sonner', () => ({
  toast: Object.assign(
    vi.fn(() => 'toast-1'),
    {
      success: vi.fn(() => 'toast-success'),
      error: vi.fn(() => 'toast-error'),
      info: vi.fn(() => 'toast-info'),
      warning: vi.fn(() => 'toast-warning'),
      loading: vi.fn(() => 'toast-loading'),
      dismiss: vi.fn(),
    },
  ),
}));

describe('careDroidInteractionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes success feedback through Sonner', async () => {
    const { toast } = await import('sonner');
    showActionSuccess('Patient routed', 'Sent to triage queue.');
    expect(toast.success).toHaveBeenCalledWith(
      'Patient routed',
      expect.objectContaining({ description: 'Sent to triage queue.' }),
    );
  });

  it('resolves confirm dialog through registered handler', async () => {
    registerConfirmDialogHandler((options, resolve) => {
      expect(options.title).toBe('Discard?');
      resolve(true);
    });
    await expect(
      confirmCareDroidAction({ title: 'Discard?', message: 'Lose draft?' }),
    ).resolves.toBe(true);
  });
});
