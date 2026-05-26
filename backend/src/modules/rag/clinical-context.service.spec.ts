import { ConfigService } from '@nestjs/config';
import { ClinicalContextService } from './clinical-context.service';
import { MedicalSource } from './dto/medical-source.dto';
import { RAGReference, RetrievedChunk } from './dto/rag-context.dto';

describe('ClinicalContextService', () => {
  const service = new ClinicalContextService({
    get: jest.fn().mockReturnValue({ retrieval: { maxTokens: 500 } }),
  } as unknown as ConfigService);

  it('builds an assistant source panel with citations, confidence, timestamps, references, and cache state', () => {
    const chunks: RetrievedChunk[] = [
      {
        id: 'chunk-1',
        text: 'Guideline text',
        score: 0.9,
        metadata: {
          sourceId: 'guideline-1',
          title: 'Guideline',
          type: 'clinical_guideline',
        },
      },
    ];
    const sources: MedicalSource[] = [
      {
        id: 'guideline-1',
        title: 'Guideline',
        type: 'clinical_guideline',
        lastUpdated: '2026-05-25T10:00:00.000Z',
      },
    ];
    const references: RAGReference[] = [
      {
        id: 'ref-guideline-1',
        sourceId: 'guideline-1',
        citationLabel: '[1]',
        title: 'Guideline',
        type: 'clinical_guideline',
        timestamp: '2026-05-25T10:00:00.000Z',
        relevance: 0.9,
        topScore: 0.9,
        chunkCount: 1,
        chunkIds: ['chunk-1'],
        excerpts: ['Guideline text'],
      },
    ];

    const context = service.buildContext({
      query: 'sepsis guideline',
      chunks,
      sources,
      references,
      totalRetrieved: 1,
      latencyMs: 12,
      retrievalCacheHit: true,
    });

    expect(context.sourcePanel).toMatchObject({
      citations: sources,
      references,
      confidence: 0.9,
      cache: { retrievalCacheHit: true },
      retrieval: {
        query: 'sepsis guideline',
        chunksRetrieved: 1,
        sourcesFound: 1,
        totalRetrieved: 1,
        latencyMs: 12,
      },
    });
    expect(context.sourcePanel?.timestamps.generatedAt).toBeTruthy();
    expect(context.sourcePanel?.timestamps.retrievedAt).toBeTruthy();
    expect(context.sourcePanel?.timestamps.latestSourceTimestamp).toBe('2026-05-25T10:00:00.000Z');
  });
});
