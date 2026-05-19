import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Tool-specific metrics service for tracking clinical tool performance,
 * error categorization, execution tiers, and parameter complexity
 */
@Injectable()
export class ToolMetricsService {
  // Tool error categorization counter
  private toolErrorsTotal: Counter<string>;

  // Tool execution time tier counter
  private toolExecutionTimeTier: Counter<string>;

  // Tool parameter complexity gauge
  private toolParamComplexityScore: Gauge<string>;

  // RAG confidence histogram
  private ragChunkRelevanceScore: Histogram<string>;

  // RAG retrieval characteristics
  private ragChunksRetrieved: Counter<string>;
  private ragEmptyResultsTotal: Counter<string>;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Tool error categorization
    this.toolErrorsTotal = new Counter({
      name: 'tool_errors_total',
      help: 'Total tool errors by tool and error type',
      labelNames: ['tool', 'error_type'],
      registers: [register],
    });

    // Tool execution time tiers
    this.toolExecutionTimeTier = new Counter({
      name: 'tool_execution_time_tier',
      help: 'Count of tool executions by latency tier',
      labelNames: ['tool', 'tier'],
      registers: [register],
    });

    // Tool parameter complexity
    this.toolParamComplexityScore = new Gauge({
      name: 'tool_param_complexity_score',
      help: 'Complexity score of tool query parameters',
      labelNames: ['tool', 'complexity'],
      registers: [register],
    });

    // RAG chunk relevance histogram
    this.ragChunkRelevanceScore = new Histogram({
      name: 'rag_chunk_relevance_score',
      help: 'Distribution of RAG document relevance scores',
      buckets: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      registers: [register],
    });

    // RAG chunks retrieved counter
    this.ragChunksRetrieved = new Counter({
      name: 'rag_chunks_retrieved',
      help: 'Total RAG chunks retrieved by retrieval size category',
      labelNames: ['retrieval_size'],
      registers: [register],
    });

    // RAG empty results counter
    this.ragEmptyResultsTotal = new Counter({
      name: 'rag_empty_results_total',
      help: 'Total RAG queries that returned zero results',
      registers: [register],
    });
  }

  /**
   * Record a tool error
   * @param toolName - Name of the tool (drug-checker, sofa-calculator, lab-interpreter)
   * @param errorType - Type of error (timeout, validation, external_api, internal_error)
   */
  recordToolError(
    toolName: string,
    errorType: 'timeout' | 'validation' | 'external_api' | 'internal_error',
  ) {
    this.toolErrorsTotal.inc({ tool: toolName, error_type: errorType });
  }

  /**
   * Record tool execution time tier
   * @param toolName - Name of the tool
   * @param durationMs - Execution duration in milliseconds
   */
  recordToolExecutionTier(toolName: string, durationMs: number) {
    let tier: string;

    if (durationMs < 25) {
      tier = 'fast';
    } else if (durationMs < 100) {
      tier = 'normal';
    } else if (durationMs < 500) {
      tier = 'slow';
    } else {
      tier = 'very_slow';
    }

    this.toolExecutionTimeTier.inc({ tool: toolName, tier });
  }

  /**
   * Set tool parameter complexity
   * @param toolName - Name of the tool
   * @param complexity - Complexity category (simple, complex, unknown)
   * @param score - Numeric complexity score (0-100)
   */
  setToolParameterComplexity(
    toolName: string,
    complexity: 'simple' | 'complex' | 'unknown',
    score: number,
  ) {
    this.toolParamComplexityScore.set({ tool: toolName, complexity }, score);
  }

  /**
   * Record RAG chunk relevance score
   * @param score - Relevance score between 0.0 and 1.0
   */
  recordRagRelevanceScore(score: number) {
    this.ragChunkRelevanceScore.observe(score);
  }

  /**
   * Record RAG retrieval characteristics
   * @param chunkCount - Number of chunks retrieved
   */
  recordRagRetrieval(chunkCount: number) {
    if (chunkCount === 0) {
      this.ragEmptyResultsTotal.inc();
      this.ragChunksRetrieved.inc({ retrieval_size: 'zero' });
    } else if (chunkCount === 1) {
      this.ragChunksRetrieved.inc({ retrieval_size: 'one' });
    } else if (chunkCount <= 5) {
      this.ragChunksRetrieved.inc({ retrieval_size: 'two_to_five' });
    } else if (chunkCount <= 10) {
      this.ragChunksRetrieved.inc({ retrieval_size: 'six_to_ten' });
    } else {
      this.ragChunksRetrieved.inc({ retrieval_size: 'more_than_ten' });
    }
  }

  /**
   * Categorize error type from exception
   * @param error - Error object or message
   * @returns Error type category
   */
  categorizeError(error: any): 'timeout' | 'validation' | 'external_api' | 'internal_error' {
    const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return 'timeout';
    } else if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required')
    ) {
      return 'validation';
    } else if (
      errorMessage.includes('api') ||
      errorMessage.includes('external') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('network')
    ) {
      return 'external_api';
    } else {
      return 'internal_error';
    }
  }

  /**
   * Calculate parameter complexity score
   * @param params - Tool parameters object
   * @returns Complexity score (0-100) and category
   */
  calculateParameterComplexity(params: any): {
    score: number;
    category: 'simple' | 'complex' | 'unknown';
  } {
    if (!params || typeof params !== 'object') {
      return { score: 0, category: 'unknown' };
    }

    let score = 0;

    // Count parameters
    const paramCount = Object.keys(params).length;
    score += paramCount * 5;

    // Check for nested objects
    for (const value of Object.values(params)) {
      if (typeof value === 'object' && value !== null) {
        score += 20;
      }
      if (Array.isArray(value)) {
        score += value.length * 2;
      }
    }

    // Cap at 100
    score = Math.min(score, 100);

    const category = score < 30 ? 'simple' : score < 70 ? 'complex' : 'unknown';

    return { score, category };
  }
}
