import { Injectable } from '@nestjs/common';
import {
  annotateAnswerClaims,
  filterSupportedClaims,
  scoreClaimAgainstEvidence,
  type ClaimEntailmentResult,
  type ClaimInput,
  type EvidenceSpan,
} from '../../../../lib/rag/citationEntailment';
import { MedicalSource } from './dto/medical-source.dto';
import { RAGReference, RetrievedChunk } from './dto/rag-context.dto';

export interface GroundedAnswerResult {
  originalText: string;
  groundedText: string;
  claims: ClaimEntailmentResult[];
  strippedClaims: ClaimEntailmentResult[];
  unsupportedRate: number;
}

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
      .map((source, index) =>
        this.buildReference(source, chunksBySource.get(source.id) || [], index),
      )
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

  /**
   * Score free-text claims against retrieved chunk evidence (token-overlap entailment).
   */
  scoreClaims(
    claims: ClaimInput[],
    chunks: RetrievedChunk[],
    options?: { minScore?: number; requireCitationMatch?: boolean },
  ): { kept: ClaimEntailmentResult[]; stripped: ClaimEntailmentResult[] } {
    const evidence = this.toEvidenceSpans(chunks);
    return filterSupportedClaims(claims, evidence, options);
  }

  scoreSingleClaim(
    claim: ClaimInput,
    chunks: RetrievedChunk[],
    options?: { minScore?: number; requireCitationMatch?: boolean },
  ): ClaimEntailmentResult {
    return scoreClaimAgainstEvidence(claim, this.toEvidenceSpans(chunks), options);
  }

  /**
   * Annotate an answer and optionally strip unsupported clinical-looking sentences.
   * Safe default: strip when unsupportedRate material and stripUnsupported=true.
   */
  groundAnswer(
    answerText: string,
    chunks: RetrievedChunk[],
    options: { minScore?: number; stripUnsupported?: boolean } = {},
  ): GroundedAnswerResult {
    const evidenceTexts = chunks.map((c) => c.text);
    const annotated = annotateAnswerClaims(answerText, evidenceTexts, {
      minScore: options.minScore,
    });
    const stripped = annotated.sentences.filter((s) => !s.supported);
    const kept = annotated.sentences.filter((s) => s.supported);

    let groundedText = answerText;
    if (options.stripUnsupported) {
      groundedText = kept.map((s) => s.claim).join(' ').trim();
      if (!groundedText) {
        groundedText =
          'I could not support a clinical claim from the retrieved sources. Please consult the cited guidelines or a clinician.';
      }
    }

    return {
      originalText: answerText,
      groundedText,
      claims: annotated.sentences,
      strippedClaims: stripped,
      unsupportedRate: annotated.unsupportedRate,
    };
  }

  private toEvidenceSpans(chunks: RetrievedChunk[]): EvidenceSpan[] {
    return chunks.map((chunk) => ({
      text: chunk.text,
      sourceId: chunk.metadata?.sourceId,
      artifactId:
        (chunk.metadata as any)?.artifactId ||
        (chunk.metadata as any)?.metadata?.artifactId ||
        chunk.metadata?.sourceId,
    }));
  }

  private trimExcerpt(text: string): string {
    const normalized = String(text || '')
      .trim()
      .replace(/\s+/g, ' ');
    return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
  }

  private clamp01(score: number): number {
    return Math.min(Math.max(score, 0), 1);
  }
}
