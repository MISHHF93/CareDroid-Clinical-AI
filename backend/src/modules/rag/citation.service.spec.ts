import { CitationService } from './citation.service';
import { RetrievedChunk } from './dto/rag-context.dto';

describe('CitationService', () => {
  const service = new CitationService();

  const chunks: RetrievedChunk[] = [
    {
      id: 'guideline-1',
      text: 'Use early broad-spectrum antibiotics in sepsis.',
      score: 0.91,
      metadata: {
        sourceId: 'sepsis-guideline',
        title: 'Surviving Sepsis Guideline',
        type: 'clinical_guideline',
        organization: 'SCCM',
        date: '2024-01-15',
        lastUpdated: '2024-02-01T12:00:00.000Z',
        specialty: 'critical care',
        tags: ['sepsis', 'antibiotics'],
        metadata: { section: 'initial-management' },
      },
    },
    {
      id: 'guideline-2',
      text: 'Measure lactate and reassess perfusion.',
      score: 0.83,
      metadata: {
        sourceId: 'sepsis-guideline',
        title: 'Surviving Sepsis Guideline',
        type: 'clinical_guideline',
        organization: 'SCCM',
      },
    },
    {
      id: 'calculator-1',
      text: 'SOFA metadata includes respiratory, coagulation, liver, cardiovascular, CNS, and renal inputs.',
      score: 0.77,
      metadata: {
        sourceId: 'sofa-calculator',
        title: 'SOFA Calculator Metadata',
        type: 'calculator_metadata',
        timestamp: '2026-01-01T09:00:00.000Z',
        metadata: { toolId: 'sofa-calculator' },
      },
    },
  ];

  it('extracts unique sources from retrieved chunks', () => {
    const sources = service.extractSources(chunks);

    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({
      id: 'sepsis-guideline',
      title: 'Surviving Sepsis Guideline',
      type: 'clinical_guideline',
      organization: 'SCCM',
    });
    expect(sources[1]).toMatchObject({
      id: 'sofa-calculator',
      type: 'calculator_metadata',
      metadata: { toolId: 'sofa-calculator' },
    });
  });

  it('builds source-panel references with relevance, timestamps, and metadata', () => {
    const sources = service.extractSources(chunks);
    const references = service.buildReferences(chunks, sources);

    expect(references).toHaveLength(2);
    expect(references[0]).toMatchObject({
      sourceId: 'sepsis-guideline',
      citationLabel: '[1]',
      relevance: 0.91,
      topScore: 0.91,
      chunkCount: 2,
      timestamp: '2024-02-01T12:00:00.000Z',
      metadata: { section: 'initial-management' },
    });
    expect(references[0].chunkIds).toEqual(['guideline-1', 'guideline-2']);
    expect(references[0].excerpts[0]).toContain('early broad-spectrum antibiotics');

    expect(references[1]).toMatchObject({
      sourceId: 'sofa-calculator',
      type: 'calculator_metadata',
      relevance: 0.77,
      timestamp: '2026-01-01T09:00:00.000Z',
      metadata: { toolId: 'sofa-calculator' },
    });
  });

  it('keeps citations ready for assistant source panels', () => {
    const sources = service.extractSources(chunks);
    const references = service.buildReferences(chunks, sources);

    const panel = {
      citations: sources,
      references,
      confidence: 0.86,
      generatedAt: '2026-05-26T18:00:00.000Z',
      timestamps: {
        generatedAt: '2026-05-26T18:00:00.000Z',
        retrievedAt: '2026-05-26T18:00:00.000Z',
        latestSourceTimestamp: references[1].timestamp,
      },
    };

    expect(panel.citations[0]).toMatchObject({
      id: 'sepsis-guideline',
      title: 'Surviving Sepsis Guideline',
    });
    expect(panel.references[0]).toMatchObject({
      citationLabel: '[1]',
      timestamp: '2024-02-01T12:00:00.000Z',
    });
    expect(panel.timestamps.latestSourceTimestamp).toBe('2026-01-01T09:00:00.000Z');
  });
});
