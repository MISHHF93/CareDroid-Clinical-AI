import { Injectable } from '@nestjs/common';
import { MedicalSource } from './dto/medical-source.dto';
import { RAGReference, RetrievedChunk } from './dto/rag-context.dto';

@Injectable()
export class CitationService {
  extractSources(chunks: RetrievedChunk[]): MedicalSource[] {
    const sourceMap = new Map<string, MedicalSource>();

    for (const chunk of chunks) {
      const { metadata } = chunk;
      const sourceId = metadata.sourceId;
      if (!sourceId || sourceMap.has(sourceId)) {
        continue;
      }

      sourceMap.set(sourceId, {
        id: sourceId,
        title: metadata.title,
        type: metadata.type,
        organization: metadata.organization,
        date: metadata.date,
        lastUpdated: metadata.lastUpdated,
        timestamp: metadata.timestamp,
        url: metadata.url,
        specialty: metadata.specialty,
        tags: metadata.tags,
        metadata: metadata.metadata,
      });
    }

    return Array.from(sourceMap.values());
  }

  buildReferences(chunks: RetrievedChunk[], sources: MedicalSource[]): RAGReference[] {
    const chunksBySource = new Map<string, RetrievedChunk[]>();
    for (const chunk of chunks) {
      const sourceId = chunk.metadata.sourceId;
      if (!sourceId) {
        continue;
      }
      const group = chunksBySource.get(sourceId) || [];
      group.push(chunk);
      chunksBySource.set(sourceId, group);
    }

    return sources
      .map((source, index) => this.buildReference(source, chunksBySource.get(source.id) || [], index))
      .filter((reference): reference is RAGReference => Boolean(reference));
  }

  private buildReference(
    source: MedicalSource,
    chunks: RetrievedChunk[],
    index: number,
  ): RAGReference | null {
    if (!source || chunks.length === 0) {
      return null;
    }

    const sortedChunks = [...chunks].sort((a, b) => b.score - a.score);
    const topScore = this.clamp01(sortedChunks[0]?.score ?? 0);
    const metadata = sortedChunks[0]?.metadata;

    return {
      id: `ref-${source.id}`,
      sourceId: source.id,
      citationLabel: `[${index + 1}]`,
      title: source.title,
      type: source.type,
      organization: source.organization,
      authors: source.authors,
      date: source.date,
      lastUpdated: source.lastUpdated,
      timestamp: source.timestamp || source.lastUpdated || source.date || metadata?.timestamp,
      url: source.url,
      doi: source.doi,
      specialty: source.specialty,
      evidenceLevel: source.evidenceLevel,
      authoritative: source.authoritative,
      tags: source.tags,
      metadata: {
        ...metadata?.metadata,
        ...source.metadata,
      },
      relevance: topScore,
      topScore,
      chunkCount: chunks.length,
      chunkIds: sortedChunks.map((chunk) => chunk.id),
      excerpts: sortedChunks.slice(0, 2).map((chunk) => this.trimExcerpt(chunk.text)),
    };
  }

  private trimExcerpt(text: string): string {
    const normalized = String(text || '').trim().replace(/\s+/g, ' ');
    return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
  }

  private clamp01(score: number): number {
    return Math.min(Math.max(score, 0), 1);
  }
}
