import { AIError, type AIRequest, type AIResponse, type AIUsage } from '../llmTransport';
import type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime } from './types';
import {
  fetchWithTimeout,
  isAbortError,
  readAiRequestTimeoutMs,
  toTimeoutAIError,
} from './transportSafety';

const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Google Gemini generateContent adapter (non-streaming, text-only).
 */
export class GeminiAdapter implements LlmAdapter {
  readonly id = 'gemini' as const;

  health(runtime?: LlmAdapterRuntime): LlmAdapterHealth {
    const key = runtime?.apiKey || readGeminiKey();
    return {
      provider: 'gemini',
      ok: Boolean(key),
      configured: Boolean(key),
      detail: key ? 'GEMINI_API_KEY or GOOGLE_API_KEY present' : 'Gemini API key missing',
    };
  }

  async complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse> {
    if (request.stream) {
      throw new AIError({
        message: 'Gemini adapter does not support streaming in this build',
        code: 'AI_BAD_REQUEST',
        requestType: request.requestType,
      });
    }

    const apiKey = runtime?.apiKey || readGeminiKey();
    if (!apiKey) {
      throw new AIError({
        message: 'Gemini API key not configured (GEMINI_API_KEY / GOOGLE_API_KEY)',
        code: 'AI_CONFIG_ERROR',
        requestType: request.requestType,
      });
    }

    const model = runtime?.model || process.env.AI_MODEL || DEFAULT_MODEL;
    const maxTokens = request.maxTokens || 1000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = (request.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (!contents.length) {
      contents.push({
        role: 'user',
        parts: [{ text: request.message || 'Continue.' }],
      });
    }

    const timeoutMs = readAiRequestTimeoutMs(runtime?.timeoutMs);

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemPrompt }] },
            contents,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.2,
            },
          }),
        },
        { timeoutMs, signal: runtime?.signal },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error?.message || `Gemini error ${response.status}`;
        throw new AIError({
          message,
          code: response.status === 429 ? 'AI_RATE_LIMIT' : 'AI_PROVIDER_ERROR',
          status: response.status,
          requestType: request.requestType,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const content = parts.map((p: any) => p?.text || '').join('\n').trim();
      const usage = emptyUsage();
      usage.inputTokens = data?.usageMetadata?.promptTokenCount ?? 0;
      usage.outputTokens = data?.usageMetadata?.candidatesTokenCount ?? 0;
      usage.totalTokens = data?.usageMetadata?.totalTokenCount ?? usage.inputTokens + usage.outputTokens;

      runtime?.metadataLogger?.({
        requestType: request.requestType,
        model,
        stream: false,
        maxTokens,
        usage: { ...usage },
        toolCallCount: 0,
        provider: 'gemini',
      });

      return {
        ok: true,
        status: response.status,
        content,
        data: { ...data, provider: 'gemini', model },
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

function readGeminiKey(): string | undefined {
  if (typeof process === 'undefined') return '';
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
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

export const geminiAdapter = new GeminiAdapter();
