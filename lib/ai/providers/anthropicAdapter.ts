import {
  AIError,
  type AIRequest,
  type AIResponse,
  type AIUsage,
  type ToolCall,
} from '../llmTransport';
import type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime } from './types';
import {
  fetchWithTimeout,
  isAbortError,
  readAiRequestTimeoutMs,
  toTimeoutAIError,
} from './transportSafety';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2024-10-22';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEPARTMENT_CONTEXT_SEPARATOR = 'Department context is provided for situational awareness.';

export class AnthropicAdapter implements LlmAdapter {
  readonly id = 'anthropic' as const;

  health(runtime?: LlmAdapterRuntime): LlmAdapterHealth {
    const key = runtime?.apiKey || readAnthropicKey();
    return {
      provider: 'anthropic',
      ok: Boolean(key),
      configured: Boolean(key),
      detail: key ? 'ANTHROPIC_API_KEY present' : 'ANTHROPIC_API_KEY missing',
    };
  }

  async complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse> {
    const apiKey = runtime?.apiKey || readAnthropicKey();
    if (!apiKey) {
      throw new AIError({
        message: 'Anthropic API key not configured',
        code: 'AI_CONFIG_ERROR',
        requestType: request.requestType,
      });
    }

    const model = runtime?.model || process.env.AI_MODEL || DEFAULT_MODEL;
    const maxTokens = request.maxTokens || 1000;
    const usage = emptyUsage();
    const requestId = `cd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const body = {
      model,
      max_tokens: maxTokens,
      system: buildCachedSystemBlocks(request.systemPrompt),
      messages: request.messages,
      tools: request.tools?.length ? request.tools : undefined,
      stream: request.stream === true,
    };

    const timeoutMs = readAiRequestTimeoutMs(runtime?.timeoutMs);

    try {
      const response = await fetchWithTimeout(
        ANTHROPIC_MESSAGES_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-beta': 'prompt-caching-2024-07-31',
            'x-request-id': requestId,
          },
          body: JSON.stringify(body),
        },
        { timeoutMs, signal: runtime?.signal },
      );

      if (!response.ok) {
        throw await toAIError(response, request.requestType);
      }

      if (request.stream) {
        return {
          ok: true,
          status: response.status,
          content: createStreamingHandler(
            response,
            usage,
            request,
            maxTokens,
            model,
            runtime,
          ),
          data: { provider: 'anthropic', model },
          toolCalls: [],
          usage,
          requestType: request.requestType,
        };
      }

      const data = await response.json();
      const parsed = parseAnthropicResponse(data);
      applyUsage(usage, data?.usage);
      runtime?.metadataLogger?.({
        requestType: request.requestType,
        model,
        stream: false,
        maxTokens,
        usage: { ...usage },
        toolCallCount: parsed.toolCalls.length,
        provider: 'anthropic',
      });

      return {
        ok: true,
        status: response.status,
        content: parsed.content,
        data: { ...data, provider: 'anthropic', model },
        toolCalls: parsed.toolCalls,
        usage,
        requestType: request.requestType,
      };
    } catch (error) {
      throw handleError(error, request.requestType, timeoutMs);
    }
  }
}

function readAnthropicKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY ?? '' : '';
}

function buildCachedSystemBlocks(systemPrompt: string): unknown {
  const sepIdx = systemPrompt.indexOf(DEPARTMENT_CONTEXT_SEPARATOR);
  if (sepIdx === -1) {
    return [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }];
  }
  const stableBase = systemPrompt.slice(0, sepIdx).trimEnd();
  const dynamicPart = systemPrompt.slice(sepIdx).trimStart();
  return [
    { type: 'text', text: stableBase, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicPart },
  ];
}

function createStreamingHandler(
  response: Response,
  usage: AIUsage,
  request: AIRequest,
  maxTokens: number,
  model: string,
  runtime?: LlmAdapterRuntime,
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
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        runtime?.metadataLogger?.({
          requestType: request.requestType,
          model,
          stream: true,
          maxTokens,
          usage: { ...usage },
          toolCallCount: 0,
          provider: 'anthropic',
        });
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
  if (data.type === 'message_start') applyUsage(usage, data.message?.usage);
  if (data.type === 'message_delta') applyUsage(usage, data.usage);
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

async function toAIError(response: Response, requestType: AIRequest['requestType']): Promise<AIError> {
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

function handleError(
  error: unknown,
  requestType: AIRequest['requestType'],
  timeoutMs = DEFAULT_TIMEOUT_FALLBACK,
): AIError {
  if (error instanceof AIError) return error;
  if (isAbortError(error)) return toTimeoutAIError(error, requestType, timeoutMs);
  return new AIError({
    message: error instanceof Error ? error.message : String(error),
    code: 'AI_NETWORK_ERROR',
    requestType,
    retryable: true,
    cause: error,
  });
}

const DEFAULT_TIMEOUT_FALLBACK = 30_000;

function applyUsage(target: AIUsage, source: any) {
  if (!source) return;
  target.inputTokens = source.input_tokens ?? target.inputTokens;
  target.outputTokens = source.output_tokens ?? target.outputTokens;
  target.cacheReadInputTokens = source.cache_read_input_tokens ?? target.cacheReadInputTokens;
  target.cacheCreationInputTokens =
    source.cache_creation_input_tokens ?? target.cacheCreationInputTokens;
  target.totalTokens = target.inputTokens + target.outputTokens;
}

function emptyUsage(): AIUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  };
}

export const anthropicAdapter = new AnthropicAdapter();
