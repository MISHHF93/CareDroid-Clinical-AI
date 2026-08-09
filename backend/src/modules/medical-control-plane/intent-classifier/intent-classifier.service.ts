/**
 * Intent Classifier Service
 *
 * Three-Phase Classification Pipeline:
 * 1. Keyword Matching (fast, rule-based)
 * 2. Unified AI Node (NLU intent head + artifact-router head — ml-services/models)
 * 3. LLM Fallback (GPT-4 for complex cases)
 *
 * Emergency Detection: 100% recall (no false negatives)
 */

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIService } from '../../ai/ai.service';
import { NluMetricsService } from '../../metrics/nlu-metrics.service';
import {
  IntentClassification,
  IntentClassificationContext,
  PrimaryIntent,
  EmergencySeverity,
  EmergencyKeyword,
} from './dto/intent-classification.dto';
import {
  detectEmergencyKeywords,
  getHighestSeverity,
  EmergencyPattern,
} from './patterns/emergency.patterns';
import { matchToolPatterns, extractToolParameters } from './patterns/tool.patterns';
import { classifyClinicalQuery } from './patterns/clinical.patterns';
import {
  fuseUnifiedHeadConfidence,
  resolveExecutorToolId,
  shouldAcceptUnifiedNodeResult,
} from '../../../../ml-services/shared/routing-maps';
import { UnifiedAiNodeService } from '../../../../ml-services/unified-ai-node/unified-ai-node.service';

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  private readonly nluServiceUrl: string;
  private readonly nluUseInProcess: boolean;
  private readonly nluFailureThreshold = 3;
  private readonly nluResetMs = 30_000;
  private readonly llmFailureThreshold = 3;
  private readonly llmResetMs = 30_000;
  private readonly nluEnabled: boolean;

  private readonly nluCircuitBreaker = {
    failureCount: 0,
    openUntil: 0,
  };

  private readonly llmCircuitBreaker = {
    failureCount: 0,
    openUntil: 0,
  };

  constructor(
    @Inject(forwardRef(() => AIService))
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
    private readonly nluMetrics: NluMetricsService,
    private readonly unifiedAiNode: UnifiedAiNodeService,
  ) {
    const nluConfig = this.configService.get<any>('nlu');
    const baseUrl = nluConfig?.url || 'http://127.0.0.1:8000/api/nlu';
    this.nluServiceUrl = baseUrl.replace(/\/$/, '');
    this.nluEnabled = nluConfig?.enabled !== false;
    this.nluUseInProcess = nluConfig?.mode !== 'http';
  }

  /**
   * Main classification entry point
   * Executes 3-phase pipeline: keyword → NLU → LLM
   */
  async classify(
    message: string,
    context?: IntentClassificationContext,
  ): Promise<IntentClassification> {
    this.logger.log(`🧠 Classifying intent for message: "${message.substring(0, 100)}..."`);

    // ========================================
    // PHASE 0: EMERGENCY DETECTION (Always runs first)
    // ========================================
    const emergencyPatterns = detectEmergencyKeywords(message);
    const isEmergency = emergencyPatterns.length > 0;
    const emergencySeverity = getHighestSeverity(emergencyPatterns) ?? undefined;

    if (isEmergency) {
      this.logger.warn(
        `🚨 EMERGENCY DETECTED: ${emergencySeverity} - ${emergencyPatterns.length} patterns matched`,
      );
    }

    // ========================================
    // PHASE 1: KEYWORD MATCHING
    // ========================================
    const keywordStartMs = Date.now();
    const keywordResult = this.keywordMatcher(message, emergencyPatterns);
    const keywordDurationSec = (Date.now() - keywordStartMs) / 1000;

    // Record Phase 1 metrics
    this.nluMetrics.recordKeywordPhaseDuration(
      keywordDurationSec,
      keywordResult.confidence >= 0.5 ? 'match' : 'no_match',
    );
    this.nluMetrics.recordConfidenceScore(
      keywordResult.confidence,
      keywordResult.primaryIntent,
      'keyword',
    );

    if (keywordResult.confidence >= 0.7) {
      this.logger.log(
        `✅ Phase 1 (Keyword): High confidence (${keywordResult.confidence.toFixed(2)}) - ${keywordResult.primaryIntent}`,
      );

      // Record successful classification
      this.nluMetrics.recordIntentClassification(keywordResult.primaryIntent, 'keyword');

      // Still enrich with the unified AI node (artifact type + tool id) when safe —
      // keywords own the primary intent; the node adds routing metadata.
      const enrichment = await this.enrichWithUnifiedNode(message, keywordResult);

      return {
        ...keywordResult,
        ...enrichment,
        isEmergency,
        emergencyKeywords: this.mapEmergencyKeywords(emergencyPatterns),
        emergencySeverity,
        method: enrichment.nodeId ? 'keyword+node' : 'keyword',
        classifiedAt: new Date(),
      };
    }

    this.logger.log(
      `⚠️ Phase 1 (Keyword): Low confidence (${keywordResult.confidence.toFixed(2)}) - proceeding to Phase 2`,
    );

    // ========================================
    // PHASE 2: UNIFIED AI NODE (intent + artifact-type classifiers)
    // ========================================
    const nluStartMs = Date.now();
    const nluResult = await this.nluMatcher(message, context);
    const nluDurationSec = (Date.now() - nluStartMs) / 1000;

    // Record Phase 2 metrics
    if (nluResult) {
      this.nluMetrics.recordModelPhaseDuration(nluDurationSec, 'success');
      this.nluMetrics.recordConfidenceScore(nluResult.confidence, nluResult.primaryIntent, 'model');

      const acceptNode = shouldAcceptUnifiedNodeResult({
        intentConfidence: nluResult.confidence,
        artifactType: nluResult.artifactType,
        artifactConfidence: nluResult.artifactRouteConfidence,
        primaryIsClinicalTool: nluResult.primaryIntent === PrimaryIntent.CLINICAL_TOOL,
      });

      if (acceptNode) {
        const fusedConfidence = fuseUnifiedHeadConfidence({
          intentConfidence: nluResult.confidence,
          artifactType: nluResult.artifactType,
          artifactConfidence: nluResult.artifactRouteConfidence,
          primaryIsClinicalTool: nluResult.primaryIntent === PrimaryIntent.CLINICAL_TOOL,
        });

        this.logger.log(
          `✅ Phase 2 (Unified AI Node): accept conf=${fusedConfidence.toFixed(2)} intent=${nluResult.primaryIntent} artifact=${nluResult.artifactType ?? 'n/a'}`,
        );

        // Record successful classification
        this.nluMetrics.recordIntentClassification(nluResult.primaryIntent, 'model');

        return {
          ...nluResult,
          confidence: fusedConfidence,
          isEmergency,
          emergencyKeywords: this.mapEmergencyKeywords(emergencyPatterns),
          emergencySeverity,
          method: 'nlu',
          nodeId: UnifiedAiNodeService.NODE_ID,
          classifiedAt: new Date(),
        };
      }
    } else {
      // NLU failed or circuit breaker open
      this.nluMetrics.recordModelPhaseDuration(nluDurationSec, 'failure');
    }

    // ========================================
    // PHASE 3: LLM FALLBACK (GPT-4)
    // ========================================
    this.logger.log(`🤖 Phase 3 (LLM): Invoking GPT-4 for complex intent classification`);

    const llmStartMs = Date.now();
    try {
      const llmResult = await this.llmMatcher(message, context);
      const llmDurationSec = (Date.now() - llmStartMs) / 1000;

      // Record Phase 3 metrics
      this.nluMetrics.recordLlmPhaseDuration(llmDurationSec, 'success');
      this.nluMetrics.recordConfidenceScore(llmResult.confidence, llmResult.primaryIntent, 'llm');
      this.nluMetrics.recordIntentClassification(llmResult.primaryIntent, 'llm');

      return {
        ...llmResult,
        isEmergency,
        emergencyKeywords: this.mapEmergencyKeywords(emergencyPatterns),
        emergencySeverity,
        method: 'llm',
        classifiedAt: new Date(),
      };
    } catch (error) {
      const llmDurationSec = (Date.now() - llmStartMs) / 1000;
      this.nluMetrics.recordLlmPhaseDuration(llmDurationSec, 'failure');

      this.logger.error(
        `❌ Phase 3 (LLM) failed: ${error instanceof Error ? error.message : String(error)}. Returning keyword result.`,
      );

      // Fallback to keyword result
      this.nluMetrics.recordIntentClassification(keywordResult.primaryIntent, 'keyword');

      return {
        ...keywordResult,
        isEmergency,
        emergencyKeywords: this.mapEmergencyKeywords(emergencyPatterns),
        emergencySeverity,
        method: 'keyword',
        classifiedAt: new Date(),
      };
    }
  }

  /**
   * Phase 1: Fast keyword-based pattern matching
   */
  private keywordMatcher(
    message: string,
    emergencyPatterns: EmergencyPattern[],
  ): Omit<
    IntentClassification,
    'isEmergency' | 'emergencyKeywords' | 'emergencySeverity' | 'method' | 'classifiedAt'
  > {
    const matchedPatterns: string[] = [];

    // Priority 1: Emergency always takes precedence
    if (emergencyPatterns.length > 0) {
      return {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 1.0, // 100% confidence for emergency detection
        extractedParameters: {},
        matchedPatterns: emergencyPatterns.map((p) => p.category),
      };
    }

    const clinicalQuery = classifyClinicalQuery(message);
    const lowerMessage = message.toLowerCase();
    const explicitDocumentationToolRequest =
      /\b(open|launch|use|run|start)\b/.test(lowerMessage) &&
      (lowerMessage.includes('clinical documentation assistant') ||
        lowerMessage.includes('documentation assistant'));

    // Priority 2: Administrative documentation/billing requests before broad tool aliases.
    if (clinicalQuery.category === 'administrative' && !explicitDocumentationToolRequest) {
      return {
        primaryIntent: PrimaryIntent.ADMINISTRATIVE,
        confidence: clinicalQuery.confidence,
        extractedParameters: {},
        matchedPatterns: [clinicalQuery.category],
      };
    }

    // Priority 3: Clinical tool detection
    const toolMatches = matchToolPatterns(message);
    if (toolMatches.length > 0) {
      const bestMatch = toolMatches[0];
      matchedPatterns.push(...bestMatch.matchedKeywords);

      const extractedParameters = extractToolParameters(message, bestMatch.toolId);

      return {
        primaryIntent: PrimaryIntent.CLINICAL_TOOL,
        toolId: bestMatch.toolId,
        confidence: bestMatch.confidence,
        extractedParameters,
        matchedPatterns,
        alternativeIntents: toolMatches.slice(1, 3).map((m) => ({
          intent: PrimaryIntent.CLINICAL_TOOL,
          toolId: m.toolId,
          confidence: m.confidence,
        })),
      };
    }

    if (clinicalQuery.category === 'medical_reference') {
      return {
        primaryIntent: PrimaryIntent.MEDICAL_REFERENCE,
        confidence: clinicalQuery.confidence,
        extractedParameters: {},
        matchedPatterns: [clinicalQuery.category],
      };
    }

    if (clinicalQuery.category === 'administrative') {
      return {
        primaryIntent: PrimaryIntent.ADMINISTRATIVE,
        confidence: clinicalQuery.confidence,
        extractedParameters: {},
        matchedPatterns: [clinicalQuery.category],
      };
    }

    // Priority 4: General query (default)
    return {
      primaryIntent: PrimaryIntent.GENERAL_QUERY,
      confidence: 0.3,
      extractedParameters: {},
      matchedPatterns: [],
    };
  }

  /**
   * Phase 2: Unified AI node — intent head + artifact-router head (in-process by default).
   */
  private async nluMatcher(
    message: string,
    _context?: IntentClassificationContext,
  ): Promise<Omit<
    IntentClassification,
    'isEmergency' | 'emergencyKeywords' | 'emergencySeverity' | 'method' | 'classifiedAt'
  > | null> {
    if (!this.nluEnabled) {
      this.logger.warn('NLU service disabled by configuration. Skipping NLU phase.');
      return null;
    }

    if (this.isCircuitOpen(this.nluCircuitBreaker)) {
      this.logger.warn('NLU circuit breaker is open. Skipping NLU phase.');
      return null;
    }

    try {
      const result = this.nluUseInProcess
        ? await this.predictWithUnifiedNode(message)
        : await this.predictWithHttpUnifiedNode(message);

      if (!result) {
        return null;
      }

      const primaryIntent = this.mapNluIntent(result.intent);
      if (!primaryIntent) {
        this.logger.warn(`NLU returned unknown intent: ${String(result.intent)}`);
        this.recordFailure(this.nluCircuitBreaker, this.nluFailureThreshold, this.nluResetMs);
        return null;
      }

      this.recordSuccess(this.nluCircuitBreaker);

      const rawToolId =
        result.toolId ??
        (primaryIntent === PrimaryIntent.CLINICAL_TOOL ? result.intent : undefined);
      const toolId = resolveExecutorToolId(rawToolId, result.artifactType, message);

      const extractedParameters = { ...(result.parameters || {}) };
      if (result.artifactType && result.artifactType !== 'unknown') {
        extractedParameters.artifactType = result.artifactType;
        if (result.artifactRouteConfidence !== undefined) {
          extractedParameters.artifactRouteConfidence = result.artifactRouteConfidence;
        }
      }

      const intentConfidence = result.confidence ?? 0.0;
      const fused = fuseUnifiedHeadConfidence({
        intentConfidence,
        artifactType: result.artifactType,
        artifactConfidence: result.artifactRouteConfidence,
        primaryIsClinicalTool: primaryIntent === PrimaryIntent.CLINICAL_TOOL,
      });

      return {
        primaryIntent,
        toolId,
        artifactType: result.artifactType,
        artifactRouteConfidence: result.artifactRouteConfidence,
        confidence: fused,
        extractedParameters,
        matchedPatterns: ['unified-ai-node'],
        nodeId: UnifiedAiNodeService.NODE_ID,
      };
    } catch (error) {
      this.logger.warn(
        `NLU service unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.recordFailure(this.nluCircuitBreaker, this.nluFailureThreshold, this.nluResetMs);
      return null;
    }
  }

  /**
   * Non-blocking enrichment for high-confidence keyword results.
   * Never overrides primaryIntent; only fills artifactType / toolId / nodeId.
   */
  private async enrichWithUnifiedNode(
    message: string,
    keywordResult: Omit<
      IntentClassification,
      'isEmergency' | 'emergencyKeywords' | 'emergencySeverity' | 'method' | 'classifiedAt'
    >,
  ): Promise<Partial<IntentClassification>> {
    if (!this.nluEnabled || this.isCircuitOpen(this.nluCircuitBreaker)) {
      return {};
    }
    try {
      const routed = this.nluUseInProcess
        ? await this.predictWithUnifiedNode(message)
        : await this.predictWithHttpUnifiedNode(message);
      if (!routed) return {};

      this.recordSuccess(this.nluCircuitBreaker);

      const toolId =
        keywordResult.toolId || resolveExecutorToolId(routed.intent, routed.artifactType, message);

      const extractedParameters = { ...keywordResult.extractedParameters };
      if (routed.artifactType && routed.artifactType !== 'unknown') {
        extractedParameters.artifactType = routed.artifactType;
        if (routed.artifactRouteConfidence !== undefined) {
          extractedParameters.artifactRouteConfidence = routed.artifactRouteConfidence;
        }
      }
      if (routed.parameters?.keyTerms) {
        extractedParameters.nodeKeyTerms = routed.parameters.keyTerms;
      }

      return {
        toolId,
        artifactType: routed.artifactType,
        artifactRouteConfidence: routed.artifactRouteConfidence,
        extractedParameters,
        matchedPatterns: [...(keywordResult.matchedPatterns || []), 'unified-ai-node-enrichment'],
        nodeId: UnifiedAiNodeService.NODE_ID,
      };
    } catch (error) {
      this.logger.debug(
        `Unified node enrichment skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }

  private async predictWithUnifiedNode(message: string): Promise<{
    intent: string;
    confidence: number;
    toolId?: string;
    artifactType?: string;
    artifactRouteConfidence?: number;
    parameters?: Record<string, unknown>;
  } | null> {
    await this.unifiedAiNode.load();
    const routed = await this.unifiedAiNode.route(message);
    return {
      intent: routed.intent.intent,
      confidence: routed.intent.confidence,
      artifactType: routed.artifact.artifactType,
      artifactRouteConfidence: routed.artifact.confidence,
      parameters: {
        keyTerms: routed.intent.keyTerms,
        subcategory: routed.intent.subcategory,
        artifactLabelId: routed.artifact.labelId,
        artifactTargetMode: routed.artifact.targetMode,
      },
    };
  }

  private unifiedNodeHttpBase(): string {
    return this.nluServiceUrl.replace(/\/api\/nlu\/?$/, '');
  }

  private async predictWithHttpUnifiedNode(message: string): Promise<{
    intent: string;
    confidence: number;
    toolId?: string;
    artifactType?: string;
    artifactRouteConfidence?: number;
    parameters?: Record<string, unknown>;
  } | null> {
    if (!this.nluServiceUrl) {
      this.logger.warn('Unified AI node URL not configured. Skipping model phase.');
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.unifiedNodeHttpBase()}/api/ai/node/models/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(`Unified AI node responded with ${response.status}`);
        this.recordFailure(this.nluCircuitBreaker, this.nluFailureThreshold, this.nluResetMs);
        return null;
      }

      const payload = (await response.json()) as {
        intent?: {
          intent?: string;
          confidence?: number;
          keyTerms?: string[];
          subcategory?: string | null;
        };
        artifact?: {
          artifactType?: string;
          confidence?: number;
          labelId?: number;
          targetMode?: string;
        };
      };

      if (!payload.intent?.intent) return null;

      return {
        intent: payload.intent.intent,
        confidence: payload.intent.confidence ?? 0,
        artifactType: payload.artifact?.artifactType,
        artifactRouteConfidence: payload.artifact?.confidence,
        parameters: {
          keyTerms: payload.intent.keyTerms,
          subcategory: payload.intent.subcategory,
          artifactLabelId: payload.artifact?.labelId,
          artifactTargetMode: payload.artifact?.targetMode,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Map NLU intent labels (backend/ml-services/nlu/nlu.config.ts's 10-class
   * taxonomy) to the coarser 5-value PrimaryIntent enum this pipeline uses.
   * toolId is set for CLINICAL_TOOL results so downstream tool-routing logic
   * knows which specific clinical tool the NLU model picked.
   */
  private mapNluIntent(intent: string | undefined): PrimaryIntent | null {
    switch (intent) {
      case 'emergency_alert':
        return PrimaryIntent.EMERGENCY;
      case 'drug_interaction_check':
      case 'sofa_score_calculation':
      case 'medication_order':
      case 'diagnosis_support':
        return PrimaryIntent.CLINICAL_TOOL;
      case 'lab_interpretation':
      case 'clinical_guideline_lookup':
      case 'patient_status_update':
      case 'discharge_planning':
        return PrimaryIntent.MEDICAL_REFERENCE;
      case 'general_clinical_query':
        return PrimaryIntent.GENERAL_QUERY;
      default:
        return null;
    }
  }

  /**
   * Phase 3: LLM-based classification for complex cases
   */
  private async llmMatcher(
    message: string,
    context?: IntentClassificationContext,
  ): Promise<
    Omit<
      IntentClassification,
      'isEmergency' | 'emergencyKeywords' | 'emergencySeverity' | 'method' | 'classifiedAt'
    >
  > {
    const userId = context?.userId || 'system';

    if (this.isCircuitOpen(this.llmCircuitBreaker)) {
      throw new Error('LLM circuit breaker is open');
    }

    // Build context for LLM
    let contextStr = '';
    if (context?.previousMessages && context.previousMessages.length > 0) {
      contextStr = '\n\nConversation History:\n';
      contextStr += context.previousMessages
        .slice(-3) // Last 3 messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
    }

    const prompt = `Classify the following clinical query into one of these intents:
- general_query: General clinical information requests
- clinical_tool: User wants to use a specific clinical tool (calculator, checker, interpreter)
- medical_reference: Looking up medical information, definitions, or guidelines
- administrative: Billing, documentation, scheduling, or administrative tasks
- emergency: Medical emergency (this should be rare as emergencies are caught by keyword matching)

If the intent is "clinical_tool", identify which tool:
- sofa-calculator: SOFA score for organ failure assessment
- apache2-calculator: APACHE-II for ICU mortality
- cha2ds2vasc-calculator: Stroke risk in AFib
- curb65-calculator: Pneumonia severity
- gcs-calculator: Glasgow Coma Scale
- wells-dvt-calculator: DVT probability
- wells-pe: Pulmonary embolism Wells rule (chat-assisted)
- perc: PERC rule-out criteria (low pre-test probability; chat-assisted)
- grace-acs: GRACE ACS mortality risk stratification (chat-assisted; prognosis only, not ACS diagnosis)
- nihss: NIH Stroke Scale structured neurologic deficit scoring (chat-assisted; does not replace urgent stroke evaluation)
- canadian-c-spine: Canadian C-Spine Rule imaging decision support in alert stable blunt trauma (chat-assisted; not clearance)
- ottawa-ankle: Ottawa ankle/foot rules for radiography after acute injury (chat-assisted; not fracture clearance)
- drug-interactions: Drug-drug interaction checker
- dose-calculator: Medication dosing
- lab-interpreter: Lab result interpretation
- abg-interpreter: Arterial blood gas analysis
- protocol-lookup: Clinical protocols and guidelines
- differential-diagnosis: Generate differential diagnoses
- antibiotic-guide: Antibiotic selection

User Query: "${message}"${contextStr}

Respond in JSON format:
{
  "primaryIntent": "intent_name",
  "toolId": "tool_id_if_applicable",
  "confidence": 0.85,
  "extractedParameters": {},
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.aiService.generateStructuredJSON(userId, prompt, {
        primaryIntent: 'string',
        toolId: 'string',
        confidence: 'number',
        extractedParameters: 'object',
        reasoning: 'string',
      });

      this.recordSuccess(this.llmCircuitBreaker);

      return {
        primaryIntent: response.primaryIntent as PrimaryIntent,
        toolId: response.toolId,
        confidence: response.confidence || 0.8,
        extractedParameters: response.extractedParameters || {},
        matchedPatterns: ['llm-classified'],
      };
    } catch (error) {
      this.recordFailure(this.llmCircuitBreaker, this.llmFailureThreshold, this.llmResetMs);
      throw new Error(
        `LLM classification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private isCircuitOpen(breaker: { failureCount: number; openUntil: number }): boolean {
    return breaker.openUntil > Date.now();
  }

  private recordFailure(
    breaker: { failureCount: number; openUntil: number },
    threshold: number,
    resetMs: number,
  ): void {
    breaker.failureCount += 1;
    if (breaker.failureCount >= threshold) {
      breaker.openUntil = Date.now() + resetMs;
      this.logger.warn(
        `Circuit breaker opened for ${resetMs}ms after ${breaker.failureCount} failures.`,
      );

      // Update metrics: circuit breaker opened
      const serviceName = breaker === this.nluCircuitBreaker ? 'nlu_model' : 'llm';
      this.nluMetrics.setCircuitBreakerState(serviceName, true);
    }
  }

  private recordSuccess(breaker: { failureCount: number; openUntil: number }): void {
    const wasOpen = breaker.openUntil > Date.now();
    breaker.failureCount = 0;
    breaker.openUntil = 0;

    // Update metrics: circuit breaker closed if it was open
    if (wasOpen) {
      const serviceName = breaker === this.nluCircuitBreaker ? 'nlu_model' : 'llm';
      this.nluMetrics.setCircuitBreakerState(serviceName as 'llm' | 'nlu_model', false);
    }
  }

  /**
   * Map emergency patterns to EmergencyKeyword DTOs
   */
  private mapEmergencyKeywords(patterns: EmergencyPattern[]): EmergencyKeyword[] {
    const keywords: EmergencyKeyword[] = [];

    for (const pattern of patterns) {
      // Add first keyword from each pattern (representative)
      if (pattern.keywords.length > 0) {
        keywords.push({
          keyword: pattern.keywords[0],
          category: pattern.category,
          severity: pattern.severity,
        });
      }
    }

    return keywords;
  }

  /**
   * Get escalation message for emergency
   */
  getEmergencyEscalationMessage(patterns: EmergencyPattern[]): string {
    if (patterns.length === 0) return '';

    // Return the most critical pattern's escalation message
    const criticalPattern = patterns.find((p) => p.severity === EmergencySeverity.CRITICAL);
    return (criticalPattern || patterns[0]).escalationMessage;
  }

  /**
   * Check if user message requires immediate escalation
   */
  requiresEscalation(classification: IntentClassification): boolean {
    return (
      classification.isEmergency && classification.emergencySeverity === EmergencySeverity.CRITICAL
    );
  }
}
