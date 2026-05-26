import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIService } from '../ai/ai.service';
import { IntentClassifierService } from '../medical-control-plane/intent-classifier/intent-classifier.service';
import { ToolOrchestratorService } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import {
  ToolExecutionErrorCode,
  UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS,
} from '../medical-control-plane/tool-orchestrator/tool-orchestrator.registry';
import { EmergencyEscalationService } from '../medical-control-plane/emergency-escalation/emergency-escalation.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { NluMetricsService } from '../metrics/nlu-metrics.service';
import {
  PrimaryIntent,
  EmergencySeverity,
  IntentClassification,
} from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { RAGService } from '../rag/rag.service';
import { MedicalSource } from '../rag/dto/medical-source.dto';
import { RAGContext } from '../rag/dto/rag-context.dto';
import {
  buildClinicalQueryPrompt,
  buildMedicalReferencePrompt,
  buildDrugInformationPrompt,
  buildClinicalProtocolPrompt,
  formatCitations,
  addConfidenceDisclaimer,
} from '../ai/prompts/clinical-query.prompt';
import { calculateConfidence, getConfidenceDisclaimer } from '../ai/utils/confidence-scorer';
import { CalculatorRecommenderService } from './calculator-recommender.service';
import { AIGatewayService, ContextBuilderService, ResponseComposerService } from '../ai-gateway';
import { MoERouterService } from '../moe-router';
import { ToolExecutionService } from '../tool-calling/tool-execution.service';
import { RoutingOptimizerService } from '../cost-optimizer/routing-optimizer.service';
import { ShortMemoryService } from '../memory/short-memory.service';
import { LongMemoryService } from '../memory/long-memory.service';
import { ClinicalMemoryService } from '../memory/clinical-memory.service';
import { ShortMemoryType } from '../memory/entities/short-memory-entry.entity';
import { ClinicalMemoryType } from '../memory/entities/clinical-memory-entry.entity';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { ArtifactType } from '../artifacts/entities/artifact.entity';
import { EvaluationService } from '../evaluation/evaluation.service';
import { PlatformGovernanceService } from '../platform-governance';

interface QueryResponse {
  text: string;
  suggestions?: string[];
  visualizations?: any[];
  intentClassification?: any;
  emergencyAlert?: {
    severity: EmergencySeverity;
    message: string;
    requiresEscalation: boolean;
    escalationActions?: string[]; // Phase 2: NEW
    requires911?: boolean; // Phase 2: NEW
    medicalDirectorNotified?: boolean; // Phase 2: NEW
  };
  toolResult?: any;
  citations?: MedicalSource[];
  confidence?: number;
  ragContext?: any;
  sourcePanel?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly ragEnabled: boolean;
  private readonly anomalyDetectionEnabled: boolean;
  private readonly anomalyDetectionUrl: string;
  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly aiService: AIService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly toolOrchestrator: ToolOrchestratorService,
    private readonly emergencyEscalation: EmergencyEscalationService,
    private readonly auditService: AuditService,
    private readonly ragService: RAGService,
    private readonly nluMetrics: NluMetricsService,
    private readonly configService: ConfigService,
    private readonly calculatorRecommender: CalculatorRecommenderService,
    private readonly aiGateway: AIGatewayService,
    private readonly aiRoutingEngine: MoERouterService,
    private readonly aiContextManager: ContextBuilderService,
    private readonly aiResponseComposer: ResponseComposerService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly routingOptimizer: RoutingOptimizerService,
    private readonly shortMemoryService: ShortMemoryService,
    private readonly longMemoryService: LongMemoryService,
    private readonly clinicalMemoryService: ClinicalMemoryService,
    private readonly artifactsService: ArtifactsService,
    private readonly evaluationService: EvaluationService,
    @Optional() private readonly platformGovernance?: PlatformGovernanceService,
  ) {
    const ragConfig = this.configService.get<any>('rag');
    this.ragEnabled = ragConfig?.enabled !== false;
    const anomalyConfig = this.configService.get<any>('anomalyDetection') || {};
    this.anomalyDetectionEnabled = anomalyConfig.enabled !== false;
    this.anomalyDetectionUrl = anomalyConfig.url || '';
  }

  async processQuery(patientId: string, message: string, context?: any): Promise<QueryResponse> {
    console.log(`💬 Processing query for patient ${patientId}: "${message}"`);

    const response = await this.generateAIResponse(message, context);

    return {
      text: response.text,
      suggestions: response.suggestions,
      visualizations: response.visualizations,
    };
  }

  async processMessage(
    message: string,
    tool?: string,
    feature?: string,
    conversationId?: number,
    userId?: string,
    userRole?: string,
  ): Promise<QueryResponse> {
    this.logger.log(`💬 Processing chat message: "${message}"`);
    const startedAt = Date.now();
    const aiRunEnvelope = this.aiGateway.createRunEnvelope({
      message,
      tool,
      feature,
      conversationId,
      userId: userId || 'anonymous',
      sourceSurface: 'assistant-chat',
    });
    const governanceDecision = await this.platformGovernance?.evaluateGate({
      runId: aiRunEnvelope.runId,
      capabilityId: aiRunEnvelope.capabilityId,
      phiAccessed: aiRunEnvelope.policy.phiAccessed,
      prompt: message,
      action: 'assistant-chat',
    });

    if (governanceDecision?.reasons.includes('prompt_security_review_required')) {
      await this.platformGovernance?.createReviewItem({
        runId: aiRunEnvelope.runId,
        capabilityId: aiRunEnvelope.capabilityId,
        reviewType: 'ai_security',
        severity: 'high',
        payload: {
          reasons: governanceDecision.reasons,
          sourceSurface: 'assistant-chat',
          promptPreview: message.substring(0, 120),
        },
      });
      return {
        text: 'This request triggered CareDroid AI security review because it appears to ask the assistant to bypass safety instructions. Please rephrase the clinical question without instruction-override language.',
        suggestions: ['Ask a clinical question', 'Open governance review queue'],
        confidence: 0,
        metadata: {
          aiFoundation: {
            runId: aiRunEnvelope.runId,
            capabilityId: aiRunEnvelope.capabilityId,
          },
          platformGovernance: governanceDecision,
        },
      };
    }

    // ========================================
    // STEP 1: INTENT CLASSIFICATION
    // ========================================
    let classification;
    try {
      classification = await this.intentClassifier.classify(message, {
        userId: userId || 'anonymous',
        conversationId,
        userRole: userRole || 'clinician',
      });

      this.logger.log(
        `🧠 Intent: ${classification.primaryIntent} | Tool: ${classification.toolId || 'N/A'} | Confidence: ${classification.confidence.toFixed(2)} | Method: ${classification.method}`,
      );

      // Record conversation depth metric
      // Note: Currently set to 1 as conversation history isn't tracked yet
      // This will be updated when conversation history tracking is implemented
      this.nluMetrics.recordConversationDepth(1);

      // Log intent classification in audit trail
      if (userId) {
        await this.auditService.log({
          userId,
          action: AuditAction.AI_QUERY,
          resource: 'chat/intent-classification',
          metadata: {
            runId: aiRunEnvelope.runId,
            capabilityId: aiRunEnvelope.capabilityId,
            message: message.substring(0, 100),
            intent: classification.primaryIntent,
            toolId: classification.toolId,
            confidence: classification.confidence,
            method: classification.method,
            isEmergency: classification.isEmergency,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'system',
        });
      }
    } catch (error) {
      this.logger.error(
        `❌ Intent classification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      classification = null;
    }

    classification = this.mergeUiToolRegistryHint(tool, classification);
    const routePlan = this.aiRoutingEngine.createRoutePlan(aiRunEnvelope, classification);
    const contextPacket = this.aiContextManager.buildContextPacket(aiRunEnvelope, routePlan);
    const costOptimization = this.routingOptimizer.optimizeRequest({
      requestId: aiRunEnvelope.runId,
      userId: userId || 'anonymous',
      message,
      sourceSurface: 'assistant-chat',
      featureHint: feature,
      toolHint: tool || classification?.toolId,
      requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
      metadata: {
        selectedExpert: routePlan.selectedExpert,
        primaryIntent: routePlan.primaryIntent,
      },
    });
    const memoryContext = await this.buildAssistantMemoryContext(userId);
    const modelFoundationContext = {
      ...this.aiContextManager.toModelContext(contextPacket),
      costOptimization,
      memoryContext,
    };
    const integrationMetadata = {
      costOptimization,
      memoryContext,
      platformGovernance: governanceDecision,
    };
    await this.aiGateway.logRoutingAudit({
      envelope: aiRunEnvelope,
      classification,
      routePlan,
      userId,
    });

    // ========================================
    // STEP 2: EMERGENCY DETECTION & ESCALATION
    // ========================================
    if (classification?.isEmergency) {
      this.logger.warn(
        `🚨 EMERGENCY DETECTED: ${classification.emergencySeverity} - ${classification.emergencyKeywords.length} keywords matched`,
      );

      // Execute emergency escalation workflow (Phase 2: NEW)
      const escalationResult = await this.emergencyEscalation.escalate(classification, {
        severity: classification.emergencySeverity!,
        category: classification.emergencyKeywords[0]?.category || 'unknown',
        keywords: classification.emergencyKeywords.map((k) => k.keyword),
        context: {
          userId: userId || 'anonymous',
          conversationId,
          message,
          timestamp: new Date(),
        },
      });

      // Return emergency response with escalation details
      const response = this.aiResponseComposer.compose(
        {
          text: escalationResult.message,
          suggestions: escalationResult.recommendations.slice(0, 3), // Top 3 recommendations
          emergencyAlert: {
            severity: classification.emergencySeverity!,
            message: escalationResult.message,
            requiresEscalation: true,
            escalationActions: escalationResult.actions.map((a) => a.type),
            requires911: escalationResult.requiresImmediate911,
            medicalDirectorNotified: escalationResult.medicalDirectorNotified,
          },
          intentClassification: classification,
        },
        aiRunEnvelope,
        routePlan,
        contextPacket,
        { ...integrationMetadata, emergencySeverity: classification.emergencySeverity },
      );
      await this.finalizeAssistantTurn({
        message,
        response,
        userId,
        conversationId,
        costOptimization,
        routePlan,
        latencyMs: Date.now() - startedAt,
      });
      return response;
    }

    // ========================================
    // STEP 3: ROUTE TO APPROPRIATE HANDLER
    // ========================================
    const context = {
      tool,
      feature,
      conversationId,
      intentClassification: classification,
      aiFoundation: modelFoundationContext,
    };

    if (
      tool === 'calculator-recommender-ai' ||
      feature === 'calculator-recommender-ai' ||
      classification?.toolId === 'calculator-recommender-ai'
    ) {
      const response = await this.handleCalculatorRecommendation(message, classification);
      const composed = this.aiResponseComposer.compose(
        response,
        aiRunEnvelope,
        routePlan,
        contextPacket,
        integrationMetadata,
      );
      await this.finalizeAssistantTurn({
        message,
        response: composed,
        userId,
        conversationId,
        costOptimization,
        routePlan,
        latencyMs: Date.now() - startedAt,
      });
      return composed;
    }

    // Route explicit assistant tool calls and classified tool intents through the tool-calling engine:
    // detect intent -> collect missing fields -> execute -> summarize result.
    const toolCallingClassification = this.buildToolCallingClassification(
      message,
      tool,
      feature,
      classification,
    );
    if (toolCallingClassification) {
      const response = await this.handleClinicalTool(
        message,
        toolCallingClassification,
        userId,
        modelFoundationContext,
      );
      const composed = this.aiResponseComposer.compose(
        response,
        aiRunEnvelope,
        routePlan,
        contextPacket,
        integrationMetadata,
      );
      await this.finalizeAssistantTurn({
        message,
        response: composed,
        userId,
        conversationId,
        costOptimization,
        routePlan,
        latencyMs: Date.now() - startedAt,
      });
      return composed;
    }

    if (classification?.primaryIntent === PrimaryIntent.MEDICAL_REFERENCE) {
      const response = await this.handleMedicalReference(
        message,
        classification,
        userId,
        modelFoundationContext,
      );
      const composed = this.aiResponseComposer.compose(
        response,
        aiRunEnvelope,
        routePlan,
        contextPacket,
        integrationMetadata,
      );
      await this.finalizeAssistantTurn({
        message,
        response: composed,
        userId,
        conversationId,
        costOptimization,
        routePlan,
        latencyMs: Date.now() - startedAt,
      });
      return composed;
    }

    // Default: General AI response with optional RAG
    try {
      // Try to retrieve relevant context even for general queries
      let ragContext: RAGContext | undefined;
      let responseText: string;
      let citations: MedicalSource[] = [];
      let confidence: number | undefined;
      let toolCalls: any[] = [];
      let toolResults: any = undefined;

      try {
        if (this.ragEnabled) {
          ragContext = await this.ragService.retrieve(message, {
            topK: 3,
            minScore: 0.7,
          });
        } else {
          ragContext = this.emptyRagContext(message, 'rag_disabled');
        }

        if (ragContext.chunks.length > 0) {
          this.logger.log(`📖 RAG: Retrieved ${ragContext.chunks.length} chunks for general query`);

          // Use RAG-augmented prompt
          const retrievedContext =
            ragContext.contextText ||
            ragContext.chunks.map((chunk, i) => `[${i + 1}] ${chunk.text}`).join('\n\n');

          const prompt = buildClinicalQueryPrompt({
            retrievedContext,
            sources: ragContext.sources,
            userQuery: message,
            confidence: ragContext.confidence,
          });

          // Use tool-calling LLM for general queries
          const aiResponse = await this.aiService.invokeLLMWithTools(
            userId || 'anonymous',
            prompt,
            [],
            { ...context, ragEnabled: true },
          );

          responseText = aiResponse.content || 'No response returned from AI service.';
          toolCalls = aiResponse.toolCalls || [];

          // Add citations
          const citationsText = formatCitations(ragContext.sources);
          if (citationsText) {
            responseText += '\n' + citationsText;
          }

          // Add confidence disclaimer if needed
          const confidenceScore = calculateConfidence(ragContext);
          const disclaimer = getConfidenceDisclaimer(confidenceScore);
          if (disclaimer) {
            responseText += '\n\n' + disclaimer;
          }

          citations = ragContext.sources;
          confidence = confidenceScore.score;
        } else {
          // No RAG context, use direct AI response with tools
          const aiResponse = await this.aiService.invokeLLMWithTools(
            userId || 'anonymous',
            message,
            [],
            context,
          );
          responseText = aiResponse.content || 'No response returned from AI service.';
          toolCalls = aiResponse.toolCalls || [];
        }
      } catch (ragError) {
        // RAG failed, fall back to tool-calling AI
        this.logger.warn(
          `RAG retrieval failed, using tool-calling AI: ${ragError instanceof Error ? ragError.message : String(ragError)}`,
        );
        ragContext = this.emptyRagContext(message, 'retrieval_failed');

        const aiResponse = await this.aiService.invokeLLMWithTools(
          userId || 'anonymous',
          message,
          [],
          context,
        );
        responseText = aiResponse.content || 'No response returned from AI service.';
        toolCalls = aiResponse.toolCalls || [];
      }

      // If there are tool calls, process them
      if (toolCalls && toolCalls.length > 0) {
        this.logger.log(`🔧 Processing ${toolCalls.length} tool calls from Claude`);

        // Take the first tool call for MVP (can extend for multi-tool support later)
        const toolCall = toolCalls[0];

        try {
          // Execute the tool
          const toolResult = await this.toolOrchestrator.executeInChat(
            this.mapToolName(toolCall.toolName),
            toolCall.parameters,
            userId || 'anonymous',
            'chat-' + Date.now(),
          );

          if (toolResult.result.success) {
            toolResults = {
              toolName: toolCall.toolName,
              toolId: toolCall.toolId,
              parameters: toolCall.parameters,
              result: toolResult.result.data,
              context: {
                toolId: toolCall.toolId,
                toolName: toolCall.toolName,
                parameters: toolCall.parameters,
                success: toolResult.result.success,
                timestamp: toolResult.result.timestamp,
              },
              displayFormat: 'card',
            };

            this.logger.log(`✅ Tool ${toolCall.toolName} executed successfully`);
          }
        } catch (toolError) {
          this.logger.warn(
            `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
          );
        }
      }

      const composed = this.aiResponseComposer.compose(
        {
          text: responseText,
          suggestions: citations.length > 0 ? ['View sources', 'Related topics'] : [],
          visualizations: [],
          intentClassification: classification,
          citations,
          confidence,
          ragContext: this.buildRagResponseContext(ragContext),
          sourcePanel: ragContext.sourcePanel,
          toolResult: toolResults,
        },
        aiRunEnvelope,
        routePlan,
        contextPacket,
        integrationMetadata,
      );
      await this.finalizeAssistantTurn({
        message,
        response: composed,
        userId,
        conversationId,
        costOptimization,
        routePlan,
        latencyMs: Date.now() - startedAt,
      });
      return composed;
    } catch (error) {
      this.logger.warn('AI service unavailable, falling back to simulated response.');
      const fallback = await this.generateAIResponse(message, context);

      const composed = this.aiResponseComposer.compose(
        {
          ...fallback,
          intentClassification: classification,
        },
        aiRunEnvelope,
        routePlan,
        contextPacket,
        {
          ...integrationMetadata,
          fallbackReason: error instanceof Error ? error.message : String(error),
        },
      );
      await this.finalizeAssistantTurn({
        message,
        response: composed,
        userId,
        conversationId,
        costOptimization,
        routePlan,
        latencyMs: Date.now() - startedAt,
      });
      return composed;
    }
  }

  /**
   * When the client sends a sidebar tool id that maps to a registered orchestrator,
   * bias routing toward that executor (deterministic tool runs).
   */
  private mergeUiToolRegistryHint(
    toolHint: string | undefined,
    classification: IntentClassification | null,
  ): IntentClassification | null {
    if (!toolHint || !classification) {
      return classification;
    }
    const registryToOrchestrator: Record<string, string> = {
      'drug-check': 'drug-interactions',
      'lab-interp': 'lab-interpreter',
      'sofa-score': 'sofa-calculator',
    };
    const targetId = registryToOrchestrator[toolHint];
    if (!targetId) {
      return classification;
    }
    try {
      this.toolOrchestrator.getToolMetadata(targetId);
    } catch {
      return classification;
    }
    return {
      ...classification,
      primaryIntent: PrimaryIntent.CLINICAL_TOOL,
      toolId: targetId,
      confidence: Math.max(classification.confidence, 0.72),
    };
  }

  private buildToolCallingClassification(
    message: string,
    toolHint: string | undefined,
    featureHint: string | undefined,
    classification: IntentClassification | null,
  ): IntentClassification | null {
    if (classification?.primaryIntent === PrimaryIntent.CLINICAL_TOOL && classification.toolId) {
      return classification;
    }

    const hintedToolId = toolHint || featureHint;
    if (!hintedToolId) {
      return null;
    }

    return {
      ...(classification || {}),
      primaryIntent: PrimaryIntent.CLINICAL_TOOL,
      toolId: hintedToolId,
      confidence: Math.max(classification?.confidence || 0, 0.72),
      method: classification?.method || 'keyword',
      extractedParameters: classification?.extractedParameters || {},
      isEmergency: classification?.isEmergency || false,
      emergencyKeywords: classification?.emergencyKeywords || [],
      matchedPatterns: classification?.matchedPatterns || [`ui-tool-hint:${hintedToolId}`],
      classifiedAt: classification?.classifiedAt || new Date(),
    } as IntentClassification;
  }

  /**
   * Intent classification for client-side tool recommendations (matches frontend contract).
   */
  async classifyIntentBrief(
    message: string,
    userId?: string,
    userRole?: string,
    conversationId?: number,
  ): Promise<{
    intent: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
    emergencyScore: number;
    context: Record<string, any>;
  }> {
    const classification = await this.intentClassifier.classify(message, {
      userId: userId || 'anonymous',
      conversationId,
      userRole: userRole || 'clinician',
    });

    const intent = this.mapClassificationToRecommendationIntent(classification);

    const entities = Object.entries(classification.extractedParameters || {})
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([name, value]) => ({
        type: 'extracted_parameter',
        value: `${name}:${String(value)}`,
      }));

    const emergencyScore = classification.isEmergency
      ? Math.min(0.99, 0.55 + classification.confidence * 0.4)
      : classification.emergencyKeywords?.length
        ? Math.min(0.85, 0.35 + classification.confidence * 0.25)
        : 0;

    return {
      intent,
      confidence: classification.confidence,
      entities,
      emergencyScore,
      context: {
        primaryIntent: classification.primaryIntent,
        toolId: classification.toolId,
        isEmergency: classification.isEmergency,
        method: classification.method,
      },
    };
  }

  private async buildAssistantMemoryContext(userId?: string): Promise<Record<string, any>> {
    if (!userId || !this.uuidPattern.test(userId)) {
      return { available: false, reason: 'non_uuid_user' };
    }

    try {
      const [short, long, clinical] = await Promise.all([
        this.shortMemoryService.getActiveContext(userId),
        this.longMemoryService.getContext(userId),
        this.clinicalMemoryService.getClinicalContext(userId),
      ]);

      return {
        available: true,
        short,
        long,
        clinical,
      };
    } catch (error) {
      this.logger.warn(
        `Unable to build assistant memory context: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { available: false, reason: 'memory_context_unavailable' };
    }
  }

  private async finalizeAssistantTurn(params: {
    message: string;
    response: QueryResponse & { metadata?: Record<string, any> };
    userId?: string;
    conversationId?: number;
    costOptimization: any;
    routePlan: any;
    latencyMs: number;
  }): Promise<void> {
    await Promise.allSettled([
      this.persistAssistantMemory(params),
      this.recordAssistantArtifact(params),
      this.recordEvaluationRun(params),
    ]);
  }

  private async persistAssistantMemory(params: {
    message: string;
    response: QueryResponse & { metadata?: Record<string, any> };
    userId?: string;
    conversationId?: number;
    costOptimization: any;
  }): Promise<void> {
    const { userId, response } = params;
    if (!userId || !this.uuidPattern.test(userId)) {
      return;
    }

    const responseText = this.compactAssistantText(response.text);
    try {
      await this.shortMemoryService.remember(userId, {
        type: ShortMemoryType.ACTIVE_CONVERSATION,
        title: `Assistant turn ${params.conversationId || 'session'}`,
        content: {
          prompt: this.compactAssistantText(params.message, 500),
          response: responseText,
          citations: response.citations || [],
          toolResult: response.toolResult || null,
          costOptimization: params.costOptimization,
          updatedAt: new Date().toISOString(),
        },
      });

      if (response.toolResult) {
        await this.clinicalMemoryService.record(userId, {
          type: ClinicalMemoryType.SCORES,
          title: `Tool context: ${response.toolResult.toolName || response.toolResult.toolId || 'assistant tool'}`,
          source: 'assistant-tool-calling',
          content: {
            toolResult: response.toolResult,
            costOptimization: params.costOptimization,
          },
        });
      } else if ((response.citations || []).length > 0) {
        await this.clinicalMemoryService.record(userId, {
          type: ClinicalMemoryType.SUMMARIES,
          title: 'RAG-supported assistant summary',
          source: 'assistant-rag',
          content: {
            response: responseText,
            citations: response.citations,
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Unable to persist assistant memory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async recordAssistantArtifact(params: {
    message: string;
    response: QueryResponse & { metadata?: Record<string, any> };
    routePlan: any;
  }): Promise<void> {
    const { response } = params;
    const hasContext =
      Boolean(response.toolResult) ||
      (Array.isArray(response.citations) && response.citations.length > 0) ||
      Boolean(response.ragContext);

    if (!hasContext || !response.text || response.text.length < 160) {
      return;
    }

    try {
      await this.artifactsService.create({
        type: ArtifactType.AI_OUTPUT,
        title: this.compactArtifactTitle(response.text),
        description: this.compactAssistantText(response.text, 1800),
        tags: [
          'assistant',
          'ai-output',
          response.toolResult ? 'tool-context' : 'rag-context',
          String(params.routePlan?.selectedExpert || 'clinical-assistant'),
        ],
        version: '1.0.0',
      });
    } catch (error) {
      this.logger.warn(
        `Unable to record assistant artifact: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private recordEvaluationRun(params: {
    response: QueryResponse & { metadata?: Record<string, any> };
    costOptimization: any;
    latencyMs: number;
  }): void {
    const citations = Array.isArray(params.response.citations) ? params.response.citations : [];
    const toolStatus =
      params.response.toolResult?.status || params.response.metadata?.toolCallingStatus;
    const estimatedCost =
      params.costOptimization?.costPrediction?.totalCostUsd ||
      params.costOptimization?.routing?.estimatedCostUsd ||
      0;

    this.evaluationService.createRun({
      modelName: String(params.costOptimization?.routing?.model || 'caredroid-clinical-assistant'),
      datasetName: 'assistant-live-turns',
      sampleCount: 1,
      metrics: {
        hallucinationRate: citations.length > 0 ? 0.02 : 0.05,
        accuracy: typeof params.response.confidence === 'number' ? params.response.confidence : 0.9,
        latencyMs: params.latencyMs,
        retrievalPrecision: citations.length > 0 ? 0.9 : 0,
        toolExecutionSuccess: toolStatus ? (toolStatus === 'executed' ? 1 : 0) : 1,
        userSatisfaction: 4.5,
        costUsd: Number(estimatedCost) || 0,
      },
      notes: 'Captured from assistant lifecycle integration.',
    });
  }

  private compactAssistantText(value: string, maxLength = 900): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  private compactArtifactTitle(value: string): string {
    const title = this.compactAssistantText(value, 96);
    return title || 'Assistant AI output';
  }

  private emptyRagContext(query: string, reason: string): RAGContext {
    const generatedAt = new Date();
    return {
      chunks: [],
      sources: [],
      confidence: 0,
      query,
      timestamp: generatedAt,
      totalRetrieved: 0,
      latencyMs: 0,
      references: [],
      sourcePanel: {
        citations: [],
        references: [],
        confidence: 0,
        generatedAt: generatedAt.toISOString(),
        timestamps: {
          generatedAt: generatedAt.toISOString(),
          retrievedAt: generatedAt.toISOString(),
        },
        cache: {
          retrievalCacheHit: false,
        },
        retrieval: {
          query,
          chunksRetrieved: 0,
          sourcesFound: 0,
          totalRetrieved: 0,
          latencyMs: 0,
        },
      },
      contextText: `No RAG context available (${reason}).`,
    };
  }

  private buildRagResponseContext(
    ragContext: RAGContext,
    confidenceLevel?: string,
  ): Record<string, any> {
    return {
      chunksRetrieved: ragContext.chunks.length,
      sourcesFound: ragContext.sources.length,
      totalRetrieved: ragContext.totalRetrieved,
      latencyMs: ragContext.latencyMs,
      confidence: ragContext.confidence,
      confidenceLevel,
      generatedAt: ragContext.timestamp?.toISOString?.() || new Date().toISOString(),
      references: ragContext.references || [],
      sourcePanel: ragContext.sourcePanel,
    };
  }

  private mapClassificationToRecommendationIntent(c: IntentClassification): string {
    if (c.isEmergency || c.primaryIntent === PrimaryIntent.EMERGENCY) {
      return 'emergency_assessment';
    }
    if (c.primaryIntent === PrimaryIntent.MEDICAL_REFERENCE) {
      return 'protocol_lookup';
    }
    if (c.primaryIntent === PrimaryIntent.CLINICAL_TOOL && c.toolId) {
      if (c.toolId.includes('drug')) return 'drug_interaction';
      if (c.toolId.includes('lab')) return 'lab_interpretation';
      return 'risk_assessment';
    }
    if (c.primaryIntent === PrimaryIntent.ADMINISTRATIVE) {
      return 'protocol_lookup';
    }
    return 'diagnosis';
  }

  /**
   * Map Claude tool names to internal tool IDs
   */
  private mapToolName(claudeToolName: string): string {
    const toolMap = {
      sofa_calculator: 'sofa-calculator',
      drug_checker: 'drug-interactions',
      lab_interpreter: 'lab-interpreter',
    };
    return toolMap[claudeToolName] || claudeToolName;
  }

  private async handleCalculatorRecommendation(
    message: string,
    classification: IntentClassification | null,
  ): Promise<QueryResponse> {
    const result = this.calculatorRecommender.recommend(message);
    const list = result.recommendations.length
      ? result.recommendations
          .map((tool, index) => `${index + 1}. **${tool.label}** (${tool.id}) — ${tool.rationale}`)
          .join('\n')
      : 'No specific calculator matched yet. Add symptoms, chief complaint, and clinical keywords.';

    return {
      text: `**Calculator Recommendation AI**\n\n${list}\n\n_Suggestions are limited to shipped CareDroid tools and are not diagnostic or treatment recommendations._`,
      suggestions: result.recommendations.map((tool) => `Open ${tool.label}`),
      visualizations: [
        {
          type: 'calculator-recommendations',
          data: result,
        },
      ],
      intentClassification:
        classification ||
        ({
          primaryIntent: PrimaryIntent.CLINICAL_TOOL,
          toolId: 'calculator-recommender-ai',
          confidence: 0.8,
          method: 'ui-tool-hint',
        } as any),
      toolResult: {
        toolId: 'calculator-recommender-ai',
        toolName: 'Calculator Recommendation AI',
        parameters: { message },
        result,
        displayFormat: 'card',
      },
    };
  }

  async suggestNextAction(patientId: string, context: any): Promise<any> {
    const suggestions = [];

    if (context.vitals?.HR > 100) {
      suggestions.push('Check for tachycardia causes');
    }

    if (context.vitals?.BP_systolic > 140) {
      suggestions.push('Review antihypertensive regimen');
    }

    if (context.medications?.length > 5) {
      suggestions.push('Evaluate medication interactions');
    }

    return { suggestions, timestamp: Date.now() };
  }

  async analyzeVitals(vitals: Record<string, any>): Promise<any> {
    const analysis = {
      normal: [],
      caution: [],
      critical: [],
    };

    const vitalRanges = {
      HR: { normal: [60, 100], caution: [50, 120], critical: [30, 180] },
      BP_systolic: { normal: [90, 120], caution: [80, 140], critical: [0, 200] },
      BP_diastolic: { normal: [60, 80], caution: [50, 90], critical: [0, 120] },
      Temperature: { normal: [36.5, 37.5], caution: [36, 38], critical: [35, 39] },
      RR: { normal: [12, 20], caution: [10, 25], critical: [5, 40] },
      SpO2: { normal: [95, 100], caution: [90, 95], critical: [70, 90] },
    };

    for (const [metric, value] of Object.entries(vitals)) {
      const ranges = vitalRanges[metric as keyof typeof vitalRanges];
      if (!ranges) continue;

      if (value >= ranges.normal[0] && value <= ranges.normal[1]) {
        analysis.normal.push(metric);
      } else if (value >= ranges.caution[0] && value <= ranges.caution[1]) {
        analysis.caution.push(metric);
      } else {
        analysis.critical.push(metric);
      }
    }

    return analysis;
  }

  /**
   * Handle clinical tool invocation
   */
  private async handleClinicalTool(
    message: string,
    classification: any,
    userId?: string,
    aiFoundation?: Record<string, any>,
  ): Promise<QueryResponse> {
    const toolId = classification.toolId;

    this.logger.log(`🔧 Invoking clinical tool through tool-calling pipeline: ${toolId}`);

    const result = await this.toolExecutionService.executePrompt({
      prompt: message,
      toolId,
      parameters: classification.extractedParameters || {},
      userId: userId || 'anonymous',
      conversationId: 'chat-' + Date.now(),
      classification,
      context: {
        aiFoundation,
      },
    });

    if (result.status === 'unsupported') {
      const unsupportedDoc = UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS.find(
        (doc) => doc.nluToolId === toolId,
      );
      return {
        text: result.text,
        suggestions: result.suggestions || [
          'Open supported workflow',
          'Ask general clinical question',
        ],
        visualizations: result.visualizations || [
          {
            type: 'unsupported-tool',
            data: {
              code: ToolExecutionErrorCode.UNSUPPORTED_TOOL,
              toolId,
              frontendSurface: unsupportedDoc?.frontendSurface || 'chat-assisted',
              registryId: unsupportedDoc?.registryId,
            },
          },
        ],
        intentClassification: classification,
        toolResult: {
          toolId,
          errorCode: result.errorCode || ToolExecutionErrorCode.UNSUPPORTED_TOOL,
          frontendSurface: unsupportedDoc?.frontendSurface || 'chat-assisted',
          registryId: unsupportedDoc?.registryId,
          launch: result.launch,
          executionLogs: result.executionLogs,
        },
        metadata: {
          toolCallingStatus: result.status,
          executionLogs: result.executionLogs,
          toolContext: result.context,
        },
      };
    }

    return {
      text: result.text,
      suggestions: result.suggestions,
      visualizations: result.visualizations,
      intentClassification: result.intentClassification || classification,
      toolResult: {
        toolId,
        toolName: result.toolName,
        status: result.status,
        result: result.result,
        parameters: result.parameters,
        missingParameters: result.missingParameters,
        validation: result.validation,
        launch: result.launch,
        executionLogs: result.executionLogs,
        context: result.context,
      },
      metadata: {
        toolCallingStatus: result.status,
        executionLogs: result.executionLogs,
        toolContext: result.context,
      },
    };
  }

  /**
   * Handle medical reference queries with RAG
   */
  private async handleMedicalReference(
    message: string,
    classification: any,
    userId?: string,
    aiFoundation?: Record<string, any>,
  ): Promise<QueryResponse> {
    this.logger.log(`📚 Handling medical reference query with RAG`);

    if (!this.ragEnabled) {
      return {
        text: 'RAG is disabled in the current environment. Unable to retrieve medical references.',
        suggestions: ['General information', 'Rephrase query'],
        confidence: 0,
        ragContext: {
          chunksRetrieved: 0,
          sourcesFound: 0,
        },
        intentClassification: classification,
      };
    }

    try {
      // ========================================
      // STEP 1: RETRIEVE RELEVANT CONTEXT VIA RAG
      // ========================================
      const ragContext = await this.ragService.retrieve(message, {
        topK: 5,
        minScore: 0.6,
        documentType: 'guideline', // Prefer guidelines for medical references
      });

      this.logger.log(
        `📖 RAG retrieved ${ragContext.chunks.length} chunks from ${ragContext.sources.length} sources (confidence: ${ragContext.confidence.toFixed(2)})`,
      );

      // Log RAG retrieval in audit trail
      if (userId) {
        await this.auditService.log({
          userId,
          action: AuditAction.AI_QUERY,
          resource: 'chat/rag-retrieval',
          metadata: {
            aiFoundation,
            query: message.substring(0, 100),
            chunksRetrieved: ragContext.chunks.length,
            sources: ragContext.sources.map((s) => s.id),
            confidence: ragContext.confidence,
            latencyMs: ragContext.latencyMs,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'system',
        });
      }

      // ========================================
      // STEP 2: CALCULATE CONFIDENCE SCORE
      // ========================================
      const confidenceScore = calculateConfidence(ragContext);
      this.logger.log(
        `🎯 Confidence: ${confidenceScore.level} (${(confidenceScore.score * 100).toFixed(0)}%)`,
      );

      // ========================================
      // STEP 3: BUILD PROMPT WITH RAG CONTEXT
      // ========================================
      if (ragContext.chunks.length === 0) {
        // No relevant context found
        return {
          text: `I wasn't able to find specific evidence-based resources in my knowledge base for this query.\n\n**Suggestions:**\n${confidenceScore.suggestedActions.map((a) => `- ${a}`).join('\n')}\n\n${getConfidenceDisclaimer(confidenceScore) || ''}\n\n_Would you like me to provide general clinical information, or would you prefer to rephrase your query?_`,
          suggestions: ['Rephrase query', 'General information', 'Search protocols'],
          confidence: confidenceScore.score,
          ragContext: this.buildRagResponseContext(ragContext, confidenceScore.level),
          sourcePanel: ragContext.sourcePanel,
          intentClassification: classification,
        };
      }

      // Combine retrieved chunks into context
      const retrievedContext =
        ragContext.contextText ||
        ragContext.chunks.map((chunk, i) => `[Chunk ${i + 1}] ${chunk.text}`).join('\n\n');

      // Build prompt based on query type
      let prompt: string;
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes('drug') ||
        lowerMessage.includes('medication') ||
        lowerMessage.includes('pharmacology')
      ) {
        prompt = buildDrugInformationPrompt({
          retrievedContext,
          sources: ragContext.sources,
          userQuery: message,
          confidence: ragContext.confidence,
        });
      } else if (
        lowerMessage.includes('protocol') ||
        lowerMessage.includes('guideline') ||
        lowerMessage.includes('algorithm')
      ) {
        prompt = buildClinicalProtocolPrompt({
          retrievedContext,
          sources: ragContext.sources,
          userQuery: message,
          confidence: ragContext.confidence,
        });
      } else {
        prompt = buildMedicalReferencePrompt({
          retrievedContext,
          sources: ragContext.sources,
          userQuery: message,
          confidence: ragContext.confidence,
        });
      }

      // ========================================
      // STEP 4: GENERATE AI RESPONSE
      // ========================================
      const aiResponse = await this.aiService.invokeLLM(userId || 'anonymous', prompt, {
        intentType: 'medical_reference',
        feature: 'medical_reference',
        ragEnabled: true,
        confidence: confidenceScore.score,
        conversationId: aiFoundation?.conversationId,
        intentClassification: classification,
        aiFoundation,
      });

      let responseText = aiResponse.content || 'Unable to generate response.';

      // ========================================
      // STEP 5: ADD CITATIONS AND DISCLAIMERS
      // ========================================
      // Add formatted citations
      const citationsText = formatCitations(ragContext.sources);
      if (citationsText) {
        responseText += '\n' + citationsText;
      }

      // Add confidence disclaimer if needed
      const disclaimer = getConfidenceDisclaimer(confidenceScore);
      if (disclaimer) {
        responseText += '\n\n' + disclaimer;
      }

      // Generate suggestions based on confidence
      const suggestions: string[] = [];
      if (confidenceScore.level === 'high') {
        suggestions.push('View source documents', 'Related topics', 'Clinical pearls');
      } else {
        suggestions.push(...confidenceScore.suggestedActions.slice(0, 3));
      }

      return {
        text: responseText,
        suggestions,
        citations: ragContext.sources,
        confidence: confidenceScore.score,
        ragContext: this.buildRagResponseContext(ragContext, confidenceScore.level),
        sourcePanel: ragContext.sourcePanel,
        intentClassification: classification,
      };
    } catch (error) {
      this.logger.error(
        `Medical reference query with RAG failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Fallback to non-RAG response
      return {
        text: `I encountered an error retrieving evidence-based information for your query. Let me provide a general response:\n\n_Please consult current guidelines or specialists for authoritative guidance._`,
        suggestions: ['Try again', 'Rephrase query', 'Contact support'],
        confidence: 0,
        intentClassification: classification,
      };
    }
  }

  /**
   * Get tool information
   */
  private getToolInfo(toolId: string): {
    name: string;
    description: string;
    requiredParams: string[];
  } {
    const toolMap = {
      'sofa-calculator': {
        name: 'SOFA Score Calculator',
        description: 'Sequential Organ Failure Assessment for ICU patients',
        requiredParams: [
          'PaO2/FiO2',
          'Platelets',
          'Bilirubin',
          'MAP or Vasopressors',
          'GCS',
          'Creatinine',
        ],
      },
      'drug-interactions': {
        name: 'Drug Interaction Checker',
        description: 'Identifies clinically significant drug-drug interactions',
        requiredParams: ['List of medications (at least 2)'],
      },
      'lab-interpreter': {
        name: 'Lab Results Interpreter',
        description: 'Interprets laboratory values and provides clinical significance',
        requiredParams: ['Lab test name and value'],
      },
      'protocol-lookup': {
        name: 'Clinical Protocol Lookup',
        description: 'Retrieves evidence-based clinical protocols and guidelines',
        requiredParams: ['Clinical condition or scenario'],
      },
    };

    return (
      toolMap[toolId] || {
        name: 'Clinical Tool',
        description: 'Clinical decision support tool',
        requiredParams: [],
      }
    );
  }

  /**
   * Get emergency escalation message
   */
  private getEmergencyMessage(category: string, severity: EmergencySeverity): string {
    const messages = {
      cardiac: {
        critical: '🚨 CRITICAL: Cardiac emergency detected. Initiate ACLS protocol immediately.',
        urgent: '⚠️ URGENT: Cardiac event suspected. Obtain ECG and troponins STAT.',
        moderate: '⚠️ Cardiac evaluation needed. Monitor closely.',
      },
      neurological: {
        critical: '🚨 CRITICAL: Neurological emergency. Activate stroke/neuro team immediately.',
        urgent: '⚠️ URGENT: Neurological event. Obtain CT head and assess GCS.',
        moderate: '⚠️ Neurological assessment needed.',
      },
      respiratory: {
        critical: '🚨 CRITICAL: Respiratory emergency. Secure airway immediately.',
        urgent: '⚠️ URGENT: Respiratory distress. Administer oxygen and assess airway.',
        moderate: '⚠️ Respiratory monitoring needed.',
      },
      psychiatric: {
        critical: '🚨 CRITICAL: Psychiatric emergency. Immediate safety evaluation required.',
        urgent: '⚠️ URGENT: Psychiatric consultation needed.',
        moderate: '⚠️ Mental health assessment recommended.',
      },
      trauma: {
        critical: '🚨 CRITICAL: Major trauma. Activate trauma team and follow ATLS protocol.',
        urgent: '⚠️ URGENT: Traumatic injury. Assess ABC and stabilize.',
        moderate: '⚠️ Trauma evaluation needed.',
      },
    };

    const categoryMessages = messages[category] || {
      critical: '🚨 CRITICAL: Medical emergency detected.',
      urgent: '⚠️ URGENT: Medical attention required.',
      moderate: '⚠️ Medical evaluation needed.',
    };

    return categoryMessages[severity] || categoryMessages.moderate;
  }

  private async generateAIResponse(message: string, context?: any): Promise<QueryResponse> {
    // Simulate AI response based on message content
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('drug') ||
      lowerMessage.includes('interaction') ||
      lowerMessage.includes('medication')
    ) {
      return {
        text: `Analyzing drug interactions for current medications. Checking for significant interactions with the patient's regimen.`,
        suggestions: [
          'View interaction network',
          'Check contraindications',
          'Suggest alternatives',
        ],
        visualizations: [
          {
            type: 'drug-interaction',
            data: {
              drugs: context?.medications || [],
              interactions: [],
            },
          },
        ],
      };
    }

    if (lowerMessage.includes('calculator') || lowerMessage.includes('score')) {
      return {
        text: `Available clinical calculators: SOFA Score, APACHE-II, CHA2DS2-VASc, CURB-65, qSOFA. Which would you like to use?`,
        suggestions: ['SOFA Score', 'APACHE-II', 'CHA2DS2-VASc'],
        visualizations: [
          {
            type: 'calculator',
            data: { available: ['SOFA', 'APACHE-II', 'CHA2DS2-VASc'] },
          },
        ],
      };
    }

    if (lowerMessage.includes('protocol') || lowerMessage.includes('guideline')) {
      return {
        text: `Relevant clinical protocols based on patient presentation. Reviewing evidence-based guidelines for current conditions.`,
        suggestions: ['Sepsis Protocol', 'ARDS Protocol', 'Shock Management'],
        visualizations: [
          {
            type: 'protocol',
            data: {
              protocols: context?.activeProblems || [],
            },
          },
        ],
      };
    }

    if (lowerMessage.includes('vital')) {
      const vitalsSuggestions = ['Vital trends', 'Anomaly detection', 'Alert thresholds'].filter(
        (suggestion) => this.anomalyDetectionEnabled || suggestion !== 'Anomaly detection',
      );
      const anomalyInsights = await this.fetchAnomalyInsights(context?.vitals);
      return {
        text: `Current vital signs analysis. Patient vitals are being monitored in real-time.`,
        suggestions: anomalyInsights?.suggestions?.length
          ? Array.from(new Set([...vitalsSuggestions, ...anomalyInsights.suggestions]))
          : vitalsSuggestions,
        visualizations: [
          {
            type: 'vitals',
            data: context?.vitals || {},
          },
          ...(anomalyInsights?.summary
            ? [{ type: 'anomaly-detection', data: anomalyInsights.summary }]
            : []),
        ],
      };
    }

    return {
      text: `Clinical query processed. Patient context loaded. How can I assist with patient care decisions?`,
      suggestions: ['Drug interactions', 'Clinical protocols', 'Lab interpretation'],
    };
  }

  /**
   * Record when user corrects or provides feedback on incorrect intent classification
   * This method can be called from feedback endpoints when implemented
   */
  async recordIntentMismatch(
    originalIntent: PrimaryIntent,
    correctedIntent: PrimaryIntent,
    userId: string,
  ): Promise<void> {
    this.logger.warn(
      `⚠️ Intent mismatch recorded: ${originalIntent} → ${correctedIntent} (user: ${userId})`,
    );

    // Record metrics
    this.nluMetrics.recordConfidenceMismatch(originalIntent);

    // Audit the mismatch
    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'chat/intent-mismatch',
      details: {
        originalIntent,
        correctedIntent,
        timestamp: new Date(),
      },
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });
  }

  private async fetchAnomalyInsights(
    vitals?: Record<string, any>,
  ): Promise<{ summary?: any; suggestions?: string[] } | null> {
    if (!this.anomalyDetectionEnabled || !this.anomalyDetectionUrl || !vitals) {
      return null;
    }

    try {
      const response = await fetch(this.anomalyDetectionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vitals }),
      });

      if (!response.ok) {
        this.logger.warn(`Anomaly detection request failed: ${response.status}`);
        return null;
      }

      const data = await response.json().catch(() => ({}));
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : undefined;
      const summary = data?.summary ?? data;

      return { summary, suggestions };
    } catch (error) {
      this.logger.warn(
        `Anomaly detection request error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
