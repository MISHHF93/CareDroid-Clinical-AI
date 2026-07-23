import {
  Inject,
  Injectable,
  Logger,
  Optional,
  forwardRef,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Subscription, SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { AIQuery, QueryStatus } from './entities/ai-query.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { MetricsService } from '../metrics/metrics.service';
import { PlatformGovernanceService } from '../platform-governance';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CollaborationHubService } from '../collaboration-hub/collaboration-hub.service';
import {
  CollaborationMessageSenderType,
  CollaborationMessageSourceType,
} from '../collaboration-hub/entities/collaboration-message.entity';
import {
  AIError,
  Message,
  ToolDefinition,
  UNIFIED_AI_MODEL,
  unifiedAIClient,
} from '../../../../lib/ai/serverClient';
import type { AIRequestType } from '../../../../lib/ai/types';
import { buildSystemPrompt } from '../../../../lib/ai/contextEngine';
import { promptForRequestType } from '../../../../lib/ai/promptRegistry';
import { getToolsForRequestType } from '../../../../lib/ai/toolRegistry';
import {
  runCareDroidAI,
  type CareDroidAIIntent,
  type CareDroidAIRequest,
} from '../../../../lib/ai/careDroidAI';
import { listAdapterHealth } from '../../../../lib/ai/providers/registry';
import { loadModelRegistryEntries } from '../../../../lib/ai/modelRegistry';
import {
  buildBlockedUnifiedResponse,
  mapHeuristicNodeToUnifiedResponse,
  validateUnifiedAiRequest,
  type CareDroidUnifiedAIRequest,
  type CareDroidUnifiedAIResponse,
} from '../../../../lib/ai/unifiedAiContracts';
import { reviewAIRequestForSafety } from '../../../../lib/ai/safetyPolicy';
import { IntentClassifierService } from '../medical-control-plane/intent-classifier/intent-classifier.service';
import { extractClassifiableText } from '../../../ml-services/shared/routing-maps';
import { randomUUID } from 'crypto';

interface RateLimitConfig {
  dailyLimit: number;
  model: string;
  maxTokens: number;
}

interface AiModelPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  /** Cache read tokens are billed at ~10% of normal input cost */
  cacheReadPer1kTokens: number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly rateLimits: Map<SubscriptionTier, RateLimitConfig>;
  private readonly aiPricing: Map<string, AiModelPricing>;
  private readonly toolDefinitions: ToolDefinition[];
  private readonly temperature: number;
  private readonly subscriptionTierCacheTtlMs = 30 * 1000;
  private readonly subscriptionTierCache = new Map<
    string,
    { tier: SubscriptionTier; expiresAt: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AIQuery)
    private readonly aiQueryRepository: Repository<AIQuery>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    @Optional() private readonly platformGovernanceService?: PlatformGovernanceService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
    @Optional()
    @Inject(forwardRef(() => IntentClassifierService))
    private readonly intentClassifier?: IntentClassifierService,
    @Optional() private readonly collaborationHubService?: CollaborationHubService,
  ) {
    const aiConfig = this.configService.get<any>('ai') || {};
    const aiRateLimits = aiConfig.rateLimits || {};
    const defaultModel = UNIFIED_AI_MODEL;
    const defaultMaxTokens = aiConfig.maxTokens || 2000;
    this.temperature = aiConfig.temperature ?? 0.7;

    unifiedAIClient.configure({
      apiKey:
        this.configService.get<string>('ANTHROPIC_API_KEY') ||
        this.configService.get<string>('anthropic.apiKey'),
    });

    // Rate limits from unified AI config.
    this.rateLimits = new Map([
      [
        SubscriptionTier.FREE,
        {
          dailyLimit: aiRateLimits.free?.dailyLimit ?? 10,
          model: defaultModel,
          maxTokens: aiRateLimits.free?.maxTokens ?? defaultMaxTokens,
        },
      ],
      [
        SubscriptionTier.PROFESSIONAL,
        {
          dailyLimit: aiRateLimits.professional?.dailyLimit ?? 1000,
          model: defaultModel,
          maxTokens: aiRateLimits.professional?.maxTokens ?? defaultMaxTokens,
        },
      ],
      [
        SubscriptionTier.INSTITUTIONAL,
        {
          dailyLimit: aiRateLimits.institutional?.dailyLimit ?? 10000,
          model: defaultModel,
          maxTokens: aiRateLimits.institutional?.maxTokens ?? defaultMaxTokens,
        },
      ],
    ]);

    // Claude Sonnet pricing estimate (USD per 1K tokens).
    this.aiPricing = new Map([
      [
        UNIFIED_AI_MODEL,
        { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015, cacheReadPer1kTokens: 0.0003 },
      ],
    ]);

    // Legacy LLM function schema. Canonical executor IDs/aliases live in
    // tool-orchestrator.registry.ts and ChatService normalizes these names.
    this.toolDefinitions = [
      {
        name: 'sofa_calculator',
        description:
          'Calculate SOFA (Sequential Organ Failure Assessment) score from vital signs and lab values',
        input_schema: {
          type: 'object',
          properties: {
            respiratory: {
              type: 'number',
              description: 'PaO2/FiO2 ratio',
            },
            coagulation: {
              type: 'number',
              description: 'Platelet count (10^9/L)',
            },
            liver: {
              type: 'number',
              description: 'Bilirubin (mg/dL)',
            },
            cardiovascular: {
              type: 'string',
              description:
                'Hypotension classification (none/diastolic_reduction/hypotension/shock)',
            },
            cns: {
              type: 'number',
              description: 'Glasgow Coma Scale',
            },
            renal: {
              type: 'number',
              description: 'Creatinine (mg/dL) or urine output',
            },
          },
          required: ['respiratory', 'coagulation', 'liver', 'cardiovascular', 'cns', 'renal'],
        },
      },
      {
        name: 'drug_checker',
        description: 'Check for drug-drug interactions, contraindications, and adverse effects',
        input_schema: {
          type: 'object',
          properties: {
            medications: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of medication names to check',
            },
            patientAge: {
              type: 'number',
              description: 'Patient age in years',
            },
            renal_function: {
              type: 'string',
              description:
                'Renal function status (normal/mild_impairment/moderate_impairment/severe_impairment)',
            },
            hepatic_function: {
              type: 'string',
              description: 'Hepatic function status (normal/mild/moderate/severe)',
            },
          },
          required: ['medications'],
        },
      },
      {
        name: 'lab_interpreter',
        description:
          'Interpret lab test results and identify abnormalities with clinical significance',
        input_schema: {
          type: 'object',
          properties: {
            test_name: {
              type: 'string',
              description: 'Name of the lab test',
            },
            value: {
              type: 'number',
              description: 'Lab test result value',
            },
            unit: {
              type: 'string',
              description: 'Unit of measurement',
            },
            reference_range: {
              type: 'string',
              description: 'Reference range (e.g., "7.35-7.45")',
            },
          },
          required: ['test_name', 'value', 'unit'],
        },
      },
    ];
  }

  /**
   * Calculate cost in USD based on model and token usage
   */
  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens = 0,
  ): number {
    const pricing = this.aiPricing.get(model);
    if (!pricing) {
      return 0;
    }
    // Cache-read tokens already consumed cache creation budget; bill at reduced rate.
    const billableInputTokens = Math.max(0, inputTokens - cacheReadTokens);
    const inputCost = (billableInputTokens / 1000) * pricing.inputPer1kTokens;
    const cacheReadCost = (cacheReadTokens / 1000) * pricing.cacheReadPer1kTokens;
    const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokens;
    return inputCost + cacheReadCost + outputCost;
  }

  async invokeLLM(userId: string, prompt: string, context?: any) {
    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);
    const requestType = this.resolveRequestType(context, 'COPILOT_CHAT');

    // Check rate limit
    const usageToday = await this.getUsageToday(userId);
    if (usageToday >= config.dailyLimit) {
      throw new Error(
        `Daily AI query limit reached (${config.dailyLimit}). Upgrade to Pro for 1000 queries/day.`,
      );
    }

    try {
      const startTime = Date.now();
      const response = await unifiedAIClient.request({
        requestType,
        systemPrompt: promptForRequestType(requestType).prompt,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: config.maxTokens,
        context,
      });
      const latencyMs = Date.now() - startTime;
      const content = this.responseContentToText(response.content);

      const result = {
        content,
        model: config.model,
        tokensUsed: response.usage.totalTokens,
        finishReason: 'stop',
      };

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage.inputTokens,
        response.usage.outputTokens,
        response.usage.cacheReadInputTokens,
      );
      this.metricsService.recordOpenaiCost(config.model, costUsd);
      const aiUsageMetadata = this.buildAiUsageMetadata(
        context,
        config.model,
        config.maxTokens,
        requestType,
      );

      // Log query to database
      await this.logQuery({
        userId,
        prompt,
        response: result.content,
        status: QueryStatus.SUCCESS,
        model: config.model,
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        cost: costUsd,
        latencyMs,
        feature: context?.feature || 'chat',
        conversationId: context?.conversationId,
        intentClassified: context?.intent || context?.intentClassification?.primaryIntent,
        toolUsed: context?.toolId || context?.tool || context?.intentClassification?.toolId,
        metadata: {
          temperature: this.temperature,
          maxTokens: config.maxTokens,
          finishReason: result.finishReason,
          requestType,
          ...aiUsageMetadata,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai/query',
        metadata: {
          aiFoundation: this.extractAiFoundationMetadata(context),
          requestType,
          model: config.model,
          tokensUsed: result.tokensUsed,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      const aiUsageMetadata = this.buildAiUsageMetadata(
        context,
        config.model,
        config.maxTokens,
        requestType,
      );
      // Log failed query
      await this.logQuery({
        userId,
        prompt,
        response: null,
        status: QueryStatus.ERROR,
        model: config.model,
        feature: context?.feature || 'chat',
        conversationId: context?.conversationId,
        metadata: {
          error: this.formatSafeError(error),
          requestType,
          ...aiUsageMetadata,
        },
      });
      throw new Error(`AI query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStructuredJSON(userId: string, prompt: string, schema: any, context?: any) {
    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);
    const requestType = this.resolveRequestType(context, 'SCORE_ASSIST');

    // Check rate limit
    const usageToday = await this.getUsageToday(userId);
    if (usageToday >= config.dailyLimit) {
      throw new Error(
        `Daily AI query limit reached (${config.dailyLimit}). Upgrade to Pro for 1000 queries/day.`,
      );
    }

    try {
      const response = await unifiedAIClient.request({
        requestType,
        systemPrompt: `${promptForRequestType(requestType).prompt} Return only valid JSON matching the requested schema.`,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nSchema: ${JSON.stringify(schema)}\n\nReturn only valid JSON.`,
          },
        ],
        maxTokens: config.maxTokens,
        context,
      });

      const rawContent = this.responseContentToText(response.content);
      const result = this.parseJsonResponse(rawContent);
      const totalTokens = response.usage.totalTokens;

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage.inputTokens,
        response.usage.outputTokens,
        response.usage.cacheReadInputTokens,
      );
      this.metricsService.recordOpenaiCost(config.model, costUsd);
      const aiUsageMetadata = this.buildAiUsageMetadata(
        context,
        config.model,
        config.maxTokens,
        requestType,
      );
      await this.logQuery({
        userId,
        prompt,
        response: rawContent,
        status: QueryStatus.SUCCESS,
        model: config.model,
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
        totalTokens,
        cost: costUsd,
        feature: context?.feature || 'structured_json',
        conversationId: context?.conversationId,
        intentClassified: context?.intentClassification?.primaryIntent,
        toolUsed: context?.tool || context?.intentClassification?.toolId,
        metadata: {
          schemaKeys: Object.keys(schema),
          requestType,
          ...aiUsageMetadata,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai/structured',
        metadata: {
          aiFoundation: this.extractAiFoundationMetadata(context),
          requestType,
          schema: Object.keys(schema),
          model: config.model,
          tokensUsed: totalTokens,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      const aiUsageMetadata = this.buildAiUsageMetadata(
        context,
        config.model,
        config.maxTokens,
        requestType,
      );
      await this.logQuery({
        userId,
        prompt,
        response: null,
        status: QueryStatus.ERROR,
        model: config.model,
        feature: context?.feature || 'structured_json',
        conversationId: context?.conversationId,
        metadata: {
          error: this.formatSafeError(error),
          requestType,
          ...aiUsageMetadata,
        },
      });
      throw new Error(
        `Structured JSON generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async runCareDroidAINode(userId: string, request: CareDroidAIRequest, context?: any) {
    const startTime = Date.now();
    const unifiedClassification = await this.classifyStructuredNodeInput(userId, request);
    const mergedRequest = {
      ...request,
      context: {
        ...(request.context || {}),
        ...(context || {}),
        ...(unifiedClassification ? { unifiedClassification } : {}),
      },
    };
    const response = await runCareDroidAI(mergedRequest);
    const latencyMs = Date.now() - startTime;
    const intent = request.intent as CareDroidAIIntent;

    await this.logQuery({
      userId,
      prompt: `careDroidAI:${intent}`,
      response: response.status,
      status: response.status === 'success' ? QueryStatus.SUCCESS : QueryStatus.ERROR,
      model: 'careDroidAI-node-v1',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
      latencyMs,
      feature: 'careDroidAI_node',
      intentClassified: intent,
      metadata: {
        tenant: mergedRequest.context?.tenant,
        sourceScreen: mergedRequest.context?.sourceScreen,
        userRole: mergedRequest.context?.userRole || mergedRequest.context?.tenant?.role,
        confidence: response.confidence,
        unifiedClassification,
        warningCount: response.warnings.length,
        nextActionCount: response.nextActions.length,
        aiCommercialization: {
          agentId: 'careDroidAI',
          assetId: mergedRequest.context?.assetId || 'agent-clinical',
          modelClass: 'standard',
          modelVersion: 'careDroidAI-node-v1',
          requiresHumanReview: response.requiresClinicianReview,
          estimatedCost: 0,
        },
      },
    });

    return response;
  }

  private async classifyStructuredNodeInput(
    userId: string,
    request: CareDroidAIRequest,
  ): Promise<Record<string, unknown> | null> {
    if (!this.intentClassifier) return null;
    const text = extractClassifiableText(request.input as Record<string, unknown>);
    if (!text) return null;
    try {
      const classification = await this.intentClassifier.classify(text, {
        userId,
        userRole: String(request.context?.userRole || request.context?.tenant?.role || 'clinician'),
      });
      return {
        nodeId: classification.nodeId || 'caredroid-unified-ai-node',
        primaryIntent: classification.primaryIntent,
        toolId: classification.toolId,
        artifactType: classification.artifactType,
        artifactRouteConfidence: classification.artifactRouteConfidence,
        confidence: classification.confidence,
        method: classification.method,
        isEmergency: classification.isEmergency,
        matchedPatterns: classification.matchedPatterns,
      };
    } catch (error) {
      this.logger.warn(
        `[AIService] Intent classification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getUsage(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);

    const usage = await this.aiQueryRepository
      .createQueryBuilder('aiQuery')
      .select('COUNT(aiQuery.id)', 'count')
      .addSelect('COALESCE(SUM(aiQuery.cost), 0)', 'totalCost')
      .where('aiQuery.userId = :userId', { userId })
      .andWhere('aiQuery.status = :status', { status: QueryStatus.SUCCESS })
      .andWhere('aiQuery.createdAt >= :startDate', { startDate })
      .getRawOne<{ count?: string; totalCost?: string }>();

    const usedThisMonth = Number(usage?.count || 0);
    const totalCost = Number(usage?.totalCost || 0);

    return {
      userId,
      tier,
      dailyLimit: config.dailyLimit,
      usedToday: await this.getUsageToday(userId),
      usedThisMonth,
      totalCost,
    };
  }

  async getOrganizationUsageSummary(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totals = await this.aiQueryRepository
      .createQueryBuilder('aiQuery')
      .select('COUNT(aiQuery.id)', 'totalQueries')
      .addSelect('COALESCE(SUM(aiQuery.totalTokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(aiQuery.cost), 0)', 'actualCost')
      .addSelect('COALESCE(SUM(aiQuery.estimatedCost), 0)', 'estimatedCost')
      .addSelect(
        'SUM(CASE WHEN aiQuery.requiresHumanReview = true THEN 1 ELSE 0 END)',
        'reviewRequiredCount',
      )
      .where('aiQuery.organizationId = :organizationId', { organizationId })
      .andWhere('aiQuery.createdAt >= :startDate', { startDate })
      .getRawOne<{
        totalQueries?: string;
        totalTokens?: string;
        actualCost?: string;
        estimatedCost?: string;
        reviewRequiredCount?: string;
      }>();

    const [byAsset, byAgent, byModelClass] = await Promise.all([
      this.groupOrganizationUsage(organizationId, startDate, 'assetId', 'assetId'),
      this.groupOrganizationUsage(organizationId, startDate, 'agentId', 'agentId'),
      this.groupOrganizationUsage(organizationId, startDate, 'modelClass', 'modelClass'),
    ]);

    return {
      organizationId,
      days,
      totals: {
        totalQueries: Number(totals?.totalQueries || 0),
        totalTokens: Number(totals?.totalTokens || 0),
        actualCost: Number(totals?.actualCost || 0),
        estimatedCost: Number(totals?.estimatedCost || 0),
        reviewRequiredCount: Number(totals?.reviewRequiredCount || 0),
      },
      byAsset,
      byAgent,
      byModelClass,
    };
  }

  async getRemainingQueries(userId: string) {
    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);
    const usedToday = await this.getUsageToday(userId);
    const remaining = Math.max(0, config.dailyLimit - usedToday);

    return {
      userId,
      tier,
      dailyLimit: config.dailyLimit,
      usedToday,
      remaining,
      resetAt: this.getNextResetTime(),
    };
  }

  /**
   * Provider health for direct API discovery — never includes API keys or secrets.
   */
  getProvidersHealth() {
    const providers = listAdapterHealth().map((entry) => ({
      provider: entry.provider,
      ok: entry.ok,
      configured: entry.configured,
      detail: entry.detail,
    }));
    return {
      generatedAt: new Date().toISOString(),
      providers,
      primaryProvider:
        this.configService.get<string>('AI_PROVIDER') ||
        this.configService.get<string>('ai.provider') ||
        'anthropic',
      fallbackProvider:
        this.configService.get<string>('AI_FALLBACK_PROVIDER') ||
        this.configService.get<string>('ai.fallbackProvider') ||
        null,
    };
  }

  getRegisteredModels() {
    const entries = loadModelRegistryEntries();
    return {
      generatedAt: new Date().toISOString(),
      count: entries.length,
      models: entries.map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
        kind: entry.kind,
        status: entry.status,
        provider: entry.provider,
        modelIdentifier: entry.modelIdentifier,
        purpose: entry.purpose,
        regulatoryClass: entry.regulatoryClass,
        featureFlag: entry.deployment?.featureFlag,
        expiresAt: entry.expiresAt,
      })),
    };
  }

  getAiToolCatalog() {
    const tools = this.getToolDefinitions().map((tool) => ({
      name: tool.name,
      description: tool.description,
      riskLevel: 'moderate' as const,
      requiresHumanApproval: true,
      inputSchema: tool.input_schema,
    }));
    return {
      generatedAt: new Date().toISOString(),
      count: tools.length,
      tools,
      note: 'Legacy LLM function schemas. Canonical clinical executors live in tool-orchestrator.registry.ts.',
    };
  }

  /**
   * Canonical unified AI query path (AI_EXECUTION_PLAN §4–5).
   * Validates envelope, applies safety, routes structured tasks to the heuristic
   * CareDroid AI node when an intent can be resolved; otherwise returns a
   * deterministic review-required response (no silent fake success).
   */
  async runUnifiedAiQuery(
    userId: string,
    body: Record<string, unknown>,
    tenantContext?: {
      organizationId?: string;
      workspaceId?: string;
      role?: string;
      subscriptionPlan?: string;
    },
  ): Promise<CareDroidUnifiedAIResponse> {
    const started = Date.now();
    const requestId = String(body.requestId || randomUUID());
    const correlationId = String(body.correlationId || randomUUID());

    const candidate = {
      requestId,
      correlationId,
      organizationId: String(body.organizationId || tenantContext?.organizationId || 'unknown-org'),
      workspaceId: body.workspaceId
        ? String(body.workspaceId)
        : tenantContext?.workspaceId
          ? String(tenantContext.workspaceId)
          : undefined,
      facilityId: body.facilityId ? String(body.facilityId) : undefined,
      userId: String(body.userId || userId),
      role: String(body.role || tenantContext?.role || 'unknown'),
      permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : ['use_ai_chat'],
      channel: body.channel,
      task: body.task,
      patientContext: isPlainRecord(body.patientContext) ? body.patientContext : undefined,
      encounterContext: isPlainRecord(body.encounterContext) ? body.encounterContext : undefined,
      emsContext: isPlainRecord(body.emsContext) ? body.emsContext : undefined,
      workflowContext: isPlainRecord(body.workflowContext) ? body.workflowContext : undefined,
      documentContext: isPlainRecord(body.documentContext) ? body.documentContext : undefined,
      query: String(body.query || ''),
      requestedTools: Array.isArray(body.requestedTools)
        ? body.requestedTools.map(String)
        : undefined,
      responseFormat: body.responseFormat || 'structured',
      locale: body.locale ? String(body.locale) : undefined,
    };

    const validation = validateUnifiedAiRequest(candidate);
    if (!validation.valid || !validation.request) {
      return {
        requestId,
        correlationId,
        status: 'failed',
        responseType: 'error',
        content: 'Request failed validation before model or tool execution.',
        evidence: [],
        citations: [],
        uncertainty: [],
        missingInformation: validation.errors.map((e) => `${e.field}: ${e.message}`),
        limitations: ['Malformed requests are rejected without invoking a model.'],
        toolExecutions: [],
        model: { provider: 'none', model: 'none', fallbackApplied: false },
        safety: {
          allowed: false,
          requiresHumanReview: true,
          reasons: validation.errors.map((e) => e.message),
          disclaimer: 'Human review required. This is not a replacement for clinical judgment.',
        },
        createdAt: new Date().toISOString(),
      };
    }

    const request = validation.request as CareDroidUnifiedAIRequest;
    const safety = reviewAIRequestForSafety({
      prompt: request.query,
      patientSpecific: Boolean(request.patientContext),
    });
    if (!safety.allowed) {
      return buildBlockedUnifiedResponse({
        requestId: request.requestId,
        correlationId: request.correlationId,
        reasons: safety.reasons,
        disclaimer: safety.disclaimer,
      });
    }

    const intent = resolveUnifiedTaskToIntent(request.task, request.channel);
    if (intent) {
      // CareDroid unified ML node (NLU + artifact-router) for routing metadata.
      const unifiedNode = await this.classifyStructuredNodeInput(userId, {
        intent,
        input: {
          query: request.query,
          message: request.query,
          ...(request.patientContext || {}),
        },
        context: { userRole: request.role },
      });

      const nodeResponse = await this.runCareDroidAINode(
        userId,
        {
          intent,
          input: {
            ...(request.patientContext || {}),
            ...(request.emsContext || {}),
            ...(request.workflowContext || {}),
            query: request.query,
            message: request.query,
            channel: request.channel,
            task: request.task,
          },
          context: {
            requestId: request.requestId,
            sourceScreen: `unified:${request.channel}`,
            userRole: request.role,
            organizationId: request.organizationId,
            workspaceId: request.workspaceId,
            tenant: {
              organizationId: request.organizationId,
              workspaceId: request.workspaceId,
              userId,
              role: request.role,
              subscriptionPlan: tenantContext?.subscriptionPlan,
              source: 'unified_ai_query',
            },
            ...(unifiedNode ? { unifiedClassification: unifiedNode } : {}),
          },
        },
        {
          tenant: {
            organizationId: request.organizationId,
            workspaceId: request.workspaceId,
            userId,
            role: request.role,
          },
        },
      );

      const content = [
        ...(nodeResponse.reasoning || []),
        ...(nodeResponse.nextActions?.length
          ? [`Next actions: ${nodeResponse.nextActions.join('; ')}`]
          : []),
      ]
        .join(' ')
        .trim();

      const mapped = mapHeuristicNodeToUnifiedResponse({
        requestId: request.requestId,
        correlationId: request.correlationId,
        intent: String(nodeResponse.intent),
        status: nodeResponse.status === 'success' ? 'success' : 'error',
        content: content || nodeResponse.status,
        confidence: nodeResponse.confidence,
        requiresClinicianReview: nodeResponse.requiresClinicianReview !== false,
        model: unifiedNode ? 'caredroid-unified-ai-node+heuristic' : 'careDroidAI-node-v1',
        latencyMs: Date.now() - started,
        uncertainty: nodeResponse.warnings || [],
        limitations: [nodeResponse.safetyDisclaimer],
        humanReview: nodeResponse.requiresClinicianReview
          ? { status: 'pending', reviewType: 'clinical_ai', severity: 'high' }
          : undefined,
      });

      return {
        ...mapped,
        structuredData: {
          heuristicIntent: nodeResponse.intent,
          ...(unifiedNode ? { unifiedNode } : {}),
        },
      };
    }

    // Free-text / no structured task→intent map: still run the CareDroid unified
    // ML node (NLU + artifact-router) so routing metadata is always present, then
    // return a deterministic review-required answer (no silent LLM clinical claims).
    let nodeRoute: Record<string, unknown> | null = null;
    if (this.intentClassifier && request.query.trim().length >= 8) {
      try {
        const classification = await this.intentClassifier.classify(request.query, {
          userId,
          userRole: request.role,
        });
        nodeRoute = {
          nodeId: classification.nodeId || 'caredroid-unified-ai-node',
          primaryIntent: classification.primaryIntent,
          toolId: classification.toolId,
          artifactType: classification.artifactType,
          artifactRouteConfidence: classification.artifactRouteConfidence,
          confidence: classification.confidence,
          method: classification.method,
          isEmergency: classification.isEmergency,
        };
      } catch (error) {
        this.logger.warn(
          `[runUnifiedAiQuery] Unified node classify failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const routeSummary = nodeRoute
      ? `Node route: intent=${String(nodeRoute.primaryIntent)} artifact=${String(nodeRoute.artifactType || 'n/a')} tool=${String(nodeRoute.toolId || 'n/a')} method=${String(nodeRoute.method)}.`
      : 'Node route: unavailable for this request.';

    return {
      requestId: request.requestId,
      correlationId: request.correlationId,
      status: 'needs_human_review',
      responseType: 'answer',
      content: [
        'CareDroid Unified AI Node received your request.',
        `Channel: ${request.channel}; task: ${request.task}.`,
        routeSummary,
        'No foundation model was invoked for this path (safe default).',
        'A licensed clinician must review before any clinical action.',
        `Query: ${request.query.slice(0, 400)}`,
      ].join(' '),
      structuredData: nodeRoute ? { unifiedNode: nodeRoute } : undefined,
      evidence: [],
      citations: [],
      confidence:
        typeof nodeRoute?.confidence === 'number' ? (nodeRoute.confidence as number) : 0.35,
      uncertainty: ['Deterministic unified path does not perform clinical reasoning.'],
      missingInformation: [],
      limitations: [
        'Use structured node intents or an enabled foundation-model path for richer answers.',
        'Local ML node provides routing only (NLU + artifact-type), not clinical advice.',
      ],
      toolExecutions: nodeRoute?.toolId
        ? [
            {
              toolName: String(nodeRoute.toolId),
              status: 'skipped' as const,
              requiresHumanApproval: true,
            },
          ]
        : [],
      model: {
        provider: 'local',
        model: nodeRoute ? 'caredroid-unified-ai-node' : 'unified-ai-deterministic-v1',
        latencyMs: Date.now() - started,
        fallbackApplied: false,
      },
      safety: {
        allowed: true,
        requiresHumanReview: true,
        reasons: [
          'unified_deterministic_path',
          'clinician_review_required',
          ...(nodeRoute?.isEmergency ? ['emergency_signal_from_node'] : []),
        ],
        disclaimer: safety.disclaimer,
      },
      humanReview: { status: 'pending', reviewType: 'clinical_ai', severity: 'high' },
      createdAt: new Date().toISOString(),
    };
  }

  async getRequestById(
    userId: string,
    requestId: string,
    tenantContext?: { organizationId?: string; workspaceId?: string },
  ) {
    const record = await this.aiQueryRepository.findOne({ where: { id: requestId } });
    if (!record) {
      throw new NotFoundException(`AI request ${requestId} was not found`);
    }
    if (record.userId !== userId) {
      throw new ForbiddenException('AI request does not belong to the authenticated user');
    }
    if (
      tenantContext?.organizationId &&
      record.organizationId &&
      record.organizationId !== tenantContext.organizationId
    ) {
      throw new ForbiddenException('AI request is outside the active organization scope');
    }

    return {
      id: record.id,
      status: record.status,
      feature: record.feature,
      model: record.model,
      modelVersion: record.modelVersion,
      modelClass: record.modelClass,
      intentClassified: record.intentClassified,
      toolUsed: record.toolUsed,
      requiresHumanReview: record.requiresHumanReview,
      latencyMs: record.latencyMs,
      totalTokens: record.totalTokens,
      estimatedCost: record.estimatedCost,
      cost: record.cost,
      organizationId: record.organizationId,
      workspaceId: record.workspaceId,
      createdAt: record.createdAt,
      // Prompt/response bodies are stored redacted — never re-expand PHI here.
      prompt: record.prompt,
      response: record.response,
      metadata: {
        routingExpert: record.routingExpert,
        retrievalPolicy: record.retrievalPolicy,
        assetId: record.assetId,
        agentId: record.agentId,
      },
    };
  }

  private getNextResetTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  /**
   * Log AI query to database for usage tracking and analytics
   */
  private async logQuery(data: {
    userId: string;
    prompt: string;
    response: string | null;
    status: QueryStatus;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
    latencyMs?: number;
    conversationId?: string;
    feature?: string;
    intentClassified?: string;
    toolUsed?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const saved = await this.aiQueryRepository.save({
        userId: data.userId,
        prompt: this.redactedAiQueryValue('prompt', data.feature),
        response:
          data.response === null ? null : this.redactedAiQueryValue('response', data.feature),
        status: data.status,
        model: data.model,
        promptTokens: data.promptTokens || 0,
        completionTokens: data.completionTokens || 0,
        totalTokens: data.totalTokens || 0,
        cost: data.cost || 0,
        latencyMs: data.latencyMs,
        conversationId: data.conversationId,
        feature: data.feature,
        organizationId: data.metadata?.tenant?.organizationId,
        workspaceId: data.metadata?.tenant?.workspaceId,
        assetId: data.metadata?.aiCommercialization?.assetId,
        agentId: data.metadata?.aiCommercialization?.agentId,
        modelClass: data.metadata?.aiCommercialization?.modelClass,
        modelVersion: data.metadata?.aiCommercialization?.modelVersion,
        routingExpert: data.metadata?.aiCommercialization?.routingExpert,
        retrievalPolicy: data.metadata?.aiCommercialization?.retrievalPolicy,
        requiresHumanReview: data.metadata?.aiCommercialization?.requiresHumanReview || false,
        estimatedCost: data.metadata?.aiCommercialization?.estimatedCost,
        intentClassified: data.intentClassified,
        toolUsed: data.toolUsed,
        metadata: data.metadata,
      });
      await this.subscriptionsService?.recordAiUsageFromQuery({
        organizationId: saved.organizationId,
        workspaceId: saved.workspaceId,
        userId: saved.userId,
        userRole: data.metadata?.tenant?.role,
        subscriptionPlan: data.metadata?.tenant?.subscriptionPlan,
        assetId: saved.assetId,
        model: saved.model,
        totalTokens: saved.totalTokens,
        cost: Number(saved.cost || 0),
      });
      await this.createHumanReviewItemIfRequired(saved as AIQuery);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to log AI query:', error);
    }
  }

  private redactedAiQueryValue(kind: 'prompt' | 'response', feature?: string): string {
    return `[redacted:${kind}:${feature || 'ai'}]`;
  }

  private async getUsageToday(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.aiQueryRepository.count({
      where: {
        userId,
        status: QueryStatus.SUCCESS,
        createdAt: MoreThanOrEqual(startOfDay),
      },
    });

    return count;
  }

  private async groupOrganizationUsage(
    organizationId: string,
    startDate: Date,
    field: 'assetId' | 'agentId' | 'modelClass',
    alias: string,
  ) {
    const rows = await this.aiQueryRepository
      .createQueryBuilder('aiQuery')
      .select(`COALESCE(aiQuery.${field}, 'unknown')`, alias)
      .addSelect('COUNT(aiQuery.id)', 'count')
      .addSelect('COALESCE(SUM(aiQuery.totalTokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(aiQuery.cost), 0)', 'actualCost')
      .addSelect('COALESCE(SUM(aiQuery.estimatedCost), 0)', 'estimatedCost')
      .addSelect(
        'SUM(CASE WHEN aiQuery.requiresHumanReview = true THEN 1 ELSE 0 END)',
        'reviewRequiredCount',
      )
      .where('aiQuery.organizationId = :organizationId', { organizationId })
      .andWhere('aiQuery.createdAt >= :startDate', { startDate })
      .groupBy(`COALESCE(aiQuery.${field}, 'unknown')`)
      .orderBy('count', 'DESC')
      .getRawMany<Record<string, string>>();

    return rows.map((row) => ({
      [alias]: row[alias],
      count: Number(row.count || 0),
      totalTokens: Number(row.totalTokens || 0),
      actualCost: Number(row.actualCost || 0),
      estimatedCost: Number(row.estimatedCost || 0),
      reviewRequiredCount: Number(row.reviewRequiredCount || 0),
    }));
  }

  private async getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    const cached = this.subscriptionTierCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tier;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const tier = subscription?.tier || SubscriptionTier.FREE;
    this.subscriptionTierCache.set(userId, {
      tier,
      expiresAt: Date.now() + this.subscriptionTierCacheTtlMs,
    });
    return tier;
  }

  private getRateLimitConfig(tier: SubscriptionTier): RateLimitConfig {
    return this.rateLimits.get(tier) || this.rateLimits.get(SubscriptionTier.FREE)!;
  }

  /**
   * Get tool definitions for Claude's tool_use block handling
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.toolDefinitions;
  }

  /**
   * Invoke LLM with tool-calling support
   * Handles multi-turn conversations with tool_use blocks
   */
  async invokeLLMWithTools(
    userId: string,
    prompt: string,
    conversationHistory?: Array<{ role?: string; content?: any }>,
    context?: any,
  ) {
    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);
    const requestType = this.resolveRequestType(context, 'COPILOT_CHAT');

    // Check rate limit
    const usageToday = await this.getUsageToday(userId);
    if (usageToday >= config.dailyLimit) {
      throw new Error(
        `Daily AI query limit reached (${config.dailyLimit}). Upgrade to Pro for 1000 queries/day.`,
      );
    }

    try {
      const systemPrompt = buildSystemPrompt((context || {}) as any, requestType);

      // Add conversation history if provided
      const messages: Message[] = [];
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...this.normalizeConversationHistory(conversationHistory));
      }

      // Add current prompt
      messages.push({ role: 'user', content: prompt });

      const response = await unifiedAIClient.request({
        requestType,
        systemPrompt,
        messages,
        maxTokens: config.maxTokens,
        context,
        tools: context?.tools || getToolsForRequestType(requestType),
      });

      // Handle response with potential tool calls
      const toolCalls = response.toolCalls.map((toolCall) => ({
        toolName: toolCall.name,
        toolId: toolCall.id,
        parameters: toolCall.input,
      }));
      const content = this.responseContentToText(response.content);

      const result = {
        content,
        model: config.model,
        tokensUsed: response.usage.totalTokens,
        finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop',
        toolCalls,
      };

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage.inputTokens,
        response.usage.outputTokens,
        response.usage.cacheReadInputTokens,
      );
      this.metricsService.recordOpenaiCost(config.model, costUsd);
      const aiUsageMetadata = this.buildAiUsageMetadata(
        context,
        config.model,
        config.maxTokens,
        requestType,
      );
      await this.logQuery({
        userId,
        prompt,
        response: result.content,
        status: QueryStatus.SUCCESS,
        model: config.model,
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        cost: costUsd,
        feature: context?.feature || 'chat_with_tools',
        conversationId: context?.conversationId,
        intentClassified: context?.intentClassification?.primaryIntent,
        toolUsed: context?.tool || context?.intentClassification?.toolId,
        metadata: {
          finishReason: result.finishReason,
          toolCallCount: toolCalls.length,
          requestType,
          ...aiUsageMetadata,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai/query-with-tools',
        metadata: {
          aiFoundation: this.extractAiFoundationMetadata(context),
          requestType,
          model: config.model,
          tokensUsed: result.tokensUsed,
          toolCallCount: toolCalls.length,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      const aiUsageMetadata = this.buildAiUsageMetadata(
        context,
        config.model,
        config.maxTokens,
        requestType,
      );
      await this.logQuery({
        userId,
        prompt,
        response: null,
        status: QueryStatus.ERROR,
        model: config.model,
        feature: context?.feature || 'chat_with_tools',
        conversationId: context?.conversationId,
        metadata: {
          error: this.formatSafeError(error),
          requestType,
          ...aiUsageMetadata,
        },
      });
      throw new Error(
        `AI query with tools failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private normalizeConversationHistory(
    history: Array<{ role?: string; content?: any }>,
  ): Message[] {
    return history
      .filter((message) => message?.role === 'user' || message?.role === 'assistant')
      .map((message) => ({
        role: (message.role === 'assistant' ? 'assistant' : 'user') as Message['role'],
        content:
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      }))
      .filter((message) => message.content);
  }

  private responseContentToText(content: string | ReadableStream<Uint8Array>): string {
    return typeof content === 'string' ? content : '';
  }

  private parseJsonResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch (_error) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('AI response did not contain valid JSON');
    }
  }

  private formatSafeError(error: unknown): string {
    if (error instanceof AIError) {
      return `${error.code}${error.status ? `:${error.status}` : ''}`;
    }
    return error instanceof Error ? error.name : 'UnknownError';
  }

  private resolveRequestType(context: any, fallback: AIRequestType): AIRequestType {
    const candidate = context?.requestType;
    if (this.isAIRequestType(candidate)) {
      return candidate;
    }

    const feature = String(
      context?.feature || context?.intentType || context?.tool || '',
    ).toLowerCase();
    if (feature.includes('handoff')) return 'HANDOFF_BRIEF';
    if (feature.includes('shift')) return 'SHIFT_SUMMARY';
    if (feature.includes('summary') || feature.includes('structured_json'))
      return 'CLINICAL_SUMMARY';
    if (feature.includes('score') || feature.includes('calculator') || feature.includes('lab')) {
      return 'SCORE_ASSIST';
    }
    if (feature.includes('intake')) return 'INTAKE_SUGGESTION';
    if (feature.includes('protocol') || feature.includes('reference') || feature.includes('rag')) {
      return 'PROTOCOL_SUGGEST';
    }
    if (feature.includes('triage') || feature.includes('intent')) return 'TRIAGE_ASSIST';
    return fallback;
  }

  private isAIRequestType(value: unknown): value is AIRequestType {
    return (
      typeof value === 'string' &&
      [
        'COPILOT_CHAT',
        'CLINICAL_SUMMARY',
        'SCORE_ASSIST',
        'INTAKE_SUGGESTION',
        'HANDOFF_BRIEF',
        'PROTOCOL_SUGGEST',
        'TRIAGE_ASSIST',
        'SHIFT_SUMMARY',
      ].includes(value)
    );
  }

  private extractAiFoundationMetadata(context?: any): Record<string, any> | undefined {
    const foundation = context?.aiFoundation;
    if (!foundation) {
      return undefined;
    }

    return {
      runId: foundation.runId,
      capabilityId: foundation.capabilityId,
      route: foundation.route,
      selectedExpert: foundation.selectedExpert,
      selectedExperts: foundation.selectedExperts,
      retrievalPolicy: foundation.retrievalPolicy,
      confidence: foundation.confidence,
      routeScore: foundation.routeScore,
      routeReason: foundation.routeReason,
      estimatedCost: foundation.estimatedCost,
      costReductionApplied: foundation.costReductionApplied,
      requiresHumanReview: foundation.requiresHumanReview,
      phiAccessed: foundation.phiAccessed,
      startedAt: foundation.startedAt,
    };
  }

  private buildAiUsageMetadata(
    context: any,
    modelVersion: string,
    maxTokens?: number,
    requestType?: AIRequestType,
  ): Record<string, any> {
    const aiFoundation = this.extractAiFoundationMetadata(context);
    const routePlan = context?.routePlan;
    const tenant = {
      organizationId:
        context?.organizationId ||
        context?.tenant?.organizationId ||
        context?.envelope?.organizationId ||
        context?.aiRunEnvelope?.organizationId,
      workspaceId:
        context?.workspaceId ||
        context?.tenant?.workspaceId ||
        context?.envelope?.workspaceId ||
        context?.aiRunEnvelope?.workspaceId,
      role: context?.role || context?.tenant?.role,
      subscriptionPlan: context?.subscriptionPlan || context?.tenant?.subscriptionPlan,
    };
    const aiCommercialization = {
      agentId: context?.agentId || aiFoundation?.capabilityId || routePlan?.selectedExpert,
      assetId:
        context?.assetId ||
        context?.toolId ||
        context?.tool ||
        context?.intentClassification?.toolId ||
        routePlan?.toolPlan?.backendExecutorIds?.[0],
      modelClass:
        context?.modelClass ||
        routePlan?.modelPlan?.expertModel ||
        this.inferModelClass(modelVersion),
      modelVersion,
      maxTokens,
      routingExpert: aiFoundation?.selectedExpert || routePlan?.selectedExpert,
      retrievalPolicy: aiFoundation?.retrievalPolicy || routePlan?.retrievalPolicy,
      requiresHumanReview:
        aiFoundation?.requiresHumanReview ?? routePlan?.safetyPlan?.requiresHumanReview ?? false,
      estimatedCost: aiFoundation?.estimatedCost ?? routePlan?.costPlan?.estimatedCost,
      costReductionApplied:
        aiFoundation?.costReductionApplied || routePlan?.costPlan?.costReductionApplied || [],
    };

    return {
      aiFoundation,
      requestType,
      ...(routePlan
        ? {
            routePlan: {
              selectedExperts: routePlan.selectedExperts,
              routingEvidence: routePlan.routingEvidence,
              modelPlan: routePlan.modelPlan,
              toolPlan: routePlan.toolPlan,
              costPlan: routePlan.costPlan,
              safetyPlan: routePlan.safetyPlan,
            },
          }
        : {}),
      tenant,
      aiCommercialization,
    };
  }

  private inferModelClass(model: string): 'small' | 'standard' | 'large' {
    const normalized = model.toLowerCase();
    if (normalized.includes('mini') || normalized.includes('small')) return 'small';
    if (normalized.includes('4') || normalized.includes('large')) return 'large';
    return 'standard';
  }

  private async createHumanReviewItemIfRequired(query: AIQuery) {
    if (query.status !== QueryStatus.SUCCESS || !query.requiresHumanReview) {
      return;
    }

    await this.postAiChiefRecommendation(query);

    if (!this.platformGovernanceService) {
      return;
    }

    await this.platformGovernanceService.createReviewItem({
      organizationId: query.organizationId,
      runId: query.metadata?.aiFoundation?.runId || query.id,
      capabilityId:
        query.agentId || query.metadata?.aiFoundation?.capabilityId || query.feature || 'ai',
      reviewType: this.resolveReviewType(query),
      severity: this.resolveReviewSeverity(query),
      dueAt: this.resolveReviewDueAt(query),
      payload: {
        sourceType: 'ai_query',
        sourceId: query.id,
        organizationId: query.organizationId,
        workspaceId: query.workspaceId,
        assetId: query.assetId,
        agentId: query.agentId,
        modelClass: query.modelClass,
        modelVersion: query.modelVersion,
        routingExpert: query.routingExpert,
        retrievalPolicy: query.retrievalPolicy,
        estimatedCost: query.estimatedCost,
        reason: 'AI output requires human review under governance policy.',
        aiFoundation: query.metadata?.aiFoundation,
        aiCommercialization: query.metadata?.aiCommercialization,
      },
    });
  }

  /**
   * Surfaces AI Chief output that requires human review into the Collaboration
   * Hub (patient thread when the query is patient-scoped, otherwise the
   * organization's shared AI Chief channel) so other staff see it without
   * digging through the AI usage/analytics endpoints. Best-effort: never
   * allowed to fail the AI response path.
   */
  private async postAiChiefRecommendation(query: AIQuery): Promise<void> {
    if (!this.collaborationHubService || !query.organizationId) return;

    const patientId =
      (query.metadata?.aiFoundation?.patientId as string | undefined) ||
      (query.metadata?.patientId as string | undefined);
    const summary = (query.response || '').slice(0, 800) || 'AI Chief produced a recommendation.';

    try {
      const channel = patientId
        ? await this.collaborationHubService.getOrCreatePatientThread(
            query.organizationId,
            patientId,
          )
        : await this.collaborationHubService.getOrCreateAiChiefChannel(query.organizationId);

      await this.collaborationHubService.postSystemMessage(channel.id, {
        body: `AI Chief recommendation (requires human review):\n${summary}`,
        senderType: CollaborationMessageSenderType.AI_CHIEF,
        sourceType: CollaborationMessageSourceType.AI_RECOMMENDATION,
        sourceId: query.id,
      });
    } catch (error) {
      console.error('Failed to post AI Chief recommendation to Collaboration Hub:', error);
    }
  }

  private resolveReviewType(query: AIQuery) {
    const feature = (query.feature || '').toLowerCase();
    if (feature.includes('document')) return 'documentation';
    if (feature.includes('simulation')) return 'simulation';
    if (query.routingExpert === 'operations' || query.routingExpert === 'fleet')
      return 'operational_ai';
    if (query.routingExpert === 'documentation') return 'documentation';
    return 'clinical_ai';
  }

  private resolveReviewSeverity(query: AIQuery) {
    if (query.metadata?.aiFoundation?.phiAccessed) return 'critical';
    if (query.modelClass === 'large' || query.routingExpert === 'emergency') return 'critical';
    return 'high';
  }

  private resolveReviewDueAt(query: AIQuery) {
    const hours = this.resolveReviewSeverity(query) === 'critical' ? 4 : 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function resolveUnifiedTaskToIntent(task: string, channel: string): CareDroidAIIntent | null {
  if (task === 'prepare_handoff') {
    return channel === 'ems' ? 'ems_prearrival_risk_summary' : 'handoff_summary';
  }
  if (task === 'suggest_next_action' && channel === 'triage') return 'triage_recommendation';
  if (
    task === 'detect_missing_information' ||
    (task === 'answer_question' && channel === 'reception')
  ) {
    return 'patient_intake_assist';
  }
  if (task === 'explain_alert') return 'critical_alert_assessment';
  if (task === 'forecast_operations') return 'hospital_command_insight';
  return null;
}
