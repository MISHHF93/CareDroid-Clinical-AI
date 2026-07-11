import { AIError, type AIRequest, type AIResponse, type AIUsage } from '../llmTransport';
import type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime } from './types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAI Chat Completions adapter (non-streaming).
 * Tool-use mapping is best-effort; prefer Anthropic for full tool parity today.
 */
export class OpenAIAdapter implements LlmAdapter {
  readonly id = 'openai' as const;

  health(runtime?: LlmAdapterRuntime): LlmAdapterHealth {
    const key = runtime?.apiKey || readOpenAIKey();
    return {
      provider: 'openai',
      ok: Boolean(key),
      configured: Boolean(key),
      detail: key ? 'OPENAI_API_KEY present' : 'OPENAI_API_KEY missing',
    };
  }

  async complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse> {
    if (request.stream) {
      throw new AIError({
        message: 'OpenAI adapter does not support streaming in this build; use anthropic or disable stream',
        code: 'AI_BAD_REQUEST',
        requestType: request.requestType,
      });
    }

    const apiKey = runtime?.apiKey || readOpenAIKey();
    if (!apiKey) {
      throw new AIError({
        message: 'OpenAI API key not configured',
        code: 'AI_CONFIG_ERROR',
        requestType: request.requestType,
      });
    }

    const model = runtime?.model || process.env.AI_MODEL || DEFAULT_MODEL;
    const maxTokens = request.maxTokens || 1000;
    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...(request.messages || []).map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw await toAIError(response, request.requestType);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const usage = emptyUsage();
      usage.inputTokens = data?.usage?.prompt_tokens ?? 0;
      usage.outputTokens = data?.usage?.completion_tokens ?? 0;
      usage.totalTokens = data?.usage?.total_tokens ?? usage.inputTokens + usage.outputTokens;

      runtime?.metadataLogger?.({
        requestType: request.requestType,
        model,
        stream: false,
        maxTokens,
        usage: { ...usage },
        toolCallCount: 0,
        provider: 'openai',
      });

      return {
        ok: true,
        status: response.status,
        content: String(content),
        data: { ...data, provider: 'openai', model },
        toolCalls: [],
        usage,
        requestType: request.requestType,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError({
        message: error instanceof Error ? error.message : String(error),
        code: 'AI_NETWORK_ERROR',
        requestType: request.requestType,
        retryable: true,
        cause: error,
      });
    }
  }
}

function readOpenAIKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env.OPENAI_API_KEY ?? '' : '';
}

async function toAIError(response: Response, requestType: AIRequest['requestType']): Promise<AIError> {
  const data = await response.json().catch(() => ({}));
  const message = data?.error?.message || data?.message || `OpenAI error ${response.status}`;
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
  return new AIError({
    message,
    code: response.status >= 500 ? 'AI_PROVIDER_ERROR' : 'AI_BAD_REQUEST',
    status: response.status,
    requestType,
    retryable: response.status >= 500,
  });
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

export const openAIAdapter = new OpenAIAdapter();
