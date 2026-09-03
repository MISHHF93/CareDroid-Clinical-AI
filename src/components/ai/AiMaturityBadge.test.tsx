import { describe, expect, it } from 'vitest';
import { inferAiMaturity } from './AiMaturityBadge';

describe('inferAiMaturity', () => {
  it('labels careDroid heuristic engine', () => {
    expect(inferAiMaturity({ modelOrEngine: 'careDroidAI-heuristic-node' })).toBe('heuristic');
  });

  it('labels seed and degraded modes', () => {
    expect(inferAiMaturity({ seedOnly: true })).toBe('seed');
    expect(inferAiMaturity({ degraded: true })).toBe('degraded');
    expect(inferAiMaturity({ modelOrEngine: 'local-deterministic-v1' })).toBe('degraded');
  });

  it('labels RAG-grounded evidence', () => {
    expect(inferAiMaturity({ evidenceKinds: ['retrieved_chunk', 'knowledge_registry'] })).toBe(
      'rag-grounded',
    );
  });
});
