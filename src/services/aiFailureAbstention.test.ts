import { describe, expect, it } from 'vitest';
import { abstainFromAiFailure, shouldContinueWithoutAi } from './aiFailureAbstention';

describe('aiFailureAbstention', () => {
  it('converts provider outage into abstain recommendation', () => {
    const rec = abstainFromAiFailure(
      { status: 503, message: 'Groq circuit open' },
      { provider: 'groq', promptVersion: 'demo@1' },
    );
    expect(rec.safety.status).toBe('abstain');
    expect(rec.humanReviewRequired).toBe(true);
    expect(shouldContinueWithoutAi(rec)).toBe(true);
    expect(rec.model.provider).toBe('groq');
    expect(rec.content).toMatch(/unavailable/i);
  });

  it('never marks network failure as ok assist', () => {
    const rec = abstainFromAiFailure({ message: 'Failed to fetch' });
    expect(rec.safety.status).toBe('abstain');
    expect(rec.safety.reasons).toContain('AI_UNAVAILABLE');
  });
});
