import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { RetrievedChunk } from './dto/rag-context.dto';
import { PineconeService } from './vector-db/pinecone.service';

export interface RetrievalRequest {
  query: string;
  queryEmbedding: number[];
  topK: number;
  minScore: number;
  includeEmbeddings: boolean;
  filter: Record<string, any>;
  corpusVersion: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  totalRetrieved: number;
  latencyMs: number;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly cacheTtlSeconds: number;
  private readonly inflightRetrievals = new Map<string, Promise<RetrievalResult>>();

  constructor(
    private readonly vectorDb: PineconeService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    const ragConfig = this.configService.get<any>('rag') || {};
    this.cacheTtlSeconds = ragConfig.retrieval?.cacheTtlSeconds || 300;
  }

  async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    const cacheKey = this.cacheKey(request);
    const inflight = this.inflightRetrievals.get(cacheKey);
    if (inflight) {
      return this.cloneResult(await inflight);
    }

    const promise = this.cacheService.getOrSet(
      cacheKey,
      () => this.retrieveUncached(request),
      this.cacheTtlSeconds,
    );

    this.inflightRetrievals.set(cacheKey, promise);

    try {
      return this.cloneResult(await promise);
    } finally {
      this.inflightRetrievals.delete(cacheKey);
    }
  }

  clearInFlight(): void {
    this.inflightRetrievals.clear();
  }

  private async retrieveUncached(request: RetrievalRequest): Promise<RetrievalResult> {
    const startedAt = Date.now();
    const queryResult = await this.vectorDb.query(request.queryEmbedding, {
      topK: request.topK,
      minScore: request.minScore,
      filter: request.filter,
      includeVectors: request.includeEmbeddings,
      includeMetadata: true,
    });

    const chunks: RetrievedChunk[] = queryResult.matches.map((match) => ({
      id: match.id,
      text: match.text,
      score: match.score,
      metadata: match.metadata,
      embedding: match.vector,
    }));

    const latencyMs = Date.now() - startedAt;
    this.logger.debug(
      `Retrieved ${chunks.length}/${request.topK} chunks in ${latencyMs}ms for "${request.query.substring(0, 80)}"`,
    );

    return {
      chunks,
      totalRetrieved: queryResult.total ?? queryResult.matches.length,
      latencyMs,
    };
  }

  private cacheKey(request: RetrievalRequest): string {
    return `rag:retrieval:${JSON.stringify({
      corpusVersion: request.corpusVersion,
      query: String(request.query || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase(),
      topK: request.topK,
      minScore: request.minScore,
      includeEmbeddings: request.includeEmbeddings,
      filter: this.stableObject(request.filter),
    })}`;
  }

  private stableObject(value: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b)));
  }

  private cloneResult(result: RetrievalResult): RetrievalResult {
    return {
      ...result,
      chunks: result.chunks.map((chunk) => ({
        ...chunk,
        metadata: { ...chunk.metadata },
        embedding: chunk.embedding ? [...chunk.embedding] : undefined,
      })),
    };
  }
}
