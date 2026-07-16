import { RetrievedChunk } from './dto/rag-context.dto';
import { CohereRankerService } from './reranking/cohere-ranker.service';
import { RerankingService } from './reranking.service';

describe('RerankingService', () => {
  const chunks: RetrievedChunk[] = [
    {
      id: 'chunk-1',
      text: 'Sepsis fluid resuscitation guidance',
      score: 0.72,
      metadata: {
        sourceId: 'source-1',
        title: 'Sepsis guideline',
        type: 'clinical_guideline',
      },
    },
    {
      id: 'chunk-2',
      text: 'Antibiotic timing guidance',
      score: 0.65,
      metadata: {
        sourceId: 'source-2',
        title: 'Antibiotic guideline',
        type: 'clinical_guideline',
      },
    },
  ];

  const buildService = () => {
    const rerank = jest.fn<
      ReturnType<CohereRankerService['rerank']>,
      Parameters<CohereRankerService['rerank']>
    >();
    const isEnabled = jest.fn<
      ReturnType<CohereRankerService['isEnabled']>,
      Parameters<CohereRankerService['isEnabled']>
    >();
    const healthCheck = jest.fn<
      ReturnType<CohereRankerService['healthCheck']>,
      Parameters<CohereRankerService['healthCheck']>
    >();
    const ranker = { rerank, isEnabled, healthCheck } as unknown as CohereRankerService;

    return {
      service: new RerankingService(ranker),
      rerank,
      isEnabled,
      healthCheck,
    };
  };

  it('returns a bounded copy without invoking the ranker when disabled', async () => {
    const { service, rerank } = buildService();

    await expect(service.rerank('sepsis', chunks, 1, false)).resolves.toEqual([chunks[0]]);
    expect(rerank).not.toHaveBeenCalled();
  });

  it('does not invoke the ranker for an empty retrieval result', async () => {
    const { service, rerank } = buildService();

    await expect(service.rerank('sepsis', [], 3)).resolves.toEqual([]);
    expect(rerank).not.toHaveBeenCalled();
  });

  it('delegates enabled reranking and health state to the configured ranker', async () => {
    const { service, rerank, isEnabled, healthCheck } = buildService();
    const reranked = [chunks[1], chunks[0]];
    rerank.mockResolvedValue(reranked);
    isEnabled.mockReturnValue(true);
    healthCheck.mockResolvedValue(true);

    await expect(service.rerank('antibiotic timing', chunks, 2)).resolves.toBe(reranked);
    expect(rerank).toHaveBeenCalledWith('antibiotic timing', chunks, 2);
    expect(service.isEnabled()).toBe(true);
    await expect(service.healthCheck()).resolves.toBe(true);
  });
});
