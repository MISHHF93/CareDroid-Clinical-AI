import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus Metrics Service
 * Centralized metrics collection for:
 * - HTTP request metrics (count, latency, status codes)
 * - Database query metrics
 * - Cache/Redis metrics
 * - Application-specific metrics (tool invocations, RAG, etc.)
 * - System metrics (memory, CPU via Node.js default collectors)
 */

@Injectable()
export class MetricsService {
  // HTTP Metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestSize: Histogram;
  public readonly httpResponseSize: Histogram;

  // Database Metrics
  public readonly databaseQueriesTotal: Counter;
  public readonly databaseQueryDuration: Histogram;
  public readonly databaseConnectionPoolUtilization: Gauge;

  // Cache Metrics
  public readonly cacheOperationsTotal: Counter;
  public readonly cacheHitRate: Gauge;

  // Error Metrics
  public readonly errorsTotal: Counter;

  // Business Metrics
  public readonly toolInvocationsTotal: Counter;
  public readonly toolInvocationDuration: Histogram;
  public readonly ragRetrievalDuration: Histogram;
  public readonly ragRetrievalSuccess: Counter;
  public readonly emergencyDetectionCount: Counter;

  // User Metrics
  public readonly activeUsersGauge: Gauge;
  public readonly authenticatedRequestsTotal: Counter;

  // Cost Metrics (Phase 4)
  public readonly openaiApiCostTotal: Counter;
  public readonly openaiCostPerMinute: Gauge;
  public readonly totalCostCounter: Counter;

  constructor() {
    // Enable default Node.js metrics (memory, CPU, event loop, etc.)
    collectDefaultMetrics({ register });

    // ========== HTTP Metrics ==========
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests by method, path, and status code',
      labelNames: ['method', 'path', 'status'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
      registers: [register],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
      registers: [register],
    });

    // ========== Database Metrics ==========
    this.databaseQueriesTotal = new Counter({
      name: 'database_queries_total',
      help: 'Total database queries by operation type',
      labelNames: ['operation', 'entity', 'status'],
      registers: [register],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query execution time in seconds',
      labelNames: ['operation', 'entity'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    this.databaseConnectionPoolUtilization = new Gauge({
      name: 'database_connection_pool_utilization',
      help: 'Database connection pool utilization (0-1)',
      labelNames: ['pool_name'],
      registers: [register],
    });

    // ========== Cache Metrics ==========
    this.cacheOperationsTotal = new Counter({
      name: 'cache_operations_total',
      help: 'Total cache operations (get, set, delete, etc.)',
      labelNames: ['operation', 'status'],
      registers: [register],
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate (0-1)',
      registers: [register],
    });

    // ========== Error Metrics ==========
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total errors by type',
      labelNames: ['error_type', 'severity'],
      registers: [register],
    });

    // ========== Business Metrics (Medical Tools) ==========
    this.toolInvocationsTotal = new Counter({
      name: 'tool_invocations_total',
      help: 'Total clinical tool invocations',
      labelNames: ['tool_name', 'status'],
      registers: [register],
    });

    this.toolInvocationDuration = new Histogram({
      name: 'tool_invocation_duration_seconds',
      help: 'Clinical tool execution time in seconds',
      labelNames: ['tool_name'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.ragRetrievalDuration = new Histogram({
      name: 'rag_retrieval_duration_seconds',
      help: 'RAG knowledge base retrieval time in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.ragRetrievalSuccess = new Counter({
      name: 'rag_retrieval_success',
      help: 'Successful RAG retrievals',
      labelNames: ['query_type'],
      registers: [register],
    });

    this.emergencyDetectionCount = new Counter({
      name: 'emergency_detection_total',
      help: 'Emergency conditions detected',
      labelNames: ['emergency_type', 'severity'],
      registers: [register],
    });

    // ========== User Metrics ==========
    this.activeUsersGauge = new Gauge({
      name: 'active_users',
      help: 'Current number of active users',
      registers: [register],
    });

    this.authenticatedRequestsTotal = new Counter({
      name: 'authenticated_requests_total',
      help: 'Total authenticated API requests',
      labelNames: ['user_role'],
      registers: [register],
    });

    // ========== Cost Metrics (Phase 4) ==========
    // /metrics has no auth guard (standard Prometheus scrape pattern — scrapers
    // typically can't send a JWT bearer token, so this endpoint is expected to be
    // reachable without one and secured at the network layer instead). A user_id
    // label previously meant anyone who could reach this plaintext endpoint could see
    // exactly which user IDs incurred how much AI cost. Aggregating by model instead
    // keeps the metric useful without exposing per-user identifiers on a public route.
    this.openaiApiCostTotal = new Counter({
      name: 'openai_api_cost_total',
      help: 'Total OpenAI API costs in USD',
      labelNames: ['model'],
      registers: [register],
    });

    this.openaiCostPerMinute = new Gauge({
      name: 'openai_cost_per_minute',
      help: 'Current OpenAI cost rate in USD per minute',
      registers: [register],
    });

    this.totalCostCounter = new Counter({
      name: 'cost_total',
      help: 'Total cost across all users in USD',
      registers: [register],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    requestSizeBytes?: number,
    responseSizeBytes?: number,
  ): void {
    this.httpRequestsTotal.labels(method, path, String(status)).inc();
    this.httpRequestDuration.labels(method, path, String(status)).observe(durationMs / 1000);

    if (requestSizeBytes) {
      this.httpRequestSize.labels(method, path).observe(requestSizeBytes);
    }
    if (responseSizeBytes) {
      this.httpResponseSize.labels(method, path, String(status)).observe(responseSizeBytes);
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    entity: string,
    durationMs: number,
    status: 'success' | 'error',
  ): void {
    this.databaseQueriesTotal.labels(operation, entity, status).inc();
    if (status === 'success') {
      this.databaseQueryDuration.labels(operation, entity).observe(durationMs / 1000);
    }
  }

  /**
   * Update database connection pool utilization
   */
  setConnectionPoolUtilization(poolName: string, utilization: number): void {
    this.databaseConnectionPoolUtilization.labels(poolName).set(utilization);
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(operation: string, status: 'hit' | 'miss' | 'success' | 'error'): void {
    this.cacheOperationsTotal.labels(operation, status).inc();
  }

  /**
   * Record error
   */
  recordError(errorType: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.errorsTotal.labels(errorType, severity).inc();
  }

  /**
   * Record tool invocation
   */
  recordToolInvocation(toolName: string, durationMs: number, status: 'success' | 'error'): void {
    this.toolInvocationsTotal.labels(toolName, status).inc();
    if (status === 'success') {
      this.toolInvocationDuration.labels(toolName).observe(durationMs / 1000);
    }
  }

  /**
   * Record RAG retrieval
   */
  recordRagRetrieval(durationMs: number, queryType: string, success: boolean): void {
    this.ragRetrievalDuration.observe(durationMs / 1000);
    if (success) {
      this.ragRetrievalSuccess.labels(queryType).inc();
    }
  }

  /**
   * Record emergency detection
   */
  recordEmergencyDetection(emergencyType: string, severity: 'low' | 'high' | 'critical'): void {
    this.emergencyDetectionCount.labels(emergencyType, severity).inc();
  }

  /**
   * Update active users count
   */
  setActiveUsers(count: number): void {
    this.activeUsersGauge.set(count);
  }

  /**
   * Record authenticated request
   */
  recordAuthenticatedRequest(userRole: string): void {
    this.authenticatedRequestsTotal.labels(userRole).inc();
  }

  /**
   * Record OpenAI API cost
   */
  recordOpenaiCost(model: string, costUsd: number): void {
    this.openaiApiCostTotal.labels(model).inc(costUsd);
    this.totalCostCounter.inc(costUsd);
  }

  /**
   * Update OpenAI cost per minute gauge
   */
  setCostPerMinute(costPerMinute: number): void {
    this.openaiCostPerMinute.set(costPerMinute);
  }

  /**
   * Get all metrics in Prometheus text format
   */
  async getMetricsAsString(): Promise<string> {
    return register.metrics();
  }
}
