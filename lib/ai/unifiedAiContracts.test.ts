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
});
