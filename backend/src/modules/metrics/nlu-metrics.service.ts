import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

/**
 * NLU-specific metrics service for tracking intent classification,
 * confidence scores, phase timing, and circuit breaker status
 */
@Injectable()
export class NluMetricsService {
  // Intent distribution counter
  private intentClassificationsTotal: Counter<string>;

  // NLU confidence score histogram (0.0 to 1.0 in 10 buckets)
  private nluConfidenceScores: Histogram<string>;

  // Phase-specific latency histograms
  private nluPhaseKeywordDuration: Histogram<string>;
  private nluPhaseModelDuration: Histogram<string>;
  private nluPhaseLlmDuration: Histogram<string>;

  // Circuit breaker status gauge (0 = closed/working, 1 = open/failing)
  private nluCircuitBreakerState: Gauge<string>;

  // Confidence mismatch tracking
  private chatIntentConfidenceMismatch: Counter<string>;

  // Multi-turn conversation depth
  private chatMultiTurnDepth: Histogram<string>;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Intent classification counter
    this.intentClassificationsTotal = new Counter({
      name: 'intent_classifications_total',
      help: 'Total number of intent classifications by intent class',
      labelNames: ['intent', 'method'],
      registers: [register],
    });

    // NLU confidence histogram with 10 buckets from 0 to 1
    this.nluConfidenceScores = new Histogram({
      name: 'nlu_confidence_scores',
      help: 'Distribution of NLU confidence scores',
      labelNames: ['intent', 'phase'],
      buckets: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      registers: [register],
    });

    // Keyword matching phase latency (typically 1-5ms)
    this.nluPhaseKeywordDuration = new Histogram({
      name: 'nlu_phase_keyword_duration_seconds',
      help: 'Duration of keyword matching phase in seconds',
      labelNames: ['result'],
      buckets: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1],
      registers: [register],
    });

    // BERT model phase latency (typically 40-100ms)
    this.nluPhaseModelDuration = new Histogram({
      name: 'nlu_phase_model_duration_seconds',
      help: 'Duration of NLU model inference phase in seconds',
      labelNames: ['result'],
      buckets: [0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5],
      registers: [register],
    });

    // LLM fallback phase latency (typically 500-2000ms)
    this.nluPhaseLlmDuration = new Histogram({
      name: 'nlu_phase_llm_duration_seconds',
      help: 'Duration of LLM fallback phase in seconds',
      labelNames: ['result'],
      buckets: [0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0],
      registers: [register],
    });

    // Circuit breaker state (0 = closed, 1 = open)
    this.nluCircuitBreakerState = new Gauge({
      name: 'nlu_circuit_breaker_state',
      help: 'NLU circuit breaker state (0 = closed/working, 1 = open/failing)',
      labelNames: ['service'],
      registers: [register],
    });

    // Confidence mismatch tracking
    this.chatIntentConfidenceMismatch = new Counter({
      name: 'chat_intent_confidence_mismatch_total',
      help: 'Total confidence mismatches (high confidence but user correction)',
      labelNames: ['intent'],
      registers: [register],
    });

    // Multi-turn conversation depth
    this.chatMultiTurnDepth = new Histogram({
      name: 'chat_multi_turn_depth',
      help: 'Distribution of conversation turn depths',
      buckets: [1, 2, 3, 5, 7, 10, 15, 20, 30],
      registers: [register],
    });
  }

  /**
   * Record an intent classification
   * @param intent - The classified intent (emergency, clinical_tool, etc.)
   * @param method - Classification method used (keyword, model, llm)
   */
  recordIntentClassification(intent: string, method: 'keyword' | 'model' | 'llm') {
    this.intentClassificationsTotal.inc({ intent, method });
  }

  /**
   * Record NLU confidence score
   * @param confidence - Confidence score between 0.0 and 1.0
   * @param intent - The classified intent
   * @param phase - Which phase produced this confidence (keyword, model, llm)
   */
  recordConfidenceScore(confidence: number, intent: string, phase: string) {
    this.nluConfidenceScores.observe({ intent, phase }, confidence);
  }

  /**
   * Record keyword matching phase duration
   * @param durationSeconds - Duration in seconds
   * @param result - Whether keyword matching succeeded (match/no_match)
   */
  recordKeywordPhaseDuration(durationSeconds: number, result: 'match' | 'no_match') {
    this.nluPhaseKeywordDuration.observe({ result }, durationSeconds);
  }

  /**
   * Record NLU model inference phase duration
   * @param durationSeconds - Duration in seconds
   * @param result - Whether model inference succeeded (success/failure)
   */
  recordModelPhaseDuration(durationSeconds: number, result: 'success' | 'failure') {
    this.nluPhaseModelDuration.observe({ result }, durationSeconds);
  }

  /**
   * Record LLM fallback phase duration
   * @param durationSeconds - Duration in seconds
   * @param result - Whether LLM call succeeded (success/failure)
   */
  recordLlmPhaseDuration(durationSeconds: number, result: 'success' | 'failure') {
    this.nluPhaseLlmDuration.observe({ result }, durationSeconds);
  }

  /**
   * Update circuit breaker state
   * @param service - Service name (nlu_model, llm)
   * @param isOpen - True if circuit breaker is open (failing), false if closed (working)
   */
  setCircuitBreakerState(service: 'nlu_model' | 'llm', isOpen: boolean) {
    this.nluCircuitBreakerState.set({ service }, isOpen ? 1 : 0);
  }

  /**
   * Record a confidence mismatch (high confidence but user corrected)
   * @param intent - The intent that was incorrectly classified
   */
  recordConfidenceMismatch(intent: string) {
    this.chatIntentConfidenceMismatch.inc({ intent });
  }

  /**
   * Record multi-turn conversation depth
   * @param depth - Number of turns in conversation
   */
  recordConversationDepth(depth: number) {
    this.chatMultiTurnDepth.observe(depth);
  }

  /**
   * Get current circuit breaker state for a service
   * @param service - Service name
   * @returns Current state (0 = closed, 1 = open)
   */
  getCircuitBreakerState(_service: 'nlu_model' | 'llm'): number {
    // This is a gauge, so we can't directly get the value without querying Prometheus
    // This method is for internal tracking if needed
    return 0; // Default to closed
  }
}
