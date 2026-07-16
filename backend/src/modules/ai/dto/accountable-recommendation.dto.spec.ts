import { buildAccountableRecommendationDto } from './accountable-recommendation.dto';

describe('buildAccountableRecommendationDto', () => {
  it('marks abstain as human-review required with null confidence', () => {
    const dto = buildAccountableRecommendationDto({
      content: 'Unavailable',
      model: { provider: 'none', name: 'unavailable' },
      promptVersion: 'n/a',
      safetyStatus: 'abstain',
      safetyReasons: ['AI_UNAVAILABLE'],
    });
    expect(dto.humanReviewRequired).toBe(true);
    expect(dto.confidence).toBeNull();
    expect(dto.safety.status).toBe('abstain');
  });

  it('preserves evidence and model metadata for ok assists', () => {
    const dto = buildAccountableRecommendationDto({
      content: 'Check sepsis criteria',
      evidence: [{ sourceId: 's1', citation: 'Sepsis bundle', score: 0.9 }],
      confidence: 0.88,
      model: { provider: 'offline', name: 'hash', version: '1' },
      promptVersion: 'clinical@1',
      corpusVersion: 3,
      tenantId: 'org-a',
    });
    expect(dto.evidence).toHaveLength(1);
    expect(dto.model.provider).toBe('offline');
    expect(dto.provenance.tenantId).toBe('org-a');
    expect(dto.provenance.corpusVersion).toBe(3);
    expect(dto.humanReviewRequired).toBe(false);
  });
});
