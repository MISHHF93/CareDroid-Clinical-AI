import type { AIRequestType, ToolDefinition } from './types';

export type { ToolDefinition };

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

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

export interface AIRequest {
  messages?: Message[];
  systemPrompt: string;
  requestType: AIRequestType;
  stream?: boolean;
  maxTokens?: number;
  tools?: ToolDefinition[];
  context?: Record<string, unknown>;
  message?: string;
  type?: AIRequestType;
  patientId?: string;
  encounterId?: string;
}

export interface AIRequestConfig extends AIRequest {}

export interface AIResponse {
  ok: boolean;
  status: number;
  content: string | ReadableStream<Uint8Array>;
  data: Record<string, unknown>;
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

type MetadataLogger = (metadata: {
  requestType: AIRequestType;
  model: string;
  stream: boolean;
  maxTokens: number;
  usage: AIUsage;
  toolCallCount: number;
}) => void;

export const UNIFIED_AI_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_AI_MAX_TOKENS = 1000;

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

class UnifiedAIClient {
  private apiKey?: string;
  private metadataLogger?: MetadataLogger;

  configure(input: { apiKey?: string; metadataLogger?: MetadataLogger }) {
    this.apiKey = input.apiKey || this.apiKey;
    this.metadataLogger = input.metadataLogger || this.metadataLogger;
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    return callAnthropicAI(normalizeRequest(config), {
      apiKey: this.apiKey,
      metadataLogger: this.metadataLogger,
    });
  }
}

export const unifiedAIClient = new UnifiedAIClient();

export async function callAI(
  request: AIRequest,
  runtime?: { apiKey?: string; metadataLogger?: MetadataLogger },
): Promise<AIResponse> {
  return callAnthropicAI(normalizeRequest(request), runtime);
}

function normalizeRequest(request: AIRequest): AIRequest {
  const messages = normalizeMessages(request.messages || []);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  return {
    ...request,
    messages: messages.length ? messages : [{ role: 'user', content: request.message || 'Continue.' }],
    message: request.message || latestUserMessage?.content || '',
    maxTokens: request.maxTokens || DEFAULT_AI_MAX_TOKENS,
  };
}

function normalizeMessages(messages: Array<{ role: string; content: string }>): Message[] {
  return messages
    .filter((message) => message?.content && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: (message.role === 'assistant' ? 'assistant' : 'user') as Message['role'],
      content: String(message.content),
    }));
}

async function callAnthropicAI(
  request: AIRequest,
  runtime?: { apiKey?: string; metadataLogger?: MetadataLogger },
): Promise<AIResponse> {
  const apiKey = runtime?.apiKey || readApiKey();
  if (!apiKey) {
    throw new AIError({
      message: 'Anthropic API key not configured',
      code: 'AI_CONFIG_ERROR',
      requestType: request.requestType,
    });
  }

  const maxTokens = request.maxTokens || DEFAULT_AI_MAX_TOKENS;
  const usage = emptyUsage();
  const body = {
    model: UNIFIED_AI_MODEL,
    max_tokens: maxTokens,
    system: request.systemPrompt,
    messages: request.messages,
    tools: request.tools?.length ? request.tools : undefined,
    stream: request.stream === true,
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
      throw await toAIError(response, request.requestType);
    }

    if (request.stream) {
      return {
        ok: true,
        status: response.status,
        content: createStreamingHandler(response, usage, request, maxTokens, runtime?.metadataLogger),
        data: {},
        toolCalls: [],
        usage,
        requestType: request.requestType,
      };
    }

    const data = await response.json();
    const parsed = parseAnthropicResponse(data);
    applyUsage(usage, data?.usage);
    logMetadata(runtime?.metadataLogger, request, maxTokens, usage, parsed.toolCalls.length, false);

    return {
      ok: true,
      status: response.status,
      content: parsed.content,
      data,
      toolCalls: parsed.toolCalls,
      usage,
      requestType: request.requestType,
    };
  } catch (error) {
    throw handleError(error, request.requestType);
  }
}

function readApiKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY ?? '' : '';
}

function createStreamingHandler(
  response: Response,
  usage: AIUsage,
  request: AIRequest,
  maxTokens: number,
  metadataLogger?: MetadataLogger,
): ReadableStream<Uint8Array> {
  const source = response.body;
  if (!source) {
    throw new AIError({
      message: 'AI streaming response body was empty',
      code: 'AI_STREAM_ERROR',
      requestType: request.requestType,
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
            const text = parseStreamEvent(event, usage);
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        }
        logMetadata(metadataLogger, request, maxTokens, usage, 0, true);
        controller.close();
      } catch (error) {
        controller.error(handleError(error, request.requestType));
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function parseStreamEvent(event: string, usage: AIUsage): string {
  const dataLine = event
    .split('\n')
    .find((line) => line.startsWith('data: '))
    ?.replace(/^data: /, '');

  if (!dataLine || dataLine === '[DONE]') return '';

  const data = JSON.parse(dataLine);
  if (data.type === 'message_start') {
    applyUsage(usage, data.message?.usage);
  }
  if (data.type === 'message_delta') {
    applyUsage(usage, data.usage);
  }
  if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
    return data.delta.text || '';
  }
  return '';
}

function parseAnthropicResponse(data: any): { content: string; toolCalls: ToolCall[] } {
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

async function toAIError(response: Response, requestType: AIRequestType): Promise<AIError> {
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

function handleError(error: unknown, requestType: AIRequestType): AIError {
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

function applyUsage(target: AIUsage, source: any) {
  if (!source) return;
  target.inputTokens = source.input_tokens ?? target.inputTokens;
  target.outputTokens = source.output_tokens ?? target.outputTokens;
  target.totalTokens = target.inputTokens + target.outputTokens;
}

function emptyUsage(): AIUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

function logMetadata(
  metadataLogger: MetadataLogger | undefined,
  request: AIRequest,
  maxTokens: number,
  usage: AIUsage,
  toolCallCount: number,
  stream: boolean,
) {
  const metadata = {
    requestType: request.requestType,
    model: UNIFIED_AI_MODEL,
    stream,
    maxTokens,
    usage: { ...usage },
    toolCallCount,
  };

  if (metadataLogger) {
    metadataLogger(metadata);
    return;
  }

  if (typeof console !== 'undefined') {
    console.info('[AI]', metadata);
  }
}
