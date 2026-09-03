import { describe, expect, it, vi } from 'vitest';
import { notifyWorkflowHandoffComplete } from './workflowNavigationFeedback';

vi.mock('./careDroidInteractionFeedback', () => ({
  showActionFeedback: vi.fn(() => 'toast-1'),
  showActionSuccess: vi.fn(() => 'toast-2'),
}));

describe('workflowNavigationFeedback', () => {
  it('offers one-click navigation when next route is provided', async () => {
    const { showActionFeedback } = await import('./careDroidInteractionFeedback');
    const onNavigate = vi.fn();

    notifyWorkflowHandoffComplete({
      patientName: 'Sam Lee',
      nextRoute: '/emergency/queues?patient=p1',
      onNavigate,
    });

    expect(showActionFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'success',
        title: 'Sam Lee routed',
        actionLabel: 'Continue to triage',
      }),
    );

    const call = vi.mocked(showActionFeedback).mock.calls[0]?.[0];
    call?.onAction?.();
    expect(onNavigate).toHaveBeenCalledWith('/emergency/queues?patient=p1');
  });
});
