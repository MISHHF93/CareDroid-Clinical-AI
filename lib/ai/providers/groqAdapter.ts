import { AIError, type AIRequest, type AIResponse, type AIUsage } from '../llmTransport';
import type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime } from './types';
import {
  fetchWithTimeout,
  isAbortError,
  readAiRequestTimeoutMs,
  toTimeoutAIError,
} from './transportSafety';

/**
 * Groq Chat Completions adapter (OpenAI-compatible API).
 * Env: GROQ_API_KEY, optional GROQ_MODEL / AI_MODEL.
 * Keep out of mandatory CI — live calls require credentials (demo/manual only).
 */
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Default is env-overridable; not hard-coded in UI pages. */
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class GroqAdapter implements LlmAdapter {
  readonly id = 'groq' as const;

  health(runtime?: LlmAdapterRuntime): LlmAdapterHealth {
    const key = runtime?.apiKey || readGroqKey();
    return {
      provider: 'groq',
      ok: Boolean(key),
      configured: Boolean(key),
      detail: key ? 'GROQ_API_KEY present' : 'GROQ_API_KEY missing',
    };
  }

  async complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse> {
    if (request.stream) {
      throw new AIError({
        message: 'Groq adapter does not support streaming in this build; disable stream or use anthropic',
        code: 'AI_BAD_REQUEST',
        requestType: request.requestType,
      });
    }

    const apiKey = runtime?.apiKey || readGroqKey();
    if (!apiKey) {
      throw new AIError({
        message: 'Groq API key not configured (GROQ_API_KEY)',
        code: 'AI_CONFIG_ERROR',
        requestType: request.requestType,
      });
    }

    const model =
      runtime?.model ||
      (typeof process !== 'undefined' ? process.env.GROQ_MODEL || process.env.AI_MODEL : undefined) ||
      DEFAULT_MODEL;
    const maxTokens = request.maxTokens || 1000;
    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...(request.messages || []).map((m) => ({ role: m.role, content: m.content })),
    ];

    const timeoutMs = readAiRequestTimeoutMs(runtime?.timeoutMs);

    try {
      const response = await fetchWithTimeout(
        GROQ_CHAT_URL,
        {
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
        },
        { timeoutMs, signal: runtime?.signal },
      );

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
        provider: 'groq',
      });

      return {
        ok: true,
        status: response.status,
        content: String(content),
        data: { ...data, provider: 'groq', model },
        toolCalls: [],
        usage,
        requestType: request.requestType,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (isAbortError(error)) throw toTimeoutAIError(error, request.requestType, timeoutMs);
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

function readGroqKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env.GROQ_API_KEY ?? '' : '';
}

async function toAIError(response: Response, requestType: AIRequest['requestType']): Promise<AIError> {
  const data = await response.json().catch(() => ({}));
  const message = data?.error?.message || data?.message || `Groq error ${response.status}`;
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

export const groqAdapter = new GroqAdapter();
