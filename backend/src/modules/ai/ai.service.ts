import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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

interface RateLimitConfig {
  dailyLimit: number;
  model: string;
  maxTokens: number;
}

interface OpenaiPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
}

interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

@Injectable()
export class AIService {
  private readonly openai: OpenAI;
  private readonly rateLimits: Map<SubscriptionTier, RateLimitConfig>;
  private readonly openaiPricing: Map<string, OpenaiPricing>;
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
  ) {
    const openaiConfig = this.configService.get<any>('openai') || {};
    const openaiRateLimits = openaiConfig.rateLimits || {};
    const defaultModel = openaiConfig.model || 'gpt-4o';
    const defaultMaxTokens = openaiConfig.maxTokens || 2000;
    this.temperature = openaiConfig.temperature ?? 0.7;

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    }

    // Rate limits from openai.config.ts
    this.rateLimits = new Map([
      [
        SubscriptionTier.FREE,
        {
          dailyLimit: openaiRateLimits.free?.dailyLimit ?? 10,
          model: openaiRateLimits.free?.model ?? defaultModel,
          maxTokens: openaiRateLimits.free?.maxTokens ?? defaultMaxTokens,
        },
      ],
      [
        SubscriptionTier.PROFESSIONAL,
        {
          dailyLimit: openaiRateLimits.professional?.dailyLimit ?? 1000,
          model: openaiRateLimits.professional?.model ?? defaultModel,
          maxTokens: openaiRateLimits.professional?.maxTokens ?? defaultMaxTokens,
        },
      ],
      [
        SubscriptionTier.INSTITUTIONAL,
        {
          dailyLimit: openaiRateLimits.institutional?.dailyLimit ?? 10000,
          model: openaiRateLimits.institutional?.model ?? defaultModel,
          maxTokens: openaiRateLimits.institutional?.maxTokens ?? defaultMaxTokens,
        },
      ],
    ]);

    // OpenAI pricing (USD per 1K tokens, as of Jan 2026)
    this.openaiPricing = new Map([
      ['gpt-4o', { inputPer1kTokens: 0.03, outputPer1kTokens: 0.06 }],
      ['gpt-4o-mini', { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 }],
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
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.openaiPricing.get(model);
    if (!pricing) {
      return 0;
    }
    const inputCost = (inputTokens / 1000) * pricing.inputPer1kTokens;
    const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokens;
    return inputCost + outputCost;
  }

  async invokeLLM(userId: string, prompt: string, context?: any) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }
    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);

    // Check rate limit
    const usageToday = await this.getUsageToday(userId);
    if (usageToday >= config.dailyLimit) {
      throw new Error(
        `Daily AI query limit reached (${config.dailyLimit}). Upgrade to Pro for 1000 queries/day.`,
      );
    }

    try {
      // Build messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are CareDroid, an AI clinical assistant. Provide evidence-based, structured medical information. Always include sources and note that this is not a substitute for professional medical advice.`,
        },
      ];

      if (context) {
        messages.push({
          role: 'system',
          content: `Context: ${JSON.stringify(context)}`,
        });
      }

      messages.push({ role: 'user', content: prompt });

      // Call OpenAI
      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: this.temperature,
      });
      const latencyMs = Date.now() - startTime;

      const result = {
        content: response.choices[0].message.content,
        model: config.model,
        tokensUsed: response.usage?.total_tokens || 0,
        finishReason: response.choices[0].finish_reason,
      };

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
      );
      this.metricsService.recordOpenaiCost(config.model, userId, costUsd);
      const aiUsageMetadata = this.buildAiUsageMetadata(context, config.model, config.maxTokens);

      // Log query to database
      await this.logQuery({
        userId,
        prompt,
        response: result.content,
        status: QueryStatus.SUCCESS,
        model: config.model,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
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
          prompt: prompt.substring(0, 100),
          model: config.model,
          tokensUsed: result.tokensUsed,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      const aiUsageMetadata = this.buildAiUsageMetadata(context, config.model, config.maxTokens);
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
          error: error instanceof Error ? error.message : String(error),
          ...aiUsageMetadata,
        },
      });
      throw new Error(`AI query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStructuredJSON(userId: string, prompt: string, schema: any, context?: any) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }
    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);

    // Check rate limit
    const usageToday = await this.getUsageToday(userId);
    if (usageToday >= config.dailyLimit) {
      throw new Error(
        `Daily AI query limit reached (${config.dailyLimit}). Upgrade to Pro for 1000 queries/day.`,
      );
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: `You are CareDroid, an AI clinical assistant. Generate structured JSON outputs according to the provided schema. Be accurate and evidence-based.`,
          },
          {
            role: 'user',
            content: `${prompt}\n\nSchema: ${JSON.stringify(schema)}`,
          },
        ],
        max_tokens: config.maxTokens,
        temperature: Math.min(this.temperature, 0.5),
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const totalTokens = response.usage?.total_tokens || 0;

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
      );
      this.metricsService.recordOpenaiCost(config.model, userId, costUsd);
      const aiUsageMetadata = this.buildAiUsageMetadata(context, config.model, config.maxTokens);
      await this.logQuery({
        userId,
        prompt,
        response: response.choices[0].message.content,
        status: QueryStatus.SUCCESS,
        model: config.model,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens,
        cost: costUsd,
        feature: context?.feature || 'structured_json',
        conversationId: context?.conversationId,
        intentClassified: context?.intentClassification?.primaryIntent,
        toolUsed: context?.tool || context?.intentClassification?.toolId,
        metadata: {
          schemaKeys: Object.keys(schema),
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
          prompt: prompt.substring(0, 100),
          schema: Object.keys(schema),
          model: config.model,
          tokensUsed: totalTokens,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      const aiUsageMetadata = this.buildAiUsageMetadata(context, config.model, config.maxTokens);
      await this.logQuery({
        userId,
        prompt,
        response: null,
        status: QueryStatus.ERROR,
        model: config.model,
        feature: context?.feature || 'structured_json',
        conversationId: context?.conversationId,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          ...aiUsageMetadata,
        },
      });
      throw new Error(
        `Structured JSON generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        prompt: data.prompt,
        response: data.response,
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
    conversationHistory?: OpenAI.Chat.ChatCompletionMessageParam[],
    context?: any,
  ) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const tier = await this.getSubscriptionTier(userId);
    const config = this.getRateLimitConfig(tier);

    // Check rate limit
    const usageToday = await this.getUsageToday(userId);
    if (usageToday >= config.dailyLimit) {
      throw new Error(
        `Daily AI query limit reached (${config.dailyLimit}). Upgrade to Pro for 1000 queries/day.`,
      );
    }

    try {
      // Build messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Add system prompt
      messages.push({
        role: 'system',
        content: `You are CareDroid, an AI clinical assistant with access to SOFA calculator, drug interaction checker, and lab interpreter tools. 
When a user asks a question that requires any of these tools, use them to provide accurate clinical information.
Always include sources and note that this is not a substitute for professional medical advice.
Use tools judiciously - only invoke them when truly needed for the query.`,
      });

      // Add context if provided
      if (context) {
        messages.push({
          role: 'system',
          content: `Context: ${JSON.stringify(context)}`,
        } as OpenAI.Chat.ChatCompletionMessageParam);
      }

      // Add conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory);
      }

      // Add current prompt
      messages.push({ role: 'user', content: prompt });

      // Call OpenAI with tools
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: Math.min(this.temperature, 0.5),
        tools: this.toolDefinitions.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema,
          },
        })) as any,
      });

      // Handle response with potential tool calls
      const assistantMessage = response.choices[0].message;
      const toolCalls: any[] = [];

      // Parse tool_use blocks if using native tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          toolCalls.push({
            toolName: toolCall.function.name,
            toolId: toolCall.id,
            parameters: JSON.parse(toolCall.function.arguments),
          });
        }
      }

      const result = {
        content: assistantMessage.content || '',
        model: config.model,
        tokensUsed: response.usage?.total_tokens || 0,
        finishReason: response.choices[0].finish_reason,
        toolCalls,
      };

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
      );
      this.metricsService.recordOpenaiCost(config.model, userId, costUsd);
      const aiUsageMetadata = this.buildAiUsageMetadata(context, config.model, config.maxTokens);
      await this.logQuery({
        userId,
        prompt,
        response: result.content,
        status: QueryStatus.SUCCESS,
        model: config.model,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        cost: costUsd,
        feature: context?.feature || 'chat_with_tools',
        conversationId: context?.conversationId,
        intentClassified: context?.intentClassification?.primaryIntent,
        toolUsed: context?.tool || context?.intentClassification?.toolId,
        metadata: {
          finishReason: result.finishReason,
          toolCallCount: toolCalls.length,
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
          prompt: prompt.substring(0, 100),
          model: config.model,
          tokensUsed: result.tokensUsed,
          toolCallCount: toolCalls.length,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      const aiUsageMetadata = this.buildAiUsageMetadata(context, config.model, config.maxTokens);
      await this.logQuery({
        userId,
        prompt,
        response: null,
        status: QueryStatus.ERROR,
        model: config.model,
        feature: context?.feature || 'chat_with_tools',
        conversationId: context?.conversationId,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          ...aiUsageMetadata,
        },
      });
      throw new Error(
        `AI query with tools failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
        aiFoundation?.requiresHumanReview ??
        routePlan?.safetyPlan?.requiresHumanReview ??
        false,
      estimatedCost: aiFoundation?.estimatedCost ?? routePlan?.costPlan?.estimatedCost,
      costReductionApplied:
        aiFoundation?.costReductionApplied || routePlan?.costPlan?.costReductionApplied || [],
    };

    return {
      aiFoundation,
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
    if (
      !this.platformGovernanceService ||
      query.status !== QueryStatus.SUCCESS ||
      !query.requiresHumanReview
    ) {
      return;
    }

    await this.platformGovernanceService.createReviewItem({
      organizationId: query.organizationId,
      runId: query.metadata?.aiFoundation?.runId || query.id,
      capabilityId: query.agentId || query.metadata?.aiFoundation?.capabilityId || query.feature || 'ai',
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

  private resolveReviewType(query: AIQuery) {
    const feature = (query.feature || '').toLowerCase();
    if (feature.includes('document')) return 'documentation';
    if (feature.includes('simulation')) return 'simulation';
    if (query.routingExpert === 'operations' || query.routingExpert === 'fleet') return 'operational_ai';
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
