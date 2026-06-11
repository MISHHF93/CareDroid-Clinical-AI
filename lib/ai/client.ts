import {
  buildDepartmentContext,
  buildSystemPrompt,
  type DepartmentContext,
} from './contextEngine';
import { getToolsForRequestType } from './toolRegistry';

export type AIRequestType =
  | 'COPILOT_CHAT'
  | 'CLINICAL_SUMMARY'
  | 'SCORE_ASSIST'
  | 'INTAKE_SUGGESTION'
  | 'HANDOFF_BRIEF'
  | 'PROTOCOL_SUGGEST'
  | 'TRIAGE_ASSIST'
  | 'SHIFT_SUMMARY';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface AIRequestConfig {
  messages: Message[];
  systemPrompt: string;
  tools?: ToolDefinition[];
  stream?: boolean;
  maxTokens?: number;
  context?: DepartmentContext;
  requestType: AIRequestType;
}

export interface AIResponse {
  content: string | ReadableStream<Uint8Array>;
  toolCalls: ToolCall[];
  usage: AIUsage;
  requestType: AIRequestType;
}

export type AIErrorCode =
  | 'AI_AUTH_ERROR'
  | 'AI_RATE_LIMIT'
  | 'AI_BAD_REQUEST'
  | 'AI_STREAM_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_NETWORK_ERROR'
  | 'AI_CONFIG_ERROR';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;
  readonly requestType?: AIRequestType;
  readonly retryable: boolean;

  constructor(input: {
    message: string;
    code: AIErrorCode;
    status?: number;
    requestType?: AIRequestType;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = 'AIError';
    this.code = input.code;
    this.status = input.status;
    this.requestType = input.requestType;
    this.retryable = input.retryable ?? false;
    if (input.cause) {
      (this as any).cause = input.cause;
    }
  }
}

type DepartmentContextResolver = () => DepartmentContext | undefined;
type MetadataLogger = (metadata: {
  requestType: AIRequestType;
  model: string;
  stream: boolean;
  maxTokens: number;
  usage: AIUsage;
  toolCallCount: number;
}) => void;

const MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 2000;

const REQUEST_TOKEN_BUDGETS: Record<AIRequestType, number> = {
  COPILOT_CHAT: 2000,
  CLINICAL_SUMMARY: 2000,
  SCORE_ASSIST: 1200,
  INTAKE_SUGGESTION: 1200,
  HANDOFF_BRIEF: 1600,
  PROTOCOL_SUGGEST: 1600,
  TRIAGE_ASSIST: 1600,
  SHIFT_SUMMARY: 1600,
};

class UnifiedAIClient {
  private apiKey?: string;
  private contextResolver?: DepartmentContextResolver;
  private metadataLogger?: MetadataLogger;

  configure(input: {
    apiKey?: string;
    contextResolver?: DepartmentContextResolver;
    metadataLogger?: MetadataLogger;
  }) {
    this.apiKey = input.apiKey || this.apiKey;
    this.contextResolver = input.contextResolver || this.contextResolver;
    this.metadataLogger = input.metadataLogger || this.metadataLogger;
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    const apiKey = this.apiKey || this.readApiKey();
    if (!apiKey) {
      throw new AIError({
        message: 'Anthropic API key not configured',
        code: 'AI_CONFIG_ERROR',
        requestType: config.requestType,
      });
    }

    const maxTokens =
      config.maxTokens || REQUEST_TOKEN_BUDGETS[config.requestType] || DEFAULT_MAX_TOKENS;
    const usage = this.emptyUsage();
    const departmentContext =
      config.context || this.contextResolver?.() || buildDepartmentContext();
    const tools =
      config.tools !== undefined ? config.tools : getToolsForRequestType(config.requestType);
    const body = {
      model: MODEL,
      max_tokens: maxTokens,
      system: config.systemPrompt
        ? this.withDepartmentContext(config.systemPrompt, departmentContext)
        : buildSystemPrompt(departmentContext, config.requestType),
      messages: this.normalizeMessages(config.messages),
      tools: tools.length ? tools : undefined,
      stream: config.stream === true,
    };

    try {
      const response = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw await this.toAIError(response, config.requestType);
      }

      if (config.stream) {
        return {
          content: this.createStreamingHandler(response, usage, config.requestType),
          toolCalls: [],
          usage,
          requestType: config.requestType,
        };
      }

      const data = await response.json();
      const parsed = this.parseAnthropicResponse(data);
      this.applyUsage(usage, data?.usage);
      this.logMetadata(config.requestType, maxTokens, usage, parsed.toolCalls.length, false);

      return {
        content: parsed.content,
        toolCalls: parsed.toolCalls,
        usage,
        requestType: config.requestType,
      };
    } catch (error) {
      throw this.handleError(error, config.requestType);
    }
  }

  private readApiKey(): string | undefined {
    return typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined;
  }

  private normalizeMessages(messages: Message[]): Message[] {
    const normalized = messages
      .filter((message) => message?.content)
      .map((message) => ({
        role: (message.role === 'assistant' ? 'assistant' : 'user') as Message['role'],
        content: String(message.content),
      }));

    return normalized.length ? normalized : [{ role: 'user', content: 'Continue.' }];
  }

  private withDepartmentContext(systemPrompt: string, explicitContext?: DepartmentContext): string {
    if (systemPrompt.includes('Current department context:')) {
      return systemPrompt;
    }

    const context = explicitContext || this.contextResolver?.();
    if (!context || Object.keys(context).length === 0) {
      return systemPrompt;
    }

    return [
      systemPrompt,
      '',
      'Department context is provided for situational awareness. Use it only for decision support and never make autonomous clinical decisions.',
      JSON.stringify(context),
    ].join('\n');
  }

  private createStreamingHandler(
    response: Response,
    usage: AIUsage,
    requestType: AIRequestType,
  ): ReadableStream<Uint8Array> {
    const source = response.body;
    if (!source) {
      throw new AIError({
        message: 'AI streaming response body was empty',
        code: 'AI_STREAM_ERROR',
        requestType,
      });
    }

    const reader = source.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    return new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const event of events) {
              const text = this.parseStreamEvent(event, usage);
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
          }
          this.logMetadata(requestType, DEFAULT_MAX_TOKENS, usage, 0, true);
          controller.close();
        } catch (error) {
          controller.error(this.handleError(error, requestType));
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  private parseStreamEvent(event: string, usage: AIUsage): string {
    const dataLine = event
      .split('\n')
      .find((line) => line.startsWith('data: '))
      ?.replace(/^data: /, '');

    if (!dataLine || dataLine === '[DONE]') return '';

    const data = JSON.parse(dataLine);
    if (data.type === 'message_start') {
      this.applyUsage(usage, data.message?.usage);
    }
    if (data.type === 'message_delta') {
      this.applyUsage(usage, data.usage);
    }
    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
      return data.delta.text || '';
    }
    return '';
  }

  private parseAnthropicResponse(data: any): { content: string; toolCalls: ToolCall[] } {
    const contentBlocks = Array.isArray(data?.content) ? data.content : [];
    const text = contentBlocks
      .map((block: any) => (block?.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
    const toolCalls = contentBlocks
      .filter((block: any) => block?.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input || {},
      }));

    return { content: text, toolCalls };
  }

  private async toAIError(response: Response, requestType: AIRequestType): Promise<AIError> {
    const data = await response.json().catch(() => ({}));
    const message = data?.error?.message || data?.message || `AI provider error ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      return new AIError({ message, code: 'AI_AUTH_ERROR', status: response.status, requestType });
    }
    if (response.status === 429) {
      return new AIError({
        message,
        code: 'AI_RATE_LIMIT',
        status: response.status,
        requestType,
        retryable: true,
      });
    }
    if (response.status >= 400 && response.status < 500) {
      return new AIError({ message, code: 'AI_BAD_REQUEST', status: response.status, requestType });
    }
    return new AIError({
      message,
      code: 'AI_PROVIDER_ERROR',
      status: response.status,
      requestType,
      retryable: true,
    });
  }

  private handleError(error: unknown, requestType: AIRequestType): AIError {
    if (error instanceof AIError) {
      return error;
    }
    return new AIError({
      message: error instanceof Error ? error.message : String(error),
      code: 'AI_NETWORK_ERROR',
      requestType,
      retryable: true,
      cause: error,
    });
  }

  private applyUsage(target: AIUsage, source: any) {
    if (!source) return;
    target.inputTokens = source.input_tokens ?? target.inputTokens;
    target.outputTokens = source.output_tokens ?? target.outputTokens;
    target.totalTokens = target.inputTokens + target.outputTokens;
  }

  private emptyUsage(): AIUsage {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  private logMetadata(
    requestType: AIRequestType,
    maxTokens: number,
    usage: AIUsage,
    toolCallCount: number,
    stream: boolean,
  ) {
    const metadata = {
      requestType,
      model: MODEL,
      stream,
      maxTokens,
      usage: { ...usage },
      toolCallCount,
    };

    if (this.metadataLogger) {
      this.metadataLogger(metadata);
      return;
    }

    if (typeof console !== 'undefined') {
      console.info('[AI]', metadata);
    }
  }
}

export const unifiedAIClient = new UnifiedAIClient();
export const UNIFIED_AI_MODEL = MODEL;
export const DEFAULT_AI_MAX_TOKENS = DEFAULT_MAX_TOKENS;
