import { get_encoding } from 'tiktoken';
import { DocumentChunk, IngestDocumentDto } from '../dto/medical-source.dto';

/**
 * Document Chunker
 *
 * Splits documents into overlapping chunks for optimal RAG retrieval.
 * Uses tiktoken for stable token counting during local RAG chunking.
 */

export class DocumentChunker {
  private encoder: any;
  private readonly chunkSize: number;
  private readonly overlap: number;

  constructor(chunkSize: number = 512, overlap: number = 50) {
    this.encoder = get_encoding('cl100k_base');
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  /**
   * Count tokens in a text string
   */
  countTokens(text: string): number {
    // Coerce to string — callers (and tiktoken decode round-trips) can hand back
    // Uint8Array/Buffer under some WASM builds; encode() requires a JS string.
    return this.encoder.encode(this.asText(text)).length;
  }

  /**
   * Normalize tiktoken encode/decode I/O to a JS string.
   */
  private asText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    if (value instanceof Uint8Array) {
      return new TextDecoder('utf-8', { fatal: false }).decode(value);
    }
    if (ArrayBuffer.isView(value)) {
      return new TextDecoder('utf-8', { fatal: false }).decode(
        new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      );
    }
    return String(value);
  }

  /**
   * Split document into chunks with overlap
   */
  chunkDocument(dto: IngestDocumentDto): DocumentChunk[] {
    const { content, source, chunkingOptions = {} } = dto;

    const chunkSize = chunkingOptions.chunkSize || this.chunkSize;
    const overlap = chunkingOptions.overlap || this.overlap;
    const respectBoundaries = chunkingOptions.respectBoundaries ?? true;

    // Split into sentences for boundary-aware chunking
    const sentences = this.splitIntoSentences(content);

    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;
    let charPosition = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.countTokens(sentence);

      // If single sentence exceeds chunk size, split it forcefully
      if (sentenceTokens > chunkSize) {
        // Save current chunk if not empty
        if (currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ');
          chunks.push(
            this.createChunk(
              chunkText,
              charPosition,
              charPosition + chunkText.length,
              chunkIndex++,
              currentTokenCount,
              source,
              Math.ceil(content.length / chunkSize), // Estimate total chunks
            ),
          );
          charPosition += chunkText.length + 1;
        }

        // Split large sentence by tokens
        const largeSentenceChunks = this.splitLargeSentence(sentence, chunkSize);
        for (const largeSentenceChunk of largeSentenceChunks) {
          const chunkText = largeSentenceChunk;
          const tokenCount = this.countTokens(chunkText);
          chunks.push(
            this.createChunk(
              chunkText,
              charPosition,
              charPosition + chunkText.length,
              chunkIndex++,
              tokenCount,
              source,
              Math.ceil(content.length / chunkSize),
            ),
          );
          charPosition += chunkText.length + 1;
        }

        currentChunk = [];
        currentTokenCount = 0;
        continue;
      }

      // Check if adding this sentence would exceed chunk size
      if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        const chunkText = currentChunk.join(' ');
        chunks.push(
          this.createChunk(
            chunkText,
            charPosition,
            charPosition + chunkText.length,
            chunkIndex++,
            currentTokenCount,
            source,
            Math.ceil(content.length / chunkSize),
          ),
        );

        // Start new chunk with overlap
        if (overlap > 0 && respectBoundaries) {
          // Keep last few sentences for overlap
          const overlapSentences = this.getOverlapSentences(currentChunk, overlap);
          currentChunk = overlapSentences;
          currentTokenCount = this.countTokens(currentChunk.join(' '));
        } else {
          currentChunk = [];
          currentTokenCount = 0;
        }

        charPosition += chunkText.length + 1;
      }

      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentTokenCount += sentenceTokens;
    }

    // Save final chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      chunks.push(
        this.createChunk(
          chunkText,
          charPosition,
          charPosition + chunkText.length,
          chunkIndex,
          currentTokenCount,
          source,
          chunkIndex + 1, // Total chunks is now known
        ),
      );
    }

    // Update totalChunks for all chunks
    const totalChunks = chunks.length;
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = totalChunks;
    });

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries (. ! ?) followed by space and capital letter
    // This regex preserves the punctuation
    const sentencePattern = /([.!?])\s+(?=[A-Z])/g;
    const sentences: string[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = sentencePattern.exec(text)) !== null) {
      sentences.push(text.slice(lastIndex, match.index + 1).trim());
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text as final sentence
    if (lastIndex < text.length) {
      sentences.push(text.slice(lastIndex).trim());
    }

    return sentences.filter((s) => s.length > 0);
  }

  /**
   * Split a large sentence that exceeds chunk size
   */
  private splitLargeSentence(sentence: string, chunkSize: number): string[] {
    const tokens = this.encoder.encode(this.asText(sentence));
    const chunks: string[] = [];

    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunkTokens = tokens.slice(i, i + chunkSize);
      // tiktoken WASM decode may return string or Uint8Array depending on build.
      const chunkText = this.asText(this.encoder.decode(chunkTokens));
      if (chunkText.length > 0) {
        chunks.push(chunkText);
      }
    }

    return chunks;
  }

  /**
   * Get last N sentences for overlap
   */
  private getOverlapSentences(sentences: string[], overlapTokens: number): string[] {
    const overlap: string[] = [];
    let tokenCount = 0;

    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i];
      const sentenceTokens = this.countTokens(sentence);

      if (tokenCount + sentenceTokens > overlapTokens) {
        break;
      }

      overlap.unshift(sentence);
      tokenCount += sentenceTokens;
    }

    return overlap;
  }

  /**
   * Create a document chunk with metadata
   */
  private createChunk(
    text: string,
    startPos: number,
    endPos: number,
    chunkIndex: number,
    tokenCount: number,
    source: IngestDocumentDto['source'],
    totalChunks: number,
  ): DocumentChunk {
    return {
      text: text.trim(),
      startPos,
      endPos,
      chunkIndex,
      tokenCount,
      metadata: {
        sourceId: source.id,
        title: source.title,
        type: source.type,
        organization: source.organization,
        date: source.date,
        lastUpdated: source.lastUpdated,
        timestamp: source.timestamp,
        url: source.url,
        chunkIndex,
        totalChunks,
        specialty: source.specialty,
        tags: source.tags,
        metadata: source.metadata,
      },
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.encoder) {
      this.encoder.free();
    }
  }
}
