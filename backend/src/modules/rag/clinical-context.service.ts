import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MedicalSource } from './dto/medical-source.dto';
import { RAGContext, RAGReference, RetrievedChunk } from './dto/rag-context.dto';

export interface BuildClinicalContextInput {
  query: string;
  chunks: RetrievedChunk[];
  sources: MedicalSource[];
  references: RAGReference[];
  totalRetrieved: number;
  latencyMs: number;
  maxTokens?: number;
}

@Injectable()
export class ClinicalContextService {
  private readonly defaultMaxTokens: number;

  constructor(private readonly configService: ConfigService) {
    const ragConfig = this.configService.get<any>('rag') || {};
    this.defaultMaxTokens = ragConfig.retrieval?.maxTokens || 2000;
  }

  buildContext(input: BuildClinicalContextInput): RAGContext {
    const confidence = this.calculateConfidence(input.chunks);
    const timestamp = new Date();
    const contextText = this.buildContextText(input.chunks, input.maxTokens || this.defaultMaxTokens);

    return {
      chunks: input.chunks,
      sources: input.sources,
      confidence,
      query: input.query,
      timestamp,
      totalRetrieved: input.totalRetrieved,
      latencyMs: input.latencyMs,
      contextText,
      references: input.references,
      sourcePanel: {
        references: input.references,
        confidence,
        generatedAt: timestamp.toISOString(),
        retrieval: {
          query: input.query,
          chunksRetrieved: input.chunks.length,
          sourcesFound: input.sources.length,
          totalRetrieved: input.totalRetrieved,
          latencyMs: input.latencyMs,
        },
      },
    };
  }

  buildEmptyContext(query: string): RAGContext {
    const timestamp = new Date();
    return {
      chunks: [],
      sources: [],
      confidence: 0,
      query,
      timestamp,
      totalRetrieved: 0,
      latencyMs: 0,
      contextText: '',
      references: [],
      sourcePanel: {
        references: [],
        confidence: 0,
        generatedAt: timestamp.toISOString(),
        retrieval: {
          query,
          chunksRetrieved: 0,
          sourcesFound: 0,
          totalRetrieved: 0,
          latencyMs: 0,
        },
      },
    };
  }

  private buildContextText(chunks: RetrievedChunk[], maxTokens: number): string {
    const maxCharacters = Math.max(maxTokens, 1) * 4;
    const lines: string[] = [];
    let usedCharacters = 0;

    for (const [index, chunk] of chunks.entries()) {
      const sourceLabel = chunk.metadata.title ? ` (${chunk.metadata.title})` : '';
      const entry = `[${index + 1}]${sourceLabel} ${chunk.text}`.trim();
      if (usedCharacters + entry.length > maxCharacters) {
        break;
      }
      lines.push(entry);
      usedCharacters += entry.length;
    }

    return lines.join('\n\n');
  }

  private calculateConfidence(chunks: RetrievedChunk[]): number {
    if (chunks.length === 0) {
      return 0;
    }

    const validChunks = chunks.filter(
      (chunk) => typeof chunk.score === 'number' && Number.isFinite(chunk.score),
    );
    if (validChunks.length === 0) {
      return Math.min(chunks.length / 10, 1);
    }

    let totalWeight = 0;
    let weightedSum = 0;
    validChunks.forEach((chunk, index) => {
      const weight = 1 / Math.pow(index + 1, 1.2);
      weightedSum += Math.min(Math.max(chunk.score, 0), 1) * weight;
      totalWeight += weight;
    });

    return Math.min(Math.max(totalWeight > 0 ? weightedSum / totalWeight : 0, 0), 1);
  }
}
