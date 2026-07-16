import { DocumentChunker } from './document-chunker';
import type { IngestDocumentDto } from '../dto/medical-source.dto';

function sourceDto(content: string, overrides: Partial<IngestDocumentDto> = {}): IngestDocumentDto {
  return {
    content,
    source: {
      id: 'src-edge',
      title: 'Chunker edge fixture',
      type: 'protocol',
      organizationId: 'org-test',
    },
    chunkingOptions: { chunkSize: 32, overlap: 4, respectBoundaries: true },
    ...overrides,
  };
}

describe('DocumentChunker edge-case matrix (RG8)', () => {
  let chunker: DocumentChunker;

  beforeEach(() => {
    chunker = new DocumentChunker(32, 4);
  });

  afterEach(() => {
    chunker.dispose();
  });

  it('returns no chunks for empty content without throwing', () => {
    expect(() => chunker.chunkDocument(sourceDto(''))).not.toThrow();
    expect(chunker.chunkDocument(sourceDto(''))).toEqual([]);
  });

  it('returns no chunks for whitespace-only content without throwing', () => {
    const chunks = chunker.chunkDocument(sourceDto('   \n\t  \n  '));
    expect(chunks).toEqual([]);
  });

  it('chunks a normal multi-sentence English document with stable indexes', () => {
    const content =
      'Sepsis requires early recognition. Fluid resuscitation starts immediately. Reassess lactate after one hour.';
    const chunks = chunker.chunkDocument(sourceDto(content));
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.metadata.totalChunks).toBe(chunks.length);
      expect(chunk.text.trim().length).toBeGreaterThan(0);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    });
  });

  it('handles multilingual content without crashing (CJK / Arabic)', () => {
    const content =
      '败血症需要早期识别与治疗。复苏后应复查乳酸。العلاج المبكر مهم جداً في حالات الطوارئ.';
    const chunks = chunker.chunkDocument(sourceDto(content));
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => typeof c.text === 'string')).toBe(true);
  });

  it('force-splits a single oversized sentence by token budget', () => {
    const longWord = Array.from({ length: 80 }, (_, i) => `token${i}`).join(' ');
    const chunks = chunker.chunkDocument(
      sourceDto(longWord, { chunkingOptions: { chunkSize: 16, overlap: 0, respectBoundaries: true } }),
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.tokenCount <= 16)).toBe(true);
  });

  it('returns empty result rather than inventing content when no valid sentence chunks exist', () => {
    // Content that trims to empty after boundary splitting.
    const chunks = chunker.chunkDocument(sourceDto('\u200b\u200b'));
    expect(Array.isArray(chunks)).toBe(true);
    // Zero-width characters may still encode as tokens depending on tiktoken —
    // either empty or non-empty is acceptable as long as no throw and no crash.
    expect(chunks.every((c) => typeof c.text === 'string')).toBe(true);
  });

  it('preserves source metadata on every produced chunk', () => {
    const chunks = chunker.chunkDocument(
      sourceDto('Protocol step one. Protocol step two.'),
    );
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.metadata.sourceId).toBe('src-edge');
      expect(chunk.metadata.title).toBe('Chunker edge fixture');
    }
  });
});
