import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  hybridFuse,
  passesMetadataFilter,
  type MetadataFilter,
} from '../../../../lib/rag/hybridRetrieval';
import { recordAiMonitorEvent } from '../../../../lib/ai/productionMonitoring';
import { CacheService } from '../cache/cache.service';
import { RetrievedChunk } from './dto/rag-context.dto';
import { PineconeService } from './vector-db/pinecone.service';
import { isAllowedTenantDocument, RAG_GLOBAL_ORG_SCOPE } from './utils/tenant-scope';

export interface RetrievalRequest {
  query: string;
  queryEmbedding: number[];
  topK: number;
  minScore: number;
  includeEmbeddings: boolean;
  filter: Record<string, any>;
  corpusVersion: number;
  /** Hybrid lexical + dense fusion (default true) */
  hybrid?: boolean;
  /** Extra metadata constraints (jurisdiction, evidence grade, expiry) */
  metadataFilter?: MetadataFilter;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  totalRetrieved: number;
  latencyMs: number;
  cacheHit: boolean;
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

    const promise = this.retrieveWithCache(cacheKey, request);

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
    const hybrid = request.hybrid !== false;
    // Over-fetch for hybrid fusion, then cut to topK
    const fetchK = hybrid
      ? Math.min(Math.max(request.topK * 3, request.topK + 8), 40)
      : request.topK;
    const fetchMinScore = hybrid ? Math.max(0, request.minScore * 0.65) : request.minScore;

    const queryResult = await this.vectorDb.query(request.queryEmbedding, {
      topK: fetchK,
      minScore: fetchMinScore,
      filter: request.filter,
      includeVectors: request.includeEmbeddings,
      includeMetadata: true,
    });

    let matches = queryResult.matches;

    // Defense-in-depth: even if a vector backend mis-applies filters, drop foreign tenants.
    matches = applyTenantOrganizationDefenseFilter(matches, request.filter);

    if (request.metadataFilter) {
      matches = matches.filter((match) =>
        passesMetadataFilter(
          {
            ...(match.metadata as unknown as Record<string, unknown>),
            ...((match.metadata as any)?.metadata || {}),
          },
          request.metadataFilter,
        ),
      );
    }

    let chunks: RetrievedChunk[];

    if (hybrid && matches.length > 0) {
      const fused = hybridFuse(
        request.query,
        matches.map((match) => ({
          id: match.id,
          text: match.text,
          vectorScore: match.score,
          metadata: match.metadata as unknown as Record<string, unknown>,
        })),
        { topK: request.topK },
      );

      const byId = new Map(matches.map((m) => [m.id, m]));
      chunks = fused
        .map((row) => {
          const match = byId.get(row.id);
          if (!match) return null;
          // Blend vector similarity with fused rank score for downstream confidence
          const blended = Math.min(1, 0.55 * match.score + 0.45 * row.fusedScore);
          if (blended < request.minScore * 0.85 && match.score < request.minScore) {
            return null;
          }
          return {
            id: match.id,
            text: match.text,
            score: blended,
            metadata: {
              ...match.metadata,
              metadata: {
                ...(match.metadata as any)?.metadata,
                hybrid: {
                  vectorScore: match.score,
                  lexicalScore: row.lexicalScore,
                  fusedScore: row.fusedScore,
                  vectorRank: row.vectorRank,
                  lexicalRank: row.lexicalRank,
                },
              },
            },
            embedding: match.vector,
          } as RetrievedChunk;
        })
        .filter((c): c is RetrievedChunk => Boolean(c));
    } else {
      chunks = matches
        .filter((match) => match.score >= request.minScore)
        .slice(0, request.topK)
        .map((match) => ({
          id: match.id,
          text: match.text,
          score: match.score,
          metadata: match.metadata,
          embedding: match.vector,
        }));
    }

    const latencyMs = Date.now() - startedAt;
    this.logger.debug(
      `Retrieved ${chunks.length}/${request.topK} chunks in ${latencyMs}ms hybrid=${hybrid} for "${request.query.substring(0, 80)}"`,
    );

    if (chunks.length === 0) {
      recordAiMonitorEvent('retrieval_miss', {
        queryPreview: String(request.query || '').slice(0, 80),
        topK: request.topK,
        minScore: request.minScore,
        hybrid,
        totalRetrieved: queryResult.total ?? queryResult.matches.length,
        latencyMs,
      });
    }

    return {
      chunks,
      totalRetrieved: queryResult.total ?? queryResult.matches.length,
      latencyMs,
      cacheHit: false,
    };
  }

  private async retrieveWithCache(
    cacheKey: string,
    request: RetrievalRequest,
  ): Promise<RetrievalResult> {
    const cached = await this.cacheService.get<RetrievalResult>(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
      };
    }

    const result = await this.retrieveUncached(request);
    await this.cacheService.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
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
      cacheHit: result.cacheHit,
      chunks: result.chunks.map((chunk) => ({
        ...chunk,
        metadata: { ...chunk.metadata },
        embedding: chunk.embedding ? [...chunk.embedding] : undefined,
      })),
    };
  }
}

/**
 * Post-filter vector matches by organizationId when the request filter scopes tenants.
 * Allowed values may be a single org or an array including RAG_GLOBAL_ORG_SCOPE.
 */
export function applyTenantOrganizationDefenseFilter<
  T extends { metadata?: { organizationId?: string | null } | null },
>(matches: T[], filter: Record<string, unknown> | undefined): T[] {
  if (!filter || filter.organizationId === undefined || filter.organizationId === null) {
    return matches;
  }

  const raw = filter.organizationId;
  const allowed = new Set(
    (Array.isArray(raw) ? raw : [raw])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  );
  if (allowed.size === 0) return matches;

  // Query org is the first non-global entry when present; global-only means public corpus.
  const queryOrgs = [...allowed].filter((id) => id !== RAG_GLOBAL_ORG_SCOPE);
  const allowGlobal = allowed.has(RAG_GLOBAL_ORG_SCOPE);

  return matches.filter((match) => {
    const docOrg = String(
      match.metadata?.organizationId ??
        (match.metadata as { metadata?: { organizationId?: string } } | null | undefined)?.metadata
          ?.organizationId ??
        '',
    ).trim();

    if (!docOrg || docOrg === RAG_GLOBAL_ORG_SCOPE) {
      return allowGlobal || isAllowedTenantDocument(RAG_GLOBAL_ORG_SCOPE, queryOrgs[0] || null);
    }

    if (queryOrgs.length === 0) {
      // Filter only asked for global corpus
      return false;
    }

    return queryOrgs.some((org) => isAllowedTenantDocument(docOrg, org));
  });
}
