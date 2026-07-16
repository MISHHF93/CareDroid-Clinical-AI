import { describe, expect, it } from 'vitest';
import { createStreamProgressController } from './streamProgress';

describe('streamProgress', () => {
  it('emits meaningful progress states and supports cancel', () => {
    const controller = createStreamProgressController({
      requestId: 'req-1',
      correlationId: 'corr-1',
    });
    expect(controller.getState()).toBe('validating_request');
    controller.advance('retrieving_evidence', undefined, 30);
    controller.advance('checking_safety', undefined, 60);
    const events: string[] = [];
    controller.subscribe((e) => events.push(e.state));
    controller.cancel();
    expect(controller.getState()).toBe('cancelled');
    expect(controller.getHistory().some((h) => h.state === 'cancelled')).toBe(true);
    expect(events).toContain('cancelled');
  });

  it('does not advance after terminal failure', () => {
    const controller = createStreamProgressController({
      requestId: 'req-2',
      correlationId: 'corr-2',
    });
    controller.fail('provider down');
    controller.advance('preparing_response');
    expect(controller.getState()).toBe('failed');
  });
});
