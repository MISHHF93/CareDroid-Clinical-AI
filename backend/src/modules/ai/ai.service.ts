import { Injectable } from '@nestjs/common';
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

    // Tool definitions for Claude's tool_use block handling
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
    // Get user's subscription tier
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const tier = subscription?.tier || SubscriptionTier.FREE;
    const config = this.rateLimits.get(tier);

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
        intentClassified: context?.intent,
        toolUsed: context?.toolId,
        metadata: {
          temperature: this.temperature,
          maxTokens: config.maxTokens,
          finishReason: result.finishReason,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai/query',
        details: {
          prompt: prompt.substring(0, 100),
          model: config.model,
          tokensUsed: result.tokensUsed,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
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
        },
      });
      throw new Error(`AI query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStructuredJSON(userId: string, prompt: string, schema: any) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }
    // Get user's subscription tier
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const tier = subscription?.tier || SubscriptionTier.FREE;
    const config = this.rateLimits.get(tier);

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

      // Calculate and record cost
      const costUsd = this.calculateCost(
        config.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
      );
      this.metricsService.recordOpenaiCost(config.model, userId, costUsd);

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai/structured',
        details: {
          prompt: prompt.substring(0, 100),
          schema: Object.keys(schema),
          model: config.model,
          tokensUsed: response.usage?.total_tokens || 0,
        },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });

      return result;
    } catch (error) {
      throw new Error(
        `Structured JSON generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getUsage(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const tier = subscription?.tier || SubscriptionTier.FREE;
    const config = this.rateLimits.get(tier);

    // Calculate usage for the period
    const queries = await this.aiQueryRepository.find({
      where: {
        userId,
        status: QueryStatus.SUCCESS,
        createdAt: MoreThanOrEqual(startDate),
      },
    });

    const usedThisMonth = queries.length;
    const totalCost = queries.reduce((sum, query) => sum + Number(query.cost), 0);

    return {
      userId,
      tier,
      dailyLimit: config.dailyLimit,
      usedToday: await this.getUsageToday(userId),
      usedThisMonth,
      totalCost,
    };
  }

  async getRemainingQueries(userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const tier = subscription?.tier || SubscriptionTier.FREE;
    const config = this.rateLimits.get(tier);
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
      await this.aiQueryRepository.save({
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
        intentClassified: data.intentClassified,
        toolUsed: data.toolUsed,
        metadata: data.metadata,
      });
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

    // Get user's subscription tier
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const tier = subscription?.tier || SubscriptionTier.FREE;
    const config = this.rateLimits.get(tier);

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

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai/query-with-tools',
        details: {
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
      throw new Error(
        `AI query with tools failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
