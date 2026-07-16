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

  it('prefers canonical unifiedAiEnvelope when present (Reception Copilot path)', () => {
    const rec = accountableFromGatewayPayload({
      content: 'legacy',
      unifiedAiEnvelope: {
        requestId: 'req-reception-1',
        correlationId: 'corr-1',
        status: 'needs_human_review',
        responseType: 'answer',
        content: 'Collect insurance card and next of kin before triage handoff.',
        evidence: [{ id: 'policy-1', title: 'Reception checklist' }],
        citations: [],
        confidence: 0.62,
        uncertainty: ['Heuristic intake assist only'],
        missingInformation: ['insurance', 'next of kin'],
        limitations: ['Decision support only'],
        toolExecutions: [],
        model: { provider: 'local', model: 'careDroidAI-node-v1', promptVersion: '1.0.0' },
        safety: {
          allowed: true,
          requiresHumanReview: true,
          reasons: ['clinician_review_required'],
          disclaimer: 'Human review required.',
        },
        humanReview: { status: 'pending', reviewType: 'clinical_ai', severity: 'high' },
        createdAt: new Date().toISOString(),
      },
    });
    expect(rec.content).toMatch(/insurance/i);
    expect(rec.humanReviewRequired).toBe(true);
    expect(rec.provenance.requestId).toBe('req-reception-1');
    expect(rec.model.name).toBe('careDroidAI-node-v1');
    expect(rec.evidence[0]?.citation).toMatch(/Reception checklist/i);
  });
});

