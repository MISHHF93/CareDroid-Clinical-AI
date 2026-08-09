import { describe, expect, it } from 'vitest';
import {
  buildBlockedUnifiedResponse,
  mapHeuristicNodeToUnifiedResponse,
  validateUnifiedAiRequest,
} from './unifiedAiContracts';

describe('unifiedAiContracts', () => {
  const validRequest = {
    requestId: 'req-1',
    correlationId: 'corr-1',
    organizationId: 'org-1',
    userId: 'user-1',
    role: 'reception',
    permissions: ['use_ai_chat'],
    channel: 'reception',
    task: 'answer_question',
    query: 'What documents are missing for this arrival?',
    responseFormat: 'structured',
  };

  it('accepts a well-formed unified AI request', () => {
    const result = validateUnifiedAiRequest(validRequest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.request?.task).toBe('answer_question');
  });

  it('rejects malformed, unauthorized-shape, and oversized requests', () => {
    expect(validateUnifiedAiRequest(null).valid).toBe(false);
    expect(validateUnifiedAiRequest({ ...validRequest, channel: 'invalid' }).valid).toBe(false);
    expect(validateUnifiedAiRequest({ ...validRequest, task: 'hack' }).valid).toBe(false);
    expect(validateUnifiedAiRequest({ ...validRequest, permissions: 'all' }).valid).toBe(false);
    expect(
      validateUnifiedAiRequest({ ...validRequest, query: 'x'.repeat(16_001) }).valid,
    ).toBe(false);
  });

  it('builds a blocked safety response without empty success semantics', () => {
    const blocked = buildBlockedUnifiedResponse({
      requestId: 'req-2',
      correlationId: 'corr-2',
      reasons: ['matched unsafe autonomous action pattern'],
      disclaimer: 'Human review required.',
    });
    expect(blocked.status).toBe('blocked_by_safety');
    expect(blocked.safety.allowed).toBe(false);
    expect(blocked.toolExecutions).toEqual([]);
    expect(blocked.model.provider).toBe('none');
  });

  it('maps heuristic node success that requires clinician review', () => {
    const mapped = mapHeuristicNodeToUnifiedResponse({
      requestId: 'req-3',
      correlationId: 'corr-3',
      intent: 'triage_recommendation',
      status: 'success',
      content: 'Escalate for nurse review',
      confidence: 0.72,
      requiresClinicianReview: true,
      model: 'careDroidAI-node-v1',
      latencyMs: 12,
      humanReview: { status: 'created', reviewItemId: 'review-1' },
    });
    expect(mapped.status).toBe('needs_human_review');
    expect(mapped.safety.requiresHumanReview).toBe(true);
    expect(mapped.humanReview?.reviewItemId).toBe('review-1');
  });

  /**
   * Regression coverage for a real bug found by a repository-wide domain-
   * model audit (2026-08-08): this function used to hardcode `evidence: []`
   * unconditionally, and CareDroidUnifiedAIResponse had no responseSource
   * field at all -- silently discarding real provenance (evidence,
   * responseSource) that the underlying CareDroidAIResponse node carried,
   * for every /api/ai/unified consumer.
   */
  it('carries real provenance (evidence, responseSource) through instead of discarding it', () => {
    const mapped = mapHeuristicNodeToUnifiedResponse({
      requestId: 'req-4',
      correlationId: 'corr-4',
      intent: 'triage_recommendation',
      status: 'success',
      content: 'Recommend CTAS 2',
      requiresClinicianReview: true,
      model: 'careDroidAI-node-v1',
      responseSource: 'DETERMINISTIC_RULE',
      evidence: [
        { id: 'ev-1', kind: 'structured_rule', title: 'CTAS calculator', score: 0.9 },
      ],
    });
    expect(mapped.responseSource).toBe('DETERMINISTIC_RULE');
    expect(mapped.evidence).toEqual([
      {
        id: 'ev-1',
        title: 'CTAS calculator',
        sourceType: 'structured_rule',
        url: undefined,
        snippet: undefined,
        score: 0.9,
      },
    ]);
  });

  it('still defaults evidence to [] and responseSource to undefined when the caller provides neither (no fabrication)', () => {
    const mapped = mapHeuristicNodeToUnifiedResponse({
      requestId: 'req-5',
      correlationId: 'corr-5',
      intent: 'triage_recommendation',
      status: 'success',
      content: 'No provenance available',
      requiresClinicianReview: false,
      model: 'careDroidAI-node-v1',
    });
    expect(mapped.evidence).toEqual([]);
    expect(mapped.responseSource).toBeUndefined();
  });
});
