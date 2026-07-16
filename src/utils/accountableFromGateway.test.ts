import { describe, expect, it } from 'vitest';
import { accountableFromGatewayPayload } from './accountableFromGateway';

describe('accountableFromGatewayPayload', () => {
  it('reads nested accountableRecommendation from gateway shape', () => {
    const rec = accountableFromGatewayPayload({
      accountableRecommendation: {
        content: 'Check lactate',
        evidence: [{ sourceId: 's1', citation: 'Sepsis bundle', score: 0.88 }],
        confidence: 0.8,
        uncertainty: 'Limited vitals',
        model: { provider: 'caredroid', name: 'gateway', version: 'r1' },
        promptVersion: 'ai-gateway@1',
        safety: { status: 'ok', reasons: [] },
        humanReviewRequired: true,
        provenance: { retrievedAt: new Date().toISOString(), corpusVersion: 3 },
      },
    });
    expect(rec.content).toMatch(/lactate/i);
    expect(rec.evidence).toHaveLength(1);
    expect(rec.promptVersion).toBe('ai-gateway@1');
    expect(rec.provenance.corpusVersion).toBe(3);
  });

  it('degrades unstructured payloads instead of pretending full provenance', () => {
    const rec = accountableFromGatewayPayload({ answer: 'Maybe fluids', confidence: 0.7 });
    expect(rec.safety.status).toBe('degraded');
    expect(rec.safety.reasons).toContain('missing_accountable_envelope');
    expect(rec.humanReviewRequired).toBe(true);
  });

  it('abstains on empty payload', () => {
    const rec = accountableFromGatewayPayload({});
    expect(rec.safety.status).toBe('abstain');
  });
});
