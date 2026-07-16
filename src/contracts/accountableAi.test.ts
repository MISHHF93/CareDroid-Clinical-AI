import { describe, expect, it } from 'vitest';
import {
  createAccountableRecommendation,
  createAiUnavailableAbstention,
  isAccountableAssistSafe,
} from './accountableAi';

describe('accountableAi contract', () => {
  it('builds an ok recommendation with evidence and model metadata', () => {
    const rec = createAccountableRecommendation({
      content: 'Consider sepsis bundle if qSOFA ≥ 2',
      evidence: [
        {
          sourceId: 'sepsis-hour-1',
          citation: 'Sepsis Hour-1 Bundle',
          score: 0.91,
        },
      ],
      confidence: 0.82,
      model: { provider: 'offline', name: 'hash-assist', version: '1' },
      promptVersion: 'clinical-query@3',
      corpusVersion: 2,
    });

    expect(rec.safety.status).toBe('ok');
    expect(rec.humanReviewRequired).toBe(false);
    expect(rec.confidence).toBe(0.82);
    expect(rec.evidence).toHaveLength(1);
    expect(rec.model.provider).toBe('offline');
    expect(rec.promptVersion).toBe('clinical-query@3');
    expect(rec.provenance.corpusVersion).toBe(2);
    expect(isAccountableAssistSafe(rec)).toBe(true);
  });

  it('forces human review and null confidence on abstain', () => {
    const rec = createAccountableRecommendation({
      content: '',
      model: { provider: 'groq', name: 'demo' },
      promptVersion: 'p1',
      safetyStatus: 'abstain',
      safetyReasons: ['prompt_injection_detected'],
    });
    expect(rec.humanReviewRequired).toBe(true);
    expect(rec.confidence).toBeNull();
    expect(isAccountableAssistSafe(rec)).toBe(false);
  });

  it('createAiUnavailableAbstention never fabricates clinical content as ok', () => {
    const rec = createAiUnavailableAbstention({
      reason: 'circuit_open',
      provider: 'groq',
    });
    expect(rec.safety.status).toBe('abstain');
    expect(rec.safety.reasons).toContain('AI_UNAVAILABLE');
    expect(rec.humanReviewRequired).toBe(true);
    expect(isAccountableAssistSafe(rec)).toBe(false);
    expect(rec.content).toMatch(/unavailable/i);
  });

  it('clamps confidence to 0..1', () => {
    const high = createAccountableRecommendation({
      content: 'x',
      confidence: 1.5,
      model: { provider: 'x', name: 'y' },
      promptVersion: '1',
    });
    const low = createAccountableRecommendation({
      content: 'x',
      confidence: -0.2,
      model: { provider: 'x', name: 'y' },
      promptVersion: '1',
    });
    expect(high.confidence).toBe(1);
    expect(low.confidence).toBe(0);
  });
});
